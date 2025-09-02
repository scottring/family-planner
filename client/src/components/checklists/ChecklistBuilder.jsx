import { useState } from 'react';
import checklistService from '../../services/checklists';
import './ChecklistBuilder.css';

const ChecklistBuilder = ({ onSave, onCancel, initialTemplate = null }) => {
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '');
  const [category, setCategory] = useState(initialTemplate?.category || '');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [items, setItems] = useState(initialTemplate?.items || []);
  const [tags, setTags] = useState(initialTemplate?.tags || []);
  const [newItem, setNewItem] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Predefined categories for easy selection
  const predefinedCategories = [
    'Sports',
    'Recreation', 
    'Healthcare',
    'Education',
    'Travel',
    'Work',
    'Home',
    'Emergency',
    'Holiday',
    'Custom'
  ];

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleMoveItem = (index, direction) => {
    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'down' && index < items.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    setItems(newItems);
  };

  const handleEditItem = (index, newValue) => {
    const newItems = [...items];
    newItems[index] = newValue;
    setItems(newItems);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleCategoryChange = (value) => {
    if (value === 'Custom') {
      setIsCustomCategory(true);
      setCategory('');
    } else {
      setIsCustomCategory(false);
      setCategory(value);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory : category;
    if (!finalCategory.trim()) {
      setError('Category is required');
      return;
    }

    if (items.length === 0) {
      setError('At least one item is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const templateData = {
        name: templateName.trim(),
        category: finalCategory.trim(),
        description: description.trim() || null,
        items: items,
        tags: tags
      };

      const savedTemplate = await checklistService.createTemplate(templateData);
      
      if (onSave) {
        onSave(savedTemplate);
      }
    } catch (err) {
      setError('Failed to save template. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="checklist-builder">
      <div className="builder-header">
        <h2>
          {initialTemplate ? 'Edit Template' : 'Create New Checklist Template'}
        </h2>
        <div className="header-actions">
          <button onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="save-btn"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="builder-content">
        <div className="builder-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="templateName">Template Name *</label>
              <input
                id="templateName"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Soccer Practice, Beach Day"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              {!isCustomCategory ? (
                <select 
                  id="category"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select a category</option>
                  {predefinedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <div className="custom-category-input">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="form-input"
                  />
                  <button 
                    onClick={() => setIsCustomCategory(false)}
                    className="back-btn"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this template is for..."
                className="form-textarea"
                rows="3"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Checklist Items</h3>
            
            <div className="add-item-form">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddItem)}
                placeholder="Add an item to the checklist..."
                className="form-input"
              />
              <button 
                onClick={handleAddItem}
                disabled={!newItem.trim()}
                className="add-btn"
              >
                Add Item
              </button>
            </div>

            <div className="items-list">
              {items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="item-controls">
                    <button
                      onClick={() => handleMoveItem(index, 'up')}
                      disabled={index === 0}
                      className="move-btn"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="move-btn"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleEditItem(index, e.target.value)}
                    className="item-input"
                  />
                  
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="remove-btn"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="no-items">
                  No items added yet. Add your first item above.
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Tags</h3>
            <p className="section-description">
              Add tags to help categorize and search for this template
            </p>
            
            <div className="add-tag-form">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddTag)}
                placeholder="Add a tag..."
                className="form-input"
              />
              <button 
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="add-btn"
              >
                Add Tag
              </button>
            </div>

            <div className="tags-list">
              {tags.map(tag => (
                <div key={tag} className="tag-item">
                  <span>{tag}</span>
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="builder-preview">
          <h3>Preview</h3>
          <div className="preview-card">
            <div className="preview-header">
              <h4>{templateName || 'Untitled Template'}</h4>
              <span className="preview-category">
                {isCustomCategory ? customCategory : category}
              </span>
            </div>
            
            {description && (
              <div className="preview-description">
                {description}
              </div>
            )}
            
            <div className="preview-stats">
              <span>{items.length} items</span>
              {tags.length > 0 && <span>{tags.length} tags</span>}
            </div>
            
            {items.length > 0 && (
              <div className="preview-items">
                <h5>Items:</h5>
                <ul>
                  {items.slice(0, 5).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                  {items.length > 5 && (
                    <li className="more-items">
                      ... and {items.length - 5} more items
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            {tags.length > 0 && (
              <div className="preview-tags">
                {tags.map(tag => (
                  <span key={tag} className="preview-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistBuilder;