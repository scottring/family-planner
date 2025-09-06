const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/database').getDb();

// Get all addresses for the authenticated user
router.get('/', auth, (req, res) => {
  try {
    const addresses = db.prepare(`
      SELECT * FROM family_addresses 
      WHERE user_id = ? 
      ORDER BY is_primary DESC, type, label
    `).all(req.user.id);
    
    res.json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Get primary addresses by type
router.get('/primary', auth, (req, res) => {
  try {
    const addresses = db.prepare(`
      SELECT * FROM family_addresses 
      WHERE user_id = ? AND is_primary = 1
      ORDER BY type
    `).all(req.user.id);
    
    // Convert to object keyed by type for easy access
    const primaryAddresses = {};
    addresses.forEach(addr => {
      primaryAddresses[addr.type] = addr;
    });
    
    res.json(primaryAddresses);
  } catch (error) {
    console.error('Error fetching primary addresses:', error);
    res.status(500).json({ error: 'Failed to fetch primary addresses' });
  }
});

// Get a specific address
router.get('/:id', auth, (req, res) => {
  try {
    const address = db.prepare(`
      SELECT * FROM family_addresses 
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);
    
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    res.json(address);
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ error: 'Failed to fetch address' });
  }
});

// Create a new address
router.post('/', auth, (req, res) => {
  const { label, address, type = 'other', is_primary = false, notes } = req.body;
  
  if (!label || !address) {
    return res.status(400).json({ error: 'Label and address are required' });
  }
  
  try {
    // If this is set as primary, unset other primary addresses of the same type
    if (is_primary) {
      db.prepare(`
        UPDATE family_addresses 
        SET is_primary = 0 
        WHERE user_id = ? AND type = ?
      `).run(req.user.id, type);
    }
    
    const result = db.prepare(`
      INSERT INTO family_addresses (user_id, label, address, type, is_primary, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, label, address, type, is_primary ? 1 : 0, notes);
    
    const newAddress = db.prepare(`
      SELECT * FROM family_addresses WHERE id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error creating address:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'An address with this label already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create address' });
    }
  }
});

// Update an address
router.put('/:id', auth, (req, res) => {
  const { label, address, type, is_primary, notes } = req.body;
  
  try {
    // Check if address exists and belongs to user
    const existingAddress = db.prepare(`
      SELECT * FROM family_addresses 
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // If setting as primary, unset other primary addresses of the same type
    if (is_primary && !existingAddress.is_primary) {
      const addressType = type || existingAddress.type;
      db.prepare(`
        UPDATE family_addresses 
        SET is_primary = 0 
        WHERE user_id = ? AND type = ? AND id != ?
      `).run(req.user.id, addressType, req.params.id);
    }
    
    // Update the address
    db.prepare(`
      UPDATE family_addresses 
      SET label = COALESCE(?, label),
          address = COALESCE(?, address),
          type = COALESCE(?, type),
          is_primary = COALESCE(?, is_primary),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      label,
      address,
      type,
      is_primary !== undefined ? (is_primary ? 1 : 0) : undefined,
      notes,
      req.params.id,
      req.user.id
    );
    
    const updatedAddress = db.prepare(`
      SELECT * FROM family_addresses WHERE id = ?
    `).get(req.params.id);
    
    res.json(updatedAddress);
  } catch (error) {
    console.error('Error updating address:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'An address with this label already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update address' });
    }
  }
});

// Delete an address
router.delete('/:id', auth, (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM family_addresses 
      WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }
    
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Batch create/update addresses (useful for initial setup)
router.post('/batch', auth, (req, res) => {
  const { addresses } = req.body;
  
  if (!Array.isArray(addresses)) {
    return res.status(400).json({ error: 'Addresses must be an array' });
  }
  
  const results = [];
  const errors = [];
  
  db.transaction(() => {
    addresses.forEach((addr, index) => {
      try {
        const { label, address, type = 'other', is_primary = false, notes } = addr;
        
        if (!label || !address) {
          errors.push({ index, error: 'Label and address are required' });
          return;
        }
        
        // If setting as primary, unset other primary addresses of the same type
        if (is_primary) {
          db.prepare(`
            UPDATE family_addresses 
            SET is_primary = 0 
            WHERE user_id = ? AND type = ?
          `).run(req.user.id, type);
        }
        
        // Try to update existing or create new
        const existing = db.prepare(`
          SELECT id FROM family_addresses 
          WHERE user_id = ? AND label = ?
        `).get(req.user.id, label);
        
        if (existing) {
          db.prepare(`
            UPDATE family_addresses 
            SET address = ?, type = ?, is_primary = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(address, type, is_primary ? 1 : 0, notes, existing.id);
          
          results.push({ ...addr, id: existing.id, updated: true });
        } else {
          const result = db.prepare(`
            INSERT INTO family_addresses (user_id, label, address, type, is_primary, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(req.user.id, label, address, type, is_primary ? 1 : 0, notes);
          
          results.push({ ...addr, id: result.lastInsertRowid, created: true });
        }
      } catch (error) {
        errors.push({ index, error: error.message });
      }
    });
  })();
  
  res.json({ results, errors });
});

module.exports = router;