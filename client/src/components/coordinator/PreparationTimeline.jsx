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
  ChevronUp,
  Trash2,
  Star,
  X,
  RefreshCw,
  Edit2,
  LayoutTemplate
} from 'lucide-react';
import { eventContextService } from '../../services/eventContext';
import api from '../../services/api';
import PreparationCustomizer from './PreparationCustomizer';
import TemplateSelector from '../templates/TemplateSelector';
import LineItemTemplateSelector from '../templates/LineItemTemplateSelector';
import SmartTaskItem from '../timeline/SmartTaskItem';
import PersonAssignment from '../common/PersonAssignment';
import { useEventTemplateStore } from '../../stores/eventTemplateStore';
import { useAuthStore } from '../../stores/authStore';

const PreparationTimeline = ({ event, className = '', socket }) => {
  const { user } = useAuthStore();
  const templateStore = useEventTemplateStore();
  
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
  const [templateSuggestion, setTemplateSuggestion] = useState(null);
  const [usingTemplate, setUsingTemplate] = useState(false);
  const [templateApplied, setTemplateApplied] = useState(false);
  const [showReplaceOptions, setShowReplaceOptions] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [editingTaskData, setEditingTaskData] = useState(null);
  const [showTemplateSelectorForTask, setShowTemplateSelectorForTask] = useState(null);

  // Database integration functions
  const fetchTimelineFromDatabase = async () => {
    if (!event?.id) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/calendar/events/${event.id}/timeline`);
      
      if (response.status === 200) {
        const data = response.data;
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
        const response = await api.put(`/calendar/events/${event.id}/timeline`, updateData);
        
        if (response.status === 200) {
          const data = response.data;
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
        const response = await api.put(`/calendar/events/${event.id}/timeline`, update);
        
        if (response.status === 200) {
          const data = response.data;
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

  // Check for and apply event template
  const checkForTemplate = async () => {
    if (!event || !user || templateApplied) return;

    try {
      // Analyze event pattern
      const analysis = eventContextService.analyzeEventPattern(event);
      if (!analysis) return;

      const eventType = event.title?.toLowerCase() || 'generic';
      
      // Try to get existing template
      const template = await templateStore.getTemplateByType(
        eventType,
        analysis.patternName,
        70 // Min confidence threshold
      );

      if (template) {
        setTemplateSuggestion({
          template,
          confidence: template.confidence,
          usageCount: template.usage_count,
          lastUsed: template.last_used_at,
          reason: `Found template from ${template.usage_count} previous ${analysis.patternName} event${template.usage_count > 1 ? 's' : ''}`
        });

        // Auto-apply template if confidence is high
        if (template.confidence >= 85) {
          await applyTemplate(template);
          setUsingTemplate(true);
          setTemplateApplied(true);
        }
      } else {
        // Look for pattern-based suggestions
        const suggestion = await templateStore.suggestTemplate(event);
        if (suggestion) {
          setTemplateSuggestion(suggestion);
        }
      }
    } catch (error) {
      console.warn('Error checking for template:', error);
    }
  };

  const applyTemplate = async (template) => {
    try {
      setLoading(true);
      
      const preparationTimeline = Array.isArray(template.preparation_timeline)
        ? template.preparation_timeline
        : JSON.parse(template.preparation_timeline || '[]');

      // Convert template timeline to actual timeline with current event timing
      const eventTime = new Date(event.start_time);
      const currentTimeline = preparationTimeline.map(task => ({
        ...task,
        time: new Date(eventTime.getTime() - (task.minutesBefore || 60) * 60 * 1000),
        id: task.id || task.activity
      }));

      // Set as current timeline
      setCustomTimeline(currentTimeline);
      setTimelineData({
        timeline: currentTimeline,
        eventPattern: template.event_pattern,
        confidence: template.confidence,
        isCustom: true,
        templateId: template.id,
        templateUsageCount: template.usage_count
      });

      // Update template usage statistics
      if (template.id && !template.id.toString().startsWith('offline-')) {
        templateStore.updateUsageStats(template.id);
      }

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error applying template:', error);
      setError('Failed to apply template');
      setLoading(false);
      return false;
    }
  };

  // Save current timeline as template
  const saveAsTemplate = async (timeline, eventPattern) => {
    if (!event || !user || !timeline) return;

    try {
      const eventType = event.title?.toLowerCase() || 'generic';
      
      // Convert timeline to template format
      const templateTimeline = timeline.map(task => ({
        id: task.id || task.activity,
        activity: task.activity,
        type: task.type,
        minutesBefore: Math.round((new Date(event.start_time) - new Date(task.time)) / (60 * 1000)),
        duration: task.duration || 0,
        note: task.note,
        priority: task.priority || 5
      }));

      // Calculate completion rate from current session
      const completionRate = completedTasks.size / Math.max(timeline.length, 1);

      await templateStore.saveTemplate(
        eventType,
        eventPattern || 'custom',
        templateTimeline,
        [], // Post-event timeline will be handled separately
        {
          confidence: 85, // High confidence for user-created templates
          completionRate
        }
      );

      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      return false;
    }
  };

  // Fetch timeline from database on mount
  useEffect(() => {
    if (event?.id) {
      fetchTimelineFromDatabase();
      checkForTemplate();
    }
  }, [event?.id]);

  // Submit learning data when event is near or complete
  useEffect(() => {
    const submitLearningData = async () => {
      if (!event || !usingTemplate || !timelineData?.templateId) return;
      
      const eventTime = new Date(event.start_time);
      const now = new Date();
      const minutesUntilEvent = (eventTime - now) / (60 * 1000);
      
      // Submit learning data when event starts or after completion
      if (minutesUntilEvent <= 0) {
        try {
          const taskActions = JSON.parse(localStorage.getItem(`task-actions-${event.id}`) || '[]');
          
          if (taskActions.length > 0) {
            const analysis = eventContextService.analyzeEventPattern(event);
            const eventType = event.title?.toLowerCase() || 'generic';
            const eventPattern = analysis?.patternName || 'custom';
            
            await templateStore.learnFromUserActions(
              event.id,
              eventType,
              eventPattern,
              taskActions
            );
            
            // Clear the stored actions
            localStorage.removeItem(`task-actions-${event.id}`);
          }
        } catch (error) {
          console.warn('Failed to submit learning data:', error);
        }
      }
    };
    
    // Check learning data submission every minute
    const learningInterval = setInterval(submitLearningData, 60000);
    submitLearningData(); // Check immediately
    
    return () => clearInterval(learningInterval);
  }, [event, usingTemplate, timelineData, templateStore]);

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

  const handleSmartTaskUpdate = async (updatedTask) => {
    // Handle updates from SmartTaskItem components
    // Find the task in the timeline and update it
    const taskIndex = timeline.findIndex(task => 
      task.id === updatedTask.id || `task-${timeline.indexOf(task)}` === updatedTask.id
    );
    
    if (taskIndex !== -1) {
      const updatedTimeline = [...timeline];
      updatedTimeline[taskIndex] = {
        ...updatedTimeline[taskIndex],
        templateData: updatedTask.templateData,
        // Update other fields as needed
      };
      
      // Save to database
      await saveTimelineToDatabase(updatedTimeline, Array.from(completedTasks), currentTimelineData?.isCustom || false);
      
      // Update local state if needed
      setCustomTimeline(updatedTimeline);
      setTimelineData(prev => ({
        ...prev,
        timeline: updatedTimeline
      }));
    }
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
    
    // Record learning data for template improvement
    if (usingTemplate && timelineData?.templateId) {
      const task = timeline[index];
      const action = wasCompleted ? 'uncompleted' : 'completed';
      
      // Record the action for learning
      const taskAction = {
        taskId: task.id || task.activity,
        action,
        timing: Math.round((new Date() - new Date(task.time)) / (60 * 1000)), // Minutes from scheduled time
        taskType: task.type,
        originalMinutesBefore: task.minutesBefore || 60
      };

      // Store for batch learning update
      const existingActions = JSON.parse(localStorage.getItem(`task-actions-${event.id}`) || '[]');
      existingActions.push(taskAction);
      localStorage.setItem(`task-actions-${event.id}`, JSON.stringify(existingActions));
    }
    
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

  const handleDeleteTask = (taskIndex) => {
    const newTimeline = timeline.filter((_, index) => index !== taskIndex);
    
    // Update completed tasks indices
    const newCompleted = new Set();
    completedTasks.forEach(idx => {
      if (idx < taskIndex) {
        newCompleted.add(idx);
      } else if (idx > taskIndex) {
        newCompleted.add(idx - 1);
      }
    });
    setCompletedTasks(newCompleted);
    
    // Update timeline
    setCustomTimeline(newTimeline);
    setTimelineData(prev => ({
      ...prev,
      timeline: newTimeline,
      isCustom: true
    }));
    
    // Save to database
    saveTimelineToDatabase(newTimeline, Array.from(newCompleted), true);
    
    // Emit WebSocket event for real-time sync
    if (socket) {
      socket.emit('timeline-customized', {
        eventId: event.id,
        customTimeline: newTimeline,
        isCustom: true
      });
    }
  };

  const handleEditTask = (index) => {
    const task = timeline[index];
    setEditingTaskIndex(index);
    setEditingTaskData({
      activity: task.activity,
      note: task.note || '',
      time: task.time,
      duration: task.duration || 0,
      type: task.type
    });
  };

  const handleSaveEditTask = async () => {
    if (editingTaskIndex === null || !editingTaskData) return;
    
    const updatedTimeline = [...timeline];
    updatedTimeline[editingTaskIndex] = {
      ...updatedTimeline[editingTaskIndex],
      ...editingTaskData
    };
    
    setCustomTimeline(updatedTimeline);
    setEditingTaskIndex(null);
    setEditingTaskData(null);
    
    // Save to database
    await saveTimelineToDatabase(updatedTimeline, Array.from(completedTasks), true);
  };

  const handleAddTemplateToTask = async (index, template) => {
    // Prevent duplicate additions
    if (timeline[index].templateType) {
      console.warn('Task already has a template');
      return;
    }
    
    const updatedTimeline = [...timeline];
    updatedTimeline[index] = {
      ...updatedTimeline[index],
      templateType: template.type || 'driving',
      templateData: template.templateData || {}
    };
    
    setCustomTimeline(updatedTimeline);
    setShowTemplateSelectorForTask(null);
    
    // Save to database
    await saveTimelineToDatabase(updatedTimeline, Array.from(completedTasks), true);
  };

  const handleSaveCustomTimeline = async (newTimeline) => {
    setCustomTimeline(newTimeline);
    setShowCustomizer(false);
    
    // Save to database
    const completedTasksArray = Array.from(completedTasks);
    await saveTimelineToDatabase(newTimeline, completedTasksArray, true);
    
    // Save as template for future use
    try {
      const analysis = eventContextService.analyzeEventPattern(event);
      const eventPattern = analysis?.patternName || 'custom';
      
      const success = await saveAsTemplate(newTimeline, eventPattern);
      if (success) {
        setUsingTemplate(true);
        setTemplateSuggestion({
          template: {
            event_type: event.title?.toLowerCase() || 'generic',
            event_pattern: eventPattern,
            confidence: 85
          },
          reason: 'Saved as template for future events'
        });
      }
    } catch (error) {
      console.warn('Failed to save timeline as template:', error);
    }
    
    // Emit WebSocket event for real-time sync
    if (socket) {
      socket.emit('timeline-customized', {
        eventId: event.id,
        customTimeline: newTimeline,
        isCustom: true
      });
    }
  };

  const handleRemoveTimeline = () => {
    if (window.confirm('Are you sure you want to remove this preparation timeline?')) {
      // Clear timeline data from localStorage
      localStorage.removeItem(`event-timeline-${event.id}`);
      localStorage.removeItem(`event-${event.id}-preparation`);
      localStorage.removeItem(`task-actions-${event.id}`);
      
      // Clear state
      setCustomTimeline(null);
      setTimelineData(null);
      setCompletedTasks(new Set());
      setUsingTemplate(false);
      setTemplateApplied(false);
      
      // Mark event as not AI enriched if removing both timelines
      const postEventData = localStorage.getItem(`event-${event.id}-postEvent`);
      if (!postEventData) {
        event.ai_enriched = false;
      }
      
      // Trigger parent re-render if update function provided
      if (event.onUpdate) {
        event.onUpdate({ ...event, ai_enriched: false });
      }
    }
  };

  const handleReplaceTimeline = () => {
    setShowReplaceOptions(true);
  };

  const handleTemplateSelect = async (template) => {
    if (template) {
      await applyTemplate(template);
      setUsingTemplate(true);
      setTemplateApplied(true);
    }
    setShowReplaceOptions(false);
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
                <div className="flex flex-col space-y-1">
                  <p className="text-sm text-indigo-600">
                    {eventPattern === 'custom' ? 'Customized timeline' :
                     eventPattern !== 'general' ? (
                      <>
                        {eventPattern} event • {confidence}% confidence
                      </>
                    ) : 'General event preparation'}
                  </p>
                  {usingTemplate && timelineData?.templateUsageCount && (
                    <p className="text-xs text-green-600 font-medium">
                      Using saved template ({timelineData.templateUsageCount} previous uses)
                    </p>
                  )}
                </div>
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
              {/* Remove/Replace Buttons */}
              <button
                onClick={handleReplaceTimeline}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Replace with Different Template"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleRemoveTimeline}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove Entire Timeline"
              >
                <X className="h-4 w-4" />
              </button>
              
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

      {/* Template Suggestion Banner */}
      {templateSuggestion && !usingTemplate && !isCollapsed && (
        <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-blue-100 rounded">
                <Star className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Smart Template Available</h4>
                <p className="text-xs text-blue-700 mt-1">
                  {templateSuggestion.reason} • {templateSuggestion.confidence}% confidence
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTemplateSuggestion(null)}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
              >
                Dismiss
              </button>
              <button
                onClick={async () => {
                  const success = await applyTemplate(templateSuggestion.template);
                  if (success) {
                    setUsingTemplate(true);
                    setTemplateSuggestion(null);
                  }
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline - Collapsible */}
      {!isCollapsed && (
        <div className="p-6">
          <div className="space-y-4">
          {timeline.map((task, index) => {
            const isCompleted = completedTasks.has(index);
            const isCurrent = isTaskCurrent(task.time, task.duration);
            const isOverdue = isTaskOverdue(task.time);
            const timeUntil = formatTimeUntil(task.time);
            
            // Check if this task has a templateType and should use SmartTaskItem
            if (task.templateType) {
              // Convert task to SmartTaskItem format
              const smartTask = {
                id: task.id || `task-${index}`,
                title: task.activity,
                description: task.note || '',
                dueDate: task.time,
                completed: isCompleted,
                templateType: task.templateType,
                templateData: task.templateData || {},
                priority: task.priority || 'medium',
                type: task.type,
                assignedTo: task.assignedTo || null
              };
              
              return (
                <div key={index} className="relative">
                  <SmartTaskItem 
                    task={smartTask}
                    onEdit={handleSmartTaskUpdate}
                    event={event}
                  />
                </div>
              );
            }
            
            // Regular task rendering for tasks without templateType
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
                        <PersonAssignment
                          value={task.assignedTo}
                          onChange={(assigneeId) => {
                            const updatedTimeline = [...timeline];
                            updatedTimeline[index] = {
                              ...updatedTimeline[index],
                              assignedTo: assigneeId
                            };
                            setCustomTimeline(updatedTimeline);
                            saveTimelineToDatabase(updatedTimeline, Array.from(completedTasks), true);
                          }}
                          compact={true}
                        />
                        <button
                          onClick={() => setShowTemplateSelectorForTask(index)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          title="Add template"
                        >
                          <LayoutTemplate className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditTask(index)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          title="Edit task"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(index)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
    
    {/* Edit Task Modal */}
    {editingTaskIndex !== null && editingTaskData && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Task</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
              <input
                type="text"
                value={editingTaskData.activity}
                onChange={(e) => setEditingTaskData({...editingTaskData, activity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                value={editingTaskData.note}
                onChange={(e) => setEditingTaskData({...editingTaskData, note: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={editingTaskData.duration}
                onChange={(e) => setEditingTaskData({...editingTaskData, duration: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <PersonAssignment
                value={editingTaskData.assignedTo}
                onChange={(assigneeId) => setEditingTaskData({...editingTaskData, assignedTo: assigneeId})}
                showLabel={true}
                label="Assigned to"
                placeholder="Select person..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {setEditingTaskIndex(null); setEditingTaskData(null);}}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEditTask}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Line Item Template Selector Modal for Task */}
    {showTemplateSelectorForTask !== null && (
      <LineItemTemplateSelector
        onSelect={(template) => {
          // Using onSelect to add line item template
          const taskIndex = showTemplateSelectorForTask;
          setShowTemplateSelectorForTask(null); // Clear immediately
          if (template) {
            handleAddTemplateToTask(taskIndex, template);
          }
        }}
        onClose={() => setShowTemplateSelectorForTask(null)}
      />
    )}
    
    {/* Template Selector Modal */}
    {showReplaceOptions && (
      <TemplateSelector
        event={event}
        onSelectTemplate={handleTemplateSelect}
        onClose={() => setShowReplaceOptions(false)}
        mode="preparation"
      />
    )}
    </>
  );
};

export default PreparationTimeline;