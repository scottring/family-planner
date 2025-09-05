/**
 * Timeline Suggestion Engine
 * Analyzes patterns in timeline usage and generates helpful suggestions
 * without ever auto-changing user data
 */

const db = require('../config/database');

class TimelineSuggestionEngine {
  constructor() {
    this.MINIMUM_OBSERVATIONS = 3;
    this.HIGH_CONFIDENCE_THRESHOLD = 0.8;
    this.MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
    this.SUGGESTION_COOLDOWN_HOURS = 24;
  }

  /**
   * Record usage pattern for a timeline task
   */
  recordUsagePattern(data) {
    const {
      eventId,
      eventType,
      eventPattern,
      recurringEventId,
      userId,
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
      usefulness,
      notes
    } = data;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeOfDay = this.getTimeOfDay(now);

    try {
      const stmt = db.prepare(`
        INSERT INTO timeline_usage_patterns (
          event_id, event_type, event_pattern, recurring_event_id, user_id,
          task_id, task_text, task_category, original_time_offset, actual_time_offset,
          was_completed, completion_time, was_skipped, was_added_custom,
          time_adjustment_minutes, difficulty_rating, usefulness_rating,
          notes, day_of_week, time_of_day
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        eventId, eventType, eventPattern, recurringEventId, userId,
        taskId, taskText, taskCategory, originalTimeOffset, actualTimeOffset,
        wasCompleted, completionTime, wasSkipped, wasAddedCustom,
        timeAdjustmentMinutes, difficultyRating, usefulness,
        notes, dayOfWeek, timeOfDay
      );

      // Trigger pattern analysis after recording
      this.analyzePatterns(userId);
      
      console.log(`📊 Recorded usage pattern for task: ${taskText}`);
      return { success: true };
    } catch (error) {
      console.error('Error recording usage pattern:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze patterns and generate insights
   */
  analyzePatterns(userId) {
    try {
      this.detectFrequentlyAddedTasks(userId);
      this.detectFrequentlySkippedTasks(userId);
      this.detectTimingPreferences(userId);
      this.detectSeasonalPatterns(userId);
      this.detectDayOfWeekPatterns(userId);
      
      // Generate suggestions based on patterns
      this.generateSuggestions(userId);
      
      console.log(`🔍 Completed pattern analysis for user ${userId}`);
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    }
  }

  /**
   * Detect frequently added custom tasks
   */
  detectFrequentlyAddedTasks(userId) {
    const stmt = db.prepare(`
      SELECT 
        task_text,
        task_category,
        event_pattern,
        AVG(original_time_offset) as avg_time_offset,
        COUNT(*) as frequency,
        AVG(usefulness_rating) as avg_usefulness,
        AVG(difficulty_rating) as avg_difficulty
      FROM timeline_usage_patterns
      WHERE user_id = ? 
        AND was_added_custom = 1
        AND created_at > datetime('now', '-90 days')
      GROUP BY task_text, event_pattern
      HAVING frequency >= ?
      ORDER BY frequency DESC, avg_usefulness DESC
    `);

    const patterns = stmt.all(userId, this.MINIMUM_OBSERVATIONS);

    patterns.forEach(pattern => {
      const confidence = this.calculateConfidence(pattern.frequency, pattern.avg_usefulness);
      
      if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
        this.upsertPatternInsight(userId, {
          patternType: 'frequently_added_task',
          patternName: `Custom task: ${pattern.task_text}`,
          patternDescription: `You frequently add "${pattern.task_text}" to ${pattern.event_pattern} events`,
          patternData: JSON.stringify({
            taskText: pattern.task_text,
            taskCategory: pattern.task_category,
            averageTimeOffset: Math.round(pattern.avg_time_offset),
            frequency: pattern.frequency,
            averageUsefulness: pattern.avg_usefulness,
            averageDifficulty: pattern.avg_difficulty
          }),
          confidenceScore: confidence,
          eventPattern: pattern.event_pattern,
          observationCount: pattern.frequency,
          strength: confidence >= this.HIGH_CONFIDENCE_THRESHOLD ? 'strong' : 'medium'
        });
      }
    });
  }

  /**
   * Detect frequently skipped tasks
   */
  detectFrequentlySkippedTasks(userId) {
    const stmt = db.prepare(`
      SELECT 
        task_text,
        task_category,
        event_pattern,
        COUNT(*) as total_occurrences,
        COUNT(CASE WHEN was_skipped = 1 THEN 1 END) as skipped_count,
        AVG(usefulness_rating) as avg_usefulness,
        AVG(difficulty_rating) as avg_difficulty
      FROM timeline_usage_patterns
      WHERE user_id = ? 
        AND created_at > datetime('now', '-90 days')
      GROUP BY task_text, event_pattern
      HAVING total_occurrences >= ? 
        AND (skipped_count * 1.0 / total_occurrences) >= 0.7
      ORDER BY (skipped_count * 1.0 / total_occurrences) DESC
    `);

    const patterns = stmt.all(userId, this.MINIMUM_OBSERVATIONS);

    patterns.forEach(pattern => {
      const skipRate = pattern.skipped_count / pattern.total_occurrences;
      const confidence = skipRate * (pattern.total_occurrences / 10); // Higher confidence with more data

      if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
        this.upsertPatternInsight(userId, {
          patternType: 'frequently_skipped_task',
          patternName: `Often skipped: ${pattern.task_text}`,
          patternDescription: `You skip "${pattern.task_text}" ${Math.round(skipRate * 100)}% of the time in ${pattern.event_pattern} events`,
          patternData: JSON.stringify({
            taskText: pattern.task_text,
            taskCategory: pattern.task_category,
            skipRate: skipRate,
            totalOccurrences: pattern.total_occurrences,
            skippedCount: pattern.skipped_count,
            averageUsefulness: pattern.avg_usefulness,
            averageDifficulty: pattern.avg_difficulty
          }),
          confidenceScore: Math.min(1.0, confidence),
          eventPattern: pattern.event_pattern,
          observationCount: pattern.total_occurrences,
          strength: confidence >= this.HIGH_CONFIDENCE_THRESHOLD ? 'strong' : 'medium'
        });
      }
    });
  }

  /**
   * Detect timing preferences and adjustments
   */
  detectTimingPreferences(userId) {
    const stmt = db.prepare(`
      SELECT 
        task_category,
        event_pattern,
        AVG(time_adjustment_minutes) as avg_adjustment,
        COUNT(*) as frequency,
        AVG(original_time_offset) as avg_original_time,
        AVG(actual_time_offset) as avg_actual_time
      FROM timeline_usage_patterns
      WHERE user_id = ? 
        AND time_adjustment_minutes != 0
        AND created_at > datetime('now', '-90 days')
      GROUP BY task_category, event_pattern
      HAVING frequency >= ? 
        AND ABS(avg_adjustment) >= 5
      ORDER BY ABS(avg_adjustment) DESC
    `);

    const patterns = stmt.all(userId, this.MINIMUM_OBSERVATIONS);

    patterns.forEach(pattern => {
      const confidence = this.calculateTimingConfidence(
        Math.abs(pattern.avg_adjustment), 
        pattern.frequency
      );

      if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
        const adjustmentDirection = pattern.avg_adjustment > 0 ? 'more' : 'less';
        const adjustmentAmount = Math.abs(Math.round(pattern.avg_adjustment));

        this.upsertPatternInsight(userId, {
          patternType: 'timing_preference',
          patternName: `${pattern.task_category} timing preference`,
          patternDescription: `You typically need ${adjustmentAmount} minutes ${adjustmentDirection} time for ${pattern.task_category} tasks in ${pattern.event_pattern} events`,
          patternData: JSON.stringify({
            taskCategory: pattern.task_category,
            averageAdjustment: pattern.avg_adjustment,
            frequency: pattern.frequency,
            averageOriginalTime: pattern.avg_original_time,
            averageActualTime: pattern.avg_actual_time,
            adjustmentDirection,
            adjustmentAmount
          }),
          confidenceScore: confidence,
          eventPattern: pattern.event_pattern,
          observationCount: pattern.frequency,
          strength: confidence >= this.HIGH_CONFIDENCE_THRESHOLD ? 'strong' : 'medium'
        });
      }
    });
  }

  /**
   * Detect seasonal patterns
   */
  detectSeasonalPatterns(userId) {
    const stmt = db.prepare(`
      SELECT 
        CASE 
          WHEN CAST(strftime('%m', created_at) AS INTEGER) IN (12, 1, 2) THEN 'winter'
          WHEN CAST(strftime('%m', created_at) AS INTEGER) IN (3, 4, 5) THEN 'spring'
          WHEN CAST(strftime('%m', created_at) AS INTEGER) IN (6, 7, 8) THEN 'summer'
          ELSE 'fall'
        END as season,
        event_pattern,
        task_category,
        COUNT(*) as frequency,
        AVG(time_adjustment_minutes) as avg_adjustment
      FROM timeline_usage_patterns
      WHERE user_id = ? 
        AND created_at > datetime('now', '-365 days')
      GROUP BY season, event_pattern, task_category
      HAVING frequency >= ?
      ORDER BY frequency DESC
    `);

    const patterns = stmt.all(userId, this.MINIMUM_OBSERVATIONS);

    // Group by season to find seasonal trends
    const seasonalTrends = {};
    patterns.forEach(pattern => {
      if (!seasonalTrends[pattern.season]) {
        seasonalTrends[pattern.season] = [];
      }
      seasonalTrends[pattern.season].push(pattern);
    });

    Object.entries(seasonalTrends).forEach(([season, trends]) => {
      if (trends.length >= 2) {
        const confidence = this.calculateSeasonalConfidence(trends);
        
        if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
          this.upsertPatternInsight(userId, {
            patternType: 'seasonal_pattern',
            patternName: `${season} patterns`,
            patternDescription: `Your preparation patterns change during ${season}`,
            patternData: JSON.stringify({
              season,
              trends: trends.map(t => ({
                eventPattern: t.event_pattern,
                taskCategory: t.task_category,
                frequency: t.frequency,
                averageAdjustment: t.avg_adjustment
              }))
            }),
            confidenceScore: confidence,
            observationCount: trends.reduce((sum, t) => sum + t.frequency, 0),
            strength: confidence >= this.HIGH_CONFIDENCE_THRESHOLD ? 'strong' : 'medium'
          });
        }
      }
    });
  }

  /**
   * Detect day-of-week patterns
   */
  detectDayOfWeekPatterns(userId) {
    const stmt = db.prepare(`
      SELECT 
        day_of_week,
        event_pattern,
        AVG(time_adjustment_minutes) as avg_adjustment,
        COUNT(*) as frequency,
        AVG(difficulty_rating) as avg_difficulty
      FROM timeline_usage_patterns
      WHERE user_id = ? 
        AND created_at > datetime('now', '-90 days')
      GROUP BY day_of_week, event_pattern
      HAVING frequency >= ?
      ORDER BY day_of_week, frequency DESC
    `);

    const patterns = stmt.all(userId, this.MINIMUM_OBSERVATIONS);
    
    // Find patterns that are significantly different on certain days
    patterns.forEach(pattern => {
      if (Math.abs(pattern.avg_adjustment) >= 10 || pattern.avg_difficulty >= 4) {
        const confidence = this.calculateDayPatternConfidence(pattern);
        
        if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
          const dayName = this.getDayName(pattern.day_of_week);
          
          this.upsertPatternInsight(userId, {
            patternType: 'day_of_week_pattern',
            patternName: `${dayName} pattern`,
            patternDescription: `${pattern.event_pattern} events are different on ${dayName}s`,
            patternData: JSON.stringify({
              dayOfWeek: pattern.day_of_week,
              dayName,
              averageAdjustment: pattern.avg_adjustment,
              frequency: pattern.frequency,
              averageDifficulty: pattern.avg_difficulty
            }),
            confidenceScore: confidence,
            eventPattern: pattern.event_pattern,
            observationCount: pattern.frequency,
            strength: confidence >= this.HIGH_CONFIDENCE_THRESHOLD ? 'strong' : 'medium'
          });
        }
      }
    });
  }

  /**
   * Generate actionable suggestions based on patterns
   */
  generateSuggestions(userId) {
    // Get user preferences
    const prefs = this.getUserSuggestionPreferences(userId);
    if (!prefs.learning_mode) return;

    // Get strong patterns
    const strongPatterns = db.prepare(`
      SELECT * FROM timeline_pattern_insights
      WHERE user_id = ? 
        AND strength = 'strong'
        AND last_observed > datetime('now', '-30 days')
      ORDER BY confidence_score DESC, observation_count DESC
    `).all(userId);

    strongPatterns.forEach(pattern => {
      this.generatePatternBasedSuggestion(userId, pattern, prefs);
    });
  }

  /**
   * Generate specific suggestions based on pattern type
   */
  generatePatternBasedSuggestion(userId, pattern, preferences) {
    const patternData = JSON.parse(pattern.pattern_data);
    
    // Check if we've already made this suggestion recently
    const recentSuggestion = db.prepare(`
      SELECT id FROM timeline_suggestions
      WHERE user_id = ? 
        AND suggestion_type = ?
        AND suggestion_data LIKE ?
        AND created_at > datetime('now', '-${this.SUGGESTION_COOLDOWN_HOURS} hours')
    `).get(userId, this.getSuggestionTypeForPattern(pattern.pattern_type), `%${pattern.pattern_name}%`);

    if (recentSuggestion) return;

    let suggestion = null;

    switch (pattern.pattern_type) {
      case 'frequently_added_task':
        if (preferences.show_task_suggestions) {
          suggestion = this.createFrequentTaskSuggestion(pattern, patternData);
        }
        break;

      case 'frequently_skipped_task':
        if (preferences.show_task_suggestions) {
          suggestion = this.createSkippedTaskSuggestion(pattern, patternData);
        }
        break;

      case 'timing_preference':
        if (preferences.show_timing_suggestions) {
          suggestion = this.createTimingAdjustmentSuggestion(pattern, patternData);
        }
        break;

      case 'seasonal_pattern':
        if (preferences.show_template_suggestions) {
          suggestion = this.createSeasonalSuggestion(pattern, patternData);
        }
        break;

      case 'day_of_week_pattern':
        if (preferences.show_timing_suggestions) {
          suggestion = this.createDayPatternSuggestion(pattern, patternData);
        }
        break;
    }

    if (suggestion) {
      this.saveSuggestion(userId, suggestion);
    }
  }

  /**
   * Create suggestion for frequently added custom tasks
   */
  createFrequentTaskSuggestion(pattern, data) {
    return {
      suggestionType: 'add_frequent_task',
      suggestionTitle: `Add "${data.taskText}" to template?`,
      suggestionDescription: `You've added "${data.taskText}" to ${data.frequency} recent ${pattern.event_pattern} events. Would you like to add it to the default template?`,
      suggestionData: JSON.stringify({
        taskText: data.taskText,
        taskCategory: data.taskCategory,
        recommendedTimeOffset: data.averageTimeOffset,
        eventPattern: pattern.event_pattern,
        frequency: data.frequency,
        confidence: pattern.confidence_score
      }),
      confidenceScore: pattern.confidence_score,
      priority: pattern.confidence_score >= this.HIGH_CONFIDENCE_THRESHOLD ? 'high' : 'medium',
      eventPattern: pattern.event_pattern
    };
  }

  /**
   * Create suggestion for frequently skipped tasks
   */
  createSkippedTaskSuggestion(pattern, data) {
    return {
      suggestionType: 'remove_unused_task',
      suggestionTitle: `Remove "${data.taskText}" from template?`,
      suggestionDescription: `You skip "${data.taskText}" ${Math.round(data.skipRate * 100)}% of the time in ${pattern.event_pattern} events. Consider removing it from the template.`,
      suggestionData: JSON.stringify({
        taskText: data.taskText,
        taskCategory: data.taskCategory,
        skipRate: data.skipRate,
        eventPattern: pattern.event_pattern,
        totalOccurrences: data.totalOccurrences
      }),
      confidenceScore: pattern.confidence_score,
      priority: data.skipRate >= 0.9 ? 'high' : 'medium',
      eventPattern: pattern.event_pattern
    };
  }

  /**
   * Create suggestion for timing adjustments
   */
  createTimingAdjustmentSuggestion(pattern, data) {
    const action = data.adjustmentDirection === 'more' ? 'increase' : 'decrease';
    
    return {
      suggestionType: 'adjust_timing',
      suggestionTitle: `Adjust ${data.taskCategory} timing?`,
      suggestionDescription: `You typically ${action} ${data.taskCategory} time by ${data.adjustmentAmount} minutes for ${pattern.event_pattern} events. Update the default timing?`,
      suggestionData: JSON.stringify({
        taskCategory: data.taskCategory,
        adjustmentMinutes: Math.round(data.averageAdjustment),
        frequency: data.frequency,
        eventPattern: pattern.event_pattern,
        newRecommendedTime: Math.round(data.averageActualTime)
      }),
      confidenceScore: pattern.confidence_score,
      priority: Math.abs(data.averageAdjustment) >= 15 ? 'high' : 'medium',
      eventPattern: pattern.event_pattern
    };
  }

  /**
   * Create seasonal adjustment suggestion
   */
  createSeasonalSuggestion(pattern, data) {
    return {
      suggestionType: 'seasonal_adjustment',
      suggestionTitle: `${data.season} adjustments detected`,
      suggestionDescription: `Your preparation patterns change during ${data.season}. Consider creating seasonal variations.`,
      suggestionData: JSON.stringify(data),
      confidenceScore: pattern.confidence_score,
      priority: 'medium',
      eventPattern: pattern.event_pattern
    };
  }

  /**
   * Create day-of-week pattern suggestion
   */
  createDayPatternSuggestion(pattern, data) {
    return {
      suggestionType: 'recurring_pattern',
      suggestionTitle: `${data.dayName} pattern detected`,
      suggestionDescription: `${pattern.event_pattern} events on ${data.dayName}s seem to need different preparation. Consider adjusting the timing.`,
      suggestionData: JSON.stringify(data),
      confidenceScore: pattern.confidence_score,
      priority: Math.abs(data.averageAdjustment) >= 20 ? 'high' : 'medium',
      eventPattern: pattern.event_pattern
    };
  }

  /**
   * Save suggestion to database
   */
  saveSuggestion(userId, suggestion) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Suggestions expire in 30 days

    try {
      const stmt = db.prepare(`
        INSERT INTO timeline_suggestions (
          user_id, suggestion_type, suggestion_title, suggestion_description,
          suggestion_data, confidence_score, priority, event_pattern, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        suggestion.suggestionType,
        suggestion.suggestionTitle,
        suggestion.suggestionDescription,
        suggestion.suggestionData,
        suggestion.confidenceScore,
        suggestion.priority,
        suggestion.eventPattern,
        expiresAt.toISOString()
      );

      console.log(`💡 Generated suggestion: ${suggestion.suggestionTitle}`);
    } catch (error) {
      console.error('Error saving suggestion:', error);
    }
  }

  /**
   * Get active suggestions for a user
   */
  getActiveSuggestions(userId, limit = 10) {
    const suggestions = db.prepare(`
      SELECT * FROM timeline_suggestions
      WHERE user_id = ?
        AND status IN ('pending', 'shown')
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY priority DESC, confidence_score DESC, created_at DESC
      LIMIT ?
    `).all(userId, limit);

    return suggestions.map(s => ({
      ...s,
      suggestion_data: JSON.parse(s.suggestion_data)
    }));
  }

  /**
   * Get suggestions for a specific event pattern
   */
  getSuggestionsForEvent(userId, eventPattern, limit = 5) {
    const suggestions = db.prepare(`
      SELECT * FROM timeline_suggestions
      WHERE user_id = ?
        AND status IN ('pending', 'shown')
        AND (event_pattern = ? OR event_pattern IS NULL)
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY 
        CASE WHEN event_pattern = ? THEN 0 ELSE 1 END,
        priority DESC, 
        confidence_score DESC, 
        created_at DESC
      LIMIT ?
    `).all(userId, eventPattern, eventPattern, limit);

    return suggestions.map(s => ({
      ...s,
      suggestion_data: JSON.parse(s.suggestion_data)
    }));
  }

  /**
   * Respond to a suggestion (accept, dismiss, permanently dismiss)
   */
  respondToSuggestion(suggestionId, response) {
    const validResponses = ['accepted', 'dismissed', 'permanently_dismissed'];
    if (!validResponses.includes(response)) {
      throw new Error('Invalid response type');
    }

    try {
      const stmt = db.prepare(`
        UPDATE timeline_suggestions 
        SET status = ?, responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(response, suggestionId);

      // If permanently dismissed, update user preferences
      if (response === 'permanently_dismissed') {
        const suggestion = db.prepare('SELECT * FROM timeline_suggestions WHERE id = ?').get(suggestionId);
        if (suggestion) {
          this.updateDismissedSuggestionTypes(suggestion.user_id, suggestion.suggestion_type);
        }
      }

      console.log(`📝 Suggestion ${suggestionId} marked as ${response}`);
      return { success: true };
    } catch (error) {
      console.error('Error responding to suggestion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply a suggestion (helper for UI to implement changes)
   */
  applySuggestion(suggestionId) {
    const suggestion = db.prepare(`
      SELECT * FROM timeline_suggestions WHERE id = ? AND status = 'pending'
    `).get(suggestionId);

    if (!suggestion) {
      throw new Error('Suggestion not found or already processed');
    }

    const suggestionData = JSON.parse(suggestion.suggestion_data);
    
    // Return the suggestion data and type for the caller to implement
    // This service doesn't auto-apply changes - it just provides the data
    return {
      type: suggestion.suggestion_type,
      data: suggestionData,
      instructions: this.getApplicationInstructions(suggestion.suggestion_type, suggestionData)
    };
  }

  /**
   * Get application instructions for a suggestion type
   */
  getApplicationInstructions(type, data) {
    switch (type) {
      case 'add_frequent_task':
        return {
          action: 'Add task to template',
          taskText: data.taskText,
          timeOffset: data.recommendedTimeOffset,
          category: data.taskCategory,
          targetPattern: data.eventPattern
        };

      case 'remove_unused_task':
        return {
          action: 'Remove task from template',
          taskText: data.taskText,
          targetPattern: data.eventPattern
        };

      case 'adjust_timing':
        return {
          action: 'Adjust timing',
          taskCategory: data.taskCategory,
          adjustment: data.adjustmentMinutes,
          targetPattern: data.eventPattern
        };

      default:
        return { action: 'Manual review required' };
    }
  }

  // Helper methods

  upsertPatternInsight(userId, data) {
    const existing = db.prepare(`
      SELECT id FROM timeline_pattern_insights
      WHERE user_id = ? AND pattern_name = ?
    `).get(userId, data.patternName);

    if (existing) {
      db.prepare(`
        UPDATE timeline_pattern_insights
        SET pattern_description = ?, pattern_data = ?, confidence_score = ?,
            observation_count = observation_count + ?, last_observed = CURRENT_TIMESTAMP,
            strength = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        data.patternDescription, data.patternData, data.confidenceScore,
        data.observationCount, data.strength, existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO timeline_pattern_insights (
          user_id, pattern_type, pattern_name, pattern_description,
          pattern_data, confidence_score, observation_count, event_pattern,
          strength, first_observed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        userId, data.patternType, data.patternName, data.patternDescription,
        data.patternData, data.confidenceScore, data.observationCount,
        data.eventPattern, data.strength
      );
    }
  }

  getUserSuggestionPreferences(userId) {
    const prefs = db.prepare(`
      SELECT * FROM user_suggestion_preferences WHERE user_id = ?
    `).get(userId);

    if (!prefs) {
      // Create default preferences
      db.prepare(`
        INSERT INTO user_suggestion_preferences (user_id) VALUES (?)
      `).run(userId);

      return {
        suggestion_frequency: 'normal',
        auto_apply_low_risk: false,
        show_timing_suggestions: true,
        show_task_suggestions: true,
        show_template_suggestions: true,
        dismissed_suggestion_types: [],
        learning_mode: true
      };
    }

    return {
      ...prefs,
      dismissed_suggestion_types: JSON.parse(prefs.dismissed_suggestion_types)
    };
  }

  calculateConfidence(frequency, usefulness) {
    // Confidence based on frequency and usefulness
    const frequencyScore = Math.min(1, frequency / 10); // Max score at 10 occurrences
    const usefulnessScore = (usefulness || 3) / 5; // Normalize to 0-1
    return (frequencyScore * 0.7 + usefulnessScore * 0.3);
  }

  calculateTimingConfidence(adjustment, frequency) {
    // Higher confidence for larger adjustments and more frequent occurrences
    const adjustmentScore = Math.min(1, Math.abs(adjustment) / 30); // Max score at 30 minutes
    const frequencyScore = Math.min(1, frequency / 10);
    return (adjustmentScore * 0.6 + frequencyScore * 0.4);
  }

  calculateSeasonalConfidence(trends) {
    // Calculate confidence based on number of trends and their frequency
    const avgFrequency = trends.reduce((sum, t) => sum + t.frequency, 0) / trends.length;
    return Math.min(1, (trends.length / 5) * 0.5 + Math.min(1, avgFrequency / 5) * 0.5);
  }

  calculateDayPatternConfidence(pattern) {
    // Confidence based on adjustment magnitude and frequency
    const adjustmentScore = Math.min(1, Math.abs(pattern.avg_adjustment) / 20);
    const frequencyScore = Math.min(1, pattern.frequency / 8);
    return (adjustmentScore * 0.7 + frequencyScore * 0.3);
  }

  getTimeOfDay(date) {
    const hour = date.getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  getDayName(dayNumber) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  }

  getSuggestionTypeForPattern(patternType) {
    const mapping = {
      'frequently_added_task': 'add_frequent_task',
      'frequently_skipped_task': 'remove_unused_task',
      'timing_preference': 'adjust_timing',
      'seasonal_pattern': 'seasonal_adjustment',
      'day_of_week_pattern': 'recurring_pattern'
    };
    return mapping[patternType] || 'template_improvement';
  }

  updateDismissedSuggestionTypes(userId, suggestionType) {
    const prefs = this.getUserSuggestionPreferences(userId);
    const dismissed = prefs.dismissed_suggestion_types;
    
    if (!dismissed.includes(suggestionType)) {
      dismissed.push(suggestionType);
      
      db.prepare(`
        UPDATE user_suggestion_preferences 
        SET dismissed_suggestion_types = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(JSON.stringify(dismissed), userId);
    }
  }
}

module.exports = TimelineSuggestionEngine;