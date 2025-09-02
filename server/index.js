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
const tasksRoutes = require('./routes/tasks');
const mealsRoutes = require('./routes/meals');
const familyRoutes = require('./routes/family');
const aiRoutes = require('./routes/ai');

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
app.use('/api/tasks', tasksRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/ai', aiRoutes);

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

// Calendar sync every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Syncing Google Calendar...');
  // TODO: Implement calendar sync
});

const PORT = process.env.PORT || 11001;

server.listen(PORT, () => {
  console.log(`Family Symphony server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});