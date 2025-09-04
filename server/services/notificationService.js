const db = require('../config/database');
const telegramService = require('./telegram');

class NotificationService {
  constructor() {
    this.telegramService = telegramService;
    console.log('Notification Service initialized');
  }

  // Get user notification preferences
  getUserNotificationPreferences(userId) {
    try {
      const prefs = db.prepare(`
        SELECT * FROM notification_preferences WHERE user_id = ?
      `).get(userId);
      
      if (!prefs) {
        // Create default preferences if none exist
        return this.createDefaultNotificationPreferences(userId);
      }
      
      return {
        ...prefs,
        channel_settings: JSON.parse(prefs.channel_settings || '{}'),
        time_preferences: JSON.parse(prefs.time_preferences || '{}'),
        priority_thresholds: JSON.parse(prefs.priority_thresholds || '{}'),
        quiet_hours: JSON.parse(prefs.quiet_hours || '{}'),
        notification_types: JSON.parse(prefs.notification_types || '{}')
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return this.createDefaultNotificationPreferences(userId);
    }
  }

  // Create default notification preferences
  createDefaultNotificationPreferences(userId) {
    const defaultPrefs = {
      user_id: userId,
      channel_settings: {
        push: true,
        sms: false,
        email: true,
        telegram: true
      },
      time_preferences: {
        morning_brief_time: "06:30",
        evening_prep_time: "20:00"
      },
      priority_thresholds: {
        minimal: 1,
        normal: 2,
        maximum: 3
      },
      quiet_hours: {
        enabled: true,
        start: "22:00",
        end: "07:00"
      },
      notification_types: {
        event_reminders: true,
        task_due: true,
        daily_brief: true,
        evening_prep: true,
        responsibility_alerts: true,
        handoff_notifications: true,
        urgent_alerts: true
      }
    };

    try {
      db.prepare(`
        INSERT OR REPLACE INTO notification_preferences 
        (user_id, channel_settings, time_preferences, priority_thresholds, quiet_hours, notification_types)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        JSON.stringify(defaultPrefs.channel_settings),
        JSON.stringify(defaultPrefs.time_preferences),
        JSON.stringify(defaultPrefs.priority_thresholds),
        JSON.stringify(defaultPrefs.quiet_hours),
        JSON.stringify(defaultPrefs.notification_types)
      );
      
      return defaultPrefs;
    } catch (error) {
      console.error('Error creating default notification preferences:', error);
      return defaultPrefs;
    }
  }

  // Update notification preferences
  updateNotificationPreferences(userId, preferences) {
    try {
      db.prepare(`
        UPDATE notification_preferences 
        SET channel_settings = ?, time_preferences = ?, priority_thresholds = ?, 
            quiet_hours = ?, notification_types = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        JSON.stringify(preferences.channel_settings),
        JSON.stringify(preferences.time_preferences),
        JSON.stringify(preferences.priority_thresholds),
        JSON.stringify(preferences.quiet_hours),
        JSON.stringify(preferences.notification_types),
        userId
      );
      
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  // Check if we're in quiet hours for a user
  isQuietHours(userId) {
    const prefs = this.getUserNotificationPreferences(userId);
    if (!prefs.quiet_hours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = parseInt(prefs.quiet_hours.start.replace(':', ''));
    const endTime = parseInt(prefs.quiet_hours.end.replace(':', ''));
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  // Send notification through appropriate channels
  async sendNotification(userId, notification) {
    const prefs = this.getUserNotificationPreferences(userId);
    
    // Skip if in quiet hours and not urgent
    if (this.isQuietHours(userId) && notification.priority !== 'urgent') {
      console.log(`Skipping notification for user ${userId} - quiet hours`);
      return false;
    }

    // Check if notification type is enabled
    if (!prefs.notification_types[notification.type]) {
      console.log(`Skipping notification for user ${userId} - type disabled: ${notification.type}`);
      return false;
    }

    const results = [];

    // Send via Telegram if enabled
    if (prefs.channel_settings.telegram) {
      try {
        const telegramResult = await this.sendTelegramNotification(userId, notification);
        results.push({ channel: 'telegram', success: telegramResult });
      } catch (error) {
        console.error('Telegram notification error:', error);
        results.push({ channel: 'telegram', success: false, error: error.message });
      }
    }

    // Send via push if enabled (web push notifications)
    if (prefs.channel_settings.push) {
      try {
        const pushResult = await this.sendPushNotification(userId, notification);
        results.push({ channel: 'push', success: pushResult });
      } catch (error) {
        console.error('Push notification error:', error);
        results.push({ channel: 'push', success: false, error: error.message });
      }
    }

    // Log notification to database
    await this.logNotification(userId, notification, results);

    return results;
  }

  // Send Telegram notification
  async sendTelegramNotification(userId, notification) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || !user.telegram_chat_id) {
      return false;
    }

    const message = this.formatNotificationMessage(notification);
    const options = {
      parse_mode: 'Markdown',
      reply_markup: notification.actions ? {
        inline_keyboard: notification.actions.map(action => [{
          text: action.text,
          callback_data: action.callback_data
        }])
      } : undefined
    };

    return await this.telegramService.sendMessage(user.telegram_chat_id, message, options);
  }

  // Send push notification via Web Push API
  async sendPushNotification(userId, notification) {
    try {
      // Get user's push subscriptions
      const subscriptions = db.prepare(`
        SELECT * FROM push_subscriptions WHERE user_id = ? AND active = 1
      `).all(userId);

      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return false;
      }

      const webpush = require('web-push');
      
      // Configure VAPID keys if available
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          'mailto:' + (process.env.VAPID_EMAIL || 'admin@familyplanner.com'),
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
      }

      const payload = {
        title: notification.title,
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: notification.data || {},
        actions: notification.actions || [],
        priority: notification.priority,
        tag: `family-planner-${notification.type}`,
        timestamp: Date.now()
      };

      const results = [];
      
      for (const subscription of subscriptions) {
        try {
          const subscriptionData = JSON.parse(subscription.subscription_data);
          
          await webpush.sendNotification(
            subscriptionData,
            JSON.stringify(payload)
          );
          
          results.push({ subscription_id: subscription.id, success: true });
          console.log(`Push notification sent successfully to subscription ${subscription.id}`);
        } catch (error) {
          console.error(`Failed to send push notification to subscription ${subscription.id}:`, error);
          
          results.push({ 
            subscription_id: subscription.id, 
            success: false, 
            error: error.message 
          });
          
          // Handle expired subscriptions
          if (error.statusCode === 410) {
            console.log(`Subscription ${subscription.id} expired, marking as inactive`);
            db.prepare('UPDATE push_subscriptions SET active = 0 WHERE id = ?')
              .run(subscription.id);
          }
        }
      }
      
      return results.some(r => r.success);
    } catch (error) {
      console.error('Push notification service error:', error);
      return false;
    }
  }

  // Log notification to database
  async logNotification(userId, notification, results) {
    try {
      const successfulChannels = results.filter(r => r.success).map(r => r.channel);
      
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data, sent_via, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        userId,
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify({
          priority: notification.priority,
          results: results,
          original_data: notification.data
        }),
        successfulChannels.join(',') || 'none'
      );
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  // Format notification message for display
  formatNotificationMessage(notification) {
    let message = `**${notification.title}**\n\n`;
    
    if (notification.message) {
      message += `${notification.message}\n\n`;
    }
    
    // Add priority indicator
    const priorityEmoji = {
      urgent: '🚨',
      high: '🔥',
      normal: 'ℹ️',
      low: '📝'
    };
    
    message += `${priorityEmoji[notification.priority] || 'ℹ️'} Priority: ${notification.priority}`;
    
    return message;
  }

  // Send daily brief notification
  async sendDailyBrief() {
    console.log('Generating daily briefs...');
    
    try {
      // Get all users who have daily brief enabled
      const users = db.prepare(`
        SELECT u.id, u.full_name, np.time_preferences 
        FROM users u
        JOIN notification_preferences np ON u.id = np.user_id
        WHERE JSON_EXTRACT(np.notification_types, '$.daily_brief') = 1
      `).all();

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      for (const user of users) {
        try {
          // Get today's events and tasks
          const events = db.prepare(`
            SELECT * FROM events 
            WHERE (created_by = ? OR assigned_to = ?) AND DATE(start_time) = ?
            ORDER BY start_time
          `).all(user.id, user.id, today);

          const tasks = db.prepare(`
            SELECT * FROM tasks 
            WHERE assigned_to = ? AND DATE(due_date) = ? AND status != 'completed'
            ORDER BY priority, due_date
          `).all(user.id, today);

          // Get unclaimed responsibilities
          const unclaimedEvents = db.prepare(`
            SELECT * FROM events 
            WHERE assignment_status = 'pending' AND DATE(start_time) = ?
          `).all(today);

          const briefData = {
            events: events,
            tasks: tasks,
            unclaimed: unclaimedEvents,
            date: today
          };

          const briefMessage = this.generateDailyBriefMessage(user.full_name, briefData);

          await this.sendNotification(user.id, {
            type: 'daily_brief',
            title: 'Good Morning! Your Daily Brief',
            message: briefMessage,
            priority: 'normal',
            data: briefData,
            actions: [
              { text: '📅 View Full Schedule', callback_data: 'today' },
              { text: '✅ View Tasks', callback_data: 'tasks' }
            ]
          });

        } catch (error) {
          console.error(`Error generating daily brief for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Daily brief generation error:', error);
    }
  }

  // Generate daily brief message
  generateDailyBriefMessage(userName, briefData) {
    let message = `Good morning, ${userName}!\n\n`;
    
    const totalItems = briefData.events.length + briefData.tasks.length;
    
    if (totalItems === 0) {
      message += '🌟 You have a peaceful day ahead! No scheduled events or urgent tasks.';
      return message;
    }

    message += `📊 **Today's Overview:**\n`;
    message += `• ${briefData.events.length} events scheduled\n`;
    message += `• ${briefData.tasks.length} tasks due\n`;
    
    if (briefData.unclaimed.length > 0) {
      message += `• ${briefData.unclaimed.length} events need assignment\n`;
    }
    
    message += '\n';

    // Show upcoming events
    if (briefData.events.length > 0) {
      message += '📅 **Today\'s Events:**\n';
      briefData.events.slice(0, 3).forEach(event => {
        const time = new Date(event.start_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        message += `• ${time} - ${event.title}\n`;
      });
      
      if (briefData.events.length > 3) {
        message += `... and ${briefData.events.length - 3} more events\n`;
      }
      message += '\n';
    }

    // Show high priority tasks
    const highPriorityTasks = briefData.tasks.filter(task => task.priority <= 2);
    if (highPriorityTasks.length > 0) {
      message += '🔥 **Priority Tasks:**\n';
      highPriorityTasks.slice(0, 3).forEach(task => {
        message += `• ${task.title}\n`;
      });
      message += '\n';
    }

    // Alert about unclaimed responsibilities
    if (briefData.unclaimed.length > 0) {
      message += '⚠️ **Action Needed:**\n';
      message += `${briefData.unclaimed.length} events need to be claimed by someone in the family.\n`;
    }

    message += 'Have a great day! 🌟';
    
    return message;
  }

  // Send evening preparation notification
  async sendEveningPrep() {
    console.log('Generating evening preparation notifications...');
    
    try {
      const users = db.prepare(`
        SELECT u.id, u.full_name, np.time_preferences 
        FROM users u
        JOIN notification_preferences np ON u.id = np.user_id
        WHERE JSON_EXTRACT(np.notification_types, '$.evening_prep') = 1
      `).all();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      for (const user of users) {
        try {
          // Get tomorrow's events and preparation items
          const events = db.prepare(`
            SELECT * FROM events 
            WHERE (created_by = ? OR assigned_to = ?) AND DATE(start_time) = ?
            ORDER BY start_time
          `).all(user.id, user.id, tomorrowStr);

          const prepData = {
            events: events,
            date: tomorrowStr
          };

          if (events.length === 0) {
            continue; // Skip if no events tomorrow
          }

          const prepMessage = this.generateEveningPrepMessage(user.full_name, prepData);

          await this.sendNotification(user.id, {
            type: 'evening_prep',
            title: 'Tomorrow\'s Preparation',
            message: prepMessage,
            priority: 'normal',
            data: prepData,
            actions: [
              { text: '📅 Tomorrow\'s Schedule', callback_data: 'tomorrow' },
              { text: '📋 View Checklists', callback_data: 'checklist' }
            ]
          });

        } catch (error) {
          console.error(`Error generating evening prep for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Evening prep generation error:', error);
    }
  }

  // Generate evening preparation message
  generateEveningPrepMessage(userName, prepData) {
    let message = `Good evening, ${userName}!\n\n`;
    message += `🌙 **Tomorrow's Preparation**\n\n`;
    
    // Show tomorrow's events
    message += '📅 **Tomorrow\'s Schedule:**\n';
    prepData.events.forEach(event => {
      const time = new Date(event.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      message += `• ${time} - ${event.title}\n`;
      if (event.location) {
        message += `  📍 ${event.location}\n`;
      }
    });
    
    message += '\n';

    // Show preparation items if any
    const eventsWithPrep = prepData.events.filter(event => {
      try {
        const prepList = JSON.parse(event.preparation_list || '[]');
        return prepList.length > 0;
      } catch {
        return false;
      }
    });

    if (eventsWithPrep.length > 0) {
      message += '📋 **Preparation Reminders:**\n';
      eventsWithPrep.forEach(event => {
        try {
          const prepList = JSON.parse(event.preparation_list || '[]');
          message += `**${event.title}:**\n`;
          prepList.slice(0, 3).forEach(item => {
            message += `  • ${item}\n`;
          });
          if (prepList.length > 3) {
            message += `  ... and ${prepList.length - 3} more items\n`;
          }
        } catch (error) {
          console.error('Error parsing preparation list:', error);
        }
      });
      message += '\n';
    }

    message += 'Sleep well and be prepared for tomorrow! 😴';
    
    return message;
  }

  // Send responsibility alert for unclaimed events
  async sendResponsibilityAlert() {
    console.log('Checking for unclaimed responsibilities...');
    
    try {
      // Get events that need assignment (next 24 hours)
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const unclaimedEvents = db.prepare(`
        SELECT * FROM events 
        WHERE assignment_status = 'pending' 
        AND start_time BETWEEN ? AND ?
        ORDER BY start_time
      `).all(now.toISOString(), next24Hours.toISOString());

      if (unclaimedEvents.length === 0) {
        return;
      }

      // Get all family users
      const users = db.prepare(`
        SELECT u.id, u.full_name 
        FROM users u
        JOIN notification_preferences np ON u.id = np.user_id
        WHERE JSON_EXTRACT(np.notification_types, '$.responsibility_alerts') = 1
      `).all();

      for (const user of users) {
        const alertMessage = this.generateResponsibilityAlertMessage(unclaimedEvents);

        await this.sendNotification(user.id, {
          type: 'responsibility_alerts',
          title: 'Events Need Assignment',
          message: alertMessage,
          priority: 'high',
          data: { unclaimed_events: unclaimedEvents },
          actions: [
            { text: '👥 View Events', callback_data: 'today' },
            { text: '✋ Claim Responsibility', callback_data: 'claim_event' }
          ]
        });
      }
    } catch (error) {
      console.error('Responsibility alert error:', error);
    }
  }

  // Generate responsibility alert message
  generateResponsibilityAlertMessage(unclaimedEvents) {
    let message = '⚠️ **Family Events Need Assignment**\n\n';
    
    message += `${unclaimedEvents.length} upcoming events need someone to take responsibility:\n\n`;
    
    unclaimedEvents.slice(0, 5).forEach(event => {
      const time = new Date(event.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const date = new Date(event.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      message += `• **${event.title}** - ${date} at ${time}\n`;
      if (event.location) {
        message += `  📍 ${event.location}\n`;
      }
    });
    
    if (unclaimedEvents.length > 5) {
      message += `... and ${unclaimedEvents.length - 5} more events\n`;
    }
    
    message += '\n';
    message += 'Please claim responsibility to ensure smooth family coordination! 👨‍👩‍👧‍👦';
    
    return message;
  }

  // Send handoff notification when event is reassigned
  async sendHandoffNotification(eventId, fromUserId, toUserId) {
    try {
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
      const fromUser = db.prepare('SELECT full_name FROM users WHERE id = ?').get(fromUserId);
      const toUser = db.prepare('SELECT full_name FROM users WHERE id = ?').get(toUserId);
      
      if (!event || !fromUser || !toUser) {
        console.error('Missing data for handoff notification');
        return;
      }

      const message = `🔄 **Event Responsibility Handoff**\n\n` +
        `**${event.title}** has been transferred from ${fromUser.full_name} to you.\n\n` +
        `📅 Date: ${new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n` +
        `🕐 Time: ${new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}\n` +
        `📍 Location: ${event.location || 'TBD'}\n\n` +
        `Please review the event details and preparation requirements.`;

      await this.sendNotification(toUserId, {
        type: 'handoff_notifications',
        title: 'Event Assigned to You',
        message: message,
        priority: 'high',
        data: { event_id: eventId, from_user_id: fromUserId },
        actions: [
          { text: '📋 View Event Details', callback_data: `event_${eventId}` },
          { text: '✅ Acknowledge', callback_data: `ack_handoff_${eventId}` }
        ]
      });

      // Log the handoff
      db.prepare(`
        UPDATE events 
        SET handoff_history = JSON_INSERT(
          COALESCE(handoff_history, '[]'),
          '$[#]',
          JSON_OBJECT('from', ?, 'to', ?, 'timestamp', ?)
        )
        WHERE id = ?
      `).run(fromUserId, toUserId, new Date().toISOString(), eventId);

    } catch (error) {
      console.error('Handoff notification error:', error);
    }
  }

  // Send urgent alert
  async sendUrgentAlert(userId, title, message, data = {}) {
    await this.sendNotification(userId, {
      type: 'urgent_alerts',
      title: title,
      message: message,
      priority: 'urgent',
      data: data
    });
  }

  // Get user notifications (for notification center)
  getUserNotifications(userId, limit = 50, unreadOnly = false) {
    try {
      let query = `
        SELECT * FROM notifications 
        WHERE user_id = ?
      `;
      
      if (unreadOnly) {
        query += ' AND read_at IS NULL';
      }
      
      query += ' ORDER BY created_at DESC LIMIT ?';
      
      return db.prepare(query).all(userId, limit);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  markNotificationAsRead(notificationId, userId) {
    try {
      db.prepare(`
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND user_id = ?
      `).run(notificationId, userId);
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read for user
  markAllNotificationsAsRead(userId) {
    try {
      db.prepare(`
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND read_at IS NULL
      `).run(userId);
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Get notification statistics
  getNotificationStats(userId) {
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(userId);
      const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL').get(userId);
      const today = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND DATE(created_at) = DATE(?)').get(userId, new Date().toISOString());
      
      return {
        total: total.count,
        unread: unread.count,
        today: today.count
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, unread: 0, today: 0 };
    }
  }

  // Test notification
  async sendTestNotification(userId) {
    return await this.sendNotification(userId, {
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification to verify your settings are working correctly.',
      priority: 'normal',
      data: { test: true }
    });
  }

  // Push subscription management
  subscribeToPush(userId, subscriptionData, userAgent = null) {
    try {
      const endpoint = subscriptionData.endpoint;
      
      // Check if subscription already exists
      const existing = db.prepare(`
        SELECT id FROM push_subscriptions 
        WHERE user_id = ? AND endpoint = ?
      `).get(userId, endpoint);
      
      if (existing) {
        // Update existing subscription
        db.prepare(`
          UPDATE push_subscriptions 
          SET subscription_data = ?, user_agent = ?, active = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(subscriptionData), userAgent, existing.id);
        
        console.log(`Updated push subscription for user ${userId}`);
        return existing.id;
      } else {
        // Create new subscription
        const result = db.prepare(`
          INSERT INTO push_subscriptions (user_id, subscription_data, endpoint, user_agent)
          VALUES (?, ?, ?, ?)
        `).run(userId, JSON.stringify(subscriptionData), endpoint, userAgent);
        
        console.log(`Created new push subscription for user ${userId}`);
        return result.lastInsertRowid;
      }
    } catch (error) {
      console.error('Error managing push subscription:', error);
      throw error;
    }
  }

  unsubscribeFromPush(userId, subscriptionData) {
    try {
      const endpoint = subscriptionData.endpoint;
      
      const result = db.prepare(`
        UPDATE push_subscriptions 
        SET active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND endpoint = ?
      `).run(userId, endpoint);
      
      console.log(`Unsubscribed push notification for user ${userId}`);
      return result.changes > 0;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  getPushSubscriptions(userId) {
    try {
      return db.prepare(`
        SELECT * FROM push_subscriptions 
        WHERE user_id = ? AND active = 1
        ORDER BY created_at DESC
      `).all(userId);
    } catch (error) {
      console.error('Error getting push subscriptions:', error);
      return [];
    }
  }
}

module.exports = new NotificationService();