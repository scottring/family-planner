import { useState, useMemo } from 'react';
import { Clock, MapPin, Users, AlertTriangle, Cloud, Sun, CloudRain, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EventCard from './EventCard';

// Mock data for demonstration
const mockEvents = [
  {
    id: 1,
    title: 'Morning Jog',
    time: '06:30',
    endTime: '07:30',
    location: 'Central Park',
    type: 'personal',
    attendees: ['Dad'],
    description: 'Daily morning exercise routine',
    checklist: ['Running shoes', 'Water bottle', 'Phone'],
    preparation: 15 // minutes before
  },
  {
    id: 2,
    title: 'School Drop-off',
    time: '08:00',
    endTime: '08:30',
    location: 'Oakwood Elementary',
    type: 'school',
    attendees: ['Mom', 'Emma', 'Jake'],
    description: 'Drop kids at school',
    checklist: ['Backpacks', 'Lunch boxes', 'Permission slips'],
    preparation: 30
  },
  {
    id: 3,
    title: 'Team Meeting',
    time: '09:00',
    endTime: '10:30',
    location: 'Office Conference Room A',
    type: 'work',
    attendees: ['Dad'],
    description: 'Weekly team standup',
    checklist: ['Laptop', 'Meeting notes', 'Project updates'],
    preparation: 10
  },
  {
    id: 4,
    title: 'Emma\'s Soccer Practice',
    time: '16:00',
    endTime: '17:30',
    location: 'Sports Complex Field 2',
    type: 'sports',
    attendees: ['Emma', 'Mom'],
    description: 'Weekly soccer training session',
    checklist: ['Soccer cleats', 'Water bottle', 'Shin guards', 'Soccer ball'],
    preparation: 45
  },
  {
    id: 5,
    title: 'Family Dinner',
    time: '18:30',
    endTime: '19:30',
    location: 'Home',
    type: 'family',
    attendees: ['Mom', 'Dad', 'Emma', 'Jake'],
    description: 'Family time and dinner',
    checklist: ['Set table', 'Prepare side dishes'],
    preparation: 60
  },
  {
    id: 6,
    title: 'Jake\'s Bedtime Story',
    time: '20:00',
    endTime: '20:30',
    location: 'Jake\'s Room',
    type: 'family',
    attendees: ['Dad', 'Jake'],
    description: 'Evening bedtime routine',
    checklist: ['Pajamas', 'Toothbrush', 'Favorite book'],
    preparation: 15
  }
];

const mockWeather = {
  current: 'sunny',
  temperature: 72,
  condition: 'Sunny',
  high: 78,
  low: 65,
  precipitation: 0
};

const eventTypeColors = {
  school: 'bg-blue-500 border-blue-600',
  sports: 'bg-green-500 border-green-600',
  medical: 'bg-red-500 border-red-600',
  social: 'bg-purple-500 border-purple-600',
  work: 'bg-yellow-500 border-yellow-600',
  personal: 'bg-gray-500 border-gray-600',
  family: 'bg-pink-500 border-pink-600'
};

const DailyItinerary = ({ date = new Date() }) => {
  const navigate = useNavigate();
  
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
    
    return mockEvents.find(event => {
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
    <div className="space-y-6">
      {/* Header with Date and Weather */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {date.toLocaleDateString('en-US', { 
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

      {/* Next Event Countdown */}
      {nextEvent && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Timer className="h-6 w-6" />
              <div>
                <p className="font-medium">Next Event</p>
                <p className="text-lg font-bold">{nextEvent.title}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">in</p>
              <p className="text-xl font-bold">{getTimeUntilEvent(nextEvent.time)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline View */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daily Timeline</h2>
        </div>
        
        <div className="p-6">
          <div className="flex">
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
                {mockEvents.map((event) => {
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
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{event.attendees.length}</span>
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

      {/* Events List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Today's Events</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {mockEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onClick={() => navigate(`/event/${event.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyItinerary;