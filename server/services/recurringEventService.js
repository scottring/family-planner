const db = require('../config/database');

class RecurringEventService {
  /**
   * Creates a recurring event template and generates initial instances
   */
  static createRecurringEvent(eventData) {
    const {
      title,
      description,
      start_time,
      end_time,
      location,
      category,
      event_type,
      attendees,
      notes,
      resources,
      structured_checklist,
      assigned_to,
      created_by,
      // Recurring fields
      recurrence_type,
      recurrence_days,
      recurrence_end_date
    } = eventData;

    if (!recurrence_type) {
      throw new Error('Recurrence type is required for recurring events');
    }

    // Create the parent recurring event template
    const insertStmt = db.prepare(`
      INSERT INTO events (
        title, description, start_time, end_time, location,
        category, event_type, attendees, notes, resources, 
        structured_checklist, checklist_completed_items,
        assigned_to, created_by, is_recurring, recurrence_type,
        recurrence_days, recurrence_end_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const result = insertStmt.run(
      title,
      description || null,
      start_time,
      end_time,
      location || null,
      category || 'personal',
      event_type || 'routine',
      attendees || null,
      notes || null,
      typeof resources === 'object' ? db.stringifyJSON(resources) : resources || null,
      typeof structured_checklist === 'object' ? db.stringifyJSON(structured_checklist) : db.stringifyJSON([]),
      db.stringifyJSON([]), // checklist_completed_items
      assigned_to || null,
      created_by,
      true, // is_recurring
      recurrence_type,
      db.stringifyJSON(recurrence_days || []),
      recurrence_end_date || null
    );

    const parentId = result.lastInsertRowid;

    // Generate initial instances for the next 30 days
    const instances = this.generateInstances(parentId, new Date(), 30);
    
    return {
      parent: this.getEventById(parentId),
      instances: instances
    };
  }

  /**
   * Generate recurring event instances
   */
  static generateInstances(parentId, startDate, daysAhead = 30) {
    const parent = this.getEventById(parentId);
    if (!parent || !parent.is_recurring) {
      throw new Error('Parent event not found or is not recurring');
    }

    const instances = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysAhead);

    // Parse recurrence data
    const recurrenceDays = db.parseJSON(parent.recurrence_days) || [];
    const recurrenceEndDate = parent.recurrence_end_date ? new Date(parent.recurrence_end_date) : null;

    // Get the time from the original event
    const originalStart = new Date(parent.start_time);
    const originalEnd = new Date(parent.end_time);
    const duration = originalEnd.getTime() - originalStart.getTime();

    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate && (!recurrenceEndDate || currentDate <= recurrenceEndDate)) {
      let shouldCreateInstance = false;

      switch (parent.recurrence_type) {
        case 'daily':
          shouldCreateInstance = true;
          break;
        
        case 'weekly':
          // Same day of week as original
          shouldCreateInstance = currentDate.getDay() === originalStart.getDay();
          break;
        
        case 'weekdays':
          // Monday to Friday (1-5)
          const dayOfWeek = currentDate.getDay();
          shouldCreateInstance = dayOfWeek >= 1 && dayOfWeek <= 5;
          break;
        
        case 'custom':
          // Specific days (0=Sunday, 1=Monday, etc.)
          shouldCreateInstance = recurrenceDays.includes(currentDate.getDay());
          break;
      }

      if (shouldCreateInstance && !this.instanceExistsForDate(parentId, currentDate)) {
        const instance = this.createInstance(parent, currentDate, duration);
        instances.push(instance);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return instances;
  }

  /**
   * Check if an instance already exists for a specific date
   */
  static instanceExistsForDate(parentId, date) {
    const dateStr = date.toISOString().split('T')[0];
    const existing = db.prepare(`
      SELECT COUNT(*) as count FROM events 
      WHERE parent_recurring_id = ? AND recurrence_instance_date = ?
    `).get(parentId, dateStr);
    
    return existing.count > 0;
  }

  /**
   * Create a single instance of a recurring event
   */
  static createInstance(parent, instanceDate, duration) {
    // Calculate start and end times for this instance
    const originalStart = new Date(parent.start_time);
    const instanceStart = new Date(instanceDate);
    instanceStart.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds());
    
    const instanceEnd = new Date(instanceStart.getTime() + duration);
    
    const instanceDateStr = instanceDate.toISOString().split('T')[0];

    const insertStmt = db.prepare(`
      INSERT INTO events (
        title, description, start_time, end_time, location,
        category, event_type, attendees, notes, resources, 
        structured_checklist, checklist_completed_items,
        assigned_to, created_by, is_recurring, parent_recurring_id,
        recurrence_instance_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const result = insertStmt.run(
      parent.title,
      parent.description,
      instanceStart.toISOString(),
      instanceEnd.toISOString(),
      parent.location,
      parent.category,
      parent.event_type,
      parent.attendees,
      parent.notes,
      parent.resources,
      parent.structured_checklist,
      db.stringifyJSON([]), // Reset checklist completion for new instance
      parent.assigned_to,
      parent.created_by,
      false, // Individual instances are not recurring themselves
      parent.id,
      instanceDateStr
    );

    return this.getEventById(result.lastInsertRowid);
  }

  /**
   * Get event by ID with parsed JSON fields
   */
  static getEventById(id) {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) return null;

    // Parse JSON fields
    event.preparation_list = db.parseJSON(event.preparation_list) || [];
    event.resources = db.parseJSON(event.resources) || {};
    event.handoff_history = db.parseJSON(event.handoff_history) || [];
    event.packing_list = db.parseJSON(event.packing_list) || [];
    event.contacts = db.parseJSON(event.contacts) || [];
    event.meal_requirements = db.parseJSON(event.meal_requirements) || {};
    event.structured_checklist = db.parseJSON(event.structured_checklist) || [];
    event.checklist_completed_items = db.parseJSON(event.checklist_completed_items) || [];
    event.recurrence_days = db.parseJSON(event.recurrence_days) || [];

    return event;
  }

  /**
   * Update recurring event template and optionally update all future instances
   */
  static updateRecurringEvent(parentId, updates, updateFutureInstances = false) {
    const parent = this.getEventById(parentId);
    if (!parent || !parent.is_recurring) {
      throw new Error('Parent event not found or is not recurring');
    }

    // Update parent template
    const updateFields = [];
    const values = [];
    
    const allowedFields = [
      'title', 'description', 'location', 'category', 'event_type', 
      'attendees', 'notes', 'resources', 'structured_checklist',
      'assigned_to', 'recurrence_type', 'recurrence_days', 'recurrence_end_date'
    ];

    const jsonFields = ['resources', 'structured_checklist', 'recurrence_days'];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        
        if (jsonFields.includes(key) && typeof updates[key] === 'object') {
          values.push(db.stringifyJSON(updates[key]));
        } else {
          values.push(updates[key]);
        }
      }
    });

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(parentId);
      
      const updateQuery = `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`;
      db.prepare(updateQuery).run(...values);
    }

    // If updating future instances, update all instances from today forward
    if (updateFutureInstances) {
      const today = new Date().toISOString().split('T')[0];
      
      const instanceUpdateFields = [];
      const instanceValues = [];
      
      const instanceAllowedFields = [
        'title', 'description', 'location', 'category', 'event_type',
        'attendees', 'notes', 'resources', 'structured_checklist', 'assigned_to'
      ];

      Object.keys(updates).forEach(key => {
        if (instanceAllowedFields.includes(key)) {
          instanceUpdateFields.push(`${key} = ?`);
          
          if (jsonFields.includes(key) && typeof updates[key] === 'object') {
            instanceValues.push(db.stringifyJSON(updates[key]));
          } else {
            instanceValues.push(updates[key]);
          }
        }
      });

      if (instanceUpdateFields.length > 0) {
        instanceUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        instanceValues.push(parentId, today);
        
        const instanceUpdateQuery = `
          UPDATE events 
          SET ${instanceUpdateFields.join(', ')} 
          WHERE parent_recurring_id = ? AND recurrence_instance_date >= ?
        `;
        db.prepare(instanceUpdateQuery).run(...instanceValues);
      }
    }

    return this.getEventById(parentId);
  }

  /**
   * Delete recurring event and optionally all its instances
   */
  static deleteRecurringEvent(parentId, deleteFutureInstances = true) {
    const parent = this.getEventById(parentId);
    if (!parent || !parent.is_recurring) {
      throw new Error('Parent event not found or is not recurring');
    }

    if (deleteFutureInstances) {
      // Delete all instances from today forward
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        DELETE FROM events 
        WHERE parent_recurring_id = ? AND recurrence_instance_date >= ?
      `).run(parentId, today);
    }

    // Delete the parent template
    db.prepare('DELETE FROM events WHERE id = ?').run(parentId);
    
    return { success: true };
  }

  /**
   * Get all recurring event templates
   */
  static getRecurringEvents() {
    const events = db.prepare(`
      SELECT * FROM events 
      WHERE is_recurring = TRUE 
      ORDER BY title ASC
    `).all();

    return events.map(event => {
      event.preparation_list = db.parseJSON(event.preparation_list) || [];
      event.resources = db.parseJSON(event.resources) || {};
      event.handoff_history = db.parseJSON(event.handoff_history) || [];
      event.packing_list = db.parseJSON(event.packing_list) || [];
      event.contacts = db.parseJSON(event.contacts) || [];
      event.meal_requirements = db.parseJSON(event.meal_requirements) || {};
      event.structured_checklist = db.parseJSON(event.structured_checklist) || [];
      event.checklist_completed_items = db.parseJSON(event.checklist_completed_items) || [];
      event.recurrence_days = db.parseJSON(event.recurrence_days) || [];
      return event;
    });
  }

  /**
   * Generate missing instances for all recurring events (maintenance function)
   */
  static generateMissingInstances(daysAhead = 7) {
    const recurringEvents = db.prepare('SELECT id FROM events WHERE is_recurring = TRUE').all();
    const results = [];

    for (const event of recurringEvents) {
      try {
        const instances = this.generateInstances(event.id, new Date(), daysAhead);
        results.push({
          parentId: event.id,
          instancesCreated: instances.length
        });
      } catch (error) {
        console.error(`Error generating instances for event ${event.id}:`, error);
        results.push({
          parentId: event.id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get predefined routine templates for common family activities
   */
  static getRoutineTemplates() {
    return [
      {
        name: 'Bedtime Routine',
        category: 'routine',
        event_type: 'bedtime',
        duration: 60, // minutes
        structured_checklist: [
          { id: 'brush_teeth', text: 'Brush teeth', category: 'hygiene' },
          { id: 'pajamas', text: 'Put on pajamas', category: 'preparation' },
          { id: 'story_time', text: 'Read bedtime story', category: 'activity' },
          { id: 'lights_out', text: 'Turn off lights', category: 'environment' }
        ],
        suggested_times: ['19:30', '20:00', '20:30'],
        recurrence_suggestions: ['daily', 'weekdays']
      },
      {
        name: 'Morning Routine',
        category: 'routine',
        event_type: 'morning',
        duration: 45,
        structured_checklist: [
          { id: 'wake_up', text: 'Wake up', category: 'start' },
          { id: 'brush_teeth', text: 'Brush teeth', category: 'hygiene' },
          { id: 'get_dressed', text: 'Get dressed', category: 'preparation' },
          { id: 'breakfast', text: 'Eat breakfast', category: 'meal' },
          { id: 'pack_bag', text: 'Pack school/work bag', category: 'preparation' }
        ],
        suggested_times: ['07:00', '07:30', '08:00'],
        recurrence_suggestions: ['daily', 'weekdays']
      },
      {
        name: 'Shower Night',
        category: 'routine',
        event_type: 'hygiene',
        duration: 30,
        structured_checklist: [
          { id: 'prepare_towel', text: 'Get clean towel', category: 'preparation' },
          { id: 'shower', text: 'Take shower', category: 'hygiene' },
          { id: 'dry_hair', text: 'Dry hair if needed', category: 'hygiene', conditional: true }
        ],
        suggested_times: ['18:00', '19:00', '20:00'],
        recurrence_suggestions: ['custom'],
        default_days: [1, 3, 5] // Monday, Wednesday, Friday
      }
    ];
  }
}

module.exports = RecurringEventService;