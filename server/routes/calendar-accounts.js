const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { google } = require('googleapis');

// Get all connected calendar accounts for a user
router.get('/', auth, async (req, res) => {
  try {
    // First check if user has google_tokens in users table (old OAuth flow)
    const user = db.prepare('SELECT google_tokens, email FROM users WHERE id = ?').get(req.user.id);
    
    if (user && user.google_tokens) {
      // Check if we've already migrated this account
      const existingAccount = db.prepare(`
        SELECT id FROM calendar_accounts 
        WHERE user_id = ? AND google_account_email = ?
      `).get(req.user.id, user.email);
      
      if (!existingAccount) {
        // Migrate the old OAuth connection to calendar_accounts table
        console.log('Migrating existing Google OAuth connection for user:', req.user.id);
        
        const tokens = JSON.parse(user.google_tokens);
        const result = db.prepare(`
          INSERT INTO calendar_accounts (
            user_id,
            google_account_email,
            calendar_id,
            display_name,
            access_token,
            refresh_token,
            is_active
          ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(
          req.user.id,
          user.email,
          'primary', // Default to primary calendar
          'Primary Google Account',
          tokens.access_token || 'migrated',
          tokens.refresh_token || 'migrated'
        );
        
        // Set default contexts for the migrated account
        const accountId = result.lastInsertRowid;
        
        // Assign all contexts to the migrated account by default
        ['personal', 'work', 'family'].forEach(context => {
          db.prepare(`
            INSERT OR REPLACE INTO calendar_contexts (user_id, context_name, calendar_account_id)
            VALUES (?, ?, ?)
          `).run(req.user.id, context, accountId);
        });
        
        console.log('Migration complete - created calendar account:', accountId);
      }
    }
    
    // Now fetch all accounts (including any migrated ones)
    const accounts = db.prepare(`
      SELECT 
        ca.id,
        ca.google_account_email,
        ca.calendar_id,
        ca.display_name,
        ca.is_active,
        ca.created_at,
        GROUP_CONCAT(cc.context_name) as contexts
      FROM calendar_accounts ca
      LEFT JOIN calendar_contexts cc ON cc.calendar_account_id = ca.id
      WHERE ca.user_id = ? AND ca.is_active = 1
      GROUP BY ca.id
      ORDER BY ca.created_at DESC
    `).all(req.user.id);
    
    // Parse contexts into array
    const accountsWithContexts = accounts.map(account => ({
      ...account,
      contexts: account.contexts ? account.contexts.split(',') : []
    }));
    
    res.json(accountsWithContexts);
  } catch (error) {
    console.error('Get calendar accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get available contexts and their default accounts
router.get('/contexts', auth, (req, res) => {
  try {
    const contexts = db.prepare(`
      SELECT 
        cc.context_name,
        cc.calendar_account_id,
        ca.google_account_email,
        ca.display_name,
        ca.calendar_id
      FROM calendar_contexts cc
      LEFT JOIN calendar_accounts ca ON ca.id = cc.calendar_account_id
      WHERE cc.user_id = ?
      ORDER BY cc.context_name
    `).all(req.user.id);
    
    const availableContexts = ['work', 'personal', 'family'];
    const contextMap = {};
    
    // Initialize all contexts
    availableContexts.forEach(context => {
      contextMap[context] = null;
    });
    
    // Fill with existing data
    contexts.forEach(context => {
      if (context.calendar_account_id) {
        contextMap[context.context_name] = {
          accountId: context.calendar_account_id,
          email: context.google_account_email,
          displayName: context.display_name,
          calendarId: context.calendar_id
        };
      }
    });
    
    res.json({
      contexts: contextMap,
      availableContexts
    });
  } catch (error) {
    console.error('Get calendar contexts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Initiate OAuth flow for adding a new calendar account
router.post('/add', auth, async (req, res) => {
  try {
    const { displayName, mockMode = true } = req.body; // Default to mock mode for now
    
    if (mockMode) {
      // Mock mode - simulate adding an account
      const mockEmail = `mock.user.${Date.now()}@gmail.com`;
      const mockCalendarId = `mock_calendar_${Date.now()}`;
      
      const result = db.prepare(`
        INSERT INTO calendar_accounts (
          user_id, 
          google_account_email, 
          calendar_id, 
          display_name, 
          access_token, 
          refresh_token,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(
        req.user.id,
        mockEmail,
        mockCalendarId,
        displayName || `Mock Account ${Date.now()}`,
        'mock_access_token',
        'mock_refresh_token'
      );
      
      return res.json({ 
        success: true, 
        mockMode: true,
        accountId: result.lastInsertRowid,
        message: 'Mock calendar account added successfully' 
      });
    }
    
    // Real Google OAuth integration - use existing Google Calendar service
    const googleCalendarService = require('../services/googleCalendar');
    
    if (!googleCalendarService.isConfigured()) {
      return res.status(503).json({ 
        error: 'Google Calendar not configured', 
        mockMode: true 
      });
    }
    
    // Generate OAuth URL using the existing service but with calendar-specific redirect
    const authUrl = googleCalendarService.generateAuthUrl(req.user.id);
    
    res.json({ 
      authUrl,
      message: 'Redirect to Google OAuth to add account'
    });
  } catch (error) {
    console.error('Add calendar account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove a calendar account
router.delete('/:id', auth, (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    
    // Check if account belongs to user
    const account = db.prepare(`
      SELECT id FROM calendar_accounts 
      WHERE id = ? AND user_id = ?
    `).get(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ message: 'Calendar account not found' });
    }
    
    // Remove account (soft delete)
    db.prepare(`
      UPDATE calendar_accounts 
      SET is_active = 0 
      WHERE id = ?
    `).run(accountId);
    
    // Remove any context associations
    db.prepare(`
      DELETE FROM calendar_contexts 
      WHERE calendar_account_id = ? AND user_id = ?
    `).run(accountId, req.user.id);
    
    res.json({ message: 'Calendar account removed successfully' });
  } catch (error) {
    console.error('Remove calendar account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Set account as default for a context
router.put('/:id/context', [
  auth,
  body('context').isIn(['work', 'personal', 'family']).withMessage('Invalid context')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const accountId = parseInt(req.params.id);
    const { context } = req.body;
    
    // Check if account belongs to user
    const account = db.prepare(`
      SELECT id FROM calendar_accounts 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).get(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ message: 'Calendar account not found' });
    }
    
    // Remove existing context assignment if any
    db.prepare(`
      DELETE FROM calendar_contexts 
      WHERE user_id = ? AND context_name = ?
    `).run(req.user.id, context);
    
    // Set new context assignment
    db.prepare(`
      INSERT INTO calendar_contexts (user_id, context_name, calendar_account_id)
      VALUES (?, ?, ?)
    `).run(req.user.id, context, accountId);
    
    res.json({ 
      message: `Calendar account set as default for ${context} context`,
      context,
      accountId 
    });
  } catch (error) {
    console.error('Set calendar context error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove context assignment
router.delete('/:id/context/:contextName', auth, (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const { contextName } = req.params;
    
    // Check if account belongs to user
    const account = db.prepare(`
      SELECT id FROM calendar_accounts 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).get(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ message: 'Calendar account not found' });
    }
    
    // Remove context assignment
    const result = db.prepare(`
      DELETE FROM calendar_contexts 
      WHERE user_id = ? AND context_name = ? AND calendar_account_id = ?
    `).run(req.user.id, contextName, accountId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Context assignment not found' });
    }
    
    res.json({ 
      message: `Removed ${contextName} context assignment`,
      context: contextName,
      accountId 
    });
  } catch (error) {
    console.error('Remove calendar context error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get account details for a specific context
router.get('/context/:contextName', auth, (req, res) => {
  try {
    const { contextName } = req.params;
    
    if (!['work', 'personal', 'family'].includes(contextName)) {
      return res.status(400).json({ message: 'Invalid context' });
    }
    
    const account = db.prepare(`
      SELECT 
        ca.id,
        ca.google_account_email,
        ca.calendar_id,
        ca.display_name,
        cc.context_name
      FROM calendar_contexts cc
      JOIN calendar_accounts ca ON ca.id = cc.calendar_account_id
      WHERE cc.user_id = ? AND cc.context_name = ? AND ca.is_active = 1
    `).get(req.user.id, contextName);
    
    if (!account) {
      return res.json({ account: null, message: `No account set for ${contextName} context` });
    }
    
    res.json({ account });
  } catch (error) {
    console.error('Get context account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update account display name
router.put('/:id/name', [
  auth,
  body('displayName').notEmpty().withMessage('Display name is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const accountId = parseInt(req.params.id);
    const { displayName } = req.body;
    
    // Check if account belongs to user
    const account = db.prepare(`
      SELECT id FROM calendar_accounts 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).get(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ message: 'Calendar account not found' });
    }
    
    // Update display name
    db.prepare(`
      UPDATE calendar_accounts 
      SET display_name = ? 
      WHERE id = ?
    `).run(displayName, accountId);
    
    res.json({ 
      message: 'Account display name updated successfully',
      displayName 
    });
  } catch (error) {
    console.error('Update account name error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get account sync status
router.get('/:id/status', auth, (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    
    // Check if account belongs to user
    const account = db.prepare(`
      SELECT 
        id,
        google_account_email,
        display_name,
        calendar_id,
        is_active,
        created_at
      FROM calendar_accounts 
      WHERE id = ? AND user_id = ?
    `).get(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ message: 'Calendar account not found' });
    }
    
    // For now, return basic status. In a real implementation, 
    // you would check token validity, last sync time, etc.
    res.json({
      account,
      status: {
        connected: account.is_active === 1,
        lastSync: null, // Would get from actual sync data
        syncEnabled: true,
        hasValidTokens: account.is_active === 1
      }
    });
  } catch (error) {
    console.error('Get account status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to refresh access token if needed
async function refreshAccessTokenIfNeeded(account) {
  // If we have a refresh token and the access token is expired or about to expire
  // This is a simplified check - in production you'd want more sophisticated token management
  if (account.refresh_token && (!account.access_token || account.access_token === 'mock_access_token')) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({
        refresh_token: account.refresh_token
      });
      
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update the access token in the database
      db.prepare(`
        UPDATE calendar_accounts 
        SET access_token = ? 
        WHERE id = ?
      `).run(credentials.access_token, account.id);
      
      return credentials.access_token;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }
  
  return account.access_token;
}

// Get available calendars from a Google account
router.get('/:accountId/calendars', auth, async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    
    // Check if account belongs to user
    const account = db.prepare(`
      SELECT * FROM calendar_accounts 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).get(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ message: 'Calendar account not found' });
    }
    
    // Get current selections for this account
    const currentSelections = db.prepare(`
      SELECT 
        google_calendar_id,
        google_calendar_name,
        context_name,
        is_selected
      FROM calendar_selections
      WHERE calendar_account_id = ?
    `).all(accountId);
    
    // If this is a mock account, return mock calendar data
    if (account.access_token === 'mock_access_token') {
      const mockCalendars = [
        {
          id: 'primary',
          summary: 'Primary Calendar',
          description: 'Main personal calendar',
          primary: true,
          selected: false,
          contexts: []
        },
        {
          id: `work_calendar_${accountId}`,
          summary: 'Work Calendar',
          description: 'Professional events and meetings',
          primary: false,
          selected: false,
          contexts: []
        },
        {
          id: `family_calendar_${accountId}`,
          summary: 'Family Calendar',
          description: 'Family events and activities',
          primary: false,
          selected: false,
          contexts: []
        }
      ];
      
      // Apply current selections to mock calendars
      mockCalendars.forEach(calendar => {
        const selections = currentSelections.filter(s => s.google_calendar_id === calendar.id);
        calendar.selected = selections.some(s => s.is_selected);
        calendar.contexts = selections
          .filter(s => s.is_selected)
          .map(s => s.context_name);
      });
      
      return res.json({
        calendars: mockCalendars,
        totalCount: mockCalendars.length
      });
    }
    
    // For real Google accounts, fetch from Google Calendar API
    try {
      const accessToken = await refreshAccessTokenIfNeeded(account);
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: account.refresh_token
      });
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.calendarList.list({
        maxResults: 50,
        showHidden: false
      });
      
      const calendars = response.data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description || '',
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        selected: false,
        contexts: []
      }));
      
      // Apply current selections
      calendars.forEach(calendar => {
        const selections = currentSelections.filter(s => s.google_calendar_id === calendar.id);
        calendar.selected = selections.some(s => s.is_selected);
        calendar.contexts = selections
          .filter(s => s.is_selected)
          .map(s => s.context_name);
      });
      
      res.json({
        calendars,
        totalCount: calendars.length
      });
      
    } catch (error) {
      console.error('Google Calendar API error:', error);
      
      // If authentication fails, return an error with details
      if (error.code === 401 || error.code === 403) {
        return res.status(401).json({ 
          message: 'Google Calendar authentication failed. Please reconnect your account.',
          needsReauth: true 
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to fetch calendars from Google',
        error: error.message 
      });
    }
  } catch (error) {
    console.error('Get account calendars error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update selected calendars for an account
router.put('/:accountId/calendars', [
  auth,
  body('selections').isArray().withMessage('Selections must be an array'),
  body('selections.*.calendarId').notEmpty().withMessage('Calendar ID is required'),
  body('selections.*.calendarName').optional(),
  body('selections.*.contexts').isArray().withMessage('Contexts must be an array'),
  body('selections.*.contexts.*').isIn(['work', 'personal', 'family']).withMessage('Invalid context')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const accountId = parseInt(req.params.accountId);
    const { selections } = req.body;
    
    // Check if account belongs to user
    const account = db.prepare(`
      SELECT id FROM calendar_accounts 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).get(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ message: 'Calendar account not found' });
    }
    
    // Start transaction
    const transaction = db.transaction(() => {
      // Clear existing selections for this account
      db.prepare(`
        DELETE FROM calendar_selections 
        WHERE calendar_account_id = ?
      `).run(accountId);
      
      // Insert new selections
      const insertSelection = db.prepare(`
        INSERT INTO calendar_selections (
          calendar_account_id, 
          google_calendar_id, 
          google_calendar_name, 
          context_name, 
          is_selected,
          updated_at
        ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);
      
      selections.forEach(selection => {
        if (selection.contexts && selection.contexts.length > 0) {
          selection.contexts.forEach(context => {
            insertSelection.run(
              accountId,
              selection.calendarId,
              selection.calendarName || null,
              context
            );
          });
        }
      });
      
      // Update the calendar_contexts table to reflect the new assignments
      // Clear existing context assignments for this account
      db.prepare(`
        DELETE FROM calendar_contexts 
        WHERE calendar_account_id = ?
      `).run(accountId);
      
      // Add new context assignments based on the first calendar selected for each context
      const contextAssignments = new Map();
      selections.forEach(selection => {
        if (selection.contexts && selection.contexts.length > 0) {
          selection.contexts.forEach(context => {
            if (!contextAssignments.has(context)) {
              contextAssignments.set(context, selection.calendarId);
            }
          });
        }
      });
      
      const insertContext = db.prepare(`
        INSERT INTO calendar_contexts (user_id, context_name, calendar_account_id)
        VALUES (?, ?, ?)
      `);
      
      contextAssignments.forEach((calendarId, context) => {
        insertContext.run(req.user.id, context, accountId);
      });
    });
    
    transaction();
    
    res.json({ 
      message: 'Calendar selections updated successfully',
      selectionsCount: selections.reduce((total, sel) => total + (sel.contexts?.length || 0), 0)
    });
    
  } catch (error) {
    console.error('Update calendar selections error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get calendar selections for an account
router.get('/:accountId/selections', auth, (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    
    // Check if account belongs to user
    const account = db.prepare(`
      SELECT id FROM calendar_accounts 
      WHERE id = ? AND user_id = ? AND is_active = 1
    `).get(accountId, req.user.id);
    
    if (!account) {
      return res.status(404).json({ message: 'Calendar account not found' });
    }
    
    const selections = db.prepare(`
      SELECT 
        google_calendar_id,
        google_calendar_name,
        context_name,
        is_selected,
        created_at,
        updated_at
      FROM calendar_selections
      WHERE calendar_account_id = ? AND is_selected = 1
      ORDER BY google_calendar_name, context_name
    `).all(accountId);
    
    // Group selections by calendar
    const calendarSelections = {};
    selections.forEach(selection => {
      if (!calendarSelections[selection.google_calendar_id]) {
        calendarSelections[selection.google_calendar_id] = {
          calendarId: selection.google_calendar_id,
          calendarName: selection.google_calendar_name,
          contexts: []
        };
      }
      calendarSelections[selection.google_calendar_id].contexts.push(selection.context_name);
    });
    
    res.json({
      selections: Object.values(calendarSelections),
      totalCount: Object.keys(calendarSelections).length
    });
    
  } catch (error) {
    console.error('Get calendar selections error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;