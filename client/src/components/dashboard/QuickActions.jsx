import { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  CheckSquare, 
  Users, 
  Mic, 
  Clock,
  UtensilsCrossed,
  MapPin,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const QuickActions = () => {
  const navigate = useNavigate();
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  // Quick action definitions
  const primaryActions = [
    {
      id: 'add-event',
      title: 'Add Event',
      description: 'Schedule new activity',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
      link: '/calendar/new',
      shortcut: 'E',
    },
    {
      id: 'add-task',
      title: 'Add Task',
      description: 'Create new task',
      icon: CheckSquare,
      color: 'bg-green-500 hover:bg-green-600',
      link: '/tasks/new',
      shortcut: 'T',
    },
    {
      id: 'voice-input',
      title: 'Voice Input',
      description: 'Speak your request',
      icon: Mic,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => handleVoiceInput(),
      shortcut: 'V',
    },
  ];

  const secondaryActions = [
    {
      id: 'calendar-view',
      title: 'Calendar',
      icon: Calendar,
      link: '/calendar',
      color: 'text-blue-600 hover:bg-blue-50',
    },
    {
      id: 'meal-planning',
      title: 'Meal Planning',
      icon: UtensilsCrossed,
      link: '/meals',
      color: 'text-orange-600 hover:bg-orange-50',
    },
    {
      id: 'family-members',
      title: 'Family',
      icon: Users,
      link: '/family',
      color: 'text-purple-600 hover:bg-purple-50',
    },
    {
      id: 'quick-timer',
      title: 'Set Timer',
      icon: Clock,
      action: () => handleQuickTimer(),
      color: 'text-green-600 hover:bg-green-50',
    },
  ];

  // Smart suggestions based on time and common actions
  const getSmartSuggestions = () => {
    const now = new Date();
    const hour = now.getHours();
    const suggestions = [];

    // Morning suggestions
    if (hour >= 6 && hour < 12) {
      suggestions.push({
        id: 'morning-checklist',
        title: 'Morning Routine',
        description: 'Start your day',
        icon: Clock,
        color: 'bg-yellow-500 hover:bg-yellow-600',
        link: '/checklists/morning',
      });
    }

    // Afternoon suggestions
    if (hour >= 12 && hour < 17) {
      suggestions.push({
        id: 'lunch-planning',
        title: 'Plan Lunch',
        description: 'Quick meal idea',
        icon: UtensilsCrossed,
        color: 'bg-orange-500 hover:bg-orange-600',
        link: '/meals/quick',
      });
    }

    // Evening suggestions
    if (hour >= 17 && hour < 21) {
      suggestions.push({
        id: 'tomorrow-prep',
        title: 'Tomorrow Prep',
        description: 'Plan ahead',
        icon: MapPin,
        color: 'bg-indigo-500 hover:bg-indigo-600',
        action: () => navigate('/dashboard?view=tomorrow'),
      });
    }

    // Weekend suggestions
    if (now.getDay() === 0 || now.getDay() === 6) {
      suggestions.push({
        id: 'family-activity',
        title: 'Family Activity',
        description: 'Plan something fun',
        icon: Users,
        color: 'bg-pink-500 hover:bg-pink-600',
        link: '/calendar/new?type=family',
      });
    }

    return suggestions.slice(0, 1); // Return max 1 suggestion
  };

  const smartSuggestions = getSmartSuggestions();

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser');
      return;
    }

    setIsVoiceListening(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input:', transcript);
      
      // Basic voice command parsing
      const command = transcript.toLowerCase();
      
      if (command.includes('add event') || command.includes('create event') || command.includes('schedule')) {
        navigate('/calendar/new?voice=true&input=' + encodeURIComponent(transcript));
      } else if (command.includes('add task') || command.includes('create task')) {
        navigate('/tasks/new?voice=true&input=' + encodeURIComponent(transcript));
      } else if (command.includes('meal') || command.includes('dinner') || command.includes('lunch')) {
        navigate('/meals?voice=true&input=' + encodeURIComponent(transcript));
      } else {
        // Default to event creation with voice input
        navigate('/calendar/new?voice=true&input=' + encodeURIComponent(transcript));
      }
      
      setIsVoiceListening(false);
    };

    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      setIsVoiceListening(false);
      alert('Voice input failed. Please try again.');
    };

    recognition.onend = function() {
      setIsVoiceListening(false);
    };

    recognition.start();
  };

  const handleQuickTimer = () => {
    const minutes = prompt('Set timer for how many minutes?', '25');
    if (minutes && !isNaN(minutes)) {
      // In a real app, this would integrate with a timer service
      alert(`Timer set for ${minutes} minutes`);
      // Could also navigate to a timer page or show a timer widget
    }
  };

  const handleActionClick = (action) => {
    if (action.action) {
      action.action();
    } else if (action.link) {
      navigate(action.link);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Zap className="h-5 w-5 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="text-sm text-teal-600 font-medium">
            Fast access
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="font-medium text-gray-800">Suggested</h3>
            </div>
            <div className="space-y-2">
              {smartSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleActionClick(suggestion)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-white transition-all duration-200 btn-hover-lift ${suggestion.color}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1 bg-white/20 rounded">
                      <suggestion.icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{suggestion.title}</div>
                      <div className="text-sm opacity-90">{suggestion.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-70" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div>
          <h3 className="font-medium text-gray-800 mb-3">Primary Actions</h3>
          <div className="grid gap-3">
            {primaryActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`flex items-center justify-between p-4 rounded-xl text-white transition-all duration-200 btn-hover-lift shadow-md ${action.color} ${
                  action.id === 'voice-input' && isVoiceListening ? 'animate-pulse' : ''
                }`}
                disabled={action.id === 'voice-input' && isVoiceListening}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">{action.title}</div>
                    <div className="text-sm opacity-90">
                      {action.id === 'voice-input' && isVoiceListening 
                        ? 'Listening...' 
                        : action.description
                      }
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <ChevronRight className="h-5 w-5 opacity-70" />
                  {action.shortcut && (
                    <div className="text-xs bg-white/20 px-2 py-1 rounded">
                      {action.shortcut}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Actions */}
        <div>
          <h3 className="font-medium text-gray-800 mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
            {secondaryActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`flex flex-col items-center p-4 rounded-xl border border-gray-200 transition-all duration-200 hover:scale-105 ${action.color}`}
              >
                <div className="p-3 rounded-lg bg-gray-50 mb-2">
                  <action.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-gray-900">{action.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="pt-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 text-center">
              <strong>Keyboard shortcuts:</strong> Press{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl</kbd> +{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">E</kbd> for events,{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">T</kbd> for tasks,{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">V</kbd> for voice
            </div>
          </div>
        </div>

        {/* Recent Action Hint */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Last action: Created "Soccer practice" event • 2h ago
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;