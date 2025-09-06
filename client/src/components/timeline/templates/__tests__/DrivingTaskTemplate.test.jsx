import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DrivingTaskTemplate from '../DrivingTaskTemplate';
import { 
  createMockDrivingTask, 
  mockAddresses, 
  mockPlaceSearchResults,
  mockSmartSuggestions 
} from '../../../../test/utils/testUtils';

// Mock the stores and services
vi.mock('../../../../stores/taskStore', () => ({
  useTaskStore: () => ({
    updateTask: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../../../../stores/addressStore', () => ({
  useAddressStore: () => ({
    addresses: mockAddresses,
    fetchAddresses: vi.fn(),
    getHomeAddress: () => mockAddresses[0].address,
    getWorkAddress: () => mockAddresses[1].address,
    getSchoolAddress: () => mockAddresses[2].address
  })
}));

vi.mock('../../../../services/mapService', () => ({
  mapService: {
    generateNavigationUrl: vi.fn((start, dest, stops) => 
      `https://maps.google.com/dir/${start}/${stops?.join('/')}/${dest}`
    ),
    calculateDriveTime: vi.fn(() => '25 min'),
    searchPlaces: vi.fn(() => Promise.resolve(mockPlaceSearchResults)),
    searchAlongRoute: vi.fn(() => Promise.resolve(mockPlaceSearchResults)),
    getSmartStopSuggestions: vi.fn(() => Promise.resolve(mockSmartSuggestions))
  }
}));

describe('DrivingTaskTemplate', () => {
  let mockTask;
  let mockOnUpdate;

  beforeEach(() => {
    mockTask = createMockDrivingTask();
    mockOnUpdate = vi.fn();
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the driving template with all main sections', () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      expect(screen.getByText('Driving Task')).toBeInTheDocument();
      expect(screen.getByText('Plan your route and navigation')).toBeInTheDocument();
      expect(screen.getByLabelText(/From/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/To/i)).toBeInTheDocument();
    });

    it('should display existing addresses if provided', () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const startInput = screen.getByLabelText(/From/i);
      const destInput = screen.getByLabelText(/To/i);
      
      expect(startInput.value).toBe('123 Main St, Hometown, ST 12345');
      expect(destInput.value).toBe('456 Sports Complex, Hometown, ST 12345');
    });

    it('should display estimated time when addresses are set', () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      expect(screen.getByText('25 min')).toBeInTheDocument();
    });
  });

  describe('Quick Address Selection', () => {
    it('should display quick address buttons', () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Work/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /School/i })).toBeInTheDocument();
    });

    it('should set home address when Home button is clicked', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const homeButton = screen.getAllByRole('button', { name: /Home/i })[0];
      fireEvent.click(homeButton);
      
      await waitFor(() => {
        const startInput = screen.getByLabelText(/From/i);
        expect(startInput.value).toBe('789 Maple Ave, Hometown, ST 12345');
      });
    });

    it('should show address dropdown when chevron is clicked', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const dropdownButtons = screen.getAllByTitle('Select saved address');
      fireEvent.click(dropdownButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText("Sarah's Work")).toBeInTheDocument();
        expect(screen.getByText('Oak Elementary')).toBeInTheDocument();
      });
    });

    it('should select address from dropdown', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const dropdownButtons = screen.getAllByTitle('Select saved address');
      fireEvent.click(dropdownButtons[0]);
      
      await waitFor(() => {
        const schoolOption = screen.getByText('Oak Elementary');
        fireEvent.click(schoolOption);
      });
      
      const startInput = screen.getByLabelText(/From/i);
      expect(startInput.value).toBe('555 School St, Hometown, ST 12345');
    });
  });

  describe('Stop Management', () => {
    it('should add a new stop', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const addStopButton = screen.getByRole('button', { name: /Add Stop/i });
      fireEvent.click(addStopButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Stop 1...')).toBeInTheDocument();
      });
    });

    it('should remove a stop', async () => {
      const taskWithStops = createMockDrivingTask({
        templateData: {
          stops: [
            { id: 1, address: 'Coffee Shop', type: 'waypoint' }
          ]
        }
      });
      
      render(
        <DrivingTaskTemplate 
          task={taskWithStops} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      expect(screen.getByDisplayValue('Coffee Shop')).toBeInTheDocument();
      
      const removeButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Coffee Shop')).not.toBeInTheDocument();
      });
    });

    it('should edit stop address', async () => {
      const taskWithStops = createMockDrivingTask({
        templateData: {
          stops: [
            { id: 1, address: 'Coffee Shop', type: 'waypoint' }
          ]
        }
      });
      
      render(
        <DrivingTaskTemplate 
          task={taskWithStops} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const stopInput = screen.getByDisplayValue('Coffee Shop');
      await userEvent.clear(stopInput);
      await userEvent.type(stopInput, 'Gas Station');
      
      await waitFor(() => {
        expect(stopInput.value).toBe('Gas Station');
      });
    });
  });

  describe('Place Search', () => {
    it('should show search interface when Search Along Route is clicked', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const searchButton = screen.getByRole('button', { name: /Search Along Route/i });
      fireEvent.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search for places/i)).toBeInTheDocument();
      });
    });

    it('should search for places and display results', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const searchButton = screen.getByRole('button', { name: /Search Along Route/i });
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText(/Search for places/i);
      await userEvent.type(searchInput, 'dunkin');
      
      await waitFor(() => {
        expect(screen.getByText("Dunkin'")).toBeInTheDocument();
        expect(screen.getByText('On route')).toBeInTheDocument();
      });
    });

    it('should add a place as a stop', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const searchButton = screen.getByRole('button', { name: /Search Along Route/i });
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText(/Search for places/i);
      await userEvent.type(searchInput, 'dunkin');
      
      await waitFor(() => {
        const placeButton = screen.getByText("Dunkin'").closest('button');
        fireEvent.click(placeButton);
      });
      
      // Check that the place was added as a stop
      await waitFor(() => {
        expect(screen.getByDisplayValue('123 Coffee St, Hometown, ST 12345')).toBeInTheDocument();
      });
    });

    it('should show detour information for off-route places', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const searchButton = screen.getByRole('button', { name: /Search Along Route/i });
      fireEvent.click(searchButton);
      
      const searchInput = screen.getByPlaceholderText(/Search for places/i);
      await userEvent.type(searchInput, 'starbucks');
      
      await waitFor(() => {
        expect(screen.getByText('+0.5 miles')).toBeInTheDocument();
      });
    });
  });

  describe('Smart Suggestions', () => {
    it('should show smart suggestions button for events with eventType', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate}
          eventType="birthday_party" 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Smart Suggestions/i })).toBeInTheDocument();
      });
    });

    it('should display categorized suggestions when button is clicked', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate}
          eventType="birthday_party" 
        />
      );
      
      await waitFor(() => {
        const suggestionsButton = screen.getByRole('button', { name: /Smart Suggestions/i });
        fireEvent.click(suggestionsButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Smart Stop Suggestions')).toBeInTheDocument();
        expect(screen.getByText('Recommended for this event')).toBeInTheDocument();
        expect(screen.getByText('Based on time of day')).toBeInTheDocument();
        expect(screen.getByText('Toys "R" Us')).toBeInTheDocument();
      });
    });

    it('should add smart suggestion as stop', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate}
          eventType="birthday_party" 
        />
      );
      
      await waitFor(() => {
        const suggestionsButton = screen.getByRole('button', { name: /Smart Suggestions/i });
        fireEvent.click(suggestionsButton);
      });
      
      await waitFor(() => {
        const toyStoreButton = screen.getByText('Toys "R" Us').closest('button');
        fireEvent.click(toyStoreButton);
      });
      
      // Verify the stop was added
      await waitFor(() => {
        expect(screen.getByDisplayValue('852 Kids Plaza, Hometown, ST 12345')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should generate navigation URL when addresses are set', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Open in Maps/i })).toBeInTheDocument();
      });
    });

    it('should open navigation in new window when button is clicked', async () => {
      const mockOpen = vi.fn();
      window.open = mockOpen;
      
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const navButton = screen.getByRole('button', { name: /Open in Maps/i });
      fireEvent.click(navButton);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('maps.google.com'),
        '_blank'
      );
    });
  });

  describe('Route Summary', () => {
    it('should display route summary with addresses', () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      expect(screen.getByText('Route Summary')).toBeInTheDocument();
      expect(screen.getByText(/123 Main St.*456 Sports Complex/)).toBeInTheDocument();
    });

    it('should include stops in route summary', () => {
      const taskWithStops = createMockDrivingTask({
        templateData: {
          stops: [
            { id: 1, address: 'Coffee Shop', type: 'waypoint' },
            { id: 2, address: 'Gas Station', type: 'waypoint' }
          ]
        }
      });
      
      render(
        <DrivingTaskTemplate 
          task={taskWithStops} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      expect(screen.getByText(/2 stops/)).toBeInTheDocument();
    });

    it('should display estimated time in summary', () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      expect(screen.getByText('Estimated time: 25 min')).toBeInTheDocument();
    });
  });

  describe('Auto-save', () => {
    it('should auto-save changes after a delay', async () => {
      const { useTaskStore } = await import('../../../../stores/taskStore');
      const updateTaskMock = vi.fn();
      useTaskStore.mockReturnValue({ updateTask: updateTaskMock });
      
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const startInput = screen.getByLabelText(/From/i);
      await userEvent.clear(startInput);
      await userEvent.type(startInput, 'New Address');
      
      // Wait for debounce
      await waitFor(() => {
        expect(updateTaskMock).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should call onUpdate callback when data changes', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const startInput = screen.getByLabelText(/From/i);
      await userEvent.clear(startInput);
      await userEvent.type(startInput, 'New Address');
      
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            templateData: expect.objectContaining({
              startAddress: 'New Address'
            })
          })
        );
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      expect(screen.getByLabelText(/From/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/To/i)).toHaveAttribute('type', 'text');
    });

    it('should be keyboard navigable', async () => {
      render(
        <DrivingTaskTemplate 
          task={mockTask} 
          onUpdate={mockOnUpdate} 
        />
      );
      
      const startInput = screen.getByLabelText(/From/i);
      startInput.focus();
      expect(document.activeElement).toBe(startInput);
      
      // Tab to next element
      await userEvent.tab();
      // Should move to one of the quick address buttons or dropdown
      expect(document.activeElement).not.toBe(startInput);
    });
  });
});