import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Plus, 
  X, 
  Clock, 
  Search, 
  ExternalLink,
  Car,
  Route,
  Loader,
  Home,
  Briefcase,
  GraduationCap,
  Sparkles,
  ChevronDown,
  Star
} from 'lucide-react';
import { useTaskStore } from '../../../stores/taskStore';
import { useAddressStore } from '../../../stores/addressStore';
import { mapService } from '../../../services/mapService';
import AddressAutocomplete from '../../common/AddressAutocomplete';

const DrivingTaskTemplate = ({ task, onUpdate, event = null, eventType = null, className = "" }) => {
  const { updateTask } = useTaskStore();
  const { addresses, fetchAddresses, getHomeAddress, getWorkAddress, getSchoolAddress } = useAddressStore();
  
  // Auto-populate destination from event location if available
  const getEventLocation = () => {
    if (event?.location) return event.location;
    if (event?.address) return event.address;
    if (event?.venue) return event.venue;
    return '';
  };

  const [drivingData, setDrivingData] = useState({
    startAddress: task.templateData?.startAddress || getHomeAddress() || '',
    destinationAddress: task.templateData?.destinationAddress || getEventLocation() || '',
    stops: [],
    estimatedTime: null,
    navigationUrl: '',
    ...task.templateData
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(null);
  const [smartSuggestions, setSmartSuggestions] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load addresses on mount and set event destination
  useEffect(() => {
    fetchAddresses();
    
    // Auto-populate destination from event if not already set
    const eventLocation = getEventLocation();
    if (eventLocation && !drivingData.destinationAddress) {
      setDrivingData(prev => ({
        ...prev,
        destinationAddress: eventLocation
      }));
    }
  }, [event]);

  // Update navigation URL and time when addresses change
  useEffect(() => {
    if (drivingData.startAddress && drivingData.destinationAddress) {
      const url = mapService.generateNavigationUrl(
        drivingData.startAddress, 
        drivingData.destinationAddress, 
        drivingData.stops.map(stop => stop.address)
      );
      
      const estimatedTime = mapService.calculateDriveTime(
        drivingData.startAddress, 
        drivingData.destinationAddress, 
        drivingData.stops
      );
      
      setDrivingData(prev => ({
        ...prev,
        navigationUrl: url,
        estimatedTime: estimatedTime
      }));
    }
  }, [drivingData.startAddress, drivingData.destinationAddress, drivingData.stops]);

  // Get smart suggestions when addresses are set
  useEffect(() => {
    if (drivingData.startAddress && drivingData.destinationAddress && eventType) {
      mapService.getSmartStopSuggestions({
        start: drivingData.startAddress,
        destination: drivingData.destinationAddress,
        departureTime: new Date(),
        eventType
      }).then(suggestions => {
        setSmartSuggestions(suggestions);
      });
    }
  }, [drivingData.startAddress, drivingData.destinationAddress, eventType]);

  // Save data when it changes
  useEffect(() => {
    const saveData = async () => {
      // Don't try to save to database if this is a timeline task (ID starts with "task-")
      const isTimelineTask = task.id && typeof task.id === 'string' && task.id.startsWith('task-');
      
      if (!isTimelineTask && task.id) {
        try {
          await updateTask(task.id, {
            ...task,
            templateType: 'driving',
            templateData: drivingData
          });
        } catch (error) {
          console.error('Error updating driving task:', error);
        }
      }
      
      // Always call onUpdate for local state updates
      if (onUpdate) {
        onUpdate({ ...task, templateData: drivingData });
      }
    };

    const timeoutId = setTimeout(saveData, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [drivingData, task.id, updateTask, onUpdate]);

  const handleInputChange = (field, value) => {
    setDrivingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStopChange = (index, value) => {
    setDrivingData(prev => ({
      ...prev,
      stops: prev.stops.map((stop, i) => 
        i === index ? { ...stop, address: value } : stop
      )
    }));
  };

  const addStop = () => {
    setDrivingData(prev => ({
      ...prev,
      stops: [...prev.stops, { id: Date.now(), address: '', type: 'waypoint' }]
    }));
  };

  const removeStop = (index) => {
    setDrivingData(prev => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index)
    }));
  };

  const handlePlaceSearch = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // If we have both addresses, search along the route
      if (drivingData.startAddress && drivingData.destinationAddress) {
        const results = await mapService.searchAlongRoute(
          drivingData.startAddress,
          drivingData.destinationAddress,
          query,
          2 // max 2 mile detour
        );
        setSearchResults(results);
      } else {
        // Otherwise, do a regular search
        const results = await mapService.searchPlaces(query, drivingData.startAddress);
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSavedAddress = (field, address) => {
    handleInputChange(field, address.address);
    setShowAddressDropdown(null);
  };

  const addSmartSuggestion = (place) => {
    addPlaceAsStop(place);
    // Remove from suggestions once added
    if (smartSuggestions) {
      const updatedSuggestions = { ...smartSuggestions };
      Object.keys(updatedSuggestions).forEach(key => {
        updatedSuggestions[key] = updatedSuggestions[key].filter(p => p.id !== place.id);
      });
      setSmartSuggestions(updatedSuggestions);
    }
  };

  const addPlaceAsStop = (place) => {
    setDrivingData(prev => ({
      ...prev,
      stops: [...prev.stops, {
        id: Date.now(),
        address: place.address,
        type: 'place',
        name: place.name
      }]
    }));
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const openNavigation = () => {
    if (drivingData.navigationUrl) {
      window.open(drivingData.navigationUrl, '_blank');
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-xl">
          <Car className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Driving Task</h3>
          <p className="text-sm text-gray-500">Plan your route and navigation</p>
        </div>
        {drivingData.estimatedTime && (
          <div className="flex items-center space-x-1 text-sm text-gray-600 bg-gray-100 rounded-lg px-3 py-1">
            <Clock className="h-4 w-4" />
            <span>{drivingData.estimatedTime}</span>
          </div>
        )}
      </div>

      {/* Start Address */}
      <div className="mb-4">
        <AddressAutocomplete
          label={
            <span>
              <MapPin className="h-4 w-4 inline mr-1" />
              From
            </span>
          }
          value={drivingData.startAddress}
          onChange={(address) => handleInputChange('startAddress', address)}
          placeholder="Enter starting address..."
          quickAddresses={addresses.map(addr => ({
            id: addr.id,
            label: addr.label,
            address: addr.address
          }))}
        />
        
        {/* Quick access buttons */}
        <div className="flex gap-2 mt-2">
          {getHomeAddress() && (
            <button
              onClick={() => handleInputChange('startAddress', getHomeAddress())}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Home className="h-3 w-3" />
              <span>Home</span>
            </button>
          )}
          {getWorkAddress() && (
            <button
              onClick={() => handleInputChange('startAddress', getWorkAddress())}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Briefcase className="h-3 w-3" />
              <span>Work</span>
            </button>
          )}
          {getSchoolAddress() && (
            <button
              onClick={() => handleInputChange('startAddress', getSchoolAddress())}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
            >
              <GraduationCap className="h-3 w-3" />
              <span>School</span>
            </button>
          )}
        </div>
      </div>

      {/* Destination Address */}
      <div className="mb-4">
        <AddressAutocomplete
          label={
            <span>
              <Navigation className="h-4 w-4 inline mr-1" />
              To
            </span>
          }
          value={drivingData.destinationAddress}
          onChange={(address) => handleInputChange('destinationAddress', address)}
          placeholder="Enter destination address..."
          quickAddresses={addresses.map(addr => ({
            id: addr.id,
            label: addr.label,
            address: addr.address
          }))}
        />

        {/* Quick access removed - integrated into autocomplete dropdown */}
        {false && showAddressDropdown === 'dest' && addresses.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {addresses.map(addr => (
              <button
                key={addr.id}
                onClick={() => selectSavedAddress('destinationAddress', addr)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-gray-900">{addr.label}</div>
                <div className="text-sm text-gray-600">{addr.address}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stops */}
      {drivingData.stops.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Route className="h-4 w-4 inline mr-1" />
            Stops along the way
          </label>
          <div className="space-y-2">
            {drivingData.stops.map((stop, index) => (
              <div key={stop.id} className="flex items-center space-x-2">
                <div className="flex-1">
                  <AddressAutocomplete
                    value={stop.address}
                    onChange={(address) => handleStopChange(index, address)}
                    placeholder={`Stop ${index + 1}...`}
                    quickAddresses={addresses.map(addr => ({
                      id: addr.id,
                      label: addr.label,
                      address: addr.address
                    }))}
                  />
                  {stop.name && (
                    <div className="text-xs text-gray-500 mt-1">
                      📍 {stop.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeStop(index)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={addStop}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Stop</span>
        </button>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Search Along Route</span>
        </button>

        {smartSuggestions && (
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span>Smart Suggestions</span>
          </button>
        )}

        {drivingData.navigationUrl && (
          <button
            onClick={openNavigation}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Navigation className="h-4 w-4" />
            <span>Open in Maps</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Place Search */}
      {showSearch && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handlePlaceSearch(e.target.value);
              }}
              placeholder="Search for places (e.g., 'Dunkin Donuts', 'gas station')..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {isSearching && (
            <div className="flex items-center justify-center py-4">
              <Loader className="h-5 w-5 animate-spin text-green-600" />
              <span className="ml-2 text-sm text-gray-600">Searching...</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.map((place) => (
                <button
                  key={place.id}
                  onClick={() => addPlaceAsStop(place)}
                  className="w-full text-left p-3 bg-white rounded-lg hover:bg-green-50 border border-gray-200 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{place.name}</div>
                      <div className="text-sm text-gray-600">{place.address}</div>
                      {place.rating && (
                        <div className="text-xs text-yellow-600 mt-1">
                          ⭐ {place.rating} • {place.distance}
                        </div>
                      )}
                    </div>
                    {place.on_route !== undefined && (
                      <div className="ml-2">
                        {place.on_route ? (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            On route
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                            {place.detour}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 3 && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No places found. Try a different search term.
            </div>
          )}
        </div>
      )}

      {/* Smart Suggestions */}
      {showSuggestions && smartSuggestions && (
        <div className="mt-4 p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Smart Stop Suggestions</span>
          </div>
          
          {smartSuggestions.recommended && smartSuggestions.recommended.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-purple-700 mb-2">Recommended for this event</div>
              <div className="space-y-2">
                {smartSuggestions.recommended.map(place => (
                  <button
                    key={place.id}
                    onClick={() => addSmartSuggestion(place)}
                    className="w-full text-left p-2 bg-white rounded-lg hover:bg-purple-100 border border-purple-200 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{place.name}</div>
                        <div className="text-xs text-gray-600">{place.suggestion_reason}</div>
                      </div>
                      <Plus className="h-3 w-3 text-purple-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {smartSuggestions.time_based && smartSuggestions.time_based.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-purple-700 mb-2">Based on time of day</div>
              <div className="space-y-2">
                {smartSuggestions.time_based.map(place => (
                  <button
                    key={place.id}
                    onClick={() => addSmartSuggestion(place)}
                    className="w-full text-left p-2 bg-white rounded-lg hover:bg-purple-100 border border-purple-200 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{place.name}</div>
                        <div className="text-xs text-gray-600">{place.distance}</div>
                      </div>
                      <Plus className="h-3 w-3 text-purple-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Route Summary */}
      {drivingData.startAddress && drivingData.destinationAddress && (
        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <div className="text-sm font-medium text-blue-900 mb-1">Route Summary</div>
          <div className="text-sm text-blue-700">
            {drivingData.startAddress} → 
            {drivingData.stops.length > 0 && (
              <span> {drivingData.stops.length} stop{drivingData.stops.length > 1 ? 's' : ''} → </span>
            )}
            {drivingData.destinationAddress}
          </div>
          {drivingData.estimatedTime && (
            <div className="text-xs text-blue-600 mt-1">
              Estimated time: {drivingData.estimatedTime}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DrivingTaskTemplate;