import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Star, Building, Navigation } from 'lucide-react';
import { debounce } from '../../utils/helpers';
import { mapService } from '../../services/mapService';

const LocationCombobox = ({
  value,
  onChange,
  placeholder = "Enter address or search for a place",
  label,
  className = "",
  savedLocations = [],
  autoFocus = false,
  googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
}) => {
  const [inputValue, setInputValue] = useState(value?.name || value?.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [apiError, setApiError] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const autocompleteService = useRef(null);
  const sessionToken = useRef(null);
  const apiLoadAttempted = useRef(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('location-recent-searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }, []);

  // Initialize Google Maps API
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      if (window.google?.maps?.places) {
        try {
          if (window.google.maps.places.AutocompleteSuggestion) {
            sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
            autocompleteService.current = { useNewAPI: true };
            setApiError(false);
          } else {
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

    initializeGoogleMaps();
    window.initializeGoogleMapsLocationCombobox = initializeGoogleMaps;
  }, [googleApiKey]);

  const loadGoogleMapsAPI = () => {
    if (window.google?.maps || document.querySelector('script[src*="maps.googleapis.com"]')) {
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places&callback=initializeGoogleMapsLocationCombobox`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setApiError(true);
      apiLoadAttempted.current = false;
    };
    document.head.appendChild(script);
  };

  // Save recent search
  const saveRecentSearch = (result) => {
    try {
      const newSearch = {
        id: `recent_${Date.now()}`,
        type: result.type,
        name: result.name,
        address: result.address,
        timestamp: Date.now()
      };

      const updated = [newSearch, ...recentSearches.filter(s => s.address !== result.address)]
        .slice(0, 5); // Keep only 5 recent searches
      
      setRecentSearches(updated);
      localStorage.setItem('location-recent-searches', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  // Get address suggestions from Google Places Autocomplete
  const getAddressSuggestions = useCallback(async (query) => {
    if (!autocompleteService.current || apiError) return [];

    return new Promise((resolve) => {
      const request = {
        input: query,
        componentRestrictions: { country: 'us' },
        types: ['address']
      };

      if (autocompleteService.current?.useNewAPI) {
        const { AutocompleteSuggestion } = window.google.maps.places;
        
        AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionToken.current,
          includedRegionCodes: ['us'],
          includedPrimaryTypes: ['street_address', 'route', 'locality']
        }).then((response) => {
          const predictions = response.suggestions.map(suggestion => ({
            type: 'address',
            name: null,
            address: suggestion.placePrediction.text.text,
            placeId: suggestion.placePrediction.placeId,
            rating: null,
            icon: '📍',
            metadata: {
              mainText: suggestion.placePrediction.structuredFormat?.mainText?.text || suggestion.placePrediction.text.text,
              secondaryText: suggestion.placePrediction.structuredFormat?.secondaryText?.text || ''
            }
          }));
          resolve(predictions);
        }).catch(() => resolve([]));
      } else {
        autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const results = predictions.map(prediction => ({
              type: 'address',
              name: null,
              address: prediction.description,
              placeId: prediction.place_id,
              rating: null,
              icon: '📍',
              metadata: {
                mainText: prediction.structured_formatting?.main_text || prediction.description,
                secondaryText: prediction.structured_formatting?.secondary_text || ''
              }
            }));
            resolve(results);
          } else {
            resolve([]);
          }
        });
      }
    });
  }, [apiError]);

  // Unified search function
  const performSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        // Search saved locations
        const savedResults = savedLocations
          .filter(location => 
            location.name?.toLowerCase().includes(query.toLowerCase()) ||
            location.address?.toLowerCase().includes(query.toLowerCase())
          )
          .map(location => ({
            type: 'saved',
            name: location.name,
            address: location.address,
            placeId: `saved_${location.id}`,
            rating: null,
            icon: '⭐',
            metadata: { saved: true }
          }));

        // Search recent searches
        const recentResults = recentSearches
          .filter(search => 
            search.name?.toLowerCase().includes(query.toLowerCase()) ||
            search.address?.toLowerCase().includes(query.toLowerCase())
          )
          .map(search => ({
            ...search,
            icon: search.type === 'place' ? '🏢' : '📍',
            metadata: { recent: true }
          }));

        // Search places via mapService
        const placeResults = await mapService.searchPlaces(query);
        const formattedPlaces = placeResults.map(place => ({
          type: 'place',
          name: place.name,
          address: place.address,
          placeId: place.id,
          rating: place.rating,
          icon: '🏢',
          metadata: { 
            distance: place.distance,
            types: place.types || []
          }
        }));

        // Get address suggestions
        const addressResults = await getAddressSuggestions(query);

        // Combine and deduplicate results
        const allResults = [
          ...savedResults,
          ...recentResults,
          ...formattedPlaces,
          ...addressResults
        ];

        // Remove duplicates based on address
        const uniqueResults = allResults.filter((result, index, arr) => 
          arr.findIndex(r => r.address === result.address) === index
        );

        // Limit to 10 results and sort by relevance
        const sortedResults = uniqueResults
          .sort((a, b) => {
            // Priority order: saved -> recent -> places with rating -> addresses
            if (a.type === 'saved' && b.type !== 'saved') return -1;
            if (b.type === 'saved' && a.type !== 'saved') return 1;
            if (a.metadata?.recent && !b.metadata?.recent) return -1;
            if (b.metadata?.recent && !a.metadata?.recent) return 1;
            if (a.rating && b.rating) return b.rating - a.rating;
            if (a.rating && !b.rating) return -1;
            if (b.rating && !a.rating) return 1;
            return 0;
          })
          .slice(0, 10);

        setSuggestions(sortedResults);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      }

      setIsLoading(false);
    }, 300),
    [savedLocations, recentSearches, getAddressSuggestions]
  );

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowDropdown(true);
    setSelectedIndex(-1);
    performSearch(newValue);
  };

  // Handle result selection
  const handleSelectResult = async (result) => {
    setInputValue(result.name || result.address);
    setSuggestions([]);
    setShowDropdown(false);
    
    // Save to recent searches if not already saved
    if (result.type !== 'saved' && !result.metadata?.recent) {
      saveRecentSearch(result);
    }

    // Get detailed place information if needed
    if (result.placeId && !result.placeId.startsWith('saved_') && !result.placeId.startsWith('recent_')) {
      try {
        if (autocompleteService.current?.useNewAPI && window.google.maps.places.Place) {
          const { Place } = window.google.maps.places;
          const place = new Place({ id: result.placeId });
          await place.fetchFields({
            fields: ['formattedAddress', 'location', 'id']
          });
          
          const enrichedResult = {
            ...result,
            address: place.formattedAddress || result.address,
            metadata: {
              ...result.metadata,
              coordinates: place.location ? {
                lat: place.location.lat(),
                lng: place.location.lng()
              } : null
            }
          };
          
          onChange(enrichedResult);
        } else if (window.google?.maps?.places?.PlacesService) {
          const service = new window.google.maps.places.PlacesService(document.createElement('div'));
          service.getDetails(
            { placeId: result.placeId },
            (place, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                const enrichedResult = {
                  ...result,
                  address: place.formatted_address || result.address,
                  metadata: {
                    ...result.metadata,
                    coordinates: place.geometry?.location ? {
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng()
                    } : null
                  }
                };
                onChange(enrichedResult);
              } else {
                onChange(result);
              }
            }
          );
        } else {
          onChange(result);
        }

        // Generate new session token
        if (sessionToken.current) {
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      } catch (error) {
        console.error('Error getting place details:', error);
        onChange(result);
      }
    } else {
      onChange(result);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

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
          handleSelectResult(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSuggestions([]);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Update input when value prop changes
  useEffect(() => {
    if (value) {
      setInputValue(value.name || value.address || '');
    } else {
      setInputValue('');
    }
  }, [value]);

  const clearInput = () => {
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    onChange(null);
    inputRef.current?.focus();
  };

  // Group suggestions by type for display
  const groupedSuggestions = suggestions.reduce((groups, suggestion) => {
    const key = suggestion.metadata?.saved ? 'saved' : 
                suggestion.metadata?.recent ? 'recent' :
                suggestion.type;
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(suggestion);
    return groups;
  }, {});

  const getSectionTitle = (type) => {
    switch (type) {
      case 'saved': return 'Saved Locations';
      case 'recent': return 'Recent Searches';
      case 'place': return 'Places';
      case 'address': return 'Addresses';
      default: return '';
    }
  };

  const getIcon = (suggestion) => {
    if (suggestion.metadata?.saved) return <Star className="h-4 w-4 text-yellow-500" />;
    if (suggestion.metadata?.recent) return <Navigation className="h-4 w-4 text-purple-500" />;
    if (suggestion.type === 'place') return <Building className="h-4 w-4 text-blue-500" />;
    return <MapPin className="h-4 w-4 text-gray-500" />;
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
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setShowDropdown(true);
            if (inputValue) performSearch(inputValue);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
          aria-autocomplete="list"
        />
        
        {inputValue && (
          <button
            onClick={clearInput}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-md transition-colors duration-150"
            type="button"
            aria-label="Clear input"
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

      {/* Results dropdown */}
      {showDropdown && (suggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-80 overflow-auto"
          role="listbox"
        >
          {isLoading && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Searching locations...
            </div>
          ) : (
            Object.entries(groupedSuggestions).map(([sectionType, sectionSuggestions], sectionIndex) => (
              <div key={sectionType}>
                {Object.keys(groupedSuggestions).length > 1 && (
                  <>
                    {sectionIndex > 0 && <div className="border-t border-gray-100" />}
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                      {getSectionTitle(sectionType)}
                    </div>
                  </>
                )}
                
                {sectionSuggestions.map((suggestion, index) => {
                  const globalIndex = suggestions.findIndex(s => s === suggestion);
                  return (
                    <button
                      key={suggestion.placeId || suggestion.id || globalIndex}
                      onClick={() => handleSelectResult(suggestion)}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 flex items-start space-x-3 transition-colors duration-150 ${
                        globalIndex === selectedIndex ? 'bg-blue-100' : ''
                      }`}
                      role="option"
                      aria-selected={globalIndex === selectedIndex}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(suggestion)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {suggestion.name && (
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.name}
                            {suggestion.rating && (
                              <span className="ml-2 text-xs text-yellow-600">
                                ★ {suggestion.rating}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 truncate">
                          {suggestion.metadata?.mainText && suggestion.metadata?.secondaryText ? (
                            <>
                              <span className="font-medium">{suggestion.metadata.mainText}</span>
                              {suggestion.metadata.secondaryText && (
                                <span className="text-gray-500"> • {suggestion.metadata.secondaryText}</span>
                              )}
                            </>
                          ) : (
                            suggestion.address
                          )}
                        </div>
                        {suggestion.metadata?.distance && (
                          <div className="text-xs text-gray-400 mt-1">
                            {suggestion.metadata.distance}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          
          {!isLoading && suggestions.length === 0 && inputValue.length >= 2 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No locations found for "{inputValue}"
            </div>
          )}
        </div>
      )}
      
      {/* API error message */}
      {apiError && (
        <div className="mt-1 text-xs text-amber-600">
          Location search limited - Google Maps unavailable
        </div>
      )}
    </div>
  );
};

export default LocationCombobox;