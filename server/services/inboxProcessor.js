const { parseWithAI } = require('./ai');
const nlpParser = require('./nlpParser');
const db = require('../config/database');

/**
 * Process inbox item content using AI and rule-based logic
 * Enhanced to handle advanced input methods from Phase 10
 */
async function processInboxItem(itemId) {
  // Fetch full inbox item data including new fields
  const itemData = db.prepare(`
    SELECT ii.*, pa.ocr_text, pa.extracted_data as ocr_extracted_data
    FROM inbox_items ii
    LEFT JOIN processed_attachments pa ON ii.attachment_id = pa.id
    WHERE ii.id = ?
  `).get(itemId);

  if (!itemData) {
    throw new Error(`Inbox item ${itemId} not found`);
  }

  const { 
    raw_content, 
    transcription, 
    input_type, 
    source_type, 
    email_metadata, 
    sms_metadata,
    ocr_text,
    ocr_extracted_data,
    created_by 
  } = itemData;
  
  // Determine the best content source based on input type
  let content = transcription || raw_content;
  if (ocr_text && input_type === 'image') {
    content = `${raw_content}\n\nExtracted Text:\n${ocr_text}`;
  }
  
  if (!content) {
    throw new Error('No content to process');
  }

  try {
    // Use advanced NLP parser for enhanced processing
    let nlpAnalysis = null;
    try {
      nlpAnalysis = await nlpParser.parseAdvancedInput(content, created_by);
      console.log(`Advanced NLP parsing completed for item ${itemId}`);
    } catch (error) {
      console.warn('Advanced NLP parsing failed:', error.message);
    }

    // Get AI analysis if available
    let aiAnalysis = null;
    try {
      aiAnalysis = await getAIAnalysis(content);
    } catch (error) {
      console.warn('AI analysis failed, using rule-based processing:', error.message);
    }

    // Process with rule-based system as fallback/supplement
    const ruleBasedAnalysis = processWithRules(content);
    
    // Enhance with source-specific processing
    const sourceEnhancedAnalysis = await enhanceWithSourceContext(
      itemData, 
      nlpAnalysis, 
      aiAnalysis, 
      ruleBasedAnalysis
    );
    
    // Merge all analysis results
    const finalAnalysis = mergeAnalysis(nlpAnalysis, aiAnalysis, ruleBasedAnalysis, sourceEnhancedAnalysis);
    
    return {
      urgency_score: finalAnalysis.urgency_score,
      category: finalAnalysis.category,
      parsed_data: {
        ...finalAnalysis,
        processing_method: aiAnalysis ? 'ai_enhanced' : 'rule_based',
        processed_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error processing inbox item:', error);
    
    // Fallback to minimal processing
    return {
      urgency_score: 3,
      category: 'note',
      parsed_data: {
        originalText: content,
        error: 'Processing failed, using defaults',
        processing_method: 'fallback',
        processed_at: new Date().toISOString()
      }
    };
  }
}

/**
 * Get AI analysis of the content
 */
async function getAIAnalysis(content) {
  const prompt = `
    Analyze this text and extract the following information:
    
    Text: "${content}"
    
    Please provide:
    1. Urgency score (1-5, where 5 is most urgent)
    2. Category (task, event, note, reminder, question)
    3. Key entities (people, places, dates, times)
    4. Intent/action required
    5. Suggested follow-up actions
    
    Format your response as JSON with this structure:
    {
      "urgency_score": <1-5>,
      "category": "<category>",
      "entities": {
        "people": ["name1", "name2"],
        "places": ["location1"],
        "dates": ["date1"],
        "times": ["time1"]
      },
      "intent": "<what the user wants to accomplish>",
      "suggested_actions": ["action1", "action2"],
      "keywords": ["keyword1", "keyword2"]
    }
  `;

  try {
    const response = await parseWithAI(content, prompt);
    return JSON.parse(response);
  } catch (error) {
    console.warn('AI parsing failed:', error);
    return null;
  }
}

/**
 * Process content using rule-based system
 */
function processWithRules(content) {
  const lowerContent = content.toLowerCase();
  
  return {
    urgency_score: calculateUrgencyScore(content),
    category: detectCategory(content),
    entities: extractEntities(content),
    intent: inferIntent(content),
    suggested_actions: suggestActions(content),
    keywords: extractKeywords(content),
    confidence: 0.7 // Rule-based confidence
  };
}

/**
 * Calculate urgency score based on keywords and patterns
 */
function calculateUrgencyScore(content) {
  const lowerContent = content.toLowerCase();
  let score = 3; // Default neutral

  // High urgency indicators
  const urgentPatterns = [
    /\b(urgent|emergency|asap|immediately|critical|important|deadline)\b/g,
    /\b(today|tonight|now|right away|this morning|this afternoon)\b/g,
    /\b(help|problem|issue|broken|not working|failed)\b/g,
    /[!]{2,}/g, // Multiple exclamation marks
  ];

  // Medium urgency indicators
  const mediumPatterns = [
    /\b(tomorrow|this week|soon|quickly|need to|have to|should|must)\b/g,
    /\b(meeting|appointment|call|interview|deadline)\b/g,
  ];

  // Low urgency indicators
  const lowPatterns = [
    /\b(maybe|perhaps|sometime|eventually|when you get a chance)\b/g,
    /\b(idea|thought|consider|think about)\b/g,
  ];

  // Calculate score adjustments
  let urgentMatches = 0;
  urgentPatterns.forEach(pattern => {
    const matches = lowerContent.match(pattern);
    if (matches) urgentMatches += matches.length;
  });

  let mediumMatches = 0;
  mediumPatterns.forEach(pattern => {
    const matches = lowerContent.match(pattern);
    if (matches) mediumMatches += matches.length;
  });

  let lowMatches = 0;
  lowPatterns.forEach(pattern => {
    const matches = lowerContent.match(pattern);
    if (matches) lowMatches += matches.length;
  });

  // Adjust score
  score += urgentMatches * 1.5;
  score += mediumMatches * 0.5;
  score -= lowMatches * 0.5;

  // Question marks often indicate need for response
  const questionMarks = (content.match(/\?/g) || []).length;
  score += questionMarks * 0.3;

  // All caps indicates urgency
  if (content === content.toUpperCase() && content.length > 3) {
    score += 1;
  }

  // Clamp between 1 and 5
  return Math.min(5, Math.max(1, Math.round(score)));
}

/**
 * Detect content category
 */
function detectCategory(content) {
  const lowerContent = content.toLowerCase();

  // Category patterns
  const categories = {
    task: [
      /\b(buy|get|pick up|purchase|order|book|reserve|schedule|call|email|send)\b/,
      /\b(clean|organize|fix|repair|install|update|complete|finish|do)\b/,
      /\b(need to|have to|should|must|don't forget to)\b/,
      /\b(todo|to do|task|chore)\b/
    ],
    event: [
      /\b(meeting|appointment|dinner|lunch|party|conference|call)\b/,
      /\b(visit|trip|vacation|birthday|anniversary|wedding|graduation)\b/,
      /\b(concert|show|movie|theater|game|match)\b/,
      /\b(at \d{1,2}:\d{2}|on \w+day|next week|tomorrow at)\b/
    ],
    reminder: [
      /\b(remind|reminder|don't forget|remember to|note to self)\b/,
      /\b(remind me|set reminder|alert me)\b/
    ],
    question: [
      /\?/,
      /\b(what|when|where|who|how|why|which|should|could|would)\b/
    ],
    note: [
      /\b(note|idea|thought|observation|remember that)\b/,
      /\b(interesting|noticed|realized|learned)\b/
    ]
  };

  // Score each category
  const scores = {};
  Object.keys(categories).forEach(category => {
    scores[category] = 0;
    categories[category].forEach(pattern => {
      const matches = lowerContent.match(pattern);
      if (matches) {
        scores[category] += matches.length;
      }
    });
  });

  // Find highest scoring category
  const maxCategory = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  
  // Return highest scoring category if it has any matches, otherwise default to 'note'
  return scores[maxCategory] > 0 ? maxCategory : 'note';
}

/**
 * Extract entities from content
 */
function extractEntities(content) {
  const entities = {
    people: [],
    places: [],
    dates: [],
    times: [],
    emails: [],
    phones: [],
    urls: []
  };

  // Extract names (simple capitalized words pattern)
  const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
  const names = content.match(namePattern) || [];
  entities.people = [...new Set(names)];

  // Extract dates
  const datePatterns = [
    /\b(?:today|tomorrow|yesterday)\b/gi,
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b\d{1,2}-\d{1,2}(?:-\d{2,4})?\b/g,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}\b/gi
  ];
  
  datePatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    entities.dates = [...new Set([...entities.dates, ...matches])];
  });

  // Extract times
  const timePattern = /\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?\b/gi;
  const times = content.match(timePattern) || [];
  entities.times = [...new Set(times)];

  // Extract locations (after prepositions)
  const locationPattern = /\b(?:at|in|on|near|by|to)\s+([A-Z][A-Za-z\s]+?)(?:\s|$|[,.!?])/g;
  let locationMatch;
  while ((locationMatch = locationPattern.exec(content)) !== null) {
    const location = locationMatch[1].trim();
    if (location.length > 1) {
      entities.places.push(location);
    }
  }
  entities.places = [...new Set(entities.places)];

  // Extract emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = content.match(emailPattern) || [];
  entities.emails = [...new Set(emails)];

  // Extract phone numbers
  const phonePattern = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
  const phones = content.match(phonePattern) || [];
  entities.phones = [...new Set(phones)];

  // Extract URLs
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = content.match(urlPattern) || [];
  entities.urls = [...new Set(urls)];

  return entities;
}

/**
 * Infer user intent from content
 */
function inferIntent(content) {
  const lowerContent = content.toLowerCase();

  const intents = [
    { pattern: /\b(buy|purchase|get|pick up|order)\b/, intent: 'purchase' },
    { pattern: /\b(schedule|book|reserve|set up)\b/, intent: 'schedule' },
    { pattern: /\b(call|phone|contact)\b/, intent: 'communicate' },
    { pattern: /\b(email|send|message)\b/, intent: 'communicate' },
    { pattern: /\b(clean|organize|fix|repair)\b/, intent: 'maintain' },
    { pattern: /\b(learn|research|find out|look up)\b/, intent: 'research' },
    { pattern: /\b(remember|remind|note)\b/, intent: 'remember' },
    { pattern: /\b(plan|prepare|arrange)\b/, intent: 'plan' },
    { pattern: /\?/, intent: 'question' }
  ];

  for (const { pattern, intent } of intents) {
    if (pattern.test(lowerContent)) {
      return intent;
    }
  }

  return 'note'; // Default intent
}

/**
 * Suggest actions based on content analysis
 */
function suggestActions(content) {
  const category = detectCategory(content);
  const intent = inferIntent(content);
  const urgency = calculateUrgencyScore(content);
  const entities = extractEntities(content);
  
  const actions = [];

  // Category-based suggestions
  if (category === 'task') {
    actions.push('Convert to task');
    if (urgency >= 4) {
      actions.push('Set as high priority');
    }
    if (entities.dates.length > 0) {
      actions.push('Set due date');
    }
  } else if (category === 'event') {
    actions.push('Convert to calendar event');
    if (entities.times.length > 0) {
      actions.push('Set event time');
    }
    if (entities.places.length > 0) {
      actions.push('Set event location');
    }
  } else if (category === 'reminder') {
    actions.push('Set reminder');
    actions.push('Schedule notification');
  }

  // Intent-based suggestions
  if (intent === 'communicate' && entities.people.length > 0) {
    actions.push('Add contact information');
  }
  
  if (intent === 'schedule') {
    actions.push('Check calendar availability');
  }

  // Urgency-based suggestions
  if (urgency >= 4) {
    actions.push('Mark as urgent');
    actions.push('Send immediate notification');
  }

  // Entity-based suggestions
  if (entities.dates.length > 0 || entities.times.length > 0) {
    actions.push('Add to calendar');
  }
  
  if (entities.people.length > 0) {
    actions.push('Tag relevant people');
  }

  return [...new Set(actions)]; // Remove duplicates
}

/**
 * Extract keywords for search and categorization
 */
function extractKeywords(content) {
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
    'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ]);

  // Extract words and filter
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Count word frequencies
  const wordCounts = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  // Return top keywords sorted by frequency
  return Object.keys(wordCounts)
    .sort((a, b) => wordCounts[b] - wordCounts[a])
    .slice(0, 10); // Top 10 keywords
}

/**
 * Enhance analysis with source-specific context
 */
async function enhanceWithSourceContext(itemData, nlpAnalysis, aiAnalysis, ruleAnalysis) {
  const { source_type, email_metadata, sms_metadata, ocr_extracted_data } = itemData;
  
  let sourceEnhancement = {
    source_context: {},
    enhanced_urgency: null,
    enhanced_category: null
  };

  switch (source_type) {
    case 'email':
      if (email_metadata) {
        const emailData = typeof email_metadata === 'string' ? JSON.parse(email_metadata) : email_metadata;
        sourceEnhancement.source_context = {
          from: emailData.from,
          subject: emailData.subject,
          hasAttachments: emailData.hasAttachments
        };
        
        // Enhance urgency based on email patterns
        if (emailData.subject && emailData.subject.toLowerCase().includes('urgent')) {
          sourceEnhancement.enhanced_urgency = 5;
        }
        
        // Enhance category based on sender
        if (emailData.from && emailData.from.includes('school')) {
          sourceEnhancement.enhanced_category = 'school';
        }
      }
      break;
      
    case 'sms':
      if (sms_metadata) {
        const smsData = typeof sms_metadata === 'string' ? JSON.parse(sms_metadata) : sms_metadata;
        sourceEnhancement.source_context = {
          command: smsData.command,
          processingType: smsData.processingType
        };
        
        // SMS messages are typically more urgent due to immediacy
        sourceEnhancement.enhanced_urgency = Math.min(5, (ruleAnalysis.urgency_score || 3) + 1);
      }
      break;
      
    case 'image':
      if (ocr_extracted_data) {
        const ocrData = typeof ocr_extracted_data === 'string' ? JSON.parse(ocr_extracted_data) : ocr_extracted_data;
        sourceEnhancement.source_context = {
          formType: ocrData.formType,
          dates: ocrData.dates,
          locations: ocrData.locations,
          confidence: ocrData.confidence
        };
        
        // Enhance based on form type
        if (ocrData.formType === 'permission_slip') {
          sourceEnhancement.enhanced_urgency = 4;
          sourceEnhancement.enhanced_category = 'school';
        }
      }
      break;
  }

  return sourceEnhancement;
}

/**
 * Merge all analysis results (NLP, AI, rule-based, and source-enhanced)
 */
function mergeAnalysis(nlpAnalysis, aiAnalysis, ruleAnalysis, sourceEnhancedAnalysis) {
  // Start with rule-based as baseline
  let result = { ...ruleAnalysis };

  // Apply NLP enhancements if available
  if (nlpAnalysis && nlpAnalysis.confidence > 0.5) {
    result.nlp_items = nlpAnalysis.items;
    result.nlp_entities = nlpAnalysis.parsedEntities;
    result.nlp_suggestions = nlpAnalysis.suggestions;
    
    // Use NLP urgency if it's higher confidence
    if (nlpAnalysis.parsedEntities && nlpAnalysis.parsedEntities.urgency) {
      result.urgency_score = nlpAnalysis.parsedEntities.urgency;
    }
    
    // Use NLP type determination if available
    if (nlpAnalysis.type && nlpAnalysis.type !== 'unknown') {
      result.inferred_type = nlpAnalysis.type;
    }
  }

  // Apply AI enhancements if available
  if (aiAnalysis) {
    result.urgency_score = aiAnalysis.urgency_score || result.urgency_score;
    result.category = aiAnalysis.category || result.category;
    result.entities = {
      ...result.entities,
      ...aiAnalysis.entities
    };
    result.intent = aiAnalysis.intent || result.intent;
    result.suggested_actions = [
      ...(result.suggested_actions || []),
      ...(aiAnalysis.suggested_actions || [])
    ];
    result.keywords = [
      ...(result.keywords || []),
      ...(aiAnalysis.keywords || [])
    ];
    result.ai_enhanced = true;
  }

  // Apply source-specific enhancements
  if (sourceEnhancedAnalysis) {
    result.source_context = sourceEnhancedAnalysis.source_context;
    
    if (sourceEnhancedAnalysis.enhanced_urgency) {
      result.urgency_score = sourceEnhancedAnalysis.enhanced_urgency;
    }
    
    if (sourceEnhancedAnalysis.enhanced_category) {
      result.category = sourceEnhancedAnalysis.enhanced_category;
    }
  }

  // Set processing confidence
  result.confidence = Math.max(
    nlpAnalysis?.confidence || 0,
    aiAnalysis?.confidence || 0,
    0.9 // Rule-based baseline
  );

  // Set processing method
  const methods = [];
  if (nlpAnalysis && nlpAnalysis.confidence > 0.5) methods.push('nlp');
  if (aiAnalysis) methods.push('ai');
  methods.push('rule_based');
  if (sourceEnhancedAnalysis?.source_context) methods.push('source_enhanced');
  
  result.processing_methods = methods;

  return result;
}

module.exports = {
  processInboxItem,
  calculateUrgencyScore,
  detectCategory,
  extractEntities,
  inferIntent,
  suggestActions,
  extractKeywords
};