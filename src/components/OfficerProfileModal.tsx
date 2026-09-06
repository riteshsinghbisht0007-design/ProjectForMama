import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  BadgeAlert,
  LogOut,
  Save,
  CheckCircle2,
  Building,
  MapPin,
  Mail,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSummons } from '../context/SummonContext';

interface OfficerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficerProfileModal: React.FC<OfficerProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, logout, updateOfficerProfile } = useAuth();
  const { summons } = useSummons();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [badgeNumber, setBadgeNumber] = useState(currentUser?.badgeNumber || '');
  const [policeStation, setPoliceStation] = useState(currentUser?.policeStation || '');
  const [district, setDistrict] = useState(currentUser?.district || '');
  const [rank, setRank] = useState(currentUser?.rank || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateOfficerProfile({
      displayName,
      badgeNumber,
      policeStation,
      district,
      rank,
      photoURL,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out of the police summon portal?')) {
      onClose();
      logout();
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoURL(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B1326] border border-[#222A3D] rounded-2xl w-full max-w-lg my-8 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-[#0A192F] border-b border-[#222A3D] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1E3A5F] text-[#ADC8F5]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Officer Profile & Telemetry</h2>
              <p className="text-xs text-[#8F9097]">
                Authenticated as Law Enforcement Personnel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8F9097] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Officer Identity Card */}
          <div className="flex items-center gap-4 p-4 bg-[#131B2E] border border-[#222A3D] rounded-xl relative">
            <div className="relative">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Officer portrait"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-[#39475F]"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#1E293B] flex items-center justify-center text-[#B9C7E4] border-2 border-[#39475F]">
                  <User className="w-8 h-8" />
                </div>
              )}
              <label
                htmlFor="avatar-file"
                className="absolute -bottom-1 -right-1 p-1 bg-[#2F4A70] hover:bg-[#3B82F6] text-white rounded-md cursor-pointer shadow"
              >
                <Camera className="w-3 h-3" />
                <input
                  id="avatar-file"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">{currentUser.displayName}</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#1E3A5F] text-[#ADC8F5] rounded uppercase">
                  {currentUser.authProvider}
                </span>
              </div>
              <p className="text-xs font-mono text-[#FFB77D] mt-0.5">
                Badge #{currentUser.badgeNumber} • {currentUser.rank}
              </p>
              <p className="text-xs text-[#8F9097] truncate mt-0.5">
                {currentUser.policeStation}, {currentUser.district}
              </p>
            </div>
          </div>

          {/* System Telemetry & Isolation */}
          <div className="p-3.5 bg-[#0A192F] border border-[#222A3D] rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between text-[#8F9097]">
              <span>Hardware-Isolated Account:</span>
              <span className="font-mono text-white text-[11px]">{currentUser.uid}</span>
            </div>
            <div className="flex items-center justify-between text-[#8F9097]">
              <span>Active User Records:</span>
              <span className="font-mono text-[#ADC8F5]">{summons.length} Summons</span>
            </div>
            <div className="flex items-center justify-between text-[#8F9097]">
              <span>Encryption Protocol:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> End-to-End Vault
              </span>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-3 border-t border-[#222A3D] pt-4">
            <span className="text-xs font-bold text-[#ADC8F5] uppercase tracking-wider block">
              Officer Credentials
            </span>

            {saveSuccess && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-700/60 rounded text-xs text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Profile credentials updated successfully!
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#8F9097] block mb-1">Full Officer Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8F9097] block mb-1">Badge Number</label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#8F9097] block mb-1">Rank / Designation</label>
                <input
                  type="text"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8F9097] block mb-1">Police Station</label>
                <input
                  type="text"
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#8F9097] block mb-1">District / Jurisdiction</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-[#131B2E] border border-[#222A3D] rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-[#2F4A70] hover:bg-[#3B82F6] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save Profile
              </button>
            </div>
          </form>

          {/* Logout Button */}
          <div className="border-t border-[#222A3D] pt-4">
            <button
              onClick={handleLogout}
              id="logout-btn"
              className="w-full py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" /> End Officer Session & Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
