import { useState, useEffect, useMemo } from 'react';
import { useEventStore } from '../stores/eventStore';
import { useTaskStore } from '../stores/taskStore';
import { parseISO, startOfDay, endOfDay, isSameDay, differenceInMinutes } from 'date-fns';

export const useTodayEvents = (selectedDate = null) => {
  const { events, fetchEvents } = useEventStore();
  const { tasks, fetchTasks } = useTaskStore();
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  const targetDate = useMemo(() => selectedDate || new Date(), [selectedDate]);

  useEffect(() => {
    fetchEvents();
    fetchTasks();
  }, []);

  // Filter and categorize events for today
  const todayEvents = useMemo(() => {
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);
    
    return events
      .filter(event => {
        if (!event.start_time) return false;
        const eventDate = parseISO(event.start_time);
        return eventDate >= start && eventDate <= end;
      })
      .map(event => ({
        ...event,
        parsedStartTime: parseISO(event.start_time),
        parsedEndTime: parseISO(event.end_time),
        category: event.category || event.type || 'personal'
      }))
      .sort((a, b) => a.parsedStartTime - b.parsedStartTime);
  }, [events, targetDate]);

  // Filter tasks for today
  const todayTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = parseISO(task.due_date);
      return isSameDay(taskDate, targetDate);
    });
  }, [tasks, targetDate]);

  // Categorize events by timing relative to current time
  const categorizedEvents = useMemo(() => {
    const now = new Date();
    const currentEvents = [];
    const nextEvents = [];
    const pastEvents = [];
    const futureEvents = [];

    todayEvents.forEach(event => {
      const startTime = event.parsedStartTime;
      const endTime = event.parsedEndTime;
      
      if (now >= startTime && now <= endTime) {
        // Currently happening
        currentEvents.push({ ...event, status: 'current' });
      } else if (startTime > now && differenceInMinutes(startTime, now) <= 120) {
        // Next 2 hours
        nextEvents.push({ ...event, status: 'next' });
      } else if (startTime < now) {
        // Past events
        pastEvents.push({ ...event, status: 'past' });
      } else {
        // Future events (beyond 2 hours)
        futureEvents.push({ ...event, status: 'future' });
      }
    });

    return { currentEvents, nextEvents, pastEvents, futureEvents };
  }, [todayEvents]);

  // Get time gaps between events
  const timeGaps = useMemo(() => {
    const gaps = [];
    
    for (let i = 0; i < todayEvents.length - 1; i++) {
      const currentEvent = todayEvents[i];
      const nextEvent = todayEvents[i + 1];
      
      const gapMinutes = differenceInMinutes(
        nextEvent.parsedStartTime,
        currentEvent.parsedEndTime
      );
      
      if (gapMinutes >= 15) {
        gaps.push({
          id: `gap-${i}`,
          startTime: currentEvent.parsedEndTime,
          endTime: nextEvent.parsedStartTime,
          duration: gapMinutes,
          beforeEventId: currentEvent.id,
          afterEventId: nextEvent.id
        });
      }
    }
    
    return gaps;
  }, [todayEvents]);

  // Auto-expansion logic for current and next events
  useEffect(() => {
    const autoExpandEvents = new Set();
    
    // Auto-expand current events
    categorizedEvents.currentEvents.forEach(event => {
      autoExpandEvents.add(event.id);
    });
    
    // Auto-expand next events (within 1 hour)
    const now = new Date();
    categorizedEvents.nextEvents.forEach(event => {
      if (differenceInMinutes(event.parsedStartTime, now) <= 60) {
        autoExpandEvents.add(event.id);
      }
    });
    
    setExpandedEvents(autoExpandEvents);
  }, [categorizedEvents]);

  // Toggle event expansion
  const toggleEventExpansion = (eventId, forceState = null) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (forceState !== null) {
        if (forceState) {
          newSet.add(eventId);
        } else {
          newSet.delete(eventId);
        }
      } else {
        if (newSet.has(eventId)) {
          newSet.delete(eventId);
        } else {
          newSet.add(eventId);
        }
      }
      return newSet;
    });
  };

  return {
    todayEvents,
    todayTasks,
    categorizedEvents,
    timeGaps,
    expandedEvents,
    toggleEventExpansion,
    targetDate
  };
};