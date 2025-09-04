const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const mealsService = require('../services/meals');
const aiService = require('../services/ai');
const MealLearningService = require('../services/mealLearningService');
const mealConversationAI = require('../services/mealConversationAI');

// Get all meal plans
router.get('/', auth, (req, res) => {
  try {
    const meals = db.prepare(`
      SELECT * FROM meal_plans 
      ORDER BY date DESC, 
        CASE meal_type 
          WHEN 'breakfast' THEN 1
          WHEN 'lunch' THEN 2
          WHEN 'dinner' THEN 3
          WHEN 'snack' THEN 4
        END
    `).all();
    
    meals.forEach(meal => {
      meal.ingredients = db.parseJSON(meal.ingredients) || [];
      meal.nutrition_info = db.parseJSON(meal.nutrition_info) || {};
      meal.portions = db.parseJSON(meal.portions) || {};
    });
    
    res.json(meals);
  } catch (error) {
    console.error('Get all meals error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get meals for a week
router.get('/week/:date', auth, (req, res) => {
  try {
    const startDate = new Date(req.params.date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    const meals = db.prepare(`
      SELECT * FROM meal_plans 
      WHERE date >= ? AND date < ?
      ORDER BY date ASC, 
        CASE meal_type 
          WHEN 'breakfast' THEN 1
          WHEN 'lunch' THEN 2
          WHEN 'dinner' THEN 3
          WHEN 'snack' THEN 4
        END
    `).all(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    
    meals.forEach(meal => {
      meal.ingredients = db.parseJSON(meal.ingredients) || [];
      meal.nutrition_info = db.parseJSON(meal.nutrition_info) || {};
      meal.portions = db.parseJSON(meal.portions) || {};
    });
    
    res.json(meals);
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create meal plan
router.post('/', auth, (req, res) => {
  try {
    const { date, meal_type, title, recipe_url, ingredients, nutrition_info, portions, prep_time } = req.body;
    
    if (!date || !meal_type || !title) {
      return res.status(400).json({ message: 'Date, meal type, and title are required' });
    }
    
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(meal_type)) {
      return res.status(400).json({ message: 'Invalid meal type' });
    }
    
    const insertMeal = db.prepare(`
      INSERT INTO meal_plans (date, meal_type, title, recipe_url, ingredients, nutrition_info, portions, prep_time, assigned_cook)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertMeal.run(
      date,
      meal_type,
      title,
      recipe_url || null,
      db.stringifyJSON(ingredients || []),
      db.stringifyJSON(nutrition_info || {}),
      db.stringifyJSON(portions || {}),
      prep_time || null,
      req.user.id
    );
    
    const meal = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(result.lastInsertRowid);
    meal.ingredients = db.parseJSON(meal.ingredients) || [];
    meal.nutrition_info = db.parseJSON(meal.nutrition_info) || {};
    meal.portions = db.parseJSON(meal.portions) || {};
    
    res.status(201).json(meal);
  } catch (error) {
    console.error('Create meal error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update meal plan
router.put('/:id', auth, (req, res) => {
  try {
    const mealId = req.params.id;
    const { date, meal_type, title, recipe_url, ingredients, nutrition_info, portions, prep_time } = req.body;
    
    if (!date || !meal_type || !title) {
      return res.status(400).json({ message: 'Date, meal type, and title are required' });
    }
    
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(meal_type)) {
      return res.status(400).json({ message: 'Invalid meal type' });
    }
    
    const updateMeal = db.prepare(`
      UPDATE meal_plans 
      SET date = ?, meal_type = ?, title = ?, recipe_url = ?, ingredients = ?, nutrition_info = ?, portions = ?, prep_time = ?
      WHERE id = ?
    `);
    
    const result = updateMeal.run(
      date,
      meal_type,
      title,
      recipe_url || null,
      db.stringifyJSON(ingredients || []),
      db.stringifyJSON(nutrition_info || {}),
      db.stringifyJSON(portions || {}),
      prep_time || null,
      mealId
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    const meal = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(mealId);
    meal.ingredients = db.parseJSON(meal.ingredients) || [];
    meal.nutrition_info = db.parseJSON(meal.nutrition_info) || {};
    meal.portions = db.parseJSON(meal.portions) || {};
    
    res.json(meal);
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete meal plan
router.delete('/:id', auth, (req, res) => {
  try {
    const mealId = req.params.id;
    
    const deleteMeal = db.prepare('DELETE FROM meal_plans WHERE id = ?');
    const result = deleteMeal.run(mealId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate shopping list from week's meals
router.get('/shopping-list', auth, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const shoppingList = mealsService.generateShoppingList(startDate, endDate);
    res.json(shoppingList);
  } catch (error) {
    console.error('Generate shopping list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// AI-powered meal suggestions
router.post('/suggest', auth, async (req, res) => {
  try {
    const { preferences, excludeDates, mealType, servings } = req.body;
    
    const suggestions = await mealsService.generateMealSuggestions({
      preferences,
      excludeDates,
      mealType,
      servings,
      userId: req.user.id
    });
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggest meals error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// AI-powered weekly meal plan generation
router.post('/ai-generate-plan', auth, async (req, res) => {
  try {
    const {
      startDate,
      dietaryPatterns = {},
      familyPreferences = {},
      scheduleInfo = {},
      availableIngredients = [],
      nutritionGoals = {}
    } = req.body;

    if (!startDate) {
      return res.status(400).json({ message: 'Start date is required' });
    }

    // Validate date format
    const dateObj = new Date(startDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const mealPlan = await aiService.generateWeeklyMealPlan({
      startDate,
      dietaryPatterns,
      familyPreferences,
      scheduleInfo,
      availableIngredients,
      nutritionGoals
    });

    res.json(mealPlan);
  } catch (error) {
    console.error('AI meal plan generation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sync AI-generated meal plan to database
router.post('/sync-ai-plan', auth, async (req, res) => {
  try {
    const { mealPlan, startDate } = req.body;

    if (!mealPlan || !startDate) {
      return res.status(400).json({ message: 'Meal plan and start date are required' });
    }

    const weekStart = new Date(startDate);
    const createdMeals = [];
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Clear existing meals for the week
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 7);
    
    db.prepare(`
      DELETE FROM meal_plans 
      WHERE date >= ? AND date < ?
    `).run(weekStart.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);

    // Insert new meals
    const insertMeal = db.prepare(`
      INSERT INTO meal_plans (date, meal_type, title, recipe_url, ingredients, nutrition_info, portions, prep_time, assigned_cook)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    weekDays.forEach((day, index) => {
      const dayMeals = mealPlan[day] || {};
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + index);
      const dateStr = currentDate.toISOString().split('T')[0];

      ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(mealType => {
        const meal = dayMeals[mealType];
        if (meal && meal.title) {
          try {
            const result = insertMeal.run(
              dateStr,
              mealType,
              meal.title,
              meal.recipe_url || null,
              db.stringifyJSON(meal.ingredients || []),
              db.stringifyJSON(meal.nutrition_info || {}),
              db.stringifyJSON({ [req.user.id]: meal.servings || 4 }),
              meal.prep_time || null,
              req.user.id
            );

            const createdMeal = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(result.lastInsertRowid);
            createdMeal.ingredients = db.parseJSON(createdMeal.ingredients) || [];
            createdMeal.nutrition_info = db.parseJSON(createdMeal.nutrition_info) || {};
            createdMeal.portions = db.parseJSON(createdMeal.portions) || {};
            
            createdMeals.push(createdMeal);
          } catch (error) {
            console.error(`Error creating meal for ${day} ${mealType}:`, error);
          }
        }
      });
    });

    res.json({ 
      message: 'Meal plan synced successfully', 
      mealsCreated: createdMeals.length,
      meals: createdMeals 
    });
  } catch (error) {
    console.error('Sync AI meal plan error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sync meal to calendar as event
router.post('/:id/sync-to-calendar', auth, async (req, res) => {
  try {
    const mealId = req.params.id;
    const { syncType = 'prep' } = req.body; // 'prep', 'meal', or 'both'
    
    const meal = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(mealId);
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const mealDate = new Date(meal.date);
    const events = [];

    // Create meal prep event
    if (syncType === 'prep' || syncType === 'both') {
      const prepTime = meal.prep_time || 30;
      const prepStart = new Date(mealDate);
      
      // Schedule prep time before meal time based on meal type
      switch (meal.meal_type) {
        case 'breakfast':
          prepStart.setHours(7, 0, 0, 0);
          break;
        case 'lunch':
          prepStart.setHours(11, 30, 0, 0);
          break;
        case 'dinner':
          prepStart.setHours(17, 0, 0, 0);
          break;
        case 'snacks':
          prepStart.setHours(15, 0, 0, 0);
          break;
        default:
          prepStart.setHours(12, 0, 0, 0);
      }

      const prepEnd = new Date(prepStart);
      prepEnd.setMinutes(prepEnd.getMinutes() + prepTime);

      const prepEvent = {
        title: `Prep: ${meal.title}`,
        description: `Meal prep for ${meal.meal_type}${meal.recipe_url ? `\nRecipe: ${meal.recipe_url}` : ''}`,
        start: prepStart.toISOString(),
        end: prepEnd.toISOString(),
        type: 'meal_prep',
        meal_id: mealId
      };

      events.push(prepEvent);
    }

    // Create meal event
    if (syncType === 'meal' || syncType === 'both') {
      const mealStart = new Date(mealDate);
      
      // Set meal time based on meal type
      switch (meal.meal_type) {
        case 'breakfast':
          mealStart.setHours(8, 0, 0, 0);
          break;
        case 'lunch':
          mealStart.setHours(12, 0, 0, 0);
          break;
        case 'dinner':
          mealStart.setHours(18, 0, 0, 0);
          break;
        case 'snacks':
          mealStart.setHours(15, 30, 0, 0);
          break;
        default:
          mealStart.setHours(12, 0, 0, 0);
      }

      const mealEnd = new Date(mealStart);
      mealEnd.setMinutes(mealEnd.getMinutes() + 60); // 1 hour for eating

      const mealEvent = {
        title: meal.title,
        description: `${meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)} meal${meal.recipe_url ? `\nRecipe: ${meal.recipe_url}` : ''}`,
        start: mealStart.toISOString(),
        end: mealEnd.toISOString(),
        type: 'meal',
        meal_id: mealId
      };

      events.push(mealEvent);
    }

    // Insert calendar events into database
    const insertEvent = db.prepare(`
      INSERT INTO events (title, description, start_time, end_time, event_type, user_id, meal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const createdEvents = events.map(event => {
      const result = insertEvent.run(
        event.title,
        event.description,
        event.start,
        event.end,
        event.type,
        req.user.id,
        mealId
      );
      
      return {
        id: result.lastInsertRowid,
        ...event
      };
    });

    res.json({
      message: 'Meal synced to calendar successfully',
      events: createdEvents
    });
  } catch (error) {
    console.error('Sync meal to calendar error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// === MEAL LEARNING ENDPOINTS ===

// Record meal feedback
router.post('/:id/feedback', auth, async (req, res) => {
  try {
    const mealPlanId = req.params.id;
    const {
      familyMemberId,
      rating,
      likedIngredients = [],
      dislikedIngredients = [],
      comments = null,
      wouldRepeat = true
    } = req.body;

    // Validate required fields
    if (!familyMemberId || !rating) {
      return res.status(400).json({ message: 'Family member ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Verify meal plan exists
    const meal = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(mealPlanId);
    if (!meal) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    // Verify family member exists
    const familyMember = db.prepare('SELECT * FROM family_members WHERE id = ?').get(familyMemberId);
    if (!familyMember) {
      return res.status(400).json({ message: 'Invalid family member ID' });
    }

    const feedbackData = {
      mealPlanId,
      familyMemberId,
      rating,
      likedIngredients,
      dislikedIngredients,
      comments,
      wouldRepeat
    };

    const feedback = MealLearningService.recordMealFeedback(feedbackData);
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Record meal feedback error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark meal as completed
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const mealPlanId = req.params.id;
    const {
      dateServed,
      actuallyEaten = false,
      attendance = {},
      rating = null,
      prepTimeActual = null,
      leftovers = false,
      notes = null
    } = req.body;

    // Validate required fields
    if (!dateServed) {
      return res.status(400).json({ message: 'Date served is required' });
    }

    // Verify meal plan exists
    const meal = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(mealPlanId);
    if (!meal) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    const completionData = {
      mealPlanId,
      dateServed,
      actuallyEaten,
      attendance,
      rating,
      prepTimeActual,
      leftovers,
      notes
    };

    const completion = MealLearningService.recordMealCompletion(completionData);
    res.status(201).json(completion);
  } catch (error) {
    console.error('Mark meal complete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get meal history with feedback
router.get('/history', auth, async (req, res) => {
  try {
    const {
      startDate = null,
      endDate = null,
      mealType = null,
      familyMemberId = null,
      includeRatingOnly = false,
      limit = 100
    } = req.query;

    const options = {
      startDate,
      endDate,
      mealType,
      familyMemberId: familyMemberId ? parseInt(familyMemberId) : null,
      includeRatingOnly: includeRatingOnly === 'true',
      limit: parseInt(limit) || 100
    };

    const history = MealLearningService.getMealHistory(options);
    res.json(history);
  } catch (error) {
    console.error('Get meal history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get learned preferences for a family member
router.get('/preferences/:familyMemberId', auth, async (req, res) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const {
      includeIngredients = true,
      includeMealTypes = true,
      includePatterns = true,
      minOccurrences = 1
    } = req.query;

    // Verify family member exists
    const familyMember = db.prepare('SELECT * FROM family_members WHERE id = ?').get(familyMemberId);
    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    const options = {
      includeIngredients: includeIngredients !== 'false',
      includeMealTypes: includeMealTypes !== 'false',
      includePatterns: includePatterns !== 'false',
      minOccurrences: parseInt(minOccurrences) || 1
    };

    const preferences = MealLearningService.getFamilyMemberPreferences(familyMemberId, options);
    res.json(preferences);
  } catch (error) {
    console.error('Get family member preferences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get discovered eating patterns
router.get('/patterns', auth, async (req, res) => {
  try {
    const {
      patternType = null,
      minConfidence = 0.3,
      limit = 50
    } = req.query;

    const options = {
      patternType,
      minConfidence: parseFloat(minConfidence) || 0.3,
      limit: parseInt(limit) || 50
    };

    const patterns = MealLearningService.getMealPatterns(options);
    res.json(patterns);
  } catch (error) {
    console.error('Get meal patterns error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get meal success score prediction
router.post('/predict-success', auth, async (req, res) => {
  try {
    const {
      ingredients = [],
      mealType = 'dinner',
      familyMembers = [],
      date = null
    } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'Ingredients array is required' });
    }

    if (!Array.isArray(familyMembers) || familyMembers.length === 0) {
      return res.status(400).json({ message: 'Family members array is required' });
    }

    const mealData = {
      ingredients,
      mealType,
      familyMembers,
      date
    };

    const prediction = MealLearningService.calculateMealSuccessScore(mealData);
    res.json(prediction);
  } catch (error) {
    console.error('Predict meal success error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get family-wide ingredient preferences summary
router.get('/preferences/family/ingredients', auth, async (req, res) => {
  try {
    const summary = MealLearningService.getFamilyIngredientSummary();
    res.json(summary);
  } catch (error) {
    console.error('Get family ingredient summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get meal analytics dashboard data
router.get('/analytics', auth, async (req, res) => {
  try {
    const {
      startDate = null,
      endDate = null,
      familyMemberId = null
    } = req.query;

    // Get recent meal history
    const recentHistory = MealLearningService.getMealHistory({
      startDate,
      endDate,
      familyMemberId: familyMemberId ? parseInt(familyMemberId) : null,
      includeRatingOnly: true,
      limit: 50
    });

    // Get high-confidence patterns
    const patterns = MealLearningService.getMealPatterns({
      minConfidence: 0.5,
      limit: 20
    });

    // Get family ingredient summary
    const ingredientSummary = MealLearningService.getFamilyIngredientSummary();

    // Calculate basic statistics
    const totalMeals = recentHistory.length;
    const avgRating = totalMeals > 0 
      ? recentHistory.reduce((sum, meal) => sum + (meal.rating || meal.member_rating || 0), 0) / totalMeals 
      : 0;
    
    const mealTypeStats = recentHistory.reduce((acc, meal) => {
      acc[meal.meal_type] = (acc[meal.meal_type] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      period: { startDate, endDate },
      summary: {
        totalMeals,
        averageRating: Math.round(avgRating * 100) / 100,
        mealTypeBreakdown: mealTypeStats,
        totalPatterns: patterns.length,
        highConfidencePatterns: patterns.filter(p => p.confidence_score >= 0.7).length
      },
      recentHistory: recentHistory.slice(0, 10), // Last 10 meals
      topPatterns: patterns.slice(0, 5),
      ingredientInsights: {
        universalLoves: ingredientSummary.universalLoves.slice(0, 5),
        problematic: ingredientSummary.problematic.slice(0, 5),
        divisive: ingredientSummary.divisive.slice(0, 3)
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get meal analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// === MEAL CHAT AI ENDPOINT ===

// Chat endpoint for conversational meal planning
router.post('/chat', auth, async (req, res) => {
  try {
    const {
      message,
      conversationId,
      conversationHistory = [],
      context = {},
      parsedMessage = null
    } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'Message is required and must be non-empty' });
    }

    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    // Add user ID to context for personalization
    const contextWithUser = {
      ...context,
      userId: req.user.id,
      userName: req.user.name || 'Parent'
    };

    // Process the message through the AI conversation handler
    const response = await mealConversationAI.processMessage({
      message: message.trim(),
      conversationId,
      conversationHistory,
      context: contextWithUser,
      parsedMessage
    });

    // Log conversation for analytics (optional)
    const logEntry = {
      userId: req.user.id,
      conversationId,
      userMessage: message.trim(),
      aiResponse: response.response,
      intent: response.intent,
      confidence: response.confidence,
      suggestionsCount: response.mealSuggestions?.length || 0,
      timestamp: new Date().toISOString()
    };

    console.log('Meal chat interaction:', logEntry);

    // Return the AI response with suggestions
    res.json({
      response: response.response,
      mealSuggestions: response.mealSuggestions || [],
      structuredData: response.structuredData || null,
      conversationId,
      intent: response.intent,
      confidence: response.confidence,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Meal chat error:', error);
    
    // Return a helpful error response
    res.status(500).json({
      response: "I'm having trouble processing that request right now. Could you try rephrasing your question about meal planning?",
      mealSuggestions: [],
      structuredData: null,
      conversationId: req.body.conversationId,
      intent: 'error',
      confidence: 0,
      timestamp: Date.now(),
      error: true
    });
  }
});

// Get conversation history (for debugging/analysis)
router.get('/chat/conversations/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // In a real implementation, you might store conversation history in database
    // For now, return a simple response
    res.json({
      conversationId,
      message: 'Conversation history endpoint - implement database storage as needed',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Get conversation history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Clear conversation context (for privacy/cleanup)
router.delete('/chat/conversations/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // In a real implementation, you would clear stored conversation data
    console.log(`Clearing conversation context for: ${conversationId}`);
    
    res.json({
      message: 'Conversation context cleared',
      conversationId,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get chat analytics/stats
router.get('/chat/analytics', auth, async (req, res) => {
  try {
    const {
      startDate = null,
      endDate = null,
      limit = 50
    } = req.query;

    // This would query actual analytics from database in real implementation
    const mockAnalytics = {
      totalConversations: 15,
      totalMessages: 142,
      averageMessagesPerConversation: 9.5,
      topIntents: [
        { intent: 'plan_week', count: 8 },
        { intent: 'plan_day', count: 6 },
        { intent: 'provide_feedback', count: 4 },
        { intent: 'ask_question', count: 3 }
      ],
      totalSuggestions: 45,
      acceptedSuggestions: 23,
      acceptanceRate: 0.51,
      averageConfidence: 0.78,
      period: { startDate, endDate },
      generatedAt: new Date().toISOString()
    };

    res.json(mockAnalytics);
  } catch (error) {
    console.error('Get chat analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;