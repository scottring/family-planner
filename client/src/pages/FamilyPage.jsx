import { useState, useEffect } from 'react';
import { Users, UserPlus, Edit2, Trash2, Save, X, Palette } from 'lucide-react';
import { useFamilyStore } from '../stores/familyStore';

const FamilyPage = () => {
  const {
    familyMembers,
    loading,
    error,
    fetchFamilyMembers,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember
  } = useFamilyStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'child',
    age: '',
    color: '#3B82F6',
    avatar: ''
  });

  const colorOptions = [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // orange
    '#EF4444', // red
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // amber
  ];

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    try {
      if (editingId) {
        await updateFamilyMember(editingId, {
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
          avatar: formData.avatar || formData.name.charAt(0).toUpperCase()
        });
        setEditingId(null);
      } else {
        await addFamilyMember({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
          avatar: formData.avatar || formData.name.charAt(0).toUpperCase()
        });
        setShowAddForm(false);
      }
      
      // Reset form
      setFormData({
        name: '',
        type: 'child',
        age: '',
        color: '#3B82F6',
        avatar: ''
      });
    } catch (error) {
      console.error('Error saving family member:', error);
      alert('Error saving family member: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (member) => {
    setFormData({
      name: member.name,
      type: member.type,
      age: member.age || '',
      color: member.color || '#3B82F6',
      avatar: member.avatar || ''
    });
    setEditingId(member.id);
    setShowAddForm(false);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteFamilyMember(id);
      } catch (error) {
        console.error('Error deleting family member:', error);
        alert('Error deleting family member: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      type: 'child',
      age: '',
      color: '#3B82F6',
      avatar: ''
    });
  };

  const handleAddNew = () => {
    setShowAddForm(true);
    setEditingId(null);
    setFormData({
      name: '',
      type: 'child',
      age: '',
      color: '#3B82F6',
      avatar: ''
    });
  };

  if (loading && familyMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading family members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Family Members</h1>
        <button 
          onClick={handleAddNew}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Member</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Family Member' : 'Add New Family Member'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar (optional)
                </label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength="2"
                  placeholder={formData.name.charAt(0).toUpperCase() || "A"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Palette className="inline h-4 w-4 mr-1" />
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Family Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {familyMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div 
                  className="h-16 w-16 rounded-full flex items-center justify-center text-white font-semibold text-xl"
                  style={{ backgroundColor: member.color || '#3B82F6' }}
                >
                  {member.avatar || member.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-gray-500 capitalize">
                  {member.type}{member.age ? `, ${member.age} years old` : ''}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => handleEdit(member)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(member.id, member.name)}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {familyMembers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No family members yet</h3>
          <p className="text-gray-500 mb-4">
            Get started by adding your first family member.
          </p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add First Member</span>
          </button>
        </div>
      )}

      {/* Family Statistics */}
      {familyMembers.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Family Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{familyMembers.length}</div>
              <div className="text-sm text-blue-700">Total Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {familyMembers.filter(m => m.type === 'parent').length}
              </div>
              <div className="text-sm text-blue-700">Parents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {familyMembers.filter(m => m.type === 'child').length}
              </div>
              <div className="text-sm text-blue-700">Children</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyPage;