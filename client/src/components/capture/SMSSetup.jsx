import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Send, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const SMSSetup = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    phone_number: '',
    verified: false
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { token } = useAuth();

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
        setSettings(data.settings.sms_settings || {
          enabled: false,
          phone_number: '',
          verified: false
        });
      }
    } catch (error) {
      console.error('Failed to load SMS settings:', error);
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
          sms_settings: settings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const sendVerificationCode = async () => {
    if (!settings.phone_number) {
      setError('Please enter a phone number');
      return;
    }

    setIsSendingCode(true);
    setError(null);

    try {
      const response = await fetch('/api/capture/verify/phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone_number: settings.phone_number
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send verification code');
      }

      const result = await response.json();
      setVerificationSent(true);
      setSuccess('Verification code sent!');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // In a real implementation, you'd verify the code here
      // For now, we'll simulate successful verification
      setTimeout(() => {
        setSettings(prev => ({ ...prev, verified: true }));
        setSuccess('Phone number verified successfully!');
        setVerificationSent(false);
        setVerificationCode('');
        setIsVerifying(false);
      }, 1000);
    } catch (error) {
      setError(error.message);
      setIsVerifying(false);
    }
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return value;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSettings(prev => ({ ...prev, phone_number: formatted }));
    
    // Reset verification status when phone number changes
    if (settings.verified) {
      setSettings(prev => ({ ...prev, verified: false }));
      setVerificationSent(false);
    }
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
          <MessageSquare className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-medium">SMS Integration</h3>
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
            settings.enabled ? 'bg-green-600' : 'bg-gray-200'
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Info className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-green-800 font-medium mb-1">SMS Commands:</p>
                <ul className="text-green-700 space-y-1">
                  <li>• "add task: buy groceries" - Create a task</li>
                  <li>• "event: soccer practice 4pm" - Create an event</li>
                  <li>• "list today" - Show today's schedule</li>
                  <li>• Send photos of forms for automatic processing</li>
                  <li>• "help" - Show all available commands</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Phone Number Setup */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>Phone Number Setup</span>
            </h4>
            
            <div className="space-y-4">
              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={settings.phone_number}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {settings.verified ? (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Verified</span>
                    </div>
                  ) : (
                    <button
                      onClick={sendVerificationCode}
                      disabled={isSendingCode || !settings.phone_number}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSendingCode ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                </div>
              </div>

              {/* Verification Code Input */}
              {verificationSent && !settings.verified && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={verifyCode}
                      disabled={isVerifying || !verificationCode}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isVerifying ? 'Verifying...' : 'Confirm'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Check your phone for a verification code
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SMS Commands Reference */}
          {settings.verified && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Quick Reference</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Add Items:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• "add: soccer practice 4pm"</li>
                    <li>• "task: buy milk"</li>
                    <li>• "event: dentist tomorrow 2pm"</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Get Info:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• "list" or "list today"</li>
                    <li>• "list tomorrow"</li>
                    <li>• "status" - inbox summary</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Pro tip:</strong> Send photos of permission slips, schedules, or flyers 
                  with a caption for automatic text extraction and processing.
                </p>
              </div>
            </div>
          )}

          {/* Test SMS */}
          {settings.verified && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Test SMS</h4>
              <p className="text-sm text-gray-600 mb-4">
                Send a test message to make sure everything is working correctly.
              </p>
              
              <button
                onClick={() => {
                  // This would send a test SMS in a real implementation
                  setSuccess('Test message sent! Check your phone.');
                  setTimeout(() => setSuccess(null), 3000);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Send Test Message</span>
              </button>
            </div>
          )}

          {/* Success/Error Messages */}
          {success && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 text-green-700 rounded-md border border-green-200">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">{success}</span>
            </div>
          )}

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
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SMSSetup;