const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const db = require('../config/database');
// const { processInboxItem } = require('../services/inboxProcessor'); // TODO: Fix processInboxItem to handle direct content
const router = express.Router();

// Configure multer for handling audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  },
});

// Apply auth middleware to all routes
router.use(requireAuth);

// GET /api/inbox - Get inbox items with optional filtering
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      status,
      category,
      input_type,
      urgency_min,
      created_after,
      created_before,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT * FROM inbox_items 
      WHERE created_by = ?
    `;
    const params = [userId];

    // Add filters
    if (status && status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    } else if (!status || status === 'all') {
      // Default: exclude only converted and fully deleted items
      query += ` AND status NOT IN ('converted', 'deleted')`;
    }

    if (category && category !== 'all') {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (input_type && input_type !== 'all') {
      query += ` AND input_type = ?`;
      params.push(input_type);
    }

    if (urgency_min) {
      query += ` AND urgency_score >= ?`;
      params.push(parseInt(urgency_min));
    }

    if (created_after) {
      query += ` AND created_at >= ?`;
      params.push(created_after);
    }

    if (created_before) {
      query += ` AND created_at <= ?`;
      params.push(created_before);
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const items = db.prepare(query).all(...params);

    // Parse JSON fields
    const parsedItems = items.map(item => ({
      ...item,
      parsed_data: db.parseJSON(item.parsed_data)
    }));

    res.json(parsedItems);
  } catch (error) {
    console.error('Error fetching inbox items:', error);
    res.status(500).json({ error: 'Failed to fetch inbox items' });
  }
});

// POST /api/inbox - Add new inbox item
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      raw_content,
      transcription,
      input_type,
      parsed_data,
      urgency_score,
      category
    } = req.body;

    if (!raw_content && !transcription) {
      return res.status(400).json({ error: 'Either raw_content or transcription is required' });
    }

    if (!input_type || !['voice', 'text', 'image'].includes(input_type)) {
      return res.status(400).json({ error: 'Valid input_type is required' });
    }

    // Process the content to extract additional data
    // For now, use basic processing instead of the full processInboxItem
    const processedData = {
      urgency_score: urgency_score || 3,
      category: category || 'note',
      parsed_data: parsed_data || '{}'
    };

    const stmt = db.prepare(`
      INSERT INTO inbox_items (
        raw_content, transcription, input_type, parsed_data,
        urgency_score, category, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      raw_content,
      transcription,
      input_type,
      JSON.stringify(parsed_data || processedData.parsed_data || {}),
      urgency_score || processedData.urgency_score || 3,
      category || processedData.category,
      'pending', // Explicitly set status
      userId
    );

    // Fetch the created item
    const newItem = db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(result.lastInsertRowid);
    newItem.parsed_data = JSON.parse(newItem.parsed_data || '{}');

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating inbox item:', error);
    res.status(500).json({ error: 'Failed to create inbox item' });
  }
});

// POST /api/inbox/voice - Submit voice recording
router.post('/voice', upload.single('audio'), async (req, res) => {
  try {
    const userId = req.user.id;
    const audioBuffer = req.file.buffer;
    const metadata = JSON.parse(req.body.metadata || '{}');

    // Here you would typically:
    // 1. Save the audio file to storage (AWS S3, Google Cloud, etc.)
    // 2. Send to speech-to-text service (Google Speech API, AWS Transcribe, etc.)
    // 3. Process the transcription
    
    // For now, we'll create a placeholder transcription
    const transcription = metadata.transcription || 'Voice recording received - transcription pending';
    
    // For now, use basic processing instead of the full processInboxItem
    const processedData = {
      urgency_score: 3,
      category: 'note',
      parsed_data: '{}'
    };

    const stmt = db.prepare(`
      INSERT INTO inbox_items (
        raw_content, transcription, input_type, parsed_data,
        urgency_score, category, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      `Audio recording: ${req.file.originalname}`,
      transcription,
      'voice',
      JSON.stringify(processedData.parsed_data || {}),
      processedData.urgency_score || 3,
      processedData.category,
      userId
    );

    const newItem = db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(result.lastInsertRowid);
    newItem.parsed_data = JSON.parse(newItem.parsed_data || '{}');

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error processing voice recording:', error);
    res.status(500).json({ error: 'Failed to process voice recording' });
  }
});

// PUT /api/inbox/:id - Update inbox item
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const updates = req.body;

    // Verify ownership
    const item = db.prepare('SELECT * FROM inbox_items WHERE id = ? AND created_by = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    // Build update query
    const allowedUpdates = [
      'status', 'category', 'urgency_score', 'processed_at',
      'converted_to_type', 'converted_to_id', 'parsed_data', 'snooze_until'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = ?`);
        if (key === 'parsed_data') {
          updateValues.push(db.stringifyJSON(updates[key]));
        } else {
          updateValues.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    updateValues.push(itemId);
    
    const query = `UPDATE inbox_items SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...updateValues);

    // Fetch updated item
    const updatedItem = db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(itemId);
    updatedItem.parsed_data = db.parseJSON(updatedItem.parsed_data);

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating inbox item:', error);
    res.status(500).json({ error: 'Failed to update inbox item' });
  }
});

// PUT /api/inbox/:id/process - Convert inbox item to event/task
router.put('/:id/process', async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;
    const { convert_to_type, ...additionalData } = req.body;

    if (!convert_to_type || !['event', 'task'].includes(convert_to_type)) {
      return res.status(400).json({ error: 'Valid convert_to_type (event or task) is required' });
    }

    // Verify ownership
    const item = db.prepare('SELECT * FROM inbox_items WHERE id = ? AND created_by = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    let convertedId;
    
    if (convert_to_type === 'event') {
      // Create event from inbox item
      const parsedData = db.parseJSON(item.parsed_data);
      
      const eventData = {
        title: additionalData.title || item.transcription || item.raw_content,
        description: additionalData.description || item.raw_content,
        start_time: additionalData.start_time || new Date().toISOString(),
        end_time: additionalData.end_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        location: additionalData.location || (parsedData?.detectedEntities?.locations?.[0]),
        event_type: additionalData.event_type || 'general',
        created_by: userId
      };

      const stmt = db.prepare(`
        INSERT INTO events (title, description, start_time, end_time, location, event_type, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        eventData.title,
        eventData.description,
        eventData.start_time,
        eventData.end_time,
        eventData.location,
        eventData.event_type,
        eventData.created_by
      );
      
      convertedId = result.lastInsertRowid;
    } else if (convert_to_type === 'task') {
      // Create task from inbox item
      const parsedData = db.parseJSON(item.parsed_data);
      
      const taskData = {
        title: additionalData.title || item.transcription || item.raw_content,
        description: additionalData.description || item.raw_content,
        due_date: additionalData.due_date,
        priority: Math.min(5, Math.max(1, item.urgency_score || 3)),
        status: 'pending',
        category: additionalData.category || item.category || 'general',
        created_by: userId
      };

      const stmt = db.prepare(`
        INSERT INTO tasks (title, description, due_date, priority, status, category, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        taskData.title,
        taskData.description,
        taskData.due_date,
        taskData.priority,
        taskData.status,
        taskData.category,
        taskData.created_by
      );
      
      convertedId = result.lastInsertRowid;
    }

    // Update inbox item
    const updateStmt = db.prepare(`
      UPDATE inbox_items 
      SET status = 'converted', processed_at = CURRENT_TIMESTAMP,
          converted_to_type = ?, converted_to_id = ?
      WHERE id = ?
    `);
    
    updateStmt.run(convert_to_type, convertedId, itemId);

    // Fetch updated item
    const updatedItem = db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(itemId);
    updatedItem.parsed_data = db.parseJSON(updatedItem.parsed_data);

    res.json({
      ...updatedItem,
      converted_item_id: convertedId
    });
  } catch (error) {
    console.error('Error processing inbox item:', error);
    res.status(500).json({ error: 'Failed to process inbox item' });
  }
});

// DELETE /api/inbox/:id - Delete inbox item
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    // Verify ownership
    const item = db.prepare('SELECT * FROM inbox_items WHERE id = ? AND created_by = ?').get(itemId, userId);
    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    db.prepare('DELETE FROM inbox_items WHERE id = ?').run(itemId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting inbox item:', error);
    res.status(500).json({ error: 'Failed to delete inbox item' });
  }
});

// PUT /api/inbox/bulk - Bulk update operations
router.put('/bulk', async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_ids, updates } = req.body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ error: 'item_ids array is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'updates object is required' });
    }

    // Verify all items belong to the user
    const placeholders = item_ids.map(() => '?').join(',');
    const items = db.prepare(`
      SELECT id FROM inbox_items 
      WHERE id IN (${placeholders}) AND created_by = ?
    `).all(...item_ids, userId);

    if (items.length !== item_ids.length) {
      return res.status(404).json({ error: 'Some inbox items not found' });
    }

    // Build bulk update query
    const allowedUpdates = ['status', 'category', 'urgency_score'];
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    const query = `
      UPDATE inbox_items 
      SET ${updateFields.join(', ')}
      WHERE id IN (${placeholders}) AND created_by = ?
    `;
    
    db.prepare(query).run(...updateValues, ...item_ids, userId);

    // Fetch updated items
    const updatedItems = db.prepare(`
      SELECT * FROM inbox_items 
      WHERE id IN (${placeholders})
      ORDER BY created_at DESC
    `).all(...item_ids);

    const parsedItems = updatedItems.map(item => ({
      ...item,
      parsed_data: db.parseJSON(item.parsed_data)
    }));

    res.json(parsedItems);
  } catch (error) {
    console.error('Error bulk updating inbox items:', error);
    res.status(500).json({ error: 'Failed to bulk update inbox items' });
  }
});

// GET /api/inbox/stats - Get inbox statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM inbox_items WHERE created_by = ?').get(userId).count,
      pending: db.prepare('SELECT COUNT(*) as count FROM inbox_items WHERE created_by = ? AND status = "pending"').get(userId).count,
      urgent: db.prepare('SELECT COUNT(*) as count FROM inbox_items WHERE created_by = ? AND urgency_score >= 4 AND status != "converted" AND status != "archived"').get(userId).count,
      processed_today: db.prepare(`
        SELECT COUNT(*) as count FROM inbox_items 
        WHERE created_by = ? AND status = "converted" 
        AND DATE(processed_at) = DATE('now')
      `).get(userId).count,
      by_category: {}
    };

    // Get category breakdown
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM inbox_items 
      WHERE created_by = ? AND status != "converted" AND status != "archived" 
      GROUP BY category
    `).all(userId);

    categories.forEach(cat => {
      if (cat.category) {
        stats.by_category[cat.category] = cat.count;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching inbox stats:', error);
    res.status(500).json({ error: 'Failed to fetch inbox statistics' });
  }
});

module.exports = router;