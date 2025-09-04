const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const emailIntegrationService = require('../services/emailIntegration');
const ocrService = require('../services/ocrService');
const nlpParser = require('../services/nlpParser');
const smsBot = require('../services/smsBot');

const router = express.Router();

// Rate limiting for capture endpoints
const captureRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many capture requests from this IP, please try again later.'
});

const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 requests per minute for webhooks
  message: 'Too many webhook requests from this IP'
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * POST /api/capture/photo - Upload and process images with OCR
 */
router.post('/photo', 
  authMiddleware, 
  captureRateLimit, 
  upload.single('photo'),
  [
    body('caption').optional().isLength({ max: 500 }).trim(),
    body('category').optional().isIn(['school', 'sports', 'medical', 'activities', 'general']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo uploaded' });
      }

      const { caption = '', category = 'general' } = req.body;
      const userId = req.user.id;

      // Create inbox item
      const result = db.prepare(`
        INSERT INTO inbox_items (
          raw_content, input_type, source_type, parsed_data, status,
          urgency_score, category, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        caption || 'Photo upload',
        'image',
        'manual',
        db.stringifyJSON({}),
        'pending',
        3,
        category,
        userId
      );

      const inboxItemId = result.lastInsertRowid;

      // Create processed attachment record
      const attachmentResult = db.prepare(`
        INSERT INTO processed_attachments (
          inbox_item_id, original_filename, file_path, file_type, file_size, processing_status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        inboxItemId,
        req.file.originalname,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        'pending'
      );

      // Link attachment to inbox item
      db.prepare(`
        UPDATE inbox_items SET attachment_id = ? WHERE id = ?
      `).run(attachmentResult.lastInsertRowid, inboxItemId);

      // Process with OCR in background
      setImmediate(async () => {
        try {
          await ocrService.processAttachment(attachmentResult.lastInsertRowid);
        } catch (error) {
          console.error('Error processing OCR:', error);
        }
      });

      res.json({
        success: true,
        message: 'Photo uploaded and processing started',
        inboxItemId,
        attachmentId: attachmentResult.lastInsertRowid
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process photo upload'
      });
    }
  }
);

/**
 * POST /api/capture/email/webhook - Email receiving webhook
 */
router.post('/email/webhook', 
  webhookRateLimit,
  express.json({ limit: '10mb' }),
  async (req, res) => {
    try {
      const { userId, emailData, webhookToken } = req.body;

      if (!userId || !emailData) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields' 
        });
      }

      // Verify webhook token (if configured)
      if (process.env.EMAIL_WEBHOOK_SECRET) {
        const expectedToken = crypto
          .createHmac('sha256', process.env.EMAIL_WEBHOOK_SECRET)
          .update(JSON.stringify(emailData))
          .digest('hex');
        
        if (webhookToken !== expectedToken) {
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid webhook token' 
          });
        }
      }

      // Process webhook email
      const inboxItemId = await emailIntegrationService.processWebhookEmail(userId, emailData);

      res.json({
        success: true,
        message: 'Email processed successfully',
        inboxItemId
      });
    } catch (error) {
      console.error('Error processing email webhook:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process email webhook'
      });
    }
  }
);

/**
 * POST /api/capture/sms/webhook - SMS receiving webhook (Twilio)
 */
router.post('/sms/webhook',
  webhookRateLimit,
  express.urlencoded({ extended: true }),
  async (req, res) => {
    try {
      // Process SMS webhook
      await smsBot.processSMSWebhook(req.body);

      // Respond with TwiML (required by Twilio)
      res.set('Content-Type', 'text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error) {
      console.error('Error processing SMS webhook:', error);
      res.status(500).send('Error processing SMS');
    }
  }
);

/**
 * GET /api/capture/settings - Get capture settings for current user
 */
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = emailIntegrationService.getCaptureSettings(userId);

    // Remove sensitive information before sending
    const safeSettings = {
      ...settings,
      email_settings: {
        ...settings.email_settings,
        imap_config: settings.email_settings.imap_config ? {
          host: settings.email_settings.imap_config.host,
          port: settings.email_settings.imap_config.port,
          tls: settings.email_settings.imap_config.tls,
          username: settings.email_settings.imap_config.username,
          // Don't include password
        } : {}
      },
      sms_settings: {
        ...settings.sms_settings,
        twilio_config: settings.sms_settings.twilio_config ? {
          // Don't include sensitive Twilio credentials
          configured: !!settings.sms_settings.twilio_config.account_sid
        } : {}
      }
    };

    res.json({
      success: true,
      settings: safeSettings
    });
  } catch (error) {
    console.error('Error getting capture settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get capture settings'
    });
  }
});

/**
 * PUT /api/capture/settings - Update capture settings
 */
router.put('/settings',
  authMiddleware,
  captureRateLimit,
  [
    body('email_settings').optional().isObject(),
    body('email_settings.enabled').optional().isBoolean(),
    body('email_settings.monitored_addresses').optional().isArray(),
    body('email_settings.imap_config').optional().isObject(),
    body('sms_settings').optional().isObject(),
    body('sms_settings.enabled').optional().isBoolean(),
    body('sms_settings.phone_number').optional().isMobilePhone(),
    body('ocr_settings').optional().isObject(),
    body('ocr_settings.enabled').optional().isBoolean(),
    body('ocr_settings.confidence_threshold').optional().isFloat({ min: 0, max: 1 }),
    body('nlp_settings').optional().isObject(),
    body('nlp_settings.enabled').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user.id;
      const { email_settings, sms_settings, ocr_settings, nlp_settings } = req.body;

      // Get current settings
      const currentSettings = emailIntegrationService.getCaptureSettings(userId);

      // Update each section if provided
      let updatedSettings = { ...currentSettings };

      if (email_settings) {
        updatedSettings.email_settings = { ...currentSettings.email_settings, ...email_settings };
        await emailIntegrationService.updateEmailSettings(userId, email_settings);
      }

      if (sms_settings) {
        updatedSettings.sms_settings = { ...currentSettings.sms_settings, ...sms_settings };
        await smsBot.updateSMSSettings(userId, sms_settings);
      }

      if (ocr_settings || nlp_settings) {
        const updateData = {};
        if (ocr_settings) {
          updateData.ocr_settings = db.stringifyJSON({ ...currentSettings.ocr_settings, ...ocr_settings });
        }
        if (nlp_settings) {
          updateData.nlp_settings = db.stringifyJSON({ ...currentSettings.nlp_settings, ...nlp_settings });
        }

        const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateData);

        db.prepare(`
          UPDATE capture_settings 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(...values, userId);
      }

      res.json({
        success: true,
        message: 'Settings updated successfully',
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Error updating capture settings:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update capture settings'
      });
    }
  }
);

/**
 * POST /api/capture/test/email - Test email connection
 */
router.post('/test/email',
  authMiddleware,
  captureRateLimit,
  [
    body('host').notEmpty().trim(),
    body('port').isInt({ min: 1, max: 65535 }),
    body('username').notEmpty().trim(),
    body('password').notEmpty(),
    body('tls').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const emailConfig = req.body;
      const result = await emailIntegrationService.testEmailConnection(emailConfig);

      res.json(result);
    } catch (error) {
      console.error('Error testing email connection:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to test email connection',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/capture/test/sms - Test SMS functionality
 */
router.post('/test/sms',
  authMiddleware,
  captureRateLimit,
  [
    body('phone_number').isMobilePhone(),
    body('message').optional().isLength({ max: 500 }).trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { phone_number, message = 'Test message from Family Planner' } = req.body;
      const result = await smsBot.testSMS(phone_number, message);

      res.json(result);
    } catch (error) {
      console.error('Error testing SMS:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to test SMS',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/capture/verify/phone - Verify phone number with SMS
 */
router.post('/verify/phone',
  authMiddleware,
  captureRateLimit,
  [
    body('phone_number').isMobilePhone(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { phone_number } = req.body;
      const verificationCode = await smsBot.verifyPhoneNumber(phone_number);

      // Store verification code temporarily (in real app, use Redis or similar)
      // For now, we'll return it (in production, don't return it)
      const verificationId = crypto.randomBytes(16).toString('hex');
      
      res.json({
        success: true,
        message: 'Verification code sent',
        verificationId, // Use this to verify the code
        // Remove this in production:
        code: verificationCode
      });
    } catch (error) {
      console.error('Error verifying phone number:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification code',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/capture/nlp/parse - Parse text with advanced NLP
 */
router.post('/nlp/parse',
  authMiddleware,
  captureRateLimit,
  [
    body('text').notEmpty().isLength({ max: 2000 }).trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { text } = req.body;
      const userId = req.user.id;

      const parsed = await nlpParser.parseAdvancedInput(text, userId);

      res.json({
        success: true,
        parsed
      });
    } catch (error) {
      console.error('Error parsing text:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to parse text',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/capture/attachments/:id - Get processed attachment details
 */
router.get('/attachments/:id', authMiddleware, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.id);
    const userId = req.user.id;

    const attachment = db.prepare(`
      SELECT pa.*, ii.created_by 
      FROM processed_attachments pa
      JOIN inbox_items ii ON pa.inbox_item_id = ii.id
      WHERE pa.id = ? AND ii.created_by = ?
    `).get(attachmentId, userId);

    if (!attachment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Attachment not found' 
      });
    }

    const result = {
      ...attachment,
      extracted_data: db.parseJSON(attachment.extracted_data)
    };

    res.json({
      success: true,
      attachment: result
    });
  } catch (error) {
    console.error('Error getting attachment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get attachment details'
    });
  }
});

/**
 * GET /api/capture/stats - Get capture statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = {
      total_items: 0,
      by_source: {},
      processing_status: {},
      recent_activity: []
    };

    // Get total items by source
    const sourceStats = db.prepare(`
      SELECT source_type, COUNT(*) as count
      FROM inbox_items 
      WHERE created_by = ?
      GROUP BY source_type
    `).all(userId);

    sourceStats.forEach(stat => {
      stats.by_source[stat.source_type] = stat.count;
      stats.total_items += stat.count;
    });

    // Get processing status for attachments
    const processingStats = db.prepare(`
      SELECT pa.processing_status, COUNT(*) as count
      FROM processed_attachments pa
      JOIN inbox_items ii ON pa.inbox_item_id = ii.id
      WHERE ii.created_by = ?
      GROUP BY pa.processing_status
    `).all(userId);

    processingStats.forEach(stat => {
      stats.processing_status[stat.processing_status] = stat.count;
    });

    // Get recent activity
    const recentActivity = db.prepare(`
      SELECT ii.raw_content, ii.source_type, ii.created_at, ii.status
      FROM inbox_items ii
      WHERE ii.created_by = ?
      ORDER BY ii.created_at DESC
      LIMIT 10
    `).all(userId);

    stats.recent_activity = recentActivity;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting capture stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get capture statistics'
    });
  }
});

module.exports = router;