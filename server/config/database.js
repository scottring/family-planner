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

  // Conflicts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('time_overlap', 'location_travel', 'resource_conflict', 'unassigned_critical')),
      severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      affected_events TEXT NOT NULL DEFAULT '[]',
      affected_users TEXT DEFAULT '[]',
      affected_resources TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'ignored', 'acknowledged')),
      resolution_suggestions TEXT DEFAULT '[]',
      resolution_actions TEXT DEFAULT '[]',
      resolution_data TEXT DEFAULT '{}',
      auto_generated BOOLEAN DEFAULT TRUE,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      resolved_by INTEGER REFERENCES users(id),
      metadata TEXT DEFAULT '{}'
    )
  `);

  // Logistics templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS logistics_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      packing_list TEXT DEFAULT '[]',
      default_parking_info TEXT,
      contacts TEXT DEFAULT '[]',
      weather_dependent BOOLEAN DEFAULT FALSE,
      meal_requirements TEXT DEFAULT '{}',
      season TEXT,
      usage_count INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notification preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      channel_settings TEXT DEFAULT '{"push": true, "sms": false, "email": true, "telegram": true}',
      time_preferences TEXT DEFAULT '{"morning_brief_time": "06:30", "evening_prep_time": "20:00"}',
      priority_thresholds TEXT DEFAULT '{"minimal": 1, "normal": 2, "maximum": 3}',
      quiet_hours TEXT DEFAULT '{"enabled": true, "start": "22:00", "end": "07:00"}',
      notification_types TEXT DEFAULT '{"event_reminders": true, "task_due": true, "daily_brief": true, "evening_prep": true, "responsibility_alerts": true, "handoff_notifications": true, "urgent_alerts": true}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    )
  `);

  // Push subscriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subscription_data TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      user_agent TEXT,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, endpoint)
    )
  `);

  // Inbox items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inbox_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_content TEXT NOT NULL,
      transcription TEXT,
      input_type TEXT CHECK(input_type IN ('voice', 'text', 'image')) NOT NULL,
      parsed_data TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'converted', 'archived')),
      urgency_score INTEGER DEFAULT 3 CHECK(urgency_score >= 1 AND urgency_score <= 5),
      category TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      converted_to_type TEXT CHECK(converted_to_type IN ('event', 'task')),
      converted_to_id INTEGER
    )
  `);

  // Task templates table for recurring templates
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      default_priority INTEGER DEFAULT 3,
      estimated_duration INTEGER,
      checklist TEXT DEFAULT '[]',
      recurring_pattern TEXT,
      tags TEXT DEFAULT '[]',
      usage_count INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Capture settings table for advanced input methods
  db.exec(`
    CREATE TABLE IF NOT EXISTS capture_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email_settings TEXT DEFAULT '{"enabled": false, "monitored_addresses": [], "imap_config": {}}',
      sms_settings TEXT DEFAULT '{"enabled": false, "phone_number": null, "twilio_config": {}}',
      ocr_settings TEXT DEFAULT '{"enabled": true, "auto_process": true, "confidence_threshold": 0.7}',
      nlp_settings TEXT DEFAULT '{"enabled": true, "advanced_parsing": true, "context_aware": true}',
      webhook_tokens TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    )
  `);

  // Processed attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS processed_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inbox_item_id INTEGER REFERENCES inbox_items(id) ON DELETE CASCADE,
      original_filename TEXT,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
      ocr_text TEXT,
      ocr_confidence REAL,
      extracted_data TEXT DEFAULT '{}',
      processing_error TEXT,
      processed_at DATETIME,
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
    CREATE INDEX IF NOT EXISTS idx_logistics_templates_activity_type ON logistics_templates(activity_type);
    CREATE INDEX IF NOT EXISTS idx_logistics_templates_season ON logistics_templates(season);
    CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active);
    CREATE INDEX IF NOT EXISTS idx_conflicts_type ON conflicts(type);
    CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON conflicts(severity);
    CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflicts(status);
    CREATE INDEX IF NOT EXISTS idx_conflicts_detected_at ON conflicts(detected_at);
    CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status);
    CREATE INDEX IF NOT EXISTS idx_inbox_items_urgency ON inbox_items(urgency_score);
    CREATE INDEX IF NOT EXISTS idx_inbox_items_created_by ON inbox_items(created_by);
    CREATE INDEX IF NOT EXISTS idx_inbox_items_created_at ON inbox_items(created_at);
    CREATE INDEX IF NOT EXISTS idx_task_templates_category ON task_templates(category);
    CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON task_templates(created_by);
    CREATE INDEX IF NOT EXISTS idx_capture_settings_user_id ON capture_settings(user_id);
    CREATE INDEX IF NOT EXISTS idx_processed_attachments_inbox_item_id ON processed_attachments(inbox_item_id);
    CREATE INDEX IF NOT EXISTS idx_processed_attachments_processing_status ON processed_attachments(processing_status);
    CREATE INDEX IF NOT EXISTS idx_family_notes_author_id ON family_notes(author_id);
    CREATE INDEX IF NOT EXISTS idx_family_notes_status ON family_notes(status);
    CREATE INDEX IF NOT EXISTS idx_family_notes_created_at ON family_notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_family_notes_priority ON family_notes(priority);
    CREATE INDEX IF NOT EXISTS idx_events_is_recurring ON events(is_recurring);
    CREATE INDEX IF NOT EXISTS idx_events_recurrence_type ON events(recurrence_type);
    CREATE INDEX IF NOT EXISTS idx_events_parent_recurring_id ON events(parent_recurring_id);
    CREATE INDEX IF NOT EXISTS idx_events_recurrence_instance_date ON events(recurrence_instance_date);
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

    // Add Phase 2 logistics columns
    if (!columnNames.includes('packing_list')) {
      db.exec("ALTER TABLE events ADD COLUMN packing_list TEXT DEFAULT '[]'");
      console.log('Added packing_list column to events table');
    }
    
    if (!columnNames.includes('parking_info')) {
      db.exec('ALTER TABLE events ADD COLUMN parking_info TEXT');
      console.log('Added parking_info column to events table');
    }
    
    if (!columnNames.includes('contacts')) {
      db.exec("ALTER TABLE events ADD COLUMN contacts TEXT DEFAULT '[]'");
      console.log('Added contacts column to events table');
    }
    
    if (!columnNames.includes('weather_dependent')) {
      db.exec('ALTER TABLE events ADD COLUMN weather_dependent BOOLEAN DEFAULT FALSE');
      console.log('Added weather_dependent column to events table');
    }
    
    if (!columnNames.includes('meal_requirements')) {
      db.exec("ALTER TABLE events ADD COLUMN meal_requirements TEXT DEFAULT '{}'");
      console.log('Added meal_requirements column to events table');
    }

    // Add responsibility and assignment fields
    if (!columnNames.includes('assigned_to')) {
      db.exec('ALTER TABLE events ADD COLUMN assigned_to INTEGER REFERENCES users(id)');
      console.log('Added assigned_to column to events table');
    }
    
    if (!columnNames.includes('backup_assignee')) {
      db.exec('ALTER TABLE events ADD COLUMN backup_assignee INTEGER REFERENCES users(id)');
      console.log('Added backup_assignee column to events table');
    }
    
    if (!columnNames.includes('assignment_status')) {
      db.exec("ALTER TABLE events ADD COLUMN assignment_status TEXT DEFAULT 'pending' CHECK(assignment_status IN ('pending', 'claimed', 'completed'))");
      console.log('Added assignment_status column to events table');
    }
    
    if (!columnNames.includes('handoff_history')) {
      db.exec("ALTER TABLE events ADD COLUMN handoff_history TEXT DEFAULT '[]'");
      console.log('Added handoff_history column to events table');
    }

    // Add Phase 1.2 enhanced checklist fields
    if (!columnNames.includes('structured_checklist')) {
      db.exec("ALTER TABLE events ADD COLUMN structured_checklist TEXT DEFAULT '[]'");
      console.log('Added structured_checklist column to events table');
    }
    
    if (!columnNames.includes('checklist_completed_items')) {
      db.exec("ALTER TABLE events ADD COLUMN checklist_completed_items TEXT DEFAULT '[]'");
      console.log('Added checklist_completed_items column to events table');
    }
    
    if (!columnNames.includes('attendees')) {
      db.exec('ALTER TABLE events ADD COLUMN attendees TEXT');
      console.log('Added attendees column to events table');
    }
    
    if (!columnNames.includes('category')) {
      db.exec("ALTER TABLE events ADD COLUMN category TEXT DEFAULT 'personal'");
      console.log('Added category column to events table');
    }

    // Add Phase 2.1 recurring event fields
    if (!columnNames.includes('is_recurring')) {
      db.exec('ALTER TABLE events ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE');
      console.log('Added is_recurring column to events table');
    }
    
    if (!columnNames.includes('recurrence_type')) {
      db.exec("ALTER TABLE events ADD COLUMN recurrence_type TEXT CHECK(recurrence_type IN ('daily', 'weekly', 'weekdays', 'custom'))");
      console.log('Added recurrence_type column to events table');
    }
    
    if (!columnNames.includes('recurrence_days')) {
      db.exec("ALTER TABLE events ADD COLUMN recurrence_days TEXT DEFAULT '[]'");
      console.log('Added recurrence_days column to events table');
    }
    
    if (!columnNames.includes('recurrence_end_date')) {
      db.exec('ALTER TABLE events ADD COLUMN recurrence_end_date DATE');
      console.log('Added recurrence_end_date column to events table');
    }
    
    if (!columnNames.includes('parent_recurring_id')) {
      db.exec('ALTER TABLE events ADD COLUMN parent_recurring_id INTEGER REFERENCES events(id)');
      console.log('Added parent_recurring_id column to events table');
    }
    
    if (!columnNames.includes('recurrence_instance_date')) {
      db.exec('ALTER TABLE events ADD COLUMN recurrence_instance_date DATE');
      console.log('Added recurrence_instance_date column to events table');
    }

    // Add missing columns for handoffs and general event management
    if (!columnNames.includes('notes')) {
      db.exec('ALTER TABLE events ADD COLUMN notes TEXT');
      console.log('Added notes column to events table');
    }
    
    if (!columnNames.includes('priority')) {
      db.exec("ALTER TABLE events ADD COLUMN priority INTEGER DEFAULT 3 CHECK(priority >= 1 AND priority <= 5)");
      console.log('Added priority column to events table');
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

  // Add Phase 9 task lifecycle columns to existing tasks table
  try {
    const taskTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const taskColumnNames = taskTableInfo.map(column => column.name);
    
    if (!taskColumnNames.includes('task_type')) {
      db.exec("ALTER TABLE tasks ADD COLUMN task_type TEXT DEFAULT 'simple' CHECK(task_type IN ('simple', 'complex', 'recurring', 'preparatory'))");
      console.log('Added task_type column to tasks table');
    }
    
    if (!taskColumnNames.includes('creates_events')) {
      db.exec('ALTER TABLE tasks ADD COLUMN creates_events BOOLEAN DEFAULT FALSE');
      console.log('Added creates_events column to tasks table');
    }
    
    if (!taskColumnNames.includes('recurrence_pattern')) {
      db.exec("ALTER TABLE tasks ADD COLUMN recurrence_pattern TEXT DEFAULT '{}'");
      console.log('Added recurrence_pattern column to tasks table');
    }
    
    if (!taskColumnNames.includes('linked_event_id')) {
      db.exec('ALTER TABLE tasks ADD COLUMN linked_event_id INTEGER REFERENCES events(id)');
      console.log('Added linked_event_id column to tasks table');
    }
    
    if (!taskColumnNames.includes('template_id')) {
      db.exec('ALTER TABLE tasks ADD COLUMN template_id INTEGER REFERENCES task_templates(id)');
      console.log('Added template_id column to tasks table');
    }
    
    if (!taskColumnNames.includes('next_instance_id')) {
      db.exec('ALTER TABLE tasks ADD COLUMN next_instance_id INTEGER REFERENCES tasks(id)');
      console.log('Added next_instance_id column to tasks table');
    }
    
    if (!taskColumnNames.includes('completion_actions')) {
      db.exec("ALTER TABLE tasks ADD COLUMN completion_actions TEXT DEFAULT '[]'");
      console.log('Added completion_actions column to tasks table');
    }
  } catch (error) {
    console.log('Task table migration completed or columns already exist');
  }

  // Add Phase 10 advanced input columns to existing inbox_items table
  try {
    const inboxTableInfo = db.prepare("PRAGMA table_info(inbox_items)").all();
    const inboxColumnNames = inboxTableInfo.map(column => column.name);
    
    if (!inboxColumnNames.includes('source_type')) {
      db.exec("ALTER TABLE inbox_items ADD COLUMN source_type TEXT DEFAULT 'manual' CHECK(source_type IN ('manual', 'voice', 'text', 'image', 'email', 'sms', 'whatsapp'))");
      console.log('Added source_type column to inbox_items table');
    }
    
    if (!inboxColumnNames.includes('attachment_id')) {
      db.exec('ALTER TABLE inbox_items ADD COLUMN attachment_id INTEGER REFERENCES processed_attachments(id)');
      console.log('Added attachment_id column to inbox_items table');
    }
    
    if (!inboxColumnNames.includes('email_metadata')) {
      db.exec("ALTER TABLE inbox_items ADD COLUMN email_metadata TEXT DEFAULT '{}'");
      console.log('Added email_metadata column to inbox_items table');
    }
    
    if (!inboxColumnNames.includes('sms_metadata')) {
      db.exec("ALTER TABLE inbox_items ADD COLUMN sms_metadata TEXT DEFAULT '{}'");
      console.log('Added sms_metadata column to inbox_items table');
    }
    
    if (!inboxColumnNames.includes('processing_confidence')) {
      db.exec('ALTER TABLE inbox_items ADD COLUMN processing_confidence REAL DEFAULT 1.0');
      console.log('Added processing_confidence column to inbox_items table');
    }
  } catch (error) {
    console.log('Inbox table migration completed or columns already exist');
  }

  // Add family_notes table for Phase 2.3 partner synchronization
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author_id INTEGER REFERENCES users(id) NOT NULL,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      category TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      visible_to TEXT DEFAULT '[]',
      expires_at DATETIME,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add meal learning tables for AI-powered meal planning
  
  // Meal history table - tracks actual meal consumption and feedback
  db.exec(`
    CREATE TABLE IF NOT EXISTS meal_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_plan_id INTEGER REFERENCES meal_plans(id) ON DELETE CASCADE,
      date_served DATE NOT NULL,
      actually_eaten BOOLEAN DEFAULT FALSE,
      attendance TEXT DEFAULT '{}',
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      prep_time_actual INTEGER,
      leftovers BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Meal feedback table - detailed feedback from family members
  db.exec(`
    CREATE TABLE IF NOT EXISTS meal_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_plan_id INTEGER REFERENCES meal_plans(id) ON DELETE CASCADE,
      family_member_id INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      liked_ingredients TEXT DEFAULT '[]',
      disliked_ingredients TEXT DEFAULT '[]',
      comments TEXT,
      would_repeat BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Family meal preferences table - learned preferences for each family member
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_meal_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_member_id INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
      ingredient TEXT NOT NULL,
      preference_score INTEGER DEFAULT 0 CHECK(preference_score >= -100 AND preference_score <= 100),
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      occurrence_count INTEGER DEFAULT 1,
      UNIQUE(family_member_id, ingredient)
    )
  `);

  // Meal patterns table - discovered eating patterns and preferences
  db.exec(`
    CREATE TABLE IF NOT EXISTS meal_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL CHECK(pattern_type IN ('weekly', 'seasonal', 'event-based', 'ingredient-combo', 'meal-timing')),
      pattern_data TEXT DEFAULT '{}',
      confidence_score REAL DEFAULT 0.0 CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0),
      last_observed DATETIME DEFAULT CURRENT_TIMESTAMP,
      observation_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Added family_notes table for partner communication');

  // Create indexes for meal learning tables
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_meal_history_meal_plan_id ON meal_history(meal_plan_id);
    CREATE INDEX IF NOT EXISTS idx_meal_history_date_served ON meal_history(date_served);
    CREATE INDEX IF NOT EXISTS idx_meal_history_rating ON meal_history(rating);
    CREATE INDEX IF NOT EXISTS idx_meal_feedback_meal_plan_id ON meal_feedback(meal_plan_id);
    CREATE INDEX IF NOT EXISTS idx_meal_feedback_family_member_id ON meal_feedback(family_member_id);
    CREATE INDEX IF NOT EXISTS idx_meal_feedback_rating ON meal_feedback(rating);
    CREATE INDEX IF NOT EXISTS idx_family_meal_preferences_family_member_id ON family_meal_preferences(family_member_id);
    CREATE INDEX IF NOT EXISTS idx_family_meal_preferences_ingredient ON family_meal_preferences(ingredient);
    CREATE INDEX IF NOT EXISTS idx_family_meal_preferences_preference_score ON family_meal_preferences(preference_score);
    CREATE INDEX IF NOT EXISTS idx_meal_patterns_pattern_type ON meal_patterns(pattern_type);
    CREATE INDEX IF NOT EXISTS idx_meal_patterns_confidence_score ON meal_patterns(confidence_score);
    CREATE INDEX IF NOT EXISTS idx_meal_patterns_last_observed ON meal_patterns(last_observed);
  `);

  console.log('Added meal learning tables: meal_history, meal_feedback, family_meal_preferences, meal_patterns');
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