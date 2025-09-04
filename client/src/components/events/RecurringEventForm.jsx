import React, { useState, useEffect } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';

const RecurringEventForm = ({ onClose, onSuccess }) => {
  const { 
    createRecurringEvent, 
    createFromRoutineTemplate, 
    fetchRoutineTemplates, 
    routineTemplates 
  } = useEventStore();
  const { user } = useAuthStore();

  const [formType, setFormType] = useState('custom'); // 'custom' or 'template'
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    category: 'routine',
    event_type: 'routine',
    recurrence_type: 'daily',
    recurrence_days: [],
    recurrence_end_date: '',
    structured_checklist: []
  });

  // Load routine templates on component mount
  useEffect(() => {
    fetchRoutineTemplates().catch(console.error);
  }, [fetchRoutineTemplates]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'recurrence_days') {
      const dayValue = parseInt(value);
      setFormData(prev => ({
        ...prev,
        recurrence_days: checked
          ? [...prev.recurrence_days, dayValue]
          : prev.recurrence_days.filter(day => day !== dayValue)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateName) => {
    setSelectedTemplate(templateName);
    const template = routineTemplates.find(t => t.name === templateName);
    
    if (template) {
      const now = new Date();
      const startTime = new Date(now);
      
      // Use suggested time if available
      if (template.suggested_times && template.suggested_times.length > 0) {
        const [hours, minutes] = template.suggested_times[0].split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      const endTime = new Date(startTime.getTime() + (template.duration * 60 * 1000));
      
      setFormData(prev => ({
        ...prev,
        title: template.name,
        description: `${template.name} routine`,
        start_time: startTime.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16),
        category: template.category,
        event_type: template.event_type,
        structured_checklist: template.structured_checklist || [],
        recurrence_type: template.recurrence_suggestions?.[0] || 'daily',
        recurrence_days: template.default_days || []
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;

      if (formType === 'template' && selectedTemplate) {
        // Create from routine template
        result = await createFromRoutineTemplate(
          selectedTemplate,
          formData.start_time,
          formData.recurrence_type,
          formData.recurrence_days,
          formData.recurrence_end_date || null
        );
      } else {
        // Create custom recurring event
        const eventData = {
          ...formData,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          recurrence_end_date: formData.recurrence_end_date || null
        };

        result = await createRecurringEvent(eventData);
      }

      if (onSuccess) {
        onSuccess(result);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to create recurring event');
      console.error('Error creating recurring event:', err);
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Recurring Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            type="button"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create From
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="formType"
                  value="custom"
                  checked={formType === 'custom'}
                  onChange={(e) => setFormType(e.target.value)}
                  className="mr-2"
                />
                Custom Event
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="formType"
                  value="template"
                  checked={formType === 'template'}
                  onChange={(e) => setFormType(e.target.value)}
                  className="mr-2"
                />
                Routine Template
              </label>
            </div>
          </div>

          {/* Template Selection */}
          {formType === 'template' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Routine Template
              </label>
              <div className="grid gap-3">
                {routineTemplates.map((template) => (
                  <div
                    key={template.name}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === template.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(template.name)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {template.duration} minutes • {template.structured_checklist?.length || 0} steps
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.suggested_times?.map((time, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Details */}
          {(formType === 'custom' || selectedTemplate) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="routine">Routine</option>
                    <option value="personal">Personal</option>
                    <option value="family">Family</option>
                    <option value="work">Work</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Recurrence Settings */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recurrence Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repeat *
                    </label>
                    <select
                      name="recurrence_type"
                      value={formData.recurrence_type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="weekdays">Weekdays Only</option>
                      <option value="custom">Custom Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (optional)
                    </label>
                    <input
                      type="date"
                      name="recurrence_end_date"
                      value={formData.recurrence_end_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Custom Days Selection */}
                {formData.recurrence_type === 'custom' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Days
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {dayNames.map((day, index) => (
                        <label key={index} className="flex items-center">
                          <input
                            type="checkbox"
                            name="recurrence_days"
                            value={index}
                            checked={formData.recurrence_days.includes(index)}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span className="text-sm">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Checklist Preview */}
              {formData.structured_checklist && formData.structured_checklist.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Routine Checklist</h3>
                  <div className="space-y-2">
                    {formData.structured_checklist.map((item, index) => (
                      <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <input type="checkbox" disabled className="mr-3" />
                          <span className="text-sm">{item.text}</span>
                          {item.conditional && (
                            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              Conditional
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Recurring Event'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default RecurringEventForm;