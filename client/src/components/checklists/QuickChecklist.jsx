import { useState, useEffect } from 'react';
import checklistService from '../../services/checklists';
import './QuickChecklist.css';

const QuickChecklist = ({ 
  instanceId, 
  eventId, 
  onUpdate, 
  onComplete,
  maxItems = 5,
  showProgress = true,
  showAddButton = false,
  className = ''
}) => {
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (instanceId) {
      fetchInstance();
    } else {
      setLoading(false);
    }
  }, [instanceId]);

  const fetchInstance = async () => {
    try {
      setLoading(true);
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
    if (updating || !instance) return;

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

      // Check if checklist is now complete
      if (updatedInstance.status === 'completed' && onComplete) {
        onComplete(updatedInstance);
      }
    } catch (err) {
      console.error('Failed to update item:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateQuickChecklist = async (templateId) => {
    try {
      const newInstance = await checklistService.createQuickChecklist(
        templateId,
        'Quick Checklist',
        eventId
      );
      setInstance(newInstance);
      
      if (onUpdate) {
        onUpdate(newInstance);
      }
    } catch (err) {
      setError('Failed to create checklist');
      console.error(err);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage === 100) return '#48bb78';
    if (percentage >= 75) return '#4299e1';
    if (percentage >= 50) return '#ed8936';
    if (percentage >= 25) return '#f56565';
    return '#a0aec0';
  };

  // If no instance and we're not loading, show template selection
  if (!loading && !instance && !error) {
    return (
      <QuickChecklistTemplateSelector 
        onSelectTemplate={handleCreateQuickChecklist}
        className={className}
      />
    );
  }

  if (loading) {
    return (
      <div className={`quick-checklist loading ${className}`}>
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`quick-checklist error ${className}`}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!instance) {
    return null;
  }

  const progress = checklistService.calculateProgress(instance.items);
  const visibleItems = instance.items.slice(0, maxItems);
  const remainingCount = Math.max(0, instance.items.length - maxItems);
  const uncheckedItems = checklistService.getUncheckedItems(visibleItems);
  const checkedItems = checklistService.getCheckedItems(visibleItems);

  return (
    <div className={`quick-checklist ${className}`}>
      <div className="quick-checklist-header">
        <h4 className="checklist-title">{instance.title}</h4>
        
        {showProgress && (
          <div className="progress-info">
            <span className="progress-text">
              {checklistService.getCheckedItems(instance.items).length}/{instance.items.length}
            </span>
            <div className="progress-circle">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke={getProgressColor(progress)}
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 10}`}
                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 12 12)"
                />
              </svg>
              <span className="progress-number">{Math.round(progress)}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="quick-items-list">
        {/* Show unchecked items first */}
        {uncheckedItems.map(item => (
          <div key={item.id} className="quick-item">
            <label className="quick-item-checkbox">
              <input
                type="checkbox"
                checked={false}
                onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                disabled={updating}
              />
              <span className="checkmark"></span>
            </label>
            <span className="item-text">{item.text}</span>
          </div>
        ))}

        {/* Show checked items */}
        {checkedItems.map(item => (
          <div key={item.id} className="quick-item checked">
            <label className="quick-item-checkbox">
              <input
                type="checkbox"
                checked={true}
                onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                disabled={updating}
              />
              <span className="checkmark"></span>
            </label>
            <span className="item-text">{item.text}</span>
          </div>
        ))}

        {remainingCount > 0 && (
          <div className="remaining-items">
            +{remainingCount} more items
          </div>
        )}
      </div>

      {progress === 100 && (
        <div className="completion-indicator">
          <span className="completion-icon">✓</span>
          <span className="completion-text">Complete!</span>
        </div>
      )}

      {showAddButton && (
        <div className="quick-actions">
          <button className="view-full-btn">
            View Full Checklist
          </button>
        </div>
      )}
    </div>
  );
};

// Template selector component for quick checklist creation
const QuickChecklistTemplateSelector = ({ onSelectTemplate, className }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchPopularTemplates();
  }, []);

  const fetchPopularTemplates = async () => {
    try {
      const allTemplates = await checklistService.getTemplates();
      // Sort by usage count and take top 5
      const popular = allTemplates
        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 5);
      setTemplates(popular);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`quick-template-selector loading ${className}`}>
        <div className="loading-text">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className={`quick-template-selector ${className}`}>
      <div className="selector-header">
        <h4>Quick Checklist</h4>
        <p>Choose a template to get started</p>
      </div>
      
      <div className="template-options">
        {templates.slice(0, showAll ? templates.length : 3).map(template => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className="template-option"
          >
            <div className="template-info">
              <span className="template-name">{template.name}</span>
              <span className="template-category">{template.category}</span>
            </div>
            <div className="template-stats">
              {template.items.length} items
            </div>
          </button>
        ))}
        
        {templates.length > 3 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="show-more-btn"
          >
            {showAll ? 'Show Less' : `Show ${templates.length - 3} More`}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuickChecklist;