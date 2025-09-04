import { NavLink } from 'react-router-dom';
import { Calendar, CheckSquare, Home, Users, Clock, CalendarDays, FileText, ListChecks, Settings, UtensilsCrossed, Inbox, ClipboardList } from 'lucide-react';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/inbox', icon: Inbox, label: 'Smart Inbox' },
    { to: '/daily', icon: Clock, label: 'Today' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks & Lists' },
    { to: '/meals', icon: UtensilsCrossed, label: 'Meals' },
    { to: '/planning', icon: ClipboardList, label: 'Weekly Planning' },
    { to: '/family', icon: Users, label: 'Family' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className={`bg-blue-50 w-64 min-h-screen shadow-lg transition-transform duration-300 ease-in-out z-50
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      lg:translate-x-0 lg:static lg:z-auto fixed left-0 top-0
    `}>
      <nav className="mt-8">
        <div className="px-4">
          <ul className="space-y-2">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-200 text-blue-800 border-r-4 border-blue-600'
                        : 'text-gray-700 hover:bg-blue-100 hover:text-blue-800'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;