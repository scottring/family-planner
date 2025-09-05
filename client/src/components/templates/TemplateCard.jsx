import { useState } from 'react';
import { 
  Clock, 
  CheckSquare, 
  Star, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  Play,
  Calendar,
  Tag,
  Users
} from 'lucide-react';
import { useTemplateStore } from '../../stores/templateStore';

const TemplateCard = ({ template, viewMode = 'grid', onEdit, onApply }) => {
  const { deleteTemplate, applyTemplateToEvent } = useTemplateStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTemplate(template.id);
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = () => {
    if (onEdit) {
      // Create a copy with modified name
      const duplicatedTemplate = {
        ...template,
        id: null, // Remove ID so it creates new
        name: `${template.name} (Copy)`,
        usage_count: 0,
        last_used: null
      };
      onEdit(duplicatedTemplate);
    }
    setShowMenu(false);
  };

  const handleApply = () => {
    if (onApply) {
      onApply(template);
    }
    setShowMenu(false);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'preparation': 'bg-blue-100 text-blue-800 border-blue-200',
      'during': 'bg-green-100 text-green-800 border-green-200',
      'follow-up': 'bg-purple-100 text-purple-800 border-purple-200',
      'routine': 'bg-orange-100 text-orange-800 border-orange-200',
      'sop': 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPhaseColor = (phase) => {
    const colors = {
      'pre': 'text-blue-600',
      'during': 'text-green-600',
      'post': 'text-purple-600',
      'all': 'text-gray-600'
    };
    return colors[phase] || 'text-gray-600';
  };

  const isPrebuilt = typeof template.id === 'string' && template.id.includes('-');

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Icon and Basic Info */}
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{template.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                  <span className={`text-xs ${getPhaseColor(template.phase)}`}>
                    {template.phase} phase
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <CheckSquare className="h-4 w-4" />
                <span>{template.items?.length || 0} items</span>
              </div>
              {template.estimated_time > 0 && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(template.estimated_time)}</span>
                </div>
              )}
              {template.usage_count > 0 && (
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span>{template.usage_count} uses</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {onApply && (
              <button
                onClick={handleApply}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                Apply
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      onEdit?.(template);
                      setShowMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 className="h-4 w-4 inline mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="h-4 w-4 inline mr-2" />
                    Duplicate
                  </button>
                  {!isPrebuilt && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 inline mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 4 && (
              <span className="text-xs text-gray-500">
                +{template.tags.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 group">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{template.icon}</span>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(template.category)}`}>
                {template.category}
              </span>
              {template.usage_count > 0 && (
                <div className="flex items-center space-x-1 text-xs text-yellow-600">
                  <Star className="h-3 w-3" />
                  <span>{template.usage_count}</span>
                </div>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                <button
                  onClick={() => {
                    onEdit?.(template);
                    setShowMenu(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4 inline mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDuplicate}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4 inline mr-2" />
                  Duplicate
                </button>
                {!isPrebuilt && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 inline mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{template.name}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {template.description || `Template with ${template.items?.length || 0} items`}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <CheckSquare className="h-4 w-4" />
              <span>{template.items?.length || 0} items</span>
            </div>
            {template.estimated_time > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(template.estimated_time)}</span>
              </div>
            )}
          </div>
          <span className={`text-xs font-medium ${getPhaseColor(template.phase)}`}>
            {template.phase} phase
          </span>
        </div>

        {/* Items Preview */}
        {template.items && template.items.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2">Preview:</div>
            <div className="space-y-1">
              {template.items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="line-clamp-1">{item.text || item.activity || item}</span>
                </div>
              ))}
              {template.items.length > 3 && (
                <div className="text-xs text-gray-500 pl-3.5">
                  +{template.items.length - 3} more items
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Last Used */}
        {template.last_used && (
          <div className="text-xs text-gray-500 mb-4">
            Last used: {new Date(template.last_used).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => onEdit?.(template)}
          className="text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          View Details
        </button>
        {onApply && (
          <button
            onClick={handleApply}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium flex items-center space-x-1"
          >
            <Play className="h-3 w-3" />
            <span>Apply</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TemplateCard;