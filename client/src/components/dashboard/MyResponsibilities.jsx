import { useState, useEffect } from 'react';
import { CheckSquare, Clock, AlertCircle, User, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useEventStore } from '../../stores/eventStore';

const MyResponsibilities = () => {
  const { user } = useAuthStore();
  const { tasks, updateTask } = useTaskStore();
  const { events } = useEventStore();
  
  // Get tasks assigned to current user
  const myTasks = tasks.filter(task => 
    task.assignedTo === user?.username || 
    task.assignedTo === user?.full_name ||
    task.created_by === user?.id
  );

  // Get events where current user is responsible
  const myEvents = events.filter(event => 
    event.assignedTo === user?.username ||
    event.organizer === user?.username ||
    (event.attendees && event.attendees.includes(user?.username))
  );

  // Categorize tasks
  const overdueTasks = myTasks.filter(task => {
    if (!task.due_date || task.completed) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return dueDate < today;
  });

  const todayTasks = myTasks.filter(task => {
    if (!task.due_date || task.completed) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });

  const upcomingTasks = myTasks.filter(task => {
    if (!task.due_date || task.completed) return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate > today && dueDate <= nextWeek;
  }).slice(0, 3);

  // Get today's events for the user
  const todayEvents = myEvents.filter(event => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const eventDate = new Date(event.start_time);
    return eventDate >= today && eventDate < tomorrow;
  });

  // Events that need preparation
  const eventsNeedingPrep = todayEvents.filter(event => 
    event.checklist && event.checklist.length > 0 && 
    event.checklist.some(item => !item.completed)
  );

  const handleTaskToggle = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await updateTask(taskId, { completed: !task.completed });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDueDate = (dueDateString) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;
    
    return dueDate.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">My Responsibilities</h2>
          </div>
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <span>{myTasks.filter(t => !t.completed).length} active tasks</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overdue Tasks Alert */}
        {overdueTasks.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800">
                {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
              </h3>
            </div>
            <div className="space-y-2">
              {overdueTasks.slice(0, 2).map((task) => (
                <div key={task.id} className="flex items-start space-x-3">
                  <button
                    onClick={() => handleTaskToggle(task.id)}
                    className="mt-0.5 w-4 h-4 rounded border-2 border-red-300 hover:border-red-500 transition-colors"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">{task.title}</p>
                    <p className="text-xs text-red-600">
                      Due: {formatDueDate(task.due_date)}
                    </p>
                  </div>
                </div>
              ))}
              {overdueTasks.length > 2 && (
                <p className="text-xs text-red-600">
                  +{overdueTasks.length - 2} more overdue tasks
                </p>
              )}
            </div>
          </div>
        )}

        {/* Today's Tasks */}
        {todayTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <h3 className="font-semibold text-gray-800">Due Today</h3>
            </div>
            <div className="space-y-2">
              {todayTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <button
                    onClick={() => handleTaskToggle(task.id)}
                    className="w-5 h-5 rounded border-2 border-orange-300 hover:border-orange-500 transition-colors flex items-center justify-center"
                  >
                    {task.completed && (
                      <CheckSquare className="w-3 h-3 text-orange-600" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {task.title}
                    </p>
                    {task.priority && (
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Today's Events</h3>
            </div>
            <div className="space-y-2">
              {todayEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{event.title}</p>
                    <p className="text-sm text-blue-600">
                      {formatTime(event.start_time)}
                      {event.location && ` • ${event.location}`}
                    </p>
                  </div>
                  {eventsNeedingPrep.includes(event) && (
                    <div className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      <AlertCircle className="h-3 w-3" />
                      <span>Prep needed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Coming Up This Week</h3>
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                  <div>
                    <p className="font-medium text-gray-800">{task.title}</p>
                    <p className="text-sm text-gray-600">
                      Due: {formatDueDate(task.due_date)}
                    </p>
                  </div>
                  {task.priority && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {myTasks.filter(t => !t.completed).length === 0 && todayEvents.length === 0 && (
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">All caught up!</p>
            <p className="text-sm text-gray-400">No tasks or events requiring your attention.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex space-x-2">
            <Link
              to="/tasks"
              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
            >
              <span>View All Tasks</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
            <Link
              to="/calendar"
              className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <span>View Calendar</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyResponsibilities;