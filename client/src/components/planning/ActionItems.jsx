import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Send,
  Users,
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  Download,
  FileText,
  Share2,
  Bell,
  CheckSquare,
  AlertTriangle,
  User,
  Target,
  ArrowRight,
  ExternalLink,
  Smartphone,
  X,
  Check,
  Copy,
  Eye,
  EyeOff,
  Lightbulb,
  BarChart3,
  Settings,
  RefreshCw,
  Loader2,
  Star,
  Hash
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useEventStore } from '../../stores/eventStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { usePlanningStore } from '../../stores/planningStore';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';

const ActionItems = ({ sessionId, onProgress, onComplete }) => {
  // State management
  const [actionState, setActionState] = useState({
    confirmations: {
      assignmentsReviewed: false,
      partnersNotified: false,
      calendarSynced: false,
      backupPlanReady: false
    },
    notifications: {
      sendSummary: true,
      sendIndividualTasks: true,
      sendCalendarInvites: true,
      enableReminders: true
    },
    exportOptions: {
      format: 'pdf', // pdf, email, calendar
      includeDetails: true,
      shareWithFamily: true
    },
    communication: {
      customMessage: '',
      urgentItems: new Set(),
      scheduledSendTime: null
    }
  });

  const [viewState, setViewState] = useState({
    activeTab: 'summary', // summary, notifications, export, review
    expandedAssignees: new Set(),
    showAdvanced: false
  });

  const [processingState, setProcessingState] = useState({
    isLoading: false,
    sendingNotifications: false,
    exportingData: false,
    error: null,
    successMessage: null
  });

  // Store hooks
  const { 
    tasks, 
    fetchTasks, 
    getTasksByAssignee,
    getTasksByStatus,
    isLoading: taskLoading 
  } = useTaskStore();
  
  const { 
    events, 
    fetchEvents,
    getEventsForWeek,
    isLoading: eventLoading 
  } = useEventStore();
  
  const { 
    sendUrgentAlert,
    sendHandoffNotification,
    preferences,
    fetchPreferences,
    isLoading: notificationLoading 
  } = useNotificationStore();
  
  const { 
    currentSession,
    sessionProgress,
    getQuadrantData,
    updateQuadrantProgress,
    completeSession
  } = usePlanningStore();
  
  const { familyMembers, fetchFamilyMembers } = useFamilyStore();
  const { user } = useAuthStore();

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setProcessingState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        await Promise.all([
          fetchTasks(),
          fetchEvents(),
          fetchFamilyMembers(),
          fetchPreferences()
        ]);
      } catch (error) {
        setProcessingState(prev => ({ 
          ...prev, 
          error: 'Failed to load planning data. Please refresh and try again.',
          isLoading: false 
        }));
      } finally {
        setProcessingState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadData();
  }, [fetchTasks, fetchEvents, fetchFamilyMembers, fetchPreferences]);

  // Get committed tasks and events from planning session
  const sessionData = useMemo(() => {
    const commitmentData = getQuadrantData('commitment') || {};
    const calendarData = getQuadrantData('calendar') || {};
    
    // Get committed tasks
    const committedTasks = (commitmentData.selectedTasks || []).map(taskId => {
      const task = tasks.find(t => t.id === taskId);
      const assignment = commitmentData.taskAssignments?.[taskId];
      return task ? { ...task, sessionAssignment: assignment } : null;
    }).filter(Boolean);

    // Get events for this week
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEvents = getEventsForWeek(startOfWeek);

    return {
      tasks: committedTasks,
      events: weekEvents,
      commitmentMetrics: commitmentData.metrics || {},
      calendarChanges: calendarData.changes || []
    };
  }, [getQuadrantData, tasks, events, getEventsForWeek]);

  // Organize assignments by family member
  const assignmentsByMember = useMemo(() => {
    const assignments = {};
    
    // Initialize with all family members
    familyMembers.forEach(member => {
      assignments[member.id] = {
        member,
        tasks: [],
        events: [],
        totalHours: 0,
        priorities: { high: 0, medium: 0, low: 0 }
      };
    });

    // Add unassigned category
    assignments.unassigned = {
      member: { id: 'unassigned', name: 'Unassigned', type: 'system' },
      tasks: [],
      events: [],
      totalHours: 0,
      priorities: { high: 0, medium: 0, low: 0 }
    };

    // Categorize tasks
    sessionData.tasks.forEach(task => {
      const assigneeId = task.sessionAssignment?.assignedTo || task.assigned_to || 'unassigned';
      if (assignments[assigneeId]) {
        assignments[assigneeId].tasks.push(task);
        assignments[assigneeId].totalHours += task.sessionAssignment?.estimatedHours || 1;
        
        const priority = task.sessionAssignment?.priority || task.priority || 3;
        if (priority >= 4) assignments[assigneeId].priorities.high++;
        else if (priority >= 3) assignments[assigneeId].priorities.medium++;
        else assignments[assigneeId].priorities.low++;
      }
    });

    // Categorize events
    sessionData.events.forEach(event => {
      const assigneeId = event.assigned_to || event.created_by || 'unassigned';
      if (assignments[assigneeId]) {
        assignments[assigneeId].events.push(event);
      }
    });

    return assignments;
  }, [sessionData, familyMembers]);

  // Calculate completion progress
  const completionProgress = useMemo(() => {
    const confirmationsCount = Object.values(actionState.confirmations).filter(Boolean).length;
    const totalConfirmations = Object.keys(actionState.confirmations).length;
    return totalConfirmations > 0 ? confirmationsCount / totalConfirmations : 0;
  }, [actionState.confirmations]);

  // Update progress
  useEffect(() => {
    onProgress?.(completionProgress * 0.9); // Leave 10% for final completion
  }, [completionProgress, onProgress]);

  // Handle confirmation toggle
  const handleConfirmationChange = (key, checked) => {
    setActionState(prev => ({
      ...prev,
      confirmations: {
        ...prev.confirmations,
        [key]: checked
      }
    }));
  };

  // Handle notification settings
  const handleNotificationChange = (key, checked) => {
    setActionState(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: checked
      }
    }));
  };

  // Send notifications to family members
  const sendNotifications = async () => {
    setProcessingState(prev => ({ ...prev, sendingNotifications: true, error: null }));
    
    try {
      const notifications = [];
      
      // Send individual task assignments
      if (actionState.notifications.sendIndividualTasks) {
        for (const [assigneeId, assignment] of Object.entries(assignmentsByMember)) {
          if (assigneeId !== 'unassigned' && assignment.tasks.length > 0) {
            const member = assignment.member;
            const taskList = assignment.tasks.map(t => `• ${t.title}`).join('\n');
            
            notifications.push(
              sendUrgentAlert(
                `Weekly Tasks Assigned - ${member.name}`,
                `Hi ${member.name}! You have ${assignment.tasks.length} tasks assigned for this week:\n\n${taskList}\n\nTotal estimated time: ${assignment.totalHours} hours.\n\n${actionState.communication.customMessage || 'Let me know if you have any questions!'}`,
                member.id,
                {
                  type: 'weekly_assignment',
                  sessionId,
                  taskCount: assignment.tasks.length,
                  estimatedHours: assignment.totalHours
                }
              )
            );
          }
        }
      }

      // Send weekly summary
      if (actionState.notifications.sendSummary) {
        const totalTasks = sessionData.tasks.length;
        const totalEvents = sessionData.events.length;
        const totalHours = Object.values(assignmentsByMember).reduce((sum, a) => sum + a.totalHours, 0);
        
        notifications.push(
          sendUrgentAlert(
            'Weekly Planning Complete!',
            `Our weekly planning session is complete! 📋\n\n` +
            `📊 Summary:\n• ${totalTasks} tasks committed\n• ${totalEvents} events scheduled\n• ${totalHours} total estimated hours\n• ${familyMembers.length} family members involved\n\n` +
            `${actionState.communication.customMessage || 'Everyone check your individual assignments. Let\'s make it a great week!'}`,
            null, // Send to all
            {
              type: 'weekly_summary',
              sessionId,
              metrics: sessionData.commitmentMetrics
            }
          )
        );
      }

      await Promise.all(notifications);
      
      setProcessingState(prev => ({ 
        ...prev, 
        sendingNotifications: false,
        successMessage: 'Notifications sent successfully!'
      }));

      // Auto-check the notification confirmation
      handleConfirmationChange('partnersNotified', true);
      
    } catch (error) {
      console.error('Error sending notifications:', error);
      setProcessingState(prev => ({ 
        ...prev, 
        sendingNotifications: false,
        error: 'Failed to send notifications. Please try again.'
      }));
    }
  };

  // Export weekly plan
  const exportWeeklyPlan = async () => {
    setProcessingState(prev => ({ ...prev, exportingData: true, error: null }));
    
    try {
      // Create export data
      const exportData = {
        sessionInfo: {
          id: sessionId,
          date: new Date().toISOString(),
          participants: familyMembers.map(m => m.name).join(', ')
        },
        summary: {
          totalTasks: sessionData.tasks.length,
          totalEvents: sessionData.events.length,
          totalHours: Object.values(assignmentsByMember).reduce((sum, a) => sum + a.totalHours, 0),
          completionRate: sessionData.commitmentMetrics.completionRate || 0
        },
        assignments: assignmentsByMember,
        tasks: sessionData.tasks,
        events: sessionData.events
      };

      // For now, create a downloadable JSON file
      // In a real implementation, this would integrate with PDF generation or email services
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `weekly-plan-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProcessingState(prev => ({ 
        ...prev, 
        exportingData: false,
        successMessage: 'Weekly plan exported successfully!'
      }));

      // Auto-check the export confirmation
      handleConfirmationChange('calendarSynced', true);
      
    } catch (error) {
      console.error('Error exporting data:', error);
      setProcessingState(prev => ({ 
        ...prev, 
        exportingData: false,
        error: 'Failed to export data. Please try again.'
      }));
    }
  };

  // Complete planning session
  const handleCompleteSession = async () => {
    // Validate all confirmations are checked
    const allConfirmed = Object.values(actionState.confirmations).every(Boolean);
    if (!allConfirmed) {
      setProcessingState(prev => ({ 
        ...prev, 
        error: 'Please complete all confirmation items before finishing the session.'
      }));
      return;
    }

    setProcessingState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Save final action data to session
      updateQuadrantProgress('actions', {
        confirmations: actionState.confirmations,
        notifications: actionState.notifications,
        exportOptions: actionState.exportOptions,
        communication: actionState.communication,
        timestamp: new Date().toISOString()
      });

      // Complete the planning session
      await completeSession();
      
      onProgress?.(1.0);
      onComplete?.();
      
    } catch (error) {
      console.error('Error completing session:', error);
      setProcessingState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Failed to complete session. Please try again.'
      }));
    }
  };

  // Tab definitions
  const tabs = [
    { id: 'summary', label: 'Assignment Summary', icon: Users },
    { id: 'notifications', label: 'Send Notifications', icon: Bell },
    { id: 'export', label: 'Export & Share', icon: Share2 },
    { id: 'review', label: 'Final Review', icon: CheckSquare }
  ];

  // Clear messages after timeout
  useEffect(() => {
    if (processingState.successMessage) {
      const timer = setTimeout(() => {
        setProcessingState(prev => ({ ...prev, successMessage: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [processingState.successMessage]);

  if (processingState.isLoading || taskLoading || eventLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading planning session data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Action Items & Final Review</h2>
        <p className="text-gray-600">
          Review assignments, send notifications, and complete your weekly planning session
        </p>
      </div>

      {/* Error/Success Messages */}
      {processingState.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{processingState.error}</p>
            </div>
            <button
              onClick={() => setProcessingState(prev => ({ ...prev, error: null }))}
              className="text-red-400 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {processingState.successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">{processingState.successMessage}</p>
            </div>
            <button
              onClick={() => setProcessingState(prev => ({ ...prev, successMessage: null }))}
              className="text-green-400 hover:text-green-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Session Progress</span>
          <span className="text-sm text-gray-600">{Math.round(completionProgress * 100)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewState(prev => ({ ...prev, activeTab: tab.id }))}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  viewState.activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Assignment Summary Tab */}
          {viewState.activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assignment Summary</h3>
                <div className="text-sm text-gray-600">
                  {sessionData.tasks.length} tasks • {sessionData.events.length} events
                </div>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-900">{sessionData.tasks.length}</div>
                  <div className="text-sm text-blue-700">Tasks Committed</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-900">{sessionData.events.length}</div>
                  <div className="text-sm text-green-700">Events Scheduled</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-900">
                    {Object.values(assignmentsByMember).reduce((sum, a) => sum + a.totalHours, 0)}h
                  </div>
                  <div className="text-sm text-purple-700">Total Hours</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-900">{familyMembers.length}</div>
                  <div className="text-sm text-orange-700">Family Members</div>
                </div>
              </div>

              {/* Assignments by Family Member */}
              <div className="space-y-4">
                {Object.entries(assignmentsByMember).map(([assigneeId, assignment]) => {
                  if (assignment.tasks.length === 0 && assignment.events.length === 0) return null;
                  
                  const isExpanded = viewState.expandedAssignees.has(assigneeId);
                  const totalItems = assignment.tasks.length + assignment.events.length;
                  
                  return (
                    <div key={assigneeId} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(viewState.expandedAssignees);
                          if (isExpanded) {
                            newExpanded.delete(assigneeId);
                          } else {
                            newExpanded.add(assigneeId);
                          }
                          setViewState(prev => ({ ...prev, expandedAssignees: newExpanded }));
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-800">
                              {assignment.member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-left">
                            <h4 className="font-medium text-gray-900">{assignment.member.name}</h4>
                            <p className="text-sm text-gray-600">
                              {assignment.tasks.length} tasks, {assignment.events.length} events • {assignment.totalHours}h estimated
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                              <span>{assignment.priorities.high}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                              <span>{assignment.priorities.medium}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span>{assignment.priorities.low}</span>
                            </div>
                          </div>
                          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          {/* Tasks */}
                          {assignment.tasks.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Tasks ({assignment.tasks.length})</h5>
                              <div className="space-y-2">
                                {assignment.tasks.map(task => (
                                  <div key={task.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${
                                        (task.sessionAssignment?.priority || task.priority) >= 4 ? 'bg-red-400' :
                                        (task.sessionAssignment?.priority || task.priority) >= 3 ? 'bg-yellow-400' : 'bg-green-400'
                                      }`} />
                                      <span className="text-sm text-gray-900">{task.title}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {task.sessionAssignment?.estimatedHours || 1}h
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Events */}
                          {assignment.events.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Events ({assignment.events.length})</h5>
                              <div className="space-y-2">
                                {assignment.events.map(event => (
                                  <div key={event.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3 h-3 text-blue-500" />
                                      <span className="text-sm text-gray-900">{event.title}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {new Date(event.start_time).toLocaleDateString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {viewState.activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Send Notifications</h3>

              {/* Notification Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={actionState.notifications.sendSummary}
                    onChange={(e) => handleNotificationChange('sendSummary', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Weekly Summary</div>
                    <div className="text-sm text-gray-600">Send overview to all family members</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={actionState.notifications.sendIndividualTasks}
                    onChange={(e) => handleNotificationChange('sendIndividualTasks', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Individual Assignments</div>
                    <div className="text-sm text-gray-600">Send personal task lists to each person</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={actionState.notifications.sendCalendarInvites}
                    onChange={(e) => handleNotificationChange('sendCalendarInvites', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Calendar Invites</div>
                    <div className="text-sm text-gray-600">Send calendar invites for all events</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={actionState.notifications.enableReminders}
                    onChange={(e) => handleNotificationChange('enableReminders', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Enable Reminders</div>
                    <div className="text-sm text-gray-600">Set up automatic reminders for tasks and events</div>
                  </div>
                </label>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={actionState.communication.customMessage}
                  onChange={(e) => setActionState(prev => ({
                    ...prev,
                    communication: { ...prev.communication, customMessage: e.target.value }
                  }))}
                  placeholder="Add a personal message to include with notifications..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              {/* Send Notifications Button */}
              <button
                onClick={sendNotifications}
                disabled={processingState.sendingNotifications}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processingState.sendingNotifications ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Notifications
                  </>
                )}
              </button>
            </div>
          )}

          {/* Export Tab */}
          {viewState.activeTab === 'export' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Export & Share</h3>

              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'pdf', label: 'PDF Report', icon: FileText, description: 'Detailed PDF with all assignments' },
                    { id: 'email', label: 'Email Summary', icon: Mail, description: 'Email-friendly format' },
                    { id: 'calendar', label: 'Calendar File', icon: Calendar, description: 'Import into calendar apps' }
                  ].map((format) => (
                    <label key={format.id} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="exportFormat"
                        value={format.id}
                        checked={actionState.exportOptions.format === format.id}
                        onChange={(e) => setActionState(prev => ({
                          ...prev,
                          exportOptions: { ...prev.exportOptions, format: e.target.value }
                        }))}
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg ${
                        actionState.exportOptions.format === format.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <format.icon className="w-5 h-5" />
                          <span className="font-medium">{format.label}</span>
                        </div>
                        <p className="text-sm text-gray-600">{format.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={actionState.exportOptions.includeDetails}
                    onChange={(e) => setActionState(prev => ({
                      ...prev,
                      exportOptions: { ...prev.exportOptions, includeDetails: e.target.checked }
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include detailed task descriptions and notes</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={actionState.exportOptions.shareWithFamily}
                    onChange={(e) => setActionState(prev => ({
                      ...prev,
                      exportOptions: { ...prev.exportOptions, shareWithFamily: e.target.checked }
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Share with all family members automatically</span>
                </label>
              </div>

              {/* Export Button */}
              <button
                onClick={exportWeeklyPlan}
                disabled={processingState.exportingData}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processingState.exportingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Weekly Plan
                  </>
                )}
              </button>
            </div>
          )}

          {/* Final Review Tab */}
          {viewState.activeTab === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Final Review</h3>

              {/* Confirmation Checklist */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-800 mb-3">Please confirm the following:</h4>
                
                {[
                  {
                    key: 'assignmentsReviewed',
                    label: 'All assignments have been reviewed and are accurate',
                    description: 'Double-check that tasks and events are assigned to the right people'
                  },
                  {
                    key: 'partnersNotified',
                    label: 'Family members have been notified of their assignments',
                    description: 'Send notifications or confirm manually that everyone knows their responsibilities'
                  },
                  {
                    key: 'calendarSynced',
                    label: 'Weekly plan has been exported or synced to calendars',
                    description: 'Ensure the plan is accessible to all family members'
                  },
                  {
                    key: 'backupPlanReady',
                    label: 'Backup plans are in place for critical items',
                    description: 'Consider what happens if someone cannot complete their assignments'
                  }
                ].map((item) => (
                  <label key={item.key} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={actionState.confirmations[item.key]}
                      onChange={(e) => handleConfirmationChange(item.key, e.target.checked)}
                      className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Session Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Session Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{sessionData.tasks.length}</div>
                    <div className="text-xs text-gray-600">Tasks Committed</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{sessionData.events.length}</div>
                    <div className="text-xs text-gray-600">Events Scheduled</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {Object.values(assignmentsByMember).reduce((sum, a) => sum + a.totalHours, 0)}h
                    </div>
                    <div className="text-xs text-gray-600">Total Hours</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {Object.keys(assignmentsByMember).filter(k => k !== 'unassigned' && assignmentsByMember[k].tasks.length > 0).length}
                    </div>
                    <div className="text-xs text-gray-600">People Involved</div>
                  </div>
                </div>
              </div>

              {/* Complete Session Button */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  {Object.values(actionState.confirmations).filter(Boolean).length} of {Object.keys(actionState.confirmations).length} items confirmed
                </div>
                
                <button
                  onClick={handleCompleteSession}
                  disabled={!Object.values(actionState.confirmations).every(Boolean) || processingState.isLoading}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
                >
                  {processingState.isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Complete Planning Session
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionItems;