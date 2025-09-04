import { create } from 'zustand';
import api from '../services/api';

export const useConflictStore = create((set, get) => ({
  conflicts: [],
  loading: false,
  error: null,
  statistics: null,
  resolving: {},

  // Fetch all active conflicts
  fetchActiveConflicts: async (limit = null) => {
    set({ loading: true, error: null });
    try {
      const params = limit ? `?limit=${limit}` : '';
      const response = await api.get(`/conflicts/active${params}`);
      set({ 
        conflicts: response.data.conflicts || [], 
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch conflicts', 
        loading: false 
      });
      console.error('Error fetching active conflicts:', error);
    }
  },

  // Detect conflicts for a date range
  detectConflicts: async (startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start', startDate);
      if (endDate) params.append('end', endDate);
      
      const response = await api.get(`/conflicts/detect?${params.toString()}`);
      set({ 
        conflicts: response.data.conflicts || [],
        loading: false 
      });
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to detect conflicts', 
        loading: false 
      });
      console.error('Error detecting conflicts:', error);
      throw error;
    }
  },

  // Get upcoming conflicts (next 48 hours)
  fetchUpcomingConflicts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/conflicts/upcoming');
      set({ 
        conflicts: response.data.conflicts || [],
        loading: false 
      });
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch upcoming conflicts', 
        loading: false 
      });
      console.error('Error fetching upcoming conflicts:', error);
      throw error;
    }
  },

  // Get specific conflict by ID
  fetchConflictById: async (conflictId) => {
    try {
      const response = await api.get(`/conflicts/${conflictId}`);
      return response.data.conflict;
    } catch (error) {
      console.error('Error fetching conflict details:', error);
      throw error;
    }
  },

  // Resolve a conflict
  resolveConflict: async (conflictId, resolution) => {
    set(state => ({ 
      resolving: { ...state.resolving, [conflictId]: true } 
    }));

    try {
      const response = await api.post(`/conflicts/${conflictId}/resolve`, {
        resolution
      });

      // Remove resolved conflict from the list
      set(state => ({
        conflicts: state.conflicts.filter(c => c.id !== conflictId),
        resolving: { ...state.resolving, [conflictId]: false }
      }));

      return response.data;
    } catch (error) {
      set(state => ({ 
        resolving: { ...state.resolving, [conflictId]: false },
        error: error.response?.data?.message || 'Failed to resolve conflict'
      }));
      console.error('Error resolving conflict:', error);
      throw error;
    }
  },

  // Acknowledge a conflict
  acknowledgeConflict: async (conflictId) => {
    set(state => ({ 
      resolving: { ...state.resolving, [conflictId]: true } 
    }));

    try {
      const response = await api.post(`/conflicts/${conflictId}/acknowledge`);

      // Update conflict status in the list
      set(state => ({
        conflicts: state.conflicts.map(c => 
          c.id === conflictId 
            ? { ...c, status: 'acknowledged' }
            : c
        ),
        resolving: { ...state.resolving, [conflictId]: false }
      }));

      return response.data;
    } catch (error) {
      set(state => ({ 
        resolving: { ...state.resolving, [conflictId]: false },
        error: error.response?.data?.message || 'Failed to acknowledge conflict'
      }));
      console.error('Error acknowledging conflict:', error);
      throw error;
    }
  },

  // Ignore a conflict
  ignoreConflict: async (conflictId) => {
    set(state => ({ 
      resolving: { ...state.resolving, [conflictId]: true } 
    }));

    try {
      const response = await api.post(`/conflicts/${conflictId}/ignore`);

      // Remove ignored conflict from the list
      set(state => ({
        conflicts: state.conflicts.filter(c => c.id !== conflictId),
        resolving: { ...state.resolving, [conflictId]: false }
      }));

      return response.data;
    } catch (error) {
      set(state => ({ 
        resolving: { ...state.resolving, [conflictId]: false },
        error: error.response?.data?.message || 'Failed to ignore conflict'
      }));
      console.error('Error ignoring conflict:', error);
      throw error;
    }
  },

  // Update conflict status
  updateConflictStatus: async (conflictId, status) => {
    try {
      const response = await api.put(`/conflicts/${conflictId}`, { status });
      
      // Update conflict status in the list
      set(state => ({
        conflicts: state.conflicts.map(c => 
          c.id === conflictId 
            ? { ...c, status: status }
            : c
        )
      }));
      
      return response.data;
    } catch (error) {
      set(state => ({ 
        error: error.response?.data?.message || 'Failed to update conflict status'
      }));
      console.error('Error updating conflict status:', error);
      throw error;
    }
  },

  // Get AI resolution suggestions
  getResolutionSuggestions: async (conflict) => {
    try {
      const response = await api.post('/conflicts/suggest-resolution', {
        conflict
      });
      return response.data.suggestions;
    } catch (error) {
      console.error('Error getting resolution suggestions:', error);
      throw error;
    }
  },

  // Bulk resolve conflicts
  bulkResolveConflicts: async (conflictIds, resolution) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/conflicts/bulk-resolve', {
        conflict_ids: conflictIds,
        resolution
      });

      // Remove resolved conflicts from the list
      set(state => ({
        conflicts: state.conflicts.filter(c => !conflictIds.includes(c.id)),
        loading: false
      }));

      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to bulk resolve conflicts', 
        loading: false 
      });
      console.error('Error bulk resolving conflicts:', error);
      throw error;
    }
  },

  // Get conflict statistics
  fetchStatistics: async (timeframe = 'week') => {
    try {
      const response = await api.get(`/conflicts/stats?timeframe=${timeframe}`);
      set({ statistics: response.data.stats });
      return response.data.stats;
    } catch (error) {
      console.error('Error fetching conflict statistics:', error);
      throw error;
    }
  },

  // Utility functions
  getConflictsByType: (type) => {
    const conflicts = get().conflicts;
    return conflicts.filter(c => c.type === type);
  },

  getConflictsBySeverity: (severity) => {
    const conflicts = get().conflicts;
    return conflicts.filter(c => c.severity === severity);
  },

  getCriticalConflicts: () => {
    const conflicts = get().conflicts;
    return conflicts.filter(c => c.severity === 'critical');
  },

  getHighPriorityConflicts: () => {
    const conflicts = get().conflicts;
    return conflicts.filter(c => c.severity === 'critical' || c.severity === 'high');
  },

  hasActiveConflicts: () => {
    const conflicts = get().conflicts;
    return conflicts.length > 0;
  },

  hasCriticalConflicts: () => {
    const conflicts = get().conflicts;
    return conflicts.some(c => c.severity === 'critical');
  },

  // Format conflict for display
  formatConflictType: (type) => {
    const typeMap = {
      'time_overlap': 'Time Overlap',
      'location_travel': 'Travel Time',
      'resource_conflict': 'Resource Conflict',
      'unassigned_critical': 'Unassigned Event'
    };
    return typeMap[type] || type;
  },

  formatConflictSeverity: (severity) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  },

  getSeverityColor: (severity) => {
    const colorMap = {
      'critical': 'text-red-700 bg-red-100 border-red-300',
      'high': 'text-orange-700 bg-orange-100 border-orange-300',
      'medium': 'text-yellow-700 bg-yellow-100 border-yellow-300',
      'low': 'text-blue-700 bg-blue-100 border-blue-300'
    };
    return colorMap[severity] || 'text-gray-700 bg-gray-100 border-gray-300';
  },

  getSeverityIcon: (severity) => {
    const iconMap = {
      'critical': 'AlertTriangle',
      'high': 'AlertCircle',
      'medium': 'Info',
      'low': 'CheckCircle'
    };
    return iconMap[severity] || 'Info';
  },

  // Clear error state
  clearError: () => {
    set({ error: null });
  },

  // Reset store
  reset: () => {
    set({ 
      conflicts: [], 
      loading: false, 
      error: null, 
      statistics: null, 
      resolving: {} 
    });
  }
}));