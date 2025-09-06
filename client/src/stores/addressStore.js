import { create } from 'zustand';
import api from '../services/api';

export const useAddressStore = create((set, get) => ({
  addresses: [],
  primaryAddresses: {},
  loading: false,
  error: null,

  // Fetch all addresses for the user
  fetchAddresses: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/addresses');
      set({ 
        addresses: response.data, 
        loading: false 
      });
      // Also update primary addresses
      get().fetchPrimaryAddresses();
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch addresses', 
        loading: false 
      });
      console.error('Error fetching addresses:', error);
    }
  },

  // Fetch primary addresses organized by type
  fetchPrimaryAddresses: async () => {
    try {
      const response = await api.get('/addresses/primary');
      set({ primaryAddresses: response.data });
    } catch (error) {
      console.error('Error fetching primary addresses:', error);
    }
  },

  // Get address by ID
  getAddressById: (id) => {
    return get().addresses.find(addr => addr.id === id);
  },

  // Get primary address by type
  getPrimaryAddress: (type) => {
    return get().primaryAddresses[type];
  },

  // Quick getters for common addresses
  getHomeAddress: () => {
    const primary = get().primaryAddresses.home;
    if (primary) return primary.address;
    const home = get().addresses.find(addr => addr.type === 'home' && addr.is_primary);
    return home?.address || '';
  },

  getWorkAddress: () => {
    const primary = get().primaryAddresses.work;
    if (primary) return primary.address;
    const work = get().addresses.find(addr => addr.type === 'work' && addr.is_primary);
    return work?.address || '';
  },

  getSchoolAddress: () => {
    const primary = get().primaryAddresses.school;
    if (primary) return primary.address;
    const school = get().addresses.find(addr => addr.type === 'school' && addr.is_primary);
    return school?.address || '';
  },

  // Get addresses by type
  getAddressesByType: (type) => {
    return get().addresses.filter(addr => addr.type === type);
  },

  // Add new address
  addAddress: async (addressData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/addresses', addressData);
      const newAddress = response.data;
      
      set(state => ({
        addresses: [...state.addresses, newAddress],
        loading: false
      }));
      
      // Refresh primary addresses if this was set as primary
      if (newAddress.is_primary) {
        get().fetchPrimaryAddresses();
      }
      
      return newAddress;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to add address', 
        loading: false 
      });
      throw error;
    }
  },

  // Update address
  updateAddress: async (id, addressData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/addresses/${id}`, addressData);
      const updatedAddress = response.data;
      
      set(state => ({
        addresses: state.addresses.map(addr => 
          addr.id === id ? updatedAddress : addr
        ),
        loading: false
      }));
      
      // Refresh primary addresses if primary status changed
      if (addressData.is_primary !== undefined) {
        get().fetchPrimaryAddresses();
      }
      
      return updatedAddress;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to update address', 
        loading: false 
      });
      throw error;
    }
  },

  // Delete address
  deleteAddress: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/addresses/${id}`);
      
      set(state => ({
        addresses: state.addresses.filter(addr => addr.id !== id),
        loading: false
      }));
      
      // Refresh primary addresses in case a primary was deleted
      get().fetchPrimaryAddresses();
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to delete address', 
        loading: false 
      });
      throw error;
    }
  },

  // Batch update addresses
  batchUpdateAddresses: async (addresses) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/addresses/batch', { addresses });
      const { results, errors } = response.data;
      
      if (errors.length > 0) {
        console.warn('Some addresses failed to update:', errors);
      }
      
      // Refresh all addresses after batch update
      await get().fetchAddresses();
      
      return { results, errors };
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Failed to batch update addresses', 
        loading: false 
      });
      throw error;
    }
  },

  // Set primary address for a type
  setPrimaryAddress: async (id, type) => {
    return get().updateAddress(id, { is_primary: true, type });
  },

  // Quick address setters for common locations
  setHomeAddress: async (label, address, notes) => {
    const existing = get().addresses.find(addr => addr.type === 'home' && addr.is_primary);
    if (existing) {
      return get().updateAddress(existing.id, { label, address, notes });
    } else {
      return get().addAddress({ label, address, type: 'home', is_primary: true, notes });
    }
  },

  setWorkAddress: async (label, address, notes) => {
    const existing = get().addresses.find(addr => addr.type === 'work' && addr.is_primary);
    if (existing) {
      return get().updateAddress(existing.id, { label, address, notes });
    } else {
      return get().addAddress({ label, address, type: 'work', is_primary: true, notes });
    }
  },

  setSchoolAddress: async (label, address, notes) => {
    const existing = get().addresses.find(addr => addr.type === 'school' && addr.is_primary);
    if (existing) {
      return get().updateAddress(existing.id, { label, address, notes });
    } else {
      return get().addAddress({ label, address, type: 'school', is_primary: true, notes });
    }
  },

  // Clear all addresses (useful for logout)
  clearAddresses: () => {
    set({ 
      addresses: [], 
      primaryAddresses: {},
      loading: false, 
      error: null 
    });
  }
}));