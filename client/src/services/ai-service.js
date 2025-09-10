import { supabase } from './supabase';

class AIService {
  async enrichEvent(eventData) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-enrichment', {
        body: {
          eventTitle: eventData.title,
          eventDescription: eventData.description,
          eventLocation: eventData.location
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('AI enrichment error:', error);
      // Return default suggestions if AI fails
      return this.getDefaultSuggestions(eventData);
    }
  }

  async generateTaskSuggestions(taskTitle) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-enrichment', {
        body: {
          eventTitle: taskTitle,
          eventDescription: 'Generate task breakdown'
        }
      });

      if (error) throw error;
      return data.suggestions?.preparation || [];
    } catch (error) {
      console.error('AI task suggestions error:', error);
      return ['Break down into smaller steps', 'Set a deadline', 'Assign to team member'];
    }
  }

  getDefaultSuggestions(eventData) {
    return {
      suggestions: {
        preparation: [
          'Review agenda or event details',
          'Prepare necessary materials',
          'Set reminders'
        ],
        packingList: [
          'Phone and charger',
          'Wallet and keys',
          'Any required documents'
        ],
        logistics: {
          estimatedDuration: '1-2 hours',
          bestTimeToLeave: '15-30 minutes before',
          parkingTips: 'Check for nearby parking options'
        }
      },
      weatherConsiderations: {
        indoor: true,
        weatherDependent: false
      },
      category: 'personal',
      priority: 3
    };
  }

  async analyzeInboxItem(content) {
    // Parse content to detect type and extract details
    const lower = content.toLowerCase();
    
    const analysis = {
      type: this.detectItemType(lower),
      confidence: 0.8,
      extractedData: {}
    };

    // Extract dates
    const dateMatch = content.match(/(\d{1,2}\/\d{1,2}|\w+ \d{1,2})/);
    if (dateMatch) {
      analysis.extractedData.date = dateMatch[0];
    }

    // Extract times
    const timeMatch = content.match(/(\d{1,2}:\d{2}|\d{1,2}(am|pm))/i);
    if (timeMatch) {
      analysis.extractedData.time = timeMatch[0];
    }

    // Extract location (after "at" or "in")
    const locationMatch = content.match(/(?:at|in)\s+([^,.\n]+)/i);
    if (locationMatch) {
      analysis.extractedData.location = locationMatch[1].trim();
    }

    return analysis;
  }

  detectItemType(text) {
    if (text.includes('meeting') || text.includes('appointment')) return 'event';
    if (text.includes('todo') || text.includes('task') || text.includes('need to')) return 'task';
    if (text.includes('remind') || text.includes('don\'t forget')) return 'reminder';
    return 'note';
  }
}

export default new AIService();