# Complete Data Migration to Supabase

## Step 1: Create Your Supabase Auth Account

1. Go to: https://app.supabase.com/project/ztgvaawtjfcyatbpsaau/auth/users
2. Click "Add user" → "Create new user"
3. Enter:
   - Email: smkaufman@gmail.com
   - Password: itineraries2024
4. Copy the User UID that's generated (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

## Step 2: Update Migration Script with Your Auth ID

Replace `YOUR_AUTH_UID` in the migration script below with your actual UID from Step 1.

## Step 3: Run Migration Script

Go to SQL Editor in Supabase and run this complete migration script:

```sql
-- Complete migration script is in: database/full_migration.sql
-- Or run this simplified version:

-- First, ensure your user exists with the correct auth_id
INSERT INTO users (username, email, full_name, auth_id) 
VALUES ('scottring', 'smkaufman@gmail.com', 'Scott Kaufman', 'f1472452-34c3-47c5-8273-95477eb09676')
ON CONFLICT (email) 
DO UPDATE SET auth_id = 'f1472452-34c3-47c5-8273-95477eb09676';

-- Insert family members
INSERT INTO family_members (name, type, color) VALUES
  ('Iris Leviner', 'parent', '#10B981'),
  ('Scott Kaufman', 'parent', '#3B82F6')
ON CONFLICT DO NOTHING;

-- Verify user was created
SELECT * FROM users WHERE email = 'smkaufman@gmail.com';

-- For your 97 events and 10 tasks, use the CSV import feature:
-- 1. Go to Table Editor → events table → Import data
-- 2. Upload database/events_export.csv
-- 3. Repeat for tasks table with tasks_export.csv
```

## Step 4: Import Events Using CSV

Since you have 97 events, the easiest way is:

1. Go to Table Editor in Supabase
2. Click on the `events` table
3. Click "Insert" → "Import data from CSV"
4. Use the CSV export from your SQLite database

## Step 5: Verify Migration

Run these queries to verify:

```sql
-- Check user
SELECT * FROM users WHERE email = 'smkaufman@gmail.com';

-- Check events count
SELECT COUNT(*) FROM events;

-- Check tasks count  
SELECT COUNT(*) FROM tasks;

-- Check family members
SELECT * FROM family_members;
```

## Your Data Summary:
- **3 users** (scottring, testuser3, testlogin)
- **97 events** (including Google Calendar synced events)
- **10 tasks**
- **2 family members** (Iris and Scott)

## What's Already Working:
✅ Supabase Auth integration
✅ Row Level Security policies
✅ Real-time sync capabilities
✅ Google Calendar Edge Functions
✅ All frontend components using Supabase

## Next Steps:
1. Create your auth account (Step 1)
2. Update and run the migration script (Steps 2-3)
3. Test login with scottring/itineraries2024
4. Connect Google Calendar in Settings

Your app is ready for real use with Supabase!