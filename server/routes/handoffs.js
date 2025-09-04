const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get today's handoffs - who's responsible for what today
router.get('/today', auth, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get all events for today with assignment information
    const eventsQuery = `
      SELECT 
        e.id,
        e.title,
        e.start_time,
        e.end_time,
        e.location,
        e.assigned_to,
        e.backup_assignee,
        e.assignment_status,
        e.handoff_history,
        e.category,
        e.priority,
        assigned_user.username as assigned_username,
        assigned_user.full_name as assigned_full_name,
        backup_user.username as backup_username,
        backup_user.full_name as backup_full_name
      FROM events e
      LEFT JOIN users assigned_user ON e.assigned_to = assigned_user.id
      LEFT JOIN users backup_user ON e.backup_assignee = backup_user.id
      WHERE date(e.start_time) = ?
      ORDER BY e.start_time ASC
    `;
    
    const events = db.prepare(eventsQuery).all(today);
    
    // Get tasks for today with assignment information
    const tasksQuery = `
      SELECT 
        t.id,
        t.title,
        t.due_date,
        t.assigned_to,
        t.category,
        t.priority,
        t.status,
        assigned_user.username as assigned_username,
        assigned_user.full_name as assigned_full_name
      FROM tasks t
      LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
      WHERE date(t.due_date) = ? AND t.status != 'completed'
      ORDER BY t.due_date ASC
    `;
    
    const tasks = db.prepare(tasksQuery).all(today);
    
    // Process handoff history
    events.forEach(event => {
      try {
        event.handoff_history = JSON.parse(event.handoff_history || '[]');
      } catch (e) {
        event.handoff_history = [];
      }
    });
    
    // Organize by assignee
    const handoffs = {
      my_responsibilities: {
        events: events.filter(e => e.assigned_to === req.user.id),
        tasks: tasks.filter(t => t.assigned_to === req.user.id)
      },
      partner_responsibilities: {
        events: events.filter(e => e.assigned_to && e.assigned_to !== req.user.id),
        tasks: tasks.filter(t => t.assigned_to && t.assigned_to !== req.user.id)
      },
      unassigned: {
        events: events.filter(e => !e.assigned_to),
        tasks: tasks.filter(t => !t.assigned_to)
      },
      backup_responsibilities: {
        events: events.filter(e => e.backup_assignee === req.user.id),
        tasks: [] // Tasks don't currently have backup assignees
      }
    };
    
    res.json(handoffs);
  } catch (error) {
    console.error('Error fetching today\'s handoffs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reassign event to different user
router.post('/reassign/event/:id', [
  auth,
  body('to_user_id').isInt().withMessage('User ID is required'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const eventId = req.params.id;
    const { to_user_id, reason = 'Manual reassignment' } = req.body;
    
    // Get current event info
    const event = db.prepare(`
      SELECT e.*, u.username as current_assignee 
      FROM events e 
      LEFT JOIN users u ON e.assigned_to = u.id 
      WHERE e.id = ?
    `).get(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get new assignee info
    const newAssignee = db.prepare('SELECT username, full_name FROM users WHERE id = ?').get(to_user_id);
    if (!newAssignee) {
      return res.status(404).json({ message: 'New assignee not found' });
    }
    
    // Create handoff record
    const handoffHistory = JSON.parse(event.handoff_history || '[]');
    handoffHistory.push({
      from_user_id: event.assigned_to,
      to_user_id: to_user_id,
      reason: reason,
      handoff_by: req.user.id,
      handoff_at: new Date().toISOString()
    });
    
    // Update event assignment
    const updateQuery = `
      UPDATE events 
      SET assigned_to = ?, 
          assignment_status = 'claimed', 
          handoff_history = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.prepare(updateQuery).run(to_user_id, JSON.stringify(handoffHistory), eventId);
    
    // Send notification to new assignee
    const notificationQuery = `
      INSERT INTO notifications (
        user_id, type, title, message, data, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const notificationData = {
      event_id: eventId,
      event_title: event.title,
      from_user: req.user.username,
      reason: reason
    };
    
    db.prepare(notificationQuery).run(
      to_user_id,
      'event_handoff',
      'Event Assigned to You',
      `${req.user.username} assigned "${event.title}" to you. ${reason}`,
      JSON.stringify(notificationData)
    );
    
    res.json({ 
      message: 'Event reassigned successfully',
      event_id: eventId,
      new_assignee: newAssignee.full_name
    });
    
  } catch (error) {
    console.error('Error reassigning event:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reassign task to different user
router.post('/reassign/task/:id', [
  auth,
  body('to_user_id').isInt().withMessage('User ID is required'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const taskId = req.params.id;
    const { to_user_id, reason = 'Manual reassignment' } = req.body;
    
    // Get current task info
    const task = db.prepare(`
      SELECT t.*, u.username as current_assignee 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.id = ?
    `).get(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Get new assignee info
    const newAssignee = db.prepare('SELECT username, full_name FROM users WHERE id = ?').get(to_user_id);
    if (!newAssignee) {
      return res.status(404).json({ message: 'New assignee not found' });
    }
    
    // Update task assignment
    db.prepare('UPDATE tasks SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(to_user_id, taskId);
    
    // Send notification to new assignee
    const notificationQuery = `
      INSERT INTO notifications (
        user_id, type, title, message, data, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const notificationData = {
      task_id: taskId,
      task_title: task.title,
      from_user: req.user.username,
      reason: reason
    };
    
    db.prepare(notificationQuery).run(
      to_user_id,
      'task_handoff',
      'Task Assigned to You',
      `${req.user.username} assigned task "${task.title}" to you. ${reason}`,
      JSON.stringify(notificationData)
    );
    
    res.json({ 
      message: 'Task reassigned successfully',
      task_id: taskId,
      new_assignee: newAssignee.full_name
    });
    
  } catch (error) {
    console.error('Error reassigning task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Swap event assignments between two users
router.post('/swap/event/:id', [
  auth,
  body('with_user_id').isInt().withMessage('User ID to swap with is required'),
  body('their_event_id').isInt().withMessage('Their event ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const myEventId = req.params.id;
    const { with_user_id, their_event_id } = req.body;
    
    // Get both events
    const myEvent = db.prepare('SELECT * FROM events WHERE id = ? AND assigned_to = ?').get(myEventId, req.user.id);
    const theirEvent = db.prepare('SELECT * FROM events WHERE id = ? AND assigned_to = ?').get(their_event_id, with_user_id);
    
    if (!myEvent || !theirEvent) {
      return res.status(404).json({ message: 'One or both events not found or not properly assigned' });
    }
    
    // Perform the swap
    db.prepare('UPDATE events SET assigned_to = ? WHERE id = ?').run(with_user_id, myEventId);
    db.prepare('UPDATE events SET assigned_to = ? WHERE id = ?').run(req.user.id, their_event_id);
    
    // Send notifications to both users
    const notificationQuery = `
      INSERT INTO notifications (
        user_id, type, title, message, data, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    // Notify the other user
    db.prepare(notificationQuery).run(
      with_user_id,
      'event_swap',
      'Event Swap Completed',
      `You now have "${myEvent.title}" and ${req.user.username} has "${theirEvent.title}"`,
      JSON.stringify({ 
        swapped_event_id: myEventId,
        received_event_id: their_event_id,
        with_user: req.user.username
      })
    );
    
    res.json({ 
      message: 'Event swap completed successfully',
      you_now_have: theirEvent.title,
      they_now_have: myEvent.title
    });
    
  } catch (error) {
    console.error('Error swapping events:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get handoff statistics and insights
router.get('/stats', auth, (req, res) => {
  try {
    const stats = {
      today: {
        my_events: db.prepare(`
          SELECT COUNT(*) as count FROM events 
          WHERE assigned_to = ? AND date(start_time) = date('now')
        `).get(req.user.id).count,
        
        partner_events: db.prepare(`
          SELECT COUNT(*) as count FROM events 
          WHERE assigned_to IS NOT NULL AND assigned_to != ? AND date(start_time) = date('now')
        `).get(req.user.id).count,
        
        unassigned_events: db.prepare(`
          SELECT COUNT(*) as count FROM events 
          WHERE assigned_to IS NULL AND date(start_time) = date('now')
        `).get().count,
        
        my_tasks: db.prepare(`
          SELECT COUNT(*) as count FROM tasks 
          WHERE assigned_to = ? AND date(due_date) = date('now') AND status != 'completed'
        `).get(req.user.id).count,
        
        partner_tasks: db.prepare(`
          SELECT COUNT(*) as count FROM tasks 
          WHERE assigned_to IS NOT NULL AND assigned_to != ? AND date(due_date) = date('now') AND status != 'completed'
        `).get(req.user.id).count,
        
        unassigned_tasks: db.prepare(`
          SELECT COUNT(*) as count FROM tasks 
          WHERE assigned_to IS NULL AND date(due_date) = date('now') AND status != 'completed'
        `).get().count
      },
      
      week: {
        handoffs_given: db.prepare(`
          SELECT COUNT(*) as count FROM notifications 
          WHERE type = 'event_handoff' AND created_at > datetime('now', '-7 days')
        `).get().count,
        
        handoffs_received: db.prepare(`
          SELECT COUNT(*) as count FROM notifications 
          WHERE user_id = ? AND type = 'event_handoff' AND created_at > datetime('now', '-7 days')
        `).get(req.user.id).count
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching handoff stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get available users for handoff
router.get('/users', auth, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, full_name 
      FROM users 
      WHERE id != ?
      ORDER BY full_name ASC
    `).all(req.user.id);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users for handoff:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;