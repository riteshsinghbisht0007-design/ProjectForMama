import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Summon, MetricSummary, WitnessPerson } from '../types';
import { useAuth } from './AuthContext';
import { checkUpcomingReminders, requestNotificationPermission } from '../services/notificationService';

interface SummonContextType {
  summons: Summon[];
  isLoading: boolean;
  metrics: MetricSummary;
  addSummon: (
    summonData: Omit<Summon, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    attachmentFile?: File | Blob | null
  ) => Promise<Summon>;
  updateSummon: (id: string, updates: Partial<Summon>) => Promise<void>;
  deleteSummon: (id: string) => Promise<void>;
  markAsServed: (id: string, notes?: string) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  getSummonById: (id: string) => Summon | undefined;
  uploadAttachment: (summonId: string, fileOrDataUrl: string | File, fileName: string) => Promise<string>;
  witnesses: WitnessPerson[];
  isLoadingWitnesses: boolean;
  addWitness: (
    witnessData: Omit<WitnessPerson, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => Promise<WitnessPerson>;
  updateWitness: (id: string, updates: Partial<WitnessPerson>) => Promise<void>;
  deleteWitness: (id: string) => Promise<void>;
  getWitnessById: (id: string) => WitnessPerson | undefined;
}

const SummonContext = createContext<SummonContextType | undefined>(undefined);

export const SummonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

    const [summons, setSummons] = useState<Summon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Witnesses state
  const [witnesses, setWitnesses] = useState<WitnessPerson[]>([]);
  const [isLoadingWitnesses, setIsLoadingWitnesses] = useState<boolean>(true);

  // Scoped localStorage key per officer user
  const getStorageKey = (uid: string) => `users_${uid}_summons`;
  const getWitnessStorageKey = (uid: string) => `users_${uid}_witnesses`;

  // Fetch summons from MongoDB API
  const fetchSummons = useCallback(async (uid: string) => {
    try {
      const res = await fetch('/api/summons', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSummons(data);
        checkUpcomingReminders(data);
      }
    } catch (err) {
      console.error('Failed to fetch summons:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch witnesses from MongoDB API
  const fetchWitnesses = useCallback(async (uid: string) => {
    try {
      const res = await fetch('/api/witnesses', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setWitnesses(data);
      }
    } catch (err) {
      console.error('Failed to fetch witnesses:', err);
    } finally {
      setIsLoadingWitnesses(false);
    }
  }, []);

  // 1. Initial loading of summons from MongoDB
  useEffect(() => {
    if (!currentUser) {
      setSummons([]);
      setIsLoading(false);
      return;
    }
    fetchSummons(currentUser.uid);
  }, [currentUser, fetchSummons]);

  // 1b. Initial loading of witnesses from MongoDB
  useEffect(() => {
    if (!currentUser) {
      setWitnesses([]);
      setIsLoadingWitnesses(false);
      return;
    }
    fetchWitnesses(currentUser.uid);
  }, [currentUser, fetchWitnesses]);

  // 2. Secure cloud document upload
  const uploadAttachment = async (
    summonId: string,
    fileOrDataUrl: string | File,
    fileName: string
  ): Promise<string> => {
    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
      return fileOrDataUrl; // Already a URL
    }

    try {
      let fileToUpload: Blob;
      if (typeof fileOrDataUrl === 'string') {
        // It's a base64 data URL, convert to Blob
        const fetchResponse = await fetch(fileOrDataUrl);
        fileToUpload = await fetchResponse.blob();
      } else {
        fileToUpload = fileOrDataUrl;
      }

      // Import firebase storage here or dynamically
      const { storage, storageRef, uploadBytes, getDownloadURL } = await import('../services/firebase');
      
      const fileExt = fileName.split('.').pop() || 'png';
      const storagePath = `summons/${summonId}/${Date.now()}.${fileExt}`;
      const fileRef = storageRef(storage, storagePath);
      
      await uploadBytes(fileRef, fileToUpload);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      // Fallback to dataURL if upload fails
      if (typeof fileOrDataUrl === 'string') return fileOrDataUrl;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.readAsDataURL(fileOrDataUrl);
      });
    }
  };

  // 3. Quick Instant Add Summon
  const addSummon = async (
    summonData: Omit<Summon, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    attachmentFile?: File | Blob | null
  ): Promise<Summon> => {
    if (!currentUser) throw new Error('User must be authenticated to add summons');
    const now = new Date().toISOString();
    const summonId = 'sum_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    let finalImageUrl = summonData.imageUrl;
    let finalPdfUrl = summonData.pdfUrl;

    if (attachmentFile && summonData.fileName) {
      const dataUrl = await uploadAttachment(summonId, attachmentFile as File, summonData.fileName);
      if (summonData.fileName.toLowerCase().endsWith('.pdf')) {
        finalPdfUrl = dataUrl;
      } else {
        finalImageUrl = dataUrl;
      }
    }

    const newSummon: Summon = {
      ...summonData,
      imageUrl: finalImageUrl,
      pdfUrl: finalPdfUrl,
      id: summonId,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    };

    // Save to DB first to ensure persistence
    try {
      const response = await fetch('/api/summons', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSummon)
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save to database: ${response.statusText}`);
      }
      
      const savedSummon = await response.json();
      
      // Save synchronously to local state only after DB success
      setSummons((prev) => {
        const updated = [savedSummon, ...prev.filter((s) => s.id !== summonId)];
        return updated;
      });
      
      return savedSummon;
    } catch (err) {
      console.error("Failed to save summon to DB:", err);
      throw err;
    }
  };

  // 4. Quick Instant Update Summon
  const updateSummon = async (id: string, updates: Partial<Summon>) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const updatedRecord = { ...updates, updatedAt: now };

    try {
      const response = await fetch(`/api/summons/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update summon in database');
      }

      setSummons((prev) => {
        const updated = prev.map((s) => (s.id === id ? { ...s, ...updatedRecord } : s));
        return updated;
      });
    } catch (err) {
      console.error("Failed to update summon in DB:", err);
      throw err;
    }
  };

  // 5. Quick Instant Delete Summon
  const deleteSummon = async (id: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/summons/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete summon from database');
      }

      setSummons((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete summon from DB:", err);
      throw err;
    }
  };

  // 6. Mark as Served & Closed
  const markAsServed = async (id: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    await updateSummon(id, {
      status: 'Completed',
      servedDate: today,
      servedNotes: notes || 'Summon served in person. Official receipt signed by recipient.',
    });
  };

  // 7. Toggle Reminder
  const toggleReminder = async (id: string) => {
    const target = summons.find((s) => s.id === id);
    if (!target) return;

    if (!target.reminderEnabled) {
      await requestNotificationPermission();
    }

    await updateSummon(id, {
      reminderEnabled: !target.reminderEnabled,
    });
  };

  const getSummonById = (id: string) => summons.find((s) => s.id === id);

  // 8. Witness Management CRUD (Instant Local Save)
  const addWitness = async (
    witnessData: Omit<WitnessPerson, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<WitnessPerson> => {
    if (!currentUser) throw new Error('User must be authenticated to add witnesses');
    const now = new Date().toISOString();
    const witnessId = 'wit_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const newWitness: WitnessPerson = {
      ...witnessData,
      id: witnessId,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const response = await fetch('/api/witnesses', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWitness)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save witness to database');
      }
      
      const savedWitness = await response.json();
      
      setWitnesses((prev) => {
        const updated = [savedWitness, ...prev.filter((w) => w.id !== witnessId)];
        return updated;
      });
      
      return savedWitness;
    } catch (err) {
      console.error("Failed to save witness to DB:", err);
      throw err;
    }
  };

  const updateWitness = async (id: string, updates: Partial<WitnessPerson>) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const updatedRecord = { ...updates, updatedAt: now };

    try {
      const response = await fetch(`/api/witnesses/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update witness in database');
      }

      setWitnesses((prev) => {
        const updated = prev.map((w) => (w.id === id ? { ...w, ...updatedRecord } : w));
        return updated;
      });
    } catch (err) {
      console.error("Failed to update witness in DB:", err);
      throw err;
    }
  };

  const deleteWitness = async (id: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/witnesses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete witness from database');
      }

      setWitnesses((prev) => {
        const updated = prev.filter((w) => w.id !== id);
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete witness from DB:", err);
      throw err;
    }
  };

  const getWitnessById = (id: string) => witnesses.find((w) => w.id === id);

  // Dynamic statistics calculated directly from actual user records
  const metrics: MetricSummary = {
    total: summons.length,
    pending: summons.filter((s) => s.status === 'Pending').length,
    upcoming: summons.filter((s) => s.status === 'Upcoming').length,
    completed: summons.filter((s) => s.status === 'Completed').length,
  };

  return (
    <SummonContext.Provider
      value={{
        summons,
        isLoading,
        metrics,
        addSummon,
        updateSummon,
        deleteSummon,
        markAsServed,
        toggleReminder,
        getSummonById,
        uploadAttachment,
        witnesses,
        isLoadingWitnesses,
        addWitness,
        updateWitness,
        deleteWitness,
        getWitnessById,
      }}
    >
      {children}
    </SummonContext.Provider>
  );
};

export const useSummons = (): SummonContextType => {
  const context = useContext(SummonContext);
  if (!context) {
    throw new Error('useSummons must be used within a SummonProvider');
  }
  return context;
};
