/**
 * Voice Service - Handles speech-to-text and text-to-speech functionality
 * Integrates with browser's Web Speech API for voice capture and synthesis
 */

class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = null;
    this.isSupported = this.checkSupport();
    this.isListening = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    
    if (this.isSupported) {
      this.initializeRecognition();
      this.initializeSynthesis();
    }
  }

  // Check if browser supports Web Speech API
  checkSupport() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  // Initialize speech recognition
  initializeRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Voice recognition started');
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (this.onResultCallback) {
        this.onResultCallback({
          final: finalTranscript,
          interim: interimTranscript,
          confidence: event.results[0]?.confidence || 0
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      if (this.onErrorCallback) {
        this.onErrorCallback({
          error: event.error,
          message: this.getErrorMessage(event.error)
        });
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Voice recognition ended');
    };
  }

  // Initialize speech synthesis
  initializeSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  // Start listening for speech
  startListening(options = {}) {
    if (!this.isSupported || !this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    // Set callbacks
    this.onResultCallback = options.onResult || null;
    this.onErrorCallback = options.onError || null;

    // Configure recognition settings
    if (options.continuous !== undefined) {
      this.recognition.continuous = options.continuous;
    }
    
    if (options.language) {
      this.recognition.lang = options.language;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      throw error;
    }
  }

  // Stop listening for speech
  stopListening() {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  // Speak text using text-to-speech
  speak(text, options = {}) {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported');
      return Promise.reject(new Error('Speech synthesis not supported'));
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice options
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      
      if (options.voice) {
        utterance.voice = options.voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synthesis.speak(utterance);
    });
  }

  // Stop current speech
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  // Get available voices
  getAvailableVoices() {
    if (!this.synthesis) {
      return [];
    }

    return this.synthesis.getVoices();
  }

  // Get preferred voice for family-friendly speech
  getFamilyVoice() {
    const voices = this.getAvailableVoices();
    
    // Prefer female, English voices for family meal planning
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && 
      voice.name.toLowerCase().includes('female')
    ) || voices.find(voice => 
      voice.lang.startsWith('en')
    ) || voices[0];

    return preferredVoice;
  }

  // Get error message for speech recognition errors
  getErrorMessage(error) {
    const errorMessages = {
      'network': 'Network error occurred during voice recognition',
      'not-allowed': 'Microphone access denied. Please allow microphone access to use voice input.',
      'service-not-allowed': 'Voice recognition service not available',
      'bad-grammar': 'Speech recognition grammar error',
      'language-not-supported': 'Language not supported for voice recognition',
      'no-speech': 'No speech detected. Please try speaking again.',
      'audio-capture': 'Audio capture failed. Please check your microphone.',
      'aborted': 'Voice recognition was aborted'
    };

    return errorMessages[error] || `Voice recognition error: ${error}`;
  }

  // Check if currently listening
  isCurrentlyListening() {
    return this.isListening;
  }

  // Check if voice features are supported
  isVoiceSupported() {
    return this.isSupported;
  }

  // Check if text-to-speech is supported
  isSpeechSynthesisSupported() {
    return !!this.synthesis;
  }

  // Request microphone permission
  async requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  // Enhanced voice recognition with better error handling
  async startVoiceRecognition(options = {}) {
    // Check for permission first
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      throw new Error('Microphone permission required for voice input');
    }

    return new Promise((resolve, reject) => {
      let finalResult = '';
      let hasReceivedResult = false;

      const onResult = (result) => {
        if (result.final && result.final.trim()) {
          finalResult = result.final.trim();
          hasReceivedResult = true;
        }
        
        // Call the provided callback if available
        if (options.onResult) {
          options.onResult(result);
        }
      };

      const onError = (error) => {
        if (options.onError) {
          options.onError(error);
        }
        reject(new Error(error.message));
      };

      // Set up recognition with callbacks
      this.onResultCallback = onResult;
      this.onErrorCallback = onError;

      // Override the onend event to resolve with final result
      const originalOnEnd = this.recognition.onend;
      this.recognition.onend = () => {
        originalOnEnd?.();
        
        if (hasReceivedResult && finalResult) {
          resolve(finalResult);
        } else if (!hasReceivedResult) {
          reject(new Error('No speech detected'));
        }
      };

      try {
        this.startListening({
          continuous: false,
          ...options
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Provide voice feedback for meal suggestions
  async provideMealFeedback(text, options = {}) {
    const voice = this.getFamilyVoice();
    
    try {
      await this.speak(text, {
        voice,
        rate: 0.9, // Slightly slower for better comprehension
        pitch: 1.0,
        ...options
      });
    } catch (error) {
      console.error('Error providing voice feedback:', error);
    }
  }

  // Clean up resources
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    
    if (this.recognition) {
      this.recognition.onstart = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
    }
    
    this.onResultCallback = null;
    this.onErrorCallback = null;
  }
}

// Create singleton instance
const voiceService = new VoiceService();

export default voiceService;

// Export utility functions for voice-related operations
export const voiceUtils = {
  // Format voice recognition confidence as percentage
  formatConfidence: (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  },

  // Check if voice input contains meal-related keywords
  containsMealKeywords: (text) => {
    const mealKeywords = [
      'meal', 'food', 'cook', 'recipe', 'dinner', 'lunch', 'breakfast',
      'eat', 'hungry', 'plan', 'ingredients', 'kitchen', 'prepare'
    ];
    
    const lowerText = text.toLowerCase();
    return mealKeywords.some(keyword => lowerText.includes(keyword));
  },

  // Clean up voice input text for better processing
  cleanVoiceText: (text) => {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[.,!?]+$/, '') // Remove trailing punctuation
      .toLowerCase();
  },

  // Get voice input quality score
  getInputQuality: (text, confidence) => {
    let score = confidence * 0.7; // Base score from recognition confidence
    
    // Boost score for longer, more complete sentences
    if (text.length > 20) score += 0.1;
    if (text.split(' ').length >= 5) score += 0.1;
    
    // Boost score for meal-related content
    if (voiceUtils.containsMealKeywords(text)) score += 0.1;
    
    return Math.min(score, 1.0);
  }
};