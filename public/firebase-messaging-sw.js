// Summons Mitra - Firebase Cloud Messaging & Web Push Service Worker
/* eslint-disable no-undef */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Parse query params passed during registration if any
const urlParams = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || 'AIzaSyDUmTZ4A4Q_demo_fallback',
  authDomain: urlParams.get('authDomain') || 'summonsviewer.firebaseapp.com',
  projectId: urlParams.get('projectId') || 'summonsviewer',
  storageBucket: urlParams.get('storageBucket') || 'summonsviewer.firebasestorage.app',
  messagingSenderId: urlParams.get('messagingSenderId') || '978347682385',
  appId: urlParams.get('appId') || '1:978347682385:web:eaa4d387bd2f73d662e670',
};

// Initialize Firebase App in service worker
try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  // App may already exist
}

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('[SW] Firebase messaging init warning:', e);
}

// 1. Handle FCM Background Messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.info('[SW] FCM background message received:', payload);
    const data = payload.data || {};
    const notification = payload.notification || {};
    
    const title = notification.title || data.title || 'Summons Mitra Alert';
    const body = notification.body || data.body || data.message || 'Urgent court hearing update.';
    const summonId = data.summonId || '';
    const route = data.route || (summonId ? `/summons/${summonId}` : '/');

    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [200, 100, 200],
      tag: data.uniqueKey || `summon-${summonId || Date.now()}`,
      renotify: true,
      data: {
        summonId,
        route,
        type: data.type || 'HEARING_ALERT',
        url: route,
        receivedAt: Date.now(),
      },
    };

    self.registration.showNotification(title, options);
  });
}

// 2. Handle Standard Web Push events (for universal WebPush VAPID delivery)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: 'Summons Mitra Alert', body: event.data.text() };
  }

  // If already handled by Firebase SDK internal receiver, skip duplicate
  if (payload.from && payload.from.includes('firebase') && !payload.notification && !payload.data) {
    return;
  }

  const notification = payload.notification || {};
  const data = payload.data || payload;
  const title = notification.title || data.title || payload.title || 'Summons Mitra Alert';
  const body = notification.body || data.body || data.message || payload.body || 'Court hearing update.';
  const summonId = data.summonId || payload.summonId || '';
  const route = data.route || payload.route || (summonId ? `/summons/${summonId}` : '/');

  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.uniqueKey || payload.uniqueKey || `summon-${summonId || Date.now()}`,
    renotify: true,
    data: {
      summonId,
      route,
      type: data.type || payload.type || 'HEARING_ALERT',
      url: route,
      receivedAt: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 3. Handle Notification Clicks (Deep-Link to Exact Summon Details Page)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const summonId = data.summonId || '';
  const targetRoute = data.route || (summonId ? `/summons/${summonId}` : '/');
  const targetUrl = new URL(targetRoute, self.location.origin).href;

  console.info('[SW] Notification clicked. Target route:', targetRoute, 'summonId:', summonId);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an existing Summons Mitra tab/window is open
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          // Focus the open window and send postMessage to navigate to the exact summon
          return client.focus().then((focusedClient) => {
            if (focusedClient) {
              focusedClient.postMessage({
                type: 'FCM_NOTIFICATION_CLICK',
                summonId,
                route: targetRoute,
                url: targetUrl,
              });
            }
          });
        }
      }

      // If no window is currently open, open a new window directly at the target summon route
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Install and activate service worker immediately
self.addEventListener('install', (_event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
