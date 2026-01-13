// --- CONFIGURATION & CACHING ---
const CACHE_NAME = 'campus-cupid-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  'https://unpkg.com/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  '/manifest.json'
];

// 1. Install Event: Cache assets
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('[SW] Cache addAll failed:', err))
  );
});

// 2. Activate Event: Cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// --- PUSH NOTIFICATION LOGIC ---

// 4. Listen for incoming Push Messages
self.addEventListener('push', (event) => {
  console.log('[SW] Push Message Received.');

  let data = { 
    title: 'Campus Cupid', 
    body: 'You have a new notification!', 
    url: '/',
    icon: '/images/icons/icon-192x192.png' 
  };

  if (event.data) {
    try {
      data = event.data.json();
      console.log('[SW] Push Data parsed:', data);
    } catch (e) {
      console.warn('[SW] Push data was not JSON, treating as text.');
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    // Use icon from server if available, otherwise fallback to local
    icon: data.icon || '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-96x96.png', 
    vibrate: [100, 50, 100],
    data: { 
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'View Now' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked. Action:', event.action);
  
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open at that URL, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
