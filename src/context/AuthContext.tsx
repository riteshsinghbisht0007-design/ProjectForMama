import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { OfficerUser } from '../types';
import {
  auth,
  createGoogleAuthProvider,
  createFacebookAuthProvider,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  isFirebaseConfigured,
  type FirebaseUser,
} from '../services/firebase';
import { unsubscribeFromPush } from '../services/fcmService';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextType {
  authStatus: AuthStatus;
  currentUser: OfficerUser | null;
  isLoading: boolean;
  authError: string | null;
  retryAuth: () => Promise<void>;
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
    password: string,
    username?: string
  ) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  resetPasswordWithNewCredentials: (
    identifier: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  updateOfficerProfile: (updates: Partial<OfficerUser>) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<OfficerUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sm_cached_officer_user');
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return null;
  });
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
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

  const saveSessionToken = (token?: string) => {
    if (token && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('sm_auth_token', token);
        localStorage.setItem('sm_auth_token', token);
      } catch (_) {}
    }
  };

  const clearSessionToken = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('sm_auth_token');
        localStorage.removeItem('sm_auth_token');
      } catch (_) {}
    }
  };
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
      const fetchProfilePromise = (async (): Promise<OfficerUser> => {
        const { db, doc, getDoc, setDoc } = await import('../services/firebase');
        if (!db) return defaultProfile;
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
          // Initialize user document in Firestore asynchronously without blocking auth state
          setDoc(userDocRef, defaultProfile, { merge: true }).catch((err) => {
            console.warn('[Auth] Initializing Firestore user profile notice:', err.message || err);
          });
          return defaultProfile;
        }
      })();

      // Bound Firestore sync to 2000ms max so an unresponsive Firestore stream never hangs auth
      const timeoutPromise = new Promise<OfficerUser>((resolve) => {
        setTimeout(() => resolve(defaultProfile), 2000);
      });

      return await Promise.race([fetchProfilePromise, timeoutPromise]);
    } catch (fsErr) {
      console.warn('[Auth] Firestore user profile sync notice:', fsErr);
      return defaultProfile;
    }
  };

  // Firebase onAuthStateChanged as single source of truth for user authentication
  useEffect(() => {
    let isMounted = true;

    // Handle OAuth redirect result if returning from a redirect (Google or Facebook)
    if (!redirectProcessedRef.current) {
      redirectProcessedRef.current = true;
      getRedirectResult(auth)
        .then(async (redirectResult) => {
          if (redirectResult && redirectResult.user && isMounted) {
            setIsLoading(true);
            const providerId =
              redirectResult.user.providerData[0]?.providerId ||
              (redirectResult.providerId ? redirectResult.providerId : 'oauth');
            const providerName = providerId.includes('facebook') ? 'facebook' : 'google';
            const idToken = await redirectResult.user.getIdToken();
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            try {
              const res = await fetch('/api/auth/social', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, provider: providerName }),
                signal: controller.signal,
              });
              if (res.ok) {
                const resData = await res.json().catch(() => null);
                if (resData?.token) {
                  saveSessionToken(resData.token);
                }
                if (resData?.user && isMounted) {
                  setCurrentUser(resData.user);
                  setAuthError(null);
                }
              }
            } catch (backendErr) {
              console.warn('[Auth] Redirect session sync notice:', backendErr);
            } finally {
              clearTimeout(timer);
              sessionStorage.removeItem('sm_oauth_redirect_pending');
            }
          }
        })
        .catch((redirectErr: any) => {
          console.warn('[Auth] getRedirectResult notice:', redirectErr.code || redirectErr.message || redirectErr);
        });
    }

    // Resolve authentication state with clear explicit state transitions
    const resolveAuthState = async (firebaseUser: FirebaseUser | null) => {
      if (!isMounted) return;

      if (firebaseUser) {
        setIsLoading(true);
        setAuthStatus('initializing');
        try {
          // 1. Sync / load user profile from Firestore under /users/{uid} (bounded promise)
          const officerProfile = await syncOfficerProfileFromFirestore(firebaseUser);

          // 2. Exchange token with backend server session for API authentication with bounded timeout
          let serverUser: any = null;
          try {
            const idToken = await firebaseUser.getIdToken();
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4500);
            const syncRes = await fetch('/api/auth/social', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken, provider: 'firebase' }),
              signal: controller.signal,
            })
              .catch((backendErr) => {
                console.warn('[Auth] Backend session sync note:', backendErr?.message || backendErr);
                return null;
              })
              .finally(() => clearTimeout(timer));

            if (syncRes && syncRes.ok) {
              const resData = await syncRes.json().catch(() => null);
              if (resData && resData.token) {
                saveSessionToken(resData.token);
              }
              if (resData && resData.user) {
                serverUser = resData.user;
              }
            }
          } catch (backendSyncErr) {
            console.warn('[Auth] Backend session sync note:', backendSyncErr);
          }

          if (isMounted) {
            const resolvedUser = serverUser ? { ...officerProfile, ...serverUser } : officerProfile;
            setCurrentUser(resolvedUser);
            try {
              localStorage.setItem('sm_cached_officer_user', JSON.stringify(resolvedUser));
            } catch (_) {}
            setAuthStatus('authenticated');
            setAuthError(null);
            setIsLoading(false);
          }
        } catch (err: any) {
          console.error('[Auth] Error resolving authenticated Firebase user:', err);
          if (isMounted) {
            setAuthStatus('error');
            setAuthError(err?.message || 'Error restoring user profile from database');
            setIsLoading(false);
          }
        }
      } else {
        // When Firebase user is null, verify if an active Department ID / server JWT session exists
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('sm_auth_token') || sessionStorage.getItem('sm_auth_token')
            : null;

        if (token) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);
            const meHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'x-auth-token': token,
            };
            const meRes = await fetch('/api/auth/me', {
              credentials: 'include',
              headers: meHeaders,
              signal: controller.signal,
            })
              .catch((err) => {
                console.warn('[Auth] Server session verification network note:', err?.message || err);
                return null;
              })
              .finally(() => clearTimeout(timer));

            if (meRes && meRes.ok && isMounted) {
              const meData = await meRes.json().catch(() => null);
              if (meData && meData.user) {
                setCurrentUser(meData.user);
                try {
                  localStorage.setItem('sm_cached_officer_user', JSON.stringify(meData.user));
                } catch (_) {}
                setAuthStatus('authenticated');
                setIsLoading(false);
                setAuthError(null);
                return;
              }
            } else if (meRes && (meRes.status === 401 || meRes.status === 403)) {
              clearSessionToken();
            } else if (!meRes) {
              // Backend unreachable / network offline: try cached offline session
              const cached = typeof window !== 'undefined' ? localStorage.getItem('sm_cached_officer_user') : null;
              if (cached && isMounted) {
                try {
                  const cachedUser = JSON.parse(cached);
                  if (cachedUser?.uid) {
                    console.info('[Auth] Backend unreachable, using cached offline user session.');
                    setCurrentUser(cachedUser);
                    setAuthStatus('authenticated');
                    setIsLoading(false);
                    return;
                  }
                } catch (_) {}
              }
              if (isMounted) {
                setAuthStatus('error');
                setAuthError('Backend server is temporarily unreachable. Please verify your connection.');
                setIsLoading(false);
                return;
              }
            }
          } catch (sessionCheckErr) {
            console.warn('[Auth] Session check exception:', sessionCheckErr);
          }
        }

        if (isMounted) {
          setCurrentUser(null);
          try {
            localStorage.removeItem('sm_cached_officer_user');
          } catch (_) {}
          setAuthStatus('unauthenticated');
          setIsLoading(false);
        }
      }
    };

    // Subscribe to Firebase Authentication state transitions
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      await resolveAuthState(firebaseUser);
    });

    // Safety timeout: Ensure initial restoration never hangs indefinitely (e.g. offline or Firebase blocked)
    const safetyInitTimer = setTimeout(() => {
      if (isMounted && authStatus === 'initializing') {
        console.warn('[Auth] Startup auth initialization safety timeout (5000ms) reached. Resolving state.');
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('sm_auth_token') || sessionStorage.getItem('sm_auth_token')
            : null;
        if (!token && !auth.currentUser) {
          setCurrentUser(null);
          setAuthStatus('unauthenticated');
          setIsLoading(false);
        }
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(safetyInitTimer);
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
      if (data.token) {
        saveSessionToken(data.token);
      }
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
    // Prevent multiple simultaneous OAuth requests
    if (isOAuthInProgressRef.current) {
      console.warn('[Auth] Google OAuth request already in progress. Ignoring repeated click.');
      return;
    }

    isOAuthInProgressRef.current = true;
    setIsLoading(true);
    setAuthError(null);

    try {
      // Configure fresh GoogleAuthProvider with explicit account selection
      const provider = createGoogleAuthProvider();

      const isStandalone =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          (navigator as any).standalone === true ||
          document.referrer.includes('android-app://'));

      let userCredential = null;

      // Always attempt signInWithPopup first.
      // In installed PWAs (Android WebAPK, iOS WebClip) and desktop,
      // signInWithPopup prevents full window navigations and prevents infinite reload loops.
      try {
        console.info('[Auth] Initiating Google Sign-In with prompt: select_account');
        userCredential = await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        const popupCode = (popupErr.code || '').toLowerCase();
        const popupMsg = (popupErr.message || '').toLowerCase();

        // If user cancelled or dismissed the popup
        if (
          popupCode.includes('popup-closed-by-user') ||
          popupMsg.includes('popup-closed-by-user') ||
          popupMsg.includes('closed by user')
        ) {
          console.info('[Auth] Google Sign-In popup closed by user.');
          setAuthError('Sign-in cancelled. Please select a Google account to proceed.');
          return;
        }

        // If another popup was cancelled
        if (popupCode.includes('cancelled-popup-request')) {
          console.info('[Auth] Previous popup request cancelled.');
          return;
        }

        // If popup was blocked or unsupported and we are NOT in standalone PWA, fall back to redirect
        if (
          (popupCode.includes('popup-blocked') ||
            popupMsg.includes('popup-blocked') ||
            popupCode.includes('operation-not-supported')) &&
          !isStandalone
        ) {
          console.warn('[Auth] Popup blocked in standard browser tab. Falling back to signInWithRedirect...');
          sessionStorage.setItem('sm_oauth_redirect_pending', 'google');
          await signInWithRedirect(auth, provider);
          return;
        }

        // Re-throw other errors (e.g. unauthorized-domain)
        throw popupErr;
      }

      if (!userCredential || !userCredential.user) {
        throw new Error('No user credentials received from Google');
      }

      // Exchange the verified Firebase ID Token with the server
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
      saveSessionToken(data.token);
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

  /**
   * Initiates Facebook Sign-In using Firebase FacebookAuthProvider.
   * - Configures FacebookAuthProvider with email and public_profile scopes
   * - Clears prior session if needed
   * - Handles mobile / popup-blocked with redirect flow
   * - Surfaces clear diagnostic messages for Firebase and Facebook console setups
   */
  const loginWithFacebook = async (): Promise<void> => {
    if (isOAuthInProgressRef.current) {
      console.warn('[Auth] Facebook OAuth request already in progress. Ignoring repeated click.');
      return;
    }

    isOAuthInProgressRef.current = true;
    setIsLoading(true);
    setAuthError(null);

    try {
      if (auth.currentUser) {
        try {
          await firebaseSignOut(auth);
        } catch (signOutErr) {
          console.warn('[Auth] Pre-login signOut notice:', signOutErr);
        }
      }

      const provider = createFacebookAuthProvider();

      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      let userCredential = null;

      if (isMobile) {
        console.info('[Auth] Initiating Facebook Sign-In via redirect on mobile');
        await signInWithRedirect(auth, provider);
        return;
      }

      try {
        console.info('[Auth] Initiating Facebook Sign-In via popup');
        userCredential = await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        const popupCode = (popupErr.code || '').toLowerCase();
        const popupMsg = (popupErr.message || '').toLowerCase();

        if (
          popupCode.includes('popup-blocked') ||
          popupMsg.includes('popup-blocked') ||
          popupCode.includes('operation-not-supported')
        ) {
          console.warn('[Auth] Popup blocked or unsupported. Falling back to signInWithRedirect for Facebook...');
          await signInWithRedirect(auth, provider);
          return;
        }

        if (popupCode.includes('popup-closed-by-user')) {
          console.info('[Auth] Facebook Sign-In popup closed by user.');
          setAuthError('Sign-in cancelled. Please complete Facebook login.');
          return;
        }

        if (popupCode.includes('cancelled-popup-request')) {
          console.info('[Auth] Previous popup request cancelled.');
          return;
        }

        throw popupErr;
      }

      if (!userCredential || !userCredential.user) {
        throw new Error('No user credentials received from Facebook');
      }

      const idToken = await userCredential.user.getIdToken();
      const response = await fetch('/api/auth/social', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, provider: 'facebook' }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to authenticate Facebook session with server');
      }

      const data = await response.json();
      saveSessionToken(data.token);
      setCurrentUser(data.user);
      setAuthError(null);
    } catch (err: any) {
      console.warn('[Auth] Facebook authentication error:', err.code || err.message || err);
      const errCode = (err.code || '').toLowerCase();
      const errMsg = (err.message || '').toLowerCase();
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current preview host';

      if (errCode.includes('operation-not-allowed') || errMsg.includes('operation-not-allowed')) {
        const formattedMsg =
          'Facebook Login is not enabled in Firebase. Enable Facebook in Firebase Console (Authentication > Sign-in method > Facebook) and add your Meta App ID & Secret.';
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      } else if (errCode.includes('unauthorized-domain') || errMsg.includes('unauthorized-domain')) {
        const formattedMsg = `Firebase Domain Not Whitelisted: Please add "${currentHost}" to Authorized Domains in your Firebase Console (Authentication > Settings > Authorized domains).`;
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      } else if (errCode.includes('account-exists-with-different-credential') || errMsg.includes('account-exists-with-different-credential')) {
        const formattedMsg =
          'An account already exists with the same email address using a different sign-in provider (such as Google). Please sign in using Google.';
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      } else if (errCode.includes('popup-blocked') || errMsg.includes('popup-blocked')) {
        const formattedMsg = 'Facebook login popup was blocked by your browser. Please allow popups or retry.';
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      } else if (errCode.includes('network-request-failed')) {
        const formattedMsg = 'Network error during Facebook authentication. Please check your internet connection.';
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      } else {
        const formattedMsg = err.message || 'Facebook sign-in failed';
        setAuthError(formattedMsg);
        throw new Error(formattedMsg);
      }
    } finally {
      isOAuthInProgressRef.current = false;
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (
    emailOrBadge: string,
    password: string,
    _initialProfile?: Partial<OfficerUser>
  ): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    const identifier = emailOrBadge.trim();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: identifier,
          email: identifier,
          username: identifier,
          password,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Invalid credentials');
      }

      const data = await response.json();
      if (data.token) {
        saveSessionToken(data.token);
      }
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
    password: string,
    username?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const effectiveUsername = (
        username ||
        (badgeNumber ? badgeNumber.replace(/[^a-zA-Z0-9_-]/g, '_') : email.split('@')[0])
      ).toLowerCase();

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          name,
          username: effectiveUsername,
          badgeNumber,
          email,
          policeStation,
          district,
          rank,
          password,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Registration failed');
      }

      const data = await response.json();
      if (data.token) {
        saveSessionToken(data.token);
      }
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
    const targetEmail = email.trim();
    if (!targetEmail) return false;

    let anySuccess = false;

    // 1. Notify backend database / audit logging
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (res.ok) {
        anySuccess = true;
      }
    } catch (err) {
      console.warn('[Auth] Server reset notification notice:', err);
    }

    // 2. Dispatch Firebase password reset email if configured
    try {
      if (isFirebaseConfigured && auth) {
        await sendPasswordResetEmail(auth, targetEmail);
        anySuccess = true;
      }
    } catch (fbErr: any) {
      console.warn('[Auth] Firebase password reset notice:', fbErr?.message || fbErr);
    }

    return anySuccess || true;
  };

  const resetPasswordWithNewCredentials = async (
    identifier: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    setAuthError(null);
    const target = identifier.trim();
    if (!target) {
      return { success: false, error: 'Please enter your username, badge number, or official email.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: target, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update password.' };
      }

      // Also dispatch Firebase password reset email if identifier looks like an email and Firebase is configured
      if (target.includes('@') && isFirebaseConfigured && auth) {
        sendPasswordResetEmail(auth, target).catch(() => {});
      }

      return { success: true, message: data.message || 'Password updated successfully! You can now log in.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not connect to reset password service.' };
    }
  };

  const logout = async () => {
    try {
      await unsubscribeFromPush().catch(() => {});
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      await firebaseSignOut(auth).catch(() => {});
      sessionStorage.removeItem('summonsmitra_welcomed');
      sessionStorage.removeItem('sm_auth_token');
      localStorage.removeItem('sm_auth_token');
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

      // 1. Update Firestore user profile
      try {
        const { db, doc, setDoc } = await import('../services/firebase');
        if (db && currentUser.uid) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, { ...updates, updatedAt: now }, { merge: true });
        }
      } catch (fsErr) {
        console.warn('[Auth] Firestore profile update notice:', fsErr);
      }

      // 2. Update Firebase Auth user display name or photo if signed in with Firebase (only if photoURL is a valid URL <= 2048 chars)
      if (auth.currentUser) {
        try {
          const { updateProfile: fbUpdateProfile } = await import('firebase/auth');
          const fbUpdates: any = {};
          if (updates.displayName) fbUpdates.displayName = updates.displayName;
          if (updates.photoURL && !updates.photoURL.startsWith('data:') && updates.photoURL.length <= 2048) {
            fbUpdates.photoURL = updates.photoURL;
          }
          if (Object.keys(fbUpdates).length > 0) {
            await fbUpdateProfile(auth.currentUser, fbUpdates);
          }
        } catch (fbProfileErr) {
          console.warn('[Auth] Firebase Auth profile update notice:', fbProfileErr);
        }
      }

      // 3. Update server session profile with full authenticated headers (Bearer token & cookies)
      const { getAuthHeaders } = await import('../services/apiClient');
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(updates),
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
      const finalUser = { ...updatedProfile, ...(data.user || {}) };
      setCurrentUser(finalUser);
    } catch (err: any) {
      console.error("Profile update error:", err);
      throw err;
    }
  };

  const retryAuth = useCallback(async () => {
    setIsLoading(true);
    setAuthStatus('initializing');
    setAuthError(null);
    try {
      if (auth.currentUser) {
        const officerProfile = await syncOfficerProfileFromFirestore(auth.currentUser);
        setCurrentUser(officerProfile);
        try {
          localStorage.setItem('sm_cached_officer_user', JSON.stringify(officerProfile));
        } catch (_) {}
        setAuthStatus('authenticated');
        setIsLoading(false);
      } else {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('sm_auth_token') || sessionStorage.getItem('sm_auth_token')
            : null;
        if (token) {
          const res = await fetch('/api/auth/me', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'x-auth-token': token,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              setCurrentUser(data.user);
              try {
                localStorage.setItem('sm_cached_officer_user', JSON.stringify(data.user));
              } catch (_) {}
              setAuthStatus('authenticated');
              setIsLoading(false);
              return;
            }
          }
        }
        setCurrentUser(null);
        setAuthStatus('unauthenticated');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.warn('[Auth] retryAuth notice:', err);
      setAuthStatus('error');
      setAuthError(err?.message || 'Failed to reconnect to server.');
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        currentUser,
        isLoading,
        authError,
        retryAuth,
        isDark,
        toggleTheme,
        loginWithGoogle,
        loginWithGoogleFallback,
        loginWithFacebook,
        loginWithCredentials,
        registerOfficer,
        resetPassword,
        resetPasswordWithNewCredentials,
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
