import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/auth';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Initialize auth state from storage
      initialize: () => {
        const token = localStorage.getItem('auth-token');
        const user = localStorage.getItem('auth-user');
        
        if (token && user) {
          try {
            set({
              token,
              user: JSON.parse(user),
              isLoading: false,
            });
          } catch (error) {
            // Clear invalid stored data
            localStorage.removeItem('auth-token');
            localStorage.removeItem('auth-user');
            set({ user: null, token: null, isLoading: false });
          }
        } else {
          set({ isLoading: false });
        }
        
        // Listen for auth logout events from API
        window.addEventListener('auth:logout', () => {
          get().logout();
        });
      },

      // Login function
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.login({ username, password });
          const { user, token } = response.data;

          // Store in localStorage
          localStorage.setItem('auth-token', token);
          localStorage.setItem('auth-user', JSON.stringify(user));

          set({
            user,
            token,
            isLoading: false,
            error: null,
          });

          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed';
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

          // Store in localStorage
          localStorage.setItem('auth-token', token);
          localStorage.setItem('auth-user', JSON.stringify(user));

          set({
            user,
            token,
            isLoading: false,
            error: null,
          });

          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      // Logout function
      logout: () => {
        // Clear localStorage
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');

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

          // Update localStorage
          localStorage.setItem('auth-user', JSON.stringify(updatedUser));

          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });

          return updatedUser;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Profile update failed';
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
        user: state.user,
        token: state.token,
      }),
    }
  )
);

// Initialize auth store when the module loads
useAuthStore.getState().initialize();