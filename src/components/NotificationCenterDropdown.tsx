import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Calendar,
  MapPin,
  User,
  Send,
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification } from '../types';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  requestPushPermissionAndSubscribe,
  sendTestPushAlert,
} from '../services/fcmService';

interface NotificationCenterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSummon: (summonsId: string) => void;
}

function getRelativeHearingTime(hearingDateStr: string): string {
  if (!hearingDateStr) return '';
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const todayStr = new Date(now.getTime() - tzOffset).toISOString().split('T')[0];

  const matchH = hearingDateStr.trim().split('T')[0].split('-');
  const matchT = todayStr.split('-');
  if (matchH.length !== 3 || matchT.length !== 3) return hearingDateStr;

  const hUtc = Date.UTC(parseInt(matchH[0], 10), parseInt(matchH[1], 10) - 1, parseInt(matchH[2], 10));
  const tUtc = Date.UTC(parseInt(matchT[0], 10), parseInt(matchT[1], 10) - 1, parseInt(matchT[2], 10));
  const diffDays = Math.round((hUtc - tUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return 'Overdue (Yesterday)';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

function formatHearingDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  isOpen,
  onClose,
  onSelectSummon,
}) => {
  const { notifications, markAsRead, markAllAsRead, unreadCount, isLoading } = useNotifications();
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && isPushNotificationSupported()) {
      setPermission(getNotificationPermissionState());
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Check if the click target is the bell toggle itself
        const bellBtn = document.getElementById('alerts-bell-btn');
        if (bellBtn && bellBtn.contains(e.target as Node)) {
          return;
        }
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        setTestMessage('Test push sent! Check your system notification tray.');
      } else {
        setTestMessage(res.error || 'Failed to send test push alert.');
      }
    } catch (e: any) {
      setTestMessage(e.message || 'Error triggering test push alert.');
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestMessage(null), 4000);
    }
  };

  if (!isOpen) return null;

  const displayedNotifications =
    filterTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <>
      {/* Mobile backdrop to easily tap outside */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Anchored Dropdown / Panel Container */}
      <div
        ref={panelRef}
        id="notification-center-dropdown"
        role="region"
        aria-label="Judicial hearing notifications and alerts"
        className="fixed sm:absolute inset-x-3 sm:inset-auto sm:right-0 top-18 sm:top-full mt-2 sm:mt-2.5 sm:w-[420px] max-w-[calc(100vw-1.5rem)] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col max-h-[82vh] sm:max-h-[620px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Panel Header */}
        <div className="px-4 py-3 border-b border-border bg-card flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-btn/10 border border-primary-btn/20 flex items-center justify-center text-primary-text">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[11px] font-bold px-2 py-0.2 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                id="btn-mark-all-read"
                aria-label="Mark all notifications as read"
                className="text-[11px] font-semibold text-primary-text hover:text-primary-hover flex items-center gap-1 hover:underline cursor-pointer transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs: All vs Unread */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/60 dark:bg-muted/40 rounded-lg border border-border/50">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`flex-1 py-1 px-2.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`flex-1 py-1 px-2.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                filterTab === 'unread'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Device Push Notification Telemetry Bar */}
        {isPushNotificationSupported() && (
          <div className="px-3.5 py-2 bg-muted/40 border-b border-border/70 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  permission === 'granted'
                    ? 'bg-emerald-500 animate-pulse'
                    : permission === 'denied'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px] font-medium text-foreground truncate">
                {permission === 'granted'
                  ? 'Device Push Active'
                  : permission === 'denied'
                  ? 'Push Blocked in Browser'
                  : 'Push Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {permission === 'granted' ? (
                <button
                  type="button"
                  onClick={handleTestPush}
                  disabled={isTesting}
                  id="btn-test-push-dropdown"
                  title="Send immediate test alert to this device"
                  className="text-[11px] text-primary-text hover:text-primary-hover font-medium flex items-center gap-1 cursor-pointer bg-primary-btn/10 hover:bg-primary-btn/15 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                >
                  <Send className="w-2.5 h-2.5" />
                  <span>{isTesting ? 'Sending...' : 'Test Alert'}</span>
                </button>
              ) : permission === 'default' ? (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  id="btn-enable-push-dropdown"
                  className="text-[11px] text-white bg-primary-btn hover:bg-primary-hover font-medium px-2 py-0.5 rounded transition-colors cursor-pointer"
                >
                  Enable Push
                </button>
              ) : null}
            </div>
          </div>
        )}

        {testMessage && (
          <div className="px-3.5 py-1.5 bg-primary-btn/10 border-b border-primary-btn/20 text-[11px] text-primary-text font-medium text-center">
            {testMessage}
          </div>
        )}

        {/* Scrollable Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {displayedNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2.5">
              <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-foreground">You're all caught up</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                {filterTab === 'unread'
                  ? 'No unread notifications. Check the "All" tab to view past alerts.'
                  : 'No active hearing alerts or overdue summons at this time.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((n: AppNotification) => {
              const isOverdue = n.type === 'HEARING_OVERDUE';
              const isToday = n.type === 'HEARING_TODAY';
              const isTomorrow = n.type === 'HEARING_TOMORROW';
              const relativeTime = getRelativeHearingTime(n.hearingDate);
              const formattedDate = formatHearingDate(n.hearingDate);

              // Status badge configuration
              let badgeBg = 'bg-muted text-muted-foreground border-border';
              let badgeText = 'UPCOMING';
              let iconEmoji = '📅';

              if (isOverdue) {
                badgeBg = 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-bold';
                badgeText = 'OVERDUE';
                iconEmoji = '⚠️';
              } else if (isToday) {
                badgeBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold';
                badgeText = 'TODAY';
                iconEmoji = '🔴';
              } else if (isTomorrow) {
                badgeBg = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-semibold';
                badgeText = 'TOMORROW';
                iconEmoji = '🟠';
              }

              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    markAsRead(n.id);
                    onSelectSummon(n.summonsId);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      markAsRead(n.id);
                      onSelectSummon(n.summonsId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 text-left transition-all cursor-pointer relative group flex flex-col gap-2 ${
                    !n.isRead
                      ? 'bg-primary-btn/[0.03] dark:bg-primary-btn/10 border-l-4 border-l-primary-btn hover:bg-card-hover'
                      : 'bg-card/70 hover:bg-card-hover opacity-85 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Top Bar: Status Badge + Relative Time + Mark Read Action */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase font-mono tracking-wider border ${badgeBg}`}
                      >
                        <span>{iconEmoji}</span>
                        <span>{badgeText}</span>
                      </span>

                      {relativeTime && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                          {relativeTime}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!n.isRead && (
                        <span
                          className="w-2 h-2 rounded-full bg-primary-btn ring-2 ring-primary-btn/20"
                          title="Unread alert"
                        />
                      )}

                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          aria-label="Mark notification as read"
                          title="Mark as read"
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Summons / Person Name */}
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-foreground leading-snug group-hover:text-primary-text transition-colors">
                      {n.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                  </div>

                  {/* Metadata Row: Court & Date */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40 font-mono">
                    <div className="flex items-center gap-1 truncate max-w-[240px]">
                      <Calendar className="w-3 h-3 text-primary-text shrink-0" />
                      <span className="truncate font-semibold text-foreground">
                        {formattedDate || n.hearingDate}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-0.5 text-primary-text font-medium group-hover:translate-x-0.5 transition-transform">
                      <span>View details</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="px-3.5 py-2 border-t border-border bg-card flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Click any notice to open summon details</span>
          <span className="font-mono text-[10px]">Summons Mitra Alert Center</span>
        </div>
      </div>
    </>
  );
};
