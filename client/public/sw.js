// Service Worker for Web Push Notifications
const CACHE_NAME = 'family-planner-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback for offline scenarios
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('Push notification data:', notificationData);
    } catch (error) {
      console.error('Failed to parse push data:', error);
      notificationData = {
        title: 'Family Planner Notification',
        body: event.data.text() || 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png'
      };
    }
  } else {
    notificationData = {
      title: 'Family Planner Notification',
      body: 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png'
    };
  }

  const options = {
    body: notificationData.body || notificationData.message,
    icon: notificationData.icon || '/icon-192x192.png',
    badge: notificationData.badge || '/icon-192x192.png',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    requireInteraction: notificationData.priority === 'urgent',
    silent: false,
    timestamp: Date.now(),
    tag: notificationData.tag || 'family-planner-notification',
    renotify: true,
    vibrate: notificationData.priority === 'urgent' ? [200, 100, 200] : [100]
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Family Planner',
      options
    )
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Handle action clicks
  if (event.action) {
    console.log('Notification action clicked:', event.action);
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          // Send action to the main app
          if (clients.length > 0) {
            clients[0].postMessage({
              type: 'NOTIFICATION_ACTION',
              action: event.action,
              notificationData: event.notification.data
            });
            return clients[0].focus();
          }
        })
    );
    return;
  }

  // Default click behavior - open/focus the app
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Check if there's already a window/tab open with the target URL
        for (let client of clients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal if needed
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'NOTIFICATION_DISMISSED',
            notificationData: event.notification.data
          });
        }
      })
  );
});

// Background sync event (for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'background-sync-notifications') {
    event.waitUntil(
      // Perform background sync tasks
      syncNotifications()
    );
  }
});

// Helper function for background sync
async function syncNotifications() {
  try {
    // Get pending notifications from IndexedDB or similar storage
    // Send them when back online
    console.log('Syncing notifications...');
    
    // This would integrate with your backend API
    // const response = await fetch('/api/notifications/sync');
    // const syncData = await response.json();
    
    return Promise.resolve();
  } catch (error) {
    console.error('Background sync failed:', error);
    return Promise.reject(error);
  }
}

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    // Re-subscribe to push notifications
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then((newSubscription) => {
      console.log('New push subscription:', newSubscription);
      
      // Send new subscription to your server
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: newSubscription,
          oldSubscription: event.oldSubscription
        })
      });
    }).catch((error) => {
      console.error('Failed to resubscribe to push notifications:', error);
    })
  );
});