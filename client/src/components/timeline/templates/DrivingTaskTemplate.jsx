import { useState, useEffect, useRef } from 'react';
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
  Star,
  GripVertical
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
  const [draggedStop, setDraggedStop] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [tempSearchStop, setTempSearchStop] = useState(null);
  const [searchStopQuery, setSearchStopQuery] = useState('');
  const [searchStopResults, setSearchStopResults] = useState([]);
  const [isSearchingStop, setIsSearchingStop] = useState(false);

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

  const handleStopTimeChange = (index, time) => {
    setDrivingData(prev => ({
      ...prev,
      stops: prev.stops.map((stop, i) => 
        i === index ? { ...stop, estimatedTime: parseInt(time) || 1 } : stop
      )
    }));
  };

  const getTotalStopTime = () => {
    return drivingData.stops.reduce((total, stop) => {
      return total + (stop.estimatedTime || 20);
    }, 0);
  };

  const addStop = () => {
    // Close any search stop
    setTempSearchStop(null);
    setDrivingData(prev => ({
      ...prev,
      stops: [...prev.stops, { 
        id: Date.now(), 
        address: '', 
        type: 'waypoint',
        estimatedTime: 20 // Default 20 minutes
      }]
    }));
  };

  const addSearchStop = () => {
    // Add a temporary search stop
    setTempSearchStop({ 
      id: `search-${Date.now()}`, 
      type: 'search',
      query: '',
      results: []
    });
    setSearchStopQuery('');
    setSearchStopResults([]);
  };

  const handleSearchStopSelect = (place) => {
    // Convert search stop to regular stop with enhanced time estimation
    const placeTypes = place.types || [place.type];
    const estimatedTime = estimateStopTime(place.name, placeTypes);
    
    setDrivingData(prev => ({
      ...prev,
      stops: [...prev.stops, {
        id: Date.now(),
        address: place.address,
        type: 'place',
        name: place.name,
        estimatedTime: estimatedTime
      }]
    }));
    // Clear search stop
    setTempSearchStop(null);
    setSearchStopQuery('');
    setSearchStopResults([]);
  };

  const handleSearchStopQuery = async (query) => {
    setSearchStopQuery(query);
    if (query.length < 3) {
      setSearchStopResults([]);
      return;
    }
    
    setIsSearchingStop(true);
    try {
      const results = await mapService.searchPlaces(
        query,
        drivingData.startAddress || ''
      );
      setSearchStopResults(results);
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchStopResults([]);
    } finally {
      setIsSearchingStop(false);
    }
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

  // Function to estimate time based on Google Place types and real-world averages
  const estimateStopTime = (placeName, placeTypes) => {
    const name = (placeName || '').toLowerCase();
    const types = Array.isArray(placeTypes) ? placeTypes : [placeTypes].filter(Boolean);
    
    // Convert types to lowercase for comparison
    const typesLower = types.map(t => (t || '').toLowerCase());
    
    // Gas stations - quick in-and-out
    if (typesLower.some(t => ['gas_station', 'fuel'].includes(t)) ||
        name.includes('gas') || name.includes('fuel') || name.includes('shell') || 
        name.includes('exxon') || name.includes('bp') || name.includes('chevron')) {
      return 8;
    }
    
    // ATMs - very quick
    if (typesLower.includes('atm') || name.includes('atm')) {
      return 5;
    }
    
    // Coffee shops - quick pickup
    if (typesLower.some(t => ['cafe', 'coffee_shop'].includes(t)) ||
        name.includes('starbucks') || name.includes('dunkin') || name.includes('coffee')) {
      return 12;
    }
    
    // Fast food/meal takeaway - quick service
    if (typesLower.some(t => ['meal_takeaway', 'fast_food'].includes(t)) ||
        name.includes('mcdonald') || name.includes('burger king') || name.includes('kfc') ||
        name.includes('taco bell') || name.includes('subway') || name.includes('chipotle')) {
      return 15;
    }
    
    // Restaurants - longer dining experience
    if (typesLower.includes('restaurant') || 
        typesLower.some(t => ['meal_delivery', 'meal_pickup'].includes(t))) {
      return 45;
    }
    
    // Pharmacies - prescription pickup/shopping
    if (typesLower.includes('pharmacy') || 
        name.includes('cvs') || name.includes('walgreens') || name.includes('rite aid')) {
      return 12;
    }
    
    // Banks - service transactions
    if (typesLower.includes('bank') || typesLower.includes('finance') ||
        name.includes('bank') || name.includes('credit union')) {
      return 15;
    }
    
    // Grocery stores - shopping trip
    if (typesLower.some(t => ['grocery_or_supermarket', 'supermarket'].includes(t)) ||
        name.includes('kroger') || name.includes('safeway') || name.includes('whole foods')) {
      return 35;
    }
    
    // Department stores - longer shopping
    if (typesLower.includes('department_store') || 
        name.includes('target') || name.includes('walmart') || name.includes('costco')) {
      return 40;
    }
    
    // Shopping centers/malls - extended shopping
    if (typesLower.some(t => ['shopping_mall', 'shopping_center'].includes(t))) {
      return 60;
    }
    
    // Convenience stores - quick stops
    if (typesLower.includes('convenience_store') || 
        name.includes('7-eleven') || name.includes('wawa')) {
      return 8;
    }
    
    // Bakery/food specialty - quick pickup
    if (typesLower.some(t => ['bakery', 'food'].includes(t))) {
      return 10;
    }
    
    // Hardware/home improvement - project shopping
    if (typesLower.includes('hardware_store') || 
        name.includes('home depot') || name.includes('lowes')) {
      return 30;
    }
    
    // Electronics stores - browsing/purchasing
    if (typesLower.includes('electronics_store') ||
        name.includes('best buy') || name.includes('apple store')) {
      return 25;
    }
    
    // Clothing stores - trying on/shopping
    if (typesLower.includes('clothing_store')) {
      return 30;
    }
    
    // Post office - service transaction
    if (typesLower.includes('post_office') || name.includes('post office') || name.includes('usps')) {
      return 12;
    }
    
    // Default based on place type patterns
    if (typesLower.some(t => t.includes('store'))) {
      return 20; // Generic retail store
    }
    
    // Default for unknown places
    return 20;
  };

  const addPlaceAsStop = (place) => {
    // Use types array from Google Places API if available, otherwise fall back to type
    const placeTypes = place.types || [place.type];
    const estimatedTime = estimateStopTime(place.name, placeTypes);
    
    setDrivingData(prev => ({
      ...prev,
      stops: [...prev.stops, {
        id: Date.now(),
        address: place.address,
        type: 'place',
        name: place.name,
        estimatedTime: estimatedTime
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

  // Drag and drop handlers for stops
  const handleDragStart = (e, index) => {
    setDraggedStop(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedStop(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedStop === null || draggedStop === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newStops = [...drivingData.stops];
    const draggedItem = newStops[draggedStop];
    
    // Remove the dragged item
    newStops.splice(draggedStop, 1);
    
    // Insert at new position
    const insertIndex = draggedStop < dropIndex ? dropIndex - 1 : dropIndex;
    newStops.splice(insertIndex, 0, draggedItem);
    
    setDrivingData(prev => ({
      ...prev,
      stops: newStops
    }));
    
    setDraggedStop(null);
    setDragOverIndex(null);
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

      {/* Stops Section - Always visible */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Route className="h-4 w-4 inline mr-1" />
          Stops along the way
          {drivingData.stops.length > 1 && (
            <span className="text-xs text-gray-500 ml-2">(drag to reorder)</span>
          )}
        </label>
        <div className="space-y-2">
          {drivingData.stops.length === 0 && !tempSearchStop && (
            <div className="text-sm text-gray-500 italic">
              No stops added yet - use buttons below to add stops
            </div>
          )}
            {drivingData.stops.map((stop, index) => (
              <div 
                key={stop.id} 
                className={`flex items-center space-x-2 rounded-lg p-2 transition-all duration-200 ${
                  dragOverIndex === index ? 'bg-blue-50 border-2 border-blue-400' : 'bg-white'
                } ${
                  draggedStop === index ? 'opacity-50' : ''
                }`}
                draggable={drivingData.stops.length > 1}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Drag handle */}
                {drivingData.stops.length > 1 && (
                  <div className="cursor-move p-1 hover:bg-gray-100 rounded" title="Drag to reorder">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                
                {/* Stop number */}
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
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
                
                {/* Time input */}
                <div className="flex items-center space-x-1 bg-gray-50 rounded-lg px-2 py-1">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={stop.estimatedTime || 20}
                    onChange={(e) => handleStopTimeChange(index, e.target.value)}
                    className="w-12 text-xs text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                  />
                  <span className="text-xs text-gray-500">min</span>
                </div>
                <button
                  onClick={() => removeStop(index)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {/* Temporary Search Stop - Shows inline when Search Along Route is clicked */}
            {tempSearchStop && (
              <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-start space-x-2">
                  {/* Stop number */}
                  <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {drivingData.stops.length + 1}
                  </div>
                  
                  <Search className="h-5 w-5 text-green-600 mt-0.5" />
                  
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchStopQuery}
                      onChange={(e) => handleSearchStopQuery(e.target.value)}
                      placeholder="Search for a place (e.g., 'Starbucks', 'gas station')..."
                      className="w-full px-3 py-1.5 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      autoFocus
                    />
                    
                    {isSearchingStop && (
                      <div className="mt-2 text-sm text-green-600">
                        <Loader className="h-3 w-3 inline animate-spin mr-1" />
                        Searching...
                      </div>
                    )}
                    
                    {searchStopResults.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border border-green-200 rounded-lg bg-white">
                        {searchStopResults.map(place => {
                          const placeTypes = place.types || [place.type];
                          const estimatedTime = estimateStopTime(place.name, placeTypes);
                          return (
                            <button
                              key={place.id}
                              onClick={() => handleSearchStopSelect(place)}
                              className="w-full text-left p-2 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900">{place.name}</div>
                                  <div className="text-xs text-gray-600">{place.address}</div>
                                  {place.rating && (
                                    <div className="text-xs text-yellow-600 mt-0.5">
                                      ⭐ {place.rating}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center text-xs text-green-600 bg-green-100 rounded-full px-2 py-1 ml-2">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {estimatedTime}min
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setTempSearchStop(null)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Add Stop & Search Buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={addStop}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          <span>Add Specific Address</span>
        </button>
        
        <button
          onClick={addSearchStop}
          disabled={tempSearchStop !== null}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="h-4 w-4" />
          <span>Search Along Route</span>
        </button>
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
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">

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
              {drivingData.stops.length > 0 && (
                <span className="ml-2">
                  • Stops: {getTotalStopTime()}min total
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DrivingTaskTemplate;