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
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

  // Initialize Google Places Autocomplete Service
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );
    } else if (googleApiKey) {
      // Load Google Maps API if not already loaded
      loadGoogleMapsAPI();
    }
  }, [googleApiKey]);

  const loadGoogleMapsAPI = () => {
    if (window.google && window.google.maps) return;
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
      }
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

      if (!autocompleteService.current) {
        // Fallback to showing quick addresses if Google Maps isn't available
        const filtered = quickAddresses.filter(addr => 
          addr.address.toLowerCase().includes(query.toLowerCase()) ||
          addr.label.toLowerCase().includes(query.toLowerCase())
        );
        setSuggestions(filtered.map(addr => ({
          description: addr.address,
          place_id: `saved_${addr.id}`,
          structured_formatting: {
            main_text: addr.label,
            secondary_text: addr.address
          }
        })));
        return;
      }

      setIsLoading(true);
      
      const request = {
        input: query,
        componentRestrictions: { country: 'us' }, // Restrict to US addresses
        types: ['address'] // Focus on addresses
      };

      autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
        setIsLoading(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Combine with quick addresses
          const quickSuggestions = quickAddresses
            .filter(addr => 
              addr.address.toLowerCase().includes(query.toLowerCase()) ||
              addr.label.toLowerCase().includes(query.toLowerCase())
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
          setSuggestions([]);
        }
      });
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
  const handleSelectSuggestion = (suggestion) => {
    const address = suggestion.description;
    setInputValue(address);
    setSuggestions([]);
    setShowSuggestions(false);
    onChange(address);
    
    // Get detailed place information if it's a Google suggestion
    if (placesService.current && !suggestion.place_id.startsWith('saved_')) {
      placesService.current.getDetails(
        { placeId: suggestion.place_id },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            // Pass additional place data if needed
            if (onChange) {
              onChange(place.formatted_address || address, {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                placeId: place.place_id
              });
            }
          }
        }
      );
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
    </div>
  );
};

export default AddressAutocomplete;