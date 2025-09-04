const Tesseract = require('tesseract.js');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const natural = require('natural');

class OCRService {
  constructor() {
    this.dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}|\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}|\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),? (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4})\b/gi;
    this.timeRegex = /\b(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?\b|\b(\d{1,2})\s*(AM|PM|am|pm)\b/gi;
    this.phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    this.emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    
    // Common form patterns
    this.formPatterns = {
      permission_slip: /permission\s+slip|field\s+trip|authorization|consent/gi,
      sports_schedule: /practice|game|tournament|match|season|team|coach/gi,
      school_notice: /school|parent|teacher|homework|assignment|due|class/gi,
      medical_form: /medical|doctor|appointment|checkup|vaccine|medication/gi,
      activity_info: /lesson|recital|performance|rehearsal|activity|club/gi,
      event_flyer: /event|celebration|party|fundraiser|meeting/gi
    };
  }

  /**
   * Process an attachment for OCR
   */
  async processAttachment(attachmentId) {
    try {
      // Get attachment details
      const attachment = db.prepare(`
        SELECT * FROM processed_attachments WHERE id = ?
      `).get(attachmentId);

      if (!attachment) {
        throw new Error(`Attachment ${attachmentId} not found`);
      }

      // Update status to processing
      db.prepare(`
        UPDATE processed_attachments 
        SET processing_status = 'processing'
        WHERE id = ?
      `).run(attachmentId);

      // Check if file exists
      if (!fs.existsSync(attachment.file_path)) {
        throw new Error(`File not found: ${attachment.file_path}`);
      }

      // Get user's OCR settings
      const inboxItem = db.prepare(`
        SELECT created_by FROM inbox_items WHERE id = ?
      `).get(attachment.inbox_item_id);

      const userSettings = await this.getUserOCRSettings(inboxItem.created_by);

      // Perform OCR
      const ocrResult = await this.performOCR(attachment.file_path, userSettings);

      // Extract structured data
      const extractedData = this.extractStructuredData(ocrResult.text);

      // Update attachment record
      db.prepare(`
        UPDATE processed_attachments 
        SET processing_status = 'completed',
            ocr_text = ?,
            ocr_confidence = ?,
            extracted_data = ?,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        ocrResult.text,
        ocrResult.confidence,
        db.stringifyJSON(extractedData),
        attachmentId
      );

      // Update associated inbox item with extracted data
      await this.updateInboxItemWithOCRData(attachment.inbox_item_id, ocrResult.text, extractedData);

      console.log(`OCR processing completed for attachment ${attachmentId}`);
      return {
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        extractedData
      };
    } catch (error) {
      console.error(`Error processing attachment ${attachmentId}:`, error);
      
      // Update status to failed
      db.prepare(`
        UPDATE processed_attachments 
        SET processing_status = 'failed',
            processing_error = ?
        WHERE id = ?
      `).run(error.message, attachmentId);

      throw error;
    }
  }

  /**
   * Get user's OCR settings
   */
  async getUserOCRSettings(userId) {
    try {
      const result = db.prepare(`
        SELECT ocr_settings FROM capture_settings WHERE user_id = ?
      `).get(userId);

      if (!result) {
        return {
          enabled: true,
          auto_process: true,
          confidence_threshold: 0.7
        };
      }

      return db.parseJSON(result.ocr_settings) || {
        enabled: true,
        auto_process: true,
        confidence_threshold: 0.7
      };
    } catch (error) {
      console.error('Error getting OCR settings:', error);
      return {
        enabled: true,
        auto_process: true,
        confidence_threshold: 0.7
      };
    }
  }

  /**
   * Perform OCR on an image file
   */
  async performOCR(filePath, settings = {}) {
    try {
      const result = await Tesseract.recognize(filePath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence / 100, // Convert to 0-1 scale
        words: result.data.words,
        lines: result.data.lines,
        paragraphs: result.data.paragraphs
      };
    } catch (error) {
      console.error('Error performing OCR:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Extract structured data from OCR text
   */
  extractStructuredData(text) {
    const data = {
      dates: [],
      times: [],
      phoneNumbers: [],
      emailAddresses: [],
      formType: null,
      keyInfo: {},
      confidence: 1.0
    };

    try {
      // Extract dates
      const dateMatches = text.match(this.dateRegex);
      if (dateMatches) {
        data.dates = dateMatches.map(date => this.normalizeDate(date.trim()));
      }

      // Extract times
      const timeMatches = text.match(this.timeRegex);
      if (timeMatches) {
        data.times = [...new Set(timeMatches.map(time => time.trim()))];
      }

      // Extract phone numbers
      const phoneMatches = text.match(this.phoneRegex);
      if (phoneMatches) {
        data.phoneNumbers = [...new Set(phoneMatches.map(phone => phone.trim()))];
      }

      // Extract email addresses
      const emailMatches = text.match(this.emailRegex);
      if (emailMatches) {
        data.emailAddresses = [...new Set(emailMatches.map(email => email.trim()))];
      }

      // Identify form type
      data.formType = this.identifyFormType(text);

      // Extract specific information based on form type
      data.keyInfo = this.extractFormSpecificInfo(text, data.formType);

      // Extract locations
      data.keyInfo.locations = this.extractLocations(text);

      // Extract names and contacts
      data.keyInfo.contacts = this.extractContacts(text);

      return data;
    } catch (error) {
      console.error('Error extracting structured data:', error);
      return data;
    }
  }

  /**
   * Normalize date format
   */
  normalizeDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if can't parse
      }
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Identify the type of form/document
   */
  identifyFormType(text) {
    const lowerText = text.toLowerCase();
    
    for (const [formType, pattern] of Object.entries(this.formPatterns)) {
      if (pattern.test(lowerText)) {
        return formType;
      }
    }
    
    return 'general';
  }

  /**
   * Extract form-specific information
   */
  extractFormSpecificInfo(text, formType) {
    const info = {};
    
    switch (formType) {
      case 'permission_slip':
        info.studentName = this.extractStudentName(text);
        info.tripDestination = this.extractTripDestination(text);
        info.requirements = this.extractRequirements(text);
        break;
        
      case 'sports_schedule':
        info.teamName = this.extractTeamName(text);
        info.opponent = this.extractOpponent(text);
        info.venue = this.extractVenue(text);
        info.equipment = this.extractEquipment(text);
        break;
        
      case 'school_notice':
        info.subject = this.extractSubject(text);
        info.dueDate = this.extractDueDate(text);
        info.teacher = this.extractTeacher(text);
        break;
        
      case 'medical_form':
        info.doctorName = this.extractDoctorName(text);
        info.appointmentType = this.extractAppointmentType(text);
        info.instructions = this.extractInstructions(text);
        break;
        
      case 'activity_info':
        info.activityName = this.extractActivityName(text);
        info.instructor = this.extractInstructor(text);
        info.materials = this.extractMaterials(text);
        break;
    }
    
    return info;
  }

  /**
   * Extract locations from text
   */
  extractLocations(text) {
    const locationKeywords = ['at ', 'located at', 'address:', 'venue:', 'location:', 'place:', 'room ', 'building'];
    const locations = [];
    
    for (const keyword of locationKeywords) {
      const regex = new RegExp(keyword + '([^\n\r.]{1,100})', 'gi');
      const matches = text.match(regex);
      if (matches) {
        locations.push(...matches.map(match => match.replace(new RegExp(keyword, 'gi'), '').trim()));
      }
    }
    
    return [...new Set(locations)];
  }

  /**
   * Extract contact information
   */
  extractContacts(text) {
    const contacts = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.phoneRegex.test(line) || this.emailRegex.test(line)) {
        // Look for names in surrounding lines
        const context = [
          lines[i - 1]?.trim(),
          line.trim(),
          lines[i + 1]?.trim()
        ].filter(Boolean);
        
        contacts.push({
          context: context.join(' '),
          line: line.trim()
        });
      }
    }
    
    return contacts;
  }

  /**
   * Helper methods for extracting specific information
   */
  extractStudentName(text) {
    const patterns = [
      /student:?\s*([^\n\r]+)/gi,
      /child:?\s*([^\n\r]+)/gi,
      /name:?\s*([^\n\r]+)/gi
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]?.trim();
      }
    }
    return null;
  }

  extractTripDestination(text) {
    const patterns = [
      /destination:?\s*([^\n\r]+)/gi,
      /trip to:?\s*([^\n\r]+)/gi,
      /visiting:?\s*([^\n\r]+)/gi
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]?.trim();
      }
    }
    return null;
  }

  extractTeamName(text) {
    const patterns = [
      /team:?\s*([^\n\r]+)/gi,
      /([\w\s]+)\s+(?:vs|versus|against)/gi
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]?.trim();
      }
    }
    return null;
  }

  extractRequirements(text) {
    const requirements = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (/bring|required|need|must have|pack/gi.test(line)) {
        requirements.push(line.trim());
      }
    }
    
    return requirements;
  }

  /**
   * Update inbox item with OCR data
   */
  async updateInboxItemWithOCRData(inboxItemId, ocrText, extractedData) {
    try {
      // Get current inbox item
      const inboxItem = db.prepare(`
        SELECT * FROM inbox_items WHERE id = ?
      `).get(inboxItemId);

      if (!inboxItem) {
        throw new Error(`Inbox item ${inboxItemId} not found`);
      }

      // Enhance the transcription and parsed data
      const enhancedContent = `${inboxItem.raw_content}\n\n--- OCR Extracted Text ---\n${ocrText}`;
      const currentParsedData = db.parseJSON(inboxItem.parsed_data) || {};
      const enhancedParsedData = {
        ...currentParsedData,
        ocr: extractedData,
        hasOCRData: true
      };

      // Update category if we found a more specific one
      let category = inboxItem.category;
      if (extractedData.formType && extractedData.formType !== 'general') {
        category = this.mapFormTypeToCategory(extractedData.formType);
      }

      // Update urgency if we found dates that indicate urgency
      let urgencyScore = inboxItem.urgency_score;
      if (extractedData.dates && extractedData.dates.length > 0) {
        urgencyScore = this.calculateUrgencyFromDates(extractedData.dates, urgencyScore);
      }

      // Update the inbox item
      db.prepare(`
        UPDATE inbox_items 
        SET raw_content = ?,
            transcription = ?,
            parsed_data = ?,
            category = ?,
            urgency_score = ?,
            processing_confidence = ?
        WHERE id = ?
      `).run(
        enhancedContent,
        ocrText,
        db.stringifyJSON(enhancedParsedData),
        category,
        urgencyScore,
        extractedData.confidence,
        inboxItemId
      );

      // Trigger inbox processing to convert to events/tasks
      const inboxProcessor = require('./inboxProcessor');
      await inboxProcessor.processInboxItem(inboxItemId);

      console.log(`Updated inbox item ${inboxItemId} with OCR data`);
    } catch (error) {
      console.error('Error updating inbox item with OCR data:', error);
    }
  }

  /**
   * Map form type to category
   */
  mapFormTypeToCategory(formType) {
    const mapping = {
      permission_slip: 'school',
      sports_schedule: 'sports',
      school_notice: 'school',
      medical_form: 'medical',
      activity_info: 'activities',
      event_flyer: 'events'
    };
    
    return mapping[formType] || 'general';
  }

  /**
   * Calculate urgency based on extracted dates
   */
  calculateUrgencyFromDates(dates, currentUrgency) {
    const today = new Date();
    let urgency = currentUrgency;
    
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      
      // Increase urgency for near-term dates
      if (daysDiff <= 1) {
        urgency = Math.min(5, urgency + 2);
      } else if (daysDiff <= 3) {
        urgency = Math.min(5, urgency + 1);
      } else if (daysDiff <= 7) {
        urgency = Math.min(5, urgency + 0.5);
      }
    }
    
    return Math.round(urgency);
  }

  /**
   * Process uploaded image directly
   */
  async processUploadedImage(filePath, userId) {
    try {
      // Get user settings
      const userSettings = await this.getUserOCRSettings(userId);

      if (!userSettings.enabled) {
        throw new Error('OCR processing is disabled for this user');
      }

      // Perform OCR
      const ocrResult = await this.performOCR(filePath, userSettings);

      // Extract structured data
      const extractedData = this.extractStructuredData(ocrResult.text);

      // Check if confidence meets threshold
      if (ocrResult.confidence < userSettings.confidence_threshold) {
        console.warn(`OCR confidence ${ocrResult.confidence} below threshold ${userSettings.confidence_threshold}`);
      }

      return {
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        extractedData,
        meetsThreshold: ocrResult.confidence >= userSettings.confidence_threshold
      };
    } catch (error) {
      console.error('Error processing uploaded image:', error);
      throw error;
    }
  }
}

// Create singleton instance
const ocrService = new OCRService();

module.exports = ocrService;