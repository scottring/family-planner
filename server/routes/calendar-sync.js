const express = require('express');
const router = express.Router();
const googleCalendarService = require('../services/googleCalendar');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

// Get OAuth URL for Google Calendar authentication
router.get('/auth/url', auth, (req, res) => {
  try {
    if (!googleCalendarService.isConfigured()) {
      return res.status(503).json({ 
        message: 'Google Calendar integration not configured',
        mockMode: true
      });
    }

    const authUrl = googleCalendarService.generateAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    console.error('Auth URL generation error:', error);
    res.status(500).json({ message: 'Failed to generate authorization URL' });
  }
});

// Handle OAuth callback from Google
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ message: 'Missing authorization code or state' });
    }

    const userId = parseInt(state);
    
    if (!googleCalendarService.isConfigured()) {
      // Mock mode - simulate successful authentication
      const updateUser = db.prepare(`
        UPDATE users 
        SET google_tokens = ?, sync_enabled = TRUE, last_sync_time = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      const mockTokens = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        token_type: 'Bearer',
        expiry_date: Date.now() + (60 * 60 * 1000) // 1 hour from now
      };
      
      updateUser.run(JSON.stringify(mockTokens), userId);
      
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar_auth=success&mock=true`);
    }

    await googleCalendarService.handleAuthCallback(code, userId);
    
    // Redirect back to frontend with success message
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar_auth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?calendar_auth=error`);
  }
});

// Get user's Google calendars
router.get('/calendars', auth, async (req, res) => {
  try {
    const calendars = await googleCalendarService.getUserCalendars(req.user.id);
    res.json(calendars);
  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch calendars',
      error: error.message 
    });
  }
});

// Trigger manual sync
router.post('/sync', auth, async (req, res) => {
  try {
    const { calendarId = 'primary' } = req.body;
    
    const syncResults = await googleCalendarService.syncCalendar(req.user.id, calendarId);
    
    res.json({
      message: 'Sync completed successfully',
      results: syncResults
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ 
      message: 'Sync failed',
      error: error.message 
    });
  }
});

// Get sync status
router.get('/status', auth, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT sync_enabled, last_sync_time, google_tokens 
      FROM users 
      WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hasTokens = user.google_tokens && user.google_tokens !== '{}';
    const lastSyncTime = user.last_sync_time ? new Date(user.last_sync_time) : null;
    
    res.json({
      isConfigured: googleCalendarService.isConfigured(),
      isAuthenticated: hasTokens,
      syncEnabled: user.sync_enabled,
      lastSyncTime: lastSyncTime ? lastSyncTime.toISOString() : null,
      mockMode: !googleCalendarService.isConfigured()
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ message: 'Failed to get sync status' });
  }
});

// Update sync settings
router.put('/settings', [
  auth,
  body('syncEnabled').isBoolean(),
  body('selectedCalendars').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { syncEnabled, selectedCalendars = [] } = req.body;

    // Update user sync settings
    const updateUser = db.prepare(`
      UPDATE users 
      SET sync_enabled = ?, preferences = ?
      WHERE id = ?
    `);

    // Get current preferences and update calendar settings
    const currentUser = db.prepare('SELECT preferences FROM users WHERE id = ?').get(req.user.id);
    const preferences = currentUser?.preferences ? JSON.parse(currentUser.preferences) : {};
    preferences.selectedCalendars = selectedCalendars;

    updateUser.run(syncEnabled, JSON.stringify(preferences), req.user.id);

    res.json({ 
      message: 'Sync settings updated successfully',
      syncEnabled,
      selectedCalendars
    });
  } catch (error) {
    console.error('Update sync settings error:', error);
    res.status(500).json({ message: 'Failed to update sync settings' });
  }
});

// Disconnect Google Calendar
router.delete('/disconnect', auth, (req, res) => {
  try {
    const updateUser = db.prepare(`
      UPDATE users 
      SET google_tokens = '{}', sync_enabled = FALSE, google_calendar_id = NULL
      WHERE id = ?
    `);

    updateUser.run(req.user.id);

    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ message: 'Failed to disconnect Google Calendar' });
  }
});

// Get events from default calendar
router.get('/events', auth, async (req, res) => {
  try {
    const { timeMin, timeMax, maxResults } = req.query;
    const calendarId = 'primary';

    const options = {};
    if (timeMin) options.timeMin = timeMin;
    if (timeMax) options.timeMax = timeMax;
    if (maxResults) options.maxResults = parseInt(maxResults);

    const events = await googleCalendarService.fetchEvents(req.user.id, calendarId, options);
    
    res.json(events);
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch events',
      error: error.message 
    });
  }
});

// Get events from a specific calendar
router.get('/events/:calendarId', auth, async (req, res) => {
  try {
    const { calendarId } = req.params;
    const { timeMin, timeMax, maxResults } = req.query;

    const options = {};
    if (timeMin) options.timeMin = timeMin;
    if (timeMax) options.timeMax = timeMax;
    if (maxResults) options.maxResults = parseInt(maxResults);

    const events = await googleCalendarService.fetchEvents(req.user.id, calendarId, options);
    
    res.json(events);
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch events',
      error: error.message 
    });
  }
});

// Create event in Google Calendar
router.post('/events', [
  auth,
  body('title').notEmpty().trim(),
  body('start_time').isISO8601(),
  body('end_time').isISO8601(),
  body('calendarId').optional().default('primary')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, start_time, end_time, location, calendarId } = req.body;

    const eventData = {
      title,
      description,
      start_time,
      end_time,
      location
    };

    const createdEvent = await googleCalendarService.createEvent(req.user.id, eventData, calendarId);
    
    // Also create in local database
    googleCalendarService.createLocalEvent(createdEvent);

    res.json({
      message: 'Event created successfully',
      event: createdEvent
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ 
      message: 'Failed to create event',
      error: error.message 
    });
  }
});

// Update event in Google Calendar
router.put('/events/:eventId', [
  auth,
  body('title').notEmpty().trim(),
  body('start_time').isISO8601(),
  body('end_time').isISO8601(),
  body('calendarId').optional().default('primary')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventId } = req.params;
    const { title, description, start_time, end_time, location, calendarId } = req.body;

    const eventData = {
      title,
      description,
      start_time,
      end_time,
      location
    };

    const updatedEvent = await googleCalendarService.updateEvent(req.user.id, eventId, eventData, calendarId);
    
    // Update local database
    const localEvent = db.prepare('SELECT id FROM events WHERE google_event_id = ?').get(eventId);
    if (localEvent) {
      googleCalendarService.updateLocalEvent(localEvent.id, updatedEvent);
    }

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ 
      message: 'Failed to update event',
      error: error.message 
    });
  }
});

// Delete event from Google Calendar
router.delete('/events/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary' } = req.query;

    await googleCalendarService.deleteEvent(req.user.id, eventId, calendarId);
    
    // Remove from local database
    db.prepare('DELETE FROM events WHERE google_event_id = ?').run(eventId);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ 
      message: 'Failed to delete event',
      error: error.message 
    });
  }
});

// Get sync conflicts
router.get('/conflicts', auth, (req, res) => {
  try {
    // For now, return empty array - conflicts would be stored in a separate table
    // in a production system
    res.json([]);
  } catch (error) {
    console.error('Get conflicts error:', error);
    res.status(500).json({ message: 'Failed to get conflicts' });
  }
});

// Resolve sync conflict
router.post('/conflicts/:conflictId/resolve', [
  auth,
  body('resolution').isIn(['use_local', 'use_google', 'merge'])
], async (req, res) => {
  try {
    const { conflictId } = req.params;
    const { resolution } = req.body;

    // Implementation would depend on how conflicts are stored
    // For now, return success
    res.json({ 
      message: 'Conflict resolved successfully',
      resolution 
    });
  } catch (error) {
    console.error('Resolve conflict error:', error);
    res.status(500).json({ message: 'Failed to resolve conflict' });
  }
});

module.exports = router;