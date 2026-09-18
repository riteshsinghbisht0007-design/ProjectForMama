import React from 'react';
import { X, AlertTriangle, Clock, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Summon } from '../types';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
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
                onClick={() => markAllAsRead()}
                className="text-xs text-primary hover:underline font-medium"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-card border border-border flex items-center justify-center text-emerald-400">
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
                  onClick={() => {
                    markAsRead(n.id);
                    onSelectSummon(n.summonsId);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:bg-card-hover flex flex-col gap-2 relative ${
                    !n.isRead ? 'bg-card border-primary/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'bg-background-alt border-border opacity-70'
                  }`}
                >
                  {!n.isRead && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
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
