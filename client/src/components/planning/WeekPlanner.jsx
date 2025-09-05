import { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle,
  Plus,
  Expand,
  X,
  Zap,
  Truck,
  Users,
  Sun,
  Cloud,
  FileCheck,
  Sparkles,
  Edit3
} from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
import { useTaskStore } from '../../stores/taskStore';
import { useConflictStore } from '../../stores/conflictStore';
import { useFamilyStore } from '../../stores/familyStore';
import EventFormWithTemplates from '../events/EventFormWithTemplates';
import TimelinePreview from '../events/TimelinePreview';

const WeekPlanner = ({ sessionId, onProgress, onComplete }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [preparationChecklist, setPreparationChecklist] = useState([]);
  const [completedPrep, setCompletedPrep] = useState(new Set());
  
  // New template-related state
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedEventForTimeline, setSelectedEventForTimeline] = useState(null);
  const [eventTimelines, setEventTimelines] = useState(new Map());

  const { events, fetchEvents, updateEvent } = useEventStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { detectConflicts, updateConflictStatus } = useConflictStore();
  const { familyMembers } = useFamilyStore();

  useEffect(() => {
    // Set next week's date range
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7 - today.getDay()); // Next Sunday
    setWeekStart(nextWeek);
    
    fetchEvents();
    fetchTasks();
    checkForConflicts();
    generatePreparationChecklist();
  }, []);

  useEffect(() => {
    // Update progress based on completion
    const totalItems = preparationChecklist.length;
    const completedItems = completedPrep.size;
    if (totalItems > 0) {
      const progress = Math.min(completedItems / totalItems, 1);
      onProgress?.(progress * 0.8); // 80% of progress from prep items
    }
  }, [completedPrep, preparationChecklist, onProgress]);

  const checkForConflicts = async () => {
    if (!weekStart) return;
    
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const detectedConflicts = await detectConflicts(
        weekStart.toISOString(),
        weekEnd.toISOString()
      );
      setConflicts(detectedConflicts);
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
    }
  };

  const generatePreparationChecklist = () => {
    if (!weekStart) return;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const weekEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    const checklist = [];
    
    // Travel preparations
    const travelEvents = weekEvents.filter(e => e.location && e.location !== 'Home');
    if (travelEvents.length > 0) {
      checklist.push({
        id: 'travel-prep',
        title: 'Review travel requirements',
        description: `${travelEvents.length} events require travel planning`,
        category: 'logistics',
        priority: 'high',
        items: travelEvents.map(e => `${e.title} - ${e.location}`)
      });
    }

    // Early morning events
    const earlyEvents = weekEvents.filter(e => {
      const eventTime = new Date(e.start_time);
      return eventTime.getHours() < 8;
    });
    if (earlyEvents.length > 0) {
      checklist.push({
        id: 'early-prep',
        title: 'Prepare for early events',
        description: `${earlyEvents.length} events start before 8 AM`,
        category: 'scheduling',
        priority: 'medium',
        items: earlyEvents.map(e => `${e.title} - ${new Date(e.start_time).toLocaleTimeString()}`)
      });
    }

    // Family events requiring coordination
    const familyEvents = weekEvents.filter(e => e.attendees && e.attendees.length > 1);
    if (familyEvents.length > 0) {
      checklist.push({
        id: 'family-coordination',
        title: 'Coordinate family schedules',
        description: `${familyEvents.length} events need family coordination`,
        category: 'coordination',
        priority: 'high',
        items: familyEvents.map(e => `${e.title} - ${e.attendees?.join(', ')}`)
      });
    }

    // Meal planning
    const mealEvents = weekEvents.filter(e => 
      e.category === 'meal' || e.title.toLowerCase().includes('dinner') || 
      e.title.toLowerCase().includes('lunch') || e.title.toLowerCase().includes('breakfast')
    );
    if (mealEvents.length > 0) {
      checklist.push({
        id: 'meal-planning',
        title: 'Plan meals and shopping',
        description: `${mealEvents.length} meal-related events`,
        category: 'meals',
        priority: 'medium',
        items: mealEvents.map(e => e.title)
      });
    }

    // Weather-dependent activities
    const outdoorEvents = weekEvents.filter(e => 
      e.weather_dependent || 
      e.category === 'outdoor' || 
      ['park', 'beach', 'playground', 'outdoor'].some(word => 
        e.title.toLowerCase().includes(word) || (e.location && e.location.toLowerCase().includes(word))
      )
    );
    if (outdoorEvents.length > 0) {
      checklist.push({
        id: 'weather-check',
        title: 'Check weather forecasts',
        description: `${outdoorEvents.length} weather-dependent activities`,
        category: 'weather',
        priority: 'low',
        items: outdoorEvents.map(e => e.title)
      });
    }

    setPreparationChecklist(checklist);
  };

  const getWeekDays = () => {
    if (!weekStart) return [];
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getEventsForDay = (date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= dayStart && eventDate <= dayEnd;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  };

  const getConflictsForDay = (date) => {
    const dayStr = date.toDateString();
    return conflicts.filter(conflict => {
      const conflictDate = new Date(conflict.conflict_date);
      return conflictDate.toDateString() === dayStr;
    });
  };

  const handleEventDragStart = (event, dragEvent) => {
    setDraggedEvent(event);
    dragEvent.dataTransfer.effectAllowed = 'move';
  };

  const handleEventDrop = async (event, targetDate) => {
    event.preventDefault();
    
    if (!draggedEvent) return;
    
    try {
      // Calculate new start time maintaining the same hour/minute
      const originalTime = new Date(draggedEvent.start_time);
      const newStartTime = new Date(targetDate);
      newStartTime.setHours(originalTime.getHours(), originalTime.getMinutes());
      
      await updateEvent(draggedEvent.id, {
        start_time: newStartTime.toISOString()
      });
      
      fetchEvents();
      checkForConflicts();
    } catch (error) {
      console.error('Failed to reschedule event:', error);
    } finally {
      setDraggedEvent(null);
    }
  };

  const handleConflictResolve = async (conflict, resolution) => {
    try {
      // Implementation depends on resolution type
      if (resolution === 'reschedule') {
        // Open reschedule modal
        setSelectedConflict(conflict);
        setShowConflictModal(true);
      } else if (resolution === 'ignore') {
        // Mark conflict as resolved
        await updateConflictStatus(conflict.id, 'resolved');
      }
      
      checkForConflicts();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const togglePrepItem = (itemId) => {
    const newCompleted = new Set(completedPrep);
    if (newCompleted.has(itemId)) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedPrep(newCompleted);
  };

  const handleCompleteWeekPlan = () => {
    onProgress?.(1.0);
    onComplete?.();
  };

  const weekDays = getWeekDays();
  const totalConflicts = conflicts.length;
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Next Week Planning</h3>
          <p className="text-gray-600">
            {weekStart && `Week of ${weekStart.toLocaleDateString()}`}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {totalConflicts > 0 && (
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              criticalConflicts > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <AlertTriangle className="h-4 w-4" />
              <span>{totalConflicts} conflict{totalConflicts !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            {completedPrep.size}/{preparationChecklist.length} prep items done
          </div>
        </div>
      </div>

      {/* Week Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 gap-0">
          {/* Day Headers */}
          {weekDays.map((day, index) => (
            <div key={index} className="p-3 border-r border-b border-gray-200 bg-gray-50">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {day.toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {day.getDate()}
                </div>
                <div className="text-xs text-gray-500">
                  {day.toLocaleDateString(undefined, { month: 'short' })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Day Contents */}
          {weekDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const dayConflicts = getConflictsForDay(day);
            
            return (
              <div
                key={`content-${index}`}
                className="p-2 border-r border-gray-200 min-h-48 bg-white"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleEventDrop(e, day)}
              >
                {/* Conflicts Alert */}
                {dayConflicts.length > 0 && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <div className="flex items-center space-x-1 text-red-800">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{dayConflicts.length} conflict{dayConflicts.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}
                
                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.map((event) => {
                    const startTime = new Date(event.start_time);
                    const hasConflict = dayConflicts.some(c => 
                      c.event1_id === event.id || c.event2_id === event.id
                    );
                    
                    return (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => handleEventDragStart(event, e)}
                        className={`p-2 rounded text-xs cursor-move hover:shadow-md transition-shadow ${
                          hasConflict 
                            ? 'bg-red-100 border border-red-300' 
                            : event.category === 'family'
                              ? 'bg-purple-100 border border-purple-300'
                              : 'bg-blue-100 border border-blue-300'
                        }`}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-gray-600 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{startTime.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}</span>
                        </div>
                        {event.location && (
                          <div className="text-gray-600 flex items-center space-x-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 1 && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Users className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-500">+{event.attendees.length - 1}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Add Event Button */}
                <button
                  onClick={() => setSelectedDate(day)}
                  className="w-full mt-2 p-1 border border-dashed border-gray-300 rounded text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                >
                  <Plus className="h-4 w-4 mx-auto" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conflicts Summary */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-800 mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Schedule Conflicts Detected
          </h4>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="bg-white p-3 rounded border border-red-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-red-900 mb-1">
                      {conflict.severity === 'critical' ? 'Critical' : 'Warning'}: Schedule Overlap
                    </div>
                    <div className="text-sm text-red-700 mb-2">
                      {conflict.description}
                    </div>
                    <div className="text-xs text-red-600">
                      {new Date(conflict.conflict_date).toLocaleDateString()} • 
                      Duration: {conflict.overlap_duration} minutes
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleConflictResolve(conflict, 'reschedule')}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => handleConflictResolve(conflict, 'ignore')}
                      className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-xs hover:bg-gray-200"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preparation Checklist */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-3 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Week Preparation Checklist
        </h4>
        
        {preparationChecklist.length === 0 ? (
          <p className="text-green-700 text-sm">
            Great! No special preparation needed for next week's events.
          </p>
        ) : (
          <div className="space-y-3">
            {preparationChecklist.map((item) => {
              const isCompleted = completedPrep.has(item.id);
              const categoryIcons = {
                logistics: Truck,
                scheduling: Clock,
                coordination: Users,
                meals: Zap,
                weather: item.category === 'weather' ? Sun : Cloud
              };
              const Icon = categoryIcons[item.category] || CheckCircle;
              
              return (
                <div key={item.id} className={`p-3 rounded border transition-all ${
                  isCompleted 
                    ? 'bg-green-100 border-green-300' 
                    : 'bg-white border-green-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => togglePrepItem(item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        isCompleted 
                          ? 'bg-green-600 border-green-600' 
                          : 'border-green-400 hover:border-green-600'
                      }`}
                    >
                      {isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className="h-4 w-4 text-green-600" />
                        <span className={`font-medium ${
                          isCompleted ? 'text-green-900 line-through' : 'text-green-800'
                        }`}>
                          {item.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          item.priority === 'high' 
                            ? 'bg-red-100 text-red-700'
                            : item.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-green-700 mb-2">{item.description}</p>
                      {item.items && item.items.length > 0 && (
                        <ul className="text-xs text-green-600 space-y-1">
                          {item.items.map((subItem, idx) => (
                            <li key={idx} className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                              <span>{subItem}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Plan your week ahead, resolve conflicts, and prepare for upcoming events
        </div>
        <button
          onClick={handleCompleteWeekPlan}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Complete Week Planning
        </button>
      </div>

      {/* Stats Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Week Overview</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-900">
              {events.filter(e => {
                const eventDate = new Date(e.start_time);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 7);
                return weekStart && eventDate >= weekStart && eventDate <= weekEnd;
              }).length}
            </div>
            <div className="text-sm text-blue-600">Total Events</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-900">
              {events.filter(e => {
                const eventDate = new Date(e.start_time);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 7);
                return weekStart && eventDate >= weekStart && eventDate <= weekEnd && e.category === 'family';
              }).length}
            </div>
            <div className="text-sm text-purple-600">Family Events</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${totalConflicts > 0 ? 'text-red-900' : 'text-green-900'}`}>
              {totalConflicts}
            </div>
            <div className={`text-sm ${totalConflicts > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Conflicts
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-900">
              {Math.round((completedPrep.size / Math.max(preparationChecklist.length, 1)) * 100)}%
            </div>
            <div className="text-sm text-green-600">Prep Complete</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekPlanner;