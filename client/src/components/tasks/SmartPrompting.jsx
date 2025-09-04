import React, { useState } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { Calendar, Clock, CheckSquare, ArrowRight, X, Lightbulb, Repeat, AlertCircle } from 'lucide-react';

const SmartPrompting = () => {
  const { activePrompts, removePrompt, convertTaskToEvent, createTaskFromTemplate } = useTaskStore();
  const [expandedPrompt, setExpandedPrompt] = useState(null);
  const [eventFormData, setEventFormData] = useState({});
  const [showEventForm, setShowEventForm] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);

  const handlePromptAction = async (prompt, action, data = {}) => {
    try {
      switch (action) {
        case 'create_event':
          if (data.eventData) {
            await convertTaskToEvent(prompt.taskId, data.eventData);
            removePrompt(prompt.id);
          } else {
            // Show event creation form
            setCurrentPrompt(prompt);
            setShowEventForm(true);
            setEventFormData({
              title: prompt.suggestedEvent?.title || '',
              description: prompt.suggestedEvent?.description || '',
              location: prompt.suggestedEvent?.location || '',
              start_time: '',
              end_time: '',
              duration: prompt.suggestedEvent?.duration || 60
            });
          }
          break;
          
        case 'generate_next_recurring':
          await generateNextRecurringInstance(prompt.taskId);
          removePrompt(prompt.id);
          break;
          
        case 'create_follow_up':
          if (data.taskData) {
            await createTaskFromTemplate(data.templateId, data.taskData);
            removePrompt(prompt.id);
          }
          break;
          
        case 'dismiss':
          removePrompt(prompt.id);
          break;
          
        default:
          console.warn('Unknown prompt action:', action);
      }
    } catch (error) {
      console.error('Error handling prompt action:', error);
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    
    // Calculate end time if not provided
    if (!eventFormData.end_time && eventFormData.start_time && eventFormData.duration) {
      const startDate = new Date(eventFormData.start_time);
      const endDate = new Date(startDate.getTime() + (eventFormData.duration * 60000));
      eventFormData.end_time = endDate.toISOString().slice(0, 16);
    }
    
    await handlePromptAction(currentPrompt, 'create_event', { eventData: eventFormData });
    setShowEventForm(false);
    setCurrentPrompt(null);
    setEventFormData({});
  };

  const getPromptIcon = (type) => {
    switch (type) {
      case 'create_event':
        return Calendar;
      case 'incomplete_checklist':
        return CheckSquare;
      case 'recurring_generated':
        return Repeat;
      case 'event_ready':
        return Clock;
      case 'follow_up_tasks':
        return Lightbulb;
      default:
        return AlertCircle;
    }
  };

  const getPromptColor = (type) => {
    switch (type) {
      case 'create_event':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'incomplete_checklist':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'recurring_generated':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'event_ready':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'follow_up_tasks':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (activePrompts.length === 0 && !showEventForm) {
    return null;
  }

  return (
    <>
      {/* Smart Prompts Container */}
      {activePrompts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-3">
          {activePrompts.slice(0, 3).map((prompt) => {
            const IconComponent = getPromptIcon(prompt.type);
            const colorClass = getPromptColor(prompt.type);
            const isExpanded = expandedPrompt === prompt.id;

            return (
              <div
                key={prompt.id}
                className={`border-2 rounded-lg shadow-lg transition-all duration-300 ${colorClass} ${
                  isExpanded ? 'max-w-lg' : 'max-w-md'
                }`}
              >
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)}
                >
                  <div className="flex items-start space-x-3">
                    <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{prompt.title}</h3>
                      <p className={`text-xs mt-1 ${isExpanded ? '' : 'truncate'}`}>
                        {prompt.message}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePromptAction(prompt, 'dismiss');
                      }}
                      className="text-current opacity-60 hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-current border-opacity-20">
                    {prompt.type === 'create_event' && (
                      <div className="mt-3 space-y-2">
                        {prompt.suggestedEvent && (
                          <div className="text-xs bg-white bg-opacity-50 p-2 rounded">
                            <p><strong>Suggested:</strong> {prompt.suggestedEvent.title}</p>
                            <p><strong>Duration:</strong> {prompt.suggestedEvent.duration} minutes</p>
                            <p><strong>Location:</strong> {prompt.suggestedEvent.location}</p>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromptAction(prompt, 'create_event');
                            }}
                            className="flex-1 bg-white bg-opacity-80 hover:bg-opacity-100 text-current px-3 py-1 rounded text-xs font-medium"
                          >
                            Create Event
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromptAction(prompt, 'dismiss');
                            }}
                            className="px-3 py-1 text-xs opacity-60 hover:opacity-100"
                          >
                            Maybe Later
                          </button>
                        </div>
                      </div>
                    )}

                    {prompt.type === 'incomplete_checklist' && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs">
                          <p className="font-medium mb-1">Incomplete items:</p>
                          <ul className="space-y-1">
                            {prompt.items?.slice(0, 3).map((item, index) => (
                              <li key={index} className="flex items-center space-x-1">
                                <CheckSquare className="h-3 w-3" />
                                <span>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromptAction(prompt, 'create_follow_up', {
                                taskData: { checklist: prompt.items }
                              });
                            }}
                            className="flex-1 bg-white bg-opacity-80 hover:bg-opacity-100 text-current px-3 py-1 rounded text-xs font-medium"
                          >
                            Create Follow-up Tasks
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromptAction(prompt, 'dismiss');
                            }}
                            className="px-3 py-1 text-xs opacity-60 hover:opacity-100"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )}

                    {prompt.type === 'follow_up_tasks' && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs max-h-32 overflow-y-auto">
                          {prompt.suggestions?.map((suggestion, index) => (
                            <div key={index} className="bg-white bg-opacity-50 p-2 rounded mb-2">
                              <p className="font-medium">{suggestion.title}</p>
                              <p className="opacity-80">{suggestion.description}</p>
                              <p className="text-xs opacity-60">
                                Priority: {suggestion.priority} | ~{suggestion.estimatedDuration}min
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Create tasks for each suggestion
                              prompt.suggestions?.forEach(suggestion => {
                                handlePromptAction(prompt, 'create_follow_up', {
                                  taskData: suggestion
                                });
                              });
                            }}
                            className="flex-1 bg-white bg-opacity-80 hover:bg-opacity-100 text-current px-3 py-1 rounded text-xs font-medium"
                          >
                            Create All
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromptAction(prompt, 'dismiss');
                            }}
                            className="px-3 py-1 text-xs opacity-60 hover:opacity-100"
                          >
                            Not Now
                          </button>
                        </div>
                      </div>
                    )}

                    {prompt.type === 'recurring_generated' && (
                      <div className="mt-3">
                        <div className="text-xs bg-white bg-opacity-50 p-2 rounded mb-2">
                          <p><strong>Next Task:</strong> {prompt.nextTask?.title}</p>
                          <p><strong>Due:</strong> {new Date(prompt.nextTask?.due_date).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromptAction(prompt, 'dismiss');
                          }}
                          className="w-full bg-white bg-opacity-80 hover:bg-opacity-100 text-current px-3 py-1 rounded text-xs font-medium"
                        >
                          Got it
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {activePrompts.length > 3 && (
            <div className="text-center">
              <span className="text-xs text-gray-500">
                +{activePrompts.length - 3} more prompts
              </span>
            </div>
          )}
        </div>
      )}

      {/* Event Creation Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Create Event</h3>
              <p className="text-sm text-gray-600 mt-1">
                Based on your completed task
              </p>
            </div>

            <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={eventFormData.title}
                  onChange={(e) => setEventFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={eventFormData.start_time}
                    onChange={(e) => setEventFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={eventFormData.duration}
                    onChange={(e) => setEventFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="15"
                    step="15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={eventFormData.location}
                  onChange={(e) => setEventFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventForm(false);
                    setCurrentPrompt(null);
                    setEventFormData({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartPrompting;