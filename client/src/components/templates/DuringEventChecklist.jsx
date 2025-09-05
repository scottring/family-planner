import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Play, 
  Pause,
  RotateCcw,
  Save,
  AlertTriangle,
  Timer,
  Plus
} from 'lucide-react';

const DuringEventChecklist = ({ 
  tasks = [], 
  event,
  onTaskToggle,
  onAddNote,
  onComplete,
  className = ''
}) => {
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [taskNotes, setTaskNotes] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval = null;
    
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, startTime]);

  // Auto-advance to next incomplete task
  useEffect(() => {
    if (completedTasks.has(currentTaskIndex)) {
      const nextIncompleteIndex = tasks.findIndex((_, index) => 
        index > currentTaskIndex && !completedTasks.has(index)
      );
      
      if (nextIncompleteIndex !== -1) {
        setCurrentTaskIndex(nextIncompleteIndex);
      }
    }
  }, [completedTasks, currentTaskIndex, tasks]);

  const handleStart = () => {
    setStartTime(Date.now());
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setStartTime(null);
    setElapsedTime(0);
    setIsActive(false);
    setCompletedTasks(new Set());
    setTaskNotes({});
    setCurrentTaskIndex(0);
  };

  const handleTaskToggle = (taskIndex) => {
    const newCompleted = new Set(completedTasks);
    const wasCompleted = completedTasks.has(taskIndex);
    
    if (wasCompleted) {
      newCompleted.delete(taskIndex);
    } else {
      newCompleted.add(taskIndex);
    }
    
    setCompletedTasks(newCompleted);
    
    if (onTaskToggle) {
      onTaskToggle(taskIndex, !wasCompleted);
    }
  };

  const handleAddNote = (taskIndex, note) => {
    setTaskNotes(prev => ({
      ...prev,
      [taskIndex]: note
    }));
    
    if (onAddNote) {
      onAddNote(taskIndex, note);
    }
  };

  const handleComplete = () => {
    const completionData = {
      eventId: event?.id,
      completedTasks: Array.from(completedTasks),
      taskNotes,
      totalTime: elapsedTime,
      completionRate: completedTasks.size / tasks.length,
      completedAt: new Date().toISOString()
    };

    if (onComplete) {
      onComplete(completionData);
    }
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasks.size / tasks.length) * 100);
  };

  const getCurrentTask = () => {
    return tasks[currentTaskIndex];
  };

  const getTaskStatus = (index) => {
    if (completedTasks.has(index)) return 'completed';
    if (index === currentTaskIndex) return 'current';
    if (index < currentTaskIndex) return 'skipped';
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'current': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'skipped': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-white border-gray-200';
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 text-center ${className}`}>
        <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No during-event tasks available</p>
        <p className="text-sm text-gray-500 mt-1">Add tasks to track progress during the event</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header with Timer */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            Event Checklist
          </h3>
          <div className="flex items-center space-x-2">
            {!isActive && !startTime && (
              <button
                onClick={handleStart}
                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Start</span>
              </button>
            )}
            {isActive && (
              <button
                onClick={handlePause}
                className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 text-sm flex items-center space-x-1"
              >
                <Pause className="h-3 w-3" />
                <span>Pause</span>
              </button>
            )}
            {!isActive && startTime && (
              <button
                onClick={handleStart}
                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Resume</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 text-sm flex items-center space-x-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Timer and Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-gray-600" />
              <span className="text-lg font-mono text-gray-900">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Progress: {completedTasks.size}/{tasks.length} ({getProgressPercentage()}%)
            </div>
          </div>
          
          {completedTasks.size === tasks.length && (
            <button
              onClick={handleComplete}
              className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center space-x-1"
            >
              <Save className="h-3 w-3" />
              <span>Complete</span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Current Task Highlight */}
      {getCurrentTask() && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-900">Current Task</span>
          </div>
          <p className="text-blue-800 font-medium">{getCurrentTask().text || getCurrentTask().activity}</p>
          {getCurrentTask().notes && (
            <p className="text-sm text-blue-700 mt-1">{getCurrentTask().notes}</p>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="divide-y divide-gray-100">
        {tasks.map((task, index) => {
          const status = getTaskStatus(index);
          const isCompleted = completedTasks.has(index);
          const isCurrent = index === currentTaskIndex;
          
          return (
            <div
              key={index}
              className={`p-4 transition-all duration-200 ${getStatusColor(status)} ${
                isCurrent ? 'ring-2 ring-blue-300' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Checkbox */}
                <button
                  onClick={() => handleTaskToggle(index)}
                  className="mt-1 transition-colors duration-200"
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium ${
                      isCompleted ? 'line-through text-gray-500' : 
                      isCurrent ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {task.text || task.activity}
                    </h4>
                    
                    {task.timeEstimate && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {task.timeEstimate}m
                      </span>
                    )}
                  </div>

                  {task.notes && (
                    <p className="text-sm text-gray-600 mb-2">{task.notes}</p>
                  )}

                  {/* Task Notes Input */}
                  <div className="mt-2">
                    <input
                      type="text"
                      value={taskNotes[index] || ''}
                      onChange={(e) => handleAddNote(index, e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Add notes or observations..."
                    />
                  </div>

                  {/* Status Badge */}
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status === 'completed' ? 'bg-green-100 text-green-800' :
                      status === 'current' ? 'bg-blue-100 text-blue-800' :
                      status === 'skipped' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {status}
                    </span>
                    
                    {isCurrent && !isCompleted && (
                      <span className="text-xs text-blue-600 flex items-center">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-1 animate-pulse"></div>
                        In progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-gray-600">
            <span>{completedTasks.size} completed</span>
            <span>{tasks.length - completedTasks.size} remaining</span>
            {elapsedTime > 0 && (
              <span>Time: {formatTime(elapsedTime)}</span>
            )}
          </div>
          
          {completedTasks.size === tasks.length && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="font-medium">All tasks completed!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuringEventChecklist;