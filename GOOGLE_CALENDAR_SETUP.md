# Google Calendar Setup - SIMPLIFIED

## What We Fixed
- ✅ Removed all mock data
- ✅ Direct Google Calendar API integration (no Edge Functions needed)
- ✅ Simple OAuth in the browser
- ✅ Real events sync to Supabase

## Quick Setup (5 minutes)

### 1. Get Google API Credentials

Go to: https://console.cloud.google.com/

1. Create new project or select existing
2. Enable "Google Calendar API"
3. Create OAuth 2.0 Client ID:
   - Type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - `https://your-app.vercel.app` (your production URL)
4. Create API Key (for calendar API access)

### 2. Update Your .env.local

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

### 3. Connect Your Calendar

1. Open the app
2. Go to Calendar Settings
3. Click "Add Account"
4. Sign in with Google
5. Your real events appear!

## That's It! 🎉

No more Edge Functions, no more mock data. Just your real calendar events.

## What's Working Now

- ✅ Direct Google Calendar OAuth (no backend needed)
- ✅ Events sync to Supabase for offline access
- ✅ Simple, clean integration
- ✅ Works on localhost and production

## Your Apps

- Local: http://localhost:5173
- Production: https://itineraries-jet.vercel.app
- Supabase: https://app.supabase.com/project/ztgvaawtjfcyatbpsaau
