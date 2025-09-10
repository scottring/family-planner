-- Row Level Security (RLS) Policies for Family Planner
-- Run this after creating tables to secure your data

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Events table policies
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Tasks table policies
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Family members table policies (shared across family)
CREATE POLICY "Authenticated users can view family members" ON family_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage family members" ON family_members
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Meal plans table policies
CREATE POLICY "Users can view meal plans" ON meal_plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage meal plans" ON meal_plans
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Calendar accounts table policies
CREATE POLICY "Users can view own calendar accounts" ON calendar_accounts
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own calendar accounts" ON calendar_accounts
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Inbox items table policies
CREATE POLICY "Users can view own inbox items" ON inbox_items
  FOR SELECT USING (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own inbox items" ON inbox_items
  FOR ALL USING (
    created_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Templates table policies
CREATE POLICY "Users can view templates" ON templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage templates" ON templates
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Planning sessions table policies
CREATE POLICY "Users can view own planning sessions" ON planning_sessions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own planning sessions" ON planning_sessions
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Notes table policies
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own notes" ON notes
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;