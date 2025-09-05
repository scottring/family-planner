const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const auth = require('../middleware/auth');

const db = require('../config/database');

// Initialize planning sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS planning_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER,
    organizer_id INTEGER,
    participants TEXT, -- JSON array of participant IDs
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration_minutes INTEGER,
    status TEXT DEFAULT 'active', -- active, paused, completed, cancelled
    settings TEXT, -- JSON object with session settings
    progress TEXT, -- JSON object with quadrant progress
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users (id)
  )
`);

// Initialize session analytics table
db.exec(`
  CREATE TABLE IF NOT EXISTS session_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    quadrant_id TEXT,
    metric_name TEXT,
    metric_value REAL,
    metadata TEXT, -- JSON object with additional data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES planning_sessions (id)
  )
`);

// Initialize session items table (for tracking claimed items)
db.exec(`
  CREATE TABLE IF NOT EXISTS session_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    item_type TEXT, -- task, event, inbox_item
    item_id INTEGER,
    claimed_by INTEGER,
    status TEXT DEFAULT 'claimed', -- claimed, processed, converted
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES planning_sessions (id),
    FOREIGN KEY (claimed_by) REFERENCES users (id)
  )
`);

// POST /api/planning-session/start - Initialize a new planning session
router.post('/start', auth, async (req, res) => {
  try {
    const { participants = [], settings = {}, duration = 90 } = req.body;
    const organizerId = req.user.id;

    // Get user's family_id
    const userQuery = db.prepare('SELECT family_id FROM users WHERE id = ?');
    const user = userQuery.get(organizerId);

    if (!user?.family_id) {
      return res.status(400).json({ message: 'User must be part of a family to start planning sessions' });
    }

    // Check if there's already an active session for this family
    const activeSessionQuery = db.prepare(`
      SELECT id, organizer_id, start_time, participants, settings, progress FROM planning_sessions 
      WHERE family_id = ? AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `);
    const activeSession = activeSessionQuery.get(user.family_id);

    if (activeSession) {
      // Allow resuming if user is the organizer or a participant
      const isOrganizer = activeSession.organizer_id === organizerId;
      const participants = JSON.parse(activeSession.participants || '[]');
      const isParticipant = participants.includes(organizerId);
      
      if (isOrganizer || isParticipant) {
        // Return the existing session instead of error
        return res.json({
          id: activeSession.id,
          family_id: user.family_id,
          organizer_id: activeSession.organizer_id,
          participants: JSON.parse(activeSession.participants || '[]'),
          start_time: activeSession.start_time,
          duration_minutes: duration, // Use requested duration
          status: 'active',
          settings: JSON.parse(activeSession.settings || '{}'),
          progress: JSON.parse(activeSession.progress || '{}'),
          created_at: activeSession.start_time,
          resumed: true // Flag to indicate this was resumed
        });
      } else {
        // User not authorized to join existing session
        return res.status(409).json({ 
          message: 'An active planning session already exists and you are not a participant',
          sessionId: activeSession.id,
          canJoin: false
        });
      }
    }

    // Create new session
    const insertSession = db.prepare(`
      INSERT INTO planning_sessions (
        family_id, organizer_id, participants, duration_minutes, settings, progress
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const defaultProgress = {
      review: { progress: 0, completed: false },
      inbox: { progress: 0, completed: false },
      calendar: { progress: 0, completed: false },
      actions: { progress: 0, completed: false }
    };

    const sessionId = insertSession.run(
      user.family_id,
      organizerId,
      JSON.stringify(participants),
      duration,
      JSON.stringify(settings),
      JSON.stringify(defaultProgress)
    ).lastInsertRowid;

    // Fetch the created session
    const sessionQuery = db.prepare(`
      SELECT *, 
             json_extract(participants, '$') as participants,
             json_extract(settings, '$') as settings,
             json_extract(progress, '$') as progress
      FROM planning_sessions WHERE id = ?
    `);
    const session = sessionQuery.get(sessionId);

    res.json({
      id: session.id,
      family_id: session.family_id,
      organizer_id: session.organizer_id,
      participants: JSON.parse(session.participants || '[]'),
      start_time: session.start_time,
      duration_minutes: session.duration_minutes,
      status: session.status,
      settings: JSON.parse(session.settings || '{}'),
      progress: JSON.parse(session.progress || '{}'),
      created_at: session.created_at
    });

  } catch (error) {
    console.error('Start planning session error:', error);
    res.status(500).json({ 
      message: 'Failed to start planning session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/planning-session/:sessionId/save - Save session progress
router.post('/:sessionId/save', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { progress, notes } = req.body;

    // Verify session exists and user has access
    const sessionQuery = db.prepare(`
      SELECT s.*, u.family_id
      FROM planning_sessions s
      JOIN users u ON s.family_id = u.family_id
      WHERE s.id = ? AND u.id = ?
    `);
    const session = sessionQuery.get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Planning session not found or access denied' });
    }

    // Update session progress
    const updateSession = db.prepare(`
      UPDATE planning_sessions 
      SET progress = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateSession.run(
      JSON.stringify(progress || {}),
      notes || session.notes,
      sessionId
    );

    // Log analytics
    if (progress) {
      const insertAnalytics = db.prepare(`
        INSERT INTO session_analytics (session_id, quadrant_id, metric_name, metric_value, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);

      Object.entries(progress).forEach(([quadrantId, data]) => {
        if (data.progress !== undefined) {
          insertAnalytics.run(
            sessionId,
            quadrantId,
            'progress',
            data.progress,
            JSON.stringify({ timestamp: new Date().toISOString(), ...data })
          );
        }
      });
    }

    res.json({ 
      success: true,
      sessionId: parseInt(sessionId),
      lastSaved: new Date().toISOString()
    });

  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({ 
      message: 'Failed to save session progress',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/planning-session/:sessionId - Get session details
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionQuery = db.prepare(`
      SELECT s.*
      FROM planning_sessions s
      JOIN users u ON s.family_id = u.family_id
      WHERE s.id = ? AND u.id = ?
    `);
    const session = sessionQuery.get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Planning session not found or access denied' });
    }

    res.json({
      id: session.id,
      family_id: session.family_id,
      organizer_id: session.organizer_id,
      participants: JSON.parse(session.participants || '[]'),
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      status: session.status,
      settings: JSON.parse(session.settings || '{}'),
      progress: JSON.parse(session.progress || '{}'),
      notes: session.notes,
      created_at: session.created_at,
      updated_at: session.updated_at
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch session details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/planning-session/latest - Get most recent session
router.get('/latest', auth, async (req, res) => {
  try {
    // Get user's family_id
    const userQuery = db.prepare('SELECT family_id FROM users WHERE id = ?');
    const user = userQuery.get(req.user.id);

    if (!user?.family_id) {
      return res.json(null);
    }

    const sessionQuery = db.prepare(`
      SELECT * FROM planning_sessions 
      WHERE family_id = ?
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    const session = sessionQuery.get(user.family_id);

    if (!session) {
      return res.json(null);
    }

    res.json({
      id: session.id,
      family_id: session.family_id,
      organizer_id: session.organizer_id,
      participants: JSON.parse(session.participants || '[]'),
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      status: session.status,
      settings: JSON.parse(session.settings || '{}'),
      progress: JSON.parse(session.progress || '{}'),
      notes: session.notes,
      created_at: session.created_at,
      updated_at: session.updated_at
    });

  } catch (error) {
    console.error('Get latest session error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch latest session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/planning-session/:sessionId/pause - Pause session
router.post('/:sessionId/pause', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const updateSession = db.prepare(`
      UPDATE planning_sessions 
      SET status = 'paused', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organizer_id = ?
    `);
    
    const result = updateSession.run(sessionId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }

    res.json({ success: true, status: 'paused' });

  } catch (error) {
    console.error('Pause session error:', error);
    res.status(500).json({ 
      message: 'Failed to pause session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/planning-session/:sessionId/resume - Resume session
router.post('/:sessionId/resume', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const updateSession = db.prepare(`
      UPDATE planning_sessions 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organizer_id = ?
    `);
    
    const result = updateSession.run(sessionId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }

    res.json({ success: true, status: 'active' });

  } catch (error) {
    console.error('Resume session error:', error);
    res.status(500).json({ 
      message: 'Failed to resume session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/planning-session/:sessionId/cancel - Cancel/end session
router.post('/:sessionId/cancel', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists and user has access
    const sessionQuery = db.prepare(`
      SELECT s.*, u.family_id
      FROM planning_sessions s
      JOIN users u ON s.family_id = u.family_id
      WHERE s.id = ? AND u.id = ? AND s.status = 'active'
    `);
    const session = sessionQuery.get(sessionId, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Active planning session not found or access denied' });
    }

    // Update session status to cancelled
    const updateSession = db.prepare(`
      UPDATE planning_sessions 
      SET status = 'cancelled', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateSession.run(sessionId);

    res.json({ 
      success: true, 
      status: 'cancelled',
      message: 'Planning session has been cancelled'
    });

  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({ 
      message: 'Failed to cancel planning session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/planning-session/:sessionId/complete - Complete session
router.post('/:sessionId/complete', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const updateSession = db.prepare(`
      UPDATE planning_sessions 
      SET status = 'completed', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organizer_id = ?
    `);
    
    const result = updateSession.run(sessionId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }

    // Calculate session metrics
    const sessionQuery = db.prepare(`
      SELECT 
        id, start_time, end_time, progress,
        (julianday(end_time) - julianday(start_time)) * 24 * 60 as actual_duration_minutes
      FROM planning_sessions WHERE id = ?
    `);
    const session = sessionQuery.get(sessionId);
    
    const progress = JSON.parse(session.progress || '{}');
    const completedQuadrants = Object.values(progress).filter(q => q.completed).length;
    const completionRate = (completedQuadrants / 4) * 100;

    // Store completion analytics
    const insertAnalytics = db.prepare(`
      INSERT INTO session_analytics (session_id, quadrant_id, metric_name, metric_value, metadata)
      VALUES (?, 'session', ?, ?, ?)
    `);

    insertAnalytics.run(
      sessionId,
      'completion_rate',
      completionRate,
      JSON.stringify({
        completed_quadrants: completedQuadrants,
        total_quadrants: 4,
        actual_duration: session.actual_duration_minutes
      })
    );

    res.json({ 
      success: true, 
      status: 'completed',
      completion_rate: completionRate,
      duration_minutes: session.actual_duration_minutes
    });

  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ 
      message: 'Failed to complete session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/planning-session/analytics - Get analytics data for review
router.get('/analytics', auth, async (req, res) => {
  try {
    const { start_date, end_date, member_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'start_date and end_date are required' });
    }

    // Get user's family_id
    const userQuery = db.prepare('SELECT family_id FROM users WHERE id = ?');
    const user = userQuery.get(req.user.id);

    if (!user?.family_id) {
      return res.status(400).json({ message: 'User must be part of a family' });
    }

    // Get tasks and events for the date range
    let tasksQuery, eventsQuery;
    let tasksParams = [start_date, end_date];
    let eventsParams = [start_date, end_date];

    if (member_id && member_id !== 'all') {
      tasksQuery = `
        SELECT * FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE u.family_id = ? AND u.id = ?
        AND t.created_at BETWEEN ? AND ?
        ORDER BY t.created_at ASC
      `;
      tasksParams = [user.family_id, member_id, start_date, end_date];

      eventsQuery = `
        SELECT * FROM events e
        JOIN users u ON (e.assigned_to = u.id)
        WHERE u.family_id = ? AND u.id = ?
        AND e.start_time BETWEEN ? AND ?
        ORDER BY e.start_time ASC
      `;
      eventsParams = [user.family_id, member_id, start_date, end_date];
    } else {
      tasksQuery = `
        SELECT t.*, u.id as user_id, u.username, u.full_name FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE u.family_id = ?
        AND t.created_at BETWEEN ? AND ?
        ORDER BY t.created_at ASC
      `;
      tasksParams = [user.family_id, start_date, end_date];

      eventsQuery = `
        SELECT e.*, u.id as user_id, u.username, u.full_name FROM events e
        JOIN users u ON (e.assigned_to = u.id)
        WHERE u.family_id = ?
        AND e.start_time BETWEEN ? AND ?
        ORDER BY e.start_time ASC
      `;
      eventsParams = [user.family_id, start_date, end_date];
    }

    const tasks = db.prepare(tasksQuery).all(...tasksParams);
    const events = db.prepare(eventsQuery).all(...eventsParams);

    // Calculate completion metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed || t.status === 'completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate efficiency (on-time completion)
    const onTimeTasks = tasks.filter(t => {
      if (!t.completed || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const completedDate = new Date(t.completed_at || t.updated_at);
      return completedDate <= dueDate;
    }).length;

    const efficiency = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;

    // Get family members for responsibility distribution
    const familyMembersQuery = db.prepare(`
      SELECT id, username, full_name FROM users WHERE family_id = ?
    `);
    const familyMembers = familyMembersQuery.all(user.family_id);

    const responsibilityDistribution = familyMembers.map(member => {
      const memberTasks = tasks.filter(t => t.user_id === member.id);
      const memberEvents = events.filter(e => e.user_id === member.id);
      
      return {
        id: member.id,
        name: member.full_name || member.username,
        total: memberTasks.length + memberEvents.length,
        completed: memberTasks.filter(t => t.completed).length + memberEvents.length, // Events are considered "completed"
        tasks: memberTasks.length,
        events: memberEvents.length
      };
    });

    // Calculate time allocation (simplified)
    const timeCategories = {
      family: events.filter(e => e.category === 'family' || e.type === 'family').length * 2, // Assume 2 hours per family event
      personal: tasks.filter(t => t.category === 'personal').length * 1, // Assume 1 hour per personal task
      work: tasks.filter(t => t.category === 'work' || t.category === 'business').length * 2,
      household: tasks.filter(t => t.category === 'household' || t.category === 'chores').length * 1,
      other: 0
    };

    const totalTime = Object.values(timeCategories).reduce((a, b) => a + b, 0);
    timeCategories.other = Math.max(0, 40 - totalTime); // Assume 40 hours total per week
    timeCategories.total = totalTime + timeCategories.other;

    // Identify missed items
    const missedTasks = tasks.filter(t => {
      if (t.completed) return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const endDate = new Date(end_date);
      return dueDate < endDate;
    });

    const missedEvents = events.filter(e => {
      const eventDate = new Date(e.start_time);
      const endDate = new Date(end_date);
      return eventDate < endDate && e.status === 'cancelled';
    });

    // Get completed items for celebration
    const completedItems = [
      ...tasks.filter(t => t.completed).map(t => ({ ...t, type: 'task' })),
      ...events.filter(e => e.status !== 'cancelled').map(e => ({ ...e, type: 'event', completed_at: e.start_time }))
    ].sort((a, b) => new Date(b.completed_at || b.updated_at) - new Date(a.completed_at || a.updated_at));

    // Calculate balance score (simplified)
    const workLifeBalance = Math.max(0, 10 - Math.abs(timeCategories.work - timeCategories.family));

    const analytics = {
      completion: {
        rate: completionRate,
        completed: completedTasks,
        total: totalTasks,
        missed: missedTasks.length
      },
      efficiency: {
        score: efficiency,
        onTime: onTimeTasks,
        total: completedTasks
      },
      events: {
        total: events.length,
        family: events.filter(e => e.category === 'family').length,
        personal: events.filter(e => e.category === 'personal').length
      },
      balance: {
        score: workLifeBalance
      },
      responsibilities: {
        members: responsibilityDistribution,
        distribution: responsibilityDistribution.map(m => m.total)
      },
      timeSpent: {
        categories: timeCategories,
        total: timeCategories.total
      },
      missedItems: [...missedTasks, ...missedEvents],
      completedItems: completedItems
    };

    res.json(analytics);

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch analytics data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/planning-session/claim-item - Claim an item during session
router.post('/claim-item', auth, async (req, res) => {
  try {
    const { item_type, item_id, session_id } = req.body;

    // Verify session exists and is active
    const sessionQuery = db.prepare(`
      SELECT s.* FROM planning_sessions s
      JOIN users u ON s.family_id = u.family_id
      WHERE s.id = ? AND u.id = ? AND s.status = 'active'
    `);
    const session = sessionQuery.get(session_id, req.user.id);

    if (!session) {
      return res.status(404).json({ message: 'Active session not found or access denied' });
    }

    // Check if item is already claimed
    const existingClaim = db.prepare(`
      SELECT * FROM session_items 
      WHERE session_id = ? AND item_type = ? AND item_id = ?
    `).get(session_id, item_type, item_id);

    if (existingClaim) {
      return res.status(409).json({ message: 'Item already claimed', claimedBy: existingClaim.claimed_by });
    }

    // Claim the item
    const claimItem = db.prepare(`
      INSERT INTO session_items (session_id, item_type, item_id, claimed_by)
      VALUES (?, ?, ?, ?)
    `);
    
    claimItem.run(session_id, item_type, item_id, req.user.id);

    res.json({ 
      success: true,
      claimedBy: req.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Claim item error:', error);
    res.status(500).json({ 
      message: 'Failed to claim item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/planning-session/history - Get session history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    // Get user's family_id
    const userQuery = db.prepare('SELECT family_id FROM users WHERE id = ?');
    const user = userQuery.get(req.user.id);

    if (!user?.family_id) {
      return res.json({ sessions: [], total: 0 });
    }

    const sessionsQuery = db.prepare(`
      SELECT 
        s.*,
        u.full_name as organizer_name,
        (SELECT COUNT(*) FROM session_analytics sa WHERE sa.session_id = s.id) as metrics_count
      FROM planning_sessions s
      JOIN users u ON s.organizer_id = u.id
      WHERE s.family_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const countQuery = db.prepare(`
      SELECT COUNT(*) as total FROM planning_sessions WHERE family_id = ?
    `);

    const sessions = sessionsQuery.all(user.family_id, limit, offset);
    const { total } = countQuery.get(user.family_id);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      organizer: session.organizer_name,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      status: session.status,
      participants: JSON.parse(session.participants || '[]'),
      progress: JSON.parse(session.progress || '{}'),
      metrics_count: session.metrics_count,
      created_at: session.created_at
    }));

    res.json({
      sessions: formattedSessions,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Session history error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch session history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;