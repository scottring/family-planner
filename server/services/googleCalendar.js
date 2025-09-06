const { google } = require('googleapis');
const db = require('../config/database');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.initializeOAuth();
  }

  initializeOAuth() {
    // Initialize OAuth2 client with credentials from environment
    const credentials = this.getCredentials();
    
    console.log('Google Calendar credentials check:', {
      hasClientId: !!credentials.client_id,
      hasClientSecret: !!credentials.client_secret,
      redirectUri: credentials.redirect_uri
    });
    
    if (credentials.client_id && credentials.client_secret) {
      this.oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri
      );
      
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      console.log('✅ Google Calendar service initialized successfully');
    } else {
      console.warn('⚠️  Google Calendar credentials not configured. Using mock mode.');
    }
  }

  getCredentials() {
    return {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback`
    };
  }

  // Generate OAuth URL for user consent
  generateAuthUrl(userId) {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId.toString(), // Pass user ID in state for callback
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  // Handle OAuth callback and store tokens
  async handleAuthCallback(code, userId) {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar not configured');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      console.log('🔑 OAuth tokens received:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        expiryDate: tokens.expiry_date
      });
      
      if (!tokens.refresh_token) {
        console.warn('⚠️  No refresh token received! User may need to revoke app access and re-authorize.');
        console.log('📋 To fix: Go to https://myaccount.google.com/permissions, find this app, remove access, then re-authorize.');
      }
      
      // Store tokens in database
      const updateUser = db.prepare(`
        UPDATE users 
        SET google_tokens = ?, sync_enabled = TRUE, last_sync_time = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      updateUser.run(JSON.stringify(tokens), userId);
      
      console.log('✅ Tokens stored for user ID:', userId);
      return tokens;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  // Create a new OAuth2Client instance for a specific user
  createUserOAuth2Client(userId) {
    const user = db.prepare('SELECT google_tokens FROM users WHERE id = ?').get(userId);
    
    if (!user || !user.google_tokens) {
      throw new Error('User not authenticated with Google Calendar');
    }

    const tokens = JSON.parse(user.google_tokens);
    
    console.log('🔍 Creating OAuth2 client for user ID:', userId);
    console.log('🔑 Stored tokens check:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none'
    });
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token available. User needs to re-authorize with Google Calendar.');
    }
    
    const credentials = this.getCredentials();
    if (!credentials.client_id || !credentials.client_secret) {
      throw new Error('Google Calendar not configured');
    }
    
    // Create a new OAuth2Client instance for this user
    const userOAuth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uri
    );
    
    userOAuth2Client.setCredentials(tokens);
    
    // Set up automatic token refresh for this specific user
    userOAuth2Client.on('tokens', (newTokens) => {
      console.log('🔄 Refreshing tokens for user:', userId);
      // Merge new tokens with existing ones
      const updatedTokens = { ...tokens, ...newTokens };
      const updateTokens = db.prepare(`
        UPDATE users SET google_tokens = ? WHERE id = ?
      `);
      updateTokens.run(JSON.stringify(updatedTokens), userId);
    });
    
    return userOAuth2Client;
  }

  // Set credentials from stored tokens (legacy method - kept for compatibility)
  setUserCredentials(userId) {
    const userClient = this.createUserOAuth2Client(userId);
    this.oauth2Client.setCredentials(userClient.credentials);
  }

  // Get user's calendar list
  async getUserCalendars(userId) {
    if (!this.oauth2Client) {
      return this.getMockCalendars();
    }

    try {
      // Create user-specific OAuth2Client
      const userOAuth2Client = this.createUserOAuth2Client(userId);
      
      // Create user-specific calendar instance
      const userCalendar = google.calendar({ version: 'v3', auth: userOAuth2Client });
      
      const response = await userCalendar.calendarList.list();
      
      // Log all calendars for debugging
      console.log('Google Calendar API returned calendars:');
      response.data.items.forEach(cal => {
        console.log(`  - ${cal.summary} (ID: ${cal.id}, Primary: ${cal.primary || false}, AccessRole: ${cal.accessRole})`);
      });
      
      return response.data.items.map(calendar => ({
        id: calendar.id,
        name: calendar.summary,
        description: calendar.description || '',
        primary: calendar.primary || false,
        accessRole: calendar.accessRole,
        backgroundColor: calendar.backgroundColor,
        foregroundColor: calendar.foregroundColor
      }));
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw new Error('Failed to fetch calendars');
    }
  }

  // Fetch events from Google Calendar
  async fetchEvents(userId, calendarId = 'primary', options = {}) {
    if (!this.oauth2Client) {
      return this.getMockEvents();
    }

    try {
      // Create user-specific OAuth2Client
      const userOAuth2Client = this.createUserOAuth2Client(userId);
      
      // Create user-specific calendar instance
      const userCalendar = google.calendar({ version: 'v3', auth: userOAuth2Client });
      
      const {
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        maxResults = 250
      } = options;

      const response = await userCalendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items.map(event => this.formatGoogleEvent(event));
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events from Google Calendar');
    }
  }

  // Create event in Google Calendar
  async createEvent(userId, eventData, calendarId = 'primary') {
    if (!this.calendar) {
      return this.createMockEvent(eventData);
    }

    try {
      this.setUserCredentials(userId);
      
      const googleEvent = this.formatLocalEvent(eventData);
      
      const response = await this.calendar.events.insert({
        calendarId,
        resource: googleEvent
      });

      return this.formatGoogleEvent(response.data);
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event in Google Calendar');
    }
  }

  // Update event in Google Calendar
  async updateEvent(userId, eventId, eventData, calendarId = 'primary') {
    if (!this.calendar) {
      return this.updateMockEvent(eventId, eventData);
    }

    try {
      this.setUserCredentials(userId);
      
      const googleEvent = this.formatLocalEvent(eventData);
      
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: googleEvent
      });

      return this.formatGoogleEvent(response.data);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event in Google Calendar');
    }
  }

  // Delete event from Google Calendar
  async deleteEvent(userId, eventId, calendarId = 'primary') {
    if (!this.calendar) {
      return this.deleteMockEvent(eventId);
    }

    try {
      this.setUserCredentials(userId);
      
      await this.calendar.events.delete({
        calendarId,
        eventId
      });

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event from Google Calendar');
    }
  }

  // Perform two-way sync
  async syncCalendar(userId, calendarId = 'primary') {
    try {
      // Get user's sync preferences
      const user = db.prepare('SELECT last_sync_time, sync_enabled FROM users WHERE id = ?').get(userId);
      
      if (!user || !user.sync_enabled) {
        throw new Error('Sync not enabled for user');
      }

      const lastSyncTime = user.last_sync_time ? new Date(user.last_sync_time) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const syncOptions = {
        timeMin: lastSyncTime.toISOString(),
        timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days forward
      };

      // Fetch events from Google Calendar
      const googleEvents = await this.fetchEvents(userId, calendarId, syncOptions);
      
      // Get local events in the same timeframe
      const localEvents = db.prepare(`
        SELECT * FROM events 
        WHERE start_time >= ? AND end_time <= ?
        AND (google_event_id IS NULL OR google_event_id != '')
      `).all(syncOptions.timeMin, syncOptions.timeMax);

      const syncResults = {
        imported: 0,
        updated: 0,
        conflicts: [],
        errors: []
      };

      // Import/update events from Google Calendar
      for (const googleEvent of googleEvents) {
        try {
          const existingEvent = db.prepare('SELECT * FROM events WHERE google_event_id = ?').get(googleEvent.google_event_id);
          
          if (existingEvent) {
            // Check for conflicts (local changes vs Google changes)
            const conflict = this.detectConflict(existingEvent, googleEvent);
            if (conflict) {
              syncResults.conflicts.push({
                eventId: existingEvent.id,
                googleEventId: googleEvent.google_event_id,
                conflict
              });
              continue;
            }
            
            // Update existing event
            this.updateLocalEvent(existingEvent.id, googleEvent);
            syncResults.updated++;
          } else {
            // Create new local event
            this.createLocalEvent(googleEvent);
            syncResults.imported++;
          }
        } catch (error) {
          syncResults.errors.push({
            googleEventId: googleEvent.google_event_id,
            error: error.message
          });
        }
      }

      // Update last sync time
      db.prepare('UPDATE users SET last_sync_time = CURRENT_TIMESTAMP WHERE id = ?').run(userId);

      return syncResults;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }

  // Helper methods
  formatGoogleEvent(googleEvent) {
    const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
    const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;
    
    return {
      google_event_id: googleEvent.id,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      location: googleEvent.location || '',
      calendar_id: googleEvent.organizer?.email || 'primary',
      event_type: 'synced',
      updated_at: new Date().toISOString()
    };
  }

  formatLocalEvent(localEvent) {
    return {
      summary: localEvent.title,
      description: localEvent.description,
      start: {
        dateTime: new Date(localEvent.start_time).toISOString(),
        timeZone: 'America/New_York' // Should be configurable
      },
      end: {
        dateTime: new Date(localEvent.end_time).toISOString(),
        timeZone: 'America/New_York'
      },
      location: localEvent.location
    };
  }

  createLocalEvent(eventData) {
    const insertEvent = db.prepare(`
      INSERT INTO events (google_event_id, title, description, start_time, end_time, location, calendar_id, event_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    return insertEvent.run(
      eventData.google_event_id,
      eventData.title,
      eventData.description,
      eventData.start_time,
      eventData.end_time,
      eventData.location,
      eventData.calendar_id,
      'synced'
    );
  }

  updateLocalEvent(eventId, eventData) {
    const updateEvent = db.prepare(`
      UPDATE events SET
        title = ?, description = ?, start_time = ?, end_time = ?, 
        location = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return updateEvent.run(
      eventData.title,
      eventData.description,
      eventData.start_time,
      eventData.end_time,
      eventData.location,
      eventId
    );
  }

  detectConflict(localEvent, googleEvent) {
    const localUpdated = new Date(localEvent.updated_at);
    const googleUpdated = new Date(googleEvent.updated_at || googleEvent.start_time);
    
    // Simple conflict detection - check if title or times differ
    if (localEvent.title !== googleEvent.title ||
        localEvent.start_time !== googleEvent.start_time ||
        localEvent.end_time !== googleEvent.end_time) {
      return {
        type: 'content_mismatch',
        localUpdated: localUpdated.toISOString(),
        googleUpdated: googleUpdated.toISOString(),
        fields: {
          title: { local: localEvent.title, google: googleEvent.title },
          start_time: { local: localEvent.start_time, google: googleEvent.start_time },
          end_time: { local: localEvent.end_time, google: googleEvent.end_time }
        }
      };
    }
    
    return null;
  }

  // Mock methods for development without Google API credentials
  getMockCalendars() {
    return [
      {
        id: 'mock-primary',
        name: 'Primary Calendar (Mock)',
        description: 'Your main calendar',
        primary: true,
        accessRole: 'owner',
        backgroundColor: '#3174ad',
        foregroundColor: '#ffffff'
      },
      {
        id: 'mock-family',
        name: 'Family Calendar (Mock)',
        description: 'Family events and activities',
        primary: false,
        accessRole: 'owner',
        backgroundColor: '#28a745',
        foregroundColor: '#ffffff'
      }
    ];
  }

  getMockEvents() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return [
      {
        google_event_id: 'mock-event-1',
        title: 'Doctor Appointment (Mock)',
        description: 'Annual checkup',
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
        location: 'Medical Center',
        calendar_id: 'mock-primary',
        event_type: 'synced',
        updated_at: now.toISOString()
      },
      {
        google_event_id: 'mock-event-2',
        title: 'Family Dinner (Mock)',
        description: 'Weekly family dinner',
        start_time: nextWeek.toISOString(),
        end_time: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        location: 'Home',
        calendar_id: 'mock-family',
        event_type: 'synced',
        updated_at: now.toISOString()
      }
    ];
  }

  createMockEvent(eventData) {
    return {
      google_event_id: `mock-event-${Date.now()}`,
      ...eventData,
      updated_at: new Date().toISOString()
    };
  }

  updateMockEvent(eventId, eventData) {
    return {
      google_event_id: eventId,
      ...eventData,
      updated_at: new Date().toISOString()
    };
  }

  deleteMockEvent(eventId) {
    console.log(`Mock: Deleted event ${eventId}`);
    return true;
  }

  // Check if Google Calendar is configured
  isConfigured() {
    const credentials = this.getCredentials();
    return !!(credentials.client_id && credentials.client_secret);
  }
}

module.exports = new GoogleCalendarService();