import React, { useState, useEffect } from 'react';
import { Bell, User, Clock, CheckCircle2, Users, Sun, Moon, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSummons } from '../context/SummonContext';
import { useNotifications } from '../context/NotificationContext';
import { NotificationCenterDropdown } from './NotificationCenterDropdown';
import { ProfileDropdownMenu } from './ProfileDropdownMenu';
import { SummonsMitraLogo } from './SummonsMitraLogo';

interface TopNavBarProps {
  onOpenProfile: () => void;
  onOpenAlerts?: () => void;
  onOpenWitnessDirectory?: () => void;
  onOpenAbout?: () => void;
  onOpenReviewApp?: () => void;
  onSelectSummon: (summonsId: string) => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onOpenProfile,
  onOpenAlerts,
  onOpenWitnessDirectory,
  onOpenAbout,
  onOpenReviewApp,
  onSelectSummon,
}) => {
  const { currentUser, isDark, toggleTheme } = useAuth();
  const { summons } = useSummons();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  // Live real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-30 bg-background/90 border-b border-border backdrop-blur-xl shadow-premium">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Branding & Official Logo (Clickable -> Opens About SummonsMitra) */}
        <button
          type="button"
          onClick={onOpenAbout}
          id="top-logo-about-btn"
          aria-label="About SummonsMitra"
          title="About SummonsMitra"
          className="flex items-center gap-2.5 sm:gap-3 group text-left p-1 -m-1 rounded-xl transition-all duration-150 hover:bg-card/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <SummonsMitraLogo
            className="w-9 h-9 sm:w-10 sm:h-10 transition-transform duration-200 group-hover:scale-105"
          />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg text-foreground tracking-wide group-hover:text-primary-text transition-colors">
                SummonsMitra
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono uppercase bg-card border border-border-strong text-primary-text rounded group-hover:border-primary-text/40 transition-colors">
                Official Police Portal
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden md:block">
              Court Liaison & Judicial Warrant Management
            </p>
          </div>
        </button>

        {/* Center: Live Telemetry */}
        <div className="hidden lg:flex items-center gap-4 bg-card px-3.5 py-1.5 rounded-lg border border-border shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-mono text-foreground">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <span>{timeStr}</span>
          </div>
          <span className="h-3 w-px bg-border"></span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
            <span>Encrypted Cloud Sync</span>
          </div>
        </div>

        {/* Right: Badge & Profile Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {currentUser && (
            <div className="hidden md:flex flex-col text-right pr-1">
              <span className="text-xs font-medium text-foreground">{currentUser.displayName}</span>
              <span className="text-[11px] font-mono text-amber-600 dark:text-warning font-semibold">
                Badge #{currentUser.badgeNumber}
              </span>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            id="theme-toggle-btn"
            aria-label="Toggle light and dark theme"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl bg-card border border-border text-foreground hover:border-primary-btn/60 hover:text-primary-btn btn-premium cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
          </button>
          
          {/* Witness & Person Directory */}
          {onOpenWitnessDirectory && (
            <button
              type="button"
              onClick={onOpenWitnessDirectory}
              id="witness-directory-btn"
              aria-label="Open Witness and People Directory"
              title="Witness & People Directory"
              className="p-2 rounded-xl bg-card border border-border text-foreground hover:border-primary-btn/60 hover:text-primary-btn btn-premium cursor-pointer"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {/* Urgent Alerts Bell & Notification Center Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsNotificationOpen((prev) => !prev);
                setIsProfileMenuOpen(false);
                if (onOpenAlerts) onOpenAlerts();
              }}
              id="alerts-bell-btn"
              aria-label={`Notifications and judicial alerts (${unreadCount} unread)`}
              aria-expanded={isNotificationOpen}
              aria-haspopup="true"
              title="Notifications & Hearing Alerts"
              className={`relative p-2 rounded-xl bg-card border text-foreground hover:border-primary-btn hover:text-primary-btn btn-premium cursor-pointer transition-all duration-150 active:scale-95 ${
                isNotificationOpen
                  ? 'border-primary-btn text-primary-btn ring-2 ring-primary-btn/20 shadow-sm'
                  : 'border-border'
              }`}
            >
              <Bell className={`w-4 h-4 transition-transform duration-200 ${isNotificationOpen ? 'rotate-12' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 dark:bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse pointer-events-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationCenterDropdown
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              onSelectSummon={(summonId) => {
                setIsNotificationOpen(false);
                onSelectSummon(summonId);
              }}
            />
          </div>

          {/* Profile Menu Dropdown Trigger Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen((prev) => !prev);
                setIsNotificationOpen(false);
              }}
              id="profile-nav-btn"
              aria-label="Officer profile and menu"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="true"
              title="Officer profile & options"
              className={`flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl bg-card border transition-all duration-150 btn-premium cursor-pointer ${
                isProfileMenuOpen
                  ? 'border-primary-btn ring-2 ring-primary-btn/20 shadow-sm'
                  : 'border-border hover:border-border-strong'
              }`}
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Officer avatar"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-border-strong shrink-0"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-muted border border-border flex items-center justify-center text-primary-text shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            <ProfileDropdownMenu
              isOpen={isProfileMenuOpen}
              onClose={() => setIsProfileMenuOpen(false)}
              onOpenProfileModal={onOpenProfile}
              onOpenWitnessDirectory={onOpenWitnessDirectory}
              onOpenAlerts={onOpenAlerts}
              onOpenAbout={onOpenAbout}
              onOpenReviewApp={onOpenReviewApp}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
