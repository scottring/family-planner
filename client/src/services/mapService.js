// Context-aware place categories for smart suggestions
const PLACE_CATEGORIES = {
  'birthday_party': ['toy store', 'gift shop', 'party supplies', 'bakery', 'ice cream shop'],
  'sports_event': ['sports store', 'restaurant', 'gas station', 'convenience store'],
  'doctor_appointment': ['pharmacy', 'coffee shop', 'parking garage'],
  'school_event': ['office supplies', 'bookstore', 'coffee shop', 'gift shop'],
  'grocery_shopping': ['gas station', 'bank', 'pharmacy', 'coffee shop'],
  'date_night': ['restaurant', 'movie theater', 'dessert shop', 'parking garage'],
  'workout': ['smoothie bar', 'health food store', 'pharmacy', 'gas station']
};

// Mock data for place searches - in production this would come from Google Places API
const MOCK_PLACES = [
  {
    id: 'dunkin_1',
    name: 'Dunkin\'',
    address: '123 Main St, Anytown, ST 12345',
    rating: 4.2,
    distance: '0.5 miles',
    type: 'cafe'
  },
  {
    id: 'dunkin_2',
    name: 'Dunkin\'',
    address: '456 Oak Ave, Anytown, ST 12345',
    rating: 4.0,
    distance: '1.2 miles',
    type: 'cafe'
  },
  {
    id: 'starbucks_1',
    name: 'Starbucks',
    address: '789 Pine St, Anytown, ST 12345',
    rating: 4.3,
    distance: '0.8 miles',
    type: 'cafe'
  },
  {
    id: 'shell_1',
    name: 'Shell Gas Station',
    address: '321 Highway 1, Anytown, ST 12345',
    rating: 3.9,
    distance: '0.3 miles',
    type: 'gas_station'
  },
  {
    id: 'bp_1',
    name: 'BP Gas Station',
    address: '654 Route 9, Anytown, ST 12345',
    rating: 3.7,
    distance: '1.5 miles',
    type: 'gas_station'
  },
  {
    id: 'mcdonalds_1',
    name: 'McDonald\'s',
    address: '987 Center St, Anytown, ST 12345',
    rating: 3.8,
    distance: '0.7 miles',
    type: 'restaurant'
  },
  {
    id: 'cvs_1',
    name: 'CVS Pharmacy',
    address: '147 Market St, Anytown, ST 12345',
    rating: 4.1,
    distance: '0.9 miles',
    type: 'pharmacy'
  },
  {
    id: 'whole_foods_1',
    name: 'Whole Foods Market',
    address: '258 Shopping Center Dr, Anytown, ST 12345',
    rating: 4.4,
    distance: '1.1 miles',
    type: 'grocery_store'
  },
  {
    id: 'target_1',
    name: 'Target',
    address: '369 Plaza Blvd, Anytown, ST 12345',
    rating: 4.2,
    distance: '1.8 miles',
    type: 'department_store'
  },
  {
    id: 'bank_america_1',
    name: 'Bank of America',
    address: '741 Financial Way, Anytown, ST 12345',
    rating: 3.5,
    distance: '0.6 miles',
    type: 'bank'
  },
  {
    id: 'toys_r_us_1',
    name: 'Toys "R" Us',
    address: '852 Kids Plaza, Anytown, ST 12345',
    rating: 4.3,
    distance: '2.1 miles',
    type: 'toy_store'
  },
  {
    id: 'party_city_1',
    name: 'Party City',
    address: '963 Celebration Ave, Anytown, ST 12345',
    rating: 4.0,
    distance: '1.3 miles',
    type: 'party_supplies'
  },
  {
    id: 'hallmark_1',
    name: 'Hallmark Store',
    address: '159 Gift Lane, Anytown, ST 12345',
    rating: 4.5,
    distance: '0.8 miles',
    type: 'gift_shop'
  },
  {
    id: 'bakery_1',
    name: 'Sweet Dreams Bakery',
    address: '357 Dessert Dr, Anytown, ST 12345',
    rating: 4.7,
    distance: '1.0 miles',
    type: 'bakery'
  },
  {
    id: 'ice_cream_1',
    name: 'Ben & Jerry\'s',
    address: '486 Frozen Treat Way, Anytown, ST 12345',
    rating: 4.6,
    distance: '0.9 miles',
    type: 'ice_cream_shop'
  },
  {
    id: 'sports_store_1',
    name: 'Dick\'s Sporting Goods',
    address: '789 Athletic Blvd, Anytown, ST 12345',
    rating: 4.1,
    distance: '1.6 miles',
    type: 'sports_store'
  },
  {
    id: 'bookstore_1',
    name: 'Barnes & Noble',
    address: '321 Reading Rd, Anytown, ST 12345',
    rating: 4.4,
    distance: '1.4 miles',
    type: 'bookstore'
  },
  {
    id: 'office_depot_1',
    name: 'Office Depot',
    address: '654 Business Center, Anytown, ST 12345',
    rating: 3.9,
    distance: '1.2 miles',
    type: 'office_supplies'
  }
];

export const mapService = {
  /**
   * Generate a Google Maps navigation URL with waypoints
   * @param {string} start - Starting address
   * @param {string} destination - Destination address
   * @param {string[]} waypoints - Array of waypoint addresses
   * @returns {string} Google Maps URL
   */
  generateNavigationUrl: (start, destination, waypoints = []) => {
    if (!start || !destination) {
      return '';
    }

    const baseUrl = 'https://www.google.com/maps/dir/';
    const encodedStart = encodeURIComponent(start.trim());
    const encodedDestination = encodeURIComponent(destination.trim());
    
    let url = baseUrl + encodedStart;
    
    // Add waypoints
    if (waypoints && waypoints.length > 0) {
      const validWaypoints = waypoints.filter(wp => wp && wp.trim());
      validWaypoints.forEach(waypoint => {
        url += '/' + encodeURIComponent(waypoint.trim());
      });
    }
    
    url += '/' + encodedDestination;
    
    return url;
  },

  /**
   * Calculate estimated drive time (mock implementation)
   * In production, this would use Google Maps Distance Matrix API
   * @param {string} start - Starting address
   * @param {string} destination - Destination address
   * @param {Object[]} stops - Array of stop objects with address property
   * @returns {string} Estimated time string
   */
  calculateDriveTime: (start, destination, stops = []) => {
    if (!start || !destination) {
      return null;
    }

    // Mock calculation based on number of stops and distance heuristic
    let baseTime = 25; // Base time in minutes
    const stopTime = stops.length * 8; // 8 minutes per stop
    const addressComplexity = (start.length + destination.length) / 20; // Rough distance heuristic
    
    const totalMinutes = Math.round(baseTime + stopTime + addressComplexity);
    
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  },

  /**
   * Search for places along a route
   * Uses Google Places API when available, falls back to mock data
   * @param {string} query - Search query (e.g., "Dunkin Donuts", "gas station")
   * @param {string} nearLocation - Location to search near
   * @returns {Promise<Object[]>} Array of place objects
   */
  searchPlaces: async (query, nearLocation = '') => {
    if (!query || query.length < 2) {
      return [];
    }
    
    // Try to use Google Places API if available
    if (window.google?.maps?.places) {
      try {
        // Check for new API first
        if (window.google.maps.places.SearchNearbyRankPreference) {
          // Use new Places API (v3)
          const { Place } = window.google.maps.places;
          
          // Create location bias if provided
          let locationBias = null;
          if (nearLocation) {
            try {
              const geocoder = new window.google.maps.Geocoder();
              const geocodeResult = await new Promise((resolve) => {
                geocoder.geocode({ address: nearLocation }, (results, status) => {
                  if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location);
                  } else {
                    resolve(null);
                  }
                });
              });
              
              if (geocodeResult) {
                locationBias = {
                  center: { lat: geocodeResult.lat(), lng: geocodeResult.lng() },
                  radius: 50000 // 50km radius
                };
              }
            } catch (error) {
              console.error('Geocoding error:', error);
            }
          }
          
          // Perform text search using new API
          const request = {
            textQuery: query,
            fields: ['id', 'displayName', 'formattedAddress', 'rating', 'location', 'primaryType'],
            maxResultCount: 8,
            ...(locationBias && { locationBias })
          };
          
          const { places } = await Place.searchByText(request);
          
          return places.map(place => ({
            id: place.id,
            name: place.displayName?.text || place.displayName || 'Unknown',
            address: place.formattedAddress || '',
            rating: place.rating || 0,
            distance: null,
            type: place.primaryType || 'place',
            types: place.types || [place.primaryType || 'place'], // Include full types array
            geometry: place.location ? {
              lat: place.location.lat(),
              lng: place.location.lng()
            } : null
          }));
        } else {
          // Fall back to old API
          return new Promise((resolve) => {
            const service = new window.google.maps.places.PlacesService(
              document.createElement('div')
            );
            
            const request = {
              query: query,
              fields: ['name', 'formatted_address', 'rating', 'geometry', 'place_id', 'types']
            };
            
            // Add location bias if provided
            if (nearLocation) {
              const geocoder = new window.google.maps.Geocoder();
              geocoder.geocode({ address: nearLocation }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  request.location = results[0].geometry.location;
                  request.radius = 50000;
                }
                
                // Perform the search
                service.textSearch(request, (results, status) => {
                  if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    const places = results.slice(0, 8).map(place => ({
                      id: place.place_id,
                      name: place.name,
                      address: place.formatted_address,
                      rating: place.rating || 0,
                      distance: null,
                      type: place.types ? place.types[0] : 'place',
                      types: place.types || [], // Include full types array
                      geometry: {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                      }
                    }));
                    resolve(places);
                  } else {
                    resolve(mapService.searchPlacesMock(query));
                  }
                });
              });
            } else {
              // Search without location bias
              service.textSearch(request, (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                  const places = results.slice(0, 8).map(place => ({
                    id: place.place_id,
                    name: place.name,
                    address: place.formatted_address,
                    rating: place.rating || 0,
                    distance: null,
                    type: place.types ? place.types[0] : 'place',
                    types: place.types || [], // Include full types array
                    geometry: {
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng()
                    }
                  }));
                  resolve(places);
                } else {
                  resolve(mapService.searchPlacesMock(query));
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Places search error:', error);
        // Fall back to mock data on any error
        return mapService.searchPlacesMock(query);
      }
    }
    
    // Fall back to mock implementation
    return mapService.searchPlacesMock(query);
  },
  
  /**
   * Mock implementation for place search
   */
  searchPlacesMock: async (query) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const searchTerm = query.toLowerCase().trim();
    
    // Filter mock places based on search query
    const results = MOCK_PLACES.filter(place => {
      const name = place.name.toLowerCase();
      const type = place.type.toLowerCase().replace('_', ' ');
      
      // Search in name and type
      return name.includes(searchTerm) || 
             type.includes(searchTerm) ||
             searchTerm.includes(name) ||
             searchTerm.includes(type);
    });
    
    // Sort by relevance (exact matches first, then by rating)
    results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aExactMatch = aName === searchTerm;
      const bExactMatch = bName === searchTerm;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      return b.rating - a.rating;
    });
    
    // Return up to 8 results
    return results.slice(0, 8);
  },

  /**
   * Get route information (mock implementation)
   * In production, this would use Google Directions API
   * @param {string} start - Starting address
   * @param {string} destination - Destination address
   * @param {string[]} waypoints - Array of waypoint addresses
   * @returns {Promise<Object>} Route information
   */
  getRouteInfo: async (start, destination, waypoints = []) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!start || !destination) {
      throw new Error('Start and destination addresses are required');
    }
    
    const distance = Math.round(Math.random() * 50 + 10); // 10-60 miles
    const duration = mapService.calculateDriveTime(start, destination, waypoints.map(wp => ({ address: wp })));
    
    return {
      distance: `${distance} mi`,
      duration,
      steps: [
        `Head ${['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)]} on your current road`,
        `Turn ${'left' ? Math.random() > 0.5 : 'right'} onto Main Street`,
        ...waypoints.map((wp, i) => `Stop ${i + 1}: ${wp}`),
        `Arrive at ${destination}`
      ],
      polyline: null, // Would contain encoded polyline in real implementation
      waypoint_order: waypoints.map((_, i) => i) // Optimal waypoint order
    };
  },

  /**
   * Geocode an address to get coordinates (mock implementation)
   * In production, this would use Google Geocoding API
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} Coordinates and formatted address
   */
  geocodeAddress: async (address) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!address || address.trim().length < 3) {
      throw new Error('Address is required and must be at least 3 characters');
    }
    
    // Mock coordinates (roughly around Boston area)
    const lat = 42.3601 + (Math.random() - 0.5) * 0.1;
    const lng = -71.0589 + (Math.random() - 0.5) * 0.1;
    
    return {
      coordinates: {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      },
      formatted_address: address.trim(),
      place_id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      address_components: [
        { type: 'street_number', value: '123' },
        { type: 'route', value: 'Mock Street' },
        { type: 'locality', value: 'Anytown' },
        { type: 'administrative_area_level_1', value: 'ST' },
        { type: 'postal_code', value: '12345' },
        { type: 'country', value: 'US' }
      ]
    };
  },

  /**
   * Get traffic information for a route (mock implementation)
   * In production, this would use Google Maps Traffic Layer or API
   * @param {string} start - Starting address
   * @param {string} destination - Destination address
   * @returns {Promise<Object>} Traffic information
   */
  getTrafficInfo: async (start, destination) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const conditions = ['light', 'moderate', 'heavy'];
    const traffic = conditions[Math.floor(Math.random() * conditions.length)];
    
    let delayMinutes = 0;
    let color = 'green';
    
    switch (traffic) {
      case 'moderate':
        delayMinutes = Math.round(Math.random() * 15 + 5);
        color = 'yellow';
        break;
      case 'heavy':
        delayMinutes = Math.round(Math.random() * 30 + 15);
        color = 'red';
        break;
    }
    
    return {
      condition: traffic,
      delay: delayMinutes > 0 ? `+${delayMinutes} min` : null,
      color,
      incidents: Math.random() > 0.7 ? [
        {
          type: 'accident',
          description: 'Minor accident reported ahead',
          impact: 'light'
        }
      ] : [],
      lastUpdated: new Date().toISOString()
    };
  },

  /**
   * Find parking near destination (mock implementation)
   * @param {string} destination - Destination address
   * @returns {Promise<Object[]>} Parking options
   */
  findParking: async (destination) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const parkingOptions = [
      {
        id: 'parking_1',
        name: 'Street Parking',
        type: 'street',
        distance: '0.1 miles',
        price: 'Free (2hr limit)',
        availability: 'Usually Available'
      },
      {
        id: 'parking_2',
        name: 'Municipal Parking Garage',
        type: 'garage',
        distance: '0.2 miles',
        price: '$3/hour',
        availability: 'High'
      },
      {
        id: 'parking_3',
        name: 'Shopping Center Lot',
        type: 'lot',
        distance: '0.3 miles',
        price: 'Free (with validation)',
        availability: 'Medium'
      }
    ];
    
    return parkingOptions;
  },

  /**
   * Get contextual place suggestions based on event type
   * @param {string} eventType - Type of event (e.g., 'birthday_party', 'sports_event')
   * @param {string} route - Optional route information
   * @returns {Promise<Object[]>} Suggested places
   */
  getContextualSuggestions: async (eventType, route = null) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const categories = PLACE_CATEGORIES[eventType] || ['restaurant', 'coffee shop'];
    const suggestions = [];
    
    // Find places matching the suggested categories
    categories.forEach(category => {
      const categoryPlaces = MOCK_PLACES.filter(place => {
        const placeType = place.type.toLowerCase().replace('_', ' ');
        return placeType.includes(category.replace('_', ' ')) || 
               place.name.toLowerCase().includes(category);
      });
      suggestions.push(...categoryPlaces);
    });
    
    // Remove duplicates
    const uniqueSuggestions = Array.from(new Map(suggestions.map(p => [p.id, p])).values());
    
    // Sort by rating
    uniqueSuggestions.sort((a, b) => b.rating - a.rating);
    
    return uniqueSuggestions.slice(0, 5).map(place => ({
      ...place,
      suggestion_reason: `Popular ${place.type.replace('_', ' ')} for ${eventType.replace('_', ' ')}`
    }));
  },

  /**
   * Search places along a route
   * Uses Google Directions & Places APIs when available
   * @param {string} start - Starting address
   * @param {string} destination - Destination address
   * @param {string} query - Search query
   * @param {number} maxDetour - Maximum detour in miles (default: 2)
   * @returns {Promise<Object[]>} Places along the route
   */
  searchAlongRoute: async (start, destination, query, maxDetour = 2) => {
    if (!start || !destination || !query) {
      return [];
    }
    
    // Try to use Google Maps APIs if available
    if (window.google && window.google.maps && window.google.maps.places) {
      try {
        // First, get the route
        const directionsService = new window.google.maps.DirectionsService();
        const routeRequest = {
          origin: start,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING
        };
        
        const routeResult = await new Promise((resolve, reject) => {
          directionsService.route(routeRequest, (result, status) => {
            if (status === 'OK') {
              resolve(result);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          });
        });
        
        // Extract route bounds
        const route = routeResult.routes[0];
        const bounds = route.bounds;
        
        // Search for places within the route bounds
        const placesService = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
        
        const searchRequest = {
          query: query,
          bounds: bounds,
          fields: ['name', 'formatted_address', 'rating', 'geometry', 'place_id', 'types']
        };
        
        const places = await new Promise((resolve) => {
          placesService.textSearch(searchRequest, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              resolve(results);
            } else {
              // Fall back to general search
              resolve([]);
            }
          });
        });
        
        // If we got places, calculate detour for each
        if (places && places.length > 0) {
          const placesWithDetour = places.slice(0, 8).map((place) => {
            // Calculate approximate position along route (simplified)
            const routeLength = route.overview_path.length;
            const randomPosition = Math.random(); // Simplified for now
            
            // Mock detour calculation (would need real calculation in production)
            const detourMiles = Math.random() * 3;
            const isOnRoute = detourMiles <= maxDetour;
            
            return {
              id: place.place_id,
              name: place.name,
              address: place.formatted_address,
              rating: place.rating || 0,
              type: place.types ? place.types[0] : 'place',
              types: place.types || [], // Include full types array
              geometry: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              detour: `+${detourMiles.toFixed(1)} miles`,
              detour_time: `+${Math.round(detourMiles * 3)} min`,
              on_route: isOnRoute,
              route_position: randomPosition
            };
          });
          
          // Sort by position along route
          placesWithDetour.sort((a, b) => a.route_position - b.route_position);
          
          return placesWithDetour;
        }
      } catch (error) {
        console.warn('Google Maps API error, falling back to mock:', error);
      }
    }
    
    // Fall back to mock implementation
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const searchResults = await mapService.searchPlaces(query);
    
    const placesAlongRoute = searchResults.map(place => {
      const detourDistance = Math.random() * 3; // Random detour 0-3 miles
      const isOnRoute = detourDistance <= maxDetour;
      
      return {
        ...place,
        detour: `+${detourDistance.toFixed(1)} miles`,
        detour_time: `+${Math.round(detourDistance * 3)} min`,
        on_route: isOnRoute,
        route_position: Math.random()
      };
    });
    
    placesAlongRoute.sort((a, b) => a.route_position - b.route_position);
    
    return placesAlongRoute;
  },

  /**
   * Get smart stop suggestions based on time and context
   * @param {Object} tripInfo - Trip information (start, destination, departure time, event type)
   * @returns {Promise<Object>} Smart suggestions
   */
  getSmartStopSuggestions: async (tripInfo) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { start, destination, departureTime, eventType } = tripInfo;
    const suggestions = {
      recommended: [],
      nearby: [],
      time_based: []
    };
    
    // Get contextual suggestions based on event type
    if (eventType) {
      const contextual = await mapService.getContextualSuggestions(eventType);
      suggestions.recommended = contextual.slice(0, 3);
    }
    
    // Time-based suggestions (mock)
    const hour = new Date(departureTime).getHours();
    if (hour >= 6 && hour < 10) {
      // Morning - suggest coffee/breakfast
      suggestions.time_based = MOCK_PLACES.filter(p => 
        p.type === 'cafe' || p.name.includes('Dunkin')
      ).slice(0, 2);
    } else if (hour >= 11 && hour < 14) {
      // Lunch time
      suggestions.time_based = MOCK_PLACES.filter(p => 
        p.type === 'restaurant'
      ).slice(0, 2);
    } else if (hour >= 17 && hour < 20) {
      // Dinner time
      suggestions.time_based = MOCK_PLACES.filter(p => 
        p.type === 'restaurant' || p.type === 'grocery_store'
      ).slice(0, 2);
    }
    
    // Nearby essentials
    suggestions.nearby = MOCK_PLACES.filter(p => 
      p.type === 'gas_station' || p.type === 'pharmacy'
    ).slice(0, 2);
    
    return suggestions;
  }
};

export default mapService;