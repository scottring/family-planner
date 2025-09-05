const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const TimelineSuggestionEngine = require('../services/timelineSuggestionEngine');

const suggestionEngine = new TimelineSuggestionEngine();

// Record timeline usage pattern
router.post('/api/timeline-suggestions/record-usage', auth, (req, res) => {
  try {
    const {
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
    } = req.body;

    const result = suggestionEngine.recordUsagePattern({
      eventId,
      eventType,
      eventPattern,
      recurringEventId,
      userId: req.user.id,
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
      usefulness: usefulnessRating,
      notes
    });

    res.json(result);
  } catch (error) {
    console.error('Error recording usage pattern:', error);
    res.status(500).json({ error: 'Failed to record usage pattern' });
  }
});

// Get active suggestions for user
router.get('/api/timeline-suggestions', auth, (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const suggestions = suggestionEngine.getActiveSuggestions(req.user.id, parseInt(limit));
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Get suggestions for specific event pattern
router.get('/api/timeline-suggestions/for-event', auth, (req, res) => {
  try {
    const { eventPattern, limit = 5 } = req.query;
    
    if (!eventPattern) {
      return res.status(400).json({ error: 'Event pattern is required' });
    }

    const suggestions = suggestionEngine.getSuggestionsForEvent(
      req.user.id, 
      eventPattern, 
      parseInt(limit)
    );
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting event suggestions:', error);
    res.status(500).json({ error: 'Failed to get event suggestions' });
  }
});

// Respond to suggestion (accept, dismiss, permanently dismiss)
router.post('/api/timeline-suggestions/:id/respond', auth, (req, res) => {
  try {
    const suggestionId = parseInt(req.params.id);
    const { response } = req.body;

    // Verify suggestion belongs to user
    const suggestion = db.prepare(`
      SELECT * FROM timeline_suggestions WHERE id = ? AND user_id = ?
    `).get(suggestionId, req.user.id);

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const result = suggestionEngine.respondToSuggestion(suggestionId, response);
    res.json(result);
  } catch (error) {
    console.error('Error responding to suggestion:', error);
    res.status(500).json({ error: 'Failed to respond to suggestion' });
  }
});

// Get application details for a suggestion
router.get('/api/timeline-suggestions/:id/apply', auth, (req, res) => {
  try {
    const suggestionId = parseInt(req.params.id);

    // Verify suggestion belongs to user
    const suggestion = db.prepare(`
      SELECT * FROM timeline_suggestions WHERE id = ? AND user_id = ?
    `).get(suggestionId, req.user.id);

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const applicationData = suggestionEngine.applySuggestion(suggestionId);
    res.json(applicationData);
  } catch (error) {
    console.error('Error getting suggestion application data:', error);
    res.status(500).json({ error: 'Failed to get application data' });
  }
});

// Get user suggestion preferences
router.get('/api/timeline-suggestions/preferences', auth, (req, res) => {
  try {
    const preferences = db.prepare(`
      SELECT * FROM user_suggestion_preferences WHERE user_id = ?
    `).get(req.user.id);

    if (!preferences) {
      // Create default preferences
      const defaultPrefs = {
        suggestion_frequency: 'normal',
        auto_apply_low_risk: false,
        show_timing_suggestions: true,
        show_task_suggestions: true,
        show_template_suggestions: true,
        dismissed_suggestion_types: '[]',
        learning_mode: true
      };

      db.prepare(`
        INSERT INTO user_suggestion_preferences (
          user_id, suggestion_frequency, auto_apply_low_risk,
          show_timing_suggestions, show_task_suggestions, show_template_suggestions,
          dismissed_suggestion_types, learning_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        defaultPrefs.suggestion_frequency,
        defaultPrefs.auto_apply_low_risk,
        defaultPrefs.show_timing_suggestions,
        defaultPrefs.show_task_suggestions,
        defaultPrefs.show_template_suggestions,
        defaultPrefs.dismissed_suggestion_types,
        defaultPrefs.learning_mode
      );

      res.json(defaultPrefs);
    } else {
      res.json({
        ...preferences,
        dismissed_suggestion_types: JSON.parse(preferences.dismissed_suggestion_types)
      });
    }
  } catch (error) {
    console.error('Error getting suggestion preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update user suggestion preferences
router.put('/api/timeline-suggestions/preferences', auth, (req, res) => {
  try {
    const {
      suggestion_frequency,
      auto_apply_low_risk,
      show_timing_suggestions,
      show_task_suggestions,
      show_template_suggestions,
      dismissed_suggestion_types,
      learning_mode
    } = req.body;

    // Check if preferences exist
    const existing = db.prepare(`
      SELECT id FROM user_suggestion_preferences WHERE user_id = ?
    `).get(req.user.id);

    if (existing) {
      // Update existing preferences
      db.prepare(`
        UPDATE user_suggestion_preferences
        SET suggestion_frequency = ?,
            auto_apply_low_risk = ?,
            show_timing_suggestions = ?,
            show_task_suggestions = ?,
            show_template_suggestions = ?,
            dismissed_suggestion_types = ?,
            learning_mode = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        suggestion_frequency,
        auto_apply_low_risk,
        show_timing_suggestions,
        show_task_suggestions,
        show_template_suggestions,
        JSON.stringify(dismissed_suggestion_types || []),
        learning_mode,
        req.user.id
      );
    } else {
      // Create new preferences
      db.prepare(`
        INSERT INTO user_suggestion_preferences (
          user_id, suggestion_frequency, auto_apply_low_risk,
          show_timing_suggestions, show_task_suggestions, show_template_suggestions,
          dismissed_suggestion_types, learning_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        suggestion_frequency,
        auto_apply_low_risk,
        show_timing_suggestions,
        show_task_suggestions,
        show_template_suggestions,
        JSON.stringify(dismissed_suggestion_types || []),
        learning_mode
      );
    }

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating suggestion preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get pattern insights for user
router.get('/api/timeline-suggestions/insights', auth, (req, res) => {
  try {
    const { pattern_type, limit = 20 } = req.query;
    
    let query = `
      SELECT * FROM timeline_pattern_insights
      WHERE user_id = ?
        AND last_observed > datetime('now', '-90 days')
    `;
    
    const params = [req.user.id];
    
    if (pattern_type) {
      query += ' AND pattern_type = ?';
      params.push(pattern_type);
    }
    
    query += ' ORDER BY confidence_score DESC, observation_count DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const insights = db.prepare(query).all(...params);
    
    const formattedInsights = insights.map(insight => ({
      ...insight,
      pattern_data: JSON.parse(insight.pattern_data)
    }));
    
    res.json(formattedInsights);
  } catch (error) {
    console.error('Error getting pattern insights:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Manually trigger pattern analysis for user
router.post('/api/timeline-suggestions/analyze-patterns', auth, (req, res) => {
  try {
    suggestionEngine.analyzePatterns(req.user.id);
    res.json({ message: 'Pattern analysis completed' });
  } catch (error) {
    console.error('Error triggering pattern analysis:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// Get suggestion statistics for user
router.get('/api/timeline-suggestions/stats', auth, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_suggestions,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed_count,
        COUNT(CASE WHEN status = 'permanently_dismissed' THEN 1 END) as permanently_dismissed_count,
        COUNT(CASE WHEN status IN ('pending', 'shown') THEN 1 END) as active_count,
        AVG(confidence_score) as avg_confidence
      FROM timeline_suggestions
      WHERE user_id = ?
    `).get(req.user.id);

    const patternStats = db.prepare(`
      SELECT 
        pattern_type,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence,
        MAX(observation_count) as max_observations
      FROM timeline_pattern_insights
      WHERE user_id = ?
      GROUP BY pattern_type
      ORDER BY count DESC
    `).all(req.user.id);

    const usageStats = db.prepare(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN was_completed = 1 THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN was_skipped = 1 THEN 1 END) as skipped_tasks,
        COUNT(CASE WHEN was_added_custom = 1 THEN 1 END) as custom_tasks_added,
        AVG(usefulness_rating) as avg_usefulness,
        AVG(difficulty_rating) as avg_difficulty
      FROM timeline_usage_patterns
      WHERE user_id = ?
        AND created_at > datetime('now', '-90 days')
    `).get(req.user.id);

    res.json({
      suggestions: stats,
      patterns: patternStats,
      usage: usageStats
    });
  } catch (error) {
    console.error('Error getting suggestion stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Bulk record timeline completion data (for timeline finalization)
router.post('/api/timeline-suggestions/record-completion', auth, (req, res) => {
  try {
    const {
      eventId,
      eventType,
      eventPattern,
      recurringEventId,
      timelineData,
      completedTasks,
      feedback
    } = req.body;

    if (!timelineData || !Array.isArray(timelineData)) {
      return res.status(400).json({ error: 'Timeline data is required' });
    }

    let recordsCreated = 0;

    // Process each timeline item
    timelineData.forEach((item, index) => {
      const wasCompleted = completedTasks && completedTasks.includes(item.id);
      const itemFeedback = feedback && feedback.find(f => f.taskId === item.id);

      const result = suggestionEngine.recordUsagePattern({
        eventId,
        eventType,
        eventPattern,
        recurringEventId,
        userId: req.user.id,
        taskId: item.id,
        taskText: item.text,
        taskCategory: item.category || 'preparation',
        originalTimeOffset: item.timeOffset,
        actualTimeOffset: item.actualTimeOffset || item.timeOffset,
        wasCompleted,
        completionTime: wasCompleted ? new Date().toISOString() : null,
        wasSkipped: !wasCompleted,
        wasAddedCustom: item.id.startsWith('custom-') || item.wasAddedCustom,
        timeAdjustmentMinutes: (item.actualTimeOffset || item.timeOffset) - item.timeOffset,
        difficultyRating: itemFeedback?.difficulty,
        usefulness: itemFeedback?.usefulness,
        notes: itemFeedback?.notes
      });

      if (result.success) {
        recordsCreated++;
      }
    });

    res.json({
      message: `Recorded ${recordsCreated} usage patterns`,
      recordsCreated
    });
  } catch (error) {
    console.error('Error recording bulk completion data:', error);
    res.status(500).json({ error: 'Failed to record completion data' });
  }
});

// Clear old suggestions and patterns (maintenance endpoint)
router.post('/api/timeline-suggestions/cleanup', auth, (req, res) => {
  try {
    const { days_old = 90 } = req.body;

    // Clear expired suggestions
    const expiredSuggestions = db.prepare(`
      DELETE FROM timeline_suggestions
      WHERE user_id = ?
        AND status IN ('dismissed', 'permanently_dismissed')
        AND responded_at < datetime('now', '-${days_old} days')
    `).run(req.user.id);

    // Clear old usage patterns (keep learning patterns for longer)
    const oldPatterns = db.prepare(`
      DELETE FROM timeline_usage_patterns
      WHERE user_id = ?
        AND created_at < datetime('now', '-180 days')
    `).run(req.user.id);

    res.json({
      message: 'Cleanup completed',
      suggestionsRemoved: expiredSuggestions.changes,
      patternsRemoved: oldPatterns.changes
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to perform cleanup' });
  }
});

module.exports = router;