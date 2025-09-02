const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const mealsService = require('../services/meals');

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

module.exports = router;