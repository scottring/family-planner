const db = require('../config/database');

/**
 * Meal Learning Service - Handles meal history tracking, preference learning, and pattern recognition
 * for AI-powered meal planning system
 */
class MealLearningService {
  
  /**
   * Record meal completion with attendance and basic feedback
   * @param {Object} completionData - Meal completion data
   * @returns {Object} Created meal history record
   */
  static recordMealCompletion(completionData) {
    const {
      mealPlanId,
      dateServed,
      actuallyEaten = false,
      attendance = {},
      rating = null,
      prepTimeActual = null,
      leftovers = false,
      notes = null
    } = completionData;

    try {
      // Insert meal history record
      const insertHistory = db.prepare(`
        INSERT INTO meal_history (
          meal_plan_id, date_served, actually_eaten, attendance, 
          rating, prep_time_actual, leftovers, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertHistory.run(
        mealPlanId,
        dateServed,
        actuallyEaten,
        db.stringifyJSON(attendance),
        rating,
        prepTimeActual,
        leftovers,
        notes
      );

      // Get the created record
      const record = db.prepare('SELECT * FROM meal_history WHERE id = ?').get(result.lastInsertRowid);
      record.attendance = db.parseJSON(record.attendance) || {};

      // Update meal patterns based on completion
      this.updateMealPatterns(mealPlanId, completionData);

      return record;
    } catch (error) {
      console.error('Error recording meal completion:', error);
      throw new Error('Failed to record meal completion');
    }
  }

  /**
   * Record detailed meal feedback from family members
   * @param {Object} feedbackData - Detailed feedback data
   * @returns {Object} Created feedback record
   */
  static recordMealFeedback(feedbackData) {
    const {
      mealPlanId,
      familyMemberId,
      rating,
      likedIngredients = [],
      dislikedIngredients = [],
      comments = null,
      wouldRepeat = true
    } = feedbackData;

    try {
      // Insert meal feedback
      const insertFeedback = db.prepare(`
        INSERT INTO meal_feedback (
          meal_plan_id, family_member_id, rating, liked_ingredients, 
          disliked_ingredients, comments, would_repeat
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertFeedback.run(
        mealPlanId,
        familyMemberId,
        rating,
        db.stringifyJSON(likedIngredients),
        db.stringifyJSON(dislikedIngredients),
        comments,
        wouldRepeat
      );

      // Get the created record
      const record = db.prepare('SELECT * FROM meal_feedback WHERE id = ?').get(result.lastInsertRowid);
      record.liked_ingredients = db.parseJSON(record.liked_ingredients) || [];
      record.disliked_ingredients = db.parseJSON(record.disliked_ingredients) || [];

      // Update ingredient preferences based on feedback
      this.updateIngredientPreferences(familyMemberId, likedIngredients, dislikedIngredients, rating);

      return record;
    } catch (error) {
      console.error('Error recording meal feedback:', error);
      throw new Error('Failed to record meal feedback');
    }
  }

  /**
   * Update ingredient preferences for a family member based on feedback
   * @param {number} familyMemberId - ID of family member
   * @param {string[]} likedIngredients - Ingredients they liked
   * @param {string[]} dislikedIngredients - Ingredients they disliked
   * @param {number} rating - Overall meal rating (1-5)
   */
  static updateIngredientPreferences(familyMemberId, likedIngredients, dislikedIngredients, rating) {
    try {
      // Calculate preference score adjustment based on rating
      const baseScore = (rating - 3) * 10; // -20 to +20 range
      
      // Update liked ingredients (positive adjustment)
      likedIngredients.forEach(ingredient => {
        const positiveScore = baseScore > 0 ? baseScore + 15 : 10; // At least +10 for liked
        this.upsertIngredientPreference(familyMemberId, ingredient, positiveScore);
      });

      // Update disliked ingredients (negative adjustment)
      dislikedIngredients.forEach(ingredient => {
        const negativeScore = baseScore < 0 ? baseScore - 15 : -10; // At least -10 for disliked
        this.upsertIngredientPreference(familyMemberId, ingredient, negativeScore);
      });
    } catch (error) {
      console.error('Error updating ingredient preferences:', error);
    }
  }

  /**
   * Insert or update ingredient preference for a family member
   * @param {number} familyMemberId - ID of family member
   * @param {string} ingredient - Ingredient name
   * @param {number} scoreAdjustment - Score adjustment to apply
   */
  static upsertIngredientPreference(familyMemberId, ingredient, scoreAdjustment) {
    try {
      // Try to get existing preference
      const existing = db.prepare(`
        SELECT * FROM family_meal_preferences 
        WHERE family_member_id = ? AND ingredient = ?
      `).get(familyMemberId, ingredient);

      if (existing) {
        // Update existing preference
        const newScore = Math.max(-100, Math.min(100, existing.preference_score + scoreAdjustment));
        db.prepare(`
          UPDATE family_meal_preferences 
          SET preference_score = ?, last_updated = CURRENT_TIMESTAMP, occurrence_count = occurrence_count + 1
          WHERE family_member_id = ? AND ingredient = ?
        `).run(newScore, familyMemberId, ingredient);
      } else {
        // Create new preference
        const initialScore = Math.max(-100, Math.min(100, scoreAdjustment));
        db.prepare(`
          INSERT INTO family_meal_preferences (family_member_id, ingredient, preference_score)
          VALUES (?, ?, ?)
        `).run(familyMemberId, ingredient, initialScore);
      }
    } catch (error) {
      console.error('Error upserting ingredient preference:', error);
    }
  }

  /**
   * Get meal history with feedback for analysis
   * @param {Object} options - Query options
   * @returns {Array} Meal history records with feedback
   */
  static getMealHistory(options = {}) {
    const {
      startDate = null,
      endDate = null,
      mealType = null,
      familyMemberId = null,
      includeRatingOnly = false,
      limit = 100
    } = options;

    try {
      let query = `
        SELECT 
          mh.*,
          mp.title, mp.meal_type, mp.ingredients as meal_ingredients,
          mp.nutrition_info, mp.date as planned_date,
          fm.name as family_member_name,
          mf.rating as member_rating, mf.liked_ingredients, mf.disliked_ingredients,
          mf.comments, mf.would_repeat
        FROM meal_history mh
        JOIN meal_plans mp ON mh.meal_plan_id = mp.id
        LEFT JOIN meal_feedback mf ON mh.meal_plan_id = mf.meal_plan_id
        LEFT JOIN family_members fm ON mf.family_member_id = fm.id
        WHERE 1=1
      `;

      const params = [];

      if (startDate) {
        query += ' AND mh.date_served >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND mh.date_served <= ?';
        params.push(endDate);
      }

      if (mealType) {
        query += ' AND mp.meal_type = ?';
        params.push(mealType);
      }

      if (familyMemberId) {
        query += ' AND mf.family_member_id = ?';
        params.push(familyMemberId);
      }

      if (includeRatingOnly) {
        query += ' AND (mh.rating IS NOT NULL OR mf.rating IS NOT NULL)';
      }

      query += ' ORDER BY mh.date_served DESC, mh.created_at DESC';
      
      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      const records = db.prepare(query).all(...params);

      // Parse JSON fields
      records.forEach(record => {
        record.attendance = db.parseJSON(record.attendance) || {};
        record.meal_ingredients = db.parseJSON(record.meal_ingredients) || [];
        record.nutrition_info = db.parseJSON(record.nutrition_info) || {};
        record.liked_ingredients = db.parseJSON(record.liked_ingredients) || [];
        record.disliked_ingredients = db.parseJSON(record.disliked_ingredients) || [];
      });

      return records;
    } catch (error) {
      console.error('Error getting meal history:', error);
      throw new Error('Failed to retrieve meal history');
    }
  }

  /**
   * Get learned preferences for a family member
   * @param {number} familyMemberId - ID of family member
   * @param {Object} options - Query options
   * @returns {Object} Preference analysis
   */
  static getFamilyMemberPreferences(familyMemberId, options = {}) {
    const {
      includeIngredients = true,
      includeMealTypes = true,
      includePatterns = true,
      minOccurrences = 1
    } = options;

    try {
      const preferences = {
        familyMemberId,
        ingredients: {},
        mealTypes: {},
        patterns: {}
      };

      // Get ingredient preferences
      if (includeIngredients) {
        const ingredientPrefs = db.prepare(`
          SELECT ingredient, preference_score, occurrence_count, last_updated
          FROM family_meal_preferences
          WHERE family_member_id = ? AND occurrence_count >= ?
          ORDER BY preference_score DESC
        `).all(familyMemberId, minOccurrences);

        preferences.ingredients = {
          loved: ingredientPrefs.filter(p => p.preference_score >= 50),
          liked: ingredientPrefs.filter(p => p.preference_score >= 20 && p.preference_score < 50),
          neutral: ingredientPrefs.filter(p => p.preference_score > -20 && p.preference_score < 20),
          disliked: ingredientPrefs.filter(p => p.preference_score <= -20 && p.preference_score > -50),
          hated: ingredientPrefs.filter(p => p.preference_score <= -50)
        };
      }

      // Get meal type preferences from feedback
      if (includeMealTypes) {
        const mealTypePrefs = db.prepare(`
          SELECT 
            mp.meal_type,
            AVG(mf.rating) as avg_rating,
            COUNT(*) as meal_count,
            SUM(CASE WHEN mf.would_repeat = 1 THEN 1 ELSE 0 END) as would_repeat_count
          FROM meal_feedback mf
          JOIN meal_plans mp ON mf.meal_plan_id = mp.id
          WHERE mf.family_member_id = ?
          GROUP BY mp.meal_type
          ORDER BY avg_rating DESC
        `).all(familyMemberId);

        preferences.mealTypes = mealTypePrefs.map(mt => ({
          ...mt,
          repeat_percentage: (mt.would_repeat_count / mt.meal_count * 100).toFixed(1)
        }));
      }

      // Get meal patterns relevant to this family member
      if (includePatterns) {
        preferences.patterns = this.getMealPatternsForMember(familyMemberId);
      }

      return preferences;
    } catch (error) {
      console.error('Error getting family member preferences:', error);
      throw new Error('Failed to retrieve family member preferences');
    }
  }

  /**
   * Calculate meal success scores based on historical data
   * @param {Object} mealData - Meal data to score
   * @returns {Object} Success score analysis
   */
  static calculateMealSuccessScore(mealData) {
    const {
      ingredients = [],
      mealType = 'dinner',
      familyMembers = [],
      date = null
    } = mealData;

    try {
      let totalScore = 50; // Base score
      let confidence = 0.1; // Start with low confidence
      const factors = {
        ingredientPreferences: 0,
        historicalRatings: 0,
        seasonalFit: 0,
        familyConsensus: 0
      };

      // Analyze ingredient preferences for each family member
      if (familyMembers.length > 0 && ingredients.length > 0) {
        let memberScores = [];
        
        familyMembers.forEach(memberId => {
          let memberScore = 0;
          let memberConfidence = 0;
          
          ingredients.forEach(ingredient => {
            const pref = db.prepare(`
              SELECT preference_score, occurrence_count
              FROM family_meal_preferences
              WHERE family_member_id = ? AND ingredient = ?
            `).get(memberId, ingredient);
            
            if (pref) {
              memberScore += pref.preference_score;
              memberConfidence += Math.min(pref.occurrence_count, 10) / 10;
            }
          });
          
          memberScores.push({
            memberId,
            score: memberScore / ingredients.length,
            confidence: memberConfidence / ingredients.length
          });
        });
        
        // Calculate average family score
        const avgScore = memberScores.reduce((sum, ms) => sum + ms.score, 0) / memberScores.length;
        const avgConfidence = memberScores.reduce((sum, ms) => sum + ms.confidence, 0) / memberScores.length;
        
        factors.ingredientPreferences = avgScore;
        confidence += avgConfidence * 0.4; // Weight ingredient confidence highly
      }

      // Analyze historical ratings for similar meals
      const similarMeals = db.prepare(`
        SELECT AVG(mf.rating) as avg_rating, COUNT(*) as count
        FROM meal_feedback mf
        JOIN meal_plans mp ON mf.meal_plan_id = mp.id
        WHERE mp.meal_type = ? AND mp.ingredients LIKE ?
      `).get(mealType, `%${ingredients[0] || ''}%`);

      if (similarMeals && similarMeals.count > 0) {
        factors.historicalRatings = (similarMeals.avg_rating - 3) * 15; // Convert 1-5 to -30 to +30
        confidence += Math.min(similarMeals.count, 10) / 10 * 0.3;
      }

      // Seasonal fitness (basic implementation)
      if (date) {
        const month = new Date(date).getMonth();
        const season = Math.floor(month / 3); // 0=winter, 1=spring, 2=summer, 3=fall
        
        // Simple seasonal preferences (could be enhanced with actual data)
        const seasonalIngredients = {
          0: ['soup', 'stew', 'roast', 'hot'], // winter
          1: ['fresh', 'salad', 'light'], // spring
          2: ['grill', 'cold', 'fresh', 'salad'], // summer
          3: ['harvest', 'warm', 'spice'] // fall
        };
        
        const seasonalMatch = ingredients.some(ingredient => 
          seasonalIngredients[season].some(seasonal => 
            ingredient.toLowerCase().includes(seasonal)
          )
        );
        
        factors.seasonalFit = seasonalMatch ? 10 : -5;
        confidence += 0.1;
      }

      // Calculate final score
      totalScore += factors.ingredientPreferences + factors.historicalRatings + factors.seasonalFit;
      totalScore = Math.max(0, Math.min(100, totalScore));
      confidence = Math.max(0.1, Math.min(1.0, confidence));

      return {
        score: Math.round(totalScore),
        confidence: Math.round(confidence * 100) / 100,
        factors,
        recommendation: this.getRecommendationText(totalScore, confidence)
      };
    } catch (error) {
      console.error('Error calculating meal success score:', error);
      return {
        score: 50,
        confidence: 0.1,
        factors: {},
        recommendation: 'Insufficient data for accurate prediction'
      };
    }
  }

  /**
   * Update meal patterns based on meal completion data
   * @param {number} mealPlanId - Meal plan ID
   * @param {Object} completionData - Completion data
   */
  static updateMealPatterns(mealPlanId, completionData) {
    try {
      // Get meal details
      const meal = db.prepare(`
        SELECT mp.*, mh.rating, mh.actually_eaten
        FROM meal_plans mp
        LEFT JOIN meal_history mh ON mp.id = mh.meal_plan_id
        WHERE mp.id = ?
      `).get(mealPlanId);

      if (!meal) return;

      const date = new Date(completionData.dateServed);
      const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
      const rating = completionData.rating || meal.rating;

      // Weekly pattern
      if (rating && rating >= 4) {
        const weeklyPatternData = {
          dayOfWeek,
          mealType: meal.meal_type,
          success: true
        };
        
        this.upsertMealPattern('weekly', weeklyPatternData, 0.1);
      }

      // Meal timing pattern
      const hour = date.getHours();
      if (meal.meal_type && rating && rating >= 4) {
        const timingPatternData = {
          mealType: meal.meal_type,
          preferredHour: hour,
          success: true
        };
        
        this.upsertMealPattern('meal-timing', timingPatternData, 0.05);
      }

      // Ingredient combination patterns
      const ingredients = db.parseJSON(meal.ingredients) || [];
      if (ingredients.length >= 2 && rating && rating >= 4) {
        // Create pattern for successful ingredient combinations
        const comboPatternData = {
          ingredients: ingredients.sort(),
          mealType: meal.meal_type,
          rating: rating
        };
        
        this.upsertMealPattern('ingredient-combo', comboPatternData, 0.15);
      }
    } catch (error) {
      console.error('Error updating meal patterns:', error);
    }
  }

  /**
   * Insert or update a meal pattern
   * @param {string} patternType - Type of pattern
   * @param {Object} patternData - Pattern data
   * @param {number} confidenceIncrement - How much to increase confidence
   */
  static upsertMealPattern(patternType, patternData, confidenceIncrement = 0.1) {
    try {
      const patternKey = JSON.stringify(patternData);
      
      // Try to find existing pattern
      const existing = db.prepare(`
        SELECT * FROM meal_patterns
        WHERE pattern_type = ? AND pattern_data = ?
      `).get(patternType, patternKey);

      if (existing) {
        // Update existing pattern
        const newConfidence = Math.min(1.0, existing.confidence_score + confidenceIncrement);
        db.prepare(`
          UPDATE meal_patterns
          SET confidence_score = ?, last_observed = CURRENT_TIMESTAMP, observation_count = observation_count + 1
          WHERE id = ?
        `).run(newConfidence, existing.id);
      } else {
        // Create new pattern
        db.prepare(`
          INSERT INTO meal_patterns (pattern_type, pattern_data, confidence_score)
          VALUES (?, ?, ?)
        `).run(patternType, patternKey, confidenceIncrement);
      }
    } catch (error) {
      console.error('Error upserting meal pattern:', error);
    }
  }

  /**
   * Get discovered eating patterns
   * @param {Object} options - Query options
   * @returns {Array} Meal patterns
   */
  static getMealPatterns(options = {}) {
    const {
      patternType = null,
      minConfidence = 0.3,
      limit = 50
    } = options;

    try {
      let query = `
        SELECT * FROM meal_patterns
        WHERE confidence_score >= ?
      `;
      const params = [minConfidence];

      if (patternType) {
        query += ' AND pattern_type = ?';
        params.push(patternType);
      }

      query += ' ORDER BY confidence_score DESC, observation_count DESC';
      
      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      const patterns = db.prepare(query).all(...params);
      
      // Parse pattern data
      patterns.forEach(pattern => {
        pattern.pattern_data = db.parseJSON(pattern.pattern_data) || {};
      });

      return patterns;
    } catch (error) {
      console.error('Error getting meal patterns:', error);
      throw new Error('Failed to retrieve meal patterns');
    }
  }

  /**
   * Get meal patterns relevant to a specific family member
   * @param {number} familyMemberId - Family member ID
   * @returns {Array} Relevant patterns
   */
  static getMealPatternsForMember(familyMemberId) {
    try {
      // Get patterns based on member's feedback history
      const memberMealTypes = db.prepare(`
        SELECT DISTINCT mp.meal_type
        FROM meal_feedback mf
        JOIN meal_plans mp ON mf.meal_plan_id = mp.id
        WHERE mf.family_member_id = ? AND mf.rating >= 4
      `).all(familyMemberId);

      if (memberMealTypes.length === 0) {
        return [];
      }

      const mealTypes = memberMealTypes.map(mt => mt.meal_type);
      const placeholders = mealTypes.map(() => '?').join(',');
      
      const patterns = db.prepare(`
        SELECT * FROM meal_patterns
        WHERE confidence_score >= 0.3
        AND (
          pattern_type = 'weekly'
          OR pattern_type = 'meal-timing'
          OR (pattern_type = 'ingredient-combo' AND JSON_EXTRACT(pattern_data, '$.mealType') IN (${placeholders}))
        )
        ORDER BY confidence_score DESC
      `).all(...mealTypes);

      // Parse pattern data
      patterns.forEach(pattern => {
        pattern.pattern_data = db.parseJSON(pattern.pattern_data) || {};
      });

      return patterns;
    } catch (error) {
      console.error('Error getting member meal patterns:', error);
      return [];
    }
  }

  /**
   * Generate recommendation text based on score and confidence
   * @param {number} score - Success score (0-100)
   * @param {number} confidence - Confidence level (0-1)
   * @returns {string} Recommendation text
   */
  static getRecommendationText(score, confidence) {
    if (confidence < 0.3) {
      return 'Limited data available - consider this an experimental choice';
    }
    
    if (score >= 80) {
      return 'Highly recommended - family likely to love this meal';
    } else if (score >= 65) {
      return 'Good choice - most family members should enjoy this';
    } else if (score >= 50) {
      return 'Moderate choice - mixed reactions expected';
    } else if (score >= 35) {
      return 'Risky choice - consider alternatives based on family preferences';
    } else {
      return 'Not recommended - likely poor reception based on family history';
    }
  }

  /**
   * Get ingredient preferences summary for all family members
   * @returns {Object} Family-wide ingredient analysis
   */
  static getFamilyIngredientSummary() {
    try {
      const summary = db.prepare(`
        SELECT 
          ingredient,
          AVG(preference_score) as avg_score,
          COUNT(*) as member_count,
          SUM(occurrence_count) as total_occurrences,
          MIN(preference_score) as min_score,
          MAX(preference_score) as max_score
        FROM family_meal_preferences
        GROUP BY ingredient
        HAVING member_count > 1 OR total_occurrences > 3
        ORDER BY avg_score DESC
      `).all();

      return {
        universalLoves: summary.filter(s => s.avg_score >= 50 && s.min_score >= 20),
        familyFavorites: summary.filter(s => s.avg_score >= 30 && s.avg_score < 50),
        neutral: summary.filter(s => s.avg_score > -20 && s.avg_score < 30),
        problematic: summary.filter(s => s.avg_score <= -20 || s.min_score <= -50),
        divisive: summary.filter(s => (s.max_score - s.min_score) >= 60) // High variance
      };
    } catch (error) {
      console.error('Error getting family ingredient summary:', error);
      throw new Error('Failed to retrieve family ingredient summary');
    }
  }
}

module.exports = MealLearningService;