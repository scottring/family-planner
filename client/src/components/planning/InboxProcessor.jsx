import { useState, useEffect } from 'react';
import {
  Inbox,
  ArrowRight,
  Calendar,
  Square,
  Trash2,
  Hand,
  Clock,
  AlertCircle,
  Filter,
  Check,
  X,
  User,
  Mic,
  Image,
  FileText
} from 'lucide-react';
import { useInboxStore } from '../../stores/inboxStore';
import { useTaskStore } from '../../stores/taskStore';
import { useEventStore } from '../../stores/eventStore';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';

const InboxProcessor = ({ sessionId, onProgress, onComplete }) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [sortBy, setSortBy] = useState('urgency');
  const [filterBy, setFilterBy] = useState('all');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [processingItem, setProcessingItem] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);

  const { user } = useAuthStore();
  const { familyMembers } = useFamilyStore();
  const { 
    items, 
    loading, 
    fetchInboxItems, 
    processInboxItem, 
    deleteInboxItem,
    bulkProcessItems 
  } = useInboxStore();
  const { createTask } = useTaskStore();
  const { createEvent } = useEventStore();

  useEffect(() => {
    fetchInboxItems();
  }, [fetchInboxItems]);

  useEffect(() => {
    // Update progress based on items processed
    const totalItems = items.filter(item => item.status === 'pending').length;
    if (totalItems > 0) {
      const progress = Math.min(processedCount / totalItems, 1);
      onProgress?.(progress);
    }
  }, [processedCount, items, onProgress]);

  const filteredAndSortedItems = items
    .filter(item => {
      if (filterBy === 'urgent') return item.urgency_score >= 4;
      if (filterBy === 'low-urgency') return item.urgency_score < 3;
      if (filterBy === 'voice') return item.input_type === 'voice';
      if (filterBy === 'text') return item.input_type === 'text';
      if (filterBy === 'unclaimed') return !item.claimed_by;
      return item.status === 'pending'; // Show only pending items
    })
    .sort((a, b) => {
      if (sortBy === 'urgency') return b.urgency_score - a.urgency_score;
      if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'type') return a.category?.localeCompare(b.category) || 0;
      return 0;
    });

  const handleItemSelect = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map(item => item.id)));
    }
  };

  const handleClaimItem = async (item) => {
    try {
      // Claim item for current user
      await processInboxItem(item.id, 'claim', { claimed_by: user.id });
      fetchInboxItems();
    } catch (error) {
      console.error('Failed to claim item:', error);
    }
  };

  const handleQuickConvert = async (item, type) => {
    try {
      setProcessingItem(item);
      
      if (type === 'task') {
        await createTask({
          title: item.transcription || item.raw_content,
          description: `Converted from inbox: ${item.raw_content}`,
          priority: item.urgency_score >= 4 ? 'high' : item.urgency_score >= 3 ? 'medium' : 'low',
          assigned_to: item.claimed_by || user.id,
          due_date: item.suggested_date || null,
          category: item.category || 'general',
          source: 'inbox_conversion',
          inbox_item_id: item.id
        });
      } else if (type === 'event') {
        await createEvent({
          title: item.transcription || item.raw_content,
          description: `Converted from inbox: ${item.raw_content}`,
          start_time: item.suggested_date || new Date().toISOString(),
          duration: 60, // Default 1 hour
          assigned_to: item.claimed_by || user.id,
          category: item.category || 'general',
          source: 'inbox_conversion',
          inbox_item_id: item.id
        });
      }

      // Mark as processed
      await processInboxItem(item.id, 'convert', { converted_to: type });
      setProcessedCount(prev => prev + 1);
      fetchInboxItems();
    } catch (error) {
      console.error('Failed to convert item:', error);
    } finally {
      setProcessingItem(null);
    }
  };

  const handleBulkProcess = async (action) => {
    try {
      const selectedItemIds = Array.from(selectedItems);
      
      if (action === 'delete') {
        await Promise.all(selectedItemIds.map(id => deleteInboxItem(id)));
      } else if (action === 'convert-task') {
        await bulkProcessItems(selectedItemIds, 'task');
        setProcessedCount(prev => prev + selectedItemIds.length);
      } else if (action === 'convert-event') {
        await bulkProcessItems(selectedItemIds, 'event');
        setProcessedCount(prev => prev + selectedItemIds.length);
      }

      setSelectedItems(new Set());
      fetchInboxItems();
    } catch (error) {
      console.error('Bulk process failed:', error);
    }
  };

  const getUrgencyBadge = (score) => {
    if (score >= 5) return { color: 'red', label: 'Critical' };
    if (score >= 4) return { color: 'orange', label: 'High' };
    if (score >= 3) return { color: 'yellow', label: 'Medium' };
    if (score >= 2) return { color: 'blue', label: 'Low' };
    return { color: 'gray', label: 'Minimal' };
  };

  const getInputTypeIcon = (type) => {
    switch (type) {
      case 'voice': return Mic;
      case 'image': return Image;
      case 'text': return FileText;
      default: return FileText;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const pendingItems = items.filter(item => item.status === 'pending');
  const completionRate = pendingItems.length > 0 
    ? Math.round((processedCount / (processedCount + pendingItems.length)) * 100)
    : 100;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Inbox Processing</h3>
          <p className="text-gray-600">Convert inbox items to tasks and events</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            {processedCount} processed • {pendingItems.length} remaining
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            completionRate >= 80 ? 'bg-green-100 text-green-800' :
            completionRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {completionRate}% complete
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="urgency">Sort by Urgency</option>
            <option value="date">Sort by Date</option>
            <option value="type">Sort by Type</option>
          </select>

          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Items</option>
            <option value="urgent">Urgent Only</option>
            <option value="low-urgency">Low Urgency</option>
            <option value="voice">Voice Notes</option>
            <option value="text">Text Items</option>
            <option value="unclaimed">Unclaimed</option>
          </select>

          <Filter className="h-5 w-5 text-gray-400" />
        </div>

        {selectedItems.size > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{selectedItems.size} selected</span>
            <button
              onClick={() => handleBulkProcess('convert-task')}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm font-medium"
            >
              → Tasks
            </button>
            <button
              onClick={() => handleBulkProcess('convert-event')}
              className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm font-medium"
            >
              → Events
            </button>
            <button
              onClick={() => handleBulkProcess('delete')}
              className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 text-sm"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Select All */}
      {filteredAndSortedItems.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            {selectedItems.size === filteredAndSortedItems.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-gray-500">
            Showing {filteredAndSortedItems.length} items
          </span>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h4>
            <p className="text-gray-600">
              {items.length === 0 
                ? 'No inbox items to process.' 
                : 'All items have been processed. Great work!'
              }
            </p>
          </div>
        ) : (
          filteredAndSortedItems.map((item) => {
            const urgencyBadge = getUrgencyBadge(item.urgency_score);
            const InputIcon = getInputTypeIcon(item.input_type);
            const isSelected = selectedItems.has(item.id);
            const isProcessing = processingItem?.id === item.id;
            
            return (
              <div
                key={item.id}
                className={`
                  border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all
                  ${isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : 'bg-white'}
                  ${isProcessing ? 'opacity-50' : ''}
                `}
              >
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  <button
                    onClick={() => handleItemSelect(item.id)}
                    disabled={isProcessing}
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center mt-1
                      ${isSelected
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-gray-300 hover:border-gray-400'
                      }
                    `}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center space-x-2 mb-2">
                      <InputIcon className="h-4 w-4 text-gray-400" />
                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${urgencyBadge.color}-100 text-${urgencyBadge.color}-800`}>
                        {urgencyBadge.label}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.created_at)}
                      </span>
                      {item.category && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full capitalize">
                          {item.category}
                        </span>
                      )}
                      {item.claimed_by && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600">
                          <User className="h-3 w-3" />
                          <span>Claimed</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="mb-3">
                      <p className="text-gray-900 line-clamp-2">
                        {item.transcription || item.raw_content}
                      </p>
                      {item.ai_suggestions && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>AI Suggestion:</strong> {item.ai_suggestions}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {!item.claimed_by ? (
                        <button
                          onClick={() => handleClaimItem(item)}
                          disabled={isProcessing}
                          className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 text-sm font-medium disabled:opacity-50"
                        >
                          <Hand className="h-3 w-3" />
                          <span>Claim</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleQuickConvert(item, 'task')}
                            disabled={isProcessing}
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm font-medium disabled:opacity-50"
                          >
                            <Square className="h-3 w-3" />
                            <span>→ Task</span>
                          </button>
                          
                          <button
                            onClick={() => handleQuickConvert(item, 'event')}
                            disabled={isProcessing}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm font-medium disabled:opacity-50"
                          >
                            <Calendar className="h-3 w-3" />
                            <span>→ Event</span>
                          </button>

                          {item.suggested_date && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-50 text-yellow-800 rounded text-xs">
                              <Clock className="h-3 w-3" />
                              <span>Due: {new Date(item.suggested_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => deleteInboxItem(item.id)}
                        disabled={isProcessing}
                        className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 text-sm disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="flex items-center justify-center w-6 h-6">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Process all inbox items by converting them to actionable tasks and events
        </div>
        <button
          onClick={onComplete}
          disabled={pendingItems.length > 0}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${pendingItems.length === 0
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {pendingItems.length > 0 
            ? `${pendingItems.length} items remaining`
            : 'Complete Processing'
          }
        </button>
      </div>

      {/* Processing Stats */}
      {(processedCount > 0 || pendingItems.length === 0) && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Check className="h-5 w-5 text-purple-600" />
            <div>
              <h4 className="font-medium text-purple-900">Processing Progress</h4>
              <p className="text-sm text-purple-700">
                {processedCount > 0 && `${processedCount} items processed successfully. `}
                {pendingItems.length === 0 
                  ? 'All inbox items have been processed!'
                  : `${pendingItems.length} items remaining to process.`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxProcessor;