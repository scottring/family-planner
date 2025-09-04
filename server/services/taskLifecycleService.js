const db = require('../config/database');
const { createEvent } = require('./googleCalendar');
const AI = require('./ai');

class TaskLifecycleService {
  /**
   * Handle task completion with smart prompting and event creation
   * @param {number} taskId - Task ID to complete
   * @param {number} userId - User ID performing the action
   * @param {Object} completionData - Additional completion data
   * @returns {Object} Completion result with prompts and actions
   */
  async completeTaskWithLifecycle(taskId, userId, completionData = {}) {
    const task = db.prepare(`
      SELECT t.*, tt.name as template_name, tt.recurring_pattern as template_pattern
      FROM tasks t
      LEFT JOIN task_templates tt ON t.template_id = tt.id
      WHERE t.id = ?
    `).get(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    // Mark task as completed
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE tasks 
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `).run(now, taskId);

    const result = {
      task,
      completedAt: now,
      prompts: [],
      createdEvents: [],
      nextTasks: []
    };

    // Process completion actions based on task type
    switch (task.task_type) {
      case 'complex':
        await this._handleComplexTaskCompletion(task, userId, result);
        break;
      case 'recurring':
        await this._handleRecurringTaskCompletion(task, userId, result);
        break;
      case 'preparatory':
        await this._handlePreparatoryTaskCompletion(task, userId, result);
        break;
      default:
        await this._handleSimpleTaskCompletion(task, userId, result);
    }

    // Generate smart prompts for event creation if applicable
    if (task.creates_events || completionData.createEvent) {
      const eventPrompt = await this._generateEventCreationPrompt(task, userId);
      if (eventPrompt) {
        result.prompts.push(eventPrompt);
      }
    }

    // Generate follow-up task suggestions
    const followUpSuggestions = await this._generateFollowUpSuggestions(task, userId);
    if (followUpSuggestions.length > 0) {
      result.prompts.push({
        type: 'follow_up_tasks',
        title: 'Suggested Follow-up Tasks',
        message: 'Based on this task completion, here are some suggested follow-up actions:',
        suggestions: followUpSuggestions
      });
    }

    return result;
  }

  /**
   * Generate next recurring task instance
   * @param {number} taskId - Original recurring task ID
   * @param {number} userId - User ID
   * @returns {Object} Next task instance
   */
  async generateNextRecurringInstance(taskId, userId) {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    
    if (!task || task.task_type !== 'recurring') {
      throw new Error('Task is not a recurring task');
    }

    const recurrencePattern = db.parseJSON(task.recurrence_pattern) || {};
    const nextDueDate = this._calculateNextDueDate(task.due_date, recurrencePattern);

    // Create next instance
    const nextTaskData = {
      title: task.title,
      description: task.description,
      due_date: nextDueDate,
      assigned_to: task.assigned_to,
      family_member_id: task.family_member_id,
      category: task.category,
      priority: task.priority,
      task_type: task.task_type,
      creates_events: task.creates_events,
      recurrence_pattern: task.recurrence_pattern,
      template_id: task.template_id,
      checklist: task.checklist,
      completion_actions: task.completion_actions,
      created_by: userId
    };

    const result = db.prepare(`
      INSERT INTO tasks (
        title, description, due_date, assigned_to, family_member_id,
        category, priority, task_type, creates_events, recurrence_pattern,
        template_id, checklist, completion_actions, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nextTaskData.title,
      nextTaskData.description,
      nextTaskData.due_date,
      nextTaskData.assigned_to,
      nextTaskData.family_member_id,
      nextTaskData.category,
      nextTaskData.priority,
      nextTaskData.task_type,
      nextTaskData.creates_events,
      db.stringifyJSON(recurrencePattern),
      nextTaskData.template_id,
      nextTaskData.checklist,
      nextTaskData.completion_actions,
      userId
    );

    // Link the current task to the next instance
    db.prepare('UPDATE tasks SET next_instance_id = ? WHERE id = ?')
      .run(result.lastInsertRowid, taskId);

    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  }

  /**
   * Convert task to event with smart enrichment
   * @param {number} taskId - Task ID to convert
   * @param {Object} eventData - Additional event data
   * @param {number} userId - User ID
   * @returns {Object} Created event
   */
  async convertTaskToEvent(taskId, eventData, userId) {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    // Use AI to enhance event details based on task
    const aiEnhancement = await AI.enhanceTaskToEvent(task, eventData);

    const enrichedEventData = {
      title: eventData.title || task.title,
      description: eventData.description || task.description,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      location: eventData.location || aiEnhancement.suggestedLocation,
      event_type: eventData.event_type || 'task_converted',
      preparation_list: db.stringifyJSON(aiEnhancement.preparationList || []),
      resources_needed: db.stringifyJSON(aiEnhancement.resourcesNeeded || {}),
      ai_enriched: true,
      ai_suggestions: db.stringifyJSON(aiEnhancement.suggestions || {}),
      created_by: userId
    };

    const result = db.prepare(`
      INSERT INTO events (
        title, description, start_time, end_time, location, event_type,
        preparation_list, resources_needed, ai_enriched, ai_suggestions, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      enrichedEventData.title,
      enrichedEventData.description,
      enrichedEventData.start_time,
      enrichedEventData.end_time,
      enrichedEventData.location,
      enrichedEventData.event_type,
      enrichedEventData.preparation_list,
      enrichedEventData.resources_needed,
      enrichedEventData.ai_enriched,
      enrichedEventData.ai_suggestions,
      userId
    );

    // Link task to the created event
    db.prepare('UPDATE tasks SET linked_event_id = ? WHERE id = ?')
      .run(result.lastInsertRowid, taskId);

    const createdEvent = db.prepare('SELECT * FROM events WHERE id = ?')
      .get(result.lastInsertRowid);

    // Try to create in Google Calendar if configured
    try {
      const user = db.prepare('SELECT google_tokens FROM users WHERE id = ?').get(userId);
      if (user && user.google_tokens && JSON.parse(user.google_tokens).access_token) {
        await createEvent(createdEvent, JSON.parse(user.google_tokens));
      }
    } catch (error) {
      console.warn('Failed to create event in Google Calendar:', error.message);
    }

    return createdEvent;
  }

  /**
   * Get task templates for library
   * @param {string} category - Optional category filter
   * @returns {Array} Task templates
   */
  getTaskTemplates(category = null) {
    let query = `
      SELECT tt.*, u.full_name as created_by_name
      FROM task_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      ORDER BY tt.usage_count DESC, tt.created_at DESC
    `;
    
    let params = [];
    
    if (category) {
      query = `
        SELECT tt.*, u.full_name as created_by_name
        FROM task_templates tt
        LEFT JOIN users u ON tt.created_by = u.id
        WHERE tt.category = ?
        ORDER BY tt.usage_count DESC, tt.created_at DESC
      `;
      params = [category];
    }

    const templates = db.prepare(query).all(...params);
    
    return templates.map(template => ({
      ...template,
      checklist: db.parseJSON(template.checklist) || [],
      tags: db.parseJSON(template.tags) || [],
      recurring_pattern: db.parseJSON(template.recurring_pattern) || {}
    }));
  }

  /**
   * Create task from template
   * @param {number} templateId - Template ID
   * @param {Object} customData - Custom task data
   * @param {number} userId - User ID
   * @returns {Object} Created task
   */
  async createTaskFromTemplate(templateId, customData, userId) {
    const template = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // Increment template usage count
    db.prepare('UPDATE task_templates SET usage_count = usage_count + 1 WHERE id = ?')
      .run(templateId);

    const taskData = {
      title: customData.title || template.name,
      description: customData.description || template.description,
      due_date: customData.due_date,
      assigned_to: customData.assigned_to,
      family_member_id: customData.family_member_id,
      category: customData.category || template.category,
      priority: customData.priority || template.default_priority,
      task_type: customData.task_type || (template.recurring_pattern ? 'recurring' : 'simple'),
      creates_events: customData.creates_events || false,
      recurrence_pattern: template.recurring_pattern,
      template_id: templateId,
      checklist: template.checklist,
      completion_actions: customData.completion_actions || '[]',
      created_by: userId
    };

    const result = db.prepare(`
      INSERT INTO tasks (
        title, description, due_date, assigned_to, family_member_id,
        category, priority, task_type, creates_events, recurrence_pattern,
        template_id, checklist, completion_actions, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskData.title,
      taskData.description,
      taskData.due_date,
      taskData.assigned_to,
      taskData.family_member_id,
      taskData.category,
      taskData.priority,
      taskData.task_type,
      taskData.creates_events,
      taskData.recurrence_pattern,
      taskData.template_id,
      taskData.checklist,
      taskData.completion_actions,
      userId
    );

    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  }

  // Private helper methods
  async _handleComplexTaskCompletion(task, userId, result) {
    const checklist = db.parseJSON(task.checklist) || [];
    const incompleteItems = checklist.filter(item => !item.completed);
    
    if (incompleteItems.length > 0) {
      result.prompts.push({
        type: 'incomplete_checklist',
        title: 'Incomplete Checklist Items',
        message: `There are ${incompleteItems.length} incomplete checklist items. Would you like to create follow-up tasks for them?`,
        items: incompleteItems
      });
    }
  }

  async _handleRecurringTaskCompletion(task, userId, result) {
    const recurrencePattern = db.parseJSON(task.recurrence_pattern) || {};
    
    if (recurrencePattern.autoGenerate !== false) {
      try {
        const nextInstance = await this.generateNextRecurringInstance(task.id, userId);
        result.nextTasks.push(nextInstance);
        
        result.prompts.push({
          type: 'recurring_generated',
          title: 'Next Instance Created',
          message: `The next occurrence of this recurring task has been automatically created for ${new Date(nextInstance.due_date).toLocaleDateString()}.`,
          nextTask: nextInstance
        });
      } catch (error) {
        console.error('Failed to generate next recurring instance:', error);
      }
    }
  }

  async _handlePreparatoryTaskCompletion(task, userId, result) {
    if (task.linked_event_id) {
      const linkedEvent = db.prepare('SELECT * FROM events WHERE id = ?')
        .get(task.linked_event_id);
      
      if (linkedEvent) {
        result.prompts.push({
          type: 'event_ready',
          title: 'Event Preparation Complete',
          message: `Preparation for "${linkedEvent.title}" is now complete. The event is scheduled for ${new Date(linkedEvent.start_time).toLocaleString()}.`,
          event: linkedEvent
        });
      }
    }
  }

  async _handleSimpleTaskCompletion(task, userId, result) {
    // Check if this was a milestone task that might trigger other actions
    const completionActions = db.parseJSON(task.completion_actions) || [];
    
    for (const action of completionActions) {
      switch (action.type) {
        case 'create_follow_up_task':
          // Auto-create follow-up task
          break;
        case 'notify_family':
          // Send notification to family members
          break;
        case 'schedule_celebration':
          // Suggest celebration event
          break;
      }
    }
  }

  async _generateEventCreationPrompt(task, userId) {
    const aiSuggestion = await AI.suggestEventFromTask(task);
    
    return {
      type: 'create_event',
      title: 'Create Event from Task',
      message: `Would you like to create a calendar event based on this completed task?`,
      suggestedEvent: aiSuggestion,
      taskId: task.id
    };
  }

  async _generateFollowUpSuggestions(task, userId) {
    try {
      const suggestions = await AI.suggestFollowUpTasks(task);
      return suggestions.map(suggestion => ({
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority || 3,
        category: suggestion.category || task.category,
        estimatedDuration: suggestion.duration
      }));
    } catch (error) {
      console.error('Failed to generate follow-up suggestions:', error);
      return [];
    }
  }

  _calculateNextDueDate(currentDueDate, recurrencePattern) {
    const current = new Date(currentDueDate);
    const next = new Date(current);

    switch (recurrencePattern.type) {
      case 'daily':
        next.setDate(current.getDate() + (recurrencePattern.interval || 1));
        break;
      case 'weekly':
        next.setDate(current.getDate() + (7 * (recurrencePattern.interval || 1)));
        break;
      case 'monthly':
        next.setMonth(current.getMonth() + (recurrencePattern.interval || 1));
        break;
      case 'yearly':
        next.setFullYear(current.getFullYear() + (recurrencePattern.interval || 1));
        break;
      default:
        next.setDate(current.getDate() + 1); // Default to daily
    }

    return next.toISOString();
  }
}

module.exports = new TaskLifecycleService();