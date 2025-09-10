-- Complete Supabase Migration Script
-- Run this in Supabase SQL Editor after creating your auth account

-- Step 1: Insert/Update your user with the auth_id from Supabase Auth
INSERT INTO users (username, email, full_name, auth_id) 
VALUES ('scottring', 'smkaufman@gmail.com', 'Scott Kaufman', 'f1472452-34c3-47c5-8273-95477eb09676')
ON CONFLICT (email) 
DO UPDATE SET auth_id = 'f1472452-34c3-47c5-8273-95477eb09676';

-- Step 2: Insert family members
INSERT INTO family_members (name, type, color) VALUES
  ('Iris Leviner', 'parent', '#10B981'),
  ('Scott Kaufman', 'parent', '#3B82F6')
ON CONFLICT DO NOTHING;

-- Step 3: Get the user ID for foreign key references
DO $$
DECLARE
  user_id_var UUID;
BEGIN
  SELECT id INTO user_id_var FROM users WHERE email = 'smkaufman@gmail.com' LIMIT 1;
  
  -- Step 4: Insert sample events (add your actual events via CSV import)
  INSERT INTO events (
    title, 
    description, 
    start_time, 
    end_time, 
    location, 
    category,
    created_by
  ) VALUES 
  (
    'Family Meeting',
    'Weekly family sync',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
    'Home',
    'family',
    user_id_var
  ),
  (
    'Soccer Practice',
    'Kids soccer practice',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days' + INTERVAL '90 minutes',
    'Soccer Field',
    'family',
    user_id_var
  );

  -- Step 5: Insert sample tasks
  INSERT INTO tasks (
    title,
    description,
    due_date,
    assigned_to,
    category,
    priority,
    status
  ) VALUES
  (
    'Grocery Shopping',
    'Weekly grocery run',
    NOW() + INTERVAL '3 days',
    user_id_var,
    'personal',
    2,
    'pending'
  ),
  (
    'Schedule Doctor Appointment',
    'Annual checkup',
    NOW() + INTERVAL '7 days',
    user_id_var,
    'health',
    3,
    'pending'
  );

END $$;

-- Step 6: Verify the migration
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Family Members:', COUNT(*) FROM family_members
UNION ALL
SELECT 'Events:', COUNT(*) FROM events
UNION ALL
SELECT 'Tasks:', COUNT(*) FROM tasks;

-- Step 7: Grant proper permissions (if needed)
-- These policies should already be in place from the schema
-- but you can verify they're working:

-- Test that you can see your own data
SELECT * FROM users WHERE email = 'smkaufman@gmail.com';
SELECT * FROM family_members;
SELECT * FROM events ORDER BY start_time DESC LIMIT 5;
SELECT * FROM tasks ORDER BY due_date LIMIT 5;