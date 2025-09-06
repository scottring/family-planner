import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { 
  renderWithProviders, 
  createMockDrivingTask, 
  createMockShoppingTask, 
  createMockPickupDropoffTask,
  createMockMeetingTask,
  userEvent 
} from '../utils/testUtils'
import SmartTaskItem from '../../components/timeline/SmartTaskItem'

// Mock all the required stores and services
const mockTaskStore = {
  updateTask: vi.fn(() => Promise.resolve()),
  toggleTaskComplete: vi.fn(),
  deleteTask: vi.fn()
}

const mockAddressStore = {
  addresses: [
    { id: 1, label: 'Home', address: '123 Home St, City, ST 12345' },
    { id: 2, label: 'Work', address: '456 Work Ave, City, ST 12345' }
  ],
  fetchAddresses: vi.fn(),
  getHomeAddress: vi.fn(() => '123 Home St, City, ST 12345'),
  getWorkAddress: vi.fn(() => '456 Work Ave, City, ST 12345'),
  getSchoolAddress: vi.fn(() => '789 School Dr, City, ST 12345')
}

const mockMapService = {
  generateNavigationUrl: vi.fn(() => 'https://www.google.com/maps/dir/start/end'),
  calculateDriveTime: vi.fn(() => '25 min'),
  getSmartStopSuggestions: vi.fn(() => Promise.resolve({
    recommended: [
      {
        id: 'dunkin_1',
        name: "Dunkin'",
        address: '123 Main St',
        rating: 4.2,
        distance: '0.5 miles',
        type: 'cafe',
        suggestion_reason: 'Perfect for morning coffee'
      }
    ],
    time_based: [],
    nearby: []
  })),
  searchAlongRoute: vi.fn(() => Promise.resolve([
    {
      id: 'starbucks_1',
      name: 'Starbucks',
      address: '789 Pine St',
      rating: 4.3,
      distance: '0.8 miles',
      type: 'cafe',
      detour: '+0.2 miles',
      detour_time: '+1 min',
      on_route: true,
      route_position: 0.3
    }
  ]))
}

vi.mock('../../stores/taskStore', () => ({
  useTaskStore: () => mockTaskStore
}))

vi.mock('../../stores/addressStore', () => ({
  useAddressStore: () => mockAddressStore
}))

vi.mock('../../services/mapService', () => ({
  mapService: mockMapService
}))

describe('Smart Template Workflows', () => {
  const mockOnEdit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Soccer Game Driving Task with Dunkin Stop', () => {
    it('completes full workflow: create driving task, set addresses, add coffee stop, navigate', async () => {
      const user = userEvent.setup()
      
      // Start with a basic driving task for a soccer game
      const soccerTask = createMockDrivingTask({
        title: 'Drive to Soccer Game',
        templateData: {
          startAddress: '',
          destinationAddress: '',
          stops: [],
          estimatedTime: null,
          navigationUrl: ''
        }
      })

      renderWithProviders(
        <SmartTaskItem task={soccerTask} onEdit={mockOnEdit} eventType="sports_event" />
      )

      // 1. Expand the driving template
      const drivingBadge = screen.getByText('Driving')
      await user.click(drivingBadge)

      expect(screen.getByText('Driving Task')).toBeInTheDocument()
      expect(screen.getByText('Plan your route and navigation')).toBeInTheDocument()

      // 2. Set home as starting address using quick button
      const homeButton = screen.getByText('Home')
      await user.click(homeButton)

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          soccerTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              startAddress: '123 Home St, City, ST 12345'
            })
          })
        )
      })

      // 3. Enter soccer field destination
      const destInput = screen.getByPlaceholderText('Enter destination address...')
      await user.type(destInput, 'Soccer Complex, 456 Sports Dr, City, ST')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          soccerTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              destinationAddress: expect.stringContaining('Soccer Complex')
            })
          })
        )
      })

      // 4. Use smart suggestions to add a coffee stop
      await waitFor(() => {
        expect(mockMapService.getSmartStopSuggestions).toHaveBeenCalledWith({
          start: '123 Home St, City, ST 12345',
          destination: expect.stringContaining('Soccer Complex'),
          departureTime: expect.any(Date),
          eventType: 'sports_event'
        })
      })

      const smartSuggestionsButton = screen.getByText('Smart Suggestions')
      await user.click(smartSuggestionsButton)

      expect(screen.getByText('Smart Stop Suggestions')).toBeInTheDocument()
      const dunkinSuggestion = screen.getByText("Dunkin'")
      await user.click(dunkinSuggestion.closest('button'))

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          soccerTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              stops: expect.arrayContaining([
                expect.objectContaining({
                  address: '123 Main St',
                  type: 'place',
                  name: "Dunkin'"
                })
              ])
            })
          })
        )
      })

      // 5. Verify navigation URL is generated
      await waitFor(() => {
        expect(mockMapService.generateNavigationUrl).toHaveBeenCalledWith(
          '123 Home St, City, ST 12345',
          expect.stringContaining('Soccer Complex'),
          ['123 Main St']
        )
      })

      // 6. Open navigation
      const navigationButton = screen.getByText('Open in Maps')
      await user.click(navigationButton)

      expect(window.open).toHaveBeenCalledWith('https://www.google.com/maps/dir/start/end', '_blank')

      // 7. Verify route summary is displayed
      expect(screen.getByText('Route Summary')).toBeInTheDocument()
      expect(screen.getByText(/1 stop/)).toBeInTheDocument()
    })
  })

  describe('Birthday Party Shopping with Toy Store Stop', () => {
    it('creates shopping list for birthday party and finds toy store', async () => {
      const user = userEvent.setup()

      const birthdayShoppingTask = createMockShoppingTask({
        title: 'Birthday Party Shopping',
        templateData: {
          items: [],
          store: '',
          estimatedTime: '',
          notes: ''
        }
      })

      renderWithProviders(
        <SmartTaskItem task={birthdayShoppingTask} onEdit={mockOnEdit} />
      )

      // 1. Expand shopping template
      const shoppingBadge = screen.getByText('Shopping')
      await user.click(shoppingBadge)

      // 2. Select Target as store
      const storeSelect = screen.getByRole('combobox', { name: /store/i })
      await user.selectOptions(storeSelect, 'Target')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          birthdayShoppingTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              store: 'Target'
            })
          })
        )
      })

      // 3. Add birthday party items
      const itemInput = screen.getByPlaceholderText('Add item...')
      const addButton = screen.getByRole('button', { name: /add item/i })

      // Add gift wrap
      await user.type(itemInput, 'Gift wrap')
      await user.click(addButton)

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          birthdayShoppingTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Gift wrap',
                  category: 'Groceries',
                  quantity: 1,
                  completed: false
                })
              ])
            })
          })
        )
      })

      // Add birthday candles
      await user.clear(itemInput)
      await user.type(itemInput, 'Birthday candles')
      await user.click(addButton)

      // Add balloons
      await user.clear(itemInput)
      await user.type(itemInput, 'Balloons')
      await user.click(addButton)

      // 4. Check off completed items
      const giftWrapCheckbox = screen.getByText('Gift wrap').closest('div').querySelector('button')
      await user.click(giftWrapCheckbox)

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          birthdayShoppingTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Gift wrap',
                  completed: true
                })
              ])
            })
          })
        )
      })

      // 5. Add notes
      const notesTextarea = screen.getByPlaceholderText('Any special instructions or notes...')
      await user.type(notesTextarea, 'Also check toy section for last-minute gift ideas')

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          birthdayShoppingTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              notes: expect.stringContaining('toy section')
            })
          })
        )
      })

      // 6. Share the shopping list
      const shareButton = screen.getByText('Share List')
      await user.click(shareButton)

      expect(navigator.share).toHaveBeenCalledWith({
        title: 'Shopping List',
        text: expect.stringContaining('Gift wrap')
      })

      // 7. Find store location
      const findStoreButton = screen.getByText('Find Store')
      await user.click(findStoreButton)

      expect(window.open).toHaveBeenCalledWith('https://www.google.com/maps/search/Target+near+me', '_blank')
    })
  })

  describe('School Carpool Pickup/Dropoff', () => {
    it('manages school pickup with contact information', async () => {
      const user = userEvent.setup()

      const carpoolTask = createMockPickupDropoffTask({
        title: 'School Carpool Pickup',
        templateData: {
          personName: '',
          pickupLocation: '',
          dropoffLocation: '',
          contactName: '',
          contactPhone: '',
          confirmed: false
        }
      })

      renderWithProviders(
        <SmartTaskItem task={carpoolTask} onEdit={mockOnEdit} />
      )

      // 1. Expand pickup template
      const pickupBadge = screen.getByText('Pickup')
      await user.click(pickupBadge)

      // 2. Fill in person details
      const personInput = screen.getByPlaceholderText(/person.*name/i)
      await user.type(personInput, 'Emma Johnson')

      const contactInput = screen.getByPlaceholderText(/contact.*name/i)
      await user.type(contactInput, 'Sarah Johnson')

      const phoneInput = screen.getByPlaceholderText(/phone/i)
      await user.type(phoneInput, '555-0123')

      // 3. Set pickup location (school)
      const pickupLocationInput = screen.getByPlaceholderText(/pickup.*location/i)
      await user.type(pickupLocationInput, 'Lincoln Elementary School, 789 School Rd')

      // 4. Set dropoff location (home)
      const dropoffLocationInput = screen.getByPlaceholderText(/dropoff.*location/i)
      await user.type(dropoffLocationInput, '456 Maple St, City, ST')

      // 5. Add special instructions
      const instructionsInput = screen.getByPlaceholderText(/special.*instructions/i)
      await user.type(instructionsInput, 'Emma will be at the main office pickup area')

      // 6. Confirm the pickup
      const confirmCheckbox = screen.getByText(/confirmed/i).closest('div').querySelector('input')
      await user.click(confirmCheckbox)

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          carpoolTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              personName: 'Emma Johnson',
              contactName: 'Sarah Johnson',
              contactPhone: '555-0123',
              pickupLocation: expect.stringContaining('Lincoln Elementary'),
              dropoffLocation: expect.stringContaining('456 Maple St'),
              specialInstructions: expect.stringContaining('main office'),
              confirmed: true
            })
          })
        )
      })
    })
  })

  describe('Meeting Preparation with Template', () => {
    it('prepares for client meeting with agenda and attendees', async () => {
      const user = userEvent.setup()

      const meetingTask = createMockMeetingTask({
        title: 'Client Meeting Preparation',
        templateData: {
          attendees: [],
          location: '',
          meetingLink: '',
          agendaItems: [],
          notes: ''
        }
      })

      renderWithProviders(
        <SmartTaskItem task={meetingTask} onEdit={mockOnEdit} />
      )

      // 1. Expand meeting template
      const meetingBadge = screen.getByText('Meeting')
      await user.click(meetingBadge)

      // 2. Add attendees
      const attendeeInput = screen.getByPlaceholderText(/add.*attendee/i)
      await user.type(attendeeInput, 'client@company.com')
      
      const addAttendeeButton = screen.getByText('Add Attendee')
      await user.click(addAttendeeButton)

      await user.clear(attendeeInput)
      await user.type(attendeeInput, 'manager@ourcompany.com')
      await user.click(addAttendeeButton)

      // 3. Set meeting location
      const locationInput = screen.getByPlaceholderText(/location/i)
      await user.type(locationInput, 'Conference Room B')

      // 4. Add Zoom link
      const linkInput = screen.getByPlaceholderText(/meeting.*link/i)
      await user.type(linkInput, 'https://zoom.us/j/123456789')

      // 5. Add agenda items
      const agendaInput = screen.getByPlaceholderText(/agenda.*item/i)
      await user.type(agendaInput, 'Project timeline review')
      
      const addAgendaButton = screen.getByText('Add Item')
      await user.click(addAgendaButton)

      await user.clear(agendaInput)
      await user.type(agendaInput, 'Budget discussion')
      await user.click(addAgendaButton)

      await user.clear(agendaInput)
      await user.type(agendaInput, 'Next steps planning')
      await user.click(addAgendaButton)

      // 6. Check off completed preparation items
      const firstAgendaCheckbox = screen.getByText('Project timeline review').closest('div').querySelector('button')
      await user.click(firstAgendaCheckbox)

      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          meetingTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              attendees: ['client@company.com', 'manager@ourcompany.com'],
              location: 'Conference Room B',
              meetingLink: 'https://zoom.us/j/123456789',
              agendaItems: expect.arrayContaining([
                expect.objectContaining({
                  item: 'Project timeline review',
                  completed: true
                }),
                expect.objectContaining({
                  item: 'Budget discussion',
                  completed: false
                }),
                expect.objectContaining({
                  item: 'Next steps planning',
                  completed: false
                })
              ])
            })
          })
        )
      })

      // 7. Join meeting
      const joinMeetingButton = screen.getByText('Join Meeting')
      await user.click(joinMeetingButton)

      expect(window.open).toHaveBeenCalledWith('https://zoom.us/j/123456789', '_blank')
    })
  })

  describe('Cross-Template Integration', () => {
    it('handles task completion and template state persistence', async () => {
      const user = userEvent.setup()

      const drivingTask = createMockDrivingTask({
        title: 'Drive to Appointment',
        completed: false,
        templateData: {
          startAddress: '123 Home St',
          destinationAddress: '456 Doctor Office',
          stops: [
            { id: 1, address: 'Pharmacy on Main St', type: 'place', name: 'CVS' }
          ],
          estimatedTime: '30 min'
        }
      })

      renderWithProviders(
        <SmartTaskItem task={drivingTask} onEdit={mockOnEdit} />
      )

      // 1. Expand template to verify data persistence
      const drivingBadge = screen.getByText('Driving')
      await user.click(drivingBadge)

      expect(screen.getByDisplayValue('123 Home St')).toBeInTheDocument()
      expect(screen.getByDisplayValue('456 Doctor Office')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Pharmacy on Main St')).toBeInTheDocument()

      // 2. Complete the task
      const completeButton = screen.getByRole('button', { name: /toggle completion/i })
      await user.click(completeButton)

      expect(mockTaskStore.toggleTaskComplete).toHaveBeenCalledWith(drivingTask.id)

      // 3. Verify template data is preserved even when task is completed
      expect(screen.getByText('Route Summary')).toBeInTheDocument()
      expect(screen.getByText(/1 stop/)).toBeInTheDocument()
      expect(screen.getByText('Estimated time: 30 min')).toBeInTheDocument()
    })

    it('handles template switching and data isolation', async () => {
      const user = userEvent.setup()

      // Start with a shopping task
      const task = createMockShoppingTask({
        title: 'Multi-Purpose Task',
        templateType: 'shopping'
      })

      const { rerender } = renderWithProviders(
        <SmartTaskItem task={task} onEdit={mockOnEdit} />
      )

      // Expand shopping template
      await user.click(screen.getByText('Shopping'))
      expect(screen.getByText('Shopping List')).toBeInTheDocument()

      // Change to driving template
      const updatedTask = { ...task, templateType: 'driving', templateData: {} }
      rerender(<SmartTaskItem task={updatedTask} onEdit={mockOnEdit} />)

      // Verify template switched
      expect(screen.getByText('Driving')).toBeInTheDocument()
      expect(screen.queryByText('Shopping')).not.toBeInTheDocument()

      // Expand new template
      await user.click(screen.getByText('Driving'))
      expect(screen.getByText('Driving Task')).toBeInTheDocument()
      expect(screen.queryByText('Shopping List')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling in Workflows', () => {
    it('gracefully handles map service failures in driving workflow', async () => {
      const user = userEvent.setup()

      // Mock map service to fail
      mockMapService.getSmartStopSuggestions.mockRejectedValueOnce(new Error('API Error'))

      const drivingTask = createMockDrivingTask({
        templateData: {
          startAddress: '123 Start St',
          destinationAddress: '456 End Ave'
        }
      })

      renderWithProviders(
        <SmartTaskItem task={drivingTask} onEdit={mockOnEdit} eventType="birthday_party" />
      )

      const drivingBadge = screen.getByText('Driving')
      await user.click(drivingBadge)

      // Should not crash and template should still be functional
      expect(screen.getByText('Driving Task')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123 Start St')).toBeInTheDocument()

      // Smart suggestions button might not appear due to error, but basic functionality should work
      const addStopButton = screen.getByText('Add Stop')
      await user.click(addStopButton)

      // Should still be able to add stops manually
      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
          drivingTask.id,
          expect.objectContaining({
            templateData: expect.objectContaining({
              stops: expect.arrayContaining([
                expect.objectContaining({
                  address: '',
                  type: 'waypoint'
                })
              ])
            })
          })
        )
      })
    })

    it('handles task store update failures', async () => {
      const user = userEvent.setup()
      
      // Mock task store to fail
      mockTaskStore.updateTask.mockRejectedValueOnce(new Error('Save failed'))

      const shoppingTask = createMockShoppingTask({
        templateData: { items: [] }
      })

      renderWithProviders(
        <SmartTaskItem task={shoppingTask} onEdit={mockOnEdit} />
      )

      const shoppingBadge = screen.getByText('Shopping')
      await user.click(shoppingBadge)

      const itemInput = screen.getByPlaceholderText('Add item...')
      await user.type(itemInput, 'Test Item')

      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)

      // Should attempt to save but fail gracefully
      await waitFor(() => {
        expect(mockTaskStore.updateTask).toHaveBeenCalled()
      })

      // Template should still be responsive
      expect(screen.getByText('Shopping List')).toBeInTheDocument()
    })
  })
})