import { useState, useMemo, useEffect, useRef } from 'react';
import { Clock, MapPin, Users, AlertTriangle, Cloud, Sun, CloudRain, Timer, Backpack, Phone, ChevronRight, CheckSquare, Brain, Sparkles, ArrowUp, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEventStore } from '../../stores/eventStore';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import EventAssignment from '../events/EventAssignment';

const eventTypeColors = {
  school: 'border-l-blue-500 bg-white',
  sports: 'border-l-green-500 bg-white',
  medical: 'border-l-red-500 bg-white',
  social: 'border-l-purple-500 bg-white',
  work: 'border-l-yellow-500 bg-white',
  personal: 'border-l-gray-500 bg-white',
  family: 'border-l-pink-500 bg-white'
};

const eventTypeIcons = {
  school: '🎓',
  sports: '⚽',
  medical: '🏥',
  social: '👥',
  work: '💼',
  personal: '👤',
  family: '👨‍👩‍👧‍👦'
};

const DailyTimeline = ({ date }) => {
  const navigate = useNavigate();
  const { events, fetchEvents } = useEventStore();
  const [todayEvents, setTodayEvents] = useState([]);
  const [expandedEventIds, setExpandedEventIds] = useState(new Set());
  const timelineRef = useRef(null);
  
  // Use current date if no date prop provided
  const displayDate = useMemo(() => date || new Date(), [date]);
  
  // Mock weather data - replace with actual weather API later
  const mockWeather = {
    temperature: 72,
    condition: 'Partly Cloudy',
    high: 78,
    low: 65
  };
  
  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Filter events for today
    const start = startOfDay(displayDate);
    const end = endOfDay(displayDate);
    
    const filtered = events.filter(event => {
      if (!event.start_time) return false;
      const eventDate = parseISO(event.start_time);
      return eventDate >= start && eventDate <= end;
    }).map(event => {
      // Convert to the format expected by the component
      const startTime = parseISO(event.start_time);
      const endTime = parseISO(event.end_time);
      return {
        ...event,
        time: format(startTime, 'HH:mm'),
        endTime: format(endTime, 'HH:mm'),
        type: event.category || 'personal',
        attendees: event.attendees ? event.attendees.split(',').map(a => a.trim()) : [],
        checklist: event.checklist ? event.checklist.split('\n') : [],
        preparation: 15 // default preparation time
      };
    }).sort((a, b) => a.time.localeCompare(b.time));
    
    setTodayEvents(filtered);
  }, [events, displayDate]);

  // Categorize events based on timing relative to current time
  const categorizedEvents = useMemo(() => {
    const now = new Date();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const currentEvents = [];
    const nextEvents = [];
    const pastEvents = [];
    const futureEvents = [];

    todayEvents.forEach(event => {
      const [startHour, startMinute] = event.time.split(':').map(Number);
      const [endHour, endMinute] = event.endTime.split(':').map(Number);
      const startTime = startHour + startMinute / 60;
      const endTime = endHour + endMinute / 60;
      
      if (currentTime >= startTime && currentTime <= endTime) {
        // Currently happening
        currentEvents.push({ ...event, status: 'current' });
      } else if (startTime > currentTime && startTime <= currentTime + 2) {
        // Next 2 hours
        nextEvents.push({ ...event, status: 'next' });
      } else if (startTime < currentTime) {
        // Past events
        pastEvents.push({ ...event, status: 'past' });
      } else {
        // Future events (beyond 2 hours)
        futureEvents.push({ ...event, status: 'future' });
      }
    });

    return { currentEvents, nextEvents, pastEvents, futureEvents };
  }, [todayEvents]);

  // Get current time position for timeline indicator
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    if (currentHour < 6 || currentHour > 22) return null;
    
    const totalMinutesInDay = (22 - 6) * 60; // 16 hours * 60 minutes
    const currentMinutesFromStart = (currentHour - 6) * 60 + currentMinutes;
    return (currentMinutesFromStart / totalMinutesInDay) * 100;
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (timelineRef.current && currentTimePosition !== null) {
      const scrollElement = timelineRef.current;
      const scrollPosition = (currentTimePosition / 100) * scrollElement.scrollHeight;
      scrollElement.scrollTop = Math.max(0, scrollPosition - scrollElement.clientHeight / 2);
    }
  }, [currentTimePosition, todayEvents]);

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getTimeUntilEvent = (eventTime) => {
    const now = new Date();
    const [eventHour, eventMinute] = eventTime.split(':').map(Number);
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

  const WeatherIcon = ({ condition }) => {
    switch (condition.toLowerCase()) {
      case 'sunny': return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'cloudy': return <Cloud className="h-5 w-5 text-gray-500" />;
      case 'rainy': return <CloudRain className="h-5 w-5 text-blue-500" />;
      default: return <Sun className="h-5 w-5 text-yellow-500" />;
    }
  };

  // Large detailed card for current/next events
  const DetailedEventCard = ({ event }) => (
    <div
      className={`border-l-4 ${eventTypeColors[event.type]} border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all ${
        event.status === 'current' ? 'ring-2 ring-red-300 bg-red-50' : 'ring-2 ring-blue-300 bg-blue-50'
      }`}
      onClick={() => navigate(`/event/${event.id}`)}
    >
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{eventTypeIcons[event.type]}</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
            <div className="flex items-center space-x-2 text-sm">
              {event.status === 'current' && (
                <div className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  <Timer className="h-3 w-3 mr-1" />
                  <span className="font-medium">HAPPENING NOW</span>
                </div>
              )}
              {event.status === 'next' && (
                <div className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 mr-1" />
                  <span className="font-medium">{getTimeUntilEvent(event.time)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {event.ai_enriched && (
          <div className="flex items-center space-x-1">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-600 font-medium">AI Enhanced</span>
          </div>
        )}
      </div>

      {/* Time and Duration */}
      <div className="flex items-center space-x-4 mb-4 text-gray-700">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span className="text-lg font-medium">
            {formatTime(event.time)} - {formatTime(event.endTime)}
          </span>
        </div>
      </div>

      {/* Location */}
      {event.location && (
        <div className="flex items-center space-x-2 mb-4 text-gray-700">
          <MapPin className="h-5 w-5" />
          <span className="text-lg">{event.location}</span>
        </div>
      )}

      {/* Attendees */}
      {event.attendees && event.attendees.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-gray-500" />
            <div className="flex items-center">
              {generateAvatars(event.attendees)}
              {event.attendees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center -ml-1 border-2 border-white">
                  +{event.attendees.length - 3}
                </div>
              )}
            </div>
          </div>
          <span className="text-gray-600">
            {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Description */}
      {event.description && (
        <p className="text-gray-700 mb-4 text-base leading-relaxed">{event.description}</p>
      )}

      {/* AI Preparation info */}
      {event.ai_enriched && (event.preparation_time || event.departure_time) && (
        <div className="flex items-center space-x-4 mb-4 text-sm">
          {event.preparation_time && (
            <div className="flex items-center space-x-2 text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              <Timer className="h-4 w-4" />
              <span>Prep: {event.preparation_time} min</span>
            </div>
          )}
          {event.departure_time && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-100 px-3 py-1 rounded-full">
              <ArrowUp className="h-4 w-4" />
              <span>Leave: {new Date(event.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          )}
        </div>
      )}

      {/* Logistics indicators */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {event.checklist && event.checklist.length > 0 && (
            <div className="flex items-center space-x-1 text-blue-600">
              <CheckSquare className="h-4 w-4" />
              <span className="text-sm">{event.checklist.length} items to prepare</span>
            </div>
          )}
          {event.packing_list && event.packing_list.length > 0 && (
            <div className="flex items-center space-x-1 text-green-600">
              <Backpack className="h-4 w-4" />
              <span className="text-sm">{event.packing_list.length} items to pack</span>
            </div>
          )}
          {event.contacts && event.contacts.length > 0 && (
            <div className="flex items-center space-x-1 text-purple-600">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{event.contacts.length} contacts</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <EventAssignment event={event} compact={false} showLabel={false} />
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  );

  // Toggle event expansion
  const toggleEventExpansion = (eventId) => {
    setExpandedEventIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Compact card for past/future events
  const CompactEventCard = ({ event }) => {
    const isExpanded = expandedEventIds.has(event.id);
    
    // If expanded, show detailed card
    if (isExpanded) {
      return (
        <div
          className={`border-l-4 ${eventTypeColors[event.type]} border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all ${
            event.status === 'past' ? 'opacity-90 bg-gray-50' : 'bg-white'
          }`}
        >
          {/* Close expansion button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{eventTypeIcons[event.type]}</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
                <p className="text-sm text-gray-600">
                  {formatTime(event.time)} - {formatTime(event.endTime)}
                  {event.status === 'past' && (
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Past</span>
                  )}
                  {event.status === 'future' && (
                    <span className="ml-2 text-xs text-green-600">{getTimeUntilEvent(event.time)}</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleEventExpansion(event.id);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Collapse"
            >
              <ChevronRight className="h-5 w-5 rotate-90" />
            </button>
          </div>

          {/* Location */}
          <div className="flex items-center space-x-2 mb-3">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700">{event.location || 'No location set'}</span>
          </div>

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="mb-3">
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
                <span className="text-gray-600">
                  {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-gray-700 mb-4 text-base leading-relaxed">{event.description}</p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/event/${event.id}`);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              View Full Details
            </button>
            <EventAssignment event={event} compact={false} showLabel={false} />
          </div>
        </div>
      );
    }
    
    // Regular compact view
    return (
    <div
      className={`border-l-4 ${eventTypeColors[event.type]} border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all ${
        event.status === 'past' ? 'opacity-70' : ''
      }`}
      onClick={() => toggleEventExpansion(event.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm">{eventTypeIcons[event.type]}</span>
            <h4 className="font-medium text-gray-800 truncate">{event.title}</h4>
            {event.status === 'past' && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Past</span>
            )}
            {event.ai_enriched && (
              <Sparkles className="h-3 w-3 text-purple-600" />
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(event.time)} - {formatTime(event.endTime)}
            </span>
            <span className="flex items-center truncate">
              <MapPin className="h-3 w-3 mr-1" />
              {event.location}
            </span>
            {event.attendees && event.attendees.length > 0 && (
              <span className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {event.attendees.length}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <EventAssignment event={event} compact={true} showLabel={false} />
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
  };

  // Timeline hours from 6am to 10pm
  const timelineHours = useMemo(() => {
    const hours = [];
    for (let hour = 6; hour <= 22; hour++) {
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hours.push({
        hour24: hour,
        display: `${displayHour}:00 ${ampm}`,
        displayShort: `${displayHour}${ampm}`
      });
    }
    return hours;
  }, []);

  const allPriorityEvents = [...categorizedEvents.currentEvents, ...categorizedEvents.nextEvents];
  const allCompactEvents = [...categorizedEvents.pastEvents, ...categorizedEvents.futureEvents];

  return (
    <div className="space-y-6">
      {/* Header with Date and Weather */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {displayDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h1>
            <p className="text-gray-600">Today's Schedule</p>
          </div>
          
          {/* Weather Widget */}
          <div className="bg-blue-50 rounded-lg p-4 flex items-center space-x-3">
            <WeatherIcon condition={mockWeather.condition} />
            <div>
              <p className="text-lg font-semibold text-gray-900">{mockWeather.temperature}°F</p>
              <p className="text-sm text-gray-600">{mockWeather.condition}</p>
              <p className="text-xs text-gray-500">
                H: {mockWeather.high}° L: {mockWeather.low}°
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Timeline with Integrated Cards */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Today's Timeline</h2>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Events displayed in chronological order */}
          {todayEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No events scheduled for today</p>
            </div>
          ) : (
            todayEvents.map((event) => {
              // Check if this is a current or next event for larger display
              const isCurrentOrNext = allPriorityEvents.some(e => e.id === event.id);
              
              if (isCurrentOrNext) {
                // Show as detailed card
                return <DetailedEventCard key={event.id} event={event} />;
              } else {
                // Show as compact card
                return <CompactEventCard key={event.id} event={event} />;
              }
            })
          )}
        </div>
      </div>

      {/* Logistics Summary */}
      {todayEvents.some(event => event.packing_list?.length > 0 || event.contacts?.length > 0 || event.weather_dependent || event.parking_info) && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Backpack className="h-5 w-5 text-green-600" />
            Today's Logistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayEvents
              .filter(event => event.packing_list?.length > 0 || event.contacts?.length > 0 || event.weather_dependent || event.parking_info)
              .map(event => (
                <div key={event.id} className="bg-white rounded-lg p-3 border border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-2">{event.title}</h4>
                  <div className="space-y-1 text-sm">
                    {event.packing_list && event.packing_list.length > 0 && (
                      <div className="flex items-center gap-2 text-green-700">
                        <Backpack className="h-4 w-4" />
                        <span>{event.packing_list.length} items to pack</span>
                      </div>
                    )}
                    {event.contacts && event.contacts.length > 0 && (
                      <div className="flex items-center gap-2 text-purple-700">
                        <Phone className="h-4 w-4" />
                        <span>{event.contacts.length} contacts available</span>
                      </div>
                    )}
                    {event.weather_dependent && (
                      <div className="flex items-center gap-2 text-blue-700">
                        <CloudRain className="h-4 w-4" />
                        <span>Weather-dependent</span>
                      </div>
                    )}
                    {event.parking_info && (
                      <div className="flex items-center gap-2 text-orange-700">
                        <MapPin className="h-4 w-4" />
                        <span>Parking info available</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTimeline;