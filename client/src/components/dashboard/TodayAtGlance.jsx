import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Sun, Cloud, CloudRain, Snowflake } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useEventStore } from '../../stores/eventStore';
import { useAuthStore } from '../../stores/authStore';

const TodayAtGlance = () => {
  const { user } = useAuthStore();
  const { events } = useEventStore();
  const { 
    getTodaysSummary, 
    getWeatherData, 
    layoutPreferences, 
    fetchWeatherData,
    loading 
  } = useDashboardStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch weather on component mount if enabled
  useEffect(() => {
    if (layoutPreferences.showWeather) {
      fetchWeatherData();
    }
  }, [fetchWeatherData, layoutPreferences.showWeather]);

  // Get today's events
  const todaysEvents = events.filter(event => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const eventDate = new Date(event.start_time);
    return eventDate >= today && eventDate < tomorrow;
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  // Get next event
  const getNextEvent = () => {
    const now = new Date();
    return todaysEvents.find(event => {
      const eventTime = new Date(event.start_time);
      return eventTime > now;
    });
  };

  const nextEvent = getNextEvent();
  const weatherData = getWeatherData();
  const todaysSummary = getTodaysSummary();

  // Weather icon mapping
  const getWeatherIcon = (condition) => {
    const iconClass = "h-6 w-6";
    switch (condition?.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className={`${iconClass} text-yellow-500`} />;
      case 'cloudy':
      case 'partly cloudy':
        return <Cloud className={`${iconClass} text-gray-500`} />;
      case 'rainy':
      case 'rain':
        return <CloudRain className={`${iconClass} text-blue-500`} />;
      case 'snowy':
      case 'snow':
        return <Snowflake className={`${iconClass} text-blue-300`} />;
      default:
        return <Sun className={`${iconClass} text-yellow-500`} />;
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimeUntilEvent = (eventTime) => {
    const now = new Date();
    const event = new Date(eventTime);
    const diffMs = event.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Now';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 card-hover">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Today at a Glance</h2>
          </div>
          <div className="text-sm text-blue-600 font-medium">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Date and Weather Row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {formatDate(currentTime)}
            </h3>
            <p className="text-gray-600">
              Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.username}!
            </p>
          </div>
          
          {layoutPreferences.showWeather && (
            <div className="flex items-center space-x-3">
              {loading.weather ? (
                <div className="animate-pulse flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <div className="w-12 h-4 bg-gray-200 rounded"></div>
                </div>
              ) : weatherData ? (
                <>
                  {getWeatherIcon(weatherData.condition)}
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {weatherData.temperature}°F
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {weatherData.condition}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400">Weather unavailable</div>
              )}
            </div>
          )}
        </div>

        {/* Key Events Today */}
        <div className="space-y-4">
          {/* Next Event Highlight */}
          {nextEvent && layoutPreferences.showNextEventCountdown && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
                      Next Event
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-blue-900 mb-2">
                    {nextEvent.title}
                  </h4>
                  <div className="flex items-center space-x-4 text-blue-700 text-sm">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(new Date(nextEvent.start_time))}</span>
                    </span>
                    {nextEvent.location && (
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{nextEvent.location}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center ml-4">
                  <div className="bg-white/80 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-900">
                      {getTimeUntilEvent(nextEvent.start_time)}
                    </div>
                    <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                      until start
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {todaysEvents.length}
              </div>
              <div className="text-sm text-gray-600">Events Today</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {todaysEvents.filter(e => 
                  e.attendees?.includes('All') || 
                  e.type === 'family'
                ).length}
              </div>
              <div className="text-sm text-gray-600">Family Events</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {todaysEvents.filter(e => 
                  e.checklist && e.checklist.length > 0
                ).length}
              </div>
              <div className="text-sm text-gray-600">Need Prep</div>
            </div>
          </div>

          {/* Quick Summary */}
          {todaysSummary && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Today's Focus:</strong> {todaysSummary.focus || 'Family coordination and task completion'}
              </div>
              {todaysSummary.keyReminders && todaysSummary.keyReminders.length > 0 && (
                <div className="mt-2 text-sm text-green-700">
                  <strong>Key Reminders:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {todaysSummary.keyReminders.slice(0, 2).map((reminder, index) => (
                      <li key={index}>{reminder}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {todaysEvents.length === 0 && (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No events scheduled for today</p>
              <p className="text-sm text-gray-400">Enjoy your free day!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodayAtGlance;