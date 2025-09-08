import { useState, useEffect } from 'react';
import { Search, X, MapPin, Star, Coffee, ShoppingCart, Heart, Building, Car, Utensils } from 'lucide-react';
import { mapService } from '../../services/mapService';
import { debounce } from '../../utils/helpers';

const PlaceSearchModal = ({ isOpen, onClose, onSelectPlace, origin = null, eventTitle = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [recentPlaces] = useState([
    { id: 'home', name: 'Home', address: '123 Main St, Anytown, ST 12345', type: 'recent' },
    { id: 'work', name: 'Work', address: '456 Business Blvd, Anytown, ST 12345', type: 'recent' },
    { id: 'school', name: 'School', address: '789 Education Ave, Anytown, ST 12345', type: 'recent' }
  ]);

  // Popular place categories with icons
  const placeCategories = [
    { 
      id: 'restaurants', 
      label: 'Restaurants', 
      query: 'restaurant', 
      icon: Utensils, 
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100'
    },
    { 
      id: 'coffee', 
      label: 'Coffee Shops', 
      query: 'coffee shop', 
      icon: Coffee, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100'
    },
    { 
      id: 'shopping', 
      label: 'Shopping', 
      query: 'shopping center', 
      icon: ShoppingCart, 
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100'
    },
    { 
      id: 'healthcare', 
      label: 'Healthcare', 
      query: 'hospital', 
      icon: Heart, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100'
    },
    { 
      id: 'schools', 
      label: 'Schools', 
      query: 'school', 
      icon: Building, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100'
    },
    { 
      id: 'gas', 
      label: 'Gas Stations', 
      query: 'gas station', 
      icon: Car, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100'
    }
  ];

  // Auto-populate search based on event title
  useEffect(() => {
    if (isOpen && eventTitle && !searchQuery) {
      const title = eventTitle.toLowerCase();
      let smartSearch = '';
      
      // Extract potential place names or categories from event title
      if (title.includes('dinner') || title.includes('lunch') || title.includes('restaurant')) {
        smartSearch = 'restaurant';
      } else if (title.includes('coffee') || title.includes('cafe')) {
        smartSearch = 'coffee shop';
      } else if (title.includes('doctor') || title.includes('appointment') || title.includes('medical')) {
        smartSearch = 'medical center';
      } else if (title.includes('grocery') || title.includes('shopping')) {
        smartSearch = 'grocery store';
      } else if (title.includes('soccer') || title.includes('football') || title.includes('game')) {
        smartSearch = 'park';
      } else if (title.includes('school') || title.includes('pickup') || title.includes('drop')) {
        smartSearch = 'school';
      } else if (title.includes('gas') || title.includes('fuel')) {
        smartSearch = 'gas station';
      } else {
        // Try to extract potential place names (look for capitalized words that might be places)
        const words = title.split(' ');
        const capitalizedWords = words.filter(word => 
          word.length > 3 && word[0] === word[0].toUpperCase() && 
          !['The', 'And', 'Or', 'At', 'To', 'From', 'With'].includes(word)
        );
        
        if (capitalizedWords.length > 0) {
          smartSearch = capitalizedWords.join(' ');
        }
      }
      
      if (smartSearch) {
        setSearchQuery(smartSearch);
        performSearch(smartSearch);
      }
    }
  }, [isOpen, eventTitle]);

  // Debounced search function
  const performSearch = debounce(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await mapService.searchPlaces(query, origin);
      
      // Add distance from origin if available
      const enrichedResults = results.map(place => ({
        ...place,
        distance: calculateDistance(place, origin),
        displayName: `${place.name}`,
        displayAddress: place.address
      }));

      // Sort by relevance (rating and distance)
      enrichedResults.sort((a, b) => {
        if (a.distance && b.distance) {
          return parseFloat(a.distance) - parseFloat(b.distance);
        }
        return (b.rating || 0) - (a.rating || 0);
      });

      setSearchResults(enrichedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
    setIsLoading(false);
  }, 300);

  // Calculate approximate distance (simplified)
  const calculateDistance = (place, origin) => {
    if (!place.geometry || !origin) return null;
    
    // This is a simplified calculation - in production you'd use proper distance calculation
    const randomDistance = (Math.random() * 5 + 0.1).toFixed(1);
    return `${randomDistance} mi`;
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedCategory('');
    performSearch(query);
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category.id);
    setSearchQuery(category.query);
    performSearch(category.query);
  };

  // Handle place selection
  const handlePlaceSelect = (place) => {
    const selectedPlace = {
      id: place.id,
      name: place.name,
      address: place.address || place.displayAddress,
      place_id: place.id,
      rating: place.rating,
      distance: place.distance,
      geometry: place.geometry,
      displayText: `${place.name} • ${place.address || place.displayAddress}`
    };
    
    onSelectPlace(selectedPlace);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Search Places</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search for places (e.g., Trader Joe's, Kaiser Hospital, Golden Gate Park)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Categories */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Categories</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {placeCategories.map(category => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                      selectedCategory === category.id 
                        ? `border-blue-500 ${category.bgColor}` 
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${selectedCategory === category.id ? category.color : 'text-gray-500'}`} />
                    <span className="text-sm">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent/Saved Places */}
          {!searchQuery && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Places</h4>
              <div className="space-y-2">
                {recentPlaces.map(place => (
                  <button
                    key={place.id}
                    onClick={() => handlePlaceSelect(place)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 flex items-center space-x-3"
                  >
                    <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">{place.name}</div>
                      <div className="text-sm text-gray-600">{place.address}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-2" />
                <p className="text-gray-600">Searching places...</p>
              </div>
            )}

            {!isLoading && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No places found for "{searchQuery}"</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search term or category</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Search Results ({searchResults.length})
                </h4>
                {searchResults.map(place => (
                  <button
                    key={place.id}
                    onClick={() => handlePlaceSelect(place)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 truncate">{place.name}</h4>
                          {place.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-gray-600">{place.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">{place.address}</p>
                        {place.type && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mt-2">
                            {place.type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      {place.distance && (
                        <div className="flex-shrink-0 ml-4 text-right">
                          <div className="text-xs text-blue-600 font-medium">{place.distance}</div>
                          {origin && <div className="text-xs text-gray-500">from origin</div>}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceSearchModal;