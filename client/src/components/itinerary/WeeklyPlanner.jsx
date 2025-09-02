import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, MoreHorizontal } from 'lucide-react';
import EventCard from './EventCard';

// Mock events data for the week
const mockWeeklyEvents = {
  '2024-09-02': [
    { id: 1, title: 'School Drop-off', time: '08:00', type: 'school', attendees: ['Mom', 'Emma', 'Jake'] },
    { id: 2, title: 'Emma\'s Soccer', time: '16:00', type: 'sports', attendees: ['Emma'] },
    { id: 3, title: 'Family Dinner', time: '18:30', type: 'family', attendees: ['All'] },
    { id: 4, title: 'Team Meeting', time: '09:00', type: 'work', attendees: ['Dad'] },
  ],
  '2024-09-03': [
    { id: 5, title: 'Dentist Appointment', time: '14:00', type: 'medical', attendees: ['Jake', 'Mom'] },
    { id: 6, title: 'Grocery Shopping', time: '16:00', type: 'personal', attendees: ['Mom'] },
    { id: 7, title: 'Piano Lesson', time: '17:30', type: 'social', attendees: ['Emma'] },
  ],
  '2024-09-04': [
    { id: 8, title: 'Parent-Teacher Conference', time: '15:00', type: 'school', attendees: ['Mom', 'Dad'] },
    { id: 9, title: 'Jake\'s Basketball', time: '17:00', type: 'sports', attendees: ['Jake', 'Dad'] },
  ],
  '2024-09-05': [
    { id: 10, title: 'Work Presentation', time: '10:00', type: 'work', attendees: ['Dad'] },
    { id: 11, title: 'Lunch with Friends', time: '12:30', type: 'social', attendees: ['Mom'] },
    { id: 12, title: 'Kids Playdate', time: '15:00', type: 'social', attendees: ['Emma', 'Jake'] },
    { id: 13, title: 'Date Night', time: '19:00', type: 'social', attendees: ['Mom', 'Dad'] },
  ],
  '2024-09-06': [
    { id: 14, title: 'Yoga Class', time: '09:00', type: 'personal', attendees: ['Mom'] },
    { id: 15, title: 'School Event', time: '14:00', type: 'school', attendees: ['All'] },
    { id: 16, title: 'Movie Night', time: '20:00', type: 'family', attendees: ['All'] },
  ],
  '2024-09-07': [
    { id: 17, title: 'Soccer Game', time: '10:00', type: 'sports', attendees: ['Emma', 'Parents'] },
    { id: 18, title: 'Birthday Party', time: '14:00', type: 'social', attendees: ['Jake'] },
    { id: 19, title: 'BBQ with Neighbors', time: '17:00', type: 'social', attendees: ['All'] },
  ],
  '2024-09-08': [
    { id: 20, title: 'Church Service', time: '10:00', type: 'social', attendees: ['All'] },
    { id: 21, title: 'Family Hike', time: '14:00', type: 'family', attendees: ['All'] },
    { id: 22, title: 'Meal Prep', time: '17:00', type: 'personal', attendees: ['Mom'] },
  ]
};

const eventTypeColors = {
  school: 'bg-blue-500 text-white',
  sports: 'bg-green-500 text-white',
  medical: 'bg-red-500 text-white',
  social: 'bg-purple-500 text-white',
  work: 'bg-yellow-500 text-white',
  personal: 'bg-gray-500 text-white',
  family: 'bg-pink-500 text-white'
};

const eventTypeBorders = {
  school: 'border-blue-200 bg-blue-50',
  sports: 'border-green-200 bg-green-50',
  medical: 'border-red-200 bg-red-50',
  social: 'border-purple-200 bg-purple-50',
  work: 'border-yellow-200 bg-yellow-50',
  personal: 'border-gray-200 bg-gray-50',
  family: 'border-pink-200 bg-pink-50'
};

const WeeklyPlanner = ({ initialDate = new Date() }) => {
  const [currentWeek, setCurrentWeek] = useState(initialDate);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [expandedDays, setExpandedDays] = useState(new Set());

  // Get the start of the week (Sunday)
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Generate week days
  const weekDays = useMemo(() => {
    const weekStart = getWeekStart(currentWeek);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const events = mockWeeklyEvents[dateString] || [];
      
      days.push({
        date,
        dateString,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === new Date().toDateString(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        events,
        eventCount: events.length
      });
    }
    
    return days;
  }, [currentWeek]);

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newDate);
  };

  const toggleDayExpansion = (dateString) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dateString)) {
      newExpanded.delete(dateString);
    } else {
      newExpanded.add(dateString);
    }
    setExpandedDays(newExpanded);
  };

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getBusyIndicator = (eventCount) => {
    if (eventCount === 0) return null;
    if (eventCount <= 2) return 'bg-green-400';
    if (eventCount <= 4) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getMonthYearDisplay = () => {
    const weekStart = getWeekStart(currentWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return `${weekStart.toLocaleDateString('en-US', { month: 'short' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Planner</h1>
            <p className="text-gray-600">{getMonthYearDisplay()}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Today
            </button>
            
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div
              key={day.dateString}
              className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${
                day.isWeekend ? 'bg-blue-50' : 'bg-gray-50'
              } ${day.isToday ? 'bg-blue-100' : ''}`}
            >
              <div className="font-medium text-gray-900">{day.dayName}</div>
              <div className={`text-2xl font-bold mt-1 ${
                day.isToday ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {day.dayNumber}
              </div>
              
              {/* Busy Indicator */}
              {day.eventCount > 0 && (
                <div className="flex justify-center mt-2">
                  <div className={`w-2 h-2 rounded-full ${getBusyIndicator(day.eventCount)}`}></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7">
          {weekDays.map((day) => (
            <div
              key={day.dateString}
              className={`min-h-32 p-3 border-r border-gray-200 last:border-r-0 border-b border-gray-200 ${
                day.isWeekend ? 'bg-blue-25' : 'bg-white'
              }`}
            >
              <div className="space-y-1">
                {/* Show first 3 events or all if expanded */}
                {day.events
                  .slice(0, expandedDays.has(day.dateString) ? day.events.length : 3)
                  .map((event, index) => (
                    <div
                      key={event.id}
                      className={`text-xs p-2 rounded cursor-pointer hover:shadow-sm transition-all ${
                        eventTypeBorders[event.type]
                      } border`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="font-medium text-gray-900 truncate">
                        {event.title}
                      </div>
                      <div className="flex items-center text-gray-600 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatTime(event.time)}</span>
                      </div>
                      {event.attendees && (
                        <div className="flex items-center text-gray-500 mt-1">
                          <Users className="h-3 w-3 mr-1" />
                          <span className="truncate">{event.attendees.slice(0, 2).join(', ')}</span>
                          {event.attendees.length > 2 && <span>+{event.attendees.length - 2}</span>}
                        </div>
                      )}
                    </div>
                  ))}

                {/* Show more button */}
                {day.events.length > 3 && (
                  <button
                    onClick={() => toggleDayExpansion(day.dateString)}
                    className="w-full text-xs text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors flex items-center justify-center"
                  >
                    {expandedDays.has(day.dateString) ? (
                      <>Show less</>
                    ) : (
                      <>
                        <MoreHorizontal className="h-3 w-3 mr-1" />
                        {day.events.length - 3} more
                      </>
                    )}
                  </button>
                )}

                {day.events.length === 0 && (
                  <div className="text-center text-gray-400 text-xs py-4">
                    No events
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {weekDays.reduce((sum, day) => sum + day.eventCount, 0)}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Busiest Day</p>
              <p className="text-lg font-semibold text-gray-900">
                {weekDays.reduce((max, day) => day.eventCount > max.eventCount ? day : max, weekDays[0]).dayName}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Free Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {weekDays.filter(day => day.eventCount === 0).length}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Weekend Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {weekDays.filter(day => day.isWeekend).reduce((sum, day) => sum + day.eventCount, 0)}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-purple-400"></div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedEvent.title}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(selectedEvent.time)}</span>
                </div>

                <div className="flex items-center space-x-3 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{selectedEvent.attendees.join(', ')}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${eventTypeColors[selectedEvent.type]}`}>
                    {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanner;