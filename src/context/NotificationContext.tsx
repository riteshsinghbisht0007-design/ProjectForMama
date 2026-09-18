import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { useSummons } from './SummonContext';

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

  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (unreadCount > 0 && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const latestUnread = notifications.find(n => !n.isRead);
      if (latestUnread) {
        // Prevent spamming the same notification repeatedly using sessionStorage
        const shownKey = 'notif_shown_' + latestUnread.id;
        if (!sessionStorage.getItem(shownKey)) {
          sessionStorage.setItem(shownKey, 'true');
          new Notification(latestUnread.title, {
            body: latestUnread.message,
            icon: '/favicon.ico'
          });
        }
      }
    }
  }, [unreadCount, notifications]);


  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    
    // Calculate "today" in local timezone as YYYY-MM-DD
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, -1);
    const todayStr = localISOTime.split('T')[0];

    try {
      setIsLoading(true);
      const res = await fetch(`/api/notifications?today=${todayStr}&upcomingDays=${currentUser?.upcomingAlertDays || 7}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        // Sort by priority logic: Overdue > Today > Tomorrow > Upcoming
        // and then by nearest date. Backend sorts by createdAt DESC.
        const order = {
          'HEARING_OVERDUE': 1,
          'HEARING_TODAY': 2,
          'HEARING_TOMORROW': 3,
          'HEARING_UPCOMING': 4
        };
        const sorted = data.sort((a: any, b: any) => {
          if (order[a.type as keyof typeof order] !== order[b.type as keyof typeof order]) {
            return order[a.type as keyof typeof order] - order[b.type as keyof typeof order];
          }
          return new Date(a.hearingDate).getTime() - new Date(b.hearingDate).getTime();
        });
        
        setNotifications(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
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

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        credentials: 'include'
      });
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      fetchNotifications,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
