import { useState, useMemo, useEffect } from 'react';
import { User, UserCheck, UserX, Clock, ArrowLeftRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { useFamilyStore } from '../../stores/familyStore';

const EventAssignment = ({ event, showLabel = true, compact = false }) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [showReassignUI, setShowReassignUI] = useState(false);
  const currentUser = useAuthStore(state => state.user);
  const { claimEvent, reassignEvent, updateAssignmentStatus } = useEventStore();
  const { familyMembers, fetchFamilyMembers } = useFamilyStore();

  useEffect(() => {
    if (familyMembers.length === 0) {
      fetchFamilyMembers();
    }
  }, [familyMembers.length, fetchFamilyMembers]);

  // Get assignee info
  const assignee = event.assigned_to ? 
    familyMembers.find(m => m.id === event.assigned_to) : null;
  const backupAssignee = event.backup_assignee ? 
    familyMembers.find(m => m.id === event.backup_assignee) : null;

  // Check if current user can claim this event
  const canClaim = !event.assigned_to && currentUser;
  const canReassign = event.assigned_to && (
    event.assigned_to === currentUser?.id || 
    currentUser?.id === 1 // Assume user ID 1 is admin/parent
  );

  // Status configuration
  const statusConfig = {
    pending: {
      color: 'text-yellow-600 bg-yellow-100',
      icon: Clock,
      text: 'Pending'
    },
    claimed: {
      color: 'text-blue-600 bg-blue-100',
      icon: UserCheck,
      text: 'Claimed'
    },
    completed: {
      color: 'text-green-600 bg-green-100',
      icon: CheckCircle,
      text: 'Completed'
    }
  };

  const currentStatus = statusConfig[event.assignment_status || 'pending'];
  const StatusIcon = currentStatus.icon;

  const handleClaim = async () => {
    if (!canClaim || !currentUser) return;
    
    setIsAssigning(true);
    try {
      await claimEvent(event.id, currentUser.id);
    } catch (error) {
      console.error('Failed to claim event:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReassign = async (newUserId) => {
    setIsAssigning(true);
    try {
      await reassignEvent(event.id, newUserId);
      setShowReassignUI(false);
    } catch (error) {
      console.error('Failed to reassign event:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setIsAssigning(true);
    try {
      await updateAssignmentStatus(event.id, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const generateAvatar = (member) => (
    <div
      className={`w-6 h-6 rounded-full ${member.color} text-white text-xs flex items-center justify-center font-medium border-2 border-white`}
      title={member.name}
    >
      {member.avatar}
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {assignee ? (
          <div className="flex items-center space-x-1">
            {generateAvatar(assignee)}
            <StatusIcon className={`h-3 w-3 ${currentStatus.color.split(' ')[0]}`} />
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-gray-400">
            <UserX className="h-3 w-3" />
            <span className="text-xs">Unassigned</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showLabel && (
        <h4 className="font-medium text-gray-900 text-sm">Assignment</h4>
      )}
      
      <div className="space-y-2">
        {/* Current Assignment */}
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-3">
            {assignee ? (
              <>
                {generateAvatar(assignee)}
                <div>
                  <div className="font-medium text-sm text-gray-900">{assignee.name}</div>
                  <div className="flex items-center space-x-1">
                    <StatusIcon className={`h-3 w-3 ${currentStatus.color.split(' ')[0]}`} />
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${currentStatus.color}`}>
                      {currentStatus.text}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                  <UserX className="h-3 w-3 text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-500">Unassigned</div>
                  <div className="text-xs text-gray-400">No one claimed this event</div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Claim Button */}
            {canClaim && (
              <button
                onClick={handleClaim}
                disabled={isAssigning}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <UserCheck className="h-3 w-3" />
                <span>{isAssigning ? 'Claiming...' : 'Claim'}</span>
              </button>
            )}

            {/* Reassign Button */}
            {canReassign && !showReassignUI && (
              <button
                onClick={() => setShowReassignUI(true)}
                className="px-3 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center space-x-1"
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>Reassign</span>
              </button>
            )}

            {/* Status Update Button */}
            {assignee && event.assignment_status === 'claimed' && (
              <button
                onClick={() => handleStatusUpdate('completed')}
                disabled={isAssigning}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1"
              >
                <CheckCircle className="h-3 w-3" />
                <span>{isAssigning ? 'Updating...' : 'Complete'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Backup Assignee */}
        {backupAssignee && (
          <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">Backup:</div>
            {generateAvatar(backupAssignee)}
            <span className="text-sm text-blue-700">{backupAssignee.name}</span>
          </div>
        )}

        {/* Reassign UI */}
        {showReassignUI && (
          <div className="p-3 border-2 border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-sm text-blue-900">Reassign to:</h5>
              <button
                onClick={() => setShowReassignUI(false)}
                className="text-blue-600 hover:text-blue-800 text-xs"
              >
                Cancel
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {familyMembers
                .filter(member => member.id !== event.assigned_to)
                .map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleReassign(member.id)}
                    disabled={isAssigning}
                    className="flex items-center space-x-2 p-2 rounded-md border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generateAvatar(member)}
                    <span className="text-sm text-blue-900">{member.name}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Handoff History */}
        {event.handoff_history && event.handoff_history.length > 0 && (
          <div className="text-xs text-gray-500">
            <details className="cursor-pointer">
              <summary className="hover:text-gray-700">
                Assignment History ({event.handoff_history.length} changes)
              </summary>
              <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200">
                {event.handoff_history.map((entry, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span>{entry.action}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventAssignment;