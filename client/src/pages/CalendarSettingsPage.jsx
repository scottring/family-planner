import React, { useState } from 'react';
import { ArrowLeft, Settings, Calendar, Users, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CalendarAccountManager from '../components/calendar/CalendarAccountManager';
import CalendarSync from '../components/settings/CalendarSync';

const CalendarSettingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('accounts');

  const tabs = [
    {
      id: 'accounts',
      name: 'Accounts',
      icon: Users,
      description: 'Manage Google Calendar accounts'
    },
    {
      id: 'sync',
      name: 'Sync Settings',
      icon: Settings,
      description: 'Configure calendar synchronization'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Calendar Settings</h1>
                  <p className="text-sm text-gray-500">
                    Manage your Google Calendar integration and sync preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{tab.name}</div>
                        <div className="text-sm text-gray-500">{tab.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Context Legend */}
            <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Context Guide</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Work</div>
                    <div className="text-xs text-gray-500">Professional calendar events</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Family</div>
                    <div className="text-xs text-gray-500">Family activities and appointments</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Personal</div>
                    <div className="text-xs text-gray-500">Personal appointments and activities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'accounts' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Account Management</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Connect multiple Google Calendar accounts and assign them to different contexts. 
                    This allows you to separate work, personal, and family events while keeping them 
                    all synchronized in your family planner.
                  </p>
                </div>
                
                <CalendarAccountManager />

                {/* Tips Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for Multiple Accounts</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use work account for professional events and meetings</li>
                    <li>• Set up family account for shared activities and appointments</li>
                    <li>• Keep personal account for individual activities and commitments</li>
                    <li>• Each context can have only one default account at a time</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'sync' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Synchronization Settings</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Configure how your Google Calendar accounts sync with your family planner. 
                    These settings apply to all connected accounts.
                  </p>
                </div>

                <CalendarSync />

                {/* Sync Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">How Sync Works</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      • Events are automatically synced every 15 minutes from all connected accounts
                    </p>
                    <p>
                      • Changes made in Google Calendar will appear in your family planner
                    </p>
                    <p>
                      • Events created in the family planner can be pushed to the appropriate calendar
                    </p>
                    <p>
                      • Context assignments determine which calendar receives new events
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSettingsPage;