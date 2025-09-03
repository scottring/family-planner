import { create } from 'zustand';
import api from '../services/api';

export const useEventStore = create((set, get) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/events');
      set({ events: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching events:', error);
    }
  },

  createEvent: async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      set(state => ({ events: [...state.events, response.data] }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  updateEvent: async (eventId, updates) => {
    try {
      const response = await api.put(`/events/${eventId}`, updates);
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
      await api.delete(`/events/${eventId}`);
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
  }
}));