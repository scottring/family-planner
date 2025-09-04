import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, AlertCircle, CheckCircle2, User, Calendar } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

const NotificationBadge = ({ className = "" }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const {
    notifications,
    stats,
    fetchNotifications,
    fetchNotificationStats,
    markAsRead,
    markAllAsRead,
    getUnreadCount
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    fetchNotificationStats();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchNotificationStats();
      if (showDropdown) {
        fetchNotifications();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchNotificationStats, showDropdown]);

  const unreadCount = getUnreadCount();

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event_reminder':
      case 'event_handoff':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'task_reminder':
      case 'task_handoff':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'urgent_alert':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'responsibility_alert':
        return <User className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type, isRead) => {
    const baseClasses = isRead ? 'bg-white' : 'bg-blue-50 border-blue-200';
    switch (type) {
      case 'urgent_alert':
        return isRead ? 'bg-white' : 'bg-red-50 border-red-200';
      case 'responsibility_alert':
        return isRead ? 'bg-white' : 'bg-orange-50 border-orange-200';
      default:
        return baseClasses;
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    const data = notification.data || {};
    if (data.event_id) {
      // Navigate to event details
      console.log('Navigate to event:', data.event_id);
    } else if (data.task_id) {
      // Navigate to task details
      console.log('Navigate to task:', data.task_id);
    }
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      fetchNotifications();
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleDropdownToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {stats && (
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span>{stats.unread} unread</span>
                <span>{stats.today} today</span>
              </div>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border ${getNotificationColor(notification.type, notification.read_at)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${notification.read_at ? 'text-gray-900' : 'text-gray-900 font-semibold'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read_at && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatTimeAgo(notification.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 5 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to full notifications page
                  console.log('Navigate to all notifications');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 w-full text-center"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;