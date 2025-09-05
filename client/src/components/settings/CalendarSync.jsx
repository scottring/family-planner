import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Settings, CheckCircle, AlertCircle, Loader, Link, Unlink } from 'lucide-react';
import calendarSyncService from '../../services/calendarSync';

const CalendarSync = () => {
  const [syncStatus, setSyncStatus] = useState({
    isConfigured: false,
    isAuthenticated: false,
    syncEnabled: false,
    lastSyncTime: null,
    mockMode: false
  });
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendars, setSelectedCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadSyncStatus();
    checkAuthCallback();
  }, []);

  const checkAuthCallback = () => {
    const authResult = calendarSyncService.checkAuthCallback();
    if (authResult) {
      if (authResult.success) {
        setSuccess(authResult.mockMode ? 
          'Google Calendar connected successfully (Mock Mode)' : 
          'Google Calendar connected successfully!'
        );
        loadSyncStatus();
      } else if (authResult.error) {
        setError('Failed to connect Google Calendar. Please try again.');
      }
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await calendarSyncService.getSyncStatus();
      setSyncStatus(status);
      
      if (status.isAuthenticated) {
        await loadCalendars();
      }
    } catch (err) {
      // Don't show error on initial load - might just be not configured
      console.log('Calendar sync status check failed:', err);
      setSyncStatus({
        isConfigured: true, // Assume configured since we have credentials
        isAuthenticated: false,
        syncEnabled: false,
        lastSyncTime: null,
        mockMode: false
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCalendars = async () => {
    try {
      const calendarList = await calendarSyncService.getCalendars();
      setCalendars(calendarList);
      
      // Set initially selected calendars (primary by default)
      const primaryCalendars = calendarList.filter(cal => cal.primary).map(cal => cal.id);
      setSelectedCalendars(primaryCalendars);
    } catch (err) {
      console.error('Failed to load calendars:', err);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await calendarSyncService.startOAuthFlow();
      if (result.mockMode) {
        setSuccess('Google Calendar connected successfully (Mock Mode)');
        await loadSyncStatus();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await calendarSyncService.disconnect();
      setSuccess('Google Calendar disconnected successfully');
      setSyncStatus(prev => ({
        ...prev,
        isAuthenticated: false,
        syncEnabled: false
      }));
      setCalendars([]);
      setSelectedCalendars([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await calendarSyncService.syncCalendar();
      setSuccess(`Sync completed: ${result.results.imported} imported, ${result.results.updated} updated`);
      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: new Date().toISOString()
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleSync = async (enabled) => {
    try {
      await calendarSyncService.updateSyncSettings({
        syncEnabled: enabled,
        selectedCalendars
      });
      setSyncStatus(prev => ({
        ...prev,
        syncEnabled: enabled
      }));
      setSuccess(`Sync ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCalendarToggle = async (calendarId) => {
    const newSelection = selectedCalendars.includes(calendarId)
      ? selectedCalendars.filter(id => id !== calendarId)
      : [...selectedCalendars, calendarId];
    
    setSelectedCalendars(newSelection);
    
    if (syncStatus.syncEnabled) {
      try {
        await calendarSyncService.updateSyncSettings({
          syncEnabled: true,
          selectedCalendars: newSelection
        });
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const formatLastSync = (lastSyncTime) => {
    if (!lastSyncTime) return 'Never';
    const date = new Date(lastSyncTime);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading calendar sync status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <Calendar className="w-6 h-6 text-blue-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Calendar Sync</h3>
            <p className="text-sm text-gray-600">
              {syncStatus.mockMode && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                  Mock Mode
                </span>
              )}
              Sync your family events with Google Calendar
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {!syncStatus.isConfigured && !syncStatus.mockMode && (
          <div className="text-center py-8">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Google Calendar Not Configured</h4>
            <p className="text-gray-600 mb-4">
              Google Calendar integration is not configured on this server.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator to set up Google Calendar credentials.
            </p>
          </div>
        )}

        {(syncStatus.isConfigured || syncStatus.mockMode) && !syncStatus.isAuthenticated && (
          <div className="text-center py-8">
            <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Google Calendar</h4>
            <p className="text-gray-600 mb-4">
              Connect your Google account to sync calendar events with your family planner.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </button>
          </div>
        )}

        {syncStatus.isAuthenticated && (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Connected to Google Calendar
                    {syncStatus.mockMode && ' (Mock Mode)'}
                  </p>
                  <p className="text-sm text-green-600">
                    Last sync: {formatLastSync(syncStatus.lastSyncTime)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
              >
                <Unlink className="w-3 h-3 mr-1" />
                Disconnect
              </button>
            </div>

            {/* Sync Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Enable Automatic Sync</label>
                <p className="text-sm text-gray-600">
                  Automatically sync events every 15 minutes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncStatus.syncEnabled}
                  onChange={(e) => handleToggleSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Manual Sync Button */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Manual Sync</p>
                <p className="text-sm text-gray-600">
                  Trigger an immediate sync with Google Calendar
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </button>
            </div>

            {/* Calendar Selection */}
            {calendars.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Select Calendars to Sync</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {calendars.map((calendar) => (
                    <label
                      key={calendar.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCalendars.includes(calendar.id)}
                        onChange={() => handleCalendarToggle(calendar.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: calendar.backgroundColor || '#3174ad' }}
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {calendar.name}
                          </span>
                          {calendar.primary && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Primary
                            </span>
                          )}
                        </div>
                        {calendar.description && (
                          <p className="text-xs text-gray-500">{calendar.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Sync Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-1 font-medium ${syncStatus.syncEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                    {syncStatus.syncEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {formatLastSync(syncStatus.lastSyncTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarSync;