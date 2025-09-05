/**
 * Timeline Learning Service
 * Handles recording usage patterns and providing learning capabilities
 * without ever auto-changing user data
 */

class TimelineLearningService {
  constructor() {
    this.token = null;
    this.apiBase = '/api/timeline-suggestions';
  }

  setAuthToken(token) {
    this.token = token;
  }

  /**
   * Record usage pattern for a single timeline task
   */
  async recordTaskUsage(data) {
    const {
      eventId,
      eventType,
      eventPattern,
      recurringEventId,
      taskId,
      taskText,
      taskCategory = 'preparation',
      originalTimeOffset,
      actualTimeOffset,
      wasCompleted = false,
      completionTime = null,
      wasSkipped = false,
      wasAddedCustom = false,
      timeAdjustmentMinutes = 0,
      difficultyRating = null,
      usefulnessRating = null,
      notes = null
    } = data;

    try {
      const response = await fetch(`${this.apiBase}/record-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventId,
          eventType,
          eventPattern,
          recurringEventId,
          taskId,
          taskText,
          taskCategory,
          originalTimeOffset,
          actualTimeOffset,
          wasCompleted,
          completionTime,
          wasSkipped,
          wasAddedCustom,
          timeAdjustmentMinutes,
          difficultyRating,
          usefulnessRating,
          notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record task usage');
      }

      return await response.json();
    } catch (error) {
      console.error('Error recording task usage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record completion data for an entire timeline
   */
  async recordTimelineCompletion(data) {
    const {
      eventId,
      eventType,
      eventPattern,
      recurringEventId,
      timelineData,
      completedTasks = [],
      feedback = []
    } = data;

    try {
      const response = await fetch(`${this.apiBase}/record-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventId,
          eventType,
          eventPattern,
          recurringEventId,
          timelineData,
          completedTasks,
          feedback
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record timeline completion');
      }

      return await response.json();
    } catch (error) {
      console.error('Error recording timeline completion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record when a task is marked as completed
   */
  async recordTaskCompletion(taskId, eventId, eventPattern, completionTime = null) {
    return this.recordTaskUsage({
      eventId,
      eventPattern,
      taskId,
      taskText: 'Task completion',
      wasCompleted: true,
      completionTime: completionTime || new Date().toISOString()
    });
  }

  /**
   * Record when a task is skipped
   */
  async recordTaskSkipped(taskId, eventId, eventPattern, reason = null) {
    return this.recordTaskUsage({
      eventId,
      eventPattern,
      taskId,
      taskText: 'Task skipped',
      wasCompleted: false,
      wasSkipped: true,
      notes: reason
    });
  }

  /**
   * Record when a custom task is added
   */
  async recordCustomTaskAdded(taskData, eventId, eventPattern) {
    return this.recordTaskUsage({
      eventId,
      eventPattern,
      taskId: taskData.id,
      taskText: taskData.text,
      taskCategory: taskData.category || 'preparation',
      originalTimeOffset: taskData.timeOffset,
      actualTimeOffset: taskData.timeOffset,
      wasAddedCustom: true,
      wasCompleted: false
    });
  }

  /**
   * Record timing adjustments made by user
   */
  async recordTimingAdjustment(taskId, eventId, eventPattern, originalTime, newTime, reason = null) {
    const adjustment = newTime - originalTime;
    
    return this.recordTaskUsage({
      eventId,
      eventPattern,
      taskId,
      taskText: 'Timing adjustment',
      originalTimeOffset: originalTime,
      actualTimeOffset: newTime,
      timeAdjustmentMinutes: adjustment,
      notes: reason
    });
  }

  /**
   * Record user feedback on task difficulty and usefulness
   */
  async recordTaskFeedback(taskId, eventId, eventPattern, difficulty, usefulness, notes = null) {
    return this.recordTaskUsage({
      eventId,
      eventPattern,
      taskId,
      taskText: 'Task feedback',
      difficultyRating: difficulty,
      usefulnessRating: usefulness,
      notes
    });
  }

  /**
   * Get active suggestions for current user
   */
  async getActiveSuggestions(limit = 10) {
    try {
      const response = await fetch(`${this.apiBase}?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Get suggestions for a specific event pattern
   */
  async getSuggestionsForEvent(eventPattern, limit = 5) {
    try {
      const response = await fetch(
        `${this.apiBase}/for-event?eventPattern=${encodeURIComponent(eventPattern)}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get event suggestions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting event suggestions:', error);
      return [];
    }
  }

  /**
   * Accept a suggestion
   */
  async acceptSuggestion(suggestionId) {
    try {
      // Get application details first
      const appResponse = await fetch(`${this.apiBase}/${suggestionId}/apply`, {
        headers: {
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        }
      });

      if (!appResponse.ok) {
        throw new Error('Failed to get application details');
      }

      const applicationData = await appResponse.json();

      // Mark as accepted
      const response = await fetch(`${this.apiBase}/${suggestionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ response: 'accepted' })
      });

      if (!response.ok) {
        throw new Error('Failed to accept suggestion');
      }

      return applicationData;
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      throw error;
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId, permanent = false) {
    try {
      const response = await fetch(`${this.apiBase}/${suggestionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          response: permanent ? 'permanently_dismissed' : 'dismissed' 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss suggestion');
      }

      return await response.json();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      throw error;
    }
  }

  /**
   * Get user learning preferences
   */
  async getPreferences() {
    try {
      const response = await fetch(`${this.apiBase}/preferences`, {
        headers: {
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting preferences:', error);
      return {
        learning_mode: true,
        suggestion_frequency: 'normal',
        show_timing_suggestions: true,
        show_task_suggestions: true,
        show_template_suggestions: true,
        auto_apply_low_risk: false
      };
    }
  }

  /**
   * Update user learning preferences
   */
  async updatePreferences(preferences) {
    try {
      const response = await fetch(`${this.apiBase}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Get learning insights and patterns
   */
  async getInsights() {
    try {
      const response = await fetch(`${this.apiBase}/insights`, {
        headers: {
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get insights');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting insights:', error);
      return [];
    }
  }

  /**
   * Get learning statistics
   */
  async getStats() {
    try {
      const response = await fetch(`${this.apiBase}/stats`, {
        headers: {
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * Trigger manual pattern analysis
   */
  async analyzePatterns() {
    try {
      const response = await fetch(`${this.apiBase}/analyze-patterns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to analyze patterns');
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      throw error;
    }
  }

  /**
   * Apply a suggestion to timeline data (client-side helper)
   */
  applySuggestionToTimeline(timelineData, suggestion, applicationData) {
    const newTimelineData = [...timelineData];

    switch (applicationData.type) {
      case 'add_frequent_task':
        // Add new task to timeline
        const newTask = {
          id: `suggested-${Date.now()}`,
          text: applicationData.data.taskText,
          timeOffset: applicationData.data.recommendedTimeOffset,
          category: applicationData.data.taskCategory || 'preparation',
          priority: 'medium',
          duration: 15,
          enabled: true,
          fromSuggestion: true
        };
        newTimelineData.push(newTask);
        break;

      case 'remove_unused_task':
        // Mark task as suggested for removal (don't auto-remove)
        const taskToRemove = newTimelineData.find(
          task => task.text.toLowerCase().includes(applicationData.data.taskText.toLowerCase())
        );
        if (taskToRemove) {
          taskToRemove.suggestedForRemoval = true;
          taskToRemove.removalReason = `Skipped ${Math.round(applicationData.data.skipRate * 100)}% of the time`;
        }
        break;

      case 'adjust_timing':
        // Find tasks in the specified category and adjust their timing
        newTimelineData.forEach(task => {
          if (task.category === applicationData.data.taskCategory) {
            task.suggestedTimeOffset = task.timeOffset + applicationData.data.adjustmentMinutes;
            task.timingAdjustmentSuggestion = true;
          }
        });
        break;
    }

    return newTimelineData;
  }

  /**
   * Create a learning event observer for timeline components
   */
  createTimelineObserver(eventData) {
    const observer = {
      eventData,
      learningService: this,

      // Track task completion
      onTaskCompleted: (taskId, taskData) => {
        this.recordTaskCompletion(
          taskId,
          eventData.id,
          eventData.event_pattern || 'general'
        );
      },

      // Track task being skipped
      onTaskSkipped: (taskId, taskData, reason) => {
        this.recordTaskSkipped(
          taskId,
          eventData.id,
          eventData.event_pattern || 'general',
          reason
        );
      },

      // Track custom task addition
      onCustomTaskAdded: (taskData) => {
        this.recordCustomTaskAdded(
          taskData,
          eventData.id,
          eventData.event_pattern || 'general'
        );
      },

      // Track timing adjustments
      onTimingAdjusted: (taskId, originalTime, newTime, reason) => {
        this.recordTimingAdjustment(
          taskId,
          eventData.id,
          eventData.event_pattern || 'general',
          originalTime,
          newTime,
          reason
        );
      },

      // Record complete timeline when user finishes
      onTimelineCompleted: (timelineData, completedTasks, feedback) => {
        this.recordTimelineCompletion({
          eventId: eventData.id,
          eventType: eventData.event_type || 'general',
          eventPattern: eventData.event_pattern || 'general',
          recurringEventId: eventData.parent_recurring_id,
          timelineData,
          completedTasks,
          feedback
        });
      }
    };

    return observer;
  }
}

// Export singleton instance
const timelineLearningService = new TimelineLearningService();
export default timelineLearningService;