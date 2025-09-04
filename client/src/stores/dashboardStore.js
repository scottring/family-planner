import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { authAPI } from '../services/auth';

export const useDashboardStore = create(
  persist(
    (set, get) => ({
      // View mode state
      currentView: 'family', // 'family' or 'personal'
      
      // Widget visibility
      widgetVisibility: {
        todayAtGlance: true,
        myResponsibilities: true,
        partnerStatus: true,
        familyOverview: true,
        quickActions: true,
        tomorrowPrep: true,
        conflictAlert: true,
      },
      
      // Dashboard layout preferences
      layoutPreferences: {
        compactMode: false,
        showWeather: true,
        showNextEventCountdown: true,
        defaultView: 'family', // user's default view preference
      },
      
      // Cached dashboard data
      dashboardData: {
        todaysSummary: null,
        personalSummary: null,
        familyWorkload: null,
        upcomingConflicts: [],
        weatherData: null,
        lastUpdated: null,
      },
      
      // Loading states
      loading: {
        summary: false,
        personal: false,
        weather: false,
      },
      
      error: null,

      // Actions
      setCurrentView: async (view) => {
        set({ currentView: view });
        
        // Save to server
        try {
          await authAPI.updateDashboardPreferences({
            currentView: view,
            widgetVisibility: get().widgetVisibility,
            layoutPreferences: get().layoutPreferences,
          });
        } catch (error) {
          console.warn('Failed to save current view to server:', error);
        }
      },

      toggleWidget: async (widgetName) => {
        const newVisibility = {
          ...get().widgetVisibility,
          [widgetName]: !get().widgetVisibility[widgetName],
        };
        
        set({
          widgetVisibility: newVisibility,
        });

        // Save to server
        try {
          await authAPI.updateDashboardPreferences({
            currentView: get().currentView,
            widgetVisibility: newVisibility,
            layoutPreferences: get().layoutPreferences,
          });
        } catch (error) {
          console.warn('Failed to save widget visibility to server:', error);
        }
      },

      setWidgetVisibility: (widgetName, isVisible) => {
        set((state) => ({
          widgetVisibility: {
            ...state.widgetVisibility,
            [widgetName]: isVisible,
          },
        }));
      },

      updateLayoutPreferences: async (preferences) => {
        set((state) => ({
          layoutPreferences: {
            ...state.layoutPreferences,
            ...preferences,
          },
        }));

        // Save to server
        try {
          const updatedPreferences = { ...get().layoutPreferences, ...preferences };
          await authAPI.updateDashboardPreferences({
            currentView: get().currentView,
            widgetVisibility: get().widgetVisibility,
            layoutPreferences: updatedPreferences,
          });
        } catch (error) {
          console.warn('Failed to save layout preferences to server:', error);
        }
      },

      // Fetch today's dashboard summary
      fetchDashboardSummary: async () => {
        set((state) => ({
          loading: { ...state.loading, summary: true },
          error: null,
        }));

        try {
          const response = await api.get('/dashboard/summary');
          const summaryData = response.data;

          set((state) => ({
            dashboardData: {
              ...state.dashboardData,
              todaysSummary: summaryData,
              lastUpdated: new Date().toISOString(),
            },
            loading: { ...state.loading, summary: false },
          }));

          return summaryData;
        } catch (error) {
          set((state) => ({
            error: error.response?.data?.message || 'Failed to fetch dashboard summary',
            loading: { ...state.loading, summary: false },
          }));
          throw error;
        }
      },

      // Fetch personal dashboard data
      fetchPersonalDashboard: async (userId) => {
        set((state) => ({
          loading: { ...state.loading, personal: true },
          error: null,
        }));

        try {
          const response = await api.get(`/dashboard/personal/${userId}`);
          const personalData = response.data;

          set((state) => ({
            dashboardData: {
              ...state.dashboardData,
              personalSummary: personalData,
              lastUpdated: new Date().toISOString(),
            },
            loading: { ...state.loading, personal: false },
          }));

          return personalData;
        } catch (error) {
          set((state) => ({
            error: error.response?.data?.message || 'Failed to fetch personal dashboard',
            loading: { ...state.loading, personal: false },
          }));
          throw error;
        }
      },

      // Fetch weather data
      fetchWeatherData: async () => {
        if (!get().layoutPreferences.showWeather) return;

        set((state) => ({
          loading: { ...state.loading, weather: true },
          error: null,
        }));

        try {
          const response = await api.get('/dashboard/weather');
          const weatherData = response.data;

          set((state) => ({
            dashboardData: {
              ...state.dashboardData,
              weatherData: weatherData.current,
              lastUpdated: new Date().toISOString(),
            },
            loading: { ...state.loading, weather: false },
          }));

          return weatherData.current;
        } catch (error) {
          // Weather is non-critical, don't show error to user
          console.warn('Weather fetch failed:', error);
          set((state) => ({
            loading: { ...state.loading, weather: false },
          }));
        }
      },

      // Refresh all dashboard data
      refreshDashboard: async (userId) => {
        const promises = [
          get().fetchDashboardSummary(),
          get().fetchWeatherData(),
        ];

        if (get().currentView === 'personal' && userId) {
          promises.push(get().fetchPersonalDashboard(userId));
        }

        try {
          await Promise.allSettled(promises);
        } catch (error) {
          console.error('Dashboard refresh error:', error);
        }
      },

      // Get cached data helpers
      getTodaysSummary: () => get().dashboardData.todaysSummary,
      getPersonalSummary: () => get().dashboardData.personalSummary,
      getWeatherData: () => get().dashboardData.weatherData,
      
      // Check if data is stale (older than 5 minutes)
      isDataStale: () => {
        const { lastUpdated } = get().dashboardData;
        if (!lastUpdated) return true;
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return new Date(lastUpdated) < fiveMinutesAgo;
      },

      // Reset dashboard state
      resetDashboard: () => {
        set({
          dashboardData: {
            todaysSummary: null,
            personalSummary: null,
            familyWorkload: null,
            upcomingConflicts: [],
            weatherData: null,
            lastUpdated: null,
          },
          loading: {
            summary: false,
            personal: false,
            weather: false,
          },
          error: null,
        });
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        currentView: state.currentView,
        widgetVisibility: state.widgetVisibility,
        layoutPreferences: state.layoutPreferences,
      }),
    }
  )
);