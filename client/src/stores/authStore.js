import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/auth';
import { supabase } from '../services/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Initialize auth state from Supabase
      initialize: async () => {
        set({ isLoading: true });
        
        try {
          // Get current session from Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Get user profile
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', session.user.id)
              .single();
            
            set({
              user: profile,
              token: session.access_token,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false });
        }
        
        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            set({ user: null, token: null });
          } else if (session) {
            // Get updated user profile
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', session.user.id)
              .single();
            
            set({
              user: profile,
              token: session.access_token,
            });
          }
        });
      },

      // Login function
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.login({ username, password });
          const { user, token } = response.data;

          set({
            user,
            token,
            isLoading: false,
            error: null,
          });

          return response.data;
        } catch (error) {
          const errorMessage = error.message || 'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      // Register function
      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.register({ username, email, password });
          const { user, token } = response.data;

          set({
            user,
            token,
            isLoading: false,
            error: null,
          });

          return response.data;
        } catch (error) {
          const errorMessage = error.message || 'Registration failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      // Logout function
      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        set({
          user: null,
          token: null,
          isLoading: false,
          error: null,
        });
      },

      // Update user profile
      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.updateProfile(profileData);
          const updatedUser = response.data;

          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });

          return updatedUser;
        } catch (error) {
          const errorMessage = error.message || 'Profile update failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check if user is authenticated
      isAuthenticated: () => {
        const state = get();
        return !!(state.user && state.token);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Supabase handles session persistence, we don't need to store tokens
      }),
    }
  )
);

// Initialize auth store when the module loads
useAuthStore.getState().initialize();