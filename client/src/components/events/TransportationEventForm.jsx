import { useState, useEffect } from 'react';
import {
  Car,
  MapPin,
  Clock,
  Route,
  Plus,
  Trash2,
  Navigation,
  CheckSquare,
  Save,
  X,
  Building2,
  Star
} from 'lucide-react';
import LocationCombobox from '../common/LocationCombobox';
import { mapService } from '../../services/mapService';
import { useEventStore } from '../../stores/eventStore';
import { debounce, formatTime, getTimeDifference } from '../../utils/helpers';

const TransportationEventForm = ({ onSave, onCancel, event = null }) => {
  // Main form state
  const [formData, setFormData] = useState({
    title: '',
    start_time: '',
    end_time: '',
    transportation_mode: 'driving',
    departure_time: '',
    arrival_time: '',
    starting_address: '',
    destination_address: '',
    starting_place_data: null,
    destination_place_data: null,
    stops: [],
    navigation_address: '',
    driving_needed: true,
    parking_info: '',
    search_along_route: [],
    preparation_checklist: [],
    notes: '',
    event_type: 'travel'
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [routeInfo, setRouteInfo] = useState(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // Store
  const { createEvent, updateEvent } = useEventStore();

  // Transportation modes
  const transportationModes = [
    { value: 'driving', label: 'Driving', icon: Car },
    { value: 'walking', label: 'Walking', icon: MapPin },
    { value: 'bicycling', label: 'Bicycling', icon: Route },
    { value: 'transit', label: 'Public Transit', icon: Navigation }
  ];


  // Initialize form data from existing event
  useEffect(() => {
    if (event) {
      const transportationData = event.transportation_data || {};
      setFormData({
        title: event.title || '',
        start_time: event.start_time ? event.start_time.slice(0, 16) : '',
        end_time: event.end_time ? event.end_time.slice(0, 16) : '',
        transportation_mode: event.transportation_mode || 'driving',
        departure_time: event.departure_time || '',
        arrival_time: event.arrival_time || '',
        starting_address: transportationData.starting_address || event.starting_address || '',
        destination_address: transportationData.destination_address || event.destination_address || event.location || '',
        starting_place_data: transportationData.starting_place_data || null,
        destination_place_data: transportationData.destination_place_data || null,
        stops: event.stops || [],
        navigation_address: event.navigation_address || '',
        driving_needed: event.driving_needed !== false,
        parking_info: event.parking_info || '',
        search_along_route: event.search_along_route || [],
        preparation_checklist: event.preparation_checklist || [],
        notes: event.notes || '',
        event_type: event.event_type || 'travel'
      });
    }
  }, [event]);

  // Auto-detect transportation mode from title keywords and suggest destinations
  useEffect(() => {
    if (formData.title && !event) {
      const title = formData.title.toLowerCase();
      const updates = {};
      
      // Detect transportation mode
      if (title.includes('walk') || title.includes('hiking')) {
        updates.transportation_mode = 'walking';
      } else if (title.includes('bike') || title.includes('cycling')) {
        updates.transportation_mode = 'bicycling';
      } else if (title.includes('train') || title.includes('bus') || title.includes('subway')) {
        updates.transportation_mode = 'transit';
      }
      
      // Smart destination suggestions based on title
      if (!formData.destination_address) {
        let suggestedDestination = '';
        
        if (title.includes('doctor') || title.includes('appointment') || title.includes('medical')) {
          suggestedDestination = 'medical center';
        } else if (title.includes('grocery') || title.includes('shopping')) {
          suggestedDestination = 'grocery store';
        } else if (title.includes('soccer') || title.includes('football') || title.includes('game')) {
          suggestedDestination = 'sports complex';
        } else if (title.includes('school') || title.includes('pickup') || title.includes('drop')) {
          suggestedDestination = 'school';
        } else if (title.includes('work') || title.includes('office')) {
          suggestedDestination = 'office';
        } else if (title.includes('dinner') || title.includes('restaurant')) {
          suggestedDestination = 'restaurant';
        } else if (title.includes('coffee') || title.includes('cafe')) {
          suggestedDestination = 'coffee shop';
        }
        
        if (suggestedDestination) {
          // Don't auto-fill, just store as a hint for the search modal
          updates.destination_hint = suggestedDestination;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [formData.title, event]);

  // Calculate route information when addresses change
  useEffect(() => {
    if (formData.starting_address && formData.destination_address) {
      calculateRouteInfo();
    }
  }, [formData.starting_address, formData.destination_address, formData.stops]);

  // Update departure time based on arrival time and route duration
  useEffect(() => {
    if (formData.arrival_time && routeInfo?.duration) {
      const arrival = new Date(formData.arrival_time);
      const durationInMinutes = parseDuration(routeInfo.duration);
      const departure = new Date(arrival.getTime() - (durationInMinutes * 60 * 1000));
      
      const departureString = departure.toISOString().slice(0, 16);
      if (departureString !== formData.departure_time) {
        setFormData(prev => ({ ...prev, departure_time: departureString }));
      }
    }
  }, [formData.arrival_time, routeInfo]);

  // Parse duration string to minutes
  const parseDuration = (durationString) => {
    if (!durationString) return 0;
    
    const matches = durationString.match(/(\d+)h?\s*(\d+)?m?/);
    if (!matches) return 30; // Default fallback
    
    const hours = parseInt(matches[1]) || 0;
    const minutes = parseInt(matches[2]) || 0;
    
    return (hours * 60) + minutes;
  };

  // Calculate route information
  const calculateRouteInfo = async () => {
    if (!formData.starting_address || !formData.destination_address) return;

    setCalculatingRoute(true);
    try {
      const waypoints = formData.stops.map(stop => stop.address).filter(Boolean);
      const info = await mapService.getRouteInfo(
        formData.starting_address,
        formData.destination_address,
        waypoints
      );
      setRouteInfo(info);
      
      // Generate preparation checklist based on trip
      generatePreparationChecklist(info);
    } catch (error) {
      console.error('Error calculating route:', error);
    }
    setCalculatingRoute(false);
  };

  // Generate smart preparation checklist
  const generatePreparationChecklist = (routeInfo) => {
    const checklist = [];
    const mode = formData.transportation_mode;
    
    // Common items for all trips
    checklist.push({ id: 'check-traffic', text: 'Check traffic conditions', completed: false });
    
    if (mode === 'driving') {
      checklist.push({ id: 'gas-check', text: 'Check fuel level', completed: false });
      checklist.push({ id: 'parking-research', text: 'Research parking options', completed: false });
      
      if (routeInfo && parseDuration(routeInfo.duration) > 60) {
        checklist.push({ id: 'snacks', text: 'Pack snacks for long drive', completed: false });
      }
    }
    
    if (mode === 'transit') {
      checklist.push({ id: 'transit-schedule', text: 'Check transit schedule', completed: false });
      checklist.push({ id: 'transit-card', text: 'Ensure transit card is funded', completed: false });
    }
    
    // Time-based suggestions
    const departureHour = formData.departure_time ? new Date(formData.departure_time).getHours() : null;
    if (departureHour !== null) {
      if (departureHour < 8) {
        checklist.push({ id: 'early-departure', text: 'Set early alarm', completed: false });
      }
      if (departureHour >= 6 && departureHour < 10) {
        checklist.push({ id: 'morning-coffee', text: 'Grab coffee for the road', completed: false });
      }
    }
    
    setFormData(prev => ({ ...prev, preparation_checklist: checklist }));
  };

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle location selection from LocationCombobox
  const handleLocationChange = (field, location) => {
    const updates = {};
    
    if (location) {
      updates[field] = location.address || location.name || '';
      
      // Store place metadata
      if (field === 'starting_address') {
        updates.starting_place_data = {
          placeName: location.name,
          address: location.address,
          placeId: location.placeId,
          rating: location.rating,
          metadata: location.metadata
        };
      } else if (field === 'destination_address') {
        updates.destination_place_data = {
          placeName: location.name,
          address: location.address,
          placeId: location.placeId,
          rating: location.rating,
          metadata: location.metadata
        };
      }
    } else {
      updates[field] = '';
      // Clear place data
      if (field === 'starting_address') {
        updates.starting_place_data = null;
      } else if (field === 'destination_address') {
        updates.destination_place_data = null;
      }
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
    
    // Clear error when user selects location
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Add a new stop
  const addStop = () => {
    const newStop = {
      id: Date.now(),
      address: '',
      additional_miles: 0,
      additional_time: '0 min'
    };
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, newStop]
    }));
  };

  // Remove a stop
  const removeStop = (stopId) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.filter(stop => stop.id !== stopId)
    }));
  };

  // Update stop address
  const updateStopAddress = (stopId, address) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.map(stop => 
        stop.id === stopId ? { ...stop, address } : stop
      )
    }));
  };

  // Handle stop location change
  const handleStopLocationChange = (stopId, location) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.map(stop => {
        if (stop.id === stopId) {
          if (location) {
            return {
              ...stop,
              address: location.address || location.name || '',
              name: location.name,
              place_data: {
                placeName: location.name,
                address: location.address,
                placeId: location.placeId,
                rating: location.rating,
                metadata: location.metadata
              }
            };
          } else {
            return {
              ...stop,
              address: '',
              name: null,
              place_data: null
            };
          }
        }
        return stop;
      })
    }));
  };


  // Toggle checklist item
  const toggleChecklistItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      preparation_checklist: prev.preparation_checklist.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.starting_address.trim()) {
      newErrors.starting_address = 'Starting address is required';
    }

    if (!formData.destination_address.trim()) {
      newErrors.destination_address = 'Destination address is required';
    }

    if (!formData.departure_time) {
      newErrors.departure_time = 'Departure time is required';
    }

    if (!formData.arrival_time) {
      newErrors.arrival_time = 'Arrival time is required';
    }

    if (formData.departure_time && formData.arrival_time && 
        new Date(formData.departure_time) >= new Date(formData.arrival_time)) {
      newErrors.arrival_time = 'Arrival time must be after departure time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Determine display location for event
      const displayLocation = formData.destination_place_data 
        ? `${formData.destination_place_data.placeName} • ${formData.destination_address}`
        : formData.destination_address;
      
      // Create description with place names when available
      const startDisplay = formData.starting_place_data 
        ? formData.starting_place_data.placeName 
        : formData.starting_address;
      const destDisplay = formData.destination_place_data 
        ? formData.destination_place_data.placeName 
        : formData.destination_address;

      const eventData = {
        ...formData,
        start_time: formData.departure_time,
        end_time: formData.arrival_time,
        location: displayLocation,
        description: `Transportation from ${startDisplay} to ${destDisplay}${formData.notes ? '\n\n' + formData.notes : ''}`,
        // Store transportation-specific data
        transportation_data: {
          mode: formData.transportation_mode,
          starting_address: formData.starting_address,
          destination_address: formData.destination_address,
          starting_place_data: formData.starting_place_data,
          destination_place_data: formData.destination_place_data,
          stops: formData.stops,
          route_info: routeInfo,
          preparation_checklist: formData.preparation_checklist
        },
        // Legacy fields for backward compatibility
        driving_needed: formData.driving_needed,
        navigation_address: formData.destination_address,
        parking_info: formData.parking_info,
        search_along_route: formData.stops.map(stop => stop.place_data).filter(Boolean)
      };

      let savedEvent;
      if (event?.id) {
        savedEvent = await updateEvent(event.id, eventData);
      } else {
        savedEvent = await createEvent(eventData);
      }

      onSave(savedEvent);
    } catch (error) {
      console.error('Error saving transportation event:', error);
      alert('Failed to save event. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {event ? 'Edit Transportation Event' : 'Plan Transportation'}
          </h2>
          <p className="text-gray-600 mt-1">
            Plan your trip with stops, timing, and preparation checklist
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-8">
        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trip Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Trip to Soccer Game, Drive to Airport"
              />
              {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transportation Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {transportationModes.map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => handleInputChange('transportation_mode', mode.value)}
                      className={`flex items-center space-x-2 p-3 rounded-lg border ${
                        formData.transportation_mode === mode.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timing
              </label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Desired Arrival Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.arrival_time}
                    onChange={(e) => handleInputChange('arrival_time', e.target.value)}
                    className={`w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.arrival_time ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.arrival_time && <p className="text-red-600 text-xs mt-1">{errors.arrival_time}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Departure Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.departure_time}
                    onChange={(e) => handleInputChange('departure_time', e.target.value)}
                    className={`w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.departure_time ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.departure_time && <p className="text-red-600 text-xs mt-1">{errors.departure_time}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Route Planning */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Planning</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LocationCombobox
                  value={{
                    name: formData.starting_place_data?.placeName,
                    address: formData.starting_address
                  }}
                  onChange={(location) => handleLocationChange('starting_address', location)}
                  label="Starting Location *"
                  placeholder="Enter address or search for places like 'Home', 'Work'"
                  savedLocations={[
                    { id: 'home', name: 'Home', address: '123 Main St' }, // TODO: Get from user preferences
                    { id: 'work', name: 'Work', address: '456 Office Blvd' }, // TODO: Get from user preferences
                    { id: 'school', name: 'School', address: '789 School Ave' } // TODO: Get from user preferences
                  ]}
                  className={errors.starting_address ? 'text-red-600' : ''}
                />
                {errors.starting_address && (
                  <p className="text-red-600 text-sm mt-1">{errors.starting_address}</p>
                )}
              </div>

              <div>
                <LocationCombobox
                  value={{
                    name: formData.destination_place_data?.placeName,
                    address: formData.destination_address
                  }}
                  onChange={(location) => handleLocationChange('destination_address', location)}
                  label="Destination *"
                  placeholder="Enter address or search places like 'Trader Joe's', 'Kaiser Hospital'"
                  savedLocations={[
                    { id: 'home', name: 'Home', address: '123 Main St' }, // TODO: Get from user preferences
                    { id: 'work', name: 'Work', address: '456 Office Blvd' }, // TODO: Get from user preferences
                    { id: 'school', name: 'School', address: '789 School Ave' } // TODO: Get from user preferences
                  ]}
                  className={errors.destination_address ? 'text-red-600' : ''}
                />
                {errors.destination_address && (
                  <p className="text-red-600 text-sm mt-1">{errors.destination_address}</p>
                )}
              </div>
            </div>

            {/* Route Information Display */}
            {routeInfo && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Route className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Distance:</span>
                    <span>{routeInfo.distance}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Duration:</span>
                    <span>{routeInfo.duration}</span>
                  </div>
                </div>
              </div>
            )}

            {calculatingRoute && (
              <div className="text-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-2" />
                <p className="text-sm text-gray-600">Calculating route...</p>
              </div>
            )}

            {/* Stops */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Stops Along the Way</label>
                <button
                  type="button"
                  onClick={addStop}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Stop</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.stops.map((stop, index) => (
                  <div key={stop.id} className="bg-white rounded border p-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        {stop.name ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium text-blue-900">{stop.name}</span>
                              {stop.place_data?.rating && (
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <span className="text-xs text-gray-600">{stop.place_data.rating}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-blue-700 ml-6">{stop.address}</p>
                            {stop.additional_miles > 0 && (
                              <p className="text-xs text-blue-600 ml-6">
                                +{stop.additional_miles} miles, +{stop.additional_time}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <LocationCombobox
                              value={{
                                name: stop.place_data?.placeName,
                                address: stop.address
                              }}
                              onChange={(location) => handleStopLocationChange(stop.id, location)}
                              placeholder="Enter stop address or search for places"
                              savedLocations={[
                                { id: 'home', name: 'Home', address: '123 Main St' }, // TODO: Get from user preferences
                                { id: 'work', name: 'Work', address: '456 Office Blvd' }, // TODO: Get from user preferences
                              ]}
                            />
                            {stop.additional_miles > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                +{stop.additional_miles} miles, +{stop.additional_time}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => removeStop(stop.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded"
                          title="Remove stop"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preparation Checklist */}
        {formData.preparation_checklist.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preparation Checklist</h3>
            <div className="space-y-2">
              {formData.preparation_checklist.map(item => (
                <label key={item.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
          
          <div className="space-y-4">
            {formData.transportation_mode === 'driving' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parking Information
                </label>
                <textarea
                  value={formData.parking_info}
                  onChange={(e) => handleInputChange('parking_info', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Parking details, costs, restrictions..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Special instructions, contacts, reminders..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : (event ? 'Update Trip' : 'Save Trip')}</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default TransportationEventForm;