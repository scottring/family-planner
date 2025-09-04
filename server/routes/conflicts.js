const express = require('express');
const router = express.Router();
const conflictService = require('../services/conflictService');
const auth = require('../middleware/auth');

// GET /api/conflicts/detect - detect all conflicts for a date range
router.get('/detect', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    // Default to current date if not specified
    const startDate = start || new Date().toISOString();
    const endDate = end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default to next 7 days
    
    const conflicts = await conflictService.detectAllConflicts(startDate, endDate);
    
    res.json({
      success: true,
      conflicts,
      date_range: { start: startDate, end: endDate },
      total_conflicts: conflicts.length,
      severity_breakdown: {
        critical: conflicts.filter(c => c.severity === 'critical').length,
        high: conflicts.filter(c => c.severity === 'high').length,
        medium: conflicts.filter(c => c.severity === 'medium').length,
        low: conflicts.filter(c => c.severity === 'low').length
      }
    });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to detect conflicts',
      error: error.message 
    });
  }
});

// GET /api/conflicts/upcoming - get upcoming conflicts (next 48 hours)
router.get('/upcoming', auth, async (req, res) => {
  try {
    const conflicts = await conflictService.getUpcomingConflicts();
    
    res.json({
      success: true,
      conflicts,
      total_conflicts: conflicts.length,
      urgent_conflicts: conflicts.filter(c => c.severity === 'critical' || c.severity === 'high').length
    });
  } catch (error) {
    console.error('Error getting upcoming conflicts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get upcoming conflicts',
      error: error.message 
    });
  }
});

// GET /api/conflicts/active - get all active conflicts
router.get('/active', auth, async (req, res) => {
  try {
    const { limit } = req.query;
    const conflicts = conflictService.getActiveConflicts(limit ? parseInt(limit) : null);
    
    res.json({
      success: true,
      conflicts,
      total_conflicts: conflicts.length
    });
  } catch (error) {
    console.error('Error getting active conflicts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get active conflicts',
      error: error.message 
    });
  }
});

// GET /api/conflicts/:id - get specific conflict details
router.get('/:id', auth, async (req, res) => {
  try {
    const conflictId = parseInt(req.params.id);
    
    if (isNaN(conflictId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid conflict ID' 
      });
    }

    const conflict = conflictService.getConflictById(conflictId);
    
    if (!conflict) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conflict not found' 
      });
    }

    res.json({
      success: true,
      conflict
    });
  } catch (error) {
    console.error('Error getting conflict details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get conflict details',
      error: error.message 
    });
  }
});

// POST /api/conflicts/:id/resolve - resolve a specific conflict
router.post('/:id/resolve', auth, async (req, res) => {
  try {
    const conflictId = parseInt(req.params.id);
    const { resolution } = req.body;
    const userId = req.user?.id;

    if (isNaN(conflictId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid conflict ID' 
      });
    }

    if (!resolution) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resolution data is required' 
      });
    }

    const success = await conflictService.resolveConflict(conflictId, resolution, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Conflict resolved successfully',
        conflict_id: conflictId,
        resolved_by: userId,
        resolved_at: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to resolve conflict'
      });
    }
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resolve conflict',
      error: error.message 
    });
  }
});

// POST /api/conflicts/:id/acknowledge - acknowledge a conflict without resolving
router.post('/:id/acknowledge', auth, async (req, res) => {
  try {
    const conflictId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (isNaN(conflictId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid conflict ID' 
      });
    }

    const success = await conflictService.acknowledgeConflict(conflictId, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Conflict acknowledged',
        conflict_id: conflictId,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to acknowledge conflict'
      });
    }
  } catch (error) {
    console.error('Error acknowledging conflict:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to acknowledge conflict',
      error: error.message 
    });
  }
});

// POST /api/conflicts/:id/ignore - ignore a conflict
router.post('/:id/ignore', auth, async (req, res) => {
  try {
    const conflictId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (isNaN(conflictId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid conflict ID' 
      });
    }

    const success = await conflictService.ignoreConflict(conflictId, userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Conflict ignored',
        conflict_id: conflictId,
        ignored_by: userId,
        ignored_at: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to ignore conflict'
      });
    }
  } catch (error) {
    console.error('Error ignoring conflict:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to ignore conflict',
      error: error.message 
    });
  }
});

// POST /api/conflicts/suggest-resolution - get AI suggestions for conflict resolution
router.post('/suggest-resolution', auth, async (req, res) => {
  try {
    const { conflict } = req.body;

    if (!conflict) {
      return res.status(400).json({ 
        success: false, 
        message: 'Conflict data is required' 
      });
    }

    const suggestions = await conflictService.suggestResolutions(conflict);
    
    res.json({
      success: true,
      suggestions,
      conflict_id: conflict.id,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting resolution suggestions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get resolution suggestions',
      error: error.message 
    });
  }
});

// GET /api/conflicts/stats - get conflict statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { timeframe } = req.query; // 'week', 'month', 'year'
    
    const stats = await conflictService.getConflictStatistics(timeframe || 'week');
    
    res.json({
      success: true,
      stats,
      timeframe: timeframe || 'week',
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting conflict statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get conflict statistics',
      error: error.message 
    });
  }
});

// POST /api/conflicts/bulk-resolve - resolve multiple conflicts at once
router.post('/bulk-resolve', auth, async (req, res) => {
  try {
    const { conflict_ids, resolution } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(conflict_ids) || conflict_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Array of conflict IDs is required' 
      });
    }

    if (!resolution) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resolution data is required' 
      });
    }

    const results = await Promise.all(
      conflict_ids.map(id => conflictService.resolveConflict(id, resolution, userId))
    );

    const successful = results.filter(r => r === true).length;
    const failed = results.length - successful;

    res.json({
      success: successful > 0,
      message: `Resolved ${successful} of ${results.length} conflicts`,
      total_conflicts: results.length,
      successful_resolutions: successful,
      failed_resolutions: failed,
      resolved_by: userId,
      resolved_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error bulk resolving conflicts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to bulk resolve conflicts',
      error: error.message 
    });
  }
});

module.exports = router;