import { create } from 'zustand';
import api from '../services/api';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  preferences: null,
  stats: { total: 0, unread: 0, today: 0 },
  loading: false,
  error: null,

  // Fetch user notifications
  fetchNotifications: async (unreadOnly = false) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/notifications', { 
        params: { unread_only: unreadOnly } 
      });
      set({ notifications: response.data, loading: false });
      
      // Also refresh stats
      get().fetchNotificationStats();
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching notifications:', error);
    }
  },

  // Fetch notification preferences
  fetchPreferences: async () => {
    try {
      const response = await api.get('/notifications/preferences');
      set({ preferences: response.data });
    } catch (error) {
      set({ error: error.message });
      console.error('Error fetching notification preferences:', error);
    }
  },

  // Update notification preferences
  updatePreferences: async (preferences) => {
    try {
      const response = await api.put('/notifications/preferences', preferences);
      set({ preferences: response.data });
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      set(state => ({
        notifications: state.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      }));
      
      // Update stats
      get().fetchNotificationStats();
    } catch (error) {
      set({ error: error.message });
      console.error('Error marking notification as read:', error);
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set(state => ({
        notifications: state.notifications.map(notification => ({
          ...notification,
          read_at: notification.read_at || new Date().toISOString()
        }))
      }));
      
      // Update stats
      get().fetchNotificationStats();
    } catch (error) {
      set({ error: error.message });
      console.error('Error marking all notifications as read:', error);
    }
  },

  // Fetch notification statistics
  fetchNotificationStats: async () => {
    try {
      const response = await api.get('/notifications/stats');
      set({ stats: response.data });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  },

  // Send test notification
  sendTestNotification: async () => {
    try {
      const response = await api.post('/notifications/test');
      
      // Refresh notifications to show the test notification
      setTimeout(() => {
        get().fetchNotifications();
      }, 1000);
      
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Send urgent alert
  sendUrgentAlert: async (title, message, targetUserId = null, data = {}) => {
    try {
      const response = await api.post('/notifications/urgent', {
        title,
        message,
        target_user_id: targetUserId,
        data
      });
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Send handoff notification
  sendHandoffNotification: async (eventId, toUserId) => {
    try {
      const response = await api.post('/notifications/handoff', {
        event_id: eventId,
        to_user_id: toUserId
      });
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Trigger manual daily brief (for testing)
  triggerDailyBrief: async () => {
    try {
      const response = await api.post('/notifications/daily-brief');
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Trigger manual evening prep (for testing)
  triggerEveningPrep: async () => {
    try {
      const response = await api.post('/notifications/evening-prep');
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Trigger responsibility alert (for testing)
  triggerResponsibilityAlert: async () => {
    try {
      const response = await api.post('/notifications/responsibility-alert');
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Add new notification to store (for real-time updates)
  addNotification: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications]
    }));
    
    // Update stats
    get().fetchNotificationStats();
  },

  // Remove notification from store
  removeNotification: (notificationId) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== notificationId)
    }));
  },

  // Get unread notifications count
  getUnreadCount: () => {
    const { notifications } = get();
    return notifications.filter(n => !n.read_at).length;
  },

  // Get notifications by type
  getNotificationsByType: (type) => {
    const { notifications } = get();
    return notifications.filter(n => n.type === type);
  },

  // Get recent notifications (last 24 hours)
  getRecentNotifications: () => {
    const { notifications } = get();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return notifications.filter(n => 
      new Date(n.created_at) > yesterday
    );
  },

  // Filter notifications by priority
  getNotificationsByPriority: (priority) => {
    const { notifications } = get();
    return notifications.filter(n => {
      try {
        const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
        return data.priority === priority;
      } catch {
        return false;
      }
    });
  },

  // Clear all notifications
  clearNotifications: () => {
    set({ notifications: [], stats: { total: 0, unread: 0, today: 0 } });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Initialize notification preferences if not set
  initializePreferences: async () => {
    const { preferences } = get();
    if (!preferences) {
      await get().fetchPreferences();
    }
  },

  // Check if notification type is enabled
  isNotificationTypeEnabled: (type) => {
    const { preferences } = get();
    if (!preferences || !preferences.notification_types) return true;
    return preferences.notification_types[type] !== false;
  },

  // Check if channel is enabled
  isChannelEnabled: (channel) => {
    const { preferences } = get();
    if (!preferences || !preferences.channel_settings) return true;
    return preferences.channel_settings[channel] !== false;
  },

  // Get formatted time preferences
  getFormattedTimePreferences: () => {
    const { preferences } = get();
    if (!preferences || !preferences.time_preferences) {
      return {
        morning_brief_time: '06:30',
        evening_prep_time: '20:00'
      };
    }
    return preferences.time_preferences;
  },

  // Get quiet hours info
  getQuietHours: () => {
    const { preferences } = get();
    if (!preferences || !preferences.quiet_hours) {
      return {
        enabled: true,
        start: '22:00',
        end: '07:00'
      };
    }
    return preferences.quiet_hours;
  },

  // Check if currently in quiet hours
  isInQuietHours: () => {
    const quietHours = get().getQuietHours();
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = parseInt(quietHours.start.replace(':', ''));
    const endTime = parseInt(quietHours.end.replace(':', ''));
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    return currentTime >= startTime && currentTime <= endTime;
  }
}));

export default useNotificationStore;