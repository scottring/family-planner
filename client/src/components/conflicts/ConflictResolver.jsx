import { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  MapPin, 
  Car, 
  Phone, 
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Settings,
  MessageCircle,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useConflictStore } from '../../stores/conflictStore';
import { useEventStore } from '../../stores/eventStore';
import { useFamilyStore } from '../../stores/familyStore';
import { format } from 'date-fns';

const ConflictResolver = ({ 
  conflict, 
  onResolved, 
  onCancel,
  className = ''
}) => {
  const { 
    resolveConflict, 
    getResolutionSuggestions,
    resolving 
  } = useConflictStore();
  
  const { 
    updateEvent, 
    reassignEvent,
    updateAssignmentStatus 
  } = useEventStore();
  
  const { 
    familyMembers 
  } = useFamilyStore();

  const [selectedResolution, setSelectedResolution] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [customResolution, setCustomResolution] = useState('');
  const [resolutionData, setResolutionData] = useState({});
  const [activeTab, setActiveTab] = useState('quick');

  useEffect(() => {
    if (conflict) {
      loadAISuggestions();
    }
  }, [conflict]);

  const loadAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const suggestions = await getResolutionSuggestions(conflict);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleQuickResolve = async (suggestion) => {
    try {
      await resolveConflict(conflict.id, {
        actions: [suggestion],
        data: { 
          type: 'quick_resolve',
          suggestion: suggestion,
          timestamp: new Date().toISOString()
        }
      });
      onResolved && onResolved();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const handleCustomResolve = async () => {
    if (!customResolution.trim()) return;

    try {
      await resolveConflict(conflict.id, {
        actions: [customResolution],
        data: { 
          type: 'custom_resolve',
          resolution: customResolution,
          additional_data: resolutionData,
          timestamp: new Date().toISOString()
        }
      });
      onResolved && onResolved();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const handleAdvancedResolve = async (resolutionType) => {
    try {
      let actions = [];
      let data = { type: resolutionType, timestamp: new Date().toISOString() };

      switch (resolutionType) {
        case 'reassign_event':
          if (resolutionData.newAssigneeId && resolutionData.eventId) {
            actions.push(`Reassigned event to ${getPersonName(resolutionData.newAssigneeId)}`);
            data.event_id = resolutionData.eventId;
            data.new_assignee_id = resolutionData.newAssigneeId;
            
            // Actually perform the reassignment
            await reassignEvent(resolutionData.eventId, resolutionData.newAssigneeId);
          }
          break;
          
        case 'reschedule_event':
          if (resolutionData.eventId && resolutionData.newTime) {
            actions.push(`Rescheduled event to ${format(new Date(resolutionData.newTime), 'MMM d, HH:mm')}`);
            data.event_id = resolutionData.eventId;
            data.new_time = resolutionData.newTime;
            
            // Update the event time
            await updateEvent(resolutionData.eventId, {
              start_time: resolutionData.newTime,
              end_time: new Date(new Date(resolutionData.newTime).getTime() + 60 * 60 * 1000).toISOString()
            });
          }
          break;
          
        case 'setup_carpool':
          if (resolutionData.carpoolDetails) {
            actions.push(`Set up carpool coordination`);
            data.carpool_details = resolutionData.carpoolDetails;
          }
          break;
          
        case 'emergency_contact':
          if (resolutionData.contactInfo) {
            actions.push(`Activated emergency contact protocol`);
            data.contact_info = resolutionData.contactInfo;
          }
          break;
      }

      await resolveConflict(conflict.id, { actions, data });
      onResolved && onResolved();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const getPersonName = (userId) => {
    const member = familyMembers.find(m => m.id === userId);
    return member ? member.name : `Person ${userId}`;
  };

  const getAffectedEvents = () => {
    // This would normally come from the event store
    return conflict.affected_events || [];
  };

  const getAffectedUsers = () => {
    return conflict.affected_users || [];
  };

  if (!conflict) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg max-w-4xl ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Resolve: {conflict.title}
              </h2>
              <p className="text-sm text-gray-600">{conflict.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              conflict.severity === 'critical' ? 'bg-red-100 text-red-800' :
              conflict.severity === 'high' ? 'bg-orange-100 text-orange-800' :
              conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {conflict.severity.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'quick', name: 'Quick Actions', icon: CheckCircle },
            { id: 'advanced', name: 'Advanced Resolution', icon: Settings },
            { id: 'custom', name: 'Custom Solution', icon: MessageCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {/* Conflict Details */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Type:</span>
              <span className="ml-2 text-gray-900">
                {conflict.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Detected:</span>
              <span className="ml-2 text-gray-900">
                {format(new Date(conflict.detected_at), 'MMM d, HH:mm')}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Events:</span>
              <span className="ml-2 text-gray-900">
                {getAffectedEvents().length} affected
              </span>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'quick' && (
          <QuickActions
            conflict={conflict}
            aiSuggestions={aiSuggestions}
            loadingSuggestions={loadingSuggestions}
            onResolve={handleQuickResolve}
            resolving={resolving[conflict.id]}
          />
        )}

        {activeTab === 'advanced' && (
          <AdvancedResolution
            conflict={conflict}
            familyMembers={familyMembers}
            resolutionData={resolutionData}
            setResolutionData={setResolutionData}
            onResolve={handleAdvancedResolve}
            resolving={resolving[conflict.id]}
            getAffectedEvents={getAffectedEvents}
            getAffectedUsers={getAffectedUsers}
          />
        )}

        {activeTab === 'custom' && (
          <CustomResolution
            customResolution={customResolution}
            setCustomResolution={setCustomResolution}
            resolutionData={resolutionData}
            setResolutionData={setResolutionData}
            onResolve={handleCustomResolve}
            resolving={resolving[conflict.id]}
          />
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const QuickActions = ({ 
  conflict, 
  aiSuggestions, 
  loadingSuggestions, 
  onResolve, 
  resolving 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <h3 className="text-lg font-medium">AI-Powered Suggestions</h3>
      </div>

      {loadingSuggestions ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2 mt-2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(conflict.resolution_suggestions || []).map((suggestion, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{suggestion}</p>
                  {aiSuggestions?.primary_suggestions?.includes(suggestion) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                      AI Recommended
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onResolve(suggestion)}
                disabled={resolving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resolving ? 'Resolving...' : 'Apply'}
              </button>
            </div>
          ))}
        </div>
      )}

      {aiSuggestions?.alternative_suggestions && aiSuggestions.alternative_suggestions.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Alternative Options:</h4>
          <div className="space-y-2">
            {aiSuggestions.alternative_suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50"
              >
                <div className="flex items-start space-x-3">
                  <ArrowRight className="h-4 w-4 text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-700">{suggestion}</p>
                </div>
                <button
                  onClick={() => onResolve(suggestion)}
                  disabled={resolving}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AdvancedResolution = ({ 
  conflict, 
  familyMembers, 
  resolutionData, 
  setResolutionData, 
  onResolve, 
  resolving,
  getAffectedEvents,
  getAffectedUsers
}) => {
  const [selectedAction, setSelectedAction] = useState(null);

  const actionTypes = {
    reassign_event: {
      title: 'Reassign Event',
      icon: UserPlus,
      description: 'Change who is responsible for an event',
      applicable: conflict.type === 'time_overlap' || conflict.type === 'unassigned_critical'
    },
    reschedule_event: {
      title: 'Reschedule Event',
      icon: Calendar,
      description: 'Move an event to a different time',
      applicable: conflict.type === 'time_overlap' || conflict.type === 'location_travel'
    },
    setup_carpool: {
      title: 'Setup Carpool',
      icon: Car,
      description: 'Coordinate shared transportation',
      applicable: conflict.type === 'location_travel'
    },
    emergency_contact: {
      title: 'Emergency Contact',
      icon: Phone,
      description: 'Activate backup person or emergency protocol',
      applicable: conflict.severity === 'critical'
    }
  };

  const availableActions = Object.entries(actionTypes).filter(([key, action]) => 
    action.applicable
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Advanced Resolution Options</h3>

      {/* Action Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableActions.map(([key, action]) => {
          const Icon = action.icon;
          return (
            <div
              key={key}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedAction === key 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedAction(key)}
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">{action.title}</h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Configuration */}
      {selectedAction && (
        <div className="bg-gray-50 rounded-lg p-4">
          <ActionConfiguration
            actionType={selectedAction}
            conflict={conflict}
            familyMembers={familyMembers}
            resolutionData={resolutionData}
            setResolutionData={setResolutionData}
            getAffectedEvents={getAffectedEvents}
          />
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => onResolve(selectedAction)}
              disabled={resolving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resolving ? 'Applying...' : `Apply ${actionTypes[selectedAction].title}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionConfiguration = ({ 
  actionType, 
  conflict, 
  familyMembers, 
  resolutionData, 
  setResolutionData,
  getAffectedEvents
}) => {
  const updateData = (key, value) => {
    setResolutionData(prev => ({ ...prev, [key]: value }));
  };

  switch (actionType) {
    case 'reassign_event':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event to Reassign:
            </label>
            <select
              value={resolutionData.eventId || ''}
              onChange={(e) => updateData('eventId', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Choose event...</option>
              {getAffectedEvents().map((eventId) => (
                <option key={eventId} value={eventId}>
                  Event {eventId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to:
            </label>
            <select
              value={resolutionData.newAssigneeId || ''}
              onChange={(e) => updateData('newAssigneeId', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Choose person...</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );

    case 'reschedule_event':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event to Reschedule:
            </label>
            <select
              value={resolutionData.eventId || ''}
              onChange={(e) => updateData('eventId', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Choose event...</option>
              {getAffectedEvents().map((eventId) => (
                <option key={eventId} value={eventId}>
                  Event {eventId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Date & Time:
            </label>
            <input
              type="datetime-local"
              value={resolutionData.newTime || ''}
              onChange={(e) => updateData('newTime', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      );

    case 'setup_carpool':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carpool Coordinator:
            </label>
            <select
              value={resolutionData.carpoolDetails?.coordinator || ''}
              onChange={(e) => updateData('carpoolDetails', { 
                ...resolutionData.carpoolDetails, 
                coordinator: e.target.value 
              })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Choose coordinator...</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Details:
            </label>
            <textarea
              value={resolutionData.carpoolDetails?.details || ''}
              onChange={(e) => updateData('carpoolDetails', { 
                ...resolutionData.carpoolDetails, 
                details: e.target.value 
              })}
              placeholder="Pickup location, time, contact info..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>
      );

    case 'emergency_contact':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Contact:
            </label>
            <input
              type="text"
              value={resolutionData.contactInfo?.name || ''}
              onChange={(e) => updateData('contactInfo', { 
                ...resolutionData.contactInfo, 
                name: e.target.value 
              })}
              placeholder="Contact name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number:
            </label>
            <input
              type="tel"
              value={resolutionData.contactInfo?.phone || ''}
              onChange={(e) => updateData('contactInfo', { 
                ...resolutionData.contactInfo, 
                phone: e.target.value 
              })}
              placeholder="Phone number"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions:
            </label>
            <textarea
              value={resolutionData.contactInfo?.instructions || ''}
              onChange={(e) => updateData('contactInfo', { 
                ...resolutionData.contactInfo, 
                instructions: e.target.value 
              })}
              placeholder="Special instructions or backup plan..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};

const CustomResolution = ({ 
  customResolution, 
  setCustomResolution, 
  resolutionData, 
  setResolutionData, 
  onResolve, 
  resolving 
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Resolution:
        </label>
        <textarea
          value={customResolution}
          onChange={(e) => setCustomResolution(e.target.value)}
          placeholder="Describe how you resolved this conflict..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Notes (Optional):
        </label>
        <textarea
          value={resolutionData.notes || ''}
          onChange={(e) => setResolutionData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any additional details or follow-up actions..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          rows={3}
        />
      </div>

      <div className="pt-4">
        <button
          onClick={onResolve}
          disabled={resolving || !customResolution.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resolving ? 'Resolving...' : 'Mark as Resolved'}
        </button>
      </div>
    </div>
  );
};

export default ConflictResolver;