require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database initialization
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');
const calendarSyncRoutes = require('./routes/calendar-sync');
const tasksRoutes = require('./routes/tasks');
const mealsRoutes = require('./routes/meals');
const familyRoutes = require('./routes/family');
const aiRoutes = require('./routes/ai');
const checklistRoutes = require('./routes/checklists');
const telegramRoutes = require('./routes/telegram');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Family Symphony API'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/calendar-sync', calendarSyncRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/telegram', telegramRoutes);

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Join family room for real-time updates
  socket.on('join-family', (familyId) => {
    socket.join(`family-${familyId}`);
    console.log(`Socket ${socket.id} joined family-${familyId}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Scheduled tasks
// Morning brief at 6:30 AM
cron.schedule('30 6 * * *', async () => {
  console.log('Generating morning brief...');
  // TODO: Implement morning brief generation
});

// Telegram event reminders every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Checking for Telegram event reminders...');
  
  try {
    const telegramService = require('./services/telegram');
    
    // Get events starting within the next 30 minutes for users with Telegram notifications enabled
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    const upcomingEvents = db.prepare(`
      SELECT e.*, u.id as user_id, u.telegram_settings
      FROM events e
      JOIN users u ON e.created_by = u.id
      WHERE u.telegram_chat_id IS NOT NULL
      AND e.start_time BETWEEN ? AND ?
      AND e.start_time > ?
    `).all(
      now.toISOString(),
      reminderTime.toISOString(),
      now.toISOString()
    );

    console.log(`Found ${upcomingEvents.length} upcoming events for Telegram reminders`);

    for (const event of upcomingEvents) {
      try {
        // Check user's notification preferences
        const settings = event.telegram_settings ? JSON.parse(event.telegram_settings) : { notifications_enabled: true };
        
        if (settings.notifications_enabled) {
          await telegramService.sendEventReminder(event.user_id, event);
          
          // Log the notification
          db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, data, sent_via, sent_at)
            VALUES (?, 'event_reminder', ?, ?, ?, 'telegram', CURRENT_TIMESTAMP)
          `).run(
            event.user_id,
            'Event Reminder',
            `Reminder: ${event.title} starting in 30 minutes`,
            JSON.stringify({ event_id: event.id })
          );
        }
      } catch (error) {
        console.error(`Failed to send reminder for event ${event.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Telegram reminder scheduler error:', error);
  }
});

// Telegram task reminders every hour
cron.schedule('0 * * * *', async () => {
  console.log('Checking for Telegram task reminders...');
  
  try {
    const telegramService = require('./services/telegram');
    
    // Get tasks due today for users with Telegram notifications enabled
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const dueTasks = db.prepare(`
      SELECT t.*, u.id as user_id, u.telegram_settings
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      WHERE u.telegram_chat_id IS NOT NULL
      AND DATE(t.due_date) = ?
      AND t.status != 'completed'
      AND t.due_date > ?
    `).all(today, now.toISOString());

    console.log(`Found ${dueTasks.length} due tasks for Telegram reminders`);

    for (const task of dueTasks) {
      try {
        // Check user's notification preferences
        const settings = task.telegram_settings ? JSON.parse(task.telegram_settings) : { notifications_enabled: true };
        
        if (settings.notifications_enabled) {
          await telegramService.sendTaskReminder(task.user_id, task);
          
          // Log the notification
          db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, data, sent_via, sent_at)
            VALUES (?, 'task_reminder', ?, ?, ?, 'telegram', CURRENT_TIMESTAMP)
          `).run(
            task.user_id,
            'Task Reminder',
            `Reminder: ${task.title} is due today`,
            JSON.stringify({ task_id: task.id })
          );
        }
      } catch (error) {
        console.error(`Failed to send task reminder ${task.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Telegram task reminder scheduler error:', error);
  }
});

// Calendar sync every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Starting automated Google Calendar sync...');
  
  try {
    // Get all users with sync enabled
    const users = db.prepare(`
      SELECT id, username FROM users 
      WHERE sync_enabled = TRUE AND google_tokens != '{}'
    `).all();

    console.log(`Found ${users.length} users with sync enabled`);

    const googleCalendarService = require('./services/googleCalendar');

    for (const user of users) {
      try {
        console.log(`Syncing calendar for user: ${user.username} (${user.id})`);
        const syncResults = await googleCalendarService.syncCalendar(user.id);
        console.log(`Sync completed for user ${user.id}:`, {
          imported: syncResults.imported,
          updated: syncResults.updated,
          conflicts: syncResults.conflicts.length,
          errors: syncResults.errors.length
        });
      } catch (error) {
        console.error(`Sync failed for user ${user.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Automated sync error:', error);
  }
});

const PORT = process.env.PORT || 11001;

server.listen(PORT, () => {
  console.log(`Family Symphony server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});