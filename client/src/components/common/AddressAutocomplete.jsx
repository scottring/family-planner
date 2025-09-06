import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Star } from 'lucide-react';
import { debounce } from '../../utils/helpers';

const AddressAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Enter address...",
  label,
  className = "",
  disabled = false,
  onFocus,
  onBlur,
  quickAddresses = [], // Array of saved addresses
  googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [apiError, setApiError] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const autocompleteService = useRef(null);
  const sessionToken = useRef(null);
  const apiLoadAttempted = useRef(false);

  // Initialize Google Places Autocomplete Service
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      if (window.google?.maps?.places) {
        try {
          // Try to use the new API first
          if (window.google.maps.places.AutocompleteSuggestion) {
            // New API available - create session token
            sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
            autocompleteService.current = { useNewAPI: true };
            setApiError(false);
          } else {
            // Fallback to old API
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            setApiError(false);
          }
        } catch (error) {
          console.error('Error initializing Google Maps services:', error);
          setApiError(true);
        }
      } else if (googleApiKey && !apiLoadAttempted.current) {
        apiLoadAttempted.current = true;
        loadGoogleMapsAPI();
      }
    };

    // Try to initialize immediately
    initializeGoogleMaps();

    // Also set up a listener for when the API loads
    window.initializeGoogleMapsAutocomplete = initializeGoogleMaps;
  }, [googleApiKey]);

  const loadGoogleMapsAPI = () => {
    // Check if already loading or loaded
    if (window.google?.maps || document.querySelector('script[src*="maps.googleapis.com"]')) {
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places&callback=initializeGoogleMapsAutocomplete`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setApiError(true);
      apiLoadAttempted.current = false;
    };
    document.head.appendChild(script);
  };

  // Debounced search function
  const searchPlaces = useCallback(
    debounce((query) => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }

      if (!autocompleteService.current || apiError) {
        // Fallback to showing quick addresses and basic text matching
        const filtered = quickAddresses.filter(addr => 
          addr.address?.toLowerCase().includes(query.toLowerCase()) ||
          addr.label?.toLowerCase().includes(query.toLowerCase())
        );
        
        // Add a fallback option for manual entry
        const fallbackSuggestions = filtered.map(addr => ({
          description: addr.address,
          place_id: `saved_${addr.id}`,
          structured_formatting: {
            main_text: addr.label,
            secondary_text: addr.address
          },
          isSaved: true
        }));
        
        // Add the current query as an option
        if (query.length > 5) {
          fallbackSuggestions.push({
            description: query,
            place_id: `manual_${Date.now()}`,
            structured_formatting: {
              main_text: query,
              secondary_text: 'Enter manually'
            },
            isManual: true
          });
        }
        
        setSuggestions(fallbackSuggestions);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      const request = {
        input: query,
        componentRestrictions: { country: 'us' }, // Restrict to US addresses
        types: ['address'] // Focus on addresses
      };

      try {
        if (autocompleteService.current?.useNewAPI) {
          // Use new Places API
          const { AutocompleteSuggestion } = window.google.maps.places;
          
          AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionToken.current,
            includedRegionCodes: ['us'],
            includedPrimaryTypes: ['street_address', 'route', 'locality']
          }).then((response) => {
            setIsLoading(false);
            
            const predictions = response.suggestions.map(suggestion => ({
              description: suggestion.placePrediction.text.text,
              place_id: suggestion.placePrediction.placeId,
              structured_formatting: {
                main_text: suggestion.placePrediction.structuredFormat?.mainText?.text || suggestion.placePrediction.text.text,
                secondary_text: suggestion.placePrediction.structuredFormat?.secondaryText?.text || ''
              }
            }));
            
            // Combine with quick addresses
            const quickSuggestions = quickAddresses
              .filter(addr => 
                addr.address?.toLowerCase().includes(query.toLowerCase()) ||
                addr.label?.toLowerCase().includes(query.toLowerCase())
              )
              .map(addr => ({
                description: addr.address,
                place_id: `saved_${addr.id}`,
                structured_formatting: {
                  main_text: addr.label,
                  secondary_text: addr.address
                },
                isSaved: true
              }));
            
            setSuggestions([...quickSuggestions, ...predictions]);
          }).catch(error => {
            console.error('Error with new Places API:', error);
            setIsLoading(false);
            // Fallback to manual entry
            setSuggestions([{
              description: query,
              place_id: `manual_${Date.now()}`,
              structured_formatting: {
                main_text: query,
                secondary_text: 'Enter manually'
              },
              isManual: true
            }]);
          });
        } else {
          // Use old API
          autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
            setIsLoading(false);
            
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              // Combine with quick addresses
              const quickSuggestions = quickAddresses
                .filter(addr => 
                  addr.address?.toLowerCase().includes(query.toLowerCase()) ||
                  addr.label?.toLowerCase().includes(query.toLowerCase())
                )
                .map(addr => ({
                  description: addr.address,
                  place_id: `saved_${addr.id}`,
                  structured_formatting: {
                    main_text: addr.label,
                    secondary_text: addr.address
                  },
                  isSaved: true
                }));
              
              setSuggestions([...quickSuggestions, ...predictions]);
            } else {
              // On API error, show manual entry option
              setSuggestions([{
                description: query,
                place_id: `manual_${Date.now()}`,
                structured_formatting: {
                  main_text: query,
                  secondary_text: 'Enter manually'
                },
                isManual: true
              }]);
            }
          });
        }
      } catch (error) {
        console.error('Error calling Google Places API:', error);
        setIsLoading(false);
        setApiError(true);
      }
    }, 300),
    [quickAddresses]
  );

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    searchPlaces(newValue);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion) => {
    const address = suggestion.description;
    setInputValue(address);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(address);
    
    // Get detailed place information if it's a Google suggestion
    if (!suggestion.place_id.startsWith('saved_') && !suggestion.place_id.startsWith('manual_')) {
      try {
        if (autocompleteService.current?.useNewAPI && window.google.maps.places.Place) {
          // Use new Place API
          const { Place } = window.google.maps.places;
          const place = new Place({ id: suggestion.place_id });
          await place.fetchFields({
            fields: ['formattedAddress', 'location', 'id']
          });
          
          if (onChange && place.formattedAddress) {
            onChange(place.formattedAddress, {
              lat: place.location?.lat(),
              lng: place.location?.lng(),
              placeId: place.id
            });
          }
        } else if (window.google?.maps?.places?.PlacesService) {
          // Fallback to old API
          const service = new window.google.maps.places.PlacesService(document.createElement('div'));
          service.getDetails(
            { placeId: suggestion.place_id },
            (place, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                if (onChange) {
                  onChange(place.formatted_address || address, {
                    lat: place.geometry?.location?.lat(),
                    lng: place.geometry?.location?.lng(),
                    placeId: place.place_id
                  });
                }
              }
            }
          );
        }
        
        // Generate new session token for next search
        if (sessionToken.current) {
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      } catch (error) {
        console.error('Error getting place details:', error);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSuggestions([]);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(e.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const clearInput = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            setShowSuggestions(true);
            if (inputValue) searchPlaces(inputValue);
            if (onFocus) onFocus(e);
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        
        {inputValue && (
          <button
            onClick={clearInput}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            type="button"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
        
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start space-x-3 border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {suggestion.isSaved ? (
                  <Star className="h-4 w-4 text-yellow-500" />
                ) : suggestion.isManual ? (
                  <Search className="h-4 w-4 text-blue-500" />
                ) : (
                  <MapPin className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </div>
                {suggestion.structured_formatting?.secondary_text && (
                  <div className="text-xs text-gray-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* Show API error message */}
      {apiError && (
        <div className="mt-1 text-xs text-amber-600">
          Location search unavailable - enter address manually
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;