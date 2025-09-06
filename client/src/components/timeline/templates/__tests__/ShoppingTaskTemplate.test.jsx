import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { 
  renderWithProviders, 
  createMockShoppingTask, 
  userEvent 
} from '../../../test/utils/testUtils'
import ShoppingTaskTemplate from '../ShoppingTaskTemplate'

// Mock the task store
const mockTaskStore = {
  updateTask: vi.fn(() => Promise.resolve())
}

vi.mock('../../../../stores/taskStore', () => ({
  useTaskStore: () => mockTaskStore
}))

describe('ShoppingTaskTemplate', () => {
  const defaultProps = {
    onUpdate: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders shopping template header', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('Shopping List')).toBeInTheDocument()
      expect(screen.getByText('2/2 items completed')).toBeInTheDocument()
    })

    it('displays estimated time when available', () => {
      const task = createMockShoppingTask({
        templateData: { estimatedTime: '45-60 mins' }
      })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('45-60 mins')).toBeInTheDocument()
    })

    it('shows add items message when no items exist', () => {
      const task = createMockShoppingTask({
        templateData: { items: [] }
      })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('Add items to your shopping list')).toBeInTheDocument()
    })
  })

  describe('Store Selection', () => {
    it('renders store selection dropdown', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const storeSelect = screen.getByDisplayValue('Walmart')
      expect(storeSelect).toBeInTheDocument()
    })

    it('updates store when selection changes', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const storeSelect = screen.getByDisplayValue('Walmart')
      await user.selectOptions(storeSelect, 'Target')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              store: 'Target'
            })
          })
        )
      })
    })

    it('shows custom store input when Other is selected', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const storeSelect = screen.getByDisplayValue('Walmart')
      await user.selectOptions(storeSelect, 'custom')

      expect(screen.getByPlaceholderText('Enter custom store name...')).toBeInTheDocument()
    })

    it('opens store locator when external link is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const locatorButton = screen.getByTitle('Find store locations')
      await user.click(locatorButton)

      expect(window.open).toHaveBeenCalledWith('https://www.google.com/maps/search/Walmart+near+me', '_blank')
    })
  })

  describe('Item Management', () => {
    it('adds new item when Add button is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask({ templateData: { items: [] } })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const itemInput = screen.getByPlaceholderText('Add item...')
      const addButton = screen.getByRole('button', { name: /add item/i })

      await user.type(itemInput, 'New Item')
      await user.click(addButton)

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  name: 'New Item',
                  category: 'Groceries',
                  quantity: 1,
                  completed: false
                })
              ])
            })
          })
        )
      })
    })

    it('adds item when Enter key is pressed', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask({ templateData: { items: [] } })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const itemInput = screen.getByPlaceholderText('Add item...')
      await user.type(itemInput, 'New Item{enter}')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  name: 'New Item'
                })
              ])
            })
          })
        )
      })
    })

    it('does not add empty items', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask({ templateData: { items: [] } })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)

      expect(mockTaskStore.updateTask).not.toHaveBeenCalled()
    })

    it('renders existing shopping items', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('Milk')).toBeInTheDocument()
      expect(screen.getByText('Bread')).toBeInTheDocument()
    })

    it('toggles item completion when checkbox is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const milkCheckbox = screen.getByText('Milk').closest('div').querySelector('button')
      await user.click(milkCheckbox)

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Milk',
                  completed: true
                })
              ])
            })
          })
        )
      })
    })

    it('removes item when delete button is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const deleteButtons = screen.getAllByTitle('Remove item')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.not.arrayContaining([
                expect.objectContaining({
                  name: 'Milk'
                })
              ])
            })
          })
        )
      })
    })

    it('updates item quantity when input changes', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const quantityInputs = screen.getAllByDisplayValue('1')
      await user.clear(quantityInputs[0])
      await user.type(quantityInputs[0], '3')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Milk',
                  quantity: 3
                })
              ])
            })
          })
        )
      })
    })

    it('enforces minimum quantity of 1', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const quantityInputs = screen.getAllByDisplayValue('1')
      await user.clear(quantityInputs[0])
      await user.type(quantityInputs[0], '0')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Milk',
                  quantity: 1
                })
              ])
            })
          })
        )
      })
    })
  })

  describe('Category Selection', () => {
    it('changes selected category for new items', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask({ templateData: { items: [] } })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const categorySelect = screen.getByDisplayValue('Groceries')
      await user.selectOptions(categorySelect, 'Personal')

      const itemInput = screen.getByPlaceholderText('Add item...')
      const addButton = screen.getByRole('button', { name: /add item/i })

      await user.type(itemInput, 'Toothpaste')
      await user.click(addButton)

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Toothpaste',
                  category: 'Personal'
                })
              ])
            })
          })
        )
      })
    })

    it('displays item categories', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })
  })

  describe('Budget Management', () => {
    it('shows budget input when budget section is expanded', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const budgetToggle = screen.getByText('Budget (Optional)')
      await user.click(budgetToggle)

      expect(screen.getByPlaceholderText('Enter budget amount...')).toBeInTheDocument()
    })

    it('updates budget when input changes', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const budgetToggle = screen.getByText('Budget (Optional)')
      await user.click(budgetToggle)

      const budgetInput = screen.getByPlaceholderText('Enter budget amount...')
      await user.type(budgetInput, '100')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              budget: '50100'
            })
          })
        )
      })
    })

    it('hides budget input when toggled off', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const budgetToggle = screen.getByText('Budget (Optional)')
      await user.click(budgetToggle)
      
      expect(screen.getByPlaceholderText('Enter budget amount...')).toBeInTheDocument()

      await user.click(screen.getByText('Budget (Hide)'))
      expect(screen.queryByPlaceholderText('Enter budget amount...')).not.toBeInTheDocument()
    })
  })

  describe('Notes Section', () => {
    it('updates notes when textarea changes', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const notesTextarea = screen.getByPlaceholderText('Any special instructions or notes...')
      await user.clear(notesTextarea)
      await user.type(notesTextarea, 'Remember to use coupons!')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              notes: 'Remember to use coupons!'
            })
          })
        )
      })
    })

    it('displays existing notes', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByDisplayValue("Don't forget coupons")).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('shares shopping list when share button is clicked', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const shareButton = screen.getByText('Share List')
      await user.click(shareButton)

      expect(navigator.share).toHaveBeenCalledWith({
        title: 'Shopping List',
        text: expect.stringContaining('○ Milk (1)')
      })
    })

    it('copies to clipboard when share API not available', async () => {
      const user = userEvent.setup()
      navigator.share = undefined
      window.alert = vi.fn()
      
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const shareButton = screen.getByText('Share List')
      await user.click(shareButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(window.alert).toHaveBeenCalledWith('Shopping list copied to clipboard!')
    })

    it('opens store locator from action button', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const findStoreButton = screen.getByText('Find Store')
      await user.click(findStoreButton)

      expect(window.open).toHaveBeenCalledWith('https://www.google.com/maps/search/Walmart+near+me', '_blank')
    })
  })

  describe('Shopping Summary', () => {
    it('displays shopping summary with item counts', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('Shopping Summary')).toBeInTheDocument()
      expect(screen.getByText('2 items • 1 completed • 30-45 mins • $50 budget')).toBeInTheDocument()
      expect(screen.getByText('Store: Walmart')).toBeInTheDocument()
    })

    it('handles singular item count', () => {
      const task = createMockShoppingTask({
        templateData: {
          items: [{ id: 1, name: 'Milk', completed: false, category: 'Groceries', quantity: 1 }]
        }
      })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText(/1 item/)).toBeInTheDocument()
    })

    it('shows custom store in summary', () => {
      const task = createMockShoppingTask({
        templateData: {
          store: '',
          customStore: 'Local Market'
        }
      })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('Store: Local Market')).toBeInTheDocument()
    })
  })

  describe('Time Estimation', () => {
    it('estimates time based on item count', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask({ templateData: { items: [] } })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      // Add items to trigger time estimation
      const itemInput = screen.getByPlaceholderText('Add item...')
      const addButton = screen.getByRole('button', { name: /add item/i })

      for (let i = 0; i < 6; i++) {
        await user.clear(itemInput)
        await user.type(itemInput, `Item ${i + 1}`)
        await user.click(addButton)
      }

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenLastCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              estimatedTime: '30-45 mins'
            })
          })
        )
      })
    })

    it('updates time estimation correctly for different item counts', async () => {
      const user = userEvent.setup()
      
      // Test 0 items
      const taskEmpty = createMockShoppingTask({ templateData: { items: [] } })
      const { rerender } = renderWithProviders(<ShoppingTaskTemplate task={taskEmpty} {...defaultProps} />)
      
      // Test 3 items (should be 15-30 mins)
      const task3Items = createMockShoppingTask({
        templateData: {
          items: [
            { id: 1, name: 'Item 1', completed: false, category: 'Groceries', quantity: 1 },
            { id: 2, name: 'Item 2', completed: false, category: 'Groceries', quantity: 1 },
            { id: 3, name: 'Item 3', completed: false, category: 'Groceries', quantity: 1 }
          ]
        }
      })
      rerender(<ShoppingTaskTemplate task={task3Items} {...defaultProps} />)
      expect(screen.getByText('15-30 mins')).toBeInTheDocument()
    })
  })

  describe('Auto-save Functionality', () => {
    it('debounces save operations', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const notesTextarea = screen.getByPlaceholderText('Any special instructions or notes...')
      
      // Type multiple characters quickly
      await user.type(notesTextarea, 'ABC')

      // Should not call updateTask immediately
      expect(mockTaskStore.updateTask).not.toHaveBeenCalled()

      // Wait for debounce
      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalled()
      }, { timeout: 1000 })
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByLabelText(/Store/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Add Items/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
    })

    it('has proper button labels and titles', () => {
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByTitle('Find store locations')).toBeInTheDocument()
      expect(screen.getByTitle('Remove item')).toBeInTheDocument()
    })

    it('maintains proper focus management', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask({ templateData: { items: [] } })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const itemInput = screen.getByPlaceholderText('Add item...')
      const addButton = screen.getByRole('button', { name: /add item/i })

      await user.type(itemInput, 'New Item')
      await user.click(addButton)

      // Input should be cleared and ready for next item
      expect(itemInput).toHaveValue('')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty template data', () => {
      const task = createMockShoppingTask({
        templateData: null
      })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('Shopping List')).toBeInTheDocument()
    })

    it('handles missing items array', () => {
      const task = createMockShoppingTask({
        templateData: { items: undefined }
      })

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      expect(screen.getByText('Add items to your shopping list')).toBeInTheDocument()
    })

    it('handles invalid quantity values', async () => {
      const user = userEvent.setup()
      const task = createMockShoppingTask()

      renderWithProviders(<ShoppingTaskTemplate task={task} {...defaultProps} />)

      const quantityInputs = screen.getAllByDisplayValue('1')
      await user.clear(quantityInputs[0])
      await user.type(quantityInputs[0], 'invalid')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          task.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  quantity: 1 // Should default to 1 for invalid input
                })
              ])
            })
          })
        )
      })
    })
  })
})