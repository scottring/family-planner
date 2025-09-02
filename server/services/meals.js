const db = require('../config/database');

class MealsService {
  /**
   * Generate shopping list from meals in a date range
   */
  generateShoppingList(startDate, endDate) {
    try {
      const meals = db.prepare(`
        SELECT ingredients FROM meal_plans 
        WHERE date >= ? AND date <= ?
      `).all(startDate, endDate);

      const ingredientMap = new Map();
      
      meals.forEach(meal => {
        const ingredients = db.parseJSON(meal.ingredients) || [];
        
        ingredients.forEach(ingredient => {
          const key = ingredient.name?.toLowerCase() || '';
          if (key) {
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity += ingredient.quantity || 0;
              existing.sources.add(ingredient.mealTitle || 'Unknown meal');
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity || 0,
                unit: ingredient.unit || '',
                category: ingredient.category || 'Other',
                sources: new Set([ingredient.mealTitle || 'Unknown meal'])
              });
            }
          }
        });
      });

      // Organize by store sections
      const organizedList = {
        'Produce': [],
        'Dairy & Eggs': [],
        'Meat & Seafood': [],
        'Pantry': [],
        'Frozen': [],
        'Bakery': [],
        'Other': []
      };

      ingredientMap.forEach((ingredient, key) => {
        const item = {
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          sources: Array.from(ingredient.sources),
          checked: false
        };

        // Categorize ingredients
        const category = this.categorizeIngredient(ingredient.name, ingredient.category);
        if (organizedList[category]) {
          organizedList[category].push(item);
        } else {
          organizedList['Other'].push(item);
        }
      });

      // Remove empty categories and sort items
      Object.keys(organizedList).forEach(category => {
        organizedList[category] = organizedList[category].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        if (organizedList[category].length === 0) {
          delete organizedList[category];
        }
      });

      return {
        dateRange: { startDate, endDate },
        categories: organizedList,
        totalItems: ingredientMap.size,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Generate shopping list error:', error);
      throw error;
    }
  }

  /**
   * Categorize ingredient for shopping list organization
   */
  categorizeIngredient(name, providedCategory) {
    if (providedCategory && providedCategory !== 'Other') {
      return providedCategory;
    }

    const lowerName = name.toLowerCase();
    
    // Produce
    if (this.isInCategory(lowerName, ['lettuce', 'tomato', 'onion', 'garlic', 'carrot', 'celery', 'bell pepper', 
                                     'broccoli', 'spinach', 'cucumber', 'apple', 'banana', 'lemon', 'lime',
                                     'orange', 'potato', 'sweet potato', 'mushroom', 'avocado', 'herbs',
                                     'parsley', 'basil', 'cilantro', 'thyme', 'rosemary'])) {
      return 'Produce';
    }
    
    // Dairy & Eggs
    if (this.isInCategory(lowerName, ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'sour cream',
                                     'cottage cheese', 'mozzarella', 'cheddar', 'parmesan'])) {
      return 'Dairy & Eggs';
    }
    
    // Meat & Seafood
    if (this.isInCategory(lowerName, ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey',
                                     'bacon', 'ham', 'ground beef', 'ground turkey'])) {
      return 'Meat & Seafood';
    }
    
    // Pantry
    if (this.isInCategory(lowerName, ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil',
                                     'vinegar', 'soy sauce', 'olive oil', 'canned', 'beans', 'sauce',
                                     'spices', 'honey', 'maple syrup'])) {
      return 'Pantry';
    }
    
    // Frozen
    if (this.isInCategory(lowerName, ['frozen', 'ice cream', 'frozen vegetables', 'frozen fruit'])) {
      return 'Frozen';
    }
    
    // Bakery
    if (this.isInCategory(lowerName, ['bread', 'bagel', 'roll', 'tortilla', 'pita', 'croissant'])) {
      return 'Bakery';
    }
    
    return 'Other';
  }

  /**
   * Helper function to check if ingredient belongs to category
   */
  isInCategory(name, keywords) {
    return keywords.some(keyword => name.includes(keyword));
  }

  /**
   * Generate AI-powered meal suggestions
   */
  async generateMealSuggestions({ preferences = {}, excludeDates = [], mealType = null, servings = 4, userId }) {
    try {
      // Get family dietary preferences
      const familyPrefs = this.getFamilyDietaryPreferences();
      
      // Get recent meals to avoid repetition
      const recentMeals = this.getRecentMeals(userId, 14);
      const recentTitles = recentMeals.map(meal => meal.title.toLowerCase());
      
      // Get seasonal suggestions
      const seasonalSuggestions = this.getSeasonalMealSuggestions();
      
      // Mock AI suggestions (in real implementation, this would call OpenAI API)
      const allSuggestions = this.getMockMealDatabase();
      
      // Filter suggestions based on criteria
      let filteredSuggestions = allSuggestions.filter(suggestion => {
        // Filter by meal type if specified
        if (mealType && suggestion.meal_type !== mealType) {
          return false;
        }
        
        // Avoid recent meals
        if (recentTitles.includes(suggestion.title.toLowerCase())) {
          return false;
        }
        
        // Check dietary restrictions
        if (familyPrefs.isVegetarian && !suggestion.isVegetarian) {
          return false;
        }
        
        if (familyPrefs.isGlutenFree && !suggestion.isGlutenFree) {
          return false;
        }
        
        if (familyPrefs.isDairyFree && !suggestion.isDairyFree) {
          return false;
        }
        
        return true;
      });
      
      // Add seasonal boost
      filteredSuggestions = filteredSuggestions.map(suggestion => ({
        ...suggestion,
        seasonalScore: seasonalSuggestions.includes(suggestion.title) ? 1.2 : 1.0
      }));
      
      // Sort by popularity and seasonal score
      filteredSuggestions.sort((a, b) => 
        (b.popularity * b.seasonalScore) - (a.popularity * a.seasonalScore)
      );
      
      // Return top suggestions
      return filteredSuggestions.slice(0, 12).map(suggestion => ({
        title: suggestion.title,
        meal_type: suggestion.meal_type,
        prep_time: suggestion.prep_time,
        servings: suggestion.servings,
        ingredients: this.adjustIngredients(suggestion.ingredients, servings),
        nutrition_info: suggestion.nutrition_info,
        tags: suggestion.tags,
        difficulty: suggestion.difficulty,
        image_url: suggestion.image_url,
        recipe_url: suggestion.recipe_url,
        description: suggestion.description
      }));
    } catch (error) {
      console.error('Generate meal suggestions error:', error);
      throw error;
    }
  }

  /**
   * Get family dietary preferences from database
   */
  getFamilyDietaryPreferences() {
    try {
      const members = db.prepare('SELECT dietary_preferences FROM family_members').all();
      
      let isVegetarian = false;
      let isVegan = false;
      let isGlutenFree = false;
      let isDairyFree = false;
      const allergies = new Set();
      
      members.forEach(member => {
        const prefs = db.parseJSON(member.dietary_preferences) || {};
        if (prefs.vegetarian) isVegetarian = true;
        if (prefs.vegan) isVegan = true;
        if (prefs.glutenFree) isGlutenFree = true;
        if (prefs.dairyFree) isDairyFree = true;
        if (prefs.allergies) {
          prefs.allergies.forEach(allergy => allergies.add(allergy));
        }
      });
      
      return {
        isVegetarian,
        isVegan,
        isGlutenFree,
        isDairyFree,
        allergies: Array.from(allergies)
      };
    } catch (error) {
      console.error('Get family preferences error:', error);
      return {};
    }
  }

  /**
   * Get recent meals to avoid repetition
   */
  getRecentMeals(userId, days = 14) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return db.prepare(`
        SELECT title FROM meal_plans 
        WHERE date >= ? 
        ORDER BY date DESC
      `).all(cutoffDate.toISOString().split('T')[0]);
    } catch (error) {
      console.error('Get recent meals error:', error);
      return [];
    }
  }

  /**
   * Get seasonal meal suggestions
   */
  getSeasonalMealSuggestions() {
    const month = new Date().getMonth();
    
    // Spring (March-May)
    if (month >= 2 && month <= 4) {
      return ['Fresh Spring Salad', 'Asparagus Risotto', 'Lemon Herb Chicken', 'Strawberry Spinach Salad'];
    }
    
    // Summer (June-August)
    if (month >= 5 && month <= 7) {
      return ['Grilled Vegetables', 'Gazpacho', 'BBQ Chicken', 'Caprese Salad', 'Fresh Corn Salad'];
    }
    
    // Fall (September-November)
    if (month >= 8 && month <= 10) {
      return ['Pumpkin Soup', 'Roasted Root Vegetables', 'Apple Cider Pork', 'Butternut Squash Risotto'];
    }
    
    // Winter (December-February)
    return ['Beef Stew', 'Chicken Soup', 'Chili', 'Pot Roast', 'Hot Chocolate'];
  }

  /**
   * Mock meal database (in real app, this would be a comprehensive database)
   */
  getMockMealDatabase() {
    return [
      {
        title: 'Grilled Chicken Caesar Salad',
        meal_type: 'lunch',
        prep_time: 20,
        servings: 4,
        popularity: 0.9,
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        difficulty: 'Easy',
        tags: ['healthy', 'protein', 'salad'],
        ingredients: [
          { name: 'Chicken breast', quantity: 1, unit: 'lb', category: 'Meat & Seafood' },
          { name: 'Romaine lettuce', quantity: 2, unit: 'heads', category: 'Produce' },
          { name: 'Caesar dressing', quantity: 0.5, unit: 'cup', category: 'Pantry' },
          { name: 'Parmesan cheese', quantity: 0.5, unit: 'cup', category: 'Dairy & Eggs' },
          { name: 'Croutons', quantity: 1, unit: 'cup', category: 'Pantry' }
        ],
        nutrition_info: { calories: 350, protein: 35, carbs: 12, fat: 18 },
        description: 'A classic Caesar salad with grilled chicken breast'
      },
      {
        title: 'Spaghetti Carbonara',
        meal_type: 'dinner',
        prep_time: 25,
        servings: 4,
        popularity: 0.8,
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        difficulty: 'Medium',
        tags: ['pasta', 'italian', 'comfort'],
        ingredients: [
          { name: 'Spaghetti', quantity: 1, unit: 'lb', category: 'Pantry' },
          { name: 'Bacon', quantity: 6, unit: 'strips', category: 'Meat & Seafood' },
          { name: 'Eggs', quantity: 3, unit: 'large', category: 'Dairy & Eggs' },
          { name: 'Parmesan cheese', quantity: 1, unit: 'cup', category: 'Dairy & Eggs' },
          { name: 'Black pepper', quantity: 1, unit: 'tsp', category: 'Pantry' }
        ],
        nutrition_info: { calories: 520, protein: 22, carbs: 65, fat: 18 },
        description: 'Creamy Italian pasta with bacon and eggs'
      },
      {
        title: 'Vegetarian Buddha Bowl',
        meal_type: 'lunch',
        prep_time: 30,
        servings: 2,
        popularity: 0.7,
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        isDairyFree: true,
        difficulty: 'Easy',
        tags: ['healthy', 'vegetarian', 'vegan', 'bowl'],
        ingredients: [
          { name: 'Quinoa', quantity: 1, unit: 'cup', category: 'Pantry' },
          { name: 'Sweet potato', quantity: 2, unit: 'medium', category: 'Produce' },
          { name: 'Broccoli', quantity: 2, unit: 'cups', category: 'Produce' },
          { name: 'Avocado', quantity: 1, unit: 'medium', category: 'Produce' },
          { name: 'Tahini', quantity: 3, unit: 'tbsp', category: 'Pantry' }
        ],
        nutrition_info: { calories: 420, protein: 12, carbs: 58, fat: 16 },
        description: 'Nutritious bowl with quinoa, roasted vegetables, and tahini dressing'
      },
      {
        title: 'Taco Tuesday',
        meal_type: 'dinner',
        prep_time: 20,
        servings: 6,
        popularity: 0.9,
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: true,
        isDairyFree: false,
        difficulty: 'Easy',
        tags: ['mexican', 'family-friendly', 'quick'],
        ingredients: [
          { name: 'Ground beef', quantity: 1, unit: 'lb', category: 'Meat & Seafood' },
          { name: 'Corn tortillas', quantity: 12, unit: 'pieces', category: 'Pantry' },
          { name: 'Lettuce', quantity: 1, unit: 'head', category: 'Produce' },
          { name: 'Tomatoes', quantity: 2, unit: 'medium', category: 'Produce' },
          { name: 'Cheese', quantity: 1, unit: 'cup', category: 'Dairy & Eggs' },
          { name: 'Taco seasoning', quantity: 1, unit: 'packet', category: 'Pantry' }
        ],
        nutrition_info: { calories: 380, protein: 25, carbs: 28, fat: 18 },
        description: 'Family favorite tacos with seasoned ground beef'
      },
      {
        title: 'Pancakes with Berries',
        meal_type: 'breakfast',
        prep_time: 15,
        servings: 4,
        popularity: 0.8,
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        difficulty: 'Easy',
        tags: ['breakfast', 'sweet', 'family-friendly'],
        ingredients: [
          { name: 'Flour', quantity: 2, unit: 'cups', category: 'Pantry' },
          { name: 'Eggs', quantity: 2, unit: 'large', category: 'Dairy & Eggs' },
          { name: 'Milk', quantity: 1.5, unit: 'cups', category: 'Dairy & Eggs' },
          { name: 'Butter', quantity: 4, unit: 'tbsp', category: 'Dairy & Eggs' },
          { name: 'Mixed berries', quantity: 1, unit: 'cup', category: 'Produce' },
          { name: 'Maple syrup', quantity: 0.5, unit: 'cup', category: 'Pantry' }
        ],
        nutrition_info: { calories: 320, protein: 8, carbs: 52, fat: 8 },
        description: 'Fluffy pancakes topped with fresh berries and maple syrup'
      },
      {
        title: 'Mediterranean Salmon',
        meal_type: 'dinner',
        prep_time: 25,
        servings: 4,
        popularity: 0.7,
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: true,
        isDairyFree: false,
        difficulty: 'Medium',
        tags: ['healthy', 'fish', 'mediterranean'],
        ingredients: [
          { name: 'Salmon fillets', quantity: 4, unit: 'pieces', category: 'Meat & Seafood' },
          { name: 'Olive oil', quantity: 3, unit: 'tbsp', category: 'Pantry' },
          { name: 'Lemon', quantity: 2, unit: 'medium', category: 'Produce' },
          { name: 'Cherry tomatoes', quantity: 2, unit: 'cups', category: 'Produce' },
          { name: 'Olives', quantity: 0.5, unit: 'cup', category: 'Pantry' },
          { name: 'Feta cheese', quantity: 0.5, unit: 'cup', category: 'Dairy & Eggs' }
        ],
        nutrition_info: { calories: 420, protein: 35, carbs: 8, fat: 28 },
        description: 'Baked salmon with Mediterranean flavors and vegetables'
      },
      {
        title: 'Chicken Stir Fry',
        meal_type: 'dinner',
        prep_time: 20,
        servings: 4,
        popularity: 0.8,
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: true,
        difficulty: 'Easy',
        tags: ['asian', 'quick', 'healthy'],
        ingredients: [
          { name: 'Chicken breast', quantity: 1, unit: 'lb', category: 'Meat & Seafood' },
          { name: 'Mixed vegetables', quantity: 4, unit: 'cups', category: 'Frozen' },
          { name: 'Soy sauce', quantity: 3, unit: 'tbsp', category: 'Pantry' },
          { name: 'Garlic', quantity: 3, unit: 'cloves', category: 'Produce' },
          { name: 'Ginger', quantity: 1, unit: 'tbsp', category: 'Produce' },
          { name: 'Rice', quantity: 2, unit: 'cups', category: 'Pantry' }
        ],
        nutrition_info: { calories: 380, protein: 28, carbs: 45, fat: 8 },
        description: 'Quick and healthy chicken stir fry with vegetables over rice'
      }
    ];
  }

  /**
   * Adjust ingredient quantities based on servings
   */
  adjustIngredients(ingredients, targetServings) {
    const baseServings = 4; // Most recipes are for 4 servings
    const multiplier = targetServings / baseServings;
    
    return ingredients.map(ingredient => ({
      ...ingredient,
      quantity: Math.round(ingredient.quantity * multiplier * 100) / 100 // Round to 2 decimal places
    }));
  }

  /**
   * Calculate nutrition totals for a day/week
   */
  calculateNutritionTotals(meals) {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };

    meals.forEach(meal => {
      const nutrition = db.parseJSON(meal.nutrition_info) || {};
      Object.keys(totals).forEach(key => {
        totals[key] += nutrition[key] || 0;
      });
    });

    return totals;
  }

  /**
   * Get meal history for pattern analysis
   */
  getMealHistory(userId, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const meals = db.prepare(`
        SELECT * FROM meal_plans 
        WHERE date >= ? AND assigned_cook = ?
        ORDER BY date DESC
      `).all(cutoffDate.toISOString().split('T')[0], userId);
      
      meals.forEach(meal => {
        meal.ingredients = db.parseJSON(meal.ingredients) || [];
        meal.nutrition_info = db.parseJSON(meal.nutrition_info) || {};
        meal.portions = db.parseJSON(meal.portions) || {};
      });
      
      return meals;
    } catch (error) {
      console.error('Get meal history error:', error);
      return [];
    }
  }

  /**
   * Generate weekly meal plan template
   */
  generateWeeklyTemplate(preferences = {}) {
    const template = {
      monday: { breakfast: null, lunch: null, dinner: null },
      tuesday: { breakfast: null, lunch: null, dinner: null },
      wednesday: { breakfast: null, lunch: null, dinner: null },
      thursday: { breakfast: null, lunch: null, dinner: null },
      friday: { breakfast: null, lunch: null, dinner: null },
      saturday: { breakfast: null, lunch: null, dinner: null },
      sunday: { breakfast: null, lunch: null, dinner: null }
    };

    // Add popular defaults
    template.tuesday.dinner = 'Taco Tuesday';
    template.friday.dinner = 'Pizza Night';
    template.sunday.breakfast = 'Pancakes with Berries';

    return template;
  }
}

module.exports = new MealsService();