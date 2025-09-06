import { useState, useEffect } from 'react';
import { 
  Car, 
  ShoppingCart, 
  Users, 
  Video, 
  Package,
  Phone,
  Mail,
  FileText,
  Plus,
  Search,
  X,
  Sparkles,
  Star,
  Clock
} from 'lucide-react';

// Available line item template types
const LINE_ITEM_TEMPLATES = [
  {
    id: 'driving',
    type: 'driving',
    name: 'Driving Task',
    description: 'Plan route with navigation and stops',
    icon: Car,
    color: 'blue',
    category: 'transportation'
  },
  {
    id: 'shopping',
    type: 'shopping',
    name: 'Shopping List',
    description: 'Create a shopping list with items and stores',
    icon: ShoppingCart,
    color: 'green',
    category: 'errands'
  },
  {
    id: 'pickup',
    type: 'pickup',
    name: 'Pickup/Dropoff',
    description: 'Coordinate pickup and dropoff arrangements',
    icon: Users,
    color: 'orange',
    category: 'transportation'
  },
  {
    id: 'meeting',
    type: 'meeting',
    name: 'Meeting Prep',
    description: 'Prepare for virtual or in-person meetings',
    icon: Video,
    color: 'purple',
    category: 'preparation'
  },
  {
    id: 'packing',
    type: 'packing',
    name: 'Packing List',
    description: 'Create a packing checklist',
    icon: Package,
    color: 'indigo',
    category: 'preparation'
  },
  {
    id: 'calls',
    type: 'calls',
    name: 'Phone Calls',
    description: 'Track important calls to make',
    icon: Phone,
    color: 'teal',
    category: 'communication'
  },
  {
    id: 'emails',
    type: 'emails',
    name: 'Email Tasks',
    description: 'Manage email tasks and follow-ups',
    icon: Mail,
    color: 'pink',
    category: 'communication'
  },
  {
    id: 'documents',
    type: 'documents',
    name: 'Document Prep',
    description: 'Prepare necessary documents',
    icon: FileText,
    color: 'gray',
    category: 'preparation'
  }
];

// Custom templates from localStorage
const getCustomLineItemTemplates = () => {
  try {
    const stored = localStorage.getItem('custom-line-item-templates');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading custom templates:', error);
    return [];
  }
};

const saveCustomLineItemTemplates = (templates) => {
  try {
    localStorage.setItem('custom-line-item-templates', JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving custom templates:', error);
  }
};

const LineItemTemplateSelector = ({ onSelect, onClose, showCreateNew = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customTemplates, setCustomTemplates] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    type: '',
    category: 'custom',
    icon: 'Sparkles',
    color: 'purple'
  });

  useEffect(() => {
    setCustomTemplates(getCustomLineItemTemplates());
  }, []);

  const categories = [
    { id: 'all', name: 'All Templates' },
    { id: 'transportation', name: 'Transportation' },
    { id: 'errands', name: 'Errands' },
    { id: 'preparation', name: 'Preparation' },
    { id: 'communication', name: 'Communication' },
    { id: 'custom', name: 'Custom' }
  ];

  const allTemplates = [...LINE_ITEM_TEMPLATES, ...customTemplates];

  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template) => {
    onSelect({
      type: template.type,
      templateType: template.type,
      templateData: template.defaultData || {},
      name: template.name,
      description: template.description
    });
  };

  const handleCreateCustom = () => {
    if (!newTemplate.name || !newTemplate.type) {
      alert('Please provide a name and type for the template');
      return;
    }

    const customTemplate = {
      ...newTemplate,
      id: `custom-${Date.now()}`,
      isCustom: true
    };

    const updatedCustomTemplates = [...customTemplates, customTemplate];
    setCustomTemplates(updatedCustomTemplates);
    saveCustomLineItemTemplates(updatedCustomTemplates);
    
    setShowCreateModal(false);
    setNewTemplate({
      name: '',
      description: '',
      type: '',
      category: 'custom',
      icon: 'Sparkles',
      color: 'purple'
    });
    
    handleSelectTemplate(customTemplate);
  };

  const getIconComponent = (template) => {
    if (template.icon && typeof template.icon === 'function') {
      const IconComponent = template.icon;
      return <IconComponent className="h-5 w-5" />;
    }
    
    // Default icon for custom templates
    return <Sparkles className="h-5 w-5" />;
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      teal: 'bg-teal-100 text-teal-700 border-teal-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Task Template</h2>
              <p className="text-sm text-gray-500 mt-1">Choose a template to quickly add common tasks</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Template Grid */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-lg hover:scale-105 ${getColorClasses(template.color)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-white bg-opacity-50 rounded-lg">
                    {getIconComponent(template)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      {template.name}
                      {template.isCustom && (
                        <Star className="h-3 w-3 fill-current" />
                      )}
                    </h3>
                    <p className="text-sm opacity-80 mt-1">{template.description}</p>
                  </div>
                </div>
              </button>
            ))}

            {/* Create New Template Button */}
            {showCreateNew && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-4 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all hover:shadow-lg"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <Plus className="h-8 w-8 mb-2" />
                  <span className="font-medium">Create Custom</span>
                  <span className="text-xs mt-1">Define your own template</span>
                </div>
              </button>
            )}
          </div>

          {filteredTemplates.length === 0 && !showCreateNew && (
            <div className="text-center py-12">
              <p className="text-gray-500">No templates found matching your search.</p>
            </div>
          )}
        </div>

        {/* Create Custom Template Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Create Custom Template</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Equipment Check"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type (identifier)
                  </label>
                  <input
                    type="text"
                    value={newTemplate.type}
                    onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., equipment_check"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Brief description of the template"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <select
                    value={newTemplate.color}
                    onChange={(e) => setNewTemplate({ ...newTemplate, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="orange">Orange</option>
                    <option value="purple">Purple</option>
                    <option value="indigo">Indigo</option>
                    <option value="teal">Teal</option>
                    <option value="pink">Pink</option>
                    <option value="gray">Gray</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustom}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineItemTemplateSelector;