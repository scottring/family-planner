import { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Plus, 
  Calendar,
  ShoppingCart,
  Clock,
  FileText,
  Upload,
  Filter,
  Search,
  Trash2
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { useEventStore } from '../stores/eventStore';
import MealPlanImporter from '../components/meals/MealPlanImporter';
import EventCard from '../components/today/EventCard';

const MealsPage = () => {
  const [showImporter, setShowImporter] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [mealEvents, setMealEvents] = useState([]);
  const [filterType, setFilterType] = useState('all'); // all, breakfast, lunch, dinner, prep
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const { events, fetchEvents, deleteEvent } = useEventStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Filter events that are meal-related
    const filtered = events.filter(event => 
      event.category === 'meal' || 
      event.category === 'meal_prep' || 
      event.category === 'shopping' ||
      event.title?.toLowerCase().includes('breakfast') ||
      event.title?.toLowerCase().includes('lunch') ||
      event.title?.toLowerCase().includes('dinner') ||
      event.title?.toLowerCase().includes('meal') ||
      event.title?.toLowerCase().includes('cook') ||
      event.title?.toLowerCase().includes('prep')
    );
    
    // Apply additional filters
    let finalFiltered = filtered;
    
    if (filterType !== 'all') {
      finalFiltered = filtered.filter(event => 
        event.meal_type === filterType || 
        (filterType === 'prep' && event.category === 'meal_prep') ||
        (filterType === 'shopping' && event.category === 'shopping')
      );
    }
    
    if (searchTerm) {
      finalFiltered = finalFiltered.filter(event =>
        event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort by date
    finalFiltered.sort((a, b) => 
      new Date(a.start_time) - new Date(b.start_time)
    );
    
    setMealEvents(finalFiltered);
  }, [events, filterType, searchTerm]);

  // Group events by day
  const groupedEvents = mealEvents.reduce((acc, event) => {
    const date = format(new Date(event.start_time), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});

  // Get week dates
  const weekStart = startOfWeek(selectedWeek);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Clear week function
  const handleClearWeek = async () => {
    setIsClearing(true);
    try {
      // Get all meal events for the current week
      const weekEnd = endOfWeek(selectedWeek);
      const eventsToDelete = events.filter(event => {
        const eventDate = new Date(event.start_time);
        return (
          eventDate >= weekStart && 
          eventDate <= weekEnd && 
          (event.category === 'meal' || 
           event.category === 'meal_prep' || 
           event.category === 'shopping' ||
           event.title?.toLowerCase().includes('breakfast') ||
           event.title?.toLowerCase().includes('lunch') ||
           event.title?.toLowerCase().includes('dinner') ||
           event.title?.toLowerCase().includes('meal') ||
           event.title?.toLowerCase().includes('prep') ||
           event.title?.toLowerCase().includes('shopping') ||
           event.title?.toLowerCase().includes('grocery'))
        );
      });
      
      // Delete each event
      for (const event of eventsToDelete) {
        await deleteEvent(event.id);
      }
      
      // Refresh events
      await fetchEvents();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing week:', error);
      alert('Failed to clear week. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  // Quick stats
  const stats = {
    totalMeals: mealEvents.filter(e => e.category === 'meal').length,
    prepSessions: mealEvents.filter(e => e.category === 'meal_prep').length,
    shoppingTrips: mealEvents.filter(e => e.category === 'shopping').length,
    upcomingToday: mealEvents.filter(e => {
      const today = new Date();
      const eventDate = new Date(e.start_time);
      return eventDate.toDateString() === today.toDateString();
    }).length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-8 w-8 text-orange-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Meal Planning</h1>
                <p className="text-gray-600">Organize your family's meals and shopping</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center space-x-2"
              >
                <Trash2 className="h-5 w-5" />
                <span>Clear Week</span>
              </button>
              
              <button
                onClick={() => setShowImporter(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center space-x-2"
              >
                <Upload className="h-5 w-5" />
                <span>Import Meal Plan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Meals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMeals}</p>
              </div>
              <ChefHat className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Prep Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.prepSessions}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Shopping Trips</p>
                <p className="text-2xl font-bold text-gray-900">{stats.shoppingTrips}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Meals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingToday}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search meals..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="prep">Meal Prep</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
          </div>
        </div>

        {/* Week View */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week's Meals</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDates.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayEvents = groupedEvents[dateStr] || [];
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={dateStr}
                  className={`border rounded-lg p-3 ${
                    isToday ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 mb-2">
                    {format(date, 'EEE')}
                    <span className="block text-xs text-gray-500">
                      {format(date, 'MMM d')}
                    </span>
                  </div>
                  
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No meals</p>
                  ) : (
                    <div className="space-y-1">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                          title={event.description}
                        >
                          <div className="font-medium truncate">
                            {event.title.replace('Dinner: ', '').replace('Lunch: ', '').replace('Breakfast: ', '')}
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(event.start_time), 'h:mm a')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Meals List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Meals</h2>
          
          {mealEvents.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No meals planned yet</p>
              <button
                onClick={() => setShowImporter(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Import Your First Meal Plan
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mealEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{event.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(event.start_time), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(event.start_time), 'h:mm a')}
                        </span>
                        {event.category === 'shopping' && (
                          <span className="flex items-center text-green-600">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Shopping
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    {event.checklist && event.checklist.length > 0 && (
                      <div className="ml-4">
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {event.checklist.length} items
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meal Plan Importer Modal */}
      {showImporter && (
        <MealPlanImporter
          onClose={() => setShowImporter(false)}
          startDate={selectedWeek}
        />
      )}
      
      {/* Clear Week Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Clear Week's Meals?</h3>
                <p className="text-sm text-gray-600">
                  This will remove all meal events for {format(weekStart, 'MMM d')} - {format(endOfWeek(selectedWeek), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action cannot be undone. All meal plans, shopping lists, and prep sessions for this week will be permanently deleted.
              </p>
            </div>
            
            <div className="text-sm text-gray-600 mb-6">
              <p className="font-medium mb-2">This will delete:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{mealEvents.filter(e => e.category === 'meal' && new Date(e.start_time) >= weekStart && new Date(e.start_time) <= endOfWeek(selectedWeek)).length} meal events</li>
                <li>{mealEvents.filter(e => e.category === 'meal_prep' && new Date(e.start_time) >= weekStart && new Date(e.start_time) <= endOfWeek(selectedWeek)).length} prep sessions</li>
                <li>{mealEvents.filter(e => e.category === 'shopping' && new Date(e.start_time) >= weekStart && new Date(e.start_time) <= endOfWeek(selectedWeek)).length} shopping trips</li>
              </ul>
            </div>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearWeek}
                disabled={isClearing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isClearing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Clear Week</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealsPage;