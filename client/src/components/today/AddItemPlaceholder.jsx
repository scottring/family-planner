import { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  CheckSquare, 
  X,
  Clock,
  MapPin,
  Users
} from 'lucide-react';

const AddItemPlaceholder = ({ 
  onAddEvent, 
  onAddTask, 
  className = '',
  suggestedTime,
  showSuggestions = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [itemType, setItemType] = useState('event'); // 'event' | 'task'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: suggestedTime || '',
    end_time: '',
    location: '',
    type: 'personal'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (itemType === 'event') {
      // Convert datetime-local format to ISO string or use defaults
      const now = new Date();
      let startTime, endTime;
      
      if (formData.start_time) {
        startTime = new Date(formData.start_time).toISOString();
      } else {
        startTime = now.toISOString();
      }
      
      if (formData.end_time) {
        endTime = new Date(formData.end_time).toISOString();
      } else {
        endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour later
      }
      
      onAddEvent && onAddEvent({
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        start_time: startTime,
        end_time: endTime
      });
    } else {
      const dueDate = formData.start_time ? 
        new Date(formData.start_time).toISOString() : 
        new Date().toISOString();
        
      onAddTask && onAddTask({
        title: formData.title.trim(),
        description: formData.description.trim(),
        due_date: dueDate,
        priority: 'medium',
        status: 'pending'
      });
    }

    // Reset form
    setFormData({
      title: '',
      description: '',
      start_time: suggestedTime || '',
      end_time: '',
      location: '',
      type: 'personal'
    });
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      start_time: suggestedTime || '',
      end_time: '',
      location: '',
      type: 'personal'
    });
    setIsExpanded(false);
  };

  const formatTimeForInput = (timeStr) => {
    if (!timeStr) return '';
    // If it's already in datetime-local format (YYYY-MM-DDTHH:mm), return as is
    if (timeStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      return timeStr;
    }
    // Otherwise convert from ISO string to datetime-local format
    try {
      const date = new Date(timeStr);
      return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
    } catch (error) {
      return '';
    }
  };

  if (!isExpanded) {
    return (
      <div className={`group ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center space-x-3 px-4 py-3 h-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-gray-500 hover:text-blue-600"
          aria-label="Add event or task"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current flex-shrink-0">
            <Plus className="w-3 h-3" />
          </div>
          <span className="font-medium text-sm">Add something here</span>
          {suggestedTime && (
            <span className="text-xs opacity-75 ml-auto">
              at {new Date(suggestedTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          )}
        </button>

        {/* Quick suggestions when hovering */}
        {showSuggestions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2">
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => {
                  setItemType('event');
                  setIsExpanded(true);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                <Calendar className="w-4 h-4" />
                <span>Event</span>
              </button>
              <button
                onClick={() => {
                  setItemType('task');
                  setIsExpanded(true);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Task</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 border-blue-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setItemType('event')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  itemType === 'event' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Event</span>
              </button>
              <button
                onClick={() => setItemType('task')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  itemType === 'task' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Task</span>
              </button>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={`${itemType === 'event' ? 'Event' : 'Task'} title...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description (optional)..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Time fields (for events) */}
          {itemType === 'event' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={formatTimeForInput(formData.start_time)}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  step="900"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={formatTimeForInput(formData.end_time)}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  step="900"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Due date (for tasks) */}
          {itemType === 'task' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="datetime-local"
                value={formatTimeForInput(formData.start_time)}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                step="900"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Location (for events) */}
          {itemType === 'event' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Event location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Type/Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="personal">Personal</option>
              <option value="work">Work</option>
              <option value="family">Family</option>
              <option value="school">School</option>
              <option value="sports">Sports</option>
              <option value="medical">Medical</option>
              <option value="social">Social</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim()}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                itemType === 'event'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'
                  : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'
              } disabled:cursor-not-allowed`}
            >
              Create {itemType === 'event' ? 'Event' : 'Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemPlaceholder;