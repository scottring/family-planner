import { useState, useEffect } from 'react';
import { MapPin, Search, Building2, Star } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';
import PlaceSearchModal from './PlaceSearchModal';

const DualModeAddressInput = ({ 
  value, 
  onChange, 
  label, 
  placeholder = "Enter address or search for places",
  className = "",
  errors = null,
  origin = null,
  eventTitle = "",
  quickAddresses = [],
  initialPlaceData = null
}) => {
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(initialPlaceData);
  
  // Update selected place when initialPlaceData changes
  useEffect(() => {
    if (initialPlaceData && !selectedPlace) {
      setSelectedPlace(initialPlaceData);
    }
  }, [initialPlaceData]);

  // Handle address input change from AddressAutocomplete
  const handleAddressChange = (address) => {
    setSelectedPlace(null);
    onChange(address);
  };

  // Handle place selection from PlaceSearchModal
  const handlePlaceSelect = (place) => {
    setSelectedPlace(place);
    // Store both the display text and the address for form submission
    onChange(place.address, {
      placeName: place.name,
      placeId: place.place_id,
      rating: place.rating,
      geometry: place.geometry,
      isPlace: true
    });
    setShowPlaceSearch(false);
  };

  // Determine if current value is a place vs just an address
  const isPlaceSelected = selectedPlace !== null;
  const displayValue = isPlaceSelected 
    ? `${selectedPlace.name} • ${selectedPlace.address}`
    : value;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="space-y-2">
        {/* Main Input with Mode Toggle Buttons */}
        <div className="relative">
          <AddressAutocomplete
            value={displayValue}
            onChange={handleAddressChange}
            placeholder={placeholder}
            className={errors ? 'border-red-300' : ''}
            quickAddresses={quickAddresses}
          />
          
          {/* Mode Toggle Buttons */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            <button
              type="button"
              onClick={() => setShowPlaceSearch(true)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Search for places by name"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Selected Place Display */}
        {isPlaceSelected && (
          <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-blue-900 text-lg truncate">{selectedPlace.name}</span>
                {selectedPlace.rating && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 rounded-full">
                    <Star className="h-3 w-3 text-yellow-600 fill-current" />
                    <span className="text-xs font-medium text-yellow-700">{selectedPlace.rating}</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-blue-700 truncate mt-1">{selectedPlace.address}</div>
              {selectedPlace.distance && (
                <div className="text-xs text-blue-600 mt-1">
                  {selectedPlace.distance} {origin && 'from origin'}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPlace(null);
                onChange('');
              }}
              className="flex-shrink-0 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors text-sm font-medium"
            >
              Clear
            </button>
          </div>
        )}

        {/* Mode Selection Helper */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <MapPin className="h-3 w-3" />
            <span>Enter exact address</span>
          </div>
          <div className="flex items-center space-x-1">
            <Search className="h-3 w-3" />
            <button
              type="button"
              onClick={() => setShowPlaceSearch(true)}
              className="underline hover:text-blue-600"
            >
              Search for places
            </button>
          </div>
        </div>
      </div>

      {errors && <p className="text-red-600 text-sm mt-1">{errors}</p>}

      {/* Place Search Modal */}
      <PlaceSearchModal
        isOpen={showPlaceSearch}
        onClose={() => setShowPlaceSearch(false)}
        onSelectPlace={handlePlaceSelect}
        origin={origin}
        eventTitle={eventTitle}
      />
    </div>
  );
};

export default DualModeAddressInput;