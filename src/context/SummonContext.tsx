import React, { createContext, useContext, useState, useEffect } from 'react';
import { Summon, MetricSummary } from '../types';
import { useAuth } from './AuthContext';

interface SummonContextType {
  summons: Summon[];
  isLoading: boolean;
  metrics: MetricSummary;
  addSummon: (
    summonData: Omit<Summon, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => Promise<Summon>;
  updateSummon: (id: string, updates: Partial<Summon>) => Promise<void>;
  deleteSummon: (id: string) => Promise<void>;
  markAsServed: (id: string, notes?: string) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  getSummonById: (id: string) => Summon | undefined;
}

const SummonContext = createContext<SummonContextType | undefined>(undefined);

export const SummonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [summons, setSummons] = useState<Summon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Storage key is strictly scoped per user: users/{userId}/summons
  const getStorageKey = (uid: string) => `users_${uid}_summons`;

  // Load summons whenever active user changes
  useEffect(() => {
    if (!currentUser) {
      setSummons([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const key = getStorageKey(currentUser.uid);
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data) as Summon[];
        setSummons(parsed);
      } else {
        // Starting state for new users: 0 summons, empty list as required
        setSummons([]);
      }
    } catch (err) {
      console.error('Failed to load user summons:', err);
      setSummons([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Persist helper
  const persistSummons = (updated: Summon[]) => {
    if (!currentUser) return;
    const key = getStorageKey(currentUser.uid);
    localStorage.setItem(key, JSON.stringify(updated));
    setSummons(updated);
  };

  const addSummon = async (
    summonData: Omit<Summon, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Summon> => {
    if (!currentUser) {
      throw new Error('User must be logged in to save summons');
    }

    const now = new Date().toISOString();
    const newSummon: Summon = {
      ...summonData,
      id: 'sum_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newSummon, ...summons];
    persistSummons(updated);
    return newSummon;
  };

  const updateSummon = async (id: string, updates: Partial<Summon>) => {
    const updated = summons.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    persistSummons(updated);
  };

  const deleteSummon = async (id: string) => {
    const updated = summons.filter((s) => s.id !== id);
    persistSummons(updated);
  };

  const markAsServed = async (id: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = summons.map((s) =>
      s.id === id
        ? {
            ...s,
            status: 'Completed' as const,
            servedDate: today,
            servedNotes: notes || 'Summon served in person with receipt copy signed.',
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    persistSummons(updated);
  };

  const toggleReminder = async (id: string) => {
    const target = summons.find((s) => s.id === id);
    if (!target) return;
    const updated = summons.map((s) =>
      s.id === id
        ? {
            ...s,
            reminderEnabled: !s.reminderEnabled,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    persistSummons(updated);
  };

  const getSummonById = (id: string) => summons.find((s) => s.id === id);

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
