const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/event-templates
 * Save or update an event template
 */
router.post('/', async (req, res) => {
  try {
    const {
      event_type,
      event_pattern,
      preparation_timeline,
      post_event_timeline,
      confidence = 100,
      contextual_variations = '{}',
      completion_rate = 0.0
    } = req.body;

    const userId = req.user.id;

    if (!event_type || !event_pattern) {
      return res.status(400).json({ 
        error: 'Missing required fields: event_type, event_pattern' 
      });
    }

    // Check if template already exists for this user
    const existingTemplate = db.prepare(`
      SELECT * FROM event_templates 
      WHERE event_type = ? AND event_pattern = ? AND created_by = ?
    `).get(event_type, event_pattern, userId);

    let template;

    if (existingTemplate) {
      // Update existing template
      const stmt = db.prepare(`
        UPDATE event_templates 
        SET 
          preparation_timeline = ?,
          post_event_timeline = ?,
          confidence = ?,
          contextual_variations = ?,
          completion_rate = ?,
          usage_count = usage_count + 1,
          last_used_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          version = version + 1
        WHERE id = ?
      `);

      stmt.run(
        preparation_timeline,
        post_event_timeline,
        confidence,
        contextual_variations,
        completion_rate,
        existingTemplate.id
      );

      // Fetch updated template
      template = db.prepare('SELECT * FROM event_templates WHERE id = ?').get(existingTemplate.id);
    } else {
      // Create new template
      const stmt = db.prepare(`
        INSERT INTO event_templates (
          event_type, event_pattern, preparation_timeline, post_event_timeline,
          confidence, contextual_variations, completion_rate, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        event_type,
        event_pattern,
        preparation_timeline,
        post_event_timeline,
        confidence,
        contextual_variations,
        completion_rate,
        userId
      );

      // Fetch created template
      template = db.prepare('SELECT * FROM event_templates WHERE id = ?').get(result.lastInsertRowid);
    }

    // Parse JSON fields for response
    template.preparation_timeline = JSON.parse(template.preparation_timeline || '[]');
    template.post_event_timeline = JSON.parse(template.post_event_timeline || '[]');
    template.contextual_variations = JSON.parse(template.contextual_variations || '{}');

    res.status(existingTemplate ? 200 : 201).json(template);
  } catch (error) {
    console.error('Error saving event template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/event-templates/search?event_type=X&event_pattern=Y&min_confidence=Z
 * Get templates by event type and pattern
 */
router.get('/search', async (req, res) => {
  try {
    const { event_type, event_pattern, min_confidence = 70 } = req.query;
    const userId = req.user.id;

    if (!event_type) {
      return res.status(400).json({ error: 'Missing required parameter: event_type' });
    }

    let query = `
      SELECT * FROM event_templates 
      WHERE created_by = ? AND confidence >= ?
    `;
    const params = [userId, parseInt(min_confidence)];

    // Build dynamic WHERE clause
    if (event_type) {
      query += ` AND event_type = ?`;
      params.push(event_type);
    }

    if (event_pattern) {
      query += ` AND event_pattern = ?`;
      params.push(event_pattern);
    }

    query += ` ORDER BY confidence DESC, usage_count DESC, last_used_at DESC`;

    const templates = db.prepare(query).all(...params);

    // Parse JSON fields
    const processedTemplates = templates.map(template => ({
      ...template,
      preparation_timeline: JSON.parse(template.preparation_timeline || '[]'),
      post_event_timeline: JSON.parse(template.post_event_timeline || '[]'),
      contextual_variations: JSON.parse(template.contextual_variations || '{}')
    }));

    res.json(processedTemplates);
  } catch (error) {
    console.error('Error searching event templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/event-templates/pattern/:pattern?min_confidence=X
 * Get templates by event pattern
 */
router.get('/pattern/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    const { min_confidence = 70 } = req.query;
    const userId = req.user.id;

    const templates = db.prepare(`
      SELECT * FROM event_templates 
      WHERE event_pattern = ? AND created_by = ? AND confidence >= ?
      ORDER BY confidence DESC, usage_count DESC, last_used_at DESC
    `).all(pattern, userId, parseInt(min_confidence));

    // Parse JSON fields
    const processedTemplates = templates.map(template => ({
      ...template,
      preparation_timeline: JSON.parse(template.preparation_timeline || '[]'),
      post_event_timeline: JSON.parse(template.post_event_timeline || '[]'),
      contextual_variations: JSON.parse(template.contextual_variations || '{}')
    }));

    res.json(processedTemplates);
  } catch (error) {
    console.error('Error fetching templates by pattern:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/event-templates/:id/usage
 * Update usage statistics for a template
 */
router.put('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify template belongs to user
    const template = db.prepare('SELECT * FROM event_templates WHERE id = ? AND created_by = ?').get(id, userId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update usage statistics
    const stmt = db.prepare(`
      UPDATE event_templates 
      SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(id);

    // Return updated template
    const updatedTemplate = db.prepare('SELECT * FROM event_templates WHERE id = ?').get(id);
    
    res.json({
      ...updatedTemplate,
      preparation_timeline: JSON.parse(updatedTemplate.preparation_timeline || '[]'),
      post_event_timeline: JSON.parse(updatedTemplate.post_event_timeline || '[]'),
      contextual_variations: JSON.parse(updatedTemplate.contextual_variations || '{}')
    });
  } catch (error) {
    console.error('Error updating template usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/event-templates/:id
 * Delete a template
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify template belongs to user
    const template = db.prepare('SELECT * FROM event_templates WHERE id = ? AND created_by = ?').get(id, userId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete template
    const stmt = db.prepare('DELETE FROM event_templates WHERE id = ?');
    stmt.run(id);

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/event-templates
 * Get all templates for the user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const templates = db.prepare(`
      SELECT * FROM event_templates 
      WHERE created_by = ?
      ORDER BY last_used_at DESC, confidence DESC
      LIMIT ? OFFSET ?
    `).all(userId, parseInt(limit), parseInt(offset));

    // Parse JSON fields
    const processedTemplates = templates.map(template => ({
      ...template,
      preparation_timeline: JSON.parse(template.preparation_timeline || '[]'),
      post_event_timeline: JSON.parse(template.post_event_timeline || '[]'),
      contextual_variations: JSON.parse(template.contextual_variations || '{}')
    }));

    res.json(processedTemplates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/event-templates/learning
 * Record learning data for template improvement
 */
router.post('/learning', async (req, res) => {
  try {
    const {
      event_id,
      event_type,
      event_pattern,
      task_actions,
      timestamp
    } = req.body;

    const userId = req.user.id;

    if (!event_type || !event_pattern || !task_actions) {
      return res.status(400).json({ 
        error: 'Missing required fields: event_type, event_pattern, task_actions' 
      });
    }

    // Store in learning_history table for future analysis
    const stmt = db.prepare(`
      INSERT INTO learning_history (
        event_type, action, context, outcome, feedback
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const context = JSON.stringify({
      event_id,
      event_pattern,
      user_id: userId,
      timestamp
    });

    const outcome = JSON.stringify({
      task_actions,
      total_tasks: task_actions.length,
      completed_tasks: task_actions.filter(a => a.action === 'completed').length,
      skipped_tasks: task_actions.filter(a => a.action === 'skipped').length
    });

    stmt.run(
      event_type,
      'template_usage',
      context,
      outcome,
      'Learning data recorded'
    );

    // Update template confidence based on completion rate
    const completedTasks = task_actions.filter(a => a.action === 'completed').length;
    const completionRate = task_actions.length > 0 ? completedTasks / task_actions.length : 0;

    // Find and update template
    const template = db.prepare(`
      SELECT * FROM event_templates 
      WHERE event_type = ? AND event_pattern = ? AND created_by = ?
    `).get(event_type, event_pattern, userId);

    if (template) {
      // Calculate new confidence (weighted average with previous data)
      const newCompletionRate = (template.completion_rate * template.usage_count + completionRate) / (template.usage_count + 1);
      const confidenceAdjustment = (completionRate - 0.5) * 10; // -25 to +25 based on completion
      const newConfidence = Math.max(50, Math.min(100, template.confidence + confidenceAdjustment));

      db.prepare(`
        UPDATE event_templates 
        SET 
          completion_rate = ?,
          confidence = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newCompletionRate, newConfidence, template.id);
    }

    res.json({ success: true, message: 'Learning data recorded successfully' });
  } catch (error) {
    console.error('Error recording learning data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/event-templates/learning/batch
 * Record batch learning data for offline sync
 */
router.post('/learning/batch', async (req, res) => {
  try {
    const { data } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Invalid batch data' });
    }

    // Process each learning record
    const stmt = db.prepare(`
      INSERT INTO learning_history (
        event_type, action, context, outcome, feedback
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const record of data) {
        const context = JSON.stringify({
          event_id: record.event_id,
          event_pattern: record.event_pattern,
          user_id: userId,
          timestamp: record.timestamp
        });

        const outcome = JSON.stringify({
          task_actions: record.task_actions,
          total_tasks: record.task_actions.length,
          completed_tasks: record.task_actions.filter(a => a.action === 'completed').length,
          skipped_tasks: record.task_actions.filter(a => a.action === 'skipped').length
        });

        stmt.run(
          record.event_type,
          'template_usage',
          context,
          outcome,
          'Batch learning data recorded'
        );
      }
    });

    transaction();

    res.json({ 
      success: true, 
      message: `Processed ${data.length} learning records successfully` 
    });
  } catch (error) {
    console.error('Error processing batch learning data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/event-templates/stats
 * Get template usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_templates,
        AVG(confidence) as avg_confidence,
        AVG(usage_count) as avg_usage,
        AVG(completion_rate) as avg_completion_rate,
        MAX(last_used_at) as last_activity
      FROM event_templates 
      WHERE created_by = ?
    `).get(userId);

    const patternStats = db.prepare(`
      SELECT 
        event_pattern,
        COUNT(*) as template_count,
        AVG(confidence) as avg_confidence,
        SUM(usage_count) as total_usage
      FROM event_templates 
      WHERE created_by = ?
      GROUP BY event_pattern
      ORDER BY total_usage DESC
    `).all(userId);

    res.json({
      overall: stats,
      by_pattern: patternStats
    });
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;