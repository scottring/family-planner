const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/checklists/templates - get all templates
router.get('/templates', (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT * FROM checklist_templates 
      ORDER BY category, name
    `).all();
    
    // Parse JSON fields
    const templatesWithParsedData = templates.map(template => ({
      ...template,
      items: db.parseJSON(template.items) || [],
      tags: db.parseJSON(template.tags) || []
    }));
    
    res.json(templatesWithParsedData);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/checklists/templates/:id - get specific template
router.get('/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const template = db.prepare(`
      SELECT * FROM checklist_templates WHERE id = ?
    `).get(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Parse JSON fields
    template.items = db.parseJSON(template.items) || [];
    template.tags = db.parseJSON(template.tags) || [];
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/checklists/templates - create new template
router.post('/templates', (req, res) => {
  try {
    const { name, category, description, items, tags, created_by } = req.body;
    
    if (!name || !category || !items) {
      return res.status(400).json({ error: 'Name, category, and items are required' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO checklist_templates (name, category, description, items, tags, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name,
      category,
      description || null,
      db.stringifyJSON(items),
      db.stringifyJSON(tags || []),
      created_by || null
    );
    
    // Fetch the created template
    const newTemplate = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(result.lastInsertRowid);
    newTemplate.items = db.parseJSON(newTemplate.items) || [];
    newTemplate.tags = db.parseJSON(newTemplate.tags) || [];
    
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// GET /api/checklists/templates/category/:category - get by category
router.get('/templates/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    
    const templates = db.prepare(`
      SELECT * FROM checklist_templates 
      WHERE category = ?
      ORDER BY name
    `).all(category);
    
    // Parse JSON fields
    const templatesWithParsedData = templates.map(template => ({
      ...template,
      items: db.parseJSON(template.items) || [],
      tags: db.parseJSON(template.tags) || []
    }));
    
    res.json(templatesWithParsedData);
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/checklists/instances - create instance from template
router.post('/instances', (req, res) => {
  try {
    const { template_id, event_id, title, custom_items, created_by } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    let items = [];
    
    // If template_id is provided, get items from template
    if (template_id) {
      const template = db.prepare('SELECT * FROM checklist_templates WHERE id = ?').get(template_id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      items = db.parseJSON(template.items) || [];
      
      // Increment usage count
      db.prepare('UPDATE checklist_templates SET usage_count = usage_count + 1 WHERE id = ?').run(template_id);
    }
    
    // Add any custom items
    if (custom_items && Array.isArray(custom_items)) {
      items = [...items, ...custom_items];
    }
    
    // Initialize all items as unchecked
    const instanceItems = items.map(item => ({
      id: Date.now() + Math.random(), // Simple ID generation
      text: typeof item === 'string' ? item : item.text,
      checked: false,
      added_at: new Date().toISOString()
    }));
    
    const stmt = db.prepare(`
      INSERT INTO checklist_instances (template_id, event_id, title, items, created_by)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      template_id || null,
      event_id || null,
      title,
      db.stringifyJSON(instanceItems),
      created_by || null
    );
    
    // Fetch the created instance
    const newInstance = db.prepare('SELECT * FROM checklist_instances WHERE id = ?').get(result.lastInsertRowid);
    newInstance.items = db.parseJSON(newInstance.items) || [];
    
    res.status(201).json(newInstance);
  } catch (error) {
    console.error('Error creating checklist instance:', error);
    res.status(500).json({ error: 'Failed to create checklist instance' });
  }
});

// PUT /api/checklists/instances/:id/check - check/uncheck item
router.put('/instances/:id/check', (req, res) => {
  try {
    const { id } = req.params;
    const { item_id, checked } = req.body;
    
    if (item_id === undefined || checked === undefined) {
      return res.status(400).json({ error: 'item_id and checked status are required' });
    }
    
    // Get current instance
    const instance = db.prepare('SELECT * FROM checklist_instances WHERE id = ?').get(id);
    if (!instance) {
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    const items = db.parseJSON(instance.items) || [];
    
    // Find and update the item
    const itemIndex = items.findIndex(item => item.id == item_id);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in checklist' });
    }
    
    items[itemIndex].checked = checked;
    items[itemIndex].checked_at = checked ? new Date().toISOString() : null;
    
    // Calculate completion percentage
    const checkedItems = items.filter(item => item.checked).length;
    const completionPercentage = items.length > 0 ? (checkedItems / items.length) * 100 : 0;
    
    // Determine status
    let status = 'active';
    let completed_at = null;
    if (completionPercentage === 100) {
      status = 'completed';
      completed_at = new Date().toISOString();
    }
    
    // Update the instance
    const stmt = db.prepare(`
      UPDATE checklist_instances 
      SET items = ?, completion_percentage = ?, status = ?, completed_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      db.stringifyJSON(items),
      completionPercentage,
      status,
      completed_at,
      id
    );
    
    // Return updated instance
    const updatedInstance = db.prepare('SELECT * FROM checklist_instances WHERE id = ?').get(id);
    updatedInstance.items = db.parseJSON(updatedInstance.items) || [];
    
    res.json(updatedInstance);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// GET /api/checklists/instances/active - get active checklists
router.get('/instances/active', (req, res) => {
  try {
    const instances = db.prepare(`
      SELECT ci.*, ct.name as template_name, e.title as event_title
      FROM checklist_instances ci
      LEFT JOIN checklist_templates ct ON ci.template_id = ct.id
      LEFT JOIN events e ON ci.event_id = e.id
      WHERE ci.status = 'active'
      ORDER BY ci.created_at DESC
    `).all();
    
    // Parse JSON fields
    const instancesWithParsedData = instances.map(instance => ({
      ...instance,
      items: db.parseJSON(instance.items) || []
    }));
    
    res.json(instancesWithParsedData);
  } catch (error) {
    console.error('Error fetching active checklists:', error);
    res.status(500).json({ error: 'Failed to fetch active checklists' });
  }
});

// GET /api/checklists/instances/:id - get specific instance
router.get('/instances/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const instance = db.prepare(`
      SELECT ci.*, ct.name as template_name, e.title as event_title
      FROM checklist_instances ci
      LEFT JOIN checklist_templates ct ON ci.template_id = ct.id
      LEFT JOIN events e ON ci.event_id = e.id
      WHERE ci.id = ?
    `).get(id);
    
    if (!instance) {
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    // Parse JSON fields
    instance.items = db.parseJSON(instance.items) || [];
    
    res.json(instance);
  } catch (error) {
    console.error('Error fetching checklist instance:', error);
    res.status(500).json({ error: 'Failed to fetch checklist instance' });
  }
});

// POST /api/checklists/instances/:id/items - add custom item to instance
router.post('/instances/:id/items', (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Item text is required' });
    }
    
    // Get current instance
    const instance = db.prepare('SELECT * FROM checklist_instances WHERE id = ?').get(id);
    if (!instance) {
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    const items = db.parseJSON(instance.items) || [];
    
    // Add new item
    const newItem = {
      id: Date.now() + Math.random(),
      text: text,
      checked: false,
      added_at: new Date().toISOString(),
      custom: true
    };
    
    items.push(newItem);
    
    // Update the instance
    const stmt = db.prepare('UPDATE checklist_instances SET items = ? WHERE id = ?');
    stmt.run(db.stringifyJSON(items), id);
    
    // Return updated instance
    const updatedInstance = db.prepare('SELECT * FROM checklist_instances WHERE id = ?').get(id);
    updatedInstance.items = db.parseJSON(updatedInstance.items) || [];
    
    res.json(updatedInstance);
  } catch (error) {
    console.error('Error adding item to checklist:', error);
    res.status(500).json({ error: 'Failed to add item to checklist' });
  }
});

// DELETE /api/checklists/instances/:id - delete checklist instance
router.delete('/instances/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const result = db.prepare('DELETE FROM checklist_instances WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Checklist instance not found' });
    }
    
    res.json({ message: 'Checklist instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist instance:', error);
    res.status(500).json({ error: 'Failed to delete checklist instance' });
  }
});

module.exports = router;