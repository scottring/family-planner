# Google Calendar OAuth Setup for Production

## Current Issue
Your calendar connection isn't working because the Google OAuth credentials in your server's `.env` file are still placeholders.

## Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Itineraries" or similar
4. Note the project ID

### 2. Enable Google Calendar API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 3. Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in:
   - App name: "Itineraries"
   - User support email: Your email
   - Developer contact: Your email
4. Click "Add or Remove Scopes"
5. Add this scope: `https://www.googleapis.com/auth/calendar`
6. Add your email as a test user
7. Save and continue

### 4. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Name: "Itineraries Web Client"
5. Add Authorized redirect URIs:
   ```
   https://itineraries-backend.symphony-os.com/api/google/callback
   https://itineraries-backend.symphony-os.com/api/calendar-accounts/callback
   http://localhost:11001/api/google/callback
   http://localhost:11001/api/calendar-accounts/callback
   ```
6. Click "Create"
7. **IMPORTANT**: Copy the Client ID and Client Secret

### 5. Update Your Server Configuration

Edit `/server/.env` and replace the placeholders:

```env
# Google Calendar API - Replace these with your actual values
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://itineraries-backend.symphony-os.com/api/google/callback
```

### 6. Restart Your Backend Server

After updating the .env file:
```bash
# Kill the current server
lsof -t -i:11001 | xargs kill -9

# Restart it
cd server
npm start
```

### 7. Test the Connection

1. Go to https://itineraries-jet.vercel.app
2. Navigate to Settings → Calendar Sync
3. Click "Connect Google Calendar"
4. You should see Google's consent screen
5. Authorize and grant calendar permissions
6. You'll be redirected back to your app with calendar connected

## Troubleshooting

### 404 Error
- The client ID doesn't exist or project was deleted
- Verify client ID in Google Cloud Console matches .env

### 400 Error (redirect_uri_mismatch)
- The redirect URI doesn't match what's in Google Cloud Console
- Make sure `https://itineraries-backend.symphony-os.com/api/google/callback` is in the authorized redirect URIs

### 403 Error
- Google Calendar API not enabled
- Your email not in test users list (if app is in testing mode)

## Security Notes
- Never commit the .env file with real credentials to git
- Keep your Client Secret secure
- Consider using environment variables in your production deployment