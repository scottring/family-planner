import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { Plus, X, Clock, MapPin, Users } from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    type: 'personal',
    attendees: []
  });

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Transform events for calendar display
  const calendarEvents = events.map(event => ({
    ...event,
    start: new Date(event.start_time),
    end: new Date(event.end_time),
    title: event.title
  }));

  // Sample events for display if no real events
  const sampleEvents = [
      {
        id: 1,
        title: 'Family Dinner',
        start: new Date(2024, 8, 15, 18, 0),
        end: new Date(2024, 8, 15, 20, 0),
        description: 'Weekly family dinner at home',
        priority: 'high',
        assignedTo: ['Mom', 'Dad'],
        location: 'Home'
      },
      {
        id: 2,
        title: 'Soccer Practice',
        start: new Date(2024, 8, 16, 16, 0),
        end: new Date(2024, 8, 16, 17, 30),
        description: 'Kids soccer practice',
        priority: 'medium',
        assignedTo: ['Johnny'],
        location: 'Community Park'
      },
    ];
  
  const displayEvents = calendarEvents.length > 0 ? calendarEvents : sampleEvents;

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
    // Handle event selection
    console.log('Selected event:', event);
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad';
    
    switch (event.priority) {
      case 'high':
        backgroundColor = '#ef4444';
        break;
      case 'medium':
        backgroundColor = '#f59e0b';
        break;
      case 'low':
        backgroundColor = '#10b981';
        break;
      default:
        backgroundColor = '#3174ad';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const CustomEvent = ({ event }) => (
    <div className="p-1">
      <div className="font-semibold text-xs">{event.title}</div>
      {event.location && (
        <div className="text-xs opacity-75">{event.location}</div>
      )}
    </div>
  );

  return (
    <div className="h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Family Calendar</h1>
          <button 
            onClick={() => setShowNewEventModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="h-[600px]">
          <Calendar
            localizer={localizer}
            events={displayEvents}
            startAccessor="start"
            endAccessor="end"
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            views={['month', 'week', 'day', 'agenda']}
            view={view}
            onView={setView}
            date={selectedDate}
            onNavigate={setSelectedDate}
            eventPropGetter={eventStyleGetter}
            components={{
              event: CustomEvent,
            }}
            popup
            popupOffset={{ x: 30, y: 20 }}
            className="family-calendar"
          />
        </div>
      </div>

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
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createEvent(newEvent);
                setShowNewEventModal(false);
                setNewEvent({
                  title: '',
                  start_time: '',
                  end_time: '',
                  location: '',
                  description: '',
                  type: 'personal',
                  attendees: []
                });
              } catch (error) {
                console.error('Error creating event:', error);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="personal">Personal</option>
                  <option value="work">Work</option>
                  <option value="family">Family</option>
                  <option value="school">School</option>
                  <option value="sports">Sports</option>
                  <option value="medical">Medical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  placeholder="Optional"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Event
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