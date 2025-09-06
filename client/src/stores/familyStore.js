import { create } from 'zustand';
import api from '../services/api';

export const useFamilyStore = create((set, get) => ({
  familyMembers: [],
  users: [],
  loading: false,
  error: null,

  // Mock data for development - in production this would fetch from API
  initializeMockData: () => {
    // TODO: Replace these with your actual family members' names
    const mockFamilyMembers = [
      { id: 1, name: 'Dad', type: 'parent', avatar: 'D', color: 'bg-blue-500' },
      { id: 2, name: 'Mom', type: 'parent', avatar: 'M', color: 'bg-pink-500' },
      { id: 3, name: 'Child 1', type: 'child', avatar: 'C', color: 'bg-green-500' },
      { id: 4, name: 'Child 2', type: 'child', avatar: 'C', color: 'bg-purple-500' },
      // Add more family members as needed
    ];

    const mockUsers = [
      { id: 1, username: 'dad', full_name: 'Dad', email: 'dad@family.com' },
      { id: 2, username: 'mom', full_name: 'Mom', email: 'mom@family.com' },
      { id: 3, username: 'child1', full_name: 'Child 1', email: 'child1@family.com' },
      { id: 4, username: 'child2', full_name: 'Child 2', email: 'child2@family.com' },
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
      const response = await api.get('/family/members');
      set({ familyMembers: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching family members, using mock data:', error);
      // Use mock data as fallback when API is not available
      get().initializeMockData();
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
  },

  // Add new family member
  addFamilyMember: async (memberData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/family/members', memberData);
      const newMember = response.data;
      const currentMembers = get().familyMembers;
      set({ 
        familyMembers: [...currentMembers, newMember],
        loading: false 
      });
      return newMember;
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error adding family member:', error);
      throw error;
    }
  },

  // Update family member
  updateFamilyMember: async (id, memberData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/family/members/${id}`, memberData);
      const updatedMember = response.data;
      const currentMembers = get().familyMembers;
      const updatedMembers = currentMembers.map(member => 
        member.id === id ? updatedMember : member
      );
      set({ 
        familyMembers: updatedMembers,
        loading: false 
      });
      return updatedMember;
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error updating family member:', error);
      throw error;
    }
  },

  // Delete family member
  deleteFamilyMember: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/family/members/${id}`);
      const currentMembers = get().familyMembers;
      const updatedMembers = currentMembers.filter(member => member.id !== id);
      set({ 
        familyMembers: updatedMembers,
        loading: false 
      });
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('Error deleting family member:', error);
      throw error;
    }
  }
}));