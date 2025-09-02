import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:11001';

class AIService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async makeRequest(endpoint, options = {}) {
    const token = useAuthStore.getState().token;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}/api/ai${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  getCacheKey(endpoint, data) {
    return `${endpoint}-${JSON.stringify(data)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Enrich an event with AI-generated suggestions
   * @param {Object} event - Event object
   * @param {boolean} saveToEvent - Whether to save enrichment to the event in the database
   * @returns {Promise<Object>} - Enriched event data
   */
  async enrichEvent(event, saveToEvent = true) {
    try {
      const cacheKey = this.getCacheKey('/enrich-event', event);
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.makeRequest('/enrich-event', {
        method: 'POST',
        body: JSON.stringify({
          eventId: saveToEvent ? event.id : null,
          title: event.title,
          description: event.description || '',
          location: event.location || '',
          eventType: event.event_type || event.eventType || '',
          startTime: event.start_time || event.startTime,
          endTime: event.end_time || event.endTime,
        }),
      });

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('AI enrichment error:', error);
      throw error;
    }
  }

  /**
   * Generate a checklist for an event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} - Generated checklist
   */
  async generateChecklist(eventData) {
    try {
      const cacheKey = this.getCacheKey('/suggest-checklist', eventData);
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.makeRequest('/suggest-checklist', {
        method: 'POST',
        body: JSON.stringify({
          eventTitle: eventData.title,
          eventType: eventData.eventType || eventData.event_type,
          duration: eventData.duration,
          participants: eventData.participants || []
        }),
      });

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Checklist generation error:', error);
      throw error;
    }
  }

  /**
   * Analyze schedule for conflicts and optimization opportunities
   * @param {string} date - Date to analyze (YYYY-MM-DD)
   * @returns {Promise<Object>} - Schedule analysis
   */
  async analyzeSchedule(date) {
    try {
      const cacheKey = this.getCacheKey('/analyze-schedule', { date });
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.makeRequest('/analyze-schedule', {
        method: 'POST',
        body: JSON.stringify({ date }),
      });

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Schedule analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate daily brief
   * @param {string} date - Date for the brief (optional, defaults to today)
   * @returns {Promise<Object>} - Daily brief
   */
  async generateDailyBrief(date = null) {
    try {
      const briefDate = date || new Date().toISOString().split('T')[0];
      const cacheKey = this.getCacheKey('/generate-brief', { date: briefDate });
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.makeRequest('/generate-brief', {
        method: 'POST',
        body: JSON.stringify({ date: briefDate }),
      });

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Daily brief generation error:', error);
      throw error;
    }
  }

  /**
   * Get AI insights for dashboard
   * @returns {Promise<Object>} - AI insights
   */
  async getInsights() {
    try {
      const cacheKey = this.getCacheKey('/insights', {});
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.makeRequest('/insights', {
        method: 'GET',
      });

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Get insights error:', error);
      throw error;
    }
  }

  /**
   * Bulk enrich multiple events
   * @param {Array<number>} eventIds - Array of event IDs to enrich
   * @returns {Promise<Object>} - Bulk enrichment results
   */
  async bulkEnrichEvents(eventIds) {
    try {
      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        throw new Error('Event IDs array is required');
      }

      const response = await this.makeRequest('/bulk-enrich', {
        method: 'POST',
        body: JSON.stringify({ eventIds }),
      });

      // Clear cache for these events
      this.clearEventCache(eventIds);
      
      return response;
    } catch (error) {
      console.error('Bulk enrich error:', error);
      throw error;
    }
  }

  /**
   * Clear cache entries for specific events
   * @param {Array<number>} eventIds - Array of event IDs
   */
  clearEventCache(eventIds) {
    const keysToDelete = [];
    
    for (const [key] of this.cache) {
      if (key.includes('/enrich-event') && eventIds.some(id => key.includes(`"id":${id}`))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get preparation suggestions for an event type
   * @param {string} eventType - Type of event
   * @returns {Array<string>} - Preparation suggestions
   */
  getEventTypePreparations(eventType) {
    const preparations = {
      appointment: [
        'Confirm appointment time',
        'Gather required documents',
        'Plan arrival 15 minutes early',
        'Check parking options'
      ],
      meeting: [
        'Review agenda',
        'Prepare talking points',
        'Test video call setup',
        'Gather relevant materials'
      ],
      birthday: [
        'Buy and wrap gift',
        'Confirm RSVP',
        'Plan outfit',
        'Charge camera for photos'
      ],
      sports: [
        'Pack equipment',
        'Check weather',
        'Bring water and snacks',
        'Plan post-activity meal'
      ],
      travel: [
        'Check travel documents',
        'Pack according to weather',
        'Arrange transportation',
        'Set out-of-office messages'
      ],
      school: [
        'Pack school supplies',
        'Prepare lunch/snacks',
        'Check homework completion',
        'Review schedule'
      ]
    };

    return preparations[eventType.toLowerCase()] || [
      'Review event details',
      'Check time and location',
      'Plan arrival time',
      'Prepare necessary items'
    ];
  }

  /**
   * Format AI suggestions for display
   * @param {Object} suggestions - Raw AI suggestions
   * @returns {Object} - Formatted suggestions
   */
  formatSuggestions(suggestions) {
    if (!suggestions) return {};

    try {
      const parsed = typeof suggestions === 'string' ? JSON.parse(suggestions) : suggestions;
      
      return {
        preparationList: parsed.preparation_list || [],
        optimizations: parsed.suggestions?.optimization || [],
        alternatives: parsed.suggestions?.alternatives || [],
        reminders: parsed.suggestions?.reminders || []
      };
    } catch (error) {
      console.error('Error formatting suggestions:', error);
      return {};
    }
  }

  /**
   * Check if an event needs AI enrichment
   * @param {Object} event - Event object
   * @returns {boolean} - Whether the event needs enrichment
   */
  needsEnrichment(event) {
    return !event.ai_enriched || 
           !event.preparation_time || 
           !event.ai_suggestions || 
           event.ai_suggestions === '{}';
  }

  /**
   * Get enrichment priority for an event
   * @param {Object} event - Event object
   * @returns {string} - Priority level (high, medium, low)
   */
  getEnrichmentPriority(event) {
    const eventDate = new Date(event.start_time || event.startTime);
    const now = new Date();
    const hoursUntil = (eventDate - now) / (1000 * 60 * 60);

    if (hoursUntil < 24) return 'high';
    if (hoursUntil < 72) return 'medium';
    return 'low';
  }
}

export const aiService = new AIService();
export default aiService;