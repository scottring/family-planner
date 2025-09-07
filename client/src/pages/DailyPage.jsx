import { useState } from 'react';
import { 
  Calendar,
  Sun,
  Cloud,
  CloudRain,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Settings
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useTodayEvents } from '../hooks/useTodayEvents';
import { useEventStore } from '../stores/eventStore';
import { useTaskStore } from '../stores/taskStore';
import EventCard from '../components/today/EventCard';
import TimeGapSeparator from '../components/today/TimeGapSeparator';
import ChecklistComponent from '../components/today/ChecklistComponent';
import AddItemPlaceholder from '../components/today/AddItemPlaceholder';
import { formatTime, getWeatherSuggestions } from '../utils/todayHelpers';

const DailyPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  
  const { createEvent, updateEvent, deleteEvent } = useEventStore();
  const { addTask } = useTaskStore();
  
  const {
    todayEvents,
    todayTasks,
    categorizedEvents,
    timeGaps,
    expandedEvents,
    toggleEventExpansion
  } = useTodayEvents(selectedDate);

  // Mock weather data - replace with actual weather service
  const mockWeather = {
    temperature: 72,
    condition: 'Partly Cloudy',
    high: 78,
    low: 65,
    icon: '⛅'
  };

  const WeatherIcon = ({ condition }) => {
    switch (condition?.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'cloudy':
      case 'partly cloudy':
        return <Cloud className="h-5 w-5 text-gray-500" />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="h-5 w-5 text-blue-500" />;
      default:
        return <Sun className="h-5 w-5 text-yellow-500" />;
    }
  };

  const handleDateChange = (direction) => {
    setSelectedDate(prev => 
      direction === 'next' ? addDays(prev, 1) : subDays(prev, 1)
    );
  };

  const handleAddEvent = async (eventData) => {
    try {
      await createEvent(eventData);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleAddTask = async (taskData) => {
    try {
      await addTask(taskData);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleEditEvent = (event) => {
    // Navigate to edit form or open modal
    console.log('Edit event:', event);
  };

  const handleDeleteEvent = async (event) => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      try {
        await deleteEvent(event.id);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  // Combine and sort events with time gaps
  const timelineItems = [];
  
  todayEvents.forEach((event, index) => {
    // Add time gap before this event if it exists
    const gap = timeGaps.find(g => g.afterEventId === event.id);
    if (gap) {
      timelineItems.push({
        type: 'gap',
        data: gap,
        id: gap.id
      });
    }
    
    // Add the event
    timelineItems.push({
      type: 'event',
      data: event,
      id: event.id
    });
  });

  const priorityEvents = [...categorizedEvents.currentEvents, ...categorizedEvents.nextEvents];
  const otherEvents = [...categorizedEvents.pastEvents, ...categorizedEvents.futureEvents];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            {/* Date Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleDateChange('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  {format(selectedDate, 'EEEE')}
                </h1>
                <p className="text-gray-600">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>
              
              <button
                onClick={() => handleDateChange('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Next day"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Weather & Controls */}
            <div className="flex items-center space-x-4">
              {/* Weather Widget */}
              <div className="bg-blue-50 rounded-lg p-3 flex items-center space-x-3">
                <WeatherIcon condition={mockWeather.condition} />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{mockWeather.temperature}°F</p>
                  <p className="text-gray-600">{mockWeather.condition}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Filter events"
                  aria-label="Filter events"
                >
                  <Filter className="h-5 w-5" />
                </button>
                <button
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Show:</span>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Events</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="family">Family</option>
                  <option value="school">School</option>
                  <option value="sports">Sports</option>
                  <option value="medical">Medical</option>
                  <option value="social">Social</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Unified Timeline View */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Timeline</h2>
          
          {todayEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h3>
              <p className="text-gray-600 mb-4">
                Your day is wide open! Add some events to get started.
              </p>
              <AddItemPlaceholder
                onAddEvent={handleAddEvent}
                onAddTask={handleAddTask}
                className="max-w-md mx-auto"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add item at the beginning if there's time before first event */}
              {todayEvents.length > 0 && todayEvents[0].parsedStartTime.getHours() > 8 && (
                <AddItemPlaceholder
                  onAddEvent={handleAddEvent}
                  onAddTask={handleAddTask}
                  suggestedTime={new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 8, 0).toISOString()}
                />
              )}
              
              {timelineItems.map((item, index) => {
                if (item.type === 'gap') {
                  return (
                    <div key={item.id}>
                      <TimeGapSeparator
                        startTime={item.data.startTime}
                        endTime={item.data.endTime}
                      />
                      {item.data.duration >= 60 && (
                        <AddItemPlaceholder
                          onAddEvent={handleAddEvent}
                          onAddTask={handleAddTask}
                          suggestedTime={item.data.startTime}
                          className="my-4"
                        />
                      )}
                    </div>
                  );
                }

                if (item.type === 'event') {
                  const event = item.data;
                  const isExpanded = expandedEvents.has(event.id);
                  const isPriority = priorityEvents.some(pe => pe.id === event.id);
                  
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant={isPriority ? "large" : "small"}
                      autoExpanded={isExpanded}
                      onToggleExpand={toggleEventExpansion}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                      className={isPriority ? "shadow-lg border-2 border-blue-200" : ""}
                    />
                  );
                }

                return null;
              })}

              {/* Add item at the end */}
              <AddItemPlaceholder
                onAddEvent={handleAddEvent}
                onAddTask={handleAddTask}
                suggestedTime={todayEvents.length > 0 ? 
                  new Date(todayEvents[todayEvents.length - 1].parsedEndTime.getTime() + 60000).toISOString() :
                  new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 18, 0).toISOString()
                }
              />
            </div>
          )}
        </div>


        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Today's Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{todayEvents.length}</p>
              <p className="text-sm text-gray-600">Events</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{todayTasks.length}</p>
              <p className="text-sm text-gray-600">Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{timeGaps.length}</p>
              <p className="text-sm text-gray-600">Free Slots</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {todayEvents.filter(e => e.ai_enriched).length}
              </p>
              <p className="text-sm text-gray-600">AI Enhanced</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyPage;