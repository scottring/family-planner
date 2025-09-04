import api from './api';

export const taskAPI = {
  // Get all tasks for the current user/family
  getTasks: (params = {}) => {
    return api.get('/tasks', { params });
  },

  // Get a specific task by ID
  getTask: (taskId) => {
    return api.get(`/tasks/${taskId}`);
  },

  // Create a new task
  createTask: (taskData) => {
    return api.post('/tasks', taskData);
  },

  // Update a task
  updateTask: (taskId, taskData) => {
    return api.put(`/tasks/${taskId}`, taskData);
  },

  // Delete a task
  deleteTask: (taskId) => {
    return api.delete(`/tasks/${taskId}`);
  },

  // Toggle task completion status
  toggleComplete: (taskId) => {
    return api.patch(`/tasks/${taskId}/toggle-complete`);
  },

  // Get tasks by status
  getTasksByStatus: (status) => {
    return api.get('/tasks', { params: { status } });
  },

  // Get tasks by priority
  getTasksByPriority: (priority) => {
    return api.get('/tasks', { params: { priority } });
  },

  // Get tasks assigned to a specific user
  getTasksByAssignee: (assignedTo) => {
    return api.get('/tasks', { params: { assignedTo } });
  },

  // Get overdue tasks
  getOverdueTasks: () => {
    return api.get('/tasks/overdue');
  },

  // Get tasks due today
  getTasksDueToday: () => {
    return api.get('/tasks/due-today');
  },

  // Search tasks
  searchTasks: (query) => {
    return api.get('/tasks/search', { params: { q: query } });
  },

  // Get task statistics
  getTaskStats: () => {
    return api.get('/tasks/stats');
  },

  // Bulk operations
  bulkUpdateTasks: (taskIds, updates) => {
    return api.patch('/tasks/bulk-update', { taskIds, updates });
  },

  // Bulk delete tasks
  bulkDeleteTasks: (taskIds) => {
    return api.delete('/tasks/bulk-delete', { data: { taskIds } });
  },

  // Mark multiple tasks as complete
  bulkMarkComplete: (taskIds) => {
    return api.patch('/tasks/bulk-complete', { taskIds });
  },

  // Phase 9: Task Lifecycle endpoints
  
  // Get task templates
  getTemplates: (category = null) => {
    const params = category ? { category } : {};
    return api.get('/tasks/templates', { params });
  },

  // Create task from template
  createFromTemplate: (templateId, customData = {}) => {
    return api.post('/tasks/from-template', { templateId, customData });
  },

  // Complete task with lifecycle handling
  completeWithEvents: (taskId, completionData = {}) => {
    return api.post(`/tasks/${taskId}/complete-with-events`, { completionData });
  },

  // Generate next recurring instance
  generateNextInstance: (taskId) => {
    return api.post(`/tasks/${taskId}/generate-next`);
  },

  // Convert task to event
  convertToEvent: (taskId, eventData) => {
    return api.post(`/tasks/${taskId}/convert-to-event`, { eventData });
  },
};