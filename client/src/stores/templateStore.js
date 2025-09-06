import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const API_BASE = '/api/templates';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth-token');
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const useTemplateStore = create(
  devtools((set, get) => ({
    // State
    templates: [],
    lineItemTemplates: [],
    categories: ['preparation', 'during', 'follow-up', 'routine', 'sop', 'line-item'],
    templateTypes: ['timeline', 'line-item'],
    phases: ['pre', 'during', 'post', 'all'],
    loading: false,
    error: null,
    statistics: null,

    // Template management
    fetchTemplates: async (filters = {}) => {
      set({ loading: true, error: null });
      
      try {
        const params = new URLSearchParams();
        
        if (filters.category) params.append('category', filters.category);
        if (filters.phase) params.append('phase', filters.phase);
        if (filters.search) params.append('search', filters.search);
        if (filters.sort) params.append('sort', filters.sort);
        if (filters.order) params.append('order', filters.order);
        
        const response = await fetch(`${API_BASE}?${params}`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.statusText}`);
        }
        
        const templates = await response.json();
        
        set({ 
          templates,
          loading: false,
          error: null 
        });
        
        return templates;
      } catch (error) {
        console.error('Error fetching templates:', error);
        set({ 
          loading: false,
          error: error.message 
        });
        throw error;
      }
    },

    createTemplate: async (templateData) => {
      set({ loading: true, error: null });
      
      try {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(templateData)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create template: ${response.statusText}`);
        }
        
        const newTemplate = await response.json();
        
        set(state => ({
          templates: [...state.templates, newTemplate],
          loading: false,
          error: null
        }));
        
        return newTemplate;
      } catch (error) {
        console.error('Error creating template:', error);
        set({ 
          loading: false,
          error: error.message 
        });
        throw error;
      }
    },

    updateTemplate: async (id, updates) => {
      set({ loading: true, error: null });
      
      try {
        const response = await fetch(`${API_BASE}/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update template: ${response.statusText}`);
        }
        
        const updatedTemplate = await response.json();
        
        set(state => ({
          templates: state.templates.map(t => 
            t.id === id ? updatedTemplate : t
          ),
          loading: false,
          error: null
        }));
        
        return updatedTemplate;
      } catch (error) {
        console.error('Error updating template:', error);
        set({ 
          loading: false,
          error: error.message 
        });
        throw error;
      }
    },

    deleteTemplate: async (id) => {
      set({ loading: true, error: null });
      
      try {
        const response = await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete template: ${response.statusText}`);
        }
        
        set(state => ({
          templates: state.templates.filter(t => t.id !== id),
          loading: false,
          error: null
        }));
        
        return true;
      } catch (error) {
        console.error('Error deleting template:', error);
        set({ 
          loading: false,
          error: error.message 
        });
        throw error;
      }
    },

    // Template application
    applyTemplateToEvent: async (templateId, eventId, phase = 'pre') => {
      set({ loading: true, error: null });
      
      try {
        const response = await fetch(`${API_BASE}/${templateId}/apply`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ event_id: eventId, phase })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to apply template: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update template usage count in local state
        set(state => ({
          templates: state.templates.map(t => 
            t.id === templateId 
              ? { ...t, usage_count: t.usage_count + 1, last_used: new Date().toISOString() }
              : t
          ),
          loading: false,
          error: null
        }));
        
        return result;
      } catch (error) {
        console.error('Error applying template:', error);
        set({ 
          loading: false,
          error: error.message 
        });
        throw error;
      }
    },

    // Get suggested templates for specific context
    getSuggestedTemplates: async (eventType, phase = 'pre') => {
      try {
        const response = await fetch(`${API_BASE}/suggested/${eventType}?phase=${phase}`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch suggested templates: ${response.statusText}`);
        }
        
        const suggestions = await response.json();
        return suggestions;
      } catch (error) {
        console.error('Error fetching suggested templates:', error);
        set({ error: error.message });
        return [];
      }
    },

    // Get templates filtered by context
    getTemplatesByContext: (eventType, phase) => {
      const { templates } = get();
      return templates.filter(template => {
        const phaseMatch = template.phase === phase || template.phase === 'all';
        const typeMatch = !eventType || 
          template.event_types.includes(eventType) ||
          template.tags.some(tag => tag.toLowerCase().includes(eventType.toLowerCase()));
        
        return phaseMatch && typeMatch;
      });
    },

    // Statistics and analytics
    fetchStatistics: async () => {
      try {
        const response = await fetch(`${API_BASE}/statistics`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.statusText}`);
        }
        
        const statistics = await response.json();
        
        set({ statistics });
        return statistics;
      } catch (error) {
        console.error('Error fetching statistics:', error);
        set({ error: error.message });
        throw error;
      }
    },

    // Submit feedback for template usage
    submitFeedback: async (templateId, applicationId, feedbackData) => {
      try {
        const response = await fetch(`${API_BASE}/${templateId}/feedback`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            application_id: applicationId,
            ...feedbackData
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to submit feedback: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error submitting feedback:', error);
        throw error;
      }
    },

    // Create template from existing timeline/checklist
    createTemplateFromTimeline: async (name, category, phase, timelineItems, eventTypes = [], tags = []) => {
      const estimatedTime = timelineItems.reduce((total, item) => {
        return total + (item.duration || item.time_estimate || 0);
      }, 0);

      const templateItems = timelineItems.map(item => ({
        text: item.text || item.activity || item.title,
        timeEstimate: item.duration || item.time_estimate || 0,
        priority: item.priority || 'medium',
        notes: item.note || item.notes || '',
        type: item.type || 'task'
      }));

      return get().createTemplate({
        name,
        category,
        phase,
        items: templateItems,
        estimated_time: estimatedTime,
        event_types: eventTypes,
        tags
      });
    },

    // Pre-built template library
    getPrebuiltTemplates: () => {
      return [
        {
          id: 'soccer-practice-prep',
          name: 'Soccer Practice Preparation',
          category: 'preparation',
          phase: 'pre',
          icon: '⚽',
          estimated_time: 30,
          items: [
            { text: 'Pack soccer bag with gear', timeEstimate: 5, priority: 'high', notes: 'Check uniform is clean' },
            { text: 'Fill water bottles', timeEstimate: 2, priority: 'high' },
            { text: 'Check weather and dress appropriately', timeEstimate: 3, priority: 'medium' },
            { text: 'Grab healthy snack', timeEstimate: 2, priority: 'medium' },
            { text: 'Check practice schedule/location', timeEstimate: 2, priority: 'high' },
            { text: 'Load car and leave 10 minutes early', timeEstimate: 5, priority: 'high' }
          ],
          event_types: ['sports', 'soccer', 'practice'],
          tags: ['sports', 'outdoor', 'kids', 'preparation']
        },
        {
          id: 'doctor-visit-prep',
          name: 'Doctor Visit Preparation',
          category: 'preparation', 
          phase: 'pre',
          icon: '🏥',
          estimated_time: 20,
          items: [
            { text: 'Gather insurance cards', timeEstimate: 2, priority: 'high' },
            { text: 'Prepare list of current medications', timeEstimate: 5, priority: 'high' },
            { text: 'Write down symptoms/concerns to discuss', timeEstimate: 5, priority: 'medium' },
            { text: 'Bring previous test results if relevant', timeEstimate: 3, priority: 'medium' },
            { text: 'Arrive 15 minutes early for check-in', timeEstimate: 5, priority: 'high' }
          ],
          event_types: ['medical', 'appointment'],
          tags: ['health', 'medical', 'appointment']
        },
        {
          id: 'school-meeting-prep',
          name: 'School Meeting Preparation', 
          category: 'preparation',
          phase: 'pre',
          icon: '🎓',
          estimated_time: 25,
          items: [
            { text: 'Review agenda or discussion topics', timeEstimate: 10, priority: 'high' },
            { text: 'Gather relevant documents/reports', timeEstimate: 5, priority: 'medium' },
            { text: 'Prepare questions to ask', timeEstimate: 5, priority: 'medium' },
            { text: 'Bring notebook and pen', timeEstimate: 2, priority: 'low' },
            { text: 'Check meeting location and parking', timeEstimate: 3, priority: 'medium' }
          ],
          event_types: ['school', 'meeting', 'education'],
          tags: ['school', 'meeting', 'education', 'kids']
        },
        {
          id: 'birthday-party-during',
          name: 'Birthday Party Management',
          category: 'during',
          phase: 'during', 
          icon: '🎉',
          estimated_time: 120,
          items: [
            { text: 'Welcome guests and take coats', timeEstimate: 10, priority: 'high' },
            { text: 'Start with opening activity/game', timeEstimate: 20, priority: 'medium' },
            { text: 'Serve refreshments', timeEstimate: 15, priority: 'medium' },
            { text: 'Facilitate party games', timeEstimate: 30, priority: 'high' },
            { text: 'Cake ceremony and singing', timeEstimate: 15, priority: 'high' },
            { text: 'Open presents', timeEstimate: 20, priority: 'medium' },
            { text: 'Hand out party favors', timeEstimate: 10, priority: 'low' }
          ],
          event_types: ['party', 'birthday', 'celebration'],
          tags: ['party', 'celebration', 'kids', 'social']
        },
        {
          id: 'vacation-followup',
          name: 'Post-Vacation Follow-up',
          category: 'follow-up',
          phase: 'post',
          icon: '✈️',
          estimated_time: 45,
          items: [
            { text: 'Unpack luggage', timeEstimate: 15, priority: 'medium' },
            { text: 'Do laundry', timeEstimate: 5, priority: 'medium' },
            { text: 'Review and organize photos', timeEstimate: 15, priority: 'low' },
            { text: 'Check mail and messages', timeEstimate: 10, priority: 'medium' },
            { text: 'Restock groceries and essentials', timeEstimate: 20, priority: 'medium' },
            { text: 'Plan next trip or adventures', timeEstimate: 10, priority: 'low' }
          ],
          event_types: ['vacation', 'travel'],
          tags: ['vacation', 'travel', 'follow-up']
        }
      ];
    },

    // Utility functions
    clearError: () => set({ error: null }),
    
    clearTemplates: () => set({ templates: [], statistics: null }),

    // Search and filter helpers
    searchTemplates: (query) => {
      const { templates } = get();
      if (!query) return templates;
      
      const lowerQuery = query.toLowerCase();
      return templates.filter(template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        template.items.some(item => item.text.toLowerCase().includes(lowerQuery))
      );
    },

    getTemplatesByCategory: (category) => {
      const { templates } = get();
      return templates.filter(template => template.category === category);
    },

    getTemplatesByPhase: (phase) => {
      const { templates } = get();
      return templates.filter(template => template.phase === phase || template.phase === 'all');
    },

    getMostUsedTemplates: (limit = 5) => {
      const { templates } = get();
      return [...templates]
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);
    },

    getRecentlyUsedTemplates: (limit = 5) => {
      const { templates } = get();
      return [...templates]
        .filter(t => t.last_used)
        .sort((a, b) => new Date(b.last_used) - new Date(a.last_used))
        .slice(0, limit);
    },

    // Line item template methods
    fetchLineItemTemplates: async () => {
      try {
        // For now, use localStorage for line item templates
        const stored = localStorage.getItem('line-item-templates');
        const lineItemTemplates = stored ? JSON.parse(stored) : [];
        set({ lineItemTemplates });
        return lineItemTemplates;
      } catch (error) {
        console.error('Error fetching line item templates:', error);
        return [];
      }
    },

    saveLineItemTemplate: (template) => {
      const { lineItemTemplates } = get();
      const newTemplate = {
        ...template,
        id: template.id || `line-item-${Date.now()}`,
        created_at: new Date().toISOString(),
        template_type: 'line-item'
      };
      
      const updated = [...lineItemTemplates, newTemplate];
      set({ lineItemTemplates: updated });
      
      // Save to localStorage
      try {
        localStorage.setItem('line-item-templates', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving line item template:', error);
      }
      
      return newTemplate;
    },

    deleteLineItemTemplate: (id) => {
      const { lineItemTemplates } = get();
      const updated = lineItemTemplates.filter(t => t.id !== id);
      set({ lineItemTemplates: updated });
      
      try {
        localStorage.setItem('line-item-templates', JSON.stringify(updated));
      } catch (error) {
        console.error('Error deleting line item template:', error);
      }
    },

    getLineItemTemplatesByCategory: (category) => {
      const { lineItemTemplates } = get();
      return lineItemTemplates.filter(t => t.category === category);
    }
  }), {
    name: 'template-store'
  })
);

export { useTemplateStore };