import { Clock, Coffee, Utensils, CarFront, Home } from 'lucide-react';
import { differenceInMinutes, format, parseISO } from 'date-fns';

const TimeGapSeparator = ({ 
  startTime, 
  endTime, 
  className = '',
  showSuggestions = true 
}) => {
  if (!startTime || !endTime) return null;

  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;
  
  const gapMinutes = differenceInMinutes(end, start);
  
  // Don't show separator for gaps less than 15 minutes
  if (gapMinutes < 15) return null;

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getSuggestions = (minutes) => {
    const suggestions = [];
    
    if (minutes >= 15 && minutes < 30) {
      suggestions.push({ icon: Coffee, text: 'Quick coffee break', color: 'text-amber-600' });
    } else if (minutes >= 30 && minutes < 60) {
      suggestions.push({ icon: Coffee, text: 'Coffee & prep time', color: 'text-amber-600' });
      suggestions.push({ icon: CarFront, text: 'Travel time', color: 'text-blue-600' });
    } else if (minutes >= 60 && minutes < 120) {
      suggestions.push({ icon: Utensils, text: 'Lunch break', color: 'text-green-600' });
      suggestions.push({ icon: Home, text: 'Home activities', color: 'text-purple-600' });
    } else if (minutes >= 120) {
      suggestions.push({ icon: Utensils, text: 'Meal time', color: 'text-green-600' });
      suggestions.push({ icon: Home, text: 'Personal time', color: 'text-purple-600' });
    }
    
    return suggestions;
  };

  const suggestions = getSuggestions(gapMinutes);
  const gapType = gapMinutes >= 120 ? 'long' : gapMinutes >= 60 ? 'medium' : 'short';

  return (
    <div className={`relative my-6 ${className}`}>
      {/* Main separator line */}
      <div className="flex items-center">
        <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
        <div className={`mx-4 px-4 py-2 rounded-full ${
          gapType === 'long' ? 'bg-purple-100 text-purple-700' :
          gapType === 'medium' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        } font-medium flex items-center space-x-2`}>
          <Clock className="h-4 w-4" />
          <span>{formatDuration(gapMinutes)} gap</span>
        </div>
        <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{format(start, 'h:mm a')}</span>
        <span>{format(end, 'h:mm a')}</span>
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-3 flex justify-center">
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center space-x-4">
              <span className="text-xs text-gray-500 font-medium">Perfect time for:</span>
              <div className="flex items-center space-x-3">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="flex items-center space-x-1 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors"
                    title={`Add ${suggestion.text} to your schedule`}
                  >
                    <suggestion.icon className={`h-4 w-4 ${suggestion.color}`} />
                    <span className={`text-xs ${suggestion.color} font-medium`}>
                      {suggestion.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add event/task placeholder for longer gaps */}
      {gapMinutes >= 60 && (
        <div className="mt-3 flex justify-center">
          <button
            className="group flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-gray-500 hover:text-blue-600"
            aria-label="Add event or task in this time gap"
          >
            <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
              <div className="w-2 h-2 bg-current rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span className="text-sm font-medium">Add something here</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TimeGapSeparator;