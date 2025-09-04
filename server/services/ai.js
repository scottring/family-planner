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

  /**
   * Enhance task-to-event conversion with AI suggestions
   */
  async enhanceTaskToEvent(task, eventData) {
    if (this.useMockData) {
      return {
        suggestedLocation: eventData.location || 'Home',
        preparationList: [`Prepare for ${task.title}`, 'Set reminders', 'Gather materials'],
        resourcesNeeded: { materials: ['Task-related items'], people: [], equipment: [] },
        suggestions: { preparation_time: 15, optimal_duration: 60 }
      };
    }

    try {
      const prompt = `Convert this task to an event with practical suggestions:
      Task: ${task.title}
      Description: ${task.description || 'No description'}
      Category: ${task.category || 'General'}
      Priority: ${task.priority || 3}
      Event Data: ${JSON.stringify(eventData)}
      
      Provide JSON with: suggestedLocation, preparationList (array), resourcesNeeded (object with materials/people/equipment arrays), suggestions (object with preparation_time and optimal_duration)`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful family planning assistant. Convert tasks to events with practical suggestions. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI task-to-event enhancement error:', error);
      return {
        suggestedLocation: 'Home',
        preparationList: [`Complete ${task.title}`],
        resourcesNeeded: { materials: [], people: [], equipment: [] },
        suggestions: { preparation_time: 15, optimal_duration: 30 }
      };
    }
  }

  /**
   * Suggest event creation based on completed task
   */
  async suggestEventFromTask(task) {
    if (this.useMockData) {
      return {
        title: `Follow-up for ${task.title}`,
        description: `Event created based on completed task: ${task.title}`,
        duration: 60,
        suggested_time: 'within_week',
        location: 'Home',
        type: 'follow_up'
      };
    }

    try {
      const prompt = `Based on this completed task, suggest a related calendar event:
      Task: ${task.title}
      Description: ${task.description || 'No description'}
      Category: ${task.category || 'General'}
      
      Suggest a relevant event with title, description, duration (minutes), suggested_time (today/tomorrow/within_week), location, and type.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Suggest relevant calendar events based on completed tasks. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI event suggestion error:', error);
      return {
        title: `Review ${task.title}`,
        description: `Follow-up on completed task`,
        duration: 30,
        suggested_time: 'within_week',
        location: 'Home',
        type: 'review'
      };
    }
  }

  /**
   * Generate follow-up task suggestions based on completed task
   */
  async suggestFollowUpTasks(task) {
    if (this.useMockData) {
      return [
        {
          title: `Review ${task.title} results`,
          description: 'Follow up on the completed task to ensure success',
          priority: 2,
          category: task.category || 'General',
          duration: 15
        }
      ];
    }

    try {
      const prompt = `Based on this completed task, suggest 1-3 relevant follow-up tasks:
      Task: ${task.title}
      Description: ${task.description || 'No description'}
      Category: ${task.category || 'General'}
      
      Provide JSON array with objects containing: title, description, priority (1-5), category, duration (minutes)`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Suggest relevant follow-up tasks based on completed tasks. Always respond with valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI follow-up suggestions error:', error);
      return [
        {
          title: `Follow up on ${task.title}`,
          description: 'Check results and plan next steps',
          priority: 3,
          category: task.category || 'General',
          duration: 15
        }
      ];
    }
  }

  /**
   * Generate AI-powered weekly meal plan
   */
  async generateWeeklyMealPlan({
    startDate,
    dietaryPatterns = {},
    familyPreferences = {},
    scheduleInfo = {},
    availableIngredients = [],
    nutritionGoals = {}
  }) {
    if (this.useMockData) {
      return this.getMockWeeklyMealPlan(startDate);
    }

    try {
      const prompt = this.buildMealPlanPrompt({
        startDate,
        dietaryPatterns,
        familyPreferences,
        scheduleInfo,
        availableIngredients,
        nutritionGoals
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional family meal planning assistant. Create practical, family-friendly meal plans that consider dietary patterns, individual preferences, schedules, and available ingredients. Always respond with valid JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content);
      return this.formatMealPlanResult(result);
    } catch (error) {
      console.error('AI meal plan generation error:', error);
      // Fallback to mock data if API fails
      return this.getMockWeeklyMealPlan(startDate);
    }
  }

  buildMealPlanPrompt({
    startDate,
    dietaryPatterns,
    familyPreferences,
    scheduleInfo,
    availableIngredients,
    nutritionGoals
  }) {
    const weekStart = new Date(startDate);
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return `
Generate a comprehensive weekly meal plan for a family starting ${weekStart.toDateString()}.

FAMILY CONSTRAINTS:
Dietary Patterns: ${JSON.stringify(dietaryPatterns)}
Individual Preferences: ${JSON.stringify(familyPreferences)}
Schedule Requirements: ${JSON.stringify(scheduleInfo)}
Available Ingredients: ${availableIngredients.join(', ')}
Nutrition Goals: ${JSON.stringify(nutritionGoals)}

REQUIREMENTS:
- Include breakfast, lunch, dinner, and snacks for each day
- Consider meal prep time (15-45 minutes max for weekdays, flexible for weekends)
- Avoid repetition within the week
- Prioritize practical, family-friendly meals
- Use available ingredients where possible
- Balance nutrition across the week
- Consider who's eating what meals based on schedule

RESPONSE FORMAT - Return valid JSON:
{
  "meal_plan": {
    "Monday": {
      "breakfast": {
        "title": "Meal Name",
        "prep_time": 15,
        "servings": 4,
        "difficulty": "Easy",
        "ingredients": [
          {"name": "Ingredient", "quantity": 1, "unit": "cup", "category": "Produce"}
        ],
        "nutrition_info": {"calories": 300, "protein": 15, "carbs": 45, "fat": 8},
        "tags": ["quick", "healthy"],
        "description": "Brief description",
        "cooking_notes": "Any special instructions"
      },
      "lunch": {...},
      "dinner": {...},
      "snacks": {...}
    },
    "Tuesday": {...},
    "Wednesday": {...},
    "Thursday": {...},
    "Friday": {...},
    "Saturday": {...},
    "Sunday": {...}
  },
  "shopping_list": {
    "Produce": ["item1", "item2"],
    "Dairy & Eggs": ["item1", "item2"],
    "Meat & Seafood": ["item1", "item2"],
    "Pantry": ["item1", "item2"]
  },
  "weekly_summary": {
    "total_prep_time": 180,
    "nutrition_totals": {"calories": 2100, "protein": 105, "carbs": 315, "fat": 70},
    "meal_variety_score": 8.5,
    "budget_estimate": 150
  },
  "meal_prep_suggestions": [
    "Prep vegetables on Sunday",
    "Make overnight oats for quick breakfasts"
  ]
}

Focus on practical, cookable meals that save time and reduce daily decision fatigue.
    `;
  }

  formatMealPlanResult(result) {
    return {
      meal_plan: result.meal_plan || {},
      shopping_list: result.shopping_list || {},
      weekly_summary: result.weekly_summary || {},
      meal_prep_suggestions: result.meal_prep_suggestions || [],
      generated_at: new Date().toISOString()
    };
  }

  getMockWeeklyMealPlan(startDate) {
    const weekStart = new Date(startDate);
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const mockMeals = {
      breakfast: [
        {
          title: "Overnight Oats with Berries",
          prep_time: 5,
          servings: 4,
          difficulty: "Easy",
          ingredients: [
            {"name": "Rolled oats", "quantity": 2, "unit": "cups", "category": "Pantry"},
            {"name": "Greek yogurt", "quantity": 1, "unit": "cup", "category": "Dairy & Eggs"},
            {"name": "Mixed berries", "quantity": 1.5, "unit": "cups", "category": "Produce"},
            {"name": "Honey", "quantity": 3, "unit": "tbsp", "category": "Pantry"}
          ],
          nutrition_info: {"calories": 280, "protein": 12, "carbs": 48, "fat": 6},
          tags: ["healthy", "make-ahead", "quick"],
          description: "Creamy overnight oats with fresh berries and honey",
          cooking_notes: "Prepare the night before for grab-and-go breakfast"
        },
        {
          title: "Scrambled Eggs with Toast",
          prep_time: 10,
          servings: 4,
          difficulty: "Easy",
          ingredients: [
            {"name": "Eggs", "quantity": 8, "unit": "large", "category": "Dairy & Eggs"},
            {"name": "Whole grain bread", "quantity": 4, "unit": "slices", "category": "Bakery"},
            {"name": "Butter", "quantity": 2, "unit": "tbsp", "category": "Dairy & Eggs"},
            {"name": "Milk", "quantity": 0.25, "unit": "cup", "category": "Dairy & Eggs"}
          ],
          nutrition_info: {"calories": 320, "protein": 18, "carbs": 22, "fat": 16},
          tags: ["protein", "quick", "classic"],
          description: "Fluffy scrambled eggs with buttered toast",
          cooking_notes: "Cook eggs on medium-low heat for creaminess"
        }
      ],
      lunch: [
        {
          title: "Turkey and Avocado Wrap",
          prep_time: 10,
          servings: 4,
          difficulty: "Easy",
          ingredients: [
            {"name": "Large tortillas", "quantity": 4, "unit": "pieces", "category": "Bakery"},
            {"name": "Sliced turkey", "quantity": 0.5, "unit": "lb", "category": "Meat & Seafood"},
            {"name": "Avocado", "quantity": 2, "unit": "medium", "category": "Produce"},
            {"name": "Lettuce", "quantity": 4, "unit": "cups", "category": "Produce"}
          ],
          nutrition_info: {"calories": 380, "protein": 25, "carbs": 32, "fat": 18},
          tags: ["portable", "healthy", "quick"],
          description: "Fresh wrap with turkey, avocado, and crisp vegetables",
          cooking_notes: "Wrap tightly for easy handling"
        }
      ],
      dinner: [
        {
          title: "One-Pan Chicken and Vegetables",
          prep_time: 35,
          servings: 4,
          difficulty: "Easy",
          ingredients: [
            {"name": "Chicken thighs", "quantity": 2, "unit": "lbs", "category": "Meat & Seafood"},
            {"name": "Sweet potatoes", "quantity": 2, "unit": "large", "category": "Produce"},
            {"name": "Broccoli", "quantity": 1, "unit": "large head", "category": "Produce"},
            {"name": "Olive oil", "quantity": 3, "unit": "tbsp", "category": "Pantry"}
          ],
          nutrition_info: {"calories": 420, "protein": 35, "carbs": 28, "fat": 18},
          tags: ["one-pan", "healthy", "family-friendly"],
          description: "Roasted chicken with colorful vegetables",
          cooking_notes: "Roast at 425°F for 30-35 minutes"
        }
      ],
      snacks: [
        {
          title: "Apple Slices with Peanut Butter",
          prep_time: 5,
          servings: 4,
          difficulty: "Easy",
          ingredients: [
            {"name": "Apples", "quantity": 2, "unit": "large", "category": "Produce"},
            {"name": "Natural peanut butter", "quantity": 4, "unit": "tbsp", "category": "Pantry"}
          ],
          nutrition_info: {"calories": 180, "protein": 6, "carbs": 20, "fat": 10},
          tags: ["healthy", "quick", "portable"],
          description: "Crisp apple slices with creamy peanut butter",
          cooking_notes: "Sprinkle apples with lemon juice to prevent browning"
        }
      ]
    };

    const meal_plan = {};
    weekDays.forEach((day, index) => {
      meal_plan[day] = {
        breakfast: mockMeals.breakfast[index % mockMeals.breakfast.length],
        lunch: mockMeals.lunch[index % mockMeals.lunch.length],
        dinner: mockMeals.dinner[index % mockMeals.dinner.length],
        snacks: mockMeals.snacks[index % mockMeals.snacks.length]
      };
    });

    return {
      meal_plan,
      shopping_list: {
        "Produce": ["Mixed berries", "Apples", "Sweet potatoes", "Broccoli", "Avocado", "Lettuce"],
        "Dairy & Eggs": ["Greek yogurt", "Eggs", "Butter", "Milk"],
        "Meat & Seafood": ["Chicken thighs", "Sliced turkey"],
        "Pantry": ["Rolled oats", "Honey", "Olive oil", "Natural peanut butter"],
        "Bakery": ["Whole grain bread", "Large tortillas"]
      },
      weekly_summary: {
        total_prep_time: 180,
        nutrition_totals: {"calories": 2100, "protein": 120, "carbs": 280, "fat": 85},
        meal_variety_score: 8.0,
        budget_estimate: 125
      },
      meal_prep_suggestions: [
        "Prepare overnight oats on Sunday for the week",
        "Wash and chop vegetables when you get home from grocery shopping",
        "Cook extra chicken for easy lunch leftovers"
      ],
      generated_at: new Date().toISOString()
    };
  }
}

module.exports = new AIService();