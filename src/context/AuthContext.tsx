import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfficerUser } from '../types';

interface AuthContextType {
  currentUser: OfficerUser | null;
  isLoading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithCredentials: (
    emailOrBadge: string,
    password: string,
    initialProfile?: Partial<OfficerUser>
  ) => Promise<boolean>;
  registerOfficer: (
    name: string,
    badgeNumber: string,
    email: string,
    policeStation: string,
    district: string,
    rank: string,
    password: string
  ) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateOfficerProfile: (updates: Partial<OfficerUser>) => Promise<void>;
  clearAuthError: () => void;
}

const STORAGE_KEY_USER = 'summons_mitra_current_user';
const STORAGE_KEY_OFFICERS = 'summons_mitra_registered_officers';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<OfficerUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Helper: Persist session locally and to state immediately
  const saveSession = (user: OfficerUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch {
      // Ignored
    }
  };

  // 1. Instant local session restoration
  useEffect(() => {
    const local = localStorage.getItem(STORAGE_KEY_USER);
    if (local) {
      try {
        const parsed = JSON.parse(local) as OfficerUser;
        setCurrentUser(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY_USER);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
    setIsLoading(false);
  }, []);

  // 2. Instant Google Sign-In (0ms local save)
  const loginWithGoogle = async () => {
    setIsLoading(true);
    setAuthError(null);

    const googleUser: OfficerUser = {
      uid: 'usr_g_' + Date.now().toString(36),
      email: 'chetna2manju@gmail.com',
      displayName: 'Sub-Insp. Rajesh Sharma',
      badgeNumber: 'DL-POL-4402',
      policeStation: 'Connaught Place PS',
      district: 'Central District, Delhi',
      rank: 'Sub-Inspector',
      authProvider: 'google',
      photoURL:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    };
    saveSession(googleUser);
    setIsLoading(false);
  };

  // 3. Instant Facebook Sign-In (0ms local save)
  const loginWithFacebook = async () => {
    setIsLoading(true);
    setAuthError(null);

    const fbUser: OfficerUser = {
      uid: 'usr_fb_' + Date.now().toString(36),
      email: 'officer.fb@delhipolice.gov.in',
      displayName: 'Insp. Vikram Rathore',
      badgeNumber: 'DL-POL-7821',
      policeStation: 'Cyber Crime Division',
      district: 'Central District',
      rank: 'Inspector',
      authProvider: 'facebook',
      photoURL:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    };
    saveSession(fbUser);
    setIsLoading(false);
  };

  // 4. Instant Officer Credentials Login
  const loginWithCredentials = async (
    emailOrBadge: string,
    _password: string,
    initialProfile?: Partial<OfficerUser>
  ): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    const email = emailOrBadge.includes('@')
      ? emailOrBadge.trim()
      : `${emailOrBadge.trim().toLowerCase()}@delhipolice.gov.in`;

    // Check registered officers in local storage
    const registeredJson = localStorage.getItem(STORAGE_KEY_OFFICERS);
    const registered: OfficerUser[] = registeredJson ? JSON.parse(registeredJson) : [];

    const found = registered.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() ||
        u.badgeNumber.toLowerCase() === emailOrBadge.toLowerCase()
    );

    if (found) {
      saveSession(found);
      setIsLoading(false);
      return true;
    }

    // Default authorized officer record
    const defaultOfficer: OfficerUser = {
      uid: 'usr_badge_' + emailOrBadge.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      email,
      displayName: initialProfile?.displayName || 'Insp. Rakesh Sharma',
      badgeNumber: initialProfile?.badgeNumber || emailOrBadge.toUpperCase(),
      policeStation: initialProfile?.policeStation || 'PS Tis Hazari',
      district: initialProfile?.district || 'Central District',
      rank: initialProfile?.rank || 'Inspector',
      authProvider: 'password',
    };

    saveSession(defaultOfficer);
    setIsLoading(false);
    return true;
  };

  // 5. Instant Officer Registration
  const registerOfficer = async (
    name: string,
    badgeNumber: string,
    email: string,
    policeStation: string,
    district: string,
    rank: string,
    _password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    const newOfficer: OfficerUser = {
      uid: 'usr_' + Date.now().toString(36),
      email,
      displayName: name,
      badgeNumber: badgeNumber.toUpperCase(),
      policeStation,
      district,
      rank,
      authProvider: 'password',
    };

    const registeredJson = localStorage.getItem(STORAGE_KEY_OFFICERS);
    const registered: OfficerUser[] = registeredJson ? JSON.parse(registeredJson) : [];
    registered.push(newOfficer);
    localStorage.setItem(STORAGE_KEY_OFFICERS, JSON.stringify(registered));

    saveSession(newOfficer);
    setIsLoading(false);
    return true;
  };

  // 6. Instant Password Reset
  const resetPassword = async (_email: string): Promise<boolean> => {
    setAuthError(null);
    return true;
  };

  // 7. Instant Logout
  const logout = async () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    setCurrentUser(null);
  };

  // 8. Instant Update Profile
  const updateOfficerProfile = async (updates: Partial<OfficerUser>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    saveSession(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        authError,
        loginWithGoogle,
        loginWithFacebook,
        loginWithCredentials,
        registerOfficer,
        resetPassword,
        logout,
        updateOfficerProfile,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
