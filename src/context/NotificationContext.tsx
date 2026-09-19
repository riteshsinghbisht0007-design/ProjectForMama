import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { useSummons } from './SummonContext';
import { onForegroundMessage } from '../services/fcmService';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { summons } = useSummons();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    // Calculate "today" in local timezone as YYYY-MM-DD
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, -1);
    const todayStr = localISOTime.split('T')[0];

    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/notifications?today=${todayStr}&upcomingDays=${currentUser?.upcomingAlertDays || 7}`,
        {
          credentials: 'include',
        }
      );
      if (res.ok) {
        const data = await res.json();
        // Sort by priority order: Overdue (1) > Today (2) > Tomorrow (3) > Upcoming (4)
        const order: Record<string, number> = {
          HEARING_OVERDUE: 1,
          HEARING_TODAY: 2,
          HEARING_TOMORROW: 3,
          HEARING_UPCOMING: 4,
        };
        const sorted = data.sort((a: any, b: any) => {
          const orderA = order[a.type] || 99;
          const orderB = order[b.type] || 99;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return new Date(a.hearingDate).getTime() - new Date(b.hearingDate).getTime();
        });

        setNotifications(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [currentUser, summons, fetchNotifications]);

  // Listen for real-time foreground messages from FCM to refresh notifications seamlessly
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    onForegroundMessage(() => {
      fetchNotifications();
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
