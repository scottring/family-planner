const natural = require('natural');
const db = require('../config/database');

class AdvancedNLPParser {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.analyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    
    // Initialize patterns for complex parsing
    this.initializePatterns();
    
    // Family member names cache
    this.familyMembers = null;
    this.lastFamilyMembersUpdate = null;
  }

  /**
   * Initialize regex patterns and NLP models
   */
  initializePatterns() {
    // Recurring pattern matchers
    this.recurringPatterns = {
      daily: /(?:every day|daily|each day)/gi,
      weekly: /(?:every (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|weekly|each (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi,
      biweekly: /(?:every other (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|biweekly|every two weeks)/gi,
      monthly: /(?:every month|monthly|each month)/gi,
      specific_days: /(?:every (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday) and (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi,
      multiple_days: /(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:,? and |, )(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi
    };

    // Time extraction patterns
    this.timePatterns = {
      specific_time: /(?:at )?(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/g,
      time_range: /(?:from )?(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?\s*(?:to|until|-)?\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/g,
      relative_time: /(?:in )?(\d+)\s*(minute|hour|day|week|month)s?\s*(?:from now)?/gi,
      casual_time: /(?:morning|afternoon|evening|tonight|today|tomorrow|next week|next month)/gi
    };

    // Date extraction patterns
    this.datePatterns = {
      specific_date: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
      written_date: /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/gi,
      relative_date: /(?:today|tomorrow|yesterday|next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in (\d+) (?:day|week|month)s?)/gi,
      casual_date: /(?:next week|this week|next month|this month)/gi
    };

    // Location patterns
    this.locationPatterns = {
      at_location: /(?:at (?:the )?)(.*?)(?:\s+(?:at|on|in)\s|\s*$)/gi,
      specific_venue: /(?:field|park|school|gym|center|court|pool|rink|studio|office|hospital|clinic)/gi,
      address: /\d+\s+[a-zA-Z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard)/gi
    };

    // Activity/task type patterns
    this.activityPatterns = {
      sports: /(?:soccer|football|basketball|tennis|swimming|hockey|baseball|volleyball|track|cross country|gymnastics|wrestling|golf)/gi,
      medical: /(?:doctor|dentist|appointment|checkup|physical|vaccine|medication|prescription)/gi,
      school: /(?:school|class|homework|assignment|project|test|exam|meeting|conference|pickup|dropoff)/gi,
      activities: /(?:lesson|practice|rehearsal|recital|performance|club|activity|camp)/gi,
      household: /(?:groceries|shopping|cleaning|laundry|cooking|maintenance|repair)/gi,
      social: /(?:party|playdate|birthday|celebration|visit|dinner|lunch)/gi
    };

    // Family member role patterns
    this.rolePatterns = {
      child_indicators: /(?:kid|child|son|daughter|boy|girl)/gi,
      parent_indicators: /(?:mom|dad|parent|mother|father)/gi,
      specific_names: /(?:[A-Z][a-z]+)/g // Will be enhanced with actual family names
    };
  }

  /**
   * Get family members from database
   */
  async getFamilyMembers(userId = null) {
    try {
      // Cache family members for 5 minutes
      if (this.familyMembers && this.lastFamilyMembersUpdate && 
          Date.now() - this.lastFamilyMembersUpdate < 300000) {
        return this.familyMembers;
      }

      const members = db.prepare(`
        SELECT name, type FROM family_members ORDER BY name
      `).all();

      this.familyMembers = members;
      this.lastFamilyMembersUpdate = Date.now();
      
      return members;
    } catch (error) {
      console.error('Error getting family members:', error);
      return [];
    }
  }

  /**
   * Parse complex voice command or text input
   */
  async parseAdvancedInput(text, userId = null) {
    try {
      const result = {
        originalText: text,
        parsedEntities: {},
        suggestions: [],
        confidence: 0,
        type: 'unknown',
        items: []
      };

      // Clean and normalize the text
      const cleanText = this.cleanText(text);
      
      // Get family members for context
      const familyMembers = await this.getFamilyMembers(userId);
      
      // Extract all entities
      result.parsedEntities = {
        times: this.extractTimes(cleanText),
        dates: this.extractDates(cleanText),
        locations: this.extractLocations(cleanText),
        people: this.extractPeople(cleanText, familyMembers),
        activities: this.extractActivities(cleanText),
        recurring: this.extractRecurringPatterns(cleanText),
        urgency: this.extractUrgencyLevel(cleanText)
      };

      // Determine the type of input (event, task, recurring event, etc.)
      result.type = this.determineInputType(cleanText, result.parsedEntities);

      // Parse into individual items (handle multiple items in one input)
      result.items = await this.parseIntoItems(cleanText, result.parsedEntities, result.type);

      // Calculate confidence
      result.confidence = this.calculateParsingConfidence(result);

      // Generate suggestions for missing information
      result.suggestions = this.generateSuggestions(result);

      return result;
    } catch (error) {
      console.error('Error parsing advanced input:', error);
      return {
        originalText: text,
        error: error.message,
        confidence: 0,
        type: 'error',
        items: []
      };
    }
  }

  /**
   * Clean and normalize text input
   */
  cleanText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s:\/\-.,]/g, ' ') // Keep basic punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract time information from text
   */
  extractTimes(text) {
    const times = [];
    
    // Specific times
    let match;
    while ((match = this.timePatterns.specific_time.exec(text)) !== null) {
      const hour = parseInt(match[1]);
      const minute = match[2] ? parseInt(match[2]) : 0;
      const period = match[3] || '';
      
      times.push({
        type: 'specific',
        raw: match[0],
        hour,
        minute,
        period: period.toLowerCase(),
        formatted: this.formatTime(hour, minute, period)
      });
    }

    // Time ranges
    this.timePatterns.time_range.lastIndex = 0;
    while ((match = this.timePatterns.time_range.exec(text)) !== null) {
      times.push({
        type: 'range',
        raw: match[0],
        startTime: this.formatTime(parseInt(match[1]), match[2] ? parseInt(match[2]) : 0, match[3] || ''),
        endTime: this.formatTime(parseInt(match[4]), match[5] ? parseInt(match[5]) : 0, match[6] || '')
      });
    }

    // Relative times
    this.timePatterns.relative_time.lastIndex = 0;
    while ((match = this.timePatterns.relative_time.exec(text)) !== null) {
      times.push({
        type: 'relative',
        raw: match[0],
        amount: parseInt(match[1]),
        unit: match[2],
        futureTime: this.calculateFutureTime(parseInt(match[1]), match[2])
      });
    }

    // Casual times
    const casualMatches = text.match(this.timePatterns.casual_time);
    if (casualMatches) {
      casualMatches.forEach(match => {
        times.push({
          type: 'casual',
          raw: match,
          interpreted: this.interpretCasualTime(match)
        });
      });
    }

    return times;
  }

  /**
   * Extract date information from text
   */
  extractDates(text) {
    const dates = [];

    // Specific dates
    let match;
    while ((match = this.datePatterns.specific_date.exec(text)) !== null) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      const year = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
      
      dates.push({
        type: 'specific',
        raw: match[0],
        date: new Date(year, month - 1, day),
        formatted: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      });
    }

    // Written dates
    const writtenMatches = text.match(this.datePatterns.written_date);
    if (writtenMatches) {
      writtenMatches.forEach(match => {
        const date = new Date(match);
        if (!isNaN(date.getTime())) {
          dates.push({
            type: 'written',
            raw: match,
            date,
            formatted: date.toISOString().split('T')[0]
          });
        }
      });
    }

    // Relative dates
    const relativeMatches = text.match(this.datePatterns.relative_date);
    if (relativeMatches) {
      relativeMatches.forEach(match => {
        dates.push({
          type: 'relative',
          raw: match,
          date: this.interpretRelativeDate(match),
          formatted: this.interpretRelativeDate(match)?.toISOString().split('T')[0]
        });
      });
    }

    return dates;
  }

  /**
   * Extract location information from text
   */
  extractLocations(text) {
    const locations = [];

    // At location pattern
    let match;
    while ((match = this.locationPatterns.at_location.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        locations.push({
          type: 'general',
          raw: match[0],
          location: match[1].trim(),
          confidence: 0.8
        });
      }
    }

    // Specific venues
    const venueMatches = text.match(this.locationPatterns.specific_venue);
    if (venueMatches) {
      venueMatches.forEach(match => {
        locations.push({
          type: 'venue',
          raw: match,
          location: match,
          confidence: 0.9
        });
      });
    }

    // Addresses
    const addressMatches = text.match(this.locationPatterns.address);
    if (addressMatches) {
      addressMatches.forEach(match => {
        locations.push({
          type: 'address',
          raw: match,
          location: match,
          confidence: 0.95
        });
      });
    }

    return locations;
  }

  /**
   * Extract people/family members from text
   */
  extractPeople(text, familyMembers) {
    const people = [];
    const words = this.tokenizer.tokenize(text);

    // Check for family member names
    familyMembers.forEach(member => {
      const nameRegex = new RegExp(`\\b${member.name}\\b`, 'gi');
      if (nameRegex.test(text)) {
        people.push({
          name: member.name,
          type: member.type,
          confidence: 0.95,
          source: 'family_database'
        });
      }
    });

    // Extract potential names (capitalized words)
    const nameMatches = text.match(/\b[A-Z][a-z]+\b/g);
    if (nameMatches) {
      nameMatches.forEach(match => {
        if (!people.find(p => p.name.toLowerCase() === match.toLowerCase())) {
          people.push({
            name: match,
            type: 'unknown',
            confidence: 0.6,
            source: 'extraction'
          });
        }
      });
    }

    return people;
  }

  /**
   * Extract activity types from text
   */
  extractActivities(text) {
    const activities = [];

    Object.entries(this.activityPatterns).forEach(([category, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          activities.push({
            activity: match,
            category,
            confidence: 0.85
          });
        });
      }
    });

    return activities;
  }

  /**
   * Extract recurring patterns from text
   */
  extractRecurringPatterns(text) {
    const patterns = [];

    Object.entries(this.recurringPatterns).forEach(([type, regex]) => {
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(match => {
          patterns.push({
            type,
            raw: match,
            pattern: this.parseRecurringPattern(type, match),
            confidence: 0.9
          });
        });
      }
    });

    return patterns;
  }

  /**
   * Extract urgency level from text
   */
  extractUrgencyLevel(text) {
    const urgentWords = ['urgent', 'asap', 'emergency', 'immediately', 'now', 'today'];
    const importantWords = ['important', 'priority', 'critical', 'must', 'need to', 'deadline'];
    const casualWords = ['whenever', 'sometime', 'eventually', 'maybe'];

    let urgencyScore = 3; // Default medium

    urgentWords.forEach(word => {
      if (text.includes(word)) urgencyScore += 2;
    });

    importantWords.forEach(word => {
      if (text.includes(word)) urgencyScore += 1;
    });

    casualWords.forEach(word => {
      if (text.includes(word)) urgencyScore -= 1;
    });

    return Math.max(1, Math.min(5, urgencyScore));
  }

  /**
   * Determine the type of input (event, task, recurring, etc.)
   */
  determineInputType(text, entities) {
    // Check for recurring indicators
    if (entities.recurring && entities.recurring.length > 0) {
      return entities.times.length > 0 || entities.dates.length > 0 ? 'recurring_event' : 'recurring_task';
    }

    // Check for time/date indicators (suggests event)
    if (entities.times.length > 0 || entities.dates.length > 0) {
      return 'event';
    }

    // Check for task indicators
    const taskWords = ['need to', 'have to', 'must', 'should', 'remember to', 'don\'t forget'];
    if (taskWords.some(word => text.includes(word))) {
      return 'task';
    }

    // Check for appointment/meeting indicators
    const appointmentWords = ['appointment', 'meeting', 'call', 'visit'];
    if (appointmentWords.some(word => text.includes(word))) {
      return 'event';
    }

    return 'task'; // Default to task
  }

  /**
   * Parse input into individual items
   */
  async parseIntoItems(text, entities, type) {
    const items = [];

    try {
      // Handle complex multi-item inputs
      const sentences = text.split(/[.!?]|,\s*and\s+|\s+and\s+/).filter(s => s.trim().length > 0);

      for (const sentence of sentences) {
        const item = await this.parseSingleItem(sentence.trim(), entities, type);
        if (item) {
          items.push(item);
        }
      }

      // If no items found, create one from the full text
      if (items.length === 0) {
        const item = await this.parseSingleItem(text, entities, type);
        if (item) {
          items.push(item);
        }
      }

      return items;
    } catch (error) {
      console.error('Error parsing into items:', error);
      return [];
    }
  }

  /**
   * Parse a single item from text
   */
  async parseSingleItem(text, entities, type) {
    const item = {
      type,
      title: this.extractTitle(text),
      description: text,
      entities: this.filterEntitiesForText(text, entities),
      confidence: 0.7
    };

    // Set specific fields based on type
    switch (type) {
      case 'event':
      case 'recurring_event':
        item.startTime = this.determineStartTime(item.entities);
        item.endTime = this.determineEndTime(item.entities);
        item.location = this.determineLocation(item.entities);
        item.assignedTo = this.determineAssignee(item.entities);
        if (type === 'recurring_event') {
          item.recurrence = this.determineRecurrence(item.entities);
        }
        break;
        
      case 'task':
      case 'recurring_task':
        item.dueDate = this.determineDueDate(item.entities);
        item.assignedTo = this.determineAssignee(item.entities);
        item.priority = entities.urgency;
        if (type === 'recurring_task') {
          item.recurrence = this.determineRecurrence(item.entities);
        }
        break;
    }

    return item;
  }

  /**
   * Helper methods for parsing specific aspects
   */
  extractTitle(text) {
    // Remove common prefixes and clean up
    return text
      .replace(/^(?:remember to|need to|have to|should|must)\s+/gi, '')
      .replace(/^(?:every|each)\s+\w+\s+/gi, '')
      .replace(/\s+(?:at|on|in)\s+.*$/gi, '')
      .trim()
      .substring(0, 100); // Limit length
  }

  filterEntitiesForText(text, allEntities) {
    // Filter entities that appear in this specific text
    const filtered = {};
    Object.keys(allEntities).forEach(key => {
      filtered[key] = allEntities[key].filter(entity => 
        text.toLowerCase().includes(entity.raw?.toLowerCase() || entity.name?.toLowerCase() || '')
      );
    });
    return filtered;
  }

  determineStartTime(entities) {
    if (entities.times && entities.times.length > 0) {
      const timeEntity = entities.times[0];
      if (timeEntity.formatted) {
        return timeEntity.formatted;
      }
    }
    return null;
  }

  determineEndTime(entities) {
    if (entities.times && entities.times.length > 0) {
      const timeEntity = entities.times.find(t => t.type === 'range');
      if (timeEntity && timeEntity.endTime) {
        return timeEntity.endTime;
      }
    }
    return null;
  }

  determineLocation(entities) {
    if (entities.locations && entities.locations.length > 0) {
      return entities.locations[0].location;
    }
    return null;
  }

  determineAssignee(entities) {
    if (entities.people && entities.people.length > 0) {
      // Find family member with highest confidence
      const familyMember = entities.people.find(p => p.source === 'family_database');
      return familyMember ? familyMember.name : entities.people[0].name;
    }
    return null;
  }

  determineDueDate(entities) {
    if (entities.dates && entities.dates.length > 0) {
      return entities.dates[0].formatted;
    }
    return null;
  }

  determineRecurrence(entities) {
    if (entities.recurring && entities.recurring.length > 0) {
      return entities.recurring[0].pattern;
    }
    return null;
  }

  /**
   * Calculate parsing confidence
   */
  calculateParsingConfidence(result) {
    let confidence = 0.5;

    // Boost confidence based on extracted entities
    if (result.parsedEntities.times.length > 0) confidence += 0.2;
    if (result.parsedEntities.dates.length > 0) confidence += 0.2;
    if (result.parsedEntities.people.length > 0) confidence += 0.1;
    if (result.parsedEntities.locations.length > 0) confidence += 0.1;

    // Boost for clear type determination
    if (result.type !== 'unknown') confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate suggestions for missing information
   */
  generateSuggestions(result) {
    const suggestions = [];

    result.items.forEach((item, index) => {
      if (item.type === 'event' && !item.startTime) {
        suggestions.push({
          type: 'missing_time',
          message: `What time is the ${item.title}?`,
          itemIndex: index
        });
      }

      if ((item.type === 'event' || item.type === 'task') && !item.assignedTo) {
        suggestions.push({
          type: 'missing_assignee',
          message: `Who is responsible for ${item.title}?`,
          itemIndex: index
        });
      }

      if (item.type === 'event' && !item.location) {
        suggestions.push({
          type: 'missing_location',
          message: `Where is ${item.title} taking place?`,
          itemIndex: index
        });
      }
    });

    return suggestions;
  }

  /**
   * Utility methods
   */
  formatTime(hour, minute, period) {
    // Convert to 24-hour format
    let adjustedHour = hour;
    if (period) {
      if (period.toLowerCase() === 'pm' && hour !== 12) {
        adjustedHour += 12;
      } else if (period.toLowerCase() === 'am' && hour === 12) {
        adjustedHour = 0;
      }
    }
    
    return `${adjustedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  calculateFutureTime(amount, unit) {
    const now = new Date();
    switch (unit.toLowerCase()) {
      case 'minute': return new Date(now.getTime() + amount * 60000);
      case 'hour': return new Date(now.getTime() + amount * 3600000);
      case 'day': return new Date(now.getTime() + amount * 86400000);
      case 'week': return new Date(now.getTime() + amount * 604800000);
      case 'month': return new Date(now.getFullYear(), now.getMonth() + amount, now.getDate());
      default: return now;
    }
  }

  interpretCasualTime(timeText) {
    const now = new Date();
    switch (timeText.toLowerCase()) {
      case 'morning': return '09:00';
      case 'afternoon': return '14:00';
      case 'evening': return '18:00';
      case 'tonight': return '20:00';
      default: return null;
    }
  }

  interpretRelativeDate(dateText) {
    const now = new Date();
    const text = dateText.toLowerCase();
    
    if (text === 'today') return now;
    if (text === 'tomorrow') return new Date(now.getTime() + 86400000);
    if (text === 'yesterday') return new Date(now.getTime() - 86400000);
    
    // Handle "next [day]" and "this [day]"
    const dayMatch = text.match(/(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (dayMatch) {
      return this.getNextWeekday(dayMatch[1], text.includes('next'));
    }
    
    return null;
  }

  getNextWeekday(dayName, isNext = false) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    const today = new Date();
    const currentDay = today.getDay();
    
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0 || isNext) {
      daysUntil += 7;
    }
    
    return new Date(today.getTime() + daysUntil * 86400000);
  }

  parseRecurringPattern(type, text) {
    switch (type) {
      case 'daily':
        return { frequency: 'daily', interval: 1 };
      case 'weekly':
        const day = this.extractDayFromText(text);
        return { frequency: 'weekly', interval: 1, dayOfWeek: day };
      case 'biweekly':
        return { frequency: 'weekly', interval: 2 };
      case 'monthly':
        return { frequency: 'monthly', interval: 1 };
      default:
        return { frequency: 'weekly', interval: 1 };
    }
  }

  extractDayFromText(text) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (let i = 0; i < days.length; i++) {
      if (text.toLowerCase().includes(days[i])) {
        return i + 1; // 1-7 for Monday-Sunday
      }
    }
    return 1; // Default to Monday
  }
}

// Create singleton instance
const nlpParser = new AdvancedNLPParser();

module.exports = nlpParser;