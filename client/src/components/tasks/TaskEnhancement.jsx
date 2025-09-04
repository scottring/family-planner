import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { Plus, Calendar, Repeat, CheckSquare, Clock, User, Tag } from 'lucide-react';

const TaskEnhancement = ({ isOpen, onClose, initialData = null }) => {
  const { addTask, fetchTemplates, templates, isLoading } = useTaskStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
    family_member_id: '',
    category: 'General',
    priority: 3,
    task_type: 'simple',
    creates_events: false,
    checklist: [],
    recurrence_pattern: {
      type: 'daily',
      interval: 1,
      autoGenerate: true
    },
    completion_actions: []
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [checklistItem, setChecklistItem] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      if (initialData) {
        setFormData(prev => ({ ...prev, ...initialData }));
      }
    }
  }, [isOpen, initialData, fetchTemplates]);

  const taskTypes = [
    { value: 'simple', label: 'Simple Task', icon: CheckSquare, description: 'Single action task' },
    { value: 'complex', label: 'Complex Task', icon: Plus, description: 'Multi-step task with checklist' },
    { value: 'recurring', label: 'Recurring Task', icon: Repeat, description: 'Repeats on schedule' },
    { value: 'preparatory', label: 'Preparatory Task', icon: Calendar, description: 'Prepares for an event' }
  ];

  const categories = [
    'General', 'Health', 'Education', 'Household', 'Work', 'Social', 'Financial', 'Personal', 'Family'
  ];

  const priorities = [
    { value: 1, label: 'Very Low', color: 'bg-gray-100 text-gray-800' },
    { value: 2, label: 'Low', color: 'bg-blue-100 text-blue-800' },
    { value: 3, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 4, label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 5, label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  const recurrenceTypes = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  const stepTitles = ['Basic Info', 'Task Type & Details', 'Advanced Options'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecurrenceChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      recurrence_pattern: {
        ...prev.recurrence_pattern,
        [field]: value
      }
    }));
  };

  const addChecklistItem = () => {
    if (checklistItem.trim()) {
      setFormData(prev => ({
        ...prev,
        checklist: [...prev.checklist, { text: checklistItem.trim(), completed: false }]
      }));
      setChecklistItem('');
    }
  };

  const removeChecklistItem = (index) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await addTask(formData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      assigned_to: '',
      family_member_id: '',
      category: 'General',
      priority: 3,
      task_type: 'simple',
      creates_events: false,
      checklist: [],
      recurrence_pattern: {
        type: 'daily',
        interval: 1,
        autoGenerate: true
      },
      completion_actions: []
    });
    setCurrentStep(0);
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0:
        return formData.title.trim() && formData.due_date;
      case 1:
        return true; // Task type step is always valid
      case 2:
        return true; // Advanced options are optional
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Enhanced Task Creation</h2>
              <div className="flex mt-2 space-x-2">
                {stepTitles.map((title, index) => (
                  <div
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm ${
                      index === currentStep
                        ? 'bg-blue-100 text-blue-800'
                        : index < currentStep
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}. {title}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What needs to be done?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="flex space-x-2">
                  {priorities.map(priority => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => handleInputChange('priority', priority.value)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.priority === priority.value
                          ? priority.color
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Task Type & Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {taskTypes.map(type => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleInputChange('task_type', type.value)}
                        className={`p-4 border rounded-lg text-left transition-colors ${
                          formData.task_type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <IconComponent 
                            className={`h-5 w-5 mt-0.5 ${
                              formData.task_type === type.value ? 'text-blue-600' : 'text-gray-400'
                            }`} 
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{type.label}</h3>
                            <p className="text-sm text-gray-500">{type.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Complex Task Checklist */}
              {formData.task_type === 'complex' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Checklist Items
                  </label>
                  <div className="flex space-x-2 mb-3">
                    <input
                      type="text"
                      value={checklistItem}
                      onChange={(e) => setChecklistItem(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add checklist item..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                    />
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.checklist.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <CheckSquare className="h-4 w-4 text-gray-400" />
                        <span className="flex-1">{item.text}</span>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring Task Settings */}
              {formData.task_type === 'recurring' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recurrence Type
                      </label>
                      <select
                        value={formData.recurrence_pattern.type}
                        onChange={(e) => handleRecurrenceChange('type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {recurrenceTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Every X {formData.recurrence_pattern.type}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.recurrence_pattern.interval}
                        onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoGenerate"
                      checked={formData.recurrence_pattern.autoGenerate}
                      onChange={(e) => handleRecurrenceChange('autoGenerate', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="autoGenerate" className="text-sm text-gray-700">
                      Automatically generate next instance when completed
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Advanced Options */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="creates_events"
                  checked={formData.creates_events}
                  onChange={(e) => handleInputChange('creates_events', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="creates_events" className="text-sm text-gray-700">
                  This task should prompt for event creation when completed
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={formData.assigned_to}
                  onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Family member name or user ID"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Task Summary</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Title:</strong> {formData.title}</p>
                  <p><strong>Type:</strong> {taskTypes.find(t => t.value === formData.task_type)?.label}</p>
                  <p><strong>Priority:</strong> {priorities.find(p => p.value === formData.priority)?.label}</p>
                  <p><strong>Due:</strong> {formData.due_date ? new Date(formData.due_date).toLocaleString() : 'Not set'}</p>
                  {formData.task_type === 'complex' && (
                    <p><strong>Checklist Items:</strong> {formData.checklist.length}</p>
                  )}
                  {formData.task_type === 'recurring' && (
                    <p><strong>Recurrence:</strong> Every {formData.recurrence_pattern.interval} {formData.recurrence_pattern.type}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onClose()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              {currentStep === 0 ? 'Cancel' : 'Back'}
            </button>

            <div className="space-x-2">
              {currentStep < stepTitles.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceedToNext()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Task'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEnhancement;