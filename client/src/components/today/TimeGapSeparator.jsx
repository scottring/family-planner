import { Clock } from 'lucide-react';
import { differenceInMinutes, format, parseISO } from 'date-fns';

const TimeGapSeparator = ({ 
  startTime, 
  endTime, 
  className = ''
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

    </div>
  );
};

export default TimeGapSeparator;