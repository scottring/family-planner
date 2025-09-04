import { create } from 'zustand';
import api from '../services/api';

export const useFamilyStore = create((set, get) => ({
  familyMembers: [],
  users: [],
  loading: false,
  error: null,

  // Mock data for development - in production this would fetch from API
  initializeMockData: () => {
    const mockFamilyMembers = [
      { id: 1, name: 'Sarah', type: 'parent', avatar: 'S', color: 'bg-blue-500' },
      { id: 2, name: 'Michael', type: 'parent', avatar: 'M', color: 'bg-green-500' },
      { id: 3, name: 'Emma', type: 'child', avatar: 'E', color: 'bg-purple-500' },
      { id: 4, name: 'Jack', type: 'child', avatar: 'J', color: 'bg-orange-500' },
    ];

    const mockUsers = [
      { id: 1, username: 'sarah', full_name: 'Sarah Johnson', email: 'sarah@example.com' },
      { id: 2, username: 'michael', full_name: 'Michael Johnson', email: 'michael@example.com' },
      { id: 3, username: 'emma', full_name: 'Emma Johnson', email: 'emma@example.com' },
      { id: 4, username: 'jack', full_name: 'Jack Johnson', email: 'jack@example.com' },
    ];

    set({ 
      familyMembers: mockFamilyMembers,
      users: mockUsers,
      loading: false 
    });
  },

  fetchFamilyMembers: async () => {
    set({ loading: true, error: null });
    try {
      // In a real implementation, this would make an API call
      // const response = await api.get('/family/members');
      // set({ familyMembers: response.data, loading: false });
      
      // For now, use mock data
      get().initializeMockData();
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching family members:', error);
    }
  },

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      // In a real implementation, this would make an API call
      // const response = await api.get('/users');
      // set({ users: response.data, loading: false });
      
      // For now, use mock data
      get().initializeMockData();
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error fetching users:', error);
    }
  },

  getFamilyMemberById: (id) => {
    const familyMembers = get().familyMembers;
    return familyMembers.find(member => member.id === id);
  },

  getUserById: (id) => {
    const users = get().users;
    return users.find(user => user.id === id);
  },

  // Get all members who can be assigned to events
  getAssignableMembers: () => {
    const familyMembers = get().familyMembers;
    // In a real app, this might filter based on age, permissions, etc.
    return familyMembers.filter(member => member.type === 'parent' || member.type === 'child');
  }
}));

// Initialize mock data when the store is created
useFamilyStore.getState().initializeMockData();