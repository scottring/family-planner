import { useState, useEffect } from 'react';
import {
  Inbox,
  ArrowRight,
  ArrowLeft,
  Calendar,
  CheckSquare,
  Trash2,
  Clock,
  AlertCircle,
  User,
  Mic,
  Type,
  Image,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  SkipForward,
  CalendarDays,
  ListTodo,
  Archive
} from 'lucide-react';
import { useInboxStore } from '../../stores/inboxStore';
import { useTaskStore } from '../../stores/taskStore';
import { useEventStore } from '../../stores/eventStore';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';

const InboxProcessor = ({ sessionId, onProgress, onComplete }) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [conversionType, setConversionType] = useState(null); // 'task' or 'event'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    assigned_to: null,
    attendees: [],
    priority: 3,
    category: 'general',
    location: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedItems, setProcessedItems] = useState(new Set());
  const [skippedItems, setSkippedItems] = useState(new Set());

  const { user } = useAuthStore();
  const { familyMembers, fetchFamilyMembers } = useFamilyStore();
  const { 
    items, 
    loading, 
    fetchInboxItems,
    updateInboxItem,
    deleteInboxItem,
    archiveInboxItem
  } = useInboxStore();
  const { addTask } = useTaskStore();
  const { createEvent } = useEventStore();

  useEffect(() => {
    fetchInboxItems();
    fetchFamilyMembers();
  }, [fetchInboxItems, fetchFamilyMembers]);

  // Filter only unprocessed items
  const unprocessedItems = items.filter(item => 
    item.status === 'pending' || item.status === 'snoozed'
  );

  // Get current item
  const currentItem = unprocessedItems[currentItemIndex];

  useEffect(() => {
    // Update progress
    if (unprocessedItems.length > 0) {
      const progress = (processedItems.size + skippedItems.size) / unprocessedItems.length;
      onProgress?.(progress);
    }
  }, [processedItems.size, skippedItems.size, unprocessedItems.length, onProgress]);

  // Initialize form with item content
  useEffect(() => {
    if (currentItem && !showConversionForm) {
      setFormData(prev => ({
        ...prev,
        title: currentItem.transcription || currentItem.raw_content,
        description: currentItem.parsed_data?.description || '',
        category: currentItem.category || 'general'
      }));
    }
  }, [currentItem, showConversionForm]);

  const handleStartConversion = (type) => {
    setConversionType(type);
    setShowConversionForm(true);
    
    // Set default date based on type
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (type === 'event') {
      setFormData(prev => ({
        ...prev,
        date: tomorrow.toISOString().split('T')[0],
        time: '' // Leave time empty - user can choose to schedule now or later
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        date: tomorrow.toISOString().split('T')[0]
      }));
    }
  };

  const handleConvert = async () => {
    setIsProcessing(true);
    try {
      if (conversionType === 'task') {
        await addTask({
          title: formData.title,
          description: formData.description,
          due_date: formData.date,
          assigned_to: formData.assigned_to,
          priority: formData.priority,
          category: formData.category,
          created_from_inbox: currentItem.id
        });
      } else if (conversionType === 'event') {
        // If no specific time is set, create as a draft event for later scheduling
        const isDraft = !formData.time;
        
        const eventData = {
          title: formData.title,
          description: formData.description,
          location: formData.location,
          attendees: formData.attendees || [],
          assigned_to: formData.assigned_to,
          category: formData.category || 'general',
          created_from_inbox: currentItem.id,
          is_draft: isDraft
        };
        
        if (!isDraft) {
          // If time is specified, set start and end times
          const startTime = new Date(`${formData.date}T${formData.time}`);
          const endTime = new Date(startTime.getTime() + formData.duration * 60000);
          eventData.date = formData.date;
          eventData.start_time = startTime.toISOString();
          eventData.end_time = endTime.toISOString();
        } else {
          // For drafts, just set the target date (will be scheduled later)
          eventData.date = formData.date;
          // Set temporary times (will be updated when scheduled)
          const tempDate = new Date(formData.date);
          tempDate.setHours(9, 0, 0, 0);
          eventData.start_time = tempDate.toISOString();
          tempDate.setHours(10, 0, 0, 0);
          eventData.end_time = tempDate.toISOString();
        }
        
        await createEvent(eventData);
      }

      // Mark inbox item as converted
      await updateInboxItem(currentItem.id, {
        status: 'converted',
        converted_to_type: conversionType,
        processed_at: new Date().toISOString()
      });

      // Track processed
      setProcessedItems(prev => new Set(prev).add(currentItem.id));
      
      // Move to next item
      handleNext();
    } catch (error) {
      console.error('Failed to convert item:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    setSkippedItems(prev => new Set(prev).add(currentItem.id));
    handleNext();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteInboxItem(currentItem.id);
      setProcessedItems(prev => new Set(prev).add(currentItem.id));
      handleNext();
    }
  };

  const handleArchive = async () => {
    await archiveInboxItem(currentItem.id);
    setProcessedItems(prev => new Set(prev).add(currentItem.id));
    handleNext();
  };

  const handleNext = () => {
    setShowConversionForm(false);
    setConversionType(null);
    
    if (currentItemIndex < unprocessedItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      // All items processed
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setShowConversionForm(false);
      setConversionType(null);
    }
  };

  const handleComplete = () => {
    onComplete?.();
  };

  const getInputTypeIcon = (type) => {
    switch (type) {
      case 'voice': return <Mic className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <Inbox className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (unprocessedItems.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-12 text-center">
        <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          All items processed!
        </h3>
        <p className="text-gray-600">
          Your inbox is empty. Great job staying organized!
        </p>
        <button
          onClick={handleComplete}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Continue to Next Phase
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Processing Inbox Items
          </h2>
          <span className="text-sm text-gray-600">
            {currentItemIndex + 1} of {unprocessedItems.length}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${((processedItems.size + skippedItems.size) / unprocessedItems.length) * 100}%` 
            }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
          <span className="flex items-center">
            <Check className="w-3 h-3 mr-1 text-green-600" />
            {processedItems.size} processed
          </span>
          <span className="flex items-center">
            <SkipForward className="w-3 h-3 mr-1 text-yellow-600" />
            {skippedItems.size} skipped
          </span>
          <span className="flex items-center">
            <Inbox className="w-3 h-3 mr-1 text-gray-600" />
            {unprocessedItems.length - processedItems.size - skippedItems.size} remaining
          </span>
        </div>
      </div>

      {currentItem && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Item Display */}
          {!showConversionForm ? (
            <div className="p-6">
              {/* Item Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-gray-500">
                  {getInputTypeIcon(currentItem.input_type)}
                </span>
                <span className="text-sm text-gray-600">
                  {new Date(currentItem.created_at).toLocaleString()}
                </span>
                {currentItem.urgency_score >= 4 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                    Urgent
                  </span>
                )}
              </div>

              {/* Item Content */}
              <div className="mb-6">
                <p className="text-lg text-gray-900 mb-2">
                  {currentItem.transcription || currentItem.raw_content}
                </p>
                
                {currentItem.category && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-500">
                      AI suggested category: 
                      <span className="ml-1 font-medium text-gray-700">
                        {currentItem.category}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Conversion Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  What would you like to do with this item?
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleStartConversion('task')}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  >
                    <CheckSquare className="w-5 h-5" />
                    <span className="font-medium">Convert to Task</span>
                  </button>
                  
                  <button
                    onClick={() => handleStartConversion('event')}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-green-200 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 hover:border-green-300 transition-colors"
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">Convert to Event</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSkip}
                    className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleArchive}
                    className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Archive
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Conversion Form */
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Convert to {conversionType === 'task' ? 'Task' : 'Event'}
                </h3>
                <button
                  onClick={() => setShowConversionForm(false)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {conversionType === 'task' ? 'Due Date' : 'Date'}
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Time (for events) */}
                  {conversionType === 'event' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time <span className="text-gray-500 text-xs">(optional - can schedule later)</span>
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        placeholder="Leave blank to schedule later"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Priority (for tasks) */}
                  {conversionType === 'task' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={1}>Low</option>
                        <option value={2}>Medium-Low</option>
                        <option value={3}>Medium</option>
                        <option value={4}>Medium-High</option>
                        <option value={5}>High</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Duration (for events) */}
                {conversionType === 'event' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="15"
                        step="15"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                )}

                {/* Assignment - Different for tasks vs events */}
                {conversionType === 'task' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <User className="inline w-4 h-4 mr-1" />
                      Assign To
                    </label>
                    <select
                      value={formData.assigned_to || ''}
                      onChange={(e) => setFormData({...formData, assigned_to: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Unassigned</option>
                      <option value={user?.id}>Me ({user?.name || user?.email})</option>
                      {familyMembers.filter(m => m.id !== user?.id).map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} {member.role && `(${member.role})`}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <User className="inline w-4 h-4 mr-1" />
                      Who's Involved? (Optional)
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.assigned_to === user?.id}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, assigned_to: user?.id});
                            } else {
                              setFormData({...formData, assigned_to: null});
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                        />
                        <span>Me ({user?.name || user?.email})</span>
                      </label>
                      {familyMembers.filter(m => m.id !== user?.id).map(member => (
                        <label key={member.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.attendees?.includes(member.name) || false}
                            onChange={(e) => {
                              const currentAttendees = formData.attendees || [];
                              if (e.target.checked) {
                                setFormData({...formData, attendees: [...currentAttendees, member.name]});
                              } else {
                                setFormData({...formData, attendees: currentAttendees.filter(a => a !== member.name)});
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span>{member.name} {member.role && `(${member.role})`}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="family">Family</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                    <option value="home">Home</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => setShowConversionForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConvert}
                    disabled={!formData.title || isProcessing}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Converting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Check className="w-4 h-4 mr-2" />
                        Create {conversionType === 'task' ? 'Task' : 'Event'}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentItemIndex === 0}
                className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {unprocessedItems.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      processedItems.has(unprocessedItems[index]?.id)
                        ? 'bg-green-500'
                        : skippedItems.has(unprocessedItems[index]?.id)
                        ? 'bg-yellow-500'
                        : index === currentItemIndex
                        ? 'bg-blue-600'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={currentItemIndex === unprocessedItems.length - 1}
                className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxProcessor;