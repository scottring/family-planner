import { supabase } from './supabase';

export const authAPI = {
  // Login user
  login: async (credentials) => {
    // First get the email from username
    const { data: userProfile } = await supabase
      .from('users')
      .select('email')
      .eq('username', credentials.username)
      .single();
    
    if (!userProfile) {
      throw new Error('Invalid credentials');
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userProfile.email,
      password: credentials.password
    });

    if (error) {
      throw new Error(error.message);
    }

    // Get full user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();

    return {
      data: {
        token: data.session.access_token,
        user: profile
      }
    };
  },

  // Register new user
  register: async (userData) => {
    const { username, password, email, full_name } = userData;
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        auth_id: authData.user.id,
        username,
        email,
        full_name: full_name || username
      })
      .select()
      .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    return {
      data: {
        token: authData.session.access_token,
        user: profile
      }
    };
  },

  // Logout user
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { data: { message: 'Logged out successfully' } };
  },

  // Get current user profile
  getProfile: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    return { data: profile };
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('users')
      .update(profileData)
      .eq('auth_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  // Change password
  changePassword: async (passwordData) => {
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });
    
    if (error) throw error;
    return { data: { message: 'Password updated successfully' } };
  },

  // Forgot password
  forgotPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { data: { message: 'Password reset email sent' } };
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return { data: { message: 'Password reset successfully' } };
  },

  // Get user preferences
  getPreferences: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data } = await supabase
      .from('users')
      .select('preferences')
      .eq('auth_id', user.id)
      .single();

    return { data: data?.preferences || {} };
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('users')
      .update({ preferences })
      .eq('auth_id', user.id)
      .select('preferences')
      .single();

    if (error) throw error;
    return { data: data.preferences };
  },

  // Update dashboard preferences specifically
  updateDashboardPreferences: async (dashboardPreferences) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get current preferences
    const { data: currentUser } = await supabase
      .from('users')
      .select('preferences')
      .eq('auth_id', user.id)
      .single();

    const updatedPreferences = {
      ...currentUser.preferences,
      dashboard: dashboardPreferences
    };

    const { data, error } = await supabase
      .from('users')
      .update({ preferences: updatedPreferences })
      .eq('auth_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  },

  // Refresh token
  refreshToken: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return { 
      data: { 
        token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    };
  },

  // Delete account
  deleteAccount: async (password) => {
    // Would need admin privileges to delete user
    throw new Error('Account deletion not yet implemented');
  },

  // Verify email
  verifyEmail: async (token) => {
    // Supabase handles this automatically
    return { data: { message: 'Email verified' } };
  },

  // Resend verification email
  resendVerification: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email
    });
    if (error) throw error;
    return { data: { message: 'Verification email sent' } };
  }
};