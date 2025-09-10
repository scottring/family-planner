import { supabase } from './supabase';
import googleCalendar from './googleCalendar';

class CalendarAccountsService {
  constructor() {
    // Initialize in-memory context storage
    this.contextAssignments = {};
    this.accountsData = new Map();
    // Load persisted context assignments from localStorage
    this.loadPersistedContexts();
  }

  loadPersistedContexts() {
    try {
      const stored = localStorage.getItem('calendar_context_assignments');
      if (stored) {
        this.contextAssignments = JSON.parse(stored);
        console.log('Loaded persisted context assignments:', this.contextAssignments);
      }
    } catch (err) {
      console.error('Failed to load persisted contexts:', err);
    }
  }

  persistContexts() {
    try {
      localStorage.setItem('calendar_context_assignments', JSON.stringify(this.contextAssignments));
      console.log('Persisted context assignments to localStorage');
    } catch (err) {
      console.error('Failed to persist contexts:', err);
    }
  }

  async getAccounts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const accounts = [];
    
    // Always show the primary Google Calendar account for the logged-in user
    const googleAccount = {
      id: 'google_primary',
      display_name: 'Google Calendar',
      google_account_email: user.email,
      connected: true, // Assume connected if user is logged in
      isGoogle: true
    };
    accounts.push(googleAccount);
    this.accountsData.set('google_primary', googleAccount);
    
    // Check if there are any additional calendar accounts in localStorage
    const storedAccounts = localStorage.getItem('additional_calendar_accounts');
    if (storedAccounts) {
      try {
        const additionalAccounts = JSON.parse(storedAccounts);
        additionalAccounts.forEach(acc => {
          accounts.push(acc);
          this.accountsData.set(acc.id, acc);
        });
      } catch (e) {
        console.error('Failed to parse stored accounts:', e);
      }
    }
    
    return accounts;
  }

  async getContexts() {
    // Try to load from Supabase first for cross-device sync
    try {
      // Add a timeout to prevent hanging
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout')), 2000)
      );
      
      const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
      
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('preference_value')
            .eq('user_id', user.id)
            .eq('preference_key', 'calendar_context_assignments')
            .single();
          
          if (!error && data?.preference_value) {
            this.contextAssignments = JSON.parse(data.preference_value);
            // Update localStorage with server data
            this.persistContexts();
            console.log('Loaded context assignments from Supabase:', this.contextAssignments);
          }
        } catch (dbErr) {
          console.log('Database query failed, using local storage:', dbErr.message);
        }
      }
    } catch (err) {
      console.log('Could not check Supabase, using local storage:', err.message);
    }
    
    console.log('CalendarAccountsService.getContexts - current assignments:', this.contextAssignments);
    
    // Return current context assignments
    return {
      contexts: { ...this.contextAssignments },
      availableContexts: ['work', 'personal', 'family']
    };
  }

  async addAccount(displayName, mockMode = false) {
    if (mockMode) {
      return {
        success: true,
        mockMode: true,
        message: 'Mock Google Calendar account added'
      };
    }
    
    // Use simple Google sign-in
    try {
      await googleCalendar.init();
      const success = await googleCalendar.signIn();
      
      if (success) {
        // Sync initial events to Supabase
        try {
          await googleCalendar.syncToSupabase(supabase);
        } catch (syncError) {
          console.log('Initial sync failed, will retry later:', syncError);
        }
        
        return {
          success: true,
          mockMode: false,
          message: 'Google Calendar connected successfully!'
        };
      }
    } catch (err) {
      console.error('Failed to connect Google Calendar:', err);
      return {
        success: false,
        mockMode: false,
        message: 'Failed to connect Google Calendar. Please check your Google API credentials.'
      };
    }
    
    return {
      success: false,
      mockMode: false,
      message: 'Google Calendar connection failed'
    };
  }

  async removeAccount(accountId) {
    // Remove account from storage
    this.accountsData.delete(accountId);
    
    // Remove any context assignments for this account
    Object.keys(this.contextAssignments).forEach(context => {
      if (this.contextAssignments[context]?.accountId === accountId) {
        delete this.contextAssignments[context];
      }
    });
    
    return { success: true };
  }

  async setContext(accountId, context) {
    console.log('CalendarAccountsService.setContext called:', { accountId, context });
    console.log('Current accountsData:', this.accountsData);
    console.log('Looking for account:', accountId);
    
    // First ensure we have the account data
    if (!this.accountsData.has(accountId)) {
      console.log('Account not in cache, fetching accounts...');
      // Try to fetch accounts if not loaded
      await this.getAccounts();
      console.log('After fetching, accountsData:', this.accountsData);
    }
    
    let account = this.accountsData.get(accountId);
    
    // If still not found, create a minimal account object
    if (!account) {
      console.log('Account still not found, creating minimal account object');
      // For google_primary, we can create a basic account
      if (accountId === 'google_primary') {
        const { data: { user } } = await supabase.auth.getUser();
        account = {
          id: 'google_primary',
          display_name: 'Google Calendar',
          google_account_email: user?.email || 'user@gmail.com'
        };
        this.accountsData.set(accountId, account);
      } else {
        console.error('Account not found and cannot create:', accountId);
        throw new Error('Account not found');
      }
    }
    
    // Set the context assignment
    this.contextAssignments[context] = {
      accountId: accountId,
      displayName: account.display_name,
      email: account.google_account_email
    };
    
    // Persist to localStorage
    this.persistContexts();
    
    // Also save to Supabase for cross-device sync (with timeout)
    try {
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase timeout')), 2000)
      );
      
      const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
      
      if (user) {
        // Try to save but don't wait too long
        const savePromise = supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preference_key: 'calendar_context_assignments',
            preference_value: JSON.stringify(this.contextAssignments)
          }, {
            onConflict: 'user_id,preference_key'
          });
        
        const saveTimeout = new Promise((resolve) => 
          setTimeout(() => resolve({ error: 'Save timeout' }), 2000)
        );
        
        await Promise.race([savePromise, saveTimeout]);
        console.log('Attempted to save context assignments to Supabase');
      }
    } catch (err) {
      console.log('Could not save to Supabase (will use localStorage):', err.message);
      // Continue anyway - localStorage is our fallback
    }
    
    console.log('Context assigned successfully:', {
      context,
      assignment: this.contextAssignments[context],
      allAssignments: this.contextAssignments
    });
    
    return { success: true };
  }

  async removeContext(accountId, context) {
    console.log('CalendarAccountsService.removeContext called:', { accountId, context });
    
    if (this.contextAssignments[context]?.accountId === accountId) {
      delete this.contextAssignments[context];
      
      // Persist to localStorage
      this.persistContexts();
      
      // Also save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              preference_key: 'calendar_context_assignments',
              preference_value: JSON.stringify(this.contextAssignments)
            }, {
              onConflict: 'user_id,preference_key'
            });
        }
      } catch (err) {
        console.error('Failed to save to Supabase:', err);
      }
      
      console.log('Context removed successfully:', { context, remainingAssignments: this.contextAssignments });
    }
    
    return { success: true };
  }

  async updateDisplayName(accountId, displayName) {
    return { success: true };
  }

  async getCalendars(accountId) {
    // Return mock calendars
    return {
      calendars: [
        {
          id: 'primary',
          summary: 'Primary Calendar',
          description: 'Your main calendar',
          primary: true,
          selected: true,
          contexts: ['personal']
        },
        {
          id: 'work',
          summary: 'Work Calendar',
          description: 'Work events',
          selected: false,
          contexts: []
        }
      ]
    };
  }

  async saveCalendarSelections(accountId, selections) {
    return { success: true };
  }
}

export default new CalendarAccountsService();