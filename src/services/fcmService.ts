// Summons Mitra - Firebase Cloud Messaging & Web Push Client Service
import { auth, isFirebaseConfigured } from './firebase';
import { getAuthHeaders } from './apiClient';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (swRegistrationPromise) {
    return swRegistrationPromise;
  }

  swRegistrationPromise = (async () => {
    try {
      const swUrl = '/firebase-messaging-sw.js';
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
        updateViaCache: 'none',
      });

      console.info('[Push] Service worker registered with scope:', registration.scope);

      // Check for updates
      registration.update().catch(() => {});
      return registration;
    } catch (err) {
      console.warn('[Push] Service worker registration failed:', err);
      return null;
    }
  })();

  return swRegistrationPromise;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    return await getAuthHeaders();
  } catch (_) {
    return {};
  }
}

export async function fetchVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch('/api/notifications/vapid-public-key');
    if (res.ok) {
      const data = await res.json();
      if (data.publicKey) return data.publicKey;
    }
  } catch (err) {
    console.warn('[Push] Could not fetch server VAPID public key:', err);
  }
  return import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
}

export async function requestPushPermissionAndSubscribe(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported in this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was not granted.' };
    }

    await registerPushServiceWorker();
    // Wait until service worker is active with safe timeout
    const readyRegistration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration | null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);

    const registration = readyRegistration || (await navigator.serviceWorker.getRegistration('/')) || (await registerPushServiceWorker());
    if (!registration) {
      return { success: false, error: 'Background service worker could not be activated.' };
    }

    const vapidKey = await fetchVapidPublicKey();

    // Subscribe to browser PushManager with clean renewal support
    let subscription = await registration.pushManager.getSubscription().catch(() => null);
    if (vapidKey) {
      if (!subscription) {
        try {
          const convertedKey = urlBase64ToUint8Array(vapidKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey as any,
          });
        } catch (subErr: any) {
          console.warn('[Push] Direct subscribe failed, attempting clean renewal:', subErr);
          try {
            const oldSub = await registration.pushManager.getSubscription().catch(() => null);
            if (oldSub) {
              await oldSub.unsubscribe().catch(() => {});
            }
            const convertedKey = urlBase64ToUint8Array(vapidKey);
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey as any,
            });
          } catch (retryErr) {
            console.warn('[Push] PushManager subscribe renewal error:', retryErr);
          }
        }
      }
    }

    // Also attempt Firebase Messaging token if configured
    let fcmToken: string | undefined;
    if (isFirebaseConfigured) {
      try {
        const { getMessaging, getToken } = await import('firebase/messaging');
        const { getApp } = await import('firebase/app');
        const messaging = getMessaging(getApp());
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: registration,
          vapidKey: vapidKey || undefined,
        });
        console.info('[Push] Obtained FCM Token successfully');
      } catch (fcmErr) {
        console.info('[Push] FCM SDK token deferred, utilizing WebPush subscription:', fcmErr);
      }
    }

    const tokenIdentifier = fcmToken || (subscription ? subscription.endpoint : undefined);

    if (!tokenIdentifier && !subscription) {
      return { success: false, error: 'Could not generate push subscription credentials. Please verify browser notification settings.' };
    }

    // Register with backend using stored bearer token and credentials
    const authHeaders = await getAuthHeader();
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('sm_auth_token') || sessionStorage.getItem('sm_auth_token')
      : null;
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
      authHeaders['x-auth-token'] = token;
    }

    const response = await fetch('/api/notifications/fcm-token', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        token: tokenIdentifier,
        subscription: subscription ? subscription.toJSON() : null,
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Failed to register token with server.' };
    }

    return { success: true, token: tokenIdentifier };
  } catch (err: any) {
    console.error('[Push] Permission/subscription error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

export async function sendTestPushAlert(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch('/api/notifications/test-push', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to dispatch test push notification.' };
    }

    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error sending test push.' };
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushNotificationSupported()) return true;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        const authHeaders = await getAuthHeader();
        await fetch('/api/notifications/fcm-token', {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ token: endpoint }),
        }).catch(() => {});
      }
    }
    return true;
  } catch (err) {
    console.warn('[Push] Unsubscribe error:', err);
    return false;
  }
}

export async function onForegroundMessage(
  callback: (payload: any) => void
): Promise<(() => void) | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const { getMessaging, onMessage } = await import('firebase/messaging');
    const { getApp } = await import('firebase/app');
    const messaging = getMessaging(getApp());
    const unsubscribe = onMessage(messaging, (payload) => {
      console.info('[Push] Foreground FCM message received:', payload);
      callback(payload);
    });
    return unsubscribe;
  } catch (err) {
    // Gracefully handle if Firebase SDK is in demo/fallback mode
    return null;
  }
}

