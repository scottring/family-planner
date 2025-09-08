import { useState, useEffect } from 'react';
import {
  MapPin,
  GripVertical,
  Home,
  Building2,
  Trash2,
  Clock,
  Route,
  AlertCircle,
  Navigation
} from 'lucide-react';
import LocationCombobox from '../common/LocationCombobox';

const RouteStopBuilder = ({ 
  stop, 
  index, 
  onChange, 
  onRemove, 
  isOrigin = false, 
  isDestination = false,
  totalStops = 1,
  routeInfo = null
}) => {
  // Local state
  const [estimatedArrival, setEstimatedArrival] = useState(null);

  // Saved locations for quick access
  const savedLocations = [
    { id: 'home', name: 'Home', address: '123 Main St, San Francisco, CA 94122' },
    { id: 'work', name: 'Work', address: '456 Market St, San Francisco, CA 94102' },
    { id: 'school', name: 'School', address: '789 Education Way, San Francisco, CA 94118' }
    { label: 'ATM', value: 'atm', icon: Building2 }
  ];

  // Determine stop type and color scheme
  const getStopTypeInfo = () => {
    if (isOrigin) {
      return {
        type: 'origin',
        color: 'bg-green-100 border-green-300 text-green-700',
        iconColor: 'text-green-600',
        icon: Home,
        label: 'Starting Point'
      };
    }
    if (isDestination) {
      return {
        type: 'destination', 
        color: 'bg-red-100 border-red-300 text-red-700',
        iconColor: 'text-red-600',
        icon: Navigation,
        label: 'Destination'
      };
    }
    return {
      type: 'waypoint',
      color: 'bg-blue-100 border-blue-300 text-blue-700',
      iconColor: 'text-blue-600',
      icon: MapPin,
      label: `Stop ${index}`
    };
  };

  const stopTypeInfo = getStopTypeInfo();
  const StopIcon = stopTypeInfo.icon;

  // Calculate estimated arrival time based on route position
  useEffect(() => {
    if (routeInfo?.duration && routeInfo?.departureTime && !isOrigin) {
      try {
        const departureTime = new Date(routeInfo.departureTime);
        const totalDurationMinutes = parseDuration(routeInfo.duration);
        
        // Estimate this stop's position in the route
        let positionRatio = 0.5; // Default to halfway
        if (isDestination) {
          positionRatio = 1.0;
        } else if (typeof index === 'number' && totalStops > 1) {
          positionRatio = (index + 1) / (totalStops + 1); // +1 to account for destination
        }
        
        const arrivalTimeMinutes = Math.round(totalDurationMinutes * positionRatio);
        const arrivalTime = new Date(departureTime.getTime() + (arrivalTimeMinutes * 60 * 1000));
        
        setEstimatedArrival(arrivalTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }));
      } catch (error) {
        console.error('Error calculating arrival time:', error);
        setEstimatedArrival(null);
      }
    }
  }, [routeInfo, index, totalStops, isOrigin, isDestination]);

  // Parse duration string to minutes
  const parseDuration = (durationString) => {
    if (!durationString) return 0;
    const matches = durationString.match(/(\d+)h?\s*(\d+)?m?/);
    if (!matches) return 30;
    const hours = parseInt(matches[1]) || 0;
    const minutes = parseInt(matches[2]) || 0;
    return (hours * 60) + minutes;
  };

  // Handle location change from LocationCombobox
  const handleLocationChange = (location) => {
    if (!location) return;
    
    const updatedStop = {
      ...stop,
      address: location.address,
      name: location.name || '',
      place_data: location.metadata || location,
      // Clear calculated info when address changes
      additional_miles: 0,
      additional_time: '0 min'
    };
    onChange(updatedStop);
  };

  // Create location object for LocationCombobox value
  const currentLocation = stop?.address ? {
    type: stop.place_data?.type || 'address',
    name: stop.name || null,
    address: stop.address,
    placeId: stop.place_data?.placeId || null,
    rating: stop.place_data?.rating || null,
    metadata: stop.place_data
  } : null;

  // Handle remove stop
  const handleRemoveStop = () => {
    if (onRemove) {
      onRemove(stop.id || index);
    }
  };

  return (
    <>
      <div className={`bg-white rounded-lg border-2 ${stopTypeInfo.color} p-4 space-y-4`}>
        {/* Stop Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Drag Handle - hidden for origin/destination */}
            {!isOrigin && !isDestination && (
              <div className="cursor-grab hover:cursor-grabbing text-gray-400">
                <GripVertical className="h-5 w-5" />
              </div>
            )}
            
            {/* Stop Icon and Number */}
            <div className={`flex items-center space-x-2 ${stopTypeInfo.iconColor}`}>
              <StopIcon className="h-5 w-5" />
              <span className="font-medium">{stopTypeInfo.label}</span>
            </div>

            {/* Estimated Arrival Time */}
            {estimatedArrival && !isOrigin && (
              <div className="flex items-center space-x-1 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                <Clock className="h-3 w-3" />
                <span>ETA: {estimatedArrival}</span>
              </div>
            )}
          </div>

          {/* Remove Button - only for waypoints */}
          {!isOrigin && !isDestination && (
            <button
              onClick={handleRemoveStop}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove stop"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Location Input Section */}
        <div className="space-y-3">
          <LocationCombobox
            value={currentLocation}
            onChange={handleLocationChange}
            placeholder={`Enter ${stopTypeInfo.label.toLowerCase()} address or search for a place...`}
            savedLocations={savedLocations}
            className="w-full"
          />
          
          {/* Detour Information */}
          {stop?.address && stop.additional_miles > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1 text-blue-600">
                  <Route className="h-4 w-4" />
                  <span className="font-medium">+{stop.additional_miles} miles</span>
                </div>
                <div className="flex items-center space-x-1 text-blue-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">+{stop.additional_time}</span>
                </div>
                <div className="text-blue-700">
                  This stop adds to your route
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {stop?.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-700">{stop.notes}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Search Places Near Route</h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Category Buttons */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Categories</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {searchCategories.map(category => {
                    const CategoryIcon = category.icon;
                    return (
                      <button
                        key={category.value}
                        onClick={() => handleCategorySearch(category.value)}
                        className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <CategoryIcon className="h-4 w-4" />
                        <span>{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Search Input */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Search</h4>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search for places (e.g., Starbucks, CVS, Target)"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-64 overflow-y-auto">
                {searchLoading && (
                  <div className="text-center py-6">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Searching places...</p>
                  </div>
                )}

                {!searchLoading && searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Found Places</h4>
                    {searchResults.map(place => (
                      <button
                        key={place.id}
                        onClick={() => handleSelectSearchResult(place)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{place.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{place.address}</p>
                            <div className="flex items-center space-x-3 mt-2">
                              {place.rating && (
                                <div className="text-xs text-gray-500 flex items-center space-x-1">
                                  <span>★</span>
                                  <span>{place.rating}</span>
                                </div>
                              )}
                              {place.distance && (
                                <div className="text-xs text-blue-600">{place.distance} away</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!searchLoading && searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No places found for "{searchQuery}". Try a different search term.
                    </p>
                  </div>
                )}

                {!searchLoading && !searchQuery && (
                  <div className="text-center py-6 text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Search for places to add as stops</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RouteStopBuilder;