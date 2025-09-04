const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { body, validationResult } = require('express-validator');

// Register endpoint
router.post('/register', [
  body('username').notEmpty().trim().isLength({ min: 3 }),
  body('password').notEmpty().isLength({ min: 6 }),
  body('email').isEmail().normalizeEmail()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password, email } = req.body;
  const full_name = username; // Use username as full_name for now
  
  try {
    // Check if user already exists
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      const message = existingUser.username === username ? 'Username already exists' : 'Email already registered';
      return res.status(400).json({ message });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = bcrypt.hashSync(password, saltRounds);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name)
      VALUES (?, ?, ?, ?)
    `).run(username, email, password_hash, full_name);

    // Generate token
    const token = jwt.sign(
      { id: result.lastInsertRowid, username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.lastInsertRowid,
        username,
        email,
        full_name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', [
  body('username').notEmpty().trim(),
  body('password').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user
router.get('/me', require('../middleware/auth'), (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, full_name, telegram_id, preferences FROM users WHERE id = ?')
      .get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.preferences = db.parseJSON(user.preferences);
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Update user profile
router.put('/profile', require('../middleware/auth'), [
  body('full_name').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('preferences').optional().isObject(),
  body('dashboard_preferences').optional().isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { full_name, email, preferences, dashboard_preferences } = req.body;
    const userId = req.user.id;

    // Get current user
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Parse existing preferences
    let existingPreferences = {};
    try {
      existingPreferences = JSON.parse(currentUser.preferences || '{}');
    } catch (e) {
      console.warn('Failed to parse existing preferences:', e);
    }

    // Merge dashboard preferences
    if (dashboard_preferences) {
      existingPreferences.dashboard = {
        ...existingPreferences.dashboard,
        ...dashboard_preferences
      };
    }

    // Merge other preferences
    if (preferences) {
      existingPreferences = {
        ...existingPreferences,
        ...preferences
      };
    }

    // Prepare update query
    const updateFields = [];
    const updateValues = [];

    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }

    if (email !== undefined) {
      // Check if email already exists for another user
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (preferences || dashboard_preferences) {
      updateFields.push('preferences = ?');
      updateValues.push(JSON.stringify(existingPreferences));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // Add user ID for WHERE clause
    updateValues.push(userId);

    // Execute update
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...updateValues);

    // Return updated user
    const updatedUser = db.prepare('SELECT id, username, full_name, email, preferences FROM users WHERE id = ?')
      .get(userId);
    
    // Parse preferences for response
    try {
      updatedUser.preferences = JSON.parse(updatedUser.preferences || '{}');
    } catch (e) {
      updatedUser.preferences = {};
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user preferences
router.get('/preferences', require('../middleware/auth'), (req, res) => {
  try {
    const user = db.prepare('SELECT preferences FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let preferences = {};
    try {
      preferences = JSON.parse(user.preferences || '{}');
    } catch (e) {
      console.warn('Failed to parse preferences:', e);
    }

    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user preferences
router.put('/preferences', require('../middleware/auth'), [
  body('preferences').isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { preferences } = req.body;
    const userId = req.user.id;

    // Get current preferences
    const currentUser = db.prepare('SELECT preferences FROM users WHERE id = ?').get(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let existingPreferences = {};
    try {
      existingPreferences = JSON.parse(currentUser.preferences || '{}');
    } catch (e) {
      console.warn('Failed to parse existing preferences:', e);
    }

    // Merge preferences
    const updatedPreferences = {
      ...existingPreferences,
      ...preferences
    };

    // Update in database
    db.prepare('UPDATE users SET preferences = ? WHERE id = ?')
      .run(JSON.stringify(updatedPreferences), userId);

    res.json(updatedPreferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', require('../middleware/auth'), (req, res) => {
  const token = jwt.sign(
    { id: req.user.id, username: req.user.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token });
});

module.exports = router;