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

    const updatedTaskData = {
      ...task,
      completed: !task.completed,
    };

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    }));

    try {
      await taskAPI.updateTask(taskId, updatedTaskData);
    } catch (error) {
      // Revert on error
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !updatedTaskData.completed } : t
        ),
        error: error.response?.data?.message || 'Failed to update task',
      }));
    }
  },

  // Get tasks by status
  getTasksByStatus: (completed = false) => {
    const state = get();
    return state.tasks.filter((task) => task.completed === completed);
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
      !task.completed && 
      task.dueDate && 
      new Date(task.dueDate) < now
    );
  },

  // Get tasks due today
  getTasksDueToday: () => {
    const state = get();
    const today = new Date().toDateString();
    return state.tasks.filter((task) => 
      !task.completed && 
      task.dueDate && 
      new Date(task.dueDate).toDateString() === today
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
    const completed = state.tasks.filter((task) => task.completed).length;
    const pending = total - completed;
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
}));