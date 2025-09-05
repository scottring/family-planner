import { useState, useEffect } from 'react';
import {
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Minus,
  Settings,
  Lightbulb,
  TrendingUp,
  Target,
  X,
  CheckCircle,
  Loader
} from 'lucide-react';
import TimelineSuggestionNotification from './TimelineSuggestionNotification';

const QuickImproveButton = ({ 
  eventData, 
  onApplySuggestion, 
  onDismissSuggestion,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && eventData) {
      fetchSuggestions();
    }
  }, [isOpen, eventData]);

  const fetchSuggestions = async () => {
    if (!eventData?.event_pattern) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/timeline-suggestions/for-event?eventPattern=${encodeURIComponent(eventData.event_pattern)}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get application details
      const appResponse = await fetch(
        `/api/timeline-suggestions/${suggestion.id}/apply`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!appResponse.ok) {
        throw new Error('Failed to get application details');
      }

      const applicationData = await appResponse.json();

      // Mark as accepted
      const respondResponse = await fetch(
        `/api/timeline-suggestions/${suggestion.id}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ response: 'accepted' })
        }
      );

      if (!respondResponse.ok) {
        throw new Error('Failed to respond to suggestion');
      }

      // Apply the suggestion to the timeline
      if (onApplySuggestion) {
        onApplySuggestion(suggestion, applicationData);
      }

      // Remove from local list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    } catch (err) {
      console.error('Error accepting suggestion:', err);
      setError(err.message);
    }
  };

  const handleDismissSuggestion = async (suggestion, permanent = false) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/timeline-suggestions/${suggestion.id}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            response: permanent ? 'permanently_dismissed' : 'dismissed' 
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to respond to suggestion');
      }

      if (onDismissSuggestion) {
        onDismissSuggestion(suggestion, permanent);
      }

      // Remove from local list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    } catch (err) {
      console.error('Error dismissing suggestion:', err);
      setError(err.message);
    }
  };

  const getSuggestionCount = () => suggestions.length;

  const hasHighPrioritySuggestions = () => 
    suggestions.some(s => s.priority === 'high');

  if (!eventData) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          hasHighPrioritySuggestions()
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200'
            : getSuggestionCount() > 0
            ? 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
        }`}
      >
        <Zap className="h-4 w-4" />
        <span>Quick Improve</span>
        {getSuggestionCount() > 0 && (
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
            hasHighPrioritySuggestions()
              ? 'bg-yellow-200 text-yellow-900'
              : 'bg-blue-200 text-blue-900'
          }`}>
            {getSuggestionCount()}
          </span>
        )}
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Timeline Suggestions
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-5 w-5 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">
                  Finding suggestions...
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    fetchSuggestions();
                  }}
                  className="text-xs text-red-700 hover:text-red-900 mt-1"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && suggestions.length === 0 && (
              <div className="text-center py-8">
                <Lightbulb className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No suggestions available yet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Complete a few similar events to get personalized suggestions
                </p>
              </div>
            )}

            {!loading && !error && suggestions.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <TimelineSuggestionNotification
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={() => handleAcceptSuggestion(suggestion)}
                    onDismiss={() => handleDismissSuggestion(suggestion, false)}
                    onPermanentDismiss={() => handleDismissSuggestion(suggestion, true)}
                    compact={true}
                  />
                ))}
              </div>
            )}

            {!loading && !error && suggestions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Suggestions based on your usage patterns
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickImproveButton;