const db = require('../config/database');
const MealLearningService = require('./mealLearningService');

/**
 * Meal Conversation AI Service
 * Handles natural language processing for meal planning conversations
 * Integrates with family history, preferences, and patterns
 */

class MealConversationAI {
  constructor() {
    this.familyMembers = [
      { id: 1, name: 'Parent 1', role: 'parent' },
      { id: 2, name: 'Parent 2', role: 'parent' },
      { id: 3, name: 'Kaleb', age: 7, role: 'child' },
      { id: 4, name: 'Ella', age: 7, role: 'child' }
    ];
  }

  /**
   * Process a conversation message and generate contextual response
   */
  async processMessage({ message, conversationId, conversationHistory, context, parsedMessage }) {
    try {
      // Get family context from database
      const familyContext = await this.getFamilyContext();
      
      // Analyze user intent
      const intent = this.analyzeIntent(parsedMessage || {}, message);
      
      // Generate appropriate response based on intent
      let response;
      let mealSuggestions = [];
      let structuredData = null;

      switch (intent.primary) {
        case 'plan_week':
          response = await this.handleWeekPlanning(message, context, familyContext);
          mealSuggestions = response.suggestions || [];
          structuredData = response.structuredData;
          response = response.text;
          break;

        case 'plan_day':
          response = await this.handleDayPlanning(message, context, familyContext);
          mealSuggestions = response.suggestions || [];
          structuredData = response.structuredData;
          response = response.text;
          break;

        case 'provide_feedback':
          response = await this.handleMealFeedback(message, context, familyContext);
          break;

        case 'ask_question':
          response = await this.handleQuestion(message, context, familyContext);
          break;

        case 'mention_ingredients':
          response = await this.handleIngredientMention(message, context, familyContext);
          mealSuggestions = response.suggestions || [];
          response = response.text;
          break;

        case 'mention_constraints':
          response = await this.handleConstraintMention(message, context, familyContext);
          break;

        default:
          response = await this.handleGeneralConversation(message, context, familyContext);
      }

      return {
        response,
        mealSuggestions,
        structuredData,
        intent: intent.primary,
        confidence: intent.confidence
      };

    } catch (error) {
      console.error('Error processing conversation message:', error);
      return {
        response: "I'm having trouble understanding that right now. Could you try rephrasing your question about meal planning?",
        mealSuggestions: [],
        structuredData: null,
        intent: 'error',
        confidence: 0
      };
    }
  }

  /**
   * Analyze user intent from message
   */
  analyzeIntent(parsedMessage, rawMessage) {
    if (parsedMessage.intent) {
      return {
        primary: parsedMessage.intent,
        confidence: 0.8,
        entities: parsedMessage.entities || {}
      };
    }

    // Fallback intent detection
    const lower = rawMessage.toLowerCase();
    
    if (lower.includes('plan') && lower.includes('week')) {
      return { primary: 'plan_week', confidence: 0.9 };
    }
    if (lower.includes('dinner') || lower.includes('breakfast') || lower.includes('lunch')) {
      return { primary: 'plan_day', confidence: 0.7 };
    }
    if (lower.includes('didn\'t like') || lower.includes('loved') || lower.includes('hated')) {
      return { primary: 'provide_feedback', confidence: 0.8 };
    }
    if (lower.startsWith('what') || lower.startsWith('how') || lower.startsWith('when')) {
      return { primary: 'ask_question', confidence: 0.6 };
    }

    return { primary: 'general_conversation', confidence: 0.5 };
  }

  /**
   * Handle week-long meal planning requests
   */
  async handleWeekPlanning(message, context, familyContext) {
    const { recentHistory, preferences, patterns } = familyContext;
    
    // Determine the week being planned
    const targetWeek = this.parseWeekContext(message, context);
    
    // Get existing meals for that week to avoid duplicates
    const existingMeals = await this.getExistingMeals(targetWeek.start, targetWeek.end);
    
    // Generate suggestions based on family patterns and preferences
    const suggestions = await this.generateWeekSuggestions({
      weekRange: targetWeek,
      existingMeals,
      preferences,
      patterns,
      recentHistory,
      constraints: context.constraints || []
    });

    let responseText = `Great! I'll help you plan meals for the week of ${this.formatDate(targetWeek.start)}. `;
    
    if (patterns.length > 0) {
      responseText += `I notice your family typically enjoys ${patterns[0].description} on ${patterns[0].day_pattern}s. `;
    }
    
    if (suggestions.length > 0) {
      responseText += `Here are some suggestions based on your family's preferences and recent meals:`;
    } else {
      responseText += `Let me suggest some meals that work well for your family based on what I know about your preferences.`;
    }

    return {
      text: responseText,
      suggestions,
      structuredData: { weekRange: targetWeek, existingMeals }
    };
  }

  /**
   * Handle single day meal planning
   */
  async handleDayPlanning(message, context, familyContext) {
    const { recentHistory, preferences } = familyContext;
    
    // Parse which day and meal type
    const dayContext = this.parseDayContext(message, context);
    
    // Get recent meals to avoid repetition
    const recentMealTitles = recentHistory.slice(0, 10).map(meal => meal.title.toLowerCase());
    
    // Generate suggestions for the specific day/meal
    const suggestions = await this.generateDaySuggestions({
      date: dayContext.date,
      mealType: dayContext.mealType,
      preferences,
      recentMealTitles,
      constraints: context.constraints || []
    });

    const mealTypeText = dayContext.mealType || 'meal';
    const dayText = dayContext.date === this.getTodayDate() ? 'today' : 
                   dayContext.date === this.getTomorrowDate() ? 'tomorrow' :
                   this.formatDate(dayContext.date);

    let responseText = `Let me suggest some ${mealTypeText} options for ${dayText}. `;
    
    // Add context based on recent meals
    if (recentHistory.length > 0) {
      const lastMeal = recentHistory[0];
      if (lastMeal.member_rating && lastMeal.member_rating >= 4) {
        responseText += `Since everyone enjoyed the ${lastMeal.title} recently, I'll keep similar preferences in mind. `;
      }
    }

    return {
      text: responseText,
      suggestions,
      structuredData: { dayContext }
    };
  }

  /**
   * Handle meal feedback processing
   */
  async handleMealFeedback(message, context, familyContext) {
    // Extract feedback details from message
    const feedback = this.extractFeedback(message);
    
    let responseText = "Thanks for the feedback! ";
    
    if (feedback.sentiment === 'positive') {
      responseText += "I'm glad everyone enjoyed it. I'll remember that for future meal suggestions. ";
      
      // If specific family members mentioned
      if (feedback.familyMembers.length > 0) {
        responseText += `I've noted that ${feedback.familyMembers.join(' and ')} particularly liked this. `;
      }
    } else if (feedback.sentiment === 'negative') {
      responseText += "I'm sorry that didn't work out well. I'll avoid suggesting similar meals in the future. ";
      
      // If specific dislikes mentioned
      if (feedback.dislikedIngredients.length > 0) {
        responseText += `I'll remember that ${feedback.dislikedIngredients.join(', ')} didn't go over well. `;
      }
    }

    responseText += "Is there anything specific you'd like me to suggest instead?";

    return responseText;
  }

  /**
   * Handle questions about meals, preferences, etc.
   */
  async handleQuestion(message, context, familyContext) {
    const lower = message.toLowerCase();
    
    if (lower.includes('what') && (lower.includes('kaleb') || lower.includes('ella'))) {
      return this.handleKidsPreferenceQuestion(message, familyContext);
    }
    
    if (lower.includes('how often') || lower.includes('frequency')) {
      return this.handleFrequencyQuestion(message, familyContext);
    }
    
    if (lower.includes('nutritious') || lower.includes('healthy')) {
      return this.handleNutritionQuestion(message, familyContext);
    }
    
    if (lower.includes('prep time') || lower.includes('quick')) {
      return this.handlePrepTimeQuestion(message, familyContext);
    }

    return "I'd be happy to help answer that! Could you be more specific about what aspect of meal planning you'd like to know about?";
  }

  /**
   * Handle when user mentions available ingredients
   */
  async handleIngredientMention(message, context, familyContext) {
    const ingredients = this.extractIngredients(message);
    const { recentHistory, preferences } = familyContext;
    
    // Generate suggestions using mentioned ingredients
    const suggestions = await this.generateIngredientBasedSuggestions({
      availableIngredients: ingredients,
      preferences,
      recentHistory
    });

    let responseText = `Great! I see you have ${ingredients.join(', ')}. `;
    
    if (suggestions.length > 0) {
      responseText += "Here are some meal ideas that use those ingredients and work well for your family:";
    } else {
      responseText += "Let me think of some ways to use those ingredients that your family would enjoy.";
    }

    return {
      text: responseText,
      suggestions
    };
  }

  /**
   * Handle constraint mentions (guests, busy schedule, etc.)
   */
  async handleConstraintMention(message, context, familyContext) {
    const constraints = this.extractConstraints(message);
    
    let responseText = "I understand. ";
    
    if (constraints.includes('guests')) {
      responseText += "For guest-friendly meals, I'd recommend dishes that have been popular with your whole family, like your highly-rated lasagna or the chicken dish everyone enjoyed. ";
    }
    
    if (constraints.includes('busy') || constraints.includes('quick')) {
      responseText += "For busy days, I'll focus on meals that take 30 minutes or less to prepare. ";
    }
    
    if (constraints.includes('leftovers')) {
      responseText += "I can suggest meals that use up leftovers or transform them into something new. ";
    }

    responseText += "What specific meals would you like me to help plan?";

    return responseText;
  }

  /**
   * Handle general conversation
   */
  async handleGeneralConversation(message, context, familyContext) {
    const responses = [
      "I'm here to help with meal planning! What would you like to work on today?",
      "Let's plan some great meals for your family. What are you thinking about?",
      "I can help you plan meals based on what your family likes. What's on your mind?",
      "Ready to make meal planning easier? Tell me what you need help with."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Get comprehensive family context from database
   */
  async getFamilyContext() {
    try {
      // Get recent meal history
      const recentHistory = MealLearningService.getMealHistory({
        limit: 20,
        includeRatingOnly: false
      });

      // Get family preferences
      const preferences = [];
      for (const member of this.familyMembers) {
        const memberPrefs = MealLearningService.getFamilyMemberPreferences(member.id, {
          includeIngredients: true,
          includeMealTypes: true,
          minOccurrences: 2
        });
        preferences.push({ memberId: member.id, name: member.name, ...memberPrefs });
      }

      // Get discovered patterns
      const patterns = MealLearningService.getMealPatterns({
        minConfidence: 0.4,
        limit: 10
      });

      // Get ingredient insights
      const ingredientSummary = MealLearningService.getFamilyIngredientSummary();

      return {
        recentHistory,
        preferences,
        patterns,
        ingredientSummary
      };
    } catch (error) {
      console.error('Error getting family context:', error);
      return {
        recentHistory: [],
        preferences: [],
        patterns: [],
        ingredientSummary: { universalLoves: [], problematic: [], divisive: [] }
      };
    }
  }

  /**
   * Generate week-long meal suggestions
   */
  async generateWeekSuggestions({ weekRange, existingMeals, preferences, patterns, recentHistory, constraints }) {
    const suggestions = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];

    // Create map of existing meals to avoid duplicates
    const existingMealMap = {};
    existingMeals.forEach(meal => {
      const date = meal.date;
      if (!existingMealMap[date]) existingMealMap[date] = {};
      existingMealMap[date][meal.meal_type] = meal;
    });

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekRange.start);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayName = days[i];

      for (const mealType of mealTypes) {
        // Skip if meal already exists
        if (existingMealMap[dateStr] && existingMealMap[dateStr][mealType]) {
          continue;
        }

        // Check for day-specific patterns
        const dayPattern = patterns.find(p => 
          p.pattern_type === 'day_preference' && 
          p.day_pattern && 
          p.day_pattern.toLowerCase().includes(dayName.toLowerCase())
        );

        if (dayPattern && Math.random() < dayPattern.confidence_score) {
          suggestions.push(this.createSuggestionFromPattern(dayPattern, dateStr, mealType));
          continue;
        }

        // Generate based on preferences and success scores
        const suggestion = await this.generateMealSuggestion({
          date: dateStr,
          mealType,
          preferences,
          recentHistory,
          constraints
        });

        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.slice(0, 12); // Limit to reasonable number
  }

  /**
   * Generate single day meal suggestions
   */
  async generateDaySuggestions({ date, mealType, preferences, recentMealTitles, constraints }) {
    const suggestions = [];

    // Generate 2-3 options for the requested meal
    for (let i = 0; i < 3; i++) {
      const suggestion = await this.generateMealSuggestion({
        date,
        mealType: mealType || 'dinner',
        preferences,
        recentMealTitles,
        constraints,
        variant: i
      });

      if (suggestion && !suggestions.find(s => s.title === suggestion.title)) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Generate suggestions based on available ingredients
   */
  async generateIngredientBasedSuggestions({ availableIngredients, preferences, recentHistory }) {
    const suggestions = [];

    // Simple ingredient-based meal suggestions
    const ingredientMeals = {
      'chicken': [
        { title: 'Chicken Stir Fry', prep_time: 25, description: 'Quick and healthy with vegetables' },
        { title: 'Honey Garlic Chicken', prep_time: 30, description: 'Sweet and savory, kid-friendly' },
        { title: 'Chicken and Rice Bowl', prep_time: 20, description: 'Simple one-bowl meal' }
      ],
      'pasta': [
        { title: 'Spaghetti with Marinara', prep_time: 15, description: 'Classic family favorite' },
        { title: 'Creamy Chicken Pasta', prep_time: 25, description: 'Rich and satisfying' },
        { title: 'Veggie Pasta Salad', prep_time: 10, description: 'Light and fresh' }
      ],
      'eggs': [
        { title: 'Scrambled Eggs and Toast', prep_time: 10, description: 'Perfect for breakfast' },
        { title: 'Vegetable Frittata', prep_time: 20, description: 'Healthy and filling' },
        { title: 'Egg Fried Rice', prep_time: 15, description: 'Great for using leftovers' }
      ]
    };

    availableIngredients.forEach(ingredient => {
      if (ingredientMeals[ingredient.toLowerCase()]) {
        ingredientMeals[ingredient.toLowerCase()].forEach(meal => {
          // Calculate success score based on preferences
          const successScore = this.calculateMealSuccessScore(meal, preferences);
          
          suggestions.push({
            ...meal,
            date: this.getTomorrowDate(),
            mealType: 'dinner',
            ingredients: [{ name: ingredient, quantity: 1, unit: 'portion' }],
            successScore,
            basedOnIngredient: ingredient
          });
        });
      }
    });

    return suggestions.slice(0, 4);
  }

  /**
   * Generate a single meal suggestion
   */
  async generateMealSuggestion({ date, mealType, preferences, recentHistory, constraints, variant = 0 }) {
    // Sample meal database (in real implementation, this would be more comprehensive)
    const mealDatabase = {
      breakfast: [
        { title: 'Pancakes with Berries', prep_time: 20, tags: ['sweet', 'kid-friendly'], nutrition: { calories: 320 } },
        { title: 'Scrambled Eggs and Toast', prep_time: 10, tags: ['protein', 'quick'], nutrition: { calories: 280 } },
        { title: 'Oatmeal with Fruit', prep_time: 8, tags: ['healthy', 'filling'], nutrition: { calories: 250 } },
        { title: 'Smoothie Bowl', prep_time: 5, tags: ['healthy', 'colorful'], nutrition: { calories: 200 } }
      ],
      lunch: [
        { title: 'Grilled Cheese and Soup', prep_time: 15, tags: ['comfort', 'kid-friendly'], nutrition: { calories: 380 } },
        { title: 'Caesar Salad with Chicken', prep_time: 12, tags: ['healthy', 'protein'], nutrition: { calories: 350 } },
        { title: 'Turkey and Avocado Wrap', prep_time: 8, tags: ['fresh', 'portable'], nutrition: { calories: 320 } },
        { title: 'Leftover Transformation Bowl', prep_time: 10, tags: ['creative', 'waste-free'], nutrition: { calories: 300 } }
      ],
      dinner: [
        { title: 'Spaghetti with Meat Sauce', prep_time: 30, tags: ['family-favorite', 'filling'], nutrition: { calories: 450 } },
        { title: 'Baked Salmon with Vegetables', prep_time: 25, tags: ['healthy', 'omega-3'], nutrition: { calories: 380 } },
        { title: 'Chicken Stir Fry', prep_time: 20, tags: ['quick', 'vegetables'], nutrition: { calories: 360 } },
        { title: 'Taco Tuesday Special', prep_time: 25, tags: ['fun', 'interactive'], nutrition: { calories: 400 } },
        { title: 'Homemade Pizza', prep_time: 35, tags: ['weekend', 'kid-friendly'], nutrition: { calories: 420 } },
        { title: 'Shepherd\'s Pie', prep_time: 45, tags: ['comfort', 'hearty'], nutrition: { calories: 480 } }
      ]
    };

    const mealsForType = mealDatabase[mealType] || mealDatabase.dinner;
    const meal = mealsForType[variant % mealsForType.length];

    if (!meal) return null;

    // Calculate success score based on family preferences
    const successScore = this.calculateMealSuccessScore(meal, preferences);

    return {
      ...meal,
      date,
      mealType,
      successScore,
      description: `${meal.tags.join(', ')} • ${meal.prep_time} min prep`,
      ingredients: this.generateIngredientsList(meal.title),
      nutrition_info: meal.nutrition
    };
  }

  /**
   * Calculate predicted success score for a meal
   */
  calculateMealSuccessScore(meal, preferences) {
    let score = 0.5; // Base score
    
    // Boost score for kid-friendly meals
    if (meal.tags && meal.tags.includes('kid-friendly')) {
      score += 0.2;
    }
    
    // Boost for quick meals (busy families prefer)
    if (meal.prep_time && meal.prep_time <= 20) {
      score += 0.1;
    }
    
    // Simple scoring based on meal characteristics
    // In real implementation, this would use the MealLearningService
    if (meal.title.toLowerCase().includes('chicken')) score += 0.1;
    if (meal.title.toLowerCase().includes('pasta')) score += 0.15;
    if (meal.tags && meal.tags.includes('healthy')) score += 0.1;
    
    return Math.min(Math.max(score, 0.1), 1.0);
  }

  // Utility methods for parsing and formatting

  parseWeekContext(message, context) {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);

    if (message.toLowerCase().includes('next week')) {
      monday.setDate(monday.getDate() + 7);
    }

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  }

  parseDayContext(message, context) {
    const lower = message.toLowerCase();
    let date = this.getTodayDate();
    let mealType = null;

    if (lower.includes('tomorrow')) {
      date = this.getTomorrowDate();
    }
    if (lower.includes('tonight')) {
      mealType = 'dinner';
    }
    if (lower.includes('breakfast')) mealType = 'breakfast';
    if (lower.includes('lunch')) mealType = 'lunch';
    if (lower.includes('dinner')) mealType = 'dinner';

    return { date, mealType };
  }

  extractFeedback(message) {
    const lower = message.toLowerCase();
    return {
      sentiment: lower.includes('love') || lower.includes('great') ? 'positive' : 
                lower.includes('hate') || lower.includes('didn\'t like') ? 'negative' : 'neutral',
      familyMembers: this.extractFamilyMemberReferences(message),
      dislikedIngredients: this.extractDislikedIngredients(message)
    };
  }

  extractIngredients(message) {
    const commonIngredients = ['chicken', 'beef', 'fish', 'pasta', 'rice', 'eggs', 'cheese', 'vegetables'];
    const found = [];
    const lower = message.toLowerCase();

    commonIngredients.forEach(ingredient => {
      if (lower.includes(ingredient)) {
        found.push(ingredient);
      }
    });

    return found;
  }

  extractConstraints(message) {
    const constraints = [];
    const lower = message.toLowerCase();

    if (lower.includes('guest') || lower.includes('company')) constraints.push('guests');
    if (lower.includes('busy') || lower.includes('quick')) constraints.push('busy');
    if (lower.includes('leftover')) constraints.push('leftovers');
    if (lower.includes('soccer') || lower.includes('practice')) constraints.push('activities');

    return constraints;
  }

  extractFamilyMemberReferences(message) {
    const members = [];
    const lower = message.toLowerCase();

    if (lower.includes('kaleb')) members.push('Kaleb');
    if (lower.includes('ella')) members.push('Ella');
    if (lower.includes('kids') || lower.includes('children')) members.push('Kaleb', 'Ella');

    return [...new Set(members)];
  }

  extractDislikedIngredients(message) {
    // Simple extraction - would be more sophisticated in real implementation
    const ingredients = [];
    const lower = message.toLowerCase();
    
    if (lower.includes('mushroom')) ingredients.push('mushrooms');
    if (lower.includes('onion')) ingredients.push('onions');
    if (lower.includes('spicy')) ingredients.push('spicy food');

    return ingredients;
  }

  generateIngredientsList(title) {
    // Simple ingredient generation based on meal title
    const ingredientMap = {
      'spaghetti': [
        { name: 'Spaghetti pasta', quantity: 1, unit: 'lb' },
        { name: 'Ground beef', quantity: 1, unit: 'lb' },
        { name: 'Marinara sauce', quantity: 1, unit: 'jar' }
      ],
      'chicken': [
        { name: 'Chicken breast', quantity: 1.5, unit: 'lbs' },
        { name: 'Olive oil', quantity: 2, unit: 'tbsp' },
        { name: 'Seasonings', quantity: 1, unit: 'tsp' }
      ],
      'salmon': [
        { name: 'Salmon fillet', quantity: 1.5, unit: 'lbs' },
        { name: 'Lemon', quantity: 1, unit: 'whole' },
        { name: 'Vegetables', quantity: 2, unit: 'cups' }
      ]
    };

    const titleLower = title.toLowerCase();
    for (const key in ingredientMap) {
      if (titleLower.includes(key)) {
        return ingredientMap[key];
      }
    }

    return [
      { name: 'Main ingredient', quantity: 1, unit: 'portion' },
      { name: 'Supporting ingredients', quantity: 1, unit: 'portion' }
    ];
  }

  createSuggestionFromPattern(pattern, date, mealType) {
    return {
      title: pattern.description || 'Family Favorite',
      date,
      mealType,
      prep_time: 25,
      successScore: pattern.confidence_score,
      description: `Based on your family pattern: ${pattern.description}`,
      fromPattern: true,
      patternId: pattern.id
    };
  }

  async getExistingMeals(startDate, endDate) {
    try {
      return db.prepare(`
        SELECT * FROM meal_plans 
        WHERE date >= ? AND date <= ?
        ORDER BY date, meal_type
      `).all(startDate, endDate);
    } catch (error) {
      console.error('Error getting existing meals:', error);
      return [];
    }
  }

  // Helper methods for date handling
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }

  // Question handlers
  async handleKidsPreferenceQuestion(message, familyContext) {
    const { preferences } = familyContext;
    const kidsPrefs = preferences.filter(p => p.name === 'Kaleb' || p.name === 'Ella');
    
    if (kidsPrefs.length > 0) {
      const commonLikes = kidsPrefs.flatMap(p => p.favoriteIngredients || []);
      if (commonLikes.length > 0) {
        return `Based on their eating history, Kaleb and Ella tend to enjoy ${commonLikes.slice(0, 3).join(', ')}. They also prefer meals with mild flavors and finger-friendly foods.`;
      }
    }

    return "Kaleb and Ella are 7-year-old twins who generally prefer milder flavors, pasta dishes, and meals they can eat easily. They're usually more adventurous with foods that are colorful and fun!";
  }

  async handleFrequencyQuestion(message, familyContext) {
    const { recentHistory, patterns } = familyContext;
    
    if (patterns.length > 0) {
      const frequentPattern = patterns[0];
      return `Looking at your family's eating patterns, you tend to have ${frequentPattern.description} fairly regularly. In the past month, you've had ${recentHistory.length} planned meals total.`;
    }

    return "Based on your meal history, I can help you understand your family's eating patterns. What specific frequency information would you like to know?";
  }

  async handleNutritionQuestion(message, familyContext) {
    return "For your family with young twins, I focus on balanced meals with plenty of vegetables, lean proteins, and whole grains. I can suggest meals that are both nutritious and appealing to kids - would you like some specific healthy meal ideas?";
  }

  async handlePrepTimeQuestion(message, familyContext) {
    const { recentHistory } = familyContext;
    const avgPrepTime = recentHistory.reduce((sum, meal) => sum + (meal.prep_time || 30), 0) / recentHistory.length || 30;
    
    return `Your recent meals average about ${Math.round(avgPrepTime)} minutes of prep time. For busy weeknights, I can suggest 15-20 minute meals that your family will still love. Would you like some quick meal ideas?`;
  }
}

module.exports = new MealConversationAI();