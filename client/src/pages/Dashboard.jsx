import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { Mic, Plus, Calendar, ClipboardList } from 'lucide-react';

// Main components
import TodaysTimeline from '../components/itinerary/TodaysTimeline';
import EventCoordinator from '../components/coordinator/EventCoordinator';
import TodaysHandoffs from '../components/handoffs/TodaysHandoffs';
import FamilyNotes from '../components/notes/FamilyNotes';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { fetchEvents } = useEventStore();

  // Fetch initial data
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-fade-in px-4 sm:px-6">
      {/* Simplified Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 sm:p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-white/90 text-sm sm:text-base">Here's your day at a glance</p>
      </div>

      {/* Action Buttons Row - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Large Voice Note Button - PRIMARY ACTION */}
        <Link 
          to="/inbox"
          className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 sm:p-6 hover:shadow-lg active:scale-95 transition-all group flex flex-col sm:flex-row items-center justify-center sm:justify-between min-h-[80px] sm:col-span-2 lg:col-span-1"
        >
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Mic className="h-8 w-8 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-bold">Add Voice Note</h3>
              <p className="text-green-100 text-xs sm:text-sm">Quick capture thoughts and tasks</p>
            </div>
          </div>
          <div className="text-green-200 mt-2 sm:mt-0">
            <span className="text-xs sm:text-sm font-semibold">TAP & HOLD</span>
          </div>
        </Link>

        {/* Add Event Button */}
        <Link 
          to="/calendar"
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 sm:p-6 hover:shadow-lg active:scale-95 transition-all group flex flex-col sm:flex-row items-center justify-center sm:justify-between min-h-[80px]"
        >
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Plus className="h-8 w-8 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-bold">Add Event</h3>
              <p className="text-purple-100 text-xs sm:text-sm">Schedule new events or tasks</p>
            </div>
          </div>
          <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-200 mt-2 sm:mt-0" />
        </Link>

        {/* Weekly Planning Button */}
        <Link 
          to="/planning"
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4 sm:p-6 hover:shadow-lg active:scale-95 transition-all group flex flex-col sm:flex-row items-center justify-center sm:justify-between min-h-[80px]"
        >
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <ClipboardList className="h-8 w-8 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-bold">Weekly Planning</h3>
              <p className="text-orange-100 text-xs sm:text-sm">Review & plan your week</p>
            </div>
          </div>
          <div className="text-orange-200 mt-2 sm:mt-0">
            <span className="text-xs sm:text-sm font-semibold">15 MIN</span>
          </div>
        </Link>
      </div>

      {/* Smart Event Coordinator - Shows when event is within 4 hours */}
      <div className="px-2 sm:px-0">
        <EventCoordinator className="mb-4 sm:mb-6" />
      </div>

      {/* Partner Synchronization Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 px-2 sm:px-0">
        <TodaysHandoffs />
        <FamilyNotes />
      </div>

      {/* Today's Timeline - THE MAIN CENTERPIECE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mx-2 sm:mx-0">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <span>Today's Schedule</span>
          </h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">A focused view of your day's events</p>
        </div>
        <div className="p-3 sm:p-6">
          <TodaysTimeline />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;