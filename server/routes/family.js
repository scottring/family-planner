const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// Get family members
router.get('/members', auth, (req, res) => {
  try {
    const query = 'SELECT * FROM family_members ORDER BY name';
    const members = db.all ? db.all(query) : db.prepare(query).all();
    
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

// Add family member
router.post('/members', auth, (req, res) => {
  try {
    const { name, type, age, dietary_preferences, health_goals, avatar, color } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }
    
    const validTypes = ['parent', 'child', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Must be parent, child, or other' });
    }
    
    const insertMember = db.prepare(`
      INSERT INTO family_members (name, type, age, dietary_preferences, health_goals, avatar, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertMember.run(
      name,
      type,
      age || null,
      db.stringifyJSON(dietary_preferences || {}),
      db.stringifyJSON(health_goals || {}),
      avatar || name.charAt(0).toUpperCase(),
      color || '#3B82F6'
    );
    
    const member = db.prepare('SELECT * FROM family_members WHERE id = ?').get(result.lastInsertRowid);
    member.dietary_preferences = db.parseJSON(member.dietary_preferences) || {};
    member.health_goals = db.parseJSON(member.health_goals) || {};
    
    res.status(201).json(member);
  } catch (error) {
    console.error('Add family member error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update family member
router.put('/members/:id', auth, (req, res) => {
  try {
    const memberId = req.params.id;
    const { name, type, age, dietary_preferences, health_goals, avatar, color } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }
    
    const validTypes = ['parent', 'child', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Must be parent, child, or other' });
    }
    
    const updateMember = db.prepare(`
      UPDATE family_members 
      SET name = ?, type = ?, age = ?, dietary_preferences = ?, health_goals = ?, avatar = ?, color = ?
      WHERE id = ?
    `);
    
    const result = updateMember.run(
      name,
      type,
      age || null,
      db.stringifyJSON(dietary_preferences || {}),
      db.stringifyJSON(health_goals || {}),
      avatar || name.charAt(0).toUpperCase(),
      color || '#3B82F6',
      memberId
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Family member not found' });
    }
    
    const member = db.prepare('SELECT * FROM family_members WHERE id = ?').get(memberId);
    member.dietary_preferences = db.parseJSON(member.dietary_preferences) || {};
    member.health_goals = db.parseJSON(member.health_goals) || {};
    
    res.json(member);
  } catch (error) {
    console.error('Update family member error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete family member
router.delete('/members/:id', auth, (req, res) => {
  try {
    const memberId = req.params.id;
    
    const deleteMember = db.prepare('DELETE FROM family_members WHERE id = ?');
    const result = deleteMember.run(memberId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Family member not found' });
    }
    
    res.json({ message: 'Family member deleted successfully' });
  } catch (error) {
    console.error('Delete family member error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get activity templates
router.get('/activities', auth, (req, res) => {
  try {
    const query = 'SELECT * FROM activity_templates ORDER BY name';
    const activities = db.all ? db.all(query) : db.prepare(query).all();
    
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