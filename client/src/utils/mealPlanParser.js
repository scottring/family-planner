import { parseISO, addDays, setHours, setMinutes } from 'date-fns';

/**
 * Parse a meal plan from text (e.g., from Claude Desktop or JJ)
 * and convert it into calendar events
 */
export class MealPlanParser {
  constructor(startDate = new Date()) {
    // Ensure startDate is at the beginning of the day
    this.startDate = new Date(startDate);
    this.startDate.setHours(0, 0, 0, 0);
    this.events = [];
    this.shoppingList = [];
    this.prepTasks = [];
    this.daysSeen = []; // Track order of days as they appear
  }

  /**
   * Parse the full meal plan text
   */
  parseMealPlan(text) {
    const lines = text.split('\n');
    let currentDay = null;
    let currentMeal = null;
    let inShoppingSection = false;
    let inPrepSection = false;
    let dayOffset = 0;
    let shoppingStore = null;

    for (let line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Detect sections
      if (trimmedLine.includes('Shopping Notes') || trimmedLine.includes('Shopping List')) {
        inShoppingSection = true;
        inPrepSection = false;
        continue;
      }
      
      // Detect store name in shopping section
      if (inShoppingSection && trimmedLine.includes('Store:')) {
        const storeMatch = trimmedLine.match(/Store:\s*(.+)/i);
        if (storeMatch) {
          shoppingStore = storeMatch[1].trim();
        }
        continue;
      }
      
      if (trimmedLine.includes('Prep Checklist') || trimmedLine.includes('Meal Prep')) {
        inPrepSection = true;
        inShoppingSection = false;
        continue;
      }

      // Parse day headers (e.g., "### **SUNDAY (Sept 7) - Tonight's Dinner for 7 people**")
      const dayMatch = trimmedLine.match(/###?\s*\*?\*?(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)/i);
      if (dayMatch) {
        // If we have a previous meal being processed, create events for it first
        if (currentMeal && currentMeal.title) {
          this.createMealEvents(currentMeal);
        }
        
        const dayName = dayMatch[1].toUpperCase();
        
        // Track days in order they appear
        if (!this.daysSeen.includes(dayName)) {
          this.daysSeen.push(dayName);
        }
        
        dayOffset = this.getOrderedDayOffset(dayName);
        currentDay = addDays(this.startDate, dayOffset);
        
        // Extract special notes from the line
        const specialNotes = this.extractSpecialNotes(trimmedLine);
        currentMeal = {
          day: dayName,
          date: currentDay,
          specialNotes: specialNotes,
          items: []
        };
        continue;
      }
      
      // Also check for "Breakfast Prep" or similar section headers
      if (trimmedLine.match(/##\s*(Breakfast\s+Prep|Overnight\s+Oats)/i)) {
        inPrepSection = true;
        inShoppingSection = false;
        continue;
      }

      // Parse meal titles (first non-empty line after day header)
      if (currentMeal && !currentMeal.title && trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        // Store the raw title without modification
        currentMeal.title = trimmedLine.replace(/\*\*/g, '').trim();
        continue;
      }

      // Parse meal items (lines starting with -)
      if (currentMeal && currentMeal.title && trimmedLine.startsWith('-')) {
        currentMeal.items.push(trimmedLine.substring(1).trim());
        continue;
      }

      // Parse shopping items
      if (inShoppingSection && trimmedLine.startsWith('-')) {
        this.shoppingList.push({
          item: trimmedLine.substring(1).trim(),
          category: this.categorizeGroceryItem(trimmedLine)
        });
        continue;
      }

      // Parse prep tasks
      if (inPrepSection && (trimmedLine.startsWith('- [') || trimmedLine.startsWith('-'))) {
        const completed = trimmedLine.includes('[x]');
        const task = trimmedLine.replace(/- \[[x ]\]/g, '').replace('-', '').trim();
        this.prepTasks.push({
          task: task,
          completed: completed,
          day: 'Sunday' // Default prep day
        });
        continue;
      }

    }

    // Process the last meal if exists
    if (currentMeal && currentMeal.title) {
      this.createMealEvents(currentMeal);
    }

    // Store the shopping store location
    this.shoppingStore = shoppingStore;

    console.log('Parsed events:', this.events);
    console.log('Shopping list:', this.shoppingList);
    console.log('Prep tasks:', this.prepTasks);

    return {
      events: this.events,
      shoppingList: this.shoppingList,
      prepTasks: this.prepTasks,
      shoppingStore: shoppingStore
    };
  }

  /**
   * Create calendar events from a parsed meal
   */
  createMealEvents(meal) {
    console.log('Creating meal event for:', meal);
    
    // Determine meal type from title
    let mealType = 'dinner';
    let mealTime = { start: [18, 0], end: [19, 0] }; // Default dinner time
    
    const titleLower = meal.title.toLowerCase();
    
    // Check for explicit meal type indicators
    if (titleLower.includes('breakfast') || titleLower.includes('overnight oats') || titleLower.includes('morning')) {
      mealType = 'breakfast';
      mealTime = { start: [7, 30], end: [8, 30] };
    } else if (titleLower.includes('lunch')) {
      mealType = 'lunch';
      mealTime = { start: [12, 0], end: [13, 0] };
    } else if (titleLower.includes('dinner') || titleLower.includes('supper')) {
      mealType = 'dinner';
      mealTime = { start: [18, 0], end: [19, 0] };
    }
    
    // Use the title as-is, without adding prefixes
    // The meal plan already has descriptive titles
    let eventTitle = meal.title;
    
    const mealEvent = {
      title: eventTitle,
      start_time: this.setMealTime(meal.date, mealTime.start[0], mealTime.start[1]),
      end_time: this.setMealTime(meal.date, mealTime.end[0], mealTime.end[1]),
      type: 'family',
      category: 'meal',
      description: meal.items.join('\n'),
      location: 'Home',
      preparation_list: this.generatePrepList(meal),
      packing_list: [],
      checklist: this.generateMealChecklist(meal),
      ai_enriched: true,
      meal_type: mealType,
      special_notes: meal.specialNotes
    };

    this.events.push(mealEvent);

    // Create prep event if it's a slow cooker or requires morning prep
    if (meal.title.toLowerCase().includes('slow cooker') || 
        meal.items.some(item => item.toLowerCase().includes('morning')) ||
        meal.items.some(item => item.toLowerCase().includes('set up in morning'))) {
      const prepEvent = {
        title: `Morning Prep: ${meal.title}`,
        start_time: this.setMealTime(meal.date, 7, 30),
        end_time: this.setMealTime(meal.date, 8, 0),
        type: 'family',
        category: 'meal_prep',
        description: `Morning preparation for ${mealType}`,
        location: 'Kitchen',
        checklist: ['Start slow cooker', 'Prep ingredients', 'Set timer if needed'],
        ai_enriched: true
      };
      this.events.push(prepEvent);
    }

    // Create leftover lunch event for next day if mentioned
    if (meal.title.toLowerCase().includes('leftover') || 
        meal.items.some(item => item.toLowerCase().includes('leftover'))) {
      const nextDay = addDays(meal.date, 1);
      const lunchEvent = {
        title: `Lunch: ${meal.title} (Leftovers)`,
        start_time: this.setMealTime(nextDay, 12, 0),
        end_time: this.setMealTime(nextDay, 12, 30),
        type: 'personal',
        category: 'meal',
        description: 'Leftovers from previous dinner',
        location: 'Work/Home',
        meal_type: 'lunch',
        ai_enriched: true
      };
      this.events.push(lunchEvent);
    }
  }

  /**
   * Generate preparation checklist for a meal
   */
  generateMealChecklist(meal) {
    const checklist = [];
    
    // Basic prep items
    checklist.push('Check all ingredients are available');
    checklist.push('Take proteins out to thaw (if frozen)');
    
    // Add specific items based on meal type
    if (meal.title.toLowerCase().includes('pasta')) {
      checklist.push('Boil water for pasta');
      checklist.push('Prep pasta sauce');
    }
    
    if (meal.title.toLowerCase().includes('slow cooker')) {
      checklist.push('Set up slow cooker in morning');
      checklist.push('Prep vegetables');
    }
    
    if (meal.title.toLowerCase().includes('salmon') || meal.title.toLowerCase().includes('fish')) {
      checklist.push('Season fish 30 min before cooking');
      checklist.push('Preheat oven/pan');
    }
    
    checklist.push('Set table');
    checklist.push('Prepare drinks');
    
    return checklist;
  }

  /**
   * Generate preparation list
   */
  generatePrepList(meal) {
    const prepList = [];
    
    if (meal.specialNotes) {
      prepList.push(`Note: ${meal.specialNotes}`);
    }
    
    meal.items.forEach(item => {
      if (item.toLowerCase().includes('prep') || 
          item.toLowerCase().includes('cut') || 
          item.toLowerCase().includes('chop')) {
        prepList.push(item);
      }
    });
    
    return prepList;
  }

  /**
   * Set meal time for a specific date
   */
  setMealTime(date, hours, minutes) {
    const mealDate = new Date(date);
    mealDate.setHours(hours, minutes, 0, 0);
    return mealDate.toISOString();
  }

  /**
   * Get day offset based on order of appearance
   */
  getOrderedDayOffset(dayName) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    // For the first day in the meal plan, map it to the start date
    if (this.daysSeen.length === 1 && this.daysSeen[0] === dayName) {
      return 0;
    }
    
    // For subsequent days, calculate based on sequential order
    const dayIndex = this.daysSeen.indexOf(dayName);
    if (dayIndex >= 0) {
      return dayIndex;
    }
    
    // Fallback to standard day offset calculation
    return this.getDayOffset(dayName);
  }

  /**
   * Get day offset from start date (legacy method)
   */
  getDayOffset(dayName) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const targetDayIndex = days.indexOf(dayName);
    const startDayIndex = this.startDate.getDay();
    
    // Calculate the offset to get to the target day
    // If we're already on or past the target day in the week, use current week
    // The first day mentioned should align with the start date's week
    
    // For the first day (SUNDAY), always use offset 0 if start date is Sunday
    // This ensures meal plans starting "SUNDAY" begin on the provided start date
    if (dayName === 'SUNDAY' && startDayIndex === 0) {
      return 0;
    }
    
    // For other days, calculate normal offset within the same week
    let offset = targetDayIndex - startDayIndex;
    
    // If offset is negative, it means the day already passed this week
    // Since we're planning for the week ahead, add 7 to get next occurrence
    if (offset < 0) {
      offset += 7;
    }
    
    return offset;
  }

  /**
   * Extract special notes from day header
   */
  extractSpecialNotes(line) {
    const notesMatch = line.match(/[-–]\s*(.+)\*?\*?$/);
    if (notesMatch) {
      return notesMatch[1].trim().replace(/\*\*/g, '');
    }
    return null;
  }

  /**
   * Categorize grocery items
   */
  categorizeGroceryItem(item) {
    const itemLower = item.toLowerCase();
    
    if (itemLower.includes('chicken') || itemLower.includes('turkey') || 
        itemLower.includes('beef') || itemLower.includes('salmon') || 
        itemLower.includes('fish')) {
      return 'proteins';
    }
    
    if (itemLower.includes('milk') || itemLower.includes('cheese') || 
        itemLower.includes('yogurt') || itemLower.includes('butter')) {
      return 'dairy';
    }
    
    if (itemLower.includes('bread') || itemLower.includes('pasta') || 
        itemLower.includes('rice') || itemLower.includes('oats')) {
      return 'grains';
    }
    
    if (itemLower.includes('apple') || itemLower.includes('banana') || 
        itemLower.includes('berries') || itemLower.includes('fruit')) {
      return 'fruits';
    }
    
    if (itemLower.includes('broccoli') || itemLower.includes('carrot') || 
        itemLower.includes('potato') || itemLower.includes('vegetable')) {
      return 'vegetables';
    }
    
    return 'other';
  }

  /**
   * Create a shopping event
   */
  createShoppingEvent(date = null) {
    const shoppingDate = date || this.startDate;
    const storeName = this.shoppingStore || "Trader Joe's";
    
    // Common Trader Joe's locations - expand as needed
    const traderJoesLocations = {
      "Trader Joe's": "401 Bay St, San Francisco, CA 94133", // Default SF location
      "Trader Joe's San Francisco": "401 Bay St, San Francisco, CA 94133",
      "Trader Joe's Stonestown": "265 Winston Dr, San Francisco, CA 94132"
    };
    
    const storeAddress = traderJoesLocations[storeName] || storeName;
    const startTime = this.setMealTime(shoppingDate, 10, 0);
    
    // Calculate departure time (20 minutes before for driving)
    const departureTime = new Date(startTime);
    departureTime.setMinutes(departureTime.getMinutes() - 20);
    
    return {
      title: `Grocery Shopping at ${storeName}`,
      start_time: startTime,
      end_time: this.setMealTime(shoppingDate, 11, 30),
      type: 'family',
      category: 'shopping',
      description: `Weekly grocery shopping for meal plan at ${storeName}`,
      location: storeAddress,
      
      // Driving template fields
      driving_needed: true,
      departure_time: departureTime.toISOString(),
      preparation_time: 15, // 15 minutes to prepare before leaving
      parking_info: storeName.toLowerCase().includes("trader joe") ? 
        "Free parking lot, can be crowded on weekends" : 
        "Check store parking availability",
      
      // Navigation helpers
      navigation_address: storeAddress,
      search_along_route: ['gas station', 'coffee shop'],
      
      // Pre-event checklist (preparation)
      preparation_list: [
        'Check shopping list is complete',
        'Grab reusable bags',
        'Get wallet/payment method',
        'Check traffic to store',
        'Set GPS navigation'
      ],
      
      // Shopping checklist
      checklist: this.shoppingList.map(item => item.item),
      
      // Post-event checklist
      follow_up_list: [
        'Put groceries away',
        'Update meal prep schedule',
        'Check expiration dates',
        'Prep vegetables if time allows'
      ],
      
      // Packing list for the trip
      packing_list: [
        'Reusable shopping bags',
        'Shopping list',
        'Credit card/payment',
        'Phone for list apps',
        'Cooler bag for frozen items'
      ],
      
      ai_enriched: true,
      template_type: 'driving_event'
    };
  }

  /**
   * Create meal prep event
   */
  createMealPrepEvent(date = null) {
    const prepDate = date || this.startDate;
    
    return {
      title: 'Weekly Meal Prep',
      start_time: this.setMealTime(prepDate, 14, 0),
      end_time: this.setMealTime(prepDate, 16, 0),
      type: 'family',
      category: 'meal_prep',
      description: 'Prep meals and ingredients for the week',
      location: 'Kitchen',
      checklist: this.prepTasks.map(task => task.task),
      ai_enriched: true
    };
  }
}

export default MealPlanParser;