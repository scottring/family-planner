import { useState, useEffect } from 'react';
import { useTemplateStore } from '../stores/templateStore';
import { 
  Search, 
  Filter, 
  Plus,
  Grid3X3,
  List,
  FileText,
  Clock,
  Star,
  TrendingUp,
  Calendar,
  CheckSquare,
  Rocket,
  RotateCcw,
  BookOpen,
  Users,
  ChevronDown
} from 'lucide-react';
import TemplateCard from '../components/templates/TemplateCard';
import TemplateEditor from '../components/templates/TemplateEditor';

const TemplatesPage = () => {
  const {
    templates,
    categories,
    phases,
    loading,
    error,
    statistics,
    fetchTemplates,
    fetchStatistics,
    searchTemplates,
    getMostUsedTemplates,
    getRecentlyUsedTemplates,
    getPrebuiltTemplates
  } = useTemplateStore();

  // UI State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('usage_count');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Category configurations
  const categoryConfigs = [
    { id: 'all', name: 'All Templates', icon: FileText, color: 'gray' },
    { id: 'preparation', name: 'Pre-Event', icon: Rocket, color: 'blue' },
    { id: 'during', name: 'During Event', icon: CheckSquare, color: 'green' },
    { id: 'follow-up', name: 'Post-Event', icon: Calendar, color: 'purple' },
    { id: 'routine', name: 'Daily Routines', icon: RotateCcw, color: 'orange' },
    { id: 'sop', name: 'SOPs', icon: BookOpen, color: 'indigo' }
  ];

  // Load templates and statistics on mount
  useEffect(() => {
    fetchTemplates();
    fetchStatistics();
  }, [fetchTemplates, fetchStatistics]);

  // Filter templates based on current selections
  const getFilteredTemplates = () => {
    let filtered = templates;
    
    // Combine user templates with prebuilt templates
    const prebuiltTemplates = getPrebuiltTemplates();
    filtered = [...filtered, ...prebuiltTemplates];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (selectedPhase !== 'all') {
      filtered = filtered.filter(t => t.phase === selectedPhase || t.phase === 'all');
    }

    if (searchTerm) {
      filtered = searchTemplates(searchTerm).filter(t => 
        filtered.some(ft => ft.id === t.id)
      );
    }

    // Sort templates
    filtered.sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    // Refresh templates after editing
    fetchTemplates();
  };

  const getCategoryConfig = (categoryId) => {
    return categoryConfigs.find(c => c.id === categoryId) || categoryConfigs[0];
  };

  const filteredTemplates = getFilteredTemplates();
  const mostUsed = getMostUsedTemplates(3);
  const recentlyUsed = getRecentlyUsedTemplates(3);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FileText className="h-8 w-8 mr-3 text-blue-600" />
              Templates & Checklists
            </h1>
            <p className="text-gray-600 mt-2">
              Manage reusable templates for events, routines, and standard procedures
            </p>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>New Template</span>
          </button>
        </div>

        {/* Quick Stats */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Total Templates</p>
                  <p className="text-lg font-semibold">{statistics.total_templates}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Total Uses</p>
                  <p className="text-lg font-semibold">{statistics.total_applications}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Used This Month</p>
                  <p className="text-lg font-semibold">{statistics.used_this_month}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Avg Usage</p>
                  <p className="text-lg font-semibold">{Math.round(statistics.avg_usage_per_template || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Access Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Most Used Templates */}
        {mostUsed.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="h-5 w-5 text-yellow-600 mr-2" />
              Most Used
            </h3>
            <div className="space-y-3">
              {mostUsed.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">{template.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-600">{template.usage_count} uses</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Used Templates */}
        {recentlyUsed.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 text-green-600 mr-2" />
              Recently Used
            </h3>
            <div className="space-y-3">
              {recentlyUsed.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">{template.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(template.last_used).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search templates..."
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categoryConfigs.map((config) => {
              const IconComponent = config.icon;
              const isSelected = selectedCategory === config.id;
              
              return (
                <button
                  key={config.id}
                  onClick={() => setSelectedCategory(config.id)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isSelected
                      ? `bg-${config.color}-100 text-${config.color}-800`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{config.name}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <Filter className="h-4 w-4" />
            <span>Advanced Filters</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Phases</option>
                  <option value="pre">Pre-Event</option>
                  <option value="during">During Event</option>
                  <option value="post">Post-Event</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="usage_count">Most Used</option>
                  <option value="last_used">Recently Used</option>
                  <option value="name">Alphabetical</option>
                  <option value="created_at">Date Created</option>
                  <option value="estimated_time">Duration</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">High to Low</option>
                  <option value="asc">Low to High</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Templates Grid/List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium">Error loading templates</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => fetchTemplates()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search terms or filters' : 'Create your first template to get started'}
          </p>
          <button
            onClick={handleCreateTemplate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              viewMode={viewMode}
              onEdit={handleEditTemplate}
            />
          ))}
        </div>
      )}

      {/* Template Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
};

export default TemplatesPage;