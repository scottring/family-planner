import api from './api';

/**
 * Meal Chat Service - Handles conversational meal planning interactions
 * Manages conversation state, context, and integration with meal planning features
 */

class MealChatService {
  constructor() {
    this.conversations = new Map();
    this.conversationContext = new Map();
  }

  // Initialize or get conversation
  getConversation(conversationId) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        messages: [],
        context: this.initializeContext(),
        createdAt: Date.now(),
        lastActive: Date.now()
      });
    }
    return this.conversations.get(conversationId);
  }

  // Initialize conversation context with family data
  initializeContext() {
    return {
      familyMembers: [
        { name: 'Parent 1', id: 1, preferences: [] },
        { name: 'Parent 2', id: 2, preferences: [] },
        { name: 'Kaleb', id: 3, age: 7, preferences: [] },
        { name: 'Ella', id: 4, age: 7, preferences: [] }
      ],
      currentWeek: this.getCurrentWeekRange(),
      recentMeals: [],
      mentionedIngredients: [],
      mealPlanningIntent: null,
      constraints: [],
      preferences: [],
      temporalContext: null // "next week", "tomorrow", etc.
    };
  }

  // Get current week date range
  getCurrentWeekRange() {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  }

  // Send message and get AI response
  async sendMessage(conversationId, message, options = {}) {
    const conversation = this.getConversation(conversationId);
    
    // Add user message to conversation
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    conversation.messages.push(userMessage);
    conversation.lastActive = Date.now();

    try {
      // Parse user intent and extract structured data
      const parsedMessage = this.parseUserMessage(message, conversation.context);
      
      // Update conversation context based on parsed message
      this.updateConversationContext(conversation, parsedMessage);

      // Prepare context for AI
      const contextForAI = this.prepareContextForAI(conversation);

      // Get AI response
      const response = await api.post('/meals/chat', {
        message,
        conversationId,
        conversationHistory: conversation.messages.slice(-10),
        context: contextForAI,
        parsedMessage
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.data.response,
        timestamp: Date.now(),
        mealSuggestions: response.data.mealSuggestions || [],
        structuredData: response.data.structuredData || null
      };

      conversation.messages.push(aiMessage);

      return {
        message: aiMessage,
        conversation: conversation,
        suggestions: response.data.mealSuggestions || []
      };

    } catch (error) {
      console.error('Error in meal chat service:', error);
      
      // Return fallback response
      const fallbackMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: "I'm having trouble right now. Could you try rephrasing your question about meal planning?",
        timestamp: Date.now(),
        isError: true
      };

      conversation.messages.push(fallbackMessage);

      return {
        message: fallbackMessage,
        conversation: conversation,
        suggestions: []
      };
    }
  }

  // Parse user message to extract intent and entities
  parseUserMessage(message, context) {
    const parsed = {
      originalMessage: message,
      intent: this.detectIntent(message),
      entities: this.extractEntities(message),
      temporalReferences: this.extractTemporalReferences(message),
      familyMemberReferences: this.extractFamilyMemberReferences(message),
      ingredientMentions: this.extractIngredientMentions(message),
      mealTypeReferences: this.extractMealTypeReferences(message),
      sentiment: this.analyzeSentiment(message)
    };

    return parsed;
  }

  // Detect user intent from message
  detectIntent(message) {
    const lower = message.toLowerCase();
    
    // Planning intents
    if (lower.includes('plan') || lower.includes('help me') || lower.includes('what should')) {
      if (lower.includes('week')) return 'plan_week';
      if (lower.includes('tomorrow') || lower.includes('tonight')) return 'plan_day';
      return 'plan_general';
    }

    // Feedback intents
    if (lower.includes('didn\'t like') || lower.includes('loved') || lower.includes('hated')) {
      return 'provide_feedback';
    }

    // Constraint/preference intents
    if (lower.includes('have') && (lower.includes('leftover') || lower.includes('ingredient'))) {
      return 'mention_ingredients';
    }

    if (lower.includes('coming') || lower.includes('guest') || lower.includes('busy')) {
      return 'mention_constraints';
    }

    // Question intents
    if (lower.startsWith('what') || lower.startsWith('how') || lower.startsWith('when')) {
      return 'ask_question';
    }

    return 'general_conversation';
  }

  // Extract entities (ingredients, meal types, etc.)
  extractEntities(message) {
    const entities = {
      ingredients: [],
      mealTypes: [],
      timeReferences: [],
      familyMembers: [],
      cookingMethods: [],
      cuisineTypes: []
    };

    // Common ingredients
    const ingredientPatterns = [
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'rice', 'pasta', 'bread',
      'tomato', 'onion', 'garlic', 'cheese', 'milk', 'eggs', 'butter',
      'broccoli', 'carrots', 'potatoes', 'lettuce', 'spinach'
    ];

    // Meal types
    const mealTypePatterns = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

    // Family member names
    const familyPatterns = ['kaleb', 'ella', 'kids', 'children', 'twins'];

    const lower = message.toLowerCase();

    ingredientPatterns.forEach(ingredient => {
      if (lower.includes(ingredient)) {
        entities.ingredients.push(ingredient);
      }
    });

    mealTypePatterns.forEach(mealType => {
      if (lower.includes(mealType)) {
        entities.mealTypes.push(mealType);
      }
    });

    familyPatterns.forEach(member => {
      if (lower.includes(member)) {
        entities.familyMembers.push(member);
      }
    });

    return entities;
  }

  // Extract temporal references
  extractTemporalReferences(message) {
    const temporal = [];
    const lower = message.toLowerCase();

    const patterns = [
      { pattern: 'next week', value: 'next_week', offset: 7 },
      { pattern: 'this week', value: 'this_week', offset: 0 },
      { pattern: 'tomorrow', value: 'tomorrow', offset: 1 },
      { pattern: 'tonight', value: 'tonight', offset: 0 },
      { pattern: 'monday', value: 'monday', day: 1 },
      { pattern: 'tuesday', value: 'tuesday', day: 2 },
      { pattern: 'wednesday', value: 'wednesday', day: 3 },
      { pattern: 'thursday', value: 'thursday', day: 4 },
      { pattern: 'friday', value: 'friday', day: 5 },
      { pattern: 'saturday', value: 'saturday', day: 6 },
      { pattern: 'sunday', value: 'sunday', day: 0 }
    ];

    patterns.forEach(({ pattern, value, offset, day }) => {
      if (lower.includes(pattern)) {
        temporal.push({ 
          pattern, 
          value, 
          offset: offset || 0, 
          day: day || null 
        });
      }
    });

    return temporal;
  }

  // Extract family member references
  extractFamilyMemberReferences(message) {
    const references = [];
    const lower = message.toLowerCase();

    if (lower.includes('kaleb')) references.push('Kaleb');
    if (lower.includes('ella')) references.push('Ella');
    if (lower.includes('kids') || lower.includes('children') || lower.includes('twins')) {
      references.push('Kaleb', 'Ella');
    }
    if (lower.includes('everyone') || lower.includes('family')) {
      references.push('everyone');
    }

    return references;
  }

  // Extract ingredient mentions
  extractIngredientMentions(message) {
    // This would be more sophisticated in a real implementation
    const mentions = [];
    const commonIngredients = [
      'chicken', 'beef', 'fish', 'pasta', 'rice', 'vegetables', 'cheese',
      'eggs', 'bread', 'milk', 'butter', 'onions', 'garlic', 'tomatoes'
    ];

    const lower = message.toLowerCase();
    commonIngredients.forEach(ingredient => {
      if (lower.includes(ingredient)) {
        mentions.push(ingredient);
      }
    });

    return mentions;
  }

  // Extract meal type references
  extractMealTypeReferences(message) {
    const mealTypes = [];
    const lower = message.toLowerCase();

    ['breakfast', 'lunch', 'dinner', 'snack'].forEach(type => {
      if (lower.includes(type)) mealTypes.push(type);
    });

    return mealTypes;
  }

  // Basic sentiment analysis
  analyzeSentiment(message) {
    const lower = message.toLowerCase();
    const positiveWords = ['love', 'like', 'enjoy', 'great', 'good', 'delicious', 'yummy'];
    const negativeWords = ['hate', 'dislike', 'awful', 'terrible', 'gross', 'bad'];

    const positiveCount = positiveWords.filter(word => lower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Update conversation context based on parsed message
  updateConversationContext(conversation, parsedMessage) {
    const { context } = conversation;
    
    // Update mentioned ingredients
    if (parsedMessage.ingredientMentions.length > 0) {
      context.mentionedIngredients = [
        ...context.mentionedIngredients,
        ...parsedMessage.ingredientMentions
      ];
    }

    // Update meal planning intent
    if (parsedMessage.intent.startsWith('plan_')) {
      context.mealPlanningIntent = parsedMessage.intent;
    }

    // Update temporal context
    if (parsedMessage.temporalReferences.length > 0) {
      context.temporalContext = parsedMessage.temporalReferences[0];
    }

    // Update constraints based on conversation
    if (parsedMessage.intent === 'mention_constraints') {
      const constraint = {
        type: 'user_mentioned',
        content: parsedMessage.originalMessage,
        timestamp: Date.now()
      };
      context.constraints.push(constraint);
    }
  }

  // Prepare context for AI processing
  prepareContextForAI(conversation) {
    return {
      familyInfo: {
        members: conversation.context.familyMembers,
        commonPreferences: this.getCommonPreferences()
      },
      recentHistory: this.getRecentMealHistory(),
      conversationContext: {
        mentionedIngredients: conversation.context.mentionedIngredients,
        mealPlanningIntent: conversation.context.mealPlanningIntent,
        temporalContext: conversation.context.temporalContext,
        constraints: conversation.context.constraints
      },
      currentDate: new Date().toISOString().split('T')[0],
      weekRange: conversation.context.currentWeek
    };
  }

  // Get common family preferences (would integrate with learning service)
  getCommonPreferences() {
    // This would come from the meal learning service in a real implementation
    return {
      universalLikes: ['pasta', 'chicken', 'cheese'],
      universalDislikes: ['mushrooms', 'onions'],
      kidsPrefer: ['mild flavors', 'finger foods'],
      patterns: {
        'tuesday': 'tacos',
        'friday': 'pizza night'
      }
    };
  }

  // Get recent meal history (would query database)
  async getRecentMealHistory() {
    try {
      const response = await api.get('/meals/history?limit=20');
      return response.data;
    } catch (error) {
      console.error('Error fetching meal history:', error);
      return [];
    }
  }

  // Get conversation by ID
  getConversationById(conversationId) {
    return this.conversations.get(conversationId);
  }

  // Clear old conversations (cleanup)
  cleanupOldConversations(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [id, conversation] of this.conversations.entries()) {
      if (now - conversation.lastActive > maxAgeMs) {
        this.conversations.delete(id);
      }
    }
  }

  // Export conversation for debugging/analysis
  exportConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    return {
      id: conversation.id,
      messages: conversation.messages,
      context: conversation.context,
      duration: Date.now() - conversation.createdAt,
      messageCount: conversation.messages.length
    };
  }
}

// Create singleton instance
const mealChatService = new MealChatService();

// Export service instance and utilities
export default mealChatService;

export const mealChatUtils = {
  // Format date for display
  formatDateForDisplay: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  },

  // Get next week's date range
  getNextWeekRange: () => {
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() - today.getDay() + 8); // Next Monday
    
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    
    return {
      start: nextMonday.toISOString().split('T')[0],
      end: nextSunday.toISOString().split('T')[0]
    };
  },

  // Validate meal suggestion data
  validateMealSuggestion: (suggestion) => {
    const required = ['title', 'mealType', 'date'];
    const missing = required.filter(field => !suggestion[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate meal type
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(suggestion.mealType)) {
      throw new Error(`Invalid meal type: ${suggestion.mealType}`);
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(suggestion.date)) {
      throw new Error(`Invalid date format: ${suggestion.date}`);
    }

    return true;
  },

  // Extract quick stats from conversation
  getConversationStats: (conversation) => {
    if (!conversation) return null;

    const userMessages = conversation.messages.filter(m => m.type === 'user');
    const aiMessages = conversation.messages.filter(m => m.type === 'ai');
    const suggestions = aiMessages.reduce((acc, msg) => 
      acc + (msg.mealSuggestions?.length || 0), 0);

    return {
      totalMessages: conversation.messages.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      totalSuggestions: suggestions,
      duration: Date.now() - conversation.createdAt,
      lastActive: conversation.lastActive
    };
  }
};