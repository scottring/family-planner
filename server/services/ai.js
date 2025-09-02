const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = null;
    this.useMockData = !process.env.OPENAI_API_KEY;
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    console.log(`AI Service initialized with ${this.useMockData ? 'mock' : 'OpenAI'} data`);
  }

  async enrichEvent({ title, description = '', location = '', eventType = '', startTime, endTime }) {
    if (this.useMockData) {
      return this.getMockEventEnrichment({ title, description, location, eventType, startTime, endTime });
    }

    try {
      const prompt = this.buildEventEnrichmentPrompt({ title, description, location, eventType, startTime, endTime });
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful family planning assistant. Analyze events and provide practical preparation suggestions, timing recommendations, and resource requirements. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0].message.content);
      return this.formatEnrichmentResult(result);
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fallback to mock data if API fails
      return this.getMockEventEnrichment({ title, description, location, eventType, startTime, endTime });
    }
  }

  buildEventEnrichmentPrompt({ title, description, location, eventType, startTime, endTime }) {
    const eventDate = new Date(startTime);
    const duration = (new Date(endTime) - new Date(startTime)) / (1000 * 60); // minutes
    
    return `
Analyze this family event and provide enrichment suggestions:

Event: ${title}
Description: ${description}
Location: ${location}
Type: ${eventType}
Start: ${eventDate.toLocaleString()}
Duration: ${duration} minutes

Please provide a JSON response with the following structure:
{
  "preparation_time": <minutes needed to prepare>,
  "departure_time": "<suggested departure time>",
  "preparation_list": ["item1", "item2", "item3"],
  "resources_needed": {
    "documents": ["list of documents"],
    "equipment": ["list of equipment"],
    "money": {
      "estimated_cost": <number>,
      "description": "what the cost covers"
    }
  },
  "weather_considerations": {
    "check_weather": <boolean>,
    "suggested_items": ["weather-appropriate items"],
    "indoor_backup": <boolean>
  },
  "suggestions": {
    "optimization": ["tips for better planning"],
    "alternatives": ["alternative suggestions"],
    "reminders": ["important reminders"]
  }
}

Focus on practical, family-oriented suggestions that reduce mental load for busy parents.
    `;
  }

  formatEnrichmentResult(result) {
    return {
      preparation_time: result.preparation_time || 15,
      departure_time: result.departure_time || null,
      resources_needed: JSON.stringify(result.resources_needed || {}),
      weather_considerations: JSON.stringify(result.weather_considerations || {}),
      ai_suggestions: JSON.stringify({
        preparation_list: result.preparation_list || [],
        suggestions: result.suggestions || {}
      }),
      ai_enriched: true
    };
  }

  getMockEventEnrichment({ title, description, location, eventType, startTime, endTime }) {
    const eventLower = title.toLowerCase();
    const hasLocation = location && location.trim().length > 0;
    
    let preparationTime = 15;
    let preparationList = ['Check calendar for conflicts', 'Set reminder 15 minutes before'];
    let resourcesNeeded = {};
    let weatherConsiderations = { check_weather: false, suggested_items: [], indoor_backup: false };
    let suggestions = { optimization: [], alternatives: [], reminders: [] };

    // Event type specific enrichments
    if (eventLower.includes('doctor') || eventLower.includes('appointment') || eventLower.includes('dentist')) {
      preparationTime = 20;
      preparationList = [
        'Gather insurance cards and ID',
        'Prepare list of current medications',
        'Arrive 15 minutes early for paperwork',
        'Charge phone for forms or entertainment'
      ];
      resourcesNeeded = {
        documents: ['Insurance card', 'Photo ID', 'Referral (if needed)'],
        equipment: ['Phone charger', 'Book or tablet'],
        money: { estimated_cost: 25, description: 'Copay and parking' }
      };
      suggestions.reminders = ['Confirm appointment 24 hours before', 'Fast if blood work required'];
    } else if (eventLower.includes('school') || eventLower.includes('meeting') || eventLower.includes('conference')) {
      preparationTime = 25;
      preparationList = [
        'Review agenda or materials',
        'Prepare questions or talking points',
        'Check if virtual or in-person',
        'Set up babysitter if needed'
      ];
      resourcesNeeded = {
        documents: ['ID', 'Meeting materials'],
        equipment: ['Notebook', 'Pen', 'Phone charger'],
        money: { estimated_cost: 5, description: 'Parking' }
      };
    } else if (eventLower.includes('birthday') || eventLower.includes('party')) {
      preparationTime = 30;
      preparationList = [
        'Wrap gift and include card',
        'Check RSVP and dietary restrictions',
        'Plan outfit (theme appropriate)',
        'Charge camera for photos'
      ];
      resourcesNeeded = {
        documents: ['Gift receipt'],
        equipment: ['Camera', 'Phone charger', 'Gift'],
        money: { estimated_cost: 20, description: 'Gift and contribution to group gift' }
      };
      suggestions.reminders = ['Ask about food allergies', 'Bring camera for memories'];
    } else if (eventLower.includes('sports') || eventLower.includes('game') || eventLower.includes('practice')) {
      preparationTime = 20;
      preparationList = [
        'Pack sports equipment and water',
        'Check weather and dress appropriately',
        'Prepare snacks for energy',
        'Pack first aid basics'
      ];
      resourcesNeeded = {
        equipment: ['Sports gear', 'Water bottle', 'Towel', 'Snacks'],
        money: { estimated_cost: 10, description: 'Snacks and drinks' }
      };
      weatherConsiderations = {
        check_weather: true,
        suggested_items: ['Sunscreen', 'Hat', 'Rain jacket', 'Warm layers'],
        indoor_backup: false
      };
    } else if (eventLower.includes('grocery') || eventLower.includes('shopping')) {
      preparationTime = 10;
      preparationList = [
        'Make shopping list',
        'Check current inventory',
        'Bring reusable bags',
        'Check store hours and deals'
      ];
      resourcesNeeded = {
        equipment: ['Reusable bags', 'Shopping list', 'Phone for coupons'],
        money: { estimated_cost: 100, description: 'Estimated grocery cost' }
      };
    } else if (eventLower.includes('travel') || eventLower.includes('vacation') || eventLower.includes('trip')) {
      preparationTime = 60;
      preparationList = [
        'Check passport/ID expiration',
        'Pack according to weather forecast',
        'Arrange pet/house care',
        'Set mail hold and security'
      ];
      resourcesNeeded = {
        documents: ['Passport/ID', 'Tickets', 'Insurance info'],
        equipment: ['Luggage', 'Chargers', 'Medications'],
        money: { estimated_cost: 200, description: 'Travel expenses and emergencies' }
      };
    }

    // Location-based adjustments
    if (hasLocation) {
      preparationTime += 10;
      preparationList.unshift('Check traffic and parking options');
      suggestions.optimization.push('Use GPS to avoid traffic delays');
      
      // Calculate suggested departure time (mock calculation)
      const eventTime = new Date(startTime);
      const departureTime = new Date(eventTime.getTime() - (preparationTime + 15) * 60000);
      
      return {
        preparation_time: preparationTime,
        departure_time: departureTime.toISOString(),
        resources_needed: JSON.stringify(resourcesNeeded),
        weather_considerations: JSON.stringify(weatherConsiderations),
        ai_suggestions: JSON.stringify({
          preparation_list: preparationList,
          suggestions: {
            ...suggestions,
            optimization: [
              ...suggestions.optimization,
              'Allow extra time for parking',
              'Check location accessibility'
            ]
          }
        }),
        ai_enriched: true
      };
    }

    return {
      preparation_time: preparationTime,
      departure_time: null,
      resources_needed: JSON.stringify(resourcesNeeded),
      weather_considerations: JSON.stringify(weatherConsiderations),
      ai_suggestions: JSON.stringify({
        preparation_list: preparationList,
        suggestions: suggestions
      }),
      ai_enriched: true
    };
  }

  async generateChecklist({ eventTitle, eventType, duration, participants = [] }) {
    if (this.useMockData) {
      return this.getMockChecklist({ eventTitle, eventType, duration, participants });
    }

    try {
      const prompt = `
Create a detailed checklist for this event:
Event: ${eventTitle}
Type: ${eventType}
Duration: ${duration} minutes
Participants: ${participants.join(', ')}

Provide a JSON response with:
{
  "title": "Checklist name",
  "category": "event category",
  "items": [
    {
      "text": "task description",
      "category": "preparation|during|after",
      "priority": "high|medium|low",
      "estimated_time": <minutes>
    }
  ]
}
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a family planning assistant. Create practical, actionable checklists.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI checklist error:', error);
      return this.getMockChecklist({ eventTitle, eventType, duration, participants });
    }
  }

  getMockChecklist({ eventTitle, eventType, duration, participants }) {
    const baseItems = [
      { text: 'Confirm event details', category: 'preparation', priority: 'high', estimated_time: 5 },
      { text: 'Check weather forecast', category: 'preparation', priority: 'medium', estimated_time: 2 },
      { text: 'Prepare necessary items', category: 'preparation', priority: 'high', estimated_time: 15 }
    ];

    return {
      title: `${eventTitle} Checklist`,
      category: eventType || 'general',
      items: baseItems
    };
  }

  async analyzeSchedule({ events, date }) {
    const conflicts = this.findScheduleConflicts(events);
    const suggestions = this.generateScheduleSuggestions(events);

    return {
      date,
      conflicts,
      suggestions,
      optimization_score: this.calculateOptimizationScore(events, conflicts),
      recommendations: this.generateRecommendations(events, conflicts)
    };
  }

  findScheduleConflicts(events) {
    const conflicts = [];
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        
        const start1 = new Date(event1.start_time);
        const end1 = new Date(event1.end_time);
        const start2 = new Date(event2.start_time);
        const end2 = new Date(event2.end_time);
        
        if (start1 < end2 && start2 < end1) {
          conflicts.push({
            type: 'time_overlap',
            events: [event1.id, event2.id],
            description: `${event1.title} overlaps with ${event2.title}`,
            severity: 'high'
          });
        }
        
        // Check for tight scheduling (less than 30 minutes between events with locations)
        if (event1.location && event2.location && Math.abs(end1 - start2) < 30 * 60 * 1000) {
          conflicts.push({
            type: 'tight_schedule',
            events: [event1.id, event2.id],
            description: 'Insufficient travel time between events',
            severity: 'medium'
          });
        }
      }
    }
    
    return conflicts;
  }

  generateScheduleSuggestions(events) {
    const suggestions = [];
    
    if (events.length > 3) {
      suggestions.push({
        type: 'busy_day',
        message: 'Consider spreading some events across multiple days',
        priority: 'medium'
      });
    }
    
    const morningEvents = events.filter(e => {
      const hour = new Date(e.start_time).getHours();
      return hour < 12;
    });
    
    if (morningEvents.length === 0 && events.length > 0) {
      suggestions.push({
        type: 'morning_optimization',
        message: 'Consider moving some tasks to morning for better energy',
        priority: 'low'
      });
    }
    
    return suggestions;
  }

  calculateOptimizationScore(events, conflicts) {
    let score = 100;
    score -= conflicts.filter(c => c.severity === 'high').length * 30;
    score -= conflicts.filter(c => c.severity === 'medium').length * 15;
    score -= conflicts.filter(c => c.severity === 'low').length * 5;
    
    return Math.max(0, score);
  }

  generateRecommendations(events, conflicts) {
    const recommendations = [];
    
    if (conflicts.length > 0) {
      recommendations.push('Review schedule for conflicts and adjust timing');
    }
    
    const hasPreparationTime = events.some(e => e.preparation_time && e.preparation_time > 0);
    if (!hasPreparationTime) {
      recommendations.push('Add preparation time buffers to events');
    }
    
    return recommendations;
  }

  async generateDailyBrief({ date, events, tasks, weather }) {
    const scheduleAnalysis = await this.analyzeSchedule({ events, date });
    
    return {
      date,
      weather: weather || { temp: 70, condition: 'Clear', recommendation: 'Great day for outdoor activities' },
      events_summary: {
        total: events.length,
        high_priority: events.filter(e => e.priority === 'high').length,
        needs_preparation: events.filter(e => !e.ai_enriched).length
      },
      tasks_summary: {
        total: tasks.length,
        overdue: tasks.filter(t => new Date(t.due_date) < new Date()).length,
        due_today: tasks.filter(t => {
          const taskDate = new Date(t.due_date).toDateString();
          const today = new Date().toDateString();
          return taskDate === today;
        }).length
      },
      schedule_analysis: scheduleAnalysis,
      key_reminders: this.generateKeyReminders(events, tasks),
      suggested_optimizations: this.suggestOptimizations(events, tasks)
    };
  }

  generateKeyReminders(events, tasks) {
    const reminders = [];
    
    // Check for events needing preparation
    events.forEach(event => {
      if (!event.ai_enriched) {
        reminders.push(`Enrich "${event.title}" with AI suggestions`);
      }
      
      if (event.preparation_time && event.preparation_time > 30) {
        reminders.push(`Allow ${event.preparation_time} minutes prep time for "${event.title}"`);
      }
    });
    
    // Check for overdue tasks
    const overdueTasks = tasks.filter(t => new Date(t.due_date) < new Date());
    if (overdueTasks.length > 0) {
      reminders.push(`${overdueTasks.length} overdue tasks need attention`);
    }
    
    return reminders.slice(0, 5); // Limit to top 5 reminders
  }

  suggestOptimizations(events, tasks) {
    const optimizations = [];
    
    // Suggest batching similar events
    const eventsByLocation = events.reduce((acc, event) => {
      if (event.location) {
        acc[event.location] = acc[event.location] || [];
        acc[event.location].push(event);
      }
      return acc;
    }, {});
    
    Object.entries(eventsByLocation).forEach(([location, locationEvents]) => {
      if (locationEvents.length > 1) {
        optimizations.push(`Consider batching ${locationEvents.length} events at ${location}`);
      }
    });
    
    return optimizations;
  }
}

module.exports = new AIService();