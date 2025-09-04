import React, { useState } from 'react';
import { Brain, Mic, MessageSquare, Mail, Camera, ChevronRight, ChevronDown, BookOpen, Lightbulb, Users, Calendar, CheckSquare } from 'lucide-react';

const AdvancedCommands = () => {
  const [expandedSection, setExpandedSection] = useState('voice');

  const sections = [
    {
      id: 'voice',
      title: 'Advanced Voice Commands',
      icon: <Mic className="w-5 h-5 text-purple-600" />,
      description: 'Complex natural language processing for detailed voice inputs',
      examples: [
        {
          category: 'Recurring Events',
          items: [
            '"Every Tuesday and Thursday Kaleb has soccer at 4pm at the field behind the school"',
            '"Sarah has piano lessons every Wednesday at 3:30pm with Mrs. Johnson"',
            '"Monthly parent-teacher meetings first Friday at 7pm"'
          ]
        },
        {
          category: 'Complex Scheduling',
          items: [
            '"Next Monday pick up Emma from school at 3:15, then drive to dance at 4pm"',
            '"This Saturday soccer tournament from 9am to 3pm, bring snacks and water"',
            '"Weekly grocery shopping every Sunday morning, create shopping list"'
          ]
        },
        {
          category: 'Multiple Family Members',
          items: [
            '"All kids need forms signed by Friday for field trip"',
            '"Mom and Dad need to attend school meeting Thursday at 7pm"',
            '"Family dentist appointment for everyone next Tuesday 2pm"'
          ]
        },
        {
          category: 'Dependent Tasks',
          items: [
            '"Buy birthday gift for Emma\'s party Saturday, wrap it Friday night"',
            '"Send permission slip back by Wednesday after getting it signed"',
            '"Pick up prescription before doctor appointment on Friday"'
          ]
        }
      ]
    },
    {
      id: 'sms',
      title: 'SMS Bot Commands',
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      description: 'Quick text-based commands for on-the-go family management',
      examples: [
        {
          category: 'Quick Add',
          items: [
            '"add: soccer practice 4pm tomorrow"',
            '"task: buy milk and bread"',
            '"event: dinner with grandparents Sunday 6pm"'
          ]
        },
        {
          category: 'Specific Commands',
          items: [
            '"add task: call dentist to schedule checkup"',
            '"add event: school play rehearsal Tuesday 4pm auditorium"',
            '"add: pickup Emma early Wednesday for appointment"'
          ]
        },
        {
          category: 'Information Queries',
          items: [
            '"list" - Show today\'s schedule',
            '"list tomorrow" - Tomorrow\'s events',
            '"list tasks" - Open tasks',
            '"status" - Inbox summary'
          ]
        },
        {
          category: 'Photo Messages',
          items: [
            'Send photo + "Soccer schedule for spring season"',
            'Send photo + "Permission slip for field trip"',
            'Send photo + "School lunch menu for next week"'
          ]
        }
      ]
    },
    {
      id: 'email',
      title: 'Email Processing',
      icon: <Mail className="w-5 h-5 text-blue-600" />,
      description: 'Automatic extraction from school, sports, and activity emails',
      examples: [
        {
          category: 'Automatic Recognition',
          items: [
            'School newsletters with important dates',
            'Sports team schedules and game notifications',
            'Medical appointment confirmations',
            'Activity class schedules and updates'
          ]
        },
        {
          category: 'Smart Categorization',
          items: [
            'Emails from school domains → School category',
            'Emails with "practice" or "game" → Sports category',
            'Emails from doctors/clinics → Medical category',
            'Emails with "lesson" or "class" → Activities category'
          ]
        },
        {
          category: 'Attachment Processing',
          items: [
            'PDF forms automatically processed with OCR',
            'Image attachments scanned for text',
            'Calendar invites extracted and converted',
            'Contact information automatically saved'
          ]
        }
      ]
    },
    {
      id: 'photo',
      title: 'Photo & OCR Processing',
      icon: <Camera className="w-5 h-5 text-orange-600" />,
      description: 'Advanced text recognition and form processing',
      examples: [
        {
          category: 'Document Types',
          items: [
            'Permission slips and field trip forms',
            'Sports schedules and team rosters',
            'School calendars and event flyers',
            'Medical forms and appointment cards',
            'Activity registration forms'
          ]
        },
        {
          category: 'Smart Extraction',
          items: [
            'Automatically finds dates, times, and locations',
            'Extracts contact information and phone numbers',
            'Identifies form types (permission slip, schedule, etc.)',
            'Determines urgency based on due dates'
          ]
        },
        {
          category: 'Best Practices',
          items: [
            'Good lighting and clear text',
            'Capture entire document or form',
            'Hold camera steady to avoid blur',
            'Add caption for context when uploading'
          ]
        }
      ]
    }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const ExampleCard = ({ example }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h5 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
        <CheckSquare className="w-4 h-4 text-blue-600" />
        <span>{example.category}</span>
      </h5>
      <ul className="space-y-2">
        {example.items.map((item, idx) => (
          <li key={idx} className="text-sm text-gray-700 flex items-start space-x-2">
            <span className="text-blue-600 mt-1">•</span>
            <span className="font-mono bg-white px-2 py-1 rounded border text-xs">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Brain className="w-8 h-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Advanced Input Methods</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Master the power of AI-driven family planning with these comprehensive input methods. 
          From complex voice commands to automatic email processing.
        </p>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Lightbulb className="w-6 h-6 text-purple-600 mt-1" />
          <div>
            <h3 className="font-medium text-purple-900 mb-2">Pro Tips for Best Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
              <div>
                <h4 className="font-medium mb-1">Voice Commands:</h4>
                <ul className="space-y-1">
                  <li>• Speak naturally, include context</li>
                  <li>• Mention specific family members by name</li>
                  <li>• Include times, dates, and locations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-1">Photo Processing:</h4>
                <ul className="space-y-1">
                  <li>• Ensure good lighting and focus</li>
                  <li>• Capture the entire document</li>
                  <li>• Add captions for better context</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Command Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {section.icon}
                <div>
                  <h3 className="font-medium text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                </div>
              </div>
              {expandedSection === section.id ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSection === section.id && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {section.examples.map((example, idx) => (
                    <ExampleCard key={idx} example={example} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Family Member Context */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Users className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Family Member Recognition</h3>
            <p className="text-blue-800 text-sm mb-3">
              The system learns your family members' names and preferences over time. 
              For best results, consistently use the same names when creating events and tasks.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Examples:</h4>
                <ul className="text-blue-700 space-y-1">
                  <li>• "Emma has dance class" → Assigned to Emma</li>
                  <li>• "Pick up the kids" → Multiple assignments</li>
                  <li>• "Mom's doctor appointment" → Assigned to Mom</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Context Clues:</h4>
                <ul className="text-blue-700 space-y-1">
                  <li>• Age-appropriate activities (piano lessons, soccer)</li>
                  <li>• Location patterns (school pickup, work meetings)</li>
                  <li>• Time patterns (bedtime routines, work hours)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Guide */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <BookOpen className="w-6 h-6 text-green-600 mt-1" />
          <div className="w-full">
            <h3 className="font-medium text-gray-900 mb-3">Getting Started</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <h4 className="font-medium text-gray-900">Set Up Capture Methods</h4>
                </div>
                <p className="text-sm text-gray-600 ml-8">
                  Enable email monitoring, verify your phone number, and configure OCR settings.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <h4 className="font-medium text-gray-900">Start Simple</h4>
                </div>
                <p className="text-sm text-gray-600 ml-8">
                  Begin with basic commands and gradually use more complex natural language.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <h4 className="font-medium text-gray-900">Review & Refine</h4>
                </div>
                <p className="text-sm text-gray-600 ml-8">
                  Check your inbox regularly and provide feedback to improve accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCommands;