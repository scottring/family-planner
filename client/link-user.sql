-- After creating your user in Supabase Authentication, 
-- you need to link it to the users table.
-- 
-- 1. First, get your auth user ID from Authentication → Users
-- 2. Replace 'YOUR_AUTH_UID' below with the actual ID
-- 3. Run this in SQL Editor

INSERT INTO users (username, email, full_name, auth_id) 
VALUES ('scottring', 'smkaufman@gmail.com', 'Scott Kaufman', 'YOUR_AUTH_UID')
ON CONFLICT (email) 
DO UPDATE SET 
    username = EXCLUDED.username,
    auth_id = EXCLUDED.auth_id;