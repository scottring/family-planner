import { supabase } from './supabase';

class CalendarSyncService {
  async getAuthUrl() {
    try {
      // Call the Edge Function to get OAuth URL
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'auth' }
      });
      
      if (error) {
        console.error('Failed to get auth URL:', error);
        return {
          authUrl: '#',
          mockMode: true,
          message: 'Google Calendar Edge Function not available'
        };
      }
      
      return {
        authUrl: data.authUrl,
        mockMode: false
      };
    } catch (err) {
      console.error('Error getting auth URL:', err);
      return {
        authUrl: '#',
        mockMode: true,
        message: 'Failed to connect to Google Calendar'
      };
    }
  }

  async startOAuthFlow() {
    const result = await this.getAuthUrl();
    if (!result.mockMode && result.authUrl) {
      // Redirect to Google OAuth
      window.location.href = result.authUrl;
      return { success: true, mockMode: false };
    }
    return { 
      success: false, 
      mockMode: true,
      message: result.message || 'Using local calendar storage'
    };
  }

  async getCalendars() {
    try {
      // Try to get real Google calendars
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'calendars' }
      });
      
      if (error || !data || !data.calendars) {
        // Return default calendars if Edge Function fails
        return [
          {
            id: 'primary',
            summary: 'Primary Calendar',
            description: 'Your main calendar',
            backgroundColor: '#4285f4',
            primary: true
          },
          {
            id: 'family',
            summary: 'Family Calendar',
            description: 'Shared family events',
            backgroundColor: '#0f9d58'
          }
        ];
      }
      
      return data.calendars;
    } catch (err) {
      console.error('Error fetching calendars:', err);
      return [
        {
          id: 'primary',
          summary: 'Primary Calendar',
          description: 'Your main calendar',
          backgroundColor: '#4285f4',
          primary: true
        }
      ];
    }
  }

  async syncCalendar(calendarId = 'primary') {
    try {
      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: { action: 'sync', data: { calendarId } }
      });

      if (error) {
        console.error('Calendar sync error:', error);
        // Return mock sync result
        return {
          success: true,
          message: 'Using local calendar storage (Edge Functions not deployed)',
          events: []
        };
      }
      
      // Store synced events in Supabase
      if (data && data.events && data.events.length > 0) {
        for (const event of data.events) {
          await supabase.from('events').upsert({
            google_event_id: event.id,
            title: event.title,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            description: event.description
          }, {
            onConflict: 'google_event_id'
          });
        }
      }

      return data;
    } catch (err) {
      console.error('Sync error:', err);
      return {
        success: true,
        message: 'Using local calendar storage',
        events: []
      };
    }
  }

  async getSyncStatus() {
    try {
      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: { action: 'status' }
      });

      if (error) {
        console.error('Sync status error:', error);
        // Check if we have stored Google tokens
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('google_tokens')
            .eq('auth_id', user.id)
            .single();
          
          return {
            connected: !!userProfile?.google_tokens,
            syncEnabled: false,
            lastSync: null,
            mockMode: !userProfile?.google_tokens,
            isAuthenticated: !!userProfile?.google_tokens,
            isConfigured: true // Edge Functions are deployed
          };
        }
        
        return {
          connected: false,
          syncEnabled: false,
          lastSync: null,
          mockMode: true,
          isAuthenticated: false,
          isConfigured: true
        };
      }
      return data;
    } catch (err) {
      console.error('Sync status error:', err);
      return {
        connected: false,
        syncEnabled: false,
        lastSync: null,
        mockMode: true,
        isAuthenticated: false,
        isConfigured: false
      };
    }
  }

  async createEvent(eventData) {
    // Create event directly in Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('events')
      .insert({
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start,
        end_time: eventData.end,
        location: eventData.location,
        calendar_id: eventData.calendarId || 'primary',
        created_by: userProfile.id
      })
      .select()
      .single();

    if (error) throw error;
    
    // If connected to Google, also create in Google Calendar
    try {
      const { data: syncData } = await supabase.functions.invoke('calendar-sync', {
        body: { 
          action: 'create', 
          data: {
            calendarId: eventData.calendarId || 'primary',
            event: {
              summary: eventData.title,
              description: eventData.description,
              start: { dateTime: eventData.start },
              end: { dateTime: eventData.end },
              location: eventData.location
            }
          }
        }
      });
      
      if (syncData && syncData.googleEventId) {
        // Update the local event with Google event ID
        await supabase
          .from('events')
          .update({ google_event_id: syncData.googleEventId })
          .eq('id', data.id);
      }
    } catch (syncError) {
      console.log('Could not sync to Google Calendar:', syncError);
    }
    
    return data;
  }

  async updateEvent(eventId, eventData) {
    const { data, error } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start,
        end_time: eventData.end,
        location: eventData.location
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteEvent(eventId) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return { success: true };
  }

  async getCalendarEvents(calendarId = 'primary', options = {}) {
    let query = supabase
      .from('events')
      .select('*')
      .eq('calendar_id', calendarId);

    if (options.timeMin) {
      query = query.gte('start_time', options.timeMin);
    }
    if (options.timeMax) {
      query = query.lte('start_time', options.timeMax);
    }
    if (options.maxResults) {
      query = query.limit(options.maxResults);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getUpcomingEvents(calendarId = 'primary') {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return this.getCalendarEvents(calendarId, {
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      maxResults: 20
    });
  }

  checkAuthCallback() {
    // Check URL params for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('calendar_auth');
    
    if (authResult) {
      window.history.replaceState({}, document.title, window.location.pathname);
      return {
        success: authResult === 'success',
        error: authResult === 'error',
        mockMode: false
      };
    }
    
    return null;
  }

  async disconnect() {
    // Clear any stored Google tokens
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('users')
      .update({ 
        google_calendar_id: null,
        google_tokens: null,
        sync_enabled: false 
      })
      .eq('auth_id', user.id);

    return { success: true };
  }

  // Stub methods for compatibility
  async updateSyncSettings(settings) {
    return { success: true, settings };
  }

  async getConflicts() {
    return [];
  }

  async resolveConflict(conflictId, resolution) {
    return { success: true };
  }

  async pollSyncStatus(callback, interval = 5000, maxAttempts = 12) {
    // Mock polling
    callback({ syncing: false, mockMode: false });
  }

  formatDate(date) {
    return new Date(date).toISOString();
  }

  async getEventsInRange(startDate, endDate, calendarId = 'primary') {
    return this.getCalendarEvents(calendarId, {
      timeMin: this.formatDate(startDate),
      timeMax: this.formatDate(endDate)
    });
  }

  // Multiple account management stubs
  async getCalendarAccounts() {
    return [];
  }

  async getContextAssignments() {
    return {};
  }

  async addCalendarAccount(displayName, mockMode = false) {
    return { success: true, mockMode: true };
  }

  async removeCalendarAccount(accountId) {
    return { success: true };
  }

  async setAccountContext(accountId, context) {
    return { success: true };
  }

  async removeAccountContext(accountId, context) {
    return { success: true };
  }

  async getAccountForContext(context) {
    return { account: null };
  }

  async updateAccountDisplayName(accountId, displayName) {
    return { success: true };
  }

  async getAccountStatus(accountId) {
    return { connected: false, mockMode: true };
  }

  async createEventInContext(eventData, context = 'personal') {
    return this.createEvent(eventData);
  }

  async syncAllAccounts() {
    return {
      results: [],
      totalAccounts: 0,
      successfulSyncs: 0
    };
  }

  async getAccountCalendars(accountId) {
    return [];
  }

  async saveAccountCalendarSelections(accountId, selections) {
    return { success: true };
  }

  async getActiveAccountForNewEvent(eventCategory = 'personal') {
    return {
      accountId: 'local',
      calendarId: 'primary',
      displayName: 'Local Calendar',
      email: '',
      context: 'personal'
    };
  }
}

export default new CalendarSyncService();