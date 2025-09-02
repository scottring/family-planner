import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import EventCard from './EventCard';
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
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month');

  // Sample events - replace with actual API call
  useEffect(() => {
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
    setEvents(sampleEvents);
  }, []);

  const handleSelectSlot = ({ start, end }) => {
    // Handle new event creation
    console.log('Selected slot:', start, end);
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
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="h-[600px]">
          <Calendar
            localizer={localizer}
            events={events}
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

      {/* Today's Events Sidebar */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Events</h2>
        <div className="space-y-3">
          {events
            .filter(event => {
              const today = new Date();
              const eventDate = new Date(event.start);
              return eventDate.toDateString() === today.toDateString();
            })
            .map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          {events.filter(event => {
            const today = new Date();
            const eventDate = new Date(event.start);
            return eventDate.toDateString() === today.toDateString();
          }).length === 0 && (
            <p className="text-gray-500 text-center py-4">No events scheduled for today</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;