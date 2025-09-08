import { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Clock,
  Users,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  AlertTriangle,
  User,
  Target,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Inbox,
  Archive,
  Eye,
  EyeOff,
  Star,
  BarChart3,
  Lightbulb,
  Plus,
  Minus
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { usePlanningStore } from '../../stores/planningStore';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';

const WeekCommitment = ({ sessionId, onProgress, onComplete }) => {
  // State management
  const [commitmentState, setCommitmentState] = useState({
    selectedTasks: new Set(),
    taskAssignments: {}, // taskId: { assignedTo: memberId, priority: 1-5, estimatedHours: number }
    bulkSelections: {
      deferred: false,
      newFromInbox: false,
      backlog: false
    }
  });

  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    assignee: 'all',
    sortBy: 'priority',
    sortDirection: 'desc',
    showCompleted: false
  });

  const [viewState, setViewState] = useState({
    currentSection: 0, // 0: deferred, 1: new from inbox, 2: backlog
    showSummary: false,
    expandedTasks: new Set()
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Store hooks
  const { 
    tasks,
    fetchTasks,
    updateTask,
    getLastWeekTasks,
    getTasksByStatus,
    searchTasks,
    isLoading: taskLoading,
    error: taskError
  } = useTaskStore();

  const { 
    updateQuadrantProgress,
    setQuadrantData,
    sessionProgress 
  } = usePlanningStore();

  const { familyMembers, fetchFamilyMembers } = useFamilyStore();
  const { user } = useAuthStore();

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchTasks(),
          fetchFamilyMembers()
        ]);
      } catch (err) {
        setError('Failed to load tasks and family data');
        console.error('WeekCommitment data loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchTasks, fetchFamilyMembers]);

  // Organize tasks into three sections
  const taskSections = useMemo(() => {
    // Get tasks deferred from last week
    const deferredTasks = tasks.filter(task => 
      task.review_action === 'deferred_this_week' && 
      task.status !== 'completed' &&
      task.status !== 'archived'
    );

    // Get new tasks from inbox processing (created in the last session)
    const newFromInboxTasks = tasks.filter(task => 
      task.created_from_inbox && 
      task.status !== 'completed' &&
      task.status !== 'archived' &&
      !task.review_action // Not yet reviewed
    );

    // Get existing backlog tasks (pending tasks not in above categories)
    const backlogTasks = tasks.filter(task => 
      task.status === 'pending' &&
      task.review_action !== 'deferred_this_week' &&
      !task.created_from_inbox
    );

    return {
      deferred: deferredTasks,
      newFromInbox: newFromInboxTasks,
      backlog: backlogTasks
    };
  }, [tasks]);

  // Apply filters and search to all tasks
  const filteredTaskSections = useMemo(() => {
    const applyFilters = (taskList) => {
      let filtered = taskList;

      // Search filter
      if (filters.search) {
        filtered = filtered.filter(task =>
          task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          task.description?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      // Category filter
      if (filters.category !== 'all') {
        filtered = filtered.filter(task => task.category === filters.category);
      }

      // Assignee filter
      if (filters.assignee !== 'all') {
        filtered = filtered.filter(task => 
          task.assigned_to === parseInt(filters.assignee)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (filters.sortBy) {
          case 'priority':
            aValue = a.priority || 3;
            bValue = b.priority || 3;
            break;
          case 'dueDate':
            aValue = new Date(a.due_date || '9999-12-31').getTime();
            bValue = new Date(b.due_date || '9999-12-31').getTime();
            break;
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'estimatedTime':
            aValue = commitmentState.taskAssignments[a.id]?.estimatedHours || 0;
            bValue = commitmentState.taskAssignments[b.id]?.estimatedHours || 0;
            break;
          default:
            return 0;
        }

        if (filters.sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      return filtered;
    };

    return {
      deferred: applyFilters(taskSections.deferred),
      newFromInbox: applyFilters(taskSections.newFromInbox),
      backlog: applyFilters(taskSections.backlog)
    };
  }, [taskSections, filters, commitmentState.taskAssignments]);

  // Calculate commitment metrics
  const commitmentMetrics = useMemo(() => {
    const selectedTasksList = Array.from(commitmentState.selectedTasks).map(taskId =>
      tasks.find(task => task.id === taskId)
    ).filter(Boolean);

    const totalTasks = commitmentState.selectedTasks.size;
    const totalEstimatedHours = selectedTasksList.reduce((sum, task) => {
      return sum + (commitmentState.taskAssignments[task.id]?.estimatedHours || 1);
    }, 0);

    const tasksByPriority = selectedTasksList.reduce((acc, task) => {
      const priority = commitmentState.taskAssignments[task.id]?.priority || task.priority || 3;
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const tasksByAssignee = selectedTasksList.reduce((acc, task) => {
      const assignedTo = commitmentState.taskAssignments[task.id]?.assignedTo || task.assigned_to;
      if (assignedTo) {
        acc[assignedTo] = (acc[assignedTo] || 0) + 1;
      } else {
        acc['unassigned'] = (acc['unassigned'] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalTasks,
      totalEstimatedHours,
      tasksByPriority,
      tasksByAssignee,
      isOvercommitted: totalEstimatedHours > 40
    };
  }, [commitmentState, tasks]);

  // Handle task selection
  const handleTaskSelection = (taskId, isSelected) => {
    setCommitmentState(prev => {
      const newSelected = new Set(prev.selectedTasks);
      if (isSelected) {
        newSelected.add(taskId);
        // Initialize assignment data if not exists
        if (!prev.taskAssignments[taskId]) {
          const task = tasks.find(t => t.id === taskId);
          return {
            ...prev,
            selectedTasks: newSelected,
            taskAssignments: {
              ...prev.taskAssignments,
              [taskId]: {
                assignedTo: task?.assigned_to || user?.id,
                priority: task?.priority || 3,
                estimatedHours: 2 // Default estimate
              }
            }
          };
        }
      } else {
        newSelected.delete(taskId);
      }
      return { ...prev, selectedTasks: newSelected };
    });
  };

  // Handle task assignment updates
  const updateTaskAssignment = (taskId, field, value) => {
    setCommitmentState(prev => ({
      ...prev,
      taskAssignments: {
        ...prev.taskAssignments,
        [taskId]: {
          ...prev.taskAssignments[taskId],
          [field]: value
        }
      }
    }));
  };

  // Handle bulk selection by category
  const handleBulkSelection = (section, isSelected) => {
    const sectionTasks = filteredTaskSections[section];
    setCommitmentState(prev => {
      const newSelected = new Set(prev.selectedTasks);
      const newAssignments = { ...prev.taskAssignments };
      
      sectionTasks.forEach(task => {
        if (isSelected) {
          newSelected.add(task.id);
          if (!newAssignments[task.id]) {
            newAssignments[task.id] = {
              assignedTo: task.assigned_to || user?.id,
              priority: task.priority || 3,
              estimatedHours: 2
            };
          }
        } else {
          newSelected.delete(task.id);
        }
      });

      return {
        ...prev,
        selectedTasks: newSelected,
        taskAssignments: newAssignments,
        bulkSelections: {
          ...prev.bulkSelections,
          [section]: isSelected
        }
      };
    });
  };

  // Get smart suggestions
  const getSmartSuggestions = () => {
    const suggestions = [];
    const { totalEstimatedHours, totalTasks } = commitmentMetrics;

    if (totalEstimatedHours > 40) {
      suggestions.push({
        type: 'warning',
        icon: AlertTriangle,
        message: `You've committed to ${totalEstimatedHours} hours (>${40}h limit). Consider reducing scope or adjusting estimates.`,
        action: 'reduce_scope'
      });
    } else if (totalEstimatedHours < 20) {
      suggestions.push({
        type: 'info',
        icon: Target,
        message: `Only ${totalEstimatedHours} hours committed. You might have capacity for more high-priority tasks.`,
        action: 'add_more'
      });
    }

    if (totalTasks === 0) {
      suggestions.push({
        type: 'neutral',
        icon: Plus,
        message: 'No tasks selected yet. Start by choosing your most important tasks for the week.',
        action: 'get_started'
      });
    }

    // Check for unassigned tasks
    const unassignedTasks = Array.from(commitmentState.selectedTasks).filter(taskId => {
      const assignment = commitmentState.taskAssignments[taskId];
      return !assignment?.assignedTo;
    });

    if (unassignedTasks.length > 0) {
      suggestions.push({
        type: 'warning',
        icon: User,
        message: `${unassignedTasks.length} tasks are unassigned. Make sure all committed tasks have owners.`,
        action: 'assign_tasks'
      });
    }

    return suggestions;
  };

  // Save commitment and progress to session
  const handleSaveCommitment = async () => {
    setIsLoading(true);
    try {
      // Update session progress with commitment data
      setQuadrantData('commitment', {
        selectedTasks: Array.from(commitmentState.selectedTasks),
        taskAssignments: commitmentState.taskAssignments,
        metrics: commitmentMetrics,
        timestamp: new Date().toISOString()
      });

      // Update each committed task with new assignments if changed
      const updatePromises = Array.from(commitmentState.selectedTasks).map(async (taskId) => {
        const assignment = commitmentState.taskAssignments[taskId];
        const task = tasks.find(t => t.id === taskId);
        
        if (task && assignment) {
          const updates = {};
          if (assignment.assignedTo !== task.assigned_to) {
            updates.assigned_to = assignment.assignedTo;
          }
          if (assignment.priority !== task.priority) {
            updates.priority = assignment.priority;
          }
          
          // Add estimated hours as metadata
          updates.weekly_commitment_hours = assignment.estimatedHours;
          updates.committed_session_id = sessionId;
          
          if (Object.keys(updates).length > 0) {
            await updateTask(taskId, updates);
          }
        }
      });

      await Promise.all(updatePromises);
      
      onProgress?.(1.0);
      onComplete?.();
    } catch (err) {
      setError('Failed to save commitment');
      console.error('Save commitment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update progress based on selections
  useEffect(() => {
    const totalAvailableTasks = Object.values(taskSections).flat().length;
    const progress = totalAvailableTasks > 0 ? 
      Math.min(commitmentState.selectedTasks.size / Math.max(totalAvailableTasks * 0.3, 1), 0.9) : 
      0;
    onProgress?.(progress);
  }, [commitmentState.selectedTasks, taskSections, onProgress]);

  // Render task card
  const renderTaskCard = (task, sectionType) => {
    const isSelected = commitmentState.selectedTasks.has(task.id);
    const isExpanded = viewState.expandedTasks.has(task.id);
    const assignment = commitmentState.taskAssignments[task.id] || {};
    const assignedMember = familyMembers.find(m => m.id === assignment.assignedTo || task.assigned_to);

    return (
      <div 
        key={task.id}
        className={`border rounded-lg transition-all duration-200 ${
          isSelected 
            ? 'bg-blue-50 border-blue-300 shadow-md' 
            : 'bg-white border-gray-200 hover:shadow-sm'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Selection checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />

            {/* Task content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                  
                  {/* Task meta information */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sectionType === 'deferred' 
                        ? 'bg-orange-100 text-orange-700' 
                        : sectionType === 'newFromInbox'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {sectionType === 'deferred' ? 'Deferred' : 
                       sectionType === 'newFromInbox' ? 'New from Inbox' : 'Backlog'}
                    </span>
                    
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {task.category && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                        {task.category}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Priority indicator */}
                <div className="ml-3 flex items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    (assignment.priority || task.priority) >= 4 
                      ? 'bg-red-400' 
                      : (assignment.priority || task.priority) >= 3 
                      ? 'bg-yellow-400' 
                      : 'bg-green-400'
                  }`} />
                </div>
              </div>

              {/* Assignment controls (shown when selected) */}
              {isSelected && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Assign to person */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Assign To
                      </label>
                      <select
                        value={assignment.assignedTo || ''}
                        onChange={(e) => updateTaskAssignment(task.id, 'assignedTo', 
                          e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Unassigned</option>
                        {familyMembers.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority level */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Priority (1-5)
                      </label>
                      <select
                        value={assignment.priority || task.priority || 3}
                        onChange={(e) => updateTaskAssignment(task.id, 'priority', parseInt(e.target.value))}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={1}>1 - Low</option>
                        <option value={2}>2 - Medium-Low</option>
                        <option value={3}>3 - Medium</option>
                        <option value={4}>4 - High</option>
                        <option value={5}>5 - Critical</option>
                      </select>
                    </div>

                    {/* Estimated time */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Est. Hours
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={assignment.estimatedHours || 2}
                        onChange={(e) => updateTaskAssignment(task.id, 'estimatedHours', 
                          parseFloat(e.target.value))}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Section data for rendering
  const sections = [
    {
      id: 'deferred',
      title: 'Deferred from Last Week',
      icon: RotateCcw,
      color: 'orange',
      description: 'Tasks you moved from last week that need attention',
      tasks: filteredTaskSections.deferred
    },
    {
      id: 'newFromInbox',
      title: 'New from Inbox',
      icon: Inbox,
      color: 'green',
      description: 'Fresh tasks created during inbox processing',
      tasks: filteredTaskSections.newFromInbox
    },
    {
      id: 'backlog',
      title: 'Existing Backlog',
      icon: Archive,
      color: 'gray',
      description: 'Previously created tasks waiting for scheduling',
      tasks: filteredTaskSections.backlog
    }
  ];

  if (isLoading || taskLoading) {
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
          <XCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">{error || taskError}</p>
        </div>
      </div>
    );
  }

  const suggestions = getSmartSuggestions();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Weekly Commitment</h2>
        <p className="text-gray-600">
          Select tasks to commit to this week and assign them to family members
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category filter */}
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="family">Family</option>
            <option value="home">Home</option>
            <option value="health">Health</option>
          </select>

          {/* Assignee filter */}
          <select
            value={filters.assignee}
            onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Assignees</option>
            {familyMembers.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>

          {/* Sort by */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="title">Title</option>
            <option value="estimatedTime">Estimated Time</option>
          </select>

          {/* Sort direction */}
          <button
            onClick={() => setFilters(prev => ({ 
              ...prev, 
              sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc'
            }))}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {filters.sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            {filters.sortDirection === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 flex items-center mb-3">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Smart Suggestions
          </h3>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-md bg-white/50">
                <suggestion.icon className={`h-4 w-4 mt-0.5 ${
                  suggestion.type === 'warning' ? 'text-red-600' :
                  suggestion.type === 'info' ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <p className="text-sm text-gray-700">{suggestion.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200">
            {/* Section Header */}
            <div className={`px-6 py-4 border-b border-gray-200 ${
              section.color === 'orange' ? 'bg-orange-50' :
              section.color === 'green' ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <section.icon className={`h-5 w-5 ${
                    section.color === 'orange' ? 'text-orange-600' :
                    section.color === 'green' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {section.title}
                      <span className="ml-2 text-sm text-gray-600">
                        ({section.tasks.length} tasks)
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  </div>
                </div>

                {/* Bulk selection for section */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={section.tasks.length > 0 && section.tasks.every(task => 
                        commitmentState.selectedTasks.has(task.id)
                      )}
                      onChange={(e) => handleBulkSelection(section.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Select All
                  </label>
                  <span className="text-sm text-gray-500">
                    {section.tasks.filter(task => commitmentState.selectedTasks.has(task.id)).length} selected
                  </span>
                </div>
              </div>
            </div>

            {/* Section Tasks */}
            <div className="p-6">
              {section.tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <section.icon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No tasks in this category</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {section.tasks.map(task => renderTaskCard(task, section.id))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Commitment Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Commitment Summary
          </h3>
          <button
            onClick={() => setViewState(prev => ({ ...prev, showSummary: !prev.showSummary }))}
            className="text-blue-600 hover:text-blue-800"
          >
            {viewState.showSummary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{commitmentMetrics.totalTasks}</div>
            <div className="text-sm text-blue-700">Tasks Selected</div>
          </div>
          
          <div className={`text-center p-3 rounded-lg ${
            commitmentMetrics.isOvercommitted 
              ? 'bg-red-50' 
              : commitmentMetrics.totalEstimatedHours < 20 
              ? 'bg-yellow-50' 
              : 'bg-green-50'
          }`}>
            <div className={`text-2xl font-bold ${
              commitmentMetrics.isOvercommitted 
                ? 'text-red-900' 
                : commitmentMetrics.totalEstimatedHours < 20 
                ? 'text-yellow-900' 
                : 'text-green-900'
            }`}>
              {commitmentMetrics.totalEstimatedHours}h
            </div>
            <div className={`text-sm ${
              commitmentMetrics.isOvercommitted 
                ? 'text-red-700' 
                : commitmentMetrics.totalEstimatedHours < 20 
                ? 'text-yellow-700' 
                : 'text-green-700'
            }`}>
              Total Hours
              {commitmentMetrics.isOvercommitted && (
                <div className="flex items-center justify-center mt-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Over 40h!
                </div>
              )}
            </div>
          </div>

          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">
              {Object.values(commitmentMetrics.tasksByPriority).reduce((sum, count) => sum + count, 0)}
            </div>
            <div className="text-sm text-purple-700">High Priority</div>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {Object.keys(commitmentMetrics.tasksByAssignee).length}
            </div>
            <div className="text-sm text-gray-700">People Involved</div>
          </div>
        </div>

        {/* Detailed breakdown when expanded */}
        {viewState.showSummary && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priority breakdown */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Tasks by Priority</h4>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(priority => (
                    <div key={priority} className="flex items-center justify-between text-sm">
                      <span className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          priority >= 4 ? 'bg-red-400' : 
                          priority >= 3 ? 'bg-yellow-400' : 'bg-green-400'
                        }`} />
                        Priority {priority}
                      </span>
                      <span className="font-medium">
                        {commitmentMetrics.tasksByPriority[priority] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignee breakdown */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Tasks by Person</h4>
                <div className="space-y-2">
                  {Object.entries(commitmentMetrics.tasksByAssignee).map(([assigneeId, count]) => {
                    const member = assigneeId === 'unassigned' 
                      ? { name: 'Unassigned', color: '#6B7280' }
                      : familyMembers.find(m => m.id === parseInt(assigneeId));
                    
                    return (
                      <div key={assigneeId} className="flex items-center justify-between text-sm">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-2 text-gray-400" />
                          {member?.name || 'Unknown'}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <div className="text-sm text-gray-600">
          {commitmentMetrics.totalTasks} tasks selected • {commitmentMetrics.totalEstimatedHours}h estimated
          {commitmentMetrics.isOvercommitted && (
            <span className="text-red-600 ml-2 font-medium">
              • Warning: Over capacity!
            </span>
          )}
        </div>

        <button
          onClick={handleSaveCommitment}
          disabled={commitmentMetrics.totalTasks === 0 || isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Commit to Week
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WeekCommitment;