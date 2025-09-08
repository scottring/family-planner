import { useState } from 'react';
import { X } from 'lucide-react';
import TransportationEventForm from './TransportationEventForm';

const TransportationModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  event = null,
  initialData = null,
  mode = 'plan' // 'plan' | 'edit' | 'return'
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Prepare transportation data based on mode and initial data
  const prepareTransportationData = () => {
    if (mode === 'return' && event && initialData) {
      // For return trips, reverse the origin and destination
      return {
        title: `Return from ${event.title || 'Event'}`,
        start_time: event.end_time || event.start_time,
        transportation_mode: initialData.transportation_mode || 'driving',
        starting_address: initialData.destination_address || event.location || '',
        destination_address: initialData.starting_address || '',
        // Reverse stops order for return trip
        stops: initialData.stops ? [...initialData.stops].reverse() : [],
        parking_info: initialData.parking_info || '',
        notes: `Return trip from ${event.title || 'event'}`
      };
    }

    if (initialData) {
      return initialData;
    }

    // Default data for new transportation planning
    return {
      title: event ? `Transportation to ${event.title}` : 'Transportation Planning',
      start_time: event?.start_time || '',
      destination_address: event?.location || '',
      transportation_mode: 'driving'
    };
  };

  const handleSave = async (transportationData) => {
    setLoading(true);
    try {
      await onSave(transportationData);
      onClose();
    } catch (error) {
      console.error('Error saving transportation data:', error);
      // Error handling is done in the form itself
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'return':
        return 'Plan Return Trip';
      case 'edit':
        return 'Edit Transportation';
      default:
        return 'Plan Transportation';
    }
  };

  const transportationData = prepareTransportationData();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{getModalTitle()}</h2>
            {event && (
              <p className="text-sm text-gray-600 mt-1">
                For: {event.title}
                {event.start_time && (
                  <span className="ml-2">
                    • {new Date(event.start_time).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <TransportationEventForm
            event={transportationData}
            onSave={handleSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default TransportationModal;