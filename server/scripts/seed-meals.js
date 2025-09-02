const db = require('../config/database');

const sampleMeals = [
  // Breakfast options
  {
    date: '2025-01-06', // Monday
    meal_type: 'breakfast',
    title: 'Overnight Oats with Berries',
    ingredients: [
      { name: 'Rolled oats', quantity: 1, unit: 'cup', category: 'Pantry' },
      { name: 'Milk', quantity: 1, unit: 'cup', category: 'Dairy & Eggs' },
      { name: 'Greek yogurt', quantity: 0.5, unit: 'cup', category: 'Dairy & Eggs' },
      { name: 'Mixed berries', quantity: 0.75, unit: 'cup', category: 'Produce' },
      { name: 'Honey', quantity: 2, unit: 'tbsp', category: 'Pantry' },
      { name: 'Chia seeds', quantity: 1, unit: 'tbsp', category: 'Pantry' }
    ],
    nutrition_info: { calories: 320, protein: 15, carbs: 52, fat: 8, fiber: 10 },
    portions: { adults: 2, children: 2 },
    prep_time: 5
  },
  {
    date: '2025-01-07', // Tuesday
    meal_type: 'breakfast',
    title: 'Scrambled Eggs with Toast',
    ingredients: [
      { name: 'Eggs', quantity: 6, unit: 'large', category: 'Dairy & Eggs' },
      { name: 'Butter', quantity: 2, unit: 'tbsp', category: 'Dairy & Eggs' },
      { name: 'Whole grain bread', quantity: 4, unit: 'slices', category: 'Bakery' },
      { name: 'Cheese', quantity: 0.5, unit: 'cup', category: 'Dairy & Eggs' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp', category: 'Pantry' },
      { name: 'Black pepper', quantity: 0.25, unit: 'tsp', category: 'Pantry' }
    ],
    nutrition_info: { calories: 380, protein: 22, carbs: 28, fat: 20, fiber: 4 },
    portions: { adults: 2, children: 2 },
    prep_time: 10
  },

  // Lunch options
  {
    date: '2025-01-06', // Monday
    meal_type: 'lunch',
    title: 'Mediterranean Chicken Wrap',
    ingredients: [
      { name: 'Chicken breast', quantity: 1, unit: 'lb', category: 'Meat & Seafood' },
      { name: 'Large tortillas', quantity: 4, unit: 'pieces', category: 'Bakery' },
      { name: 'Cucumber', quantity: 1, unit: 'large', category: 'Produce' },
      { name: 'Tomatoes', quantity: 2, unit: 'medium', category: 'Produce' },
      { name: 'Red onion', quantity: 0.5, unit: 'medium', category: 'Produce' },
      { name: 'Feta cheese', quantity: 0.5, unit: 'cup', category: 'Dairy & Eggs' },
      { name: 'Tzatziki sauce', quantity: 0.5, unit: 'cup', category: 'Dairy & Eggs' }
    ],
    nutrition_info: { calories: 420, protein: 32, carbs: 38, fat: 16, fiber: 6 },
    portions: { adults: 2, children: 2 },
    prep_time: 20,
    recipe_url: 'https://example.com/mediterranean-wrap'
  },
  {
    date: '2025-01-07', // Tuesday
    meal_type: 'lunch',
    title: 'Quinoa Power Bowl',
    ingredients: [
      { name: 'Quinoa', quantity: 1, unit: 'cup', category: 'Pantry' },
      { name: 'Black beans', quantity: 1, unit: 'can', category: 'Pantry' },
      { name: 'Sweet potato', quantity: 2, unit: 'medium', category: 'Produce' },
      { name: 'Spinach', quantity: 2, unit: 'cups', category: 'Produce' },
      { name: 'Avocado', quantity: 1, unit: 'large', category: 'Produce' },
      { name: 'Lime', quantity: 2, unit: 'medium', category: 'Produce' },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp', category: 'Pantry' },
      { name: 'Cumin', quantity: 1, unit: 'tsp', category: 'Pantry' }
    ],
    nutrition_info: { calories: 480, protein: 18, carbs: 68, fat: 18, fiber: 16 },
    portions: { adults: 2, children: 1 },
    prep_time: 25
  },

  // Dinner options
  {
    date: '2025-01-06', // Monday
    meal_type: 'dinner',
    title: 'Spaghetti with Meat Sauce',
    ingredients: [
      { name: 'Ground beef', quantity: 1, unit: 'lb', category: 'Meat & Seafood' },
      { name: 'Spaghetti', quantity: 1, unit: 'lb', category: 'Pantry' },
      { name: 'Marinara sauce', quantity: 2, unit: 'jars', category: 'Pantry' },
      { name: 'Onion', quantity: 1, unit: 'medium', category: 'Produce' },
      { name: 'Garlic', quantity: 4, unit: 'cloves', category: 'Produce' },
      { name: 'Parmesan cheese', quantity: 1, unit: 'cup', category: 'Dairy & Eggs' },
      { name: 'Italian seasoning', quantity: 2, unit: 'tsp', category: 'Pantry' },
      { name: 'Olive oil', quantity: 2, unit: 'tbsp', category: 'Pantry' }
    ],
    nutrition_info: { calories: 580, protein: 28, carbs: 72, fat: 18, fiber: 6 },
    portions: { adults: 2, children: 2 },
    prep_time: 35
  },
  {
    date: '2025-01-07', // Tuesday
    meal_type: 'dinner',
    title: 'Taco Tuesday',
    ingredients: [
      { name: 'Ground turkey', quantity: 1, unit: 'lb', category: 'Meat & Seafood' },
      { name: 'Corn tortillas', quantity: 12, unit: 'pieces', category: 'Pantry' },
      { name: 'Lettuce', quantity: 1, unit: 'head', category: 'Produce' },
      { name: 'Tomatoes', quantity: 3, unit: 'medium', category: 'Produce' },
      { name: 'Cheddar cheese', quantity: 2, unit: 'cups', category: 'Dairy & Eggs' },
      { name: 'Sour cream', quantity: 1, unit: 'cup', category: 'Dairy & Eggs' },
      { name: 'Salsa', quantity: 1, unit: 'jar', category: 'Pantry' },
      { name: 'Taco seasoning', quantity: 1, unit: 'packet', category: 'Pantry' },
      { name: 'Lime', quantity: 2, unit: 'medium', category: 'Produce' }
    ],
    nutrition_info: { calories: 450, protein: 28, carbs: 35, fat: 22, fiber: 8 },
    portions: { adults: 2, children: 2 },
    prep_time: 25
  },

  // Kid-friendly meals
  {
    date: '2025-01-08', // Wednesday
    meal_type: 'dinner',
    title: 'Homemade Mac and Cheese',
    ingredients: [
      { name: 'Elbow macaroni', quantity: 1, unit: 'lb', category: 'Pantry' },
      { name: 'Cheddar cheese', quantity: 3, unit: 'cups', category: 'Dairy & Eggs' },
      { name: 'Milk', quantity: 2, unit: 'cups', category: 'Dairy & Eggs' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', category: 'Dairy & Eggs' },
      { name: 'Flour', quantity: 3, unit: 'tbsp', category: 'Pantry' },
      { name: 'Breadcrumbs', quantity: 0.5, unit: 'cup', category: 'Pantry' },
      { name: 'Salt', quantity: 1, unit: 'tsp', category: 'Pantry' }
    ],
    nutrition_info: { calories: 520, protein: 20, carbs: 58, fat: 22, fiber: 2 },
    portions: { adults: 2, children: 3 },
    prep_time: 30
  },
  {
    date: '2025-01-09', // Thursday
    meal_type: 'lunch',
    title: 'Grilled Cheese and Tomato Soup',
    ingredients: [
      { name: 'Bread', quantity: 8, unit: 'slices', category: 'Bakery' },
      { name: 'Cheddar cheese', quantity: 8, unit: 'slices', category: 'Dairy & Eggs' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', category: 'Dairy & Eggs' },
      { name: 'Canned tomato soup', quantity: 2, unit: 'cans', category: 'Pantry' },
      { name: 'Milk', quantity: 1, unit: 'cup', category: 'Dairy & Eggs' }
    ],
    nutrition_info: { calories: 380, protein: 16, carbs: 42, fat: 18, fiber: 4 },
    portions: { adults: 2, children: 2 },
    prep_time: 15
  },

  // Quick weeknight dinners
  {
    date: '2025-01-10', // Friday
    meal_type: 'dinner',
    title: 'Sheet Pan Chicken Fajitas',
    ingredients: [
      { name: 'Chicken breast', quantity: 1.5, unit: 'lbs', category: 'Meat & Seafood' },
      { name: 'Bell peppers', quantity: 3, unit: 'large', category: 'Produce' },
      { name: 'Red onion', quantity: 2, unit: 'medium', category: 'Produce' },
      { name: 'Flour tortillas', quantity: 8, unit: 'pieces', category: 'Bakery' },
      { name: 'Lime', quantity: 3, unit: 'medium', category: 'Produce' },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp', category: 'Pantry' },
      { name: 'Chili powder', quantity: 2, unit: 'tsp', category: 'Pantry' },
      { name: 'Cumin', quantity: 1, unit: 'tsp', category: 'Pantry' },
      { name: 'Paprika', quantity: 1, unit: 'tsp', category: 'Pantry' }
    ],
    nutrition_info: { calories: 420, protein: 35, carbs: 38, fat: 14, fiber: 6 },
    portions: { adults: 2, children: 2 },
    prep_time: 25
  },
  {
    date: '2025-01-11', // Saturday
    meal_type: 'dinner',
    title: 'One-Pot Pasta Primavera',
    ingredients: [
      { name: 'Penne pasta', quantity: 12, unit: 'oz', category: 'Pantry' },
      { name: 'Broccoli', quantity: 2, unit: 'cups', category: 'Produce' },
      { name: 'Bell peppers', quantity: 2, unit: 'medium', category: 'Produce' },
      { name: 'Zucchini', quantity: 2, unit: 'medium', category: 'Produce' },
      { name: 'Cherry tomatoes', quantity: 2, unit: 'cups', category: 'Produce' },
      { name: 'Heavy cream', quantity: 1, unit: 'cup', category: 'Dairy & Eggs' },
      { name: 'Parmesan cheese', quantity: 1, unit: 'cup', category: 'Dairy & Eggs' },
      { name: 'Garlic', quantity: 4, unit: 'cloves', category: 'Produce' },
      { name: 'Vegetable broth', quantity: 3, unit: 'cups', category: 'Pantry' }
    ],
    nutrition_info: { calories: 480, protein: 18, carbs: 65, fat: 16, fiber: 8 },
    portions: { adults: 2, children: 2 },
    prep_time: 20
  },

  // Different cuisine types
  {
    date: '2025-01-12', // Sunday
    meal_type: 'dinner',
    title: 'Chicken Teriyaki Bowl',
    ingredients: [
      { name: 'Chicken thighs', quantity: 2, unit: 'lbs', category: 'Meat & Seafood' },
      { name: 'White rice', quantity: 2, unit: 'cups', category: 'Pantry' },
      { name: 'Broccoli', quantity: 4, unit: 'cups', category: 'Produce' },
      { name: 'Carrots', quantity: 3, unit: 'large', category: 'Produce' },
      { name: 'Soy sauce', quantity: 0.5, unit: 'cup', category: 'Pantry' },
      { name: 'Honey', quantity: 0.25, unit: 'cup', category: 'Pantry' },
      { name: 'Rice vinegar', quantity: 2, unit: 'tbsp', category: 'Pantry' },
      { name: 'Garlic', quantity: 3, unit: 'cloves', category: 'Produce' },
      { name: 'Ginger', quantity: 1, unit: 'tbsp', category: 'Produce' },
      { name: 'Sesame seeds', quantity: 2, unit: 'tbsp', category: 'Pantry' }
    ],
    nutrition_info: { calories: 520, protein: 32, carbs: 58, fat: 14, fiber: 4 },
    portions: { adults: 2, children: 2 },
    prep_time: 30
  },

  // Breakfast for Sunday
  {
    date: '2025-01-12', // Sunday
    meal_type: 'breakfast',
    title: 'Sunday Pancake Brunch',
    ingredients: [
      { name: 'Flour', quantity: 2, unit: 'cups', category: 'Pantry' },
      { name: 'Sugar', quantity: 2, unit: 'tbsp', category: 'Pantry' },
      { name: 'Baking powder', quantity: 2, unit: 'tsp', category: 'Pantry' },
      { name: 'Salt', quantity: 1, unit: 'tsp', category: 'Pantry' },
      { name: 'Eggs', quantity: 2, unit: 'large', category: 'Dairy & Eggs' },
      { name: 'Milk', quantity: 1.75, unit: 'cups', category: 'Dairy & Eggs' },
      { name: 'Butter', quantity: 4, unit: 'tbsp', category: 'Dairy & Eggs' },
      { name: 'Blueberries', quantity: 1, unit: 'cup', category: 'Produce' },
      { name: 'Maple syrup', quantity: 0.5, unit: 'cup', category: 'Pantry' },
      { name: 'Bacon', quantity: 8, unit: 'strips', category: 'Meat & Seafood' }
    ],
    nutrition_info: { calories: 520, protein: 18, carbs: 68, fat: 18, fiber: 4 },
    portions: { adults: 2, children: 2 },
    prep_time: 25
  },

  // Snacks
  {
    date: '2025-01-08', // Wednesday
    meal_type: 'snack',
    title: 'Apple Slices with Peanut Butter',
    ingredients: [
      { name: 'Apples', quantity: 4, unit: 'medium', category: 'Produce' },
      { name: 'Peanut butter', quantity: 0.5, unit: 'cup', category: 'Pantry' },
      { name: 'Cinnamon', quantity: 1, unit: 'tsp', category: 'Pantry' }
    ],
    nutrition_info: { calories: 280, protein: 8, carbs: 32, fat: 16, fiber: 8 },
    portions: { adults: 1, children: 2 },
    prep_time: 5
  }
];

function seedMeals() {
  console.log('Seeding meal plans...');
  
  try {
    // Clear existing meal plans (optional - remove if you want to keep existing data)
    // db.prepare('DELETE FROM meal_plans').run();
    
    const insertMeal = db.prepare(`
      INSERT INTO meal_plans (date, meal_type, title, recipe_url, ingredients, nutrition_info, portions, prep_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((meals) => {
      for (const meal of meals) {
        insertMeal.run(
          meal.date,
          meal.meal_type,
          meal.title,
          meal.recipe_url || null,
          JSON.stringify(meal.ingredients || []),
          JSON.stringify(meal.nutrition_info || {}),
          JSON.stringify(meal.portions || {}),
          meal.prep_time || null
        );
      }
    });
    
    insertMany(sampleMeals);
    
    console.log(`Successfully seeded ${sampleMeals.length} meal plans`);
    console.log('Sample meals added:');
    
    // Group by meal type for display
    const groupedMeals = sampleMeals.reduce((acc, meal) => {
      if (!acc[meal.meal_type]) acc[meal.meal_type] = [];
      acc[meal.meal_type].push(meal.title);
      return acc;
    }, {});
    
    Object.entries(groupedMeals).forEach(([mealType, titles]) => {
      console.log(`\n${mealType.charAt(0).toUpperCase() + mealType.slice(1)}:`);
      titles.forEach(title => console.log(`  - ${title}`));
    });
    
  } catch (error) {
    console.error('Error seeding meal plans:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedMeals();
  process.exit(0);
}

module.exports = { seedMeals, sampleMeals };