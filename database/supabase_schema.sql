-- Supabase Schema for Itineraries
-- This creates all tables with proper PostgreSQL types and Supabase auth integration

-- Enable UUID extension for Supabase auth
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (integrated with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    telegram_id TEXT,
    preferences JSONB DEFAULT '{}',
    google_calendar_id TEXT,
    google_tokens JSONB DEFAULT '{}',
    last_sync_time TIMESTAMP,
    sync_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('parent', 'child', 'pet')),
    birth_date DATE,
    dietary_preferences JSONB DEFAULT '{}',
    health_goals JSONB DEFAULT '{}',
    age INTEGER,
    avatar TEXT,
    color TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    google_event_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location TEXT,
    calendar_id TEXT,
    event_type TEXT,
    preparation_list JSONB DEFAULT '[]',
    resources JSONB DEFAULT '{}',
    ai_enriched BOOLEAN DEFAULT FALSE,
    preparation_time INTEGER,
    departure_time TEXT,
    resources_needed JSONB DEFAULT '{}',
    weather_considerations JSONB DEFAULT '{}',
    ai_suggestions JSONB DEFAULT '{}',
    packing_list JSONB DEFAULT '[]',
    parking_info TEXT,
    contacts JSONB DEFAULT '[]',
    weather_dependent BOOLEAN DEFAULT FALSE,
    meal_requirements TEXT,
    assigned_to UUID REFERENCES users(id),
    backup_assignee UUID REFERENCES users(id),
    assignment_status TEXT DEFAULT 'unassigned',
    handoff_history JSONB DEFAULT '[]',
    structured_checklist JSONB DEFAULT '[]',
    checklist_completed_items JSONB DEFAULT '[]',
    attendees JSONB DEFAULT '[]',
    category TEXT,
    is_draft BOOLEAN DEFAULT FALSE,
    created_from_inbox BOOLEAN DEFAULT FALSE,
    date DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_type TEXT,
    recurrence_days JSONB DEFAULT '[]',
    recurrence_end_date DATE,
    parent_recurring_id INTEGER,
    recurrence_instance_date DATE,
    notes TEXT,
    priority INTEGER DEFAULT 3,
    checklist JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    assigned_to UUID REFERENCES users(id),
    family_member_id INTEGER REFERENCES family_members(id),
    category TEXT,
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending',
    checklist JSONB DEFAULT '[]',
    parent_event_id INTEGER REFERENCES events(id),
    recurring BOOLEAN DEFAULT FALSE,
    task_type TEXT,
    creates_events BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB DEFAULT '{}',
    linked_event_id INTEGER REFERENCES events(id),
    template_id INTEGER,
    next_instance_id INTEGER,
    completion_actions JSONB DEFAULT '[]',
    completed BOOLEAN DEFAULT FALSE,
    review_action TEXT,
    review_session_id INTEGER,
    weekly_commitment_hours REAL,
    committed_session_id INTEGER,
    committed_at TIMESTAMP,
    created_from_inbox BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inbox items table
CREATE TABLE IF NOT EXISTS inbox_items (
    id SERIAL PRIMARY KEY,
    type TEXT CHECK(type IN ('event', 'task', 'reminder', 'note', 'image')),
    content TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    processed BOOLEAN DEFAULT FALSE,
    processed_result JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id),
    ai_suggestions JSONB DEFAULT '{}',
    quick_add_used BOOLEAN DEFAULT FALSE,
    source_type TEXT,
    attachment_id INTEGER,
    email_metadata JSONB DEFAULT '{}',
    sms_metadata JSONB DEFAULT '{}',
    processing_confidence REAL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    date DATE NOT NULL,
    meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    recipe_name TEXT,
    ingredients JSONB DEFAULT '[]',
    instructions TEXT,
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER,
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fat REAL,
    notes TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Family notes table
CREATE TABLE IF NOT EXISTS family_notes (
    id SERIAL PRIMARY KEY,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    priority INTEGER DEFAULT 3,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    related_event_id INTEGER REFERENCES events(id),
    related_task_id INTEGER REFERENCES tasks(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Checklist templates table
CREATE TABLE IF NOT EXISTS checklist_templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    items JSONB DEFAULT '[]',
    default_items JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Calendar accounts table
CREATE TABLE IF NOT EXISTS calendar_accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    calendar_id TEXT NOT NULL,
    calendar_name TEXT,
    color TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, calendar_id)
);

-- Planning sessions table
CREATE TABLE IF NOT EXISTS planning_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    status TEXT DEFAULT 'active',
    inbox_count INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    tasks_created INTEGER DEFAULT 0,
    items_deferred INTEGER DEFAULT 0,
    notes JSONB DEFAULT '[]',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (users can only see their own data)
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can view all family members" ON family_members FOR ALL USING (true);

CREATE POLICY "Users can view all events" ON events FOR SELECT USING (true);
CREATE POLICY "Users can create events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (created_by = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view all tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Users can create tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update assigned tasks" ON tasks FOR UPDATE USING (assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own inbox" ON inbox_items FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view all meal plans" ON meal_plans FOR SELECT USING (true);
CREATE POLICY "Users can manage own meal plans" ON meal_plans FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view family notes" ON family_notes FOR SELECT 
    USING (from_user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
        OR to_user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_google_id ON events(google_event_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_inbox_user ON inbox_items(user_id);
CREATE INDEX idx_inbox_processed ON inbox_items(processed);