import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, FileText, Link, Repeat, ChevronLeft, Edit, Trash2, Copy, CheckSquare, LayoutTemplate } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useEventStore } from '../stores/eventStore';
import EventLogistics from '../components/events/EventLogistics';
import LogisticsTemplates from '../components/events/LogisticsTemplates';
import ConditionalChecklist from '../components/events/ConditionalChecklist';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { events, updateEvent, deleteEvent, createEvent } = useEventStore();
  const [event, setEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showLogisticsTemplates, setShowLogisticsTemplates] = useState(false);
  
  const [recurringOptions, setRecurringOptions] = useState({
    frequency: 'daily', // daily, weekly, monthly, yearly
    interval: 1,
    daysOfWeek: [], // for weekly recurrence
    dayOfMonth: null, // for monthly recurrence
    endType: 'never', // never, after, on
    occurrences: 10, // for 'after' end type
    endDate: null, // for 'on' end type
  });

  useEffect(() => {
    console.log('EventDetailPage - Looking for event with id:', id);
    console.log('Available events:', events);
    const foundEvent = events.find(e => e.id === parseInt(id) || e.id === id);
    console.log('Found event:', foundEvent);
    if (foundEvent) {
      setEvent(foundEvent);
      setEditedEvent(foundEvent);
    }
  }, [id, events]);

  const handleSave = async () => {
    await updateEvent(event.id, editedEvent);
    setEvent(editedEvent);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(event.id);
      navigate(-1);
    }
  };

  const handleDuplicate = async () => {
    const newEvent = {
      ...event,
      title: `${event.title} (Copy)`,
      start_time: event.start_time,
      end_time: event.end_time,
    };
    delete newEvent.id;
    await createEvent(newEvent);
    navigate('/calendar');
  };

  const handleCreateRecurring = async () => {
    // Calculate recurring dates based on options
    const dates = calculateRecurringDates(event, recurringOptions);
    
    // Create events for each date
    for (const date of dates) {
      const newEvent = {
        ...event,
        start_time: date.start,
        end_time: date.end,
        recurring_id: event.id, // Link to original event
        recurring_sequence: dates.indexOf(date) + 1,
      };
      delete newEvent.id;
      await createEvent(newEvent);
    }
    
    setShowRecurringModal(false);
    navigate('/calendar');
  };

  const handleLogisticsUpdate = () => {
    // Refresh event data after logistics update
    const foundEvent = events.find(e => e.id === parseInt(id));
    if (foundEvent) {
      setEvent(foundEvent);
    }
  };

  const handleTemplateApplied = () => {
    handleLogisticsUpdate();
  };

  const calculateRecurringDates = (baseEvent, options) => {
    const dates = [];
    const startDate = new Date(baseEvent.start_time);
    const endDate = new Date(baseEvent.end_time);
    const duration = endDate - startDate;
    
    let currentDate = new Date(startDate);
    let count = 0;
    const maxDate = options.endType === 'on' && options.endDate 
      ? new Date(options.endDate) 
      : new Date(startDate.getFullYear() + 2, startDate.getMonth(), startDate.getDate());
    const maxCount = options.endType === 'after' ? options.occurrences : 365;

    while (count < maxCount && currentDate <= maxDate) {
      // Add based on frequency
      if (options.frequency === 'daily') {
        currentDate.setDate(currentDate.getDate() + options.interval);
      } else if (options.frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + (7 * options.interval));
      } else if (options.frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + options.interval);
      } else if (options.frequency === 'yearly') {
        currentDate.setFullYear(currentDate.getFullYear() + options.interval);
      }

      if (currentDate <= maxDate) {
        dates.push({
          start: currentDate.toISOString(),
          end: new Date(currentDate.getTime() + duration).toISOString(),
        });
        count++;
      }
    }
    
    return dates;
  };

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-gray-500">Event not found</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {isEditing ? (
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              className="text-3xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none"
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedEvent(event);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit className="h-5 w-5" />
              </button>
              <button
                onClick={handleDuplicate}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Duplicate"
              >
                <Copy className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowRecurringModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Make Recurring"
              >
                <Repeat className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowLogisticsTemplates(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logistics Templates"
              >
                <LayoutTemplate className="h-5 w-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                title="Delete"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Event Details</h2>
            
            <div className="space-y-4">
              {/* Date & Time */}
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="datetime-local"
                        value={editedEvent.start_time?.slice(0, 16)}
                        onChange={(e) => setEditedEvent({ ...editedEvent, start_time: e.target.value })}
                        className="px-3 py-1 border rounded-lg"
                      />
                      <input
                        type="datetime-local"
                        value={editedEvent.end_time?.slice(0, 16)}
                        onChange={(e) => setEditedEvent({ ...editedEvent, end_time: e.target.value })}
                        className="px-3 py-1 border rounded-lg ml-2"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-900">
                        {event.start_time && format(parseISO(event.start_time), 'PPP')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {event.start_time && format(parseISO(event.start_time), 'p')} - 
                        {event.end_time && format(parseISO(event.end_time), 'p')}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEvent.location || ''}
                      onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
                      placeholder="Add location"
                      className="w-full px-3 py-1 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">{event.location || 'No location set'}</p>
                  )}
                </div>
              </div>

              {/* Attendees */}
              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEvent.attendees || ''}
                      onChange={(e) => setEditedEvent({ ...editedEvent, attendees: e.target.value })}
                      placeholder="Add attendees (comma separated)"
                      className="w-full px-3 py-1 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {event.attendees || 'No attendees'}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">Description</h3>
                  {isEditing ? (
                    <textarea
                      value={editedEvent.description || ''}
                      onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                      placeholder="Add description"
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {event.description || 'No description'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resources Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Link className="h-5 w-5 mr-2" />
              Resources & Links
            </h2>
            {isEditing ? (
              <textarea
                value={editedEvent.resources || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, resources: e.target.value })}
                placeholder="Add resources, links, or attachments (one per line)"
                rows={4}
                className="w-full px-3 py-2 border rounded-lg"
              />
            ) : (
              <div className="space-y-2">
                {event.resources ? (
                  (() => {
                    // Handle both string and object cases
                    const resourcesString = typeof event.resources === 'string' 
                      ? event.resources 
                      : JSON.stringify(event.resources);
                    
                    return resourcesString.split('\n').filter(resource => resource.trim()).map((resource, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-gray-600">•</span>
                        <a href={resource.trim().startsWith('http') ? resource.trim() : '#'} 
                           className="text-blue-600 hover:underline"
                           target="_blank"
                           rel="noopener noreferrer">
                          {resource.trim()}
                        </a>
                      </div>
                    ));
                  })()
                ) : (
                  <p className="text-gray-500">No resources added</p>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Checklist Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <CheckSquare className="h-5 w-5 mr-2" />
              Event Checklist
            </h2>
            <ConditionalChecklist 
              event={event} 
              onUpdate={setEvent}
              isEditing={isEditing}
            />
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Notes & Reminders
            </h2>
            {isEditing ? (
              <textarea
                value={editedEvent.notes || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, notes: e.target.value })}
                placeholder="Add notes, reminders, or special instructions (e.g., 'Ask Kaleb about Reed')"
                rows={4}
                className="w-full px-3 py-2 border rounded-lg"
              />
            ) : (
              <div className="min-h-[2rem]">
                {event.notes ? (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap bg-yellow-50 border-l-4 border-yellow-400 pl-4 py-2 rounded-r-lg">
                      {event.notes}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No notes added</p>
                )}
              </div>
            )}
          </div>

          {/* Event Logistics */}
          <EventLogistics event={event} onUpdate={handleLogisticsUpdate} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Assigned To</dt>
                <dd className="font-medium">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedEvent.assigned_to || ''}
                      onChange={(e) => setEditedEvent({ ...editedEvent, assigned_to: e.target.value })}
                      placeholder="Who is responsible?"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  ) : (
                    <span className={`px-3 py-2 rounded-lg text-sm font-medium ${event.assigned_to ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                      {event.assigned_to || 'Not assigned'}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Category</dt>
                <dd className="font-medium">
                  {isEditing ? (
                    <select
                      value={editedEvent.category || 'personal'}
                      onChange={(e) => setEditedEvent({ ...editedEvent, category: e.target.value })}
                      className="w-full px-3 py-1 border rounded-lg"
                    >
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="family">Family</option>
                      <option value="health">Health</option>
                      <option value="school">School</option>
                      <option value="sports">Sports</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs bg-${event.category || 'personal'}-100 text-${event.category || 'personal'}-700`}>
                      {event.category || 'personal'}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="font-medium text-gray-900">
                  {event.created_at && format(parseISO(event.created_at), 'PPP')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Last Modified</dt>
                <dd className="font-medium text-gray-900">
                  {event.updated_at && format(parseISO(event.updated_at), 'PPP')}
                </dd>
              </div>
              {event.recurring_id && (
                <div>
                  <dt className="text-sm text-gray-500">Recurring Event</dt>
                  <dd className="font-medium text-gray-900">
                    Part of series #{event.recurring_id}
                  </dd>
                </div>
              )}
            </dl>
          </div>

        </div>
      </div>

      {/* Recurring Event Modal */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Recurring Event</h2>
            
            <div className="space-y-4">
              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium mb-1">Repeat</label>
                <select
                  value={recurringOptions.frequency}
                  onChange={(e) => setRecurringOptions({ ...recurringOptions, frequency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Interval */}
              <div>
                <label className="block text-sm font-medium mb-1">Every</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={recurringOptions.interval}
                    onChange={(e) => setRecurringOptions({ ...recurringOptions, interval: parseInt(e.target.value) })}
                    className="w-20 px-3 py-2 border rounded-lg"
                  />
                  <span>{recurringOptions.frequency === 'daily' ? 'day(s)' : 
                          recurringOptions.frequency === 'weekly' ? 'week(s)' :
                          recurringOptions.frequency === 'monthly' ? 'month(s)' : 'year(s)'}</span>
                </div>
              </div>

              {/* End Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Ends</label>
                <select
                  value={recurringOptions.endType}
                  onChange={(e) => setRecurringOptions({ ...recurringOptions, endType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="never">Never</option>
                  <option value="after">After occurrences</option>
                  <option value="on">On date</option>
                </select>
              </div>

              {/* Occurrences */}
              {recurringOptions.endType === 'after' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Number of occurrences</label>
                  <input
                    type="number"
                    min="1"
                    value={recurringOptions.occurrences}
                    onChange={(e) => setRecurringOptions({ ...recurringOptions, occurrences: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}

              {/* End Date */}
              {recurringOptions.endType === 'on' && (
                <div>
                  <label className="block text-sm font-medium mb-1">End date</label>
                  <input
                    type="date"
                    value={recurringOptions.endDate}
                    onChange={(e) => setRecurringOptions({ ...recurringOptions, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowRecurringModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRecurring}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Series
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Templates Modal */}
      {showLogisticsTemplates && (
        <LogisticsTemplates 
          event={event}
          onApplyTemplate={handleTemplateApplied}
          onClose={() => setShowLogisticsTemplates(false)}
        />
      )}
    </div>
  );
};

export default EventDetailPage;