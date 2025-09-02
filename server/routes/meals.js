const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

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

// Suggest meals (placeholder for AI integration)
router.post('/suggest', auth, async (req, res) => {
  try {
    // TODO: Implement AI meal suggestions
    res.json({ 
      suggestions: [
        { title: 'Grilled Chicken Salad', meal_type: 'lunch' },
        { title: 'Pasta Primavera', meal_type: 'dinner' }
      ]
    });
  } catch (error) {
    console.error('Suggest meals error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;