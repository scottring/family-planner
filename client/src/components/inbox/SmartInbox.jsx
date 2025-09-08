import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter,
  Clock,
  Trash2,
  Archive,
  AlertTriangle,
  Inbox,
  ChevronRight,
  Mic,
  Type,
  Image,
  Sparkles,
  Send,
  CheckSquare
} from 'lucide-react';
import { useInboxStore } from '../../stores/inboxStore';
import { useNavigate } from 'react-router-dom';
import VoiceCapture from './VoiceCapture';

const SmartInbox = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captureMode, setCaptureMode] = useState('text'); // 'text' or 'voice'
  const [filters, setFilters] = useState({
    urgency: 'all',
    inputType: 'all',
    timeframe: 'all'
  });

  const { 
    items, 
    loading, 
    error,
    fetchInboxItems,
    addInboxItem,
    deleteInboxItem,
    archiveInboxItem,
    snoozeInboxItem
  } = useInboxStore();

  useEffect(() => {
    fetchInboxItems();
  }, [fetchInboxItems]);

  // Filter only unprocessed items (captured state)
  const capturedItems = items.filter(item => 
    item.status === 'pending' || item.status === 'snoozed'
  );

  const filteredItems = capturedItems.filter(item => {
    // Text search
    if (searchQuery && !item.raw_content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.transcription?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter by urgency
    if (filters.urgency !== 'all') {
      if (filters.urgency === 'urgent' && item.urgency_score < 4) return false;
      if (filters.urgency === 'normal' && (item.urgency_score < 2 || item.urgency_score > 3)) return false;
      if (filters.urgency === 'low' && item.urgency_score > 2) return false;
    }

    // Filter by input type
    if (filters.inputType !== 'all' && item.input_type !== filters.inputType) {
      return false;
    }

    // Filter by timeframe
    if (filters.timeframe !== 'all') {
      const now = new Date();
      const createdAt = new Date(item.created_at);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      if (filters.timeframe === 'today' && createdAt < dayAgo) return false;
      if (filters.timeframe === 'week' && createdAt < weekAgo) return false;
    }

    return true;
  });

  const handleSnooze = async (item) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    await snoozeInboxItem(item.id, tomorrow);
    fetchInboxItems();
  };

  const handleDelete = async (item) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteInboxItem(item.id);
      fetchInboxItems();
    }
  };

  const handleArchive = async (item) => {
    await archiveInboxItem(item.id);
    fetchInboxItems();
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addInboxItem({
        raw_content: textInput,
        input_type: 'text'
      });
      setTextInput('');
      fetchInboxItems();
    } catch (error) {
      console.error('Failed to add text item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToTasks = () => {
    // Navigate to unified task manager
    navigate('/task-manager');
  };

  const getUrgencyColor = (score) => {
    if (score >= 4) return 'text-red-600 bg-red-50';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getInputTypeIcon = (type) => {
    switch (type) {
      case 'voice': return <Mic className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <Inbox className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Inbox className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Inbox</h1>
              <p className="text-sm text-gray-600 mt-1">
                Capture ideas and thoughts • {capturedItems.length} items to process
              </p>
            </div>
          </div>
          
          {/* Go to Tasks Button - Primary Action */}
          {capturedItems.length > 0 && (
            <button
              onClick={goToTasks}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <CheckSquare className="w-5 h-5 mr-2" />
              Go to Tasks ({capturedItems.length} to process)
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>

        {/* Capture Input - Text or Voice */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          {/* Mode Toggle */}
          <div className="flex items-center justify-center mb-4 bg-white/50 rounded-lg p-1 max-w-xs mx-auto">
            <button
              onClick={() => setCaptureMode('text')}
              className={`flex items-center px-4 py-2 rounded-md transition-all ${
                captureMode === 'text' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Type className="w-4 h-4 mr-2" />
              Text
            </button>
            <button
              onClick={() => setCaptureMode('voice')}
              className={`flex items-center px-4 py-2 rounded-md transition-all ${
                captureMode === 'voice' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mic className="w-4 h-4 mr-2" />
              Voice
            </button>
          </div>

          {/* Text Input */}
          {captureMode === 'text' && (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your thought, idea, or reminder..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!textInput.trim() || isSubmitting}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Add to Inbox
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Voice Capture */}
          {captureMode === 'voice' && (
            <VoiceCapture 
              onCapture={(item) => {
                fetchInboxItems();
              }}
            />
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search captured items..."
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
          {Object.values(filters).some(f => f !== 'all') && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              Active
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select
                value={filters.urgency}
                onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Urgency Levels</option>
                <option value="urgent">Urgent (4-5)</option>
                <option value="normal">Normal (2-3)</option>
                <option value="low">Low (1)</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
              <select
                value={filters.timeframe}
                onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery || Object.values(filters).some(f => f !== 'all') 
              ? 'No items match your filters'
              : 'Your inbox is empty'}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {searchQuery || Object.values(filters).some(f => f !== 'all')
              ? 'Try adjusting your search or filters'
              : 'Start capturing ideas using voice or text input above'}
          </p>
        </div>
      )}

      {/* Items List - Simplified */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Item Header */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Input Type Icon */}
                  <span className="text-gray-500">
                    {getInputTypeIcon(item.input_type)}
                  </span>
                  
                  {/* Urgency Indicator */}
                  {item.urgency_score >= 3 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(item.urgency_score)}`}>
                      Urgency: {item.urgency_score}
                    </span>
                  )}
                  
                  {/* Time */}
                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                  
                  {/* Snoozed indicator */}
                  {item.status === 'snoozed' && item.snooze_until && (
                    <span className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 mr-1" />
                      Snoozed until {new Date(item.snooze_until).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="text-gray-900">
                  {item.transcription || item.raw_content}
                </div>

                {/* AI Category if available */}
                {item.category && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      AI suggested: <span className="font-medium text-gray-700">{item.category}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Simple Actions - No Conversion */}
              <div className="flex items-center gap-1 ml-4">
                <button
                  onClick={() => handleSnooze(item)}
                  className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Snooze until tomorrow"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleArchive(item)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action - Go to Tasks */}
      {capturedItems.length > 5 && (
        <div className="mt-8 text-center">
          <button
            onClick={goToTasks}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <CheckSquare className="w-5 h-5 mr-2" />
            Go to Tasks - Process All {capturedItems.length} Items
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Use the unified task manager to convert items to tasks or events
          </p>
        </div>
      )}
    </div>
  );
};

export default SmartInbox;