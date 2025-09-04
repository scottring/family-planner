import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, TestTube, AlertCircle, CheckCircle2, Info, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const EmailSettings = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    monitored_addresses: [],
    imap_config: {
      host: '',
      port: 993,
      username: '',
      password: '',
      tls: true
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  const commonProviders = [
    { name: 'Gmail', host: 'imap.gmail.com', port: 993 },
    { name: 'Outlook/Hotmail', host: 'outlook.office365.com', port: 993 },
    { name: 'Yahoo', host: 'imap.mail.yahoo.com', port: 993 },
    { name: 'iCloud', host: 'imap.mail.me.com', port: 993 }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/capture/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings.email_settings || {
          enabled: false,
          monitored_addresses: [],
          imap_config: {
            host: '',
            port: 993,
            username: '',
            password: '',
            tls: true
          }
        });
      }
    } catch (error) {
      console.error('Failed to load email settings:', error);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/capture/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email_settings: settings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }

      // Show success message briefly
      setTestResult({ success: true, message: 'Settings saved successfully' });
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/capture/test/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings.imap_config)
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || 'Test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const addMonitoredEmail = () => {
    if (newEmail && !settings.monitored_addresses.includes(newEmail)) {
      setSettings(prev => ({
        ...prev,
        monitored_addresses: [...prev.monitored_addresses, newEmail]
      }));
      setNewEmail('');
    }
  };

  const removeMonitoredEmail = (email) => {
    setSettings(prev => ({
      ...prev,
      monitored_addresses: prev.monitored_addresses.filter(addr => addr !== email)
    }));
  };

  const updateImapConfig = (field, value) => {
    setSettings(prev => ({
      ...prev,
      imap_config: {
        ...prev.imap_config,
        [field]: value
      }
    }));
  };

  const selectProvider = (provider) => {
    updateImapConfig('host', provider.host);
    updateImapConfig('port', provider.port);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium">Email Integration</h3>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              enabled: e.target.checked
            }))}
            className="sr-only"
          />
          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}>
            <div className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </div>
          <span className="ml-2 text-sm text-gray-700">
            {settings.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {settings.enabled && (
        <>
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-800 font-medium mb-1">How it works:</p>
                <ul className="text-blue-700 space-y-1">
                  <li>• Monitor specific email addresses for family-related emails</li>
                  <li>• Automatically extract event and task information</li>
                  <li>• Process attachments like permission slips and schedules</li>
                  <li>• Add everything to your inbox for review</li>
                </ul>
              </div>
            </div>
          </div>

          {/* IMAP Configuration */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">Email Account Setup</h4>
            
            {/* Common Providers */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Setup (Optional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {commonProviders.map(provider => (
                  <button
                    key={provider.name}
                    onClick={() => selectProvider(provider)}
                    className="p-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IMAP Server */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IMAP Server
                </label>
                <input
                  type="text"
                  value={settings.imap_config.host}
                  onChange={(e) => updateImapConfig('host', e.target.value)}
                  placeholder="imap.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={settings.imap_config.port}
                  onChange={(e) => updateImapConfig('port', parseInt(e.target.value))}
                  placeholder="993"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.imap_config.username}
                  onChange={(e) => updateImapConfig('username', e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password / App Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.imap_config.password}
                    onChange={(e) => updateImapConfig('password', e.target.value)}
                    placeholder="Your password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  For Gmail, use an App Password instead of your regular password
                </p>
              </div>
            </div>

            {/* TLS Setting */}
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.imap_config.tls}
                  onChange={(e) => updateImapConfig('tls', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Use TLS/SSL encryption</span>
              </label>
            </div>

            {/* Test Connection */}
            <div className="mt-4 flex items-center space-x-4">
              <button
                onClick={handleTest}
                disabled={isTesting || !settings.imap_config.host || !settings.imap_config.username}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <TestTube className="w-4 h-4" />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {testResult && (
                <div className={`flex items-center space-x-2 ${
                  testResult.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Monitored Email Addresses */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">
              Monitored Email Addresses
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Only emails from these addresses will be processed. Leave empty to process all emails.
            </p>

            {/* Add Email Input */}
            <div className="flex space-x-2 mb-4">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMonitoredEmail()}
                placeholder="school@district.edu"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addMonitoredEmail}
                disabled={!newEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Email List */}
            {settings.monitored_addresses.length > 0 && (
              <div className="space-y-2">
                {settings.monitored_addresses.map((email, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      onClick={() => removeMonitoredEmail(email)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailSettings;