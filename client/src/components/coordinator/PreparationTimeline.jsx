import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Timer,
  ArrowRight,
  Utensils,
  Car,
  Dog,
  Shirt,
  Video,
  FileText,
  Coffee,
  Monitor,
  Edit3,
  Settings,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { eventContextService } from '../../services/eventContext';
import PreparationCustomizer from './PreparationCustomizer';

const PreparationTimeline = ({ event, className = '', socket }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customTimeline, setCustomTimeline] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default

  // Database integration functions
  const fetchTimelineFromDatabase = async () => {
    if (!event?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/events/${event.id}/timeline`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setTimelineData(data);
        setCompletedTasks(new Set(data.completedTasks || []));
        setError(null);
      } else {
        throw new Error('Failed to fetch timeline');
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
      setError(error.message);
      
      // Fallback to localStorage if database fails
      const saved = localStorage.getItem(`event-timeline-${event.id}`);
      if (saved) {
        try {
          const localTimeline = JSON.parse(saved);
          setCustomTimeline(localTimeline);
        } catch (e) {
          console.error('Failed to load saved timeline:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const saveTimelineToDatabase = async (timeline, completedTasksArray, isCustom = false) => {
    if (!event?.id) return;
    
    const updateData = {
      timeline,
      completedTasks: completedTasksArray,
      isCustom,
      eventPattern: timelineData?.eventPattern || 'custom',
      confidence: timelineData?.confidence || 100
    };
    
    if (isOnline) {
      try {
        const response = await fetch(`/api/calendar/events/${event.id}/timeline`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
          const data = await response.json();
          setTimelineData(data);
          setError(null);
          
          // Clear any pending updates since we successfully synced
          setPendingUpdates([]);
          
          // Emit WebSocket event for real-time sync
          if (socket) {
            socket.emit('timeline-updated', {
              eventId: event.id,
              timeline: data.timeline,
              completedTasks: data.completedTasks,
              updatedAt: data.updatedAt
            });
          }
        } else {
          throw new Error('Failed to save timeline');
        }
      } catch (error) {
        console.error('Error saving timeline:', error);
        setError(error.message);
        
        // Save to pending updates for later sync
        setPendingUpdates(prev => [...prev, updateData]);
        
        // Fallback to localStorage
        localStorage.setItem(`event-timeline-${event.id}`, JSON.stringify(timeline));
      }
    } else {
      // Offline: save to pending updates and localStorage
      setPendingUpdates(prev => [...prev, updateData]);
      localStorage.setItem(`event-timeline-${event.id}`, JSON.stringify(timeline));
    }
  };

  const syncPendingUpdates = async () => {
    if (!isOnline || pendingUpdates.length === 0) return;
    
    for (const update of pendingUpdates) {
      try {
        const response = await fetch(`/api/calendar/events/${event.id}/timeline`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(update)
        });
        
        if (response.ok) {
          const data = await response.json();
          setTimelineData(data);
          setPendingUpdates(prev => prev.filter(u => u !== update));
        }
      } catch (error) {
        console.error('Error syncing pending update:', error);
        break; // Stop syncing if there's an error
      }
    }
  };

  // Update time every 30 seconds for more precise countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingUpdates();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingUpdates]);

  // Fetch timeline from database on mount
  useEffect(() => {
    if (event?.id) {
      fetchTimelineFromDatabase();
    }
  }, [event?.id]);

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!socket || !event?.id) return;

    // Join timeline room for this event
    socket.emit('join-timeline', event.id);

    const handleTimelineUpdate = (data) => {
      if (data.eventId === event.id && data.updatedBy !== socket.id) {
        setTimelineData(prev => ({
          ...prev,
          timeline: data.timeline,
          completedTasks: data.completedTasks,
          updatedAt: data.updatedAt
        }));
        setCompletedTasks(new Set(data.completedTasks || []));
      }
    };

    const handleTaskCompletionUpdate = (data) => {
      if (data.eventId === event.id && data.updatedBy !== socket.id) {
        setCompletedTasks(prev => {
          const newCompleted = new Set(prev);
          if (data.completed) {
            newCompleted.add(data.taskIndex);
          } else {
            newCompleted.delete(data.taskIndex);
          }
          return newCompleted;
        });
      }
    };

    const handleTimelineCustomized = (data) => {
      if (data.eventId === event.id && data.updatedBy !== socket.id) {
        setCustomTimeline(data.customTimeline);
        setTimelineData(prev => ({
          ...prev,
          timeline: data.customTimeline,
          isCustom: data.isCustom,
          eventPattern: 'custom',
          confidence: 100
        }));
      }
    };

    socket.on('timeline-updated', handleTimelineUpdate);
    socket.on('task-completion-updated', handleTaskCompletionUpdate);
    socket.on('timeline-customized', handleTimelineCustomized);

    return () => {
      socket.emit('leave-timeline', event.id);
      socket.off('timeline-updated', handleTimelineUpdate);
      socket.off('task-completion-updated', handleTaskCompletionUpdate);
      socket.off('timeline-customized', handleTimelineCustomized);
    };
  }, [socket, event?.id]);

  if (!event || !event.start_time) return null;

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}>
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading timeline...</p>
        </div>
      </div>
    );
  }

  // Get timeline data from database or fallback to generated/custom timeline
  let currentTimelineData = timelineData;
  
  if (!currentTimelineData) {
    // Fallback to custom timeline or generate default
    currentTimelineData = customTimeline 
      ? { timeline: customTimeline, eventPattern: 'custom', confidence: 100 }
      : eventContextService.generatePreparationTimeline(event);
  }
  
  if (!currentTimelineData) return null;

  const { timeline, eventPattern, confidence } = currentTimelineData;

  // Helper functions
  const formatTimeUntil = (targetTime) => {
    const now = currentTime;
    const target = new Date(targetTime);
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Now';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    if (diffHours > 0) {
      return `${diffHours}h ${remainingMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isTaskOverdue = (taskTime) => {
    return new Date(taskTime) < currentTime;
  };

  const isTaskCurrent = (taskTime, duration = 0) => {
    const taskStart = new Date(taskTime);
    const taskEnd = new Date(taskStart.getTime() + (duration * 60 * 1000));
    return currentTime >= taskStart && currentTime <= taskEnd;
  };

  const getTaskIcon = (type, isCompleted, isCurrent) => {
    const iconClass = `h-4 w-4 ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'}`;
    
    switch (type) {
      case 'meal':
        return <Utensils className={iconClass} />;
      case 'dog_care':
        return <Dog className={iconClass} />;
      case 'preparation':
        return <Shirt className={iconClass} />;
      case 'departure':
        return <Car className={iconClass} />;
      case 'event_start':
        return <Clock className={iconClass} />;
      case 'tech_check':
        return <Video className={iconClass} />;
      case 'workspace_setup':
        return <Monitor className={iconClass} />;
      case 'document_review':
        return <FileText className={iconClass} />;
      case 'refresh':
        return <Coffee className={iconClass} />;
      default:
        return <Circle className={iconClass} />;
    }
  };

  const getUrgencyClass = (taskTime) => {
    const timeUntil = new Date(taskTime) - currentTime;
    const minutesUntil = Math.floor(timeUntil / (1000 * 60));
    
    if (minutesUntil <= 0) return 'border-red-300 bg-red-50';
    if (minutesUntil <= 15) return 'border-orange-300 bg-orange-50';
    if (minutesUntil <= 30) return 'border-yellow-300 bg-yellow-50';
    return 'border-gray-200 bg-white';
  };

  const toggleTaskComplete = async (index) => {
    const wasCompleted = completedTasks.has(index);
    const newCompleted = new Set(completedTasks);
    
    if (wasCompleted) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    
    // Optimistically update UI
    setCompletedTasks(newCompleted);
    
    // Save to database
    const completedTasksArray = Array.from(newCompleted);
    await saveTimelineToDatabase(timeline, completedTasksArray, currentTimelineData?.isCustom || false);
  };

  const getTimelineStatus = () => {
    const now = currentTime;
    const eventStart = new Date(event.start_time);
    const firstTask = timeline[0];
    
    if (now >= eventStart) return 'event_started';
    if (firstTask && now >= new Date(firstTask.time)) return 'in_progress';
    return 'pending';
  };

  const status = getTimelineStatus();

  const handleSaveCustomTimeline = async (newTimeline) => {
    setCustomTimeline(newTimeline);
    setShowCustomizer(false);
    
    // Save to database
    const completedTasksArray = Array.from(completedTasks);
    await saveTimelineToDatabase(newTimeline, completedTasksArray, true);
    
    // Emit WebSocket event for real-time sync
    if (socket) {
      socket.emit('timeline-customized', {
        eventId: event.id,
        customTimeline: newTimeline,
        isCustom: true
      });
    }
  };

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Timer className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900">Preparation Timeline</h3>
                <p className="text-sm text-indigo-600">
                  {eventPattern === 'custom' ? 'Customized timeline' :
                   eventPattern !== 'general' ? (
                    <>
                      {eventPattern} event • {confidence}% confidence
                    </>
                  ) : 'General event preparation'}
                </p>
              </div>
              <div className="p-1">
                {isCollapsed ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>
            <div className="flex items-center space-x-2">
              {/* Connection Status Indicator */}
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-600" title="Online - syncing in real-time" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" title="Offline - changes saved locally" />
                )}
                {pendingUpdates.length > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    {pendingUpdates.length} pending
                  </span>
                )}
              </div>

              {error && (
                <div className="text-red-600 text-sm" title={error}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
              )}

              <button
                onClick={() => setShowCustomizer(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Customize Timeline"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                status === 'event_started' ? 'bg-green-100 text-green-800' :
                status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-700'
              }`}>
                {status === 'event_started' ? 'Event Started' :
                 status === 'in_progress' ? 'In Progress' :
                 'Pending'}
              </div>
            </div>
          </div>
        </div>

      {/* Timeline - Collapsible */}
      {!isCollapsed && (
        <div className="p-6">
          <div className="space-y-4">
          {timeline.map((task, index) => {
            const isCompleted = completedTasks.has(index);
            const isCurrent = isTaskCurrent(task.time, task.duration);
            const isOverdue = isTaskOverdue(task.time);
            const timeUntil = formatTimeUntil(task.time);
            
            return (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${getUrgencyClass(task.time)} ${
                  isCurrent ? 'ring-2 ring-blue-200 shadow-md' : ''
                } ${isCompleted ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Completion Checkbox */}
                  <button
                    onClick={() => toggleTaskComplete(index)}
                    className="mt-1 transition-colors duration-200"
                    disabled={task.type === 'event_start'}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>

                  {/* Task Icon */}
                  <div className="mt-1">
                    {getTaskIcon(task.type, isCompleted, isCurrent)}
                  </div>

                  {/* Task Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${
                        isCompleted ? 'line-through text-gray-500' : 
                        isCurrent ? 'text-blue-900' :
                        isOverdue ? 'text-red-900' :
                        'text-gray-900'
                      }`}>
                        {task.activity}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {isOverdue && !isCompleted && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${
                          isOverdue && !isCompleted ? 'text-red-600' :
                          isCurrent ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {formatTime(new Date(task.time))}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {task.duration > 0 && (
                        <span className="flex items-center space-x-1">
                          <Timer className="h-3 w-3" />
                          <span>{task.duration} min</span>
                        </span>
                      )}
                      
                      <span className={`flex items-center space-x-1 ${
                        timeUntil === 'Now' || isOverdue ? 'text-red-600 font-semibold' :
                        isCurrent ? 'text-blue-600 font-semibold' :
                        ''
                      }`}>
                        <Clock className="h-3 w-3" />
                        <span>
                          {timeUntil === 'Now' ? 'Now' : 
                           isOverdue ? 'Overdue' :
                           `in ${timeUntil}`}
                        </span>
                      </span>
                    </div>

                    {task.note && (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        {task.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-900">
                Progress: {completedTasks.size}/{timeline.filter(t => t.type !== 'event_start').length} tasks completed
              </span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <ArrowRight className="h-4 w-4" />
              <span>Event starts {formatTimeUntil(event.start_time)}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(completedTasks.size / Math.max(timeline.filter(t => t.type !== 'event_start').length, 1)) * 100}%`
                }}
              />
            </div>
          </div>
          </div>
        </div>
      )}
    </div>

    {/* Customizer Modal */}
    {showCustomizer && (
      <PreparationCustomizer
        event={event}
        timeline={timeline}
        onSave={handleSaveCustomTimeline}
        onClose={() => setShowCustomizer(false)}
      />
    )}
    </>
  );
};

export default PreparationTimeline;