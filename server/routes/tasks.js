const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const taskLifecycleService = require('../services/taskLifecycleService');

// Get all tasks
router.get('/', auth, (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, u.full_name as assigned_to_name, fm.name as family_member_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN family_members fm ON t.family_member_id = fm.id
      ORDER BY t.due_date ASC, t.priority DESC
    `).all();
    
    tasks.forEach(task => {
      task.checklist = db.parseJSON(task.checklist) || [];
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single task
router.get('/:id', auth, (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*, u.full_name as assigned_to_name, fm.name as family_member_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN family_members fm ON t.family_member_id = fm.id
      WHERE t.id = ?
    `).get(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    task.checklist = db.parseJSON(task.checklist) || [];
    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create task
router.post('/', auth, [
  body('title').notEmpty().trim(),
  body('priority').optional().isInt({ min: 1, max: 5 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      title,
      description,
      due_date,
      assigned_to,
      family_member_id,
      category,
      priority = 3,
      checklist = [],
      parent_event_id,
      recurring_pattern
    } = req.body;

    const result = db.prepare(`
      INSERT INTO tasks (
        title, description, due_date, assigned_to, family_member_id,
        category, priority, checklist, parent_event_id, recurring_pattern,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description,
      due_date,
      assigned_to,
      family_member_id,
      category,
      priority,
      db.stringifyJSON(checklist),
      parent_event_id,
      recurring_pattern,
      req.user.id
    );

    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    newTask.checklist = db.parseJSON(newTask.checklist) || [];
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update task
router.put('/:id', auth, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updates = { ...req.body };
    if (updates.checklist) {
      updates.checklist = db.stringifyJSON(updates.checklist);
    }

    const fields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => `${key} = ?`);
    
    const values = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => updates[key]);
    
    if (fields.length > 0) {
      db.prepare(`
        UPDATE tasks 
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values, req.params.id);
    }

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    updatedTask.checklist = db.parseJSON(updatedTask.checklist) || [];
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', auth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Complete task
router.post('/:id/complete', auth, (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE tasks 
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `).run(now, req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    task.checklist = db.parseJSON(task.checklist) || [];
    
    res.json(task);
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get upcoming tasks
router.get('/upcoming', auth, (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, u.full_name as assigned_to_name, fm.name as family_member_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN family_members fm ON t.family_member_id = fm.id
      WHERE t.status = 'pending' 
        AND t.due_date >= datetime('now')
        AND t.due_date <= datetime('now', '+7 days')
      ORDER BY t.due_date ASC, t.priority DESC
    `).all();
    
    tasks.forEach(task => {
      task.checklist = db.parseJSON(task.checklist) || [];
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('Get upcoming tasks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get task templates
router.get('/templates', auth, (req, res) => {
  try {
    const { category } = req.query;
    const templates = taskLifecycleService.getTaskTemplates(category);
    res.json(templates);
  } catch (error) {
    console.error('Get task templates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create task from template
router.post('/from-template', auth, [
  body('templateId').notEmpty().isInt(),
  body('customData').optional().isObject()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { templateId, customData = {} } = req.body;
    const task = await taskLifecycleService.createTaskFromTemplate(templateId, customData, req.user.id);
    
    // Parse JSON fields
    task.checklist = db.parseJSON(task.checklist) || [];
    task.recurrence_pattern = db.parseJSON(task.recurrence_pattern) || {};
    task.completion_actions = db.parseJSON(task.completion_actions) || [];
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task from template error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Complete task with lifecycle handling
router.post('/:id/complete-with-events', auth, async (req, res) => {
  try {
    const { completionData = {} } = req.body;
    const result = await taskLifecycleService.completeTaskWithLifecycle(
      req.params.id, 
      req.user.id, 
      completionData
    );
    
    // Parse JSON fields for response
    result.task.checklist = db.parseJSON(result.task.checklist) || [];
    result.task.recurrence_pattern = db.parseJSON(result.task.recurrence_pattern) || {};
    result.task.completion_actions = db.parseJSON(result.task.completion_actions) || [];
    
    res.json(result);
  } catch (error) {
    console.error('Complete task with lifecycle error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Generate next recurring instance
router.post('/:id/generate-next', auth, async (req, res) => {
  try {
    const nextTask = await taskLifecycleService.generateNextRecurringInstance(
      req.params.id,
      req.user.id
    );
    
    // Parse JSON fields
    nextTask.checklist = db.parseJSON(nextTask.checklist) || [];
    nextTask.recurrence_pattern = db.parseJSON(nextTask.recurrence_pattern) || {};
    nextTask.completion_actions = db.parseJSON(nextTask.completion_actions) || [];
    
    res.json(nextTask);
  } catch (error) {
    console.error('Generate next recurring instance error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

// Convert task to event
router.post('/:id/convert-to-event', auth, [
  body('eventData').isObject(),
  body('eventData.start_time').notEmpty(),
  body('eventData.end_time').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { eventData } = req.body;
    const event = await taskLifecycleService.convertTaskToEvent(
      req.params.id,
      eventData,
      req.user.id
    );
    
    // Parse JSON fields for response
    event.preparation_list = db.parseJSON(event.preparation_list) || [];
    event.resources_needed = db.parseJSON(event.resources_needed) || {};
    event.ai_suggestions = db.parseJSON(event.ai_suggestions) || {};
    
    res.status(201).json(event);
  } catch (error) {
    console.error('Convert task to event error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

module.exports = router;