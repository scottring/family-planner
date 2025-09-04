import { useState, useMemo, useEffect } from 'react';
import { Clock, MapPin, Users, AlertTriangle, Cloud, Sun, CloudRain, Timer, Backpack, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEventStore } from '../../stores/eventStore';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import EventCard from './EventCard';
import EventAssignment from '../events/EventAssignment';

const eventTypeColors = {
  school: 'bg-blue-500 border-blue-600',
  sports: 'bg-green-500 border-green-600',
  medical: 'bg-red-500 border-red-600',
  social: 'bg-purple-500 border-purple-600',
  work: 'bg-yellow-500 border-yellow-600',
  personal: 'bg-gray-500 border-gray-600',
  family: 'bg-pink-500 border-pink-600'
};

const DailyItinerary = ({ date }) => {
  const navigate = useNavigate();
  const { events, fetchEvents } = useEventStore();
  const [todayEvents, setTodayEvents] = useState([]);
  
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
  }, []); // fetchEvents is stable from Zustand, no need in deps

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
  
  // Generate timeline hours from 6am to 10pm
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

  // Get next event
  const nextEvent = useMemo(() => {
    const now = new Date();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    
    return todayEvents.find(event => {
      const [eventHour, eventMinute] = event.time.split(':').map(Number);
      const eventTime = eventHour + eventMinute / 60;
      return eventTime > currentTime;
    });
  }, []);

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

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getEventPosition = (event) => {
    const [startHour, startMinute] = event.time.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);
    
    const totalMinutesInDay = (22 - 6) * 60; // 16 hours * 60 minutes
    const startMinutesFromStart = (startHour - 6) * 60 + startMinute;
    const endMinutesFromStart = (endHour - 6) * 60 + endMinute;
    
    const top = (startMinutesFromStart / totalMinutesInDay) * 100;
    const height = ((endMinutesFromStart - startMinutesFromStart) / totalMinutesInDay) * 100;
    
    return { top: `${top}%`, height: `${height}%` };
  };

  const WeatherIcon = ({ condition }) => {
    switch (condition.toLowerCase()) {
      case 'sunny': return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'cloudy': return <Cloud className="h-5 w-5 text-gray-500" />;
      case 'rainy': return <CloudRain className="h-5 w-5 text-blue-500" />;
      default: return <Sun className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getTimeUntilEvent = (eventTime) => {
    const now = new Date();
    const [eventHour, eventMinute] = eventTime.split(':').map(Number);
    const eventDate = new Date();
    eventDate.setHours(eventHour, eventMinute, 0, 0);
    
    const diffMs = eventDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Date and Weather */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              {displayDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">Today's Schedule</p>
          </div>
          
          {/* Weather Widget */}
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
            <WeatherIcon condition={mockWeather.condition} />
            <div>
              <p className="text-base sm:text-lg font-semibold text-gray-900">{mockWeather.temperature}°F</p>
              <p className="text-xs sm:text-sm text-gray-600">{mockWeather.condition}</p>
              <p className="text-xs text-gray-500">
                H: {mockWeather.high}° L: {mockWeather.low}°
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Event Countdown */}
      {nextEvent && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-3 sm:p-4 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Timer className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">Next Event</p>
                <p className="text-base sm:text-lg font-bold leading-tight">{nextEvent.title}</p>
              </div>
            </div>
            <div className="text-left sm:text-right ml-7 sm:ml-0">
              <p className="text-xs sm:text-sm opacity-90">in</p>
              <p className="text-lg sm:text-xl font-bold">{getTimeUntilEvent(nextEvent.time)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Summary */}
      {todayEvents.some(event => event.packing_list?.length > 0 || event.contacts?.length > 0 || event.weather_dependent || event.parking_info) && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-3 sm:p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
            <Backpack className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            Today's Logistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {todayEvents
              .filter(event => event.packing_list?.length > 0 || event.contacts?.length > 0 || event.weather_dependent || event.parking_info)
              .map(event => (
                <div key={event.id} className="bg-white rounded-lg p-3 border border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base leading-tight">{event.title}</h4>
                  <div className="space-y-1 text-xs sm:text-sm">
                    {event.packing_list && event.packing_list.length > 0 && (
                      <div className="flex items-center gap-2 text-green-700">
                        <Backpack className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{event.packing_list.length} items to pack</span>
                      </div>
                    )}
                    {event.contacts && event.contacts.length > 0 && (
                      <div className="flex items-center gap-2 text-purple-700">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>{event.contacts.length} contacts available</span>
                      </div>
                    )}
                    {event.weather_dependent && (
                      <div className="flex items-center gap-2 text-blue-700">
                        <CloudRain className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Weather-dependent</span>
                      </div>
                    )}
                    {event.parking_info && (
                      <div className="flex items-center gap-2 text-orange-700">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Parking info available</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Timeline View - Simplified for Mobile */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Daily Timeline</h2>
        </div>
        
        <div className="p-3 sm:p-6">
          {/* Mobile View: Simplified List */}
          <div className="block sm:hidden">
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`border-l-4 p-3 rounded-r-lg cursor-pointer active:scale-95 transition-all ${eventTypeColors[event.type]} bg-white shadow-sm`}
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 pr-2">{event.title}</h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTime(event.time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      {event.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-20">{event.location}</span>
                        </div>
                      )}
                      {event.attendees?.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{event.attendees.length}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {event.packing_list && event.packing_list.length > 0 && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Backpack className="h-3 w-3" />
                        </div>
                      )}
                      {event.weather_dependent && (
                        <div className="text-blue-600">
                          <CloudRain className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop View: Original Timeline */}
          <div className="hidden sm:flex">
            {/* Time Labels */}
            <div className="w-16 flex-shrink-0">
              <div className="relative h-96">
                {timelineHours.map((hour, index) => (
                  <div
                    key={hour.hour24}
                    className="absolute text-xs text-gray-500 -translate-y-2"
                    style={{ top: `${(index / (timelineHours.length - 1)) * 100}%` }}
                  >
                    {hour.displayShort}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Events */}
            <div className="flex-1 relative ml-4">
              <div className="relative h-96 border-l-2 border-gray-200">
                {/* Current Time Indicator */}
                {currentTimePosition !== null && (
                  <div
                    className="absolute left-0 w-full border-t-2 border-red-500 z-10"
                    style={{ top: `${currentTimePosition}%` }}
                  >
                    <div className="absolute -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
                    <div className="absolute left-2 -top-2 text-xs text-red-500 font-medium bg-white px-1">
                      Now
                    </div>
                  </div>
                )}

                {/* Events */}
                {todayEvents.map((event) => {
                  const position = getEventPosition(event);
                  return (
                    <div
                      key={event.id}
                      className={`absolute left-4 right-4 rounded-lg border-l-4 p-3 cursor-pointer hover:shadow-md transition-all ${eventTypeColors[event.type]} bg-white`}
                      style={position}
                      onClick={() => navigate(`/event/${event.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                        <span className="text-xs text-gray-500">
                          {formatTime(event.time)} - {formatTime(event.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center space-x-3">
                          {event.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{event.attendees.length}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {event.packing_list && event.packing_list.length > 0 && (
                            <div className="flex items-center space-x-1 text-green-600" title={`${event.packing_list.length} items to bring`}>
                              <Backpack className="h-3 w-3" />
                              <span>{event.packing_list.length}</span>
                            </div>
                          )}
                          {event.contacts && event.contacts.length > 0 && (
                            <div className="flex items-center space-x-1 text-purple-600" title={`${event.contacts.length} contacts`}>
                              <Phone className="h-3 w-3" />
                              <span>{event.contacts.length}</span>
                            </div>
                          )}
                          {event.weather_dependent && (
                            <div className="text-blue-600" title="Weather dependent">
                              <CloudRain className="h-3 w-3" />
                            </div>
                          )}
                          <EventAssignment event={event} compact={true} showLabel={false} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events List - Hidden on mobile since timeline now shows simplified view */}
      <div className="bg-white rounded-lg shadow-sm hidden sm:block">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Today's Events</h2>
        </div>
        <div className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {todayEvents.map((event) => (
              <div key={event.id} className="space-y-2">
                <EventCard 
                  event={event} 
                  onClick={() => navigate(`/event/${event.id}`)}
                />
                <div className="ml-4 pl-4 border-l-2 border-gray-100">
                  <EventAssignment event={event} showLabel={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyItinerary;