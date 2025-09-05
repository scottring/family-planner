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
  Maximize,
  Minimize,
  Wifi,
  WifiOff,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { eventContextService } from '../../services/eventContext';

const TabletDashboard = ({ event, className = '', socket }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastNotification, setLastNotification] = useState(null);
  const dashboardRef = useRef(null);
  const audioContext = useRef(null);

  // Kitchen-friendly large text and spacing
  const textSizes = {
    header: 'text-3xl',
    taskTitle: 'text-xl',
    taskTime: 'text-lg',
    status: 'text-base',
    small: 'text-sm'
  };

  // Sound notification system
  const playNotificationSound = (frequency = 800, duration = 200) => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const oscillator = audioContext.current.createOscillator();
      const gainNode = audioContext.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.current.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration / 1000);
      
      oscillator.start(audioContext.current.currentTime);
      oscillator.stop(audioContext.current.currentTime + duration / 1000);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Fullscreen management
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        if (dashboardRef.current.requestFullscreen) {
          await dashboardRef.current.requestFullscreen();
        } else if (dashboardRef.current.webkitRequestFullscreen) {
          await dashboardRef.current.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  };

  // Database integration functions (same as original)
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

  // Auto-refresh timer (more frequent for kitchen use)
  useEffect(() => {
    if (!autoRefresh) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Check for task notifications
      if (timeline) {
        const now = new Date();
        const upcomingTask = timeline.find(task => {
          const taskTime = new Date(task.time);
          const timeDiff = taskTime - now;
          return timeDiff > 0 && timeDiff <= 60000; // 1 minute warning
        });
        
        if (upcomingTask && lastNotification !== upcomingTask.activity) {
          playNotificationSound(1000, 300);
          setLastNotification(upcomingTask.activity);
        }
      }
    }, 15000); // Update every 15 seconds for kitchen use

    return () => clearInterval(timer);
  }, [autoRefresh, timeline, lastNotification]);

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

  // Fetch timeline from database on mount
  useEffect(() => {
    if (event?.id) {
      fetchTimelineFromDatabase();
    }
  }, [event?.id]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
        playNotificationSound(600, 100); // Subtle sync notification
      }
    };

    const handleTaskCompletionUpdate = (data) => {
      if (data.eventId === event.id && data.updatedBy !== socket.id) {
        setCompletedTasks(prev => {
          const newCompleted = new Set(prev);
          if (data.completed) {
            newCompleted.add(data.taskIndex);
            playNotificationSound(800, 150); // Task completed sound
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className={`text-gray-500 mt-6 ${textSizes.status}`}>Loading timeline...</p>
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

  const isTaskUpcoming = (taskTime) => {
    const timeDiff = new Date(taskTime) - currentTime;
    return timeDiff > 0 && timeDiff <= 15 * 60 * 1000; // Within 15 minutes
  };

  const getTaskIcon = (type, isCompleted, isCurrent, size = 'h-8 w-8') => {
    const iconClass = `${size} ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'}`;
    
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
    
    if (minutesUntil <= 0) return 'border-red-500 bg-red-100 shadow-lg';
    if (minutesUntil <= 5) return 'border-orange-500 bg-orange-100 shadow-lg';
    if (minutesUntil <= 15) return 'border-yellow-500 bg-yellow-100 shadow-md';
    return 'border-gray-300 bg-white shadow';
  };

  const toggleTaskComplete = async (index) => {
    const wasCompleted = completedTasks.has(index);
    const newCompleted = new Set(completedTasks);
    
    if (wasCompleted) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
      playNotificationSound(900, 200); // Success sound
    }
    
    setCompletedTasks(newCompleted);
    
    const completedTasksArray = Array.from(newCompleted);
    await saveTimelineToDatabase(timeline, completedTasksArray, currentTimelineData?.isCustom || false);
  };

  const getNextTasks = (count = 3) => {
    return timeline
      .map((task, index) => ({ ...task, originalIndex: index }))
      .filter(task => !completedTasks.has(task.originalIndex) && task.type !== 'event_start')
      .slice(0, count);
  };

  const nextTasks = getNextTasks(3);
  const currentTask = timeline.find((task, index) => 
    !completedTasks.has(index) && isTaskCurrent(task.time, task.duration)
  );

  return (
    <div 
      ref={dashboardRef}
      className={`bg-gradient-to-br from-indigo-50 to-white min-h-screen ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-2xl shadow-xl border border-gray-200'} ${className}`}
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Timer className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${textSizes.header}`}>Kitchen Timeline</h1>
            <p className={`text-indigo-600 ${textSizes.status}`}>
              {event.title} • {formatTime(new Date(event.start_time))}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-6 w-6 text-green-600" />
            ) : (
              <WifiOff className="h-6 w-6 text-red-600" />
            )}
            {pendingUpdates.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                {pendingUpdates.length} pending
              </span>
            )}
          </div>

          {/* Controls */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-xl transition-colors ${
              soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-3 rounded-xl transition-colors ${
              autoRefresh ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {autoRefresh ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
          >
            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Current Time Display */}
      <div className="text-center py-8 bg-white/50">
        <div className={`font-mono ${isFullscreen ? 'text-6xl' : 'text-4xl'} font-bold text-gray-900 mb-2`}>
          {currentTime.toLocaleTimeString([], { 
            hour: 'numeric', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
          })}
        </div>
        <div className={`text-gray-600 ${textSizes.status}`}>
          Event starts in {formatTimeUntil(event.start_time)}
        </div>
      </div>

      {/* Current Task Highlight */}
      {currentTask && (
        <div className="mx-6 mb-8 p-6 bg-blue-500 text-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                {getTaskIcon(currentTask.type, false, true, 'h-10 w-10')}
              </div>
              <div>
                <h2 className={`font-bold mb-2 ${isFullscreen ? 'text-3xl' : 'text-2xl'}`}>
                  CURRENT: {currentTask.activity}
                </h2>
                <p className={`opacity-90 ${textSizes.status}`}>
                  Started at {formatTime(new Date(currentTask.time))}
                  {currentTask.duration > 0 && ` • ${currentTask.duration} minutes`}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleTaskComplete(timeline.indexOf(currentTask))}
              className={`p-4 bg-white/20 rounded-xl hover:bg-white/30 transition-colors ${
                isFullscreen ? 'scale-125' : ''
              }`}
            >
              <CheckCircle className="h-12 w-12" />
            </button>
          </div>
        </div>
      )}

      {/* Next Tasks */}
      <div className="px-6 pb-6">
        <h3 className={`font-bold text-gray-900 mb-6 ${textSizes.taskTitle}`}>
          Coming Up
        </h3>
        <div className={`grid gap-4 ${isFullscreen ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {nextTasks.map((task, index) => {
            const isCompleted = completedTasks.has(task.originalIndex);
            const isCurrent = isTaskCurrent(task.time, task.duration);
            const isOverdue = isTaskOverdue(task.time);
            const isUpcoming = isTaskUpcoming(task.time);
            const timeUntil = formatTimeUntil(task.time);
            
            return (
              <div
                key={task.originalIndex}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 ${getUrgencyClass(task.time)} ${
                  isUpcoming ? 'ring-4 ring-yellow-300' : ''
                } ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getTaskIcon(task.type, isCompleted, isCurrent)}
                    <div>
                      <h4 className={`font-semibold mb-1 ${
                        isCompleted ? 'line-through text-gray-500' : 
                        isCurrent ? 'text-blue-900' :
                        isOverdue ? 'text-red-900' :
                        'text-gray-900'
                      } ${textSizes.taskTitle}`}>
                        {task.activity}
                      </h4>
                      <div className={`space-y-1 ${textSizes.status}`}>
                        <div className={`font-medium ${
                          isOverdue && !isCompleted ? 'text-red-600' :
                          isCurrent ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {formatTime(new Date(task.time))}
                        </div>
                        <div className={`${
                          timeUntil === 'Now' || isOverdue ? 'text-red-600 font-bold' :
                          isUpcoming ? 'text-yellow-600 font-bold' :
                          isCurrent ? 'text-blue-600 font-bold' :
                          'text-gray-600'
                        }`}>
                          {timeUntil === 'Now' ? 'NOW' : 
                           isOverdue ? 'OVERDUE' :
                           `in ${timeUntil}`}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleTaskComplete(task.originalIndex)}
                    className="p-3 transition-colors duration-200 rounded-xl hover:bg-gray-100 active:bg-gray-200"
                    disabled={task.type === 'event_start'}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <Circle className="h-8 w-8 text-gray-400" />
                    )}
                  </button>
                </div>

                {task.note && (
                  <p className={`text-gray-600 italic ${textSizes.small}`}>
                    {task.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className={`font-bold text-gray-900 ${textSizes.taskTitle}`}>
              Progress: {completedTasks.size}/{timeline.filter(t => t.type !== 'event_start').length}
            </span>
            <span className={`text-gray-600 ${textSizes.status}`}>
              {Math.round((completedTasks.size / Math.max(timeline.filter(t => t.type !== 'event_start').length, 1)) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500"
              style={{
                width: `${(completedTasks.size / Math.max(timeline.filter(t => t.type !== 'event_start').length, 1)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabletDashboard;