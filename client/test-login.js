import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ztgvaawtjfcyatbpsaau.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0Z3ZhYXd0amZjeWF0YnBzYWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTg5MzcsImV4cCI6MjA3Mjk5NDkzN30.J5lo4lw9IF6fe1rIaPNz3PtkAdX4OKJJ309KMIig6zc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('Testing login process step by step...\n');
  
  // Step 1: Check if scottring exists in users table
  console.log('1. Looking for scottring in users table:');
  const { data: userByUsername, error: usernameError } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'scottring');
  
  if (usernameError) {
    console.error('Error:', usernameError.message);
  } else {
    console.log('Found users:', userByUsername);
  }
  
  // Step 2: Check if the email exists in users table
  console.log('\n2. Looking for smkaufman@gmail.com in users table:');
  const { data: userByEmail, error: emailError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'smkaufman@gmail.com');
  
  if (emailError) {
    console.error('Error:', emailError.message);
  } else {
    console.log('Found users:', userByEmail);
  }
  
  // Step 3: Check all users in the table
  console.log('\n3. All users in the table:');
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('username, email, auth_id');
  
  if (allError) {
    console.error('Error:', allError.message);
  } else {
    console.log('All users:', allUsers);
  }
  
  // Step 4: Try direct auth login
  console.log('\n4. Testing direct Supabase auth login:');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'smkaufman@gmail.com',
    password: 'itineraries2024'
  });
  
  if (authError) {
    console.error('Auth error:', authError.message);
  } else {
    console.log('Auth successful! User ID:', authData.user.id);
    console.log('Session token:', authData.session.access_token.substring(0, 20) + '...');
  }
  
  // Step 5: Test the app's login flow
  console.log('\n5. Testing app login flow (username -> email -> auth):');
  
  // First get email from username
  const { data: userProfile } = await supabase
    .from('users')
    .select('email')
    .eq('username', 'scottring')
    .single();
  
  if (!userProfile) {
    console.error('❌ Cannot find user with username: scottring');
    console.log('   This is why the app login fails!');
    return;
  }
  
  console.log('✅ Found email for scottring:', userProfile.email);
  
  // Then try to login with that email
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: userProfile.email,
    password: 'itineraries2024'
  });
  
  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
  } else {
    console.log('✅ Login successful!');
  }
}

testLogin();