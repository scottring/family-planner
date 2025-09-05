import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Timer,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff
} from 'lucide-react';
import { eventContextService } from '../../services/eventContext';

const SmartWatchView = ({ event, className = '', socket }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('next'); // 'next', 'progress', 'time'

  // Smart watch dimensions (typically 390x390 or similar)
  const isSmallWatch = window.screen.width <= 240;
  const fontSize = isSmallWatch ? 'text-xs' : 'text-sm';
  const iconSize = isSmallWatch ? 'h-4 w-4' : 'h-5 w-5';

  // Database integration functions (simplified from original)
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
      
      // Fallback to localStorage
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

  const saveTimelineToDatabase = async (timeline, completedTasksArray) => {
    if (!event?.id) return;
    
    const updateData = {
      timeline,
      completedTasks: completedTasksArray,
      eventPattern: timelineData?.eventPattern || 'custom',
      confidence: timelineData?.confidence || 100
    };
    
    if (isOnline) {
      try {
        const response = await fetch(`/api/calendar/events/${event.id}/timeline`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
          const data = await response.json();
          setTimelineData(data);
          setError(null);
          setPendingUpdates([]);
          
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
        setPendingUpdates(prev => [...prev, updateData]);
        localStorage.setItem(`event-timeline-${event.id}`, JSON.stringify(timeline));
      }
    } else {
      setPendingUpdates(prev => [...prev, updateData]);
      localStorage.setItem(`event-timeline-${event.id}`, JSON.stringify(timeline));
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
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch timeline on mount
  useEffect(() => {
    if (event?.id) {
      fetchTimelineFromDatabase();
    }
  }, [event?.id]);

  // WebSocket listeners
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
      <div className="bg-black text-white rounded-full w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className={`mt-2 ${fontSize}`}>Loading...</p>
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

  const { timeline } = currentTimelineData;

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

  const isTaskCurrent = (taskTime, duration = 0) => {
    const taskStart = new Date(taskTime);
    const taskEnd = new Date(taskStart.getTime() + (duration * 60 * 1000));
    return currentTime >= taskStart && currentTime <= taskEnd;
  };

  const isTaskOverdue = (taskTime) => {
    return new Date(taskTime) < currentTime;
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
    await saveTimelineToDatabase(timeline, completedTasksArray);
    
    // Haptic feedback for watch
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const getNextTask = () => {
    return timeline.find((task, index) => 
      !completedTasks.has(index) && task.type !== 'event_start'
    );
  };

  const getUrgentTasks = () => {
    return timeline.filter((task, index) => {
      if (completedTasks.has(index) || task.type === 'event_start') return false;
      const timeUntil = new Date(task.time) - currentTime;
      return timeUntil <= 15 * 60 * 1000 && timeUntil >= 0; // Within 15 minutes
    });
  };

  const progress = Math.round((completedTasks.size / Math.max(timeline.length, 1)) * 100);
  const nextTask = getNextTask();
  const urgentTasks = getUrgentTasks();

  // Cycle through view modes on tap/click
  const cycleViewMode = () => {
    const modes = ['next', 'progress', 'time'];
    const currentModeIndex = modes.indexOf(viewMode);
    const nextModeIndex = (currentModeIndex + 1) % modes.length;
    setViewMode(modes[nextModeIndex]);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  const renderNextTaskView = () => {
    if (!nextTask) {
      return (
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
          <p className={`font-bold ${fontSize} mb-1`}>All Done!</p>
          <p className={`${fontSize} opacity-80`}>Event in {formatTimeUntil(event.start_time)}</p>
        </div>
      );
    }

    const timeUntil = formatTimeUntil(nextTask.time);
    const isOverdue = isTaskOverdue(nextTask.time);
    const isCurrent = isTaskCurrent(nextTask.time, nextTask.duration);

    return (
      <div className="text-center">
        <div className={`mb-2 p-2 rounded-lg ${
          isOverdue ? 'bg-red-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-700'
        }`}>
          <p className={`font-bold ${fontSize} mb-1`}>
            {isOverdue ? 'OVERDUE' : isCurrent ? 'NOW' : 'NEXT'}
          </p>
          <p className={`${fontSize} truncate`}>{nextTask.activity}</p>
          <p className={`text-xs opacity-80`}>
            {formatTime(new Date(nextTask.time))}
            {!isOverdue && !isCurrent && ` (${timeUntil})`}
          </p>
        </div>
        
        <button
          onClick={() => toggleTaskComplete(timeline.indexOf(nextTask))}
          className="p-3 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
        >
          <CheckCircle className="h-6 w-6" />
        </button>
      </div>
    );
  };

  const renderProgressView = () => {
    return (
      <div className="text-center">
        <div className="mb-4">
          <div className="text-3xl font-bold mb-1">{progress}%</div>
          <div className={`${fontSize} opacity-80 mb-3`}>
            {completedTasks.size}/{timeline.length} tasks
          </div>
          
          {/* Circular progress */}
          <div className="w-20 h-20 mx-auto relative">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#22c55e"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${progress * 2.51} 251`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold">{progress}%</span>
            </div>
          </div>
        </div>
        
        {urgentTasks.length > 0 && (
          <div className="bg-orange-600 p-2 rounded text-xs">
            {urgentTasks.length} urgent task{urgentTasks.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  const renderTimeView = () => {
    const eventTime = formatTime(new Date(event.start_time));
    const timeUntil = formatTimeUntil(event.start_time);
    
    return (
      <div className="text-center">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-80" />
        <div className={`font-bold ${fontSize} mb-1 truncate`}>
          {event.title}
        </div>
        <div className="text-xl font-mono mb-2">{eventTime}</div>
        <div className={`${fontSize} opacity-80`}>
          {timeUntil === 'Now' ? 'Starting Now!' : `in ${timeUntil}`}
        </div>
        
        {nextTask && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className={`${fontSize} opacity-80`}>Next Task:</div>
            <div className={`text-xs truncate`}>{nextTask.activity}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`bg-black text-white rounded-full w-full h-full flex flex-col ${className}`}
      style={{
        minHeight: '200px',
        maxWidth: '200px',
        aspectRatio: '1',
      }}
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 text-xs">
        <div className="flex items-center space-x-1">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-green-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-400" />
          )}
          {pendingUpdates.length > 0 && (
            <span className="text-yellow-400">•</span>
          )}
        </div>
        
        <div className="font-mono">
          {currentTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit'
          })}
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 flex items-center justify-center p-4 cursor-pointer"
        onClick={cycleViewMode}
      >
        {viewMode === 'next' && renderNextTaskView()}
        {viewMode === 'progress' && renderProgressView()}
        {viewMode === 'time' && renderTimeView()}
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center space-x-2 pb-3">
        {['next', 'progress', 'time'].map(mode => (
          <div
            key={mode}
            className={`w-2 h-2 rounded-full ${
              viewMode === mode ? 'bg-white' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Error indicator */}
      {error && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </div>
      )}
    </div>
  );
};

export default SmartWatchView;