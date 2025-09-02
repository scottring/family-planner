const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Get family members
router.get('/members', auth, (req, res) => {
  try {
    const members = db.prepare('SELECT * FROM family_members ORDER BY name').all();
    
    members.forEach(member => {
      member.dietary_preferences = db.parseJSON(member.dietary_preferences) || {};
      member.health_goals = db.parseJSON(member.health_goals) || {};
    });
    
    res.json(members);
  } catch (error) {
    console.error('Get family members error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get activity templates
router.get('/activities', auth, (req, res) => {
  try {
    const activities = db.prepare('SELECT * FROM activity_templates ORDER BY name').all();
    
    activities.forEach(activity => {
      activity.preparation_items = db.parseJSON(activity.preparation_items) || [];
      activity.equipment_list = db.parseJSON(activity.equipment_list) || [];
    });
    
    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;