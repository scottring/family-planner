import { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  CheckSquare,
  Tag,
  Users,
  Calendar,
  Star,
  Copy,
  X,
  Plus,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

const TemplateSelector = ({ 
  eventData, 
  onTemplateSelect, 
  onTemplatePreview,
  isOpen,
  onClose,
  selectedTemplate,
  onSeriesChange
}) => {
  const [templates, setTemplates] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [expandedTemplate, setExpandedTemplate] = useState(null);
  const [customizations, setCustomizations] = useState({});
  const [applyToSeries, setApplyToSeries] = useState(false);

  const categories = [
    { value: 'all', label: 'All Templates', count: 0 },
    { value: 'school', label: 'School Events', count: 0 },
    { value: 'sports', label: 'Sports & Activities', count: 0 },
    { value: 'medical', label: 'Medical Appointments', count: 0 },
    { value: 'travel', label: 'Travel & Trips', count: 0 },
    { value: 'social', label: 'Social Events', count: 0 },
    { value: 'household', label: 'Household Tasks', count: 0 },
    { value: 'work', label: 'Work Events', count: 0 },
    { value: 'personal', label: 'Personal', count: 0 }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
      fetchAllTemplates();
      fetchSimilarEvents();
    }
  }, [isOpen, eventData]);

  const fetchSuggestions = async () => {
    if (!eventData) return;

    setLoading(true);
    try {
      const response = await fetch('/api/timeline-templates/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventTitle: eventData.title,
          eventDescription: eventData.description,
          eventType: eventData.event_type || eventData.category,
          eventLocation: eventData.location
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to fetch template suggestions:', error);
    }
    setLoading(false);
  };

  const fetchAllTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('query', searchQuery);
      }

      const response = await fetch(`/api/timeline-templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchSimilarEvents = async () => {
    if (!eventData) return;

    try {
      const response = await fetch('/api/timeline-templates/from-similar-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventTitle: eventData.title,
          eventType: eventData.event_type || eventData.category,
          eventLocation: eventData.location
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSimilarEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch similar events:', error);
    }
  };

  const handleTemplateSelect = (template) => {
    onTemplateSelect(template, {
      customizations: customizations[template.id] || [],
      applyToSeries
    });
  };

  const handlePreview = (template) => {
    setExpandedTemplate(expandedTemplate === template.id ? null : template.id);
    onTemplatePreview?.(template);
  };

  const updateCustomization = (templateId, itemIndex, field, value) => {
    setCustomizations(prev => ({
      ...prev,
      [templateId]: (prev[templateId] || []).map((item, idx) => 
        idx === itemIndex ? { ...item, [field]: value } : item
      )
    }));
  };

  const formatTimeOffset = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  };

  const TemplateCard = ({ template, source = 'template', isExpanded = false }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium text-gray-900">{template.name || template.template_name}</h3>
            {template.relevanceScore && (
              <div className="flex items-center text-xs text-amber-600">
                <Star className="h-3 w-3 mr-1" />
                {Math.round(template.relevanceScore)}% match
              </div>
            )}
            {template.usage_count > 0 && (
              <div className="flex items-center text-xs text-gray-500">
                <Copy className="h-3 w-3 mr-1" />
                Used {template.usage_count} times
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2">
            {template.description || template.template_description}
          </p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <CheckSquare className="h-3 w-3 mr-1" />
              {template.items?.length || 0} items
            </div>
            <div className="flex items-center">
              <Tag className="h-3 w-3 mr-1" />
              {template.category}
            </div>
            {source === 'similar' && (
              <div className="flex items-center text-blue-600">
                <Calendar className="h-3 w-3 mr-1" />
                From "{template.title}"
              </div>
            )}
          </div>
          
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => handlePreview(template)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleTemplateSelect(template)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            {selectedTemplate?.id === template.id ? 'Selected' : 'Use Template'}
          </button>
        </div>
      </div>
      
      {isExpanded && template.items && (
        <div className="mt-4 border-t pt-4">
          <h4 className="font-medium text-sm text-gray-700 mb-3">Timeline Preview</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {template.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    -{formatTimeOffset(item.timeOffset)}
                  </div>
                  <span className="text-gray-900">{item.text}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.priority && (
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.priority === 'high' 
                        ? 'bg-red-100 text-red-600'
                        : item.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.priority}
                    </span>
                  )}
                  {item.category && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                      {item.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Customization Options */}
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <h5 className="font-medium text-sm text-gray-700 mb-2">Customization Options</h5>
            <div className="space-y-2">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={customizations[template.id]?.adjustTiming || false}
                  onChange={(e) => updateCustomization(template.id, 0, 'adjustTiming', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                Adjust timing for this event
              </label>
              
              {eventData?.is_recurring && (
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={applyToSeries}
                    onChange={(e) => {
                      setApplyToSeries(e.target.checked);
                      onSeriesChange?.(e.target.checked);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  Apply to all future instances in this series
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select Preparation Template</h2>
            <p className="text-gray-600 mt-1">
              Choose a template to guide preparation for: {eventData?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'suggestions'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>AI Suggestions</span>
              {suggestions.length > 0 && (
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                  {suggestions.length}
                </span>
              )}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('similar')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'similar'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Similar Events</span>
              {similarEvents.length > 0 && (
                <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs">
                  {similarEvents.length}
                </span>
              )}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'browse'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Browse All</span>
            </div>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'browse' && (
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          <div className="space-y-4">
            {activeTab === 'suggestions' && (
              <>
                {suggestions.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No AI suggestions available</p>
                    <p>Try browsing all templates or check similar events</p>
                  </div>
                )}
                {suggestions.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    source="suggestion"
                    isExpanded={expandedTemplate === template.id}
                  />
                ))}
              </>
            )}

            {activeTab === 'similar' && (
              <>
                {similarEvents.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No similar events found</p>
                    <p>As you create more events, we'll suggest templates from your successful past events</p>
                  </div>
                )}
                {similarEvents.map(event => (
                  <TemplateCard
                    key={event.template_id}
                    template={event}
                    source="similar"
                    isExpanded={expandedTemplate === event.template_id}
                  />
                ))}
              </>
            )}

            {activeTab === 'browse' && (
              <>
                {templates.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No templates found</p>
                    <p>Try adjusting your search or category filters</p>
                  </div>
                )}
                {templates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    source="template"
                    isExpanded={expandedTemplate === template.id}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={() => {
              // Handle create custom template
              console.log('Create custom template');
            }}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Template</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onTemplateSelect(null)} // Skip template option
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Skip Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;