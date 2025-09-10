-- First, let's check if there are actually users in the table
-- Run this as admin in SQL Editor

-- Check if users exist (bypasses RLS)
SELECT * FROM users;

-- If the table is empty, insert the user:
INSERT INTO users (username, email, full_name, auth_id) 
VALUES ('scottring', 'smkaufman@gmail.com', 'Scott Kaufman', 'b852546e-8be7-46e4-b2c2-09b223821d5c')
ON CONFLICT (email) DO NOTHING;

-- If users exist but you can't see them, it's an RLS issue.
-- Let's fix the RLS policies to allow users to see themselves during login:

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create a more permissive policy for reading users
-- This allows reading user data during login (before auth.uid() is set)
CREATE POLICY "Users can view profiles for login" ON users 
FOR SELECT 
USING (true);  -- Allow all reads - needed for username lookup during login

-- Keep the update policy restricted
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE 
USING (auth.uid() = auth_id);

-- Also allow inserting for registration
CREATE POLICY "Users can insert own profile" ON users 
FOR INSERT 
WITH CHECK (auth.uid() = auth_id OR auth.uid() IS NULL);  -- NULL during registration