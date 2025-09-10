# Supabase Migration - Next Steps

## What's Been Done
✅ Created Supabase schema (database/supabase_schema.sql)
✅ Created backend Supabase integration (server/config/supabase.js, server/routes/auth-supabase.js)
✅ Created frontend Supabase services (client/src/services/supabase.js, auth-supabase.js, api-supabase.js)
✅ Created Supabase auth store (client/src/stores/authStore-supabase.js)

## Next Steps

### 1. Configure Your Supabase Project

Go to your Supabase project dashboard and get your credentials:
1. Go to Settings → API
2. Copy your Project URL and Anon Key

### 2. Set Environment Variables

Create `.env.local` in the client directory:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Database Schema

1. Go to SQL Editor in Supabase
2. Copy the contents of `database/supabase_schema.sql`
3. Run it to create all tables

### 4. Create Your User Account

1. Go to Authentication → Users
2. Create account for: smkaufman@gmail.com / itineraries2024
3. Copy the User UID
4. Run in SQL Editor:
```sql
INSERT INTO users (username, email, full_name, auth_id) 
VALUES ('scottring', 'smkaufman@gmail.com', 'Scott Kaufman', 'YOUR_AUTH_UID');
```

### 5. Switch Frontend to Supabase

To use Supabase instead of the Express backend:

```javascript
// In your import statements, change:
import { authAPI } from './services/auth';
import api from './services/api';
import { useAuthStore } from './stores/authStore';

// To:
import { authAPI } from './services/auth-supabase';
import api from './services/api-supabase';
import { useAuthStore } from './stores/authStore-supabase';
```

### 6. Deploy to Vercel

1. Push to GitHub (new clean repo)
2. Import to Vercel
3. Add environment variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
4. Deploy!

## Benefits of Supabase

- No more JWT/auth complexity
- No need for separate backend deployment
- Built-in Row Level Security
- Automatic CORS handling
- Real-time subscriptions available
- Built-in file storage if needed

## Testing Locally

1. Set your environment variables
2. Start the frontend: `npm run dev`
3. Login with: scottring / itineraries2024

The UI will work exactly the same - all the changes are in the services layer!