import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { OfficerUser } from '../types';
import {
  auth,
  createGoogleAuthProvider,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  isFirebaseConfigured,
  type FirebaseUser,
} from '../services/firebase';
import { unsubscribeFromPush } from '../services/fcmService';

interface AuthContextType {
  currentUser: OfficerUser | null;
  isLoading: boolean;
  authError: string | null;
  isDark: boolean;
  toggleTheme: () => void;
  loginWithGoogle: () => Promise<void>;
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

  // Theme Management (Light / Dark)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.theme === 'dark') return true;
      if (localStorage.theme === 'light') return false;
      return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Concurrency guard to prevent multiple simultaneous OAuth requests
  const isOAuthInProgressRef = useRef<boolean>(false);
  // Ref to prevent duplicate redirect result processing on re-renders
  const redirectProcessedRef = useRef<boolean>(false);

  const clearAuthError = () => setAuthError(null);

  // Helper to load or initialize an OfficerUser profile in Firestore under /users/{uid}
  const syncOfficerProfileFromFirestore = async (fbUser: any): Promise<OfficerUser> => {
    const uid = fbUser.uid;
    const defaultProfile: OfficerUser = {
      uid: uid,
      email: fbUser.email || '',
      displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Officer'),
      badgeNumber: 'DL-POL-' + uid.slice(-4).toUpperCase(),
      rank: 'Sub-Inspector',
      policeStation: 'Connaught Place PS',
      district: 'Central District, Delhi',
      authProvider: 'google',
      photoURL: fbUser.photoURL || null,
      upcomingAlertDays: 7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const { db, doc, getDoc, setDoc } = await import('../services/firebase');
      if (db) {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef).catch(() => null);
        if (userDocSnap && userDocSnap.exists()) {
          const data = userDocSnap.data();
          return {
            ...defaultProfile,
            ...data,
            uid: uid,
            email: fbUser.email || data.email || '',
            displayName: data.displayName || fbUser.displayName || defaultProfile.displayName,
            photoURL: data.photoURL || fbUser.photoURL || null,
          };
        } else {
          // Initialize user document in Firestore
          await setDoc(userDocRef, defaultProfile, { merge: true }).catch((err) => {
            console.warn('[Auth] Initializing Firestore user profile notice:', err.message || err);
          });
          return defaultProfile;
        }
      }
    } catch (fsErr) {
      console.warn('[Auth] Firestore user profile sync notice:', fsErr);
    }

    return defaultProfile;
  };

  // Firebase onAuthStateChanged as single source of truth for user authentication
  useEffect(() => {
    let isMounted = true;

    // Handle OAuth redirect result if returning from a mobile redirect
    if (!redirectProcessedRef.current) {
      redirectProcessedRef.current = true;
      getRedirectResult(auth)
        .then(async (redirectResult) => {
          if (redirectResult && redirectResult.user && isMounted) {
            setIsLoading(true);
            const idToken = await redirectResult.user.getIdToken();
            await fetch('/api/auth/social', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken, provider: 'google' }),
            }).catch(() => {});
          }
        })
        .catch((redirectErr: any) => {
          console.warn('[Auth] getRedirectResult notice:', redirectErr.message || redirectErr);
        });
    }

    // Subscribe to Firebase Authentication state transitions
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!isMounted) return;

      if (firebaseUser) {
        setIsLoading(true);
        try {
          // 1. Sync / load user profile from Firestore under /users/{uid}
          const officerProfile = await syncOfficerProfileFromFirestore(firebaseUser);

          // 2. Exchange token with backend server session for API authentication
          try {
            const idToken = await firebaseUser.getIdToken();
            await fetch('/api/auth/social', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken, provider: 'firebase' }),
            });
          } catch (backendSyncErr) {
            console.warn('[Auth] Backend session sync note:', backendSyncErr);
          }

          if (isMounted) {
            setCurrentUser(officerProfile);
            setAuthError(null);
          }
        } catch (err: any) {
          console.error('[Auth] Error resolving authenticated user:', err);
          if (isMounted) {
            setCurrentUser(null);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } else {
        // User is signed out: clear state immediately to prevent leaking any data
        if (isMounted) {
          setCurrentUser(null);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);

  const loginWithGoogleFallback = async (
    email?: string,
    displayName?: string
  ): Promise<void> => {
    if (!email) {
      throw new Error('An email address is required to proceed with manual fallback authentication.');
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/google-fallback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName: displayName || email.split('@')[0] })
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

  /**
   * Initiates Google Sign-In with explicit Google Account Chooser.
   * - Configures GoogleAuthProvider with prompt: 'select_account' (Requirements 3 & 4)
   * - Ensures prior Firebase client session is cleared before popup/redirect (Requirements 2, 7, 8, 9)
   * - Prevents duplicate concurrent requests (Requirement 11)
   * - Handles mobile / popup-blocked with redirect flow (Requirement 10)
   * - Never silently auto-logs into a hardcoded or fallback account (Requirements 1 & 2)
   */
  const loginWithGoogle = async (): Promise<void> => {
    // Prevent multiple simultaneous OAuth requests (Requirement 11)
    if (isOAuthInProgressRef.current) {
      console.warn('[Auth] Google OAuth request already in progress. Ignoring repeated click.');
      return;
    }

    isOAuthInProgressRef.current = true;
    setIsLoading(true);
    setAuthError(null);

    try {
      // 1. Check whether an existing Firebase auth session is present and sign out (Requirements 2, 7, 8, 9)
      // This guarantees Firebase client does not reuse any active account and forces Google account chooser
      if (auth.currentUser) {
        try {
          await firebaseSignOut(auth);
        } catch (signOutErr) {
          console.warn('[Auth] Pre-login signOut notice:', signOutErr);
        }
      }

      // 2. Configure a fresh GoogleAuthProvider with prompt: "select_account" (Requirements 3 & 4)
      const provider = createGoogleAuthProvider();

      // 3. Detect mobile device to use redirect flow for optimal account picker UX (Requirement 10)
      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      let userCredential = null;

      if (isMobile) {
        console.info('[Auth] Initiating Google Sign-In via redirect on mobile with prompt: select_account');
        await signInWithRedirect(auth, provider);
        return; // Navigation will redirect to accounts.google.com chooser
      }

      // On desktop, launch popup
      try {
        console.info('[Auth] Initiating Google Sign-In via popup with prompt: select_account');
        userCredential = await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        const popupCode = (popupErr.code || '').toLowerCase();
        const popupMsg = (popupErr.message || '').toLowerCase();

        // If popup was blocked by browser or unsupported, seamlessly fall back to redirect flow (Requirement 10)
        if (
          popupCode.includes('popup-blocked') ||
          popupMsg.includes('popup-blocked') ||
          popupCode.includes('operation-not-supported')
        ) {
          console.warn('[Auth] Popup blocked or unsupported. Falling back to signInWithRedirect...');
          await signInWithRedirect(auth, provider);
          return;
        }

        // If user explicitly closed the popup
        if (popupCode.includes('popup-closed-by-user')) {
          console.info('[Auth] Google Sign-In popup closed by user.');
          setAuthError('Sign-in cancelled. Please select a Google account to proceed.');
          return;
        }

        // If another popup was cancelled
        if (popupCode.includes('cancelled-popup-request')) {
          console.info('[Auth] Previous popup request cancelled.');
          return;
        }

        // Re-throw other errors (such as unauthorized-domain)
        throw popupErr;
      }

      if (!userCredential || !userCredential.user) {
        throw new Error('No user credentials received from Google');
      }

      // 4. Exchange the verified Firebase ID Token with the server
      const idToken = await userCredential.user.getIdToken();
      const response = await fetch('/api/auth/social', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, provider: 'google' }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to authenticate session with server');
      }

      const data = await response.json();
      setCurrentUser(data.user);
      setAuthError(null);
    } catch (err: any) {
      console.warn('[Auth] Google authentication error:', err.code || err.message || err);
      const errCode = (err.code || '').toLowerCase();
      const errMsg = (err.message || '').toLowerCase();

      if (errCode.includes('unauthorized-domain') || errMsg.includes('unauthorized-domain')) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current preview host';
        const formattedMsg = `Firebase Domain Not Whitelisted: Please add "${currentHost}" to Authorized Domains in your Firebase Console (Authentication > Settings > Authorized domains).`;
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      } else if (errCode.includes('popup-blocked') || errMsg.includes('popup-blocked')) {
        const formattedMsg = 'Google Sign-In popup was blocked by your browser. Please allow popups or retry.';
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      } else if (errCode.includes('network-request-failed')) {
        const formattedMsg = 'Network error during Google authentication. Please check your internet connection.';
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      } else {
        const formattedMsg = err.message || 'Google sign-in failed';
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      }
    } finally {
      isOAuthInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (
    provider: any,
    providerName: string
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
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `${providerName} login failed on server`);
      }
      
      const data = await response.json();
      setCurrentUser(data.user);
    } catch (err: any) {
      const errCode = (err.code || '').toLowerCase();
      console.warn(`Firebase ${providerName} login notice:`, err.message || err);
      let errorMessage = err.message || `${providerName} login failed`;
      
      if (errCode.includes('popup-closed-by-user')) {
        errorMessage = 'Login popup was closed before finishing.';
      } else if (errCode.includes('popup-blocked')) {
        errorMessage = 'Login popup was blocked by your browser. Please allow popups for this site.';
      } else if (errCode.includes('cancelled-popup-request')) {
        errorMessage = 'Login popup request was cancelled.';
      }
      
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
      await unsubscribeFromPush().catch(() => {});
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
      const now = new Date().toISOString();
      const updatedProfile = { ...currentUser, ...updates, updatedAt: now };

      // Update Firestore user profile
      try {
        const { db, doc, setDoc } = await import('../services/firebase');
        if (db && currentUser.uid) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, { ...updates, updatedAt: now }, { merge: true });
        }
      } catch (fsErr) {
        console.warn('[Auth] Firestore profile update notice:', fsErr);
      }

      // Update server session profile
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
      setCurrentUser({ ...updatedProfile, ...data.user });
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
        isDark,
        toggleTheme,
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
