import { useState, useEffect } from 'react';
import { 
  LayoutTemplate, 
  Plus, 
  X, 
  Search, 
  Star,
  Bookmark,
  Edit,
  Trash2,
  Check,
  Filter,
  Sparkles,
  Calendar,
  Users,
  Clock
} from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';

const LogisticsTemplates = ({ event, onApplyTemplate, onClose }) => {
  const { 
    templates, 
    templatesLoading, 
    fetchTemplates, 
    applyTemplate, 
    saveAsTemplate 
  } = useEventStore();
  
  const [activeTab, setActiveTab] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    activity_type: event?.event_type || event?.category || '',
    season: null
  });

  const seasons = [
    { id: 'all', name: 'All Seasons' },
    { id: 'spring', name: 'Spring' },
    { id: 'summer', name: 'Summer' },
    { id: 'fall', name: 'Fall' },
    { id: 'winter', name: 'Winter' }
  ];

  useEffect(() => {
    fetchTemplates(
      event?.event_type || event?.category, 
      selectedSeason === 'all' ? null : selectedSeason
    );
  }, [event, selectedSeason, fetchTemplates]);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.activity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApplyTemplate = async (templateId) => {
    try {
      await applyTemplate(event.id, templateId);
      onApplyTemplate && onApplyTemplate();
      onClose && onClose();
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const handleSaveAsTemplate = async () => {
    try {
      await saveAsTemplate(
        event.id,
        newTemplate.name,
        newTemplate.activity_type,
        newTemplate.season === 'all' ? null : newTemplate.season
      );
      setShowCreateForm(false);
      setNewTemplate({ name: '', activity_type: event?.event_type || event?.category || '', season: null });
      fetchTemplates(); // Refresh templates
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const getActivityIcon = (activityType) => {
    const icons = {
      soccer: '⚽',
      swimming: '🏊',
      school: '🏫',
      medical: '🏥',
      travel: '✈️',
      party: '🎉',
      outdoor: '🌲'
    };
    return icons[activityType] || '📅';
  };

  const getSeasonIcon = (season) => {
    const icons = {
      spring: '🌸',
      summer: '☀️',
      fall: '🍂',
      winter: '❄️'
    };
    return icons[season] || '📅';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutTemplate className="h-6 w-6 text-purple-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Logistics Templates</h2>
                <p className="text-sm text-gray-600">
                  Reuse logistics setups for similar events
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'browse'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="h-4 w-4 inline mr-2" />
            Browse Templates
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'create'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Save as Template
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'browse' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Templates Grid */}
              {templatesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading templates...</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <LayoutTemplate className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || selectedSeason !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Create your first template by switching to the "Save as Template" tab.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <div key={template.id} className="bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getActivityIcon(template.activity_type)}</span>
                            <div>
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              <p className="text-sm text-gray-500 capitalize">
                                {template.activity_type}
                                {template.season && (
                                  <span className="ml-2 inline-flex items-center gap-1">
                                    {getSeasonIcon(template.season)}
                                    {template.season}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                            <Star className="h-3 w-3" />
                            {template.usage_count}
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {template.packing_list.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Packing List ({template.packing_list.length} items)</p>
                              <div className="flex flex-wrap gap-1">
                                {template.packing_list.slice(0, 4).map((item, index) => (
                                  <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    {item}
                                  </span>
                                ))}
                                {template.packing_list.length > 4 && (
                                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                    +{template.packing_list.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {template.contacts.length > 0 && (
                            <p className="text-xs text-gray-600">
                              📞 {template.contacts.length} contacts saved
                            </p>
                          )}

                          {template.weather_dependent && (
                            <p className="text-xs text-blue-600">
                              ☁️ Weather considerations included
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleApplyTemplate(template.id)}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Apply Template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Save Current Setup</h3>
                <p className="text-gray-600 text-sm">
                  Create a template from this event's logistics to reuse for similar events.
                </p>
              </div>

              {/* Event Preview */}
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
                <h4 className="font-medium text-gray-900 mb-2">Current Event</h4>
                <p className="text-sm text-gray-600">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {event?.title}
                </p>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  {event?.packing_list?.length > 0 && (
                    <p>📦 {event.packing_list.length} packing items</p>
                  )}
                  {event?.contacts?.length > 0 && (
                    <p>📞 {event.contacts.length} contacts</p>
                  )}
                  {event?.parking_info && (
                    <p>🚗 Parking info included</p>
                  )}
                </div>
              </div>

              {/* Template Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Soccer Practice Setup"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activity Type *
                  </label>
                  <select
                    value={newTemplate.activity_type}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, activity_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select activity type</option>
                    <option value="soccer">Soccer</option>
                    <option value="swimming">Swimming</option>
                    <option value="school">School</option>
                    <option value="medical">Medical</option>
                    <option value="travel">Travel</option>
                    <option value="party">Party</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Season (Optional)
                  </label>
                  <select
                    value={newTemplate.season || 'all'}
                    onChange={(e) => setNewTemplate(prev => ({ 
                      ...prev, 
                      season: e.target.value === 'all' ? null : e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {seasons.map(season => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={!newTemplate.name || !newTemplate.activity_type}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Bookmark className="h-4 w-4" />
                    Save Template
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    This will save the current event's logistics as a reusable template.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticsTemplates;