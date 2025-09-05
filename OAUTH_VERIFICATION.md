# OAuth Configuration Verification Checklist

Please verify in Google Cloud Console:

## 1. OAuth Consent Screen Status
- Go to "APIs & Services" > "OAuth consent screen"
- Check the **Publishing status**: Should be either "Testing" or "Published"
- If it says "Needs verification" or has any warnings, that could be the issue

## 2. OAuth Client Configuration
- Go to "APIs & Services" > "Credentials"
- Find client ID: `262826525761-vs3k1bmelf81megig23gdtkffgrvr8eq.apps.googleusercontent.com`
- Click on it and verify:

### Authorized JavaScript origins should include:
- `http://localhost:5173`
- `http://localhost:11001`

### Authorized redirect URIs should include:
- `http://localhost:11001/api/google/callback`
- `http://localhost:11001/api/calendar-accounts/callback`

## 3. API Enablement
- Go to "APIs & Services" > "Enabled APIs"
- Make sure **Google Calendar API** is in the list
- If not, go to "Library", search for it, and Enable it

## 4. OAuth Consent Screen Configuration
- Make sure you have:
  - App name filled in
  - User support email selected
  - Developer contact email added
  - Scopes include: `https://www.googleapis.com/auth/calendar`
  - Test users include your email address (if in Testing mode)

## Common Fix:
If everything looks correct but still getting 404, try:
1. Delete the current OAuth 2.0 Client ID
2. Create a new one with the same settings
3. Update .env with new credentials
4. Restart the server

## Alternative Solution:
The 404 might indicate this client ID belongs to a different/deleted project. In that case:
1. Create a NEW OAuth 2.0 Client ID in your current project
2. Update the .env file with the new credentials
3. Restart the server