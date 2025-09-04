const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const { body, validationResult } = require('express-validator');

// Get user notification preferences
router.get('/preferences', auth, (req, res) => {
  try {
    const preferences = notificationService.getUserNotificationPreferences(req.user.id);
    res.json(preferences);
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user notification preferences
router.put('/preferences', [
  auth,
  body('channel_settings').isObject().withMessage('Channel settings must be an object'),
  body('time_preferences').isObject().withMessage('Time preferences must be an object'),
  body('priority_thresholds').isObject().withMessage('Priority thresholds must be an object'),
  body('quiet_hours').isObject().withMessage('Quiet hours must be an object'),
  body('notification_types').isObject().withMessage('Notification types must be an object')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const success = notificationService.updateNotificationPreferences(req.user.id, req.body);
    
    if (success) {
      const updatedPrefs = notificationService.getUserNotificationPreferences(req.user.id);
      res.json(updatedPrefs);
    } else {
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user notifications
router.get('/', auth, (req, res) => {
  try {
    const { limit = 50, unread_only = false } = req.query;
    const notifications = notificationService.getUserNotifications(
      req.user.id, 
      parseInt(limit), 
      unread_only === 'true'
    );
    
    // Parse JSON data fields
    notifications.forEach(notification => {
      try {
        notification.data = JSON.parse(notification.data);
      } catch {
        notification.data = {};
      }
    });
    
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', auth, (req, res) => {
  try {
    const success = notificationService.markNotificationAsRead(req.params.id, req.user.id);
    
    if (success) {
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(404).json({ message: 'Notification not found or already read' });
    }
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, (req, res) => {
  try {
    const success = notificationService.markAllNotificationsAsRead(req.user.id);
    
    if (success) {
      res.json({ message: 'All notifications marked as read' });
    } else {
      res.status(500).json({ message: 'Failed to mark notifications as read' });
    }
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get notification statistics
router.get('/stats', auth, (req, res) => {
  try {
    const stats = notificationService.getNotificationStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send test notification
router.post('/test', auth, (req, res) => {
  try {
    notificationService.sendTestNotification(req.user.id);
    res.json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Trigger manual daily brief (for testing)
router.post('/daily-brief', auth, async (req, res) => {
  try {
    await notificationService.sendDailyBrief();
    res.json({ message: 'Daily brief sent to all users' });
  } catch (error) {
    console.error('Manual daily brief error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Trigger manual evening prep (for testing)
router.post('/evening-prep', auth, async (req, res) => {
  try {
    await notificationService.sendEveningPrep();
    res.json({ message: 'Evening prep notifications sent to all users' });
  } catch (error) {
    console.error('Manual evening prep error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Trigger responsibility alert (for testing)
router.post('/responsibility-alert', auth, async (req, res) => {
  try {
    await notificationService.sendResponsibilityAlert();
    res.json({ message: 'Responsibility alerts sent to all users' });
  } catch (error) {
    console.error('Manual responsibility alert error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send urgent alert
router.post('/urgent', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('target_user_id').optional().isInt().withMessage('Target user ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, message, target_user_id, data = {} } = req.body;
    const userId = target_user_id || req.user.id;

    await notificationService.sendUrgentAlert(userId, title, message, data);
    res.json({ message: 'Urgent alert sent' });
  } catch (error) {
    console.error('Send urgent alert error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle event handoff notification
router.post('/handoff', [
  auth,
  body('event_id').isInt().withMessage('Event ID is required'),
  body('to_user_id').isInt().withMessage('Target user ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { event_id, to_user_id } = req.body;
    
    await notificationService.sendHandoffNotification(event_id, req.user.id, to_user_id);
    res.json({ message: 'Handoff notification sent' });
  } catch (error) {
    console.error('Send handoff notification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Subscribe to push notifications
router.post('/subscribe', [
  auth,
  body('subscription').isObject().withMessage('Subscription object is required'),
  body('subscription.endpoint').notEmpty().withMessage('Subscription endpoint is required'),
  body('userAgent').optional().isString()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subscription, userAgent } = req.body;
    
    const subscriptionId = notificationService.subscribeToPush(
      req.user.id, 
      subscription, 
      userAgent
    );
    
    res.json({ 
      message: 'Push subscription saved successfully',
      subscriptionId: subscriptionId 
    });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Unsubscribe from push notifications
router.delete('/unsubscribe', [
  auth,
  body('subscription').isObject().withMessage('Subscription object is required'),
  body('subscription.endpoint').notEmpty().withMessage('Subscription endpoint is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subscription } = req.body;
    
    const success = notificationService.unsubscribeFromPush(req.user.id, subscription);
    
    if (success) {
      res.json({ message: 'Push subscription removed successfully' });
    } else {
      res.status(404).json({ message: 'Subscription not found' });
    }
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get push subscriptions
router.get('/subscriptions', auth, (req, res) => {
  try {
    const subscriptions = notificationService.getPushSubscriptions(req.user.id);
    
    // Don't expose sensitive subscription data
    const safeSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      endpoint: sub.endpoint,
      user_agent: sub.user_agent,
      active: sub.active,
      created_at: sub.created_at,
      updated_at: sub.updated_at
    }));
    
    res.json(safeSubscriptions);
  } catch (error) {
    console.error('Get push subscriptions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;