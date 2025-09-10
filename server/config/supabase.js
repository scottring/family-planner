const { createClient } = require('@supabase/supabase-js');

// You'll get these from your Supabase project settings
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

// Create client with anon key for client-side operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create admin client with service key for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions to match SQLite patterns
const db = {
  // Simulate SQLite's prepare().get() pattern
  from: (table) => ({
    select: async (columns = '*') => {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select(columns);
      if (error) throw error;
      return data;
    },
    
    selectSingle: async (columns = '*') => {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select(columns)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data;
    },
    
    insert: async (values) => {
      const { data, error } = await supabaseAdmin
        .from(table)
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    
    update: async (values) => ({
      eq: async (column, value) => {
        const { data, error } = await supabaseAdmin
          .from(table)
          .update(values)
          .eq(column, value)
          .select();
        if (error) throw error;
        return data;
      }
    }),
    
    delete: async () => ({
      eq: async (column, value) => {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq(column, value);
        if (error) throw error;
        return true;
      }
    }),
    
    // For complex queries
    query: async (filters = {}) => {
      let query = supabaseAdmin.from(table).select('*');
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  }),
  
  // Parse JSON helper (PostgreSQL returns JSONB natively)
  parseJSON: (value) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value || {};
  }
};

module.exports = { supabase, supabaseAdmin, db };