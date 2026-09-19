import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock, Calendar, CheckCircle2, ArrowRight, Bell, Send, ShieldAlert } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Summon } from '../types';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  requestPushPermissionAndSubscribe,
  sendTestPushAlert,
} from '../services/fcmService';

interface NotificationPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSummon: (summonsId: string) => void;
}

export const NotificationPanelModal: React.FC<NotificationPanelModalProps> = ({
  isOpen,
  onClose,
  onSelectSummon,
}) => {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isPushNotificationSupported()) {
      setPermission(getNotificationPermissionState());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleEnablePush = async () => {
    const result = await requestPushPermissionAndSubscribe();
    setPermission(getNotificationPermissionState());
    if (result.success) {
      setTestMessage('Device push enabled!');
      setTimeout(() => setTestMessage(null), 3000);
    } else if (result.error) {
      setTestMessage(result.error);
    }
  };

  const handleTestPush = async () => {
    setIsTesting(true);
    setTestMessage(null);
    try {
      const res = await sendTestPushAlert();
      if (res.success) {
        setTestMessage('Test push sent! Check your notification tray.');
      } else {
        setTestMessage(res.error || 'Failed to send test push.');
      }
    } catch (e: any) {
      setTestMessage(e.message || 'Error triggering test push.');
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestMessage(null), 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="notification-panel-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-background border-l border-border w-full max-w-sm h-full shadow-2xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="bg-background border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs text-primary-text hover:underline font-medium cursor-pointer"
              >
                Mark all as read
              </button>
            )}
            <button
              type="button"
              id="close-notifications-panel-btn"
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center border border-transparent hover:border-border"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Device Push Status & Test Header */}
        {isPushNotificationSupported() && (
          <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    permission === 'granted'
                      ? 'bg-emerald-500 animate-pulse'
                      : permission === 'denied'
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="text-[11px] font-semibold text-foreground">
                  {permission === 'granted'
                    ? 'Device Push Active'
                    : permission === 'denied'
                    ? 'Push Blocked in Browser'
                    : 'Push Alerts Inactive'}
                </span>
              </div>

              {permission === 'granted' ? (
                <button
                  type="button"
                  onClick={handleTestPush}
                  disabled={isTesting}
                  id="test-push-btn"
                  title="Send immediate test alert to this device"
                  className="text-[11px] text-primary hover:text-primary-hover font-medium flex items-center gap-1 cursor-pointer bg-primary/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  {isTesting ? 'Sending...' : 'Test Alert'}
                </button>
              ) : permission === 'default' ? (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  id="enable-push-panel-btn"
                  className="text-[11px] text-white bg-primary hover:bg-primary/90 font-medium px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  Enable Push
                </button>
              ) : null}
            </div>

            {testMessage && (
              <p className="text-[10px] text-primary font-medium leading-tight">
                {testMessage}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-card border border-border flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-foreground">You're all caught up</p>
              <p className="text-xs">No priority hearing alerts right now.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isOverdue = n.type === 'HEARING_OVERDUE';
              const isToday = n.type === 'HEARING_TODAY';
              const isTomorrow = n.type === 'HEARING_TOMORROW';

              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      markAsRead(n.id);
                      onSelectSummon(n.summonsId);
                      onClose();
                    }
                  }}
                  onClick={() => {
                    markAsRead(n.id);
                    onSelectSummon(n.summonsId);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:bg-card-hover flex flex-col gap-2 relative focus:outline-none focus:ring-2 focus:ring-primary ${
                    !n.isRead ? 'bg-card border-[#2563EB]/50 shadow-sm' : 'bg-background-alt border-border opacity-70'
                  }`}
                >
                  {!n.isRead && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {isOverdue ? '⚠️' : isToday ? '🔴' : isTomorrow ? '🟠' : '🟡'}
                    </span>
                    <span className="font-bold text-sm text-foreground">{n.title}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Hearing: {n.hearingDate}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
