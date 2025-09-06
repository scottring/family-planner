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
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
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
const googleCalendarRoutes = require('./routes/googleCalendar');
const notificationRoutes = require('./routes/notifications');
const conflictRoutes = require('./routes/conflicts');
const dashboardRoutes = require('./routes/dashboard');
const inboxRoutes = require('./routes/inbox');
const planningSessionRoutes = require('./routes/planning');
const captureRoutes = require('./routes/capture');
const familyNotesRoutes = require('./routes/family-notes');
const handoffsRoutes = require('./routes/handoffs');
const calendarAccountsRoutes = require('./routes/calendar-accounts');
const checklistTemplateRoutes = require('./routes/checklist-templates');
const timelineTemplateRoutes = require('./routes/timeline-templates');
const timelineSuggestionsRoutes = require('./routes/timeline-suggestions');
const voiceTimelineRoutes = require('./routes/voice-timeline');
const eventTemplateRoutes = require('./routes/event-templates');
const templatesRoutes = require('./routes/templates');
const addressRoutes = require('./routes/addresses');

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
app.use('/api/google', googleCalendarRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/planning-session', planningSessionRoutes);
app.use('/api/capture', captureRoutes);
app.use('/api/family-notes', familyNotesRoutes);
app.use('/api/handoffs', handoffsRoutes);
app.use('/api/calendar-accounts', calendarAccountsRoutes);
app.use('/api', checklistTemplateRoutes);
app.use(timelineTemplateRoutes);
app.use(timelineSuggestionsRoutes);
app.use('/api/voice-timeline', voiceTimelineRoutes);
app.use('/api/event-templates', eventTemplateRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/addresses', addressRoutes);

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join family room for real-time updates
  socket.on('join-family', (familyId) => {
    socket.join(`family-${familyId}`);
    console.log(`Socket ${socket.id} joined family-${familyId}`);
  });

  // Planning Session WebSocket Events
  socket.on('join-planning-session', (sessionId) => {
    socket.join(`planning-session-${sessionId}`);
    console.log(`Socket ${socket.id} joined planning session ${sessionId}`);
    
    // Notify other participants that someone joined
    socket.to(`planning-session-${sessionId}`).emit('partner-joined', {
      id: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('leave-planning-session', (sessionId) => {
    socket.leave(`planning-session-${sessionId}`);
    console.log(`Socket ${socket.id} left planning session ${sessionId}`);
    
    // Notify other participants that someone left
    socket.to(`planning-session-${sessionId}`).emit('partner-left', socket.id);
  });

  // Real-time progress updates
  socket.on('progress-update', (data) => {
    const { sessionId, progress, timestamp } = data;
    
    // Broadcast progress update to other session participants
    socket.to(`planning-session-${sessionId}`).emit('progress-updated', {
      sessionId,
      progress,
      timestamp,
      updatedBy: socket.id
    });
  });

  // Quadrant-specific updates
  socket.on('quadrant-update', (data) => {
    const { sessionId, quadrantId, updates, timestamp } = data;
    
    // Broadcast quadrant changes to other participants
    socket.to(`planning-session-${sessionId}`).emit('quadrant-changed', {
      sessionId,
      quadrantId,
      updates,
      timestamp,
      userId: socket.id
    });
  });

  // Item claiming for real-time coordination
  socket.on('item-claimed', (data) => {
    const { sessionId, itemType, itemId, claimedBy, timestamp } = data;
    
    // Broadcast item claim to other participants
    socket.to(`planning-session-${sessionId}`).emit('item-claimed', {
      sessionId,
      itemType,
      itemId,
      claimedBy,
      timestamp
    });
  });

  // Session state changes
  socket.on('session-pause', (sessionId) => {
    socket.to(`planning-session-${sessionId}`).emit('session-paused');
  });

  socket.on('session-resume', (sessionId) => {
    socket.to(`planning-session-${sessionId}`).emit('session-resumed');
  });

  socket.on('session-complete', (sessionId) => {
    socket.to(`planning-session-${sessionId}`).emit('session-completed');
  });

  // === PREPARATION TIMELINE WEBSOCKET EVENTS ===
  
  // Join event timeline room for real-time updates
  socket.on('join-timeline', (eventId) => {
    socket.join(`timeline-${eventId}`);
    console.log(`Socket ${socket.id} joined timeline for event ${eventId}`);
  });

  socket.on('leave-timeline', (eventId) => {
    socket.leave(`timeline-${eventId}`);
    console.log(`Socket ${socket.id} left timeline for event ${eventId}`);
  });

  // Timeline update events
  socket.on('timeline-updated', (data) => {
    const { eventId, timeline, completedTasks, updatedAt } = data;
    
    console.log(`Timeline updated for event ${eventId} by socket ${socket.id}`);
    
    // Broadcast timeline update to other clients viewing the same event
    socket.to(`timeline-${eventId}`).emit('timeline-updated', {
      eventId,
      timeline,
      completedTasks,
      updatedAt,
      updatedBy: socket.id
    });
  });

  // Task completion events
  socket.on('task-completed', (data) => {
    const { eventId, taskIndex, completed, userId, timestamp } = data;
    
    console.log(`Task ${taskIndex} ${completed ? 'completed' : 'uncompleted'} for event ${eventId}`);
    
    // Broadcast task completion to other clients
    socket.to(`timeline-${eventId}`).emit('task-completion-updated', {
      eventId,
      taskIndex,
      completed,
      userId,
      timestamp,
      updatedBy: socket.id
    });
  });

  // Timeline customization events
  socket.on('timeline-customized', (data) => {
    const { eventId, customTimeline, isCustom } = data;
    
    console.log(`Timeline customized for event ${eventId}`);
    
    // Broadcast customization to other clients
    socket.to(`timeline-${eventId}`).emit('timeline-customized', {
      eventId,
      customTimeline,
      isCustom,
      updatedBy: socket.id
    });
  });

  // Handle disconnection from planning sessions
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Notify all planning sessions that this user disconnected
    // Note: In production, you'd want to track which sessions this socket was in
    socket.broadcast.emit('partner-left', socket.id);
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
const notificationService = require('./services/notificationService');

// Daily brief - morning (6:30 AM)
cron.schedule('30 6 * * *', async () => {
  console.log('Generating daily briefs...');
  try {
    await notificationService.sendDailyBrief();
  } catch (error) {
    console.error('Daily brief error:', error);
  }
});

// Evening prep notifications (8:00 PM)
cron.schedule('0 20 * * *', async () => {
  console.log('Sending evening preparation notifications...');
  try {
    await notificationService.sendEveningPrep();
  } catch (error) {
    console.error('Evening prep error:', error);
  }
});

// Responsibility check every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('Checking for unclaimed responsibilities...');
  try {
    await notificationService.sendResponsibilityAlert();
  } catch (error) {
    console.error('Responsibility alert error:', error);
  }
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

// Conflict detection every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('Running automated conflict detection...');
  
  try {
    const conflictService = require('./services/conflictService');
    
    // Detect conflicts for the next 7 days
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const conflicts = await conflictService.detectAllConflicts(
      now.toISOString(), 
      nextWeek.toISOString()
    );
    
    console.log(`Detected ${conflicts.length} conflicts`);
    
    // Send notifications for critical conflicts
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    if (criticalConflicts.length > 0) {
      console.log(`Found ${criticalConflicts.length} critical conflicts, sending alerts`);
      
      // TODO: Send notifications via WebSocket, Telegram, etc.
      io.emit('critical-conflicts', {
        conflicts: criticalConflicts,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Automated conflict detection error:', error);
  }
});

const PORT = process.env.PORT || 11001;

server.listen(PORT, () => {
  console.log(`Family Symphony server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});