import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Summon, MetricSummary, WitnessPerson } from '../types';
import { useAuth } from './AuthContext';
import {
  db,
  storage,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  storageRef,
  uploadString,
  uploadBytes,
  getDownloadURL,
} from '../services/firebase';
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

  // Scoped localStorage key per user
  const getStorageKey = (uid: string) => `users_${uid}_summons`;
  const getWitnessStorageKey = (uid: string) => `users_${uid}_witnesses`;

  // Helper: Persist summons locally
  const saveLocalSummons = useCallback(
    (uid: string, items: Summon[]) => {
      try {
        localStorage.setItem(getStorageKey(uid), JSON.stringify(items));
      } catch (err) {
        console.warn('Local storage quota warning:', err);
      }
    },
    []
  );

  // Helper: Load local summons backup
  const loadLocalSummons = useCallback((uid: string): Summon[] => {
    try {
      const data = localStorage.getItem(getStorageKey(uid));
      return data ? (JSON.parse(data) as Summon[]) : [];
    } catch {
      return [];
    }
  }, []);

  // Helper: Persist witnesses locally
  const saveLocalWitnesses = useCallback(
    (uid: string, items: WitnessPerson[]) => {
      try {
        localStorage.setItem(getWitnessStorageKey(uid), JSON.stringify(items));
      } catch (err) {
        console.warn('Local storage quota warning:', err);
      }
    },
    []
  );

  // Helper: Load local witnesses backup
  const loadLocalWitnesses = useCallback((uid: string): WitnessPerson[] => {
    try {
      const data = localStorage.getItem(getWitnessStorageKey(uid));
      return data ? (JSON.parse(data) as WitnessPerson[]) : [];
    } catch {
      return [];
    }
  }, []);

  // 1. Synchronize summons with Firestore and local cache
  useEffect(() => {
    if (!currentUser) {
      setSummons([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const localBackup = loadLocalSummons(currentUser.uid);
    setSummons(localBackup);

    let isMounted = true;
    let unsubscribeSnapshot: (() => void) | null = null;

    try {
      const summonsCol = collection(db, 'users', currentUser.uid, 'summons');
      const q = query(summonsCol, orderBy('createdAt', 'desc'));

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const remoteItems: Summon[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteItems.push({
              ...(data as Summon),
              id: docSnap.id,
              userId: currentUser.uid,
            });
          });

          // Update state and refresh local cache
          setSummons(remoteItems);
          saveLocalSummons(currentUser.uid, remoteItems);
          checkUpcomingReminders(remoteItems);
          setIsLoading(false);
        },
        (error) => {
          console.warn('Firestore real-time subscription error (operating in offline cache mode):', error);
          if (isMounted) {
            setSummons(localBackup);
            checkUpcomingReminders(localBackup);
            setIsLoading(false);
          }
        }
      );
    } catch (err) {
      console.warn('Could not establish Firestore subscription:', err);
      if (isMounted) {
        setSummons(localBackup);
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [currentUser, loadLocalSummons, saveLocalSummons]);

  // 1b. Synchronize witnesses with Firestore and local cache
  useEffect(() => {
    if (!currentUser) {
      setWitnesses([]);
      setIsLoadingWitnesses(false);
      return;
    }

    setIsLoadingWitnesses(true);
    const localBackup = loadLocalWitnesses(currentUser.uid);
    setWitnesses(localBackup);

    let isMounted = true;
    let unsubscribeSnapshot: (() => void) | null = null;

    try {
      const witCol = collection(db, 'users', currentUser.uid, 'witnesses');
      const q = query(witCol, orderBy('createdAt', 'desc'));

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const remoteItems: WitnessPerson[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteItems.push({
              ...(data as WitnessPerson),
              id: docSnap.id,
              userId: currentUser.uid,
            });
          });

          setWitnesses(remoteItems);
          saveLocalWitnesses(currentUser.uid, remoteItems);
          setIsLoadingWitnesses(false);
        },
        (error) => {
          console.warn('Firestore witnesses subscription error (using offline cache):', error);
          if (isMounted) {
            setWitnesses(localBackup);
            setIsLoadingWitnesses(false);
          }
        }
      );
    } catch (err) {
      console.warn('Could not establish witnesses subscription:', err);
      if (isMounted) {
        setWitnesses(localBackup);
        setIsLoadingWitnesses(false);
      }
    }

    return () => {
      isMounted = false;
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [currentUser, loadLocalWitnesses, saveLocalWitnesses]);

  // 2. Upload Document Attachment to Firebase Storage
  const uploadAttachment = async (
    summonId: string,
    fileOrDataUrl: string | File,
    fileName: string
  ): Promise<string> => {
    if (!currentUser) throw new Error('Authentication required for storage upload');

    try {
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileRef = storageRef(
        storage,
        `users/${currentUser.uid}/summons/${summonId}/${Date.now()}_${safeName}`
      );

      if (typeof fileOrDataUrl === 'string') {
        if (fileOrDataUrl.startsWith('data:')) {
          await uploadString(fileRef, fileOrDataUrl, 'data_url');
          return await getDownloadURL(fileRef);
        }
        return fileOrDataUrl; // Already a remote or plain URL
      } else {
        await uploadBytes(fileRef, fileOrDataUrl);
        return await getDownloadURL(fileRef);
      }
    } catch (storageErr) {
      console.warn('Firebase Storage upload warning (using inline document preview):', storageErr);
      // Fallback: return data URL directly so image is never lost
      return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '';
    }
  };

  // 3. Add Summon (Firestore + Local Sync)
  const addSummon = async (
    summonData: Omit<Summon, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    attachmentFile?: File | Blob | null
  ): Promise<Summon> => {
    if (!currentUser) throw new Error('User must be authenticated to add summons');

    const now = new Date().toISOString();
    const summonId = 'sum_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    let finalImageUrl = summonData.imageUrl;
    let finalPdfUrl = summonData.pdfUrl;

    // Handle Storage upload if file/preview present
    if (attachmentFile && summonData.fileName) {
      try {
        const downloadUrl = await uploadAttachment(summonId, attachmentFile as File, summonData.fileName);
        if (summonData.fileName.toLowerCase().endsWith('.pdf')) {
          finalPdfUrl = downloadUrl;
        } else {
          finalImageUrl = downloadUrl;
        }
      } catch (err) {
        console.warn('Document upload warning:', err);
      }
    } else if (summonData.imageUrl && summonData.imageUrl.startsWith('data:image')) {
      try {
        const downloadUrl = await uploadAttachment(
          summonId,
          summonData.imageUrl,
          summonData.fileName || `warrant_scan_${Date.now()}.jpg`
        );
        if (downloadUrl && downloadUrl.startsWith('http')) {
          finalImageUrl = downloadUrl;
        }
      } catch {
        // Retain original data URL
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

    // Update state immediately for instant feedback
    setSummons((prev) => {
      const updated = [newSummon, ...prev.filter((s) => s.id !== summonId)];
      saveLocalSummons(currentUser.uid, updated);
      return updated;
    });

    // Write to Firestore
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'summons', summonId);
      await setDoc(docRef, newSummon);
    } catch (err) {
      console.warn('Firestore write warning (persisted locally):', err);
    }

    return newSummon;
  };

  // 4. Update Summon
  const updateSummon = async (id: string, updates: Partial<Summon>) => {
    if (!currentUser) return;

    const now = new Date().toISOString();
    const updatedRecord = { ...updates, updatedAt: now };

    setSummons((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updatedRecord } : s));
      saveLocalSummons(currentUser.uid, updated);
      return updated;
    });

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'summons', id);
      await updateDoc(docRef, updatedRecord);
    } catch (err) {
      console.warn('Firestore updateDoc warning (persisted locally):', err);
    }
  };

  // 5. Delete Summon
  const deleteSummon = async (id: string) => {
    if (!currentUser) return;

    setSummons((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveLocalSummons(currentUser.uid, updated);
      return updated;
    });

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'summons', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore deleteDoc warning:', err);
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

    // Check browser notification permission if enabling
    if (!target.reminderEnabled) {
      await requestNotificationPermission();
    }

    await updateSummon(id, {
      reminderEnabled: !target.reminderEnabled,
    });
  };

  const getSummonById = (id: string) => summons.find((s) => s.id === id);

  // 8. Witness Management CRUD
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

    setWitnesses((prev) => {
      const updated = [newWitness, ...prev.filter((w) => w.id !== witnessId)];
      saveLocalWitnesses(currentUser.uid, updated);
      return updated;
    });

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'witnesses', witnessId);
      await setDoc(docRef, newWitness);
    } catch (err) {
      console.warn('Firestore witness write error (persisted locally):', err);
    }

    return newWitness;
  };

  const updateWitness = async (id: string, updates: Partial<WitnessPerson>) => {
    if (!currentUser) return;

    const now = new Date().toISOString();
    const updatedRecord = { ...updates, updatedAt: now };

    setWitnesses((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, ...updatedRecord } : w));
      saveLocalWitnesses(currentUser.uid, updated);
      return updated;
    });

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'witnesses', id);
      await updateDoc(docRef, updatedRecord);
    } catch (err) {
      console.warn('Firestore witness updateDoc error:', err);
    }
  };

  const deleteWitness = async (id: string) => {
    if (!currentUser) return;

    setWitnesses((prev) => {
      const updated = prev.filter((w) => w.id !== id);
      saveLocalWitnesses(currentUser.uid, updated);
      return updated;
    });

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'witnesses', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore witness deleteDoc error:', err);
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
