const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Helper function to parse JSON safely
const parseJSON = (jsonString, defaultValue = []) => {
  try {
    return JSON.parse(jsonString || JSON.stringify(defaultValue));
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
};

// GET /api/templates - Get all user templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, phase, search, sort = 'usage_count', order = 'desc' } = req.query;
    
    let query = `
      SELECT t.*, 
             COUNT(ta.id) as application_count,
             AVG(ta.completion_rate) as avg_completion_rate,
             AVG(ta.feedback_score) as avg_feedback
      FROM user_templates t
      LEFT JOIN template_applications ta ON t.id = ta.template_id
      WHERE t.user_id = ?
    `;
    
    const params = [req.user.id];
    
    // Add filters
    if (category) {
      query += ` AND t.category = ?`;
      params.push(category);
    }
    
    if (phase) {
      query += ` AND t.phase = ?`;
      params.push(phase);
    }
    
    if (search) {
      query += ` AND (t.name LIKE ? OR t.tags LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` GROUP BY t.id`;
    
    // Add sorting
    const validSorts = ['usage_count', 'name', 'created_at', 'last_used', 'estimated_time'];
    const validOrders = ['asc', 'desc'];
    
    if (validSorts.includes(sort) && validOrders.includes(order.toLowerCase())) {
      query += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    }
    
    const templates = db.prepare(query).all(...params);
    
    // Parse JSON fields
    const parsedTemplates = templates.map(template => ({
      ...template,
      items: parseJSON(template.items, []),
      event_types: parseJSON(template.event_types, []),
      tags: parseJSON(template.tags, []),
      application_count: template.application_count || 0,
      avg_completion_rate: template.avg_completion_rate || 0,
      avg_feedback: template.avg_feedback || 0
    }));
    
    res.json(parsedTemplates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/templates/suggested/:eventType - Get suggested templates for event type
router.get('/suggested/:eventType', authenticateToken, async (req, res) => {
  try {
    const { eventType } = req.params;
    const { phase = 'pre' } = req.query;
    
    const query = `
      SELECT t.*, 
             COUNT(ta.id) as application_count,
             AVG(ta.completion_rate) as avg_completion_rate,
             AVG(ta.feedback_score) as avg_feedback
      FROM user_templates t
      LEFT JOIN template_applications ta ON t.id = ta.template_id
      WHERE t.user_id = ? 
        AND (t.phase = ? OR t.phase = 'all')
        AND (t.event_types LIKE ? OR t.tags LIKE ?)
      GROUP BY t.id
      ORDER BY t.usage_count DESC, avg_completion_rate DESC
      LIMIT 10
    `;
    
    const templates = db.prepare(query).all(
      req.user.id,
      phase,
      `%"${eventType}"%`,
      `%${eventType}%`
    );
    
    const parsedTemplates = templates.map(template => ({
      ...template,
      items: parseJSON(template.items, []),
      event_types: parseJSON(template.event_types, []),
      tags: parseJSON(template.tags, []),
      application_count: template.application_count || 0,
      avg_completion_rate: template.avg_completion_rate || 0,
      avg_feedback: template.avg_feedback || 0,
      relevance_score: template.usage_count + (template.avg_completion_rate || 0) * 10
    }));
    
    res.json(parsedTemplates);
  } catch (error) {
    console.error('Error fetching suggested templates:', error);
    res.status(500).json({ error: 'Failed to fetch suggested templates' });
  }
});

// POST /api/templates - Create new template
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      category = 'preparation',
      phase = 'pre',
      icon = '📋',
      items = [],
      estimated_time = 0,
      event_types = [],
      tags = []
    } = req.body;
    
    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Template name and items are required' 
      });
    }
    
    const query = `
      INSERT INTO user_templates 
      (user_id, name, category, phase, icon, items, estimated_time, event_types, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = db.prepare(query).run(
      req.user.id,
      name,
      category,
      phase,
      icon,
      JSON.stringify(items),
      estimated_time,
      JSON.stringify(event_types),
      JSON.stringify(tags)
    );
    
    const createdTemplate = db.prepare(`
      SELECT * FROM user_templates WHERE id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json({
      ...createdTemplate,
      items: parseJSON(createdTemplate.items, []),
      event_types: parseJSON(createdTemplate.event_types, []),
      tags: parseJSON(createdTemplate.tags, [])
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id - Update template
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      phase,
      icon,
      items,
      estimated_time,
      event_types,
      tags
    } = req.body;
    
    // Verify template ownership
    const template = db.prepare(`
      SELECT * FROM user_templates WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (phase !== undefined) {
      updateFields.push('phase = ?');
      updateValues.push(phase);
    }
    if (icon !== undefined) {
      updateFields.push('icon = ?');
      updateValues.push(icon);
    }
    if (items !== undefined) {
      updateFields.push('items = ?');
      updateValues.push(JSON.stringify(items));
    }
    if (estimated_time !== undefined) {
      updateFields.push('estimated_time = ?');
      updateValues.push(estimated_time);
    }
    if (event_types !== undefined) {
      updateFields.push('event_types = ?');
      updateValues.push(JSON.stringify(event_types));
    }
    if (tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(tags));
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id, req.user.id);
    
    const query = `
      UPDATE user_templates 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `;
    
    db.prepare(query).run(...updateValues);
    
    const updatedTemplate = db.prepare(`
      SELECT * FROM user_templates WHERE id = ?
    `).get(id);
    
    res.json({
      ...updatedTemplate,
      items: parseJSON(updatedTemplate.items, []),
      event_types: parseJSON(updatedTemplate.event_types, []),
      tags: parseJSON(updatedTemplate.tags, [])
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify template ownership
    const template = db.prepare(`
      SELECT * FROM user_templates WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Delete template (applications will be cascade deleted)
    db.prepare(`
      DELETE FROM user_templates WHERE id = ? AND user_id = ?
    `).run(id, req.user.id);
    
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST /api/templates/:id/apply - Apply template to event
router.post('/:id/apply', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { event_id, phase = 'pre' } = req.body;
    
    if (!event_id) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    
    // Verify template ownership
    const template = db.prepare(`
      SELECT * FROM user_templates WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Verify event exists and user has access
    const event = db.prepare(`
      SELECT * FROM events WHERE id = ? AND created_by = ?
    `).get(event_id, req.user.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Record template application
    const applicationQuery = `
      INSERT INTO template_applications 
      (template_id, event_id, phase)
      VALUES (?, ?, ?)
    `;
    
    const applicationResult = db.prepare(applicationQuery).run(id, event_id, phase);
    
    // Update template usage statistics
    db.prepare(`
      UPDATE user_templates 
      SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    res.json({
      success: true,
      application_id: applicationResult.lastInsertRowid,
      template: {
        ...template,
        items: parseJSON(template.items, []),
        event_types: parseJSON(template.event_types, []),
        tags: parseJSON(template.tags, [])
      }
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// GET /api/templates/statistics - Get usage statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_templates,
        SUM(usage_count) as total_applications,
        AVG(usage_count) as avg_usage_per_template,
        COUNT(CASE WHEN last_used >= datetime('now', '-30 days') THEN 1 END) as used_this_month,
        (SELECT category FROM user_templates WHERE user_id = ? GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) as most_common_category
      FROM user_templates 
      WHERE user_id = ?
    `).get(req.user.id, req.user.id);
    
    const categoryBreakdown = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(usage_count) as total_uses
      FROM user_templates 
      WHERE user_id = ?
      GROUP BY category
      ORDER BY count DESC
    `).all(req.user.id);
    
    const recentApplications = db.prepare(`
      SELECT t.name, t.category, ta.applied_at, ta.phase, ta.completion_rate
      FROM template_applications ta
      JOIN user_templates t ON ta.template_id = t.id
      WHERE t.user_id = ?
      ORDER BY ta.applied_at DESC
      LIMIT 10
    `).all(req.user.id);
    
    res.json({
      ...stats,
      category_breakdown: categoryBreakdown,
      recent_applications: recentApplications
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/templates/:id/feedback - Submit template feedback
router.post('/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      application_id,
      completion_rate,
      feedback_score,
      notes,
      time_taken_minutes
    } = req.body;
    
    if (!application_id) {
      return res.status(400).json({ error: 'Application ID is required' });
    }
    
    // Update template application with feedback
    const updateQuery = `
      UPDATE template_applications
      SET completion_rate = ?, feedback_score = ?, notes = ?, time_taken_minutes = ?
      WHERE id = ? AND template_id IN (
        SELECT id FROM user_templates WHERE id = ? AND user_id = ?
      )
    `;
    
    const result = db.prepare(updateQuery).run(
      completion_rate,
      feedback_score,
      notes,
      time_taken_minutes,
      application_id,
      id,
      req.user.id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

module.exports = router;