import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { 
  renderWithProviders, 
  createMockTask, 
  createMockDrivingTask, 
  createMockShoppingTask, 
  createMockEventHandlers,
  userEvent 
} from '../../../test/utils/testUtils'
import SmartTaskItem from '../SmartTaskItem'

// Mock the stores
const mockTaskStore = {
  toggleTaskComplete: vi.fn(),
  deleteTask: vi.fn(),
  updateTask: vi.fn()
}

vi.mock('../../../stores/taskStore', () => ({
  useTaskStore: () => mockTaskStore
}))

// Mock template components
vi.mock('../templates/DrivingTaskTemplate', () => ({
  default: ({ task, onUpdate, className }) => (
    <div data-testid="driving-template" className={className}>
      Driving Template for {task.title}
      {task.templateData?.startAddress && (
        <div>From: {task.templateData.startAddress}</div>
      )}
      {task.templateData?.destinationAddress && (
        <div>To: {task.templateData.destinationAddress}</div>
      )}
    </div>
  )
}))

vi.mock('../templates/ShoppingTaskTemplate', () => ({
  default: ({ task, onUpdate, className }) => (
    <div data-testid="shopping-template" className={className}>
      Shopping Template for {task.title}
      {task.templateData?.items && (
        <div>{task.templateData.items.length} items</div>
      )}
    </div>
  )
}))

vi.mock('../templates/PickupDropoffTemplate', () => ({
  default: ({ task, onUpdate, className }) => (
    <div data-testid="pickup-template" className={className}>
      Pickup/Dropoff Template for {task.title}
    </div>
  )
}))

vi.mock('../templates/MeetingPrepTemplate', () => ({
  default: ({ task, onUpdate, className }) => (
    <div data-testid="meeting-template" className={className}>
      Meeting Template for {task.title}
    </div>
  )
}))

describe('SmartTaskItem', () => {
  const defaultHandlers = createMockEventHandlers()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders basic task information', () => {
      const task = createMockTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
        assignedTo: 'John Doe'
      })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText('Test Task')).toBeInTheDocument()
      expect(screen.getByText('Test description')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('renders due date correctly', () => {
      const task = createMockTask({
        dueDate: '2024-12-25T10:00:00Z'
      })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText('Dec 25, 2024')).toBeInTheDocument()
    })

    it('shows overdue status for past due dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      
      const task = createMockTask({
        dueDate: pastDate.toISOString(),
        completed: false
      })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText('(Overdue)')).toBeInTheDocument()
    })

    it('does not show overdue status for completed tasks', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      
      const task = createMockTask({
        dueDate: pastDate.toISOString(),
        completed: true
      })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.queryByText('(Overdue)')).not.toBeInTheDocument()
    })
  })

  describe('Task Completion', () => {
    it('renders completed task with proper styling', () => {
      const task = createMockTask({ completed: true })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const titleElement = screen.getByText(task.title)
      expect(titleElement).toHaveClass('line-through', 'text-gray-500')
    })

    it('toggles task completion when checkbox is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ completed: false })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const checkbox = screen.getByRole('button', { name: /toggle completion/i })
      await user.click(checkbox)

      expect(mockTaskStore.toggleTaskComplete).toHaveBeenCalledWith(task.id)
    })

    it('shows check mark for completed tasks', () => {
      const task = createMockTask({ completed: true })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    })
  })

  describe('Task Actions', () => {
    it('shows action buttons on hover', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ completed: false })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const taskElement = screen.getByRole('article')
      await user.hover(taskElement)

      expect(screen.getByTitle('Edit task')).toBeInTheDocument()
      expect(screen.getByTitle('Delete task')).toBeInTheDocument()
    })

    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const taskElement = screen.getByRole('article')
      await user.hover(taskElement)
      
      const editButton = screen.getByTitle('Edit task')
      await user.click(editButton)

      expect(defaultHandlers.onEdit).toHaveBeenCalledWith(task)
    })

    it('deletes task when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup()
      window.confirm = vi.fn(() => true)
      const task = createMockTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const taskElement = screen.getByRole('article')
      await user.hover(taskElement)
      
      const deleteButton = screen.getByTitle('Delete task')
      await user.click(deleteButton)

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?')
      expect(mockTaskStore.deleteTask).toHaveBeenCalledWith(task.id)
    })

    it('does not delete task when deletion is not confirmed', async () => {
      const user = userEvent.setup()
      window.confirm = vi.fn(() => false)
      const task = createMockTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const taskElement = screen.getByRole('article')
      await user.hover(taskElement)
      
      const deleteButton = screen.getByTitle('Delete task')
      await user.click(deleteButton)

      expect(window.confirm).toHaveBeenCalled()
      expect(mockTaskStore.deleteTask).not.toHaveBeenCalled()
    })
  })

  describe('Priority Display', () => {
    it('displays high priority with proper styling', () => {
      const task = createMockTask({ priority: 'high' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const priorityElement = screen.getByText('High')
      expect(priorityElement).toHaveClass('text-error-700', 'bg-error-100/80')
    })

    it('displays medium priority with proper styling', () => {
      const task = createMockTask({ priority: 'medium' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const priorityElement = screen.getByText('Medium')
      expect(priorityElement).toHaveClass('text-warning-700', 'bg-warning-100/80')
    })

    it('displays low priority with proper styling', () => {
      const task = createMockTask({ priority: 'low' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const priorityElement = screen.getByText('Low')
      expect(priorityElement).toHaveClass('text-success-700', 'bg-success-100/80')
    })

    it('shows alert icon for high priority tasks', () => {
      const task = createMockTask({ priority: 'high' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    })
  })

  describe('Template Integration', () => {
    it('displays driving template badge', () => {
      const task = createMockDrivingTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText('Driving')).toBeInTheDocument()
      expect(screen.getByTestId('car-icon')).toBeInTheDocument()
    })

    it('displays shopping template badge', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText('Shopping')).toBeInTheDocument()
      expect(screen.getByTestId('shopping-cart-icon')).toBeInTheDocument()
    })

    it('toggles template expansion when badge is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockDrivingTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const templateBadge = screen.getByText('Driving')
      
      // Template should not be visible initially
      expect(screen.queryByTestId('driving-template')).not.toBeInTheDocument()

      // Click to expand
      await user.click(templateBadge)
      expect(screen.getByTestId('driving-template')).toBeInTheDocument()

      // Click to collapse
      await user.click(templateBadge)
      expect(screen.queryByTestId('driving-template')).not.toBeInTheDocument()
    })

    it('renders driving template when expanded', async () => {
      const user = userEvent.setup()
      const task = createMockDrivingTask({
        templateData: {
          startAddress: '123 Start St',
          destinationAddress: '456 End Ave'
        }
      })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const templateBadge = screen.getByText('Driving')
      await user.click(templateBadge)

      expect(screen.getByTestId('driving-template')).toBeInTheDocument()
      expect(screen.getByText('From: 123 Start St')).toBeInTheDocument()
      expect(screen.getByText('To: 456 End Ave')).toBeInTheDocument()
    })

    it('renders shopping template when expanded', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const templateBadge = screen.getByText('Shopping')
      await user.click(templateBadge)

      expect(screen.getByTestId('shopping-template')).toBeInTheDocument()
      expect(screen.getByText('2 items')).toBeInTheDocument()
    })

    it('renders pickup template when expanded', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ templateType: 'pickup' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const templateBadge = screen.getByText('Pickup')
      await user.click(templateBadge)

      expect(screen.getByTestId('pickup-template')).toBeInTheDocument()
    })

    it('renders meeting template when expanded', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ templateType: 'meeting' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const templateBadge = screen.getByText('Meeting')
      await user.click(templateBadge)

      expect(screen.getByTestId('meeting-template')).toBeInTheDocument()
    })

    it('shows message for unimplemented template types', async () => {
      const user = userEvent.setup()
      const task = createMockTask({ templateType: 'unknown' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const templateBadge = screen.getByText('Unknown')
      await user.click(templateBadge)

      expect(screen.getByText('Template type "unknown" not yet implemented.')).toBeInTheDocument()
    })
  })

  describe('Template Colors', () => {
    it('applies correct color for driving template', () => {
      const task = createMockDrivingTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const badge = screen.getByText('Driving')
      expect(badge).toHaveClass('text-blue-700', 'bg-blue-100/80')
    })

    it('applies correct color for shopping template', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const badge = screen.getByText('Shopping')
      expect(badge).toHaveClass('text-green-700', 'bg-green-100/80')
    })

    it('applies correct color for pickup template', () => {
      const task = createMockTask({ templateType: 'pickup' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const badge = screen.getByText('Pickup')
      expect(badge).toHaveClass('text-orange-700', 'bg-orange-100/80')
    })

    it('applies correct color for meeting template', () => {
      const task = createMockTask({ templateType: 'meeting' })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const badge = screen.getByText('Meeting')
      expect(badge).toHaveClass('text-purple-700', 'bg-purple-100/80')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const task = createMockTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const taskElement = screen.getByRole('article')
      expect(taskElement).toBeInTheDocument()
    })

    it('has proper button labels', () => {
      const task = createMockTask({ completed: false })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByTitle('Edit task')).toBeInTheDocument()
      expect(screen.getByTitle('Delete task')).toBeInTheDocument()
    })

    it('template badge has proper title attribute', () => {
      const task = createMockDrivingTask()

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      const badge = screen.getByText('Driving')
      expect(badge).toHaveAttribute('title', 'driving template - click to expand')
    })
  })

  describe('Edge Cases', () => {
    it('handles task without description', () => {
      const task = createMockTask({ description: null })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText(task.title)).toBeInTheDocument()
      expect(screen.queryByText('null')).not.toBeInTheDocument()
    })

    it('handles task without due date', () => {
      const task = createMockTask({ dueDate: null })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText(task.title)).toBeInTheDocument()
    })

    it('handles task without assignedTo', () => {
      const task = createMockTask({ assignedTo: null })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText(task.title)).toBeInTheDocument()
    })

    it('handles task without priority', () => {
      const task = createMockTask({ priority: null })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText(task.title)).toBeInTheDocument()
    })

    it('handles template data being null', () => {
      const task = createMockTask({ 
        templateType: 'driving', 
        templateData: null 
      })

      renderWithProviders(<SmartTaskItem task={task} onEdit={defaultHandlers.onEdit} />)

      expect(screen.getByText('Driving')).toBeInTheDocument()
    })
  })
})