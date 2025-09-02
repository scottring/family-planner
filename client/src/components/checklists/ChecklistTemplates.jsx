import { useState, useEffect } from 'react';
import checklistService from '../../services/checklists';
import './ChecklistTemplates.css';

const ChecklistTemplates = ({ onApplyTemplate, onCreateNew }) => {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyTitle, setApplyTitle] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const templatesData = await checklistService.getTemplates();
      setTemplates(templatesData);
    } catch (err) {
      setError('Failed to load checklist templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = checklistService.searchTemplates(filtered, searchTerm);
    }

    setFilteredTemplates(filtered);
  };

  const getCategories = () => {
    const categories = checklistService.getTemplateCategories(templates);
    return ['All', ...categories];
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleApplyTemplate = (template) => {
    setSelectedTemplate(template);
    setApplyTitle(`${template.name} Checklist`);
    setApplyDialogOpen(true);
  };

  const confirmApplyTemplate = async () => {
    if (!selectedTemplate || !applyTitle.trim()) return;

    try {
      const instance = await checklistService.createInstance({
        template_id: selectedTemplate.id,
        title: applyTitle.trim()
      });
      
      setApplyDialogOpen(false);
      setApplyTitle('');
      
      if (onApplyTemplate) {
        onApplyTemplate(instance);
      }
    } catch (err) {
      setError('Failed to create checklist from template');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="checklist-templates">
        <div className="loading">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checklist-templates">
        <div className="error">{error}</div>
        <button onClick={fetchTemplates} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="checklist-templates">
      <div className="templates-header">
        <h2>Checklist Templates</h2>
        <button 
          className="create-new-btn"
          onClick={onCreateNew}
        >
          Create New Template
        </button>
      </div>

      <div className="templates-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="category-filter">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {getCategories().map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="templates-grid">
        {filteredTemplates.map(template => (
          <div key={template.id} className="template-card">
            <div className="template-header">
              <h3>{template.name}</h3>
              <span className="template-category">{template.category}</span>
            </div>
            
            <div className="template-description">
              {template.description}
            </div>
            
            <div className="template-stats">
              <span className="item-count">{template.items.length} items</span>
              <span className="usage-count">Used {template.usage_count} times</span>
            </div>
            
            <div className="template-tags">
              {template.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            
            <div className="template-actions">
              <button 
                onClick={() => handlePreviewTemplate(template)}
                className="preview-btn"
              >
                Preview
              </button>
              <button 
                onClick={() => handleApplyTemplate(template)}
                className="apply-btn"
              >
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="no-templates">
          <p>No templates found matching your criteria.</p>
          <button onClick={onCreateNew} className="create-first-btn">
            Create Your First Template
          </button>
        </div>
      )}

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedTemplate.name}</h3>
              <button 
                onClick={() => setShowPreview(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="template-info">
                <p><strong>Category:</strong> {selectedTemplate.category}</p>
                <p><strong>Description:</strong> {selectedTemplate.description}</p>
              </div>
              
              <div className="template-items-preview">
                <h4>Items ({selectedTemplate.items.length}):</h4>
                <ul>
                  {selectedTemplate.items.map((item, index) => (
                    <li key={index}>{typeof item === 'string' ? item : item.text}</li>
                  ))}
                </ul>
              </div>
              
              <div className="preview-actions">
                <button 
                  onClick={() => {
                    setShowPreview(false);
                    handleApplyTemplate(selectedTemplate);
                  }}
                  className="apply-btn"
                >
                  Use This Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Template Modal */}
      {applyDialogOpen && (
        <div className="modal-overlay" onClick={() => setApplyDialogOpen(false)}>
          <div className="apply-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Checklist from Template</h3>
              <button 
                onClick={() => setApplyDialogOpen(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Checklist Title:</label>
                <input
                  type="text"
                  value={applyTitle}
                  onChange={(e) => setApplyTitle(e.target.value)}
                  placeholder="Enter checklist title..."
                  className="title-input"
                />
              </div>
              
              <div className="apply-actions">
                <button 
                  onClick={() => setApplyDialogOpen(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmApplyTemplate}
                  disabled={!applyTitle.trim()}
                  className="confirm-btn"
                >
                  Create Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistTemplates;