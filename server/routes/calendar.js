const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const RecurringEventService = require('../services/recurringEventService');

// Get events
router.get('/events', auth, (req, res) => {
  try {
    const { start, end } = req.query;
    let query = 'SELECT * FROM events WHERE created_by = ?';
    const params = [req.user.id];
    
    if (start && end) {
      query += ' AND start_time >= ? AND end_time <= ?';
      params.push(start, end);
    }
    
    query += ' ORDER BY start_time ASC';
    
    const events = db.prepare(query).all(...params);
    
    events.forEach(event => {
      event.preparation_list = db.parseJSON(event.preparation_list) || [];
      event.resources = db.parseJSON(event.resources) || {};
      event.handoff_history = db.parseJSON(event.handoff_history) || [];
      event.packing_list = db.parseJSON(event.packing_list) || [];
      event.contacts = db.parseJSON(event.contacts) || [];
      event.meal_requirements = db.parseJSON(event.meal_requirements) || {};
      event.structured_checklist = db.parseJSON(event.structured_checklist) || [];
      event.checklist_completed_items = db.parseJSON(event.checklist_completed_items) || [];
      event.recurrence_days = db.parseJSON(event.recurrence_days) || [];
    });
    
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new event
router.post('/events', auth, async (req, res) => {
  try {
    const eventData = req.body;
    
    // Required fields validation
    // For draft events, we don't require start_time and end_time
    if (!eventData.title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    // If it's not a draft, require start and end times
    if (!eventData.is_draft && (!eventData.start_time || !eventData.end_time)) {
      return res.status(400).json({ message: 'Start time and end time are required for non-draft events' });
    }
    
    // Prepare values for insertion
    const stmt = db.prepare(`
      INSERT INTO events (
        title, description, start_time, end_time, location,
        category, event_type, attendees, notes, resources, 
        checklist, structured_checklist, checklist_completed_items, 
        assigned_to, created_by, date, is_draft, created_from_inbox,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      eventData.title,
      eventData.description || null,
      eventData.start_time,
      eventData.end_time,
      eventData.location || null,
      eventData.category || 'personal',
      eventData.event_type || 'general',
      typeof eventData.attendees === 'object' ? db.stringifyJSON(eventData.attendees) : eventData.attendees || null,
      eventData.notes || null,
      typeof eventData.resources === 'object' ? db.stringifyJSON(eventData.resources) : eventData.resources || null,
      typeof eventData.checklist === 'object' ? db.stringifyJSON(eventData.checklist) : eventData.checklist || null,
      typeof eventData.structured_checklist === 'object' ? db.stringifyJSON(eventData.structured_checklist) : db.stringifyJSON([]),
      db.stringifyJSON([]), // checklist_completed_items - empty by default
      eventData.assigned_to || null,
      req.user.id,
      eventData.date || null,
      eventData.is_draft ? 1 : 0,  // Convert boolean to integer for SQLite
      eventData.created_from_inbox || null
    );
    
    // Return the created event
    const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    newEvent.preparation_list = db.parseJSON(newEvent.preparation_list) || [];
    newEvent.resources = db.parseJSON(newEvent.resources) || {};
    newEvent.handoff_history = db.parseJSON(newEvent.handoff_history) || [];
    newEvent.packing_list = db.parseJSON(newEvent.packing_list) || [];
    newEvent.contacts = db.parseJSON(newEvent.contacts) || [];
    newEvent.meal_requirements = db.parseJSON(newEvent.meal_requirements) || {};
    newEvent.structured_checklist = db.parseJSON(newEvent.structured_checklist) || [];
    newEvent.checklist_completed_items = db.parseJSON(newEvent.checklist_completed_items) || [];
    newEvent.recurrence_days = db.parseJSON(newEvent.recurrence_days) || [];
    
    // Attempt to sync to Google Calendar if user has it configured
    try {
      const googleCalendarService = require('../services/googleCalendar');
      
      // Check if user has Google Calendar configured
      const user = db.prepare('SELECT sync_enabled, google_tokens FROM users WHERE id = ?').get(req.user.id);
      
      if (user && user.sync_enabled && user.google_tokens) {
        console.log('Syncing new event to Google Calendar...');
        
        // Determine which calendar to use based on event category
        let calendarId = 'primary'; // Default to primary calendar
        
        // Try to map categories to specific calendars
        if (eventData.category === 'work') {
          // For work events, try to use a work calendar if available
          // This could be enhanced with user preferences
          calendarId = 'primary';
        } else if (eventData.category === 'family') {
          // For family events, might want to use a shared family calendar
          calendarId = 'primary';
        }
        
        const googleEvent = await googleCalendarService.createEvent(req.user.id, newEvent, calendarId);
        
        if (googleEvent && googleEvent.google_event_id) {
          // Update the local event with the Google Calendar event ID
          db.prepare(`
            UPDATE events 
            SET google_event_id = ?, last_synced = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(googleEvent.google_event_id, newEvent.id);
          
          // Update the response event object
          newEvent.google_event_id = googleEvent.google_event_id;
          newEvent.last_synced = new Date().toISOString();
          
          console.log(`✅ Event synced to Google Calendar with ID: ${googleEvent.google_event_id}`);
        }
      }
    } catch (syncError) {
      // Log the sync error but don't fail the event creation
      console.warn('⚠️  Failed to sync event to Google Calendar:', syncError.message);
      // Could optionally set a flag on the event to retry sync later
    }
    
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an event
router.put('/events/:id', auth, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const updates = req.body;
    
    // Get current event to verify it exists
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Build update query dynamically based on provided fields
    const updateFields = [];
    const values = [];
    
    // List of allowed fields to update - only fields that exist in the events table
    const allowedFields = [
      'title', 'description', 'start_time', 'end_time', 'location',
      'event_type', 'preparation_list', 'resources', 'packing_list',
      'contacts', 'parking_info', 'weather_dependent', 'meal_requirements',
      'notes', 'checklist', 'structured_checklist', 'checklist_completed_items',
      'assigned_to', 'attendees', 'category', 'recurrence_type', 'recurrence_days', 'recurrence_end_date',
      'date', 'is_draft', 'created_from_inbox'
    ];
    
    // JSON fields that need to be stringified
    const jsonFields = ['preparation_list', 'resources', 'packing_list', 'contacts', 'meal_requirements', 'structured_checklist', 'checklist_completed_items', 'recurrence_days', 'attendees'];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        
        // Handle JSON fields
        if (jsonFields.includes(key) && typeof updates[key] === 'object') {
          values.push(db.stringifyJSON(updates[key]));
        } else if (key === 'is_draft') {
          // Convert boolean to integer for SQLite
          values.push(updates[key] ? 1 : 0);
        } else {
          values.push(updates[key]);
        }
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    // Add updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(eventId);
    
    // Execute update
    const updateQuery = `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...values);
    
    // Return updated event
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    updatedEvent.preparation_list = db.parseJSON(updatedEvent.preparation_list) || [];
    updatedEvent.resources = db.parseJSON(updatedEvent.resources) || {};
    updatedEvent.handoff_history = db.parseJSON(updatedEvent.handoff_history) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};
    updatedEvent.structured_checklist = db.parseJSON(updatedEvent.structured_checklist) || [];
    updatedEvent.checklist_completed_items = db.parseJSON(updatedEvent.checklist_completed_items) || [];
    updatedEvent.recurrence_days = db.parseJSON(updatedEvent.recurrence_days) || [];
    
    // Attempt to sync changes to Google Calendar if the event is synced
    if (event.google_event_id) {
      try {
        const googleCalendarService = require('../services/googleCalendar');
        
        // Check if user has Google Calendar configured
        const user = db.prepare('SELECT sync_enabled, google_tokens FROM users WHERE id = ?').get(req.user.id);
        
        if (user && user.sync_enabled && user.google_tokens) {
          console.log('Syncing event updates to Google Calendar...');
          
          // Determine calendar ID (default to primary for now)
          const calendarId = 'primary';
          
          const googleEvent = await googleCalendarService.updateEvent(req.user.id, event.google_event_id, updatedEvent, calendarId);
          
          if (googleEvent) {
            // Update the last_synced time
            db.prepare(`
              UPDATE events 
              SET last_synced = CURRENT_TIMESTAMP 
              WHERE id = ?
            `).run(eventId);
            
            updatedEvent.last_synced = new Date().toISOString();
            
            console.log(`✅ Event updates synced to Google Calendar`);
          }
        }
      } catch (syncError) {
        // Log the sync error but don't fail the event update
        console.warn('⚠️  Failed to sync event updates to Google Calendar:', syncError.message);
      }
    }
    
    res.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete an event
router.delete('/events/:id', auth, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    // Check if event exists
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Attempt to delete from Google Calendar if the event is synced
    if (event.google_event_id) {
      try {
        const googleCalendarService = require('../services/googleCalendar');
        
        // Check if user has Google Calendar configured
        const user = db.prepare('SELECT sync_enabled, google_tokens FROM users WHERE id = ?').get(req.user.id);
        
        if (user && user.sync_enabled && user.google_tokens) {
          console.log('Deleting event from Google Calendar...');
          
          // Determine calendar ID (default to primary for now)
          const calendarId = 'primary';
          
          await googleCalendarService.deleteEvent(req.user.id, event.google_event_id, calendarId);
          
          console.log(`✅ Event deleted from Google Calendar`);
        }
      } catch (syncError) {
        // Log the sync error but don't fail the event deletion
        console.warn('⚠️  Failed to delete event from Google Calendar:', syncError.message);
        // Continue with local deletion even if Google Calendar deletion fails
      }
    }
    
    // Delete the event from local database
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Claim an event
router.put('/events/:id/claim', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get current event data
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Parse handoff history
    const handoffHistory = db.parseJSON(event.handoff_history) || [];
    
    // Add claim action to history
    handoffHistory.push({
      action: `Claimed by user ${userId}`,
      userId,
      timestamp: new Date().toISOString(),
      type: 'claim'
    });

    // Update event with assignment
    const updateStmt = db.prepare(`
      UPDATE events 
      SET assigned_to = ?, 
          assignment_status = 'claimed',
          handoff_history = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(userId, db.stringifyJSON(handoffHistory), eventId);

    // Get updated event
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    updatedEvent.preparation_list = db.parseJSON(updatedEvent.preparation_list) || [];
    updatedEvent.resources = db.parseJSON(updatedEvent.resources) || {};
    updatedEvent.handoff_history = db.parseJSON(updatedEvent.handoff_history) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};
    updatedEvent.structured_checklist = db.parseJSON(updatedEvent.structured_checklist) || [];
    updatedEvent.checklist_completed_items = db.parseJSON(updatedEvent.checklist_completed_items) || [];
    updatedEvent.recurrence_days = db.parseJSON(updatedEvent.recurrence_days) || [];

    res.json(updatedEvent);
  } catch (error) {
    console.error('Claim event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reassign an event
router.put('/events/:id/reassign', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { newUserId, timestamp } = req.body;

    if (!newUserId) {
      return res.status(400).json({ message: 'New user ID is required' });
    }

    // Get current event data
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Parse handoff history
    const handoffHistory = db.parseJSON(event.handoff_history) || [];
    
    // Add reassignment action to history
    handoffHistory.push({
      action: `Reassigned from user ${event.assigned_to || 'unassigned'} to user ${newUserId}`,
      fromUserId: event.assigned_to,
      toUserId: newUserId,
      timestamp: timestamp || new Date().toISOString(),
      type: 'reassign'
    });

    // Update event with new assignment
    const updateStmt = db.prepare(`
      UPDATE events 
      SET assigned_to = ?, 
          assignment_status = 'claimed',
          handoff_history = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(newUserId, db.stringifyJSON(handoffHistory), eventId);

    // Get updated event
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    updatedEvent.preparation_list = db.parseJSON(updatedEvent.preparation_list) || [];
    updatedEvent.resources = db.parseJSON(updatedEvent.resources) || {};
    updatedEvent.handoff_history = db.parseJSON(updatedEvent.handoff_history) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};
    updatedEvent.structured_checklist = db.parseJSON(updatedEvent.structured_checklist) || [];
    updatedEvent.checklist_completed_items = db.parseJSON(updatedEvent.checklist_completed_items) || [];
    updatedEvent.recurrence_days = db.parseJSON(updatedEvent.recurrence_days) || [];

    res.json(updatedEvent);
  } catch (error) {
    console.error('Reassign event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update assignment status
router.put('/events/:id/status', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { status, timestamp } = req.body;

    if (!status || !['pending', 'claimed', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required (pending, claimed, completed)' });
    }

    // Get current event data
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Parse handoff history
    const handoffHistory = db.parseJSON(event.handoff_history) || [];
    
    // Add status change action to history
    handoffHistory.push({
      action: `Status changed from ${event.assignment_status || 'pending'} to ${status}`,
      userId: event.assigned_to,
      timestamp: timestamp || new Date().toISOString(),
      type: 'status_change',
      previousStatus: event.assignment_status || 'pending',
      newStatus: status
    });

    // Update event status
    const updateStmt = db.prepare(`
      UPDATE events 
      SET assignment_status = ?,
          handoff_history = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(status, db.stringifyJSON(handoffHistory), eventId);

    // Get updated event
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    updatedEvent.preparation_list = db.parseJSON(updatedEvent.preparation_list) || [];
    updatedEvent.resources = db.parseJSON(updatedEvent.resources) || {};
    updatedEvent.handoff_history = db.parseJSON(updatedEvent.handoff_history) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};
    updatedEvent.structured_checklist = db.parseJSON(updatedEvent.structured_checklist) || [];
    updatedEvent.checklist_completed_items = db.parseJSON(updatedEvent.checklist_completed_items) || [];
    updatedEvent.recurrence_days = db.parseJSON(updatedEvent.recurrence_days) || [];

    res.json(updatedEvent);
  } catch (error) {
    console.error('Update assignment status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sync with Google Calendar (placeholder)
router.post('/sync', auth, async (req, res) => {
  try {
    // TODO: Implement Google Calendar sync
    res.json({ message: 'Calendar sync initiated' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Sync failed' });
  }
});

// Update event logistics
router.put('/events/:id/logistics', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { 
      packing_list, 
      parking_info, 
      contacts, 
      weather_dependent, 
      meal_requirements 
    } = req.body;

    // Get current event data
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Update event with logistics data
    const updateStmt = db.prepare(`
      UPDATE events 
      SET packing_list = ?, 
          parking_info = ?,
          contacts = ?,
          weather_dependent = ?,
          meal_requirements = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(
      db.stringifyJSON(packing_list || []),
      parking_info || null,
      db.stringifyJSON(contacts || []),
      weather_dependent ? 1 : 0,
      db.stringifyJSON(meal_requirements || {}),
      eventId
    );

    // Get updated event
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    updatedEvent.preparation_list = db.parseJSON(updatedEvent.preparation_list) || [];
    updatedEvent.resources = db.parseJSON(updatedEvent.resources) || {};
    updatedEvent.handoff_history = db.parseJSON(updatedEvent.handoff_history) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};
    updatedEvent.structured_checklist = db.parseJSON(updatedEvent.structured_checklist) || [];
    updatedEvent.checklist_completed_items = db.parseJSON(updatedEvent.checklist_completed_items) || [];
    updatedEvent.recurrence_days = db.parseJSON(updatedEvent.recurrence_days) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};

    res.json(updatedEvent);
  } catch (error) {
    console.error('Update event logistics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get logistics templates
router.get('/templates', auth, (req, res) => {
  try {
    const { activity_type, season } = req.query;
    let query = 'SELECT * FROM logistics_templates';
    const params = [];
    const conditions = [];
    
    if (activity_type) {
      conditions.push('activity_type = ?');
      params.push(activity_type);
    }
    
    if (season) {
      conditions.push('(season = ? OR season IS NULL)');
      params.push(season);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY usage_count DESC, name ASC';
    
    const templates = db.prepare(query).all(...params);
    
    templates.forEach(template => {
      template.packing_list = db.parseJSON(template.packing_list) || [];
      template.contacts = db.parseJSON(template.contacts) || [];
      template.meal_requirements = db.parseJSON(template.meal_requirements) || {};
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create logistics template
router.post('/templates', auth, (req, res) => {
  try {
    const { 
      name, 
      activity_type, 
      packing_list, 
      default_parking_info, 
      contacts, 
      weather_dependent, 
      meal_requirements,
      season 
    } = req.body;

    if (!name || !activity_type) {
      return res.status(400).json({ message: 'Name and activity_type are required' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO logistics_templates (
        name, activity_type, packing_list, default_parking_info, 
        contacts, weather_dependent, meal_requirements, season, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      name,
      activity_type,
      db.stringifyJSON(packing_list || []),
      default_parking_info || null,
      db.stringifyJSON(contacts || []),
      weather_dependent || false,
      db.stringifyJSON(meal_requirements || {}),
      season || null,
      req.user?.id || null
    );

    // Get created template
    const template = db.prepare('SELECT * FROM logistics_templates WHERE id = ?').get(result.lastInsertRowid);
    template.packing_list = db.parseJSON(template.packing_list) || [];
    template.contacts = db.parseJSON(template.contacts) || [];
    template.meal_requirements = db.parseJSON(template.meal_requirements) || {};

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update checklist completion status
router.post('/events/:id/checklist-completion', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { itemId, completed } = req.body;

    if (!itemId || completed === undefined) {
      return res.status(400).json({ message: 'Item ID and completion status are required' });
    }

    // Get current event data
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Parse current completed items
    let completedItems = db.parseJSON(event.checklist_completed_items) || [];
    
    if (completed) {
      // Add to completed items if not already present
      if (!completedItems.includes(itemId)) {
        completedItems.push(itemId);
      }
    } else {
      // Remove from completed items
      completedItems = completedItems.filter(id => id !== itemId);
    }

    // Update event with new completion status
    const updateStmt = db.prepare(`
      UPDATE events 
      SET checklist_completed_items = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(db.stringifyJSON(completedItems), eventId);

    // Get updated event
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    updatedEvent.preparation_list = db.parseJSON(updatedEvent.preparation_list) || [];
    updatedEvent.resources = db.parseJSON(updatedEvent.resources) || {};
    updatedEvent.handoff_history = db.parseJSON(updatedEvent.handoff_history) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};
    updatedEvent.structured_checklist = db.parseJSON(updatedEvent.structured_checklist) || [];
    updatedEvent.checklist_completed_items = db.parseJSON(updatedEvent.checklist_completed_items) || [];
    updatedEvent.recurrence_days = db.parseJSON(updatedEvent.recurrence_days) || [];

    res.json(updatedEvent);
  } catch (error) {
    console.error('Update checklist completion error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Apply template to event
router.post('/events/:id/apply-template', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: 'Template ID is required' });
    }

    // Get template
    const template = db.prepare('SELECT * FROM logistics_templates WHERE id = ?').get(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Get event
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Apply template to event
    const updateStmt = db.prepare(`
      UPDATE events 
      SET packing_list = ?, 
          parking_info = COALESCE(parking_info, ?),
          contacts = ?,
          weather_dependent = ?,
          meal_requirements = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(
      template.packing_list,
      template.default_parking_info,
      template.contacts,
      template.weather_dependent,
      template.meal_requirements,
      eventId
    );

    // Increment template usage count
    db.prepare('UPDATE logistics_templates SET usage_count = usage_count + 1 WHERE id = ?').run(templateId);

    // Get updated event
    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    updatedEvent.preparation_list = db.parseJSON(updatedEvent.preparation_list) || [];
    updatedEvent.resources = db.parseJSON(updatedEvent.resources) || {};
    updatedEvent.handoff_history = db.parseJSON(updatedEvent.handoff_history) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};
    updatedEvent.structured_checklist = db.parseJSON(updatedEvent.structured_checklist) || [];
    updatedEvent.checklist_completed_items = db.parseJSON(updatedEvent.checklist_completed_items) || [];
    updatedEvent.recurrence_days = db.parseJSON(updatedEvent.recurrence_days) || [];
    updatedEvent.packing_list = db.parseJSON(updatedEvent.packing_list) || [];
    updatedEvent.contacts = db.parseJSON(updatedEvent.contacts) || [];
    updatedEvent.meal_requirements = db.parseJSON(updatedEvent.meal_requirements) || {};

    res.json(updatedEvent);
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// === RECURRING EVENTS API ENDPOINTS ===

// Create a new recurring event
router.post('/events/recurring', auth, (req, res) => {
  try {
    const eventData = {
      ...req.body,
      created_by: req.user.id
    };

    // Validate required fields
    if (!eventData.title || !eventData.start_time || !eventData.end_time) {
      return res.status(400).json({ message: 'Title, start time, and end time are required' });
    }

    if (!eventData.recurrence_type) {
      return res.status(400).json({ message: 'Recurrence type is required' });
    }

    const result = RecurringEventService.createRecurringEvent(eventData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create recurring event error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Get all recurring event templates
router.get('/events/recurring', auth, (req, res) => {
  try {
    const recurringEvents = RecurringEventService.getRecurringEvents();
    res.json(recurringEvents);
  } catch (error) {
    console.error('Get recurring events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update recurring event template
router.put('/events/recurring/:id', auth, (req, res) => {
  try {
    const parentId = parseInt(req.params.id);
    const updates = req.body;
    const { updateFutureInstances = false } = req.query;

    const updatedEvent = RecurringEventService.updateRecurringEvent(
      parentId, 
      updates, 
      updateFutureInstances === 'true'
    );
    
    res.json(updatedEvent);
  } catch (error) {
    console.error('Update recurring event error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Delete recurring event and all instances
router.delete('/events/recurring/:id', auth, (req, res) => {
  try {
    const parentId = parseInt(req.params.id);
    const { deleteFutureInstances = true } = req.query;

    const result = RecurringEventService.deleteRecurringEvent(
      parentId,
      deleteFutureInstances !== 'false'
    );
    
    res.json(result);
  } catch (error) {
    console.error('Delete recurring event error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Generate missing instances for all recurring events (maintenance endpoint)
router.post('/events/recurring/generate-instances', auth, (req, res) => {
  try {
    const { daysAhead = 7 } = req.body;
    const results = RecurringEventService.generateMissingInstances(daysAhead);
    res.json(results);
  } catch (error) {
    console.error('Generate instances error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get routine templates
router.get('/events/routine-templates', auth, (req, res) => {
  try {
    const templates = RecurringEventService.getRoutineTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Get routine templates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create recurring event from routine template
router.post('/events/recurring/from-template', auth, (req, res) => {
  try {
    const { templateName, start_time, recurrence_type, recurrence_days, recurrence_end_date } = req.body;
    
    const templates = RecurringEventService.getRoutineTemplates();
    const template = templates.find(t => t.name === templateName);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Calculate end time based on template duration
    const startTime = new Date(start_time);
    const endTime = new Date(startTime.getTime() + (template.duration * 60 * 1000));

    const eventData = {
      title: template.name,
      description: `${template.name} routine`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      category: template.category,
      event_type: template.event_type,
      structured_checklist: template.structured_checklist,
      recurrence_type,
      recurrence_days,
      recurrence_end_date,
      created_by: req.user.id
    };

    const result = RecurringEventService.createRecurringEvent(eventData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create from template error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// === PREPARATION TIMELINE API ENDPOINTS ===

// Get preparation timeline for an event
router.get('/events/:eventId/timeline', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    // Check if event exists
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get saved timeline from database
    const timelineRecord = db.prepare('SELECT * FROM preparation_timelines WHERE event_id = ?').get(eventId);
    
    if (timelineRecord) {
      // Return saved timeline
      const timeline = db.parseJSON(timelineRecord.timeline_data) || [];
      const completedTasks = db.parseJSON(timelineRecord.completed_tasks) || [];
      
      res.json({
        eventId,
        timeline,
        eventPattern: timelineRecord.event_pattern,
        confidence: timelineRecord.confidence,
        isCustom: timelineRecord.is_custom,
        templateId: timelineRecord.template_id,
        completedTasks,
        updatedAt: timelineRecord.updated_at
      });
    } else {
      // Generate timeline using event context service and save it
      const eventContextService = require('../services/eventContext');
      const timelineData = eventContextService.generatePreparationTimeline(event);
      
      if (timelineData) {
        // Save the generated timeline to database
        const insertStmt = db.prepare(`
          INSERT INTO preparation_timelines (
            event_id, timeline_data, event_pattern, confidence, is_custom, created_by
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(
          eventId,
          db.stringifyJSON(timelineData.timeline),
          timelineData.eventPattern,
          timelineData.confidence,
          false,
          req.user.id
        );
        
        res.json({
          eventId,
          timeline: timelineData.timeline,
          eventPattern: timelineData.eventPattern,
          confidence: timelineData.confidence,
          isCustom: false,
          templateId: null,
          completedTasks: [],
          updatedAt: new Date().toISOString()
        });
      } else {
        res.status(500).json({ message: 'Unable to generate timeline' });
      }
    }
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update preparation timeline for an event
router.put('/events/:eventId/timeline', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { 
      timeline, 
      completedTasks, 
      eventPattern, 
      confidence, 
      isCustom, 
      templateId 
    } = req.body;
    
    // Check if event exists
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if timeline record already exists
    const existingTimeline = db.prepare('SELECT * FROM preparation_timelines WHERE event_id = ?').get(eventId);
    
    if (existingTimeline) {
      // Update existing timeline
      const updateStmt = db.prepare(`
        UPDATE preparation_timelines 
        SET timeline_data = ?, 
            completed_tasks = ?, 
            event_pattern = ?,
            confidence = ?,
            is_custom = ?,
            template_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE event_id = ?
      `);
      
      updateStmt.run(
        db.stringifyJSON(timeline || []),
        db.stringifyJSON(completedTasks || []),
        eventPattern || existingTimeline.event_pattern,
        confidence || existingTimeline.confidence,
        isCustom !== undefined ? isCustom : existingTimeline.is_custom,
        templateId || existingTimeline.template_id,
        eventId
      );
    } else {
      // Create new timeline record
      const insertStmt = db.prepare(`
        INSERT INTO preparation_timelines (
          event_id, timeline_data, completed_tasks, event_pattern, 
          confidence, is_custom, template_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(
        eventId,
        db.stringifyJSON(timeline || []),
        db.stringifyJSON(completedTasks || []),
        eventPattern || 'general',
        confidence || 100,
        isCustom || false,
        templateId || null,
        req.user.id
      );
    }

    // Get updated timeline
    const updatedTimeline = db.prepare('SELECT * FROM preparation_timelines WHERE event_id = ?').get(eventId);
    
    const response = {
      eventId,
      timeline: db.parseJSON(updatedTimeline.timeline_data) || [],
      eventPattern: updatedTimeline.event_pattern,
      confidence: updatedTimeline.confidence,
      isCustom: updatedTimeline.is_custom,
      templateId: updatedTimeline.template_id,
      completedTasks: db.parseJSON(updatedTimeline.completed_tasks) || [],
      updatedAt: updatedTimeline.updated_at
    };

    res.json(response);
  } catch (error) {
    console.error('Update timeline error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Apply template to event timeline
router.post('/events/:eventId/timeline/template', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { templateId } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ message: 'Template ID is required' });
    }

    // Check if event exists
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // TODO: Implement template system
    // For now, we'll generate a basic timeline based on template type
    const eventContextService = require('../services/eventContext');
    const timelineData = eventContextService.generatePreparationTimeline(event);
    
    if (!timelineData) {
      return res.status(500).json({ message: 'Unable to generate timeline from template' });
    }

    // Check if timeline record already exists
    const existingTimeline = db.prepare('SELECT * FROM preparation_timelines WHERE event_id = ?').get(eventId);
    
    if (existingTimeline) {
      // Update existing timeline with template
      const updateStmt = db.prepare(`
        UPDATE preparation_timelines 
        SET timeline_data = ?, 
            event_pattern = ?,
            confidence = ?,
            template_id = ?,
            is_custom = false,
            completed_tasks = '[]',
            updated_at = CURRENT_TIMESTAMP
        WHERE event_id = ?
      `);
      
      updateStmt.run(
        db.stringifyJSON(timelineData.timeline),
        timelineData.eventPattern,
        timelineData.confidence,
        templateId,
        eventId
      );
    } else {
      // Create new timeline record with template
      const insertStmt = db.prepare(`
        INSERT INTO preparation_timelines (
          event_id, timeline_data, event_pattern, confidence, 
          template_id, is_custom, created_by
        ) VALUES (?, ?, ?, ?, ?, false, ?)
      `);
      
      insertStmt.run(
        eventId,
        db.stringifyJSON(timelineData.timeline),
        timelineData.eventPattern,
        timelineData.confidence,
        templateId,
        req.user.id
      );
    }

    // Get updated timeline
    const updatedTimeline = db.prepare('SELECT * FROM preparation_timelines WHERE event_id = ?').get(eventId);
    
    const response = {
      eventId,
      timeline: db.parseJSON(updatedTimeline.timeline_data) || [],
      eventPattern: updatedTimeline.event_pattern,
      confidence: updatedTimeline.confidence,
      isCustom: updatedTimeline.is_custom,
      templateId: updatedTimeline.template_id,
      completedTasks: db.parseJSON(updatedTimeline.completed_tasks) || [],
      updatedAt: updatedTimeline.updated_at
    };

    res.json(response);
  } catch (error) {
    console.error('Apply template to timeline error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update task completion status
router.post('/events/:eventId/timeline/task-completion', auth, (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const { taskIndex, completed } = req.body;
    
    if (taskIndex === undefined || completed === undefined) {
      return res.status(400).json({ message: 'Task index and completion status are required' });
    }

    // Check if event exists
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get current timeline
    const timelineRecord = db.prepare('SELECT * FROM preparation_timelines WHERE event_id = ?').get(eventId);
    if (!timelineRecord) {
      return res.status(404).json({ message: 'Timeline not found' });
    }

    // Parse current completed tasks
    let completedTasks = db.parseJSON(timelineRecord.completed_tasks) || [];
    
    if (completed) {
      // Add to completed tasks if not already present
      if (!completedTasks.includes(taskIndex)) {
        completedTasks.push(taskIndex);
      }
    } else {
      // Remove from completed tasks
      completedTasks = completedTasks.filter(index => index !== taskIndex);
    }

    // Update timeline with new completion status
    const updateStmt = db.prepare(`
      UPDATE preparation_timelines 
      SET completed_tasks = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE event_id = ?
    `);

    updateStmt.run(db.stringifyJSON(completedTasks), eventId);

    // Get updated timeline
    const updatedTimeline = db.prepare('SELECT * FROM preparation_timelines WHERE event_id = ?').get(eventId);
    
    const response = {
      eventId,
      timeline: db.parseJSON(updatedTimeline.timeline_data) || [],
      eventPattern: updatedTimeline.event_pattern,
      confidence: updatedTimeline.confidence,
      isCustom: updatedTimeline.is_custom,
      templateId: updatedTimeline.template_id,
      completedTasks: db.parseJSON(updatedTimeline.completed_tasks) || [],
      updatedAt: updatedTimeline.updated_at
    };

    res.json(response);
  } catch (error) {
    console.error('Update task completion error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;