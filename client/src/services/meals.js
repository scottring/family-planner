import { useState, useEffect } from 'react';
import api from './api';

// Meal service API calls
export const mealsApi = {
  // Get all meal plans
  async fetchMeals() {
    const response = await api.get('/meals');
    return response.data;
  },

  // Get meals for a specific week
  async fetchWeekMeals(startDate) {
    const response = await api.get(`/meals/week/${startDate}`);
    return response.data;
  },

  // Create a new meal plan
  async createMeal(mealData) {
    const response = await api.post('/meals', mealData);
    return response.data;
  },

  // Update an existing meal plan
  async updateMeal(mealId, updates) {
    const response = await api.put(`/meals/${mealId}`, updates);
    return response.data;
  },

  // Delete a meal plan
  async deleteMeal(mealId) {
    await api.delete(`/meals/${mealId}`);
  },

  // Generate shopping list
  async generateShoppingList(startDate, endDate) {
    const response = await api.get('/meals/shopping-list', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Get AI meal suggestions
  async generateMealSuggestions(preferences = {}) {
    const response = await api.post('/meals/suggest', preferences);
    return response.data.suggestions;
  },

  // Generate AI-powered weekly meal plan
  async generateAiMealPlan(planData) {
    const response = await api.post('/meals/ai-generate-plan', planData);
    return response.data;
  },

  // Sync AI-generated meal plan to database
  async syncAiMealPlan(planData) {
    const response = await api.post('/meals/sync-ai-plan', planData);
    return response.data;
  }
};

// React hook for meal management
export const useMeals = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all meals
  const fetchMeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mealsApi.fetchMeals();
      setMeals(data);
      return data;
    } catch (err) {
      console.error('Error fetching meals:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch meals for a specific week
  const fetchWeekMeals = async (startDate) => {
    setLoading(true);
    setError(null);
    try {
      const data = await mealsApi.fetchWeekMeals(startDate);
      
      // Store in localStorage for offline access
      const cacheKey = `meals_week_${startDate}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours
      }));
      
      return data;
    } catch (err) {
      console.error('Error fetching week meals:', err);
      
      // Try to load from cache if request fails
      const cacheKey = `meals_week_${startDate}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp, expiresIn } = JSON.parse(cached);
        if (Date.now() - timestamp < expiresIn) {
          console.log('Using cached meal data');
          return data;
        }
      }
      
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create a new meal
  const createMeal = async (mealData) => {
    setError(null);
    try {
      const newMeal = await mealsApi.createMeal(mealData);
      setMeals(prevMeals => [...prevMeals, newMeal]);
      
      // Clear relevant week cache
      const weekStart = new Date(mealData.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const cacheKey = `meals_week_${weekStart.toISOString().split('T')[0]}`;
      localStorage.removeItem(cacheKey);
      
      return newMeal;
    } catch (err) {
      console.error('Error creating meal:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update a meal
  const updateMeal = async (mealId, updates) => {
    setError(null);
    try {
      const updatedMeal = await mealsApi.updateMeal(mealId, updates);
      setMeals(prevMeals => 
        prevMeals.map(meal => meal.id === mealId ? updatedMeal : meal)
      );
      
      // Clear relevant week cache
      if (updates.date) {
        const weekStart = new Date(updates.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
        const cacheKey = `meals_week_${weekStart.toISOString().split('T')[0]}`;
        localStorage.removeItem(cacheKey);
      }
      
      return updatedMeal;
    } catch (err) {
      console.error('Error updating meal:', err);
      setError(err.message);
      throw err;
    }
  };

  // Delete a meal
  const deleteMeal = async (mealId) => {
    setError(null);
    try {
      await mealsApi.deleteMeal(mealId);
      setMeals(prevMeals => prevMeals.filter(meal => meal.id !== mealId));
      
      // Clear all week caches to be safe
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('meals_week_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.error('Error deleting meal:', err);
      setError(err.message);
      throw err;
    }
  };

  // Generate shopping list
  const generateShoppingList = async (startDate, endDate) => {
    setError(null);
    try {
      const shoppingList = await mealsApi.generateShoppingList(startDate, endDate);
      
      // Cache shopping list
      const cacheKey = `shopping_list_${startDate}_${endDate}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data: shoppingList,
        timestamp: Date.now(),
        expiresIn: 2 * 60 * 60 * 1000 // 2 hours
      }));
      
      return shoppingList;
    } catch (err) {
      console.error('Error generating shopping list:', err);
      
      // Try to load from cache
      const cacheKey = `shopping_list_${startDate}_${endDate}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp, expiresIn } = JSON.parse(cached);
        if (Date.now() - timestamp < expiresIn) {
          console.log('Using cached shopping list');
          return data;
        }
      }
      
      setError(err.message);
      throw err;
    }
  };

  // Generate meal suggestions
  const generateMealSuggestions = async (preferences = {}) => {
    setError(null);
    try {
      const suggestions = await mealsApi.generateMealSuggestions(preferences);
      
      // Cache suggestions for a short time
      const cacheKey = `meal_suggestions_${JSON.stringify(preferences)}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data: suggestions,
        timestamp: Date.now(),
        expiresIn: 30 * 60 * 1000 // 30 minutes
      }));
      
      return suggestions;
    } catch (err) {
      console.error('Error generating meal suggestions:', err);
      
      // Return mock suggestions if API fails
      const mockSuggestions = getMockMealSuggestions(preferences.mealType);
      return mockSuggestions;
    }
  };

  // Calculate nutrition totals for a set of meals
  const calculateNutritionTotals = (mealList) => {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };

    mealList.forEach(meal => {
      if (meal.nutrition_info) {
        Object.keys(totals).forEach(key => {
          totals[key] += meal.nutrition_info[key] || 0;
        });
      }
    });

    return totals;
  };

  // Get meal statistics
  const getMealStats = (mealList) => {
    const stats = {
      totalMeals: mealList.length,
      breakfastCount: mealList.filter(m => m.meal_type === 'breakfast').length,
      lunchCount: mealList.filter(m => m.meal_type === 'lunch').length,
      dinnerCount: mealList.filter(m => m.meal_type === 'dinner').length,
      snackCount: mealList.filter(m => m.meal_type === 'snack').length,
      averagePrepTime: mealList.reduce((acc, m) => acc + (m.prep_time || 0), 0) / mealList.length || 0,
      uniqueIngredients: new Set()
    };

    // Count unique ingredients
    mealList.forEach(meal => {
      if (meal.ingredients) {
        meal.ingredients.forEach(ingredient => {
          stats.uniqueIngredients.add(ingredient.name?.toLowerCase());
        });
      }
    });

    stats.uniqueIngredientsCount = stats.uniqueIngredients.size;
    delete stats.uniqueIngredients; // Remove Set object for serialization

    return stats;
  };

  return {
    meals,
    loading,
    error,
    fetchMeals,
    fetchWeekMeals,
    createMeal,
    updateMeal,
    deleteMeal,
    generateShoppingList,
    generateMealSuggestions,
    calculateNutritionTotals,
    getMealStats
  };
};

// Mock meal suggestions for offline use
const getMockMealSuggestions = (mealType) => {
  const allSuggestions = [
    {
      title: 'Avocado Toast with Eggs',
      meal_type: 'breakfast',
      prep_time: 10,
      servings: 2,
      difficulty: 'Easy',
      tags: ['healthy', 'quick', 'vegetarian'],
      ingredients: [
        { name: 'Bread', quantity: 2, unit: 'slices', category: 'Bakery' },
        { name: 'Avocado', quantity: 1, unit: 'large', category: 'Produce' },
        { name: 'Eggs', quantity: 2, unit: 'large', category: 'Dairy & Eggs' },
        { name: 'Salt', quantity: 0.5, unit: 'tsp', category: 'Pantry' }
      ],
      nutrition_info: { calories: 320, protein: 14, carbs: 24, fat: 20 },
      description: 'Healthy and filling breakfast with avocado and eggs on toast'
    },
    {
      title: 'Greek Salad Bowl',
      meal_type: 'lunch',
      prep_time: 15,
      servings: 2,
      difficulty: 'Easy',
      tags: ['healthy', 'vegetarian', 'mediterranean'],
      ingredients: [
        { name: 'Mixed greens', quantity: 4, unit: 'cups', category: 'Produce' },
        { name: 'Cherry tomatoes', quantity: 1, unit: 'cup', category: 'Produce' },
        { name: 'Cucumber', quantity: 1, unit: 'large', category: 'Produce' },
        { name: 'Feta cheese', quantity: 0.5, unit: 'cup', category: 'Dairy & Eggs' },
        { name: 'Olives', quantity: 0.25, unit: 'cup', category: 'Pantry' }
      ],
      nutrition_info: { calories: 280, protein: 12, carbs: 18, fat: 18 },
      description: 'Fresh Mediterranean salad with feta cheese and olives'
    },
    {
      title: 'One-Pan Chicken and Vegetables',
      meal_type: 'dinner',
      prep_time: 35,
      servings: 4,
      difficulty: 'Easy',
      tags: ['healthy', 'protein', 'one-pan'],
      ingredients: [
        { name: 'Chicken breast', quantity: 1.5, unit: 'lbs', category: 'Meat & Seafood' },
        { name: 'Broccoli', quantity: 2, unit: 'cups', category: 'Produce' },
        { name: 'Bell peppers', quantity: 2, unit: 'medium', category: 'Produce' },
        { name: 'Sweet potato', quantity: 2, unit: 'medium', category: 'Produce' },
        { name: 'Olive oil', quantity: 3, unit: 'tbsp', category: 'Pantry' }
      ],
      nutrition_info: { calories: 380, protein: 32, carbs: 28, fat: 14 },
      description: 'Simple one-pan dinner with chicken and roasted vegetables'
    },
    {
      title: 'Trail Mix',
      meal_type: 'snack',
      prep_time: 5,
      servings: 6,
      difficulty: 'Easy',
      tags: ['healthy', 'quick', 'portable'],
      ingredients: [
        { name: 'Mixed nuts', quantity: 1, unit: 'cup', category: 'Pantry' },
        { name: 'Dried fruit', quantity: 0.5, unit: 'cup', category: 'Pantry' },
        { name: 'Dark chocolate chips', quantity: 0.25, unit: 'cup', category: 'Pantry' }
      ],
      nutrition_info: { calories: 180, protein: 5, carbs: 18, fat: 12 },
      description: 'Healthy mix of nuts, dried fruit, and dark chocolate'
    },
    {
      title: 'Smoothie Bowl',
      meal_type: 'breakfast',
      prep_time: 10,
      servings: 1,
      difficulty: 'Easy',
      tags: ['healthy', 'quick', 'fruit'],
      ingredients: [
        { name: 'Frozen berries', quantity: 1, unit: 'cup', category: 'Frozen' },
        { name: 'Banana', quantity: 1, unit: 'medium', category: 'Produce' },
        { name: 'Greek yogurt', quantity: 0.5, unit: 'cup', category: 'Dairy & Eggs' },
        { name: 'Granola', quantity: 0.25, unit: 'cup', category: 'Pantry' }
      ],
      nutrition_info: { calories: 280, protein: 12, carbs: 52, fat: 6 },
      description: 'Thick smoothie topped with granola and fresh fruit'
    },
    {
      title: 'Veggie Stir Fry',
      meal_type: 'dinner',
      prep_time: 20,
      servings: 3,
      difficulty: 'Easy',
      tags: ['vegetarian', 'healthy', 'quick'],
      ingredients: [
        { name: 'Mixed vegetables', quantity: 4, unit: 'cups', category: 'Frozen' },
        { name: 'Tofu', quantity: 1, unit: 'block', category: 'Pantry' },
        { name: 'Soy sauce', quantity: 3, unit: 'tbsp', category: 'Pantry' },
        { name: 'Rice', quantity: 1.5, unit: 'cups', category: 'Pantry' }
      ],
      nutrition_info: { calories: 340, protein: 16, carbs: 58, fat: 8 },
      description: 'Quick vegetarian stir fry with tofu and mixed vegetables'
    }
  ];

  return mealType 
    ? allSuggestions.filter(s => s.meal_type === mealType)
    : allSuggestions;
};

// Utility functions for meal planning
export const mealUtils = {
  // Get meals for a specific date
  getMealsForDate: (meals, date) => {
    const targetDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return meals.filter(meal => meal.date === targetDate);
  },

  // Group meals by date
  groupMealsByDate: (meals) => {
    return meals.reduce((acc, meal) => {
      if (!acc[meal.date]) acc[meal.date] = [];
      acc[meal.date].push(meal);
      return acc;
    }, {});
  },

  // Get week boundaries
  getWeekBoundaries: (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Sunday
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  },

  // Validate meal data
  validateMeal: (meal) => {
    const errors = [];
    
    if (!meal.title?.trim()) errors.push('Title is required');
    if (!meal.date) errors.push('Date is required');
    if (!meal.meal_type) errors.push('Meal type is required');
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.meal_type)) {
      errors.push('Invalid meal type');
    }
    
    return errors;
  }
};

export default mealsApi;