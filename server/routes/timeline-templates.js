const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Get all timeline templates with optional filtering
router.get('/api/timeline-templates', auth, (req, res) => {
  try {
    const { category, eventType, query } = req.query;
    let sql = `
      SELECT 
        ct.id, 
        ct.name, 
        ct.category, 
        ct.description, 
        ct.items, 
        ct.tags, 
        ct.usage_count,
        ct.created_at,
        u.full_name as created_by_name
      FROM checklist_templates ct
      LEFT JOIN users u ON ct.created_by = u.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (category) {
      conditions.push('ct.category = ?');
      params.push(category);
    }
    
    if (eventType) {
      conditions.push('ct.tags LIKE ?');
      params.push(`%"${eventType}"%`);
    }
    
    if (query) {
      conditions.push('(ct.name LIKE ? OR ct.description LIKE ? OR ct.tags LIKE ?)');
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY ct.usage_count DESC, ct.name ASC';
    
    const templates = db.prepare(sql).all(...params);
    
    res.json(templates.map(template => ({
      ...template,
      items: template.items ? JSON.parse(template.items) : [],
      tags: template.tags ? JSON.parse(template.tags) : []
    })));
  } catch (error) {
    console.error('Error fetching timeline templates:', error);
    res.status(500).json({ error: 'Failed to fetch timeline templates' });
  }
});

// Get suggested templates for an event
router.post('/api/timeline-templates/suggestions', auth, (req, res) => {
  try {
    const { eventTitle, eventDescription, eventType, eventLocation } = req.body;
    
    // Create search terms from event details
    const searchTerms = [
      eventTitle?.toLowerCase(),
      eventDescription?.toLowerCase(),
      eventType?.toLowerCase(),
      eventLocation?.toLowerCase()
    ].filter(Boolean);
    
    // Get templates based on relevance scoring
    const templates = db.prepare(`
      SELECT 
        ct.id, 
        ct.name, 
        ct.category, 
        ct.description, 
        ct.items, 
        ct.tags, 
        ct.usage_count,
        ct.created_at,
        u.full_name as created_by_name
      FROM checklist_templates ct
      LEFT JOIN users u ON ct.created_by = u.id
      ORDER BY ct.usage_count DESC
      LIMIT 20
    `).all();
    
    // Score templates based on relevance
    const scoredTemplates = templates.map(template => {
      let score = template.usage_count * 0.1; // Base score from usage
      
      const templateText = `${template.name} ${template.description} ${template.tags}`.toLowerCase();
      
      // Add points for matching search terms
      searchTerms.forEach(term => {
        if (templateText.includes(term)) {
          score += 10;
        }
      });
      
      // Add points for category matches
      if (eventType && template.category.toLowerCase().includes(eventType.toLowerCase())) {
        score += 15;
      }
      
      return {
        ...template,
        relevanceScore: score,
        items: template.items ? JSON.parse(template.items) : [],
        tags: template.tags ? JSON.parse(template.tags) : []
      };
    });
    
    // Sort by relevance and return top 10
    const suggestions = scoredTemplates
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting template suggestions:', error);
    res.status(500).json({ error: 'Failed to get template suggestions' });
  }
});

// Get templates from similar past events
router.post('/api/timeline-templates/from-similar-events', auth, (req, res) => {
  try {
    const { eventTitle, eventType, eventLocation } = req.body;
    const userId = req.user.id;
    
    // Find similar past events
    const similarEvents = db.prepare(`
      SELECT DISTINCT
        pt.template_id,
        pt.timeline_data,
        e.title,
        e.event_type,
        e.location,
        ct.name as template_name,
        ct.description as template_description,
        ct.items as template_items
      FROM events e
      INNER JOIN preparation_timelines pt ON e.id = pt.event_id
      LEFT JOIN checklist_templates ct ON pt.template_id = ct.id
      WHERE e.created_by = ?
        AND pt.template_id IS NOT NULL
        AND (
          e.title LIKE ? 
          OR e.event_type LIKE ?
          OR e.location LIKE ?
        )
      ORDER BY e.start_time DESC
      LIMIT 10
    `).all(
      userId,
      `%${eventTitle || ''}%`,
      `%${eventType || ''}%`,
      `%${eventLocation || ''}%`
    );
    
    res.json(similarEvents.map(event => ({
      ...event,
      timeline_data: event.timeline_data ? JSON.parse(event.timeline_data) : [],
      template_items: event.template_items ? JSON.parse(event.template_items) : []
    })));
  } catch (error) {
    console.error('Error finding similar events:', error);
    res.status(500).json({ error: 'Failed to find similar events' });
  }
});

// Create template from successful event
router.post('/api/timeline-templates/from-event', auth, (req, res) => {
  try {
    const { eventId, templateName, templateDescription, adjustments } = req.body;
    const userId = req.user.id;
    
    // Get the event and its timeline
    const event = db.prepare(`
      SELECT e.*, pt.timeline_data, pt.completed_tasks
      FROM events e
      LEFT JOIN preparation_timelines pt ON e.id = pt.event_id
      WHERE e.id = ? AND e.created_by = ?
    `).get(eventId, userId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const timelineData = event.timeline_data ? JSON.parse(event.timeline_data) : [];
    const completedTasks = event.completed_tasks ? JSON.parse(event.completed_tasks) : [];
    
    // Apply adjustments and create template items
    const templateItems = timelineData.map(item => {
      const adjustment = adjustments?.find(a => a.itemId === item.id);
      return {
        text: item.text,
        timeOffset: adjustment?.newTimeOffset || item.timeOffset,
        category: item.category || 'preparation',
        priority: item.priority || 'medium',
        duration: adjustment?.newDuration || item.duration || 15,
        notes: adjustment?.notes || item.notes || ''
      };
    });
    
    // Determine template category and tags
    const category = event.event_type || 'general';
    const tags = [
      event.event_type,
      event.location ? 'travel' : 'home',
      templateItems.length > 5 ? 'detailed' : 'simple'
    ].filter(Boolean);
    
    // Create the template
    const result = db.prepare(`
      INSERT INTO checklist_templates (name, category, description, items, tags, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      templateName,
      category,
      templateDescription || `Template created from successful event: ${event.title}`,
      JSON.stringify(templateItems),
      JSON.stringify(tags),
      userId
    );
    
    res.json({ 
      id: result.lastInsertRowid, 
      message: 'Template created successfully from event',
      templateItems: templateItems.length
    });
  } catch (error) {
    console.error('Error creating template from event:', error);
    res.status(500).json({ error: 'Failed to create template from event' });
  }
});

// Assign template to event (and series if requested)
router.post('/api/timeline-templates/assign', auth, (req, res) => {
  try {
    const { eventId, templateId, applyToSeries, customizations } = req.body;
    const userId = req.user.id;
    
    // Get the event
    const event = db.prepare(`
      SELECT * FROM events 
      WHERE id = ? AND created_by = ?
    `).get(eventId, userId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Get the template
    const template = db.prepare(`
      SELECT * FROM checklist_templates WHERE id = ?
    `).get(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const templateItems = template.items ? JSON.parse(template.items) : [];
    
    // Apply customizations
    const finalTimelineData = templateItems.map(item => {
      const customization = customizations?.find(c => c.itemId === item.id);
      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        timeOffset: customization?.timeOffset || item.timeOffset,
        enabled: customization?.enabled !== false,
        customNotes: customization?.notes || ''
      };
    });
    
    // Create or update preparation timeline for this event
    const existingTimeline = db.prepare(`
      SELECT id FROM preparation_timelines WHERE event_id = ?
    `).get(eventId);
    
    if (existingTimeline) {
      db.prepare(`
        UPDATE preparation_timelines 
        SET template_id = ?, timeline_data = ?, is_custom = ?, updated_at = CURRENT_TIMESTAMP
        WHERE event_id = ?
      `).run(templateId, JSON.stringify(finalTimelineData), false, eventId);
    } else {
      db.prepare(`
        INSERT INTO preparation_timelines (event_id, template_id, timeline_data, is_custom, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(eventId, templateId, JSON.stringify(finalTimelineData), false, userId);
    }
    
    // If applying to series, update all future instances
    if (applyToSeries && event.is_recurring && event.parent_recurring_id) {
      const seriesEvents = db.prepare(`
        SELECT id FROM events 
        WHERE parent_recurring_id = ? 
          AND start_time > CURRENT_TIMESTAMP
          AND id != ?
      `).all(event.parent_recurring_id, eventId);
      
      seriesEvents.forEach(seriesEvent => {
        const existingSeries = db.prepare(`
          SELECT id FROM preparation_timelines WHERE event_id = ?
        `).get(seriesEvent.id);
        
        if (existingSeries) {
          db.prepare(`
            UPDATE preparation_timelines 
            SET template_id = ?, timeline_data = ?, is_custom = ?, updated_at = CURRENT_TIMESTAMP
            WHERE event_id = ?
          `).run(templateId, JSON.stringify(finalTimelineData), false, seriesEvent.id);
        } else {
          db.prepare(`
            INSERT INTO preparation_timelines (event_id, template_id, timeline_data, is_custom, created_by)
            VALUES (?, ?, ?, ?, ?)
          `).run(seriesEvent.id, templateId, JSON.stringify(finalTimelineData), false, userId);
        }
      });
    }
    
    // Increment template usage count
    db.prepare(`
      UPDATE checklist_templates 
      SET usage_count = usage_count + 1 
      WHERE id = ?
    `).run(templateId);
    
    res.json({ 
      message: 'Template assigned successfully',
      eventsUpdated: applyToSeries ? seriesEvents.length + 1 : 1,
      timelineItems: finalTimelineData.length
    });
  } catch (error) {
    console.error('Error assigning template:', error);
    res.status(500).json({ error: 'Failed to assign template' });
  }
});

// Get preparation timeline for an event
router.get('/api/timeline-templates/event/:eventId', auth, (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    
    const timeline = db.prepare(`
      SELECT 
        pt.*,
        ct.name as template_name,
        ct.description as template_description,
        e.title as event_title,
        e.start_time as event_start_time
      FROM preparation_timelines pt
      LEFT JOIN checklist_templates ct ON pt.template_id = ct.id
      INNER JOIN events e ON pt.event_id = e.id
      WHERE pt.event_id = ? AND e.created_by = ?
    `).get(eventId, userId);
    
    if (!timeline) {
      return res.status(404).json({ error: 'Timeline not found' });
    }
    
    res.json({
      ...timeline,
      timeline_data: timeline.timeline_data ? JSON.parse(timeline.timeline_data) : [],
      completed_tasks: timeline.completed_tasks ? JSON.parse(timeline.completed_tasks) : []
    });
  } catch (error) {
    console.error('Error fetching event timeline:', error);
    res.status(500).json({ error: 'Failed to fetch event timeline' });
  }
});

// Update timeline progress
router.put('/api/timeline-templates/event/:eventId/progress', auth, (req, res) => {
  try {
    const { eventId } = req.params;
    const { completedTasks, timelineData } = req.body;
    const userId = req.user.id;
    
    // Verify event ownership
    const event = db.prepare(`
      SELECT id FROM events WHERE id = ? AND created_by = ?
    `).get(eventId, userId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Update the timeline
    db.prepare(`
      UPDATE preparation_timelines 
      SET 
        completed_tasks = ?, 
        timeline_data = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = ?
    `).run(
      JSON.stringify(completedTasks || []),
      JSON.stringify(timelineData || []),
      eventId
    );
    
    res.json({ message: 'Timeline progress updated successfully' });
  } catch (error) {
    console.error('Error updating timeline progress:', error);
    res.status(500).json({ error: 'Failed to update timeline progress' });
  }
});

module.exports = router;