const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const aiService = require('../services/ai');

// Enrich event with AI-generated suggestions
router.post('/enrich-event', auth, async (req, res) => {
  try {
    const { eventId, title, description, location, eventType, startTime, endTime } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'Missing required fields: title, startTime, and endTime' 
      });
    }

    // Get AI enrichment data
    const enrichmentData = await aiService.enrichEvent({
      title,
      description,
      location,
      eventType,
      startTime,
      endTime
    });

    // Update event in database if eventId provided
    if (eventId) {
      const updateQuery = db.prepare(`
        UPDATE events SET 
          ai_enriched = ?,
          preparation_time = ?,
          departure_time = ?,
          resources_needed = ?,
          weather_considerations = ?,
          ai_suggestions = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      updateQuery.run(
        enrichmentData.ai_enriched,
        enrichmentData.preparation_time,
        enrichmentData.departure_time,
        enrichmentData.resources_needed,
        enrichmentData.weather_considerations,
        enrichmentData.ai_suggestions,
        eventId
      );

      // Get updated event
      const getEvent = db.prepare('SELECT * FROM events WHERE id = ?');
      const updatedEvent = getEvent.get(eventId);
      
      res.json({
        message: 'Event enriched successfully',
        event: {
          ...updatedEvent,
          resources_needed: JSON.parse(updatedEvent.resources_needed || '{}'),
          weather_considerations: JSON.parse(updatedEvent.weather_considerations || '{}'),
          ai_suggestions: JSON.parse(updatedEvent.ai_suggestions || '{}')
        }
      });
    } else {
      // Return enrichment data without saving
      res.json({
        enrichment: {
          ...enrichmentData,
          resources_needed: JSON.parse(enrichmentData.resources_needed || '{}'),
          weather_considerations: JSON.parse(enrichmentData.weather_considerations || '{}'),
          ai_suggestions: JSON.parse(enrichmentData.ai_suggestions || '{}')
        }
      });
    }
  } catch (error) {
    console.error('Enrich event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate checklist for an event
router.post('/suggest-checklist', auth, async (req, res) => {
  try {
    const { eventTitle, eventType, duration, participants } = req.body;
    
    if (!eventTitle) {
      return res.status(400).json({ message: 'Event title is required' });
    }

    const checklist = await aiService.generateChecklist({
      eventTitle,
      eventType,
      duration: duration || 60,
      participants: participants || []
    });

    res.json(checklist);
  } catch (error) {
    console.error('Generate checklist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Analyze schedule for conflicts and suggestions
router.post('/analyze-schedule', auth, async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // Get events for the specified date
    const getEventsQuery = db.prepare(`
      SELECT * FROM events 
      WHERE DATE(start_time) = DATE(?)
      ORDER BY start_time ASC
    `);
    
    const events = getEventsQuery.all(date);
    
    const analysis = await aiService.analyzeSchedule({ events, date });
    
    res.json(analysis);
  } catch (error) {
    console.error('Analyze schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate daily brief
router.post('/generate-brief', auth, async (req, res) => {
  try {
    const { date } = req.body;
    const briefDate = date || new Date().toISOString().split('T')[0];
    
    // Get events for the day
    const getEventsQuery = db.prepare(`
      SELECT * FROM events 
      WHERE DATE(start_time) = DATE(?)
      ORDER BY start_time ASC
    `);
    
    const events = getEventsQuery.all(briefDate);
    
    // Get tasks due today
    const getTasksQuery = db.prepare(`
      SELECT * FROM tasks 
      WHERE DATE(due_date) = DATE(?) OR status = 'pending'
      ORDER BY due_date ASC, priority DESC
    `);
    
    const tasks = getTasksQuery.all(briefDate);
    
    const brief = await aiService.generateDailyBrief({
      date: briefDate,
      events,
      tasks,
      weather: null // Could integrate with weather API later
    });
    
    res.json(brief);
  } catch (error) {
    console.error('Generate brief error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get AI insights for dashboard
router.get('/insights', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get upcoming events
    const getEventsQuery = db.prepare(`
      SELECT * FROM events 
      WHERE DATE(start_time) BETWEEN DATE(?) AND DATE(?)
      ORDER BY start_time ASC
    `);
    
    const upcomingEvents = getEventsQuery.all(today, weekFromNow);
    
    // Get events that need enrichment
    const getUnenrichedQuery = db.prepare(`
      SELECT * FROM events 
      WHERE ai_enriched = 0 AND DATE(start_time) >= DATE(?)
      ORDER BY start_time ASC
      LIMIT 5
    `);
    
    const needsEnrichment = getUnenrichedQuery.all(today);
    
    // Get overdue tasks
    const getOverdueQuery = db.prepare(`
      SELECT * FROM tasks 
      WHERE DATE(due_date) < DATE(?) AND status != 'completed'
      ORDER BY due_date ASC
    `);
    
    const overdueTasks = getOverdueQuery.all(today);
    
    const insights = {
      upcoming_events: upcomingEvents.length,
      needs_enrichment: needsEnrichment.length,
      overdue_tasks: overdueTasks.length,
      enrichment_opportunities: needsEnrichment.map(event => ({
        id: event.id,
        title: event.title,
        start_time: event.start_time
      })),
      urgent_tasks: overdueTasks.slice(0, 3).map(task => ({
        id: task.id,
        title: task.title,
        due_date: task.due_date
      })),
      suggestions: [
        ...(needsEnrichment.length > 0 ? [`Enrich ${needsEnrichment.length} upcoming events with AI suggestions`] : []),
        ...(overdueTasks.length > 0 ? [`Address ${overdueTasks.length} overdue tasks`] : []),
        ...(upcomingEvents.length > 5 ? ['Consider rescheduling some events for better balance'] : [])
      ]
    };
    
    res.json(insights);
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Bulk enrich multiple events
router.post('/bulk-enrich', auth, async (req, res) => {
  try {
    const { eventIds } = req.body;
    
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ message: 'Event IDs array is required' });
    }
    
    const results = [];
    
    // Get events
    const getEventQuery = db.prepare('SELECT * FROM events WHERE id = ?');
    const updateQuery = db.prepare(`
      UPDATE events SET 
        ai_enriched = ?,
        preparation_time = ?,
        departure_time = ?,
        resources_needed = ?,
        weather_considerations = ?,
        ai_suggestions = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    for (const eventId of eventIds) {
      try {
        const event = getEventQuery.get(eventId);
        
        if (event) {
          const enrichmentData = await aiService.enrichEvent({
            title: event.title,
            description: event.description,
            location: event.location,
            eventType: event.event_type,
            startTime: event.start_time,
            endTime: event.end_time
          });
          
          updateQuery.run(
            enrichmentData.ai_enriched,
            enrichmentData.preparation_time,
            enrichmentData.departure_time,
            enrichmentData.resources_needed,
            enrichmentData.weather_considerations,
            enrichmentData.ai_suggestions,
            eventId
          );
          
          results.push({
            eventId,
            success: true,
            title: event.title
          });
        } else {
          results.push({
            eventId,
            success: false,
            error: 'Event not found'
          });
        }
      } catch (error) {
        results.push({
          eventId,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      message: `Enriched ${successCount} of ${eventIds.length} events`,
      results
    });
  } catch (error) {
    console.error('Bulk enrich error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test endpoint to verify AI service is working
router.get('/test', auth, async (req, res) => {
  try {
    const testEvent = {
      title: 'Doctor Appointment',
      description: 'Annual checkup with Dr. Smith',
      location: '123 Medical Plaza, Anytown, CA',
      eventType: 'appointment',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString() // Tomorrow + 1 hour
    };

    const enrichment = await aiService.enrichEvent(testEvent);

    res.json({
      message: 'AI service test successful',
      test_event: testEvent,
      enrichment_result: {
        ...enrichment,
        resources_needed: JSON.parse(enrichment.resources_needed || '{}'),
        weather_considerations: JSON.parse(enrichment.weather_considerations || '{}'),
        ai_suggestions: JSON.parse(enrichment.ai_suggestions || '{}')
      },
      using_mock_data: !process.env.OPENAI_API_KEY
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({ 
      message: 'AI service test failed', 
      error: error.message,
      using_mock_data: !process.env.OPENAI_API_KEY
    });
  }
});

module.exports = router;