const Database = require('better-sqlite3');
const path = require('path');

// Open database - use the same path as the main app
const dbPath = path.join(__dirname, '../database/itineraries.db');
const db = new Database(dbPath);

// Delete meal-related events for the week of Sept 7-14, 2025 based on title patterns
const stmt = db.prepare(`
  DELETE FROM events 
  WHERE (
    title LIKE '%Breakfast%' OR 
    title LIKE '%Lunch%' OR 
    title LIKE '%Dinner%' OR 
    title LIKE '%Meal%' OR 
    title LIKE '%Prep%' OR
    title LIKE '%Shopping%' OR
    title LIKE '%Grocery%' OR
    title LIKE '%Trader Joe%' OR
    title LIKE '%Turkey Meatball%' OR
    title LIKE '%Leftover%' OR
    title LIKE '%Slow Cooker%' OR
    title LIKE '%Morning Prep%'
  )
  AND date(start_time) >= '2025-09-07' 
  AND date(start_time) <= '2025-09-14'
`);

const result = stmt.run();
console.log(`Deleted ${result.changes} meal-related events for Sept 7-14, 2025`);

db.close();
console.log('Meal events cleared successfully');