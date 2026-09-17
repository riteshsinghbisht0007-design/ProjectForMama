import React, { useState, useEffect } from 'react';
import { Shield, Bell, User, Clock, CheckCircle2, Users, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSummons } from '../context/SummonContext';

interface TopNavBarProps {
  onOpenProfile: () => void;
  onOpenAlerts: () => void;
  onOpenWitnessDirectory?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onOpenProfile,
  onOpenAlerts,
  onOpenWitnessDirectory,
}) => {
  const { currentUser } = useAuth();
  const { summons } = useSummons();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };
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

  // Upcoming within 3 days
  const today = new Date().toISOString().split('T')[0];
  const upcomingCount = summons.filter((s) => {
    if (s.status === 'Completed') return false;
    const diff = new Date(s.hearingDate).getTime() - new Date(today).getTime();
    const days = diff / (1000 * 3600 * 24);
    return days >= 0 && days <= 3;
  }).length;

  return (
    <header className="sticky top-0 z-30 bg-background/80 border-b border-border backdrop-blur-xl shadow-premium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Branding & Emblem */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-muted to-background-alt border border-border-strong flex items-center justify-center shadow-inner">
            <Shield className="w-5 h-5 text-info-text" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-foreground tracking-wide">Summons Mitra</span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono uppercase bg-card border border-border-strong text-primary-text rounded">
                Official Police Portal
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden md:block">
              Court Liaison & Judicial Warrant Management
            </p>
          </div>
        </div>

        {/* Center: Live Telemetry */}
        <div className="hidden lg:flex items-center gap-4 bg-background px-3.5 py-1.5 rounded-lg border border-border">
          <div className="flex items-center gap-2 text-xs font-mono text-foreground">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <span>{timeStr}</span>
          </div>
          <span className="h-3 w-px bg-border"></span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Cloud Sync</span>
          </div>
        </div>

        {/* Right: Badge & Profile Controls */}
        <div className="flex items-center gap-2.5">
          {currentUser && (
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-foreground">{currentUser.displayName}</span>
              <span className="text-[11px] font-mono text-warning">
                Badge #{currentUser.badgeNumber}
              </span>
            </div>
          )}

          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="p-2 rounded-lg bg-card border border-border text-primary-text hover:text-primary-hover hover:shadow-[0_0_10px_rgba(6,182,212,0.4)] btn-premium cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          {/* Witness & Person Directory */}
          {onOpenWitnessDirectory && (
            <button
              onClick={onOpenWitnessDirectory}
              id="witness-directory-btn"
              title="Witness & People Directory"
              className="p-2 rounded-lg bg-card border border-border text-primary-text hover:text-primary-hover hover:shadow-[0_0_10px_rgba(6,182,212,0.4)] btn-premium cursor-pointer"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {/* Urgent Alerts Bell */}
          <button
            onClick={onOpenAlerts}
            id="alerts-bell-btn"
            title="Judicial hearing alerts"
            className="relative p-2 rounded-lg bg-card border border-border text-foreground btn-premium cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {upcomingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {upcomingCount}
              </span>
            )}
          </button>

          {/* Profile Avatar Button */}
          <button
            onClick={onOpenProfile}
            id="profile-nav-btn"
            title="Officer profile & settings"
            className="flex items-center gap-2 p-1.5 rounded-lg bg-card border border-border hover:border-border-strong btn-premium cursor-pointer"
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Officer avatar"
                className="w-7 h-7 rounded-md object-cover border border-border-strong"
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-border flex items-center justify-center text-info-text">
                <User className="w-4 h-4" />
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
