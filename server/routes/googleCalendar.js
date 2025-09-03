const express = require('express');
const router = express.Router();
const googleCalendarService = require('../services/googleCalendar');
const authMiddleware = require('../middleware/auth');
const db = require('../config/database');

// Check if Google Calendar is configured
router.get('/status', authMiddleware, (req, res) => {
  try {
    const isConfigured = googleCalendarService.isConfigured();
    const user = db.prepare('SELECT sync_enabled, last_sync_time FROM users WHERE id = ?').get(req.user.id);
    
    res.json({
      configured: isConfigured,
      connected: user?.sync_enabled || false,
      lastSync: user?.last_sync_time || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start OAuth flow
router.get('/auth', authMiddleware, (req, res) => {
  try {
    if (!googleCalendarService.isConfigured()) {
      return res.status(503).json({ 
        error: 'Google Calendar not configured', 
        mockMode: true 
      });
    }
    
    const authUrl = googleCalendarService.generateAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle OAuth callback (GET request from Google)
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5174'}/settings?error=missing_code`);
    }
    
    // State contains the user ID
    const userId = parseInt(state);
    const tokens = await googleCalendarService.handleAuthCallback(code, userId);
    
    // Redirect back to frontend with success
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5174'}/settings?calendar_auth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5174'}/settings?calendar_auth=error`);
  }
});

// Disconnect Google Calendar
router.post('/disconnect', authMiddleware, (req, res) => {
  try {
    db.prepare(`
      UPDATE users 
      SET google_tokens = NULL, sync_enabled = 0 
      WHERE id = ?
    `).run(req.user.id);
    
    res.json({ 
      success: true, 
      message: 'Google Calendar disconnected' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's calendars
router.get('/calendars', authMiddleware, async (req, res) => {
  try {
    const calendars = await googleCalendarService.getUserCalendars(req.user.id);
    res.json(calendars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync with Google Calendar
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { calendarId = 'primary' } = req.body;
    const syncResults = await googleCalendarService.syncCalendar(req.user.id, calendarId);
    
    res.json({
      success: true,
      results: syncResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import events from Google Calendar
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const { calendarId = 'primary', timeMin, timeMax } = req.body;
    
    const events = await googleCalendarService.fetchEvents(req.user.id, calendarId, {
      timeMin,
      timeMax
    });
    
    // Store events in local database
    const importResults = {
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const event of events) {
      try {
        // Check if event already exists
        const existing = db.prepare(
          'SELECT id FROM events WHERE google_event_id = ?'
        ).get(event.google_event_id);
        
        if (existing) {
          importResults.skipped++;
          continue;
        }
        
        // Insert new event
        db.prepare(`
          INSERT INTO events (
            user_id, title, description, location, 
            start_time, end_time, type, google_event_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.user.id,
          event.title,
          event.description,
          event.location,
          event.start_time,
          event.end_time,
          'google',
          event.google_event_id
        );
        
        importResults.imported++;
      } catch (error) {
        importResults.errors.push({
          event: event.title,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results: importResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export local event to Google Calendar
router.post('/export/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary' } = req.body;
    
    // Get local event
    const event = db.prepare(
      'SELECT * FROM events WHERE id = ? AND user_id = ?'
    ).get(eventId, req.user.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.google_event_id) {
      return res.status(400).json({ error: 'Event already synced with Google Calendar' });
    }
    
    // Create in Google Calendar
    const googleEvent = await googleCalendarService.createEvent(req.user.id, event, calendarId);
    
    // Update local event with Google ID
    db.prepare(`
      UPDATE events 
      SET google_event_id = ?, last_synced = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(googleEvent.google_event_id, eventId);
    
    res.json({
      success: true,
      googleEventId: googleEvent.google_event_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;