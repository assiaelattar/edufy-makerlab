// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A",
  authDomain: "edufy-makerlab.firebaseapp.com",
  projectId: "edufy-makerlab",
  storageBucket: "edufy-makerlab.firebasestorage.app",
  messagingSenderId: "273507751238",
  appId: "1:273507751238:web:c8306f6177654befa54147",
  measurementId: "G-KZV1Q7T1H2"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

const CACHE_NAME = 'stemflow-erp-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // Force new service worker to activate immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache v2');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});