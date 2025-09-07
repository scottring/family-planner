import { create } from 'zustand';
import api from '../services/api';

export const useEventStore = create((set, get) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/calendar/events');
      set({ events: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching events:', error);
    }
  },

  createEvent: async (eventData) => {
    try {
      console.log('Creating event with data:', eventData);
      
      // Check for duplicate event (same title and start time)
      const existingEvents = get().events;
      const duplicate = existingEvents.find(event => 
        event.title === eventData.title && 
        new Date(event.start_time).toDateString() === new Date(eventData.start_time).toDateString()
      );
      
      if (duplicate) {
        console.log('Skipping duplicate event:', eventData.title);
        return duplicate; // Return existing event instead of creating duplicate
      }
      
      const response = await api.post('/calendar/events', eventData);
      set(state => ({ events: [...state.events, response.data] }));
      return response.data;
    } catch (error) {
      console.error('Event creation error:', error.response?.data || error.message);
      set({ error: error.message });
      throw error;
    }
  },

  updateEvent: async (eventId, updates) => {
    try {
      const response = await api.put(`/calendar/events/${eventId}`, updates);
      set(state => ({
        events: state.events.map(event => 
          event.id === eventId ? response.data : event
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteEvent: async (eventId) => {
    try {
      await api.delete(`/calendar/events/${eventId}`);
      set(state => ({
        events: state.events.filter(event => event.id !== eventId)
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  getEventsForDate: (date) => {
    const events = get().events;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= targetDate && eventDate < nextDate;
    });
  },

  getEventsForWeek: (startDate) => {
    const events = get().events;
    const weekStart = new Date(startDate);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= weekStart && eventDate < weekEnd;
    });
  },

  // Assignment operations
  claimEvent: async (eventId, userId) => {
    try {
      const response = await api.put(`/calendar/events/${eventId}/claim`, { userId });
      set(state => ({
        events: state.events.map(event => 
          event.id === eventId ? response.data : event
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  reassignEvent: async (eventId, newUserId) => {
    try {
      const response = await api.put(`/calendar/events/${eventId}/reassign`, { 
        newUserId,
        timestamp: new Date().toISOString()
      });
      set(state => ({
        events: state.events.map(event => 
          event.id === eventId ? response.data : event
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  updateAssignmentStatus: async (eventId, status) => {
    try {
      const response = await api.put(`/calendar/events/${eventId}/status`, { 
        status,
        timestamp: new Date().toISOString()
      });
      set(state => ({
        events: state.events.map(event => 
          event.id === eventId ? response.data : event
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Logistics operations
  updateEventLogistics: async (eventId, logistics) => {
    try {
      const response = await api.put(`/calendar/events/${eventId}/logistics`, logistics);
      set(state => ({
        events: state.events.map(event => 
          event.id === eventId ? response.data : event
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  applyTemplate: async (eventId, templateId) => {
    try {
      const response = await api.post(`/calendar/events/${eventId}/apply-template`, { templateId });
      set(state => ({
        events: state.events.map(event => 
          event.id === eventId ? response.data : event
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  saveAsTemplate: async (eventId, templateName, activityType, season = null) => {
    try {
      const event = get().events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const templateData = {
        name: templateName,
        activity_type: activityType,
        packing_list: event.packing_list || [],
        default_parking_info: event.parking_info,
        contacts: event.contacts || [],
        weather_dependent: event.weather_dependent || false,
        meal_requirements: event.meal_requirements || {},
        season
      };

      const response = await api.post('/calendar/templates', templateData);
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Template operations
  templates: [],
  templatesLoading: false,

  fetchTemplates: async (activityType = null, season = null) => {
    set({ templatesLoading: true });
    try {
      const params = new URLSearchParams();
      if (activityType) params.append('activity_type', activityType);
      if (season) params.append('season', season);
      
      const response = await api.get(`/calendar/templates?${params.toString()}`);
      set({ templates: response.data, templatesLoading: false });
    } catch (error) {
      set({ error: error.message, templatesLoading: false });
      throw error;
    }
  },

  // Checklist operations
  updateChecklistCompletion: async (eventId, itemId, completed) => {
    try {
      const response = await api.post(`/calendar/events/${eventId}/checklist-completion`, {
        itemId,
        completed
      });
      
      set(state => ({
        events: state.events.map(event => 
          event.id === eventId ? response.data : event
        )
      }));
      
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // === RECURRING EVENTS OPERATIONS ===

  recurringEvents: [],
  recurringLoading: false,
  routineTemplates: [],

  // Create a new recurring event
  createRecurringEvent: async (eventData) => {
    try {
      const response = await api.post('/calendar/events/recurring', eventData);
      
      // Add the parent template to recurring events
      set(state => ({
        recurringEvents: [...state.recurringEvents, response.data.parent],
        // Add instances to regular events
        events: [...state.events, ...response.data.instances]
      }));
      
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Get all recurring event templates
  fetchRecurringEvents: async () => {
    set({ recurringLoading: true, error: null });
    try {
      const response = await api.get('/calendar/events/recurring');
      set({ recurringEvents: response.data, recurringLoading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, recurringLoading: false });
      throw error;
    }
  },

  // Update recurring event template
  updateRecurringEvent: async (parentId, updates, updateFutureInstances = false) => {
    try {
      const response = await api.put(`/calendar/events/recurring/${parentId}?updateFutureInstances=${updateFutureInstances}`, updates);
      
      set(state => ({
        recurringEvents: state.recurringEvents.map(event => 
          event.id === parentId ? response.data : event
        )
      }));
      
      // If updating future instances, refresh events to get updated instances
      if (updateFutureInstances) {
        get().fetchEvents();
      }
      
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Delete recurring event and all instances
  deleteRecurringEvent: async (parentId, deleteFutureInstances = true) => {
    try {
      await api.delete(`/calendar/events/recurring/${parentId}?deleteFutureInstances=${deleteFutureInstances}`);
      
      set(state => ({
        recurringEvents: state.recurringEvents.filter(event => event.id !== parentId)
      }));
      
      // Refresh events to remove deleted instances
      if (deleteFutureInstances) {
        get().fetchEvents();
      }
      
      return { success: true };
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Generate missing instances for all recurring events (maintenance)
  generateMissingInstances: async (daysAhead = 7) => {
    try {
      const response = await api.post('/calendar/events/recurring/generate-instances', { daysAhead });
      
      // Refresh events to show newly generated instances
      get().fetchEvents();
      
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Get routine templates
  fetchRoutineTemplates: async () => {
    try {
      const response = await api.get('/calendar/events/routine-templates');
      set({ routineTemplates: response.data });
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Create recurring event from routine template
  createFromRoutineTemplate: async (templateName, startTime, recurrenceType, recurrenceDays, recurrenceEndDate) => {
    try {
      const response = await api.post('/calendar/events/recurring/from-template', {
        templateName,
        start_time: startTime,
        recurrence_type: recurrenceType,
        recurrence_days: recurrenceDays,
        recurrence_end_date: recurrenceEndDate
      });
      
      // Add the parent template to recurring events
      set(state => ({
        recurringEvents: [...state.recurringEvents, response.data.parent],
        // Add instances to regular events
        events: [...state.events, ...response.data.instances]
      }));
      
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Get events that are recurring instances
  getRecurringInstances: (parentId) => {
    const events = get().events;
    return events.filter(event => event.parent_recurring_id === parentId);
  },

  // Get all recurring events for display (includes both templates and instances)
  getAllRecurringEvents: () => {
    const state = get();
    return {
      templates: state.recurringEvents,
      instances: state.events.filter(event => event.parent_recurring_id)
    };
  },

  // Check if an event is a recurring instance
  isRecurringInstance: (eventId) => {
    const event = get().events.find(e => e.id === eventId);
    return event ? !!event.parent_recurring_id : false;
  },

  // Check if an event is a recurring template
  isRecurringTemplate: (eventId) => {
    const event = get().recurringEvents.find(e => e.id === eventId);
    return !!event;
  }
}));