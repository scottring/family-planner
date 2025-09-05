import { useState, useEffect } from 'react';
import {
  Lightbulb,
  Settings,
  BarChart3,
  Filter,
  Search,
  Clock,
  Plus,
  Minus,
  Target,
  TrendingUp,
  Eye,
  CheckCircle,
  X,
  AlertTriangle,
  Loader,
  RefreshCw
} from 'lucide-react';
import TimelineSuggestionNotification from './TimelineSuggestionNotification';

const SuggestionReviewScreen = ({ onClose, onApplySuggestion }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [insights, setInsights] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('suggestions');
  const [filters, setFilters] = useState({
    type: 'all',
    priority: 'all',
    pattern: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Load all data in parallel
      const [suggestionsRes, insightsRes, preferencesRes, statsRes] = await Promise.all([
        fetch('/api/timeline-suggestions', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/timeline-suggestions/insights', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/timeline-suggestions/preferences', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/timeline-suggestions/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!suggestionsRes.ok || !insightsRes.ok || !preferencesRes.ok || !statsRes.ok) {
        throw new Error('Failed to load data');
      }

      const [suggestionsData, insightsData, preferencesData, statsData] = await Promise.all([
        suggestionsRes.json(),
        insightsRes.json(),
        preferencesRes.json(),
        statsRes.json()
      ]);

      setSuggestions(suggestionsData);
      setInsights(insightsData);
      setPreferences(preferencesData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/timeline-suggestions/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPreferences)
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      setPreferences({ ...preferences, ...newPreferences });
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err.message);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get application details
      const appResponse = await fetch(`/api/timeline-suggestions/${suggestion.id}/apply`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!appResponse.ok) {
        throw new Error('Failed to get application details');
      }

      const applicationData = await appResponse.json();

      // Mark as accepted
      await fetch(`/api/timeline-suggestions/${suggestion.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ response: 'accepted' })
      });

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
      await fetch(`/api/timeline-suggestions/${suggestion.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          response: permanent ? 'permanently_dismissed' : 'dismissed' 
        })
      });

      // Remove from local list
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (err) {
      console.error('Error dismissing suggestion:', err);
      setError(err.message);
    }
  };

  const getFilteredSuggestions = () => {
    return suggestions.filter(suggestion => {
      // Type filter
      if (filters.type !== 'all' && suggestion.suggestion_type !== filters.type) {
        return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && suggestion.priority !== filters.priority) {
        return false;
      }

      // Pattern filter
      if (filters.pattern !== 'all' && suggestion.event_pattern !== filters.pattern) {
        return false;
      }

      // Search term
      if (searchTerm && !suggestion.suggestion_title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !suggestion.suggestion_description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  };

  const getUniqueEventPatterns = () => {
    const patterns = [...new Set(suggestions.map(s => s.event_pattern).filter(Boolean))];
    return patterns.sort();
  };

  const getSuggestionTypeIcon = (type) => {
    switch (type) {
      case 'add_frequent_task': return <Plus className="h-4 w-4" />;
      case 'remove_unused_task': return <Minus className="h-4 w-4" />;
      case 'adjust_timing': return <Clock className="h-4 w-4" />;
      case 'template_improvement': return <Target className="h-4 w-4" />;
      case 'seasonal_adjustment': return <TrendingUp className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const tabs = [
    { id: 'suggestions', label: 'Active Suggestions', icon: Lightbulb },
    { id: 'insights', label: 'Learning Insights', icon: BarChart3 },
    { id: 'settings', label: 'Preferences', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <Loader className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg">Loading suggestions...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Lightbulb className="h-6 w-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">Timeline Learning Center</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.id === 'suggestions' && suggestions.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {suggestions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-700 hover:text-red-900 mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {selectedTab === 'suggestions' && (
            <div className="h-full flex flex-col">
              {/* Filters */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search suggestions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="all">All Types</option>
                    <option value="add_frequent_task">Add Tasks</option>
                    <option value="remove_unused_task">Remove Tasks</option>
                    <option value="adjust_timing">Timing</option>
                    <option value="template_improvement">Templates</option>
                  </select>

                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  <select
                    value={filters.pattern}
                    onChange={(e) => setFilters({ ...filters, pattern: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="all">All Patterns</option>
                    {getUniqueEventPatterns().map(pattern => (
                      <option key={pattern} value={pattern}>{pattern}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="flex-1 overflow-y-auto p-4">
                {getFilteredSuggestions().length === 0 ? (
                  <div className="text-center py-12">
                    <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No suggestions found</h3>
                    <p className="text-gray-500">
                      {suggestions.length === 0 
                        ? "Complete some events to start getting personalized suggestions"
                        : "Try adjusting your filters to see more suggestions"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredSuggestions().map((suggestion) => (
                      <TimelineSuggestionNotification
                        key={suggestion.id}
                        suggestion={suggestion}
                        onAccept={() => handleAcceptSuggestion(suggestion)}
                        onDismiss={() => handleDismissSuggestion(suggestion, false)}
                        onPermanentDismiss={() => handleDismissSuggestion(suggestion, true)}
                        compact={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'insights' && (
            <div className="p-6 overflow-y-auto h-full">
              {/* Stats Overview */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Suggestions Accepted
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {stats.suggestions?.accepted_count || 0}
                    </p>
                    <p className="text-xs text-blue-600">
                      {stats.suggestions?.total_suggestions > 0 ? 
                        Math.round((stats.suggestions.accepted_count / stats.suggestions.total_suggestions) * 100) :
                        0
                      }% acceptance rate
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        Patterns Discovered
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {stats.patterns?.length || 0}
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">
                        Tasks Completed
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {stats.usage?.completed_tasks || 0}
                    </p>
                    <p className="text-xs text-purple-600">
                      {stats.usage?.total_records > 0 ? 
                        Math.round((stats.usage.completed_tasks / stats.usage.total_records) * 100) :
                        0
                      }% completion rate
                    </p>
                  </div>
                </div>
              )}

              {/* Insights List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Insights</h3>
                {insights.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No insights available yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {insights.map((insight, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {getSuggestionTypeIcon(insight.pattern_type)}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {insight.pattern_name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {insight.pattern_description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-xs text-gray-500">
                                Confidence: {Math.round(insight.confidence_score * 100)}%
                              </span>
                              <span className="text-xs text-gray-500">
                                Observations: {insight.observation_count}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                insight.strength === 'strong' ? 'bg-green-100 text-green-700' :
                                insight.strength === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {insight.strength}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'settings' && preferences && (
            <div className="p-6 overflow-y-auto h-full">
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Preferences</h3>
                
                <div className="space-y-6">
                  {/* Learning Mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Enable Learning Mode
                      </label>
                      <p className="text-sm text-gray-500">
                        Allow the system to analyze your patterns and generate suggestions
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.learning_mode}
                      onChange={(e) => updatePreferences({ learning_mode: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                  </div>

                  {/* Suggestion Frequency */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-2">
                      Suggestion Frequency
                    </label>
                    <select
                      value={preferences.suggestion_frequency}
                      onChange={(e) => updatePreferences({ suggestion_frequency: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="minimal">Minimal - Only high-confidence suggestions</option>
                      <option value="normal">Normal - Balanced suggestions</option>
                      <option value="frequent">Frequent - All relevant suggestions</option>
                    </select>
                  </div>

                  {/* Suggestion Types */}
                  <div>
                    <label className="text-sm font-medium text-gray-900 block mb-3">
                      Show Suggestions For
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferences.show_timing_suggestions}
                          onChange={(e) => updatePreferences({ show_timing_suggestions: e.target.checked })}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <label className="ml-2 text-sm text-gray-900">
                          Timing adjustments
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferences.show_task_suggestions}
                          onChange={(e) => updatePreferences({ show_task_suggestions: e.target.checked })}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <label className="ml-2 text-sm text-gray-900">
                          Task additions and removals
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferences.show_template_suggestions}
                          onChange={(e) => updatePreferences({ show_template_suggestions: e.target.checked })}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                        <label className="ml-2 text-sm text-gray-900">
                          Template improvements
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Auto-apply */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Auto-apply low-risk suggestions
                      </label>
                      <p className="text-sm text-gray-500">
                        Automatically apply suggestions with very high confidence (95%+)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.auto_apply_low_risk}
                      onChange={(e) => updatePreferences({ auto_apply_low_risk: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionReviewScreen;