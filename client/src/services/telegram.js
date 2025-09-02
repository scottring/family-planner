import api from './api';

const telegramService = {
  // Get Telegram connection status
  async getStatus(userId) {
    try {
      const response = await api.get(`/telegram/status/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Telegram status:', error);
      throw error;
    }
  },

  // Link Telegram account
  async linkAccount(userId, linkingCode) {
    try {
      const response = await api.post(`/telegram/link/${userId}`, {
        linkingCode: linkingCode.trim()
      });
      return response.data;
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      throw error;
    }
  },

  // Unlink Telegram account
  async unlinkAccount(userId) {
    try {
      const response = await api.delete(`/telegram/unlink/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error unlinking Telegram account:', error);
      throw error;
    }
  },

  // Update notification settings
  async updateSettings(userId, settings) {
    try {
      const response = await api.put(`/telegram/settings/${userId}`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating Telegram settings:', error);
      throw error;
    }
  },

  // Send test message
  async sendTestMessage(userId) {
    try {
      const response = await api.post(`/telegram/test/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error sending test message:', error);
      throw error;
    }
  },

  // Send custom message (admin only)
  async sendMessage(userId, message, parseMode = 'Markdown') {
    try {
      const response = await api.post(`/telegram/send/${userId}`, {
        message,
        parse_mode: parseMode
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get linking code for user
  async getLinkingCode(userId) {
    try {
      const response = await api.get(`/telegram/linking-code/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting linking code:', error);
      throw error;
    }
  },

  // Get bot info and stats
  async getBotInfo() {
    try {
      const response = await api.get('/telegram/info');
      return response.data;
    } catch (error) {
      console.error('Error getting bot info:', error);
      throw error;
    }
  },

  // Generate deep link to start bot
  generateBotDeepLink(botUsername, linkingCode) {
    if (!botUsername) return null;
    return `https://t.me/${botUsername}?start=${linkingCode}`;
  },

  // Generate QR code data for bot link
  generateQRCodeData(botUsername, linkingCode) {
    const deepLink = this.generateBotDeepLink(botUsername, linkingCode);
    return deepLink;
  },

  // Format notification preferences for display
  formatNotificationSettings(settings) {
    const defaults = {
      notifications_enabled: true,
      reminder_minutes: 30
    };

    const current = { ...defaults, ...settings };

    return {
      ...current,
      reminder_text: this.getReminderText(current.reminder_minutes)
    };
  },

  getReminderText(minutes) {
    if (minutes === 5) return '5 minutes before';
    if (minutes === 10) return '10 minutes before';
    if (minutes === 15) return '15 minutes before';
    if (minutes === 30) return '30 minutes before';
    if (minutes === 60) return '1 hour before';
    if (minutes === 120) return '2 hours before';
    return `${minutes} minutes before`;
  },

  // Validate linking code format
  isValidLinkingCode(code) {
    return /^TG\d{6}$/.test(code);
  },

  // Get connection status text
  getStatusText(status) {
    if (!status.linked) {
      return {
        text: 'Not Connected',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: '❌'
      };
    }

    if (!status.has_chat_connection) {
      return {
        text: 'Linked (Inactive)',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        icon: '⚠️'
      };
    }

    return {
      text: 'Connected & Active',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '✅'
    };
  },

  // Error handling utilities
  getErrorMessage(error) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },

  // Mock mode detection
  isMockMode(status) {
    return !status.bot_active || status.mock_mode;
  }
};

export default telegramService;