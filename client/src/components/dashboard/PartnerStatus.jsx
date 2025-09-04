import { useState, useEffect } from 'react';
import { Users, Calendar, CheckSquare, Clock, MapPin, Heart, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useEventStore } from '../../stores/eventStore';
import { useFamilyStore } from '../../stores/familyStore';

const PartnerStatus = () => {
  const { user } = useAuthStore();
  const { tasks } = useTaskStore();
  const { events } = useEventStore();
  const { familyMembers } = useFamilyStore();
  
  // Get partner (assume there's another parent in the family)
  const partner = familyMembers.find(member => 
    member.type === 'parent' && 
    member.name !== user?.username &&
    member.name !== user?.full_name
  );

  // Get partner's tasks and events
  const partnerTasks = tasks.filter(task => 
    task.assignedTo === partner?.name || 
    task.assignedTo === partner?.username
  );

  const partnerEvents = events.filter(event => 
    event.assignedTo === partner?.name ||
    event.organizer === partner?.name ||
    (event.attendees && event.attendees.includes(partner?.name))
  );

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Partner's today events
  const partnerTodayEvents = partnerEvents.filter(event => {
    const eventDate = new Date(event.start_time);
    return eventDate >= today && eventDate < tomorrow;
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  // Partner's current/next event
  const getCurrentOrNextEvent = () => {
    const now = new Date();
    const currentEvent = partnerTodayEvents.find(event => {
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time || event.start_time);
      endTime.setHours(endTime.getHours() + 1); // assume 1 hour if no end time
      return now >= startTime && now <= endTime;
    });

    if (currentEvent) return { event: currentEvent, status: 'current' };

    const nextEvent = partnerTodayEvents.find(event => {
      const eventTime = new Date(event.start_time);
      return eventTime > now;
    });

    return nextEvent ? { event: nextEvent, status: 'next' } : null;
  };

  const currentOrNextEvent = getCurrentOrNextEvent();

  // Partner's task stats
  const partnerTaskStats = {
    total: partnerTasks.length,
    completed: partnerTasks.filter(t => t.completed).length,
    pending: partnerTasks.filter(t => !t.completed).length,
    overdue: partnerTasks.filter(t => {
      if (!t.due_date || t.completed) return false;
      const dueDate = new Date(t.due_date);
      return dueDate < today;
    }).length,
    dueToday: partnerTasks.filter(t => {
      if (!t.due_date || t.completed) return false;
      const dueDate = new Date(t.due_date);
      return dueDate.toDateString() === today.toDateString();
    }).length,
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getPartnerAvailability = () => {
    const now = new Date();
    const currentEvent = partnerTodayEvents.find(event => {
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time || event.start_time);
      endTime.setHours(endTime.getHours() + 1);
      return now >= startTime && now <= endTime;
    });

    if (currentEvent) {
      return {
        status: 'busy',
        message: `In ${currentEvent.title}`,
        color: 'text-red-600 bg-red-100',
      };
    }

    const nextEvent = partnerTodayEvents.find(event => {
      const eventTime = new Date(event.start_time);
      return eventTime > now;
    });

    if (nextEvent) {
      const timeUntil = new Date(nextEvent.start_time).getTime() - now.getTime();
      const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
      const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

      if (hoursUntil === 0 && minutesUntil <= 30) {
        return {
          status: 'busy-soon',
          message: `Busy in ${minutesUntil}m`,
          color: 'text-yellow-600 bg-yellow-100',
        };
      }
    }

    return {
      status: 'available',
      message: 'Available',
      color: 'text-green-600 bg-green-100',
    };
  };

  const availability = getPartnerAvailability();

  // Get partner's workload level
  const getWorkloadLevel = () => {
    const activeTasks = partnerTaskStats.pending;
    const todayEvents = partnerTodayEvents.length;
    const totalWorkload = activeTasks + todayEvents + (partnerTaskStats.overdue * 2);

    if (totalWorkload >= 8) return { level: 'high', color: 'text-red-600', label: 'Heavy' };
    if (totalWorkload >= 5) return { level: 'medium', color: 'text-yellow-600', label: 'Moderate' };
    return { level: 'light', color: 'text-green-600', label: 'Light' };
  };

  const workload = getWorkloadLevel();

  if (!partner) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Partner Status</h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No partner found</p>
          <p className="text-sm text-gray-400">Add family members to see partner status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{partner.name}'s Status</h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${availability.color}`}>
            {availability.message}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current/Next Event */}
        {currentOrNextEvent && (
          <div className={`p-4 rounded-lg border ${
            currentOrNextEvent.status === 'current' 
              ? 'bg-red-50 border-red-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    currentOrNextEvent.status === 'current' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                  }`}></div>
                  <span className={`text-sm font-semibold uppercase tracking-wide ${
                    currentOrNextEvent.status === 'current' ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {currentOrNextEvent.status === 'current' ? 'Currently At' : 'Next Event'}
                  </span>
                </div>
                <h3 className={`text-lg font-bold mb-2 ${
                  currentOrNextEvent.status === 'current' ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {currentOrNextEvent.event.title}
                </h3>
                <div className={`flex items-center space-x-4 text-sm ${
                  currentOrNextEvent.status === 'current' ? 'text-red-700' : 'text-blue-700'
                }`}>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(currentOrNextEvent.event.start_time)}</span>
                  </span>
                  {currentOrNextEvent.event.location && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{currentOrNextEvent.event.location}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Task Overview</h3>
            <span className={`text-sm font-medium ${workload.color}`}>
              {workload.label} workload
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {partnerTaskStats.pending}
              </div>
              <div className="text-sm text-gray-600">Active Tasks</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {partnerTodayEvents.length}
              </div>
              <div className="text-sm text-gray-600">Events Today</div>
            </div>
          </div>

          {/* Alerts */}
          {(partnerTaskStats.overdue > 0 || partnerTaskStats.dueToday > 0) && (
            <div className="space-y-2">
              {partnerTaskStats.overdue > 0 && (
                <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded">
                  <Clock className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">
                    {partnerTaskStats.overdue} overdue task{partnerTaskStats.overdue > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {partnerTaskStats.dueToday > 0 && (
                <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <CheckSquare className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    {partnerTaskStats.dueToday} task{partnerTaskStats.dueToday > 1 ? 's' : ''} due today
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Today's Schedule Preview */}
        {partnerTodayEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Today's Schedule</h3>
            <div className="space-y-2">
              {partnerTodayEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center space-x-3 p-2 bg-purple-50 rounded">
                  <div className="w-2 h-8 bg-purple-400 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{event.title}</p>
                    <p className="text-xs text-purple-600">
                      {formatTime(event.start_time)}
                      {event.location && ` • ${event.location}`}
                    </p>
                  </div>
                </div>
              ))}
              {partnerTodayEvents.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{partnerTodayEvents.length - 3} more events today
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex space-x-2">
            <button className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              <span>Message</span>
            </button>
            <button className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm">
              <Calendar className="h-4 w-4 mr-2" />
              <span>View Schedule</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {partnerTodayEvents.length === 0 && partnerTaskStats.pending === 0 && (
          <div className="text-center py-4">
            <Heart className="h-8 w-8 text-purple-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{partner.name} has a free day!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerStatus;