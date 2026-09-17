import React, { useState, useEffect } from 'react';
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
import { ImageCropperModal } from './ImageCropperModal';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setBadgeNumber(currentUser.badgeNumber || '');
      setPoliceStation(currentUser.policeStation || '');
      setDistrict(currentUser.district || '');
      setRank(currentUser.rank || '');
      setPhotoURL(currentUser.photoURL || '');
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateOfficerProfile({
        displayName,
        badgeNumber,
        policeStation,
        district,
        rank,
        photoURL,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    setCropImageSrc(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPhotoURL(base64);
      updateOfficerProfile({ photoURL: base64 }).catch(err => {
        alert("Failed to save profile picture: " + err.message);
      });
    };
    reader.readAsDataURL(croppedBlob);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md  overflow-y-auto animate-fadeIn">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg my-8 overflow-hidden shadow-premium-hover animate-scaleIn flex flex-col">
        {/* Header */}
        <div className="bg-background-alt border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-muted text-primary-text">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Officer Profile & Telemetry</h2>
              <p className="text-xs text-muted-foreground">
                Authenticated as Law Enforcement Personnel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Officer Identity Card */}
          <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl relative">
            <div className="relative">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Officer portrait"
                  className="w-16 h-16 rounded-xl object-cover border-2 border-border-strong"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-info-text border-2 border-border-strong">
                  <User className="w-8 h-8" />
                </div>
              )}
              <label
                htmlFor="avatar-file"
                className="absolute -bottom-1 -right-1 p-1 bg-primary-btn text-white hover:bg-primary-hover rounded-md cursor-pointer shadow"
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
                <h3 className="text-base font-bold text-foreground truncate">{currentUser.displayName}</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-primary-muted text-primary-text rounded uppercase">
                  {currentUser.authProvider}
                </span>
              </div>
              <p className="text-xs font-mono text-warning mt-0.5">
                Badge #{currentUser.badgeNumber} • {currentUser.rank}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {currentUser.policeStation}, {currentUser.district}
              </p>
            </div>
          </div>

          {/* System Telemetry & Isolation */}
          <div className="p-3.5 bg-background-alt border border-border rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Hardware-Isolated Account:</span>
              <span className="font-mono text-foreground text-[11px]">{currentUser.uid}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Active User Records:</span>
              <span className="font-mono text-primary-text">{summons.length} Summons</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Encryption Protocol:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> End-to-End Vault
              </span>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-3 border-t border-border pt-4">
            <span className="text-xs font-bold text-primary-text uppercase tracking-wider block">
              Officer Credentials
            </span>

            {saveSuccess && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-700/60 rounded text-xs text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Profile credentials updated successfully!
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Full Officer Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Badge Number</label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Rank / Designation</label>
                <input
                  type="text"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Police Station</label>
                <input
                  type="text"
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">District / Jurisdiction</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-btn text-white hover:bg-primary-hover hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save Profile
              </button>
            </div>
          </form>

          {/* Logout Button */}
          <div className="border-t border-border pt-4">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              id="logout-btn"
              className="w-full py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-200 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-red-200 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isLoggingOut ? 'Ending Session...' : 'End Officer Session & Log Out'}
            </button>
          </div>
        </div>
          </div>

      {cropImageSrc && (
        <ImageCropperModal
          isOpen={true}
          onClose={() => setCropImageSrc(null)}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={1} // Square for profile
        />
      )}
    </div>
  );
};
