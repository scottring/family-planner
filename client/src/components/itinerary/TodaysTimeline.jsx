import { useState, useMemo, useEffect } from 'react';
import { Clock, MapPin, Users, Timer, Backpack, Phone, ChevronRight, Sparkles, ArrowUp, Car, Bike, Navigation, Route, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEventStore } from '../../stores/eventStore';
import { mapService } from '../../services/mapService';
import { format, parseISO, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import EventAssignment from '../events/EventAssignment';

const eventTypeColors = {
  school: 'border-l-blue-500 bg-white hover:bg-blue-50',
  sports: 'border-l-green-500 bg-white hover:bg-green-50',
  medical: 'border-l-red-500 bg-white hover:bg-red-50',
  social: 'border-l-purple-500 bg-white hover:bg-purple-50',
  work: 'border-l-yellow-500 bg-white hover:bg-yellow-50',
  personal: 'border-l-gray-500 bg-white hover:bg-gray-50',
  family: 'border-l-pink-500 bg-white hover:bg-pink-50',
  travel: 'border-l-indigo-500 bg-indigo-50 hover:bg-indigo-100',
  transportation: 'border-l-indigo-500 bg-indigo-50 hover:bg-indigo-100'
};

const eventTypeIcons = {
  school: '🎓',
  sports: '⚽',
  medical: '🏥',
  social: '👥',
  work: '💼',
  personal: '👤',
  family: '👨‍👩‍👧‍👦',
  travel: '🚗',
  transportation: '🚗'
};

// Transportation mode specific icons and colors
const transportationModeConfig = {
  driving: { icon: Car, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Driving' },
  walking: { icon: Navigation, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Walking' },
  bicycling: { icon: Bike, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Bicycling' },
  transit: { icon: Route, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Transit' }
};

const TodaysTimeline = ({ date }) => {
  const navigate = useNavigate();
  const { events, fetchEvents } = useEventStore();
  const [todayEvents, setTodayEvents] = useState([]);
  
  // Use current date if no date prop provided
  const displayDate = useMemo(() => date || new Date(), [date]);
  
  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Filter events for today and sort by time
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
        startTime,
        endTime,
        time: format(startTime, 'HH:mm'),
        endTimeFormatted: format(endTime, 'HH:mm'),
        type: event.category || 'personal',
        attendees: event.attendees ? (
          typeof event.attendees === 'string' 
            ? event.attendees.split(',').map(a => a.trim())
            : Array.isArray(event.attendees) ? event.attendees : []
        ) : [],
        checklist: event.checklist ? (
          typeof event.checklist === 'string'
            ? event.checklist.split('\n')
            : Array.isArray(event.checklist) ? event.checklist : []
        ) : [],
        preparation: 15 // default preparation time
      };
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    setTodayEvents(filtered);
  }, [events, displayDate]);

  // Get current time status for events
  const getEventStatus = (event) => {
    const now = new Date();
    const startTime = event.startTime;
    const endTime = event.endTime;
    
    if (now >= startTime && now <= endTime) {
      return 'current';
    } else if (startTime > now) {
      const minutesUntil = differenceInMinutes(startTime, now);
      if (minutesUntil <= 120) { // Within 2 hours
        return 'upcoming';
      }
      return 'future';
    } else {
      return 'past';
    }
  };

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  // Transportation event helpers
  const isTransportationEvent = (event) => {
    return event.event_type === 'travel' || 
           event.category === 'travel' || 
           event.type === 'travel' ||
           event.transportation_mode || 
           event.driving_needed ||
           event.starting_address ||
           event.destination_address ||
           (event.transportation_data && Object.keys(event.transportation_data).length > 0);
  };

  const handleOpenInMaps = (event) => {
    const routeInfo = {
      starting_address: event.transportation_data?.starting_address || event.starting_address,
      destination_address: event.transportation_data?.destination_address || event.destination_address || event.location,
      stops: event.transportation_data?.stops || event.stops || []
    };
    
    if (routeInfo.starting_address && routeInfo.destination_address) {
      const waypoints = routeInfo.stops?.map(stop => stop.address).filter(Boolean) || [];
      const mapsUrl = mapService.generateNavigationUrl(
        routeInfo.starting_address,
        routeInfo.destination_address,
        waypoints
      );
      if (mapsUrl) {
        window.open(mapsUrl, '_blank');
      }
    }
  };

  const getTimeUntilEvent = (startTime) => {
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();
    
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

  // Calculate time gap between events
  const getTimeGap = (prevEvent, currentEvent) => {
    if (!prevEvent) return null;
    
    const gapMinutes = differenceInMinutes(currentEvent.startTime, prevEvent.endTime);
    
    if (gapMinutes < 30) {
      return { type: 'short', minutes: gapMinutes };
    } else if (gapMinutes < 120) {
      return { type: 'medium', minutes: gapMinutes };
    } else {
      return { type: 'long', minutes: gapMinutes };
    }
  };

  // Generate avatars for attendees
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

  // Time gap connector component
  const TimeGapConnector = ({ gap }) => {
    if (!gap) return null;

    const formatGapTime = (minutes) => {
      if (minutes < 60) {
        return `${minutes} min`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
          return `${hours}h`;
        }
        return `${hours}h ${remainingMinutes}m`;
      }
    };

    if (gap.type === 'short') {
      // Simple dotted line for short gaps
      return (
        <div className="flex flex-col items-center py-2">
          <div className="flex flex-col items-center space-y-1">
            <div className="w-0.5 h-3 bg-gray-300"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-0.5 h-3 bg-gray-300"></div>
          </div>
        </div>
      );
    }

    if (gap.type === 'medium') {
      // Dotted line with time indicator for medium gaps
      return (
        <div className="flex flex-col items-center py-3">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-0.5 h-4 bg-gray-300"></div>
            <div className="flex flex-col items-center space-y-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
            <div className="bg-gray-100 px-2 py-1 rounded-full">
              <span className="text-xs text-gray-600 font-medium">
                {formatGapTime(gap.minutes)} later
              </span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
            <div className="w-0.5 h-4 bg-gray-300"></div>
          </div>
        </div>
      );
    }

    // Long gap - more prominent styling
    return (
      <div className="flex flex-col items-center py-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-0.5 h-6 bg-gray-300"></div>
          <div className="flex flex-col items-center space-y-1">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
          </div>
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-3 py-2 rounded-full border border-blue-200">
            <span className="text-sm text-gray-700 font-medium">
              {formatGapTime(gap.minutes)} break
            </span>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
          </div>
          <div className="w-0.5 h-6 bg-gray-300"></div>
        </div>
      </div>
    );
  };

  // Event card component
  const EventCard = ({ event }) => {
    const status = getEventStatus(event);
    
    return (
      <div
        className={`border-l-4 ${eventTypeColors[event.type]} border border-gray-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
          status === 'current' ? 'ring-2 ring-red-200 bg-red-50' : 
          status === 'upcoming' ? 'ring-2 ring-blue-200 bg-blue-50' :
          status === 'past' ? 'opacity-75' : ''
        }`}
        onClick={() => navigate(`/event/${event.id}`)}
      >
        {/* Event header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{eventTypeIcons[event.type]}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(event.time)} - {formatTime(event.endTimeFormatted)}</span>
                </div>
                {status === 'current' && (
                  <div className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    <Timer className="h-3 w-3 mr-1" />
                    <span className="font-medium text-xs">NOW</span>
                  </div>
                )}
                {status === 'upcoming' && (
                  <div className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    <Timer className="h-3 w-3 mr-1" />
                    <span className="font-medium text-xs">{getTimeUntilEvent(event.startTime)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {event.ai_enriched && (
              <div className="flex items-center space-x-1">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">AI Enhanced</span>
              </div>
            )}
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Event details */}
        <div className="space-y-2">
          {/* Transportation or Location */}
          {isTransportationEvent(event) ? (
            <div className="mb-2">
              <TransportationEventDisplay event={event} onOpenInMaps={handleOpenInMaps} compact={false} />
            </div>
          ) : (
            event.location && (
              <div className="flex items-center space-x-2 text-gray-700">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center space-x-3">
              <Users className="h-4 w-4 text-gray-500" />
              <div className="flex items-center">
                {generateAvatars(event.attendees)}
                {event.attendees.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center -ml-1 border-2 border-white">
                    +{event.attendees.length - 3}
                  </div>
                )}
              </div>
              <span className="text-gray-600 text-sm">
                {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-gray-700 text-sm leading-relaxed mt-2">{event.description}</p>
          )}
        </div>

        {/* AI Preparation info */}
        {event.ai_enriched && (event.preparation_time || event.departure_time) && (
          <div className="flex items-center space-x-3 mt-3 text-xs">
            {event.preparation_time && (
              <div className="flex items-center space-x-1 text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                <Timer className="h-3 w-3" />
                <span>Prep: {event.preparation_time} min</span>
              </div>
            )}
            {event.departure_time && (
              <div className="flex items-center space-x-1 text-green-600 bg-green-100 px-2 py-1 rounded-full">
                <ArrowUp className="h-3 w-3" />
                <span>Leave: {new Date(event.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            )}
          </div>
        )}

        {/* Logistics indicators */}
        {(event.checklist?.length > 0 || event.packing_list?.length > 0 || event.contacts?.length > 0) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-4">
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
            <EventAssignment event={event} compact={true} showLabel={false} />
          </div>
        )}
      </div>
    );
  };

  if (todayEvents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <div className="text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No events scheduled for today</p>
          <p className="text-sm">Enjoy your free day!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {todayEvents.map((event, index) => (
        <div key={event.id}>
          {/* Time gap connector */}
          {index > 0 && (
            <TimeGapConnector gap={getTimeGap(todayEvents[index - 1], event)} />
          )}
          
          {/* Event card */}
          <EventCard event={event} />
        </div>
      ))}
    </div>
  );
};

// Transportation Event Display Component for TodaysTimeline
const TransportationEventDisplay = ({ event, onOpenInMaps, compact = true }) => {
  const transportationMode = event.transportation_mode || event.transportation_data?.mode || 'driving';
  const modeConfig = transportationModeConfig[transportationMode] || transportationModeConfig.driving;
  const ModeIcon = modeConfig.icon;
  const routeInfo = event.transportation_data?.route_info;
  const routeDetails = {
    starting_address: event.transportation_data?.starting_address || event.starting_address,
    destination_address: event.transportation_data?.destination_address || event.destination_address || event.location,
    stops: event.transportation_data?.stops || event.stops || []
  };
  
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <ModeIcon className={`h-3 w-3 ${modeConfig.color}`} />
        <span className={`text-xs font-medium ${modeConfig.color}`}>{modeConfig.label}</span>
        {routeInfo?.duration && (
          <span className="text-xs text-gray-500">{routeInfo.duration}</span>
        )}
        {routeDetails.stops && routeDetails.stops.length > 0 && (
          <span className="text-xs text-gray-500">{routeDetails.stops.length} stops</span>
        )}
      </div>
    );
  }
  
  return (
    <div className={`${modeConfig.bgColor} rounded p-2 border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ModeIcon className={`h-4 w-4 ${modeConfig.color}`} />
          <div className="flex-1">
            <div className={`font-medium text-sm ${modeConfig.color}`}>{modeConfig.label}</div>
            {routeInfo && (
              <div className="text-xs text-gray-600">
                {routeInfo.distance && `${routeInfo.distance} • `}
                {routeInfo.duration}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onOpenInMaps(event)}
          className={`flex items-center space-x-1 px-2 py-1 ${modeConfig.color} hover:opacity-80 rounded text-xs`}
        >
          <ExternalLink className="h-3 w-3" />
          <span>Maps</span>
        </button>
      </div>
      
      {/* Route Summary */}
      <div className="flex items-center space-x-2 text-xs mt-1">
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <span className="text-gray-600 truncate">
            {routeDetails.starting_address || 'Current location'}
          </span>
        </div>
        <ArrowRight className="h-2 w-2 text-gray-400" />
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <span className="text-gray-600 truncate">
            {routeDetails.destination_address || event.location}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TodaysTimeline;