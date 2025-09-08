import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  MapPin, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Timer,
  Sparkles,
  Edit3,
  Trash2,
  MoreVertical,
  CheckCircle,
  Circle,
  AlertTriangle,
  Car,
  Bike,
  Navigation,
  Route,
  ArrowRight,
  ExternalLink,
  Eye,
  AlertCircle,
  Info,
  ParkingCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PreparationTimeline from '../coordinator/PreparationTimeline';
import PostEventTimeline from '../coordinator/PostEventTimeline';
import TemplateSelector from '../templates/TemplateSelector';
import TemplateEditor from '../templates/TemplateEditor';
import DuringEventChecklist from '../templates/DuringEventChecklist';
import { useTemplateStore } from '../../stores/templateStore';
import { useEventStore } from '../../stores/eventStore';
import { mapService } from '../../services/mapService';

const eventTypeColors = {
  school: 'border-l-blue-500 bg-white',
  sports: 'border-l-green-500 bg-white',
  medical: 'border-l-red-500 bg-white',
  social: 'border-l-purple-500 bg-white',
  work: 'border-l-yellow-500 bg-white',
  personal: 'border-l-gray-500 bg-white',
  family: 'border-l-pink-500 bg-white',
  travel: 'border-l-indigo-500 bg-indigo-50',
  transportation: 'border-l-indigo-500 bg-indigo-50'
};

const eventTypeIcons = {
  school: '🎓',
  sports: '⚽',
  medical: '🏥',
  social: '👥',
  work: '💼',
  personal: '👤',
  family: '👨‍👩‍👧‍👦',
  travel: '🚗',
  transportation: '🚗'
};

// Transportation mode specific icons and colors
const transportationModeConfig = {
  driving: { icon: Car, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Driving' },
  walking: { icon: Navigation, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Walking' },
  bicycling: { icon: Bike, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Bicycling' },
  transit: { icon: Route, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Transit' }
};

const EventCard = ({ 
  event, 
  variant = 'large', // 'small' | 'large'
  autoExpanded = false,
  className = '',
  onToggleExpand,
  showActions = true,
  onEdit,
  onDelete
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(autoExpanded);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showDuringTasks, setShowDuringTasks] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templatePhase, setTemplatePhase] = useState('pre');
  const [duringEventTasks, setDuringEventTasks] = useState([]);
  
  // Template store
  const { applyTemplateToEvent } = useTemplateStore();
  const { updateEvent } = useEventStore();

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = parseISO(timeStr);
      return format(date, 'h:mm a');
    } catch (error) {
      return timeStr;
    }
  };

  const getTimeUntilEvent = (eventTime) => {
    if (!eventTime) return '';
    const now = new Date();
    const eventDate = parseISO(eventTime);
    const diffMs = eventDate.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return 'Started';
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `in ${diffHours}h ${diffMinutes}m`;
    }
    return `in ${diffMinutes}m`;
  };

  const generateAvatars = (attendees = []) => {
    const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500'];
    
    if (typeof attendees === 'string') {
      attendees = attendees.split(',').map(a => a.trim());
    }
    
    return attendees.slice(0, 3).map((attendee, index) => {
      const initial = attendee.charAt(0).toUpperCase();
      const colorClass = avatarColors[index % avatarColors.length];
      
      return (
        <div
          key={attendee}
          className={`w-6 h-6 rounded-full ${colorClass} text-white text-xs flex items-center justify-center font-medium -ml-1 first:ml-0 border-2 border-white`}
          title={attendee}
        >
          {initial}
        </div>
      );
    });
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onToggleExpand) {
      onToggleExpand(event.id, newExpanded);
    }
  };

  const handleCardClick = (e) => {
    // Don't navigate if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('[role="button"]')) {
      return;
    }
    navigate(`/event/${event.id}`);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(event);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(event);
    }
  };

  // Template handlers
  const openTemplateSelector = (phase) => {
    setTemplatePhase(phase);
    setShowTemplateSelector(true);
  };

  const handleTemplateSelect = async (template) => {
    try {
      const result = await applyTemplateToEvent(template.id, event.id, templatePhase);
      
      // Update the event to mark it as enriched and refresh
      if (result && result.success) {
        // Mark event as AI enriched so timelines show
        event.ai_enriched = true;
        
        // Update event in store to trigger re-render of timelines
        await updateEvent(event.id, { ai_enriched: true });
        
        // Convert template items to timeline format for PreparationTimeline
        if (templatePhase === 'pre' && result.template && result.template.items) {
          const eventTime = new Date(event.start_time);
          const timeline = result.template.items.map((item, index) => ({
            id: item.id || `task-${index}`,
            activity: item.text,
            time: new Date(eventTime.getTime() - (60 - index * 10) * 60 * 1000), // Space tasks before event
            type: item.category || 'preparation',
            priority: item.priority || 'medium',
            note: item.notes || '',
            duration: item.timeEstimate || 5
          }));
          
          // Store timeline in localStorage for PreparationTimeline to pick up
          localStorage.setItem(`event-timeline-${event.id}`, JSON.stringify(timeline));
          setShowPreparation(true);
        }
        
        // Convert template items for post-event timeline
        if (templatePhase === 'post' && result.template && result.template.items) {
          const eventEndTime = new Date(event.end_time || event.start_time);
          const timeline = result.template.items.map((item, index) => ({
            id: item.id || `task-${index}`,
            activity: item.text,
            time: new Date(eventEndTime.getTime() + (index * 15) * 60 * 1000), // Space tasks after event
            type: item.category || 'follow-up',
            priority: item.priority || 'medium',
            note: item.notes || '',
            duration: item.timeEstimate || 5
          }));
          
          // Store timeline for PostEventTimeline
          localStorage.setItem(`event-post-timeline-${event.id}`, JSON.stringify(timeline));
          setShowFollowUp(true);
        }
        
        // If it's a during-event template, set the tasks for the checklist
        if (templatePhase === 'during' && template.items) {
          setDuringEventTasks(template.items);
          setShowDuringTasks(true);
        }
        
        // Force a re-render by toggling expanded state
        if (isExpanded) {
          setIsExpanded(false);
          setTimeout(() => setIsExpanded(true), 10);
        } else {
          setIsExpanded(true);
        }
      }
      
      setShowTemplateSelector(false);
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const handleCreateNewTemplate = () => {
    setShowTemplateSelector(false);
    setShowTemplateEditor(true);
  };

  const handleCloseTemplateEditor = () => {
    setShowTemplateEditor(false);
  };

  // Transportation event detection and helpers
  const isTransportationEvent = (event) => {
    return event.event_type === 'travel' || 
           event.category === 'travel' || 
           event.type === 'travel' ||
           event.transportation_mode || 
           event.driving_needed ||
           event.starting_address ||
           event.destination_address ||
           (event.transportation_data && Object.keys(event.transportation_data).length > 0);
  };

  const getTransportationMode = (event) => {
    return event.transportation_mode || 
           event.transportation_data?.mode || 
           (event.driving_needed ? 'driving' : 'driving');
  };

  const getRouteInfo = (event) => {
    if (event.transportation_data) {
      return {
        starting_address: event.transportation_data.starting_address || event.starting_address,
        destination_address: event.transportation_data.destination_address || event.destination_address,
        stops: event.transportation_data.stops || [],
        route_info: event.transportation_data.route_info
      };
    }
    return {
      starting_address: event.starting_address,
      destination_address: event.destination_address || event.location,
      stops: event.stops || [],
      route_info: null
    };
  };

  const handleOpenInMaps = (event) => {
    const routeInfo = getRouteInfo(event);
    if (routeInfo.starting_address && routeInfo.destination_address) {
      const waypoints = routeInfo.stops?.map(stop => stop.address).filter(Boolean) || [];
      const mapsUrl = mapService.generateNavigationUrl(
        routeInfo.starting_address,
        routeInfo.destination_address,
        waypoints
      );
      if (mapsUrl) {
        window.open(mapsUrl, '_blank');
      }
    }
  };

  const formatRouteSummary = (event) => {
    const routeInfo = getRouteInfo(event);
    const stops = routeInfo.stops || [];
    const routeData = routeInfo.route_info;
    
    let summary = '';
    if (stops.length > 0) {
      summary += `${stops.length} stop${stops.length > 1 ? 's' : ''}`;
    }
    if (routeData?.duration) {
      summary += summary ? ` • ${routeData.duration}` : routeData.duration;
    }
    if (routeData?.distance) {
      summary += summary ? ` • ${routeData.distance}` : routeData.distance;
    }
    
    return summary || 'Route details';
  };

  if (variant === 'small' && !isExpanded) {
    return (
      <div
        className={`border-l-4 ${eventTypeColors[event.category || event.type || 'personal']} border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-200 group ${className}`}
        onClick={toggleExpanded}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleExpanded();
          }
        }}
        aria-label={`Expand details for ${event.title}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm">{eventTypeIcons[event.category || event.type || 'personal']}</span>
              <h4 className="font-medium text-gray-800 truncate">{event.title}</h4>
              {event.ai_enriched && (
                <Sparkles className="h-3 w-3 text-purple-600" />
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </span>
              {event.location && (
                <span className="flex items-center truncate">
                  <MapPin className="h-3 w-3 mr-1" />
                  {event.location}
                </span>
              )}
              {event.attendees && event.attendees.length > 0 && (
                <span className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {Array.isArray(event.attendees) ? event.attendees.length : event.attendees.split(',').length}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isHovered && showActions && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleEdit}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  title="Edit event"
                  aria-label="Edit event"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Delete event"
                  aria-label="Delete event"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      </div>
    );
  }

  // Large/Expanded view
  return (
    <>
      <div 
        className={`border-l-4 ${eventTypeColors[event.category || event.type || 'personal']} border border-gray-200 rounded-lg bg-white hover:shadow-lg transition-all duration-200 group overflow-hidden ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Preparation Bar - At the very top edge */}
      <div className={`w-full flex items-center justify-between border-b border-gray-200 ${
        showPrep 
          ? 'bg-blue-100' 
          : 'bg-blue-50 hover:bg-blue-100'
      }`}>
        <button
          onClick={() => setShowPrep(!showPrep)}
          className="flex-1 flex items-center justify-between px-4 py-2 text-xs font-medium transition-all duration-200 text-blue-700"
        >
          <span>📋 Preparation</span>
          <span className="text-xs opacity-75">{showPrep ? 'hide' : 'show'}</span>
        </button>
        <button
          onClick={() => openTemplateSelector('pre')}
          className="px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-200 transition-colors"
          title="Add from template"
        >
          ➕ Template
        </button>
      </div>
      
      {showPrep && (
        <div className="bg-blue-50 border-b border-blue-200 p-4 animate-in slide-in-from-top-2 duration-200">
          {event.ai_enriched ? (
            <PreparationTimeline event={event} className="text-sm" />
          ) : (
            <div className="text-sm text-blue-700">
              <p>Add preparation tasks for this event</p>
              <button 
                onClick={() => openTemplateSelector('pre')}
                className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors">
                Add Task
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{eventTypeIcons[event.category || event.type || 'personal']}</span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
                {event.ai_enriched && (
                  <div className="flex items-center space-x-1">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-600 font-medium">AI Enhanced</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm mt-1">
                {event.status === 'current' && (
                  <div className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    <Timer className="h-3 w-3 mr-1" />
                    <span className="font-medium">HAPPENING NOW</span>
                  </div>
                )}
                {event.status === 'next' && (
                  <div className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    <Clock className="h-3 w-3 mr-1" />
                    <span className="font-medium">{getTimeUntilEvent(event.start_time)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            {isHovered && showActions && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleEdit}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Edit event"
                  aria-label="Edit event"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete event"
                  aria-label="Delete event"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoreActions(!showMoreActions);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                    title="More actions"
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showMoreActions && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(e);
                          setShowMoreActions(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {variant === 'small' && (
              <button
                onClick={toggleExpanded}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
                aria-label={isExpanded ? "Collapse event details" : "Expand event details"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Time and Duration */}
        <div className="flex items-center space-x-4 mb-4 text-gray-700">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span className="text-lg font-medium">
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </span>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center space-x-2 mb-4 text-gray-700">
            <MapPin className="h-5 w-5" />
            <span className="text-lg">{event.location}</span>
          </div>
        )}

        {/* Attendees */}
        {event.attendees && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-gray-500" />
              <div className="flex items-center">
                {generateAvatars(event.attendees)}
                {Array.isArray(event.attendees) && event.attendees.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center -ml-1 border-2 border-white">
                    +{event.attendees.length - 3}
                  </div>
                )}
              </div>
            </div>
            <span className="text-gray-600">
              {Array.isArray(event.attendees) ? event.attendees.length : event.attendees.split(',').length} attendee{(Array.isArray(event.attendees) ? event.attendees.length : event.attendees.split(',').length) !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-gray-700 mb-4 text-base leading-relaxed">{event.description}</p>
        )}

        {/* Transportation Event Special Display */}
        {isTransportationEvent(event) && (
          <div className="mb-4">
            <TransportationEventDisplay event={event} onOpenInMaps={handleOpenInMaps} />
          </div>
        )}

        {/* AI Preparation info */}
        {event.ai_enriched && (event.preparation_time || event.departure_time) && (
          <div className="flex items-center space-x-4 mb-4 text-sm">
            {event.preparation_time && (
              <div className="flex items-center space-x-2 text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                <Timer className="h-4 w-4" />
                <span>Prep: {event.preparation_time} min</span>
              </div>
            )}
            {event.departure_time && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-100 px-3 py-1 rounded-full">
                <MapPin className="h-4 w-4" />
                <span>Leave: {format(parseISO(event.departure_time), 'h:mm a')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* During Event Section - Only show when event is current */}
      {event.status === 'current' && (
        <div className="bg-green-50 border-t border-b border-green-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowDuringTasks(!showDuringTasks)}
              className="flex-1 flex items-center justify-between px-4 py-2 text-xs font-medium transition-all duration-200 text-green-700"
            >
              <span>📋 Event Checklist</span>
              <span className="text-xs opacity-75">{showDuringTasks ? 'hide' : 'show'}</span>
            </button>
            <button
              onClick={() => openTemplateSelector('during')}
              className="px-3 py-2 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-200 transition-colors"
              title="Add from template"
            >
              ➕ Template
            </button>
          </div>
          
          {showDuringTasks && (
            <div className="p-4 animate-in slide-in-from-top-2 duration-200">
              {duringEventTasks.length > 0 ? (
                <DuringEventChecklist 
                  tasks={duringEventTasks} 
                  event={event}
                  onTaskToggle={(taskIndex, completed) => {
                    // Handle task completion
                    console.log('Task toggled:', taskIndex, completed);
                  }}
                  onAddNote={(taskIndex, note) => {
                    // Handle note addition
                    console.log('Note added:', taskIndex, note);
                  }}
                  onDeleteTask={(taskIndex) => {
                    // Remove task from duringEventTasks
                    const newTasks = duringEventTasks.filter((_, idx) => idx !== taskIndex);
                    setDuringEventTasks(newTasks);
                  }}
                  onComplete={(completionData) => {
                    // Handle checklist completion
                    console.log('Checklist completed:', completionData);
                    setShowDuringTasks(false);
                  }}
                />
              ) : (
                <div className="text-sm text-green-700 text-center py-4">
                  <p>No during-event tasks yet</p>
                  <button 
                    onClick={() => openTemplateSelector('during')}
                    className="mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Add Checklist
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preparation Timeline (for expanded view) */}
      {isExpanded && event.ai_enriched && variant !== 'small' && (
        <div className="px-6 pb-6">
          <PreparationTimeline event={event} className="mb-4" />
        </div>
      )}

      {/* Footer with actions (only for large variant) */}
      {variant !== 'small' && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={handleCardClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            View Full Details
          </button>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {event.checklist && Array.isArray(event.checklist) && event.checklist.length > 0 && (
              <div className="flex items-center space-x-1 text-blue-600">
                <CheckCircle className="h-4 w-4" />
                <span>{event.checklist.length} checklist items</span>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Follow-up Bar - At the very bottom edge */}
      {showFollowUp && (
        <div className="bg-purple-50 border-t border-purple-200 p-4 animate-in slide-in-from-bottom-2 duration-200">
          <PostEventTimeline event={event} className="text-sm" />
        </div>
      )}
      
      <div className={`w-full flex items-center justify-between border-t border-gray-200 ${
        showFollowUp 
          ? 'bg-purple-100' 
          : 'bg-purple-50 hover:bg-purple-100'
      }`}>
        <button
          onClick={() => setShowFollowUp(!showFollowUp)}
          className="flex-1 flex items-center justify-between px-4 py-2 text-xs font-medium transition-all duration-200 text-purple-700"
        >
          <span>📋 Follow-up</span>
          <span className="text-xs opacity-75">{showFollowUp ? 'hide' : 'show'}</span>
        </button>
        <button
          onClick={() => openTemplateSelector('post')}
          className="px-3 py-2 text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-200 transition-colors"
          title="Add from template"
        >
          ➕ Template
        </button>
      </div>
    </div>

    {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          phase={templatePhase}
          event={event}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
          onCreateNew={handleCreateNewTemplate}
        />
      )}

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <TemplateEditor
          template={null}
          onClose={handleCloseTemplateEditor}
        />
      )}
    </>
  );
};

// Transportation Event Display Component
const TransportationEventDisplay = ({ event, onOpenInMaps }) => {
  const [showRoute, setShowRoute] = useState(false);
  const [trafficInfo, setTrafficInfo] = useState(null);
  const [parkingInfo, setParkingInfo] = useState(null);
  const [loadingTraffic, setLoadingTraffic] = useState(false);
  
  const transportationMode = event.transportation_mode || event.transportation_data?.mode || 'driving';
  const modeConfig = transportationModeConfig[transportationMode] || transportationModeConfig.driving;
  const ModeIcon = modeConfig.icon;
  const routeInfo = event.transportation_data?.route_info;
  const routeDetails = {
    starting_address: event.transportation_data?.starting_address || event.starting_address,
    destination_address: event.transportation_data?.destination_address || event.destination_address || event.location,
    stops: event.transportation_data?.stops || event.stops || []
  };
  
  const isDepartureTime = () => {
    if (!event.departure_time && !event.start_time) return false;
    const now = new Date();
    const departureTime = new Date(event.departure_time || event.start_time);
    const diffMs = departureTime.getTime() - now.getTime();
    return diffMs > 0 && diffMs <= 30 * 60 * 1000; // Within 30 minutes
  };
  
  const getTrafficInfo = async () => {
    if (!routeDetails.starting_address || !routeDetails.destination_address) return;
    
    setLoadingTraffic(true);
    try {
      const traffic = await mapService.getTrafficInfo(
        routeDetails.starting_address,
        routeDetails.destination_address
      );
      setTrafficInfo(traffic);
    } catch (error) {
      console.error('Error fetching traffic info:', error);
    }
    setLoadingTraffic(false);
  };
  
  const getParkingInfo = async () => {
    if (!routeDetails.destination_address) return;
    
    try {
      const parking = await mapService.findParking(routeDetails.destination_address);
      setParkingInfo(parking);
    } catch (error) {
      console.error('Error fetching parking info:', error);
    }
  };
  
  useEffect(() => {
    if (transportationMode === 'driving') {
      getTrafficInfo();
      getParkingInfo();
    }
  }, [transportationMode, routeDetails.starting_address, routeDetails.destination_address]);
  
  return (
    <div className={`${modeConfig.bgColor} rounded-lg p-4 border-l-4 border-indigo-500`}>
      {/* Transportation Mode Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${modeConfig.bgColor} ring-2 ring-white`}>
            <ModeIcon className={`h-5 w-5 ${modeConfig.color}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className={`font-semibold ${modeConfig.color}`}>{modeConfig.label} Trip</h3>
              {isDepartureTime() && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                  <AlertCircle className="h-3 w-3" />
                  <span>Leave Soon</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {formatRouteSummary(event)}
            </p>
          </div>
        </div>
        
        {/* Departure Time */}
        {(event.departure_time || event.start_time) && (
          <div className={`text-right`}>
            <div className={`flex items-center space-x-1 ${modeConfig.color} font-semibold`}>
              <Clock className="h-4 w-4" />
              <span>{formatTime(event.departure_time || event.start_time)}</span>
            </div>
            <p className="text-xs text-gray-600">Departure</p>
          </div>
        )}
      </div>
      
      {/* Route Information */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 text-sm">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
            <span className="text-gray-700 truncate">
              {routeDetails.starting_address || 'Current location'}
            </span>
          </div>
          <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
            <span className="text-gray-700 truncate">
              {routeDetails.destination_address || event.location || 'Destination'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Route Stats */}
      {routeInfo && (
        <div className="flex items-center space-x-4 mb-3 text-sm">
          {routeInfo.distance && (
            <div className="flex items-center space-x-1 text-gray-600">
              <Route className="h-3 w-3" />
              <span>{routeInfo.distance}</span>
            </div>
          )}
          {routeInfo.duration && (
            <div className="flex items-center space-x-1 text-gray-600">
              <Timer className="h-3 w-3" />
              <span>{routeInfo.duration}</span>
            </div>
          )}
          {routeDetails.stops && routeDetails.stops.length > 0 && (
            <div className="flex items-center space-x-1 text-gray-600">
              <MapPin className="h-3 w-3" />
              <span>{routeDetails.stops.length} stop{routeDetails.stops.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Traffic Status */}
      {trafficInfo && (
        <div className={`flex items-center space-x-2 mb-3 px-2 py-1 rounded text-xs ${
          trafficInfo.condition === 'light' ? 'bg-green-100 text-green-800' :
          trafficInfo.condition === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            trafficInfo.condition === 'light' ? 'bg-green-500' :
            trafficInfo.condition === 'moderate' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}></div>
          <span className="font-medium capitalize">{trafficInfo.condition} traffic</span>
          {trafficInfo.delay && <span>({trafficInfo.delay} delay)</span>}
        </div>
      )}
      
      {/* Expanded Route Details */}
      {showRoute && routeDetails.stops && routeDetails.stops.length > 0 && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Route Stops</h4>
          <div className="space-y-2">
            {routeDetails.stops.map((stop, index) => (
              <div key={index} className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-gray-700">{stop.name || 'Stop'}</p>
                  <p className="text-xs text-gray-500">{stop.address}</p>
                  {stop.additional_time && (
                    <p className="text-xs text-blue-600">+{stop.additional_time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Parking Information */}
      {transportationMode === 'driving' && parkingInfo && parkingInfo.length > 0 && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-1">
            <ParkingCircle className="h-4 w-4" />
            <span>Parking Options</span>
          </h4>
          <div className="space-y-2">
            {parkingInfo.slice(0, 2).map(parking => (
              <div key={parking.id} className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-700">{parking.name}</p>
                  <p className="text-xs text-gray-500">{parking.distance} away</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-700">{parking.price}</p>
                  <p className="text-xs text-gray-500">{parking.availability}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          {routeDetails.stops && routeDetails.stops.length > 0 && (
            <button
              onClick={() => setShowRoute(!showRoute)}
              className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-white rounded"
            >
              <Eye className="h-3 w-3" />
              <span>{showRoute ? 'Hide Route' : 'View Route'}</span>
            </button>
          )}
          {transportationMode === 'driving' && !loadingTraffic && (
            <button
              onClick={getTrafficInfo}
              className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-white rounded"
            >
              <Info className="h-3 w-3" />
              <span>Check Traffic</span>
            </button>
          )}
        </div>
        
        <button
          onClick={() => onOpenInMaps(event)}
          className={`flex items-center space-x-1 px-3 py-2 ${modeConfig.color} ${modeConfig.bgColor} hover:opacity-80 rounded-lg text-sm font-medium transition-colors`}
        >
          <ExternalLink className="h-3 w-3" />
          <span>Open in Maps</span>
        </button>
      </div>
    </div>
  );
};

export default EventCard;