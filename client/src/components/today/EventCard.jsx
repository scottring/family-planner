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
  AlertTriangle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PreparationTimeline from '../coordinator/PreparationTimeline';
import PostEventTimeline from '../coordinator/PostEventTimeline';
import TemplateSelector from '../templates/TemplateSelector';
import TemplateEditor from '../templates/TemplateEditor';
import DuringEventChecklist from '../templates/DuringEventChecklist';
import { useTemplateStore } from '../../stores/templateStore';

const eventTypeColors = {
  school: 'border-l-blue-500 bg-white',
  sports: 'border-l-green-500 bg-white',
  medical: 'border-l-red-500 bg-white',
  social: 'border-l-purple-500 bg-white',
  work: 'border-l-yellow-500 bg-white',
  personal: 'border-l-gray-500 bg-white',
  family: 'border-l-pink-500 bg-white'
};

const eventTypeIcons = {
  school: '🎓',
  sports: '⚽',
  medical: '🏥',
  social: '👥',
  work: '💼',
  personal: '👤',
  family: '👨‍👩‍👧‍👦'
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
      await applyTemplateToEvent(template.id, event.id, templatePhase);
      
      // If it's a during-event template, set the tasks for the checklist
      if (templatePhase === 'during' && template.items) {
        setDuringEventTasks(template.items);
        setShowDuringTasks(true);
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
              <button className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors">
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
    </div>
  );
};

export default EventCard;