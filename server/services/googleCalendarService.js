const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.credentialsPath = path.join(__dirname, '../config/google-credentials.json');
    this.tokenPath = path.join(__dirname, '../config/google-token.json');
  }

  /**
   * Initialize the Google Calendar service with OAuth2
   */
  async initialize() {
    try {
      // Load credentials from file or environment
      let credentials;
      
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        credentials = {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:11001/api/google/callback'
        };
      } else {
        // Try to load from file
        const credentialsFile = await fs.readFile(this.credentialsPath, 'utf8');
        const { installed, web } = JSON.parse(credentialsFile);
        credentials = installed || web;
      }

      this.oauth2Client = new OAuth2Client(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri || credentials.redirect_uris[0]
      );

      // Try to load existing token
      try {
        const token = await fs.readFile(this.tokenPath, 'utf8');
        this.oauth2Client.setCredentials(JSON.parse(token));
      } catch (error) {
        console.log('No existing token found. User needs to authorize.');
      }

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar service:', error);
      return false;
    }
  }

  /**
   * Get authorization URL for user to grant access
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Handle OAuth2 callback and save tokens
   */
  async handleCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Save tokens for future use
      await fs.writeFile(this.tokenPath, JSON.stringify(tokens));
      
      return tokens;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  /**
   * Create a single event in Google Calendar
   */
  async createEvent(eventData, calendarId = 'primary') {
    try {
      // Convert our event format to Google Calendar format
      const googleEvent = this.convertToGoogleFormat(eventData);
      
      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: googleEvent,
        sendNotifications: true
      });

      return response.data;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Create multiple events in batch
   */
  async createBatchEvents(events, calendarId = 'primary') {
    const results = [];
    const errors = [];

    for (const event of events) {
      try {
        const result = await this.createEvent(event, calendarId);
        results.push({
          success: true,
          event: result,
          originalEvent: event
        });
      } catch (error) {
        errors.push({
          success: false,
          error: error.message,
          originalEvent: event
        });
      }
    }

    return { results, errors };
  }

  /**
   * Convert our event format to Google Calendar format
   */
  convertToGoogleFormat(event) {
    const googleEvent = {
      summary: event.title,
      description: this.buildEventDescription(event),
      location: event.location || '',
      start: {
        dateTime: event.start_time,
        timeZone: 'America/Los_Angeles'
      },
      end: {
        dateTime: event.end_time,
        timeZone: 'America/Los_Angeles'
      },
      reminders: {
        useDefault: false,
        overrides: []
      }
    };

    // Add reminders based on event type
    if (event.driving_needed && event.departure_time) {
      const departureDate = new Date(event.departure_time);
      const eventDate = new Date(event.start_time);
      const minutesBefore = Math.round((eventDate - departureDate) / 60000);
      
      googleEvent.reminders.overrides.push({
        method: 'popup',
        minutes: minutesBefore
      });
    }

    // Add standard reminders
    if (event.category === 'meal') {
      googleEvent.reminders.overrides.push(
        { method: 'popup', minutes: 60 },  // 1 hour before
        { method: 'popup', minutes: 15 }   // 15 minutes before
      );
    } else if (event.category === 'shopping') {
      googleEvent.reminders.overrides.push(
        { method: 'popup', minutes: 30 }   // 30 minutes before
      );
    } else {
      googleEvent.reminders.overrides.push(
        { method: 'popup', minutes: 30 }   // Default 30 minutes
      );
    }

    // Add attendees if specified
    if (event.attendees && Array.isArray(event.attendees)) {
      googleEvent.attendees = event.attendees.map(email => ({ email }));
    }

    // Add color based on category
    googleEvent.colorId = this.getEventColor(event.category || event.type);

    return googleEvent;
  }

  /**
   * Build comprehensive event description
   */
  buildEventDescription(event) {
    let description = event.description || '';

    // Add preparation info
    if (event.preparation_list && event.preparation_list.length > 0) {
      description += '\n\n📋 PREPARATION:\n';
      description += event.preparation_list.map(item => `• ${item}`).join('\n');
    }

    // Add checklist
    if (event.checklist && event.checklist.length > 0) {
      description += '\n\n✅ CHECKLIST:\n';
      description += event.checklist.map(item => `□ ${item}`).join('\n');
    }

    // Add packing list
    if (event.packing_list && event.packing_list.length > 0) {
      description += '\n\n🎒 PACKING LIST:\n';
      description += event.packing_list.map(item => `• ${item}`).join('\n');
    }

    // Add follow-up
    if (event.follow_up_list && event.follow_up_list.length > 0) {
      description += '\n\n📌 FOLLOW-UP:\n';
      description += event.follow_up_list.map(item => `• ${item}`).join('\n');
    }

    // Add driving info
    if (event.driving_needed) {
      description += '\n\n🚗 DRIVING REQUIRED';
      if (event.parking_info) {
        description += `\nParking: ${event.parking_info}`;
      }
      if (event.navigation_address) {
        description += `\nNavigate to: ${event.navigation_address}`;
      }
    }

    // Add special notes
    if (event.special_notes) {
      description += `\n\n📝 NOTE: ${event.special_notes}`;
    }

    // Add app link
    description += '\n\n---\nCreated with Itineraries Family Planner';

    return description;
  }

  /**
   * Get Google Calendar color ID based on category
   */
  getEventColor(category) {
    const colorMap = {
      'meal': '10',        // Green
      'meal_prep': '2',    // Light Green
      'shopping': '7',     // Cyan
      'sports': '9',       // Blue
      'school': '1',       // Lavender
      'medical': '11',     // Red
      'work': '5',         // Yellow
      'family': '3',       // Purple
      'personal': '8',     // Graphite
      'social': '4'        // Flamingo
    };

    return colorMap[category] || '9'; // Default to blue
  }

  /**
   * List available calendars for the user
   */
  async listCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items;
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw error;
    }
  }

  /**
   * Find or create a shared calendar
   */
  async findOrCreateSharedCalendar(calendarName = 'Family Planning - Itineraries') {
    try {
      // List all calendars
      const calendars = await this.listCalendars();
      
      // Check if calendar already exists
      let sharedCalendar = calendars.find(cal => cal.summary === calendarName);
      
      if (!sharedCalendar) {
        // Create new calendar
        const response = await this.calendar.calendars.insert({
          resource: {
            summary: calendarName,
            description: 'Shared family calendar from Itineraries app',
            timeZone: 'America/Los_Angeles'
          }
        });
        sharedCalendar = response.data;
      }
      
      return sharedCalendar;
    } catch (error) {
      console.error('Error finding/creating shared calendar:', error);
      throw error;
    }
  }

  /**
   * Share calendar with another user
   */
  async shareCalendar(calendarId, email, role = 'writer') {
    try {
      const response = await this.calendar.acl.insert({
        calendarId: calendarId,
        resource: {
          role: role, // 'reader', 'writer', 'owner'
          scope: {
            type: 'user',
            value: email
          }
        },
        sendNotifications: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sharing calendar:', error);
      throw error;
    }
  }
}

module.exports = new GoogleCalendarService();