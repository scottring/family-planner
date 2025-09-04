import { User, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import NotificationBadge from '../notifications/NotificationBadge';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <h1 className="ml-4 text-xl font-semibold text-gray-800">Family Planner</h1>
          </div>
          
          {user && (
            <div className="flex items-center space-x-3">
              <NotificationBadge />
              
              <User className="h-5 w-5 text-gray-600" />
              <span className="hidden sm:block text-gray-600">
                {user.username}
              </span>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;