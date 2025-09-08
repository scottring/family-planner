const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Stub routes for planning session to prevent 404 errors
// TODO: Implement with SQLite instead of PostgreSQL

// Get weekly analytics - returns empty data for now
router.get('/analytics', auth, async (req, res) => {
  try {
    const analytics = {
      weeklyStats: {
        totalSessions: 0,
        totalHours: 0,
        completedItems: 0,
        progressRate: 0
      },
      sessionHistory: [],
      itemsCompleted: [],
      quadrantProgress: {
        health: 0,
        wealth: 0,
        relationships: 0,
        personal: 0
      },
      dailyProgress: [],
      topAchievements: []
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Start a new planning session
router.post('/start', auth, async (req, res) => {
  try {
    const session = {
      id: Date.now(),
      created_by_user_id: req.user.id,
      participants: req.body.participants || [],
      settings: req.body.settings || {},
      status: 'active',
      start_time: new Date().toISOString(),
      progress: {}
    };
    
    res.json(session);
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Get active session
router.get('/active', auth, async (req, res) => {
  try {
    // Return null for now - no active session
    res.json(null);
  } catch (error) {
    console.error('Error fetching active session:', error);
    res.status(500).json({ error: 'Failed to fetch active session' });
  }
});

// End session
router.post('/:id/end', auth, async (req, res) => {
  try {
    res.json({ message: 'Session ended', id: req.params.id });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Update progress
router.post('/:id/progress', auth, async (req, res) => {
  try {
    res.json({ 
      message: 'Progress updated',
      quadrant: req.body.quadrant,
      progress: req.body.progress 
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Submit item
router.post('/:id/submit', auth, async (req, res) => {
  try {
    res.json({
      message: 'Item submitted',
      item: req.body
    });
  } catch (error) {
    console.error('Error submitting item:', error);
    res.status(500).json({ error: 'Failed to submit item' });
  }
});

// Claim item
router.post('/:id/claim', auth, async (req, res) => {
  try {
    res.json({
      claimedBy: req.user.id,
      item: req.body
    });
  } catch (error) {
    console.error('Error claiming item:', error);
    res.status(500).json({ error: 'Failed to claim item' });
  }
});

// Get review data
router.get('/:id/review', auth, async (req, res) => {
  try {
    const reviewData = {
      sessionId: req.params.id,
      duration: 0,
      participants: [],
      itemsByQuadrant: {
        health: [],
        wealth: [],
        relationships: [],
        personal: []
      },
      completedCount: 0,
      totalItems: 0
    };
    
    res.json(reviewData);
  } catch (error) {
    console.error('Error fetching review data:', error);
    res.status(500).json({ error: 'Failed to fetch review data' });
  }
});

module.exports = router;