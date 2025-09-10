const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all calendar accounts for the current user
router.get('/', authMiddleware, (req, res) => {
  try {
    // Check if user has Google Calendar connected
    const user = db.prepare('SELECT google_tokens, sync_enabled, email FROM users WHERE id = ?').get(req.user.id);
    
    const accounts = [];
    
    if (user?.google_tokens && user?.sync_enabled) {
      // Parse the tokens to check if they're valid
      let tokens = null;
      if (typeof user.google_tokens === 'string') {
        try {
          tokens = JSON.parse(user.google_tokens);
        } catch (e) {
          console.error('Error parsing Google tokens:', e);
        }
      } else {
        tokens = user.google_tokens;
      }
      
      if (tokens && tokens.access_token) {
        accounts.push({
          id: 'google_primary',
          type: 'google',
          name: 'Google Calendar',
          email: user.email || req.user.email || 'Connected',
          connected: true,
          primary: true
        });
      }
    }
    
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching calendar accounts:', error);
    res.status(500).json({ error: 'Failed to fetch calendar accounts' });
  }
});

// Connect a new calendar account (redirects to OAuth)
router.post('/connect', authMiddleware, (req, res) => {
  const { type } = req.body;
  
  if (type === 'google') {
    // Redirect to Google OAuth flow
    res.json({ 
      redirectUrl: `/api/google/auth`,
      message: 'Redirecting to Google OAuth' 
    });
  } else {
    res.status(400).json({ error: 'Unsupported calendar type' });
  }
});

// Disconnect a calendar account
router.delete('/:accountId', authMiddleware, (req, res) => {
  try {
    const { accountId } = req.params;
    
    if (accountId === 'google_primary') {
      // Disconnect Google Calendar
      db.prepare(`
        UPDATE users 
        SET google_tokens = NULL, sync_enabled = 0 
        WHERE id = ?
      `).run(req.user.id);
      
      res.json({ 
        success: true, 
        message: 'Google Calendar disconnected' 
      });
    } else {
      res.status(404).json({ error: 'Calendar account not found' });
    }
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
});

module.exports = router;