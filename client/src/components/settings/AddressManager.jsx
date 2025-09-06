import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Home, 
  Briefcase, 
  GraduationCap, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  Star,
  StarOff
} from 'lucide-react';
import { useAddressStore } from '../../stores/addressStore';

const AddressManager = () => {
  const { 
    addresses, 
    loading, 
    error,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setPrimaryAddress
  } = useAddressStore();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    label: '',
    address: '',
    type: 'other',
    is_primary: false,
    notes: ''
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const typeIcons = {
    home: Home,
    work: Briefcase,
    school: GraduationCap,
    other: MapPin
  };

  const typeColors = {
    home: 'bg-blue-100 text-blue-600',
    work: 'bg-purple-100 text-purple-600',
    school: 'bg-green-100 text-green-600',
    other: 'bg-gray-100 text-gray-600'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAddress(editingId, formData);
        setEditingId(null);
      } else {
        await addAddress(formData);
        setIsAddingNew(false);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  const handleEdit = (address) => {
    setEditingId(address.id);
    setFormData({
      label: address.label,
      address: address.address,
      type: address.type,
      is_primary: address.is_primary,
      notes: address.notes || ''
    });
    setIsAddingNew(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await deleteAddress(id);
      } catch (error) {
        console.error('Error deleting address:', error);
      }
    }
  };

  const handleSetPrimary = async (address) => {
    try {
      await setPrimaryAddress(address.id, address.type);
    } catch (error) {
      console.error('Error setting primary address:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      address: '',
      type: 'other',
      is_primary: false,
      notes: ''
    });
    setIsAddingNew(false);
    setEditingId(null);
  };

  const startAddingNew = () => {
    resetForm();
    setIsAddingNew(true);
    setEditingId(null);
  };

  // Group addresses by type
  const groupedAddresses = addresses.reduce((acc, addr) => {
    if (!acc[addr.type]) acc[addr.type] = [];
    acc[addr.type].push(addr);
    return acc;
  }, {});

  // Sort types for display
  const typeOrder = ['home', 'work', 'school', 'other'];
  const sortedTypes = typeOrder.filter(type => groupedAddresses[type]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Saved Addresses</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your frequently used addresses for quick access
          </p>
        </div>
        {!isAddingNew && !editingId && (
          <button
            onClick={startAddingNew}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Address</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Home, Sarah's Work, Oak Elementary"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="school">School</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, Anytown, ST 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information or instructions"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Set as primary for this type</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4 inline mr-1" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4 inline mr-1" />
              {editingId ? 'Update' : 'Save'} Address
            </button>
          </div>
        </form>
      )}

      {/* Address List */}
      {loading && !addresses.length ? (
        <div className="text-center py-8 text-gray-500">Loading addresses...</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No saved addresses yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your frequently used addresses for quick access</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedTypes.map(type => {
            const TypeIcon = typeIcons[type];
            const addresses = groupedAddresses[type];
            
            return (
              <div key={type} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${typeColors[type]}`}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700 capitalize">{type}</h4>
                </div>
                
                <div className="space-y-2">
                  {addresses.map(address => (
                    <div 
                      key={address.id} 
                      className={`p-3 border rounded-lg ${
                        editingId === address.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-gray-900">{address.label}</h5>
                            {address.is_primary && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Star className="h-3 w-3 mr-0.5" />
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{address.address}</p>
                          {address.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">{address.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-4">
                          {!address.is_primary && (
                            <button
                              onClick={() => handleSetPrimary(address)}
                              className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Set as primary"
                            >
                              <StarOff className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(address)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(address.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AddressManager;