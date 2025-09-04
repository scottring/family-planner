const db = require('../config/database');
const aiService = require('./ai');

class ConflictService {
  constructor() {
    this.conflictTypes = {
      TIME_OVERLAP: 'time_overlap',
      LOCATION_TRAVEL: 'location_travel', 
      RESOURCE_CONFLICT: 'resource_conflict',
      UNASSIGNED_CRITICAL: 'unassigned_critical'
    };
    
    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * Detect all conflicts for a given date range
   */
  async detectAllConflicts(startDate, endDate) {
    try {
      // Get events in the date range
      const events = this.getEventsInRange(startDate, endDate);
      
      const conflicts = [];
      
      // Detect different types of conflicts
      conflicts.push(...this.detectTimeConflicts(events));
      conflicts.push(...this.detectLocationConflicts(events));
      conflicts.push(...this.detectResourceConflicts(events));
      conflicts.push(...this.detectUnassignedConflicts(events));
      
      // Store conflicts in database
      for (const conflict of conflicts) {
        await this.storeConflict(conflict);
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      throw error;
    }
  }

  /**
   * Detect time conflicts - overlapping events for same person
   */
  detectTimeConflicts(events) {
    const conflicts = [];
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        
        // Check if events overlap in time
        const start1 = new Date(event1.start_time);
        const end1 = new Date(event1.end_time);
        const start2 = new Date(event2.start_time);
        const end2 = new Date(event2.end_time);
        
        if (start1 < end2 && start2 < end1) {
          // Check if same person is assigned to both events
          if (event1.assigned_to && event2.assigned_to && 
              event1.assigned_to === event2.assigned_to) {
            
            conflicts.push({
              type: this.conflictTypes.TIME_OVERLAP,
              severity: this.severityLevels.HIGH,
              title: 'Double-booked Person',
              description: `${this.getUserName(event1.assigned_to)} is assigned to overlapping events: "${event1.title}" and "${event2.title}"`,
              affected_events: [event1.id, event2.id],
              affected_users: [event1.assigned_to],
              affected_resources: [],
              resolution_suggestions: [
                'Reassign one event to another person',
                'Move one event to a different time',
                'Set up backup person for one event',
                'Consider if events can be combined or one skipped'
              ],
              metadata: {
                overlap_start: Math.max(start1.getTime(), start2.getTime()),
                overlap_end: Math.min(end1.getTime(), end2.getTime()),
                overlap_duration_minutes: Math.min(end1.getTime(), end2.getTime()) - Math.max(start1.getTime(), start2.getTime()) / (1000 * 60)
              }
            });
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Detect location conflicts - impossible travel times between locations
   */
  detectLocationConflicts(events) {
    const conflicts = [];
    
    // Sort events by start time for each person
    const eventsByPerson = {};
    events.forEach(event => {
      if (event.assigned_to && event.location) {
        if (!eventsByPerson[event.assigned_to]) {
          eventsByPerson[event.assigned_to] = [];
        }
        eventsByPerson[event.assigned_to].push(event);
      }
    });
    
    // Check travel time conflicts for each person
    Object.entries(eventsByPerson).forEach(([userId, userEvents]) => {
      userEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      
      for (let i = 0; i < userEvents.length - 1; i++) {
        const currentEvent = userEvents[i];
        const nextEvent = userEvents[i + 1];
        
        const currentEnd = new Date(currentEvent.end_time);
        const nextStart = new Date(nextEvent.start_time);
        const travelTimeMinutes = (nextStart - currentEnd) / (1000 * 60);
        
        // Estimate travel time based on location similarity
        const estimatedTravelTime = this.estimateTravelTime(
          currentEvent.location, 
          nextEvent.location
        );
        
        if (travelTimeMinutes < estimatedTravelTime) {
          conflicts.push({
            type: this.conflictTypes.LOCATION_TRAVEL,
            severity: estimatedTravelTime - travelTimeMinutes > 30 ? 
              this.severityLevels.HIGH : this.severityLevels.MEDIUM,
            title: 'Insufficient Travel Time',
            description: `${this.getUserName(userId)} has only ${Math.floor(travelTimeMinutes)} minutes to travel from "${currentEvent.location}" to "${nextEvent.location}" (estimated ${estimatedTravelTime} minutes needed)`,
            affected_events: [currentEvent.id, nextEvent.id],
            affected_users: [parseInt(userId)],
            affected_resources: [],
            resolution_suggestions: [
              'Add buffer time between events',
              'Arrange carpool or faster transport',
              'Move one event to reduce travel distance',
              'Consider virtual attendance for one event',
              'Delegate one event to backup person'
            ],
            metadata: {
              available_travel_time: travelTimeMinutes,
              estimated_travel_time: estimatedTravelTime,
              travel_deficit: estimatedTravelTime - travelTimeMinutes,
              from_location: currentEvent.location,
              to_location: nextEvent.location
            }
          });
        }
      }
    });
    
    return conflicts;
  }

  /**
   * Detect resource conflicts - double-booked resources
   */
  detectResourceConflicts(events) {
    const conflicts = [];
    const resourceUsage = {};
    
    // Track resource usage by time
    events.forEach(event => {
      if (event.resources_needed) {
        const resources = this.parseJSON(event.resources_needed);
        const equipmentList = resources.equipment || [];
        
        equipmentList.forEach(equipment => {
          if (!resourceUsage[equipment]) {
            resourceUsage[equipment] = [];
          }
          resourceUsage[equipment].push({
            event: event,
            start: new Date(event.start_time),
            end: new Date(event.end_time)
          });
        });
      }
    });
    
    // Check for overlapping resource usage
    Object.entries(resourceUsage).forEach(([resource, usages]) => {
      if (usages.length > 1) {
        for (let i = 0; i < usages.length; i++) {
          for (let j = i + 1; j < usages.length; j++) {
            const usage1 = usages[i];
            const usage2 = usages[j];
            
            if (usage1.start < usage2.end && usage2.start < usage1.end) {
              conflicts.push({
                type: this.conflictTypes.RESOURCE_CONFLICT,
                severity: this.severityLevels.MEDIUM,
                title: 'Resource Double-booked',
                description: `"${resource}" is needed for both "${usage1.event.title}" and "${usage2.event.title}" at overlapping times`,
                affected_events: [usage1.event.id, usage2.event.id],
                affected_users: [usage1.event.assigned_to, usage2.event.assigned_to].filter(Boolean),
                affected_resources: [resource],
                resolution_suggestions: [
                  'Obtain duplicate resource',
                  'Reschedule one event to avoid overlap',
                  'Find alternative resource',
                  'Share resource if timing allows',
                  'Remove resource requirement from one event'
                ],
                metadata: {
                  resource: resource,
                  conflict_start: Math.max(usage1.start.getTime(), usage2.start.getTime()),
                  conflict_end: Math.min(usage1.end.getTime(), usage2.end.getTime())
                }
              });
            }
          }
        }
      }
    });
    
    return conflicts;
  }

  /**
   * Detect unassigned critical events
   */
  detectUnassignedConflicts(events) {
    const conflicts = [];
    const now = new Date();
    const urgentThreshold = 24 * 60 * 60 * 1000; // 24 hours
    const criticalThreshold = 4 * 60 * 60 * 1000; // 4 hours
    
    events.forEach(event => {
      const eventStart = new Date(event.start_time);
      const timeToEvent = eventStart - now;
      
      // Check if event is unassigned and happening soon
      if (!event.assigned_to && timeToEvent > 0) {
        let severity;
        let suggestions;
        
        if (timeToEvent < criticalThreshold) {
          severity = this.severityLevels.CRITICAL;
          suggestions = [
            'URGENT: Assign immediately',
            'Activate emergency contact',
            'Consider canceling if no one available',
            'Send immediate notifications to all family members'
          ];
        } else if (timeToEvent < urgentThreshold) {
          severity = this.severityLevels.HIGH;
          suggestions = [
            'Assign within next few hours',
            'Send reminders to family members',
            'Check if backup person available',
            'Consider rescheduling if needed'
          ];
        } else {
          // Only flag high-priority events as conflicts if they're more than 24h away
          if (event.priority === 'high' || this.isCriticalEventType(event)) {
            severity = this.severityLevels.MEDIUM;
            suggestions = [
              'Schedule assignment discussion',
              'Review event importance',
              'Check family availability',
              'Set reminder to assign closer to date'
            ];
          } else {
            return; // Skip low-priority events that aren't urgent
          }
        }
        
        conflicts.push({
          type: this.conflictTypes.UNASSIGNED_CRITICAL,
          severity: severity,
          title: 'Critical Event Unassigned',
          description: `"${event.title}" starts in ${this.formatTimeRemaining(timeToEvent)} and has no one assigned`,
          affected_events: [event.id],
          affected_users: [],
          affected_resources: [],
          resolution_suggestions: suggestions,
          metadata: {
            time_to_event_ms: timeToEvent,
            time_to_event_hours: timeToEvent / (1000 * 60 * 60),
            event_priority: event.priority,
            is_critical_type: this.isCriticalEventType(event)
          }
        });
      }
    });
    
    return conflicts;
  }

  /**
   * Get AI suggestions for resolving conflicts
   */
  async suggestResolutions(conflict) {
    try {
      const prompt = this.buildConflictResolutionPrompt(conflict);
      
      if (aiService.useMockData) {
        return this.getMockResolutionSuggestions(conflict);
      }

      // Use AI service to get intelligent suggestions
      const suggestions = await aiService.generateConflictResolutions(prompt);
      return suggestions;
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return this.getMockResolutionSuggestions(conflict);
    }
  }

  /**
   * Store conflict in database
   */
  async storeConflict(conflict) {
    try {
      // Check if similar conflict already exists
      const existingConflict = this.findSimilarConflict(conflict);
      if (existingConflict && existingConflict.status === 'active') {
        return existingConflict.id;
      }

      const stmt = db.prepare(`
        INSERT INTO conflicts (
          type, severity, title, description, affected_events, 
          affected_users, affected_resources, resolution_suggestions,
          metadata, auto_generated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        conflict.type,
        conflict.severity,
        conflict.title,
        conflict.description,
        JSON.stringify(conflict.affected_events),
        JSON.stringify(conflict.affected_users),
        JSON.stringify(conflict.affected_resources),
        JSON.stringify(conflict.resolution_suggestions),
        JSON.stringify(conflict.metadata || {}),
        true
      );

      return result.lastInsertRowid;
    } catch (error) {
      console.error('Error storing conflict:', error);
      throw error;
    }
  }

  /**
   * Get active conflicts
   */
  getActiveConflicts(limit = null) {
    try {
      let query = `
        SELECT * FROM conflicts 
        WHERE status = 'active' 
        ORDER BY 
          CASE severity 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          detected_at DESC
      `;
      
      if (limit) {
        query += ` LIMIT ${limit}`;
      }
      
      const conflicts = db.prepare(query).all();
      
      return conflicts.map(conflict => ({
        ...conflict,
        affected_events: this.parseJSON(conflict.affected_events),
        affected_users: this.parseJSON(conflict.affected_users),
        affected_resources: this.parseJSON(conflict.affected_resources),
        resolution_suggestions: this.parseJSON(conflict.resolution_suggestions),
        resolution_actions: this.parseJSON(conflict.resolution_actions),
        resolution_data: this.parseJSON(conflict.resolution_data),
        metadata: this.parseJSON(conflict.metadata)
      }));
    } catch (error) {
      console.error('Error getting active conflicts:', error);
      return [];
    }
  }

  /**
   * Get upcoming conflicts (within next 48 hours)
   */
  getUpcomingConflicts() {
    const now = new Date();
    const upcoming = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    return this.detectAllConflicts(now.toISOString(), upcoming.toISOString());
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(conflictId, resolution, userId) {
    try {
      const stmt = db.prepare(`
        UPDATE conflicts 
        SET status = 'resolved',
            resolved_at = CURRENT_TIMESTAMP,
            resolved_by = ?,
            resolution_actions = ?,
            resolution_data = ?
        WHERE id = ?
      `);

      stmt.run(
        userId,
        JSON.stringify(resolution.actions || []),
        JSON.stringify(resolution.data || {}),
        conflictId
      );

      // Apply the resolution actions
      if (resolution.actions) {
        await this.applyResolutionActions(resolution.actions, conflictId);
      }

      return true;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  // Helper methods
  getEventsInRange(startDate, endDate) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM events 
        WHERE start_time >= ? AND end_time <= ?
        ORDER BY start_time ASC
      `);
      
      return stmt.all(startDate, endDate);
    } catch (error) {
      console.error('Error getting events in range:', error);
      return [];
    }
  }

  getUserName(userId) {
    try {
      const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
      return user ? user.full_name : `User ${userId}`;
    } catch (error) {
      return `User ${userId}`;
    }
  }

  estimateTravelTime(location1, location2) {
    // Simple heuristic for travel time estimation
    if (!location1 || !location2) return 15;
    if (location1.toLowerCase() === location2.toLowerCase()) return 0;
    
    // Check if locations contain keywords suggesting distance
    const location1Lower = location1.toLowerCase();
    const location2Lower = location2.toLowerCase();
    
    // Same general area (same street, same building, etc.)
    if (location1Lower.includes(location2Lower) || location2Lower.includes(location1Lower)) {
      return 5;
    }
    
    // Different areas in same city
    const cityKeywords = ['downtown', 'mall', 'school', 'park', 'center', 'library'];
    const location1HasCity = cityKeywords.some(keyword => location1Lower.includes(keyword));
    const location2HasCity = cityKeywords.some(keyword => location2Lower.includes(keyword));
    
    if (location1HasCity && location2HasCity) {
      return 20;
    }
    
    // Default travel time
    return 15;
  }

  isCriticalEventType(event) {
    const criticalKeywords = [
      'doctor', 'appointment', 'medical', 'dentist', 'hospital',
      'school', 'meeting', 'interview', 'presentation',
      'pickup', 'drop-off', 'daycare', 'babysitter'
    ];
    
    const eventText = (event.title + ' ' + (event.description || '')).toLowerCase();
    return criticalKeywords.some(keyword => eventText.includes(keyword));
  }

  formatTimeRemaining(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  parseJSON(field) {
    try {
      return field ? JSON.parse(field) : null;
    } catch (e) {
      return null;
    }
  }

  findSimilarConflict(conflict) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM conflicts 
        WHERE type = ? AND affected_events = ? AND status = 'active'
        ORDER BY detected_at DESC 
        LIMIT 1
      `);
      
      return stmt.get(conflict.type, JSON.stringify(conflict.affected_events));
    } catch (error) {
      return null;
    }
  }

  buildConflictResolutionPrompt(conflict) {
    return `
      Conflict Type: ${conflict.type}
      Severity: ${conflict.severity}
      Description: ${conflict.description}
      Affected Events: ${conflict.affected_events.length}
      
      Please suggest specific, actionable resolutions for this scheduling conflict.
      Focus on practical solutions that minimize disruption to the family schedule.
    `;
  }

  getMockResolutionSuggestions(conflict) {
    // Return the resolution suggestions already in the conflict
    return {
      primary_suggestions: conflict.resolution_suggestions.slice(0, 2),
      alternative_suggestions: conflict.resolution_suggestions.slice(2),
      estimated_effort: conflict.severity === 'critical' ? 'high' : 'medium',
      recommended_action: conflict.resolution_suggestions[0]
    };
  }

  async applyResolutionActions(actions, conflictId) {
    // Placeholder for applying resolution actions
    // This could involve updating event assignments, sending notifications, etc.
    console.log(`Applying resolution actions for conflict ${conflictId}:`, actions);
  }

  /**
   * Get conflict by ID
   */
  getConflictById(conflictId) {
    try {
      const conflict = db.prepare('SELECT * FROM conflicts WHERE id = ?').get(conflictId);
      
      if (conflict) {
        return {
          ...conflict,
          affected_events: this.parseJSON(conflict.affected_events),
          affected_users: this.parseJSON(conflict.affected_users),
          affected_resources: this.parseJSON(conflict.affected_resources),
          resolution_suggestions: this.parseJSON(conflict.resolution_suggestions),
          resolution_actions: this.parseJSON(conflict.resolution_actions),
          resolution_data: this.parseJSON(conflict.resolution_data),
          metadata: this.parseJSON(conflict.metadata)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting conflict by ID:', error);
      return null;
    }
  }

  /**
   * Acknowledge a conflict
   */
  async acknowledgeConflict(conflictId, userId) {
    try {
      const stmt = db.prepare(`
        UPDATE conflicts 
        SET status = 'acknowledged',
            resolved_by = ?,
            resolved_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'active'
      `);

      const result = stmt.run(userId, conflictId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error acknowledging conflict:', error);
      return false;
    }
  }

  /**
   * Ignore a conflict
   */
  async ignoreConflict(conflictId, userId) {
    try {
      const stmt = db.prepare(`
        UPDATE conflicts 
        SET status = 'ignored',
            resolved_by = ?,
            resolved_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'active'
      `);

      const result = stmt.run(userId, conflictId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error ignoring conflict:', error);
      return false;
    }
  }

  /**
   * Get conflict statistics
   */
  async getConflictStatistics(timeframe = 'week') {
    try {
      let dateFilter = '';
      const now = new Date();
      
      switch (timeframe) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = `WHERE detected_at >= '${weekAgo.toISOString()}'`;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = `WHERE detected_at >= '${monthAgo.toISOString()}'`;
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateFilter = `WHERE detected_at >= '${yearAgo.toISOString()}'`;
          break;
      }

      const totalConflicts = db.prepare(`SELECT COUNT(*) as count FROM conflicts ${dateFilter}`).get();
      
      const byType = db.prepare(`
        SELECT type, COUNT(*) as count 
        FROM conflicts ${dateFilter}
        GROUP BY type
      `).all();
      
      const bySeverity = db.prepare(`
        SELECT severity, COUNT(*) as count 
        FROM conflicts ${dateFilter}
        GROUP BY severity
      `).all();
      
      const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM conflicts ${dateFilter}
        GROUP BY status
      `).all();

      const resolutionRate = db.prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          COUNT(*) as total
        FROM conflicts ${dateFilter}
      `).get();

      return {
        total_conflicts: totalConflicts.count,
        by_type: byType.reduce((acc, item) => ({ ...acc, [item.type]: item.count }), {}),
        by_severity: bySeverity.reduce((acc, item) => ({ ...acc, [item.severity]: item.count }), {}),
        by_status: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {}),
        resolution_rate: resolutionRate.total > 0 ? (resolutionRate.resolved / resolutionRate.total * 100).toFixed(1) : 0,
        timeframe
      };
    } catch (error) {
      console.error('Error getting conflict statistics:', error);
      return {
        total_conflicts: 0,
        by_type: {},
        by_severity: {},
        by_status: {},
        resolution_rate: 0,
        timeframe
      };
    }
  }
}

module.exports = new ConflictService();