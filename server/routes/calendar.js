const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Get events
router.get('/events', auth, (req, res) => {
  try {
    const { start, end } = req.query;
    let query = 'SELECT * FROM events';
    const params = [];
    
    if (start && end) {
      query += ' WHERE start_time >= ? AND end_time <= ?';
      params.push(start, end);
    }
    
    query += ' ORDER BY start_time ASC';
    
    const events = db.prepare(query).all(...params);
    
    events.forEach(event => {
      event.preparation_list = db.parseJSON(event.preparation_list) || [];
      event.resources = db.parseJSON(event.resources) || {};
    });
    
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sync with Google Calendar (placeholder)
router.post('/sync', auth, async (req, res) => {
  try {
    // TODO: Implement Google Calendar sync
    res.json({ message: 'Calendar sync initiated' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Sync failed' });
  }
});

module.exports = router;