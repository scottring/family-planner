import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit2, Trash2, Archive, Clock, User, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const FamilyNotes = ({ className = "" }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({
    content: '',
    priority: 'normal',
    category: 'general'
  });
  const { user } = useAuthStore();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/family-notes');
      setNotes(response.data);
    } catch (err) {
      setError('Failed to load family notes');
      console.error('Error fetching family notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    try {
      if (!newNote.content.trim()) return;

      const response = await api.post('/family-notes', newNote);
      setNotes([response.data, ...notes]);
      setNewNote({ content: '', priority: 'normal', category: 'general' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Failed to create note');
    }
  };

  const updateNote = async (noteId, updates) => {
    try {
      const response = await api.put(`/family-notes/${noteId}`, updates);
      setNotes(notes.map(note => 
        note.id === noteId ? response.data : note
      ));
      setEditingNote(null);
    } catch (err) {
      console.error('Error updating note:', err);
      setError('Failed to update note');
    }
  };

  const archiveNote = async (noteId) => {
    try {
      await api.put(`/family-notes/${noteId}/archive`);
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (err) {
      console.error('Error archiving note:', err);
      setError('Failed to archive note');
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await api.delete(`/family-notes/${noteId}`);
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Failed to delete note');
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return null;
  };

  const NoteForm = ({ note = null, onSave, onCancel }) => {
    const [formData, setFormData] = useState(note || {
      content: '',
      priority: 'normal',
      category: 'general'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.content.trim()) return;
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-50">
        <div className="mb-3">
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Enter your family note..."
            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            required
          />
        </div>
        
        <div className="flex items-center space-x-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="general">General</option>
              <option value="schedule">Schedule</option>
              <option value="shopping">Shopping</option>
              <option value="kids">Kids</option>
              <option value="important">Important</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            {note ? 'Update' : 'Add'} Note
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-200 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  const NoteCard = ({ note }) => {
    const isOwner = note.author_id === user?.id;

    return (
      <div className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1">
            <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(note.priority)}`}>
              <div className="flex items-center space-x-1">
                {getPriorityIcon(note.priority)}
                <span className="capitalize">{note.priority}</span>
              </div>
            </span>
            {note.category !== 'general' && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full capitalize">
                {note.category}
              </span>
            )}
          </div>
          
          {isOwner && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setEditingNote(note)}
                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => archiveNote(note.id)}
                className="p-1 text-gray-400 hover:text-yellow-600 rounded transition-colors"
                title="Archive"
              >
                <Archive className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this note?')) {
                    deleteNote(note.id);
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        
        <p className="text-gray-900 mb-3 whitespace-pre-wrap">{note.content}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span>{note.author_full_name || note.author_name}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{formatTimeAgo(note.created_at)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <span>Family Notes</span>
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Note</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="mb-6">
            <NoteForm
              onSave={(formData) => {
                setNewNote(formData);
                createNote();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {editingNote && (
          <div className="mb-6">
            <NoteForm
              note={editingNote}
              onSave={(formData) => updateNote(editingNote.id, formData)}
              onCancel={() => setEditingNote(null)}
            />
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Family Notes</h3>
            <p className="text-gray-600 mb-4">Start sharing quick notes and reminders with your family</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Note
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyNotes;