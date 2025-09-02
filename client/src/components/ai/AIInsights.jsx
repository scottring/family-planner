import { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Clock, Users, Lightbulb, Calendar, Target } from 'lucide-react';
import { aiService } from '../../services/ai';

const AIInsights = ({ date = null, refreshTrigger = 0 }) => {
  const [insights, setInsights] = useState(null);
  const [dailyBrief, setDailyBrief] = useState(null);
  const [scheduleAnalysis, setScheduleAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    loadAIData();
  }, [date, refreshTrigger]);

  const loadAIData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [insightsData, briefData, analysisData] = await Promise.all([
        aiService.getInsights(),
        aiService.generateDailyBrief(date),
        date ? aiService.analyzeSchedule(date) : Promise.resolve(null)
      ]);

      setInsights(insightsData);
      setDailyBrief(briefData);
      setScheduleAnalysis(analysisData);
    } catch (err) {
      console.error('Failed to load AI data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEnrich = async () => {
    if (!insights?.enrichment_opportunities?.length) return;

    try {
      const eventIds = insights.enrichment_opportunities.map(event => event.id);
      await aiService.bulkEnrichEvents(eventIds);
      
      // Refresh data after bulk enrichment
      await loadAIData();
    } catch (err) {
      console.error('Bulk enrichment failed:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-600 animate-pulse" />
          <span className="text-sm text-gray-600">Loading AI insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">Failed to load AI insights: {error}</span>
        </div>
        <button
          onClick={loadAIData}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
          </div>
          
          {insights?.needs_enrichment > 0 && (
            <button
              onClick={handleBulkEnrich}
              className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              Enrich All Events
            </button>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 mt-3">
          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-2 text-sm font-medium border-b-2 ${
              activeTab === 'insights'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('brief')}
            className={`pb-2 text-sm font-medium border-b-2 ${
              activeTab === 'brief'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Daily Brief
          </button>
          {scheduleAnalysis && (
            <button
              onClick={() => setActiveTab('analysis')}
              className={`pb-2 text-sm font-medium border-b-2 ${
                activeTab === 'analysis'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Schedule Analysis
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'insights' && insights && (
          <InsightsOverview 
            insights={insights} 
            onEnrichmentClick={() => setActiveTab('brief')} 
          />
        )}
        
        {activeTab === 'brief' && dailyBrief && (
          <DailyBrief brief={dailyBrief} />
        )}
        
        {activeTab === 'analysis' && scheduleAnalysis && (
          <ScheduleAnalysis analysis={scheduleAnalysis} />
        )}
      </div>
    </div>
  );
};

const InsightsOverview = ({ insights, onEnrichmentClick }) => (
  <div className="space-y-4">
    {/* Quick Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-xs text-blue-600 font-medium">Upcoming Events</span>
        </div>
        <div className="text-2xl font-bold text-blue-900">{insights.upcoming_events}</div>
      </div>
      
      <div className="p-3 bg-orange-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Brain className="h-4 w-4 text-orange-600" />
          <span className="text-xs text-orange-600 font-medium">Need Enrichment</span>
        </div>
        <div className="text-2xl font-bold text-orange-900">{insights.needs_enrichment}</div>
      </div>
      
      <div className="p-3 bg-red-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-red-600" />
          <span className="text-xs text-red-600 font-medium">Overdue Tasks</span>
        </div>
        <div className="text-2xl font-bold text-red-900">{insights.overdue_tasks}</div>
      </div>
      
      <div className="p-3 bg-green-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-xs text-green-600 font-medium">Optimization Score</span>
        </div>
        <div className="text-2xl font-bold text-green-900">85%</div>
      </div>
    </div>

    {/* Enrichment Opportunities */}
    {insights.enrichment_opportunities && insights.enrichment_opportunities.length > 0 && (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start space-x-3">
          <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-800 mb-2">Events Ready for AI Enrichment</h3>
            <div className="space-y-2">
              {insights.enrichment_opportunities.slice(0, 3).map((event, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-yellow-700">{event.title}</span>
                  <span className="text-xs text-yellow-600">
                    {new Date(event.start_time).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
            {insights.enrichment_opportunities.length > 3 && (
              <p className="text-xs text-yellow-600 mt-2">
                +{insights.enrichment_opportunities.length - 3} more events
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Urgent Tasks */}
    {insights.urgent_tasks && insights.urgent_tasks.length > 0 && (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800 mb-2">Urgent Tasks</h3>
            <div className="space-y-2">
              {insights.urgent_tasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-red-700">{task.title}</span>
                  <span className="text-xs text-red-600">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* General Suggestions */}
    {insights.suggestions && insights.suggestions.length > 0 && (
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-start space-x-3">
          <Target className="h-5 w-5 text-purple-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-purple-800 mb-2">AI Recommendations</h3>
            <ul className="space-y-1">
              {insights.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-purple-700 flex items-start space-x-1">
                  <span className="w-1 h-1 bg-purple-500 rounded-full mt-2"></span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )}
  </div>
);

const DailyBrief = ({ brief }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-medium text-gray-900">
        Daily Brief for {new Date(brief.date).toLocaleDateString()}
      </h3>
      {brief.weather && (
        <div className="text-sm text-gray-600">
          {brief.weather.temp}°F, {brief.weather.condition}
        </div>
      )}
    </div>

    {/* Events Summary */}
    <div className="p-4 bg-blue-50 rounded-lg">
      <h4 className="font-medium text-blue-800 mb-2 flex items-center space-x-2">
        <Calendar className="h-4 w-4" />
        <span>Events Summary</span>
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-blue-600">Total Events</span>
          <div className="text-lg font-bold text-blue-900">{brief.events_summary.total}</div>
        </div>
        <div>
          <span className="text-orange-600">High Priority</span>
          <div className="text-lg font-bold text-orange-900">{brief.events_summary.high_priority}</div>
        </div>
        <div>
          <span className="text-purple-600">Need Prep</span>
          <div className="text-lg font-bold text-purple-900">{brief.events_summary.needs_preparation}</div>
        </div>
      </div>
    </div>

    {/* Tasks Summary */}
    <div className="p-4 bg-green-50 rounded-lg">
      <h4 className="font-medium text-green-800 mb-2 flex items-center space-x-2">
        <CheckCircle className="h-4 w-4" />
        <span>Tasks Summary</span>
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-green-600">Total Tasks</span>
          <div className="text-lg font-bold text-green-900">{brief.tasks_summary.total}</div>
        </div>
        <div>
          <span className="text-red-600">Overdue</span>
          <div className="text-lg font-bold text-red-900">{brief.tasks_summary.overdue}</div>
        </div>
        <div>
          <span className="text-yellow-600">Due Today</span>
          <div className="text-lg font-bold text-yellow-900">{brief.tasks_summary.due_today}</div>
        </div>
      </div>
    </div>

    {/* Key Reminders */}
    {brief.key_reminders && brief.key_reminders.length > 0 && (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Key Reminders</span>
        </h4>
        <ul className="space-y-1">
          {brief.key_reminders.map((reminder, index) => (
            <li key={index} className="text-sm text-yellow-700 flex items-start space-x-1">
              <span className="w-1 h-1 bg-yellow-500 rounded-full mt-2"></span>
              <span>{reminder}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Suggested Optimizations */}
    {brief.suggested_optimizations && brief.suggested_optimizations.length > 0 && (
      <div className="p-4 bg-purple-50 rounded-lg">
        <h4 className="font-medium text-purple-800 mb-2 flex items-center space-x-2">
          <Lightbulb className="h-4 w-4" />
          <span>Optimization Suggestions</span>
        </h4>
        <ul className="space-y-1">
          {brief.suggested_optimizations.map((optimization, index) => (
            <li key={index} className="text-sm text-purple-700 flex items-start space-x-1">
              <span className="w-1 h-1 bg-purple-500 rounded-full mt-2"></span>
              <span>{optimization}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const ScheduleAnalysis = ({ analysis }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-medium text-gray-900">Schedule Analysis</h3>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Optimization Score:</span>
        <span className={`text-lg font-bold ${
          analysis.optimization_score >= 80 ? 'text-green-600' :
          analysis.optimization_score >= 60 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {analysis.optimization_score}%
        </span>
      </div>
    </div>

    {/* Conflicts */}
    {analysis.conflicts && analysis.conflicts.length > 0 && (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center space-x-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h4 className="font-medium text-red-800">Schedule Conflicts</h4>
        </div>
        <div className="space-y-2">
          {analysis.conflicts.map((conflict, index) => (
            <div key={index} className="p-2 bg-white rounded border border-red-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-800">{conflict.type.replace('_', ' ')}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  conflict.severity === 'high' ? 'bg-red-100 text-red-800' :
                  conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {conflict.severity}
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">{conflict.description}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Suggestions */}
    {analysis.suggestions && analysis.suggestions.length > 0 && (
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2 mb-3">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-blue-800">Optimization Suggestions</h4>
        </div>
        <div className="space-y-2">
          {analysis.suggestions.map((suggestion, index) => (
            <div key={index} className="p-2 bg-white rounded border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">{suggestion.type.replace('_', ' ')}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  suggestion.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {suggestion.priority}
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">{suggestion.message}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Recommendations */}
    {analysis.recommendations && analysis.recommendations.length > 0 && (
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2 mb-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h4 className="font-medium text-green-800">Recommendations</h4>
        </div>
        <ul className="space-y-1">
          {analysis.recommendations.map((recommendation, index) => (
            <li key={index} className="text-sm text-green-700 flex items-start space-x-1">
              <span className="w-1 h-1 bg-green-500 rounded-full mt-2"></span>
              <span>{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export default AIInsights;