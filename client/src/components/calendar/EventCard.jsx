import { format } from 'date-fns';
import { useState } from 'react';
import { Clock, MapPin, Users, Brain, CheckSquare, ArrowUp, Timer, AlertCircle, ChevronDown, ChevronUp, Sparkles, Car, Bike, Navigation, Route, ArrowRight, ExternalLink } from 'lucide-react';
import { aiService } from '../../services/ai';
import { mapService } from '../../services/mapService';

// Transportation mode specific icons and colors
const transportationModeConfig = {
  driving: { icon: Car, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Driving' },
  walking: { icon: Navigation, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Walking' },
  bicycling: { icon: Bike, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Bicycling' },
  transit: { icon: Route, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Transit' }
};

const EventCard = ({ event, onEventUpdate }) => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState(null);

  // Transportation event detection and helpers
  const isTransportationEvent = (event) => {
    return event.event_type === 'travel' || 
           event.category === 'travel' || 
           event.type === 'travel' ||
           event.transportation_mode || 
           event.driving_needed ||
           event.starting_address ||
           event.destination_address ||
           (event.transportation_data && Object.keys(event.transportation_data).length > 0);
  };

  const handleOpenInMaps = (event) => {
    const routeInfo = {
      starting_address: event.transportation_data?.starting_address || event.starting_address,
      destination_address: event.transportation_data?.destination_address || event.destination_address || event.location,
      stops: event.transportation_data?.stops || event.stops || []
    };
    
    if (routeInfo.starting_address && routeInfo.destination_address) {
      const waypoints = routeInfo.stops?.map(stop => stop.address).filter(Boolean) || [];
      const mapsUrl = mapService.generateNavigationUrl(
        routeInfo.starting_address,
        routeInfo.destination_address,
        waypoints
      );
      if (mapsUrl) {
        window.open(mapsUrl, '_blank');
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const handleEnrichWithAI = async () => {
    setIsEnriching(true);
    setEnrichmentError(null);

    try {
      const eventData = {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        eventType: event.event_type,
        startTime: event.start_time || event.start,
        endTime: event.end_time || event.end
      };

      const response = await aiService.enrichEvent(eventData, true);
      
      if (response.event && onEventUpdate) {
        onEventUpdate(response.event);
      }
      
      setShowAISuggestions(true);
    } catch (error) {
      console.error('AI enrichment failed:', error);
      setEnrichmentError(error.message || 'Failed to enrich event');
    } finally {
      setIsEnriching(false);
    }
  };

  const formatResources = (resources) => {
    if (!resources) return [];
    const parsed = typeof resources === 'string' ? JSON.parse(resources) : resources;
    const items = [];
    
    if (parsed.documents && parsed.documents.length > 0) {
      items.push({ type: 'Documents', items: parsed.documents });
    }
    if (parsed.equipment && parsed.equipment.length > 0) {
      items.push({ type: 'Equipment', items: parsed.equipment });
    }
    if (parsed.money && parsed.money.estimated_cost) {
      items.push({ 
        type: 'Budget', 
        items: [`$${parsed.money.estimated_cost} - ${parsed.money.description}`] 
      });
    }
    
    return items;
  };

  const formatAISuggestions = (suggestions) => {
    if (!suggestions) return { preparationList: [], suggestions: {} };
    
    try {
      const parsed = typeof suggestions === 'string' ? JSON.parse(suggestions) : suggestions;
      return {
        preparationList: parsed.preparation_list || [],
        suggestions: parsed.suggestions || {}
      };
    } catch (error) {
      return { preparationList: [], suggestions: {} };
    }
  };

  const isAIEnriched = event.ai_enriched;
  const needsEnrichment = aiService.needsEnrichment(event);
  const enrichmentPriority = aiService.getEnrichmentPriority(event);
  const resourcesNeeded = formatResources(event.resources_needed);
  const aiSuggestions = formatAISuggestions(event.ai_suggestions);
  const weatherConsiderations = event.weather_considerations ? 
    (typeof event.weather_considerations === 'string' ? 
      JSON.parse(event.weather_considerations) : event.weather_considerations) : null;

  return (
    <div className={`p-3 rounded-lg border-l-4 shadow-sm relative ${getPriorityColor(event.priority)}`}>
      {/* AI Enrichment Badge */}
      {isAIEnriched && (
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <Sparkles className="h-3 w-3 text-purple-600" />
          <span className="text-xs text-purple-600 font-medium">AI Enhanced</span>
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-sm pr-20">{event.title}</h3>
          {event.description && (
            <p className="text-xs text-gray-600 mt-1">{event.description}</p>
          )}
          
          <div className="flex items-center space-x-3 mt-2 text-xs">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>
                {format(new Date(event.start_time || event.start), 'HH:mm')} - 
                {format(new Date(event.end_time || event.end), 'HH:mm')}
              </span>
            </div>
            
            {/* Transportation Event Display */}
            {isTransportationEvent(event) ? (
              <TransportationEventDisplay event={event} onOpenInMaps={handleOpenInMaps} />
            ) : (
              event.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{event.location}</span>
                </div>
              )
            )}
            
            {event.assignedTo && event.assignedTo.length > 0 && (
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{event.assignedTo.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Preparation Time & Departure Time */}
          {isAIEnriched && (event.preparation_time || event.departure_time) && (
            <div className="flex items-center space-x-3 mt-2 text-xs">
              {event.preparation_time && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <Timer className="h-3 w-3" />
                  <span>Prep: {event.preparation_time} min</span>
                </div>
              )}
              {event.departure_time && (
                <div className="flex items-center space-x-1 text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  <span>Leave: {format(new Date(event.departure_time), 'HH:mm')}</span>
                </div>
              )}
            </div>
          )}

          {/* Resources Needed */}
          {isAIEnriched && resourcesNeeded.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {resourcesNeeded.map((resource, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                    {resource.type}: {resource.items.join(', ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Weather Considerations */}
          {isAIEnriched && weatherConsiderations && weatherConsiderations.check_weather && (
            <div className="mt-2 p-2 bg-sky-50 rounded text-xs">
              <div className="flex items-center space-x-1 text-sky-700">
                <AlertCircle className="h-3 w-3" />
                <span>Weather dependent event</span>
              </div>
              {weatherConsiderations.suggested_items && weatherConsiderations.suggested_items.length > 0 && (
                <div className="mt-1 text-sky-600">
                  Consider: {weatherConsiderations.suggested_items.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* AI Suggestions Toggle */}
          {isAIEnriched && aiSuggestions.preparationList.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowAISuggestions(!showAISuggestions)}
                className="flex items-center space-x-1 text-xs text-purple-600 hover:text-purple-800"
              >
                <CheckSquare className="h-3 w-3" />
                <span>AI Suggestions ({aiSuggestions.preparationList.length})</span>
                {showAISuggestions ? 
                  <ChevronUp className="h-3 w-3" /> : 
                  <ChevronDown className="h-3 w-3" />
                }
              </button>
              
              {showAISuggestions && (
                <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                  <ul className="space-y-1">
                    {aiSuggestions.preparationList.map((item, index) => (
                      <li key={index} className="flex items-center space-x-1">
                        <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {aiSuggestions.suggestions.optimization && aiSuggestions.suggestions.optimization.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-purple-200">
                      <div className="font-medium text-purple-800 mb-1">Optimization Tips:</div>
                      <ul className="space-y-1">
                        {aiSuggestions.suggestions.optimization.map((tip, index) => (
                          <li key={index} className="flex items-center space-x-1 text-purple-700">
                            <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Enrich with AI Button */}
          {needsEnrichment && (
            <div className="mt-2">
              <button
                onClick={handleEnrichWithAI}
                disabled={isEnriching}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                  enrichmentPriority === 'high' 
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Brain className={`h-3 w-3 ${isEnriching ? 'animate-pulse' : ''}`} />
                <span>{isEnriching ? 'Enriching...' : 'Enrich with AI'}</span>
                {enrichmentPriority === 'high' && <AlertCircle className="h-3 w-3" />}
              </button>
              
              {enrichmentError && (
                <div className="mt-1 text-xs text-red-600">
                  {enrichmentError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Transportation Event Display Component for Calendar
const TransportationEventDisplay = ({ event, onOpenInMaps }) => {
  const transportationMode = event.transportation_mode || event.transportation_data?.mode || 'driving';
  const modeConfig = transportationModeConfig[transportationMode] || transportationModeConfig.driving;
  const ModeIcon = modeConfig.icon;
  const routeInfo = event.transportation_data?.route_info;
  const routeDetails = {
    starting_address: event.transportation_data?.starting_address || event.starting_address,
    destination_address: event.transportation_data?.destination_address || event.destination_address || event.location,
    stops: event.transportation_data?.stops || event.stops || []
  };
  
  return (
    <div className="flex items-center space-x-2 min-w-0">
      <ModeIcon className={`h-3 w-3 ${modeConfig.color} flex-shrink-0`} />
      <div className="flex items-center space-x-1 flex-1 min-w-0">
        <div className="w-1 h-1 bg-green-500 rounded-full flex-shrink-0"></div>
        <span className="text-xs text-gray-600 truncate">
          {routeDetails.starting_address || 'Current'}
        </span>
        <ArrowRight className="h-2 w-2 text-gray-400 flex-shrink-0" />
        <div className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0"></div>
        <span className="text-xs text-gray-600 truncate">
          {routeDetails.destination_address || event.location || 'Destination'}
        </span>
      </div>
      {routeInfo?.duration && (
        <span className="text-xs text-gray-500 flex-shrink-0">{routeInfo.duration}</span>
      )}
      <button
        onClick={() => onOpenInMaps(event)}
        className={`${modeConfig.color} hover:opacity-80 flex-shrink-0`}
        title="Open in Maps"
      >
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
};

export default EventCard;