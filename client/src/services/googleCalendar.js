// Simple Google Calendar integration
// Uses Google Calendar API directly from frontend

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

class GoogleCalendarService {
  constructor() {
    this.isInitialized = false;
    this.gapi = null;
    this.tokenClient = null;
  }

  // Initialize Google API
  async init() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      // Load the Google API script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: GOOGLE_API_KEY,
              discoveryDocs: DISCOVERY_DOCS,
            });
            this.gapi = window.gapi;
            this.isInitialized = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);

      // Load Google Identity Services
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            // Token received
            if (response.access_token) {
              localStorage.setItem('google_access_token', response.access_token);
            }
          },
        });
      };
      document.body.appendChild(gisScript);
    });
  }

  // Sign in with Google
  async signIn() {
    if (!this.tokenClient) {
      await this.init();
    }
    
    return new Promise((resolve) => {
      this.tokenClient.callback = (response) => {
        if (response.access_token) {
          localStorage.setItem('google_access_token', response.access_token);
          this.gapi.client.setToken({ access_token: response.access_token });
          resolve(true);
        }
      };
      this.tokenClient.requestAccessToken();
    });
  }

  // Sign out
  signOut() {
    const token = localStorage.getItem('google_access_token');
    if (token && this.gapi) {
      this.gapi.client.setToken(null);
      localStorage.removeItem('google_access_token');
    }
  }

  // Check if signed in
  isSignedIn() {
    return !!localStorage.getItem('google_access_token');
  }

  // List calendars
  async listCalendars() {
    if (!this.isSignedIn()) {
      throw new Error('Not signed in to Google');
    }

    await this.init();
    
    const token = localStorage.getItem('google_access_token');
    this.gapi.client.setToken({ access_token: token });

    const response = await this.gapi.client.calendar.calendarList.list();
    return response.result.items || [];
  }

  // Get events from calendar
  async getEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
    if (!this.isSignedIn()) {
      throw new Error('Not signed in to Google');
    }

    await this.init();
    
    const token = localStorage.getItem('google_access_token');
    this.gapi.client.setToken({ access_token: token });

    const params = {
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 100,
      orderBy: 'startTime',
    };

    const response = await this.gapi.client.calendar.events.list(params);
    return response.result.items || [];
  }

  // Create event
  async createEvent(calendarId = 'primary', event) {
    if (!this.isSignedIn()) {
      throw new Error('Not signed in to Google');
    }

    await this.init();
    
    const token = localStorage.getItem('google_access_token');
    this.gapi.client.setToken({ access_token: token });

    const response = await this.gapi.client.calendar.events.insert({
      calendarId,
      resource: event,
    });

    return response.result;
  }

  // Update event
  async updateEvent(calendarId = 'primary', eventId, event) {
    if (!this.isSignedIn()) {
      throw new Error('Not signed in to Google');
    }

    await this.init();
    
    const token = localStorage.getItem('google_access_token');
    this.gapi.client.setToken({ access_token: token });

    const response = await this.gapi.client.calendar.events.update({
      calendarId,
      eventId,
      resource: event,
    });

    return response.result;
  }

  // Delete event
  async deleteEvent(calendarId = 'primary', eventId) {
    if (!this.isSignedIn()) {
      throw new Error('Not signed in to Google');
    }

    await this.init();
    
    const token = localStorage.getItem('google_access_token');
    this.gapi.client.setToken({ access_token: token });

    await this.gapi.client.calendar.events.delete({
      calendarId,
      eventId,
    });

    return true;
  }

  // Sync events to Supabase
  async syncToSupabase(supabase) {
    // First, get all calendars
    const calendars = await this.listCalendars();
    const syncedEvents = [];
    const syncedCalendars = [];

    // Sync each calendar
    for (const calendar of calendars) {
      // Save calendar info
      const calendarData = {
        google_calendar_id: calendar.id,
        name: calendar.summary,
        description: calendar.description || '',
        color: calendar.backgroundColor || '#4285F4',
        is_primary: calendar.primary || false,
      };

      const { data: calData, error: calError } = await supabase
        .from('calendar_accounts')
        .upsert(calendarData, { onConflict: 'google_calendar_id' })
        .select();

      if (!calError && calData) {
        syncedCalendars.push(calData[0]);
      }

      // Get events from this calendar
      try {
        const events = await this.getEvents(calendar.id);
        
        for (const event of events) {
          const eventData = {
            google_event_id: event.id,
            google_calendar_id: calendar.id,
            title: event.summary || 'Untitled Event',
            description: event.description || '',
            start_time: event.start?.dateTime || event.start?.date,
            end_time: event.end?.dateTime || event.end?.date,
            location: event.location || '',
            category: 'google',
            calendar_name: calendar.summary,
          };

          const { data, error } = await supabase
            .from('events')
            .upsert(eventData, { onConflict: 'google_event_id' })
            .select();

          if (!error && data) {
            syncedEvents.push(data[0]);
          }
        }
      } catch (err) {
        console.error(`Failed to sync calendar ${calendar.summary}:`, err);
      }
    }

    console.log(`Synced ${syncedCalendars.length} calendars and ${syncedEvents.length} events`);
    return { calendars: syncedCalendars, events: syncedEvents };
  }
}

export default new GoogleCalendarService();