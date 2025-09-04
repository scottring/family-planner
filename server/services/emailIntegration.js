const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EmailIntegrationService {
  constructor() {
    this.imapConnections = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Get capture settings for a user
   */
  getCaptureSettings(userId) {
    try {
      const result = db.prepare(`
        SELECT * FROM capture_settings WHERE user_id = ?
      `).get(userId);
      
      if (!result) {
        // Create default settings
        db.prepare(`
          INSERT INTO capture_settings (user_id) VALUES (?)
        `).run(userId);
        
        return this.getCaptureSettings(userId);
      }
      
      return {
        ...result,
        email_settings: db.parseJSON(result.email_settings),
        sms_settings: db.parseJSON(result.sms_settings),
        ocr_settings: db.parseJSON(result.ocr_settings),
        nlp_settings: db.parseJSON(result.nlp_settings),
        webhook_tokens: db.parseJSON(result.webhook_tokens)
      };
    } catch (error) {
      console.error('Error getting capture settings:', error);
      throw error;
    }
  }

  /**
   * Update email settings for a user
   */
  async updateEmailSettings(userId, emailSettings) {
    try {
      const currentSettings = this.getCaptureSettings(userId);
      const updatedEmailSettings = { ...currentSettings.email_settings, ...emailSettings };
      
      db.prepare(`
        UPDATE capture_settings 
        SET email_settings = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(db.stringifyJSON(updatedEmailSettings), userId);

      // If email monitoring is enabled, start/restart monitoring
      if (updatedEmailSettings.enabled && updatedEmailSettings.imap_config) {
        await this.startEmailMonitoring(userId);
      } else {
        this.stopEmailMonitoring(userId);
      }

      return updatedEmailSettings;
    } catch (error) {
      console.error('Error updating email settings:', error);
      throw error;
    }
  }

  /**
   * Start monitoring emails for a user
   */
  async startEmailMonitoring(userId) {
    try {
      const settings = this.getCaptureSettings(userId);
      const emailConfig = settings.email_settings;

      if (!emailConfig.enabled || !emailConfig.imap_config) {
        throw new Error('Email monitoring not properly configured');
      }

      // Close existing connection if any
      this.stopEmailMonitoring(userId);

      const imapConfig = {
        user: emailConfig.imap_config.username,
        password: emailConfig.imap_config.password,
        host: emailConfig.imap_config.host,
        port: emailConfig.imap_config.port || 993,
        tls: emailConfig.imap_config.tls !== false,
        authTimeout: 3000,
        connTimeout: 10000,
        tlsOptions: emailConfig.imap_config.tlsOptions || {}
      };

      const imap = new Imap(imapConfig);
      this.imapConnections.set(userId, imap);

      return new Promise((resolve, reject) => {
        imap.once('ready', () => {
          console.log(`Email monitoring started for user ${userId}`);
          this.setupEmailEventHandlers(userId, imap, emailConfig);
          resolve();
        });

        imap.once('error', (err) => {
          console.error(`IMAP connection error for user ${userId}:`, err);
          this.imapConnections.delete(userId);
          reject(err);
        });

        imap.once('end', () => {
          console.log(`IMAP connection ended for user ${userId}`);
          this.imapConnections.delete(userId);
        });

        imap.connect();
      });
    } catch (error) {
      console.error('Error starting email monitoring:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers for email monitoring
   */
  setupEmailEventHandlers(userId, imap, emailConfig) {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error(`Error opening inbox for user ${userId}:`, err);
        return;
      }

      // Listen for new messages
      imap.on('mail', (numNewMsgs) => {
        console.log(`${numNewMsgs} new email(s) received for user ${userId}`);
        this.fetchNewEmails(userId, imap, emailConfig);
      });

      // Process existing unread emails
      this.fetchNewEmails(userId, imap, emailConfig);
    });
  }

  /**
   * Fetch and process new emails
   */
  async fetchNewEmails(userId, imap, emailConfig) {
    try {
      // Search for unseen messages from monitored addresses
      const searchCriteria = ['UNSEEN'];
      if (emailConfig.monitored_addresses && emailConfig.monitored_addresses.length > 0) {
        const fromCriteria = emailConfig.monitored_addresses.map(addr => ['FROM', addr]);
        searchCriteria.push(['OR', ...fromCriteria]);
      }

      imap.search(searchCriteria, (err, results) => {
        if (err) {
          console.error(`Error searching emails for user ${userId}:`, err);
          return;
        }

        if (!results || results.length === 0) {
          return;
        }

        const fetch = imap.fetch(results, {
          bodies: '',
          markSeen: true,
          struct: true
        });

        fetch.on('message', (msg, seqno) => {
          this.processEmailMessage(userId, msg, seqno, emailConfig);
        });

        fetch.once('error', (err) => {
          console.error(`Error fetching emails for user ${userId}:`, err);
        });
      });
    } catch (error) {
      console.error('Error fetching new emails:', error);
    }
  }

  /**
   * Process individual email message
   */
  async processEmailMessage(userId, msg, seqno, emailConfig) {
    try {
      let emailBuffer = '';
      
      msg.on('body', (stream, info) => {
        stream.on('data', (chunk) => {
          emailBuffer += chunk.toString('utf8');
        });
      });

      msg.once('end', async () => {
        try {
          const parsed = await simpleParser(emailBuffer);
          await this.createInboxItemFromEmail(userId, parsed, emailConfig);
        } catch (error) {
          console.error(`Error parsing email for user ${userId}:`, error);
        }
      });
    } catch (error) {
      console.error('Error processing email message:', error);
    }
  }

  /**
   * Create inbox item from parsed email
   */
  async createInboxItemFromEmail(userId, parsedEmail, emailConfig) {
    try {
      // Extract email content and metadata
      const emailContent = parsedEmail.text || parsedEmail.html || '';
      const subject = parsedEmail.subject || 'No Subject';
      const fromAddress = parsedEmail.from?.text || 'Unknown Sender';
      
      // Determine category based on sender patterns
      const category = this.categorizeEmailBySender(fromAddress, subject, emailConfig);
      
      // Calculate urgency score
      const urgencyScore = this.calculateEmailUrgency(subject, emailContent, fromAddress);

      // Create email metadata
      const emailMetadata = {
        messageId: parsedEmail.messageId,
        from: fromAddress,
        to: parsedEmail.to?.text,
        subject: subject,
        date: parsedEmail.date,
        hasAttachments: parsedEmail.attachments && parsedEmail.attachments.length > 0,
        attachmentCount: parsedEmail.attachments ? parsedEmail.attachments.length : 0
      };

      // Create inbox item
      const result = db.prepare(`
        INSERT INTO inbox_items (
          raw_content, input_type, source_type, parsed_data, status, 
          urgency_score, category, created_by, email_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${subject}\n\n${emailContent}`,
        'text',
        'email',
        db.stringifyJSON({}),
        'pending',
        urgencyScore,
        category,
        userId,
        db.stringifyJSON(emailMetadata)
      );

      const inboxItemId = result.lastInsertRowid;

      // Process attachments if any
      if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
        await this.processEmailAttachments(inboxItemId, parsedEmail.attachments);
      }

      console.log(`Created inbox item ${inboxItemId} from email: ${subject}`);
      
      // Trigger inbox processing
      const inboxProcessor = require('./inboxProcessor');
      await inboxProcessor.processInboxItem(inboxItemId);

      return inboxItemId;
    } catch (error) {
      console.error('Error creating inbox item from email:', error);
      throw error;
    }
  }

  /**
   * Process email attachments
   */
  async processEmailAttachments(inboxItemId, attachments) {
    try {
      const attachmentDir = path.join(__dirname, '../uploads/email-attachments');
      if (!fs.existsSync(attachmentDir)) {
        fs.mkdirSync(attachmentDir, { recursive: true });
      }

      for (const attachment of attachments) {
        if (!attachment.content || !attachment.filename) continue;

        // Generate unique filename
        const fileExtension = path.extname(attachment.filename);
        const uniqueFilename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
        const filePath = path.join(attachmentDir, uniqueFilename);

        // Save attachment to disk
        fs.writeFileSync(filePath, attachment.content);

        // Create processed_attachments record
        const attachmentResult = db.prepare(`
          INSERT INTO processed_attachments (
            inbox_item_id, original_filename, file_path, file_type, file_size, processing_status
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          inboxItemId,
          attachment.filename,
          filePath,
          attachment.contentType,
          attachment.size || attachment.content.length,
          'pending'
        );

        // Link attachment to inbox item
        db.prepare(`
          UPDATE inbox_items SET attachment_id = ? WHERE id = ?
        `).run(attachmentResult.lastInsertRowid, inboxItemId);

        // Trigger OCR processing if it's an image
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
          const ocrService = require('./ocrService');
          await ocrService.processAttachment(attachmentResult.lastInsertRowid);
        }
      }
    } catch (error) {
      console.error('Error processing email attachments:', error);
    }
  }

  /**
   * Categorize email based on sender patterns
   */
  categorizeEmailBySender(fromAddress, subject, emailConfig) {
    const lowerFrom = fromAddress.toLowerCase();
    const lowerSubject = subject.toLowerCase();

    // School-related patterns
    if (lowerFrom.includes('school') || lowerFrom.includes('edu') || 
        lowerSubject.includes('permission slip') || lowerSubject.includes('field trip') ||
        lowerSubject.includes('parent-teacher') || lowerSubject.includes('homework')) {
      return 'school';
    }

    // Sports-related patterns
    if (lowerFrom.includes('coach') || lowerFrom.includes('sport') ||
        lowerSubject.includes('practice') || lowerSubject.includes('game') ||
        lowerSubject.includes('tournament') || lowerSubject.includes('team')) {
      return 'sports';
    }

    // Medical patterns
    if (lowerFrom.includes('doctor') || lowerFrom.includes('clinic') ||
        lowerFrom.includes('dentist') || lowerFrom.includes('pediatric') ||
        lowerSubject.includes('appointment') || lowerSubject.includes('checkup')) {
      return 'medical';
    }

    // Activity patterns
    if (lowerFrom.includes('activity') || lowerFrom.includes('class') ||
        lowerSubject.includes('lesson') || lowerSubject.includes('recital') ||
        lowerSubject.includes('performance')) {
      return 'activities';
    }

    return 'general';
  }

  /**
   * Calculate urgency score for email
   */
  calculateEmailUrgency(subject, content, fromAddress) {
    let score = 3; // Default medium priority

    const urgentKeywords = ['urgent', 'asap', 'emergency', 'immediate', 'deadline', 'tomorrow'];
    const importantKeywords = ['important', 'required', 'mandatory', 'due', 'reminder'];
    
    const textToCheck = `${subject} ${content}`.toLowerCase();

    // Check for urgent keywords
    if (urgentKeywords.some(keyword => textToCheck.includes(keyword))) {
      score = Math.min(5, score + 2);
    }

    // Check for important keywords
    if (importantKeywords.some(keyword => textToCheck.includes(keyword))) {
      score = Math.min(5, score + 1);
    }

    // School emails are often important
    if (fromAddress.toLowerCase().includes('school') || 
        fromAddress.toLowerCase().includes('edu')) {
      score = Math.min(5, score + 1);
    }

    // Medical emails are typically important
    if (fromAddress.toLowerCase().includes('doctor') || 
        fromAddress.toLowerCase().includes('clinic') ||
        fromAddress.toLowerCase().includes('medical')) {
      score = Math.min(5, score + 1);
    }

    return score;
  }

  /**
   * Stop email monitoring for a user
   */
  stopEmailMonitoring(userId) {
    const imap = this.imapConnections.get(userId);
    if (imap) {
      imap.end();
      this.imapConnections.delete(userId);
      console.log(`Email monitoring stopped for user ${userId}`);
    }
  }

  /**
   * Stop all email monitoring
   */
  stopAllEmailMonitoring() {
    for (const [userId, imap] of this.imapConnections.entries()) {
      imap.end();
    }
    this.imapConnections.clear();
    console.log('All email monitoring stopped');
  }

  /**
   * Test email connection
   */
  async testEmailConnection(emailConfig) {
    return new Promise((resolve, reject) => {
      const imapConfig = {
        user: emailConfig.username,
        password: emailConfig.password,
        host: emailConfig.host,
        port: emailConfig.port || 993,
        tls: emailConfig.tls !== false,
        authTimeout: 3000,
        connTimeout: 10000
      };

      const imap = new Imap(imapConfig);

      const timeout = setTimeout(() => {
        imap.end();
        reject(new Error('Connection timeout'));
      }, 10000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        imap.end();
        resolve({ success: true, message: 'Connection successful' });
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        reject({
          success: false,
          message: `Connection failed: ${err.message}`,
          error: err
        });
      });

      imap.connect();
    });
  }

  /**
   * Process webhook email (for services like Mailgun, SendGrid)
   */
  async processWebhookEmail(userId, emailData) {
    try {
      const settings = this.getCaptureSettings(userId);
      const emailConfig = settings.email_settings;

      if (!emailConfig.enabled) {
        throw new Error('Email capture not enabled for this user');
      }

      // Parse webhook email data
      const subject = emailData.subject || 'No Subject';
      const content = emailData.text || emailData.html || '';
      const fromAddress = emailData.from || 'Unknown Sender';

      const category = this.categorizeEmailBySender(fromAddress, subject, emailConfig);
      const urgencyScore = this.calculateEmailUrgency(subject, content, fromAddress);

      const emailMetadata = {
        messageId: emailData.messageId,
        from: fromAddress,
        to: emailData.to,
        subject: subject,
        date: new Date(emailData.timestamp || Date.now()),
        hasAttachments: emailData.attachments && emailData.attachments.length > 0,
        webhookSource: emailData.webhookSource || 'unknown'
      };

      // Create inbox item
      const result = db.prepare(`
        INSERT INTO inbox_items (
          raw_content, input_type, source_type, parsed_data, status, 
          urgency_score, category, created_by, email_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${subject}\n\n${content}`,
        'text',
        'email',
        db.stringifyJSON({}),
        'pending',
        urgencyScore,
        category,
        userId,
        db.stringifyJSON(emailMetadata)
      );

      console.log(`Created inbox item from webhook email: ${subject}`);
      
      // Trigger inbox processing
      const inboxProcessor = require('./inboxProcessor');
      await inboxProcessor.processInboxItem(result.lastInsertRowid);

      return result.lastInsertRowid;
    } catch (error) {
      console.error('Error processing webhook email:', error);
      throw error;
    }
  }
}

// Create singleton instance
const emailIntegrationService = new EmailIntegrationService();

module.exports = emailIntegrationService;