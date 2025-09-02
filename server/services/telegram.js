const TelegramBot = require('node-telegram-bot-api');
const db = require('../config/database');

class TelegramBotService {
  constructor() {
    this.bot = null;
    this.mockMode = false;
    this.init();
  }

  init() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      console.log('⚠️  Telegram bot token not found. Running in mock mode.');
      this.mockMode = true;
      return;
    }

    try {
      this.bot = new TelegramBot(token, { 
        polling: process.env.NODE_ENV === 'development',
        webHook: process.env.NODE_ENV === 'production'
      });

      if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
        this.setupWebhook();
      }

      this.setupCommandHandlers();
      this.setupMessageHandlers();
      
      console.log('✅ Telegram bot service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Telegram bot:', error.message);
      this.mockMode = true;
    }
  }

  async setupWebhook() {
    try {
      const webhookUrl = `${process.env.WEBHOOK_URL}/api/telegram/webhook`;
      await this.bot.setWebHook(webhookUrl);
      console.log(`📡 Webhook set to: ${webhookUrl}`);
    } catch (error) {
      console.error('Failed to set webhook:', error.message);
    }
  }

  setupCommandHandlers() {
    if (this.mockMode) return;

    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    // Today's schedule
    this.bot.onText(/\/today/, async (msg) => {
      await this.handleTodaySchedule(msg);
    });

    // Tomorrow's schedule
    this.bot.onText(/\/tomorrow/, async (msg) => {
      await this.handleTomorrowSchedule(msg);
    });

    // Week overview
    this.bot.onText(/\/week/, async (msg) => {
      await this.handleWeekOverview(msg);
    });

    // Tasks
    this.bot.onText(/\/tasks/, async (msg) => {
      await this.handleTasks(msg);
    });

    // Checklists
    this.bot.onText(/\/checklist/, async (msg) => {
      await this.handleChecklists(msg);
    });

    // Add item
    this.bot.onText(/\/add (.+)/, async (msg, match) => {
      await this.handleAddItem(msg, match[1]);
    });

    // Help
    this.bot.onText(/\/help/, async (msg) => {
      await this.handleHelp(msg);
    });
  }

  setupMessageHandlers() {
    if (this.mockMode) return;

    // Handle natural language queries
    this.bot.on('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        await this.handleNaturalLanguage(msg);
      }
    });

    // Handle callback queries (inline keyboard responses)
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const user = msg.from;

    try {
      // Check if user exists and link Telegram account
      const dbUser = this.findUserByTelegramId(user.id);
      
      if (dbUser) {
        // Update chat ID
        this.updateUserTelegramChatId(dbUser.id, chatId);
        
        const welcomeMessage = `🎉 Welcome back, ${dbUser.full_name}!\n\n` +
          `Your Telegram account is now linked to Family Symphony. You'll receive notifications and can interact with your family schedule right here.\n\n` +
          `Try these commands:\n` +
          `• /today - See today's schedule\n` +
          `• /tomorrow - See tomorrow's schedule\n` +
          `• /tasks - View your tasks\n` +
          `• /help - See all commands`;

        await this.sendMessage(chatId, welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📅 Today\'s Schedule', callback_data: 'today' }],
              [{ text: '✅ My Tasks', callback_data: 'tasks' }],
              [{ text: '🗓️ This Week', callback_data: 'week' }]
            ]
          }
        });
      } else {
        const linkingMessage = `👋 Hello! I'm JJ, your Family Symphony assistant!\n\n` +
          `To get started, you need to link your Telegram account with your Family Symphony account.\n\n` +
          `Here's your unique linking code: \`${this.generateLinkingCode(user.id)}\`\n\n` +
          `Please enter this code in your Family Symphony app settings under "Telegram Integration".`;

        await this.sendMessage(chatId, linkingMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❓ Need Help?', callback_data: 'help_linking' }]
            ]
          }
        });
      }
    } catch (error) {
      console.error('Error in handleStart:', error);
      await this.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again later.');
    }
  }

  async handleTodaySchedule(msg) {
    const chatId = msg.chat.id;
    const user = this.getUserByChatId(chatId);

    if (!user) {
      await this.sendMessage(chatId, '🔗 Please link your account first using /start');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const events = this.getTodayEvents(user.id, today);
      const tasks = this.getTodayTasks(user.id, today);

      if (events.length === 0 && tasks.length === 0) {
        await this.sendMessage(chatId, '🌟 You have a free day today! No scheduled events or urgent tasks.');
        return;
      }

      let message = `📅 **Today's Schedule** (${this.formatDate(today)})\n\n`;

      if (events.length > 0) {
        message += '🗓️ **Events:**\n';
        events.forEach(event => {
          message += `• ${this.formatTime(event.start_time)} - ${event.title}\n`;
          if (event.location) message += `  📍 ${event.location}\n`;
        });
        message += '\n';
      }

      if (tasks.length > 0) {
        message += '✅ **Tasks Due Today:**\n';
        tasks.forEach(task => {
          message += `• ${task.title}\n`;
        });
      }

      await this.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Tomorrow', callback_data: 'tomorrow' }],
            [{ text: '🗓️ This Week', callback_data: 'week' }],
            [{ text: '✅ All Tasks', callback_data: 'tasks' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in handleTodaySchedule:', error);
      await this.sendMessage(chatId, '❌ Error fetching today\'s schedule. Please try again.');
    }
  }

  async handleTomorrowSchedule(msg) {
    const chatId = msg.chat.id;
    const user = this.getUserByChatId(chatId);

    if (!user) {
      await this.sendMessage(chatId, '🔗 Please link your account first using /start');
      return;
    }

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const events = this.getTodayEvents(user.id, tomorrowStr);
      const tasks = this.getTodayTasks(user.id, tomorrowStr);

      if (events.length === 0 && tasks.length === 0) {
        await this.sendMessage(chatId, '🌟 Tomorrow looks free! No scheduled events or urgent tasks.');
        return;
      }

      let message = `📅 **Tomorrow's Schedule** (${this.formatDate(tomorrowStr)})\n\n`;

      if (events.length > 0) {
        message += '🗓️ **Events:**\n';
        events.forEach(event => {
          message += `• ${this.formatTime(event.start_time)} - ${event.title}\n`;
          if (event.location) message += `  📍 ${event.location}\n`;
        });
        message += '\n';
      }

      if (tasks.length > 0) {
        message += '✅ **Tasks Due Tomorrow:**\n';
        tasks.forEach(task => {
          message += `• ${task.title}\n`;
        });
      }

      await this.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Today', callback_data: 'today' }],
            [{ text: '🗓️ This Week', callback_data: 'week' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in handleTomorrowSchedule:', error);
      await this.sendMessage(chatId, '❌ Error fetching tomorrow\'s schedule. Please try again.');
    }
  }

  async handleWeekOverview(msg) {
    const chatId = msg.chat.id;
    const user = this.getUserByChatId(chatId);

    if (!user) {
      await this.sendMessage(chatId, '🔗 Please link your account first using /start');
      return;
    }

    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      const events = this.getWeekEvents(user.id, startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]);
      const tasks = this.getWeekTasks(user.id, startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]);

      let message = `🗓️ **This Week's Overview**\n${this.formatDate(startOfWeek.toISOString().split('T')[0])} - ${this.formatDate(endOfWeek.toISOString().split('T')[0])}\n\n`;

      if (events.length === 0 && tasks.length === 0) {
        message += '🌟 You have a peaceful week ahead!';
      } else {
        message += `📊 **Summary:**\n`;
        message += `• ${events.length} events scheduled\n`;
        message += `• ${tasks.length} tasks to complete\n\n`;

        // Group events by day
        const eventsByDay = {};
        events.forEach(event => {
          const day = event.start_time.split('T')[0];
          if (!eventsByDay[day]) eventsByDay[day] = [];
          eventsByDay[day].push(event);
        });

        Object.keys(eventsByDay).sort().forEach(day => {
          message += `**${this.formatDate(day)}:**\n`;
          eventsByDay[day].forEach(event => {
            message += `• ${this.formatTime(event.start_time)} - ${event.title}\n`;
          });
          message += '\n';
        });
      }

      await this.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Today', callback_data: 'today' }],
            [{ text: '📅 Tomorrow', callback_data: 'tomorrow' }],
            [{ text: '✅ Tasks', callback_data: 'tasks' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in handleWeekOverview:', error);
      await this.sendMessage(chatId, '❌ Error fetching week overview. Please try again.');
    }
  }

  async handleTasks(msg) {
    const chatId = msg.chat.id;
    const user = this.getUserByChatId(chatId);

    if (!user) {
      await this.sendMessage(chatId, '🔗 Please link your account first using /start');
      return;
    }

    try {
      const tasks = this.getUserTasks(user.id);

      if (tasks.length === 0) {
        await this.sendMessage(chatId, '🎉 All caught up! You have no pending tasks.');
        return;
      }

      let message = `✅ **Your Tasks**\n\n`;

      const tasksByPriority = {
        1: [], // High
        2: [], // Medium
        3: []  // Low
      };

      tasks.forEach(task => {
        tasksByPriority[task.priority || 3].push(task);
      });

      ['1', '2', '3'].forEach(priority => {
        if (tasksByPriority[priority].length > 0) {
          const priorityLabel = { '1': '🔥 High', '2': '📋 Medium', '3': '📝 Low' }[priority];
          message += `**${priorityLabel} Priority:**\n`;
          
          tasksByPriority[priority].forEach(task => {
            message += `• ${task.title}`;
            if (task.due_date) {
              message += ` (Due: ${this.formatDate(task.due_date.split('T')[0])})`;
            }
            message += '\n';
          });
          message += '\n';
        }
      });

      await this.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Today', callback_data: 'today' }],
            [{ text: '🗓️ This Week', callback_data: 'week' }],
            [{ text: '📝 Add Task', callback_data: 'add_task' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in handleTasks:', error);
      await this.sendMessage(chatId, '❌ Error fetching tasks. Please try again.');
    }
  }

  async handleChecklists(msg) {
    const chatId = msg.chat.id;
    const user = this.getUserByChatId(chatId);

    if (!user) {
      await this.sendMessage(chatId, '🔗 Please link your account first using /start');
      return;
    }

    try {
      const checklists = this.getActiveChecklists(user.id);

      if (checklists.length === 0) {
        await this.sendMessage(chatId, '📋 No active checklists at the moment.');
        return;
      }

      let message = `📋 **Active Checklists**\n\n`;

      checklists.forEach(checklist => {
        message += `**${checklist.title}**\n`;
        message += `Progress: ${Math.round(checklist.completion_percentage)}%\n\n`;
      });

      await this.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Today', callback_data: 'today' }],
            [{ text: '✅ Tasks', callback_data: 'tasks' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in handleChecklists:', error);
      await this.sendMessage(chatId, '❌ Error fetching checklists. Please try again.');
    }
  }

  async handleAddItem(msg, text) {
    const chatId = msg.chat.id;
    const user = this.getUserByChatId(chatId);

    if (!user) {
      await this.sendMessage(chatId, '🔗 Please link your account first using /start');
      return;
    }

    try {
      // Simple task creation
      const taskId = this.createQuickTask(user.id, text.trim());
      
      if (taskId) {
        await this.sendMessage(chatId, `✅ Added task: "${text.trim()}"`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ View All Tasks', callback_data: 'tasks' }]
            ]
          }
        });
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Error in handleAddItem:', error);
      await this.sendMessage(chatId, '❌ Sorry, couldn\'t add that item. Please try again.');
    }
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    
    const helpMessage = `🤖 **JJ - Your Family Symphony Assistant**\n\n` +
      `**Commands:**\n` +
      `• /today - Today's schedule\n` +
      `• /tomorrow - Tomorrow's schedule\n` +
      `• /week - This week's overview\n` +
      `• /tasks - View your tasks\n` +
      `• /checklist - Active checklists\n` +
      `• /add [text] - Quick add task/reminder\n` +
      `• /help - Show this help\n\n` +
      `**Natural Language:**\n` +
      `You can also just type questions like:\n` +
      `• "What's on today?"\n` +
      `• "When is soccer practice?"\n` +
      `• "Add reminder to pack lunch"\n\n` +
      `**Notifications:**\n` +
      `I'll send you reminders 30 minutes before events and for important tasks.`;

    await this.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Today', callback_data: 'today' }],
          [{ text: '✅ Tasks', callback_data: 'tasks' }]
        ]
      }
    });
  }

  async handleNaturalLanguage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();
    const user = this.getUserByChatId(chatId);

    if (!user) {
      await this.sendMessage(chatId, '🔗 Please link your account first using /start');
      return;
    }

    // Simple natural language processing
    if (text.includes('today') || text.includes('what\'s on today')) {
      await this.handleTodaySchedule(msg);
    } else if (text.includes('tomorrow')) {
      await this.handleTomorrowSchedule(msg);
    } else if (text.includes('week')) {
      await this.handleWeekOverview(msg);
    } else if (text.includes('task')) {
      await this.handleTasks(msg);
    } else if (text.includes('add') && (text.includes('reminder') || text.includes('task'))) {
      // Extract the reminder text
      const reminderText = text.replace(/add\s+(reminder\s+to\s+|task\s+to\s+)?/, '').trim();
      await this.handleAddItem(msg, reminderText);
    } else {
      // Default response with helpful suggestions
      await this.sendMessage(chatId, `🤔 I'm not sure what you mean. Try one of these:\n\n` +
        `• "What's on today?"\n` +
        `• "Show me tomorrow's schedule"\n` +
        `• "What tasks do I have?"\n` +
        `• "Add reminder to pack lunch"\n\n` +
        `Or use /help to see all commands.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Today', callback_data: 'today' }],
            [{ text: '✅ Tasks', callback_data: 'tasks' }],
            [{ text: '❓ Help', callback_data: 'help' }]
          ]
        }
      });
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Answer the callback query to remove the loading state
    await this.bot.answerCallbackQuery(callbackQuery.id);

    // Handle the callback
    switch (data) {
      case 'today':
        await this.handleTodaySchedule({ chat: { id: chatId } });
        break;
      case 'tomorrow':
        await this.handleTomorrowSchedule({ chat: { id: chatId } });
        break;
      case 'week':
        await this.handleWeekOverview({ chat: { id: chatId } });
        break;
      case 'tasks':
        await this.handleTasks({ chat: { id: chatId } });
        break;
      case 'help':
        await this.handleHelp({ chat: { id: chatId } });
        break;
      case 'help_linking':
        await this.sendMessage(chatId, `🔗 **Linking Your Account**\n\n` +
          `1. Open your Family Symphony app\n` +
          `2. Go to Settings\n` +
          `3. Find "Telegram Integration"\n` +
          `4. Enter the linking code I provided\n` +
          `5. Come back here and try /start again\n\n` +
          `Need more help? Contact your family admin!`, {
          parse_mode: 'Markdown'
        });
        break;
    }
  }

  // Database helper methods
  findUserByTelegramId(telegramId) {
    try {
      return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId.toString());
    } catch (error) {
      console.error('Error finding user by telegram ID:', error);
      return null;
    }
  }

  getUserByChatId(chatId) {
    try {
      return db.prepare('SELECT * FROM users WHERE telegram_chat_id = ?').get(chatId.toString());
    } catch (error) {
      console.error('Error getting user by chat ID:', error);
      return null;
    }
  }

  updateUserTelegramChatId(userId, chatId) {
    try {
      db.prepare('UPDATE users SET telegram_chat_id = ? WHERE id = ?').run(chatId.toString(), userId);
      return true;
    } catch (error) {
      console.error('Error updating telegram chat ID:', error);
      return false;
    }
  }

  getTodayEvents(userId, date) {
    try {
      return db.prepare(`
        SELECT * FROM events 
        WHERE created_by = ? AND DATE(start_time) = ? 
        ORDER BY start_time
      `).all(userId, date);
    } catch (error) {
      console.error('Error getting today events:', error);
      return [];
    }
  }

  getTodayTasks(userId, date) {
    try {
      return db.prepare(`
        SELECT * FROM tasks 
        WHERE assigned_to = ? AND DATE(due_date) = ? AND status != 'completed'
        ORDER BY priority, due_date
      `).all(userId, date);
    } catch (error) {
      console.error('Error getting today tasks:', error);
      return [];
    }
  }

  getWeekEvents(userId, startDate, endDate) {
    try {
      return db.prepare(`
        SELECT * FROM events 
        WHERE created_by = ? AND DATE(start_time) BETWEEN ? AND ?
        ORDER BY start_time
      `).all(userId, startDate, endDate);
    } catch (error) {
      console.error('Error getting week events:', error);
      return [];
    }
  }

  getWeekTasks(userId, startDate, endDate) {
    try {
      return db.prepare(`
        SELECT * FROM tasks 
        WHERE assigned_to = ? AND DATE(due_date) BETWEEN ? AND ? AND status != 'completed'
        ORDER BY due_date, priority
      `).all(userId, startDate, endDate);
    } catch (error) {
      console.error('Error getting week tasks:', error);
      return [];
    }
  }

  getUserTasks(userId) {
    try {
      return db.prepare(`
        SELECT * FROM tasks 
        WHERE assigned_to = ? AND status != 'completed'
        ORDER BY priority, due_date
      `).all(userId);
    } catch (error) {
      console.error('Error getting user tasks:', error);
      return [];
    }
  }

  getActiveChecklists(userId) {
    try {
      return db.prepare(`
        SELECT * FROM checklist_instances 
        WHERE created_by = ? AND status = 'active'
        ORDER BY created_at DESC
      `).all(userId);
    } catch (error) {
      console.error('Error getting active checklists:', error);
      return [];
    }
  }

  createQuickTask(userId, title) {
    try {
      const result = db.prepare(`
        INSERT INTO tasks (title, assigned_to, created_by, status, priority)
        VALUES (?, ?, ?, 'pending', 3)
      `).run(title, userId, userId);
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Error creating quick task:', error);
      return null;
    }
  }

  generateLinkingCode(telegramId) {
    // Generate a simple linking code based on telegram ID
    const code = `TG${telegramId.toString().slice(-6).padStart(6, '0')}`;
    return code;
  }

  // Notification methods
  async sendEventReminder(userId, event) {
    const user = this.getUserById(userId);
    if (!user || !user.telegram_chat_id) return false;

    const message = `🔔 **Upcoming Event Reminder**\n\n` +
      `📅 **${event.title}**\n` +
      `🕐 ${this.formatTime(event.start_time)}\n` +
      `📍 ${event.location || 'No location specified'}\n\n` +
      `Starting in 30 minutes!`;

    return await this.sendMessage(user.telegram_chat_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Today\'s Schedule', callback_data: 'today' }]
        ]
      }
    });
  }

  async sendTaskReminder(userId, task) {
    const user = this.getUserById(userId);
    if (!user || !user.telegram_chat_id) return false;

    const message = `⏰ **Task Reminder**\n\n` +
      `✅ **${task.title}**\n` +
      `📅 Due: ${this.formatDate(task.due_date.split('T')[0])}\n\n` +
      `Don't forget to complete this task!`;

    return await this.sendMessage(user.telegram_chat_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ View All Tasks', callback_data: 'tasks' }]
        ]
      }
    });
  }

  getUserById(userId) {
    try {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Utility methods
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  async sendMessage(chatId, text, options = {}) {
    if (this.mockMode) {
      console.log(`[MOCK] Telegram message to ${chatId}:`, text);
      return { message_id: Date.now(), chat: { id: chatId } };
    }

    try {
      return await this.bot.sendMessage(chatId, text, options);
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return null;
    }
  }

  // Webhook handler for production
  async processUpdate(update) {
    if (this.mockMode) {
      console.log('[MOCK] Processing webhook update:', update);
      return;
    }

    try {
      await this.bot.processUpdate(update);
    } catch (error) {
      console.error('Error processing webhook update:', error);
    }
  }

  // Link user account with Telegram
  async linkUserAccount(userId, linkingCode) {
    try {
      // Extract telegram ID from linking code
      const telegramId = linkingCode.replace('TG', '');
      
      // Update user record
      db.prepare('UPDATE users SET telegram_id = ? WHERE id = ?').run(telegramId, userId);
      return true;
    } catch (error) {
      console.error('Error linking user account:', error);
      return false;
    }
  }

  // Send test message
  async sendTestMessage(userId) {
    const user = this.getUserById(userId);
    if (!user || !user.telegram_chat_id) {
      throw new Error('User not linked to Telegram');
    }

    const message = `🧪 **Test Message**\n\n` +
      `Hello ${user.full_name}! Your Telegram integration is working perfectly.\n\n` +
      `You'll receive notifications for:\n` +
      `• Upcoming events (30 min before)\n` +
      `• Task reminders\n` +
      `• Important family updates`;

    return await this.sendMessage(user.telegram_chat_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Today\'s Schedule', callback_data: 'today' }]
        ]
      }
    });
  }
}

module.exports = new TelegramBotService();