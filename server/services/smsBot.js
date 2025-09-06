const twilio = require('twilio');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SMSBotService {
  constructor() {
    this.twilioClient = null;
    this.isInitialized = false;
    this.webhookUrl = process.env.SMS_WEBHOOK_URL || '/api/capture/sms/webhook';
    
    // Command patterns
    this.commands = {
      add_task: /^(?:add task|task|todo):?\s*(.+)/i,
      add_event: /^(?:add event|event|calendar):?\s*(.+)/i,
      quick_add: /^(?:add|quick):?\s*(.+)/i,
      list: /^(?:list|show|what)(?:\s+(?:tasks?|events?|today|tomorrow))?/i,
      help: /^(?:help|\?|commands)/i,
      status: /^(?:status|inbox)/i,
      delete: /^(?:delete|remove|cancel):?\s*(.+)/i,
      update: /^(?:update|change|modify):?\s*(.+)/i
    };

    // Initialize if credentials are available
    this.initialize();
  }

  /**
   * Initialize Twilio client
   */
  initialize() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (accountSid && authToken) {
        this.twilioClient = twilio(accountSid, authToken);
        this.isInitialized = true;
        console.log('SMS Bot Service initialized successfully');
      } else {
        console.log('SMS Bot Service not initialized - missing Twilio credentials');
      }
    } catch (error) {
      console.error('Error initializing SMS Bot Service:', error);
    }
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
   * Update SMS settings for a user
   */
  async updateSMSSettings(userId, smsSettings) {
    try {
      const currentSettings = this.getCaptureSettings(userId);
      const updatedSmsSettings = { ...currentSettings.sms_settings, ...smsSettings };
      
      db.prepare(`
        UPDATE capture_settings 
        SET sms_settings = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(db.stringifyJSON(updatedSmsSettings), userId);

      return updatedSmsSettings;
    } catch (error) {
      console.error('Error updating SMS settings:', error);
      throw error;
    }
  }

  /**
   * Find user by phone number
   */
  findUserByPhoneNumber(phoneNumber) {
    try {
      // Normalize phone number (remove non-digits)
      const normalized = phoneNumber.replace(/\D/g, '');
      
      // Try to find user with matching phone number in SMS settings
      const users = db.prepare(`
        SELECT user_id, sms_settings FROM capture_settings 
        WHERE sms_settings LIKE ?
      `).all(`%${normalized}%`);

      for (const user of users) {
        const settings = db.parseJSON(user.sms_settings);
        if (settings && settings.phone_number && 
            settings.phone_number.replace(/\D/g, '').includes(normalized)) {
          return user.user_id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding user by phone number:', error);
      return null;
    }
  }

  /**
   * Process incoming SMS webhook
   */
  async processSMSWebhook(webhookData) {
    try {
      const fromNumber = webhookData.From;
      const toNumber = webhookData.To;
      const messageBody = webhookData.Body;
      const mediaUrls = [];

      // Extract media URLs if present
      const numMedia = parseInt(webhookData.NumMedia || '0');
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = webhookData[`MediaUrl${i}`];
        const mediaType = webhookData[`MediaContentType${i}`];
        if (mediaUrl) {
          mediaUrls.push({ url: mediaUrl, type: mediaType });
        }
      }

      // Find user by phone number
      const userId = this.findUserByPhoneNumber(fromNumber);
      if (!userId) {
        await this.sendSMSResponse(fromNumber, 
          "I don't recognize this number. Please register your phone number in the family planner app first.");
        return;
      }

      // Check if SMS is enabled for this user
      const settings = this.getCaptureSettings(userId);
      if (!settings.sms_settings.enabled) {
        await this.sendSMSResponse(fromNumber, 
          "SMS capture is not enabled for your account.");
        return;
      }

      // Process the message
      const response = await this.processMessage(userId, messageBody, mediaUrls, fromNumber);
      
      // Send response back to user
      await this.sendSMSResponse(fromNumber, response);

      return { success: true, response };
    } catch (error) {
      console.error('Error processing SMS webhook:', error);
      
      // Send error response if possible
      if (webhookData.From) {
        await this.sendSMSResponse(webhookData.From, 
          "Sorry, there was an error processing your message. Please try again.");
      }
      
      throw error;
    }
  }

  /**
   * Process a message and determine action
   */
  async processMessage(userId, messageBody, mediaUrls = [], fromNumber = null) {
    try {
      const messageText = messageBody.trim();
      
      // Handle media messages (photos)
      if (mediaUrls.length > 0) {
        return await this.processMediaMessage(userId, messageText, mediaUrls);
      }

      // Handle text commands
      return await this.processTextCommand(userId, messageText);
    } catch (error) {
      console.error('Error processing message:', error);
      return "Sorry, I couldn't process your message. Please try again or type 'help' for available commands.";
    }
  }

  /**
   * Process media messages (photos with OCR)
   */
  async processMediaMessage(userId, caption, mediaUrls) {
    try {
      const results = [];
      
      for (const media of mediaUrls) {
        if (media.type && media.type.startsWith('image/')) {
          // Download and process image
          const processedImage = await this.downloadAndProcessImage(userId, media.url, caption);
          results.push(processedImage);
        }
      }

      if (results.length > 0) {
        const inboxItems = results.filter(r => r.inboxItemId);
        if (inboxItems.length === 1) {
          return `Photo processed! I found: "${inboxItems[0].extractedTitle}". Check your inbox for details.`;
        } else if (inboxItems.length > 1) {
          return `${inboxItems.length} photos processed! Check your inbox for details.`;
        }
      }
      
      return "Photo received, but I couldn't extract any useful information from it.";
    } catch (error) {
      console.error('Error processing media message:', error);
      return "Sorry, I couldn't process the photo. Please try again.";
    }
  }

  /**
   * Download and process image with OCR
   */
  async downloadAndProcessImage(userId, mediaUrl, caption) {
    try {
      // Create uploads directory
      const uploadsDir = path.join(__dirname, '../uploads/sms-images');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Download image from Twilio
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const fileName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.jpg`;
      const filePath = path.join(uploadsDir, fileName);

      // Save image to disk
      fs.writeFileSync(filePath, Buffer.from(imageBuffer));

      // Create inbox item for the image
      const inboxResult = db.prepare(`
        INSERT INTO inbox_items (
          raw_content, input_type, source_type, parsed_data, status,
          urgency_score, category, created_by, sms_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        caption || 'Photo from SMS',
        'image',
        'sms',
        db.stringifyJSON({}),
        'pending',
        3,
        'general',
        userId,
        db.stringifyJSON({ 
          mediaUrl, 
          caption,
          fileName,
          processingType: 'ocr'
        })
      );

      const inboxItemId = inboxResult.lastInsertRowid;

      // Create processed attachment record
      const attachmentResult = db.prepare(`
        INSERT INTO processed_attachments (
          inbox_item_id, original_filename, file_path, file_type, file_size, processing_status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        inboxItemId,
        fileName,
        filePath,
        'image/jpeg',
        Buffer.from(imageBuffer).length,
        'pending'
      );

      // Link attachment to inbox item
      db.prepare(`
        UPDATE inbox_items SET attachment_id = ? WHERE id = ?
      `).run(attachmentResult.lastInsertRowid, inboxItemId);

      // Process with OCR
      const ocrService = require('./ocrService');
      const ocrResult = await ocrService.processAttachment(attachmentResult.lastInsertRowid);

      return {
        inboxItemId,
        attachmentId: attachmentResult.lastInsertRowid,
        extractedTitle: ocrResult.extractedData?.formType || 'Unknown document',
        ocrText: ocrResult.text
      };
    } catch (error) {
      console.error('Error downloading and processing image:', error);
      throw error;
    }
  }

  /**
   * Process text commands
   */
  async processTextCommand(userId, messageText) {
    try {
      // Check for specific commands
      for (const [command, pattern] of Object.entries(this.commands)) {
        const match = messageText.match(pattern);
        if (match) {
          return await this.handleCommand(userId, command, match, messageText);
        }
      }

      // If no command pattern matched, treat as quick add
      return await this.handleQuickAdd(userId, messageText);
    } catch (error) {
      console.error('Error processing text command:', error);
      return "Sorry, I couldn't process your command. Type 'help' for available commands.";
    }
  }

  /**
   * Handle specific commands
   */
  async handleCommand(userId, command, match, fullText) {
    switch (command) {
      case 'add_task':
        return await this.createTask(userId, match[1]);
        
      case 'add_event':
        return await this.createEvent(userId, match[1]);
        
      case 'quick_add':
        return await this.handleQuickAdd(userId, match[1]);
        
      case 'list':
        return await this.handleList(userId, fullText);
        
      case 'help':
        return this.getHelpText();
        
      case 'status':
        return await this.getStatusText(userId);
        
      case 'delete':
        return await this.handleDelete(userId, match[1]);
        
      case 'update':
        return await this.handleUpdate(userId, match[1]);
        
      default:
        return "Command not recognized. Type 'help' for available commands.";
    }
  }

  /**
   * Create a task from SMS
   */
  async createTask(userId, taskText) {
    try {
      // Use NLP parser for better parsing
      const nlpParser = require('./nlpParser');
      const parsed = await nlpParser.parseAdvancedInput(`task: ${taskText}`, userId);

      if (parsed.items && parsed.items.length > 0) {
        const task = parsed.items[0];
        
        // Create inbox item
        const result = db.prepare(`
          INSERT INTO inbox_items (
            raw_content, input_type, source_type, parsed_data, status,
            urgency_score, category, created_by, sms_metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          taskText,
          'text',
          'sms',
          db.stringifyJSON(parsed),
          'pending',
          task.priority || 3,
          'tasks',
          userId,
          db.stringifyJSON({ command: 'add_task' })
        );

        // Process the inbox item
        const inboxProcessor = require('./inboxProcessor');
        await inboxProcessor.processInboxItem(result.lastInsertRowid);

        return `Task added: "${task.title}"${task.assignedTo ? ` (assigned to ${task.assignedTo})` : ''}`;
      }

      return `Task added: "${taskText}"`;
    } catch (error) {
      console.error('Error creating task:', error);
      return "Sorry, I couldn't create the task. Please try again.";
    }
  }

  /**
   * Create an event from SMS
   */
  async createEvent(userId, eventText) {
    try {
      // Use NLP parser for better parsing
      const nlpParser = require('./nlpParser');
      const parsed = await nlpParser.parseAdvancedInput(`event: ${eventText}`, userId);

      if (parsed.items && parsed.items.length > 0) {
        const event = parsed.items[0];
        
        // Create inbox item
        const result = db.prepare(`
          INSERT INTO inbox_items (
            raw_content, input_type, source_type, parsed_data, status,
            urgency_score, category, created_by, sms_metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          eventText,
          'text',
          'sms',
          db.stringifyJSON(parsed),
          'pending',
          parsed.parsedEntities.urgency || 3,
          'events',
          userId,
          db.stringifyJSON({ command: 'add_event' })
        );

        // Process the inbox item
        const inboxProcessor = require('./inboxProcessor');
        await inboxProcessor.processInboxItem(result.lastInsertRowid);

        let response = `Event added: "${event.title}"`;
        if (event.startTime) response += ` at ${event.startTime}`;
        if (event.location) response += ` at ${event.location}`;

        return response;
      }

      return `Event added: "${eventText}"`;
    } catch (error) {
      console.error('Error creating event:', error);
      return "Sorry, I couldn't create the event. Please try again.";
    }
  }

  /**
   * Handle quick add (auto-determine if task or event)
   */
  async handleQuickAdd(userId, text) {
    try {
      // Use NLP parser to determine type
      const nlpParser = require('./nlpParser');
      const parsed = await nlpParser.parseAdvancedInput(text, userId);

      if (parsed.items && parsed.items.length > 0) {
        const item = parsed.items[0];
        
        // Create inbox item
        const result = db.prepare(`
          INSERT INTO inbox_items (
            raw_content, input_type, source_type, parsed_data, status,
            urgency_score, category, created_by, sms_metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          text,
          'text',
          'sms',
          db.stringifyJSON(parsed),
          'pending',
          parsed.parsedEntities.urgency || 3,
          parsed.type === 'event' ? 'events' : 'tasks',
          userId,
          db.stringifyJSON({ command: 'quick_add' })
        );

        // Process the inbox item
        const inboxProcessor = require('./inboxProcessor');
        await inboxProcessor.processInboxItem(result.lastInsertRowid);

        const itemType = parsed.type.includes('event') ? 'Event' : 'Task';
        return `${itemType} added: "${item.title}"`;
      }

      return `Added to inbox: "${text}"`;
    } catch (error) {
      console.error('Error handling quick add:', error);
      return "Added to your inbox for processing.";
    }
  }

  /**
   * Handle list command
   */
  async handleList(userId, fullText) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      let query = '';
      let params = [userId];
      let title = '';

      if (fullText.toLowerCase().includes('today')) {
        query = `
          SELECT title, start_time FROM events 
          WHERE created_by = ? AND DATE(start_time) = ?
          ORDER BY start_time LIMIT 5
        `;
        params.push(today);
        title = "Today's events";
      } else if (fullText.toLowerCase().includes('tomorrow')) {
        query = `
          SELECT title, start_time FROM events 
          WHERE created_by = ? AND DATE(start_time) = ?
          ORDER BY start_time LIMIT 5
        `;
        params.push(tomorrow);
        title = "Tomorrow's events";
      } else if (fullText.toLowerCase().includes('task')) {
        query = `
          SELECT title, due_date FROM tasks 
          WHERE created_by = ? AND status != 'completed'
          ORDER BY due_date LIMIT 5
        `;
        title = "Open tasks";
      } else {
        // Default: show today's events and open tasks
        const events = db.prepare(`
          SELECT title, start_time FROM events 
          WHERE created_by = ? AND DATE(start_time) = ?
          ORDER BY start_time LIMIT 3
        `).all(userId, today);

        const tasks = db.prepare(`
          SELECT title, due_date FROM tasks 
          WHERE created_by = ? AND status != 'completed'
          ORDER BY due_date LIMIT 3
        `).all(userId);

        let response = "Today's schedule:\n\n";
        
        if (events.length > 0) {
          response += "Events:\n";
          events.forEach(event => {
            const time = event.start_time ? new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
            response += `• ${event.title} ${time}\n`;
          });
        }

        if (tasks.length > 0) {
          response += "\nOpen tasks:\n";
          tasks.forEach(task => {
            response += `• ${task.title}\n`;
          });
        }

        if (events.length === 0 && tasks.length === 0) {
          response += "No events or tasks scheduled.";
        }

        return response;
      }

      if (query) {
        const items = db.prepare(query).all(...params);
        if (items.length > 0) {
          let response = `${title}:\n\n`;
          items.forEach(item => {
            const time = item.start_time || item.due_date;
            const timeStr = time ? new Date(time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
            response += `• ${item.title} ${timeStr}\n`;
          });
          return response;
        } else {
          return `No ${title.toLowerCase()} found.`;
        }
      }

      return "I couldn't understand what you want to list. Try 'list today', 'list tomorrow', or 'list tasks'.";
    } catch (error) {
      console.error('Error handling list command:', error);
      return "Sorry, I couldn't retrieve your list. Please try again.";
    }
  }

  /**
   * Get help text
   */
  getHelpText() {
    return `Family Planner SMS Commands:

📋 QUICK ADD:
• "add: soccer practice 4pm"
• "task: buy groceries"
• "event: dinner at 7pm"

📝 SPECIFIC COMMANDS:
• "add task: [description]"
• "add event: [description]"
• "list" - today's schedule
• "list today/tomorrow/tasks"
• "status" - inbox summary

📸 PHOTOS:
• Send photos of flyers, forms, schedules
• Add a caption for context

Type any message to add it to your inbox!`;
  }

  /**
   * Get status text
   */
  async getStatusText(userId) {
    try {
      const pendingInbox = db.prepare(`
        SELECT COUNT(*) as count FROM inbox_items 
        WHERE created_by = ? AND status = 'pending'
      `).get(userId);

      const todayEvents = db.prepare(`
        SELECT COUNT(*) as count FROM events 
        WHERE created_by = ? AND DATE(start_time) = DATE('now')
      `).get(userId);

      const openTasks = db.prepare(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE created_by = ? AND status != 'completed'
      `).get(userId);

      return `📊 Status Summary:
• ${pendingInbox.count} items in inbox
• ${todayEvents.count} events today
• ${openTasks.count} open tasks

Reply "list" to see details.`;
    } catch (error) {
      console.error('Error getting status:', error);
      return "Status information unavailable.";
    }
  }

  /**
   * Handle delete command
   */
  async handleDelete(userId, itemText) {
    // This would require more complex matching logic
    return "Delete functionality coming soon. Please use the web app to delete items.";
  }

  /**
   * Handle update command
   */
  async handleUpdate(userId, updateText) {
    // This would require more complex parsing logic
    return "Update functionality coming soon. Please use the web app to modify items.";
  }

  /**
   * Send SMS response
   */
  async sendSMSResponse(toNumber, message) {
    try {
      if (!this.isInitialized) {
        console.log('SMS not initialized, would send:', message);
        return;
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: toNumber
      });

      console.log(`SMS sent to ${toNumber}: ${message}`);
      return result;
    } catch (error) {
      console.error('Error sending SMS response:', error);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(toNumber, message) {
    return await this.sendSMSResponse(toNumber, message);
  }

  /**
   * Verify phone number with Twilio
   */
  async verifyPhoneNumber(phoneNumber) {
    try {
      if (!this.isInitialized) {
        throw new Error('SMS service not initialized');
      }

      // Send verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await this.twilioClient.messages.create({
        body: `Your Itineraries verification code is: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      return verificationCode;
    } catch (error) {
      console.error('Error verifying phone number:', error);
      throw error;
    }
  }

  /**
   * Test SMS functionality
   */
  async testSMS(phoneNumber, message = 'Test message from Family Planner') {
    try {
      const result = await this.sendSMSResponse(phoneNumber, message);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const smsBot = new SMSBotService();

module.exports = smsBot;