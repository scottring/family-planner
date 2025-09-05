import { useState } from 'react';
import { 
  CheckCircle, 
  Circle, 
  ChevronDown, 
  ChevronRight, 
  Clock,
  AlertCircle,
  Plus,
  X,
  Edit3,
  Trash2
} from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
import { useTaskStore } from '../../stores/taskStore';

const ChecklistComponent = ({ 
  event,
  type = 'before', // 'before' | 'during' | 'after'
  isToggleable = false,
  isCollapsed: initialCollapsed = false,
  className = '',
  onToggleComplete,
  onAddItem,
  onEditItem,
  onDeleteItem
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed && isToggleable);
  const [newItemText, setNewItemText] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editText, setEditText] = useState('');
  
  const { updateChecklistCompletion } = useEventStore();
  const { toggleTaskComplete, updateTask } = useTaskStore();

  // Get checklist items based on type
  const getChecklistItems = () => {
    if (!event) return [];
    
    // Helper to ensure we always return an array
    const ensureArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };
    
    switch (type) {
      case 'before':
        return ensureArray(event.preparation_checklist || event.checklist);
      case 'during':
        return ensureArray(event.during_checklist);
      case 'after':
        return ensureArray(event.after_checklist || event.followup_checklist);
      default:
        return [];
    }
  };

  const items = getChecklistItems();
  const completedCount = items.filter(item => item.completed).length;

  const getTypeConfig = () => {
    switch (type) {
      case 'before':
        return {
          title: 'Before Event',
          icon: Clock,
          color: 'blue',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
      case 'during':
        return {
          title: 'During Event',
          icon: AlertCircle,
          color: 'orange',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600'
        };
      case 'after':
        return {
          title: 'After Event',
          icon: CheckCircle,
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        };
      default:
        return {
          title: 'Checklist',
          icon: Circle,
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getTypeConfig();

  const handleToggleComplete = async (itemId, currentCompleted) => {
    const newCompleted = !currentCompleted;
    
    // Optimistic update
    if (onToggleComplete) {
      onToggleComplete(itemId, newCompleted);
    }

    try {
      // Update in the appropriate store
      if (event.id) {
        await updateChecklistCompletion(event.id, itemId, newCompleted);
      }
    } catch (error) {
      console.error('Error updating checklist completion:', error);
      // Revert optimistic update
      if (onToggleComplete) {
        onToggleComplete(itemId, currentCompleted);
      }
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    const newItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
      completed: false,
      type,
      created_at: new Date().toISOString()
    };

    if (onAddItem) {
      onAddItem(newItem);
    }

    setNewItemText('');
    setIsAddingItem(false);
  };

  const handleEditItem = async (itemId, newText) => {
    if (!newText.trim()) return;

    if (onEditItem) {
      onEditItem(itemId, newText.trim());
    }

    setEditingItemId(null);
    setEditText('');
  };

  const handleDeleteItem = async (itemId) => {
    if (onDeleteItem) {
      onDeleteItem(itemId);
    }
  };

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditText(item.text);
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditText('');
  };

  if (items.length === 0 && !isAddingItem) {
    return (
      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <config.icon className={`h-5 w-5 ${config.iconColor}`} />
            <span className={`font-medium ${config.textColor}`}>{config.title}</span>
          </div>
          <button
            onClick={() => setIsAddingItem(true)}
            className={`p-1 rounded-lg hover:bg-${config.color}-100 ${config.iconColor} transition-colors`}
            title={`Add ${config.title.toLowerCase()} item`}
            aria-label={`Add ${config.title.toLowerCase()} item`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className={`text-sm ${config.textColor} opacity-75 mt-2`}>
          No items yet. Click + to add one.
        </p>
      </div>
    );
  }

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isToggleable && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`p-1 rounded-lg hover:bg-${config.color}-100 transition-colors`}
                aria-label={isCollapsed ? 'Expand checklist' : 'Collapse checklist'}
              >
                {isCollapsed ? (
                  <ChevronRight className={`h-4 w-4 ${config.iconColor}`} />
                ) : (
                  <ChevronDown className={`h-4 w-4 ${config.iconColor}`} />
                )}
              </button>
            )}
            <config.icon className={`h-5 w-5 ${config.iconColor}`} />
            <span className={`font-medium ${config.textColor}`}>{config.title}</span>
            {items.length > 0 && (
              <span className={`text-sm ${config.textColor} opacity-75`}>
                ({completedCount}/{items.length})
              </span>
            )}
          </div>
          <button
            onClick={() => setIsAddingItem(true)}
            className={`p-1 rounded-lg hover:bg-${config.color}-100 ${config.iconColor} transition-colors`}
            title={`Add ${config.title.toLowerCase()} item`}
            aria-label={`Add ${config.title.toLowerCase()} item`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mt-3">
            <div className={`w-full bg-${config.color}-200 rounded-full h-2`}>
              <div
                className={`bg-${config.color}-600 h-2 rounded-full transition-all duration-300`}
                style={{ width: `${(completedCount / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-${config.color}-100 transition-colors group`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleComplete(item.id, item.completed)}
                  className="transition-colors"
                  aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {item.completed ? (
                    <CheckCircle className={`h-5 w-5 text-${config.color}-600`} />
                  ) : (
                    <Circle className={`h-5 w-5 text-gray-400 hover:text-${config.color}-600`} />
                  )}
                </button>

                {/* Item text */}
                <div className="flex-1 min-w-0">
                  {editingItemId === item.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditItem(item.id, editText);
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        onBlur={() => handleEditItem(item.id, editText)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditItem(item.id, editText)}
                        className={`p-1 text-${config.color}-600 hover:bg-${config.color}-100 rounded`}
                        title="Save"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-sm ${item.completed ? 'line-through text-gray-500' : config.textColor} cursor-pointer`}
                      onClick={() => startEditing(item)}
                    >
                      {item.text}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {editingItemId !== item.id && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(item)}
                      className={`p-1 text-gray-400 hover:text-${config.color}-600 rounded`}
                      title="Edit item"
                      aria-label="Edit item"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete item"
                      aria-label="Delete item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add new item */}
            {isAddingItem && (
              <div className={`flex items-center space-x-3 p-2 rounded-lg bg-${config.color}-100`}>
                <Circle className={`h-5 w-5 text-gray-400`} />
                <div className="flex-1 flex items-center space-x-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddItem();
                      } else if (e.key === 'Escape') {
                        setIsAddingItem(false);
                        setNewItemText('');
                      }
                    }}
                    placeholder={`Add ${config.title.toLowerCase()} item...`}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                    className={`p-1 text-${config.color}-600 hover:bg-${config.color}-200 rounded disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Add item"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingItem(false);
                      setNewItemText('');
                    }}
                    className="p-1 text-gray-400 hover:bg-gray-200 rounded"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistComponent;