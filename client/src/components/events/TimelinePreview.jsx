import { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  Circle,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  User,
  Tag,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Share2,
  Lightbulb
} from 'lucide-react';
import QuickImproveButton from '../timeline/QuickImproveButton';
import SuggestionReviewScreen from '../timeline/SuggestionReviewScreen';
import timelineLearningService from '../../services/timelineLearningService';

const TimelinePreview = ({ 
  eventData, 
  template, 
  onSave, 
  onCancel,
  initialProgress = [],
  canEdit = true 
}) => {
  const [timelineData, setTimelineData] = useState([]);
  const [completedTasks, setCompletedTasks] = useState(new Set(initialProgress));
  const [editingItem, setEditingItem] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [editedTime, setEditedTime] = useState('');
  const [isCustomized, setIsCustomized] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSuggestionReview, setShowSuggestionReview] = useState(false);
  const [learningObserver, setLearningObserver] = useState(null);

  useEffect(() => {
    if (template?.items) {
      // Convert template items to timeline format
      const timeline = template.items.map((item, index) => ({
        id: item.id || `item-${index}`,
        text: item.text,
        timeOffset: item.timeOffset || 0,
        category: item.category || 'preparation',
        priority: item.priority || 'medium',
        duration: item.duration || 15,
        notes: item.notes || '',
        enabled: true,
        customNotes: item.customNotes || ''
      }));
      setTimelineData(timeline);
    }
  }, [template]);

  // Initialize learning observer when eventData changes
  useEffect(() => {
    if (eventData) {
      const observer = timelineLearningService.createTimelineObserver(eventData);
      setLearningObserver(observer);
    }
  }, [eventData]);

  const formatTimeFromEvent = (offsetMinutes) => {
    if (!eventData?.start_time) return `${offsetMinutes}m before`;
    
    const eventTime = new Date(eventData.start_time);
    const taskTime = new Date(eventTime.getTime() - (offsetMinutes * 60 * 1000));
    
    const now = new Date();
    const isToday = taskTime.toDateString() === now.toDateString();
    const isTomorrow = taskTime.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    const isYesterday = taskTime.toDateString() === new Date(now.getTime() - 86400000).toDateString();
    
    let datePrefix = '';
    if (isToday) datePrefix = 'Today ';
    else if (isTomorrow) datePrefix = 'Tomorrow ';
    else if (isYesterday) datePrefix = 'Yesterday ';
    else datePrefix = taskTime.toLocaleDateString() + ' ';
    
    return datePrefix + taskTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const toggleTask = (itemId) => {
    const newCompleted = new Set(completedTasks);
    const wasCompleted = newCompleted.has(itemId);
    
    if (wasCompleted) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedTasks(newCompleted);

    // Record learning data
    if (learningObserver) {
      const item = timelineData.find(item => item.id === itemId);
      if (item) {
        if (!wasCompleted) {
          // Task was just completed
          learningObserver.onTaskCompleted(itemId, item);
        }
        // Note: We don't track "uncompleting" as that's typically accidental
      }
    }
  };

  const startEditing = (item) => {
    setEditingItem(item.id);
    setEditedText(item.text);
    setEditedTime(item.timeOffset.toString());
  };

  const saveEdit = () => {
    const originalItem = timelineData.find(item => item.id === editingItem);
    const newTimeOffset = parseInt(editedTime) || originalItem.timeOffset;
    
    // Record timing adjustment if time changed
    if (learningObserver && originalItem && newTimeOffset !== originalItem.timeOffset) {
      learningObserver.onTimingAdjusted(
        editingItem,
        originalItem.timeOffset,
        newTimeOffset,
        'User manual adjustment'
      );
    }
    
    setTimelineData(prev => prev.map(item => 
      item.id === editingItem 
        ? { 
            ...item, 
            text: editedText,
            timeOffset: newTimeOffset
          }
        : item
    ));
    setEditingItem(null);
    setIsCustomized(true);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditedText('');
    setEditedTime('');
  };

  const addNewItem = () => {
    const newItem = {
      id: `custom-${Date.now()}`,
      text: 'New preparation item',
      timeOffset: 60,
      category: 'preparation',
      priority: 'medium',
      duration: 15,
      notes: '',
      enabled: true,
      customNotes: ''
    };
    setTimelineData(prev => [...prev, newItem]);
    setIsCustomized(true);
    
    // Record custom task addition
    if (learningObserver) {
      learningObserver.onCustomTaskAdded(newItem);
    }
    
    startEditing(newItem);
  };

  const deleteItem = (itemId) => {
    setTimelineData(prev => prev.filter(item => item.id !== itemId));
    const newCompleted = new Set(completedTasks);
    newCompleted.delete(itemId);
    setCompletedTasks(newCompleted);
    setIsCustomized(true);
  };

  const moveItem = (itemId, direction) => {
    const currentIndex = timelineData.findIndex(item => item.id === itemId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= timelineData.length) return;
    
    const newData = [...timelineData];
    [newData[currentIndex], newData[newIndex]] = [newData[newIndex], newData[currentIndex]];
    setTimelineData(newData);
    setIsCustomized(true);
  };

  const resetToTemplate = () => {
    if (template?.items) {
      const timeline = template.items.map((item, index) => ({
        id: item.id || `item-${index}`,
        text: item.text,
        timeOffset: item.timeOffset || 0,
        category: item.category || 'preparation',
        priority: item.priority || 'medium',
        duration: item.duration || 15,
        notes: item.notes || '',
        enabled: true,
        customNotes: item.customNotes || ''
      }));
      setTimelineData(timeline);
      setCompletedTasks(new Set());
      setIsCustomized(false);
    }
  };

  const handleSave = () => {
    // Record timeline completion for learning
    if (learningObserver) {
      learningObserver.onTimelineCompleted(
        timelineData,
        Array.from(completedTasks),
        [] // TODO: Could add feedback collection here
      );
    }

    onSave({
      timeline: timelineData,
      completedTasks: Array.from(completedTasks),
      isCustomized,
      templateId: template?.id
    });
  };

  const handleApplySuggestion = (suggestion, applicationData) => {
    try {
      // Apply suggestion to timeline data
      const updatedTimelineData = timelineLearningService.applySuggestionToTimeline(
        timelineData,
        suggestion,
        applicationData
      );
      
      setTimelineData(updatedTimelineData);
      setIsCustomized(true);
      
      // Show success message or feedback
      console.log(`Applied suggestion: ${suggestion.suggestion_title}`);
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  };

  const handleDismissSuggestion = (suggestion, permanent) => {
    // Just log for now - the QuickImproveButton handles the API call
    console.log(`Suggestion ${permanent ? 'permanently ' : ''}dismissed: ${suggestion.suggestion_title}`);
  };

  const saveAsTemplate = async () => {
    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;

    try {
      const response = await fetch('/api/timeline-templates/from-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventId: eventData?.id,
          templateName,
          templateDescription: `Custom template created from ${eventData?.title || 'event'}`,
          adjustments: timelineData.map(item => ({
            itemId: item.id,
            newTimeOffset: item.timeOffset,
            newDuration: item.duration,
            notes: item.customNotes
          }))
        })
      });

      if (response.ok) {
        alert('Template saved successfully!');
        setShowSaveModal(false);
      } else {
        alert('Failed to save template. Please try again.');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    }
  };

  const completionPercentage = timelineData.length > 0 
    ? Math.round((completedTasks.size / timelineData.length) * 100) 
    : 0;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'travel': return '🚗';
      case 'packing': return '🧳';
      case 'preparation': return '📋';
      case 'supplies': return '🛍️';
      case 'communication': return '📞';
      default: return '📌';
    }
  };

  const sortedTimeline = [...timelineData].sort((a, b) => b.timeOffset - a.timeOffset);

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Preparation Timeline</h2>
            <p className="text-gray-600">
              {template?.name && `Based on: ${template.name}`}
              {eventData?.title && ` • For: ${eventData.title}`}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isCustomized && (
              <button
                onClick={resetToTemplate}
                className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
            )}
            
            <QuickImproveButton
              eventData={eventData}
              onApplySuggestion={handleApplySuggestion}
              onDismissSuggestion={handleDismissSuggestion}
            />
            
            <button
              onClick={() => setShowSuggestionReview(true)}
              className="flex items-center space-x-2 px-3 py-1 text-sm text-purple-600 hover:text-purple-800"
            >
              <Lightbulb className="h-4 w-4" />
              <span>Learning Center</span>
            </button>
            
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Share2 className="h-4 w-4" />
              <span>Save as Template</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">
              {completedTasks.size} of {timelineData.length} completed ({completionPercentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {eventData?.start_time && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Event starts: {new Date(eventData.start_time).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="p-6">
        {timelineData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No timeline available</p>
            <p>Select a template to see preparation items</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTimeline.map((item, index) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  completedTasks.has(item.id)
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <button
                    onClick={() => toggleTask(item.id)}
                    className={`mt-1 transition-colors ${
                      completedTasks.has(item.id)
                        ? 'text-green-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {completedTasks.has(item.id) ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(item.category)}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatTimeFromEvent(item.timeOffset)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className="text-xs text-gray-500">~{item.duration}min</span>
                    </div>

                    {editingItem === item.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Task description"
                        />
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            value={editedTime}
                            onChange={(e) => setEditedTime(e.target.value)}
                            className="w-24 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Minutes"
                          />
                          <span className="text-sm text-gray-500">minutes before event</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            <Save className="h-3 w-3" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            <X className="h-3 w-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className={`text-gray-900 ${
                          completedTasks.has(item.id) ? 'line-through text-gray-500' : ''
                        }`}>
                          {item.text}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                        )}
                        {item.customNotes && (
                          <p className="text-sm text-blue-600 mt-1 italic">{item.customNotes}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {canEdit && editingItem !== item.id && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => moveItem(item.id, 'up')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveItem(item.id, 'down')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        disabled={index === sortedTimeline.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => startEditing(item)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {canEdit && (
              <button
                onClick={addNewItem}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="h-5 w-5 mx-auto mb-2" />
                <span>Add Custom Preparation Item</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-6 border-t bg-gray-50">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          {isCustomized && (
            <div className="flex items-center space-x-1">
              <Edit3 className="h-4 w-4" />
              <span>Timeline customized</span>
            </div>
          )}
          {completionPercentage === 100 && (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>All tasks completed!</span>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Timeline
          </button>
        </div>
      </div>

      {/* Save as Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Save as Template</h3>
            <p className="text-gray-600 mb-4">
              This will create a reusable template based on your customized timeline.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveAsTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestion Review Screen */}
      {showSuggestionReview && (
        <SuggestionReviewScreen
          onClose={() => setShowSuggestionReview(false)}
          onApplySuggestion={handleApplySuggestion}
        />
      )}
    </div>
  );
};

export default TimelinePreview;