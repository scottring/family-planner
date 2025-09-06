import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  FileText,
  Heart,
  Camera,
  DollarSign,
  UserCheck,
  MessageSquare,
  Archive,
  Star,
  CheckCircle,
  Circle,
  Trash2,
  X,
  RefreshCw
} from 'lucide-react';
import { useEventTemplateStore } from '../../stores/eventTemplateStore';
import { useAuthStore } from '../../stores/authStore';
import { eventContextService } from '../../services/eventContext';
import TemplateSelector from '../templates/TemplateSelector';
import SmartTaskItem from '../timeline/SmartTaskItem';

const PostEventTimeline = ({ event, className = '', socket }) => {
  const { user } = useAuthStore();
  const templateStore = useEventTemplateStore();
  
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [templateSuggestion, setTemplateSuggestion] = useState(null);
  const [usingTemplate, setUsingTemplate] = useState(false);
  const [customTasks, setCustomTasks] = useState([]);
  const [showReplaceOptions, setShowReplaceOptions] = useState(false);
  
  if (!event) return null;

  // Generate post-event tasks based on event type
  const generatePostEventTasks = () => {
    const tasks = [];
    const eventType = event.category?.toLowerCase() || event.type?.toLowerCase() || '';
    const currentTime = new Date();
    const eventEndTime = new Date(event.end_time || event.start_time);
    
    // Common follow-up tasks for all events
    tasks.push({
      id: 'document',
      title: 'Document event notes',
      time: new Date(eventEndTime.getTime() + 30 * 60000), // 30 min after
      icon: FileText,
      color: 'blue',
      description: 'Record important details, outcomes, and observations'
    });

    // Event-type specific tasks
    if (eventType.includes('medical') || eventType.includes('doctor') || eventType.includes('health')) {
      tasks.push({
        id: 'follow-up-apt',
        title: 'Schedule follow-up appointment',
        time: new Date(eventEndTime.getTime() + 60 * 60000), // 1 hour after
        icon: Calendar,
        color: 'purple',
        description: 'Book any recommended follow-up visits'
      });
      tasks.push({
        id: 'pharmacy',
        title: 'Fill prescriptions',
        time: new Date(eventEndTime.getTime() + 2 * 60 * 60000), // 2 hours after
        icon: Heart,
        color: 'red',
        description: 'Pick up any prescribed medications'
      });
      tasks.push({
        id: 'insurance',
        title: 'Submit insurance claims',
        time: new Date(eventEndTime.getTime() + 24 * 60 * 60000), // Next day
        icon: DollarSign,
        color: 'green',
        description: 'File any necessary insurance paperwork'
      });
    }
    
    if (eventType.includes('school') || eventType.includes('education') || eventType.includes('class')) {
      tasks.push({
        id: 'homework',
        title: 'Review homework assignments',
        time: new Date(eventEndTime.getTime() + 30 * 60000),
        icon: FileText,
        color: 'indigo',
        description: 'Check for any new assignments or projects'
      });
      tasks.push({
        id: 'materials',
        title: 'Prepare tomorrow\'s materials',
        time: new Date(eventEndTime.getTime() + 4 * 60 * 60000), // 4 hours after
        icon: Archive,
        color: 'yellow',
        description: 'Pack backpack for next school day'
      });
    }
    
    if (eventType.includes('sport') || eventType.includes('game') || eventType.includes('practice')) {
      tasks.push({
        id: 'gear-clean',
        title: 'Clean and store gear',
        time: new Date(eventEndTime.getTime() + 60 * 60000),
        icon: Archive,
        color: 'orange',
        description: 'Wash uniforms, clean equipment'
      });
      tasks.push({
        id: 'photos',
        title: 'Share event photos',
        time: new Date(eventEndTime.getTime() + 2 * 60 * 60000),
        icon: Camera,
        color: 'pink',
        description: 'Upload photos to family album'
      });
      tasks.push({
        id: 'next-game',
        title: 'Confirm next game/practice',
        time: new Date(eventEndTime.getTime() + 3 * 60 * 60000),
        icon: Calendar,
        color: 'teal',
        description: 'Check schedule for upcoming events'
      });
    }
    
    if (eventType.includes('social') || eventType.includes('party') || eventType.includes('birthday')) {
      tasks.push({
        id: 'thank-you',
        title: 'Send thank you messages',
        time: new Date(eventEndTime.getTime() + 24 * 60 * 60000), // Next day
        icon: MessageSquare,
        color: 'purple',
        description: 'Thank hosts or guests'
      });
      tasks.push({
        id: 'photos-social',
        title: 'Share event photos',
        time: new Date(eventEndTime.getTime() + 2 * 60 * 60000),
        icon: Camera,
        color: 'pink',
        description: 'Share photos with attendees'
      });
    }
    
    if (eventType.includes('work') || eventType.includes('meeting') || eventType.includes('conference')) {
      tasks.push({
        id: 'action-items',
        title: 'Complete action items',
        time: new Date(eventEndTime.getTime() + 60 * 60000),
        icon: CheckCircle2,
        color: 'green',
        description: 'Follow up on meeting commitments'
      });
      tasks.push({
        id: 'expenses',
        title: 'Submit expense reports',
        time: new Date(eventEndTime.getTime() + 48 * 60 * 60000), // 2 days
        icon: DollarSign,
        color: 'emerald',
        description: 'File any reimbursable expenses'
      });
    }

    // Add general wrap-up task
    tasks.push({
      id: 'archive',
      title: 'Archive event materials',
      time: new Date(eventEndTime.getTime() + 72 * 60 * 60000), // 3 days after
      icon: Archive,
      color: 'gray',
      description: 'File documents and clean up event items'
    });

    // Sort tasks by time
    return tasks.sort((a, b) => a.time - b.time);
  };

  // Check for post-event template on mount
  useEffect(() => {
    const checkForPostEventTemplate = async () => {
      if (!event || !user) return;

      try {
        const analysis = eventContextService.analyzeEventPattern(event);
        if (!analysis) return;

        const eventType = event.title?.toLowerCase() || 'generic';
        
        // Try to get existing post-event template
        const template = await templateStore.getTemplateByType(
          eventType,
          analysis.patternName,
          70
        );

        if (template && template.post_event_timeline) {
          const postEventTasks = Array.isArray(template.post_event_timeline)
            ? template.post_event_timeline
            : JSON.parse(template.post_event_timeline || '[]');

          if (postEventTasks.length > 0) {
            setTemplateSuggestion({
              template,
              confidence: template.confidence,
              usageCount: template.usage_count,
              reason: `Found post-event template from ${template.usage_count} previous ${analysis.patternName} event${template.usage_count > 1 ? 's' : ''}`
            });

            // Auto-apply if high confidence
            if (template.confidence >= 85) {
              setCustomTasks(postEventTasks);
              setUsingTemplate(true);
            }
          }
        }
      } catch (error) {
        console.warn('Error checking for post-event template:', error);
      }
    };

    checkForPostEventTemplate();
  }, [event, user, templateStore]);

  // Save post-event timeline as template
  const saveAsPostEventTemplate = async (tasks) => {
    if (!event || !user || !tasks.length) return;

    try {
      const analysis = eventContextService.analyzeEventPattern(event);
      const eventType = event.title?.toLowerCase() || 'generic';
      const eventPattern = analysis?.patternName || 'custom';

      // Convert tasks to template format
      const templateTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        icon: task.icon.name,
        color: task.color,
        hoursAfter: Math.round((new Date(task.time) - new Date(event.end_time || event.start_time)) / (60 * 60 * 1000))
      }));

      // Get existing template and update just the post-event timeline
      const existingTemplate = await templateStore.getTemplateByType(eventType, eventPattern, 0);
      
      const preparationTimeline = existingTemplate 
        ? (Array.isArray(existingTemplate.preparation_timeline) 
           ? existingTemplate.preparation_timeline 
           : JSON.parse(existingTemplate.preparation_timeline || '[]'))
        : [];

      await templateStore.saveTemplate(
        eventType,
        eventPattern,
        preparationTimeline,
        templateTasks,
        {
          confidence: 85,
          completionRate: completedTasks.size / Math.max(tasks.length, 1)
        }
      );

      return true;
    } catch (error) {
      console.error('Error saving post-event template:', error);
      return false;
    }
  };

  const handleDeleteTask = (taskId) => {
    // Remove task from the list
    const newTasks = tasks.filter(task => task.id !== taskId);
    
    // Remove from completed tasks if it was completed
    const newCompleted = new Set(completedTasks);
    newCompleted.delete(taskId);
    setCompletedTasks(newCompleted);
    
    // Update custom tasks or generated tasks
    if (customTasks.length > 0) {
      setCustomTasks(newTasks);
    } else {
      // For generated tasks, we need to save the removal
      localStorage.setItem(`post-event-removed-${event.id}`, JSON.stringify(
        [...(JSON.parse(localStorage.getItem(`post-event-removed-${event.id}`) || '[]')), taskId]
      ));
    }
    
    // Save updated completion state
    localStorage.setItem(`post-event-${event.id}`, JSON.stringify(Array.from(newCompleted)));
  };

  const handleSmartTaskUpdate = (updatedTask) => {
    // Handle updates from SmartTaskItem components
    // Update the task in the customTasks array if it exists
    if (customTasks.length > 0) {
      const updatedCustomTasks = customTasks.map(task =>
        task.id === updatedTask.id
          ? { ...task, templateData: updatedTask.templateData }
          : task
      );
      setCustomTasks(updatedCustomTasks);
    }
    // For generated tasks, we would need to handle differently if needed
  };

  const toggleTaskComplete = (taskId) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);

    // Save completion state to localStorage
    localStorage.setItem(`post-event-${event.id}`, JSON.stringify(Array.from(newCompleted)));
  };

  // Load completion state from localStorage
  useEffect(() => {
    const savedCompleted = localStorage.getItem(`post-event-${event.id}`);
    if (savedCompleted) {
      try {
        setCompletedTasks(new Set(JSON.parse(savedCompleted)));
      } catch (error) {
        console.warn('Failed to load saved completion state:', error);
      }
    }
  }, [event.id]);

  // Filter out removed tasks
  const removedTaskIds = JSON.parse(localStorage.getItem(`post-event-removed-${event.id}`) || '[]');
  const generatedTasks = generatePostEventTasks().filter(task => !removedTaskIds.includes(task.id));
  const tasks = customTasks.length > 0 ? customTasks : generatedTasks;

  const handleRemoveTimeline = () => {
    if (window.confirm('Are you sure you want to remove this post-event follow-up timeline?')) {
      // Clear timeline data from localStorage
      localStorage.removeItem(`post-event-${event.id}`);
      localStorage.removeItem(`post-event-removed-${event.id}`);
      localStorage.removeItem(`event-${event.id}-postEvent`);
      
      // Clear state
      setCustomTasks([]);
      setCompletedTasks(new Set());
      setUsingTemplate(false);
      
      // Mark event as not AI enriched if removing both timelines
      const preparationData = localStorage.getItem(`event-${event.id}-preparation`);
      if (!preparationData) {
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
    if (template && template.post_event_timeline) {
      const postEventTasks = Array.isArray(template.post_event_timeline)
        ? template.post_event_timeline
        : JSON.parse(template.post_event_timeline || '[]');
      
      // Convert template tasks to actual tasks with proper timing
      const eventEndTime = new Date(event.end_time || event.start_time);
      const convertedTasks = postEventTasks.map(task => ({
        ...task,
        time: new Date(eventEndTime.getTime() + (task.hoursAfter || 1) * 60 * 60 * 1000),
        icon: getIconFromName(task.icon || 'FileText')
      }));
      
      setCustomTasks(convertedTasks);
      setUsingTemplate(true);
      
      // Clear any removed tasks since we're using a new template
      localStorage.removeItem(`post-event-removed-${event.id}`);
    }
    setShowReplaceOptions(false);
  };

  const getIconFromName = (iconName) => {
    const icons = {
      FileText, Calendar, Heart, Camera, DollarSign,
      UserCheck, MessageSquare, Archive, Star, CheckCircle2
    };
    return icons[iconName] || FileText;
  };

  const formatTime = (date) => {
    const now = new Date();
    const taskTime = new Date(date);
    const diffMs = taskTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMs > 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `In ${diffMinutes} min`;
    } else {
      return 'Complete';
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      teal: 'bg-teal-100 text-teal-800 border-teal-300',
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 hover:from-purple-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-900">Post-Event Follow-up</h3>
              <div className="flex flex-col space-y-1">
                <p className="text-sm text-gray-600">
                  {tasks.length} follow-up task{tasks.length !== 1 ? 's' : ''} after event
                </p>
                {usingTemplate && (
                  <p className="text-xs text-green-600 font-medium">
                    Using saved post-event template
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isCollapsed && (
              <>
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
              </>
            )}
            <span className="text-sm font-medium text-gray-500">
              {isCollapsed ? 'Show' : 'Hide'} timeline
            </span>
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* Template Suggestion Banner */}
      {templateSuggestion && !usingTemplate && !isCollapsed && (
        <div className="px-6 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-purple-100 rounded">
                <Star className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-purple-900">Smart Post-Event Template Available</h4>
                <p className="text-xs text-purple-700 mt-1">
                  {templateSuggestion.reason} • {templateSuggestion.confidence}% confidence
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTemplateSuggestion(null)}
                className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  const postEventTasks = Array.isArray(templateSuggestion.template.post_event_timeline)
                    ? templateSuggestion.template.post_event_timeline
                    : JSON.parse(templateSuggestion.template.post_event_timeline || '[]');
                  setCustomTasks(postEventTasks);
                  setUsingTemplate(true);
                  setTemplateSuggestion(null);
                }}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 transition-colors"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="p-6">
          <div className="space-y-4">
            {tasks.map((task, index) => {
              const Icon = task.icon;
              const colorClasses = getColorClasses(task.color);
              
              // Check if this task has a templateType and should use SmartTaskItem
              if (task.templateType) {
                // Convert task to SmartTaskItem format
                const smartTask = {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  dueDate: task.time,
                  completed: completedTasks.has(task.id),
                  templateType: task.templateType,
                  templateData: task.templateData || {},
                  priority: task.priority || 'medium',
                  type: task.type || 'follow-up'
                };
                
                return (
                  <div key={task.id} className="relative">
                    {/* Connection line */}
                    {index < tasks.length - 1 && (
                      <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200" />
                    )}
                    <SmartTaskItem 
                      task={smartTask}
                      onEdit={handleSmartTaskUpdate}
                    />
                  </div>
                );
              }
              
              // Regular task rendering for tasks without templateType
              return (
                <div key={task.id} className="relative">
                  {/* Connection line */}
                  {index < tasks.length - 1 && (
                    <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200" />
                  )}
                  
                  <div className="flex items-start space-x-4">
                    {/* Completion Checkbox */}
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-1 transition-colors duration-200"
                    >
                      {completedTasks.has(task.id) ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>

                    {/* Icon */}
                    <div className={`p-2 rounded-lg border ${colorClasses} relative z-10 ${
                      completedTasks.has(task.id) ? 'opacity-60' : ''
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-semibold ${
                          completedTasks.has(task.id) 
                            ? 'line-through text-gray-500' 
                            : 'text-gray-900'
                        }`}>{task.title}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(task.time)}</span>
                          </span>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${
                        completedTasks.has(task.id) ? 'text-gray-400' : 'text-gray-600'
                      }`}>{task.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Completion Summary and Save Template Button */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">
                  Progress: {completedTasks.size}/{tasks.length} tasks completed
                </span>
              </div>
              {!usingTemplate && completedTasks.size > 0 && (
                <button
                  onClick={async () => {
                    const success = await saveAsPostEventTemplate(tasks);
                    if (success) {
                      setUsingTemplate(true);
                    }
                  }}
                  className="text-xs bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Save as Template
                </button>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(completedTasks.size / Math.max(tasks.length, 1)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Template Selector Modal */}
      {showReplaceOptions && (
        <TemplateSelector
          event={event}
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowReplaceOptions(false)}
          mode="post-event"
        />
      )}
    </div>
  );
};

export default PostEventTimeline;