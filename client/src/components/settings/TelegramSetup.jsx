import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import telegramService from '../../services/telegram';

const TelegramSetup = () => {
  const { user } = useAuthStore();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkingCode, setLinkingCode] = useState('');
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    reminder_minutes: 30
  });
  const [showLinkingCode, setShowLinkingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchStatus();
  }, [user?.id]);

  const fetchStatus = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const statusData = await telegramService.getStatus(user.id);
      setStatus(statusData);
      setSettings(telegramService.formatNotificationSettings(statusData.settings));
    } catch (error) {
      setMessage({ text: 'Failed to load Telegram status', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!linkingCode.trim()) {
      setMessage({ text: 'Please enter a linking code', type: 'error' });
      return;
    }

    if (!telegramService.isValidLinkingCode(linkingCode.trim())) {
      setMessage({ text: 'Invalid linking code format. Should be TG followed by 6 digits.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      await telegramService.linkAccount(user.id, linkingCode.trim());
      setMessage({ text: 'Telegram account linked successfully! 🎉', type: 'success' });
      setLinkingCode('');
      await fetchStatus();
    } catch (error) {
      setMessage({ text: telegramService.getErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkAccount = async () => {
    if (!window.confirm('Are you sure you want to unlink your Telegram account? You will stop receiving notifications.')) {
      return;
    }

    try {
      setLoading(true);
      await telegramService.unlinkAccount(user.id);
      setMessage({ text: 'Telegram account unlinked successfully', type: 'success' });
      await fetchStatus();
    } catch (error) {
      setMessage({ text: telegramService.getErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setLoading(true);
      await telegramService.updateSettings(user.id, {
        notifications_enabled: settings.notifications_enabled,
        reminder_minutes: settings.reminder_minutes
      });
      setMessage({ text: 'Settings updated successfully! ⚙️', type: 'success' });
      await fetchStatus();
    } catch (error) {
      setMessage({ text: telegramService.getErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    try {
      setLoading(true);
      await telegramService.sendTestMessage(user.id);
      setMessage({ text: 'Test message sent! Check your Telegram 📱', type: 'success' });
    } catch (error) {
      setMessage({ text: telegramService.getErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGetLinkingCode = async () => {
    try {
      setLoading(true);
      const response = await telegramService.getLinkingCode(user.id);
      setGeneratedCode(response.linkingCode);
      setShowLinkingCode(true);
      
      if (response.alreadyLinked) {
        setMessage({ text: 'Here\'s your existing linking code', type: 'info' });
      } else {
        setMessage({ text: 'New linking code generated. Start the bot to use it.', type: 'info' });
      }
    } catch (error) {
      setMessage({ text: telegramService.getErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ text: 'Copied to clipboard! 📋', type: 'success' });
    });
  };

  const statusInfo = status ? telegramService.getStatusText(status) : null;

  if (loading && !status) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Telegram Integration</h3>
        {statusInfo && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            <span className="mr-1">{statusInfo.icon}</span>
            {statusInfo.text}
          </span>
        )}
      </div>

      {/* Mock Mode Warning */}
      {status && telegramService.isMockMode(status) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Development Mode</h4>
              <div className="text-sm text-yellow-700 mt-1">
                Telegram bot is running in mock mode. Messages will be logged but not sent.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Connection Status */}
      {status && !status.linked ? (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Get Started</h4>
            <p className="text-sm text-gray-600 mb-4">
              Connect your Telegram account to receive notifications and interact with JJ, your family assistant bot.
            </p>
            
            <div className="space-y-4">
              <div>
                <button
                  onClick={handleGetLinkingCode}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : '1. Generate Linking Code'}
                </button>
              </div>

              {showLinkingCode && generatedCode && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Your Linking Code:</span>
                    <button
                      onClick={() => copyToClipboard(generatedCode)}
                      className="text-xs text-blue-600 hover:text-blue-500"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-100 rounded px-3 py-2 font-mono text-lg tracking-wider text-center">
                    {generatedCode}
                  </div>
                </div>
              )}

              {status?.bot_username && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">2. Start the bot:</p>
                  <a
                    href={telegramService.generateBotDeepLink(status.bot_username, generatedCode)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <span className="mr-2">📱</span>
                    Start @{status.bot_username}
                  </a>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-2">3. Enter linking code manually:</p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="TG123456"
                    value={linkingCode}
                    onChange={(e) => setLinkingCode(e.target.value.toUpperCase())}
                    className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <button
                    onClick={handleLinkAccount}
                    disabled={loading || !linkingCode.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    Link Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : status && status.linked ? (
        <div className="space-y-6">
          {/* Connected Account Info */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-green-400 text-xl mr-3">✅</span>
              <div>
                <h4 className="text-sm font-medium text-green-800">Telegram Connected</h4>
                <p className="text-sm text-green-600">
                  You're connected to @{status.bot_username} and will receive notifications.
                </p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Notification Settings</h4>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="notifications_enabled"
                  type="checkbox"
                  checked={settings.notifications_enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, notifications_enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notifications_enabled" className="ml-2 block text-sm text-gray-900">
                  Enable Telegram notifications
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder timing
                </label>
                <select
                  value={settings.reminder_minutes}
                  onChange={(e) => setSettings(prev => ({ ...prev, reminder_minutes: parseInt(e.target.value) }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value={5}>5 minutes before</option>
                  <option value={10}>10 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                </select>
              </div>

              <button
                onClick={handleUpdateSettings}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Settings'}
              </button>
            </div>
          </div>

          {/* Test & Management */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSendTestMessage}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <span className="mr-2">🧪</span>
              {loading ? 'Sending...' : 'Send Test Message'}
            </button>

            <button
              onClick={handleUnlinkAccount}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <span className="mr-2">🔗</span>
              Unlink Account
            </button>
          </div>
        </div>
      ) : null}

      {/* Help Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Available Commands</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div><code>/today</code> - See today's schedule</div>
          <div><code>/tomorrow</code> - See tomorrow's schedule</div>
          <div><code>/week</code> - Week overview</div>
          <div><code>/tasks</code> - View your tasks</div>
          <div><code>/add [text]</code> - Quick add task</div>
          <div><code>/help</code> - Show all commands</div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          You can also use natural language like "What's on today?" or "Add reminder to pack lunch"
        </p>
      </div>
    </div>
  );
};

export default TelegramSetup;