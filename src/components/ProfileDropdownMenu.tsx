import React, { useEffect, useRef } from 'react';
import {
  User,
  Shield,
  Users,
  Bell,
  Star,
  Info,
  Sun,
  Moon,
  LogOut,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { SummonsMitraLogo } from './SummonsMitraLogo';

interface ProfileDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfileModal: () => void;
  onOpenWitnessDirectory?: () => void;
  onOpenAlerts?: () => void;
  onOpenAbout?: () => void;
  onOpenReviewApp?: () => void;
}

export const ProfileDropdownMenu: React.FC<ProfileDropdownMenuProps> = ({
  isOpen,
  onClose,
  onOpenProfileModal,
  onOpenWitnessDirectory,
  onOpenAlerts,
  onOpenAbout,
  onOpenReviewApp,
}) => {
  const { currentUser, logout, isDark, toggleTheme } = useAuth();
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && isOpen) {
        // Check if the click was on the profile trigger button
        const profileBtn = document.getElementById('profile-nav-btn');
        if (profileBtn && profileBtn.contains(e.target as Node)) {
          return;
        }
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!currentUser) return null;

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Backdrop for clean touch dismiss without layout shifts */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 sm:hidden"
            aria-hidden="true"
          />

          {/* Dropdown Container */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            id="profile-dropdown-menu"
            role="menu"
            aria-label="Officer Profile and Settings Menu"
            className="fixed sm:absolute right-3 sm:right-0 top-18 sm:top-full mt-2 w-[calc(100vw-24px)] sm:w-80 max-w-[340px] bg-card border border-border text-foreground rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col focus:outline-none"
          >
            {/* Officer Identity Header */}
            <div className="p-4 bg-gradient-to-b from-primary-muted/30 to-background border-b border-border">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Officer photo'}
                    className="w-11 h-11 rounded-xl object-cover border-2 border-primary/30 shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-primary-muted border border-border-strong flex items-center justify-center text-primary-text shrink-0 shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {currentUser.displayName || 'Officer'}
                    </h3>
                    {currentUser.rank && (
                      <span className="px-1.5 py-0.2 text-[10px] font-medium bg-muted text-muted-foreground rounded border border-border shrink-0">
                        {currentUser.rank}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-0.5">
                    <span className="text-warning font-semibold">#{currentUser.badgeNumber || 'N/A'}</span>
                    <span>•</span>
                    <span className="truncate">{currentUser.policeStation || 'Station PS'}</span>
                  </div>
                  {currentUser.district && (
                    <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                      {currentUser.district}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Items List */}
            <div className="p-2 space-y-1 text-xs">
              {/* 1. Edit Profile & Settings */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  onOpenProfileModal();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted text-foreground transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-medium text-xs block">Officer Details & Settings</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Edit badge, station, and alert windows
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* 2. Witness & People Directory */}
              {onOpenWitnessDirectory && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onOpenWitnessDirectory();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted text-foreground transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-xs block">Witness & People Directory</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Manage respondents, witnesses & summons
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )}

              {/* 3. Hearing & Judicial Alerts */}
              {onOpenAlerts && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onOpenAlerts();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted text-foreground transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-xs block">Priority Judicial Alerts</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Upcoming court dates & overdue notices
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )}

              {/* 4. Rate & Review App */}
              {onOpenReviewApp && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onOpenReviewApp();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted text-foreground transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-950/60 text-yellow-600 dark:text-yellow-400 group-hover:scale-105 transition-transform">
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-xs block">Feedback & Rating</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Send review & feature feedback
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )}

              {/* 5. About SummonsMitra */}
              {onOpenAbout && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onClose();
                    onOpenAbout();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted text-foreground transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-xs block">About SummonsMitra</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Features, OCR extraction & legal info
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              )}

              {/* 6. Theme Toggle */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleTheme();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted text-foreground transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:scale-105 transition-transform">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div>
                    <span className="font-medium text-xs block">
                      {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {isDark ? 'Professional crisp legal palette' : 'Eye-comfort night theme'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-muted border border-border text-muted-foreground rounded shrink-0">
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </button>
            </div>

            {/* Logout Section */}
            <div className="p-2 border-t border-border bg-muted/20">
              <button
                type="button"
                role="menuitem"
                id="profile-dropdown-logout-btn"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-medium cursor-pointer text-left"
              >
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs block font-semibold">Sign Out</span>
                  <span className="text-[10px] text-red-500/80 block truncate">
                    End current officer session
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
