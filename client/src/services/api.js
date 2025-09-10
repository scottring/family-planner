import { supabase } from './supabase';

// Helper to ensure user is authenticated
const requireAuth = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Authentication required');
  }
  return user;
};

// Get user ID from auth
const getUserId = async () => {
  const user = await requireAuth();
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  return data?.id;
};

const api = {
  // Events
  get: async (endpoint, options = {}) => {
    await requireAuth();
    
    // Handle notifications endpoints
    if (endpoint.startsWith('/notifications')) {
      // Return empty data for notifications - these aren't implemented in Supabase yet
      if (endpoint === '/notifications/preferences') {
        return { 
          data: {
            notification_types: {
              daily_brief: true,
              evening_prep: true,
              task_reminders: true,
              urgent_alerts: true
            },
            channel_settings: {
              email: true,
              push: false,
              sms: false
            },
            time_preferences: {
              morning_brief_time: '06:30',
              evening_prep_time: '20:00'
            },
            quiet_hours: {
              enabled: true,
              start: '22:00',
              end: '07:00'
            }
          }
        };
      }
      if (endpoint === '/notifications/stats') {
        return { data: { total: 0, unread: 0, today: 0 } };
      }
      return { data: [] };
    }
    
    // Handle calendar accounts endpoints
    if (endpoint.startsWith('/calendar-accounts')) {
      if (endpoint === '/calendar-accounts/contexts') {
        // Get user's calendar accounts and their contexts
        const userId = await getUserId();
        const { data: accounts, error } = await supabase
          .from('calendar_accounts')
          .select('*')
          .eq('user_id', userId);
        
        if (error) throw error;
        
        // Map accounts to contexts
        const contexts = {};
        accounts?.forEach(account => {
          const context = account.calendar_name?.toLowerCase().includes('work') ? 'work' : 
                         account.calendar_name?.toLowerCase().includes('family') ? 'family' : 'personal';
          contexts[context] = account.calendar_id;
        });
        
        return {
          data: {
            contexts,
            availableContexts: ['work', 'personal', 'family']
          }
        };
      }
      
      // Get all calendar accounts
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('calendar_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      return { data };
    }
    
    // Handle calendar/events endpoint
    if (endpoint.startsWith('/calendar/events')) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return { data };
    }
    
    // Parse endpoint
    if (endpoint.startsWith('/events')) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/tasks')) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/inbox')) {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('inbox_items')
        .select('*')
        .eq('user_id', userId)
        .eq('processed', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/family-members')) {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/meal-plans')) {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/family-notes')) {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('family_notes')
        .select('*')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/checklist-templates')) {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/planning-sessions')) {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('planning_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/addresses')) {
      // Note: addresses table doesn't exist in schema yet, return empty
      return { data: [] };
    }
    
    if (endpoint.startsWith('/handoffs')) {
      // Handoffs are stored in event's handoff_history field
      const { data, error } = await supabase
        .from('events')
        .select('id, title, handoff_history, assigned_to, backup_assignee')
        .not('handoff_history', 'eq', '[]')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return { data };
    }
    
    // Handle specific ID requests
    const idMatch = endpoint.match(/\/(\w+)\/(\d+)$/);
    if (idMatch) {
      const [, table, id] = idMatch;
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    // Return empty response for unknown endpoints instead of throwing
    console.warn(`Unknown endpoint: ${endpoint} - returning empty response`);
    return { data: [] };
  },

  post: async (endpoint, body) => {
    await requireAuth();
    
    // Handle notification endpoints
    if (endpoint.startsWith('/notifications')) {
      // Return success for notification endpoints
      return { data: { success: true, message: 'Notification endpoint not implemented' } };
    }
    
    const userId = await getUserId();
    
    // Add user_id to body if needed
    const dataWithUser = { ...body };
    
    // Handle /calendar/events endpoint
    if (endpoint.startsWith('/calendar/events')) {
      dataWithUser.created_by = userId;
      const { data, error } = await supabase
        .from('events')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/events')) {
      dataWithUser.created_by = userId;
      const { data, error } = await supabase
        .from('events')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/tasks')) {
      const { data, error } = await supabase
        .from('tasks')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/inbox')) {
      dataWithUser.user_id = userId;
      const { data, error } = await supabase
        .from('inbox_items')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/family-members')) {
      const { data, error } = await supabase
        .from('family_members')
        .insert(body)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/meal-plans')) {
      dataWithUser.user_id = userId;
      const { data, error } = await supabase
        .from('meal_plans')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/family-notes')) {
      dataWithUser.from_user_id = userId;
      const { data, error } = await supabase
        .from('family_notes')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/checklist-templates')) {
      dataWithUser.created_by = userId;
      const { data, error } = await supabase
        .from('checklist_templates')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/planning-sessions')) {
      dataWithUser.user_id = userId;
      const { data, error } = await supabase
        .from('planning_sessions')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    if (endpoint.startsWith('/calendar-accounts')) {
      dataWithUser.user_id = userId;
      const { data, error } = await supabase
        .from('calendar_accounts')
        .insert(dataWithUser)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    // Return empty response for unknown endpoints
    console.warn(`Unknown POST endpoint: ${endpoint} - returning success`);
    return { data: { success: true } };
  },

  put: async (endpoint, body) => {
    await requireAuth();
    
    // Handle notification endpoints
    if (endpoint.startsWith('/notifications')) {
      // Return success for notification endpoints
      return { data: { success: true } };
    }
    
    // Parse ID from endpoint - handle both /calendar/events/id and /events/id
    const idMatch = endpoint.match(/\/(?:calendar\/)?(\w+)\/(\d+)$/);
    if (!idMatch) {
      // Return success for other PUT endpoints without IDs
      console.warn(`Unknown PUT endpoint: ${endpoint} - returning success`);
      return { data: { success: true } };
    }
    
    const [, table, id] = idMatch;
    
    // Map table names
    const tableMap = {
      'events': 'events',
      'tasks': 'tasks',
      'inbox': 'inbox_items',
      'family-members': 'family_members',
      'meal-plans': 'meal_plans',
      'family-notes': 'family_notes',
      'checklist-templates': 'checklist_templates',
      'planning-sessions': 'planning_sessions',
      'calendar-accounts': 'calendar_accounts'
    };
    
    const actualTable = tableMap[table] || table;
    
    const { data, error } = await supabase
      .from(actualTable)
      .update(body)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  },

  patch: async (endpoint, body) => {
    // PATCH is same as PUT for our purposes
    return api.put(endpoint, body);
  },

  delete: async (endpoint) => {
    await requireAuth();
    
    // Parse ID from endpoint
    const idMatch = endpoint.match(/\/(\w+)\/(\d+)$/);
    if (!idMatch) {
      throw new Error(`Invalid endpoint for DELETE: ${endpoint}`);
    }
    
    const [, table, id] = idMatch;
    
    // Map table names
    const tableMap = {
      'events': 'events',
      'tasks': 'tasks',
      'inbox': 'inbox_items',
      'family-members': 'family_members',
      'meal-plans': 'meal_plans',
      'family-notes': 'family_notes',
      'checklist-templates': 'checklist_templates',
      'planning-sessions': 'planning_sessions',
      'calendar-accounts': 'calendar_accounts'
    };
    
    const actualTable = tableMap[table] || table;
    
    const { error } = await supabase
      .from(actualTable)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { data: { message: 'Deleted successfully' } };
  }
};

export default api;