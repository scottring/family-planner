import { useState, useEffect } from 'react';
import EventCoordinator from './EventCoordinator';
import PreparationTimeline from './PreparationTimeline';
import { eventContextService } from '../../services/eventContext';

/**
 * Demo component to showcase the Smart Event Coordinator functionality
 * This creates mock events to demonstrate the coordinator features
 */
const CoordinatorDemo = () => {
  const [mockEvents, setMockEvents] = useState([]);

  useEffect(() => {
    // Create mock events for demonstration
    const now = new Date();
    const mockEventData = [
      {
        id: 'demo-scouts',
        title: 'Scouts Den Meeting',
        description: 'Weekly den meeting for Kaleb and Ella',
        start_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        end_time: new Date(now.getTime() + 3.5 * 60 * 60 * 1000).toISOString(),
        location: '123 Community Center, Anytown, USA',
        attendees: ['Kaleb', 'Ella'],
        assignedTo: 'Parent'
      },
      {
        id: 'demo-soccer',
        title: 'Soccer Practice',
        description: 'Weekly soccer practice for the twins',
        start_time: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours from now
        end_time: new Date(now.getTime() + 6.5 * 60 * 60 * 1000).toISOString(),
        location: 'Riverside Park Soccer Fields',
        attendees: ['Kaleb', 'Ella'],
        assignedTo: 'Mom'
      },
      {
        id: 'demo-doctor',
        title: 'Doctor Appointment',
        description: 'Annual checkup for Kaleb',
        start_time: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
        end_time: new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString(),
        location: 'Family Health Clinic, 456 Medical Dr',
        attendees: ['Kaleb'],
        assignedTo: 'Dad'
      }
    ];

    setMockEvents(mockEventData);
  }, []);

  // Test the event context service functions
  const testEventAnalysis = () => {
    if (mockEvents.length === 0) return null;

    const testEvent = mockEvents[0]; // Scout meeting
    const analysis = eventContextService.analyzeEventPattern(testEvent);
    const suggestions = eventContextService.getContextualSuggestions(testEvent);
    const timeline = eventContextService.generatePreparationTimeline(testEvent);

    return {
      analysis,
      suggestions,
      timeline
    };
  };

  const analysis = testEventAnalysis();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Smart Event Coordinator Demo
        </h1>
        <p className="text-lg text-gray-600">
          Intelligent family event management system with preparation timelines and contextual suggestions
        </p>
      </div>

      {/* Mock Event Coordinator */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Event Coordinator</h2>
        <p className="text-gray-600">
          This shows how the coordinator appears when an event is within 4 hours. 
          It automatically detects event patterns and provides smart suggestions.
        </p>
        
        {/* Simulate the EventCoordinator with mock data */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-xl border-2 border-blue-300 p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">Demo: Scouts Den Meeting</h3>
            <p className="text-blue-700">Starting in 2 hours - Time to prepare!</p>
          </div>
          
          {/* Event Analysis Display */}
          {analysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">Pattern Recognition</h4>
                <p><strong>Type:</strong> {analysis.analysis?.patternName || 'scouts'}</p>
                <p><strong>Confidence:</strong> {analysis.analysis?.confidence || 95}%</p>
                <p><strong>Prep Time:</strong> {analysis.analysis?.preparationTime || 45} minutes</p>
              </div>
              
              <div className="bg-white/80 rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">Smart Suggestions</h4>
                <ul className="text-sm space-y-1">
                  <li>• Scout uniform required</li>
                  <li>• Pack handbook and snacks</li>
                  <li>• Early dinner recommended</li>
                  <li>• Dog care before leaving</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mock Preparation Timeline */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Preparation Timeline</h2>
        <p className="text-gray-600">
          The timeline calculates backward from the event start time, including family-specific routines 
          like dog care, meal timing, and preparation activities.
        </p>
        
        {mockEvents.length > 0 && (
          <PreparationTimeline event={mockEvents[0]} />
        )}
      </div>

      {/* Feature Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Pattern Recognition</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Detects scouts, sports, medical, school events</li>
            <li>• Analyzes event title and description</li>
            <li>• Provides confidence scores</li>
            <li>• Suggests appropriate preparation times</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Smart Timing</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Calculates departure times</li>
            <li>• Includes commute buffer</li>
            <li>• Schedules dog care routines</li>
            <li>• Suggests meal timing</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Family-Specific</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Tailored for twins (Kaleb & Ella)</li>
            <li>• Includes dog care considerations</li>
            <li>• Meal coordination for family</li>
            <li>• Transportation planning</li>
          </ul>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Implementation Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Components Created</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• EventCoordinator.jsx - Main smart card</li>
              <li>• PreparationTimeline.jsx - Timeline with countdowns</li>
              <li>• eventContext.js - Pattern recognition service</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Key Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Google Maps integration</li>
              <li>• Real-time countdown timers</li>
              <li>• Context-aware suggestions</li>
              <li>• Mobile-responsive design</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorDemo;