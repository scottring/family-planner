const express = require('express');
const router = express.Router();
const { eventContextService } = require('../services/eventContext');

// Voice command patterns for timeline queries
const VOICE_COMMANDS = {
  NEXT_TASK: [
    /what('s|s| is) next/i,
    /next task/i,
    /what do i need to do/i,
    /what('s|s| is) coming up/i
  ],
  MARK_COMPLETE: [
    /mark (.*) (complete|done|finished)/i,
    /(complete|done|finish) (.*)/i,
    /i('m| am) done with (.*)/i,
    /finished (.*)/i
  ],
  STATUS_CHECK: [
    /how are we doing/i,
    /what('s|s| is) (the |our )?progress/i,
    /timeline status/i,
    /how much (is |)left/i
  ],
  TIME_CHECK: [
    /how much time/i,
    /when (is |do we |)start/i,
    /time until/i,
    /when('s|s| is) the event/i
  ],
  TASK_LIST: [
    /list (all |)tasks/i,
    /what do we need to do/i,
    /show me (the |)timeline/i,
    /all tasks/i
  ]
};

// Convert timeline to voice-friendly format
const formatTimelineForVoice = (timeline, eventTitle, eventTime, completedTasks = new Set()) => {
  const now = new Date();
  const eventStart = new Date(eventTime);
  
  // Filter incomplete tasks
  const incompleteTasks = timeline.filter((task, index) => 
    !completedTasks.has(index) && task.type !== 'event_start'
  );
  
  // Get next task
  const nextTask = incompleteTasks.find(task => new Date(task.time) >= now);
  
  // Get overdue tasks
  const overdueTasks = incompleteTasks.filter(task => new Date(task.time) < now);
  
  // Calculate time until event
  const timeUntilEvent = Math.max(0, Math.floor((eventStart - now) / 1000 / 60));
  const hoursUntil = Math.floor(timeUntilEvent / 60);
  const minutesUntil = timeUntilEvent % 60;
  
  let timeString = '';
  if (hoursUntil > 0) {
    timeString = `${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`;
    if (minutesUntil > 0) {
      timeString += ` and ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
    }
  } else if (minutesUntil > 0) {
    timeString = `${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
  } else {
    timeString = 'now';
  }
  
  return {
    eventTitle,
    eventTime: eventTime,
    timeUntilEvent: timeString,
    totalTasks: timeline.length,
    completedCount: completedTasks.size,
    incompleteTasks,
    nextTask,
    overdueTasks,
    progress: Math.round((completedTasks.size / Math.max(timeline.length, 1)) * 100)
  };
};

// Generate voice responses
const generateVoiceResponse = (command, data, query = '') => {
  const { eventTitle, timeUntilEvent, nextTask, overdueTasks, progress, completedCount, totalTasks } = data;
  
  switch (command) {
    case 'NEXT_TASK':
      if (nextTask) {
        const taskTime = new Date(nextTask.time);
        const timeUntilTask = Math.floor((taskTime - new Date()) / 1000 / 60);
        const taskTimeString = timeUntilTask > 0 ? `in ${timeUntilTask} minutes` : 'now';
        
        return {
          text: `Your next task is ${nextTask.activity} ${taskTimeString}. ${nextTask.note || ''}`.trim(),
          action: 'show_next_task',
          data: { taskIndex: nextTask.originalIndex }
        };
      } else {
        return {
          text: `All tasks are complete! Your ${eventTitle} starts ${timeUntilEvent}.`,
          action: 'show_progress'
        };
      }
      
    case 'STATUS_CHECK':
      let statusText = `You've completed ${completedCount} out of ${totalTasks} tasks. That's ${progress}% done. `;
      
      if (overdueTasks.length > 0) {
        statusText += `You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''}. `;
      }
      
      if (nextTask) {
        statusText += `Your next task is ${nextTask.activity}.`;
      } else {
        statusText += `Your ${eventTitle} starts ${timeUntilEvent}.`;
      }
      
      return {
        text: statusText,
        action: 'show_progress',
        data: { progress, overdueTasks: overdueTasks.length }
      };
      
    case 'TIME_CHECK':
      return {
        text: `Your ${eventTitle} starts ${timeUntilEvent}. ${nextTask ? `Your next task is ${nextTask.activity}.` : 'All tasks are complete!'}`,
        action: 'show_timeline',
        data: { timeUntilEvent, eventTitle }
      };
      
    case 'TASK_LIST':
      if (data.incompleteTasks.length === 0) {
        return {
          text: `All tasks are complete! Your ${eventTitle} starts ${timeUntilEvent}.`,
          action: 'show_completed'
        };
      }
      
      const taskList = data.incompleteTasks.slice(0, 3).map((task, index) => {
        const timeUntil = Math.floor((new Date(task.time) - new Date()) / 1000 / 60);
        const timing = timeUntil > 0 ? `in ${timeUntil} minutes` : timeUntil === 0 ? 'now' : 'overdue';
        return `${index + 1}: ${task.activity} ${timing}`;
      }).join('. ');
      
      const remaining = data.incompleteTasks.length > 3 ? ` And ${data.incompleteTasks.length - 3} more tasks.` : '';
      
      return {
        text: `Here are your upcoming tasks: ${taskList}.${remaining}`,
        action: 'show_task_list',
        data: { tasks: data.incompleteTasks.slice(0, 5) }
      };
      
    case 'MARK_COMPLETE':
      // Extract task name from query and find matching task
      const taskQuery = query.toLowerCase().replace(/mark|complete|done|finished|i'm|i am|with/g, '').trim();
      const matchingTask = data.incompleteTasks.find(task => 
        task.activity.toLowerCase().includes(taskQuery) || 
        taskQuery.includes(task.activity.toLowerCase().split(' ')[0])
      );
      
      if (matchingTask) {
        return {
          text: `I'll mark "${matchingTask.activity}" as complete for you.`,
          action: 'mark_complete',
          data: { taskIndex: matchingTask.originalIndex, taskName: matchingTask.activity }
        };
      } else {
        return {
          text: `I couldn't find a task matching "${taskQuery}". Can you be more specific?`,
          action: 'clarify_task',
          data: { query: taskQuery }
        };
      }
      
    default:
      return {
        text: `I understand you're asking about your timeline. Your ${eventTitle} starts ${timeUntilEvent}. ${nextTask ? `Your next task is ${nextTask.activity}.` : 'All tasks are complete!'}`,
        action: 'show_timeline'
      };
  }
};

// Parse voice command to determine intent
const parseVoiceCommand = (text) => {
  const normalizedText = text.toLowerCase().trim();
  
  for (const [command, patterns] of Object.entries(VOICE_COMMANDS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        return { command, match: normalizedText.match(pattern) };
      }
    }
  }
  
  // Default to status check if we can't determine intent
  return { command: 'STATUS_CHECK', match: null };
};

// Voice query endpoint
router.post('/query/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { query, voice = true } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Get event details
    const event = await req.app.locals.db.collection('events').findOne({ 
      _id: req.app.locals.ObjectId(eventId) 
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Get timeline data
    let timelineData = await req.app.locals.db.collection('event_timelines').findOne({ 
      eventId: eventId 
    });
    
    if (!timelineData) {
      // Generate timeline if it doesn't exist
      try {
        timelineData = eventContextService.generatePreparationTimeline(event);
        if (timelineData) {
          await req.app.locals.db.collection('event_timelines').insertOne({
            eventId: eventId,
            timeline: timelineData.timeline,
            eventPattern: timelineData.eventPattern,
            confidence: timelineData.confidence,
            completedTasks: [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error generating timeline:', error);
        return res.status(500).json({ error: 'Could not generate timeline' });
      }
    }
    
    if (!timelineData || !timelineData.timeline) {
      return res.status(404).json({ error: 'Timeline not found' });
    }
    
    // Parse voice command
    const { command, match } = parseVoiceCommand(query);
    
    // Add original index to tasks for reference
    const timeline = timelineData.timeline.map((task, index) => ({
      ...task,
      originalIndex: index
    }));
    
    // Format timeline for voice
    const completedTasks = new Set(timelineData.completedTasks || []);
    const voiceData = formatTimelineForVoice(
      timeline,
      event.title,
      event.start_time,
      completedTasks
    );
    
    // Generate response
    const response = generateVoiceResponse(command, voiceData, query);
    
    // Log voice interaction for analytics
    console.log(`Voice query: "${query}" -> Command: ${command}`);
    
    res.json({
      success: true,
      query: query,
      command: command,
      response: response,
      voiceData: voice ? voiceData : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing voice query:', error);
    res.status(500).json({ 
      error: 'Error processing voice query',
      details: error.message 
    });
  }
});

// Voice action endpoint - execute actions from voice commands
router.post('/action/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { action, data } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }
    
    let result = { success: true, action, data };
    
    switch (action) {
      case 'mark_complete':
        if (data && typeof data.taskIndex !== 'undefined') {
          // Update timeline completion status
          await req.app.locals.db.collection('event_timelines').updateOne(
            { eventId: eventId },
            { 
              $addToSet: { completedTasks: data.taskIndex },
              $set: { updatedAt: new Date() }
            }
          );
          
          result.message = `Marked "${data.taskName}" as complete`;
          
          // Emit WebSocket event for real-time updates
          if (req.app.locals.io) {
            req.app.locals.io.emit('task-completion-updated', {
              eventId: eventId,
              taskIndex: data.taskIndex,
              completed: true,
              updatedBy: 'voice-assistant'
            });
          }
        } else {
          result.success = false;
          result.error = 'Task index required for completion';
        }
        break;
        
      case 'show_next_task':
      case 'show_progress':
      case 'show_timeline':
      case 'show_task_list':
      case 'show_completed':
        // These are UI actions that don't require server-side processing
        result.message = `Displaying ${action.replace('show_', '').replace('_', ' ')}`;
        break;
        
      case 'clarify_task':
        result.message = 'Please provide more specific task information';
        break;
        
      default:
        result.success = false;
        result.error = 'Unknown action';
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error executing voice action:', error);
    res.status(500).json({ 
      error: 'Error executing voice action',
      details: error.message 
    });
  }
});

// Get timeline optimized for voice assistants
router.get('/timeline/:eventId/voice', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { format = 'simple' } = req.query;
    
    // Get event details
    const event = await req.app.locals.db.collection('events').findOne({ 
      _id: req.app.locals.ObjectId(eventId) 
    });
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Get timeline data
    const timelineData = await req.app.locals.db.collection('event_timelines').findOne({ 
      eventId: eventId 
    });
    
    if (!timelineData) {
      return res.status(404).json({ error: 'Timeline not found' });
    }
    
    const completedTasks = new Set(timelineData.completedTasks || []);
    const timeline = timelineData.timeline.map((task, index) => ({
      ...task,
      originalIndex: index
    }));
    
    if (format === 'detailed') {
      // Detailed format for advanced voice assistants
      res.json({
        event: {
          id: eventId,
          title: event.title,
          startTime: event.start_time,
          location: event.location
        },
        timeline: {
          total: timeline.length,
          completed: completedTasks.size,
          remaining: timeline.length - completedTasks.size,
          progress: Math.round((completedTasks.size / Math.max(timeline.length, 1)) * 100),
          tasks: timeline.map(task => ({
            index: task.originalIndex,
            activity: task.activity,
            time: task.time,
            duration: task.duration,
            type: task.type,
            completed: completedTasks.has(task.originalIndex),
            voiceFriendly: task.activity.replace(/[^\w\s]/g, ''), // Remove special characters
            timeUntil: Math.floor((new Date(task.time) - new Date()) / 1000 / 60)
          }))
        }
      });
    } else {
      // Simple format for basic voice queries
      const voiceData = formatTimelineForVoice(
        timeline,
        event.title,
        event.start_time,
        completedTasks
      );
      
      res.json({
        eventTitle: voiceData.eventTitle,
        timeUntilEvent: voiceData.timeUntilEvent,
        progress: `${voiceData.progress}% complete`,
        nextTask: voiceData.nextTask ? {
          activity: voiceData.nextTask.activity,
          timeUntil: Math.floor((new Date(voiceData.nextTask.time) - new Date()) / 1000 / 60)
        } : null,
        summary: `${voiceData.completedCount} of ${voiceData.totalTasks} tasks completed`
      });
    }
    
  } catch (error) {
    console.error('Error getting voice timeline:', error);
    res.status(500).json({ 
      error: 'Error getting timeline data',
      details: error.message 
    });
  }
});

module.exports = router;