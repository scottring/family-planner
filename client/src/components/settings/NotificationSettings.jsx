import { useState, useEffect } from 'react';
import useNotificationStore from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../common/LoadingSpinner';

const NotificationSettings = () => {
  const { user } = useAuthStore();
  const {
    preferences,
    loading,
    error,
    fetchPreferences,
    updatePreferences,
    sendTestNotification,
    clearError
  } = useNotificationStore();

  const [localPreferences, setLocalPreferences] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user?.id) {
      fetchPreferences();
    }
  }, [user?.id]);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences({ ...preferences });
    }
  }, [preferences]);

  useEffect(() => {
    if (error) {
      setMessage({ text: error, type: 'error' });
      setTimeout(() => {
        clearError();
        setMessage({ text: '', type: '' });
      }, 5000);
    }
  }, [error]);

  const handleChannelChange = (channel, enabled) => {
    setLocalPreferences(prev => ({
      ...prev,
      channel_settings: {
        ...prev.channel_settings,
        [channel]: enabled
      }
    }));
  };

  const handleTimeChange = (field, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      time_preferences: {
        ...prev.time_preferences,
        [field]: value
      }
    }));
  };

  const handleNotificationTypeChange = (type, enabled) => {
    setLocalPreferences(prev => ({
      ...prev,
      notification_types: {
        ...prev.notification_types,
        [type]: enabled
      }
    }));
  };

  const handleQuietHoursChange = (field, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [field]: value
      }
    }));
  };

  const handleIntensityChange = (intensity) => {
    const thresholds = {
      minimal: { minimal: 3, normal: 3, maximum: 3 },
      normal: { minimal: 1, normal: 2, maximum: 3 },
      maximum: { minimal: 1, normal: 1, maximum: 1 }
    };

    setLocalPreferences(prev => ({
      ...prev,
      priority_thresholds: thresholds[intensity]
    }));
  };

  const getCurrentIntensity = () => {
    if (!localPreferences?.priority_thresholds) return 'normal';
    
    const { minimal, normal, maximum } = localPreferences.priority_thresholds;
    
    if (minimal === 3 && normal === 3 && maximum === 3) return 'minimal';
    if (minimal === 1 && normal === 1 && maximum === 1) return 'maximum';
    return 'normal';
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updatePreferences(localPreferences);
      setMessage({ text: 'Notification settings saved successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Failed to save settings. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      setMessage({ text: 'Test notification sent!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Failed to send test notification.', type: 'error' });
    }
  };

  const hasChanges = () => {
    return JSON.stringify(preferences) !== JSON.stringify(localPreferences);
  };

  if (loading && !localPreferences) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!localPreferences) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          Unable to load notification settings.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
        <button
          onClick={handleTestNotification}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Test Notification
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Channel Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Notification Channels</h4>
          <div className="space-y-3">
            {Object.entries(localPreferences.channel_settings).map(([channel, enabled]) => (
              <div key={channel} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-sm">
                    {channel === 'push' && '🔔 Push Notifications'}
                    {channel === 'sms' && '📱 SMS (Coming Soon)'}
                    {channel === 'email' && '📧 Email (Coming Soon)'}
                    {channel === 'telegram' && '✈️ Telegram'}
                  </div>
                  {channel === 'sms' || channel === 'email' ? (
                    <span className="ml-2 text-xs text-gray-400">(Not available yet)</span>
                  ) : null}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleChannelChange(channel, e.target.checked)}
                    disabled={channel === 'sms' || channel === 'email'}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${(channel === 'sms' || channel === 'email') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Time Preferences */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Daily Schedule</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Morning Brief Time
              </label>
              <input
                type="time"
                value={localPreferences.time_preferences.morning_brief_time}
                onChange={(e) => handleTimeChange('morning_brief_time', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Evening Prep Time
              </label>
              <input
                type="time"
                value={localPreferences.time_preferences.evening_prep_time}
                onChange={(e) => handleTimeChange('evening_prep_time', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Notification Intensity */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Notification Intensity</h4>
          <div className="space-y-2">
            {['minimal', 'normal', 'maximum'].map((intensity) => (
              <label key={intensity} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="intensity"
                  value={intensity}
                  checked={getCurrentIntensity() === intensity}
                  onChange={() => handleIntensityChange(intensity)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-700 capitalize">{intensity}</div>
                  <div className="text-xs text-gray-500">
                    {intensity === 'minimal' && 'Only urgent notifications'}
                    {intensity === 'normal' && 'Important and urgent notifications'}
                    {intensity === 'maximum' && 'All notifications'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Quiet Hours</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable Quiet Hours</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPreferences.quiet_hours.enabled}
                  onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {localPreferences.quiet_hours.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={localPreferences.quiet_hours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={localPreferences.quiet_hours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              During quiet hours, only urgent notifications will be sent.
            </p>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Notification Types</h4>
          <div className="space-y-3">
            {Object.entries(localPreferences.notification_types).map(([type, enabled]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {type === 'event_reminders' && '📅 Event Reminders'}
                  {type === 'task_due' && '✅ Task Due Dates'}
                  {type === 'daily_brief' && '🌅 Daily Morning Brief'}
                  {type === 'evening_prep' && '🌙 Evening Preparation'}
                  {type === 'responsibility_alerts' && '⚠️ Responsibility Alerts'}
                  {type === 'handoff_notifications' && '🔄 Event Handoffs'}
                  {type === 'urgent_alerts' && '🚨 Urgent Alerts'}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleNotificationTypeChange(type, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={!hasChanges() || saving}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              hasChanges() && !saving
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;