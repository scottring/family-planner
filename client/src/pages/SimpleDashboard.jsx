import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useTaskStore } from '../stores/taskStore';
import { Link } from 'react-router-dom';
import { Calendar, CheckSquare, Mic, Plus, Clock, Users, MapPin } from 'lucide-react';

const SimpleDashboard = () => {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const { tasks, fetchTasks } = useTaskStore();
  const [todayEvents, setTodayEvents] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);

  useEffect(() => {
    fetchEvents();
    fetchTasks();
  }, [fetchEvents, fetchTasks]);

  useEffect(() => {
    // Filter today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate < tomorrow;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
    setTodayEvents(todaysEvents.slice(0, 3)); // Show only top 3

    // Get upcoming tasks
    const pending = tasks
      .filter(task => !task.completed)
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      })
      .slice(0, 3); // Show only top 3
    
    setUpcomingTasks(pending);
  }, [events, tasks]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Simplified Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.username}!</h1>
        <p className="text-white/90">Here's what matters today</p>
      </div>

      {/* Primary Actions - Most Important */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Voice Capture - PRIMARY ACTION */}
        <Link 
          to="/inbox"
          className="bg-green-50 border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Mic className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-green-600 font-semibold">QUICK CAPTURE</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Add Voice Note</h3>
          <p className="text-sm text-gray-600">Press and hold to record</p>
        </Link>

        {/* Today's Schedule */}
        <Link 
          to="/calendar"
          className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Calendar className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-blue-600 font-semibold">{todayEvents.length} TODAY</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">View Schedule</h3>
          <p className="text-sm text-gray-600">See today's events</p>
        </Link>

        {/* Quick Add Event */}
        <Link 
          to="/calendar"
          className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Plus className="h-8 w-8 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-purple-600 font-semibold">NEW</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Add Event</h3>
          <p className="text-sm text-gray-600">Create new event or task</p>
        </Link>
      </div>

      {/* Today's Focus - Simplified */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          
          {todayEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No events scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todayEvents.map(event => (
                <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <div className="flex items-center mt-1 text-sm text-gray-600 space-x-3">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(event.start_time)}
                          </span>
                          {event.location && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {event.assigned_to && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {event.assigned_to}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {events.length > 3 && (
            <Link to="/calendar" className="block text-center mt-4 text-sm text-blue-600 hover:text-blue-700">
              View all events →
            </Link>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Tasks to Do</h2>
            <CheckSquare className="h-5 w-5 text-gray-400" />
          </div>
          
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending tasks</p>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map(task => (
                <div key={task.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
                    checked={task.completed}
                    onChange={() => {/* Handle toggle */}}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(task.due_date)}
                      {task.assigned_to && ` • ${task.assigned_to}`}
                    </p>
                  </div>
                  {task.priority === 1 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">High</span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {tasks.length > 3 && (
            <Link to="/tasks" className="block text-center mt-4 text-sm text-blue-600 hover:text-blue-700">
              View all tasks →
            </Link>
          )}
        </div>
      </div>

      {/* Quick Links - Simplified */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">MORE ACTIONS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/planning" className="text-center p-3 bg-white rounded-lg hover:shadow-md transition-all">
            <Users className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <span className="text-sm text-gray-700">Planning Session</span>
          </Link>
          <Link to="/inbox" className="text-center p-3 bg-white rounded-lg hover:shadow-md transition-all">
            <CheckSquare className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <span className="text-sm text-gray-700">Smart Inbox</span>
          </Link>
          <Link to="/family" className="text-center p-3 bg-white rounded-lg hover:shadow-md transition-all">
            <Users className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <span className="text-sm text-gray-700">Family</span>
          </Link>
          <Link to="/settings" className="text-center p-3 bg-white rounded-lg hover:shadow-md transition-all">
            <Calendar className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <span className="text-sm text-gray-700">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;