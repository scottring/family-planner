/**
 * Meal Learning Migration Script
 * 
 * This script migrates existing meal plan data to initialize the meal learning system:
 * 1. Import existing meal_plans into meal_history (as baseline data)
 * 2. Initialize preference scores based on current family member dietary preferences
 * 3. Set up pattern detection baseline from existing data
 * 4. Create sample family members if none exist (for the family with 2 parents and twins)
 * 
 * Run with: node scripts/migrate-meal-learning.js
 */

const db = require('../config/database');
const MealLearningService = require('../services/mealLearningService');

async function migrateMealLearning() {
  console.log('🚀 Starting Meal Learning Migration...');
  
  try {
    // Step 1: Ensure family members exist
    await ensureFamilyMembers();
    
    // Step 2: Migrate existing meal plans to meal history
    await migrateMealPlansToHistory();
    
    // Step 3: Initialize ingredient preferences based on dietary preferences
    await initializeIngredientPreferences();
    
    // Step 4: Create initial meal patterns
    await initializeMealPatterns();
    
    // Step 5: Generate sample feedback for demonstration
    await generateSampleFeedback();
    
    console.log('✅ Meal Learning Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Ensure family members exist for the meal learning system
 */
async function ensureFamilyMembers() {
  console.log('👨‍👩‍👧‍👦 Checking family members...');
  
  const existingMembers = db.prepare('SELECT * FROM family_members').all();
  
  if (existingMembers.length === 0) {
    console.log('Creating default family members (2 parents and 7-year-old twins)...');
    
    const familyMembers = [
      {
        name: 'Mom',
        type: 'parent',
        birth_date: '1985-06-15',
        dietary_preferences: JSON.stringify({
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          dairyFree: false,
          preferences: ['healthy', 'quick meals', 'italian', 'mediterranean'],
          dislikes: ['overly spicy', 'raw fish']
        }),
        health_goals: JSON.stringify({
          weightManagement: true,
          energyBoost: true,
          familyHealth: true
        })
      },
      {
        name: 'Dad',
        type: 'parent',
        birth_date: '1983-03-22',
        dietary_preferences: JSON.stringify({
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          dairyFree: false,
          preferences: ['protein-rich', 'grilled foods', 'mexican', 'comfort food'],
          dislikes: ['overly healthy', 'raw vegetables']
        }),
        health_goals: JSON.stringify({
          muscleBuilding: true,
          energyBoost: true
        })
      },
      {
        name: 'Kaleb',
        type: 'child',
        birth_date: '2017-09-10',
        dietary_preferences: JSON.stringify({
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          dairyFree: false,
          preferences: ['pasta', 'pizza', 'chicken nuggets', 'fruit'],
          dislikes: ['vegetables', 'fish', 'spicy food', 'mushrooms']
        }),
        health_goals: JSON.stringify({
          healthyGrowth: true,
          balancedNutrition: true
        })
      },
      {
        name: 'Ella',
        type: 'child',
        birth_date: '2017-09-10',
        dietary_preferences: JSON.stringify({
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          dairyFree: false,
          preferences: ['sandwiches', 'cheese', 'berries', 'yogurt'],
          dislikes: ['meat (sometimes)', 'green vegetables', 'soup']
        }),
        health_goals: JSON.stringify({
          healthyGrowth: true,
          balancedNutrition: true
        })
      }
    ];
    
    const insertMember = db.prepare(`
      INSERT INTO family_members (name, type, birth_date, dietary_preferences, health_goals)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    familyMembers.forEach(member => {
      insertMember.run(
        member.name,
        member.type,
        member.birth_date,
        member.dietary_preferences,
        member.health_goals
      );
    });
    
    console.log(`✅ Created ${familyMembers.length} family members`);
  } else {
    console.log(`✅ Found ${existingMembers.length} existing family members`);
  }
}

/**
 * Migrate existing meal plans to meal history as baseline data
 */
async function migrateMealPlansToHistory() {
  console.log('📊 Migrating existing meal plans to history...');
  
  // Get all existing meal plans
  const existingMeals = db.prepare(`
    SELECT * FROM meal_plans 
    ORDER BY date DESC
  `).all();
  
  if (existingMeals.length === 0) {
    console.log('No existing meals found to migrate');
    return;
  }
  
  // Check if history already exists
  const existingHistory = db.prepare('SELECT COUNT(*) as count FROM meal_history').get();
  
  if (existingHistory.count > 0) {
    console.log('Meal history already exists, skipping migration');
    return;
  }
  
  let migratedCount = 0;
  
  // Migrate each meal plan to history
  for (const meal of existingMeals) {
    try {
      // Create a realistic completion date (same as planned date or 1-2 days later)
      const plannedDate = new Date(meal.date);
      const servedDate = new Date(plannedDate);
      
      // Randomly add 0-2 days to simulate realistic serving times
      servedDate.setDate(servedDate.getDate() + Math.floor(Math.random() * 3));
      
      const completionData = {
        mealPlanId: meal.id,
        dateServed: servedDate.toISOString().split('T')[0],
        actuallyEaten: Math.random() > 0.1, // 90% actually eaten
        attendance: generateRandomAttendance(),
        rating: generateRealisticRating(meal.meal_type),
        prepTimeActual: meal.prep_time ? Math.round(meal.prep_time * (0.8 + Math.random() * 0.4)) : null, // ±20% variance
        leftovers: Math.random() > 0.6, // 40% have leftovers
        notes: generateRandomNotes()
      };
      
      MealLearningService.recordMealCompletion(completionData);
      migratedCount++;
      
    } catch (error) {
      console.error(`Error migrating meal ${meal.id}:`, error);
    }
  }
  
  console.log(`✅ Migrated ${migratedCount} meal plans to history`);
}

/**
 * Initialize ingredient preferences based on family member dietary preferences
 */
async function initializeIngredientPreferences() {
  console.log('🥗 Initializing ingredient preferences...');
  
  const familyMembers = db.prepare('SELECT * FROM family_members').all();
  
  for (const member of familyMembers) {
    try {
      const preferences = db.parseJSON(member.dietary_preferences) || {};
      const liked = preferences.preferences || [];
      const disliked = preferences.dislikes || [];
      
      // Process liked ingredients/cuisines
      liked.forEach(item => {
        const score = 30 + Math.floor(Math.random() * 20); // 30-50 range
        MealLearningService.upsertIngredientPreference(member.id, item, score);
      });
      
      // Process disliked ingredients/cuisines
      disliked.forEach(item => {
        const score = -30 - Math.floor(Math.random() * 20); // -30 to -50 range
        MealLearningService.upsertIngredientPreference(member.id, item, score);
      });
      
      console.log(`✅ Initialized preferences for ${member.name}`);
      
    } catch (error) {
      console.error(`Error initializing preferences for ${member.name}:`, error);
    }
  }
}

/**
 * Initialize basic meal patterns from existing data
 */
async function initializeMealPatterns() {
  console.log('📈 Initializing meal patterns...');
  
  // Create some basic weekly patterns
  const weeklyPatterns = [
    { dayOfWeek: 0, mealType: 'breakfast', success: true }, // Sunday breakfast
    { dayOfWeek: 1, mealType: 'dinner', success: true },   // Monday dinner
    { dayOfWeek: 5, mealType: 'dinner', success: true },   // Friday dinner
    { dayOfWeek: 6, mealType: 'breakfast', success: true }  // Saturday breakfast
  ];
  
  weeklyPatterns.forEach(pattern => {
    MealLearningService.upsertMealPattern('weekly', pattern, 0.4);
  });
  
  // Create some meal timing patterns
  const timingPatterns = [
    { mealType: 'breakfast', preferredHour: 7, success: true },
    { mealType: 'lunch', preferredHour: 12, success: true },
    { mealType: 'dinner', preferredHour: 18, success: true }
  ];
  
  timingPatterns.forEach(pattern => {
    MealLearningService.upsertMealPattern('meal-timing', pattern, 0.5);
  });
  
  // Create some successful ingredient combinations
  const ingredientCombos = [
    { ingredients: ['chicken', 'pasta'], mealType: 'dinner', rating: 4 },
    { ingredients: ['beef', 'rice'], mealType: 'dinner', rating: 4 },
    { ingredients: ['eggs', 'toast'], mealType: 'breakfast', rating: 5 },
    { ingredients: ['cheese', 'bread'], mealType: 'lunch', rating: 4 }
  ];
  
  ingredientCombos.forEach(combo => {
    MealLearningService.upsertMealPattern('ingredient-combo', combo, 0.3);
  });
  
  console.log('✅ Initialized meal patterns');
}

/**
 * Generate sample feedback for demonstration purposes
 */
async function generateSampleFeedback() {
  console.log('💬 Generating sample feedback...');
  
  const familyMembers = db.prepare('SELECT * FROM family_members').all();
  const mealHistory = db.prepare(`
    SELECT mh.*, mp.ingredients, mp.title
    FROM meal_history mh
    JOIN meal_plans mp ON mh.meal_plan_id = mp.id
    LIMIT 10
  `).all();
  
  let feedbackCount = 0;
  
  for (const meal of mealHistory) {
    const ingredients = db.parseJSON(meal.ingredients) || [];
    
    // Generate feedback for 2-3 family members per meal
    const membersToFeedback = familyMembers.slice(0, 2 + Math.floor(Math.random() * 2));
    
    for (const member of membersToFeedback) {
      try {
        const memberPrefs = db.parseJSON(member.dietary_preferences) || {};
        const liked = memberPrefs.preferences || [];
        const disliked = memberPrefs.dislikes || [];
        
        // Generate realistic rating based on member preferences
        let baseRating = 3;
        
        // Check if meal aligns with preferences
        const hasLikedIngredients = ingredients.some(ing => 
          liked.some(pref => ing.toLowerCase().includes(pref.toLowerCase()))
        );
        const hasDislikedIngredients = ingredients.some(ing => 
          disliked.some(dislike => ing.toLowerCase().includes(dislike.toLowerCase()))
        );
        
        if (hasLikedIngredients) baseRating += 1;
        if (hasDislikedIngredients) baseRating -= 1;
        
        // Add some randomness
        baseRating += (Math.random() - 0.5) * 2;
        baseRating = Math.max(1, Math.min(5, Math.round(baseRating)));
        
        const feedbackData = {
          mealPlanId: meal.meal_plan_id,
          familyMemberId: member.id,
          rating: baseRating,
          likedIngredients: hasLikedIngredients ? 
            ingredients.filter(ing => 
              liked.some(pref => ing.toLowerCase().includes(pref.toLowerCase()))
            ).slice(0, 2) : [],
          dislikedIngredients: hasDislikedIngredients ? 
            ingredients.filter(ing => 
              disliked.some(dislike => ing.toLowerCase().includes(dislike.toLowerCase()))
            ).slice(0, 1) : [],
          comments: generateFeedbackComment(member.name, baseRating, meal.title),
          wouldRepeat: baseRating >= 4
        };
        
        MealLearningService.recordMealFeedback(feedbackData);
        feedbackCount++;
        
      } catch (error) {
        console.error(`Error generating feedback for ${member.name}:`, error);
      }
    }
  }
  
  console.log(`✅ Generated ${feedbackCount} feedback records`);
}

// Helper functions

function generateRandomAttendance() {
  const attendanceOptions = [
    { 1: true, 2: true, 3: true, 4: true }, // Everyone present
    { 1: true, 2: true, 3: true, 4: false }, // Missing one child
    { 1: true, 2: false, 3: true, 4: true }, // Missing one parent
    { 1: true, 2: true, 3: false, 4: false }  // Just parents
  ];
  
  return attendanceOptions[Math.floor(Math.random() * attendanceOptions.length)];
}

function generateRealisticRating(mealType) {
  // Different meal types have different rating distributions
  const ratingDistributions = {
    breakfast: [2, 3, 3, 4, 4, 4, 5], // Generally well-received
    lunch: [2, 3, 3, 3, 4, 4, 5],     // Mixed reception
    dinner: [2, 2, 3, 3, 4, 4, 5, 5], // Important meal, higher variance
    snack: [3, 3, 4, 4, 4, 5, 5]      // Usually liked
  };
  
  const distribution = ratingDistributions[mealType] || ratingDistributions.dinner;
  return distribution[Math.floor(Math.random() * distribution.length)];
}

function generateRandomNotes() {
  const notes = [
    null,
    null,
    null, // 60% chance of no notes
    'Kids loved it!',
    'Took longer than expected',
    'Very flavorful',
    'Need to make more next time',
    'Good for busy weeknight',
    'Family favorite',
    'Too salty',
    'Perfect portion size'
  ];
  
  return notes[Math.floor(Math.random() * notes.length)];
}

function generateFeedbackComment(memberName, rating, mealTitle) {
  const positiveComments = [
    'Really enjoyed this!',
    'One of my favorites',
    'Great flavor combination',
    'Would definitely have again',
    'Perfect!'
  ];
  
  const neutralComments = [
    'It was okay',
    'Not bad',
    'Could be better',
    'Decent meal'
  ];
  
  const negativeComments = [
    'Not my favorite',
    'Could use more seasoning',
    'Too bland for me',
    'Not really my taste'
  ];
  
  if (Math.random() > 0.5) return null; // 50% chance of no comment
  
  let comments;
  if (rating >= 4) comments = positiveComments;
  else if (rating >= 3) comments = neutralComments;
  else comments = negativeComments;
  
  return comments[Math.floor(Math.random() * comments.length)];
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateMealLearning()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateMealLearning,
  ensureFamilyMembers,
  migrateMealPlansToHistory,
  initializeIngredientPreferences,
  initializeMealPatterns,
  generateSampleFeedback
};