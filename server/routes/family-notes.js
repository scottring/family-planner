const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get recent family notes
router.get('/', auth, (req, res) => {
  try {
    const { limit = 10, status = 'active' } = req.query;
    
    const query = `
      SELECT 
        fn.id,
        fn.content,
        fn.priority,
        fn.category,
        fn.tags,
        fn.visible_to,
        fn.expires_at,
        fn.status,
        fn.created_at,
        fn.updated_at,
        u.username as author_name,
        u.full_name as author_full_name
      FROM family_notes fn
      JOIN users u ON fn.author_id = u.id
      WHERE fn.status = ?
      AND (fn.expires_at IS NULL OR fn.expires_at > datetime('now'))
      ORDER BY fn.created_at DESC
      LIMIT ?
    `;
    
    const notes = db.prepare(query).all(status, parseInt(limit));
    
    // Parse JSON fields
    notes.forEach(note => {
      try {
        note.tags = JSON.parse(note.tags || '[]');
        note.visible_to = JSON.parse(note.visible_to || '[]');
      } catch (e) {
        note.tags = [];
        note.visible_to = [];
      }
    });
    
    res.json(notes);
  } catch (error) {
    console.error('Error fetching family notes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new family note
router.post('/', [
  auth,
  body('content').notEmpty().withMessage('Content is required'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('category').optional().isString().withMessage('Category must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('visible_to').optional().isArray().withMessage('Visible to must be an array'),
  body('expires_at').optional().isISO8601().withMessage('Invalid expiration date')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      content,
      priority = 'normal',
      category = 'general',
      tags = [],
      visible_to = [],
      expires_at = null
    } = req.body;

    const insertQuery = `
      INSERT INTO family_notes (
        content, author_id, priority, category, tags, visible_to, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = db.prepare(insertQuery).run(
      content,
      req.user.id,
      priority,
      category,
      JSON.stringify(tags),
      JSON.stringify(visible_to),
      expires_at
    );

    // Return the created note with author info
    const noteQuery = `
      SELECT 
        fn.id,
        fn.content,
        fn.priority,
        fn.category,
        fn.tags,
        fn.visible_to,
        fn.expires_at,
        fn.status,
        fn.created_at,
        fn.updated_at,
        u.username as author_name,
        u.full_name as author_full_name
      FROM family_notes fn
      JOIN users u ON fn.author_id = u.id
      WHERE fn.id = ?
    `;

    const newNote = db.prepare(noteQuery).get(result.lastInsertRowid);
    
    // Parse JSON fields
    try {
      newNote.tags = JSON.parse(newNote.tags || '[]');
      newNote.visible_to = JSON.parse(newNote.visible_to || '[]');
    } catch (e) {
      newNote.tags = [];
      newNote.visible_to = [];
    }

    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating family note:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update family note
router.put('/:id', [
  auth,
  body('content').optional().notEmpty().withMessage('Content cannot be empty'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('category').optional().isString().withMessage('Category must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('visible_to').optional().isArray().withMessage('Visible to must be an array'),
  body('status').optional().isIn(['active', 'archived', 'deleted']).withMessage('Invalid status')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const noteId = req.params.id;
    
    // Check if note exists and user is the author
    const existingNote = db.prepare('SELECT author_id FROM family_notes WHERE id = ?').get(noteId);
    if (!existingNote) {
      return res.status(404).json({ message: 'Family note not found' });
    }
    
    if (existingNote.author_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    const updateFields = [];
    const updateValues = [];

    Object.keys(req.body).forEach(key => {
      if (['content', 'priority', 'category', 'status'].includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(req.body[key]);
      } else if (['tags', 'visible_to'].includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(JSON.stringify(req.body[key]));
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(noteId);

    const updateQuery = `UPDATE family_notes SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...updateValues);

    // Return updated note
    const noteQuery = `
      SELECT 
        fn.id,
        fn.content,
        fn.priority,
        fn.category,
        fn.tags,
        fn.visible_to,
        fn.expires_at,
        fn.status,
        fn.created_at,
        fn.updated_at,
        u.username as author_name,
        u.full_name as author_full_name
      FROM family_notes fn
      JOIN users u ON fn.author_id = u.id
      WHERE fn.id = ?
    `;

    const updatedNote = db.prepare(noteQuery).get(noteId);
    
    // Parse JSON fields
    try {
      updatedNote.tags = JSON.parse(updatedNote.tags || '[]');
      updatedNote.visible_to = JSON.parse(updatedNote.visible_to || '[]');
    } catch (e) {
      updatedNote.tags = [];
      updatedNote.visible_to = [];
    }

    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating family note:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete family note
router.delete('/:id', auth, (req, res) => {
  try {
    const noteId = req.params.id;
    
    // Check if note exists and user is the author
    const existingNote = db.prepare('SELECT author_id FROM family_notes WHERE id = ?').get(noteId);
    if (!existingNote) {
      return res.status(404).json({ message: 'Family note not found' });
    }
    
    if (existingNote.author_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    // Soft delete - mark as deleted instead of removing
    db.prepare('UPDATE family_notes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('deleted', noteId);

    res.json({ message: 'Family note deleted successfully' });
  } catch (error) {
    console.error('Error deleting family note:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Archive family note
router.put('/:id/archive', auth, (req, res) => {
  try {
    const noteId = req.params.id;
    
    // Check if note exists and user is the author
    const existingNote = db.prepare('SELECT author_id FROM family_notes WHERE id = ?').get(noteId);
    if (!existingNote) {
      return res.status(404).json({ message: 'Family note not found' });
    }
    
    if (existingNote.author_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to archive this note' });
    }

    db.prepare('UPDATE family_notes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('archived', noteId);

    res.json({ message: 'Family note archived successfully' });
  } catch (error) {
    console.error('Error archiving family note:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get family note statistics
router.get('/stats', auth, (req, res) => {
  try {
    const stats = {
      total: db.prepare("SELECT COUNT(*) as count FROM family_notes WHERE status != 'deleted'").get().count,
      active: db.prepare("SELECT COUNT(*) as count FROM family_notes WHERE status = 'active'").get().count,
      high_priority: db.prepare("SELECT COUNT(*) as count FROM family_notes WHERE status = 'active' AND priority IN ('high', 'urgent')").get().count,
      user_notes: db.prepare("SELECT COUNT(*) as count FROM family_notes WHERE status = 'active' AND author_id = ?").get(req.user.id).count,
      recent: db.prepare("SELECT COUNT(*) as count FROM family_notes WHERE status = 'active' AND created_at > datetime('now', '-24 hours')").get().count
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching family notes stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;