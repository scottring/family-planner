import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Plus, 
  Trash2, 
  GripVertical, 
  Clock, 
  Tag, 
  Save,
  AlertTriangle,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTemplateStore } from '../../stores/templateStore';

const TemplateEditor = ({ template, onClose }) => {
  const { createTemplate, updateTemplate, categories, phases } = useTemplateStore();
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'preparation',
    phase: 'pre',
    icon: '📋',
    items: [],
    estimated_time: 0,
    event_types: [],
    tags: [],
    description: ''
  });
  
  const [newItem, setNewItem] = useState({
    text: '',
    timeEstimate: 0,
    priority: 'medium',
    notes: '',
    type: 'task'
  });
  
  const [newTag, setNewTag] = useState('');
  const [newEventType, setNewEventType] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Initialize form data when template prop changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        category: template.category || 'preparation',
        phase: template.phase || 'pre',
        icon: template.icon || '📋',
        items: template.items || [],
        estimated_time: template.estimated_time || 0,
        event_types: template.event_types || [],
        tags: template.tags || [],
        description: template.description || ''
      });
      
      // Auto-expand first few items for editing
      if (template.items && template.items.length > 0) {
        setExpandedItems(new Set([0, 1, 2]));
      }
    } else {
      // Reset for new template
      setFormData({
        name: '',
        category: 'preparation',
        phase: 'pre',
        icon: '📋',
        items: [],
        estimated_time: 0,
        event_types: [],
        tags: [],
        description: ''
      });
      setExpandedItems(new Set());
    }
  }, [template]);

  // Auto-calculate estimated time based on items
  useEffect(() => {
    const totalTime = formData.items.reduce((sum, item) => {
      return sum + (item.timeEstimate || 0);
    }, 0);
    
    if (totalTime !== formData.estimated_time) {
      setFormData(prev => ({ ...prev, estimated_time: totalTime }));
    }
  }, [formData.items]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.text?.trim()) {
        newErrors[`item_${index}`] = 'Item text is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    
    try {
      if (template && template.id) {
        await updateTemplate(template.id, formData);
      } else {
        await createTemplate(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      setErrors({ submit: 'Failed to save template. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    if (!newItem.text.trim()) return;
    
    const item = {
      ...newItem,
      text: newItem.text.trim(),
      id: Date.now() // Temporary ID for tracking
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
    
    setNewItem({
      text: '',
      timeEstimate: 0,
      priority: 'medium',
      notes: '',
      type: 'task'
    });
    
    // Expand the newly added item
    setExpandedItems(prev => new Set([...prev, formData.items.length]));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    
    // Update expanded items indices
    setExpandedItems(prev => {
      const newExpanded = new Set();
      prev.forEach(i => {
        if (i < index) newExpanded.add(i);
        else if (i > index) newExpanded.add(i - 1);
      });
      return newExpanded;
    });
  };

  const updateItem = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, ...updates } : item
      )
    }));
  };

  const moveItem = (fromIndex, toIndex) => {
    const newItems = [...formData.items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addTag = () => {
    if (!newTag.trim() || formData.tags.includes(newTag.trim())) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()]
    }));
    setNewTag('');
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addEventType = () => {
    if (!newEventType.trim() || formData.event_types.includes(newEventType.trim())) return;
    
    setFormData(prev => ({
      ...prev,
      event_types: [...prev.event_types, newEventType.trim()]
    }));
    setNewEventType('');
  };

  const removeEventType = (typeToRemove) => {
    setFormData(prev => ({
      ...prev,
      event_types: prev.event_types.filter(type => type !== typeToRemove)
    }));
  };

  const toggleItemExpanded = (index) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      return newExpanded;
    });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-800',
      'medium': 'bg-blue-100 text-blue-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {template ? 'Edit Template' : 'Create Template'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Build reusable checklists for events, routines, and procedures
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Soccer Practice Preparation"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.stopPropagation();
                    }
                  }}
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="📋"
                />
              </div>
            </div>

            {/* Category and Phase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phase
                </label>
                <select
                  value={formData.phase}
                  onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pre">Pre-Event</option>
                  <option value="during">During Event</option>
                  <option value="post">Post-Event</option>
                  <option value="all">All Phases</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Brief description of this template..."
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
              />
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Checklist Items *
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Est. {formData.estimated_time} min total</span>
                </div>
              </div>
              
              {errors.items && (
                <p className="text-red-600 text-sm mb-4">{errors.items}</p>
              )}

              {/* Add New Item */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={newItem.text}
                      onChange={(e) => setNewItem(prev => ({ ...prev, text: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Item description..."
                      onKeyDown={(e) => {
                        if (e.key === ' ') {
                          e.stopPropagation();
                          return;
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addItem();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={newItem.timeEstimate}
                      onChange={(e) => setNewItem(prev => ({ ...prev, timeEstimate: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Minutes"
                      min="0"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!newItem.text.trim()}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      <Plus className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {formData.items.map((item, index) => {
                  const isExpanded = expandedItems.has(index);
                  return (
                    <div
                      key={item.id || index}
                      className="bg-white border border-gray-200 rounded-lg"
                    >
                      {/* Item Header */}
                      <div className="flex items-center p-3">
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 mr-2"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900 font-medium truncate">
                              {item.text}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>
                            {item.timeEstimate > 0 && (
                              <span className="text-xs text-gray-500">
                                {item.timeEstimate}m
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => toggleItemExpanded(index)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Item Details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Text
                              </label>
                              <input
                                type="text"
                                value={item.text}
                                onChange={(e) => updateItem(index, { text: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Time (min)
                              </label>
                              <input
                                type="number"
                                value={item.timeEstimate || 0}
                                onChange={(e) => updateItem(index, { timeEstimate: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Priority
                              </label>
                              <select
                                value={item.priority}
                                onChange={(e) => updateItem(index, { priority: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>
                          </div>
                          {item.notes && (
                            <div className="mt-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <textarea
                                value={item.notes || ''}
                                onChange={(e) => updateItem(index, { notes: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                rows="2"
                                placeholder="Additional notes..."
                                onKeyDown={(e) => {
                                  if (e.key === ' ') {
                                    e.stopPropagation();
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm flex items-center space-x-1"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Add tag..."
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.stopPropagation();
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Event Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Applicable Event Types
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.event_types.map((type, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm flex items-center space-x-1"
                  >
                    <span>{type}</span>
                    <button
                      type="button"
                      onClick={() => removeEventType(type)}
                      className="text-blue-500 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., sports, medical, school..."
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.stopPropagation();
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEventType();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addEventType}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Errors */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-red-800">{errors.submit}</p>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {formData.items.length} items • {formData.estimated_time} minutes
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TemplateEditor;