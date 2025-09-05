import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, MicOff, ThumbsUp, ThumbsDown, Edit, Check, X } from 'lucide-react';
import mealChatService from '../../services/mealChatService';

const MealPlannerChat = ({ onMealPlanUpdate, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [currentMealPlan, setCurrentMealPlan] = useState([]);
  const [conversationId] = useState(() => `meal_chat_${Date.now()}`);
  const messagesEndRef = useRef(null);

  // Initialize with welcome message
  useEffect(() => {
    const initializeChat = () => {
      const conversation = mealChatService.getConversation(conversationId);
      
      // Add welcome message if conversation is new
      if (conversation.messages.length === 0) {
        const welcomeMessage = {
          id: 'welcome',
          type: 'ai',
          content: "Hi! I'm your AI meal planning assistant. I know your family's preferences and history. Just tell me what you need help with this week - like 'help me plan meals for next week' or 'we have chicken in the fridge and need ideas'.",
          timestamp: Date.now()
        };
        conversation.messages.push(welcomeMessage);
      }
      
      setMessages(conversation.messages);
    };

    initializeChat();
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const result = await mealChatService.sendMessage(conversationId, messageText);
      
      // Update messages with the conversation history
      setMessages(result.conversation.messages);
      
      // Update current meal plan with any new suggestions
      if (result.suggestions && result.suggestions.length > 0) {
        setCurrentMealPlan(prev => {
          const existing = prev.map(meal => meal.id);
          const newSuggestions = result.suggestions.filter(s => !existing.includes(s.id));
          return [...prev, ...newSuggestions];
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message manually since the service handles fallbacks
      const errorMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleVoiceToggle = () => {
    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      // Stop recording logic here
    } else {
      setIsVoiceRecording(true);
      // Start recording logic here
    }
  };

  const acceptMealSuggestion = async (suggestion) => {
    try {
      // Call parent callback to add to meal plan (this will handle the database creation)
      if (onMealPlanUpdate) {
        await onMealPlanUpdate(suggestion);
      }
      
      // Remove from current suggestions since it's been added to the plan
      setCurrentMealPlan(prev => prev.filter(meal => meal.id !== suggestion.id));
    } catch (error) {
      console.error('Error accepting meal suggestion:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] flex overflow-hidden">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-purple-50">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-purple-800">💬 Chat with AI Chef</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-purple-600 mt-1">I know your family's preferences and meal history</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Meal suggestions */}
                  {message.mealSuggestions && (
                    <div className="mt-3 space-y-2">
                      {message.mealSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="bg-white p-3 rounded border text-gray-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{suggestion.title}</h4>
                              <p className="text-xs text-gray-600">{suggestion.day} • {suggestion.mealType}</p>
                              {suggestion.familyNotes && (
                                <p className="text-xs text-green-600 mt-1">💡 {suggestion.familyNotes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-purple-600 font-medium">
                                {suggestion.successScore}% family match
                              </div>
                              <button
                                onClick={() => acceptMealSuggestion(suggestion)}
                                className="text-xs bg-purple-600 text-white px-2 py-1 rounded mt-1 hover:bg-purple-700"
                              >
                                Add to Plan
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-2">
              <button
                onClick={handleVoiceToggle}
                className={`p-2 rounded-lg ${
                  isVoiceRecording 
                    ? 'bg-red-600 text-white animate-pulse' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {isVoiceRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about meal planning..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Meal Plan Preview */}
        <div className="w-80 border-l border-gray-200 bg-gray-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">This Week's Plan</h3>
            <p className="text-sm text-gray-600">Building as we chat...</p>
          </div>
          
          <div className="p-4">
            {currentMealPlan.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🍽️</div>
                <p className="text-sm">Meal suggestions will appear here as we chat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentMealPlan.map((meal) => (
                  <div key={meal.id} className="bg-white p-3 rounded border">
                    <h4 className="font-medium text-sm">{meal.title}</h4>
                    <p className="text-xs text-gray-600">{meal.day} • {meal.mealType}</p>
                    <div className="text-xs text-purple-600 mt-1">{meal.successScore}% match</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealPlannerChat;