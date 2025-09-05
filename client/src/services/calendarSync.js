import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:11001/api';

// Create axios instance with authentication
const api = axios.create({
  baseURL: `${API_BASE}/google`,
  withCredentials: true
});

// Create axios instance for calendar accounts API
const accountsApi = axios.create({
  baseURL: `${API_BASE}/calendar-accounts`,
  withCredentials: true
});

// Add auth token to requests for both APIs
const addAuthInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth-token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Don't redirect here - let React Router handle it
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(api);
addAuthInterceptor(accountsApi);

class CalendarSyncService {
  // Get OAuth URL for Google Calendar authentication
  async getAuthUrl() {
    try {
      const response = await api.get('/auth');
      return response.data;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      throw new Error(error.response?.data?.message || 'Failed to get authorization URL');
    }
  }

  // Start OAuth flow by redirecting to Google
  startOAuthFlow() {
    return new Promise((resolve, reject) => {
      this.getAuthUrl()
        .then(({ authUrl, mockMode }) => {
          if (mockMode) {
            // In mock mode, simulate successful authentication
            resolve({ success: true, mockMode: true });
          } else {
            window.location.href = authUrl;
          }
        })
        .catch(reject);
    });
  }

  // Get user's calendars
  async getCalendars() {
    try {
      const response = await api.get('/calendars');
      return response.data;
    } catch (error) {
      console.error('Error getting calendars:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch calendars');
    }
  }

  // Trigger manual sync
  async syncCalendar(calendarId = 'primary') {
    try {
      const response = await api.post('/sync', { calendarId });
      return response.data;
    } catch (error) {
      console.error('Error syncing calendar:', error);
      throw new Error(error.response?.data?.message || 'Calendar sync failed');
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const response = await api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw new Error(error.response?.data?.message || 'Failed to get sync status');
    }
  }

  // Update sync settings
  async updateSyncSettings(settings) {
    try {
      const response = await api.put('/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating sync settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to update sync settings');
    }
  }

  // Disconnect Google Calendar
  async disconnect() {
    try {
      const response = await api.delete('/disconnect');
      return response.data;
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw new Error(error.response?.data?.message || 'Failed to disconnect Google Calendar');
    }
  }

  // Get events from a specific calendar
  async getCalendarEvents(calendarId = 'primary', options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.timeMin) params.append('timeMin', options.timeMin);
      if (options.timeMax) params.append('timeMax', options.timeMax);
      if (options.maxResults) params.append('maxResults', options.maxResults);

      const response = await api.get(`/events/${calendarId}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch events');
    }
  }

  // Create event in Google Calendar
  async createEvent(eventData) {
    try {
      const response = await api.post('/events', eventData);
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error(error.response?.data?.message || 'Failed to create event');
    }
  }

  // Update event in Google Calendar
  async updateEvent(eventId, eventData) {
    try {
      const response = await api.put(`/events/${eventId}`, eventData);
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error(error.response?.data?.message || 'Failed to update event');
    }
  }

  // Delete event from Google Calendar
  async deleteEvent(eventId, calendarId = 'primary') {
    try {
      const response = await api.delete(`/events/${eventId}?calendarId=${calendarId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete event');
    }
  }

  // Get sync conflicts
  async getConflicts() {
    try {
      const response = await api.get('/conflicts');
      return response.data;
    } catch (error) {
      console.error('Error getting conflicts:', error);
      throw new Error(error.response?.data?.message || 'Failed to get conflicts');
    }
  }

  // Resolve sync conflict
  async resolveConflict(conflictId, resolution) {
    try {
      const response = await api.post(`/conflicts/${conflictId}/resolve`, { resolution });
      return response.data;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw new Error(error.response?.data?.message || 'Failed to resolve conflict');
    }
  }

  // Poll sync status (for UI updates)
  async pollSyncStatus(callback, interval = 5000, maxAttempts = 12) {
    let attempts = 0;
    const poll = async () => {
      try {
        const status = await this.getSyncStatus();
        callback(status);
        
        if (attempts < maxAttempts && (status.syncing || status.lastSyncTime)) {
          attempts++;
          setTimeout(poll, interval);
        }
      } catch (error) {
        callback({ error: error.message });
      }
    };
    
    poll();
  }

  // Check if callback URL contains auth results
  checkAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('calendar_auth');
    const mockMode = urlParams.get('mock');
    
    if (authResult) {
      // Clean up URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      return {
        success: authResult === 'success',
        error: authResult === 'error',
        mockMode: mockMode === 'true'
      };
    }
    
    return null;
  }

  // Format date for API calls
  formatDate(date) {
    return new Date(date).toISOString();
  }

  // Get upcoming events (next 7 days)
  async getUpcomingEvents(calendarId = 'primary') {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return this.getCalendarEvents(calendarId, {
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      maxResults: 20
    });
  }

  // Get events for a specific date range
  async getEventsInRange(startDate, endDate, calendarId = 'primary') {
    return this.getCalendarEvents(calendarId, {
      timeMin: this.formatDate(startDate),
      timeMax: this.formatDate(endDate)
    });
  }

  // ======= Multiple Account Management Methods =======

  // Get all connected calendar accounts
  async getCalendarAccounts() {
    try {
      const response = await accountsApi.get('/');
      return response.data;
    } catch (error) {
      console.error('Error getting calendar accounts:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch calendar accounts');
    }
  }

  // Get context assignments
  async getContextAssignments() {
    try {
      const response = await accountsApi.get('/contexts');
      return response.data;
    } catch (error) {
      console.error('Error getting context assignments:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch context assignments');
    }
  }

  // Add a new calendar account
  async addCalendarAccount(displayName, mockMode = false) {
    try {
      const response = await accountsApi.post('/add', {
        displayName,
        mockMode
      });
      return response.data;
    } catch (error) {
      console.error('Error adding calendar account:', error);
      throw new Error(error.response?.data?.message || 'Failed to add calendar account');
    }
  }

  // Remove a calendar account
  async removeCalendarAccount(accountId) {
    try {
      const response = await accountsApi.delete(`/${accountId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing calendar account:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove calendar account');
    }
  }

  // Set account as default for a context
  async setAccountContext(accountId, context) {
    try {
      const response = await accountsApi.put(`/${accountId}/context`, {
        context
      });
      return response.data;
    } catch (error) {
      console.error('Error setting account context:', error);
      throw new Error(error.response?.data?.message || 'Failed to set account context');
    }
  }

  // Remove context assignment
  async removeAccountContext(accountId, context) {
    try {
      const response = await accountsApi.delete(`/${accountId}/context/${context}`);
      return response.data;
    } catch (error) {
      console.error('Error removing account context:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove account context');
    }
  }

  // Get account for a specific context
  async getAccountForContext(context) {
    try {
      const response = await accountsApi.get(`/context/${context}`);
      return response.data;
    } catch (error) {
      console.error('Error getting account for context:', error);
      throw new Error(error.response?.data?.message || 'Failed to get account for context');
    }
  }

  // Update account display name
  async updateAccountDisplayName(accountId, displayName) {
    try {
      const response = await accountsApi.put(`/${accountId}/name`, {
        displayName
      });
      return response.data;
    } catch (error) {
      console.error('Error updating account name:', error);
      throw new Error(error.response?.data?.message || 'Failed to update account name');
    }
  }

  // Get account status
  async getAccountStatus(accountId) {
    try {
      const response = await accountsApi.get(`/${accountId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting account status:', error);
      throw new Error(error.response?.data?.message || 'Failed to get account status');
    }
  }

  // Create event in specific account/context
  async createEventInContext(eventData, context = 'personal') {
    try {
      // First get the account for the context
      const contextAccount = await this.getAccountForContext(context);
      
      if (!contextAccount.account) {
        throw new Error(`No calendar account assigned to ${context} context`);
      }

      // Create the event using the appropriate calendar ID
      const eventWithCalendar = {
        ...eventData,
        calendarId: contextAccount.account.calendar_id
      };

      return this.createEvent(eventWithCalendar);
    } catch (error) {
      console.error('Error creating event in context:', error);
      throw new Error(error.response?.data?.message || 'Failed to create event in context');
    }
  }

  // Sync all connected accounts
  async syncAllAccounts() {
    try {
      const accounts = await this.getCalendarAccounts();
      const syncResults = [];

      for (const account of accounts) {
        try {
          const result = await this.syncCalendar(account.calendar_id);
          syncResults.push({
            account: account,
            result: result,
            success: true
          });
        } catch (error) {
          syncResults.push({
            account: account,
            error: error.message,
            success: false
          });
        }
      }

      return {
        results: syncResults,
        totalAccounts: accounts.length,
        successfulSyncs: syncResults.filter(r => r.success).length
      };
    } catch (error) {
      console.error('Error syncing all accounts:', error);
      throw new Error('Failed to sync all accounts');
    }
  }

  // Get calendars for a specific account
  async getAccountCalendars(accountId) {
    try {
      const response = await accountsApi.get(`/${accountId}/calendars`);
      return response.data;
    } catch (error) {
      console.error('Error getting account calendars:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch account calendars');
    }
  }

  // Save calendar selections for a specific account
  async saveAccountCalendarSelections(accountId, selections) {
    try {
      const response = await accountsApi.put(`/${accountId}/calendars`, {
        selections
      });
      return response.data;
    } catch (error) {
      console.error('Error saving calendar selections:', error);
      throw new Error(error.response?.data?.message || 'Failed to save calendar selections');
    }
  }

  // Get the current active account for creating events
  async getActiveAccountForNewEvent(eventCategory = 'personal') {
    try {
      // Map event categories to contexts
      const contextMap = {
        'work': 'work',
        'business': 'work', 
        'professional': 'work',
        'family': 'family',
        'personal': 'personal',
        'default': 'personal'
      };

      const context = contextMap[eventCategory.toLowerCase()] || 'personal';
      const contextAccount = await this.getAccountForContext(context);
      
      if (contextAccount.account) {
        return {
          accountId: contextAccount.account.id,
          calendarId: contextAccount.account.calendar_id,
          displayName: contextAccount.account.displayName,
          email: contextAccount.account.email,
          context: context
        };
      }

      // Fallback to first available account
      const accounts = await this.getCalendarAccounts();
      if (accounts.length > 0) {
        return {
          accountId: accounts[0].id,
          calendarId: accounts[0].calendar_id,
          displayName: accounts[0].display_name,
          email: accounts[0].google_account_email,
          context: 'fallback'
        };
      }

      throw new Error('No calendar accounts available');
    } catch (error) {
      console.error('Error getting active account:', error);
      throw new Error('Failed to determine active calendar account');
    }
  }
}

export default new CalendarSyncService();