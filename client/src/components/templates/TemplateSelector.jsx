import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  Star, 
  Clock, 
  CheckSquare, 
  Plus,
  Sparkles,
  FileText,
  Calendar
} from 'lucide-react';
import { useTemplateStore } from '../../stores/templateStore';
import TemplateCard from './TemplateCard';

const TemplateSelector = ({ 
  phase = 'pre',
  mode, // 'preparation' or 'post-event' - alternative to phase
  event, 
  onSelect,
  onSelectTemplate, // Alternative to onSelect for compatibility
  onClose,
  onCreateNew 
}) => {
  // Convert mode to phase if mode is provided
  const effectivePhase = mode ? (mode === 'preparation' ? 'pre' : 'post') : phase;
  const handleSelect = onSelectTemplate || onSelect;
  const { 
    fetchTemplates, 
    getSuggestedTemplates, 
    getTemplatesByPhase,
    getRecentlyUsedTemplates,
    getMostUsedTemplates,
    getPrebuiltTemplates,
    searchTemplates,
    loading 
  } = useTemplateStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('suggested');
  const [templates, setTemplates] = useState([]);
  const [suggestedTemplates, setSuggestedTemplates] = useState([]);
  const [recentTemplates, setRecentTemplates] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]);

  // Get event type for suggestions
  const eventType = event?.category || event?.type || 
                   (typeof event?.title === 'string' ? event.title.toLowerCase().split(' ')[0] : null) || 
                   'general';

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        // Try to fetch user templates, but don't fail if none exist
        try {
          await fetchTemplates();
        } catch (err) {
          console.log('No user templates found, using prebuilt only');
        }
        
        // Get prebuilt templates first
        const prebuilt = getPrebuiltTemplates().filter(t => 
          t.phase === effectivePhase || t.phase === 'all'
        );
        
        // Get phase-specific templates from store
        const phaseTemplates = getTemplatesByPhase(effectivePhase);
        
        // Get suggested templates based on event type and phase
        const suggested = [...prebuilt].filter(t => 
          t.event_types?.includes(eventType) || t.tags?.includes(eventType)
        );
        setSuggestedTemplates(suggested);
        
        // Get recent templates for this phase
        const recent = getRecentlyUsedTemplates(5).filter(t => 
          t.phase === effectivePhase || t.phase === 'all'
        );
        setRecentTemplates(recent);
        
        // Combine all templates - prebuilt and any user templates
        const combined = [...phaseTemplates, ...prebuilt];
        setAllTemplates(combined);
        setTemplates(combined);

        // Default to suggested if we have any
        if (suggested.length > 0) {
          setActiveTab('suggested');
        } else if (recent.length > 0) {
          setActiveTab('recent');
        } else {
          setActiveTab('all');
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };

    loadTemplates();
  }, [eventType, effectivePhase]);

  // Filter templates based on search
  useEffect(() => {
    if (!searchTerm) {
      switch (activeTab) {
        case 'suggested':
          setTemplates(suggestedTemplates);
          break;
        case 'recent':
          setTemplates(recentTemplates);
          break;
        case 'all':
          setTemplates(allTemplates);
          break;
        default:
          setTemplates(allTemplates);
      }
    } else {
      const filtered = searchTemplates(searchTerm).filter(t => 
        t.phase === phase || t.phase === 'all'
      );
      setTemplates(filtered);
    }
  }, [searchTerm, activeTab, suggestedTemplates, recentTemplates, allTemplates]);

  const handleTemplateSelect = async (template) => {
    if (handleSelect) {
      try {
        await handleSelect(template);
        onClose();
      } catch (error) {
        console.error('Error applying template:', error);
      }
    }
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
    onClose();
  };

  const getPhaseLabel = (phase) => {
    const labels = {
      'pre': 'Pre-Event',
      'during': 'During Event', 
      'post': 'Post-Event',
      'all': 'All Phases'
    };
    return labels[phase] || phase;
  };

  const getPhaseIcon = (phase) => {
    const icons = {
      'pre': '🚀',
      'during': '📋',
      'post': '✅',
      'all': '🔄'
    };
    return icons[phase] || '📋';
  };

  const tabs = [
    { 
      id: 'suggested', 
      label: `Suggested`, 
      count: suggestedTemplates.length,
      icon: Sparkles,
      show: suggestedTemplates.length > 0
    },
    { 
      id: 'recent', 
      label: 'Recent', 
      count: recentTemplates.length,
      icon: Clock,
      show: recentTemplates.length > 0
    },
    { 
      id: 'all', 
      label: 'All Templates', 
      count: allTemplates.length,
      icon: FileText,
      show: true
    }
  ].filter(tab => tab.show);

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="text-2xl mr-3">{getPhaseIcon(effectivePhase)}</span>
              Select {getPhaseLabel(effectivePhase)} Template
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {event ? `For: ${event.title}` : `Choose a template to get started`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search templates..."
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={handleCreateNew}
            className="flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50 border-b-2 border-transparent hover:border-blue-200"
          >
            <Plus className="h-4 w-4" />
            <span>Create New</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No templates match your search' : 'No templates available'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms or browse all templates'
                  : `Create your first ${getPhaseLabel(phase).toLowerCase()} template`}
              </p>
              <button
                onClick={handleCreateNew}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Template</span>
              </button>
            </div>
          ) : (
            <>
              {/* Special section for suggested templates */}
              {activeTab === 'suggested' && suggestedTemplates.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-sm font-semibold text-blue-900">
                      Smart Suggestions for {eventType} events
                    </h3>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">
                    Based on your usage patterns and event type matching
                  </p>
                </div>
              )}

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    viewMode="grid"
                    onApply={handleTemplateSelect}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TemplateSelector;