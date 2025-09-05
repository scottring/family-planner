# Quick OAuth Setup Instructions

Based on your screenshots, here's exactly what you need to do:

## Step 1: Configure OAuth Consent Screen

Since you're on the OAuth consent screen page already:

1. Click the **"CONFIGURE CONSENT SCREEN"** button (if you see it)
2. If not, look for an **"EDIT APP"** or **"CREATE"** button
3. Choose **"External"** as the User Type (for testing purposes)
4. Click **"CREATE"**

## Step 2: Fill in the OAuth Consent Screen Form

Fill in these required fields:

### App Information:
- **App name**: Family Planner
- **User support email**: Select your email from dropdown
- **App logo**: Skip (optional)

### App Domain (optional - you can skip these):
- Leave blank for local development

### Authorized domains:
- Leave blank for local development

### Developer contact information:
- **Email addresses**: Your email address

Click **"SAVE AND CONTINUE"**

## Step 3: Scopes

1. Click **"ADD OR REMOVE SCOPES"**
2. Search for "calendar" in the filter box
3. Check the box for:
   - `https://www.googleapis.com/auth/calendar`
4. Click **"UPDATE"**
5. Click **"SAVE AND CONTINUE"**

## Step 4: Test Users

1. Click **"ADD USERS"**
2. Add your Gmail address(es) that you want to test with
3. Click **"ADD"**
4. Click **"SAVE AND CONTINUE"**

## Step 5: Summary
- Review the settings
- Click **"BACK TO DASHBOARD"**

## Step 6: Create OAuth 2.0 Client ID

1. Go to **"Credentials"** in the left sidebar
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. Application type: **"Web application"**
5. Name: **"Family Planner Web Client"**
6. Under **"Authorized JavaScript origins"** add:
   - `http://localhost:5173`
   - `http://localhost:11001`
7. Under **"Authorized redirect URIs"** add:
   - `http://localhost:11001/api/google/callback`
   - `http://localhost:11001/api/calendar-accounts/callback`
8. Click **"CREATE"**

## Step 7: Copy Credentials

After creating, you'll see a popup with:
- **Client ID**: Copy this
- **Client Secret**: Copy this

## Step 8: Update Your .env File

Edit `/server/.env` and replace with your new credentials:

```
GOOGLE_CLIENT_ID=your_new_client_id_here
GOOGLE_CLIENT_SECRET=your_new_client_secret_here
```

## Step 9: Restart Server

Kill and restart your server for the new credentials to take effect.

## If You Don't See "Configure Consent Screen" Button:

The app might already be created. In that case:
1. Look for the app name in the list
2. Click on it to edit
3. Or click "EDIT APP" button if available

## Alternative: Use Existing Credentials

If you want to keep using the existing credentials that are in your .env file, you need to:
1. Go to the Google Cloud project that owns those credentials
2. The project ID for your current credentials appears to be associated with client ID starting with `262826525761-`

## Note About Publishing Status

Your app will be in "Testing" mode, which means:
- Only test users you add can use it
- Perfect for development
- No need to publish for production unless deploying publicly