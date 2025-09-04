const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const auth = require('../middleware/auth');

const dbPath = path.join(__dirname, '../family_symphony.db');
const db = new Database(dbPath);

// Mock weather service for demonstration
const getWeatherData = async () => {
  // In a real app, this would call an external weather API
  const mockWeather = [
    { temperature: 72, condition: 'sunny' },
    { temperature: 68, condition: 'cloudy' },
    { temperature: 65, condition: 'rainy' },
    { temperature: 58, condition: 'cloudy' },
  ];
  const randomIndex = Math.floor(Math.random() * mockWeather.length);
  return mockWeather[randomIndex];
};

// GET /api/dashboard/summary - Get aggregated dashboard data
router.get('/summary', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);

    // Today's events
    const todaysEventsQuery = `
      SELECT * FROM events 
      WHERE date(start_time) = date('now', 'localtime')
      ORDER BY start_time ASC
    `;
    const todaysEvents = db.prepare(todaysEventsQuery).all();

    // Tomorrow's events
    const tomorrowEventsQuery = `
      SELECT * FROM events 
      WHERE date(start_time) = date('now', '+1 day', 'localtime')
      ORDER BY start_time ASC
    `;
    const tomorrowEvents = db.prepare(tomorrowEventsQuery).all();

    // This week's events
    const weekEventsQuery = `
      SELECT * FROM events 
      WHERE date(start_time) BETWEEN date('now', 'localtime') 
      AND date('now', '+7 days', 'localtime')
      ORDER BY start_time ASC
    `;
    const weekEvents = db.prepare(weekEventsQuery).all();

    // Active tasks
    const activeTasksQuery = `
      SELECT * FROM tasks 
      WHERE completed = 0
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END,
        due_date ASC
    `;
    const activeTasks = db.prepare(activeTasksQuery).all();

    // Overdue tasks
    const overdueTasksQuery = `
      SELECT * FROM tasks 
      WHERE completed = 0 
      AND due_date < date('now', 'localtime')
      ORDER BY due_date ASC
    `;
    const overdueTasks = db.prepare(overdueTasksQuery).all();

    // Tasks due today
    const dueTodayTasksQuery = `
      SELECT * FROM tasks 
      WHERE completed = 0 
      AND date(due_date) = date('now', 'localtime')
      ORDER BY priority DESC
    `;
    const dueTodayTasks = db.prepare(dueTodayTasksQuery).all();

    // Recent conflicts
    const conflictsQuery = `
      SELECT * FROM event_conflicts 
      WHERE resolved = 0 
      AND date(conflict_date) >= date('now', 'localtime')
      ORDER BY conflict_date ASC
      LIMIT 5
    `;
    const activeConflicts = db.prepare(conflictsQuery).all();

    // Family member activity summary
    const familyActivityQuery = `
      SELECT 
        u.username,
        u.full_name,
        COUNT(DISTINCT t.id) as active_tasks,
        COUNT(DISTINCT e.id) as today_events
      FROM users u
      LEFT JOIN tasks t ON (t.assigned_to = u.username AND t.completed = 0)
      LEFT JOIN events e ON (
        (e.assigned_to = u.username OR e.organizer = u.username) 
        AND date(e.start_time) = date('now', 'localtime')
      )
      GROUP BY u.id, u.username, u.full_name
    `;
    const familyActivity = db.prepare(familyActivityQuery).all();

    // Generate insights
    const insights = [];
    
    if (overdueTasks.length > 0) {
      insights.push({
        type: 'warning',
        message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} overdue - need immediate attention`,
        priority: 'high'
      });
    }

    if (dueTodayTasks.length > 0) {
      insights.push({
        type: 'info',
        message: `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? 's' : ''} due today`,
        priority: 'medium'
      });
    }

    if (todaysEvents.length > 5) {
      insights.push({
        type: 'info',
        message: 'Busy day ahead with multiple events scheduled',
        priority: 'medium'
      });
    }

    if (activeConflicts.length > 0) {
      insights.push({
        type: 'warning',
        message: `${activeConflicts.length} schedule conflict${activeConflicts.length > 1 ? 's' : ''} need resolution`,
        priority: 'high'
      });
    }

    // Summary statistics
    const summary = {
      todaysEvents: {
        total: todaysEvents.length,
        family: todaysEvents.filter(e => e.type === 'family').length,
        needingPrep: todaysEvents.filter(e => {
          try {
            const checklist = JSON.parse(e.checklist || '[]');
            return checklist.length > 0 && checklist.some(item => !item.completed);
          } catch {
            return false;
          }
        }).length
      },
      tomorrowEvents: {
        total: tomorrowEvents.length,
        early: tomorrowEvents.filter(e => {
          const eventTime = new Date(e.start_time);
          return eventTime.getHours() < 9;
        }).length
      },
      tasks: {
        active: activeTasks.length,
        overdue: overdueTasks.length,
        dueToday: dueTodayTasks.length,
        highPriority: activeTasks.filter(t => t.priority === 'high').length
      },
      conflicts: {
        active: activeConflicts.length
      },
      familyActivity: familyActivity,
      insights: insights,
      focus: insights.length > 0 
        ? insights.find(i => i.priority === 'high')?.message || insights[0].message
        : 'Family coordination and task completion',
      keyReminders: [
        ...dueTodayTasks.slice(0, 2).map(t => `Complete: ${t.title}`),
        ...todaysEvents.slice(0, 2).map(e => {
          const time = new Date(e.start_time).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          return `${time}: ${e.title}`;
        })
      ].slice(0, 3)
    };

    res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/dashboard/personal/:userId - Get personal dashboard data
router.get('/personal/:userId', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Get user info
    const userQuery = `SELECT * FROM users WHERE id = ?`;
    const user = db.prepare(userQuery).get(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);

    // Personal tasks
    const personalTasksQuery = `
      SELECT * FROM tasks 
      WHERE (assigned_to = ? OR created_by = ?)
      ORDER BY 
        completed ASC,
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END,
        due_date ASC
    `;
    const personalTasks = db.prepare(personalTasksQuery).all(user.username, userId);

    // Personal events
    const personalEventsQuery = `
      SELECT * FROM events 
      WHERE assigned_to = ? OR organizer = ? OR attendees LIKE ?
      ORDER BY start_time ASC
    `;
    const personalEvents = db.prepare(personalEventsQuery)
      .all(user.username, user.username, `%${user.username}%`);

    // Filter for different time periods
    const todayEvents = personalEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    });

    const thisWeekEvents = personalEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate <= weekFromNow;
    });

    // Task categorization
    const completedTasks = personalTasks.filter(t => t.completed);
    const pendingTasks = personalTasks.filter(t => !t.completed);
    const overdueTasks = pendingTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate < today;
    });
    const dueTodayTasks = pendingTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate.toDateString() === today.toDateString();
    });

    // Performance metrics
    const completionRate = personalTasks.length > 0 
      ? Math.round((completedTasks.length / personalTasks.length) * 100) 
      : 0;

    // Workload analysis
    const workloadScore = pendingTasks.length + 
                         todayEvents.length + 
                         (overdueTasks.length * 2);

    let workloadLevel = 'light';
    if (workloadScore >= 10) workloadLevel = 'heavy';
    else if (workloadScore >= 6) workloadLevel = 'moderate';

    // Priority task breakdown
    const priorityBreakdown = {
      high: pendingTasks.filter(t => t.priority === 'high').length,
      medium: pendingTasks.filter(t => t.priority === 'medium').length,
      low: pendingTasks.filter(t => t.priority === 'low').length,
    };

    // Productivity insights
    const insights = [];
    
    if (completionRate >= 80) {
      insights.push('Excellent task completion rate! Keep up the great work.');
    } else if (completionRate >= 60) {
      insights.push('Good progress on tasks. Consider focusing on high-priority items.');
    } else if (completionRate >= 40) {
      insights.push('Room for improvement on task completion. Break down large tasks into smaller ones.');
    } else {
      insights.push('Consider reviewing your task management approach and priorities.');
    }

    if (overdueTasks.length > 0) {
      insights.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need immediate attention.`);
    }

    if (workloadLevel === 'heavy') {
      insights.push('Heavy workload detected. Consider delegating or rescheduling some items.');
    }

    const personalData = {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name
      },
      statistics: {
        totalTasks: personalTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        dueTodayTasks: dueTodayTasks.length,
        todayEvents: todayEvents.length,
        thisWeekEvents: thisWeekEvents.length,
        completionRate: completionRate,
        workloadLevel: workloadLevel,
        workloadScore: workloadScore
      },
      priorityBreakdown: priorityBreakdown,
      insights: insights,
      recentTasks: personalTasks.slice(0, 10),
      upcomingEvents: thisWeekEvents.slice(0, 5),
      recommendations: [
        overdueTasks.length > 0 ? 'Focus on completing overdue tasks first' : null,
        dueTodayTasks.length > 0 ? 'Complete today\'s tasks before end of day' : null,
        priorityBreakdown.high > 0 ? 'Prioritize high-importance tasks' : null,
        todayEvents.length > 3 ? 'Prepare for busy day with multiple events' : null
      ].filter(Boolean).slice(0, 3)
    };

    res.json(personalData);
  } catch (error) {
    console.error('Personal dashboard error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch personal dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/dashboard/weather - Get weather data (mock)
router.get('/weather', auth, async (req, res) => {
  try {
    // In production, this would integrate with a real weather API
    const weatherData = await getWeatherData();
    
    res.json({
      current: weatherData,
      location: 'Your Location', // Would be based on user settings
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch weather data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/dashboard/family-workload - Get family workload distribution
router.get('/family-workload', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const workloadQuery = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.email,
        COUNT(DISTINCT t.id) as active_tasks,
        COUNT(DISTINCT CASE WHEN t.priority = 'high' THEN t.id END) as high_priority_tasks,
        COUNT(DISTINCT CASE WHEN date(t.due_date) = date('now', 'localtime') THEN t.id END) as due_today_tasks,
        COUNT(DISTINCT CASE WHEN t.due_date < date('now', 'localtime') THEN t.id END) as overdue_tasks,
        COUNT(DISTINCT e.id) as today_events,
        COUNT(DISTINCT CASE WHEN e.checklist IS NOT NULL AND e.checklist != '[]' THEN e.id END) as events_need_prep
      FROM users u
      LEFT JOIN tasks t ON (t.assigned_to = u.username AND t.completed = 0)
      LEFT JOIN events e ON (
        (e.assigned_to = u.username OR e.organizer = u.username) 
        AND date(e.start_time) = date('now', 'localtime')
      )
      GROUP BY u.id, u.username, u.full_name, u.email
      ORDER BY (
        COUNT(DISTINCT t.id) + 
        COUNT(DISTINCT e.id) + 
        (COUNT(DISTINCT CASE WHEN t.due_date < date('now', 'localtime') THEN t.id END) * 2)
      ) DESC
    `;

    const workloadData = db.prepare(workloadQuery).all();

    // Calculate workload levels and balance
    const processedData = workloadData.map(member => {
      const workloadScore = member.active_tasks + 
                           member.today_events + 
                           (member.overdue_tasks * 2);
      
      let workloadLevel = 'light';
      if (workloadScore >= 8) workloadLevel = 'heavy';
      else if (workloadScore >= 4) workloadLevel = 'moderate';

      return {
        ...member,
        workload_score: workloadScore,
        workload_level: workloadLevel,
        needs_attention: member.overdue_tasks > 0 || member.due_today_tasks > 2,
        availability_status: workloadScore <= 2 ? 'available' : 
                           workloadScore <= 5 ? 'busy' : 'overloaded'
      };
    });

    // Generate balance insights
    const workloadScores = processedData.map(m => m.workload_score);
    const maxWorkload = Math.max(...workloadScores);
    const minWorkload = Math.min(...workloadScores);
    const avgWorkload = workloadScores.reduce((a, b) => a + b, 0) / workloadScores.length;

    const balanceInsights = {
      isBalanced: (maxWorkload - minWorkload) <= 3,
      heaviestMember: processedData.find(m => m.workload_score === maxWorkload),
      lightestMember: processedData.find(m => m.workload_score === minWorkload),
      averageWorkload: Math.round(avgWorkload * 100) / 100,
      recommendations: []
    };

    if (!balanceInsights.isBalanced) {
      balanceInsights.recommendations.push(
        `Consider redistributing tasks from ${balanceInsights.heaviestMember.full_name} to balance workload`
      );
    }

    const overloadedMembers = processedData.filter(m => m.workload_level === 'heavy').length;
    if (overloadedMembers > 0) {
      balanceInsights.recommendations.push(
        `${overloadedMembers} family member${overloadedMembers > 1 ? 's' : ''} may be overloaded`
      );
    }

    res.json({
      members: processedData,
      balance: balanceInsights,
      summary: {
        totalActiveTasks: workloadData.reduce((sum, m) => sum + m.active_tasks, 0),
        totalTodayEvents: workloadData.reduce((sum, m) => sum + m.today_events, 0),
        totalOverdue: workloadData.reduce((sum, m) => sum + m.overdue_tasks, 0),
        membersNeedingAttention: processedData.filter(m => m.needs_attention).length
      }
    });
  } catch (error) {
    console.error('Family workload error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch family workload data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;