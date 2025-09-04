import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  Star
} from 'lucide-react';
import { usePlanningStore } from '../../stores/planningStore';
import { useTaskStore } from '../../stores/taskStore';
import { useEventStore } from '../../stores/eventStore';
import { useFamilyStore } from '../../stores/familyStore';

const SessionReview = ({ sessionId, onProgress, onComplete }) => {
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState('all');
  
  const { getWeeklyAnalytics } = usePlanningStore();
  const { tasks } = useTaskStore();
  const { events } = useEventStore();
  const { familyMembers } = useFamilyStore();

  useEffect(() => {
    fetchReviewData();
  }, [selectedMember]);

  useEffect(() => {
    // Update progress as user interacts with review
    if (reviewData) {
      onProgress?.(0.3); // Initial data load
    }
  }, [reviewData, onProgress]);

  const fetchReviewData = async () => {
    setLoading(true);
    try {
      // Get last week's date range
      const today = new Date();
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay()); // Start of this week
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 7);

      const analytics = await getWeeklyAnalytics(lastWeekStart, lastWeekEnd, selectedMember);
      setReviewData(analytics);
    } catch (error) {
      console.error('Failed to fetch review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = () => {
    if (!reviewData) return [];

    const insights = [];
    const { completion, responsibilities, timeSpent } = reviewData;

    // Completion rate insights
    if (completion.rate >= 85) {
      insights.push({
        type: 'success',
        icon: Star,
        title: 'Excellent Performance!',
        message: `${completion.rate}% completion rate - you're crushing it!`,
        priority: 'high'
      });
    } else if (completion.rate < 50) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Room for Improvement',
        message: `${completion.rate}% completion rate. Consider reviewing task priorities.`,
        priority: 'high'
      });
    }

    // Workload distribution insights
    const workloadImbalance = Math.max(...responsibilities.distribution) - Math.min(...responsibilities.distribution);
    if (workloadImbalance > 5) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        title: 'Workload Imbalance Detected',
        message: 'Consider redistributing tasks for better balance.',
        priority: 'medium'
      });
    }

    // Time management insights
    if (timeSpent.categories.personal > timeSpent.categories.family * 2) {
      insights.push({
        type: 'info',
        icon: Clock,
        title: 'Focus on Family Time',
        message: 'More personal tasks than family activities last week.',
        priority: 'medium'
      });
    }

    // Missed events/tasks
    if (completion.missed > 0) {
      insights.push({
        type: 'warning',
        icon: XCircle,
        title: `${completion.missed} Items Missed`,
        message: 'Review scheduling and capacity planning.',
        priority: 'medium'
      });
    }

    return insights.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
  };

  const insights = generateInsights();

  const handleMarkReviewed = (itemType, itemId) => {
    // Mark item as reviewed
    onProgress?.(0.6);
  };

  const handleCompleteReview = () => {
    onProgress?.(1.0);
    onComplete?.();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Last Week Review</h3>
          <p className="text-gray-600">Analyze performance and identify improvement areas</p>
        </div>
        
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Family Members</option>
          {familyMembers.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </div>

      {reviewData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-900">{reviewData.completion.rate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-green-600 mt-1">
                {reviewData.completion.completed} of {reviewData.completion.total} items
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Time Efficiency</p>
                  <p className="text-2xl font-bold text-blue-900">{reviewData.efficiency.score}%</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {reviewData.efficiency.onTime} items completed on time
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Family Events</p>
                  <p className="text-2xl font-bold text-purple-900">{reviewData.events.family}</p>
                </div>
                <PieChart className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {reviewData.events.total} total events
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Balance Score</p>
                  <p className="text-2xl font-bold text-orange-900">{reviewData.balance.score}/10</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Work-life balance rating
              </p>
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                Weekly Insights
              </h4>
              <div className="space-y-3">
                {insights.map((insight, index) => {
                  const Icon = insight.icon;
                  const colors = {
                    success: 'green',
                    warning: 'yellow',
                    info: 'blue',
                    error: 'red'
                  };
                  const color = colors[insight.type];
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 p-3 bg-${color}-50 border border-${color}-200 rounded-lg`}
                    >
                      <Icon className={`h-5 w-5 text-${color}-600 mt-0.5`} />
                      <div className="flex-1">
                        <h5 className={`font-medium text-${color}-800`}>{insight.title}</h5>
                        <p className={`text-sm text-${color}-700`}>{insight.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Responsibility Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Responsibility Distribution</h4>
              <div className="space-y-3">
                {reviewData.responsibilities.members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: member.color || '#6B7280' }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{member.name}</span>
                        <span className="text-sm text-gray-600">{member.completed}/{member.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(member.completed / member.total) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round((member.completed / member.total) * 100)}% completion rate
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Spent by Category */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Time Allocation</h4>
              <div className="space-y-3">
                {Object.entries(reviewData.timeSpent.categories).map(([category, hours]) => {
                  const percentage = (hours / reviewData.timeSpent.total) * 100;
                  const colors = {
                    family: 'bg-purple-500',
                    personal: 'bg-blue-500',
                    work: 'bg-green-500',
                    household: 'bg-yellow-500',
                    other: 'bg-gray-500'
                  };
                  
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 capitalize">{category}</span>
                        <span className="text-gray-600">{hours}h ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${colors[category] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Missed Items Review */}
          {reviewData.missedItems && reviewData.missedItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-3 flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                Items That Didn't Get Done ({reviewData.missedItems.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reviewData.missedItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-2 bg-white rounded border border-red-100">
                    <div className="flex-1">
                      <p className="font-medium text-red-900">{item.title}</p>
                      <p className="text-sm text-red-700">
                        {item.type === 'task' ? 'Task' : 'Event'} • Due: {new Date(item.due_date || item.start_time).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarkReviewed(item.type, item.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Reschedule
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Items Celebration */}
          {reviewData.completedItems && reviewData.completedItems.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Wins & Accomplishments ({reviewData.completedItems.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reviewData.completedItems.slice(0, 10).map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center space-x-3 p-2 bg-white rounded border border-green-100">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">{item.title}</p>
                      <p className="text-sm text-green-700">
                        Completed {new Date(item.completed_at).toLocaleDateString()}
                        {item.assigned_to && ` • ${item.assigned_to}`}
                      </p>
                    </div>
                  </div>
                ))}
                {reviewData.completedItems.length > 10 && (
                  <p className="text-sm text-green-600 text-center py-2">
                    + {reviewData.completedItems.length - 10} more completed items
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Review your week's performance and identify areas for improvement
        </div>
        <button
          onClick={handleCompleteReview}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Complete Review
        </button>
      </div>
    </div>
  );
};

export default SessionReview;