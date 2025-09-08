import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  RotateCcw,
  Calendar,
  Archive,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart3,
  Lightbulb,
  Star,
  X,
  Filter,
  SortAsc,
  History,
  Hourglass
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { usePlanningStore } from '../../stores/planningStore';
import { useFamilyStore } from '../../stores/familyStore';

const SessionReview = ({ sessionId, onProgress, onComplete }) => {
  const [lastWeekTasks, setLastWeekTasks] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [reviewedTasks, setReviewedTasks] = useState(new Set());
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [selectedDeferDate, setSelectedDeferDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInsights, setShowInsights] = useState(true);
  const [activeTab, setActiveTab] = useState('commitments');
  const [backlogSortBy, setBacklogSortBy] = useState('age');
  const [showStaleOnly, setShowStaleOnly] = useState(false);

  const {
    getLastWeekTasks,
    getActiveBacklogTasksSorted,
    getBacklogReviewStats,
    reviewCompleteTask,
    deferTaskToThisWeek,
    deferTaskToFuture,
    archiveTask,
    getSessionReviewStats,
    isLoading: taskLoading,
    error: taskError
  } = useTaskStore();

  const { updateQuadrantProgress } = usePlanningStore();
  const { familyMembers } = useFamilyStore();

  // Load tasks for both tabs
  useEffect(() => {
    loadLastWeekTasks();
    loadBacklogTasks();
  }, []);

  // Update progress when tasks are reviewed
  useEffect(() => {
    const totalTasks = lastWeekTasks.length + backlogTasks.length;
    if (totalTasks > 0) {
      const progress = reviewedTasks.size / totalTasks;
      onProgress?.(progress);
    }
  }, [reviewedTasks, lastWeekTasks, backlogTasks, onProgress]);

  const loadLastWeekTasks = useCallback(async () => {
    setError(null);
    try {
      const tasks = getLastWeekTasks();
      setLastWeekTasks(tasks);
    } catch (err) {
      setError('Failed to load last week\'s tasks');
      console.error('Error loading tasks:', err);
    }
  }, [getLastWeekTasks]);

  const loadBacklogTasks = useCallback(async () => {
    setError(null);
    try {
      const tasks = getActiveBacklogTasksSorted(sessionId, backlogSortBy);
      const filteredTasks = showStaleOnly ? tasks.filter(task => task.isStale) : tasks;
      setBacklogTasks(filteredTasks);
    } catch (err) {
      setError('Failed to load backlog tasks');
      console.error('Error loading backlog tasks:', err);
    }
  }, [getActiveBacklogTasksSorted, sessionId, backlogSortBy, showStaleOnly]);

  // Reload tasks when filters change
  useEffect(() => {
    loadBacklogTasks();
  }, [loadBacklogTasks]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([loadLastWeekTasks(), loadBacklogTasks()]);
        onProgress?.(0.1);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleTaskAction = async (taskId, action, additionalData = {}) => {
    try {
      setError(null);
      
      switch (action) {
        case 'complete':
          await reviewCompleteTask(taskId, sessionId);
          break;
        case 'defer_week':
          await deferTaskToThisWeek(taskId, sessionId);
          break;
        case 'defer_future':
          if (additionalData.date) {
            await deferTaskToFuture(taskId, additionalData.date, sessionId);
          }
          break;
        case 'archive':
          await archiveTask(taskId, sessionId);
          break;
      }

      // Mark task as reviewed
      setReviewedTasks(prev => new Set([...prev, taskId]));
      
      // Update task in local state for both tabs
      setLastWeekTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, review_action: action } : task
      ));
      setBacklogTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, review_action: action } : task
      ));

      // Close any open date pickers
      setShowDatePicker(null);
    } catch (err) {
      setError(`Failed to ${action} task: ${err.message}`);
    }
  };

  const handleDeferWithDate = async (taskId) => {
    if (selectedDeferDate) {
      await handleTaskAction(taskId, 'defer_future', { date: selectedDeferDate });
      setSelectedDeferDate('');
    }
  };

  const toggleCardExpansion = (taskId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getFamilyMemberById = (memberId) => {
    return familyMembers.find(member => member.id === memberId) || { name: 'Unassigned', color: '#6B7280' };
  };

  const getTaskPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionButtonStyle = (action, isDisabled) => {
    const baseStyle = 'flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors';
    const disabledStyle = 'opacity-50 cursor-not-allowed';
    
    if (isDisabled) return `${baseStyle} ${disabledStyle}`;

    switch (action) {
      case 'complete':
        return `${baseStyle} bg-green-100 text-green-700 hover:bg-green-200`;
      case 'defer_week':
        return `${baseStyle} bg-blue-100 text-blue-700 hover:bg-blue-200`;
      case 'defer_future':
        return `${baseStyle} bg-purple-100 text-purple-700 hover:bg-purple-200`;
      case 'archive':
        return `${baseStyle} bg-gray-100 text-gray-700 hover:bg-gray-200`;
      default:
        return baseStyle;
    }
  };

  const generateInsights = () => {
    const stats = getSessionReviewStats(lastWeekTasks.filter(task => reviewedTasks.has(task.id)));
    const insights = [];

    if (stats.completionRate >= 80) {
      insights.push({
        type: 'success',
        icon: Star,
        message: `Excellent! ${stats.completionRate}% of tasks were completed successfully.`
      });
    } else if (stats.completionRate < 50) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        message: `Only ${stats.completionRate}% completion rate. Consider reviewing your task load and priorities.`
      });
    }

    if (stats.deferred > stats.completed) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `${stats.deferred} tasks were deferred. Consider breaking larger tasks into smaller, manageable pieces.`
      });
    }

    if (stats.archived > 0) {
      insights.push({
        type: 'neutral',
        icon: Archive,
        message: `${stats.archived} tasks were archived. Good job identifying what's no longer relevant!`
      });
    }

    return insights;
  };

  const handleCompleteReview = () => {
    const totalTasks = lastWeekTasks.length + backlogTasks.length;
    if (reviewedTasks.size === totalTasks) {
      onProgress?.(1.0);
      onComplete?.();
    }
  };

  const getAgeDisplay = (task) => {
    if (task.ageInWeeks >= 1) {
      return `${task.ageInWeeks}w ${task.ageInDays % 7}d`;
    }
    return `${task.ageInDays}d`;
  };

  const getAgeColor = (task) => {
    if (task.ageInWeeks >= 4) return 'text-red-600 bg-red-100';
    if (task.ageInWeeks >= 2) return 'text-orange-600 bg-orange-100';
    return 'text-blue-600 bg-blue-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || taskError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">{error || taskError}</p>
        </div>
        <button 
          onClick={loadLastWeekTasks}
          className="mt-2 text-red-600 hover:text-red-800 font-medium text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const allTasks = [...lastWeekTasks, ...backlogTasks];
  const reviewedAllTasks = allTasks.filter(task => reviewedTasks.has(task.id));
  const stats = getSessionReviewStats(reviewedAllTasks);
  const insights = generateInsights();
  const totalTasks = lastWeekTasks.length + backlogTasks.length;
  const reviewProgress = totalTasks > 0 ? (reviewedTasks.size / totalTasks) * 100 : 0;
  const backlogStats = getBacklogReviewStats(sessionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Week Review</h2>
        <p className="text-gray-600 mt-1">Review and categorize last week's committed tasks</p>
        
        {/* Progress Bar */}
        <div className="mt-4 bg-gray-200 rounded-full h-2 max-w-md mx-auto">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${reviewProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {reviewedTasks.size} of {totalTasks} tasks reviewed ({Math.round(reviewProgress)}%)
        </p>
      </div>

      {/* Summary Metrics */}
      {reviewedTasks.size > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <RotateCcw className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-900">{stats.deferred}</div>
            <div className="text-sm text-blue-700">Deferred</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <Archive className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-900">{stats.archived}</div>
            <div className="text-sm text-gray-700">Archived</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <Target className="h-6 w-6 text-purple-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-purple-900">{stats.completionRate}%</div>
            <div className="text-sm text-purple-700">Success Rate</div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && showInsights && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
              Weekly Insights
            </h3>
            <button 
              onClick={() => setShowInsights(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-md bg-white/50">
                <insight.icon className="h-4 w-4 mt-0.5 text-blue-600" />
                <p className="text-sm text-gray-700">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('commitments')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'commitments'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Last Week's Commitments
          {lastWeekTasks.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
              {lastWeekTasks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('backlog')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'backlog'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Backlog Review
          {backlogTasks.length > 0 && (
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
              backlogStats.staleTasks > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {backlogTasks.length}
              {backlogStats.staleTasks > 0 && (
                <span className="ml-1 text-red-600">!</span>
              )}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'commitments' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            Review tasks that were committed to last week. Decide whether they were completed, should be deferred, or are no longer relevant.
          </div>
          
          {lastWeekTasks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No tasks to review</h3>
              <p className="text-gray-600">Great! You had no outstanding tasks from last week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lastWeekTasks.map((task) => {
                const isReviewed = reviewedTasks.has(task.id);
                const isExpanded = expandedCards.has(task.id);
                const assignedMember = getFamilyMemberById(task.assigned_to);
                
                return (
                  <div 
                    key={task.id} 
                    className={`border rounded-lg transition-all duration-200 ${
                      isReviewed 
                        ? 'bg-green-50 border-green-200 opacity-75' 
                        : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Task Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 truncate">{task.title}</h4>
                            {task.priority && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span style={{ color: assignedMember.color }}>{assignedMember.name}</span>
                            </div>
                            
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => toggleCardExpansion(task.id)}
                          className="ml-4 p-1 hover:bg-gray-100 rounded-md"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Action Buttons */}
                      {!isReviewed && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleTaskAction(task.id, 'complete')}
                            disabled={taskLoading}
                            className={getActionButtonStyle('complete', taskLoading)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Complete
                          </button>
                          
                          <button
                            onClick={() => handleTaskAction(task.id, 'defer_week')}
                            disabled={taskLoading}
                            className={getActionButtonStyle('defer_week', taskLoading)}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Defer to This Week
                          </button>
                          
                          <div className="relative">
                            <button
                              onClick={() => setShowDatePicker(showDatePicker === task.id ? null : task.id)}
                              disabled={taskLoading}
                              className={getActionButtonStyle('defer_future', taskLoading)}
                            >
                              <Calendar className="h-4 w-4" />
                              Defer to Future
                            </button>
                            
                            {showDatePicker === task.id && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-64">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Select new due date:
                                </label>
                                <input
                                  type="date"
                                  value={selectedDeferDate}
                                  onChange={(e) => setSelectedDeferDate(e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleDeferWithDate(task.id)}
                                    disabled={!selectedDeferDate}
                                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                                  >
                                    Defer
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowDatePicker(null);
                                      setSelectedDeferDate('');
                                    }}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleTaskAction(task.id, 'archive')}
                            disabled={taskLoading}
                            className={getActionButtonStyle('archive', taskLoading)}
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </button>
                        </div>
                      )}

                      {/* Review Status */}
                      {isReviewed && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>Reviewed - {task.review_action?.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="pt-4 space-y-3">
                          {task.description && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-1">Description</h5>
                              <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <h5 className="font-medium text-gray-900">Created</h5>
                              <p className="text-gray-600">{new Date(task.created_at).toLocaleDateString()}</p>
                            </div>
                            
                            {task.category && (
                              <div>
                                <h5 className="font-medium text-gray-900">Category</h5>
                                <p className="text-gray-600">{task.category}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'backlog' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
            Review tasks from your active backlog that may have been overlooked. These are pending tasks that need attention.
          </div>

          {/* Backlog Stats & Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-medium">{backlogTasks.length}</span> tasks to review
                  {backlogStats.staleTasks > 0 && (
                    <span className="ml-2 text-red-600 font-medium">
                      ({backlogStats.staleTasks} stale)
                    </span>
                  )}
                </div>
                {backlogStats.averageAge > 0 && (
                  <div className="text-sm text-gray-500">
                    Avg age: {Math.floor(backlogStats.averageAge / 7)}w {backlogStats.averageAge % 7}d
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={showStaleOnly}
                      onChange={(e) => setShowStaleOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Stale only (2+ weeks)
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4 text-gray-400" />
                  <select
                    value={backlogSortBy}
                    onChange={(e) => setBacklogSortBy(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="age">Sort by Age</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="category">Sort by Category</option>
                    <option value="due_date">Sort by Due Date</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Age Breakdown */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900">{backlogStats.ageBreakdown.fresh}</div>
                <div className="text-blue-700">Fresh (&lt;2w)</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="font-medium text-orange-900">{backlogStats.ageBreakdown.stale}</div>
                <div className="text-orange-700">Stale (2-4w)</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="font-medium text-red-900">{backlogStats.ageBreakdown.veryOld}</div>
                <div className="text-red-700">Very Old (4w+)</div>
              </div>
            </div>
          </div>

          {backlogTasks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No backlog tasks to review</h3>
              <p className="text-gray-600">
                {showStaleOnly 
                  ? "No stale tasks found. Great job keeping your backlog fresh!"
                  : "Your backlog is clear. All active tasks have been reviewed!"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {backlogTasks.map((task) => {
                const isReviewed = reviewedTasks.has(task.id);
                const isExpanded = expandedCards.has(task.id);
                const assignedMember = getFamilyMemberById(task.assigned_to);
                
                return (
                  <div 
                    key={task.id} 
                    className={`border rounded-lg transition-all duration-200 ${
                      isReviewed 
                        ? 'bg-green-50 border-green-200 opacity-75' 
                        : task.isStale
                          ? 'bg-red-50 border-red-200 shadow-sm hover:shadow-md'
                          : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Task Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 truncate">{task.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgeColor(task)}`}>
                              <Hourglass className="h-3 w-3 inline mr-1" />
                              {getAgeDisplay(task)}
                            </span>
                            {task.priority && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            )}
                            {task.isStale && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                STALE
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span style={{ color: assignedMember.color }}>{assignedMember.name}</span>
                            </div>
                            
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            
                            {task.category && (
                              <div className="text-gray-500">
                                {task.category}
                              </div>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => toggleCardExpansion(task.id)}
                          className="ml-4 p-1 hover:bg-gray-100 rounded-md"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Action Buttons */}
                      {!isReviewed && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleTaskAction(task.id, 'complete')}
                            disabled={taskLoading}
                            className={getActionButtonStyle('complete', taskLoading)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Complete
                          </button>
                          
                          <button
                            onClick={() => handleTaskAction(task.id, 'defer_week')}
                            disabled={taskLoading}
                            className={getActionButtonStyle('defer_week', taskLoading)}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Defer to This Week
                          </button>
                          
                          <div className="relative">
                            <button
                              onClick={() => setShowDatePicker(showDatePicker === task.id ? null : task.id)}
                              disabled={taskLoading}
                              className={getActionButtonStyle('defer_future', taskLoading)}
                            >
                              <Calendar className="h-4 w-4" />
                              Defer to Future
                            </button>
                            
                            {showDatePicker === task.id && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-64">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Select new due date:
                                </label>
                                <input
                                  type="date"
                                  value={selectedDeferDate}
                                  onChange={(e) => setSelectedDeferDate(e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleDeferWithDate(task.id)}
                                    disabled={!selectedDeferDate}
                                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                                  >
                                    Defer
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowDatePicker(null);
                                      setSelectedDeferDate('');
                                    }}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleTaskAction(task.id, 'archive')}
                            disabled={taskLoading}
                            className={getActionButtonStyle('archive', taskLoading)}
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </button>
                        </div>
                      )}

                      {/* Review Status */}
                      {isReviewed && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>Reviewed - {task.review_action?.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="pt-4 space-y-3">
                          {task.description && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-1">Description</h5>
                              <p className="text-sm text-gray-600">{task.description}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <h5 className="font-medium text-gray-900">Created</h5>
                              <p className="text-gray-600">{new Date(task.created_at).toLocaleDateString()}</p>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-gray-900">Age</h5>
                              <p className="text-gray-600">{getAgeDisplay(task)} old</p>
                            </div>
                            
                            {task.category && (
                              <div>
                                <h5 className="font-medium text-gray-900">Category</h5>
                                <p className="text-gray-600">{task.category}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Complete Review Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleCompleteReview}
          disabled={reviewedTasks.size < totalTasks}
          className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
            reviewedTasks.size === totalTasks
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {reviewedTasks.size === totalTasks 
            ? 'Complete Review & Continue' 
            : `Review ${totalTasks - reviewedTasks.size} More Tasks`
          }
        </button>
      </div>
    </div>
  );
};

export default SessionReview;