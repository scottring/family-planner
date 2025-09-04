import { Clock, MapPin, Users, CheckSquare, ChevronRight, AlertTriangle, Brain, Sparkles, Timer, ArrowUp, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { aiService } from '../../services/ai';

const eventTypeColors = {
  school: 'border-l-blue-500 bg-white',
  sports: 'border-l-green-500 bg-white',
  medical: 'border-l-red-500 bg-white',
  social: 'border-l-purple-500 bg-white',
  work: 'border-l-yellow-500 bg-white',
  personal: 'border-l-gray-500 bg-white',
  family: 'border-l-pink-500 bg-white',
  routine: 'border-l-indigo-500 bg-indigo-50',
  bedtime: 'border-l-purple-500 bg-purple-50',
  morning: 'border-l-orange-500 bg-orange-50',
  hygiene: 'border-l-cyan-500 bg-cyan-50'
};

const eventTypeIcons = {
  school: '🎓',
  sports: '⚽',
  medical: '🏥',
  social: '👥',
  work: '💼',
  personal: '👤',
  family: '👨‍👩‍👧‍👦',
  routine: '📋',
  bedtime: '🌙',
  morning: '🌅',
  hygiene: '🧼'
};

const EventCard = ({ event, onClick, compact = false, showDetails = true, onEventUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState(null);

  // Helper functions for recurring events
  const isRecurringInstance = () => {
    return !!event.parent_recurring_id;
  };

  const isRecurringTemplate = () => {
    return !!event.is_recurring;
  };

  const getRecurrenceText = () => {
    if (!event.recurrence_type) return '';
    
    switch (event.recurrence_type) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'weekdays':
        return 'Weekdays';
      case 'custom':
        const days = event.recurrence_days || [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = days.map(day => dayNames[day]).join(', ');
        return `Custom (${selectedDays})`;
      default:
        return 'Recurring';
    }
  };

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getTimeUntilEvent = () => {
    const now = new Date();
    const [eventHour, eventMinute] = event.time.split(':').map(Number);
    const eventDate = new Date();
    eventDate.setHours(eventHour, eventMinute, 0, 0);
    
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

  const isUpcoming = () => {
    const now = new Date();
    const [eventHour, eventMinute] = event.time.split(':').map(Number);
    const eventDate = new Date();
    eventDate.setHours(eventHour, eventMinute, 0, 0);
    
    const diffMs = eventDate.getTime() - now.getTime();
    return diffMs > 0 && diffMs <= 60 * 60 * 1000; // Next hour
  };

  const generateAvatars = (attendees) => {
    const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500'];
    
    return attendees.slice(0, 3).map((attendee, index) => {
      const initial = attendee.charAt(0).toUpperCase();
      const colorClass = avatarColors[index % avatarColors.length];
      
      return (
        <div
          key={attendee}
          className={`w-6 h-6 rounded-full ${colorClass} text-white text-xs flex items-center justify-center font-medium -ml-1 first:ml-0 border-2 border-white`}
          title={attendee}
        >
          {initial}
        </div>
      );
    });
  };

  const handleCardClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(event);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleEnrichWithAI = async (e) => {
    e.stopPropagation();
    setIsEnriching(true);
    setEnrichmentError(null);

    try {
      const eventData = {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        eventType: event.type,
        startTime: event.start_time || event.time,
        endTime: event.end_time || event.endTime
      };

      const response = await aiService.enrichEvent(eventData, true);
      
      if (response.event && onEventUpdate) {
        onEventUpdate(response.event);
      }
    } catch (error) {
      console.error('AI enrichment failed:', error);
      setEnrichmentError(error.message || 'Failed to enrich event');
    } finally {
      setIsEnriching(false);
    }
  };

  // AI enrichment helpers
  const isAIEnriched = event.ai_enriched;
  const needsEnrichment = aiService.needsEnrichment(event);
  const enrichmentPriority = aiService.getEnrichmentPriority(event);

  if (compact) {
    return (
      <div
        className={`border-l-4 ${eventTypeColors[event.type] || eventTypeColors[event.event_type] || eventTypeColors.personal} border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{eventTypeIcons[event.type] || eventTypeIcons[event.event_type] || eventTypeIcons.personal}</span>
              <h4 className="font-medium text-gray-800 truncate">{event.title}</h4>
              {(isRecurringInstance() || isRecurringTemplate()) && (
                <div className="flex items-center text-indigo-600">
                  <RotateCcw className="h-3 w-3" />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(event.time || event.start_time)}
              </span>
              {event.location && (
                <span className="flex items-center truncate">
                  <MapPin className="h-3 w-3 mr-1" />
                  {event.location}
                </span>
              )}
              {(isRecurringInstance() || isRecurringTemplate()) && (
                <span className="text-indigo-600 text-xs">
                  {getRecurrenceText()}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-l-4 ${eventTypeColors[event.type] || eventTypeColors[event.event_type] || eventTypeColors.personal} border border-gray-200 rounded-lg transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      } ${isUpcoming() ? 'ring-2 ring-blue-200' : ''}`}
      onClick={handleCardClick}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{eventTypeIcons[event.type] || eventTypeIcons[event.event_type] || eventTypeIcons.personal}</span>
                <h3 className="font-semibold text-gray-800">{event.title}</h3>
                {(event.checklist && event.checklist.length > 0) || (event.structured_checklist && event.structured_checklist.length > 0) && (
                  <CheckSquare className="h-4 w-4 text-gray-400" />
                )}
                {(isRecurringInstance() || isRecurringTemplate()) && (
                  <div className="flex items-center text-indigo-600 text-xs bg-indigo-100 px-2 py-1 rounded-full">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    <span>{getRecurrenceText()}</span>
                  </div>
                )}
                {isUpcoming() && (
                  <div className="flex items-center text-orange-600 text-xs bg-orange-100 px-2 py-1 rounded-full">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Soon
                  </div>
                )}
              </div>
              
              {/* AI Status Badge */}
              {isAIEnriched && (
                <div className="flex items-center space-x-1">
                  <Sparkles className="h-3 w-3 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">AI Enhanced</span>
                </div>
              )}
            </div>

            {/* Time and Duration */}
            <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTime(event.time)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                </span>
              </div>
              {isUpcoming() && (
                <span className="text-orange-600 font-medium">
                  {getTimeUntilEvent()}
                </span>
              )}
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center space-x-1 mb-3 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div className="flex items-center">
                    {generateAvatars(event.attendees)}
                    {event.attendees.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center -ml-1 border-2 border-white">
                        +{event.attendees.length - 3}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Description (if expanded or showDetails is true) */}
            {showDetails && event.description && (isExpanded || !onClick) && (
              <p className="text-sm text-gray-700 mb-3">{event.description}</p>
            )}

            {/* Checklist indicator */}
            {((event.checklist && event.checklist.length > 0) || (event.structured_checklist && event.structured_checklist.length > 0)) && (
              <div className="flex items-center space-x-2 text-sm">
                <CheckSquare className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600">
                  {(event.structured_checklist?.length || event.checklist?.length || 0)} item{(event.structured_checklist?.length || event.checklist?.length || 0) !== 1 ? 's' : ''} to prepare
                </span>
              </div>
            )}

            {/* AI Preparation time and departure time */}
            {isAIEnriched && (event.preparation_time || event.departure_time) && (
              <div className="flex items-center space-x-3 mb-2 text-xs">
                {event.preparation_time && (
                  <div className="flex items-center space-x-1 text-blue-600">
                    <Timer className="h-3 w-3" />
                    <span>Prep: {event.preparation_time} min</span>
                  </div>
                )}
                {event.departure_time && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span>Leave: {new Date(event.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                )}
              </div>
            )}

            {/* Original preparation time warning */}
            {event.preparation && (
              <div className="mt-3 flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                <AlertTriangle className="h-3 w-3" />
                <span>Start preparing {event.preparation} minutes before</span>
              </div>
            )}

            {/* Enrich with AI Button */}
            {needsEnrichment && (
              <div className="mt-2">
                <button
                  onClick={handleEnrichWithAI}
                  disabled={isEnriching}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                    enrichmentPriority === 'high' 
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Brain className={`h-3 w-3 ${isEnriching ? 'animate-pulse' : ''}`} />
                  <span>{isEnriching ? 'Enriching...' : 'Enrich with AI'}</span>
                  {enrichmentPriority === 'high' && <AlertTriangle className="h-3 w-3" />}
                </button>
                
                {enrichmentError && (
                  <div className="mt-1 text-xs text-red-600">
                    {enrichmentError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expand/collapse button for non-clickable cards */}
          {!onClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && !onClick && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            {event.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                <p className="text-sm text-gray-700">{event.description}</p>
              </div>
            )}

            {/* Checklist display - prioritize structured_checklist over checklist */}
            {(event.structured_checklist && event.structured_checklist.length > 0) ? (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Routine Checklist</h4>
                <div className="space-y-2">
                  {event.structured_checklist.map((item, index) => (
                    <label key={index} className="flex items-start space-x-2 text-sm">
                      <input type="checkbox" className="rounded mt-1" />
                      <div className="flex-1">
                        <span>{item.text}</span>
                        {item.conditional && (
                          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                            Conditional
                          </span>
                        )}
                        {item.category && (
                          <span className="ml-2 text-xs text-gray-500">({item.category})</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (event.checklist && event.checklist.length > 0) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Preparation Checklist</h4>
                <div className="space-y-1">
                  {event.checklist.map((item, index) => (
                    <label key={index} className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Attendees</h4>
                <div className="flex flex-wrap gap-2">
                  {event.attendees.map((attendee, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {attendee}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;