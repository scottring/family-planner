import { useState, useEffect } from 'react';
import { 
  ToggleLeft, 
  ToggleRight, 
  User, 
  Users, 
  Settings, 
  Eye, 
  EyeOff,
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  CheckSquare
} from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useEventStore } from '../../stores/eventStore';
import { useFamilyStore } from '../../stores/familyStore';

const PersonalizedDashboard = () => {
  const { user } = useAuthStore();
  const { tasks } = useTaskStore();
  const { events } = useEventStore();
  const { familyMembers } = useFamilyStore();
  const { 
    currentView, 
    setCurrentView, 
    widgetVisibility, 
    toggleWidget,
    layoutPreferences,
    updateLayoutPreferences 
  } = useDashboardStore();

  const [showCustomization, setShowCustomization] = useState(false);

  // Get personal statistics
  const getPersonalStats = () => {
    const myTasks = tasks.filter(task => 
      task.assignedTo === user?.username || 
      task.assignedTo === user?.full_name ||
      task.created_by === user?.id
    );

    const myEvents = events.filter(event => 
      event.assignedTo === user?.username ||
      event.organizer === user?.username ||
      (event.attendees && event.attendees.includes(user?.username))
    );

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = myEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate < tomorrow;
    });

    const thisWeekEvents = myEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return eventDate >= weekStart && eventDate < weekEnd;
    });

    return {
      totalTasks: myTasks.length,
      completedTasks: myTasks.filter(t => t.completed).length,
      pendingTasks: myTasks.filter(t => !t.completed).length,
      overdueTasks: myTasks.filter(t => {
        if (!t.due_date || t.completed) return false;
        const dueDate = new Date(t.due_date);
        return dueDate < today;
      }).length,
      todayEvents: todayEvents.length,
      thisWeekEvents: thisWeekEvents.length,
      completionRate: myTasks.length > 0 ? Math.round((myTasks.filter(t => t.completed).length / myTasks.length) * 100) : 0,
    };
  };

  // Get family workload distribution
  const getFamilyWorkload = () => {
    return familyMembers.map(member => {
      const memberTasks = tasks.filter(task => 
        task.assignedTo === member.name || 
        task.assignedTo === member.username
      );
      
      const memberEvents = events.filter(event => 
        event.assignedTo === member.name ||
        event.organizer === member.name ||
        (event.attendees && event.attendees.includes(member.name))
      );

      const activeTasks = memberTasks.filter(t => !t.completed).length;
      const todayEvents = memberEvents.filter(event => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const eventDate = new Date(event.start_time);
        return eventDate >= today && eventDate < tomorrow;
      }).length;

      return {
        member: member,
        activeTasks: activeTasks,
        todayEvents: todayEvents,
        totalWorkload: activeTasks + todayEvents,
      };
    }).sort((a, b) => b.totalWorkload - a.totalWorkload);
  };

  const personalStats = getPersonalStats();
  const familyWorkload = getFamilyWorkload();

  // Widget configuration
  const widgetConfig = [
    { id: 'todayAtGlance', name: 'Today at a Glance', description: 'Current day overview' },
    { id: 'myResponsibilities', name: 'My Responsibilities', description: 'Personal tasks and events' },
    { id: 'partnerStatus', name: 'Partner Status', description: 'Your partner\'s activities' },
    { id: 'familyOverview', name: 'Family Overview', description: 'All family members' },
    { id: 'quickActions', name: 'Quick Actions', description: 'Fast access to common actions' },
    { id: 'tomorrowPrep', name: 'Tomorrow Prep', description: 'Preparation reminders' },
    { id: 'conflictAlert', name: 'Conflict Alerts', description: 'Schedule conflicts' },
  ];

  const handleViewToggle = () => {
    const newView = currentView === 'family' ? 'personal' : 'family';
    setCurrentView(newView);
  };

  const getWorkloadColor = (workload) => {
    if (workload >= 8) return 'bg-red-500';
    if (workload >= 5) return 'bg-yellow-500';
    if (workload >= 2) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getCompletionColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-blue-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* View Toggle Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleViewToggle}
              className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {currentView === 'family' ? (
                  <Users className="h-5 w-5 text-blue-600" />
                ) : (
                  <User className="h-5 w-5 text-green-600" />
                )}
                <span className="font-semibold text-gray-900">
                  {currentView === 'family' ? 'Family View' : 'Personal View'}
                </span>
              </div>
              {currentView === 'family' ? (
                <ToggleLeft className="h-6 w-6 text-blue-600" />
              ) : (
                <ToggleRight className="h-6 w-6 text-green-600" />
              )}
            </button>
            
            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">Customize</span>
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {currentView === 'family' 
              ? 'Showing family-wide overview and activities' 
              : 'Showing your personal tasks and workload distribution'
            }
          </div>
        </div>

        {/* Customization Panel */}
        {showCustomization && (
          <div className="border-t border-gray-100 pt-4 space-y-4">
            {/* Widget Visibility */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Widget Visibility</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {widgetConfig.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => toggleWidget(widget.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      widgetVisibility[widget.id] 
                        ? 'border-green-200 bg-green-50 text-green-800' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">{widget.name}</div>
                      <div className="text-xs opacity-75">{widget.description}</div>
                    </div>
                    {widgetVisibility[widget.id] ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Preferences */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={layoutPreferences.compactMode}
                    onChange={(e) => updateLayoutPreferences({ compactMode: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Compact mode</span>
                </label>

                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={layoutPreferences.showWeather}
                    onChange={(e) => updateLayoutPreferences({ showWeather: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Show weather</span>
                </label>

                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={layoutPreferences.showNextEventCountdown}
                    onChange={(e) => updateLayoutPreferences({ showNextEventCountdown: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Event countdown</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Personal View Content */}
      {currentView === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Statistics */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Your Statistics</h3>
            </div>

            <div className="space-y-4">
              {/* Completion Rate */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Task Completion Rate</span>
                  <span className={`text-2xl font-bold ${getCompletionColor(personalStats.completionRate)}`}>
                    {personalStats.completionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${personalStats.completionRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{personalStats.pendingTasks}</div>
                  <div className="text-sm text-blue-600">Active Tasks</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">{personalStats.todayEvents}</div>
                  <div className="text-sm text-purple-600">Today's Events</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{personalStats.completedTasks}</div>
                  <div className="text-sm text-green-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-900">{personalStats.overdueTasks}</div>
                  <div className="text-sm text-red-600">Overdue</div>
                </div>
              </div>

              {/* Weekly Overview */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-800 mb-2">This Week</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Events scheduled:</span>
                  <span className="font-semibold text-gray-900">{personalStats.thisWeekEvents}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Family Workload Distribution */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Family Workload</h3>
            </div>

            <div className="space-y-4">
              {familyWorkload.map((memberWorkload) => (
                <div key={memberWorkload.member.id} className="flex items-center space-x-4">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${memberWorkload.member.color || 'bg-gray-500'}`}
                  >
                    {memberWorkload.member.avatar || memberWorkload.member.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{memberWorkload.member.name}</span>
                      <span className="text-sm text-gray-600">
                        {memberWorkload.totalWorkload} items
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getWorkloadColor(memberWorkload.totalWorkload)}`}
                        style={{ width: `${Math.min((memberWorkload.totalWorkload / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{memberWorkload.activeTasks} tasks</span>
                      <span>{memberWorkload.todayEvents} events today</span>
                    </div>
                  </div>
                </div>
              ))}

              {familyWorkload.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No family members found</p>
                </div>
              )}
            </div>

            {/* Workload Insights */}
            {familyWorkload.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Workload Balance</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    {(() => {
                      const maxWorkload = Math.max(...familyWorkload.map(m => m.totalWorkload));
                      const minWorkload = Math.min(...familyWorkload.map(m => m.totalWorkload));
                      const heaviestMember = familyWorkload.find(m => m.totalWorkload === maxWorkload);
                      const lightestMember = familyWorkload.find(m => m.totalWorkload === minWorkload);
                      
                      if (maxWorkload - minWorkload > 3) {
                        return `${heaviestMember?.member.name} has a heavy load. Consider redistributing some tasks.`;
                      } else {
                        return "Workload is well distributed across the family.";
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Personal Task List Preview */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckSquare className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Personal Task Focus</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Priority tasks, due today tasks, and upcoming tasks */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">High Priority</h4>
                <div className="text-2xl font-bold text-red-900">
                  {tasks.filter(t => 
                    !t.completed && 
                    t.priority === 'high' && 
                    (t.assignedTo === user?.username || t.created_by === user?.id)
                  ).length}
                </div>
                <div className="text-sm text-red-600">Urgent tasks</div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Due Today</h4>
                <div className="text-2xl font-bold text-yellow-900">
                  {tasks.filter(t => {
                    if (t.completed || !t.due_date) return false;
                    const today = new Date().toDateString();
                    const dueDate = new Date(t.due_date).toDateString();
                    return dueDate === today && 
                           (t.assignedTo === user?.username || t.created_by === user?.id);
                  }).length}
                </div>
                <div className="text-sm text-yellow-600">Need attention</div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">This Week</h4>
                <div className="text-2xl font-bold text-green-900">
                  {tasks.filter(t => {
                    if (t.completed || !t.due_date) return false;
                    const dueDate = new Date(t.due_date);
                    const today = new Date();
                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return dueDate >= today && dueDate <= weekFromNow && 
                           (t.assignedTo === user?.username || t.created_by === user?.id);
                  }).length}
                </div>
                <div className="text-sm text-green-600">Coming up</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalizedDashboard;