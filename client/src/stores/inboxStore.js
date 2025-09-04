import { create } from 'zustand';
import api from '../services/api';

export const useInboxStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,

  // Fetch all inbox items
  fetchInboxItems: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.input_type) params.append('input_type', filters.input_type);
      if (filters.urgency_min) params.append('urgency_min', filters.urgency_min);
      if (filters.created_after) params.append('created_after', filters.created_after);
      if (filters.created_before) params.append('created_before', filters.created_before);

      const queryString = params.toString();
      const response = await api.get(`/inbox${queryString ? `?${queryString}` : ''}`);
      set({ items: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching inbox items:', error);
    }
  },

  // Add new inbox item
  addInboxItem: async (itemData) => {
    try {
      const content = itemData.raw_content || itemData.transcription;
      const parsedContent = parseContent(content);
      const processedData = {
        ...itemData,
        urgency_score: calculateUrgencyScore(content),
        category: detectCategory(content),
        parsed_data: JSON.stringify(parsedContent)
      };

      const response = await api.post('/inbox', processedData);
      set(state => ({ 
        items: [response.data, ...state.items] 
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Process inbox item (convert to event/task)
  processInboxItem: async (itemId, convertToType, additionalData = {}) => {
    try {
      const response = await api.put(`/inbox/${itemId}/process`, {
        convert_to_type: convertToType,
        ...additionalData
      });
      
      set(state => ({
        items: state.items.map(item => 
          item.id === itemId ? response.data : item
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Delete inbox item
  deleteInboxItem: async (itemId) => {
    try {
      await api.delete(`/inbox/${itemId}`);
      set(state => ({
        items: state.items.filter(item => item.id !== itemId)
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Archive inbox item
  archiveInboxItem: async (itemId) => {
    try {
      const response = await api.put(`/inbox/${itemId}`, { status: 'archived' });
      set(state => ({
        items: state.items.map(item => 
          item.id === itemId ? response.data : item
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Snooze inbox item
  snoozeInboxItem: async (itemId, snoozeUntil) => {
    try {
      const response = await api.put(`/inbox/${itemId}`, { 
        status: 'snoozed',
        snooze_until: snoozeUntil.toISOString()
      });
      set(state => ({
        items: state.items.map(item => 
          item.id === itemId ? response.data : item
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Update inbox item
  updateInboxItem: async (itemId, updates) => {
    try {
      const response = await api.put(`/inbox/${itemId}`, updates);
      set(state => ({
        items: state.items.map(item => 
          item.id === itemId ? response.data : item
        )
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Submit voice recording for processing
  submitVoiceRecording: async (audioBlob, metadata = {}) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('metadata', JSON.stringify(metadata));

      const response = await api.post('/inbox/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      set(state => ({ 
        items: [response.data, ...state.items] 
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Bulk operations
  bulkUpdateItems: async (itemIds, updates) => {
    try {
      const response = await api.put('/inbox/bulk', {
        item_ids: itemIds,
        updates
      });
      
      set(state => ({
        items: state.items.map(item => {
          const updatedItem = response.data.find(updated => updated.id === item.id);
          return updatedItem || item;
        })
      }));
      
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Get items by view
  getItemsByView: (view) => {
    const items = get().items;
    const now = new Date();
    
    switch (view) {
      case 'urgent':
        return items.filter(item => 
          item.urgency_score >= 4 && 
          item.status !== 'archived' && 
          item.status !== 'converted'
        );
        
      case 'thisweek':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        return items.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= weekStart && 
                 itemDate < weekEnd && 
                 item.status !== 'archived' && 
                 item.status !== 'converted';
        });
        
      case 'everything':
      default:
        return items.filter(item => 
          item.status !== 'archived' && 
          item.status !== 'converted'
        );
    }
  },

  // Bulk process items (convert to tasks/events)
  bulkProcessItems: async (itemIds, convertToType) => {
    try {
      const response = await api.post('/inbox/bulk-process', {
        item_ids: itemIds,
        convert_to_type: convertToType
      });
      
      set(state => ({
        items: state.items.map(item => {
          const processedItem = response.data.find(processed => processed.id === item.id);
          return processedItem || item;
        })
      }));
      
      return response.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

// Utility functions for AI-like processing
function calculateUrgencyScore(content) {
  if (!content) return 3;
  
  const urgentKeywords = [
    'urgent', 'asap', 'immediately', 'emergency', 'critical', 'important',
    'deadline', 'due', 'tonight', 'today', 'tomorrow', 'now', 'quick'
  ];
  
  const lowerContent = content.toLowerCase();
  let score = 3; // Default score
  
  // Check for urgent keywords
  const urgentMatches = urgentKeywords.filter(keyword => 
    lowerContent.includes(keyword)
  ).length;
  
  if (urgentMatches > 0) {
    score += urgentMatches;
  }
  
  // Check for time indicators
  if (lowerContent.match(/\b(today|tonight|now|asap)\b/)) {
    score += 2;
  } else if (lowerContent.match(/\b(tomorrow|this week)\b/)) {
    score += 1;
  }
  
  // Check for question marks (often require responses)
  if (lowerContent.includes('?')) {
    score += 1;
  }
  
  // Clamp between 1 and 5
  return Math.min(5, Math.max(1, score));
}

function detectCategory(content) {
  if (!content) return null;
  
  const lowerContent = content.toLowerCase();
  
  // Event keywords
  const eventKeywords = [
    'meeting', 'appointment', 'dinner', 'lunch', 'party', 'event',
    'conference', 'call', 'visit', 'trip', 'vacation', 'birthday',
    'anniversary', 'wedding', 'graduation', 'concert', 'show'
  ];
  
  // Task keywords
  const taskKeywords = [
    'buy', 'get', 'pick up', 'call', 'email', 'send', 'finish', 'complete',
    'clean', 'organize', 'fix', 'repair', 'book', 'schedule', 'cancel',
    'review', 'check', 'update', 'install', 'download'
  ];
  
  // Note keywords
  const noteKeywords = [
    'remember', 'note', 'idea', 'thought', 'remind', 'don\'t forget'
  ];
  
  // Reminder keywords
  const reminderKeywords = [
    'remind', 'reminder', 'don\'t forget', 'remember to'
  ];
  
  // Check categories in order of specificity
  if (reminderKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'reminder';
  }
  
  if (eventKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'event';
  }
  
  if (taskKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'task';
  }
  
  if (noteKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'note';
  }
  
  // Default based on sentence structure
  if (lowerContent.includes('?')) {
    return 'note';
  }
  
  if (lowerContent.match(/\b(need to|have to|should|must)\b/)) {
    return 'task';
  }
  
  return 'note';
}

function parseContent(content) {
  if (!content) return {};
  
  const parsed = {
    originalText: content,
    detectedEntities: {},
    suggestedActions: [],
    parsedDateTime: null
  };
  
  // Extract dates and times with better patterns
  const datePattern = /\b(?:today|tonight|tomorrow|this evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}-\d{1,2}(?:-\d{2,4})?)\b/gi;
  const timePattern = /\b(?:\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?|\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?))/gi;
  
  const dates = content.match(datePattern) || [];
  const times = content.match(timePattern) || [];
  
  // Parse actual datetime
  if (dates.length > 0 || times.length > 0) {
    const now = new Date();
    let targetDate = new Date();
    
    // Parse date
    if (dates.length > 0) {
      const dateStr = dates[0].toLowerCase();
      if (dateStr === 'today' || dateStr === 'tonight' || dateStr === 'this evening') {
        // Keep today's date
      } else if (dateStr === 'tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
      } else {
        // Try to parse day of week
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = days.indexOf(dateStr);
        if (dayIndex !== -1) {
          const currentDay = now.getDay();
          let daysToAdd = dayIndex - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7; // Next week if day already passed
          targetDate.setDate(targetDate.getDate() + daysToAdd);
        }
      }
    }
    
    // Parse time
    if (times.length > 0) {
      const timeStr = times[0].toLowerCase();
      const timeParts = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/);
      
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = timeParts[2] ? parseInt(timeParts[2]) : 0;
        const meridiem = timeParts[3];
        
        // Handle AM/PM
        if (meridiem) {
          if (meridiem.includes('p') && hours < 12) {
            hours += 12;
          } else if (meridiem.includes('a') && hours === 12) {
            hours = 0;
          }
        } else if (dates[0] && dates[0].toLowerCase().includes('evening') && hours < 12) {
          // If "evening" is mentioned and hour is < 12, assume PM
          hours += 12;
        }
        
        targetDate.setHours(hours, minutes, 0, 0);
      }
    }
    
    parsed.parsedDateTime = targetDate.toISOString();
    parsed.detectedEntities.dates = dates;
    parsed.detectedEntities.times = times;
  }
  
  // Extract names (simple pattern)
  const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
  const names = content.match(namePattern) || [];
  
  if (names.length > 0) {
    parsed.detectedEntities.names = names;
  }
  
  // Extract locations (very basic)
  const locationKeywords = ['at', 'in', 'on', 'near', 'by'];
  const locationPattern = new RegExp(`\\b(?:${locationKeywords.join('|')})\\s+([A-Z][\\w\\s]+)`, 'g');
  let locationMatch;
  const locations = [];
  
  while ((locationMatch = locationPattern.exec(content)) !== null) {
    locations.push(locationMatch[1].trim());
  }
  
  if (locations.length > 0) {
    parsed.detectedEntities.locations = locations;
  }
  
  // Suggest actions based on content
  const category = detectCategory(content);
  const urgency = calculateUrgencyScore(content);
  
  if (category === 'task' && urgency >= 4) {
    parsed.suggestedActions.push('Convert to high-priority task');
  } else if (category === 'task') {
    parsed.suggestedActions.push('Convert to task');
  }
  
  if (category === 'event' && (dates.length > 0 || times.length > 0)) {
    parsed.suggestedActions.push('Convert to calendar event');
  }
  
  if (urgency >= 4) {
    parsed.suggestedActions.push('Set as urgent');
  }
  
  return parsed;
}