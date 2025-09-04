const express = require('express');
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/family_planner',
});

// Start a new planning session
router.post('/start', auth, async (req, res) => {
  const { participants, settings } = req.body;
  const userId = req.user.id;

  try {
    // Create new planning session
    const sessionResult = await pool.query(
      `INSERT INTO planning_sessions (
        created_by_user_id, 
        participants, 
        settings, 
        status, 
        start_time,
        progress
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        userId,
        JSON.stringify(participants),
        JSON.stringify(settings),
        'active',
        new Date(),
        JSON.stringify({})
      ]
    );

    const session = sessionResult.rows[0];

    // Create session participants records
    if (participants && participants.length > 0) {
      const participantInserts = participants.map((participantId, index) => 
        pool.query(
          `INSERT INTO session_participants (session_id, user_id, joined_at, is_host) VALUES ($1, $2, $3, $4)`,
          [session.id, participantId, new Date(), participantId === userId]
        )
      );
      
      await Promise.all(participantInserts);
    }

    res.json(session);
  } catch (error) {
    console.error('Error starting planning session:', error);
    res.status(500).json({ error: 'Failed to start planning session' });
  }
});

// Get latest or specific planning session
router.get('/latest', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT ps.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'user_id', sp.user_id,
              'joined_at', sp.joined_at,
              'is_host', sp.is_host
            )
          ) FILTER (WHERE sp.user_id IS NOT NULL), 
          '[]'::json
        ) as participants_data
      FROM planning_sessions ps
      LEFT JOIN session_participants sp ON ps.id = sp.session_id
      WHERE ps.created_by_user_id = $1 OR ps.id IN (
        SELECT session_id FROM session_participants WHERE user_id = $1
      )
      GROUP BY ps.id
      ORDER BY ps.start_time DESC
      LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching latest planning session:', error);
    res.status(500).json({ error: 'Failed to fetch planning session' });
  }
});

// Get specific planning session
router.get('/:sessionId', auth, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT ps.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'user_id', sp.user_id,
              'joined_at', sp.joined_at,
              'is_host', sp.is_host
            )
          ) FILTER (WHERE sp.user_id IS NOT NULL), 
          '[]'::json
        ) as participants_data
      FROM planning_sessions ps
      LEFT JOIN session_participants sp ON ps.id = sp.session_id
      WHERE ps.id = $1 AND (
        ps.created_by_user_id = $2 OR ps.id IN (
          SELECT session_id FROM session_participants WHERE user_id = $2
        )
      )
      GROUP BY ps.id`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planning session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching planning session:', error);
    res.status(500).json({ error: 'Failed to fetch planning session' });
  }
});

// Pause a planning session
router.post('/:sessionId/pause', auth, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE planning_sessions 
       SET status = 'paused', paused_at = $1 
       WHERE id = $2 AND (created_by_user_id = $3 OR id IN (
         SELECT session_id FROM session_participants WHERE user_id = $3
       ))
       RETURNING *`,
      [new Date(), sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planning session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error pausing planning session:', error);
    res.status(500).json({ error: 'Failed to pause planning session' });
  }
});

// Resume a planning session
router.post('/:sessionId/resume', auth, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE planning_sessions 
       SET status = 'active', resumed_at = $1 
       WHERE id = $2 AND (created_by_user_id = $3 OR id IN (
         SELECT session_id FROM session_participants WHERE user_id = $3
       ))
       RETURNING *`,
      [new Date(), sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planning session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error resuming planning session:', error);
    res.status(500).json({ error: 'Failed to resume planning session' });
  }
});

// Complete a planning session
router.post('/:sessionId/complete', auth, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE planning_sessions 
       SET status = 'completed', end_time = $1 
       WHERE id = $2 AND (created_by_user_id = $3 OR id IN (
         SELECT session_id FROM session_participants WHERE user_id = $3
       ))
       RETURNING *`,
      [new Date(), sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planning session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing planning session:', error);
    res.status(500).json({ error: 'Failed to complete planning session' });
  }
});

// Save progress for a planning session
router.post('/:sessionId/save', auth, async (req, res) => {
  const { sessionId } = req.params;
  const { progress, timestamp } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE planning_sessions 
       SET progress = $1, last_saved = $2 
       WHERE id = $3 AND (created_by_user_id = $4 OR id IN (
         SELECT session_id FROM session_participants WHERE user_id = $4
       ))
       RETURNING *`,
      [JSON.stringify(progress), timestamp || new Date(), sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planning session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving session progress:', error);
    res.status(500).json({ error: 'Failed to save session progress' });
  }
});

// Get weekly analytics for planning session review
router.get('/analytics', auth, async (req, res) => {
  const { start_date, end_date, member_id } = req.query;
  const userId = req.user.id;

  try {
    let memberFilter = '';
    let params = [userId, start_date, end_date];

    if (member_id && member_id !== 'all') {
      memberFilter = 'AND (t.assigned_to = $4 OR e.assigned_to = $4)';
      params.push(member_id);
    }

    // Get completion analytics
    const completionResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE t.completed_at IS NOT NULL OR e.completed_at IS NOT NULL) as completed,
        COUNT(*) FILTER (WHERE (t.due_date < NOW() OR e.start_time < NOW()) AND t.completed_at IS NULL AND e.completed_at IS NULL) as missed
      FROM (
        SELECT assigned_to, completed_at, due_date, 'task' as type FROM tasks WHERE created_at >= $2 AND created_at <= $3
        UNION ALL
        SELECT assigned_to, completed_at, start_time as due_date, 'event' as type FROM events WHERE created_at >= $2 AND created_at <= $3
      ) combined
      LEFT JOIN tasks t ON combined.type = 'task'
      LEFT JOIN events e ON combined.type = 'event'
      WHERE combined.assigned_to IN (
        SELECT fm.user_id FROM family_members fm 
        JOIN families f ON fm.family_id = f.id 
        WHERE f.created_by = $1 OR fm.user_id = $1
      ) ${memberFilter}
    `, params);

    // Get responsibility distribution
    const responsibilityResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        COUNT(combined.*) as total,
        COUNT(*) FILTER (WHERE combined.completed_at IS NOT NULL) as completed
      FROM users u
      JOIN family_members fm ON u.id = fm.user_id
      JOIN families f ON fm.family_id = f.id
      LEFT JOIN (
        SELECT assigned_to, completed_at FROM tasks WHERE created_at >= $2 AND created_at <= $3
        UNION ALL
        SELECT assigned_to, completed_at FROM events WHERE created_at >= $2 AND created_at <= $3
      ) combined ON u.id = combined.assigned_to
      WHERE f.created_by = $1 OR fm.user_id = $1
      GROUP BY u.id, u.name
    `, [userId, start_date, end_date]);

    // Calculate efficiency score (simplified)
    const efficiency = completionResult.rows[0];
    const efficiencyScore = efficiency.total > 0 
      ? Math.round((efficiency.completed / efficiency.total) * 100)
      : 100;

    // Get completed and missed items details
    const itemsResult = await pool.query(`
      SELECT 
        combined.*,
        'task' as item_type
      FROM tasks combined
      WHERE created_at >= $2 AND created_at <= $3
        AND assigned_to IN (
          SELECT fm.user_id FROM family_members fm 
          JOIN families f ON fm.family_id = f.id 
          WHERE f.created_by = $1 OR fm.user_id = $1
        ) ${memberFilter.replace(/t\./g, 'combined.').replace(/e\./g, 'combined.')}
      
      UNION ALL
      
      SELECT 
        combined.*,
        'event' as item_type
      FROM events combined
      WHERE created_at >= $2 AND created_at <= $3
        AND assigned_to IN (
          SELECT fm.user_id FROM family_members fm 
          JOIN families f ON fm.family_id = f.id 
          WHERE f.created_by = $1 OR fm.user_id = $1
        ) ${memberFilter.replace(/t\./g, 'combined.').replace(/e\./g, 'combined.')}
      
      ORDER BY created_at DESC
    `, params);

    const completedItems = itemsResult.rows.filter(item => item.completed_at);
    const missedItems = itemsResult.rows.filter(item => 
      !item.completed_at && 
      new Date(item.due_date || item.start_time) < new Date()
    );

    const analytics = {
      completion: {
        rate: Math.round((efficiency.completed / Math.max(efficiency.total, 1)) * 100),
        total: efficiency.total,
        completed: efficiency.completed,
        missed: efficiency.missed
      },
      efficiency: {
        score: efficiencyScore,
        onTime: efficiency.completed - efficiency.missed
      },
      events: {
        total: itemsResult.rows.filter(r => r.item_type === 'event').length,
        family: itemsResult.rows.filter(r => r.item_type === 'event' && r.category === 'family').length
      },
      balance: {
        score: Math.min(10, Math.round((efficiency.completed / Math.max(efficiency.total, 1)) * 10))
      },
      responsibilities: {
        members: responsibilityResult.rows,
        distribution: responsibilityResult.rows.map(m => m.total)
      },
      timeSpent: {
        total: 40, // Mock data - would need actual time tracking
        categories: {
          family: 15,
          personal: 10,
          work: 8,
          household: 5,
          other: 2
        }
      },
      completedItems: completedItems.slice(0, 20),
      missedItems: missedItems
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching weekly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Claim an item during planning session
router.post('/claim-item', auth, async (req, res) => {
  const { item_type, item_id, session_id } = req.body;
  const userId = req.user.id;

  try {
    let result;
    
    if (item_type === 'task') {
      result = await pool.query(
        `UPDATE tasks SET claimed_by = $1, claimed_at = $2 WHERE id = $3 RETURNING *`,
        [userId, new Date(), item_id]
      );
    } else if (item_type === 'event') {
      result = await pool.query(
        `UPDATE events SET claimed_by = $1, claimed_at = $2 WHERE id = $3 RETURNING *`,
        [userId, new Date(), item_id]
      );
    } else {
      return res.status(400).json({ error: 'Invalid item type' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Log the claim action in session
    await pool.query(
      `INSERT INTO session_actions (session_id, user_id, action_type, item_type, item_id, performed_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [session_id, userId, 'claim', item_type, item_id, new Date()]
    );

    res.json({
      claimedBy: userId,
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error claiming item:', error);
    res.status(500).json({ error: 'Failed to claim item' });
  }
});

module.exports = router;