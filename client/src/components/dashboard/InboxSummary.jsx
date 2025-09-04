import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, AlertTriangle, Mic } from 'lucide-react';
import { useInboxStore } from '../../stores/inboxStore';

const InboxSummary = () => {
  const { 
    items, 
    loading, 
    fetchInboxItems, 
    getItemsByView 
  } = useInboxStore();

  useEffect(() => {
    fetchInboxItems();
  }, [fetchInboxItems]);

  const urgentItems = getItemsByView('urgent');
  const todayItems = items.filter(item => {
    const itemDate = new Date(item.created_at);
    const today = new Date();
    return itemDate.toDateString() === today.toDateString() && 
           item.status !== 'archived' && 
           item.status !== 'converted';
  });
  const pendingItems = items.filter(item => item.status === 'pending');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Inbox className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Smart Inbox</h3>
          </div>
          <Link
            to="/inbox"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
              <span className="text-2xl font-bold text-red-600">{urgentItems.length}</span>
            </div>
            <p className="text-xs text-gray-600">Urgent</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Mic className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-2xl font-bold text-blue-600">{todayItems.length}</span>
            </div>
            <p className="text-xs text-gray-600">Today</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Inbox className="w-4 h-4 text-gray-500 mr-1" />
              <span className="text-2xl font-bold text-gray-600">{pendingItems.length}</span>
            </div>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
        </div>

        {urgentItems.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
              Urgent Items
            </h4>
            <div className="space-y-2">
              {urgentItems.slice(0, 2).map(item => (
                <div key={item.id} className="bg-red-50 border border-red-100 rounded-md p-2">
                  <p className="text-sm text-red-800 line-clamp-2">
                    {item.transcription || item.raw_content}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-red-600 capitalize">
                      {item.input_type} • {item.category || 'uncategorized'}
                    </span>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full bg-red-500`}></div>
                      <span className="text-xs text-red-600 ml-1">
                        Score: {item.urgency_score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {urgentItems.length > 2 && (
                <Link
                  to="/inbox"
                  className="block text-center text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  +{urgentItems.length - 2} more urgent items
                </Link>
              )}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Your inbox is empty</p>
            <p className="text-xs">Start by adding a voice note!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxSummary;