# Google Calendar OAuth Setup Guide

Your Google OAuth credentials are returning a 404 error. Here's how to fix it:

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Calendar API

1. In the Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace account)
3. Fill in required fields:
   - App name: "Family Planner"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - Click "Add or Remove Scopes"
   - Search and add: `https://www.googleapis.com/auth/calendar`
5. Add test users (your email addresses)
6. Save and continue

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:11001/api/google/callback`
   - `http://localhost:11001/api/calendar-accounts/callback` (for new multi-account system)
5. Click "Create"
6. Copy the Client ID and Client Secret

## Step 5: Update Your .env File

Replace the existing credentials in `/server/.env`:

```
GOOGLE_CLIENT_ID=your_new_client_id_here
GOOGLE_CLIENT_SECRET=your_new_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:11001/api/google/callback
```

## Step 6: Restart the Server

After updating .env, restart your server for changes to take effect.

## Alternative: Use Mock Mode

While setting up Google OAuth, you can temporarily revert to mock mode:

1. Edit `/client/src/components/calendar/CalendarAccountManager.jsx`
2. Change line 98 from `mockMode: false` to `mockMode: true`
3. This will use simulated calendar accounts for testing

## Common Issues

### 404 Error
- Usually means the client ID doesn't exist or the project was deleted
- Verify the client ID in Google Cloud Console matches your .env file

### 400 Error (redirect_uri_mismatch)
- The redirect URI in your request doesn't match what's configured in Google Cloud Console
- Make sure `http://localhost:11001/api/google/callback` is added as an authorized redirect URI

### 403 Error (access_denied)
- The Google Calendar API might not be enabled
- Or your email isn't in the test users list (if app is in testing mode)

## Testing Your Setup

1. After configuration, go to Calendar Settings in your app
2. Click "Add Google Account"
3. You should see Google's consent screen
4. Authorize and select your Google account
5. Grant calendar permissions
6. You'll be redirected back to your app with the account connected