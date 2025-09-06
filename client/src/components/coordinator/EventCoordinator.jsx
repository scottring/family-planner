import { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Users, 
  Navigation, 
  Phone,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Star,
  Calendar,
  Backpack,
  Car,
  Utensils,
  Dog,
  UserPlus
} from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';
import { eventContextService } from '../../services/eventContext';
import { useEventTemplateStore } from '../../stores/eventTemplateStore';
import { useFamilyStore } from '../../stores/familyStore';
import PreparationTimeline from './PreparationTimeline';
import PostEventTimeline from './PostEventTimeline';
import PersonAssignment from '../common/PersonAssignment';

const EventCoordinator = ({ className = '' }) => {
  const { events } = useEventStore();
  const { user } = useAuthStore();
  const templateStore = useEventTemplateStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [templateInfo, setTemplateInfo] = useState(null);

  // Get the next event that needs coordination
  const baseEvent = eventContextService.getNextEventNeedingCoordination(events);
  
  // Enhance with stored attendees if available
  const coordinatorEvent = baseEvent ? {
    ...baseEvent,
    attendees: JSON.parse(localStorage.getItem(`event-${baseEvent.id}-attendees`) || '[]') || baseEvent.attendees || []
  } : null;

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Check for template information
  useEffect(() => {
    const checkTemplateInfo = async () => {
      if (!coordinatorEvent || !user) return;

      try {
        const analysis = eventContextService.analyzeEventPattern(coordinatorEvent);
        if (!analysis) return;

        const suggestion = await templateStore.suggestTemplate(coordinatorEvent);
        
        if (suggestion) {
          setTemplateInfo({
            hasTemplate: true,
            confidence: suggestion.confidence,
            usageCount: suggestion.template.usage_count,
            eventPattern: suggestion.template.event_pattern,
            reason: suggestion.reason
          });
        }
      } catch (error) {
        console.warn('Error checking template info:', error);
      }
    };

    checkTemplateInfo();
  }, [coordinatorEvent, user, templateStore]);
  
  if (!coordinatorEvent) return null;

  const eventSuggestions = eventContextService.getContextualSuggestions(coordinatorEvent);

  // Helper functions
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatTimeUntil = (eventTime) => {
    const now = currentTime;
    const event = new Date(eventTime);
    const diffMs = event.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Now';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const generateMapsUrl = (location) => {
    if (!location) return null;
    const encodedAddress = encodeURIComponent(location);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  };

  const getUrgencyLevel = (eventTime) => {
    const timeUntilMs = new Date(eventTime) - currentTime;
    const hoursUntil = timeUntilMs / (1000 * 60 * 60);
    
    if (hoursUntil <= 1) return 'urgent';
    if (hoursUntil <= 2) return 'warning';
    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel(coordinatorEvent.start_time);
  
  const getUrgencyStyles = () => {
    switch (urgencyLevel) {
      case 'urgent':
        return {
          border: 'border-red-300',
          bg: 'bg-gradient-to-r from-red-50 to-orange-50',
          header: 'bg-gradient-to-r from-red-100 to-orange-100',
          pulse: 'animate-pulse',
          text: 'text-red-800'
        };
      case 'warning':
        return {
          border: 'border-orange-300',
          bg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
          header: 'bg-gradient-to-r from-orange-100 to-yellow-100',
          pulse: '',
          text: 'text-orange-800'
        };
      default:
        return {
          border: 'border-blue-300',
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          header: 'bg-gradient-to-r from-blue-100 to-indigo-100',
          pulse: '',
          text: 'text-blue-800'
        };
    }
  };

  const styles = getUrgencyStyles();

  // Clear/reset templates for this event
  const resetTemplate = async () => {
    if (!coordinatorEvent) return;
    
    try {
      const analysis = eventContextService.analyzeEventPattern(coordinatorEvent);
      if (analysis) {
        const eventType = coordinatorEvent.title?.toLowerCase() || 'generic';
        await templateStore.clearTemplate(eventType, analysis.patternName);
        setTemplateInfo(null);
        
        // Clear localStorage data for this event
        localStorage.removeItem(`event-timeline-${coordinatorEvent.id}`);
        localStorage.removeItem(`task-actions-${coordinatorEvent.id}`);
        localStorage.removeItem(`post-event-${coordinatorEvent.id}`);
      }
    } catch (error) {
      console.error('Error resetting template:', error);
    }
  };

  return (
    <div className={`${className}`}>
      {/* Preparation Timeline - Show BEFORE Event Card */}
      <PreparationTimeline event={coordinatorEvent} className="mb-4" />
      
      {/* Main Coordinator Card */}
      <div className={`rounded-2xl shadow-xl border-2 ${styles.border} ${styles.bg} overflow-hidden ${styles.pulse}`}>
        {/* Header - Mobile Optimized */}
        <div className={`px-4 sm:px-6 py-3 sm:py-4 ${styles.header} border-b border-gray-200`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-white/80 rounded-lg">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Smart Event Coordinator</h2>
                <p className={`text-xs sm:text-sm ${styles.text} font-medium mobile-contrast`}>
                  {urgencyLevel === 'urgent' ? 'URGENT - Event starting soon!' :
                   urgencyLevel === 'warning' ? 'Time to prepare!' :
                   'Upcoming event preparation'}
                </p>
              </div>
            </div>
            <div className={`text-left sm:text-right ${styles.text} w-full sm:w-auto`}>
              <div className="text-xl sm:text-2xl font-bold">
                {formatTimeUntil(coordinatorEvent.start_time)}
              </div>
              <div className="text-xs sm:text-sm font-medium">until start</div>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 mobile-contrast leading-tight">
              {coordinatorEvent.title}
            </h3>
            {coordinatorEvent.description && (
              <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">{coordinatorEvent.description}</p>
            )}

            {/* Key Event Info Grid - Mobile First */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* Time */}
              <div className="bg-white/80 rounded-lg p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">
                      {formatTime(coordinatorEvent.start_time)}
                    </div>
                    {coordinatorEvent.end_time && (
                      <div className="text-xs sm:text-sm text-gray-600">
                        to {formatTime(coordinatorEvent.end_time)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location with Maps Integration */}
              {coordinatorEvent.location && (
                <div className="bg-white/80 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                          {coordinatorEvent.location}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Location</div>
                      </div>
                    </div>
                    <a
                      href={generateMapsUrl(coordinatorEvent.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm touch-target no-select"
                    >
                      <Navigation className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Navigate</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Attendees/Responsibility */}
              <div className="bg-white/80 rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-900">Attendees</span>
                  </div>
                  <PersonAssignment
                    value={coordinatorEvent.attendees || []}
                    onChange={(newAttendees) => {
                      // Update the event with new attendees
                      const { updateEvent } = useEventStore.getState();
                      updateEvent(coordinatorEvent.id, {
                        ...coordinatorEvent,
                        attendees: newAttendees
                      });
                      
                      // Save to localStorage as well
                      const storageKey = `event-${coordinatorEvent.id}-attendees`;
                      localStorage.setItem(storageKey, JSON.stringify(newAttendees));
                    }}
                    allowMultiple={true}
                    placeholder="Select who's attending..."
                    compact={false}
                  />
                </div>
              </div>

              {/* Pattern Recognition & Template Info */}
              {eventSuggestions.pattern && (
                <div className="bg-white/80 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-semibold text-gray-900 capitalize">
                          {eventSuggestions.pattern.patternName} Event
                        </div>
                        <div className="text-sm text-gray-600">
                          {eventSuggestions.pattern.confidence}% confidence match
                        </div>
                        {templateInfo && templateInfo.hasTemplate && (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            Smart template available ({templateInfo.usageCount} uses)
                          </div>
                        )}
                      </div>
                    </div>
                    {templateInfo && templateInfo.hasTemplate && (
                      <button
                        onClick={resetTemplate}
                        className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 border border-gray-300 rounded hover:border-red-300 transition-colors"
                        title="Reset template for this event type"
                      >
                        Reset Template
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons - Mobile Optimized */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
            {/* Navigation Button */}
            {coordinatorEvent.location && (
              <a
                href={generateMapsUrl(coordinatorEvent.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-1 sm:space-x-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm touch-target-lg no-select mobile-scale"
              >
                <Car className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">Navigate</span>
              </a>
            )}


            {/* Packing List */}
            {eventSuggestions.packingList && eventSuggestions.packingList.length > 0 && (
              <button
                onClick={() => setExpandedEvent(expandedEvent === 'packing' ? null : 'packing')}
                className="flex items-center justify-center space-x-1 sm:space-x-2 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm touch-target-lg no-select mobile-scale"
              >
                <Backpack className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">Pack</span>
              </button>
            )}

            {/* Meal Planning */}
            {eventSuggestions.mealSuggestions && (
              <button
                onClick={() => setExpandedEvent(expandedEvent === 'meals' ? null : 'meals')}
                className="flex items-center justify-center space-x-1 sm:space-x-2 p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-colors shadow-sm touch-target-lg no-select mobile-scale"
              >
                <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm font-medium">Meals</span>
              </button>
            )}
          </div>

          {/* Expandable Sections */}
          
          {/* Packing List Section */}
          {expandedEvent === 'packing' && eventSuggestions.packingList && (
            <div className="mb-6 p-4 bg-white/90 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Backpack className="h-5 w-5 text-green-600" />
                <span>Smart Packing List</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {eventSuggestions.packingList.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-green-50 rounded text-sm">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meal Suggestions Section */}
          {expandedEvent === 'meals' && eventSuggestions.mealSuggestions && (
            <div className="mb-6 p-4 bg-white/90 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Utensils className="h-5 w-5 text-orange-600" />
                <span>Meal Planning</span>
              </h4>
              <div className="space-y-2">
                {eventSuggestions.mealSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-orange-50 rounded text-sm">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Family-Specific Notes */}
          {eventSuggestions.familySpecificNotes && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center space-x-2">
                <Dog className="h-5 w-5" />
                <span>Family Reminders</span>
              </h4>
              <ul className="space-y-1">
                {eventSuggestions.familySpecificNotes.map((note, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-start space-x-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      {/* Post-Event Timeline - Show After Event Card */}
      <PostEventTimeline event={coordinatorEvent} className="mt-4" />

    </div>
  );
};

export default EventCoordinator;