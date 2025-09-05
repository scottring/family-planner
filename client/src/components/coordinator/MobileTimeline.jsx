import { useState, useEffect, useRef } from 'react';
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
  Wifi,
  WifiOff,
  ChevronUp,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { eventContextService } from '../../services/eventContext';

const MobileTimeline = ({ event, className = '', socket }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [swipeStates, setSwipeStates] = useState({});
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  // Swipe gesture handling
  const handleTouchStart = (e, taskIndex) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    
    setSwipeStates(prev => ({
      ...prev,
      [taskIndex]: { ...prev[taskIndex], startX: touch.clientX, isDragging: true }
    }));
  };

  const handleTouchMove = (e, taskIndex) => {
    if (!swipeStates[taskIndex]?.isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Only allow horizontal swipe if vertical movement is minimal
    if (deltaY < 30) {
      e.preventDefault();
      setSwipeStates(prev => ({
        ...prev,
        [taskIndex]: { ...prev[taskIndex], translateX: deltaX }
      }));
    }
  };

  const handleTouchEnd = (e, taskIndex) => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime.current;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    setSwipeStates(prev => ({
      ...prev,
      [taskIndex]: { ...prev[taskIndex], isDragging: false, translateX: 0 }
    }));
    
    // Swipe gesture detection
    if (Math.abs(deltaX) > 50 && deltaY < 30 && touchDuration < 500) {
      if (deltaX > 0) {
        // Swipe right - mark as complete
        toggleTaskComplete(taskIndex);
      } else {
        // Swipe left - mark as incomplete (if completed)
        if (completedTasks.has(taskIndex)) {
          toggleTaskComplete(taskIndex);
        }
      }
    }
  };

  // Database integration functions (reused from original component)
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
          setTimelineData({ timeline: localTimeline, eventPattern: 'custom', confidence: 100 });
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
        setPendingUpdates(prev => [...prev, updateData]);
        localStorage.setItem(`event-timeline-${event.id}`, JSON.stringify(timeline));
      }
    } else {
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
        break;
      }
    }
  };

  // Update time every 30 seconds
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

    socket.on('timeline-updated', handleTimelineUpdate);
    socket.on('task-completion-updated', handleTaskCompletionUpdate);

    return () => {
      socket.emit('leave-timeline', event.id);
      socket.off('timeline-updated', handleTimelineUpdate);
      socket.off('task-completion-updated', handleTaskCompletionUpdate);
    };
  }, [socket, event?.id]);

  if (!event || !event.start_time) return null;

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 mx-4 my-2">
        <div className="px-4 py-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 mt-3">Loading timeline...</p>
        </div>
      </div>
    );
  }

  // Get timeline data
  let currentTimelineData = timelineData;
  
  if (!currentTimelineData) {
    currentTimelineData = eventContextService.generatePreparationTimeline(event);
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
      hour: 'numeric', 
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
    const iconClass = `h-5 w-5 ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'}`;
    
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
    
    if (minutesUntil <= 0) return 'border-red-400 bg-red-50';
    if (minutesUntil <= 15) return 'border-orange-400 bg-orange-50';
    if (minutesUntil <= 30) return 'border-yellow-400 bg-yellow-50';
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
    
    setCompletedTasks(newCompleted);
    
    const completedTasksArray = Array.from(newCompleted);
    await saveTimelineToDatabase(timeline, completedTasksArray, currentTimelineData?.isCustom || false);
  };

  const getNextTask = () => {
    return timeline.find((task, index) => !completedTasks.has(index) && task.type !== 'event_start');
  };

  const nextTask = getNextTask();

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Mobile Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Timer className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Timeline</h3>
              <p className="text-xs text-indigo-600">
                {eventPattern === 'custom' ? 'Custom' : eventPattern || 'General'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className="flex items-center">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
            </div>
            {pendingUpdates.length > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                {pendingUpdates.length}
              </span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-gray-600 hover:text-indigo-600 rounded"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Next Task Card - Always Visible */}
          {nextTask && (
            <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {getTaskIcon(nextTask.type, false, true)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-blue-900 truncate">
                    Next: {nextTask.activity}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-blue-700">
                    <span>{formatTime(new Date(nextTask.time))}</span>
                    <span>•</span>
                    <span>{formatTimeUntil(nextTask.time)}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleTaskComplete(timeline.indexOf(nextTask))}
                  className="p-2 bg-blue-600 rounded-lg text-white active:bg-blue-700 transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Timeline Tasks */}
          <div className="px-2 py-2 max-h-96 overflow-y-auto">
            {timeline.map((task, index) => {
              const isCompleted = completedTasks.has(index);
              const isCurrent = isTaskCurrent(task.time, task.duration);
              const isOverdue = isTaskOverdue(task.time);
              const timeUntil = formatTimeUntil(task.time);
              const swipeState = swipeStates[index] || {};
              
              return (
                <div
                  key={index}
                  className={`mx-2 mb-2 p-3 rounded-lg border-2 transition-all duration-200 touch-pan-y ${getUrgencyClass(task.time)} ${
                    isCurrent ? 'ring-2 ring-blue-200' : ''
                  } ${isCompleted ? 'opacity-60' : ''}`}
                  style={{
                    transform: `translateX(${swipeState.translateX || 0}px)`,
                  }}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={(e) => handleTouchMove(e, index)}
                  onTouchEnd={(e) => handleTouchEnd(e, index)}
                >
                  <div className="flex items-center space-x-3">
                    {/* Large touch target for completion */}
                    <button
                      onClick={() => toggleTaskComplete(index)}
                      className="p-2 transition-colors duration-200 rounded-lg active:bg-gray-100"
                      disabled={task.type === 'event_start'}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400" />
                      )}
                    </button>

                    {/* Task Icon */}
                    <div className="p-1">
                      {getTaskIcon(task.type, isCompleted, isCurrent)}
                    </div>

                    {/* Task Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold mb-1 ${
                        isCompleted ? 'line-through text-gray-500' : 
                        isCurrent ? 'text-blue-900' :
                        isOverdue ? 'text-red-900' :
                        'text-gray-900'
                      }`}>
                        {task.activity}
                      </h4>
                      
                      <div className="flex items-center space-x-3 text-xs">
                        <span className={`font-medium ${
                          isOverdue && !isCompleted ? 'text-red-600' :
                          isCurrent ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {formatTime(new Date(task.time))}
                        </span>
                        
                        {task.duration > 0 && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">{task.duration}m</span>
                          </>
                        )}
                        
                        <span className="text-gray-400">•</span>
                        <span className={`${
                          timeUntil === 'Now' || isOverdue ? 'text-red-600 font-semibold' :
                          isCurrent ? 'text-blue-600 font-semibold' :
                          'text-gray-600'
                        }`}>
                          {timeUntil === 'Now' ? 'Now' : 
                           isOverdue ? 'Overdue' :
                           timeUntil}
                        </span>
                      </div>
                    </div>
                    
                    {isOverdue && !isCompleted && (
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Swipe Instructions */}
                  {!isCompleted && index === 0 && (
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      Swipe right to complete, tap to toggle
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Progress Bar */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {completedTasks.size}/{timeline.filter(t => t.type !== 'event_start').length} completed
              </span>
              <span className="text-xs text-gray-600">
                Event in {formatTimeUntil(event.start_time)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${(completedTasks.size / Math.max(timeline.filter(t => t.type !== 'event_start').length, 1)) * 100}%`
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileTimeline;