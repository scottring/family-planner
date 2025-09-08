import { useState, useEffect } from 'react';
import { 
  Inbox, 
  CheckSquare, 
  Calendar,
  Search, 
  Filter,
  Plus,
  Clock,
  Trash2,
  Archive,
  AlertTriangle,
  Users,
  Zap,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  X,
  Edit3,
  Save,
  ArrowRight,
  MoreVertical
} from 'lucide-react';
import { useInboxStore } from '../../stores/inboxStore';
import { useTaskStore } from '../../stores/taskStore';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

const UnifiedTaskManager = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { familyMembers, fetchFamilyMembers } = useFamilyStore();
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [processingMode, setProcessingMode] = useState(null); // 'task' | 'event'
  const [showMiniForm, setShowMiniForm] = useState(false);
  const [processingItem, setProcessingItem] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showDeferMenu, setShowDeferMenu] = useState(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(null);
  const [customDeferDate, setCustomDeferDate] = useState('');

  const [filters, setFilters] = useState({
    urgency: 'all',
    priority: 'all',
    assignee: 'all',
    timeframe: 'all'
  });

  const [formData, setFormData] = useState({
    title: '',
    assignee: '',
    priority: 3,  // 1-5 integer scale
    due_date: ''
  });

  const { 
    items: inboxItems, 
    loading: inboxLoading,
    fetchInboxItems,
    processInboxItem,
    deleteInboxItem,
    archiveInboxItem
  } = useInboxStore();

  const {
    tasks,
    isLoading: tasksLoading,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete
  } = useTaskStore();

  useEffect(() => {
    fetchInboxItems();
    fetchTasks();
    fetchFamilyMembers();
  }, [fetchInboxItems, fetchTasks, fetchFamilyMembers]);

  // Filter unprocessed inbox items
  const unprocessedItems = inboxItems.filter(item => 
    item.status === 'pending' || item.status === 'snoozed'
  );

  // Filter active tasks (not scheduled, not completed, not deferred)
  const activeTasks = tasks.filter(task => 
    task.status === 'pending' && 
    !task.scheduled_date &&
    task.status !== 'archived' &&
    task.status !== 'deferred'
  );

  // Filter scheduled tasks 
  const scheduledTasks = tasks.filter(task => 
    task.scheduled_date && 
    task.status !== 'completed' &&
    task.status !== 'archived'
  );

  // Filter deferred tasks
  const deferredTasks = tasks.filter(task => 
    task.status === 'deferred' && 
    task.due_date
  ).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  // Helper to get assignee name
  const getAssigneeName = (assigneeId) => {
    if (!assigneeId) return null;
    if (assigneeId === user?.id) return 'Me';
    const member = familyMembers.find(m => m.id === assigneeId);
    return member?.name || 'Unknown';
  };

  const handleProcessItem = (item, type) => {
    setProcessingItem(item);
    setProcessingMode(type);
    setFormData({
      title: item.transcription || item.raw_content || '',
      assignee: '',
      priority: 3,  // 1-5 integer scale
      due_date: ''
    });
    setShowMiniForm(true);
  };

  const handleSubmitProcessing = async () => {
    if (!processingItem || !formData.title.trim()) return;

    try {
      if (processingMode === 'task') {
        // Create task from inbox item
        const taskData = {
          title: formData.title,
          assigned_to: formData.assignee || null,  // Fixed: use assigned_to instead of assignee
          priority: formData.priority,
          due_date: formData.due_date || null,
          created_from_inbox: true,
          description: processingItem.transcription || processingItem.raw_content
        };
        
        await addTask(taskData);
        await processInboxItem(processingItem.id, 'task', taskData);
      } else if (processingMode === 'event') {
        // For events, we'll navigate to calendar with pre-filled data
        navigate('/calendar', { 
          state: { 
            createEvent: {
              title: formData.title,
              description: processingItem.transcription || processingItem.raw_content,
              date: formData.due_date
            }
          }
        });
        await processInboxItem(processingItem.id, 'event', formData);
      }

      // Refresh data
      await fetchInboxItems();
      await fetchTasks();
      
      // Reset form
      setShowMiniForm(false);
      setProcessingItem(null);
      setFormData({
        title: '',
        assignee: '',
        priority: 3,
        due_date: ''
      });
    } catch (error) {
      console.error('Failed to process item:', error);
    }
  };

  const handleDeleteInboxItem = async (item) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteInboxItem(item.id);
      fetchInboxItems();
    }
  };

  const handleArchiveInboxItem = async (item) => {
    await archiveInboxItem(item.id);
    fetchInboxItems();
  };

  const handleToggleTaskComplete = async (taskId) => {
    await toggleTaskComplete(taskId);
    fetchTasks();
  };

  const handleScheduleTask = (task) => {
    navigate('/calendar', {
      state: {
        createEvent: {
          title: task.title,
          description: task.description,
          linkedTaskId: task.id
        }
      }
    });
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleSaveTaskEdit = async (taskId, updates) => {
    try {
      await updateTask(taskId, updates);
      await fetchTasks();
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeferTask = async (taskId, deferOption) => {
    const now = new Date();
    let deferDate;
    
    switch(deferOption) {
      case 'week':
        deferDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        deferDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        setShowCustomDatePicker(taskId);
        setShowDeferMenu(null);
        return;
      default:
        return;
    }
    
    await updateTask(taskId, { 
      due_date: deferDate.toISOString().split('T')[0],
      status: 'deferred'
    });
    fetchTasks();
    setShowDeferMenu(null);
  };

  const handleCustomDateSubmit = async (taskId) => {
    if (!customDeferDate) return;
    
    await updateTask(taskId, { 
      due_date: customDeferDate,
      status: 'deferred'
    });
    fetchTasks();
    setShowCustomDatePicker(null);
    setCustomDeferDate('');
  };

  const handleBulkAction = async (action) => {
    const selectedItemsArray = Array.from(selectedItems);
    if (selectedItemsArray.length === 0) return;

    try {
      for (const itemId of selectedItemsArray) {
        if (activeTab === 'inbox') {
          const item = unprocessedItems.find(i => i.id === itemId);
          if (action === 'archive') {
            await archiveInboxItem(itemId);
          } else if (action === 'delete') {
            await deleteInboxItem(itemId);
          }
        } else if (activeTab === 'active') {
          if (action === 'complete') {
            await toggleTaskComplete(itemId);
          } else if (action === 'archive') {
            await updateTask(itemId, { status: 'archived' });
          }
        }
      }
      
      setSelectedItems(new Set());
      await fetchInboxItems();
      await fetchTasks();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const getTabCounts = () => ({
    inbox: unprocessedItems.length,
    active: activeTasks.length,
    scheduled: scheduledTasks.length
  });

  const tabCounts = getTabCounts();

  const renderInboxTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Unprocessed Items ({tabCounts.inbox})
        </h2>
        {selectedItems.size > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkAction('archive')}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              Archive ({selectedItems.size})
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Delete ({selectedItems.size})
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {unprocessedItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No unprocessed items to review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unprocessedItems.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedItems);
                      if (e.target.checked) {
                        newSelected.add(item.id);
                      } else {
                        newSelected.delete(item.id);
                      }
                      setSelectedItems(newSelected);
                    }}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {item.urgency_score >= 3 && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                          Urgent
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-900 mb-3">
                      {item.transcription || item.raw_content}
                    </p>

                    {/* Quick Process Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleProcessItem(item, 'task')}
                        className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <CheckSquare className="w-4 h-4 mr-1" />
                        Convert to Task
                      </button>
                      <button
                        onClick={() => handleProcessItem(item, 'event')}
                        className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Convert to Event
                      </button>
                      <button
                        onClick={() => handleArchiveInboxItem(item)}
                        className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        Archive
                      </button>
                      <button
                        onClick={() => handleDeleteInboxItem(item)}
                        className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderActiveTasksTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Active Tasks ({tabCounts.active})
        </h2>
        <div className="flex items-center space-x-2">
          {selectedItems.size > 0 && (
            <>
              <button
                onClick={() => handleBulkAction('complete')}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
              >
                Complete ({selectedItems.size})
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Archive ({selectedItems.size})
              </button>
            </>
          )}
          <button
            onClick={() => setShowMiniForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </button>
        </div>
      </div>

      {/* Empty State */}
      {activeTasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No active tasks</h3>
          <p className="text-gray-600">Create a new task or process items from your inbox.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTasks.map((task) => (
            <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(task.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedItems);
                      if (e.target.checked) {
                        newSelected.add(task.id);
                      } else {
                        newSelected.delete(task.id);
                      }
                      setSelectedItems(newSelected);
                    }}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1">
                    {editingTask?.id === task.id ? (
                      <TaskEditForm 
                        task={task} 
                        onSave={(updates) => handleSaveTaskEdit(task.id, updates)}
                        onCancel={() => setEditingTask(null)}
                      />
                    ) : (
                      <>
                        <div className="flex items-center space-x-2 mb-2">
                          {task.priority && (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              task.priority >= 4 ? 'bg-red-100 text-red-700' :
                              task.priority === 3 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {task.priority === 5 ? 'Urgent' :
                               task.priority === 4 ? 'High' :
                               task.priority === 3 ? 'Medium' :
                               task.priority === 2 ? 'Low' : 'Lowest'}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {task.assigned_to && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {getAssigneeName(task.assigned_to)}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                        )}

                        {/* Quick Actions */}
                        <div className="flex items-center flex-wrap gap-2">
                          <button
                            onClick={() => handleToggleTaskComplete(task.id)}
                            className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                          >
                            <CheckSquare className="w-4 h-4 mr-1" />
                            Complete
                          </button>
                          
                          {/* Defer Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setShowDeferMenu(showDeferMenu === task.id ? null : task.id)}
                              className="flex items-center px-3 py-1.5 bg-orange-100 text-orange-700 text-sm rounded-md hover:bg-orange-200 transition-colors"
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Defer
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </button>
                            
                            {showDeferMenu === task.id && (
                              <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-[150px]">
                                <button
                                  onClick={() => handleDeferTask(task.id, 'week')}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                  1 Week
                                </button>
                                <button
                                  onClick={() => handleDeferTask(task.id, 'month')}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                  1 Month
                                </button>
                                <button
                                  onClick={() => handleDeferTask(task.id, 'custom')}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                  Custom Date...
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleScheduleTask(task)}
                            className="flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                          >
                            <CalendarDays className="w-4 h-4 mr-1" />
                            Schedule
                          </button>
                          <button
                            onClick={() => handleEditTask(task)}
                            className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200 transition-colors"
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => updateTask(task.id, { status: 'archived' }).then(() => fetchTasks())}
                            className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                          >
                            <Archive className="w-4 h-4 mr-1" />
                            Archive
                          </button>
                        </div>
                        
                        {/* Custom Date Picker Modal */}
                        {showCustomDatePicker === task.id && (
                          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-4 shadow-xl">
                              <h3 className="text-sm font-medium mb-3">Select defer date</h3>
                              <input
                                type="date"
                                value={customDeferDate}
                                onChange={(e) => setCustomDeferDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setShowCustomDatePicker(null);
                                    setCustomDeferDate('');
                                  }}
                                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleCustomDateSubmit(task.id)}
                                  disabled={!customDeferDate}
                                  className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400"
                                >
                                  Defer
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deferred Tasks Section */}
      {deferredTasks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Deferred Tasks ({deferredTasks.length})
          </h3>
          <div className="space-y-2 opacity-75">
            {deferredTasks.map((task) => (
              <div key={task.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <div className="flex items-center mt-1 space-x-3 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Deferred until: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                      {task.assigned_to && (
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {getAssigneeName(task.assigned_to)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await updateTask(task.id, { status: 'pending', due_date: null });
                      fetchTasks();
                    }}
                    className="px-2 py-1 text-xs bg-white border border-orange-300 text-orange-700 rounded hover:bg-orange-50"
                  >
                    Reactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderScheduledTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Scheduled Tasks ({tabCounts.scheduled})
        </h2>
      </div>

      {/* Simple List View for now - can be enhanced with calendar widget later */}
      {scheduledTasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled tasks</h3>
          <p className="text-gray-600">Schedule tasks from your active list or create calendar events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduledTasks.map((task) => (
            <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm text-blue-600 flex items-center">
                      <CalendarDays className="w-4 h-4 mr-1" />
                      {new Date(task.scheduled_date).toLocaleDateString()}
                    </span>
                    {task.priority && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleTaskComplete(task.id)}
                    className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                  >
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Complete
                  </button>
                  <button
                    onClick={() => updateTask(task.id, { scheduled_date: null }).then(() => fetchTasks())}
                    className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 mr-1" />
                    Unschedule
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Management</h1>
        <p className="text-gray-600">
          Unified view to process inbox items, manage active tasks, and track scheduled work
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'inbox', label: 'Inbox', icon: Inbox, count: tabCounts.inbox },
            { id: 'active', label: 'Active Tasks', icon: CheckSquare, count: tabCounts.active },
            { id: 'scheduled', label: 'Scheduled', icon: Calendar, count: tabCounts.scheduled }
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setSelectedItems(new Set());
              }}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {label}
              {count > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'inbox' ? 'inbox items' : 'tasks'}...`}
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

      {/* Loading State */}
      {(inboxLoading || tasksLoading) && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Tab Content */}
      {!inboxLoading && !tasksLoading && (
        <div>
          {activeTab === 'inbox' && renderInboxTab()}
          {activeTab === 'active' && renderActiveTasksTab()}
          {activeTab === 'scheduled' && renderScheduledTab()}
        </div>
      )}

      {/* Mini Form Modal */}
      {showMiniForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {processingItem ? 
                  `Convert to ${processingMode === 'task' ? 'Task' : 'Event'}` : 
                  'New Task'
                }
              </h3>
              <button
                onClick={() => {
                  setShowMiniForm(false);
                  setProcessingItem(null);
                  setFormData({
                    title: '',
                    assignee: '',
                    priority: 'medium',
                    due_date: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  value={formData.assignee}
                  onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {user && (
                    <option value={user.id}>Me ({user.full_name || user.email})</option>
                  )}
                  {familyMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} {member.role ? `(${member.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">Lowest</option>
                  <option value="2">Low</option>
                  <option value="3">Medium</option>
                  <option value="4">High</option>
                  <option value="5">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowMiniForm(false);
                    setProcessingItem(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processingItem ? handleSubmitProcessing : () => {
                    // Handle new task creation
                    if (formData.title.trim()) {
                      addTask({
                        title: formData.title,
                        assigned_to: formData.assignee || null,
                        priority: formData.priority,
                        due_date: formData.due_date || null,
                        status: 'pending'
                      }).then(() => {
                        fetchTasks();
                        setShowMiniForm(false);
                        setFormData({
                          title: '',
                          assignee: '',
                          priority: 3,
                          due_date: ''
                        });
                      });
                    }
                  }}
                  disabled={!formData.title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processingItem ? 
                    `Create ${processingMode === 'task' ? 'Task' : 'Event'}` : 
                    'Create Task'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mini component for inline task editing
const TaskEditForm = ({ task, onSave, onCancel }) => {
  const { user } = useAuthStore();
  const { familyMembers } = useFamilyStore();
  
  const [formData, setFormData] = useState({
    title: task.title || '',
    assigned_to: task.assigned_to || '',
    priority: task.priority || 3,
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
    description: task.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Task title..."
      />
      
      <div className="grid grid-cols-2 gap-3">
        <select
          value={formData.assigned_to}
          onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Unassigned</option>
          {user && (
            <option value={user.id}>Me ({user.full_name || user.email})</option>
          )}
          {familyMembers.map(member => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        
        <select
          value={formData.priority}
          onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="1">Lowest</option>
          <option value="2">Low</option>
          <option value="3">Medium</option>
          <option value="4">High</option>
          <option value="5">Urgent</option>
        </select>
      </div>

      <input
        type="date"
        value={formData.due_date}
        onChange={(e) => setFormData({...formData, due_date: e.target.value})}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      <div className="flex items-center space-x-2">
        <button
          type="submit"
          className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
        >
          <Save className="w-4 h-4 mr-1" />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UnifiedTaskManager;