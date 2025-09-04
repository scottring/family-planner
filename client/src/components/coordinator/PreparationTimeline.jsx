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
  Shirt
} from 'lucide-react';
import { eventContextService } from '../../services/eventContext';

const PreparationTimeline = ({ event, className = '' }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [completedTasks, setCompletedTasks] = useState(new Set());

  // Update time every 30 seconds for more precise countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  if (!event || !event.start_time) return null;

  const timelineData = eventContextService.generatePreparationTimeline(event);
  
  if (!timelineData) return null;

  const { timeline, eventPattern, confidence } = timelineData;

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

  const toggleTaskComplete = (index) => {
    const newCompleted = new Set(completedTasks);
    if (completedTasks.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedTasks(newCompleted);
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

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Timer className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Preparation Timeline</h3>
              <p className="text-sm text-indigo-600">
                {eventPattern !== 'general' && (
                  <>
                    {eventPattern} event • {confidence}% confidence
                  </>
                )}
                {eventPattern === 'general' && 'General event preparation'}
              </p>
            </div>
          </div>
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

      {/* Timeline */}
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
    </div>
  );
};

export default PreparationTimeline;