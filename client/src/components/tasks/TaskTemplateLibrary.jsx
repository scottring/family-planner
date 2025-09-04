import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../stores/taskStore';
import { Calendar, Clock, Users, Target, BookOpen, Home, Heart, DollarSign, Briefcase, Search, Star, Filter, Plus } from 'lucide-react';

const TaskTemplateLibrary = ({ isOpen, onClose, onTemplateSelect }) => {
  const { templates, fetchTemplates, createTaskFromTemplate, isLoadingTemplates } = useTaskStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCustomizeForm, setShowCustomizeForm] = useState(false);
  const [customData, setCustomData] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  const categories = [
    { id: 'all', label: 'All Templates', icon: Target },
    { id: 'Health', label: 'Health & Wellness', icon: Heart },
    { id: 'Education', label: 'Education', icon: BookOpen },
    { id: 'Household', label: 'Household', icon: Home },
    { id: 'Work', label: 'Work & Career', icon: Briefcase },
    { id: 'Financial', label: 'Financial', icon: DollarSign },
    { id: 'Social', label: 'Social & Events', icon: Users },
    { id: 'Personal', label: 'Personal Development', icon: Target },
  ];

  // Pre-built common templates that should always be available
  const prebuiltTemplates = [
    {
      id: 'school_registration',
      name: 'School Registration',
      category: 'Education',
      description: 'Complete school registration process for new academic year',
      checklist: [
        'Gather required documents (birth certificate, immunization records)',
        'Complete registration forms online',
        'Schedule school tour or meeting',
        'Submit forms and documentation',
        'Pay registration fees',
        'Receive confirmation and class assignment'
      ],
      tags: ['school', 'registration', 'education', 'deadline'],
      default_priority: 4,
      estimated_duration: 120,
      usage_count: 0
    },
    {
      id: 'sports_signup',
      name: 'Sports Team Signup',
      category: 'Social',
      description: 'Register child for sports team or activity',
      checklist: [
        'Research available teams/leagues',
        'Check age and skill requirements',
        'Complete registration forms',
        'Submit medical clearance if required',
        'Pay registration fees',
        'Attend orientation meeting',
        'Purchase equipment and uniforms'
      ],
      tags: ['sports', 'registration', 'kids', 'activity'],
      default_priority: 3,
      estimated_duration: 90,
      usage_count: 0
    },
    {
      id: 'medical_checkup',
      name: 'Annual Medical Checkup',
      category: 'Health',
      description: 'Schedule and complete annual medical examination',
      checklist: [
        'Call to schedule appointment',
        'Gather insurance information',
        'Complete pre-visit forms',
        'Prepare list of current medications',
        'Note any health concerns to discuss',
        'Attend appointment',
        'Schedule follow-up if needed'
      ],
      tags: ['health', 'medical', 'annual', 'checkup'],
      default_priority: 3,
      estimated_duration: 60,
      usage_count: 0,
      recurring_pattern: { type: 'yearly', interval: 1 }
    },
    {
      id: 'home_maintenance',
      name: 'Seasonal Home Maintenance',
      category: 'Household',
      description: 'Complete seasonal home maintenance tasks',
      checklist: [
        'Check and clean gutters',
        'Inspect roof for damage',
        'Service HVAC system',
        'Check smoke and carbon monoxide detectors',
        'Winterize outdoor faucets (fall/winter)',
        'Clean and store outdoor furniture',
        'Trim trees and bushes'
      ],
      tags: ['home', 'maintenance', 'seasonal', 'safety'],
      default_priority: 2,
      estimated_duration: 240,
      usage_count: 0,
      recurring_pattern: { type: 'monthly', interval: 3 }
    },
    {
      id: 'birthday_party',
      name: 'Birthday Party Planning',
      category: 'Social',
      description: 'Plan and organize a birthday party',
      checklist: [
        'Set date and create guest list',
        'Choose venue and send invitations',
        'Plan menu and order cake',
        'Organize activities and games',
        'Purchase decorations and supplies',
        'Prepare party favors',
        'Set up venue on party day',
        'Host the party'
      ],
      tags: ['party', 'birthday', 'celebration', 'planning'],
      default_priority: 3,
      estimated_duration: 180,
      usage_count: 0
    }
  ];

  const allTemplates = [...prebuiltTemplates, ...templates];

  const filteredTemplates = allTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = async (template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
      onClose();
    } else {
      setSelectedTemplate(template);
      setShowCustomizeForm(true);
      setCustomData({
        title: template.name,
        description: template.description,
        priority: template.default_priority || 3,
        category: template.category,
        due_date: '',
        assigned_to: ''
      });
    }
  };

  const handleCreateFromTemplate = async () => {
    try {
      const templateId = selectedTemplate.id;
      await createTaskFromTemplate(templateId, customData);
      onClose();
      setShowCustomizeForm(false);
      setSelectedTemplate(null);
      setCustomData({});
    } catch (error) {
      console.error('Failed to create task from template:', error);
    }
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : Target;
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-hidden">
        {!showCustomizeForm ? (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Task Template Library</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose from pre-built templates or create custom tasks
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Search and Filter */}
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search templates..."
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto">
                  {categories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                          selectedCategory === category.id
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="hidden sm:inline">{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="p-6 overflow-y-auto max-h-96">
              {isLoadingTemplates ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
                  <p className="text-gray-500 mt-1">Try adjusting your search or category filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => {
                    const IconComponent = getCategoryIcon(template.category);
                    return (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {template.category}
                            </span>
                          </div>
                          {template.usage_count > 0 && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Star className="h-3 w-3" />
                              <span>{template.usage_count}</span>
                            </div>
                          )}
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-3">
                            {template.estimated_duration && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(template.estimated_duration)}</span>
                              </div>
                            )}
                            {template.checklist && Array.isArray(template.checklist) && (
                              <div className="flex items-center space-x-1">
                                <Target className="h-3 w-3" />
                                <span>{template.checklist.length} steps</span>
                              </div>
                            )}
                          </div>
                          {template.recurring_pattern && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <Calendar className="h-3 w-3" />
                              <span>Recurring</span>
                            </div>
                          )}
                        </div>

                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Customization Form */
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Customize Task</h3>
                <p className="text-sm text-gray-600">Based on: {selectedTemplate?.name}</p>
              </div>
              <button
                onClick={() => setShowCustomizeForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={customData.title}
                  onChange={(e) => setCustomData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={customData.description}
                  onChange={(e) => setCustomData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={customData.due_date}
                    onChange={(e) => setCustomData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={customData.priority}
                    onChange={(e) => setCustomData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Very Low</option>
                    <option value={2}>Low</option>
                    <option value={3}>Medium</option>
                    <option value={4}>High</option>
                    <option value={5}>Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={customData.assigned_to}
                  onChange={(e) => setCustomData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Family member name"
                />
              </div>

              {selectedTemplate?.checklist && Array.isArray(selectedTemplate.checklist) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Checklist ({selectedTemplate.checklist.length} items)
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                    <ul className="space-y-1 text-sm">
                      {selectedTemplate.checklist.map((item, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{typeof item === 'string' ? item : item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowCustomizeForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleCreateFromTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Task
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskTemplateLibrary;