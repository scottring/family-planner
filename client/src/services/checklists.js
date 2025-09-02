import api from './api';

class ChecklistService {
  // Template methods
  async getTemplates() {
    try {
      const response = await api.get('/checklists/templates');
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw new Error('Failed to fetch checklist templates');
    }
  }

  async getTemplate(id) {
    try {
      const response = await api.get(`/checklists/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw new Error('Failed to fetch checklist template');
    }
  }

  async createTemplate(templateData) {
    try {
      const response = await api.post('/checklists/templates', templateData);
      return response.data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create checklist template');
    }
  }

  async getTemplatesByCategory(category) {
    try {
      const response = await api.get(`/checklists/templates/category/${category}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      throw new Error('Failed to fetch checklist templates');
    }
  }

  // Instance methods
  async createInstance(instanceData) {
    try {
      const response = await api.post('/checklists/instances', instanceData);
      return response.data;
    } catch (error) {
      console.error('Error creating checklist instance:', error);
      throw new Error('Failed to create checklist instance');
    }
  }

  async getInstance(id) {
    try {
      const response = await api.get(`/checklists/instances/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching checklist instance:', error);
      throw new Error('Failed to fetch checklist instance');
    }
  }

  async getActiveInstances() {
    try {
      const response = await api.get('/checklists/instances/active');
      return response.data;
    } catch (error) {
      console.error('Error fetching active checklists:', error);
      throw new Error('Failed to fetch active checklists');
    }
  }

  async toggleItemCheck(instanceId, itemId, checked) {
    try {
      const response = await api.put(`/checklists/instances/${instanceId}/check`, {
        item_id: itemId,
        checked: checked
      });
      return response.data;
    } catch (error) {
      console.error('Error updating checklist item:', error);
      throw new Error('Failed to update checklist item');
    }
  }

  async addCustomItem(instanceId, itemText) {
    try {
      const response = await api.post(`/checklists/instances/${instanceId}/items`, {
        text: itemText
      });
      return response.data;
    } catch (error) {
      console.error('Error adding custom item:', error);
      throw new Error('Failed to add custom item');
    }
  }

  async deleteInstance(instanceId) {
    try {
      await api.delete(`/checklists/instances/${instanceId}`);
      return true;
    } catch (error) {
      console.error('Error deleting checklist instance:', error);
      throw new Error('Failed to delete checklist instance');
    }
  }

  // Utility methods
  getTemplateCategories(templates) {
    const categories = [...new Set(templates.map(template => template.category))];
    return categories.sort();
  }

  searchTemplates(templates, searchTerm) {
    const term = searchTerm.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      template.description?.toLowerCase().includes(term) ||
      template.tags.some(tag => tag.toLowerCase().includes(term)) ||
      template.items.some(item => {
        const itemText = typeof item === 'string' ? item : item.text;
        return itemText.toLowerCase().includes(term);
      })
    );
  }

  calculateProgress(items) {
    if (!items || items.length === 0) return 0;
    const checkedItems = items.filter(item => item.checked).length;
    return Math.round((checkedItems / items.length) * 100);
  }

  getUncheckedItems(items) {
    return items.filter(item => !item.checked);
  }

  getCheckedItems(items) {
    return items.filter(item => item.checked);
  }

  // Create a quick checklist from a template
  async createQuickChecklist(templateId, title, eventId = null) {
    return this.createInstance({
      template_id: templateId,
      title: title,
      event_id: eventId
    });
  }

  // Create a custom checklist without a template
  async createCustomChecklist(title, items, eventId = null) {
    const customItems = items.map(item => ({
      text: typeof item === 'string' ? item : item.text,
      checked: false
    }));

    return this.createInstance({
      title: title,
      custom_items: customItems,
      event_id: eventId
    });
  }
}

export default new ChecklistService();