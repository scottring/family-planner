import { useEffect, useState } from 'react';
import { Calendar, CheckSquare, Users, Clock, AlertCircle, TrendingUp, CalendarDays, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import EventCard from '../components/itinerary/EventCard';

const Dashboard = () => {
  const { tasks, fetchTasks, getTaskStats, getOverdueTasks, getTasksDueToday } = useTaskStore();
  const { events, fetchEvents } = useEventStore();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({});
  const [todayEvents, setTodayEvents] = useState([]);

  useEffect(() => {
    fetchTasks();
    fetchEvents();
  }, [fetchTasks, fetchEvents]);

  useEffect(() => {
    if (tasks.length >= 0) {
      setStats(getTaskStats());
    }
  }, [tasks, getTaskStats]);

  useEffect(() => {
    // Filter events for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate < tomorrow;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
    setTodayEvents(todaysEvents);
  }, [events]);

  const overdueTasks = getOverdueTasks();
  const dueTodayTasks = getTasksDueToday();

  // Temporary mock events for display until real events are created
  const mockEvents = [
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

  // Use mock events if no real events exist yet
  const displayEvents = todayEvents.length > 0 ? todayEvents : mockEvents;

  const quickActions = [
    { 
      title: 'Calendar View', 
      icon: CalendarDays, 
      link: '/calendar', 
      color: 'bg-blue-500 hover:bg-blue-600' 
    },
    { 
      title: 'Meal Planning', 
      icon: Calendar, 
      link: '/meals', 
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
    
    return displayEvents.find(event => {
      const [eventHour, eventMinute] = event.time.split(':').map(Number);
      const eventTime = eventHour + eventMinute / 60;
      return eventTime > currentTime;
    });
  };

  const nextEvent = getNextEvent();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="gradient-rainbow rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-white/90 text-lg">
            Here's what's happening with your family today
          </p>
        </div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Today's Itinerary Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover animate-slide-in-right delay-100">
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <CalendarDays className="h-6 w-6 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Today's Schedule</h2>
            </div>
            <Link 
              to="/calendar" 
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-all duration-200 font-medium btn-hover-lift"
            >
              <span>View Full Timeline</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {displayEvents.length > 0 ? (
          <div className="p-8">
            {/* Next Event Highlight */}
            {nextEvent && (
              <div className="mb-8 bg-gradient-to-br from-primary-50 via-white to-secondary-50 border border-primary-200/50 rounded-xl p-6 shadow-primary/5 shadow-lg animate-pulse-gentle">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                      <p className="text-sm text-primary-600 font-semibold uppercase tracking-wide">Next Event</p>
                    </div>
                    <h3 className="text-2xl font-bold text-primary-900 mb-3">{nextEvent.title}</h3>
                    <div className="flex items-center space-x-6 text-primary-700">
                      <span className="flex items-center space-x-2 bg-white/60 px-3 py-1 rounded-lg">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{formatTime(nextEvent.time)}</span>
                      </span>
                      <span className="flex items-center space-x-2 bg-white/60 px-3 py-1 rounded-lg">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">{nextEvent.location}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-center ml-6">
                    <div className="bg-white/80 rounded-xl p-4 shadow-sm">
                      <div className="text-3xl font-bold text-primary-900 mb-1">
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
                      <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">until start</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Events List */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">All Events Today</h4>
              {displayEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  compact={true} 
                  onClick={() => console.log('Event clicked:', event)} 
                />
              ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{displayEvents.length}</p>
                  <p className="text-sm text-gray-500">Events Today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayEvents.filter(e => e.type === 'family' || (e.attendees && e.attendees.includes('All'))).length}
                  </p>
                  <p className="text-sm text-gray-500">Family Events</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayEvents.filter(e => e.checklist && e.checklist.length > 0).length}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 stagger-children">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 card-hover group animate-slide-in-left delay-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <CheckSquare className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 card-hover group animate-slide-in-left delay-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <TrendingUp className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completed || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 card-hover group animate-slide-in-left delay-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-warning-100 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <Clock className="h-6 w-6 text-warning-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Due Today</p>
                <p className="text-3xl font-bold text-gray-900">{stats.dueToday || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 card-hover group animate-slide-in-left delay-[600ms]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-error-100 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <AlertCircle className="h-6 w-6 text-error-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Overdue</p>
                <p className="text-3xl font-bold text-gray-900">{stats.overdue || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover animate-slide-in-right delay-300">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-secondary-100 rounded-lg">
                <Users className="h-6 w-6 text-secondary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 gap-4">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className={`group flex items-center p-5 rounded-xl text-white transition-all duration-200 btn-hover-lift shadow-md ${action.color}`}
                >
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="ml-4 font-semibold text-lg">{action.title}</span>
                  <svg className="ml-auto h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover animate-slide-in-left delay-300">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent-warm/20 rounded-lg">
                <CheckSquare className="h-6 w-6 text-accent-warm" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recent Tasks</h2>
            </div>
          </div>
          <div className="p-8">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckSquare className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium mb-2">No tasks yet</p>
                <p className="text-sm text-gray-400">Create your first task to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.slice(0, 5).map((task, index) => (
                  <div key={task.id} className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200 group">
                    <div className="relative">
                      <div className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        task.completed ? 'bg-success-500 scale-110' : 
                        task.priority === 'high' ? 'bg-error-500' :
                        task.priority === 'medium' ? 'bg-warning-500' : 'bg-primary-500'
                      }`}></div>
                      {task.completed && (
                        <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`font-medium transition-all duration-200 ${
                        task.completed ? 'line-through text-gray-500' : 'text-gray-900 group-hover:text-gray-800'
                      }`}>
                        {task.title}
                      </p>
                      {task.assignedTo && (
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned to: <span className="font-medium">{task.assignedTo}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <div className="text-center pt-4 border-t border-gray-100">
                    <Link 
                      to="/tasks" 
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium btn-hover-lift"
                    >
                      <span>View all tasks</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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