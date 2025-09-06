import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTaskStore } from '../taskStore'
import { createMockTask } from '../../test/utils/testUtils'

// Mock the task API
const mockTaskAPI = {
  getTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTemplates: vi.fn(),
  createFromTemplate: vi.fn(),
  completeWithEvents: vi.fn(),
  generateNextInstance: vi.fn(),
  convertToEvent: vi.fn()
}

vi.mock('../../services/tasks', () => ({
  taskAPI: mockTaskAPI
}))

describe('useTaskStore', () => {
  let store

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state before each test
    store = useTaskStore.getState()
    useTaskStore.setState({
      tasks: [],
      isLoading: false,
      error: null,
      templates: [],
      isLoadingTemplates: false,
      activePrompts: []
    })
  })

  describe('fetchTasks', () => {
    it('fetches tasks successfully', async () => {
      const mockTasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
        createMockTask({ id: '2', title: 'Task 2' })
      ]
      
      mockTaskAPI.getTasks.mockResolvedValueOnce({ data: mockTasks })

      await useTaskStore.getState().fetchTasks()

      const state = useTaskStore.getState()
      expect(state.tasks).toEqual(mockTasks)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(mockTaskAPI.getTasks).toHaveBeenCalledTimes(1)
    })

    it('handles fetch tasks error', async () => {
      const errorMessage = 'Network error'
      mockTaskAPI.getTasks.mockRejectedValueOnce({
        response: { data: { message: errorMessage } }
      })

      await useTaskStore.getState().fetchTasks()

      const state = useTaskStore.getState()
      expect(state.tasks).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })

    it('handles fetch tasks error without response data', async () => {
      mockTaskAPI.getTasks.mockRejectedValueOnce(new Error('Unknown error'))

      await useTaskStore.getState().fetchTasks()

      const state = useTaskStore.getState()
      expect(state.error).toBe('Failed to fetch tasks')
    })

    it('sets loading state during fetch', async () => {
      let resolvePromise
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockTaskAPI.getTasks.mockReturnValueOnce(promise)

      const fetchPromise = useTaskStore.getState().fetchTasks()

      // Check loading state is true during fetch
      expect(useTaskStore.getState().isLoading).toBe(true)

      resolvePromise({ data: [] })
      await fetchPromise

      // Check loading state is false after fetch
      expect(useTaskStore.getState().isLoading).toBe(false)
    })
  })

  describe('addTask', () => {
    it('adds task successfully', async () => {
      const newTask = createMockTask({ id: '1', title: 'New Task' })
      mockTaskAPI.createTask.mockResolvedValueOnce({ data: newTask })

      const taskData = { title: 'New Task', description: 'Description' }
      const result = await useTaskStore.getState().addTask(taskData)

      const state = useTaskStore.getState()
      expect(state.tasks).toContain(newTask)
      expect(result).toEqual(newTask)
      expect(mockTaskAPI.createTask).toHaveBeenCalledWith(taskData)
    })

    it('handles add task error', async () => {
      const errorMessage = 'Validation error'
      mockTaskAPI.createTask.mockRejectedValueOnce({
        response: { data: { message: errorMessage } }
      })

      const taskData = { title: 'New Task' }
      await expect(useTaskStore.getState().addTask(taskData)).rejects.toThrow()

      const state = useTaskStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.tasks).toEqual([])
    })
  })

  describe('updateTask', () => {
    it('updates task successfully', async () => {
      const existingTask = createMockTask({ id: '1', title: 'Original Task' })
      const updatedTask = { ...existingTask, title: 'Updated Task' }
      
      useTaskStore.setState({ tasks: [existingTask] })
      mockTaskAPI.updateTask.mockResolvedValueOnce({ data: updatedTask })

      const updateData = { title: 'Updated Task' }
      const result = await useTaskStore.getState().updateTask('1', updateData)

      const state = useTaskStore.getState()
      expect(state.tasks.find(t => t.id === '1')).toEqual(updatedTask)
      expect(result).toEqual(updatedTask)
      expect(mockTaskAPI.updateTask).toHaveBeenCalledWith('1', updateData)
    })

    it('handles update task error', async () => {
      const errorMessage = 'Task not found'
      mockTaskAPI.updateTask.mockRejectedValueOnce({
        response: { data: { message: errorMessage } }
      })

      await expect(useTaskStore.getState().updateTask('1', {})).rejects.toThrow()

      const state = useTaskStore.getState()
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('deleteTask', () => {
    it('deletes task successfully', async () => {
      const task1 = createMockTask({ id: '1', title: 'Task 1' })
      const task2 = createMockTask({ id: '2', title: 'Task 2' })
      
      useTaskStore.setState({ tasks: [task1, task2] })
      mockTaskAPI.deleteTask.mockResolvedValueOnce({})

      await useTaskStore.getState().deleteTask('1')

      const state = useTaskStore.getState()
      expect(state.tasks).toEqual([task2])
      expect(state.tasks.find(t => t.id === '1')).toBeUndefined()
      expect(mockTaskAPI.deleteTask).toHaveBeenCalledWith('1')
    })

    it('handles delete task error', async () => {
      const errorMessage = 'Delete failed'
      mockTaskAPI.deleteTask.mockRejectedValueOnce({
        response: { data: { message: errorMessage } }
      })

      await expect(useTaskStore.getState().deleteTask('1')).rejects.toThrow()

      const state = useTaskStore.getState()
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('toggleTaskComplete', () => {
    it('toggles task completion status', async () => {
      const task = createMockTask({ id: '1', status: 'pending' })
      useTaskStore.setState({ tasks: [task] })
      mockTaskAPI.updateTask.mockResolvedValueOnce({ data: { ...task, status: 'completed' } })

      await useTaskStore.getState().toggleTaskComplete('1')

      const state = useTaskStore.getState()
      const updatedTask = state.tasks.find(t => t.id === '1')
      expect(updatedTask.status).toBe('completed')
    })

    it('toggles completed task to pending', async () => {
      const task = createMockTask({ id: '1', status: 'completed' })
      useTaskStore.setState({ tasks: [task] })
      mockTaskAPI.updateTask.mockResolvedValueOnce({ data: { ...task, status: 'pending' } })

      await useTaskStore.getState().toggleTaskComplete('1')

      const state = useTaskStore.getState()
      const updatedTask = state.tasks.find(t => t.id === '1')
      expect(updatedTask.status).toBe('pending')
    })

    it('handles toggle error with optimistic update rollback', async () => {
      const task = createMockTask({ id: '1', status: 'pending' })
      useTaskStore.setState({ tasks: [task] })
      mockTaskAPI.updateTask.mockRejectedValueOnce({
        response: { data: { message: 'Update failed' } }
      })

      await useTaskStore.getState().toggleTaskComplete('1')

      const state = useTaskStore.getState()
      const revertedTask = state.tasks.find(t => t.id === '1')
      expect(revertedTask.status).toBe('pending')
      expect(state.error).toBe('Update failed')
    })

    it('does nothing for non-existent task', async () => {
      useTaskStore.setState({ tasks: [] })

      await useTaskStore.getState().toggleTaskComplete('nonexistent')

      expect(mockTaskAPI.updateTask).not.toHaveBeenCalled()
    })
  })

  describe('Task Filtering and Searching', () => {
    beforeEach(() => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending', priority: 'high', assignedTo: 'John' }),
        createMockTask({ id: '2', status: 'completed', priority: 'medium', assignedTo: 'Jane' }),
        createMockTask({ id: '3', status: 'pending', priority: 'low', assignedTo: 'John' }),
        createMockTask({ id: '4', status: 'completed', priority: 'high', assignedTo: 'Bob', due_date: new Date().toISOString() }),
        createMockTask({ id: '5', status: 'pending', due_date: new Date(Date.now() - 86400000).toISOString() }) // Yesterday (overdue)
      ]
      useTaskStore.setState({ tasks })
    })

    it('filters tasks by status', () => {
      const pendingTasks = useTaskStore.getState().getTasksByStatus('pending')
      const completedTasks = useTaskStore.getState().getTasksByStatus('completed')

      expect(pendingTasks).toHaveLength(3)
      expect(completedTasks).toHaveLength(2)
    })

    it('filters tasks by priority', () => {
      const highPriorityTasks = useTaskStore.getState().getTasksByPriority('high')
      const mediumPriorityTasks = useTaskStore.getState().getTasksByPriority('medium')

      expect(highPriorityTasks).toHaveLength(2)
      expect(mediumPriorityTasks).toHaveLength(1)
    })

    it('filters tasks by assignee', () => {
      const johnsTasks = useTaskStore.getState().getTasksByAssignee('John')
      const janesTasks = useTaskStore.getState().getTasksByAssignee('Jane')

      expect(johnsTasks).toHaveLength(2)
      expect(janesTasks).toHaveLength(1)
    })

    it('gets overdue tasks', () => {
      const overdueTasks = useTaskStore.getState().getOverdueTasks()

      expect(overdueTasks).toHaveLength(1)
      expect(overdueTasks[0].id).toBe('5')
    })

    it('gets tasks due today', () => {
      const tasksDueToday = useTaskStore.getState().getTasksDueToday()

      expect(tasksDueToday).toHaveLength(1)
      expect(tasksDueToday[0].id).toBe('4')
    })

    it('searches tasks by title and description', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Buy groceries', description: 'milk and bread' }),
        createMockTask({ id: '2', title: 'Meeting with client', description: 'discuss project' }),
        createMockTask({ id: '3', title: 'Call mom', description: 'wish happy birthday' })
      ]
      useTaskStore.setState({ tasks })

      const groceryTasks = useTaskStore.getState().searchTasks('groceries')
      const projectTasks = useTaskStore.getState().searchTasks('project')
      const birthTasks = useTaskStore.getState().searchTasks('birthday')

      expect(groceryTasks).toHaveLength(1)
      expect(projectTasks).toHaveLength(1)
      expect(birthTasks).toHaveLength(1)
    })

    it('searches tasks case insensitively', () => {
      const tasks = [
        createMockTask({ id: '1', title: 'Buy GROCERIES', description: 'MILK and bread' })
      ]
      useTaskStore.setState({ tasks })

      const results = useTaskStore.getState().searchTasks('groceries')

      expect(results).toHaveLength(1)
    })
  })

  describe('Task Statistics', () => {
    it('calculates task statistics correctly', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'pending' }),
        createMockTask({ id: '2', status: 'completed' }),
        createMockTask({ id: '3', status: 'completed' }),
        createMockTask({ id: '4', status: 'pending', due_date: new Date().toISOString() }),
        createMockTask({ id: '5', status: 'pending', due_date: new Date(Date.now() - 86400000).toISOString() })
      ]
      useTaskStore.setState({ tasks })

      const stats = useTaskStore.getState().getTaskStats()

      expect(stats).toEqual({
        total: 5,
        completed: 2,
        pending: 3,
        overdue: 1,
        dueToday: 1,
        completionRate: 40
      })
    })

    it('handles empty task list', () => {
      useTaskStore.setState({ tasks: [] })

      const stats = useTaskStore.getState().getTaskStats()

      expect(stats).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        dueToday: 0,
        completionRate: 0
      })
    })
  })

  describe('Template Management', () => {
    it('fetches templates successfully', async () => {
      const mockTemplates = [
        { id: '1', name: 'Template 1', category: 'driving' },
        { id: '2', name: 'Template 2', category: 'shopping' }
      ]
      mockTaskAPI.getTemplates.mockResolvedValueOnce({ data: mockTemplates })

      await useTaskStore.getState().fetchTemplates()

      const state = useTaskStore.getState()
      expect(state.templates).toEqual(mockTemplates)
      expect(state.isLoadingTemplates).toBe(false)
      expect(mockTaskAPI.getTemplates).toHaveBeenCalledWith(null)
    })

    it('fetches templates by category', async () => {
      const mockTemplates = [
        { id: '1', name: 'Driving Template', category: 'driving' }
      ]
      mockTaskAPI.getTemplates.mockResolvedValueOnce({ data: mockTemplates })

      await useTaskStore.getState().fetchTemplates('driving')

      expect(mockTaskAPI.getTemplates).toHaveBeenCalledWith('driving')
    })

    it('creates task from template', async () => {
      const newTask = createMockTask({ id: '1', templateType: 'driving' })
      mockTaskAPI.createFromTemplate.mockResolvedValueOnce({ data: newTask })

      const customData = { startAddress: '123 Main St' }
      const result = await useTaskStore.getState().createTaskFromTemplate('template1', customData)

      const state = useTaskStore.getState()
      expect(state.tasks).toContain(newTask)
      expect(result).toEqual(newTask)
      expect(mockTaskAPI.createFromTemplate).toHaveBeenCalledWith('template1', customData)
    })

    it('gets templates by category', () => {
      const templates = [
        { id: '1', name: 'Template 1', category: 'driving' },
        { id: '2', name: 'Template 2', category: 'shopping' },
        { id: '3', name: 'Template 3', category: 'driving' }
      ]
      useTaskStore.setState({ templates })

      const drivingTemplates = useTaskStore.getState().getTemplatesByCategory('driving')
      const shoppingTemplates = useTaskStore.getState().getTemplatesByCategory('shopping')

      expect(drivingTemplates).toHaveLength(2)
      expect(shoppingTemplates).toHaveLength(1)
    })
  })

  describe('Task Lifecycle Methods', () => {
    it('completes task with lifecycle handling', async () => {
      const task = createMockTask({ id: '1', status: 'pending' })
      const completedTask = { ...task, status: 'completed' }
      const nextTasks = [createMockTask({ id: '2', title: 'Follow-up task' })]
      
      useTaskStore.setState({ tasks: [task] })
      mockTaskAPI.completeWithEvents.mockResolvedValueOnce({
        data: {
          task: completedTask,
          nextTasks
        }
      })

      const completionData = { notes: 'Task completed successfully' }
      const result = await useTaskStore.getState().completeTaskWithLifecycle('1', completionData)

      const state = useTaskStore.getState()
      expect(state.tasks.find(t => t.id === '1')).toEqual(completedTask)
      expect(state.tasks.find(t => t.id === '2')).toEqual(nextTasks[0])
      expect(result.task).toEqual(completedTask)
      expect(result.nextTasks).toEqual(nextTasks)
    })

    it('generates next recurring instance', async () => {
      const nextTask = createMockTask({ id: '2', title: 'Recurring task - Next' })
      mockTaskAPI.generateNextInstance.mockResolvedValueOnce({ data: nextTask })

      const result = await useTaskStore.getState().generateNextRecurringInstance('1')

      const state = useTaskStore.getState()
      expect(state.tasks).toContain(nextTask)
      expect(result).toEqual(nextTask)
    })

    it('converts task to event', async () => {
      const task = createMockTask({ id: '1' })
      const event = { id: 'event1', title: 'Task Event', linkedTaskId: '1' }
      
      useTaskStore.setState({ tasks: [task] })
      mockTaskAPI.convertToEvent.mockResolvedValueOnce({ data: event })

      const eventData = { startTime: '2024-01-01T10:00:00Z' }
      const result = await useTaskStore.getState().convertTaskToEvent('1', eventData)

      const state = useTaskStore.getState()
      const updatedTask = state.tasks.find(t => t.id === '1')
      expect(updatedTask.linked_event_id).toBe('event1')
      expect(result).toEqual(event)
    })
  })

  describe('Smart Prompting', () => {
    it('adds prompt to queue', () => {
      const prompt = {
        message: 'Do you want to add a driving task?',
        type: 'suggestion',
        data: { templateType: 'driving' }
      }

      useTaskStore.getState().addPrompt(prompt)

      const state = useTaskStore.getState()
      expect(state.activePrompts).toHaveLength(1)
      expect(state.activePrompts[0]).toEqual(
        expect.objectContaining({
          ...prompt,
          id: expect.any(Number),
          timestamp: expect.any(Date)
        })
      )
    })

    it('removes prompt from queue', () => {
      useTaskStore.setState({
        activePrompts: [
          { id: 1, message: 'Prompt 1', timestamp: new Date() },
          { id: 2, message: 'Prompt 2', timestamp: new Date() }
        ]
      })

      useTaskStore.getState().removePrompt(1)

      const state = useTaskStore.getState()
      expect(state.activePrompts).toHaveLength(1)
      expect(state.activePrompts[0].id).toBe(2)
    })

    it('clears all prompts', () => {
      useTaskStore.setState({
        activePrompts: [
          { id: 1, message: 'Prompt 1' },
          { id: 2, message: 'Prompt 2' }
        ]
      })

      useTaskStore.getState().clearPrompts()

      const state = useTaskStore.getState()
      expect(state.activePrompts).toEqual([])
    })
  })

  describe('Task Type Filtering', () => {
    beforeEach(() => {
      const tasks = [
        createMockTask({ id: '1', task_type: 'regular' }),
        createMockTask({ id: '2', task_type: 'recurring' }),
        createMockTask({ id: '3', task_type: 'preparatory' }),
        createMockTask({ id: '4', task_type: 'recurring' }),
        createMockTask({ id: '5', creates_events: true })
      ]
      useTaskStore.setState({ tasks })
    })

    it('filters tasks by type', () => {
      const recurringTasks = useTaskStore.getState().getTasksByType('recurring')
      const preparatoryTasks = useTaskStore.getState().getTasksByType('preparatory')

      expect(recurringTasks).toHaveLength(2)
      expect(preparatoryTasks).toHaveLength(1)
    })

    it('gets recurring tasks', () => {
      const recurringTasks = useTaskStore.getState().getRecurringTasks()

      expect(recurringTasks).toHaveLength(2)
      expect(recurringTasks.every(task => task.task_type === 'recurring')).toBe(true)
    })

    it('gets preparatory tasks', () => {
      const preparatoryTasks = useTaskStore.getState().getPreparatoryTasks()

      expect(preparatoryTasks).toHaveLength(1)
      expect(preparatoryTasks[0].task_type).toBe('preparatory')
    })

    it('gets event-creating tasks', () => {
      const eventCreatingTasks = useTaskStore.getState().getEventCreatingTasks()

      expect(eventCreatingTasks).toHaveLength(1)
      expect(eventCreatingTasks[0].creates_events).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('clears error state', () => {
      useTaskStore.setState({ error: 'Some error' })

      useTaskStore.getState().clearError()

      const state = useTaskStore.getState()
      expect(state.error).toBeNull()
    })

    it('handles network errors gracefully', async () => {
      mockTaskAPI.getTasks.mockRejectedValueOnce(new Error('Network error'))

      await useTaskStore.getState().fetchTasks()

      const state = useTaskStore.getState()
      expect(state.error).toBe('Failed to fetch tasks')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('State Persistence', () => {
    it('maintains state consistency across operations', async () => {
      const initialTasks = [
        createMockTask({ id: '1', title: 'Task 1' }),
        createMockTask({ id: '2', title: 'Task 2' })
      ]
      
      useTaskStore.setState({ tasks: initialTasks })

      // Perform multiple operations
      const newTask = createMockTask({ id: '3', title: 'Task 3' })
      mockTaskAPI.createTask.mockResolvedValueOnce({ data: newTask })
      await useTaskStore.getState().addTask({ title: 'Task 3' })

      mockTaskAPI.deleteTask.mockResolvedValueOnce({})
      await useTaskStore.getState().deleteTask('1')

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(2)
      expect(state.tasks.find(t => t.id === '1')).toBeUndefined()
      expect(state.tasks.find(t => t.id === '2')).toBeDefined()
      expect(state.tasks.find(t => t.id === '3')).toBeDefined()
    })
  })
})