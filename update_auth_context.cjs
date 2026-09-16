const fs = require('fs');

const code = `
import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfficerUser } from '../types';
import { auth, googleProvider, facebookProvider, appleProvider, signInWithPopup, signOut as firebaseSignOut } from '../services/firebase';

interface AuthContextType {
  currentUser: OfficerUser | null;
  isLoading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithApple: () => Promise<void>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<OfficerUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Load user session on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Failed to fetch user session:", err);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSocialLogin = async (provider: any, providerName: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const response = await fetch('/api/auth/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, provider: providerName })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Social login failed on server');
      }
      
      const data = await response.json();
      setCurrentUser(data.user);
    } catch (err: any) {
      setAuthError(err.message || \`\${providerName} login failed\`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => handleSocialLogin(googleProvider, 'google');
  const loginWithFacebook = () => handleSocialLogin(facebookProvider, 'facebook');
  const loginWithApple = () => handleSocialLogin(appleProvider, 'apple');

  const loginWithCredentials = async (
    emailOrBadge: string,
    password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    
    // Quick parse - if they enter a badge, convert to email assuming domain
    const email = emailOrBadge.includes('@')
      ? emailOrBadge.trim()
      : \`\${emailOrBadge.trim().toLowerCase()}@delhipolice.gov.in\`;
      
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Invalid credentials');
      }
      
      const data = await response.json();
      setCurrentUser(data.user);
      return true;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
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
    password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, badgeNumber, email, policeStation, district, rank, password })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Registration failed');
      }
      
      const data = await response.json();
      setCurrentUser(data.user);
      return true;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setAuthError(null);
    // Not implemented on backend yet, but simulated for now
    return true;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await firebaseSignOut(auth).catch(() => {});
    } catch (err) {
      console.error("Logout error", err);
    }
    setCurrentUser(null);
  };

  const updateOfficerProfile = async (updates: Partial<OfficerUser>) => {
    // In a real app this would POST to /api/users/profile
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, ...updates });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        authError,
        loginWithGoogle,
        loginWithFacebook,
        loginWithApple,
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
`;

fs.writeFileSync('src/context/AuthContext.tsx', code);
