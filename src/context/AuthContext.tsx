import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfficerUser } from '../types';

interface AuthContextType {
  currentUser: OfficerUser | null;
  isLoading: boolean;
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
  logout: () => void;
  updateOfficerProfile: (updates: Partial<OfficerUser>) => void;
}

const STORAGE_KEY_USER = 'summons_mitra_current_user';
const STORAGE_KEY_OFFICERS = 'summons_mitra_registered_officers';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<OfficerUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on initial mount
  useEffect(() => {
    try {
      const savedUserJson = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUserJson) {
        const parsed = JSON.parse(savedUserJson) as OfficerUser;
        setCurrentUser(parsed);
      }
    } catch (err) {
      console.error('Failed to parse saved user session:', err);
      localStorage.removeItem(STORAGE_KEY_USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (user: OfficerUser) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // Create or load existing Google user profile
      const googleUser: OfficerUser = {
        uid: 'usr_g_' + Math.random().toString(36).substring(2, 9),
        email: 'officer.law@delhipolice.gov.in',
        displayName: 'Sub-Insp. Rajesh Sharma',
        badgeNumber: 'DL-POL-4402',
        policeStation: 'Connaught Place PS',
        district: 'New Delhi',
        rank: 'Sub-Inspector',
        authProvider: 'google',
        photoURL:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      };
      saveUserSession(googleUser);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    setIsLoading(true);
    try {
      const fbUser: OfficerUser = {
        uid: 'usr_fb_' + Math.random().toString(36).substring(2, 9),
        email: 'officer.fb@police.gov.in',
        displayName: 'Insp. Vikram Rathore',
        badgeNumber: 'POL-7821',
        policeStation: 'Cyber Crime Cell',
        district: 'Central District',
        rank: 'Inspector',
        authProvider: 'facebook',
        photoURL:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      };
      saveUserSession(fbUser);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (
    emailOrBadge: string,
    _password: string,
    initialProfile?: Partial<OfficerUser>
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Check registered users list or create authenticated record
      const registeredJson = localStorage.getItem(STORAGE_KEY_OFFICERS);
      const registered: OfficerUser[] = registeredJson ? JSON.parse(registeredJson) : [];

      const found = registered.find(
        (u) =>
          u.email.toLowerCase() === emailOrBadge.toLowerCase() ||
          u.badgeNumber.toLowerCase() === emailOrBadge.toLowerCase()
      );

      if (found) {
        saveUserSession(found);
        return true;
      }

      // Default authorized officer for direct credential login
      const defaultOfficer: OfficerUser = {
        uid: 'usr_cred_' + Math.random().toString(36).substring(2, 9),
        email: emailOrBadge.includes('@') ? emailOrBadge : `${emailOrBadge}@police.gov.in`,
        displayName: initialProfile?.displayName || 'Insp. Rakesh Sharma',
        badgeNumber: initialProfile?.badgeNumber || emailOrBadge.toUpperCase(),
        policeStation: initialProfile?.policeStation || 'PS Tis Hazari',
        district: initialProfile?.district || 'Central District',
        rank: initialProfile?.rank || 'Inspector',
        authProvider: 'password',
      };
      saveUserSession(defaultOfficer);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

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
    try {
      const newUser: OfficerUser = {
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
      registered.push(newUser);
      localStorage.setItem(STORAGE_KEY_OFFICERS, JSON.stringify(registered));

      saveUserSession(newUser);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    setCurrentUser(null);
  };

  const updateOfficerProfile = (updates: Partial<OfficerUser>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    saveUserSession(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        loginWithGoogle,
        loginWithFacebook,
        loginWithCredentials,
        registerOfficer,
        logout,
        updateOfficerProfile,
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
