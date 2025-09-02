import { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Clock, 
  AlertTriangle, 
  CheckSquare, 
  Users, 
  Cloud, 
  CloudRain,
  User,
  MapPin
} from 'lucide-react';

// Mock data for today's events
const todayEvents = [
  {
    id: 1,
    title: 'School Drop-off',
    time: '08:00',
    location: 'Oakwood Elementary',
    type: 'school',
    attendees: ['Mom', 'Emma', 'Jake'],
    importance: 'high'
  },
  {
    id: 2,
    title: 'Team Meeting',
    time: '09:00',
    location: 'Office Conference Room A',
    type: 'work',
    attendees: ['Dad'],
    importance: 'medium'
  },
  {
    id: 3,
    title: 'Emma\'s Soccer Practice',
    time: '16:00',
    location: 'Sports Complex Field 2',
    type: 'sports',
    attendees: ['Emma', 'Mom'],
    importance: 'medium'
  },
  {
    id: 4,
    title: 'Family Dinner',
    time: '18:30',
    location: 'Home',
    type: 'family',
    attendees: ['All'],
    importance: 'high'
  }
];

// Mock data for tomorrow's events
const tomorrowEvents = [
  {
    id: 5,
    title: 'Dentist Appointment',
    time: '14:00',
    location: 'Downtown Dental',
    type: 'medical',
    attendees: ['Jake', 'Mom'],
    preparation: ['Insurance card', 'Arrive 15 min early'],
    importance: 'high'
  },
  {
    id: 6,
    title: 'Piano Lesson',
    time: '17:30',
    location: 'Music Academy',
    type: 'social',
    attendees: ['Emma'],
    preparation: ['Sheet music', 'Practice book'],
    importance: 'medium'
  }
];

// Mock reminders and tasks
const todayReminders = [
  { id: 1, text: 'Pick up dry cleaning', assignee: 'Mom', priority: 'medium' },
  { id: 2, text: 'Call pediatrician for Jake\'s checkup', assignee: 'Mom', priority: 'high' },
  { id: 3, text: 'Submit expense report', assignee: 'Dad', priority: 'medium' },
  { id: 4, text: 'Buy groceries for tomorrow\'s lunch', assignee: 'Mom', priority: 'low' }
];

const tomorrowTasks = [
  { id: 1, text: 'Prepare snacks for soccer practice', assignee: 'Mom' },
  { id: 2, text: 'Fill up car with gas', assignee: 'Dad' },
  { id: 3, text: 'Pack Emma\'s piano books', assignee: 'Emma' },
  { id: 4, text: 'Confirm dentist appointment', assignee: 'Mom' }
];

const mockWeather = {
  today: { condition: 'Sunny', high: 78, low: 65, icon: 'sun' },
  tomorrow: { condition: 'Partly Cloudy', high: 75, low: 62, icon: 'cloud' }
};

const FamilyBrief = () => {
  const [activeTab, setActiveTab] = useState('morning'); // 'morning' or 'evening'
  const [completedTasks, setCompletedTasks] = useState(new Set());

  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getWeatherIcon = (iconType) => {
    switch (iconType) {
      case 'sun': return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'cloud': return <Cloud className="h-5 w-5 text-gray-500" />;
      case 'rain': return <CloudRain className="h-5 w-5 text-blue-500" />;
      default: return <Sun className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getImportanceIndicator = (importance) => {
    if (importance === 'high') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const toggleTaskCompletion = (taskId) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const MorningBrief = () => (
    <div className="space-y-6">
      {/* Today's Schedule Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Sun className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-900">Good Morning! Today's Schedule</h3>
        </div>
        
        <div className="space-y-3">
          {todayEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between bg-white rounded p-3">
              <div className="flex items-center space-x-3">
                {getImportanceIndicator(event.importance)}
                <div>
                  <div className="font-medium text-gray-900">{event.title}</div>
                  <div className="text-sm text-gray-600 flex items-center space-x-4">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(event.time)}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {event.location}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {event.attendees.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important Reminders */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          <h3 className="text-lg font-semibold text-yellow-900">Don't Forget</h3>
        </div>
        
        <div className="space-y-2">
          {todayReminders.filter(r => r.priority === 'high').map((reminder) => (
            <div key={reminder.id} className="flex items-center justify-between bg-white rounded p-3">
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  className="rounded" 
                  onChange={() => toggleTaskCompletion(reminder.id)}
                  checked={completedTasks.has(reminder.id)}
                />
                <span className={completedTasks.has(reminder.id) ? 'line-through text-gray-500' : 'text-gray-900'}>
                  {reminder.text}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3 text-gray-400" />
                <span className="text-sm text-gray-600">{reminder.assignee}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weather Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getWeatherIcon(mockWeather.today.icon)}
            <div>
              <h3 className="font-semibold text-gray-900">Today's Weather</h3>
              <p className="text-sm text-gray-600">{mockWeather.today.condition}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {mockWeather.today.high}°
            </p>
            <p className="text-sm text-gray-600">
              Low: {mockWeather.today.low}°
            </p>
          </div>
        </div>
      </div>

      {/* Quick Tasks */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <CheckSquare className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Today's Tasks</h3>
        </div>
        
        <div className="space-y-2">
          {todayReminders.filter(r => r.priority !== 'high').map((reminder) => (
            <div key={reminder.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  className="rounded" 
                  onChange={() => toggleTaskCompletion(reminder.id)}
                  checked={completedTasks.has(reminder.id)}
                />
                <span className={completedTasks.has(reminder.id) ? 'line-through text-gray-500' : 'text-gray-700'}>
                  {reminder.text}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(reminder.priority)}`}>
                  {reminder.priority}
                </span>
                <span className="text-sm text-gray-500">{reminder.assignee}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const EveningBrief = () => (
    <div className="space-y-6">
      {/* Tomorrow's Prep */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Moon className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-purple-900">Tomorrow's Preparation</h3>
        </div>
        
        <div className="space-y-3">
          {tomorrowEvents.map((event) => (
            <div key={event.id} className="bg-white rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getImportanceIndicator(event.importance)}
                  <span className="font-medium text-gray-900">{event.title}</span>
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(event.time)}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                <MapPin className="h-3 w-3 inline mr-1" />
                {event.location} • {event.attendees.join(', ')}
              </div>
              
              {event.preparation && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">To prepare:</p>
                  {event.preparation.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                      <input type="checkbox" className="rounded" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tomorrow's Weather */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getWeatherIcon(mockWeather.tomorrow.icon)}
            <div>
              <h3 className="font-semibold text-gray-900">Tomorrow's Weather</h3>
              <p className="text-sm text-gray-600">{mockWeather.tomorrow.condition}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {mockWeather.tomorrow.high}°
            </p>
            <p className="text-sm text-gray-600">
              Low: {mockWeather.tomorrow.low}°
            </p>
          </div>
        </div>
      </div>

      {/* Evening Prep Tasks */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <CheckSquare className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Tonight's Prep</h3>
        </div>
        
        <div className="space-y-2">
          {tomorrowTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  className="rounded" 
                  onChange={() => toggleTaskCompletion(`evening-${task.id}`)}
                  checked={completedTasks.has(`evening-${task.id}`)}
                />
                <span className={completedTasks.has(`evening-${task.id}`) ? 'line-through text-gray-500' : 'text-gray-700'}>
                  {task.text}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3 text-gray-400" />
                <span className="text-sm text-gray-500">{task.assignee}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Family Moments */}
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Users className="h-5 w-5 text-pink-600 mr-2" />
          <h3 className="text-lg font-semibold text-pink-900">Family Time Reminder</h3>
        </div>
        <p className="text-pink-800 text-sm">
          Don't forget to check in with each family member about their day. 
          Emma has a math test tomorrow, and Jake was excited about show-and-tell.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('morning')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'morning'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <span>Morning Brief</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('evening')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'evening'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Moon className="h-4 w-4" />
                <span>Evening Brief</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'morning' ? <MorningBrief /> : <EveningBrief />}
        </div>
      </div>
    </div>
  );
};

export default FamilyBrief;