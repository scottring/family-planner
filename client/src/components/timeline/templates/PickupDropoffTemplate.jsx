import { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Phone, 
  Clock, 
  FileText, 
  CheckCircle, 
  Bell,
  Navigation,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useTaskStore } from '../../../stores/taskStore';

const PickupDropoffTemplate = ({ task, onUpdate, className = "" }) => {
  const [pickupData, setPickupData] = useState({
    personName: '',
    pickupLocation: '',
    dropoffLocation: '',
    contactName: '',
    contactPhone: '',
    specialInstructions: '',
    estimatedTime: '15-30 mins',
    confirmed: false,
    reminderSent: false,
    notes: '',
    ...task.templateData
  });
  
  const { updateTask } = useTaskStore();

  // Estimate travel time based on locations
  useEffect(() => {
    if (pickupData.pickupLocation && pickupData.dropoffLocation) {
      // Mock time estimation - would integrate with maps API
      const distance = Math.abs(pickupData.pickupLocation.length - pickupData.dropoffLocation.length) * 2;
      let time = '';
      if (distance < 10) {
        time = '15-30 mins';
      } else if (distance < 20) {
        time = '30-45 mins';
      } else {
        time = '45+ mins';
      }
      
      if (time !== pickupData.estimatedTime) {
        setPickupData(prev => ({
          ...prev,
          estimatedTime: time
        }));
      }
    }
  }, [pickupData.pickupLocation, pickupData.dropoffLocation]);

  // Save data when it changes
  useEffect(() => {
    const saveData = async () => {
      if (task.id) {
        try {
          await updateTask(task.id, {
            ...task,
            templateType: 'pickup',
            templateData: pickupData
          });
          if (onUpdate) {
            onUpdate({ ...task, templateData: pickupData });
          }
        } catch (error) {
          console.error('Error updating pickup/dropoff task:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveData, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [pickupData, task.id, updateTask, onUpdate]);

  const handleInputChange = (field, value) => {
    setPickupData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleConfirmation = () => {
    setPickupData(prev => ({
      ...prev,
      confirmed: !prev.confirmed
    }));
  };

  const sendReminder = () => {
    // Mock reminder functionality
    if (pickupData.contactPhone) {
      setPickupData(prev => ({
        ...prev,
        reminderSent: true
      }));
      
      // Show temporary success message
      alert(`Reminder sent to ${pickupData.contactName || 'contact'} at ${pickupData.contactPhone}`);
      
      // Reset after some time (for demo purposes)
      setTimeout(() => {
        setPickupData(prev => ({
          ...prev,
          reminderSent: false
        }));
      }, 5000);
    } else {
      alert('Please enter a contact phone number first.');
    }
  };

  const callContact = () => {
    if (pickupData.contactPhone) {
      window.location.href = `tel:${pickupData.contactPhone}`;
    }
  };

  const openNavigation = (location) => {
    if (location) {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
      window.open(url, '_blank');
    }
  };

  const formatPhoneNumber = (phone) => {
    // Simple phone formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const isComplete = pickupData.personName && 
                   pickupData.pickupLocation && 
                   pickupData.dropoffLocation;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-xl">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Pickup & Dropoff</h3>
          <p className="text-sm text-gray-500">Schedule transportation for family member</p>
        </div>
        {pickupData.estimatedTime && (
          <div className="flex items-center space-x-1 text-sm text-gray-600 bg-gray-100 rounded-lg px-3 py-1">
            <Clock className="h-4 w-4" />
            <span>{pickupData.estimatedTime}</span>
          </div>
        )}
      </div>

      {/* Person Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="h-4 w-4 inline mr-1" />
          Person/Child Name *
        </label>
        <input
          type="text"
          value={pickupData.personName}
          onChange={(e) => handleInputChange('personName', e.target.value)}
          placeholder="Enter person's name..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="h-4 w-4 inline mr-1" />
            Pickup Location *
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={pickupData.pickupLocation}
              onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
              placeholder="Enter pickup address..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {pickupData.pickupLocation && (
              <button
                onClick={() => openNavigation(pickupData.pickupLocation)}
                className="px-3 py-3 text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 transition-colors"
                title="Open in maps"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Navigation className="h-4 w-4 inline mr-1" />
            Dropoff Location *
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={pickupData.dropoffLocation}
              onChange={(e) => handleInputChange('dropoffLocation', e.target.value)}
              placeholder="Enter dropoff address..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {pickupData.dropoffLocation && (
              <button
                onClick={() => openNavigation(pickupData.dropoffLocation)}
                className="px-3 py-3 text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 transition-colors"
                title="Open in maps"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Person
          </label>
          <input
            type="text"
            value={pickupData.contactName}
            onChange={(e) => handleInputChange('contactName', e.target.value)}
            placeholder="Contact name (optional)..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="h-4 w-4 inline mr-1" />
            Contact Phone
          </label>
          <div className="flex space-x-2">
            <input
              type="tel"
              value={pickupData.contactPhone}
              onChange={(e) => handleInputChange('contactPhone', e.target.value)}
              placeholder="Phone number..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {pickupData.contactPhone && (
              <button
                onClick={callContact}
                className="px-3 py-3 text-green-600 border border-green-300 rounded-xl hover:bg-green-50 transition-colors"
                title="Call contact"
              >
                <Phone className="h-4 w-4" />
              </button>
            )}
          </div>
          {pickupData.contactPhone && (
            <p className="text-xs text-gray-500 mt-1">
              Formatted: {formatPhoneNumber(pickupData.contactPhone)}
            </p>
          )}
        </div>
      </div>

      {/* Special Instructions */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="h-4 w-4 inline mr-1" />
          Special Instructions
        </label>
        <textarea
          value={pickupData.specialInstructions}
          onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
          placeholder="Any special instructions, notes, or requirements..."
          rows="3"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Confirmation Checkbox */}
      <div className="mb-4">
        <label className="flex items-start space-x-3 cursor-pointer">
          <div className="flex items-center h-6">
            <button
              onClick={toggleConfirmation}
              className={`flex items-center justify-center w-5 h-5 border-2 rounded transition-all ${
                pickupData.confirmed 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {pickupData.confirmed && <CheckCircle className="h-3 w-3" />}
            </button>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              Pickup/Dropoff Confirmed
            </div>
            <div className="text-xs text-gray-500">
              Check when arrangements have been confirmed with all parties
            </div>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {pickupData.contactPhone && (
          <button
            onClick={sendReminder}
            disabled={pickupData.reminderSent}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              pickupData.reminderSent
                ? 'text-gray-500 bg-gray-100 cursor-not-allowed'
                : 'text-orange-700 bg-orange-100 hover:bg-orange-200'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>{pickupData.reminderSent ? 'Reminder Sent' : 'Send Reminder'}</span>
          </button>
        )}

        {pickupData.contactPhone && (
          <button
            onClick={callContact}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>Call Contact</span>
          </button>
        )}
      </div>

      {/* Status Indicator */}
      {!isComplete && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-yellow-800">
              Missing Required Information
            </div>
            <div className="text-xs text-yellow-700 mt-1">
              Please fill in person name, pickup location, and dropoff location to complete setup.
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {isComplete && (
        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <div className="text-sm font-medium text-blue-900 mb-1">Trip Summary</div>
          <div className="text-sm text-blue-700">
            <div><strong>{pickupData.personName}</strong></div>
            <div className="text-xs text-blue-600 mt-1">
              {pickupData.pickupLocation} → {pickupData.dropoffLocation}
            </div>
            {pickupData.estimatedTime && (
              <div className="text-xs text-blue-600">
                Estimated time: {pickupData.estimatedTime}
              </div>
            )}
            {pickupData.contactName && pickupData.contactPhone && (
              <div className="text-xs text-blue-600">
                Contact: {pickupData.contactName} • {formatPhoneNumber(pickupData.contactPhone)}
              </div>
            )}
            <div className="mt-2 flex items-center space-x-4 text-xs">
              <span className={`inline-flex items-center space-x-1 ${
                pickupData.confirmed ? 'text-green-600' : 'text-gray-500'
              }`}>
                <CheckCircle className="h-3 w-3" />
                <span>{pickupData.confirmed ? 'Confirmed' : 'Not confirmed'}</span>
              </span>
              {pickupData.reminderSent && (
                <span className="inline-flex items-center space-x-1 text-orange-600">
                  <Bell className="h-3 w-3" />
                  <span>Reminder sent</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupDropoffTemplate;