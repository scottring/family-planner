import { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Upload, 
  Calendar, 
  Check, 
  X,
  FileText,
  ShoppingCart,
  Clock,
  AlertCircle,
  Cloud
} from 'lucide-react';
import api from '../../services/api';
import { MealPlanParser } from '../../utils/mealPlanParser';
import { useEventStore } from '../../stores/eventStore';
import { format } from 'date-fns';

const MealPlanImporter = ({ onClose, startDate = new Date() }) => {
  const [mealPlanText, setMealPlanText] = useState('');
  const [parsedPlan, setParsedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState(new Set());
  const [exportToGoogle, setExportToGoogle] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [createdEventIds, setCreatedEventIds] = useState([]);
  
  const { createEvent } = useEventStore();

  useEffect(() => {
    // Check Google Calendar connection status
    checkGoogleCalendarStatus();
  }, []);

  const checkGoogleCalendarStatus = async () => {
    try {
      const response = await api.get('/google-calendar/status');
      setGoogleCalendarConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking Google Calendar status:', error);
    }
  };

  const handleParse = () => {
    try {
      setError(null);
      const parser = new MealPlanParser(startDate);
      const result = parser.parseMealPlan(mealPlanText);
      
      // Add shopping and prep events
      if (result.shoppingList.length > 0) {
        result.events.unshift(parser.createShoppingEvent());
      }
      if (result.prepTasks.length > 0) {
        result.events.push(parser.createMealPrepEvent());
      }
      
      setParsedPlan(result);
      // Select all events by default
      setSelectedEvents(new Set(result.events.map((_, index) => index)));
    } catch (err) {
      setError('Failed to parse meal plan. Please check the format.');
      console.error('Parse error:', err);
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setCreatedEventIds([]);
    
    try {
      const eventsToImport = parsedPlan.events.filter((_, index) => 
        selectedEvents.has(index)
      );
      
      const eventIds = [];
      let skippedCount = 0;
      
      for (const event of eventsToImport) {
        const createdEvent = await createEvent(event);
        if (createdEvent && createdEvent.id) {
          // Check if this was actually a new event or a duplicate was returned
          if (!eventIds.includes(createdEvent.id)) {
            eventIds.push(createdEvent.id);
          } else {
            skippedCount++;
          }
        }
      }
      
      if (skippedCount > 0) {
        console.log(`Skipped ${skippedCount} duplicate events`);
      }
      
      setCreatedEventIds(eventIds);
      
      // If export to Google Calendar is enabled
      if (exportToGoogle && googleCalendarConnected && eventIds.length > 0) {
        try {
          const response = await api.post('/google-calendar/export-batch', {
            eventIds: eventIds,
            calendarId: 'primary' // Or use the shared family calendar ID
          });
          
          if (response.data.success) {
            console.log(`Exported ${response.data.summary.exported} events to Google Calendar`);
          }
        } catch (googleError) {
          console.error('Failed to export to Google Calendar:', googleError);
          // Don't fail the whole import if Google export fails
        }
      }
      
      onClose();
    } catch (err) {
      setError('Failed to import events. Please try again.');
      console.error('Import error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleEventSelection = (index) => {
    const newSelection = new Set(selectedEvents);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedEvents(newSelection);
  };

  const selectAll = () => {
    setSelectedEvents(new Set(parsedPlan.events.map((_, index) => index)));
  };

  const deselectAll = () => {
    setSelectedEvents(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Import Meal Plan</h2>
                <p className="text-orange-100">Paste your meal plan from Claude or JJ</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!parsedPlan ? (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">How to use:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Copy your meal plan from Claude Desktop or JJ</li>
                      <li>Paste it in the text area below</li>
                      <li>Click "Parse Meal Plan" to preview events</li>
                      <li>Select which events to add to your calendar</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Paste Meal Plan
                </label>
                <textarea
                  value={mealPlanText}
                  onChange={(e) => setMealPlanText(e.target.value)}
                  placeholder="Paste your meal plan here..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* Example Format */}
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-gray-700">
                  View Example Format
                </summary>
                <pre className="mt-3 text-xs text-gray-600 overflow-x-auto">
{`### SUNDAY (Sept 7)
**Turkey Meatball Pasta**
- One-pot pasta dish
- Steamed broccoli

### MONDAY (Sept 8)
**Leftover Turkey Pasta**
- Quick reheat dinner`}
                </pre>
              </details>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={!mealPlanText.trim()}
                className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Parse Meal Plan
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Parsed Events Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Found {parsedPlan.events.length} Events
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {parsedPlan.events.map((event, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedEvents.has(index)
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 bg-white'
                      }`}
                      onClick={() => toggleEventSelection(index)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedEvents.has(index)}
                              onChange={() => toggleEventSelection(index)}
                              className="h-5 w-5 text-orange-600 rounded focus:ring-orange-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {event.title}
                              </h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(new Date(event.start_time), 'MMM d')}
                                </span>
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(event.start_time), 'h:mm a')}
                                </span>
                                {event.category === 'shopping' && (
                                  <span className="flex items-center text-green-600">
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    Shopping
                                  </span>
                                )}
                                {event.category === 'meal' && (
                                  <span className="flex items-center text-orange-600">
                                    <ChefHat className="h-3 w-3 mr-1" />
                                    {event.meal_type}
                                  </span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shopping List Summary */}
              {parsedPlan.shoppingList.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2 flex items-center">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Shopping List ({parsedPlan.shoppingList.length} items)
                  </h3>
                  <div className="text-sm text-green-800 grid grid-cols-2 gap-2">
                    {parsedPlan.shoppingList.slice(0, 6).map((item, index) => (
                      <div key={index}>• {item.item}</div>
                    ))}
                    {parsedPlan.shoppingList.length > 6 && (
                      <div className="col-span-2 text-green-600">
                        ...and {parsedPlan.shoppingList.length - 6} more items
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Google Calendar Option */}
              {googleCalendarConnected && (
                <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Cloud className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Export to Google Calendar</p>
                      <p className="text-sm text-gray-600">
                        Also add these events to your shared Google Calendar
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportToGoogle}
                      onChange={(e) => setExportToGoogle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => {
                    setParsedPlan(null);
                    setSelectedEvents(new Set());
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Back to Edit
                </button>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {selectedEvents.size} events selected
                  </span>
                  <button
                    onClick={handleImport}
                    disabled={selectedEvents.size === 0 || isProcessing}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Import{exportToGoogle ? ' & Export' : ''}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealPlanImporter;