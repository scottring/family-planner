import { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckSquare, 
  MapPin, 
  Car,
  UtensilsCrossed,
  Shirt,
  Backpack,
  AlertTriangle,
  ChevronRight,
  Check,
  Cloud
} from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
import { useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';
import { useFamilyStore } from '../../stores/familyStore';

const TomorrowPrep = () => {
  const { events } = useEventStore();
  const { tasks, updateTask } = useTaskStore();
  const { user } = useAuthStore();
  const { familyMembers } = useFamilyStore();
  const [completedPreps, setCompletedPreps] = useState(new Set());

  // Get tomorrow's date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  // Get tomorrow's events
  const tomorrowEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    return eventDate >= tomorrow && eventDate < dayAfterTomorrow;
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  // Get tomorrow's tasks
  const tomorrowTasks = tasks.filter(task => {
    if (task.completed || !task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return dueDate.toDateString() === tomorrow.toDateString();
  });

  // Generate preparation items based on events and tasks
  const generatePrepItems = () => {
    const prepItems = [];

    // Weather-based preparations
    const weatherPrep = {
      id: 'weather-check',
      type: 'weather',
      title: 'Check Tomorrow\'s Weather',
      description: 'Plan appropriate clothing and activities',
      icon: Cloud,
      priority: 'medium',
      category: 'Planning',
    };

    // Event-based preparations
    tomorrowEvents.forEach(event => {
      // Location preparations
      if (event.location && event.location !== 'Home') {
        prepItems.push({
          id: `location-${event.id}`,
          type: 'location',
          title: `Check Route to ${event.location}`,
          description: `For ${event.title} at ${formatTime(event.start_time)}`,
          icon: MapPin,
          priority: 'high',
          category: 'Travel',
          event: event,
        });

        // Travel time preparation
        prepItems.push({
          id: `travel-${event.id}`,
          type: 'travel',
          title: 'Plan Departure Time',
          description: `Allow extra time for ${event.location}`,
          icon: Car,
          priority: 'high',
          category: 'Travel',
          event: event,
        });
      }

      // Checklist preparations
      if (event.checklist && event.checklist.length > 0) {
        const incompleteItems = event.checklist.filter(item => !item.completed);
        if (incompleteItems.length > 0) {
          prepItems.push({
            id: `checklist-${event.id}`,
            type: 'checklist',
            title: `Prepare for ${event.title}`,
            description: `${incompleteItems.length} items need attention`,
            icon: CheckSquare,
            priority: 'high',
            category: 'Preparation',
            event: event,
            items: incompleteItems,
          });
        }
      }

      // Meal preparations for early events
      const eventHour = new Date(event.start_time).getHours();
      if (eventHour <= 9) {
        prepItems.push({
          id: `breakfast-${event.id}`,
          type: 'meal',
          title: 'Prepare Early Breakfast',
          description: `${event.title} starts at ${formatTime(event.start_time)}`,
          icon: UtensilsCrossed,
          priority: 'medium',
          category: 'Meals',
          event: event,
        });
      }

      // Outfit preparations for important events
      if (event.type === 'work' || event.type === 'meeting' || event.title.toLowerCase().includes('interview')) {
        prepItems.push({
          id: `outfit-${event.id}`,
          type: 'outfit',
          title: 'Choose Outfit',
          description: `For ${event.title}`,
          icon: Shirt,
          priority: 'medium',
          category: 'Personal',
          event: event,
        });
      }

      // Pack bag for events with duration > 4 hours or away from home
      const eventDuration = event.end_time ? 
        (new Date(event.end_time) - new Date(event.start_time)) / (1000 * 60 * 60) : 1;
      
      if (eventDuration > 4 || (event.location && event.location !== 'Home')) {
        prepItems.push({
          id: `pack-${event.id}`,
          type: 'packing',
          title: 'Pack Essentials',
          description: `For ${event.title}`,
          icon: Backpack,
          priority: 'medium',
          category: 'Preparation',
          event: event,
        });
      }
    });

    // Task-based preparations
    tomorrowTasks.forEach(task => {
      prepItems.push({
        id: `task-prep-${task.id}`,
        type: 'task',
        title: 'Prepare for Task',
        description: task.title,
        icon: CheckSquare,
        priority: task.priority === 'high' ? 'high' : 'medium',
        category: 'Tasks',
        task: task,
      });
    });

    // General preparations
    if (tomorrowEvents.length > 2) {
      prepItems.push({
        id: 'busy-day-prep',
        type: 'general',
        title: 'Prepare for Busy Day',
        description: `${tomorrowEvents.length} events scheduled`,
        icon: AlertTriangle,
        priority: 'medium',
        category: 'Planning',
      });
    }

    // Add weather check if not already added
    if (prepItems.length > 0) {
      prepItems.unshift(weatherPrep);
    }

    return prepItems;
  };

  const prepItems = generatePrepItems();

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'low':
        return 'border-green-200 bg-green-50 text-green-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Travel':
        return <Car className="h-4 w-4" />;
      case 'Meals':
        return <UtensilsCrossed className="h-4 w-4" />;
      case 'Personal':
        return <Shirt className="h-4 w-4" />;
      case 'Preparation':
        return <Backpack className="h-4 w-4" />;
      case 'Tasks':
        return <CheckSquare className="h-4 w-4" />;
      case 'Planning':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handlePrepToggle = (prepId) => {
    setCompletedPreps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(prepId)) {
        newSet.delete(prepId);
      } else {
        newSet.add(prepId);
      }
      return newSet;
    });
  };

  const groupedPrep = prepItems.reduce((groups, item) => {
    const category = item.category || 'General';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});

  // Sort categories by priority
  const categoryOrder = ['Travel', 'Preparation', 'Tasks', 'Meals', 'Personal', 'Planning', 'General'];
  const sortedCategories = Object.keys(groupedPrep).sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  const completedCount = completedPreps.size;
  const totalCount = prepItems.length;

  if (prepItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Tomorrow's Prep</h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No preparation needed</p>
          <p className="text-sm text-gray-400">Tomorrow looks like a relaxed day!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Tomorrow's Prep</h2>
          </div>
          <div className="text-sm text-indigo-600">
            {completedCount}/{totalCount} ready
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full bg-indigo-100 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tomorrow's Overview */}
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <h3 className="font-semibold text-indigo-900 mb-2">
            {tomorrow.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <div className="text-sm text-indigo-700">
            <div className="flex justify-between items-center">
              <span>{tomorrowEvents.length} events scheduled</span>
              <span>{tomorrowTasks.length} tasks due</span>
            </div>
            {tomorrowEvents.length > 0 && (
              <div className="mt-2 text-xs">
                First event: {tomorrowEvents[0].title} at {formatTime(tomorrowEvents[0].start_time)}
              </div>
            )}
          </div>
        </div>

        {/* Preparation Items by Category */}
        <div className="space-y-6">
          {sortedCategories.map(category => (
            <div key={category}>
              <div className="flex items-center space-x-2 mb-3">
                {getCategoryIcon(category)}
                <h3 className="font-semibold text-gray-800">{category}</h3>
                <span className="text-xs text-gray-500">
                  ({groupedPrep[category].filter(item => completedPreps.has(item.id)).length}/{groupedPrep[category].length})
                </span>
              </div>
              
              <div className="space-y-2">
                {groupedPrep[category].map((item) => {
                  const isCompleted = completedPreps.has(item.id);
                  
                  return (
                    <div 
                      key={item.id}
                      className={`flex items-start space-x-3 p-3 border rounded-lg transition-all duration-200 ${
                        isCompleted 
                          ? 'bg-gray-50 border-gray-200 opacity-60' 
                          : getPriorityColor(item.priority)
                      }`}
                    >
                      <button
                        onClick={() => handlePrepToggle(item.id)}
                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isCompleted 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isCompleted && <Check className="w-3 h-3" />}
                      </button>
                      
                      <div className="flex-1">
                        <h4 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {item.title}
                        </h4>
                        <p className={`text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                          {item.description}
                        </p>
                        
                        {/* Show checklist items if available */}
                        {item.items && item.items.length > 0 && !isCompleted && (
                          <div className="mt-2 space-y-1">
                            {item.items.slice(0, 3).map((checklistItem, index) => (
                              <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                <span>{checklistItem.item || checklistItem.title}</span>
                              </div>
                            ))}
                            {item.items.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{item.items.length - 3} more items
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {item.event && (
                        <div className="text-right text-xs text-gray-500">
                          <div>{formatTime(item.event.start_time)}</div>
                          {item.event.location && (
                            <div className="text-gray-400">{item.event.location}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Completion Status */}
        {totalCount > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            {completedCount === totalCount ? (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-600 font-semibold mb-1">All Set for Tomorrow! 🎉</div>
                <div className="text-sm text-green-700">You're fully prepared for a great day.</div>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-600">
                <div className="font-medium">
                  {totalCount - completedCount} items left to prepare
                </div>
                <div className="text-gray-500">
                  Take a few minutes tonight to get ready
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TomorrowPrep;