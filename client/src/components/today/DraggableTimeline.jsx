import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addMinutes, differenceInMinutes, parseISO, format } from 'date-fns';
import EventCard from './EventCard';
import TimeGapSeparator from './TimeGapSeparator';
import AddItemPlaceholder from './AddItemPlaceholder';
import PreparationTimeline from '../coordinator/PreparationTimeline';
import PostEventTimeline from '../coordinator/PostEventTimeline';

// Draggable Event Card Component
const DraggableEventCard = ({ 
  event, 
  onEdit, 
  onDelete, 
  expandedEvents, 
  toggleEventExpansion,
  isDragging = false 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const isExpanded = expandedEvents.has(event.id);
  const isAutoExpanded = event.status === 'current' || event.status === 'next';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${
        isSortableDragging ? 'z-50' : ''
      }`}
    >
      <EventCard
        event={event}
        variant="small"
        autoExpanded={isExpanded}
        onToggleExpand={toggleEventExpansion}
        onEdit={onEdit}
        onDelete={onDelete}
        className={`transition-all duration-200 hover:scale-102 ${
          event.status === 'current' 
            ? 'shadow-lg border-2 border-red-200 bg-red-50' 
            : event.status === 'next'
            ? 'shadow-lg border-2 border-blue-200 bg-blue-50'
            : event.status === 'past'
            ? 'opacity-60'
            : ''
        }`}
      />
    </div>
  );
};

// Drop Zone Component
const DropZone = ({ isOver, onDrop, suggestedTime, onAddEvent, onAddTask }) => {
  return (
    <div 
      className={`transition-all duration-300 ${
        isOver 
          ? 'bg-blue-100 border-blue-300 border-2 border-dashed rounded-lg py-4' 
          : 'py-2'
      }`}
    >
      {isOver ? (
        <div className="text-center py-6">
          <div className="text-blue-600 font-medium">Drop event here</div>
          {suggestedTime && typeof suggestedTime === 'string' && (
            <div className="text-sm text-blue-500 mt-1">
              New time: {format(parseISO(suggestedTime), 'h:mm a')}
            </div>
          )}
        </div>
      ) : (
        <AddItemPlaceholder
          onAddEvent={onAddEvent}
          onAddTask={onAddTask}
          suggestedTime={suggestedTime}
        />
      )}
    </div>
  );
};

const DraggableTimeline = ({
  events = [],
  timeGaps = [],
  expandedEvents,
  toggleEventExpansion,
  onReorderEvents,
  onAddEvent,
  onAddTask,
  onEditEvent,
  onDeleteEvent,
  selectedDate,
  includeTimelines = true
}) => {
  const [activeId, setActiveId] = useState(null);
  const [draggedEvent, setDraggedEvent] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create timeline items with events, gaps, and preparation/post timelines
  const timelineItems = [];
  const sortedEvents = [...events].sort((a, b) => 
    parseISO(a.start_time) - parseISO(b.start_time)
  );

  sortedEvents.forEach((event, index) => {
    // Add drop zone before first event
    if (index === 0) {
      const firstEventTime = parseISO(event.start_time);
      const morningTime = new Date(firstEventTime);
      morningTime.setHours(8, 0, 0, 0);
      
      if (firstEventTime.getHours() > 8) {
        timelineItems.push({
          type: 'dropzone',
          id: `dropzone-start`,
          suggestedTime: morningTime.toISOString()
        });
      }
    }

    // Add preparation timeline for this event if enabled and event has prep items
    if (includeTimelines && event.ai_enriched) {
      timelineItems.push({
        type: 'preparation',
        data: event,
        id: `prep-${event.id}`
      });
    }

    // Add time gap before this event if it exists
    const gap = timeGaps.find(g => g.afterEventId === event.id);
    if (gap) {
      timelineItems.push({
        type: 'gap',
        data: gap,
        id: gap.id
      });
      
      // Add drop zone in significant gaps
      if (gap.duration >= 60) {
        timelineItems.push({
          type: 'dropzone',
          id: `dropzone-gap-${gap.id}`,
          suggestedTime: gap.startTime
        });
      }
    }

    // Add the event
    timelineItems.push({
      type: 'event',
      data: event,
      id: event.id
    });

    // Add post-event timeline for this event if enabled and event has post items
    if (includeTimelines && event.ai_enriched) {
      timelineItems.push({
        type: 'post-event',
        data: event,
        id: `post-${event.id}`
      });
    }

    // Add drop zone after event
    const nextEvent = sortedEvents[index + 1];
    const eventEndTime = parseISO(event.end_time);
    const dropZoneTime = addMinutes(eventEndTime, 15);
    
    timelineItems.push({
      type: 'dropzone',
      id: `dropzone-after-${event.id}`,
      suggestedTime: nextEvent 
        ? (differenceInMinutes(parseISO(nextEvent.start_time), eventEndTime) > 30 
           ? dropZoneTime.toISOString() 
           : null)
        : dropZoneTime.toISOString()
    });
  });

  // Add final drop zone if no events or after last event
  if (sortedEvents.length === 0) {
    const eveningTime = new Date(selectedDate);
    eveningTime.setHours(18, 0, 0, 0);
    timelineItems.push({
      type: 'dropzone',
      id: 'dropzone-final',
      suggestedTime: eveningTime.toISOString()
    });
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    const draggedItem = sortedEvents.find(e => e.id === event.active.id);
    setDraggedEvent(draggedItem);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over || !active) {
      setActiveId(null);
      setDraggedEvent(null);
      return;
    }

    // Handle dropping on another event (reorder)
    if (over.id !== active.id && sortedEvents.find(e => e.id === over.id)) {
      const activeIndex = sortedEvents.findIndex(e => e.id === active.id);
      const overIndex = sortedEvents.findIndex(e => e.id === over.id);
      
      if (activeIndex !== -1 && overIndex !== -1) {
        const newEvents = arrayMove(sortedEvents, activeIndex, overIndex);
        
        // Calculate new times for reordered events
        const reorderedEvents = newEvents.map((event, index) => {
          const duration = differenceInMinutes(
            parseISO(event.end_time), 
            parseISO(event.start_time)
          );
          
          let newStartTime;
          if (index === 0) {
            // First event starts at original time or 8 AM
            newStartTime = parseISO(event.start_time);
          } else {
            // Subsequent events start 15 minutes after previous event ends
            const prevEvent = newEvents[index - 1];
            const prevEndTime = parseISO(prevEvent.end_time);
            newStartTime = addMinutes(prevEndTime, 15);
          }
          
          const newEndTime = addMinutes(newStartTime, duration);
          
          return {
            ...event,
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString()
          };
        });
        
        onReorderEvents(reorderedEvents);
      }
    }
    
    // Handle dropping on drop zone (time change)
    if (typeof over.id === 'string' && over.id.startsWith('dropzone-')) {
      const dropZone = timelineItems.find(item => item.id === over.id);
      if (dropZone && dropZone.suggestedTime && draggedEvent) {
        const duration = differenceInMinutes(
          parseISO(draggedEvent.end_time),
          parseISO(draggedEvent.start_time)
        );
        
        const newStartTime = parseISO(dropZone.suggestedTime);
        const newEndTime = addMinutes(newStartTime, duration);
        
        const updatedEvent = {
          ...draggedEvent,
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString()
        };
        
        onReorderEvents(
          events.map(e => e.id === draggedEvent.id ? updatedEvent : e)
        );
      }
    }

    setActiveId(null);
    setDraggedEvent(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={sortedEvents.map(e => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {timelineItems.map((item) => {
            if (item.type === 'gap') {
              return (
                <TimeGapSeparator
                  key={item.id}
                  startTime={item.data.startTime}
                  endTime={item.data.endTime}
                />
              );
            }

            if (item.type === 'preparation') {
              return (
                <PreparationTimeline
                  key={item.id}
                  event={item.data}
                  className="mb-4"
                />
              );
            }

            if (item.type === 'event') {
              return (
                <DraggableEventCard
                  key={item.id}
                  event={item.data}
                  onEdit={onEditEvent}
                  onDelete={onDeleteEvent}
                  expandedEvents={expandedEvents}
                  toggleEventExpansion={toggleEventExpansion}
                />
              );
            }

            if (item.type === 'post-event') {
              return (
                <PostEventTimeline
                  key={item.id}
                  event={item.data}
                  className="mt-4"
                />
              );
            }

            if (item.type === 'dropzone' && item.suggestedTime) {
              return (
                <DropZone
                  key={item.id}
                  isOver={activeId && activeId !== item.id}
                  suggestedTime={item.suggestedTime}
                  onAddEvent={onAddEvent}
                  onAddTask={onAddTask}
                />
              );
            }

            return null;
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && draggedEvent ? (
          <div className="transform rotate-3 shadow-2xl">
            <EventCard
              event={draggedEvent}
              variant="small"
              showActions={false}
              className="opacity-90 border-blue-300 bg-blue-50"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DraggableTimeline;