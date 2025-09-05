import { useState, useEffect } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Edit2, 
  Save,
  X,
  ChevronUp,
  ChevronDown,
  FileText,
  Timer,
  Coffee,
  Car,
  Dog,
  Shirt,
  Utensils,
  Video,
  Monitor,
  Target,
  BookOpen
} from 'lucide-react';
import api from '../../services/api';

const PreparationCustomizer = ({ event, timeline, onSave, onClose }) => {
  const [customTimeline, setCustomTimeline] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    // Initialize with existing timeline
    if (timeline) {
      setCustomTimeline(timeline.map((item, index) => ({
        ...item,
        id: `item-${index}`,
        minutesBefore: calculateMinutesBefore(item.time, event.start_time)
      })));
    }
    fetchTemplates();
  }, [timeline, event]);

  const calculateMinutesBefore = (itemTime, eventTime) => {
    const diff = new Date(eventTime) - new Date(itemTime);
    return Math.floor(diff / (1000 * 60));
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/api/checklist-templates');
      // Filter templates that could be relevant for event preparation
      const prepTemplates = response.data.filter(template => 
        template.category === 'Event Preparation' || 
        template.category === 'Meeting' ||
        template.tags?.includes('preparation') ||
        template.tags?.includes('event')
      );
      setTemplates(prepTemplates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const taskTypeOptions = [
    { value: 'preparation', label: 'General Preparation', icon: Shirt },
    { value: 'meal', label: 'Meal/Snack', icon: Utensils },
    { value: 'dog_care', label: 'Pet Care', icon: Dog },
    { value: 'departure', label: 'Departure', icon: Car },
    { value: 'tech_check', label: 'Tech Check', icon: Video },
    { value: 'workspace_setup', label: 'Workspace Setup', icon: Monitor },
    { value: 'document_review', label: 'Document Review', icon: FileText },
    { value: 'refresh', label: 'Break/Refresh', icon: Coffee },
    { value: 'custom', label: 'Custom Task', icon: Target }
  ];

  const getTaskIcon = (type) => {
    const option = taskTypeOptions.find(opt => opt.value === type);
    return option ? option.icon : Target;
  };

  const addNewItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      activity: 'New preparation task',
      type: 'preparation',
      minutesBefore: 30,
      duration: 15,
      note: ''
    };
    setCustomTimeline([...customTimeline, newItem]);
  };

  const updateItem = (id, updates) => {
    setCustomTimeline(customTimeline.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const deleteItem = (id) => {
    setCustomTimeline(customTimeline.filter(item => item.id !== id));
  };

  const moveItem = (id, direction) => {
    const index = customTimeline.findIndex(item => item.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= customTimeline.length) return;
    
    const newTimeline = [...customTimeline];
    [newTimeline[index], newTimeline[newIndex]] = [newTimeline[newIndex], newTimeline[index]];
    setCustomTimeline(newTimeline);
  };

  const applyTemplate = (template) => {
    if (!template.items) return;
    
    const templateItems = JSON.parse(template.items);
    const newItems = templateItems.map((item, index) => ({
      id: `template-${Date.now()}-${index}`,
      activity: typeof item === 'string' ? item : item.text,
      type: 'custom',
      minutesBefore: (index + 1) * 15, // Default 15 min intervals
      duration: 10,
      note: ''
    }));
    
    setCustomTimeline([...customTimeline, ...newItems]);
    setShowTemplates(false);
  };

  const handleSave = () => {
    // Convert minutes before to actual times
    const eventTime = new Date(event.start_time);
    const processedTimeline = customTimeline.map(item => {
      const itemTime = new Date(eventTime);
      itemTime.setMinutes(itemTime.getMinutes() - item.minutesBefore);
      
      return {
        time: itemTime.toISOString(),
        activity: item.activity,
        type: item.type,
        duration: item.duration || 0,
        note: item.note || ''
      };
    });
    
    // Sort by time
    processedTimeline.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    onSave(processedTimeline);
  };

  const TimelineItem = ({ item, index }) => {
    const [isEditing, setIsEditing] = useState(false);
    const Icon = getTaskIcon(item.type);

    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={item.activity}
              onChange={(e) => updateItem(item.id, { activity: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Task description"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={item.type}
                  onChange={(e) => updateItem(item.id, { type: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  {taskTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Minutes Before
                </label>
                <input
                  type="number"
                  value={item.minutesBefore}
                  onChange={(e) => updateItem(item.id, { minutesBefore: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 border rounded text-sm"
                  min="0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={item.duration}
                  onChange={(e) => updateItem(item.id, { duration: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 border rounded text-sm"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={item.note || ''}
                  onChange={(e) => updateItem(item.id, { note: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="Additional info"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Icon className="h-5 w-5 text-gray-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.activity}</p>
                <div className="flex items-center space-x-3 mt-1 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {item.minutesBefore} min before
                  </span>
                  {item.duration > 0 && (
                    <span className="flex items-center">
                      <Timer className="h-3 w-3 mr-1" />
                      {item.duration} min
                    </span>
                  )}
                </div>
                {item.note && (
                  <p className="text-sm text-gray-500 italic mt-1">{item.note}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              <button
                onClick={() => moveItem(item.id, 'up')}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveItem(item.id, 'down')}
                disabled={index === customTimeline.length - 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-blue-600 hover:text-blue-800"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-1 text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Customize Preparation Timeline</h2>
              <p className="text-sm text-gray-600 mt-1">
                {event.title} - {new Date(event.start_time).toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Template Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Timeline Items</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  <BookOpen className="h-4 w-4 inline mr-1" />
                  Use Template
                </button>
                <button
                  onClick={addNewItem}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add Item
                </button>
              </div>
            </div>

            {/* Template Browser */}
            {showTemplates && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-2">Available Templates</h4>
                {templates.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className="p-3 bg-white rounded border hover:border-blue-400 text-left"
                      >
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-600">{template.description}</div>
                        {template.items && (
                          <div className="text-xs text-gray-500 mt-1">
                            {JSON.parse(template.items).length} items
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    No preparation templates available. Create checklists in the Tasks section to use them here.
                  </p>
                )}
              </div>
            )}

            {/* Timeline Items */}
            <div className="space-y-3">
              {customTimeline.length > 0 ? (
                customTimeline.map((item, index) => (
                  <TimelineItem key={item.id} item={item} index={index} />
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No timeline items yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Add items manually or select a template to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={customTimeline.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 inline mr-1" />
            Save Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreparationCustomizer;