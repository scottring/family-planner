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
import AddItemPlaceholder from '../components/today/AddItemPlaceholder';
import DraggableTimeline from '../components/today/DraggableTimeline';
import PreparationTimeline from '../components/coordinator/PreparationTimeline';
import PostEventTimeline from '../components/coordinator/PostEventTimeline';
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

  const handleReorderEvents = async (reorderedEvents) => {
    try {
      // Update each event with new times
      for (const event of reorderedEvents) {
        await updateEvent(event.id, {
          start_time: event.start_time,
          end_time: event.end_time
        });
      }
    } catch (error) {
      console.error('Error reordering events:', error);
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

  // Create a unified timeline with all events including their status
  const allEventsWithStatus = [
    ...categorizedEvents.pastEvents,
    ...categorizedEvents.currentEvents, 
    ...categorizedEvents.nextEvents,
    ...categorizedEvents.futureEvents
  ].sort((a, b) => a.parsedStartTime - b.parsedStartTime);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          {/* Page Title */}
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-white">Today's Timeline</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            {/* Date Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleDateChange('prev')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white">
                  {format(selectedDate, 'EEEE')}
                </h2>
                <p className="text-white/90 text-sm -mt-1">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>
              
              <button
                onClick={() => handleDateChange('next')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                aria-label="Next day"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Weather & Controls */}
            <div className="flex items-center space-x-4">
              {/* Weather Widget */}
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 flex items-center space-x-3">
                <WeatherIcon condition={mockWeather.condition} />
                <div className="text-sm">
                  <p className="font-semibold text-white">{mockWeather.temperature}°F</p>
                  <p className="text-white/80">{mockWeather.condition}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="Filter events"
                  aria-label="Filter events"
                >
                  <Filter className="h-5 w-5" />
                </button>
                <button
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
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
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-white">Show:</span>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="px-3 py-1 border border-white/30 bg-white/10 text-white rounded-lg text-sm focus:ring-2 focus:ring-white/50 focus:border-transparent"
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
          {allEventsWithStatus.length === 0 ? (
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
            <DraggableTimeline
              events={allEventsWithStatus}
              timeGaps={timeGaps}
              expandedEvents={expandedEvents}
              toggleEventExpansion={toggleEventExpansion}
              onReorderEvents={handleReorderEvents}
              onAddEvent={handleAddEvent}
              onAddTask={handleAddTask}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              selectedDate={selectedDate}
            />
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