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
    
    // Get the first CLIENT_URL if multiple are provided
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5174').split(',')[0].trim();
    
    if (!code || !state) {
      return res.redirect(`${clientUrl}/settings?error=missing_code`);
    }
    
    // State contains the user ID
    const userId = parseInt(state);
    const tokens = await googleCalendarService.handleAuthCallback(code, userId);
    
    // Redirect back to frontend with success
    res.redirect(`${clientUrl}/settings?calendar_auth=success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5174').split(',')[0].trim();
    res.redirect(`${clientUrl}/settings?calendar_auth=error`);
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
    
    console.log(`Importing events from calendar: ${calendarId}`);
    console.log(`Time range: ${timeMin} to ${timeMax}`);
    
    const events = await googleCalendarService.fetchEvents(req.user.id, calendarId, {
      timeMin,
      timeMax
    });
    
    console.log(`Fetched ${events.length} events from ${calendarId}`);
    
    // Determine category based on calendar ID
    const getEventCategory = (calId) => {
      const calIdLower = calId?.toLowerCase() || '';
      
      // For shared calendars, the ID might be an email or a long string
      console.log(`Determining category for calendar ID: "${calId}"`);
      console.log(`Calendar ID length: ${calId ? calId.length : 0}`);
      
      // Work calendars - check for work-related domains
      if (calIdLower.includes('stacksdata.com') || 
          calIdLower.includes('g suite') ||
          calId === 'scott.kaufman@stacksdata.com') {
        console.log(`  -> Categorized as WORK (matched work domain)`);
        return 'work';
      }
      
      // Family calendars - check for the specific family calendar ID and family-related keywords
      const familyCalendarId = '968af23c5d1acee7a12984884621b46e0ce34fe003438217a5cb6ffcfb26cd2b@group.calendar.google.com';
      
      console.log(`  Comparing with family calendar ID: "${familyCalendarId}"`);
      console.log(`  Exact match: ${calId === familyCalendarId}`);
      console.log(`  Contains family: ${calIdLower.includes('family')}`);
      console.log(`  Contains 968af23c5d1a: ${calIdLower.includes('968af23c5d1a')}`);
      
      if (calId === familyCalendarId ||
          calIdLower.includes('family') || 
          calIdLower.includes('shared') ||
          calIdLower.includes('iris') ||
          calIdLower.includes('968af23c5d1a')) {  // Partial match for the family calendar ID
        console.log(`  -> Categorized as FAMILY`);
        return 'family';
      }
      
      // Default to personal
      console.log(`  -> Categorized as PERSONAL (default)`);
      return 'personal';
    };
    
    const eventCategory = getEventCategory(calendarId);
    
    // Store events in local database
    const importResults = {
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const event of events) {
      try {
        // Check if event already exists for this user
        const existing = db.prepare(
          'SELECT id FROM events WHERE google_event_id = ? AND created_by = ?'
        ).get(event.google_event_id, req.user.id);
        
        if (existing) {
          console.log(`  Skipping existing event: ${event.title} (ID: ${event.google_event_id})`);
          importResults.skipped++;
          continue;
        }
        
        console.log(`  Importing event: ${event.title} (Category: ${eventCategory})`);
        
        // Insert new event with calendar_id and category
        const insertStmt = db.prepare(`
          INSERT INTO events (
            created_by, title, description, location, 
            start_time, end_time, event_type, google_event_id,
            calendar_id, category
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertResult = insertStmt.run(
          req.user.id,
          event.title || 'Untitled Event',
          event.description || '',
          event.location || '',
          event.start_time,
          event.end_time,
          'google',
          event.google_event_id,
          calendarId, // Store the actual calendar ID
          eventCategory // Store the determined category
        );
        
        console.log(`  Successfully imported event ID: ${insertResult.lastInsertRowid}`);
        
        importResults.imported++;
      } catch (error) {
        console.error(`Error importing event "${event.title || 'Unknown'}":`, error.message);
        importResults.errors.push({
          event: event.title || 'Unknown Event',
          googleEventId: event.google_event_id,
          error: error.message
        });
      }
    }
    
    console.log(`Import complete. Results:`, {
      imported: importResults.imported,
      skipped: importResults.skipped,
      errors: importResults.errors.length,
      calendarId,
      category: eventCategory
    });
    
    res.json({
      success: true,
      results: importResults,
      calendar: calendarId,
      category: eventCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export multiple local events to Google Calendar
router.post('/export-batch', authMiddleware, async (req, res) => {
  try {
    const { eventIds, calendarId = 'primary' } = req.body;
    
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'No events provided' });
    }
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    for (const eventId of eventIds) {
      try {
        // Get local event
        const event = db.prepare(
          'SELECT * FROM events WHERE id = ? AND created_by = ?'
        ).get(eventId, req.user.id);
        
        if (!event) {
          results.failed.push({ eventId, error: 'Event not found' });
          continue;
        }
        
        if (event.google_event_id) {
          results.skipped.push({ eventId, reason: 'Already synced' });
          continue;
        }
        
        // Create in Google Calendar
        const googleEvent = await googleCalendarService.createEvent(req.user.id, event, calendarId);
        
        // Update local event with Google ID
        db.prepare(`
          UPDATE events 
          SET google_event_id = ?, last_synced = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(googleEvent.google_event_id, eventId);
        
        results.success.push({
          eventId,
          googleEventId: googleEvent.google_event_id,
          title: event.title
        });
      } catch (error) {
        results.failed.push({
          eventId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      summary: {
        total: eventIds.length,
        exported: results.success.length,
        skipped: results.skipped.length,
        failed: results.failed.length
      }
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