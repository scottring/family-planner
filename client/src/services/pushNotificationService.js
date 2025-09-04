// Push Notification Service for Web Push API
import api from './api';

class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isSupported = this.checkSupport();
    this.vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || null;
    
    console.log('Push Notification Service initialized', {
      supported: this.isSupported,
      vapidKey: this.vapidPublicKey ? 'Present' : 'Missing'
    });
  }

  // Check if push notifications are supported
  checkSupport() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // Register service worker
  async registerServiceWorker() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      console.log('Registering service worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', this.registration);

      // Listen for service worker updates
      this.registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
        const newWorker = this.registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New Service Worker installed, prompting for update');
            // You could show an update notification here
          }
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(event) {
    console.log('Message from Service Worker:', event.data);
    
    switch (event.data.type) {
      case 'NOTIFICATION_ACTION':
        this.handleNotificationAction(event.data.action, event.data.notificationData);
        break;
        
      case 'NOTIFICATION_DISMISSED':
        this.handleNotificationDismissed(event.data.notificationData);
        break;
        
      default:
        console.log('Unknown message type:', event.data.type);
    }
  }

  // Handle notification action clicks
  handleNotificationAction(action, data) {
    console.log('Notification action clicked:', action, data);
    
    // Emit custom event that components can listen to
    window.dispatchEvent(new CustomEvent('notificationAction', {
      detail: { action, data }
    }));
  }

  // Handle notification dismissal
  handleNotificationDismissed(data) {
    console.log('Notification dismissed:', data);
    
    // Track dismissal analytics if needed
    window.dispatchEvent(new CustomEvent('notificationDismissed', {
      detail: { data }
    }));
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      console.log('Requesting notification permission...');
      permission = await Notification.requestPermission();
    }

    console.log('Notification permission:', permission);

    if (permission === 'granted') {
      return true;
    } else if (permission === 'denied') {
      throw new Error('Notification permission denied');
    } else {
      throw new Error('Notification permission not granted');
    }
  }

  // Convert VAPID key from base64 to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Subscribe to push notifications
  async subscribe() {
    try {
      if (!this.registration) {
        await this.registerServiceWorker();
      }

      await this.requestPermission();

      if (!this.vapidPublicKey) {
        console.warn('VAPID public key not configured, using mock subscription');
        // For development, we'll continue without VAPID key
      }

      console.log('Subscribing to push notifications...');

      const subscribeOptions = {
        userVisibleOnly: true
      };

      // Add VAPID key if available
      if (this.vapidPublicKey) {
        subscribeOptions.applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      }

      this.subscription = await this.registration.pushManager.subscribe(subscribeOptions);

      console.log('Push subscription successful:', this.subscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      console.log('Sending subscription to server...');
      
      const response = await api.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      console.log('Subscription sent to server successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      if (!this.subscription) {
        console.log('No active subscription to unsubscribe from');
        return true;
      }

      console.log('Unsubscribing from push notifications...');

      // Unsubscribe from the browser
      const success = await this.subscription.unsubscribe();

      if (success) {
        // Remove subscription from server
        await api.delete('/notifications/unsubscribe', {
          data: {
            subscription: this.subscription.toJSON()
          }
        });

        this.subscription = null;
        console.log('Successfully unsubscribed from push notifications');
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  // Get current subscription status
  async getSubscription() {
    try {
      if (!this.registration) {
        await this.registerServiceWorker();
      }

      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription;
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  // Check if user is currently subscribed
  async isSubscribed() {
    const subscription = await this.getSubscription();
    return !!subscription;
  }

  // Get notification permission status
  getPermissionStatus() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  // Show a local notification (for testing)
  async showLocalNotification(title, options = {}) {
    if (!this.isSupported) {
      throw new Error('Notifications are not supported');
    }

    const permission = await this.requestPermission();
    if (!permission) {
      throw new Error('Notification permission not granted');
    }

    const defaultOptions = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      timestamp: Date.now(),
      requireInteraction: false
    };

    const notificationOptions = { ...defaultOptions, ...options };

    if (this.registration && this.registration.showNotification) {
      // Use service worker to show notification
      return this.registration.showNotification(title, notificationOptions);
    } else {
      // Fallback to basic notification
      return new Notification(title, notificationOptions);
    }
  }

  // Initialize push notifications (call this on app startup)
  async initialize() {
    try {
      console.log('Initializing push notifications...');

      if (!this.isSupported) {
        console.warn('Push notifications are not supported in this browser');
        return false;
      }

      await this.registerServiceWorker();
      
      // Check if already subscribed
      const existingSubscription = await this.getSubscription();
      if (existingSubscription) {
        console.log('Found existing push subscription');
        this.subscription = existingSubscription;
        
        // Verify subscription with server
        await this.sendSubscriptionToServer(existingSubscription);
      }

      console.log('Push notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Update service worker (force update)
  async updateServiceWorker() {
    if (this.registration) {
      try {
        console.log('Checking for service worker updates...');
        await this.registration.update();
        console.log('Service worker update check completed');
      } catch (error) {
        console.error('Service worker update failed:', error);
      }
    }
  }

  // Get service worker status
  getServiceWorkerStatus() {
    if (!this.registration) return 'not-registered';
    
    if (this.registration.installing) return 'installing';
    if (this.registration.waiting) return 'waiting';
    if (this.registration.active) return 'active';
    
    return 'unknown';
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;