import { useState } from 'react';
import { Users, Calendar, CheckSquare, Clock, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { useFamilyStore } from '../../stores/familyStore';
import { useTaskStore } from '../../stores/taskStore';
import { useEventStore } from '../../stores/eventStore';

const FamilyOverview = () => {
  const { familyMembers } = useFamilyStore();
  const { tasks } = useTaskStore();
  const { events } = useEventStore();
  const [expandedMember, setExpandedMember] = useState(null);

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get member activity data
  const getMemberData = (member) => {
    // Get member's tasks
    const memberTasks = tasks.filter(task => 
      task.assignedTo === member.name || 
      task.assignedTo === member.username
    );

    // Get member's events
    const memberEvents = events.filter(event => 
      event.assignedTo === member.name ||
      event.organizer === member.name ||
      (event.attendees && event.attendees.includes(member.name))
    );

    // Today's events for this member
    const todayEvents = memberEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate < tomorrow;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Task statistics
    const taskStats = {
      total: memberTasks.length,
      completed: memberTasks.filter(t => t.completed).length,
      pending: memberTasks.filter(t => !t.completed).length,
      overdue: memberTasks.filter(t => {
        if (!t.due_date || t.completed) return false;
        const dueDate = new Date(t.due_date);
        return dueDate < today;
      }).length,
      dueToday: memberTasks.filter(t => {
        if (!t.due_date || t.completed) return false;
        const dueDate = new Date(t.due_date);
        return dueDate.toDateString() === today.toDateString();
      }).length,
    };

    // Current status
    const now = new Date();
    const currentEvent = todayEvents.find(event => {
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time || event.start_time);
      endTime.setHours(endTime.getHours() + 1); // assume 1 hour if no end time
      return now >= startTime && now <= endTime;
    });

    const nextEvent = todayEvents.find(event => {
      const eventTime = new Date(event.start_time);
      return eventTime > now;
    });

    return {
      member,
      tasks: memberTasks,
      events: memberEvents,
      todayEvents,
      taskStats,
      currentEvent,
      nextEvent,
    };
  };

  const familyData = familyMembers.map(getMemberData);

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (memberData) => {
    if (memberData.currentEvent) return 'bg-red-100 text-red-800';
    if (memberData.nextEvent) {
      const timeUntil = new Date(memberData.nextEvent.start_time).getTime() - new Date().getTime();
      if (timeUntil <= 30 * 60 * 1000) return 'bg-yellow-100 text-yellow-800'; // 30 minutes
    }
    if (memberData.taskStats.overdue > 0) return 'bg-red-100 text-red-800';
    if (memberData.taskStats.dueToday > 0) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (memberData) => {
    if (memberData.currentEvent) return `At ${memberData.currentEvent.title}`;
    if (memberData.nextEvent) {
      const timeUntil = new Date(memberData.nextEvent.start_time).getTime() - new Date().getTime();
      const minutesUntil = Math.floor(timeUntil / (1000 * 60));
      if (minutesUntil <= 30) return `${memberData.nextEvent.title} in ${minutesUntil}m`;
      return `Next: ${formatTime(memberData.nextEvent.start_time)}`;
    }
    if (memberData.taskStats.overdue > 0) return `${memberData.taskStats.overdue} overdue`;
    if (memberData.taskStats.dueToday > 0) return `${memberData.taskStats.dueToday} due today`;
    if (memberData.todayEvents.length === 0 && memberData.taskStats.pending === 0) return 'Free day';
    return 'Available';
  };

  const getWorkloadLevel = (memberData) => {
    const score = memberData.taskStats.pending + 
                 memberData.todayEvents.length + 
                 (memberData.taskStats.overdue * 2);
    
    if (score >= 8) return { level: 'High', color: 'text-red-600' };
    if (score >= 4) return { level: 'Medium', color: 'text-yellow-600' };
    if (score >= 1) return { level: 'Light', color: 'text-green-600' };
    return { level: 'None', color: 'text-gray-600' };
  };

  // Family-wide statistics
  const familyStats = {
    totalEvents: familyData.reduce((sum, member) => sum + member.todayEvents.length, 0),
    totalTasks: familyData.reduce((sum, member) => sum + member.taskStats.pending, 0),
    totalOverdue: familyData.reduce((sum, member) => sum + member.taskStats.overdue, 0),
    busyMembers: familyData.filter(member => member.currentEvent || member.nextEvent).length,
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Family Overview</h2>
          </div>
          <div className="text-sm text-indigo-600">
            {familyStats.busyMembers}/{familyMembers.length} active
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Family Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{familyStats.totalEvents}</div>
            <div className="text-sm text-blue-600">Events Today</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">{familyStats.totalTasks}</div>
            <div className="text-sm text-green-600">Active Tasks</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-900">{familyStats.totalOverdue}</div>
            <div className="text-sm text-red-600">Overdue</div>
          </div>
        </div>

        {/* Family Members */}
        <div className="space-y-3">
          {familyData.map((memberData, index) => {
            const isExpanded = expandedMember === index;
            const workload = getWorkloadLevel(memberData);
            
            return (
              <div key={memberData.member.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Member Header */}
                <button
                  onClick={() => setExpandedMember(isExpanded ? null : index)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${memberData.member.color || 'bg-gray-500'}`}
                    >
                      {memberData.member.avatar || memberData.member.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{memberData.member.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(memberData)}`}>
                          {getStatusText(memberData)}
                        </span>
                        <span className={`text-xs font-medium ${workload.color}`}>
                          {workload.level} load
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right text-sm text-gray-600">
                      <div>{memberData.todayEvents.length} events</div>
                      <div>{memberData.taskStats.pending} tasks</div>
                    </div>
                    {isExpanded ? 
                      <ChevronDown className="h-5 w-5 text-gray-400" /> : 
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-gray-100">
                    <div className="space-y-4">
                      {/* Today's Events */}
                      {memberData.todayEvents.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                            Today's Events
                          </h4>
                          <div className="space-y-2">
                            {memberData.todayEvents.map((event) => (
                              <div key={event.id} className="flex items-center space-x-3 p-2 bg-blue-50 rounded text-sm">
                                <div className="w-2 h-6 bg-blue-400 rounded-full"></div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800">{event.title}</div>
                                  <div className="text-blue-600 text-xs flex items-center space-x-2">
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
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Task Summary */}
                      {memberData.taskStats.pending > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                            <CheckSquare className="h-4 w-4 mr-2 text-green-600" />
                            Tasks ({memberData.taskStats.pending} pending)
                          </h4>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {memberData.taskStats.dueToday > 0 && (
                              <div className="p-2 bg-orange-50 rounded text-xs">
                                <div className="font-bold text-orange-900">{memberData.taskStats.dueToday}</div>
                                <div className="text-orange-600">Due Today</div>
                              </div>
                            )}
                            {memberData.taskStats.overdue > 0 && (
                              <div className="p-2 bg-red-50 rounded text-xs">
                                <div className="font-bold text-red-900">{memberData.taskStats.overdue}</div>
                                <div className="text-red-600">Overdue</div>
                              </div>
                            )}
                            <div className="p-2 bg-green-50 rounded text-xs">
                              <div className="font-bold text-green-900">{memberData.taskStats.completed}</div>
                              <div className="text-green-600">Completed</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* No Activity */}
                      {memberData.todayEvents.length === 0 && memberData.taskStats.pending === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No scheduled activities today</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Family Empty State */}
        {familyMembers.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No family members added</p>
            <p className="text-sm text-gray-400">Add family members to see their activities</p>
          </div>
        )}

        {/* Today's Family Coordination */}
        {familyStats.totalEvents > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-medium text-indigo-800 mb-2">Today's Family Coordination</h4>
              <div className="text-sm text-indigo-700">
                <div className="flex justify-between items-center">
                  <span>Family events scheduled:</span>
                  <span className="font-semibold">{familyStats.totalEvents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Members with activities:</span>
                  <span className="font-semibold">{familyData.filter(m => m.todayEvents.length > 0 || m.taskStats.pending > 0).length}</span>
                </div>
                {familyStats.totalOverdue > 0 && (
                  <div className="flex justify-between items-center text-red-700 bg-red-100 px-2 py-1 rounded mt-2">
                    <span>Needs attention:</span>
                    <span className="font-semibold">{familyStats.totalOverdue} overdue items</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyOverview;