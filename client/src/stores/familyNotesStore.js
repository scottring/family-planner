import { create } from 'zustand';
import api from '../services/api';

export const useFamilyNotesStore = create((set, get) => ({
  notes: [],
  stats: {},
  loading: false,
  error: null,

  // Fetch family notes
  fetchNotes: async (status = 'active', limit = 10) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/family-notes', { 
        params: { status, limit } 
      });
      set({ notes: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching family notes:', error);
    }
  },

  // Create new family note
  createNote: async (noteData) => {
    try {
      const response = await api.post('/family-notes', noteData);
      set(state => ({
        notes: [response.data, ...state.notes]
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      console.error('Error creating family note:', error);
      throw error;
    }
  },

  // Update existing family note
  updateNote: async (noteId, updates) => {
    try {
      const response = await api.put(`/family-notes/${noteId}`, updates);
      set(state => ({
        notes: state.notes.map(note => 
          note.id === noteId ? response.data : note
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      console.error('Error updating family note:', error);
      throw error;
    }
  },

  // Archive family note
  archiveNote: async (noteId) => {
    try {
      await api.put(`/family-notes/${noteId}/archive`);
      set(state => ({
        notes: state.notes.filter(note => note.id !== noteId)
      }));
      return true;
    } catch (error) {
      set({ error: error.message });
      console.error('Error archiving family note:', error);
      return false;
    }
  },

  // Delete family note
  deleteNote: async (noteId) => {
    try {
      await api.delete(`/family-notes/${noteId}`);
      set(state => ({
        notes: state.notes.filter(note => note.id !== noteId)
      }));
      return true;
    } catch (error) {
      set({ error: error.message });
      console.error('Error deleting family note:', error);
      return false;
    }
  },

  // Fetch family notes statistics
  fetchStats: async () => {
    try {
      const response = await api.get('/family-notes/stats');
      set({ stats: response.data });
    } catch (error) {
      console.error('Error fetching family notes stats:', error);
    }
  },

  // Get notes by priority
  getNotesByPriority: (priority) => {
    const { notes } = get();
    return notes.filter(note => note.priority === priority);
  },

  // Get notes by category
  getNotesByCategory: (category) => {
    const { notes } = get();
    return notes.filter(note => note.category === category);
  },

  // Get notes by author
  getNotesByAuthor: (authorId) => {
    const { notes } = get();
    return notes.filter(note => note.author_id === authorId);
  },

  // Get recent notes (last 24 hours)
  getRecentNotes: () => {
    const { notes } = get();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return notes.filter(note => 
      new Date(note.created_at) > yesterday
    );
  },

  // Get high priority notes
  getHighPriorityNotes: () => {
    const { notes } = get();
    return notes.filter(note => 
      note.priority === 'high' || note.priority === 'urgent'
    );
  },

  // Get unread note count (notes created by others)
  getUnreadCount: (currentUserId) => {
    const { notes } = get();
    return notes.filter(note => 
      note.author_id !== currentUserId &&
      new Date(note.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    ).length;
  },

  // Search notes by content
  searchNotes: (searchTerm) => {
    const { notes } = get();
    if (!searchTerm) return notes;
    
    const term = searchTerm.toLowerCase();
    return notes.filter(note => 
      note.content.toLowerCase().includes(term) ||
      note.category.toLowerCase().includes(term)
    );
  },

  // Add note optimistically (for real-time updates)
  addNoteOptimistically: (note) => {
    set(state => ({
      notes: [note, ...state.notes]
    }));
  },

  // Update note optimistically
  updateNoteOptimistically: (noteId, updates) => {
    set(state => ({
      notes: state.notes.map(note =>
        note.id === noteId ? { ...note, ...updates } : note
      )
    }));
  },

  // Remove note optimistically
  removeNoteOptimistically: (noteId) => {
    set(state => ({
      notes: state.notes.filter(note => note.id !== noteId)
    }));
  },

  // Check if user can edit note
  canEditNote: (note, currentUserId) => {
    return note.author_id === currentUserId;
  },

  // Get note summary for dashboard
  getNoteSummary: () => {
    const { notes } = get();
    return {
      total: notes.length,
      urgent: notes.filter(n => n.priority === 'urgent').length,
      high: notes.filter(n => n.priority === 'high').length,
      recent: get().getRecentNotes().length,
      categories: [...new Set(notes.map(n => n.category))]
    };
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Reset store
  reset: () => {
    set({
      notes: [],
      stats: {},
      loading: false,
      error: null
    });
  }
}));

export default useFamilyNotesStore;