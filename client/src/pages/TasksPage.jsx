import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Clock, Calendar, Trash2, Edit2, ListChecks, Copy, X, Check } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const TasksPage = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: ''
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'general',
    items: ['']
  });

  const { tasks, fetchTasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchTasks();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/api/checklists/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await addTask(newTask);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assigned_to: ''
      });
      setShowNewTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      const filteredItems = newTemplate.items.filter(item => item.trim() !== '');
      await api.post('/api/checklists/templates', {
        ...newTemplate,
        items: filteredItems
      });
      await fetchTemplates();
      setNewTemplate({
        name: '',
        category: 'general',
        items: ['']
      });
      setShowNewTemplate(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async (templateId, updates) => {
    try {
      await api.put(`/api/checklists/templates/${templateId}`, updates);
      await fetchTemplates();
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await api.delete(`/api/checklists/templates/${templateId}`);
        await fetchTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  const handleCreateFromTemplate = async (template) => {
    try {
      const response = await api.post('/api/checklists/instances', {
        template_id: template.id,
        title: template.name,
        event_id: null // Can be linked to an event later
      });
      // Show success message
      alert(`Created checklist from template: ${template.name}`);
    } catch (error) {
      console.error('Error creating checklist from template:', error);
    }
  };

  const addTemplateItem = () => {
    setNewTemplate({
      ...newTemplate,
      items: [...newTemplate.items, '']
    });
  };

  const updateTemplateItem = (index, value) => {
    const newItems = [...newTemplate.items];
    newItems[index] = value;
    setNewTemplate({
      ...newTemplate,
      items: newItems
    });
  };

  const removeTemplateItem = (index) => {
    const newItems = newTemplate.items.filter((_, i) => i !== index);
    setNewTemplate({
      ...newTemplate,
      items: newItems
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'travel': return 'bg-blue-100 text-blue-800';
      case 'school': return 'bg-purple-100 text-purple-800';
      case 'sports': return 'bg-green-100 text-green-800';
      case 'health': return 'bg-red-100 text-red-800';
      case 'shopping': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tasks & Checklists</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Task</span>
            </button>
            <button
              onClick={() => setShowNewTemplate(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ListChecks className="h-5 w-5" />
              <span>Add Checklist</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5" />
              <span>Tasks</span>
              <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">{tasks.length}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ListChecks className="h-5 w-5" />
              <span>Checklist Templates</span>
              <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">{templates.length}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* New Task Form */}
          {showNewTask && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="3"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                    <input
                      type="text"
                      value={newTask.assigned_to}
                      onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                      placeholder="Family member"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNewTask(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tasks List */}
          <div className="grid gap-4">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl shadow-md p-6 transition-all hover:shadow-lg ${
                    task.status === 'completed' ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className={`mt-1 w-6 h-6 rounded-md border-2 transition-colors ${
                          task.status === 'completed'
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {task.status === 'completed' && (
                          <Check className="h-4 w-4 text-white mx-auto" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold ${
                          task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority} priority
                          </span>
                          {task.due_date && (
                            <span className="flex items-center text-sm text-gray-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {task.assigned_to && (
                            <span className="text-sm text-gray-500">
                              Assigned to: {task.assigned_to}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tasks yet. Create your first task!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* New Template Form */}
          {showNewTemplate && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Template</h3>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="general">General</option>
                    <option value="travel">Travel</option>
                    <option value="school">School</option>
                    <option value="sports">Sports</option>
                    <option value="health">Health</option>
                    <option value="shopping">Shopping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Checklist Items</label>
                  <div className="space-y-2">
                    {newTemplate.items.map((item, index) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateTemplateItem(index, e.target.value)}
                          placeholder="Enter item"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {newTemplate.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTemplateItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addTemplateItem}
                    className="mt-2 px-3 py-1 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNewTemplate(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Create Template
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Templates List */}
          <div className="grid gap-4">
            {templates.length > 0 ? (
              templates.map((template) => (
                <div key={template.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
                  {editingTemplate === template.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <input
                        type="text"
                        defaultValue={template.name}
                        onBlur={(e) => handleUpdateTemplate(template.id, { name: e.target.value })}
                        className="text-lg font-semibold px-2 py-1 border border-gray-300 rounded"
                      />
                      <div className="space-y-2">
                        {JSON.parse(template.items).map((item, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Done Editing
                      </button>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                          <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}>
                            {template.category}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleCreateFromTemplate(template)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Use Template"
                          >
                            <Copy className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setEditingTemplate(template.id)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Edit Template"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Template"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {JSON.parse(template.items).map((item, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <ListChecks className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No templates yet. Create your first checklist template!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;