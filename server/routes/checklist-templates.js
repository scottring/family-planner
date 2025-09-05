const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all checklist templates
router.get('/api/checklist-templates', async (req, res) => {
  try {
    const templates = await db.all(`
      SELECT * FROM checklist_templates 
      ORDER BY usage_count DESC, name ASC
    `);
    
    res.json(templates.map(template => ({
      ...template,
      items: template.items ? JSON.parse(template.items) : [],
      tags: template.tags ? JSON.parse(template.tags) : []
    })));
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create a new checklist template
router.post('/api/checklist-templates', async (req, res) => {
  try {
    const { name, category, description, items, tags } = req.body;
    
    const result = await db.run(`
      INSERT INTO checklist_templates (name, category, description, items, tags, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name,
      category,
      description,
      JSON.stringify(items || []),
      JSON.stringify(tags || []),
      req.user?.id || null
    ]);
    
    res.json({ 
      id: result.lastID, 
      message: 'Template created successfully' 
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template usage count
router.post('/api/checklist-templates/:id/use', async (req, res) => {
  try {
    await db.run(`
      UPDATE checklist_templates 
      SET usage_count = usage_count + 1 
      WHERE id = ?
    `, [req.params.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating usage count:', error);
    res.status(500).json({ error: 'Failed to update usage count' });
  }
});

module.exports = router;