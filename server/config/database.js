const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(__dirname, '../', process.env.DATABASE_PATH)
  : path.join(dbDir, 'family.db');

console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      telegram_id TEXT,
      preferences TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Family members table
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('parent', 'child', 'pet')),
      birth_date DATE,
      dietary_preferences TEXT DEFAULT '{}',
      health_goals TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Events table (synced from Google Calendar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_event_id TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      location TEXT,
      calendar_id TEXT,
      event_type TEXT,
      preparation_list TEXT DEFAULT '[]',
      resources TEXT DEFAULT '{}',
      created_by INTEGER REFERENCES users(id),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATETIME,
      assigned_to INTEGER REFERENCES users(id),
      family_member_id INTEGER REFERENCES family_members(id),
      category TEXT,
      priority INTEGER DEFAULT 3,
      status TEXT DEFAULT 'pending',
      checklist TEXT DEFAULT '[]',
      parent_event_id INTEGER REFERENCES events(id),
      recurring_pattern TEXT,
      completed_at DATETIME,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Meal plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
      title TEXT NOT NULL,
      recipe_url TEXT,
      ingredients TEXT DEFAULT '[]',
      nutrition_info TEXT DEFAULT '{}',
      portions TEXT DEFAULT '{}',
      prep_time INTEGER,
      assigned_cook INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Activity templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      default_duration INTEGER,
      preparation_items TEXT DEFAULT '[]',
      equipment_list TEXT DEFAULT '[]',
      seasonal TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Pet care table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pet_care (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER REFERENCES family_members(id),
      care_type TEXT,
      schedule TEXT,
      assigned_to INTEGER REFERENCES users(id),
      notes TEXT,
      last_completed DATETIME,
      next_due DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Learning history table (for pattern recognition)
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT,
      action TEXT,
      context TEXT DEFAULT '{}',
      outcome TEXT,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      type TEXT,
      title TEXT,
      message TEXT,
      data TEXT DEFAULT '{}',
      sent_via TEXT,
      sent_at DATETIME,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
    CREATE INDEX IF NOT EXISTS idx_events_google_id ON events(google_event_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
  `);

  console.log('Database schema initialized successfully');
}

// Initialize database on startup
initializeDatabase();

// Helper functions for JSON fields
db.parseJSON = (field) => {
  try {
    return field ? JSON.parse(field) : null;
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
};

db.stringifyJSON = (data) => {
  return JSON.stringify(data || {});
};

module.exports = db;