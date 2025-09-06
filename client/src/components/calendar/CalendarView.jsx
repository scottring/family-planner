import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { Plus, X, Clock, MapPin, Users, Settings, ChevronDown, CheckCircle, List, RefreshCw } from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
import { Link, useNavigate } from 'react-router-dom';
import calendarSyncService from '../../services/calendarSync';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Configure date-fns localizer
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarView = () => {
  const { events, fetchEvents, createEvent } = useEventStore();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [calendarAccounts, setCalendarAccounts] = useState([]);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    type: 'personal',
    attendees: '',
    category: 'personal'
  });
  const [eventCreationError, setEventCreationError] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  useEffect(() => {
    fetchEvents();
    loadCalendarAccounts();
  }, [fetchEvents]);

  const loadCalendarAccounts = async () => {
    try {
      const accountsData = await calendarSyncService.getCalendarAccounts();
      setCalendarAccounts(accountsData);
      
      // If a Google account is connected, automatically sync the family calendar
      if (accountsData.length > 0 && accountsData.some(acc => acc.provider === 'google' && acc.is_connected)) {
        await fetchGoogleCalendarEvents();
      }
    } catch (error) {
      console.error('Error loading calendar accounts:', error);
    }
  };

  const fetchGoogleCalendars = async () => {
    setIsLoadingCalendars(true);
    try {
      // Use the regular getCalendars method since we're using the Google OAuth directly
      const calendars = await calendarSyncService.getCalendars();
      setGoogleCalendars(calendars);
    } catch (error) {
      console.error('Error fetching Google calendars:', error);
      // Show a helpful message if calendar API is not enabled
      if (error.message?.includes('not been used in project')) {
        alert('Please enable the Google Calendar API in your Google Cloud Console project.');
      }
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const fetchGoogleCalendarEvents = async () => {
    try {
      // Automatically sync the family calendar
      const familyCalendarId = 'scottandirisk@gmail.com';
      console.log('Syncing family calendar:', familyCalendarId);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:11001/api'}/google/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          calendarId: familyCalendarId,
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully imported family calendar events:`, data);
      } else {
        const error = await response.text();
        console.error(`Failed to import family calendar:`, error);
      }
      
      // Refresh local events after import
      console.log('Refreshing events display...');
      await fetchEvents();
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
    }
  };


  // Auto-suggest context based on calendar name
  const getAutoSuggestedContext = (calendar) => {
    const name = calendar.name?.toLowerCase() || '';
    const id = calendar.id?.toLowerCase() || '';
    
    // Check for work-related keywords
    if (name.includes('g suite') || 
        name.includes('work') || 
        name.includes('business') || 
        id.includes('stacksdata.com') ||
        id === 'scott.kaufman@stacksdata.com') {
      return 'work';
    }
    
    // Check for family-related keywords
    if (name.includes('family') || 
        name.includes('shared') || 
        name.includes('iris') ||
        name.includes('kids')) {
      return 'family';
    }
    
    // Default to personal for primary calendar
    if (calendar.primary) {
      return 'personal';
    }
    
    // Default to personal for other calendars
    return 'personal';
  };

  // Simply return all events - no filtering needed for family calendar
  const getFilteredEvents = () => {
    console.log('Total events:', events.length);
    return events;
  };

  // Transform events for calendar display
  const filteredEvents = getFilteredEvents();
  console.log(`Starting with ${filteredEvents.length} filtered events for transformation`);
  
  const calendarEvents = filteredEvents.map((event, index) => {
    // Parse dates with more flexibility
    const parseEventDate = (dateStr) => {
      if (!dateStr) return null;
      
      // Handle various date formats
      let parsedDate;
      let originalDateStr = dateStr;
      
      // If the date string doesn't have seconds, add them
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        dateStr += ':00';
      }
      
      // If the date string doesn't have a timezone, assume local timezone
      if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-')) {
        // Check if it's just time without timezone indicator
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
          // Don't add Z, parse as local time instead
          parsedDate = new Date(dateStr);
        }
      } else {
        parsedDate = new Date(dateStr);
      }
      
      // If still invalid, try parsing as local time without timezone
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        // Try to parse as local date-time
        const localMatch = originalDateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
        if (localMatch) {
          const [, year, month, day, hour, minute, second] = localMatch;
          parsedDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second || 0)
          );
        }
      }
      
      // Final fallback: try simple date parsing
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        parsedDate = new Date(originalDateStr);
      }
      
      return parsedDate;
    };
    
    try {
      // Ensure we have valid dates
      const startDate = parseEventDate(event.start_time);
      const endDate = parseEventDate(event.end_time);
      
      // Only include events with valid dates
      if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn(`Skipping event with invalid dates: ${event.title}`, {
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          parsedStart: startDate,
          parsedEnd: endDate
        });
        return null;
      }
      
      // Create the calendar event object
      const calendarEvent = {
        ...event,
        start: startDate,
        end: endDate,
        title: event.title || 'Untitled Event',
        id: event.id || `event-${index}` // Ensure we have an ID for react-big-calendar
      };
      
      // Log successful transformation for debugging
      if (index < 3) {
        console.log(`Successfully transformed event ${index + 1}:`, {
          title: calendarEvent.title,
          start: calendarEvent.start.toISOString(),
          end: calendarEvent.end.toISOString(),
          category: calendarEvent.category
        });
      }
      
      return calendarEvent;
    } catch (error) {
      console.error(`Error transforming event "${event.title}":`, error);
      return null;
    }
  }).filter(Boolean); // Remove null entries

  console.log(`Transformed ${calendarEvents.length} events for display`);
  
  // Debug: Log a sample of events and their dates
  if (calendarEvents.length > 0) {
    console.log('Sample events:', calendarEvents.slice(0, 3).map(e => ({
      title: e.title,
      start: e.start,
      end: e.end,
      startStr: e.start?.toISOString(),
      endStr: e.end?.toISOString(),
      category: e.category || e.type
    })));
    
    // Check date range of events
    const eventDates = calendarEvents.map(e => e.start).filter(d => d);
    if (eventDates.length > 0) {
      const minDate = new Date(Math.min(...eventDates));
      const maxDate = new Date(Math.max(...eventDates));
      console.log('Event date range:', {
        earliest: minDate.toISOString(),
        latest: maxDate.toISOString(),
        currentCalendarDate: selectedDate.toISOString(),
        currentView: view
      });
      
      // Check events in current month
      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();
      const eventsInCurrentMonth = calendarEvents.filter(e => {
        return e.start.getMonth() === currentMonth && e.start.getFullYear() === currentYear;
      });
      console.log(`Events in ${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}:`, eventsInCurrentMonth.length);
      if (eventsInCurrentMonth.length > 0) {
        console.log('First event in current month:', {
          title: eventsInCurrentMonth[0].title,
          date: eventsInCurrentMonth[0].start.toLocaleDateString(),
          time: eventsInCurrentMonth[0].start.toLocaleTimeString()
        });
      }
    }
  }
  
  // Use the actual events - no sample data
  const displayEvents = calendarEvents;
  
  // TEST: Add a hardcoded event to see if calendar renders anything
  const testEvents = [
    {
      id: 'test-1',
      title: 'TEST EVENT - Can you see this?',
      start: new Date(2025, 8, 5, 10, 0), // September 5, 2025, 10:00 AM
      end: new Date(2025, 8, 5, 11, 0),   // September 5, 2025, 11:00 AM
      category: 'test'
    },
    {
      id: 'test-2',
      title: 'TEST EVENT 2',
      start: new Date(2025, 8, 6, 14, 0), // September 6, 2025, 2:00 PM
      end: new Date(2025, 8, 6, 15, 0),   // September 6, 2025, 3:00 PM
      category: 'test'
    }
  ];
  
  // Debug: Check if dates are actually Date objects
  if (displayEvents.length > 0) {
    console.log('First event date types:', {
      start: displayEvents[0].start,
      startType: typeof displayEvents[0].start,
      startIsDate: displayEvents[0].start instanceof Date,
      end: displayEvents[0].end,
      endType: typeof displayEvents[0].end,
      endIsDate: displayEvents[0].end instanceof Date
    });
  }
  
  // Final debug log
  console.log('Calendar display summary:', {
    totalEventsFromAPI: events.length,
    filteredEvents: filteredEvents.length,
    transformedCalendarEvents: calendarEvents.length,
    finalDisplayEvents: displayEvents.length,
    selectedDate: selectedDate?.toISOString()
  });

  const handleSelectSlot = ({ start, end }) => {
    // Pre-fill dates when clicking on calendar
    setNewEvent({
      ...newEvent,
      start_time: start.toISOString().slice(0, 16),
      end_time: end.toISOString().slice(0, 16)
    });
    setShowNewEventModal(true);
  };

  const handleSelectEvent = (event) => {
    // Navigate to event detail page when an event is clicked
    console.log('Selected event:', event);
    if (event && event.id) {
      navigate(`/events/${event.id}`);
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad';
    
    // Style based on category first
    switch (event.category || event.type) {
      case 'work':
        backgroundColor = '#3b82f6'; // Blue
        break;
      case 'personal':
        backgroundColor = '#a855f7'; // Purple
        break;
      case 'family':
        backgroundColor = '#f59e0b'; // Orange
        break;
      case 'health':
        backgroundColor = '#10b981'; // Green
        break;
      case 'school':
        backgroundColor = '#3b82f6'; // Blue
        break;
      case 'sports':
        backgroundColor = '#06b6d4'; // Cyan
        break;
      default:
        // Fall back to priority-based colors
        switch (event.priority) {
          case 'high':
            backgroundColor = '#ef4444'; // Red
            break;
          case 'medium':
            backgroundColor = '#f59e0b'; // Orange
            break;
          case 'low':
            backgroundColor = '#10b981'; // Green
            break;
          default:
            backgroundColor = '#3174ad'; // Default blue
        }
    }

    return {
      style: {
        backgroundColor: backgroundColor + ' !important',
        borderRadius: '8px',
        opacity: '1 !important', // Force full opacity
        color: 'white !important',
        border: '1px solid rgba(255,255,255,0.3)',
        display: 'block !important',
        visibility: 'visible !important',
        fontSize: '11px',
        fontWeight: '500',
        padding: '3px 6px',
        minHeight: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.25)',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        position: 'relative',
        zIndex: 1
      }
    };
  };

  const CustomEvent = ({ event }) => (
    <div 
      className="p-2 hover:bg-white/20 rounded cursor-pointer transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        handleSelectEvent(event);
      }}
      title={`${event.title}${event.location ? ` • ${event.location}` : ''}${event.description ? ` • ${event.description}` : ''}`}
    >
      <div className="font-semibold text-xs leading-tight mb-1">{event.title}</div>
      {event.location && (
        <div className="text-xs opacity-90 flex items-center">
          <MapPin className="w-2 h-2 mr-1" />
          {event.location}
        </div>
      )}
      {event.attendees && (
        <div className="text-xs opacity-90 flex items-center mt-1">
          <Users className="w-2 h-2 mr-1" />
          {Array.isArray(event.attendees) ? event.attendees.join(', ') : event.attendees}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900">Scott & Iris Family Calendar</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Sync Now Button */}
            <button
              onClick={async () => {
                // Sync the family calendar
                await fetchGoogleCalendarEvents();
              }}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="Sync Family Calendar"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync Family Calendar</span>
            </button>
            
            
            {/* Today Button */}
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                console.log('Navigating to today:', today.toISOString());
              }}
              className="px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              Today
            </button>
            
            {/* Calendar Settings Button */}
            <Link
              to="/calendar-settings"
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Calendar Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
            
            {/* New Event Button */}
            <button 
              onClick={() => setShowNewEventModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Event</span>
            </button>
          </div>
        </div>
        
        {/* Event Count Status */}
        <div className="mt-3 text-sm text-gray-600">
          <span>Showing {filteredEvents.length} family event{filteredEvents.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="h-[700px]">
          
          <Calendar
            localizer={localizer}
            events={displayEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            views={['month', 'week', 'day', 'agenda']}
            defaultView='month'
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            popup
          />
        </div>
      </div>

      {/* Calendar Selector Modal - Removed since we're focusing on family calendar only */}
      {false && showCalendarSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Select Calendars to Sync</h2>
              <button
                onClick={() => setShowCalendarSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {isLoadingCalendars ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading calendars...</span>
              </div>
            ) : googleCalendars.length > 0 ? (
              <div className="space-y-6">
                <p className="text-gray-600">Select which Google calendars to display for each context:</p>
                
                {['work', 'personal', 'family'].map(context => {
                  const contextCalendars = googleCalendars.filter(cal => {
                    const suggested = getAutoSuggestedContext(cal);
                    // Show calendars in their suggested context, or all calendars if not auto-assigned
                    return suggested === context || (!selectedCalendars[suggested]?.includes(cal.id));
                  });
                  
                  return (
                    <div key={context} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 capitalize">{context} Context</h3>
                      {context === 'work' && (
                        <p className="text-xs text-gray-500 mb-2">For G Suite and work calendars</p>
                      )}
                      {context === 'family' && (
                        <p className="text-xs text-gray-500 mb-2">For shared family calendars</p>
                      )}
                      {context === 'personal' && (
                        <p className="text-xs text-gray-500 mb-2">For personal calendars</p>
                      )}
                      <div className="space-y-2">
                        {googleCalendars.map(calendar => {
                          const suggestedContext = getAutoSuggestedContext(calendar);
                          const isSuggested = suggestedContext === context;
                          
                          return (
                            <label
                              key={`${context}-${calendar.id}`}
                              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCalendars[context]?.includes(calendar.id) || false}
                                onChange={() => handleCalendarSelection(calendar.id, context)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: calendar.backgroundColor || '#3174ad' }}
                                  />
                                  <span className="font-medium">{calendar.name}</span>
                                  {calendar.primary && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Primary</span>
                                  )}
                                  {isSuggested && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Suggested</span>
                                  )}
                                </div>
                                {calendar.description && (
                                  <p className="text-sm text-gray-500 mt-1">{calendar.description}</p>
                                )}
                                {calendar.id && (
                                  <p className="text-xs text-gray-400 mt-1">{calendar.id}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCalendarSelector(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Save calendar selections to local storage for now
                      try {
                        // Save to localStorage
                        localStorage.setItem('selectedCalendars', JSON.stringify(selectedCalendars));
                        console.log('Calendar selections saved successfully');
                        
                        // Fetch events from family calendar
                        await fetchGoogleCalendarEvents();
                        
                        setShowCalendarSelector(false);
                      } catch (error) {
                        console.error('Error saving calendar selections:', error);
                        alert('Failed to save calendar selections. Please try again.');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save & Sync Events
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No Google calendars found for your account.</p>
                <p className="text-sm text-gray-500 mt-2">Make sure you've granted calendar access permissions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">New Event</h2>
              <button
                onClick={() => setShowNewEventModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {eventCreationError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                {eventCreationError}
              </div>
            )}
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsCreatingEvent(true);
              setEventCreationError('');
              
              try {
                // Validation
                if (!newEvent.title.trim()) {
                  throw new Error('Event title is required');
                }
                if (!newEvent.start_time) {
                  throw new Error('Start time is required');
                }
                if (!newEvent.end_time) {
                  throw new Error('End time is required');
                }
                
                const startTime = new Date(newEvent.start_time);
                const endTime = new Date(newEvent.end_time);
                
                if (endTime <= startTime) {
                  throw new Error('End time must be after start time');
                }
                
                // Default all new events to family category
                const eventWithContext = {
                  ...newEvent,
                  title: newEvent.title.trim(),
                  category: 'family',
                  type: 'family'
                };
                
                console.log('Creating event:', eventWithContext);
                await createEvent(eventWithContext);
                
                setShowNewEventModal(false);
                setNewEvent({
                  title: '',
                  start_time: '',
                  end_time: '',
                  location: '',
                  description: '',
                  type: 'personal',
                  attendees: '',
                  category: 'personal'
                });
              } catch (error) {
                console.error('Error creating event:', error);
                setEventCreationError(error.message || 'Failed to create event. Please try again.');
              } finally {
                setIsCreatingEvent(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
              
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Optional"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewEventModal(false);
                    setEventCreationError('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isCreatingEvent}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isCreatingEvent 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isCreatingEvent ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Event'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;