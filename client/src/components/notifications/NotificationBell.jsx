import { useState, useEffect } from 'react';
import useNotificationStore from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import NotificationCenter from './NotificationCenter';

const NotificationBell = () => {
  const { user } = useAuthStore();
  const { stats, fetchNotificationStats } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotificationStats();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotificationStats();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative inline-flex items-center p-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Notifications"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Notification count badge */}
        {stats.unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px] h-5">
            {stats.unread > 99 ? '99+' : stats.unread}
          </span>
        )}
        
        {/* Pulse animation for new notifications */}
        {stats.unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 rounded-full bg-red-400 opacity-75 animate-ping"></span>
        )}
      </button>
      
      <NotificationCenter isOpen={isOpen} onClose={handleClose} />
    </>
  );
};

export default NotificationBell;