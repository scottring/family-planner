import { supabase } from './supabase';
import googleCalendar from './googleCalendar';

class CalendarAccountsService {
  async getAccounts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const accounts = [];
    
    // Check if Google Calendar is connected
    if (googleCalendar.isSignedIn()) {
      accounts.push({
        id: 'google_primary',
        display_name: 'Google Calendar',
        google_account_email: user.email,
        connected: true,
        isGoogle: true
      });
    }
    
    // Always show local account option
    accounts.push({
      id: 'local',
      display_name: 'Local Calendar',
      google_account_email: user.email || 'user@example.com',
      connected: false,
      isGoogle: false
    });
    
    return accounts;
  }

  async getContexts() {
    // Return default contexts
    return {
      contexts: {
        personal: {
          accountId: 'primary',
          displayName: 'Primary Account',
          email: 'user@example.com'
        }
      },
      availableContexts: ['work', 'personal', 'family']
    };
  }

  async addAccount(displayName, mockMode = false) {
    if (mockMode) {
      return {
        success: true,
        mockMode: true,
        message: 'Mock Google Calendar account added'
      };
    }
    
    // Use simple Google sign-in
    try {
      await googleCalendar.init();
      const success = await googleCalendar.signIn();
      
      if (success) {
        // Sync initial events to Supabase
        try {
          await googleCalendar.syncToSupabase(supabase);
        } catch (syncError) {
          console.log('Initial sync failed, will retry later:', syncError);
        }
        
        return {
          success: true,
          mockMode: false,
          message: 'Google Calendar connected successfully!'
        };
      }
    } catch (err) {
      console.error('Failed to connect Google Calendar:', err);
      return {
        success: false,
        mockMode: false,
        message: 'Failed to connect Google Calendar. Please check your Google API credentials.'
      };
    }
    
    return {
      success: false,
      mockMode: false,
      message: 'Google Calendar connection failed'
    };
  }

  async removeAccount(accountId) {
    return { success: true };
  }

  async setContext(accountId, context) {
    return { success: true };
  }

  async removeContext(accountId, context) {
    return { success: true };
  }

  async updateDisplayName(accountId, displayName) {
    return { success: true };
  }

  async getCalendars(accountId) {
    // Return mock calendars
    return {
      calendars: [
        {
          id: 'primary',
          summary: 'Primary Calendar',
          description: 'Your main calendar',
          primary: true,
          selected: true,
          contexts: ['personal']
        },
        {
          id: 'work',
          summary: 'Work Calendar',
          description: 'Work events',
          selected: false,
          contexts: []
        }
      ]
    };
  }

  async saveCalendarSelections(accountId, selections) {
    return { success: true };
  }
}

export default new CalendarAccountsService();