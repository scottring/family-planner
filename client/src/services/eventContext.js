/**
 * Event Context Service - Provides intelligent event analysis and suggestions
 * Based on event patterns, timing, and family-specific routines
 */

// Family-specific constants for the Kaufman family
const FAMILY_CONFIG = {
  children: ['Kaleb', 'Ella'], // 7-year-old twins
  hasDog: true,
  dogCareTime: 15, // minutes before leaving
  mealPrepTime: 30, // typical meal preparation time
  generalPrepTime: 20, // general getting ready time
  commuteBudget: 15, // extra time for unexpected delays
};

// Event patterns and their typical requirements
const EVENT_PATTERNS = {
  scouts: {
    keywords: ['scouts', 'scout', 'troop', 'den'],
    preparationTime: 45, // minutes
    needsUniform: true,
    mealConsiderations: {
      dinnerBefore: true,
      dinnerTime: 90, // minutes before event
      snacks: true
    },
    packingList: ['Scout uniform', 'Handbook', 'Water bottle', 'Snacks'],
    transportation: 'parent_required',
    weatherDependent: false
  },
  
  sports: {
    keywords: ['soccer', 'football', 'baseball', 'basketball', 'practice', 'game', 'tournament'],
    preparationTime: 60,
    needsUniform: true,
    mealConsiderations: {
      dinnerAfter: true,
      snacks: true,
      hydration: 'high'
    },
    packingList: ['Sports uniform', 'Cleats', 'Shin guards', 'Water bottle', 'Towel', 'Change of clothes'],
    transportation: 'parent_required',
    weatherDependent: true
  },
  
  school: {
    keywords: ['school', 'class', 'meeting', 'conference', 'pta', 'parent-teacher'],
    preparationTime: 30,
    mealConsiderations: {
      dinnerTime: 60
    },
    packingList: ['Notebook', 'Pen', 'School materials'],
    transportation: 'parent_required',
    weatherDependent: false
  },
  
  medical: {
    keywords: ['doctor', 'dentist', 'appointment', 'checkup', 'medical'],
    preparationTime: 30,
    mealConsiderations: {
      lightMeal: true
    },
    packingList: ['Insurance cards', 'ID', 'Medical records', 'Medication list'],
    transportation: 'parent_required',
    weatherDependent: false,
    arrivalBuffer: 15 // arrive 15 minutes early
  },
  
  social: {
    keywords: ['party', 'birthday', 'playdate', 'sleepover'],
    preparationTime: 45,
    mealConsiderations: {
      checkWithHost: true
    },
    packingList: ['Gift', 'Card', 'Change of clothes', 'Toothbrush'],
    transportation: 'parent_required',
    weatherDependent: false
  },
  
  onlineMeeting: {
    keywords: ['zoom', 'teams', 'meet', 'webinar', 'virtual', 'online', 'video call', 'video conference', 'remote'],
    preparationTime: 10, // Much shorter prep time for online
    isVirtual: true,
    needsUniform: false,
    mealConsiderations: {
      flexibleTiming: true,
      canEatDuring: false // Usually not appropriate during meetings
    },
    packingList: ['Notebook', 'Pen', 'Meeting agenda/notes', 'Water bottle'],
    transportation: 'none',
    weatherDependent: false,
    virtualPrep: {
      techCheck: 5, // minutes to test audio/video
      backgroundSetup: 3, // tidy visible background
      documentReview: 10 // review materials
    }
  },
  
  workMeeting: {
    keywords: ['meeting', 'conference', 'presentation', 'review', 'standup', 'sync'],
    preparationTime: 15,
    isVirtual: false, // Default to in-person unless online keywords detected
    mealConsiderations: {
      lightMeal: true,
      coffee: true
    },
    packingList: ['Laptop', 'Charger', 'Notebook', 'Business cards'],
    transportation: 'self',
    weatherDependent: false
  }
};

/**
 * Analyze event and determine the most likely pattern
 * @param {Object} event - Event object with title, description, location, etc.
 * @returns {Object|null} - Matching pattern or null if no match
 */
export const analyzeEventPattern = (event) => {
  if (!event) return null;
  
  const searchText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  
  for (const [patternName, pattern] of Object.entries(EVENT_PATTERNS)) {
    const hasMatch = pattern.keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
    
    if (hasMatch) {
      return {
        patternName,
        ...pattern,
        confidence: calculateConfidence(searchText, pattern)
      };
    }
  }
  
  return null;
};

/**
 * Calculate confidence score for pattern matching
 * @param {string} searchText - Combined event title and description
 * @param {Object} pattern - Event pattern object
 * @returns {number} - Confidence score (0-100)
 */
const calculateConfidence = (searchText, pattern) => {
  let score = 0;
  let totalKeywords = pattern.keywords.length;
  
  // Count matching keywords
  const matchCount = pattern.keywords.filter(keyword =>
    searchText.includes(keyword.toLowerCase())
  ).length;
  
  score = (matchCount / totalKeywords) * 100;
  
  // Boost confidence for exact matches
  if (pattern.keywords.some(keyword => 
    searchText.includes(keyword.toLowerCase()) && 
    searchText.split(' ').includes(keyword.toLowerCase())
  )) {
    score = Math.min(100, score + 25);
  }
  
  return Math.round(score);
};

/**
 * Generate preparation timeline for an event
 * @param {Object} event - Event object
 * @param {Object} pattern - Optional pattern analysis result
 * @returns {Object} - Timeline with specific times and activities
 */
export const generatePreparationTimeline = (event, pattern = null) => {
  if (!event || !event.start_time) return null;
  
  const eventTime = new Date(event.start_time);
  const now = new Date();
  
  // If event is in the past, return null
  if (eventTime <= now) return null;
  
  const analysis = pattern || analyzeEventPattern(event);
  const prepTime = analysis?.preparationTime || FAMILY_CONFIG.generalPrepTime;
  const isVirtual = analysis?.isVirtual || false;
  
  // Calculate key timeline points
  const timeline = [];
  
  if (isVirtual) {
    // Virtual event timeline - no commute, different preparation
    
    // Tech setup and test (5 minutes before)
    const techCheckTime = new Date(eventTime);
    techCheckTime.setMinutes(techCheckTime.getMinutes() - 5);
    timeline.push({
      time: techCheckTime,
      activity: 'Join meeting early, test audio/video',
      type: 'tech_check',
      duration: 5
    });
    
    // Background and workspace prep (8 minutes before)
    if (analysis?.virtualPrep?.backgroundSetup) {
      const setupTime = new Date(eventTime);
      setupTime.setMinutes(setupTime.getMinutes() - 8);
      timeline.push({
        time: setupTime,
        activity: 'Tidy background, close unnecessary apps, silence phone',
        type: 'workspace_setup',
        duration: 3
      });
    }
    
    // Document review (15-20 minutes before)
    if (analysis?.virtualPrep?.documentReview) {
      const reviewTime = new Date(eventTime);
      reviewTime.setMinutes(reviewTime.getMinutes() - 15);
      timeline.push({
        time: reviewTime,
        activity: 'Review meeting agenda, notes, and materials',
        type: 'document_review',
        duration: analysis.virtualPrep.documentReview
      });
    }
    
    // Quick break/refresh (20 minutes before)
    const refreshTime = new Date(eventTime);
    refreshTime.setMinutes(refreshTime.getMinutes() - 20);
    timeline.push({
      time: refreshTime,
      activity: 'Quick break - water, restroom, stretch',
      type: 'refresh',
      duration: 5
    });
    
  } else {
    // Physical event timeline - includes commute and dog care
    
    // Departure time (including commute buffer)
    const departureTime = new Date(eventTime);
    departureTime.setMinutes(departureTime.getMinutes() - FAMILY_CONFIG.commuteBudget);
    
    // Dog care time (if applicable)
    if (FAMILY_CONFIG.hasDog) {
      const dogCareTime = new Date(departureTime);
      dogCareTime.setMinutes(dogCareTime.getMinutes() - FAMILY_CONFIG.dogCareTime);
      timeline.push({
        time: dogCareTime,
        activity: 'Dog care routine (let out, feed if needed)',
        type: 'dog_care',
        duration: FAMILY_CONFIG.dogCareTime
      });
    }
    
    // Preparation start time
    const prepStartTime = new Date(departureTime);
    prepStartTime.setMinutes(prepStartTime.getMinutes() - prepTime);
    timeline.push({
      time: prepStartTime,
      activity: getPreparationActivity(analysis),
      type: 'preparation',
      duration: prepTime
    });
    
    // Departure
    timeline.push({
      time: departureTime,
      activity: `Leave for ${event.title}`,
      type: 'departure',
      duration: 0
    });
  }
  
  // Meal timing (for both virtual and physical)
  if (analysis?.mealConsiderations && !analysis?.mealConsiderations?.flexibleTiming) {
    const mealTime = calculateMealTime(eventTime, analysis.mealConsiderations);
    if (mealTime) {
      timeline.push(mealTime);
    }
  }
  
  // Event start
  timeline.push({
    time: eventTime,
    activity: `${event.title} begins`,
    type: 'event_start',
    duration: 0
  });
  
  // Sort timeline chronologically
  timeline.sort((a, b) => a.time - b.time);
  
  return {
    timeline,
    totalPrepTime: prepTime + FAMILY_CONFIG.dogCareTime + FAMILY_CONFIG.commuteBudget,
    eventPattern: analysis?.patternName || 'general',
    confidence: analysis?.confidence || 0
  };
};

/**
 * Generate preparation activity description based on event pattern
 * @param {Object|null} analysis - Event pattern analysis
 * @returns {string} - Activity description
 */
const getPreparationActivity = (analysis) => {
  if (!analysis) return 'Get ready and gather items';
  
  const activities = [];
  
  if (analysis.needsUniform) {
    activities.push('Put on uniform/appropriate clothing');
  } else {
    activities.push('Get dressed appropriately');
  }
  
  if (analysis.packingList && analysis.packingList.length > 0) {
    activities.push(`Pack items: ${analysis.packingList.slice(0, 3).join(', ')}${analysis.packingList.length > 3 ? '...' : ''}`);
  }
  
  return activities.join(', ');
};

/**
 * Calculate optimal meal time based on event and meal considerations
 * @param {Date} eventTime - Event start time
 * @param {Object} mealConsiderations - Meal timing preferences
 * @returns {Object|null} - Meal timeline entry or null
 */
const calculateMealTime = (eventTime, mealConsiderations) => {
  const eventHour = eventTime.getHours();
  
  // Dinner considerations (typical dinner time is 5:30-7:00 PM)
  if (mealConsiderations.dinnerBefore && eventHour >= 17 && eventHour <= 20) {
    const dinnerTime = new Date(eventTime);
    const minutesBefore = mealConsiderations.dinnerTime || 90;
    dinnerTime.setMinutes(dinnerTime.getMinutes() - minutesBefore);
    
    return {
      time: dinnerTime,
      activity: 'Dinner time (eat before event)',
      type: 'meal',
      duration: FAMILY_CONFIG.mealPrepTime,
      note: 'Early dinner recommended'
    };
  }
  
  // Light meal considerations
  if (mealConsiderations.lightMeal) {
    const mealTime = new Date(eventTime);
    mealTime.setMinutes(mealTime.getMinutes() - 60);
    
    return {
      time: mealTime,
      activity: 'Light snack/meal (avoid heavy food)',
      type: 'meal',
      duration: 15,
      note: 'Light meal recommended'
    };
  }
  
  return null;
};

/**
 * Get contextual suggestions for an event
 * @param {Object} event - Event object
 * @returns {Object} - Suggestions object with various recommendations
 */
export const getContextualSuggestions = (event) => {
  const analysis = analyzeEventPattern(event);
  const timeline = generatePreparationTimeline(event, analysis);
  
  const suggestions = {
    pattern: analysis,
    timeline,
    packingList: analysis?.packingList || [],
    mealSuggestions: getMealSuggestions(event, analysis),
    weatherConsiderations: getWeatherConsiderations(event, analysis),
    transportationNotes: getTransportationNotes(event, analysis),
    familySpecificNotes: getFamilySpecificNotes(event, analysis)
  };
  
  return suggestions;
};

/**
 * Generate meal-related suggestions
 */
const getMealSuggestions = (event, analysis) => {
  if (!analysis?.mealConsiderations) return null;
  
  const eventTime = new Date(event.start_time);
  const eventHour = eventTime.getHours();
  
  const suggestions = [];
  
  if (analysis.mealConsiderations.dinnerBefore) {
    suggestions.push('Plan early dinner before leaving');
  }
  
  if (analysis.mealConsiderations.dinnerAfter) {
    suggestions.push('Plan dinner for after the event');
  }
  
  if (analysis.mealConsiderations.snacks) {
    suggestions.push('Pack healthy snacks and extra water');
  }
  
  if (analysis.mealConsiderations.hydration === 'high') {
    suggestions.push('Ensure extra hydration - pack multiple water bottles');
  }
  
  return suggestions.length > 0 ? suggestions : null;
};

/**
 * Generate weather-related considerations
 */
const getWeatherConsiderations = (event, analysis) => {
  if (!analysis?.weatherDependent) return null;
  
  return {
    checkWeather: true,
    suggestions: [
      'Check weather forecast before leaving',
      'Pack appropriate weather gear',
      'Consider backup indoor activities if outdoor event'
    ]
  };
};

/**
 * Generate transportation notes
 */
const getTransportationNotes = (event, analysis) => {
  const notes = [];
  
  if (analysis?.transportation === 'parent_required') {
    notes.push('Parent transportation required');
  }
  
  if (analysis?.arrivalBuffer) {
    notes.push(`Arrive ${analysis.arrivalBuffer} minutes early`);
  }
  
  if (event.location) {
    notes.push('Confirm location and parking availability');
  }
  
  return notes.length > 0 ? notes : null;
};

/**
 * Generate family-specific notes
 */
const getFamilySpecificNotes = (event, analysis) => {
  const notes = [];
  
  // Twin-specific considerations
  if (event.attendees?.includes('Kaleb') && event.attendees?.includes('Ella')) {
    notes.push('Both twins attending - pack for two');
  } else if (event.attendees?.includes('Kaleb') || event.attendees?.includes('Ella')) {
    notes.push('Single child event - coordinate with other parent/child');
  }
  
  // Dog considerations
  if (FAMILY_CONFIG.hasDog) {
    notes.push('Remember dog care routine before leaving');
  }
  
  return notes.length > 0 ? notes : null;
};

/**
 * Check if event is within preparation window (should show coordinator)
 * @param {Object} event - Event object
 * @param {number} hoursThreshold - Hours threshold (default 4)
 * @returns {boolean} - Whether event is within preparation window
 */
export const isEventWithinPreparationWindow = (event, hoursThreshold = 4) => {
  if (!event || !event.start_time) return false;
  
  const now = new Date();
  const eventTime = new Date(event.start_time);
  const diffHours = (eventTime - now) / (1000 * 60 * 60);
  
  return diffHours > 0 && diffHours <= hoursThreshold;
};

/**
 * Get the next upcoming event that needs coordination
 * @param {Array} events - Array of events
 * @returns {Object|null} - Next event needing coordination (current, upcoming, or recently ended)
 */
export const getNextEventNeedingCoordination = (events) => {
  if (!events || events.length === 0) return null;
  
  const now = new Date();
  
  // First priority: Check for CURRENT events (happening now)
  const currentEvent = events.find(event => {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time || event.start_time);
    // Add 1 hour to end time if no explicit end time
    if (!event.end_time) {
      endTime.setHours(endTime.getHours() + 1);
    }
    return startTime <= now && endTime >= now;
  });
  
  if (currentEvent) {
    return { ...currentEvent, status: 'current' };
  }
  
  // Second priority: Check for recently ended events (within 1 hour) for follow-up
  const recentlyEndedEvent = events.find(event => {
    const endTime = new Date(event.end_time || event.start_time);
    if (!event.end_time) {
      endTime.setHours(endTime.getHours() + 1);
    }
    const hoursSinceEnd = (now - endTime) / (1000 * 60 * 60);
    return hoursSinceEnd > 0 && hoursSinceEnd <= 1;
  });
  
  if (recentlyEndedEvent) {
    return { ...recentlyEndedEvent, status: 'recently_ended' };
  }
  
  // Third priority: Next event within preparation window (4 hours)
  const upcomingEvents = events
    .filter(event => {
      const eventTime = new Date(event.start_time);
      return eventTime > now;
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  
  // Find the next event within the preparation window
  for (const event of upcomingEvents) {
    if (isEventWithinPreparationWindow(event)) {
      return { ...event, status: 'upcoming' };
    }
  }
  
  // Fourth priority: If no events in prep window, show the very next event if within 8 hours
  if (upcomingEvents.length > 0) {
    const nextEvent = upcomingEvents[0];
    const hoursUntil = (new Date(nextEvent.start_time) - now) / (1000 * 60 * 60);
    if (hoursUntil <= 8) {
      return { ...nextEvent, status: 'next' };
    }
  }
  
  return null;
};

// Export the service object
export const eventContextService = {
  analyzeEventPattern,
  generatePreparationTimeline,
  getContextualSuggestions,
  isEventWithinPreparationWindow,
  getNextEventNeedingCoordination,
  FAMILY_CONFIG
};

export default eventContextService;