import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, X, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  requestPushPermissionAndSubscribe,
} from '../services/fcmService';

interface NotificationPermissionBannerProps {
  onPermissionChanged?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  onPermissionChanged,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushNotificationSupported()) return;
    const current = getNotificationPermissionState();
    setPermission(current);

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('summonsmitra_push_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleEnable = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const result = await requestPushPermissionAndSubscribe();
      const newPerm = getNotificationPermissionState();
      setPermission(newPerm);

      if (result.success) {
        setStatusMessage('Device notifications activated!');
        setTimeout(() => {
          setIsDismissed(true);
          sessionStorage.setItem('summonsmitra_push_dismissed', 'true');
        }, 2500);
      } else if (result.error) {
        setStatusMessage(result.error);
      }
      if (onPermissionChanged) onPermissionChanged();
    } catch (err: any) {
      setStatusMessage(err.message || 'Could not enable notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('summonsmitra_push_dismissed', 'true');
  };

  // If not supported, already granted, or dismissed: do not render
  if (
    !isPushNotificationSupported() ||
    permission === 'granted' ||
    permission === 'denied' ||
    isDismissed
  ) {
    return null;
  }

  return (
    <div
      id="push-permission-banner"
      className="bg-card border border-border rounded-xl p-4 shadow-md transition-all duration-200 mb-5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary-btn" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-text flex-shrink-0 mt-0.5">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                Stay updated on judicial hearings
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary-text font-semibold">
                Device Push
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Enable notifications to receive real-time hearing reminders and overdue alerts on your
              device even when Summons Mitra is closed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {statusMessage ? (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1.5 rounded-lg bg-primary/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{statusMessage}</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-colors cursor-pointer"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleEnable}
                disabled={isLoading}
                id="enable-push-notifications-btn"
                className="text-xs px-4 py-2 rounded-lg bg-primary-btn text-white hover:bg-primary-hover font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isLoading ? 'Enabling...' : 'Enable Notifications'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
