import { useEffect, useState } from 'react';
import { Calendar, CheckSquare, Users, Clock, AlertCircle, TrendingUp, CalendarDays, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import EventCard from '../components/itinerary/EventCard';

const Dashboard = () => {
  const { tasks, fetchTasks, getTaskStats, getOverdueTasks, getTasksDueToday } = useTaskStore();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (tasks.length >= 0) {
      setStats(getTaskStats());
    }
  }, [tasks, getTaskStats]);

  const overdueTasks = getOverdueTasks();
  const dueTodayTasks = getTasksDueToday();

  // Mock today's events for itinerary display
  const todayEvents = [
    {
      id: 1,
      title: 'School Drop-off',
      time: '08:00',
      endTime: '08:30',
      location: 'Oakwood Elementary',
      type: 'school',
      attendees: ['Mom', 'Emma', 'Jake'],
      description: 'Drop kids at school',
      checklist: ['Backpacks', 'Lunch boxes'],
      preparation: 30
    },
    {
      id: 2,
      title: 'Team Meeting',
      time: '09:00',
      endTime: '10:30',
      location: 'Office Conference Room A',
      type: 'work',
      attendees: ['Dad'],
      description: 'Weekly team standup',
      preparation: 10
    },
    {
      id: 3,
      title: 'Emma\'s Soccer Practice',
      time: '16:00',
      endTime: '17:30',
      location: 'Sports Complex Field 2',
      type: 'sports',
      attendees: ['Emma', 'Mom'],
      description: 'Weekly soccer training session',
      checklist: ['Soccer cleats', 'Water bottle', 'Shin guards'],
      preparation: 45
    }
  ];

  const quickActions = [
    { 
      title: 'Daily Planner', 
      icon: CalendarDays, 
      link: '/daily-itinerary', 
      color: 'bg-blue-500 hover:bg-blue-600' 
    },
    { 
      title: 'Weekly View', 
      icon: Calendar, 
      link: '/weekly-planner', 
      color: 'bg-indigo-500 hover:bg-indigo-600' 
    },
    { 
      title: 'Manage Tasks', 
      icon: CheckSquare, 
      link: '/tasks', 
      color: 'bg-green-500 hover:bg-green-600' 
    },
    { 
      title: 'Family Members', 
      icon: Users, 
      link: '/family', 
      color: 'bg-purple-500 hover:bg-purple-600' 
    },
  ];

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getNextEvent = () => {
    const now = new Date();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    
    return todayEvents.find(event => {
      const [eventHour, eventMinute] = event.time.split(':').map(Number);
      const eventTime = eventHour + eventMinute / 60;
      return eventTime > currentTime;
    });
  };

  const nextEvent = getNextEvent();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-blue-100">
          Here's what's happening with your family today
        </p>
      </div>

      {/* Today's Itinerary Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
            <Link 
              to="/daily-itinerary" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Full Timeline →
            </Link>
          </div>
        </div>

        {todayEvents.length > 0 ? (
          <div className="p-6">
            {/* Next Event Highlight */}
            {nextEvent && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Next Event</p>
                    <h3 className="text-lg font-semibold text-blue-900">{nextEvent.title}</h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-blue-700">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(nextEvent.time)}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {nextEvent.location}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
                      {(() => {
                        const now = new Date();
                        const [eventHour, eventMinute] = nextEvent.time.split(':').map(Number);
                        const eventDate = new Date();
                        eventDate.setHours(eventHour, eventMinute, 0, 0);
                        const diffMs = eventDate.getTime() - now.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
                        return `${diffMinutes}m`;
                      })()}
                    </div>
                    <p className="text-sm text-blue-600">until start</p>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Events List */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">All Events Today</h4>
              {todayEvents.map((event) => (
                <EventCard key={event.id} event={event} compact={true} />
              ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{todayEvents.length}</p>
                  <p className="text-sm text-gray-500">Events Today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {todayEvents.filter(e => e.type === 'family' || e.attendees.includes('All')).length}
                  </p>
                  <p className="text-sm text-gray-500">Family Events</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {todayEvents.filter(e => e.checklist && e.checklist.length > 0).length}
                  </p>
                  <p className="text-sm text-gray-500">Need Prep</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No events scheduled for today</p>
              <p className="text-sm text-gray-400">Enjoy your free day!</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CheckSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completed || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Due Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.dueToday || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.overdue || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className={`flex items-center p-4 rounded-lg text-white transition-colors ${action.color}`}
                >
                  <action.icon className="h-6 w-6 mr-3" />
                  <span className="font-medium">{action.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
          </div>
          <div className="p-6">
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tasks yet. Create your first task!</p>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                      task.completed ? 'bg-green-500' : 
                      task.priority === 'high' ? 'bg-red-500' :
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      {task.assignedTo && (
                        <p className="text-xs text-gray-500">Assigned to: {task.assignedTo}</p>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <div className="text-center pt-2">
                    <Link to="/tasks" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View all tasks
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(overdueTasks.length > 0 || dueTodayTasks.length > 0) && (
        <div className="space-y-4">
          {overdueTasks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-lg font-medium text-red-800">Overdue Tasks</h3>
              </div>
              <div className="mt-2 space-y-2">
                {overdueTasks.slice(0, 3).map((task) => (
                  <p key={task.id} className="text-sm text-red-700">
                    • {task.title} {task.assignedTo && `(${task.assignedTo})`}
                  </p>
                ))}
                {overdueTasks.length > 3 && (
                  <p className="text-sm text-red-600">
                    And {overdueTasks.length - 3} more overdue tasks
                  </p>
                )}
              </div>
            </div>
          )}

          {dueTodayTasks.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className="text-lg font-medium text-yellow-800">Due Today</h3>
              </div>
              <div className="mt-2 space-y-2">
                {dueTodayTasks.slice(0, 3).map((task) => (
                  <p key={task.id} className="text-sm text-yellow-700">
                    • {task.title} {task.assignedTo && `(${task.assignedTo})`}
                  </p>
                ))}
                {dueTodayTasks.length > 3 && (
                  <p className="text-sm text-yellow-600">
                    And {dueTodayTasks.length - 3} more tasks due today
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;