import { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  FileText,
  Heart,
  Camera,
  DollarSign,
  UserCheck,
  MessageSquare,
  Archive
} from 'lucide-react';

const PostEventTimeline = ({ event, className = '', socket }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default
  
  if (!event) return null;

  // Generate post-event tasks based on event type
  const generatePostEventTasks = () => {
    const tasks = [];
    const eventType = event.category?.toLowerCase() || event.type?.toLowerCase() || '';
    const currentTime = new Date();
    const eventEndTime = new Date(event.end_time || event.start_time);
    
    // Common follow-up tasks for all events
    tasks.push({
      id: 'document',
      title: 'Document event notes',
      time: new Date(eventEndTime.getTime() + 30 * 60000), // 30 min after
      icon: FileText,
      color: 'blue',
      description: 'Record important details, outcomes, and observations'
    });

    // Event-type specific tasks
    if (eventType.includes('medical') || eventType.includes('doctor') || eventType.includes('health')) {
      tasks.push({
        id: 'follow-up-apt',
        title: 'Schedule follow-up appointment',
        time: new Date(eventEndTime.getTime() + 60 * 60000), // 1 hour after
        icon: Calendar,
        color: 'purple',
        description: 'Book any recommended follow-up visits'
      });
      tasks.push({
        id: 'pharmacy',
        title: 'Fill prescriptions',
        time: new Date(eventEndTime.getTime() + 2 * 60 * 60000), // 2 hours after
        icon: Heart,
        color: 'red',
        description: 'Pick up any prescribed medications'
      });
      tasks.push({
        id: 'insurance',
        title: 'Submit insurance claims',
        time: new Date(eventEndTime.getTime() + 24 * 60 * 60000), // Next day
        icon: DollarSign,
        color: 'green',
        description: 'File any necessary insurance paperwork'
      });
    }
    
    if (eventType.includes('school') || eventType.includes('education') || eventType.includes('class')) {
      tasks.push({
        id: 'homework',
        title: 'Review homework assignments',
        time: new Date(eventEndTime.getTime() + 30 * 60000),
        icon: FileText,
        color: 'indigo',
        description: 'Check for any new assignments or projects'
      });
      tasks.push({
        id: 'materials',
        title: 'Prepare tomorrow\'s materials',
        time: new Date(eventEndTime.getTime() + 4 * 60 * 60000), // 4 hours after
        icon: Archive,
        color: 'yellow',
        description: 'Pack backpack for next school day'
      });
    }
    
    if (eventType.includes('sport') || eventType.includes('game') || eventType.includes('practice')) {
      tasks.push({
        id: 'gear-clean',
        title: 'Clean and store gear',
        time: new Date(eventEndTime.getTime() + 60 * 60000),
        icon: Archive,
        color: 'orange',
        description: 'Wash uniforms, clean equipment'
      });
      tasks.push({
        id: 'photos',
        title: 'Share event photos',
        time: new Date(eventEndTime.getTime() + 2 * 60 * 60000),
        icon: Camera,
        color: 'pink',
        description: 'Upload photos to family album'
      });
      tasks.push({
        id: 'next-game',
        title: 'Confirm next game/practice',
        time: new Date(eventEndTime.getTime() + 3 * 60 * 60000),
        icon: Calendar,
        color: 'teal',
        description: 'Check schedule for upcoming events'
      });
    }
    
    if (eventType.includes('social') || eventType.includes('party') || eventType.includes('birthday')) {
      tasks.push({
        id: 'thank-you',
        title: 'Send thank you messages',
        time: new Date(eventEndTime.getTime() + 24 * 60 * 60000), // Next day
        icon: MessageSquare,
        color: 'purple',
        description: 'Thank hosts or guests'
      });
      tasks.push({
        id: 'photos-social',
        title: 'Share event photos',
        time: new Date(eventEndTime.getTime() + 2 * 60 * 60000),
        icon: Camera,
        color: 'pink',
        description: 'Share photos with attendees'
      });
    }
    
    if (eventType.includes('work') || eventType.includes('meeting') || eventType.includes('conference')) {
      tasks.push({
        id: 'action-items',
        title: 'Complete action items',
        time: new Date(eventEndTime.getTime() + 60 * 60000),
        icon: CheckCircle2,
        color: 'green',
        description: 'Follow up on meeting commitments'
      });
      tasks.push({
        id: 'expenses',
        title: 'Submit expense reports',
        time: new Date(eventEndTime.getTime() + 48 * 60 * 60000), // 2 days
        icon: DollarSign,
        color: 'emerald',
        description: 'File any reimbursable expenses'
      });
    }

    // Add general wrap-up task
    tasks.push({
      id: 'archive',
      title: 'Archive event materials',
      time: new Date(eventEndTime.getTime() + 72 * 60 * 60000), // 3 days after
      icon: Archive,
      color: 'gray',
      description: 'File documents and clean up event items'
    });

    // Sort tasks by time
    return tasks.sort((a, b) => a.time - b.time);
  };

  const tasks = generatePostEventTasks();

  const formatTime = (date) => {
    const now = new Date();
    const taskTime = new Date(date);
    const diffMs = taskTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMs > 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `In ${diffMinutes} min`;
    } else {
      return 'Complete';
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      teal: 'bg-teal-100 text-teal-800 border-teal-300',
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 hover:from-purple-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-900">Post-Event Follow-up</h3>
              <p className="text-sm text-gray-600">
                {tasks.length} follow-up task{tasks.length !== 1 ? 's' : ''} after event
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">
              {isCollapsed ? 'Show' : 'Hide'} timeline
            </span>
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {!isCollapsed && (
        <div className="p-6">
          <div className="space-y-4">
            {tasks.map((task, index) => {
              const Icon = task.icon;
              const colorClasses = getColorClasses(task.color);
              
              return (
                <div key={task.id} className="relative">
                  {/* Connection line */}
                  {index < tasks.length - 1 && (
                    <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200" />
                  )}
                  
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg border ${colorClasses} relative z-10`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">{task.title}</h4>
                        <span className="text-sm text-gray-500 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(task.time)}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostEventTimeline;