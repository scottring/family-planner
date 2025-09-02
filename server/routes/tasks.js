const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

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

module.exports = router;