import React, { useState, useEffect } from 'react';
import { Shield, Bell, User, Clock, CheckCircle2, Users } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-[#0A192F] border-b border-[#222A3D] backdrop-blur-md bg-opacity-95 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Branding & Emblem */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#0A192F] border border-[#39475F] flex items-center justify-center shadow-inner">
            <Shield className="w-5 h-5 text-[#B9C7E4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-wide">Summons Mitra</span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono uppercase bg-[#131B2E] border border-[#39475F] text-[#ADC8F5] rounded">
                Official Police Portal
              </span>
            </div>
            <p className="text-[11px] text-[#8F9097] hidden md:block">
              Court Liaison & Judicial Warrant Management
            </p>
          </div>
        </div>

        {/* Center: Live Telemetry */}
        <div className="hidden lg:flex items-center gap-4 bg-[#0B1326] px-3.5 py-1.5 rounded-lg border border-[#222A3D]">
          <div className="flex items-center gap-2 text-xs font-mono text-[#DAE2FD]">
            <Clock className="w-3.5 h-3.5 text-[#FFB77D]" />
            <span>{timeStr}</span>
          </div>
          <span className="h-3 w-px bg-[#222A3D]"></span>
          <div className="flex items-center gap-1.5 text-xs text-[#8F9097]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Cloud Sync</span>
          </div>
        </div>

        {/* Right: Badge & Profile Controls */}
        <div className="flex items-center gap-2.5">
          {currentUser && (
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-white">{currentUser.displayName}</span>
              <span className="text-[11px] font-mono text-[#FFB77D]">
                Badge #{currentUser.badgeNumber}
              </span>
            </div>
          )}

          {/* Witness & Person Directory */}
          {onOpenWitnessDirectory && (
            <button
              onClick={onOpenWitnessDirectory}
              id="witness-directory-btn"
              title="Witness & People Directory"
              className="p-2 rounded-lg bg-[#131B2E] border border-[#222A3D] hover:bg-[#1E293B] text-[#ADC8F5] hover:text-white transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {/* Urgent Alerts Bell */}
          <button
            onClick={onOpenAlerts}
            id="alerts-bell-btn"
            title="Judicial hearing alerts"
            className="relative p-2 rounded-lg bg-[#131B2E] border border-[#222A3D] hover:bg-[#1E293B] text-[#DAE2FD] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {upcomingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {upcomingCount}
              </span>
            )}
          </button>

          {/* Profile Avatar Button */}
          <button
            onClick={onOpenProfile}
            id="profile-nav-btn"
            title="Officer profile & settings"
            className="flex items-center gap-2 p-1.5 rounded-lg bg-[#131B2E] border border-[#222A3D] hover:border-[#39475F] transition-all"
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Officer avatar"
                className="w-7 h-7 rounded-md object-cover border border-[#39475F]"
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-[#222A3D] flex items-center justify-center text-[#B9C7E4]">
                <User className="w-4 h-4" />
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
