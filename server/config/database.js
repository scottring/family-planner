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
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      telegram_id TEXT,
      preferences TEXT DEFAULT '{}',
      google_calendar_id TEXT,
      google_tokens TEXT DEFAULT '{}',
      last_sync_time DATETIME,
      sync_enabled BOOLEAN DEFAULT FALSE,
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
      ai_enriched BOOLEAN DEFAULT FALSE,
      preparation_time INTEGER,
      departure_time TEXT,
      resources_needed TEXT DEFAULT '{}',
      weather_considerations TEXT DEFAULT '{}',
      ai_suggestions TEXT DEFAULT '{}',
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

  // Checklist templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      items TEXT NOT NULL DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      usage_count INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Checklist instances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklist_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER REFERENCES checklist_templates(id),
      event_id INTEGER REFERENCES events(id),
      title TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]',
      completion_percentage REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
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
    CREATE INDEX IF NOT EXISTS idx_checklist_templates_category ON checklist_templates(category);
    CREATE INDEX IF NOT EXISTS idx_checklist_instances_template_id ON checklist_instances(template_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_instances_event_id ON checklist_instances(event_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_instances_status ON checklist_instances(status);
  `);

  console.log('Database schema initialized successfully');
  
  // Add AI enrichment columns to existing events table if they don't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(events)").all();
    const columnNames = tableInfo.map(column => column.name);
    
    if (!columnNames.includes('ai_enriched')) {
      db.exec('ALTER TABLE events ADD COLUMN ai_enriched BOOLEAN DEFAULT FALSE');
      console.log('Added ai_enriched column to events table');
    }
    
    if (!columnNames.includes('preparation_time')) {
      db.exec('ALTER TABLE events ADD COLUMN preparation_time INTEGER');
      console.log('Added preparation_time column to events table');
    }
    
    if (!columnNames.includes('departure_time')) {
      db.exec('ALTER TABLE events ADD COLUMN departure_time TEXT');
      console.log('Added departure_time column to events table');
    }
    
    if (!columnNames.includes('resources_needed')) {
      db.exec("ALTER TABLE events ADD COLUMN resources_needed TEXT DEFAULT '{}'");
      console.log('Added resources_needed column to events table');
    }
    
    if (!columnNames.includes('weather_considerations')) {
      db.exec("ALTER TABLE events ADD COLUMN weather_considerations TEXT DEFAULT '{}'");
      console.log('Added weather_considerations column to events table');
    }
    
    if (!columnNames.includes('ai_suggestions')) {
      db.exec("ALTER TABLE events ADD COLUMN ai_suggestions TEXT DEFAULT '{}'");
      console.log('Added ai_suggestions column to events table');
    }
  } catch (error) {
    console.log('Migration completed or columns already exist');
  }

  // Add Google Calendar sync columns to existing users table if they don't exist
  try {
    const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
    const userColumnNames = userTableInfo.map(column => column.name);
    
    if (!userColumnNames.includes('google_calendar_id')) {
      db.exec('ALTER TABLE users ADD COLUMN google_calendar_id TEXT');
      console.log('Added google_calendar_id column to users table');
    }
    
    if (!userColumnNames.includes('google_tokens')) {
      db.exec("ALTER TABLE users ADD COLUMN google_tokens TEXT DEFAULT '{}'");
      console.log('Added google_tokens column to users table');
    }
    
    if (!userColumnNames.includes('last_sync_time')) {
      db.exec('ALTER TABLE users ADD COLUMN last_sync_time DATETIME');
      console.log('Added last_sync_time column to users table');
    }
    
    if (!userColumnNames.includes('sync_enabled')) {
      db.exec('ALTER TABLE users ADD COLUMN sync_enabled BOOLEAN DEFAULT FALSE');
      console.log('Added sync_enabled column to users table');
    }
    
    if (!userColumnNames.includes('telegram_chat_id')) {
      db.exec('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT');
      console.log('Added telegram_chat_id column to users table');
    }
    
    if (!userColumnNames.includes('telegram_settings')) {
      db.exec("ALTER TABLE users ADD COLUMN telegram_settings TEXT DEFAULT '{\"notifications_enabled\": true, \"reminder_minutes\": 30}'");
      console.log('Added telegram_settings column to users table');
    }
  } catch (error) {
    console.log('User table migration completed or columns already exist');
  }
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