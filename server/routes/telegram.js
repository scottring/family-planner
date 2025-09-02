const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegram');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Webhook endpoint for Telegram updates (production)
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('Received Telegram webhook update:', JSON.stringify(update, null, 2));
    
    // Process the update through our bot service
    await telegramService.processUpdate(update);
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Link Telegram account to user
router.post('/link/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { linkingCode } = req.body;

    // Verify user owns this account or is admin
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!linkingCode) {
      return res.status(400).json({ error: 'Linking code is required' });
    }

    // Validate linking code format
    if (!/^TG\d{6}$/.test(linkingCode)) {
      return res.status(400).json({ error: 'Invalid linking code format' });
    }

    // Link the account
    const success = await telegramService.linkUserAccount(userId, linkingCode);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Telegram account linked successfully',
        linkingCode 
      });
    } else {
      res.status(400).json({ error: 'Failed to link Telegram account' });
    }
  } catch (error) {
    console.error('Error linking Telegram account:', error);
    res.status(500).json({ error: 'Failed to link account' });
  }
});

// Unlink Telegram account
router.delete('/unlink/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user owns this account or is admin
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Remove Telegram connection
    db.prepare(`
      UPDATE users 
      SET telegram_id = NULL, telegram_chat_id = NULL, telegram_settings = '{}' 
      WHERE id = ?
    `).run(userId);

    res.json({ 
      success: true, 
      message: 'Telegram account unlinked successfully' 
    });
  } catch (error) {
    console.error('Error unlinking Telegram account:', error);
    res.status(500).json({ error: 'Failed to unlink account' });
  }
});

// Get Telegram connection status
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user owns this account or is admin
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = db.prepare('SELECT telegram_id, telegram_chat_id, telegram_settings FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isLinked = !!(user.telegram_id && user.telegram_chat_id);
    const settings = user.telegram_settings ? JSON.parse(user.telegram_settings) : {
      notifications_enabled: true,
      reminder_minutes: 30
    };

    res.json({
      linked: isLinked,
      telegram_id: user.telegram_id,
      has_chat_connection: !!user.telegram_chat_id,
      settings,
      bot_username: process.env.TELEGRAM_BOT_USERNAME || 'FamilySymphonyBot',
      bot_active: !telegramService.mockMode
    });
  } catch (error) {
    console.error('Error getting Telegram status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Update Telegram notification settings
router.put('/settings/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { notifications_enabled, reminder_minutes } = req.body;

    // Verify user owns this account or is admin
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate settings
    if (typeof notifications_enabled !== 'boolean') {
      return res.status(400).json({ error: 'notifications_enabled must be boolean' });
    }

    if (reminder_minutes && (typeof reminder_minutes !== 'number' || reminder_minutes < 5 || reminder_minutes > 120)) {
      return res.status(400).json({ error: 'reminder_minutes must be between 5 and 120' });
    }

    const settings = {
      notifications_enabled,
      reminder_minutes: reminder_minutes || 30
    };

    // Update settings
    db.prepare('UPDATE users SET telegram_settings = ? WHERE id = ?')
      .run(JSON.stringify(settings), userId);

    res.json({ 
      success: true, 
      message: 'Settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Error updating Telegram settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Send test message to user
router.post('/test/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user owns this account or is admin
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await telegramService.sendTestMessage(userId);
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Test message sent successfully',
        message_id: result.message_id 
      });
    } else {
      res.status(400).json({ error: 'Failed to send test message. Make sure your Telegram is linked and active.' });
    }
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({ error: error.message || 'Failed to send test message' });
  }
});

// Send custom message to user (for admin or system notifications)
router.post('/send/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message, parse_mode = 'Markdown' } = req.body;

    // Only allow admin or user themselves to send messages
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const user = telegramService.getUserById(userId);
    if (!user || !user.telegram_chat_id) {
      return res.status(400).json({ error: 'User not linked to Telegram' });
    }

    const result = await telegramService.sendMessage(user.telegram_chat_id, message, {
      parse_mode
    });

    if (result) {
      res.json({ 
        success: true, 
        message: 'Message sent successfully',
        message_id: result.message_id 
      });
    } else {
      res.status(400).json({ error: 'Failed to send message' });
    }
  } catch (error) {
    console.error('Error sending custom message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get bot info and statistics
router.get('/info', authenticateToken, async (req, res) => {
  try {
    // Get connected users count
    const connectedUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE telegram_chat_id IS NOT NULL
    `).get();

    // Get notification stats from last 24 hours
    const recentNotifications = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE sent_via = 'telegram' 
      AND sent_at > datetime('now', '-1 day')
    `).get();

    res.json({
      bot_active: !telegramService.mockMode,
      mock_mode: telegramService.mockMode,
      bot_username: process.env.TELEGRAM_BOT_USERNAME || 'FamilySymphonyBot',
      connected_users: connectedUsers.count,
      notifications_sent_24h: recentNotifications.count,
      webhook_url: process.env.NODE_ENV === 'production' ? `${process.env.WEBHOOK_URL}/api/telegram/webhook` : null
    });
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({ error: 'Failed to get bot info' });
  }
});

// Generate linking code for a user (useful for QR codes)
router.get('/linking-code/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user owns this account or is admin
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user already has telegram_id, return it as linking code
    if (user.telegram_id) {
      const linkingCode = `TG${user.telegram_id.toString().slice(-6).padStart(6, '0')}`;
      res.json({ 
        linkingCode,
        alreadyLinked: true
      });
    } else {
      // Generate a temporary linking code based on user ID
      const tempCode = `TG${userId.toString().padStart(6, '0')}`;
      res.json({ 
        linkingCode: tempCode,
        alreadyLinked: false,
        note: 'This code will be validated when user starts the bot'
      });
    }
  } catch (error) {
    console.error('Error generating linking code:', error);
    res.status(500).json({ error: 'Failed to generate linking code' });
  }
});

module.exports = router;