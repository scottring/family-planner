-- Data Migration Script for Supabase
-- Run this AFTER creating the schema

-- First, create your user in Supabase Auth (do this in Supabase dashboard)
-- Then link your existing user data

-- Insert your existing user (you'll need to get the auth.uid from Supabase after creating account)
-- For now, we'll use a placeholder - you'll update this with your actual Supabase auth ID
INSERT INTO users (username, email, full_name, preferences, created_at, auth_id) 
VALUES 
    ('scottring', 'smkaufman@gmail.com', 'Scott Kaufman', '{}', NOW(), NULL);

-- Get the user ID for foreign key references
-- You'll use this ID in subsequent inserts
-- SELECT id FROM users WHERE username = 'scottring';

-- Family members
INSERT INTO family_members (name, type, birth_date) VALUES
    ('Scott', 'parent', NULL),
    ('Wife', 'parent', NULL);

-- Sample events (we'll export your actual events separately)
-- Your actual events will be migrated with a separate script