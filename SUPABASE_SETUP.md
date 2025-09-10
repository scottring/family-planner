# Supabase Setup Instructions

## 1. Get Your Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com/project/YOUR_PROJECT
2. Go to Settings → API
3. Copy these values:
   - Project URL (looks like: https://xxxxx.supabase.co)
   - Anon/Public key (safe to expose in frontend)
   - Service Role key (keep secret, backend only)

## 2. Run Database Schema

1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the contents of `database/supabase_schema.sql`
3. Click "Run" to create all tables

## 3. Create Your User Account

1. Go to Authentication → Users in Supabase
2. Click "Invite User"
3. Enter your email: smkaufman@gmail.com
4. Set password: itineraries2024
5. Copy the User UID that's generated

## 4. Link Your User Profile

1. Go to SQL Editor
2. Run this query (replace YOUR_AUTH_UID with the UID from step 3):
```sql
INSERT INTO users (username, email, full_name, auth_id) 
VALUES ('scottring', 'smkaufman@gmail.com', 'Scott Kaufman', 'YOUR_AUTH_UID');
```

## 5. Import Your Existing Data

### Option A: Manual Import (Recommended for first test)
1. Go to Table Editor in Supabase
2. Import your events, tasks, etc. using the CSV import feature

### Option B: SQL Import
1. Use the `database/family_postgres.sql` file
2. Remove the CREATE TABLE statements (already done)
3. Keep only the INSERT statements
4. Run in SQL Editor

## 6. Update Environment Variables

Create `.env` file in server directory:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

Create `.env` file in client directory:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 7. Test Locally

1. Start the backend:
```bash
cd server
npm run dev
```

2. Start the frontend:
```bash
cd client
npm run dev
```

3. Try logging in with:
   - Username: scottring
   - Password: itineraries2024

## 8. Deploy to Vercel

1. Push to GitHub (new repo without secrets)
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## What Changed in Your Code?

### Backend
- `config/database.js` → `config/supabase.js` (database connection)
- `routes/auth.js` → `routes/auth-supabase.js` (using Supabase Auth)
- No more JWT, bcrypt, or auth middleware needed!

### Frontend (minimal changes)
- Add Supabase client
- Update login to use Supabase Auth
- Everything else stays the same!

## Troubleshooting

**Can't login?**
- Check that your user exists in both auth.users and public.users tables
- Verify the auth_id matches between tables

**No data showing?**
- Check Row Level Security policies
- Make sure you're logged in
- Verify data was imported correctly

**CORS errors?**
- Supabase handles CORS automatically
- Make sure you're using the correct project URL