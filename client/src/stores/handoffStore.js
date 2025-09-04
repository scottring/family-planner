import { create } from 'zustand';
import api from '../services/api';

export const useHandoffStore = create((set, get) => ({
  handoffs: null,
  stats: {},
  availableUsers: [],
  loading: false,
  error: null,

  // Fetch today's handoffs
  fetchTodaysHandoffs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/handoffs/today');
      set({ handoffs: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching today\'s handoffs:', error);
    }
  },

  // Fetch available users for handoffs
  fetchAvailableUsers: async () => {
    try {
      const response = await api.get('/handoffs/users');
      set({ availableUsers: response.data });
    } catch (error) {
      set({ error: error.message });
      console.error('Error fetching available users:', error);
    }
  },

  // Fetch handoff statistics
  fetchHandoffStats: async () => {
    try {
      const response = await api.get('/handoffs/stats');
      set({ stats: response.data });
    } catch (error) {
      console.error('Error fetching handoff stats:', error);
    }
  },

  // Reassign event to different user
  reassignEvent: async (eventId, toUserId, reason = 'Manual reassignment') => {
    try {
      await api.post(`/handoffs/reassign/event/${eventId}`, {
        to_user_id: toUserId,
        reason: reason
      });
      
      // Refresh handoffs data
      await get().fetchTodaysHandoffs();
      return true;
    } catch (error) {
      set({ error: error.message });
      console.error('Error reassigning event:', error);
      return false;
    }
  },

  // Reassign task to different user
  reassignTask: async (taskId, toUserId, reason = 'Manual reassignment') => {
    try {
      await api.post(`/handoffs/reassign/task/${taskId}`, {
        to_user_id: toUserId,
        reason: reason
      });
      
      // Refresh handoffs data
      await get().fetchTodaysHandoffs();
      return true;
    } catch (error) {
      set({ error: error.message });
      console.error('Error reassigning task:', error);
      return false;
    }
  },

  // Swap event assignments between users
  swapEvents: async (myEventId, withUserId, theirEventId) => {
    try {
      await api.post(`/handoffs/swap/event/${myEventId}`, {
        with_user_id: withUserId,
        their_event_id: theirEventId
      });
      
      // Refresh handoffs data
      await get().fetchTodaysHandoffs();
      return true;
    } catch (error) {
      set({ error: error.message });
      console.error('Error swapping events:', error);
      return false;
    }
  },

  // Get responsibility count for current user
  getMyResponsibilityCount: () => {
    const { handoffs } = get();
    if (!handoffs || !handoffs.my_responsibilities) return 0;
    
    const events = handoffs.my_responsibilities.events?.length || 0;
    const tasks = handoffs.my_responsibilities.tasks?.length || 0;
    return events + tasks;
  },

  // Get partner responsibility count
  getPartnerResponsibilityCount: () => {
    const { handoffs } = get();
    if (!handoffs || !handoffs.partner_responsibilities) return 0;
    
    const events = handoffs.partner_responsibilities.events?.length || 0;
    const tasks = handoffs.partner_responsibilities.tasks?.length || 0;
    return events + tasks;
  },

  // Get unassigned items count
  getUnassignedCount: () => {
    const { handoffs } = get();
    if (!handoffs || !handoffs.unassigned) return 0;
    
    const events = handoffs.unassigned.events?.length || 0;
    const tasks = handoffs.unassigned.tasks?.length || 0;
    return events + tasks;
  },

  // Get backup responsibility count
  getBackupResponsibilityCount: () => {
    const { handoffs } = get();
    if (!handoffs || !handoffs.backup_responsibilities) return 0;
    
    const events = handoffs.backup_responsibilities.events?.length || 0;
    return events;
  },

  // Get all responsibilities for a specific user
  getResponsibilitiesByUser: (userId) => {
    const { handoffs } = get();
    if (!handoffs) return { events: [], tasks: [] };
    
    const allEvents = [
      ...(handoffs.my_responsibilities?.events || []),
      ...(handoffs.partner_responsibilities?.events || []),
      ...(handoffs.unassigned?.events || [])
    ];
    
    const allTasks = [
      ...(handoffs.my_responsibilities?.tasks || []),
      ...(handoffs.partner_responsibilities?.tasks || []),
      ...(handoffs.unassigned?.tasks || [])
    ];
    
    return {
      events: allEvents.filter(event => event.assigned_to === userId),
      tasks: allTasks.filter(task => task.assigned_to === userId)
    };
  },

  // Check if there are any urgent unassigned items
  hasUrgentUnassigned: () => {
    const { handoffs } = get();
    if (!handoffs || !handoffs.unassigned) return false;
    
    const urgentEvents = handoffs.unassigned.events?.some(event => 
      event.priority === 'high' || event.priority === 'urgent'
    ) || false;
    
    const urgentTasks = handoffs.unassigned.tasks?.some(task => 
      task.priority === 'high' || task.priority === 'urgent'
    ) || false;
    
    return urgentEvents || urgentTasks;
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Reset store
  reset: () => {
    set({
      handoffs: null,
      stats: {},
      availableUsers: [],
      loading: false,
      error: null
    });
  }
}));

export default useHandoffStore;