import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';

/**
 * Format time for display in the Today page
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    const date = parseISO(timeStr);
    return format(date, 'h:mm a');
  } catch (error) {
    return timeStr;
  }
};

/**
 * Get time until an event starts
 */
export const getTimeUntilEvent = (eventTime) => {
  if (!eventTime) return '';
  const now = new Date();
  const eventDate = parseISO(eventTime);
  const diffMs = eventDate.getTime() - now.getTime();
  
  if (diffMs < 0) {
    return 'Started';
  }
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `in ${diffHours}h ${diffMinutes}m`;
  }
  return `in ${diffMinutes}m`;
};

/**
 * Generate avatar initials for attendees
 */
export const generateAvatarInitials = (attendees = []) => {
  const avatarColors = [
    'bg-blue-500', 
    'bg-green-500', 
    'bg-purple-500', 
    'bg-pink-500', 
    'bg-yellow-500', 
    'bg-indigo-500',
    'bg-red-500',
    'bg-gray-500'
  ];
  
  if (typeof attendees === 'string') {
    attendees = attendees.split(',').map(a => a.trim());
  }
  
  return attendees.slice(0, 3).map((attendee, index) => {
    const initial = attendee.charAt(0).toUpperCase();
    const colorClass = avatarColors[index % avatarColors.length];
    
    return {
      attendee,
      initial,
      colorClass,
      id: `${attendee}-${index}`
    };
  });
};

/**
 * Determine if an event should be auto-expanded
 */
export const shouldAutoExpand = (event, currentTime = new Date()) => {
  if (!event.start_time || !event.end_time) return false;
  
  const startTime = parseISO(event.start_time);
  const endTime = parseISO(event.end_time);
  
  // Auto-expand if currently happening
  if (currentTime >= startTime && currentTime <= endTime) {
    return true;
  }
  
  // Auto-expand if starting within next hour
  const minutesUntilStart = differenceInMinutes(startTime, currentTime);
  if (minutesUntilStart > 0 && minutesUntilStart <= 60) {
    return true;
  }
  
  return false;
};

/**
 * Get event urgency level based on timing
 */
export const getEventUrgency = (event, currentTime = new Date()) => {
  if (!event.start_time) return 'normal';
  
  const startTime = parseISO(event.start_time);
  const endTime = event.end_time ? parseISO(event.end_time) : null;
  
  // If currently happening
  if (endTime && currentTime >= startTime && currentTime <= endTime) {
    return 'current';
  }
  
  const minutesUntilStart = differenceInMinutes(startTime, currentTime);
  
  if (minutesUntilStart < 0) {
    return 'past';
  } else if (minutesUntilStart <= 15) {
    return 'urgent';
  } else if (minutesUntilStart <= 60) {
    return 'soon';
  } else {
    return 'normal';
  }
};

/**
 * Get CSS classes for event urgency
 */
export const getUrgencyClasses = (urgency) => {
  switch (urgency) {
    case 'current':
      return {
        border: 'border-red-300',
        background: 'bg-red-50',
        text: 'text-red-800',
        ring: 'ring-2 ring-red-300'
      };
    case 'urgent':
      return {
        border: 'border-orange-300',
        background: 'bg-orange-50',
        text: 'text-orange-800',
        ring: 'ring-1 ring-orange-300'
      };
    case 'soon':
      return {
        border: 'border-yellow-300',
        background: 'bg-yellow-50',
        text: 'text-yellow-800',
        ring: ''
      };
    case 'past':
      return {
        border: 'border-gray-300',
        background: 'bg-gray-50',
        text: 'text-gray-600',
        ring: '',
        opacity: 'opacity-75'
      };
    default:
      return {
        border: 'border-gray-200',
        background: 'bg-white',
        text: 'text-gray-800',
        ring: ''
      };
  }
};

/**
 * Calculate suggested times for adding new events in gaps
 */
export const calculateGapSuggestions = (gap) => {
  const suggestions = [];
  const startTime = parseISO(gap.startTime);
  const endTime = parseISO(gap.endTime);
  const gapMinutes = differenceInMinutes(endTime, startTime);
  
  if (gapMinutes >= 30) {
    // Suggest 15 minutes after the previous event ends
    suggestions.push({
      time: addMinutes(startTime, 15),
      duration: Math.min(60, gapMinutes - 30), // Leave 15 min buffer
      type: 'event'
    });
  }
  
  if (gapMinutes >= 60) {
    // Suggest meal times
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    
    if (startHour <= 12 && endHour >= 12) {
      suggestions.push({
        time: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 12, 0),
        duration: 60,
        type: 'meal',
        title: 'Lunch'
      });
    }
    
    if (startHour <= 18 && endHour >= 18) {
      suggestions.push({
        time: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 18, 0),
        duration: 90,
        type: 'meal',
        title: 'Dinner'
      });
    }
  }
  
  return suggestions;
};

/**
 * Format duration for display
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Get weather-appropriate suggestions for events
 */
export const getWeatherSuggestions = (weather, eventType) => {
  const suggestions = [];
  
  if (!weather) return suggestions;
  
  if (weather.condition?.toLowerCase().includes('rain')) {
    suggestions.push({
      type: 'warning',
      text: 'Consider bringing an umbrella',
      icon: '☔'
    });
    
    if (eventType === 'sports' || eventType === 'outdoor') {
      suggestions.push({
        type: 'alert',
        text: 'Weather may affect outdoor activities',
        icon: '⚠️'
      });
    }
  }
  
  if (weather.temperature && weather.temperature < 40) {
    suggestions.push({
      type: 'info',
      text: 'Dress warmly - it\'s cold outside',
      icon: '🧥'
    });
  }
  
  if (weather.temperature && weather.temperature > 85) {
    suggestions.push({
      type: 'info',
      text: 'Stay hydrated - it\'s hot outside',
      icon: '💧'
    });
  }
  
  return suggestions;
};

/**
 * Check if an event conflicts with another event
 */
export const checkEventConflict = (newEvent, existingEvents) => {
  if (!newEvent.start_time || !newEvent.end_time) return null;
  
  const newStart = parseISO(newEvent.start_time);
  const newEnd = parseISO(newEvent.end_time);
  
  for (const event of existingEvents) {
    if (!event.start_time || !event.end_time || event.id === newEvent.id) continue;
    
    const existingStart = parseISO(event.start_time);
    const existingEnd = parseISO(event.end_time);
    
    // Check for overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      return {
        conflictsWith: event,
        overlapMinutes: Math.min(
          differenceInMinutes(newEnd, existingStart),
          differenceInMinutes(existingEnd, newStart)
        )
      };
    }
  }
  
  return null;
};

/**
 * Get accessibility attributes for interactive elements
 */
export const getAccessibilityProps = (elementType, context = {}) => {
  const baseProps = {
    role: elementType === 'button' ? 'button' : elementType,
    tabIndex: 0
  };
  
  switch (elementType) {
    case 'eventCard':
      return {
        ...baseProps,
        'aria-label': `${context.expanded ? 'Collapse' : 'Expand'} details for ${context.title}`,
        'aria-expanded': context.expanded || false
      };
    case 'checklistItem':
      return {
        ...baseProps,
        role: 'checkbox',
        'aria-checked': context.completed || false,
        'aria-label': `${context.completed ? 'Mark as incomplete' : 'Mark as complete'}: ${context.title}`
      };
    case 'addItemButton':
      return {
        ...baseProps,
        'aria-label': `Add ${context.itemType} ${context.context ? `for ${context.context}` : ''}`
      };
    default:
      return baseProps;
  }
};