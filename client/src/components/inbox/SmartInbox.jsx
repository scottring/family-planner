import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter,
  Check,
  X,
  Clock,
  Calendar,
  List,
  Trash2,
  Archive,
  AlertTriangle
} from 'lucide-react';
import { useInboxStore } from '../../stores/inboxStore';
import VoiceCapture from './VoiceCapture';

const SmartInbox = () => {
  const [currentView, setCurrentView] = useState('urgent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    inputType: 'all',
    status: 'all'
  });

  const { 
    items, 
    loading, 
    error,
    fetchInboxItems,
    processInboxItem,
    deleteInboxItem,
    archiveInboxItem,
    snoozeInboxItem
  } = useInboxStore();

  useEffect(() => {
    fetchInboxItems();
  }, [fetchInboxItems]);

  const views = [
    { id: 'urgent', name: 'Urgent', icon: AlertTriangle, color: 'red' },
    { id: 'thisweek', name: 'This Week', icon: Calendar, color: 'blue' },
    { id: 'everything', name: 'Everything', icon: List, color: 'gray' }
  ];

  const filteredItems = items.filter(item => {
    // Text search
    if (searchQuery && !item.raw_content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.transcription?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter by category
    if (filters.category !== 'all' && item.category !== filters.category) {
      return false;
    }

    // Filter by input type
    if (filters.inputType !== 'all' && item.input_type !== filters.inputType) {
      return false;
    }

    // Filter by status
    if (filters.status !== 'all' && item.status !== filters.status) {
      return false;
    }

    // View-specific filtering
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const createdAt = new Date(item.created_at);

    switch (currentView) {
      case 'urgent':
        return item.urgency_score >= 4;
      case 'thisweek':
        return createdAt >= now && createdAt <= weekFromNow;
      case 'everything':
      default:
        return true;
    }
  });

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)));
    setShowBulkActions(true);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  const handleBulkAction = async (action) => {
    const selectedItemIds = Array.from(selectedItems);
    
    try {
      switch (action) {
        case 'delete':
          await Promise.all(selectedItemIds.map(id => deleteInboxItem(id)));
          break;
        case 'archive':
          await Promise.all(selectedItemIds.map(id => archiveInboxItem(id)));
          break;
        case 'snooze':
          const snoozeUntil = new Date();
          snoozeUntil.setHours(snoozeUntil.getHours() + 24);
          await Promise.all(selectedItemIds.map(id => snoozeInboxItem(id, snoozeUntil)));
          break;
      }
      
      deselectAll();
      fetchInboxItems(); // Refresh the list
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleConvertToEvent = async (item) => {
    try {
      await processInboxItem(item.id, 'event');
      fetchInboxItems();
    } catch (error) {
      console.error('Failed to convert to event:', error);
    }
  };

  const handleConvertToTask = async (item) => {
    try {
      await processInboxItem(item.id, 'task');
      fetchInboxItems();
    } catch (error) {
      console.error('Failed to convert to task:', error);
    }
  };

  const getUrgencyColor = (score) => {
    if (score >= 5) return 'bg-red-500';
    if (score >= 4) return 'bg-orange-500';
    if (score >= 3) return 'bg-yellow-500';
    if (score >= 2) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Smart Inbox</h1>
        <p className="text-gray-600">Capture, organize, and process your thoughts and tasks</p>
      </div>

      {/* Voice Capture */}
      <div className="mb-6">
        <VoiceCapture 
          onCapture={() => fetchInboxItems()}
          className="max-w-md mx-auto"
        />
      </div>

      {/* View Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {views.map(view => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`
                  flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-4 h-4 mr-2" />
                {view.name}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {filteredItems.length}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inbox items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Categories</option>
                <option value="task">Tasks</option>
                <option value="event">Events</option>
                <option value="note">Notes</option>
                <option value="reminder">Reminders</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Type</label>
              <select
                value={filters.inputType}
                onChange={(e) => setFilters({...filters, inputType: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Types</option>
                <option value="voice">Voice</option>
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processed">Processed</option>
                <option value="converted">Converted</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.size} items selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('snooze')}
                className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
              >
                Snooze 24h
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Delete
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      {filteredItems.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            {selectedItems.size > 0 && (
              <button
                onClick={deselectAll}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Deselect All
              </button>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {filteredItems.length} items
          </span>
        </div>
      )}

      {/* Items List */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <List className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500">
              {currentView === 'urgent' && 'No urgent items in your inbox.'}
              {currentView === 'thisweek' && 'No items from this week.'}
              {currentView === 'everything' && 'Your inbox is empty. Start by adding a voice note!'}
            </p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              className={`
                border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow
                ${selectedItems.has(item.id) ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}
              `}
            >
              <div className="flex items-start space-x-4">
                {/* Selection Checkbox */}
                <button
                  onClick={() => toggleItemSelection(item.id)}
                  className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center mt-1
                    ${selectedItems.has(item.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  {selectedItems.has(item.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${getUrgencyColor(item.urgency_score)}`}></div>
                    <span className="text-xs text-gray-500 capitalize">
                      {item.input_type}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(item.created_at)}
                    </span>
                    {item.category && (
                      <>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full capitalize">
                          {item.category}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Content */}
                  <div className="mb-3">
                    <p className="text-gray-900 line-clamp-3">
                      {item.transcription || item.raw_content}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleConvertToEvent(item)}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm font-medium"
                    >
                      → Event
                    </button>
                    <button
                      onClick={() => handleConvertToTask(item)}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm font-medium"
                    >
                      → Task
                    </button>
                    <button
                      onClick={() => snoozeInboxItem(item.id, new Date(Date.now() + 24 * 60 * 60 * 1000))}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 text-sm"
                    >
                      <Clock className="w-4 h-4 inline mr-1" />
                      Snooze
                    </button>
                    <button
                      onClick={() => archiveInboxItem(item.id)}
                      className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
                    >
                      <Archive className="w-4 h-4 inline mr-1" />
                      Archive
                    </button>
                    <button
                      onClick={() => deleteInboxItem(item.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 text-sm"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SmartInbox;