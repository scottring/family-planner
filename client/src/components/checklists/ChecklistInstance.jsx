import { useState, useEffect } from 'react';
import checklistService from '../../services/checklists';
import './ChecklistInstance.css';

const ChecklistInstance = ({ 
  instanceId, 
  onUpdate, 
  onDelete, 
  onClose,
  showHeader = true,
  compact = false 
}) => {
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (instanceId) {
      fetchInstance();
    }
  }, [instanceId]);

  const fetchInstance = async () => {
    try {
      setLoading(true);
      setError('');
      const instanceData = await checklistService.getInstance(instanceId);
      setInstance(instanceData);
    } catch (err) {
      setError('Failed to load checklist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (itemId, checked) => {
    if (updating) return;

    try {
      setUpdating(true);
      const updatedInstance = await checklistService.toggleItemCheck(
        instanceId, 
        itemId, 
        checked
      );
      setInstance(updatedInstance);
      
      if (onUpdate) {
        onUpdate(updatedInstance);
      }
    } catch (err) {
      setError('Failed to update item');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddCustomItem = async () => {
    if (!newItemText.trim()) return;

    try {
      const updatedInstance = await checklistService.addCustomItem(
        instanceId,
        newItemText.trim()
      );
      setInstance(updatedInstance);
      setNewItemText('');
      setShowAddItem(false);
      
      if (onUpdate) {
        onUpdate(updatedInstance);
      }
    } catch (err) {
      setError('Failed to add item');
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this checklist?')) {
      try {
        await checklistService.deleteInstance(instanceId);
        if (onDelete) {
          onDelete(instanceId);
        }
      } catch (err) {
        setError('Failed to delete checklist');
        console.error(err);
      }
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage === 100) return '#48bb78';
    if (percentage >= 75) return '#4299e1';
    if (percentage >= 50) return '#ed8936';
    if (percentage >= 25) return '#f56565';
    return '#a0aec0';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`checklist-instance ${compact ? 'compact' : ''}`}>
        <div className="loading">Loading checklist...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`checklist-instance ${compact ? 'compact' : ''}`}>
        <div className="error">{error}</div>
        <button onClick={fetchInstance} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className={`checklist-instance ${compact ? 'compact' : ''}`}>
        <div className="error">Checklist not found</div>
      </div>
    );
  }

  const progress = checklistService.calculateProgress(instance.items);
  const uncheckedItems = checklistService.getUncheckedItems(instance.items);
  const checkedItems = checklistService.getCheckedItems(instance.items);

  return (
    <div className={`checklist-instance ${compact ? 'compact' : ''}`}>
      {showHeader && (
        <div className="instance-header">
          <div className="header-content">
            <h2>{instance.title}</h2>
            <div className="header-meta">
              {instance.template_name && (
                <span className="template-name">From: {instance.template_name}</span>
              )}
              {instance.event_title && (
                <span className="event-name">Event: {instance.event_title}</span>
              )}
              <span className="created-date">
                Created: {formatDate(instance.created_at)}
              </span>
            </div>
          </div>
          
          <div className="header-actions">
            {onClose && (
              <button onClick={onClose} className="close-btn">
                ×
              </button>
            )}
            <button onClick={handleDelete} className="delete-btn">
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="progress-section">
        <div className="progress-header">
          <div className="progress-stats">
            <span className="progress-text">
              {checkedItems.length} of {instance.items.length} completed
            </span>
            <span 
              className="progress-percentage"
              style={{ color: getProgressColor(progress) }}
            >
              {progress}%
            </span>
          </div>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${progress}%`,
              backgroundColor: getProgressColor(progress)
            }}
          />
        </div>
        
        {progress === 100 && (
          <div className="completion-message">
            🎉 Checklist completed! Great job!
          </div>
        )}
      </div>

      <div className="items-section">
        {!compact && uncheckedItems.length > 0 && (
          <div className="items-group">
            <h3 className="group-title">
              To Do ({uncheckedItems.length})
            </h3>
            <div className="items-list">
              {uncheckedItems.map(item => (
                <div key={item.id} className="item-row">
                  <label className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                      disabled={updating}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <span className="item-text">{item.text}</span>
                  {item.custom && (
                    <span className="custom-badge">Custom</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {compact && (
          <div className="items-group">
            <div className="items-list">
              {instance.items.map(item => (
                <div key={item.id} className={`item-row ${item.checked ? 'checked' : ''}`}>
                  <label className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                      disabled={updating}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <span className="item-text">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!compact && checkedItems.length > 0 && (
          <div className="items-group completed-group">
            <h3 className="group-title">
              Completed ({checkedItems.length})
            </h3>
            <div className="items-list">
              {checkedItems.map(item => (
                <div key={item.id} className="item-row checked">
                  <label className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                      disabled={updating}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <span className="item-text">{item.text}</span>
                  {item.custom && (
                    <span className="custom-badge">Custom</span>
                  )}
                  <span className="completion-time">
                    ✓ {formatDate(item.checked_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!compact && (
          <div className="add-item-section">
            {!showAddItem ? (
              <button 
                onClick={() => setShowAddItem(true)}
                className="add-item-btn"
              >
                + Add Custom Item
              </button>
            ) : (
              <div className="add-item-form">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Enter new item..."
                  className="add-item-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCustomItem();
                    }
                  }}
                />
                <div className="add-item-actions">
                  <button 
                    onClick={handleAddCustomItem}
                    disabled={!newItemText.trim()}
                    className="confirm-add-btn"
                  >
                    Add
                  </button>
                  <button 
                    onClick={() => {
                      setShowAddItem(false);
                      setNewItemText('');
                    }}
                    className="cancel-add-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {instance.status === 'completed' && (
        <div className="completion-badge">
          Completed on {formatDate(instance.completed_at)}
        </div>
      )}
    </div>
  );
};

export default ChecklistInstance;