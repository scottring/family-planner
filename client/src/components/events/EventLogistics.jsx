import { useState, useEffect, useMemo } from 'react';
import { 
  Backpack, 
  MapPin, 
  Phone, 
  CloudRain, 
  Sun,
  Utensils,
  Plus,
  X,
  ExternalLink,
  Navigation,
  PhoneCall,
  Edit,
  Save,
  Clock,
  Thermometer
} from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';

const EventLogistics = ({ event, onUpdate }) => {
  const { updateEventLogistics, fetchTemplates, templates, applyTemplate } = useEventStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logistics, setLogistics] = useState({
    packing_list: event.packing_list || [],
    parking_info: event.parking_info || '',
    contacts: event.contacts || [],
    weather_dependent: event.weather_dependent || false,
    meal_requirements: event.meal_requirements || {}
  });

  // Smart packing suggestions based on activity type
  const smartPackingSuggestions = useMemo(() => {
    const activityType = event.event_type || event.category || 'general';
    
    const suggestions = {
      soccer: ['Soccer cleats', 'Shin guards', 'Water bottle', 'Towel', 'Change of clothes', 'Snacks'],
      swimming: ['Swimsuit', 'Towel', 'Goggles', 'Swim cap', 'Flip flops', 'Sunscreen'],
      school: ['Backpack', 'Lunch', 'Water bottle', 'School supplies', 'Permission slips'],
      medical: ['Insurance card', 'ID', 'Medication list', 'Emergency contacts', 'Medical records'],
      travel: ['Passport/ID', 'Tickets', 'Phone charger', 'Snacks', 'Entertainment', 'Maps'],
      outdoor: ['Sunscreen', 'Hat', 'Water bottle', 'First aid kit', 'Bug spray', 'Weather gear'],
      party: ['Gift', 'Card', 'Camera', 'Contact info', 'Emergency cash']
    };

    return suggestions[activityType] || suggestions.general || [];
  }, [event.event_type, event.category]);

  // Weather-appropriate suggestions
  const weatherSuggestions = useMemo(() => {
    if (!logistics.weather_dependent) return [];
    
    // Mock weather data - in real app, this would come from weather API
    const mockWeather = { temp: 72, condition: 'partly_cloudy', precipitation: 20 };
    
    const suggestions = [];
    if (mockWeather.temp < 60) suggestions.push('Jacket', 'Warm clothes', 'Gloves');
    if (mockWeather.temp > 80) suggestions.push('Sunscreen', 'Hat', 'Extra water');
    if (mockWeather.precipitation > 30) suggestions.push('Umbrella', 'Rain jacket', 'Waterproof bag');
    
    return suggestions;
  }, [logistics.weather_dependent]);

  // Season-aware suggestions
  const seasonSuggestions = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    
    if (month >= 2 && month <= 4) { // Spring
      return ['Light jacket', 'Allergy medication', 'Layers'];
    } else if (month >= 5 && month <= 7) { // Summer
      return ['Sunscreen', 'Hat', 'Shorts', 'Sandals'];
    } else if (month >= 8 && month <= 10) { // Fall
      return ['Jacket', 'Long sleeves', 'Closed shoes'];
    } else { // Winter
      return ['Heavy coat', 'Gloves', 'Warm hat', 'Boots'];
    }
  }, []);

  const allSuggestions = [...smartPackingSuggestions, ...weatherSuggestions, ...seasonSuggestions]
    .filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates

  useEffect(() => {
    // Fetch templates for this activity type
    if (event.event_type || event.category) {
      fetchTemplates(event.event_type || event.category);
    }
  }, [event.event_type, event.category, fetchTemplates]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateEventLogistics(event.id, logistics);
      setIsEditing(false);
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Failed to update logistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPackingItem = (item) => {
    if (!logistics.packing_list.includes(item)) {
      setLogistics(prev => ({
        ...prev,
        packing_list: [...prev.packing_list, item]
      }));
    }
  };

  const removePackingItem = (index) => {
    setLogistics(prev => ({
      ...prev,
      packing_list: prev.packing_list.filter((_, i) => i !== index)
    }));
  };

  const addContact = () => {
    setLogistics(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', phone: '', role: '' }]
    }));
  };

  const updateContact = (index, field, value) => {
    setLogistics(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const removeContact = (index) => {
    setLogistics(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const generateDirectionsUrl = () => {
    if (!event.location) return null;
    const encodedAddress = encodeURIComponent(event.location);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  };

  const generateCallUrl = (phone) => {
    return `tel:${phone.replace(/\D/g, '')}`;
  };

  if (!isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Backpack className="h-5 w-5 text-blue-500" />
            Event Logistics
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Packing List */}
          {logistics.packing_list.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Backpack className="h-4 w-4 text-green-500" />
                Packing List
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {logistics.packing_list.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location & Directions */}
          {(event.location || logistics.parking_info) && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" />
                Location & Directions
              </h4>
              <div className="space-y-2">
                {event.location && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-sm text-gray-700">{event.location}</span>
                    {generateDirectionsUrl() && (
                      <a
                        href={generateDirectionsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <Navigation className="h-3 w-3" />
                        Directions
                      </a>
                    )}
                  </div>
                )}
                {logistics.parking_info && (
                  <div className="p-3 bg-yellow-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <strong>Parking:</strong> {logistics.parking_info}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contacts */}
          {logistics.contacts.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-500" />
                Important Contacts
              </h4>
              <div className="space-y-2">
                {logistics.contacts.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                      <p className="text-xs text-gray-500">{contact.role}</p>
                    </div>
                    <a
                      href={generateCallUrl(contact.phone)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      <PhoneCall className="h-3 w-3" />
                      {contact.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weather Considerations */}
          {logistics.weather_dependent && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-blue-500" />
                Weather Considerations
              </h4>
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800 mb-2">This event is weather-dependent.</p>
                {weatherSuggestions.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-600 mb-1">Suggested items based on forecast:</p>
                    <div className="flex flex-wrap gap-1">
                      {weatherSuggestions.map((item, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meal Requirements */}
          {Object.keys(logistics.meal_requirements).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4 text-orange-500" />
                Meal Requirements
              </h4>
              <div className="p-3 bg-orange-50 rounded-md">
                {logistics.meal_requirements.bring_snacks && (
                  <p className="text-sm text-orange-800 mb-1">• Bring snacks</p>
                )}
                {logistics.meal_requirements.bring_lunch && (
                  <p className="text-sm text-orange-800 mb-1">• Bring lunch</p>
                )}
                {logistics.meal_requirements.dietary_restrictions && (
                  <p className="text-sm text-orange-800 mb-1">
                    • Dietary restrictions: {logistics.meal_requirements.dietary_restrictions}
                  </p>
                )}
                {logistics.meal_requirements.notes && (
                  <p className="text-sm text-orange-700">
                    Note: {logistics.meal_requirements.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Backpack className="h-5 w-5 text-blue-500" />
          Event Logistics
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Smart Suggestions */}
        {allSuggestions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Smart Suggestions</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {allSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => addPackingItem(suggestion)}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Packing List Editor */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Backpack className="h-4 w-4 text-green-500" />
            Packing List
          </h4>
          <div className="space-y-2 mb-3">
            {logistics.packing_list.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <span className="flex-1 text-sm text-gray-700">{item}</span>
                <button
                  onClick={() => removePackingItem(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add packing item..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  addPackingItem(e.target.value.trim());
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousElementSibling;
                if (input.value.trim()) {
                  addPackingItem(input.value.trim());
                  input.value = '';
                }
              }}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Parking Info */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-500" />
            Parking Information
          </h4>
          <textarea
            value={logistics.parking_info}
            onChange={(e) => setLogistics(prev => ({ ...prev, parking_info: e.target.value }))}
            placeholder="Add parking details, instructions, or tips..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>

        {/* Contacts */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4 text-purple-500" />
            Important Contacts
          </h4>
          <div className="space-y-3">
            {logistics.contacts.map((contact, index) => (
              <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-md">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    placeholder="Contact name"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    placeholder="Phone number"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={contact.role}
                    onChange={(e) => updateContact(index, 'role', e.target.value)}
                    placeholder="Role (e.g., Coach, Teacher, etc.)"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => removeContact(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addContact}
              className="w-full px-3 py-2 text-sm border-2 border-dashed border-gray-300 text-gray-500 rounded-md hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Weather Dependent */}
        <div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="weather-dependent"
              checked={logistics.weather_dependent}
              onChange={(e) => setLogistics(prev => ({ ...prev, weather_dependent: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="weather-dependent" className="font-medium text-gray-900 flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-blue-500" />
              Weather-dependent event
            </label>
          </div>
          {logistics.weather_dependent && (
            <p className="mt-2 text-sm text-gray-600">
              We'll provide weather-appropriate suggestions and alerts for this event.
            </p>
          )}
        </div>

        {/* Meal Requirements */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4 text-orange-500" />
            Meal Requirements
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bring-snacks"
                checked={logistics.meal_requirements.bring_snacks || false}
                onChange={(e) => setLogistics(prev => ({
                  ...prev,
                  meal_requirements: { ...prev.meal_requirements, bring_snacks: e.target.checked }
                }))}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="bring-snacks" className="text-sm text-gray-700">Bring snacks</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bring-lunch"
                checked={logistics.meal_requirements.bring_lunch || false}
                onChange={(e) => setLogistics(prev => ({
                  ...prev,
                  meal_requirements: { ...prev.meal_requirements, bring_lunch: e.target.checked }
                }))}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="bring-lunch" className="text-sm text-gray-700">Bring lunch</label>
            </div>
            <input
              type="text"
              value={logistics.meal_requirements.dietary_restrictions || ''}
              onChange={(e) => setLogistics(prev => ({
                ...prev,
                meal_requirements: { ...prev.meal_requirements, dietary_restrictions: e.target.value }
              }))}
              placeholder="Dietary restrictions or allergies"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <textarea
              value={logistics.meal_requirements.notes || ''}
              onChange={(e) => setLogistics(prev => ({
                ...prev,
                meal_requirements: { ...prev.meal_requirements, notes: e.target.value }
              }))}
              placeholder="Additional meal notes..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventLogistics;