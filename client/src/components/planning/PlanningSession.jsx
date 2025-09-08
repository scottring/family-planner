import { useState, useEffect, useCallback } from 'react';
import { 
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  Clock,
  Users,
  FileCheck,
  Calendar,
  List,
  Settings,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { usePlanningStore } from '../../stores/planningStore';
import { useAuthStore } from '../../stores/authStore';
import { useFamilyStore } from '../../stores/familyStore';
import SessionReview from './SessionReview';
import InboxProcessor from './InboxProcessor';
import WeekPlanner from './WeekPlanner';
import WeekCommitment from './WeekCommitment';
import ActionItems from './ActionItems';

const PlanningSession = () => {
  const { user } = useAuthStore();
  const { familyMembers } = useFamilyStore();
  const {
    currentSession,
    sessionProgress,
    isSessionActive,
    connectedPartners,
    socket,
    isConnected,
    lastSaved,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    saveProgress,
    loadSession
  } = usePlanningStore();

  const [currentQuadrant, setCurrentQuadrant] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showResumedAlert, setShowResumedAlert] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [sessionSettings, setSessionSettings] = useState({
    duration: 90, // minutes
    autoSave: true,
    notifications: true,
    partnerSync: true
  });

  useEffect(() => {
    // Load any existing session on mount
    loadSession();
  }, [loadSession]);

  const quadrants = [
    {
      id: 'review',
      title: 'Last Week Review',
      icon: FileCheck,
      color: 'blue',
      component: SessionReview,
      description: 'Review completed and missed items from last week'
    },
    {
      id: 'inbox',
      title: 'Inbox Processing',
      icon: List,
      color: 'purple',
      component: InboxProcessor,
      description: 'Convert inbox items to tasks and events'
    },
    {
      id: 'commitment',
      title: 'Week Commitment',
      icon: CheckCircle,
      color: 'orange',
      component: WeekCommitment,
      description: 'Select and assign tasks for the upcoming week'
    },
    {
      id: 'calendar',
      title: 'Week Planning',
      icon: Calendar,
      color: 'green',
      component: WeekPlanner,
      description: 'Schedule committed tasks and events for the week'
    },
    {
      id: 'actions',
      title: 'Action Items',
      icon: Users,
      color: 'indigo',
      component: ActionItems,
      description: 'Review assignments, send notifications, and complete session'
    }
  ];

  const currentQuadrantData = quadrants[currentQuadrant];
  const CurrentQuadrantComponent = currentQuadrantData.component;

  const handleStartSession = async () => {
    setErrorMessage('');
    try {
      const session = await startSession({
        participants: [user.id, ...familyMembers.filter(m => m.id !== user.id).map(m => m.id)],
        settings: sessionSettings
      });
      
      // Show alert if session was resumed
      if (session.resumed) {
        setShowResumedAlert(true);
      }
    } catch (error) {
      console.error('Failed to start planning session:', error);
      setErrorMessage('Failed to start planning session. Please try again.');
    }
  };

  const handleCompleteQuadrant = async () => {
    const nextQuadrant = currentQuadrant + 1;
    
    try {
      setIsSaving(true);
      // Save progress
      await saveProgress();
      
      if (nextQuadrant < quadrants.length) {
        setCurrentQuadrant(nextQuadrant);
      } else {
        // All quadrants complete - finish session
        await completeSession();
      }
    } catch (error) {
      console.error('Failed to complete quadrant:', error);
      setErrorMessage('Failed to save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getProgressPercentage = () => {
    if (!currentSession) return 0;
    return Math.round(((currentQuadrant + (sessionProgress[currentQuadrantData.id]?.progress || 0)) / quadrants.length) * 100);
  };

  const formatTimeRemaining = () => {
    if (!currentSession?.startTime) return '--:--';
    const elapsed = Date.now() - new Date(currentSession.startTime).getTime();
    const remaining = (sessionSettings.duration * 60 * 1000) - elapsed;
    if (remaining <= 0) return '00:00';
    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Define the callback outside of conditional rendering to avoid hooks order issues
  const handleQuadrantProgress = useCallback((progress) => {
    // Update progress for current quadrant
    if (currentQuadrantData?.id) {
      usePlanningStore.getState().updateQuadrantProgress(currentQuadrantData.id, progress);
    }
  }, [currentQuadrantData?.id]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">
                  {errorMessage}
                </p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="flex-shrink-0 text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Resumed Session Alert */}
      {showResumedAlert && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Session Resumed</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You've rejoined an existing planning session that was already in progress.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Start fresh session
                  cancelSession().then(() => {
                    handleStartSession();
                  });
                  setShowResumedAlert(false);
                }}
                className="px-3 py-1 bg-white border border-blue-300 text-blue-800 rounded text-sm hover:bg-blue-50"
              >
                Start Fresh
              </button>
              <button
                onClick={() => setShowResumedAlert(false)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Planning Session</h1>
            <p className="text-gray-600 mt-1">
              {isSessionActive 
                ? `Phase ${currentQuadrant + 1} of ${quadrants.length}: ${currentQuadrantData.title}`
                : 'Ready to start your weekly planning session'
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            {isSessionActive && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800 animate-pulse'
              }`}>
                {isConnected ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <span>
                  {isConnected ? 'Connected' : 'Reconnecting...'}
                </span>
              </div>
            )}

            {/* Save Status */}
            {isSessionActive && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                  </>
                ) : null}
              </div>
            )}

            {/* Session Timer */}
            {isSessionActive && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatTimeRemaining()}</span>
              </div>
            )}

            {/* Connected Partners */}
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {connectedPartners.length} connected
              </span>
              <div className="flex -space-x-2">
                {connectedPartners.slice(0, 3).map((partner, idx) => (
                  <div
                    key={partner.id}
                    className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                    title={partner.name}
                  >
                    {partner.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {connectedPartners.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-semibold">
                    +{connectedPartners.length - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              aria-label="Open session settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Session Progress</span>
            <span className="text-sm text-gray-600">{getProgressPercentage()}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Phase Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-6">
          {quadrants.map((quadrant, index) => {
            const isActive = index === currentQuadrant;
            const isCompleted = index < currentQuadrant;
            const Icon = quadrant.icon;
            
            return (
              <button
                key={quadrant.id}
                onClick={() => isSessionActive && index <= currentQuadrant && setCurrentQuadrant(index)}
                disabled={!isSessionActive || index > currentQuadrant}
                className={`
                  p-3 rounded-lg border text-left transition-all duration-200
                  ${isActive 
                    ? `border-${quadrant.color}-300 bg-${quadrant.color}-50 text-${quadrant.color}-800` 
                    : isCompleted
                      ? 'border-green-300 bg-green-50 text-green-800'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }
                  ${!isSessionActive || index > currentQuadrant ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className="h-4 w-4" />
                  {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                  <span className="font-medium text-sm">{quadrant.title}</span>
                </div>
                <p className="text-xs opacity-75">{quadrant.description}</p>
              </button>
            );
          })}
        </div>

        {/* Session Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!isSessionActive ? (
              <button
                onClick={handleStartSession}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                aria-label="Start new planning session"
              >
                <Play className="h-4 w-4" />
                <span>Start Planning Session</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setConfirmAction(() => pauseSession);
                    setShowConfirmDialog(true);
                  }}
                  className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                  aria-label="Pause planning session"
                >
                  <Pause className="h-4 w-4" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await saveProgress();
                    } catch (error) {
                      setErrorMessage('Failed to save progress. Please try again.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Save current progress"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save Progress'}</span>
                </button>
                <button
                  onClick={() => {
                    setConfirmAction(() => cancelSession);
                    setShowConfirmDialog(true);
                  }}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  aria-label="End planning session"
                >
                  <span>End Session</span>
                </button>
              </>
            )}
          </div>

          {isSessionActive && (
            <button
              onClick={handleCompleteQuadrant}
              disabled={isSaving}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={currentQuadrant === quadrants.length - 1 ? 'Complete planning session' : 'Move to next phase'}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              <span>
                {currentQuadrant === quadrants.length - 1 ? 'Complete Session' : 'Next Phase'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Duration (minutes)
              </label>
              <input
                type="number"
                min="30"
                max="180"
                value={sessionSettings.duration}
                onChange={(e) => setSessionSettings({...sessionSettings, duration: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={sessionSettings.autoSave}
                  onChange={(e) => setSessionSettings({...sessionSettings, autoSave: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-save progress</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={sessionSettings.notifications}
                  onChange={(e) => setSessionSettings({...sessionSettings, notifications: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable notifications</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={sessionSettings.partnerSync}
                  onChange={(e) => setSessionSettings({...sessionSettings, partnerSync: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Real-time partner sync</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Current Quadrant Content */}
      {isSessionActive && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <CurrentQuadrantComponent 
            sessionId={currentSession?.id}
            onProgress={handleQuadrantProgress}
            onComplete={handleCompleteQuadrant}
          />
        </div>
      )}

      {/* Getting Started Instructions */}
      {!isSessionActive && !currentSession && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready for Your Weekly Planning?</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Your weekly planning session is designed to help you and your partner stay aligned, 
              process outstanding items, and prepare for the week ahead. Each session takes 60-90 minutes 
              and covers five key areas.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {quadrants.map((quadrant, index) => {
                const Icon = quadrant.icon;
                return (
                  <div key={quadrant.id} className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <div className={`w-12 h-12 bg-${quadrant.color}-100 rounded-full flex items-center justify-center mx-auto mb-2`}>
                      <Icon className={`h-6 w-6 text-${quadrant.color}-600`} />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{quadrant.title}</h4>
                    <p className="text-sm text-gray-600">{quadrant.description}</p>
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={handleStartSession}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              aria-label="Start your weekly planning session"
            >
              Start Your Planning Session
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4" role="dialog" aria-labelledby="confirm-title">
            <h3 id="confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Action
            </h3>
            <p className="text-gray-600 mb-4">
              {confirmAction === cancelSession 
                ? 'Are you sure you want to end this planning session? Any unsaved progress will be lost.'
                : 'Are you sure you want to pause this session?'
              }
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                aria-label="Cancel action"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmDialog(false);
                  if (confirmAction) {
                    try {
                      await confirmAction();
                    } catch (error) {
                      setErrorMessage('Action failed. Please try again.');
                    }
                  }
                  setConfirmAction(null);
                }}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmAction === cancelSession 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
                aria-label="Confirm action"
              >
                {confirmAction === cancelSession ? 'End Session' : 'Pause'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default PlanningSession;