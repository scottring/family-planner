import React from 'react';
import { render } from '@testing-library/react';

// Custom render function that includes providers
export function renderWithProviders(ui, options = {}) {
  return render(ui, options);
}

// Mock task data generators
export const createMockTask = (overrides = {}) => ({
  id: '1',
  title: 'Test Task',
  description: 'Test description',
  completed: false,
  priority: 'medium',
  category: 'preparation',
  due_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockDrivingTask = (overrides = {}) => ({
  ...createMockTask({
    title: 'Drive to Soccer Game',
    templateType: 'driving',
    templateData: {
      startAddress: '123 Main St, Hometown, ST 12345',
      destinationAddress: '456 Sports Complex, Hometown, ST 12345',
      stops: [],
      estimatedTime: '25 min',
      navigationUrl: 'https://maps.google.com/...',
      ...overrides.templateData
    },
    ...overrides
  })
});

export const createMockShoppingTask = (overrides = {}) => ({
  ...createMockTask({
    title: 'Birthday Party Shopping',
    templateType: 'shopping',
    templateData: {
      store: 'Target',
      items: [
        { id: 1, name: 'Gift wrap', quantity: 2, checked: false, category: 'party' },
        { id: 2, name: 'Birthday card', quantity: 1, checked: false, category: 'party' },
        { id: 3, name: 'Toy', quantity: 1, checked: true, category: 'gift' }
      ],
      estimatedTime: '45 min',
      budget: 50,
      notes: 'Check for sales',
      ...overrides.templateData
    },
    ...overrides
  })
});

export const createMockPickupDropoffTask = (overrides = {}) => ({
  ...createMockTask({
    title: 'School Carpool',
    templateType: 'pickup',
    templateData: {
      person: 'Emma',
      pickupLocation: 'Oak Elementary School',
      dropoffLocation: 'Home',
      pickupTime: '3:30 PM',
      isRoundTrip: false,
      contactInfo: '555-1234',
      notes: 'Wait at front entrance',
      ...overrides.templateData
    },
    ...overrides
  })
});

export const createMockMeetingTask = (overrides = {}) => ({
  ...createMockTask({
    title: 'Team Planning Meeting',
    templateType: 'meeting',
    templateData: {
      location: 'Conference Room A',
      attendees: ['John', 'Sarah', 'Mike'],
      duration: '1 hour',
      meetingLink: 'https://zoom.us/j/123456',
      agenda: [
        'Review Q1 goals',
        'Discuss roadmap',
        'Action items'
      ],
      notes: 'Bring project reports',
      ...overrides.templateData
    },
    ...overrides
  })
});

// Mock address data
export const mockAddresses = [
  {
    id: 1,
    label: 'Home',
    address: '789 Maple Ave, Hometown, ST 12345',
    type: 'home',
    is_primary: true,
    notes: 'Main residence'
  },
  {
    id: 2,
    label: "Sarah's Work",
    address: '321 Business Blvd, Downtown, ST 12345',
    type: 'work',
    is_primary: true,
    notes: 'Office building, parking in rear'
  },
  {
    id: 3,
    label: 'Oak Elementary',
    address: '555 School St, Hometown, ST 12345',
    type: 'school',
    is_primary: true,
    notes: 'Main entrance for pickup'
  },
  {
    id: 4,
    label: 'Soccer Field',
    address: '100 Sports Way, Hometown, ST 12345',
    type: 'other',
    is_primary: false,
    notes: 'Field #3'
  }
];

// Mock place search results
export const mockPlaceSearchResults = [
  {
    id: 'dunkin_1',
    name: "Dunkin'",
    address: '123 Coffee St, Hometown, ST 12345',
    rating: 4.2,
    distance: '0.5 miles',
    type: 'cafe',
    on_route: true,
    detour: '+0.2 miles',
    detour_time: '+1 min',
    route_position: 0.3
  },
  {
    id: 'starbucks_1',
    name: 'Starbucks',
    address: '456 Brew Ave, Hometown, ST 12345',
    rating: 4.3,
    distance: '0.8 miles',
    type: 'cafe',
    on_route: false,
    detour: '+0.5 miles',
    detour_time: '+3 min',
    route_position: 0.5
  }
];

// Mock smart suggestions
export const mockSmartSuggestions = {
  recommended: [
    {
      id: 'toys_r_us_1',
      name: 'Toys "R" Us',
      address: '852 Kids Plaza, Hometown, ST 12345',
      rating: 4.3,
      distance: '2.1 miles',
      type: 'toy_store',
      suggestion_reason: 'Popular toy store for birthday party'
    },
    {
      id: 'party_city_1',
      name: 'Party City',
      address: '963 Celebration Ave, Hometown, ST 12345',
      rating: 4.0,
      distance: '1.3 miles',
      type: 'party_supplies',
      suggestion_reason: 'Popular party supplies for birthday party'
    }
  ],
  time_based: [
    {
      id: 'dunkin_1',
      name: "Dunkin'",
      address: '123 Coffee St, Hometown, ST 12345',
      rating: 4.2,
      distance: '0.5 miles',
      type: 'cafe'
    }
  ],
  nearby: [
    {
      id: 'shell_1',
      name: 'Shell Gas Station',
      address: '321 Highway 1, Hometown, ST 12345',
      rating: 3.9,
      distance: '0.3 miles',
      type: 'gas_station'
    }
  ]
};

// Wait utility
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export * from '@testing-library/react';
export { renderWithProviders as render };