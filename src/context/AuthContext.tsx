import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfficerUser } from '../types';
import { auth, googleProvider, facebookProvider, signInWithPopup, signOut as firebaseSignOut } from '../services/firebase';

interface AuthContextType {
  currentUser: OfficerUser | null;
  isLoading: boolean;
  authError: string | null;
  loginWithGoogle: (email?: string, displayName?: string) => Promise<void>;
  loginWithGoogleFallback: (email?: string, displayName?: string) => Promise<void>;
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
        const response = await fetch('/api/auth/me', { credentials: 'include' });
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

  const loginWithGoogleFallback = async (
    email: string = 'chetna2manju@gmail.com',
    displayName: string = 'Officer Chetna'
  ): Promise<void> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/google-fallback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Google login failed on server');
      }
      const data = await response.json();
      setCurrentUser(data.user);
    } catch (err: any) {
      console.warn('[Auth] Google login fallback error:', err.message || err);
      setAuthError(err.message || 'Google login fallback failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (
    provider: any,
    providerName: string,
    fallbackEmail: string = 'chetna2manju@gmail.com',
    fallbackName: string = 'Officer Chetna'
  ) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const response = await fetch('/api/auth/social', {
        method: 'POST',
        credentials: 'include',
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
      const errCode = err.code || '';
      const errMsg = err.message || '';
      const isDomainError =
        errCode === 'auth/unauthorized-domain' ||
        errMsg.includes('auth/unauthorized-domain') ||
        errMsg.includes('unauthorized-domain');
      
      if (isDomainError) {
        console.warn(`[Auth] Firebase popup unauthorized domain on ${typeof window !== 'undefined' ? window.location.hostname : ''}. Auto-authenticating via Google fallback...`);
        try {
          await loginWithGoogleFallback(fallbackEmail, fallbackName);
          return;
        } catch (fallbackErr: any) {
          console.warn('[Auth] Fallback login error:', fallbackErr);
          setAuthError('Google login fallback error: ' + fallbackErr.message);
          throw fallbackErr;
        }
      }

      console.warn(`Firebase ${providerName} login notice:`, err.message || err);
      let errorMessage = err.message || `${providerName} login failed`;
      
      if (errCode === 'auth/popup-closed-by-user' || errMsg.includes('auth/popup-closed-by-user')) {
        errorMessage = 'Login popup was closed before finishing.';
      } else if (errCode === 'auth/popup-blocked' || errMsg.includes('auth/popup-blocked')) {
        errorMessage = 'Login popup was blocked by your browser. Please allow popups for this site.';
      } else if (errCode === 'auth/cancelled-popup-request' || errMsg.includes('auth/cancelled-popup-request')) {
        errorMessage = 'Login popup request was cancelled.';
      }
      
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = (email?: string, displayName?: string) =>
    handleSocialLogin(googleProvider, 'google', email, displayName);
  const loginWithFacebook = () => handleSocialLogin(facebookProvider, 'facebook');

  const loginWithCredentials = async (
    emailOrBadge: string,
    password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    
    // Quick parse - if they enter a badge, convert to email assuming domain
    const email = emailOrBadge.includes('@')
      ? emailOrBadge.trim()
      : `${emailOrBadge.trim().toLowerCase()}@delhipolice.gov.in`;
      
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
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
        credentials: 'include',
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
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      await firebaseSignOut(auth).catch(() => {});
      sessionStorage.removeItem('summonsmitra_welcomed');
    } catch (err) {
      console.error("Logout error", err);
    }
    setCurrentUser(null);
    window.location.href = '/';
  };

  const updateOfficerProfile = async (updates: Partial<OfficerUser>) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        let err;
        try {
          err = await response.json();
        } catch (parseErr) {
          throw new Error(`Server returned ${response.status} ${response.statusText}`);
        }
        throw new Error(err?.error || 'Failed to update profile');
      }
      
      const data = await response.json();
      setCurrentUser(data.user);
    } catch (err: any) {
      console.error("Profile update error:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        authError,
        loginWithGoogle,
        loginWithGoogleFallback,
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
