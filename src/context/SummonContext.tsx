import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Summon, MetricSummary, WitnessPerson } from '../types';
import { useAuth } from './AuthContext';
import { requestPushPermissionAndSubscribe } from '../services/fcmService';
import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from '../services/firebase';

interface SummonContextType {
  summons: Summon[];
  isLoading: boolean;
  metrics: MetricSummary;
  addSummon: (
    summonData: Omit<Summon, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    attachmentFile?: File | Blob | null
  ) => Promise<Summon>;
  updateSummon: (id: string, updates: Partial<Summon>, attachmentFile?: File | Blob | null, fileName?: string) => Promise<void>;
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

  const activeUidRef = useRef<string | null>(null);

  // Real-time Firestore synchronization for Summons & Witnesses scoped strictly to currentUser.uid
  useEffect(() => {
    let isMounted = true;
    let unsubSummons: (() => void) | null = null;
    let unsubWitnesses: (() => void) | null = null;

    if (!currentUser || !currentUser.uid) {
      activeUidRef.current = null;
      setSummons([]);
      setWitnesses([]);
      setIsLoading(false);
      setIsLoadingWitnesses(false);
      return;
    }

    const currentUid = currentUser.uid;
    activeUidRef.current = currentUid;
    setIsLoading(true);
    setIsLoadingWitnesses(true);

    try {
      // 1. Subscribe to real-time Firestore collection: users/{uid}/summons
      const summonsColRef = collection(db, 'users', currentUid, 'summons');
      unsubSummons = onSnapshot(
        summonsColRef,
        (snapshot) => {
          if (!isMounted || activeUidRef.current !== currentUid) return;

          const loadedSummons: Summon[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loadedSummons.push({
              ...(data as Summon),
              id: docSnap.id,
              userId: currentUid,
            });
          });

          // Sort chronologically by createdAt descending
          loadedSummons.sort((a, b) => {
            const timeA = new Date(a.createdAt || a.issueDate || '').getTime() || 0;
            const timeB = new Date(b.createdAt || b.issueDate || '').getTime() || 0;
            return timeB - timeA;
          });

          setSummons(loadedSummons);
          setIsLoading(false);

          // If Firestore summons collection is empty on first load, check if legacy backend has data to migrate
          if (loadedSummons.length === 0) {
            fetch('/api/summons', { credentials: 'include' })
              .then((res) => (res.ok ? res.json() : []))
              .then(async (legacySummons: Summon[]) => {
                if (legacySummons && legacySummons.length > 0 && activeUidRef.current === currentUid) {
                  console.info(`[SummonContext] Migrating ${legacySummons.length} existing summons to Firestore for UID: ${currentUid}`);
                  for (const s of legacySummons) {
                    const sId = s.id || ('sum_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
                    const docToMigrate = { ...s, id: sId, userId: currentUid };
                    await setDoc(doc(db, 'users', currentUid, 'summons', sId), docToMigrate, { merge: true }).catch(() => {});
                  }
                }
              })
              .catch(() => {});
          }
        },
        async (error) => {
          console.warn('[SummonContext] Firestore summons listener notice:', error.message || error);
          // Fallback to backend API if Firestore encounters any permission / offline block
          try {
            const res = await fetch('/api/summons', { credentials: 'include' });
            if (res.ok && isMounted && activeUidRef.current === currentUid) {
              const data = await res.json();
              setSummons(data);
            }
          } catch (fetchErr) {
            console.warn('[SummonContext] API fallback error:', fetchErr);
          } finally {
            if (isMounted) setIsLoading(false);
          }
        }
      );

      // 2. Subscribe to real-time Firestore collection: users/{uid}/witnesses
      const witnessesColRef = collection(db, 'users', currentUid, 'witnesses');
      unsubWitnesses = onSnapshot(
        witnessesColRef,
        (snapshot) => {
          if (!isMounted || activeUidRef.current !== currentUid) return;

          const loadedWitnesses: WitnessPerson[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loadedWitnesses.push({
              ...(data as WitnessPerson),
              id: docSnap.id,
              userId: currentUid,
            });
          });

          loadedWitnesses.sort((a, b) => {
            const timeA = new Date(a.createdAt || '').getTime() || 0;
            const timeB = new Date(b.createdAt || '').getTime() || 0;
            return timeB - timeA;
          });

          setWitnesses(loadedWitnesses);
          setIsLoadingWitnesses(false);
        },
        async (error) => {
          console.warn('[SummonContext] Firestore witnesses listener notice:', error.message || error);
          try {
            const res = await fetch('/api/witnesses', { credentials: 'include' });
            if (res.ok && isMounted && activeUidRef.current === currentUid) {
              const data = await res.json();
              setWitnesses(data);
            }
          } catch (fetchErr) {
            console.warn('[SummonContext] Witnesses API fallback error:', fetchErr);
          } finally {
            if (isMounted) setIsLoadingWitnesses(false);
          }
        }
      );
    } catch (err) {
      console.error('[SummonContext] Setup Firestore subscription error:', err);
      setIsLoading(false);
      setIsLoadingWitnesses(false);
    }

    return () => {
      isMounted = false;
      if (unsubSummons) unsubSummons();
      if (unsubWitnesses) unsubWitnesses();
    };
  }, [currentUser]);

  const uploadAttachment = async (
    summonId: string,
    fileOrDataUrl: string | File,
    fileName: string
  ): Promise<string> => {
    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
      return fileOrDataUrl;
    }

    try {
      const { storage, storageRef, uploadBytes, getDownloadURL, isFirebaseConfigured } = await import('../services/firebase');
      
      let fileToUpload: File | Blob;
      if (typeof fileOrDataUrl === 'string') {
        const res = await fetch(fileOrDataUrl);
        fileToUpload = await res.blob();
      } else {
        fileToUpload = fileOrDataUrl;
      }

      if (!isFirebaseConfigured || !storage) {
        throw new Error('Firebase Storage not configured, falling back to local base64.');
      }

      const fileRef = storageRef(storage, `summons/${currentUser?.uid}/${summonId}_${fileName}`);
      
      // Add timeout to prevent hanging
      const uploadPromise = uploadBytes(fileRef, fileToUpload);
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), 10000));
      
      await Promise.race([uploadPromise, timeoutPromise]);
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (err) {
      console.warn('Failed to upload attachment, falling back to data URL:', err);
      // Fallback to dataURL if upload fails
      if (typeof fileOrDataUrl === 'string') return fileOrDataUrl;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.readAsDataURL(fileOrDataUrl);
      });
    }
  };

  const addSummon = async (
    summonData: Omit<Summon, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    attachmentFile?: File | Blob | null
  ): Promise<Summon> => {
    if (!currentUser || !currentUser.uid) throw new Error('User must be authenticated to add summons');
    
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

    // 1. Primary write to Firestore under users/{uid}/summons/{summonId}
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'summons', summonId);
      await setDoc(docRef, newSummon);
    } catch (fsErr) {
      console.warn('[SummonContext] Firestore addSummon notice:', fsErr);
    }

    // 2. Also synchronize with backend API endpoint
    try {
      await fetch('/api/summons', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSummon)
      });
    } catch (apiErr) {
      console.warn('[SummonContext] Backend sync addSummon notice:', apiErr);
    }

    // Local state is updated via Firestore onSnapshot, but update immediately for instant responsiveness
    setSummons((prev) => {
      const updated = [newSummon, ...prev.filter((s) => s.id !== summonId)];
      return updated;
    });

    return newSummon;
  };

  const updateSummon = async (id: string, updates: Partial<Summon>, attachmentFile?: File | Blob | null, fileName?: string) => {
    if (!currentUser || !currentUser.uid) return;
    const now = new Date().toISOString();
    let finalImageUrl = updates.imageUrl;
    let finalPdfUrl = updates.pdfUrl;
    if (attachmentFile && fileName) {
      const dataUrl = await uploadAttachment(id, attachmentFile as File, fileName);
      if (fileName.toLowerCase().endsWith('.pdf')) {
        finalPdfUrl = dataUrl;
      } else {
        finalImageUrl = dataUrl;
      }
    }
    const updatedRecord = {
      ...updates,
      updatedAt: now,
      ...(finalImageUrl !== undefined && { imageUrl: finalImageUrl }),
      ...(finalPdfUrl !== undefined && { pdfUrl: finalPdfUrl })
    };

    // 1. Update in Firestore under users/{uid}/summons/{id}
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'summons', id);
      await setDoc(docRef, updatedRecord, { merge: true });
    } catch (fsErr) {
      console.warn('[SummonContext] Firestore updateSummon notice:', fsErr);
    }

    // 2. Synchronize with backend API
    try {
      await fetch(`/api/summons/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord)
      });
    } catch (apiErr) {
      console.warn('[SummonContext] Backend sync updateSummon notice:', apiErr);
    }

    setSummons((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updatedRecord } : s));
      return updated;
    });
  };

  const deleteSummon = async (id: string) => {
    if (!currentUser || !currentUser.uid) return;
    try {
      const summonToDelete = summons.find(s => s.id === id);

      // 1. Delete from Firestore under users/{uid}/summons/{id}
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'summons', id);
        await deleteDoc(docRef);
      } catch (fsErr) {
        console.warn('[SummonContext] Firestore deleteSummon notice:', fsErr);
      }

      // 2. Delete from backend API
      try {
        await fetch(`/api/summons/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch (apiErr) {
        console.warn('[SummonContext] Backend sync deleteSummon notice:', apiErr);
      }

      if (summonToDelete) {
        try {
          const { storage, deleteObject, storageRef, isFirebaseConfigured } = await import('../services/firebase');
          if (isFirebaseConfigured && storage) {
            if (summonToDelete.imageUrl && summonToDelete.imageUrl.includes('firebasestorage.googleapis.com')) {
               const fileRef = storageRef(storage, summonToDelete.imageUrl);
               await deleteObject(fileRef).catch(() => {});
            }
            if (summonToDelete.pdfUrl && summonToDelete.pdfUrl.includes('firebasestorage.googleapis.com')) {
               const fileRef = storageRef(storage, summonToDelete.pdfUrl);
               await deleteObject(fileRef).catch(() => {});
            }
          }
        } catch (e) {}
      }

      setSummons((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete summon:", err);
      throw err;
    }
  };

  const markAsServed = async (id: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    await updateSummon(id, {
      status: 'Completed',
      servedDate: today,
      servedNotes: notes || 'Summon served in person. Official receipt signed by recipient.',
    });
  };

  const toggleReminder = async (id: string) => {
    const target = summons.find((s) => s.id === id);
    if (!target) return;
    if (!target.reminderEnabled) {
      await requestPushPermissionAndSubscribe().catch(() => {});
    }
    await updateSummon(id, {
      reminderEnabled: !target.reminderEnabled,
    });
  };

  const getSummonById = (id: string) => summons.find((s) => s.id === id);

  const addWitness = async (
    witnessData: Omit<WitnessPerson, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<WitnessPerson> => {
    if (!currentUser || !currentUser.uid) throw new Error('User must be authenticated to add witnesses');
    const now = new Date().toISOString();
    const witnessId = 'wit_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const newWitness: WitnessPerson = {
      ...witnessData,
      id: witnessId,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Write to Firestore users/{uid}/witnesses/{witnessId}
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'witnesses', witnessId);
      await setDoc(docRef, newWitness);
    } catch (fsErr) {
      console.warn('[SummonContext] Firestore addWitness notice:', fsErr);
    }

    // 2. Write to backend API
    try {
      await fetch('/api/witnesses', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWitness)
      });
    } catch (apiErr) {
      console.warn('[SummonContext] Backend sync addWitness notice:', apiErr);
    }

    setWitnesses((prev) => {
      const updated = [newWitness, ...prev.filter((w) => w.id !== witnessId)];
      return updated;
    });

    return newWitness;
  };

  const updateWitness = async (id: string, updates: Partial<WitnessPerson>) => {
    if (!currentUser || !currentUser.uid) return;
    const now = new Date().toISOString();
    const updatedRecord = { ...updates, updatedAt: now };

    // 1. Update in Firestore
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'witnesses', id);
      await setDoc(docRef, updatedRecord, { merge: true });
    } catch (fsErr) {
      console.warn('[SummonContext] Firestore updateWitness notice:', fsErr);
    }

    // 2. Update in backend API
    try {
      await fetch(`/api/witnesses/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord)
      });
    } catch (apiErr) {
      console.warn('[SummonContext] Backend sync updateWitness notice:', apiErr);
    }

    setWitnesses((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, ...updatedRecord } : w));
      return updated;
    });
  };

  const deleteWitness = async (id: string) => {
    if (!currentUser || !currentUser.uid) return;
    try {
      // 1. Delete from Firestore
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'witnesses', id);
        await deleteDoc(docRef);
      } catch (fsErr) {
        console.warn('[SummonContext] Firestore deleteWitness notice:', fsErr);
      }

      // 2. Delete from backend API
      try {
        await fetch(`/api/witnesses/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch (apiErr) {
        console.warn('[SummonContext] Backend sync deleteWitness notice:', apiErr);
      }

      setWitnesses((prev) => {
        const updated = prev.filter((w) => w.id !== id);
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete witness:", err);
      throw err;
    }
  };

  const getWitnessById = (id: string) => witnesses.find((w) => w.id === id);

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

