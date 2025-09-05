import { create } from 'zustand';
import api from '../services/api';
import { eventContextService } from '../services/eventContext';

export const useEventTemplateStore = create((set, get) => ({
  templates: [],
  loading: false,
  error: null,
  cachedTemplates: new Map(),
  lastCacheTime: null,
  offlineMode: false,

  // Cache management for offline support
  setCacheFromLocalStorage: () => {
    try {
      const cached = localStorage.getItem('event-templates-cache');
      if (cached) {
        const { templates, timestamp } = JSON.parse(cached);
        const now = Date.now();
        // Cache expires after 24 hours
        if (now - timestamp < 24 * 60 * 60 * 1000) {
          set({ 
            cachedTemplates: new Map(templates.map(t => [`${t.event_type}-${t.event_pattern}`, t])),
            lastCacheTime: timestamp 
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load templates from cache:', error);
    }
  },

  updateCache: (templates) => {
    const now = Date.now();
    try {
      localStorage.setItem('event-templates-cache', JSON.stringify({
        templates,
        timestamp: now
      }));
      set({ 
        cachedTemplates: new Map(templates.map(t => [`${t.event_type}-${t.event_pattern}`, t])),
        lastCacheTime: now 
      });
    } catch (error) {
      console.warn('Failed to cache templates:', error);
    }
  },

  // Save or update a template when user customizes
  saveTemplate: async (eventType, eventPattern, preparationTimeline, postEventTimeline, options = {}) => {
    const {
      confidence = 100,
      contextualVariations = {},
      completionRate = 0.0
    } = options;

    const templateData = {
      event_type: eventType,
      event_pattern: eventPattern,
      preparation_timeline: JSON.stringify(preparationTimeline || []),
      post_event_timeline: JSON.stringify(postEventTimeline || []),
      confidence,
      contextual_variations: JSON.stringify(contextualVariations),
      completion_rate: completionRate,
      version: 1
    };

    // Always save to localStorage for offline support
    const cacheKey = `${eventType}-${eventPattern}`;
    const localData = {
      ...templateData,
      last_used_at: new Date().toISOString(),
      usage_count: 1,
      id: `offline-${Date.now()}`
    };

    try {
      const existingCache = get().cachedTemplates;
      existingCache.set(cacheKey, localData);
      
      const allTemplates = Array.from(existingCache.values());
      get().updateCache(allTemplates);
    } catch (error) {
      console.warn('Failed to save template to cache:', error);
    }

    // Try to save to database if online
    if (navigator.onLine && !get().offlineMode) {
      try {
        const response = await api.post('/event-templates', templateData);
        
        // Update cache with server response
        const serverTemplate = response.data;
        const existingCache = get().cachedTemplates;
        existingCache.set(cacheKey, serverTemplate);
        
        set({ 
          templates: [...get().templates.filter(t => t.event_type !== eventType || t.event_pattern !== eventPattern), serverTemplate],
          error: null 
        });

        return serverTemplate;
      } catch (error) {
        console.warn('Failed to save template to server, using offline mode:', error);
        set({ error: error.message, offlineMode: true });
        return localData;
      }
    }

    return localData;
  },

  // Get template by event type with confidence filtering
  getTemplateByType: async (eventType, eventPattern = null, minConfidence = 70) => {
    const cacheKey = eventPattern ? `${eventType}-${eventPattern}` : eventType;
    
    // First check cache
    const cached = get().cachedTemplates.get(cacheKey);
    if (cached && cached.confidence >= minConfidence) {
      // Update usage stats if online
      if (navigator.onLine && !get().offlineMode && !cached.id.toString().startsWith('offline-')) {
        get().updateUsageStats(cached.id).catch(console.warn);
      }
      return cached;
    }

    // If not in cache and online, fetch from server
    if (navigator.onLine && !get().offlineMode) {
      try {
        const params = new URLSearchParams({ event_type: eventType });
        if (eventPattern) params.append('event_pattern', eventPattern);
        params.append('min_confidence', minConfidence.toString());

        const response = await api.get(`/event-templates/search?${params.toString()}`);
        
        if (response.data && response.data.length > 0) {
          const template = response.data[0]; // Get the best match
          
          // Update cache
          const existingCache = get().cachedTemplates;
          existingCache.set(cacheKey, template);
          
          // Update usage stats
          get().updateUsageStats(template.id).catch(console.warn);
          
          return template;
        }
      } catch (error) {
        console.warn('Failed to fetch template from server:', error);
        set({ error: error.message });
      }
    }

    // Fallback: look for similar patterns in cache
    const allCached = Array.from(get().cachedTemplates.values());
    const similarTemplate = allCached.find(t => 
      (t.event_type === eventType || t.event_pattern === eventPattern) &&
      t.confidence >= minConfidence
    );

    if (similarTemplate) {
      return similarTemplate;
    }

    return null;
  },

  // Get templates by pattern (for broader matching)
  getTemplatesByPattern: async (eventPattern, minConfidence = 70) => {
    // Check cache first
    const allCached = Array.from(get().cachedTemplates.values());
    const cachedMatches = allCached.filter(t => 
      t.event_pattern === eventPattern && t.confidence >= minConfidence
    );

    if (cachedMatches.length > 0) {
      return cachedMatches.sort((a, b) => b.confidence - a.confidence);
    }

    // If online, fetch from server
    if (navigator.onLine && !get().offlineMode) {
      try {
        const response = await api.get(`/event-templates/pattern/${eventPattern}?min_confidence=${minConfidence}`);
        
        if (response.data && response.data.length > 0) {
          // Update cache with new templates
          const templates = response.data;
          templates.forEach(template => {
            const cacheKey = `${template.event_type}-${template.event_pattern}`;
            get().cachedTemplates.set(cacheKey, template);
          });
          
          return templates.sort((a, b) => b.confidence - a.confidence);
        }
      } catch (error) {
        console.warn('Failed to fetch templates by pattern:', error);
        set({ error: error.message });
      }
    }

    return [];
  },

  // Update usage statistics
  updateUsageStats: async (templateId) => {
    if (!templateId || templateId.toString().startsWith('offline-')) return;

    try {
      await api.put(`/event-templates/${templateId}/usage`);
      
      // Update local template if it exists
      const templates = get().templates;
      const updatedTemplates = templates.map(t => 
        t.id === templateId 
          ? { ...t, usage_count: t.usage_count + 1, last_used_at: new Date().toISOString() }
          : t
      );
      
      set({ templates: updatedTemplates });
      
      // Update cache
      const existingCache = get().cachedTemplates;
      for (const [key, template] of existingCache.entries()) {
        if (template.id === templateId) {
          existingCache.set(key, {
            ...template,
            usage_count: template.usage_count + 1,
            last_used_at: new Date().toISOString()
          });
          break;
        }
      }
    } catch (error) {
      console.warn('Failed to update usage stats:', error);
    }
  },

  // Clear specific template
  clearTemplate: async (eventType, eventPattern) => {
    const cacheKey = `${eventType}-${eventPattern}`;
    
    // Remove from cache
    const existingCache = get().cachedTemplates;
    const template = existingCache.get(cacheKey);
    existingCache.delete(cacheKey);
    
    // Update localStorage
    const allTemplates = Array.from(existingCache.values());
    get().updateCache(allTemplates);
    
    // Remove from server if online and not offline template
    if (navigator.onLine && !get().offlineMode && template && !template.id.toString().startsWith('offline-')) {
      try {
        await api.delete(`/event-templates/${template.id}`);
        
        // Remove from store
        set(state => ({
          templates: state.templates.filter(t => t.id !== template.id)
        }));
      } catch (error) {
        console.warn('Failed to delete template from server:', error);
        set({ error: error.message });
      }
    }
  },

  // Smart template suggestions based on event analysis
  suggestTemplate: async (event) => {
    if (!event) return null;

    // Analyze event pattern
    const analysis = eventContextService.analyzeEventPattern(event);
    if (!analysis) return null;

    // Look for existing template
    const template = await get().getTemplateByType(
      event.title?.toLowerCase() || 'generic',
      analysis.patternName,
      60 // Lower threshold for suggestions
    );

    if (template) {
      return {
        template,
        confidence: template.confidence,
        reason: `Found ${template.usage_count} previous use${template.usage_count > 1 ? 's' : ''} of similar ${analysis.patternName} events`
      };
    }

    // Look for pattern-based templates
    const patternTemplates = await get().getTemplatesByPattern(analysis.patternName, 60);
    if (patternTemplates.length > 0) {
      const bestTemplate = patternTemplates[0];
      return {
        template: bestTemplate,
        confidence: Math.max(60, bestTemplate.confidence - 20), // Reduce confidence for pattern-only match
        reason: `Similar ${analysis.patternName} event template (${bestTemplate.usage_count} uses)`
      };
    }

    return null;
  },

  // Learn from user actions to improve templates
  learnFromUserActions: async (eventId, eventType, eventPattern, taskActions) => {
    try {
      const learningData = {
        event_id: eventId,
        event_type: eventType,
        event_pattern: eventPattern,
        task_actions: taskActions, // Array of { taskId, action: 'completed' | 'skipped' | 'added' | 'modified', timing: number }
        timestamp: new Date().toISOString()
      };

      // Save learning data for future analysis
      if (navigator.onLine && !get().offlineMode) {
        await api.post('/event-templates/learning', learningData);
      } else {
        // Store locally for later sync
        const existingLearning = JSON.parse(localStorage.getItem('event-learning-data') || '[]');
        existingLearning.push(learningData);
        localStorage.setItem('event-learning-data', JSON.stringify(existingLearning));
      }

      // Immediate template updates based on actions
      const template = get().cachedTemplates.get(`${eventType}-${eventPattern}`);
      if (template) {
        const updatedTemplate = get().updateTemplateFromLearning(template, taskActions);
        if (updatedTemplate) {
          // Save updated template
          await get().saveTemplate(
            eventType,
            eventPattern,
            JSON.parse(updatedTemplate.preparation_timeline),
            JSON.parse(updatedTemplate.post_event_timeline),
            {
              confidence: updatedTemplate.confidence,
              contextualVariations: JSON.parse(updatedTemplate.contextual_variations || '{}'),
              completionRate: updatedTemplate.completion_rate
            }
          );
        }
      }
    } catch (error) {
      console.warn('Failed to record learning data:', error);
    }
  },

  // Update template based on learning data
  updateTemplateFromLearning: (template, taskActions) => {
    if (!template || !taskActions || taskActions.length === 0) return null;

    try {
      const preparationTimeline = JSON.parse(template.preparation_timeline || '[]');
      const completedTasks = taskActions.filter(action => action.action === 'completed').length;
      const totalTasks = taskActions.length;
      const newCompletionRate = totalTasks > 0 ? completedTasks / totalTasks : template.completion_rate;

      // Identify frequently skipped tasks (lower priority)
      const skippedTasks = taskActions.filter(action => action.action === 'skipped');
      const updatedTimeline = preparationTimeline.map(task => {
        const wasSkipped = skippedTasks.find(skipped => 
          skipped.taskId === task.id || skipped.taskId === task.activity
        );
        
        if (wasSkipped) {
          return {
            ...task,
            priority: Math.max(1, (task.priority || 5) - 1), // Lower priority
            skipCount: (task.skipCount || 0) + 1
          };
        }
        
        return task;
      });

      // Update confidence based on completion rate
      const newConfidence = Math.min(100, Math.max(50, 
        template.confidence * 0.8 + newCompletionRate * 20
      ));

      return {
        ...template,
        preparation_timeline: JSON.stringify(updatedTimeline),
        confidence: Math.round(newConfidence),
        completion_rate: newCompletionRate,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to update template from learning:', error);
      return null;
    }
  },

  // Sync offline data when coming back online
  syncOfflineData: async () => {
    if (!navigator.onLine) return;

    try {
      set({ offlineMode: false });

      // Sync offline templates
      const offlineTemplates = Array.from(get().cachedTemplates.values())
        .filter(t => t.id.toString().startsWith('offline-'));

      for (const template of offlineTemplates) {
        try {
          const response = await api.post('/event-templates', {
            event_type: template.event_type,
            event_pattern: template.event_pattern,
            preparation_timeline: template.preparation_timeline,
            post_event_timeline: template.post_event_timeline,
            confidence: template.confidence,
            contextual_variations: template.contextual_variations,
            completion_rate: template.completion_rate
          });

          // Replace offline template with server version
          const cacheKey = `${template.event_type}-${template.event_pattern}`;
          get().cachedTemplates.set(cacheKey, response.data);
        } catch (error) {
          console.warn('Failed to sync offline template:', error);
        }
      }

      // Sync learning data
      const learningData = JSON.parse(localStorage.getItem('event-learning-data') || '[]');
      if (learningData.length > 0) {
        try {
          await api.post('/event-templates/learning/batch', { data: learningData });
          localStorage.removeItem('event-learning-data');
        } catch (error) {
          console.warn('Failed to sync learning data:', error);
        }
      }

      // Update cache
      const allTemplates = Array.from(get().cachedTemplates.values());
      get().updateCache(allTemplates);

    } catch (error) {
      console.warn('Failed to sync offline data:', error);
      set({ error: error.message });
    }
  },

  // Initialize store
  initialize: () => {
    get().setCacheFromLocalStorage();
    
    // Listen for online/offline events
    const handleOnline = () => {
      get().syncOfflineData();
    };
    
    const handleOffline = () => {
      set({ offlineMode: true });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial offline state
    set({ offlineMode: !navigator.onLine });
  }
}));

// Auto-initialize when store is created
useEventTemplateStore.getState().initialize();