import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Tag,
  Repeat,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  Save,
  X,
  Plus
} from 'lucide-react';
import TemplateSelector from './TemplateSelector';
import TimelinePreview from './TimelinePreview';

const EventFormWithTemplates = ({ 
  event = null, 
  onSave, 
  onCancel, 
  isOpen = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: '',
    category: 'personal',
    is_recurring: false,
    recurrence_type: '',
    recurrence_days: [],
    recurrence_end_date: '',
    assigned_to: null,
    priority: 3,
    notes: ''
  });

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTimelinePreview, setShowTimelinePreview] = useState(false);
  const [timelineData, setTimelineData] = useState(null);
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const eventTypes = [
    'school',
    'sports',
    'medical',
    'work',
    'social',
    'travel',
    'household',
    'personal'
  ];

  const categories = [
    { value: 'personal', label: 'Personal' },
    { value: 'family', label: 'Family' },
    { value: 'work', label: 'Work' },
    { value: 'health', label: 'Health' },
    { value: 'education', label: 'Education' },
    { value: 'social', label: 'Social' }
  ];

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start_time: event.start_time ? event.start_time.slice(0, 16) : '',
        end_time: event.end_time ? event.end_time.slice(0, 16) : '',
        location: event.location || '',
        event_type: event.event_type || '',
        category: event.category || 'personal',
        is_recurring: event.is_recurring || false,
        recurrence_type: event.recurrence_type || '',
        recurrence_days: event.recurrence_days || [],
        recurrence_end_date: event.recurrence_end_date || '',
        assigned_to: event.assigned_to || null,
        priority: event.priority || 3,
        notes: event.notes || ''
      });
    }
  }, [event]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    }

    if (formData.start_time && formData.end_time && 
        new Date(formData.start_time) >= new Date(formData.end_time)) {
      newErrors.end_time = 'End time must be after start time';
    }

    if (formData.is_recurring && !formData.recurrence_type) {
      newErrors.recurrence_type = 'Recurrence type is required for recurring events';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleRecurrenceDayToggle = (day) => {
    const currentDays = formData.recurrence_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    handleInputChange('recurrence_days', newDays);
  };

  const handleTemplateSelect = async (template, options = {}) => {
    setSelectedTemplate(template);
    
    if (template) {
      // Assign template to event if we have an event ID
      if (event?.id) {
        try {
          const response = await fetch('/api/timeline-templates/assign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              eventId: event.id,
              templateId: template.id,
              applyToSeries: options.applyToSeries || false,
              customizations: options.customizations || []
            })
          });

          if (response.ok) {
            setTimelineData({
              template,
              customizations: options.customizations,
              applyToSeries: options.applyToSeries
            });
          }
        } catch (error) {
          console.error('Failed to assign template:', error);
        }
      } else {
        // Store template data to apply after event creation
        setTimelineData({
          template,
          customizations: options.customizations,
          applyToSeries: options.applyToSeries
        });
      }
    }
    
    setShowTemplateSelector(false);
    if (template) {
      setShowTimelinePreview(true);
    }
  };

  const handleTimelinePreview = (template) => {
    setSelectedTemplate(template);
    setShowTimelinePreview(true);
  };

  const handleTimelineSave = (timelineConfig) => {
    setTimelineData(timelineConfig);
    setShowTimelinePreview(false);
    setCurrentStep(3); // Move to final review step
  };

  const handleFinalSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // First save the event
      const eventPayload = {
        ...formData,
        recurrence_days: JSON.stringify(formData.recurrence_days || [])
      };

      const eventResponse = await fetch(
        event?.id ? `/api/calendar/events/${event.id}` : '/api/calendar/events',
        {
          method: event?.id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(eventPayload)
        }
      );

      if (!eventResponse.ok) {
        throw new Error('Failed to save event');
      }

      const savedEvent = await eventResponse.json();
      const eventId = savedEvent.id || event?.id;

      // If we have timeline data, assign the template
      if (timelineData && timelineData.template && eventId) {
        const templateResponse = await fetch('/api/timeline-templates/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            eventId,
            templateId: timelineData.template.id,
            applyToSeries: timelineData.applyToSeries || false,
            customizations: timelineData.customizations || []
          })
        });

        if (!templateResponse.ok) {
          console.warn('Failed to assign template, but event was saved');
        }
      }

      onSave(savedEvent);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
    setSaving(false);
  };

  const renderStep1_EventDetails = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter event title"
          />
          {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date & Time *
          </label>
          <input
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => handleInputChange('start_time', e.target.value)}
            step="900"
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.start_time ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.start_time && <p className="text-red-600 text-sm mt-1">{errors.start_time}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            value={formData.end_time}
            onChange={(e) => handleInputChange('end_time', e.target.value)}
            step="900"
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.end_time ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.end_time && <p className="text-red-600 text-sm mt-1">{errors.end_time}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            value={formData.event_type}
            onChange={(e) => handleInputChange('event_type', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select type</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={1}>1 - Low</option>
            <option value={2}>2 - Medium-Low</option>
            <option value={3}>3 - Medium</option>
            <option value={4}>4 - Medium-High</option>
            <option value={5}>5 - High</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add event description or notes"
          />
        </div>
      </div>

      {/* Recurring Event Options */}
      <div className="border-t pt-6">
        <label className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={formData.is_recurring}
            onChange={(e) => handleInputChange('is_recurring', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium text-gray-700">Recurring Event</span>
        </label>

        {formData.is_recurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recurrence Pattern *
              </label>
              <select
                value={formData.recurrence_type}
                onChange={(e) => handleInputChange('recurrence_type', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.recurrence_type ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select pattern</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Weekdays Only</option>
                <option value="custom">Custom Days</option>
              </select>
              {errors.recurrence_type && <p className="text-red-600 text-sm mt-1">{errors.recurrence_type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => handleInputChange('recurrence_end_date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {formData.recurrence_type === 'custom' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleRecurrenceDayToggle(day)}
                      className={`px-3 py-1 rounded text-sm ${
                        formData.recurrence_days?.includes(day)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2_TemplateSelection = () => (
    <div className="text-center py-12">
      <div className="mb-8">
        <CheckSquare className="h-16 w-16 mx-auto text-blue-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Add Preparation Timeline
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Choose a template to help you prepare for this event, or skip to create the event without a timeline.
        </p>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowTemplateSelector(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          <Sparkles className="h-5 w-5" />
          <span>Browse Templates</span>
        </button>
        
        <button
          onClick={() => setCurrentStep(3)}
          className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300"
        >
          <span>Skip Template</span>
        </button>
      </div>

      {selectedTemplate && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
          <h4 className="font-medium text-blue-900 mb-2">Selected Template</h4>
          <p className="text-blue-700">{selectedTemplate.name}</p>
          <p className="text-sm text-blue-600 mt-1">{selectedTemplate.description}</p>
          <button
            onClick={() => setShowTimelinePreview(true)}
            className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Preview Timeline
          </button>
        </div>
      )}
    </div>
  );

  const renderStep3_Review = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & Confirm</h3>
      
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Event Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Title:</span>
            <p className="text-gray-900">{formData.title}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Date & Time:</span>
            <p className="text-gray-900">
              {formData.start_time && new Date(formData.start_time).toLocaleString()}
              {' - '}
              {formData.end_time && new Date(formData.end_time).toLocaleString()}
            </p>
          </div>
          {formData.location && (
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              <p className="text-gray-900">{formData.location}</p>
            </div>
          )}
          {formData.event_type && (
            <div>
              <span className="font-medium text-gray-700">Type:</span>
              <p className="text-gray-900">{formData.event_type}</p>
            </div>
          )}
          {formData.is_recurring && (
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Recurring:</span>
              <p className="text-gray-900">
                {formData.recurrence_type}
                {formData.recurrence_end_date && ` until ${formData.recurrence_end_date}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedTemplate && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="font-medium text-blue-900 mb-2">Preparation Template</h4>
          <p className="text-blue-800">{selectedTemplate.name}</p>
          <p className="text-sm text-blue-600 mt-1">{selectedTemplate.description}</p>
          <div className="flex items-center space-x-2 mt-2 text-sm text-blue-600">
            <CheckSquare className="h-4 w-4" />
            <span>{selectedTemplate.items?.length || 0} preparation items</span>
          </div>
          {applyToSeries && formData.is_recurring && (
            <div className="mt-2 text-sm text-blue-600">
              <Repeat className="h-4 w-4 inline mr-1" />
              Template will be applied to all future instances
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {event ? 'Edit Event' : 'Create New Event'}
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`w-12 h-0.5 mx-2 ${
                        step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {currentStep === 1 && renderStep1_EventDetails()}
            {currentStep === 2 && renderStep2_TemplateSelection()}
            {currentStep === 3 && renderStep3_Review()}
          </div>

          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  onClick={() => {
                    if (currentStep === 1 && validateForm()) {
                      setCurrentStep(2);
                    } else if (currentStep === 2) {
                      setCurrentStep(3);
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={currentStep === 1 && !validateForm()}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleFinalSave}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <TemplateSelector
        eventData={formData}
        onTemplateSelect={handleTemplateSelect}
        onTemplatePreview={handleTimelinePreview}
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        selectedTemplate={selectedTemplate}
        onSeriesChange={setApplyToSeries}
      />

      {showTimelinePreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-auto">
            <TimelinePreview
              eventData={formData}
              template={selectedTemplate}
              onSave={handleTimelineSave}
              onCancel={() => setShowTimelinePreview(false)}
              canEdit={true}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default EventFormWithTemplates;