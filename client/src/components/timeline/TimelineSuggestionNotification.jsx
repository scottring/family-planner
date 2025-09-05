import { useState } from 'react';
import {
  Bell,
  CheckCircle,
  X,
  Eye,
  EyeOff,
  Clock,
  Plus,
  Minus,
  Settings,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Target
} from 'lucide-react';

const TimelineSuggestionNotification = ({
  suggestion,
  onAccept,
  onDismiss,
  onPermanentDismiss,
  onViewDetails,
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'add_frequent_task':
        return <Plus className="h-5 w-5 text-green-600" />;
      case 'remove_unused_task':
        return <Minus className="h-5 w-5 text-orange-600" />;
      case 'adjust_timing':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'template_improvement':
        return <Target className="h-5 w-5 text-purple-600" />;
      case 'seasonal_adjustment':
        return <TrendingUp className="h-5 w-5 text-teal-600" />;
      case 'recurring_pattern':
        return <Settings className="h-5 w-5 text-indigo-600" />;
      default:
        return <Lightbulb className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getConfidenceText = (score) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Bell className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Bell className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  if (compact) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getSuggestionIcon(suggestion.suggestion_type)}
            <p className="text-sm font-medium text-blue-800">
              {suggestion.suggestion_title}
            </p>
            <span className={`px-2 py-1 rounded text-xs ${getConfidenceColor(suggestion.confidence_score)}`}>
              {Math.round(suggestion.confidence_score * 100)}%
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-blue-600 hover:text-blue-800"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={onAccept}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              onClick={onDismiss}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-2 text-sm text-blue-700">
            {suggestion.suggestion_description}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getSuggestionIcon(suggestion.suggestion_type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900">
              {suggestion.suggestion_title}
            </h4>
            {getPriorityIcon(suggestion.priority)}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence_score)}`}>
              {getConfidenceText(suggestion.confidence_score)} Confidence
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {suggestion.suggestion_description}
          </p>

          {suggestion.event_pattern && (
            <p className="text-xs text-gray-500 mb-3">
              For {suggestion.event_pattern} events
            </p>
          )}

          {showDetails && (
            <div className="bg-gray-50 rounded p-3 mb-3">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Details:</h5>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(suggestion.suggestion_data, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
              >
                {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{showDetails ? 'Hide' : 'Show'} details</span>
              </button>
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(suggestion)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  View in timeline
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onDismiss}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
              >
                Not now
              </button>
              <button
                onClick={onPermanentDismiss}
                className="px-3 py-1 text-xs text-red-600 hover:text-red-800 border border-red-300 rounded"
              >
                Don't suggest this
              </button>
              <button
                onClick={onAccept}
                className="px-4 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <CheckCircle className="h-3 w-3 inline mr-1" />
                Apply Suggestion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineSuggestionNotification;