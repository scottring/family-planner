import { useState, useEffect, useRef } from 'react';
import useNotificationStore from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const {
    notifications,
    stats,
    loading,
    error,
    fetchNotifications,
    fetchNotificationStats,
    markAsRead,
    markAllAsRead,
    clearError
  } = useNotificationStore();

  const [filter, setFilter] = useState('all'); // all, unread, today
  const [selectedType, setSelectedType] = useState('all');
  const modalRef = useRef();

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotifications();
      fetchNotificationStats();
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (error) {
      setTimeout(() => clearError(), 5000);
    }
  }, [error]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filter notifications based on current filter and type
  const filteredNotifications = notifications.filter(notification => {
    // Filter by read status
    if (filter === 'unread' && notification.read_at) return false;
    
    // Filter by date (today only)
    if (filter === 'today') {
      const today = new Date().toDateString();
      const notificationDate = new Date(notification.created_at).toDateString();
      if (today !== notificationDate) return false;
    }
    
    // Filter by type
    if (selectedType !== 'all' && notification.type !== selectedType) return false;
    
    return true;
  });

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return time.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    const icons = {
      event_reminders: '📅',
      task_due: '✅',
      daily_brief: '🌅',
      evening_prep: '🌙',
      responsibility_alerts: '⚠️',
      handoff_notifications: '🔄',
      urgent_alerts: '🚨',
      test: '🧪'
    };
    return icons[type] || '📢';
  };

  const getPriorityColor = (notification) => {
    try {
      const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
      const priority = data?.priority || 'normal';
      
      const colors = {
        urgent: 'border-l-red-500',
        high: 'border-l-orange-500',
        normal: 'border-l-blue-500',
        low: 'border-l-gray-500'
      };
      
      return colors[priority] || colors.normal;
    } catch {
      return 'border-l-blue-500';
    }
  };

  const getNotificationTypeLabel = (type) => {
    const labels = {
      event_reminders: 'Event Reminder',
      task_due: 'Task Due',
      daily_brief: 'Daily Brief',
      evening_prep: 'Evening Prep',
      responsibility_alerts: 'Responsibility Alert',
      handoff_notifications: 'Event Handoff',
      urgent_alerts: 'Urgent Alert',
      test: 'Test Notification'
    };
    return labels[type] || 'Notification';
  };

  const uniqueTypes = [...new Set(notifications.map(n => n.type))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div
          ref={modalRef}
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Notification Center
                </h3>
                {stats.unread > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {stats.unread} unread
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {stats.unread > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Filter:</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All ({notifications.length})</option>
                    <option value="unread">Unread ({stats.unread})</option>
                    <option value="today">Today ({stats.today})</option>
                  </select>
                </div>
                
                {uniqueTypes.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Type:</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Types</option>
                      {uniqueTypes.map(type => (
                        <option key={type} value={type}>
                          {getNotificationTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                Total: {stats.total} notifications
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <EmptyState
                  icon="🔔"
                  title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                  description={
                    filter === 'unread' 
                      ? 'All caught up! You have no unread notifications.'
                      : 'You don\'t have any notifications yet.'
                  }
                />
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`border-l-4 ${getPriorityColor(notification)} bg-white p-4 rounded-r-md shadow-sm hover:shadow-md transition-shadow ${
                        !notification.read_at ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="text-xl">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                {!notification.read_at && (
                                  <button
                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                    className="text-xs text-indigo-600 hover:text-indigo-500"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <p className="mt-1 text-sm text-gray-600">
                              {notification.message}
                            </p>
                            
                            <div className="mt-2 flex items-center space-x-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {getNotificationTypeLabel(notification.type)}
                              </span>
                              
                              {notification.sent_via && (
                                <span className="text-xs text-gray-500">
                                  Sent via: {notification.sent_via}
                                </span>
                              )}
                            </div>
                            
                            {/* Quick Actions */}
                            {notification.data && typeof notification.data === 'object' && notification.data.results && (
                              <div className="mt-2">
                                <details className="text-xs">
                                  <summary className="text-gray-500 cursor-pointer">View delivery details</summary>
                                  <div className="mt-1 pl-4 border-l border-gray-200">
                                    {notification.data.results.map((result, index) => (
                                      <div key={index} className={`text-${result.success ? 'green' : 'red'}-600`}>
                                        {result.channel}: {result.success ? 'Delivered' : `Failed - ${result.error || 'Unknown error'}`}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {!notification.read_at && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;