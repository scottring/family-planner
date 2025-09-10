# API Setup for Supabase

## Current Status

### ✅ Working
- **Google Maps API** - Already configured in `.env.local`
- **Supabase Auth & Database** - Fully functional

### 🔧 Need Setup
- **Google Calendar** - Requires OAuth setup
- **OpenAI** - Requires Edge Function deployment

## Setting Up APIs

### 1. Google Calendar API

Google Calendar requires OAuth, which is complex without a backend. Options:

**Option A: Use Supabase Edge Functions (Recommended)**
1. Deploy an Edge Function to handle OAuth flow
2. Store tokens in Supabase database
3. Proxy calendar requests through Edge Function

**Option B: Use a service like Pipedream**
1. Create workflows to sync calendar data
2. Call Pipedream webhooks from your app

**Option C: Manual sync**
1. Use Google Calendar's public URL feature
2. Manually copy calendar IDs for read-only access

### 2. OpenAI API

**Deploy the Edge Function:**

```bash
# Install Supabase CLI if you haven't
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ztgvaawtjfcyatbpsaau

# Set your OpenAI API key as a secret
supabase secrets set OPENAI_API_KEY=your-openai-api-key-here

# Deploy the function
supabase functions deploy openai-proxy
```

**Use in your app:**

```javascript
// In your React component
const callOpenAI = async (prompt) => {
  const { data, error } = await supabase.functions.invoke('openai-proxy', {
    body: { prompt }
  });
  
  if (error) throw error;
  return data;
};
```

### 3. Google Maps API

Already working! The API key is in `.env.local` and can be used directly in the frontend.

## Quick Start (Minimal Setup)

If you just want the app to work without external APIs:

1. **Disable features in `.env.local`:**
   ```
   VITE_ENABLE_GOOGLE_CALENDAR=false
   VITE_ENABLE_AI_FEATURES=false
   ```

2. **The app will use:**
   - Local event storage in Supabase
   - Manual event creation
   - Google Maps for location features

## Future Enhancements

Consider using:
- **Cal.com API** - Easier calendar integration
- **Clerk** or **Auth0** - Handle OAuth for multiple services
- **Vercel Functions** - If you deploy to Vercel
- **Zapier/Make** - No-code integrations