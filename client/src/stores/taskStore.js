import { create } from 'zustand';
import { taskAPI } from '../services/tasks';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  // Fetch all tasks
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.getTasks();
      set({
        tasks: response.data,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch tasks';
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  // Add new task
  addTask: async (taskData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.createTask(taskData);
      const newTask = response.data;

      set((state) => ({
        tasks: [...state.tasks, newTask],
        isLoading: false,
        error: null,
      }));

      return newTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create task';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.updateTask(taskId, taskData);
      const updatedTask = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
        error: null,
      }));

      return updatedTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update task';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Delete task
  deleteTask: async (taskId) => {
    set({ isLoading: true, error: null });
    
    try {
      await taskAPI.deleteTask(taskId);

      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete task';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Toggle task completion
  toggleTaskComplete: async (taskId) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatedTaskData = {
      ...task,
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    };

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, completed_at: updatedTaskData.completed_at } : t
      ),
    }));

    try {
      await taskAPI.updateTask(taskId, updatedTaskData);
    } catch (error) {
      // Revert on error
      const revertStatus = newStatus === 'completed' ? 'pending' : 'completed';
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: revertStatus, completed_at: task.completed_at } : t
        ),
        error: error.response?.data?.message || 'Failed to update task',
      }));
    }
  },

  // Schedule task (set scheduled_date)
  scheduleTask: async (taskId, scheduledDate) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.updateTask(taskId, { scheduled_date: scheduledDate });
      const updatedTask = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
        error: null,
      }));

      return updatedTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to schedule task';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Unschedule task (remove scheduled_date)
  unscheduleTask: async (taskId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.updateTask(taskId, { scheduled_date: null });
      const updatedTask = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
        error: null,
      }));

      return updatedTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to unschedule task';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Get tasks by status
  getTasksByStatus: (status = 'pending') => {
    const state = get();
    return state.tasks.filter((task) => task.status === status);
  },

  // Get tasks by priority
  getTasksByPriority: (priority) => {
    const state = get();
    return state.tasks.filter((task) => task.priority === priority);
  },

  // Get tasks by assigned user
  getTasksByAssignee: (assignedTo) => {
    const state = get();
    return state.tasks.filter((task) => task.assignedTo === assignedTo);
  },

  // Get overdue tasks
  getOverdueTasks: () => {
    const state = get();
    const now = new Date();
    return state.tasks.filter((task) => 
      task.status !== 'completed' && 
      task.due_date && 
      new Date(task.due_date) < now
    );
  },

  // Get tasks due today
  getTasksDueToday: () => {
    const state = get();
    const today = new Date().toDateString();
    return state.tasks.filter((task) => 
      task.status !== 'completed' && 
      task.due_date && 
      new Date(task.due_date).toDateString() === today
    );
  },

  // Search tasks
  searchTasks: (query) => {
    const state = get();
    const searchTerm = query.toLowerCase();
    return state.tasks.filter((task) =>
      task.title.toLowerCase().includes(searchTerm) ||
      task.description?.toLowerCase().includes(searchTerm) ||
      task.assignedTo?.toLowerCase().includes(searchTerm)
    );
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Get task statistics
  getTaskStats: () => {
    const state = get();
    const total = state.tasks.length;
    const completed = state.tasks.filter((task) => task.status === 'completed').length;
    const pending = state.tasks.filter((task) => task.status === 'pending').length;
    const overdue = get().getOverdueTasks().length;
    const dueToday = get().getTasksDueToday().length;

    return {
      total,
      completed,
      pending,
      overdue,
      dueToday,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },

  // Phase 9: Task Lifecycle Methods
  
  // Templates management
  templates: [],
  isLoadingTemplates: false,
  
  // Fetch task templates
  fetchTemplates: async (category = null) => {
    set({ isLoadingTemplates: true, error: null });
    
    try {
      const response = await taskAPI.getTemplates(category);
      set({
        templates: response.data,
        isLoadingTemplates: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch templates';
      set({
        error: errorMessage,
        isLoadingTemplates: false,
      });
    }
  },

  // Create task from template
  createTaskFromTemplate: async (templateId, customData = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.createFromTemplate(templateId, customData);
      const newTask = response.data;

      set((state) => ({
        tasks: [...state.tasks, newTask],
        isLoading: false,
        error: null,
      }));

      return newTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create task from template';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Complete task with lifecycle handling
  completeTaskWithLifecycle: async (taskId, completionData = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.completeWithEvents(taskId, completionData);
      const result = response.data;

      // Update the completed task in the store
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? result.task : task
        ),
        isLoading: false,
        error: null,
      }));

      // Add any newly created tasks to the store
      if (result.nextTasks && result.nextTasks.length > 0) {
        set((state) => ({
          tasks: [...state.tasks, ...result.nextTasks],
        }));
      }

      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to complete task with lifecycle';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Generate next recurring instance
  generateNextRecurringInstance: async (taskId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.generateNextInstance(taskId);
      const nextTask = response.data;

      set((state) => ({
        tasks: [...state.tasks, nextTask],
        isLoading: false,
        error: null,
      }));

      return nextTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to generate next instance';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Convert task to event
  convertTaskToEvent: async (taskId, eventData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.convertToEvent(taskId, eventData);
      const event = response.data;

      // Update the task to show it's linked to an event
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? { ...task, linked_event_id: event.id } : task
        ),
        isLoading: false,
        error: null,
      }));

      return event;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to convert task to event';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Smart prompting state
  activePrompts: [],
  
  // Add a smart prompt to the queue
  addPrompt: (prompt) => {
    set((state) => ({
      activePrompts: [...state.activePrompts, { ...prompt, id: Date.now(), timestamp: new Date() }]
    }));
  },

  // Remove prompt from queue
  removePrompt: (promptId) => {
    set((state) => ({
      activePrompts: state.activePrompts.filter(p => p.id !== promptId)
    }));
  },

  // Clear all prompts
  clearPrompts: () => {
    set({ activePrompts: [] });
  },

  // Get tasks by type
  getTasksByType: (type) => {
    const state = get();
    return state.tasks.filter((task) => task.task_type === type);
  },

  // Get recurring tasks
  getRecurringTasks: () => {
    const state = get();
    return state.tasks.filter((task) => task.task_type === 'recurring');
  },

  // Get preparatory tasks
  getPreparatoryTasks: () => {
    const state = get();
    return state.tasks.filter((task) => task.task_type === 'preparatory');
  },

  // Get tasks that can create events
  getEventCreatingTasks: () => {
    const state = get();
    return state.tasks.filter((task) => task.creates_events);
  },

  // Get templates by category
  getTemplatesByCategory: (category) => {
    const state = get();
    return state.templates.filter((template) => template.category === category);
  },

  // Session Review Methods
  
  // Get tasks from last week for review
  getLastWeekTasks: () => {
    const state = get();
    const today = new Date();
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - today.getDay()); // Start of this week
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 7);

    return state.tasks.filter(task => {
      const taskDate = new Date(task.created_at || task.due_date);
      return taskDate >= lastWeekStart && taskDate < lastWeekEnd;
    });
  },

  // Mark task as complete and track review action
  reviewCompleteTask: async (taskId, sessionId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.updateTask(taskId, { 
        status: 'completed',
        completed_at: new Date().toISOString(),
        review_action: 'completed',
        review_session_id: sessionId
      });
      const updatedTask = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
        error: null,
      }));

      return updatedTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to complete task';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Defer task to this week
  deferTaskToThisWeek: async (taskId, sessionId) => {
    set({ isLoading: true, error: null });
    
    try {
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));

      const response = await taskAPI.updateTask(taskId, { 
        due_date: endOfWeek.toISOString(),
        review_action: 'deferred_this_week',
        review_session_id: sessionId,
        status: 'pending'
      });
      const updatedTask = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
        error: null,
      }));

      return updatedTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to defer task';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Defer task to future date
  deferTaskToFuture: async (taskId, futureDate, sessionId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.updateTask(taskId, { 
        due_date: futureDate,
        review_action: 'deferred_future',
        review_session_id: sessionId,
        status: 'pending'
      });
      const updatedTask = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
        error: null,
      }));

      return updatedTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to defer task to future';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Archive task (mark as no longer relevant)
  archiveTask: async (taskId, sessionId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.updateTask(taskId, { 
        status: 'archived',
        archived_at: new Date().toISOString(),
        review_action: 'archived',
        review_session_id: sessionId
      });
      const updatedTask = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
        error: null,
      }));

      return updatedTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to archive task';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Get session review statistics
  getSessionReviewStats: (sessionTasks) => {
    const total = sessionTasks.length;
    const completed = sessionTasks.filter(task => task.review_action === 'completed').length;
    const deferred = sessionTasks.filter(task => 
      task.review_action === 'deferred_this_week' || task.review_action === 'deferred_future'
    ).length;
    const archived = sessionTasks.filter(task => task.review_action === 'archived').length;
    const pending = total - completed - deferred - archived;

    return {
      total,
      completed,
      deferred,
      archived,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  },

  // Bulk update task review actions
  bulkUpdateTaskReview: async (taskUpdates, sessionId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await taskAPI.bulkUpdateTasks(
        taskUpdates.map(update => update.taskId),
        taskUpdates.reduce((acc, update) => {
          acc[update.taskId] = {
            ...update.updates,
            review_session_id: sessionId
          };
          return acc;
        }, {})
      );

      const updatedTasks = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) => {
          const updatedTask = updatedTasks.find(ut => ut.id === task.id);
          return updatedTask || task;
        }),
        isLoading: false,
        error: null,
      }));

      return updatedTasks;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to bulk update tasks';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Week Commitment Methods
  
  // Get tasks deferred from last week
  getDeferredTasks: () => {
    const state = get();
    return state.tasks.filter(task => 
      task.review_action === 'deferred_this_week' && 
      task.status !== 'completed' &&
      task.status !== 'archived'
    );
  },

  // Get new tasks from inbox processing
  getNewFromInboxTasks: () => {
    const state = get();
    return state.tasks.filter(task => 
      task.created_from_inbox && 
      task.status !== 'completed' &&
      task.status !== 'archived' &&
      !task.review_action
    );
  },

  // Get backlog tasks (existing pending tasks not in other categories)
  getBacklogTasks: () => {
    const state = get();
    return state.tasks.filter(task => 
      task.status === 'pending' &&
      task.review_action !== 'deferred_this_week' &&
      !task.created_from_inbox
    );
  },

  // Get tasks by category
  getTasksByCategory: (category) => {
    const state = get();
    return state.tasks.filter(task => task.category === category);
  },

  // Commit tasks for the week
  commitTasksForWeek: async (taskCommitments, sessionId) => {
    set({ isLoading: true, error: null });
    
    try {
      const updatePromises = Object.entries(taskCommitments).map(async ([taskId, commitment]) => {
        const updates = {
          assigned_to: commitment.assignedTo,
          priority: commitment.priority,
          weekly_commitment_hours: commitment.estimatedHours,
          committed_session_id: sessionId,
          committed_at: new Date().toISOString(),
          status: 'committed'
        };
        
        return await taskAPI.updateTask(parseInt(taskId), updates);
      });

      const updatedTasks = await Promise.all(updatePromises);

      set((state) => ({
        tasks: state.tasks.map((task) => {
          const updatedTask = updatedTasks.find(ut => ut.data.id === task.id);
          return updatedTask ? updatedTask.data : task;
        }),
        isLoading: false,
        error: null,
      }));

      return updatedTasks.map(t => t.data);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to commit tasks for week';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Get commitment statistics
  getCommitmentStats: (commitmentData) => {
    const { selectedTasks, taskAssignments } = commitmentData;
    const totalTasks = selectedTasks.length;
    const totalHours = selectedTasks.reduce((sum, taskId) => {
      return sum + (taskAssignments[taskId]?.estimatedHours || 0);
    }, 0);

    const priorityBreakdown = selectedTasks.reduce((acc, taskId) => {
      const priority = taskAssignments[taskId]?.priority || 3;
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const assigneeBreakdown = selectedTasks.reduce((acc, taskId) => {
      const assignedTo = taskAssignments[taskId]?.assignedTo;
      if (assignedTo) {
        acc[assignedTo] = (acc[assignedTo] || 0) + 1;
      } else {
        acc['unassigned'] = (acc['unassigned'] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalTasks,
      totalHours,
      priorityBreakdown,
      assigneeBreakdown,
      isOvercommitted: totalHours > 40,
      averageHoursPerTask: totalTasks > 0 ? totalHours / totalTasks : 0
    };
  },

  // Active Backlog Review Methods
  
  // Get active backlog tasks that need review
  getActiveBacklogTasks: (sessionId = null) => {
    const state = get();
    const today = new Date();
    const endOfThisWeek = new Date(today);
    endOfThisWeek.setDate(today.getDate() + (6 - today.getDay()));
    endOfThisWeek.setHours(23, 59, 59, 999);

    return state.tasks.filter(task => {
      // Must be pending status
      if (task.status !== 'pending') return false;
      
      // Must not be completed, archived, or deleted
      if (task.status === 'completed' || task.status === 'archived' || task.status === 'deleted') return false;
      
      // Must not already be reviewed in current session
      if (sessionId && task.review_session_id === sessionId) return false;
      
      // Filter out tasks deferred to future dates beyond this week
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        // If due date is in the future beyond this week, exclude it
        if (dueDate > endOfThisWeek) return false;
      }
      
      // Include tasks that are:
      // 1. No defer date (never been deferred)
      // 2. Defer date is this week or earlier
      // 3. Past due
      // 4. Never committed to any week
      return true;
    }).map(task => {
      // Add age calculation
      const createdDate = new Date(task.created_at);
      const ageInDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
      const ageInWeeks = Math.floor(ageInDays / 7);
      
      return {
        ...task,
        ageInDays,
        ageInWeeks,
        isStale: ageInWeeks >= 2
      };
    });
  },

  // Get backlog tasks sorted by different criteria
  getActiveBacklogTasksSorted: (sessionId = null, sortBy = 'age') => {
    const tasks = get().getActiveBacklogTasks(sessionId);
    
    switch (sortBy) {
      case 'age':
        return tasks.sort((a, b) => b.ageInDays - a.ageInDays);
      case 'priority':
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return tasks.sort((a, b) => {
          const aPrio = priorityOrder[a.priority?.toLowerCase()] || 0;
          const bPrio = priorityOrder[b.priority?.toLowerCase()] || 0;
          return bPrio - aPrio;
        });
      case 'category':
        return tasks.sort((a, b) => {
          const aCategory = a.category || 'Uncategorized';
          const bCategory = b.category || 'Uncategorized';
          return aCategory.localeCompare(bCategory);
        });
      case 'due_date':
        return tasks.sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
      default:
        return tasks;
    }
  },

  // Get backlog review statistics
  getBacklogReviewStats: (sessionId = null) => {
    const tasks = get().getActiveBacklogTasks(sessionId);
    const staleTasks = tasks.filter(task => task.isStale);
    
    const categoryBreakdown = tasks.reduce((acc, task) => {
      const category = task.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const priorityBreakdown = tasks.reduce((acc, task) => {
      const priority = task.priority || 'none';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const ageBreakdown = tasks.reduce((acc, task) => {
      if (task.ageInWeeks >= 4) acc.veryOld = (acc.veryOld || 0) + 1;
      else if (task.ageInWeeks >= 2) acc.stale = (acc.stale || 0) + 1;
      else acc.fresh = (acc.fresh || 0) + 1;
      return acc;
    }, { fresh: 0, stale: 0, veryOld: 0 });

    return {
      totalTasks: tasks.length,
      staleTasks: staleTasks.length,
      categoryBreakdown,
      priorityBreakdown,
      ageBreakdown,
      averageAge: tasks.length > 0 ? Math.round(tasks.reduce((sum, task) => sum + task.ageInDays, 0) / tasks.length) : 0
    };
  },

  // Unified Task Management Methods
  
  // Get tasks for unified views
  getUnifiedTaskViews: () => {
    const state = get();
    const now = new Date();
    
    return {
      // Active tasks: pending, not scheduled, not archived
      active: state.tasks.filter(task => 
        task.status === 'pending' && 
        !task.scheduled_date &&
        task.status !== 'archived'
      ),
      
      // Scheduled tasks: have scheduled_date, not completed, not archived  
      scheduled: state.tasks.filter(task => 
        task.scheduled_date && 
        task.status !== 'completed' &&
        task.status !== 'archived'
      ),
      
      // Completed tasks from last 30 days
      recentlyCompleted: state.tasks.filter(task => {
        if (task.status !== 'completed' || !task.completed_at) return false;
        const completedDate = new Date(task.completed_at);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return completedDate >= thirtyDaysAgo;
      })
    };
  },

  // Create task from inbox item
  createTaskFromInboxItem: async (inboxItemId, taskData) => {
    set({ isLoading: true, error: null });
    
    try {
      const enrichedTaskData = {
        ...taskData,
        created_from_inbox: true,
        inbox_item_id: inboxItemId,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      const response = await taskAPI.createTask(enrichedTaskData);
      const newTask = response.data;

      set((state) => ({
        tasks: [...state.tasks, newTask],
        isLoading: false,
        error: null,
      }));

      return newTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create task from inbox';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Move task through unified states: active → scheduled → completed
  transitionTaskState: async (taskId, toState, additionalData = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      let updateData = { ...additionalData };
      
      switch (toState) {
        case 'active':
          updateData = { ...updateData, scheduled_date: null, status: 'pending' };
          break;
        case 'scheduled':
          if (!updateData.scheduled_date) {
            throw new Error('scheduled_date is required for scheduled state');
          }
          updateData = { ...updateData, status: 'pending' };
          break;
        case 'completed':
          updateData = { 
            ...updateData, 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          };
          break;
        case 'archived':
          updateData = { 
            ...updateData, 
            status: 'archived', 
            archived_at: new Date().toISOString() 
          };
          break;
        default:
          throw new Error(`Unknown state: ${toState}`);
      }

      const response = await taskAPI.updateTask(taskId, updateData);
      const updatedTask = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
        error: null,
      }));

      return updatedTask;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to transition task state';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Bulk operations for unified task manager
  bulkTransitionTasks: async (taskIds, toState, additionalData = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      const updates = {};
      
      switch (toState) {
        case 'active':
          Object.assign(updates, { scheduled_date: null, status: 'pending' });
          break;
        case 'completed':
          Object.assign(updates, { 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          });
          break;
        case 'archived':
          Object.assign(updates, { 
            status: 'archived', 
            archived_at: new Date().toISOString() 
          });
          break;
      }
      
      Object.assign(updates, additionalData);

      const response = await taskAPI.bulkUpdateTasks(taskIds, updates);
      const updatedTasks = response.data;

      set((state) => ({
        tasks: state.tasks.map((task) => {
          const updatedTask = updatedTasks.find(ut => ut.id === task.id);
          return updatedTask || task;
        }),
        isLoading: false,
        error: null,
      }));

      return updatedTasks;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to bulk transition tasks';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },
}));