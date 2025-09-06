import React, { useState, useEffect } from 'react';
import { Clock, User, ArrowRightLeft, AlertCircle, CheckCircle2, Zap, Users } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useFamilyStore } from '../../stores/familyStore';
import PersonAssignment from '../common/PersonAssignment';

const TodaysHandoffs = ({ className = "" }) => {
  const [handoffs, setHandoffs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [eventAttendees, setEventAttendees] = useState({});
  const { user } = useAuthStore();
  const { sendHandoffNotification } = useNotificationStore();
  const { familyMembers, users, fetchFamilyMembers } = useFamilyStore();

  useEffect(() => {
    fetchTodaysHandoffs();
    fetchAvailableUsers();
    fetchFamilyMembers();
  }, []);

  const fetchTodaysHandoffs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/handoffs/today');
      setHandoffs(response.data);
      
      // Fetch attendees for each event
      const attendeeData = {};
      const allEvents = [
        ...(response.data.my_responsibilities?.events || []),
        ...(response.data.partner_responsibilities?.events || []),
        ...(response.data.unassigned?.events || []),
        ...(response.data.backup_responsibilities?.events || [])
      ];
      
      for (const event of allEvents) {
        // Try to get attendees from localStorage (matching EventCoordinator pattern)
        const storedAttendees = localStorage.getItem(`event-${event.id}-attendees`);
        if (storedAttendees) {
          attendeeData[event.id] = JSON.parse(storedAttendees);
        } else {
          // Could fetch from API if available
          attendeeData[event.id] = [];
        }
      }
      
      setEventAttendees(attendeeData);
    } catch (err) {
      setError('Failed to load today\'s handoffs');
      console.error('Error fetching handoffs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get('/handoffs/assignable-people');
      setAvailableUsers(response.data);
    } catch (err) {
      console.error('Error fetching assignable people:', err);
    }
  };

  const reassignEvent = async (eventId, assigneeId, reason = 'Manual reassignment') => {
    try {
      // Convert family member IDs to user IDs if needed
      let toUserId = assigneeId;
      if (typeof assigneeId === 'string' && assigneeId.startsWith('fm_')) {
        // For family members, we may need to create a user or handle differently
        // For now, we'll store the assignment locally
        const currentAssignments = JSON.parse(localStorage.getItem('handoff-assignments') || '{}');
        currentAssignments[`event-${eventId}`] = assigneeId;
        localStorage.setItem('handoff-assignments', JSON.stringify(currentAssignments));
        
        // Refresh the UI
        await fetchTodaysHandoffs();
        return;
      }
      
      await api.post(`/handoffs/reassign/event/${eventId}`, {
        to_user_id: toUserId,
        reason: reason
      });
      
      // Refresh the handoffs data
      await fetchTodaysHandoffs();
      
      // Send notification
      await sendHandoffNotification(eventId, toUserId);
    } catch (err) {
      console.error('Error reassigning event:', err);
      setError('Failed to reassign event');
    }
  };

  const reassignTask = async (taskId, assigneeId, reason = 'Manual reassignment') => {
    try {
      // Convert family member IDs to user IDs if needed
      let toUserId = assigneeId;
      if (typeof assigneeId === 'string' && assigneeId.startsWith('fm_')) {
        // For family members, we may need to create a user or handle differently
        // For now, we'll store the assignment locally
        const currentAssignments = JSON.parse(localStorage.getItem('handoff-assignments') || '{}');
        currentAssignments[`task-${taskId}`] = assigneeId;
        localStorage.setItem('handoff-assignments', JSON.stringify(currentAssignments));
        
        // Refresh the UI
        await fetchTodaysHandoffs();
        return;
      }
      
      await api.post(`/handoffs/reassign/task/${taskId}`, {
        to_user_id: toUserId,
        reason: reason
      });
      
      // Refresh the handoffs data
      await fetchTodaysHandoffs();
    } catch (err) {
      console.error('Error reassigning task:', err);
      setError('Failed to reassign task');
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPriorityColor = (priority) => {
    // Handle null, undefined, or non-string priority values
    if (!priority || typeof priority !== 'string') {
      return 'text-gray-600 bg-gray-50';
    }
    
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'urgent': return 'text-red-800 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const ResponsibilityItem = ({ item, type, onReassign }) => {
    const [showReassign, setShowReassign] = useState(false);
    const [selectedAssignee, setSelectedAssignee] = useState(null);
    
    // Get current assignee
    const getCurrentAssignee = () => {
      // Check local storage for assignments
      const assignments = JSON.parse(localStorage.getItem('handoff-assignments') || '{}');
      const key = `${type}-${item.id}`;
      if (assignments[key]) {
        return assignments[key];
      }
      
      // Otherwise use the assigned user from the item
      if (item.assigned_user_id) {
        return item.assigned_user_id;
      }
      
      return null;
    };
    
    // Get available assignees based on type and attendees
    const getAvailableAssignees = () => {
      if (type === 'event' && eventAttendees[item.id]?.length > 0) {
        // For events with attendees, only show those attendees
        return eventAttendees[item.id];
      }
      
      // For tasks or events without attendees, show all family members and users
      const allAssignees = [];
      
      // Add family members
      familyMembers.forEach(member => {
        allAssignees.push(`fm_${member.id}`);
      });
      
      // Add users
      users.forEach(user => {
        allAssignees.push(user.id);
      });
      
      return allAssignees;
    };

    const handleReassign = () => {
      if (selectedAssignee) {
        onReassign(item.id, selectedAssignee);
        setShowReassign(false);
        setSelectedAssignee(null);
      }
    };

    return (
      <div className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-gray-900">{item.title}</h4>
              {item.priority && (
                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              {type === 'event' && (
                <>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatTime(item.start_time)}
                  </span>
                  {item.location && (
                    <span>{item.location}</span>
                  )}
                </>
              )}
              
              {type === 'task' && item.due_date && (
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Due {formatTime(item.due_date)}
                </span>
              )}

              {item.assigned_username && (
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {item.assigned_full_name || item.assigned_username}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowReassign(!showReassign)}
              className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
              title="Reassign"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showReassign && (
          <div className="mt-3 pt-2 border-t">
            <div className="mb-2">
              {type === 'event' && eventAttendees[item.id]?.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-blue-600 mb-2">
                  <Users className="h-3 w-3" />
                  <span>Only attendees can be assigned to this event</span>
                </div>
              )}
              <PersonAssignment
                value={selectedAssignee || getCurrentAssignee()}
                onChange={setSelectedAssignee}
                allowMultiple={false}
                limitToIds={getAvailableAssignees()}
                placeholder="Select person to reassign to..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReassign}
                disabled={!selectedAssignee}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded disabled:opacity-50 hover:bg-blue-700"
              >
                Reassign
              </button>
              <button
                onClick={() => {
                  setShowReassign(false);
                  setSelectedAssignee(null);
                }}
                className="px-3 py-1 text-gray-600 text-sm rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ResponsibilitySection = ({ title, items, type, icon: Icon, iconColor }) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="space-y-2">
          {items.map(item => (
            <ResponsibilityItem
              key={`${type}-${item.id}`}
              item={item}
              type={type}
              onReassign={type === 'event' ? reassignEvent : reassignTask}
            />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchTodaysHandoffs}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!handoffs) {
    return null;
  }

  const {
    my_responsibilities,
    partner_responsibilities,
    unassigned,
    backup_responsibilities
  } = handoffs;

  const totalMyItems = (my_responsibilities?.events?.length || 0) + (my_responsibilities?.tasks?.length || 0);
  const totalPartnerItems = (partner_responsibilities?.events?.length || 0) + (partner_responsibilities?.tasks?.length || 0);
  const totalUnassigned = (unassigned?.events?.length || 0) + (unassigned?.tasks?.length || 0);

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <ArrowRightLeft className="h-6 w-6 text-blue-600" />
            <span>Today's Handoffs</span>
          </h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              You: {totalMyItems}
            </span>
            <span className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              Partner: {totalPartnerItems}
            </span>
            {totalUnassigned > 0 && (
              <span className="flex items-center text-orange-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                Unassigned: {totalUnassigned}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* My Responsibilities */}
        <ResponsibilitySection
          title="My Responsibilities"
          items={[...(my_responsibilities?.events || []), ...(my_responsibilities?.tasks || [])]}
          type="mixed"
          icon={User}
          iconColor="text-blue-600"
        />

        {/* Partner Responsibilities */}
        <ResponsibilitySection
          title="Partner's Responsibilities"
          items={[...(partner_responsibilities?.events || []), ...(partner_responsibilities?.tasks || [])]}
          type="mixed"
          icon={User}
          iconColor="text-green-600"
        />

        {/* Unassigned Items */}
        <ResponsibilitySection
          title="Needs Assignment"
          items={[...(unassigned?.events || []), ...(unassigned?.tasks || [])]}
          type="mixed"
          icon={AlertCircle}
          iconColor="text-orange-600"
        />

        {/* Backup Responsibilities */}
        <ResponsibilitySection
          title="Backup Responsibilities"
          items={backup_responsibilities?.events || []}
          type="event"
          icon={Zap}
          iconColor="text-purple-600"
        />

        {totalMyItems === 0 && totalPartnerItems === 0 && totalUnassigned === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">All Clear!</h3>
            <p className="text-gray-600">No events or tasks scheduled for today</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodaysHandoffs;