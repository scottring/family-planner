import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Video, 
  MapPin, 
  Users, 
  FileText, 
  Plus, 
  X, 
  Check,
  ExternalLink,
  Monitor,
  Mic,
  Camera,
  CheckCircle,
  Clock,
  Link,
  StickyNote,
  AlertCircle
} from 'lucide-react';
import { useTaskStore } from '../../../stores/taskStore';

const MeetingPrepTemplate = ({ task, onUpdate, className = "" }) => {
  const [meetingData, setMeetingData] = useState({
    title: '',
    type: 'video', // 'video' or 'in-person'
    agendaItems: [],
    documents: [],
    techCheckDone: false,
    meetingLink: '',
    location: '',
    attendees: [],
    notes: '',
    preMeetingTasks: [],
    ...task.templateData
  });
  
  const [newAgendaItem, setNewAgendaItem] = useState('');
  const [newDocument, setNewDocument] = useState({ title: '', url: '' });
  const [newAttendee, setNewAttendee] = useState('');
  const [newTask, setNewTask] = useState('');
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  
  const { updateTask } = useTaskStore();

  // Save data when it changes
  useEffect(() => {
    const saveData = async () => {
      if (task.id) {
        try {
          await updateTask(task.id, {
            ...task,
            templateType: 'meeting',
            templateData: meetingData
          });
          if (onUpdate) {
            onUpdate({ ...task, templateData: meetingData });
          }
        } catch (error) {
          console.error('Error updating meeting prep task:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveData, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [meetingData, task.id, updateTask, onUpdate]);

  const handleInputChange = (field, value) => {
    setMeetingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addAgendaItem = () => {
    if (newAgendaItem.trim()) {
      const item = {
        id: Date.now(),
        text: newAgendaItem.trim(),
        completed: false
      };
      setMeetingData(prev => ({
        ...prev,
        agendaItems: [...prev.agendaItems, item]
      }));
      setNewAgendaItem('');
    }
  };

  const removeAgendaItem = (id) => {
    setMeetingData(prev => ({
      ...prev,
      agendaItems: prev.agendaItems.filter(item => item.id !== id)
    }));
  };

  const toggleAgendaItem = (id) => {
    setMeetingData(prev => ({
      ...prev,
      agendaItems: prev.agendaItems.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const addDocument = () => {
    if (newDocument.title.trim()) {
      const doc = {
        id: Date.now(),
        title: newDocument.title.trim(),
        url: newDocument.url.trim(),
        reviewed: false
      };
      setMeetingData(prev => ({
        ...prev,
        documents: [...prev.documents, doc]
      }));
      setNewDocument({ title: '', url: '' });
      setShowDocumentForm(false);
    }
  };

  const removeDocument = (id) => {
    setMeetingData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id)
    }));
  };

  const toggleDocumentReviewed = (id) => {
    setMeetingData(prev => ({
      ...prev,
      documents: prev.documents.map(doc => 
        doc.id === id ? { ...doc, reviewed: !doc.reviewed } : doc
      )
    }));
  };

  const addAttendee = () => {
    if (newAttendee.trim() && !meetingData.attendees.includes(newAttendee.trim())) {
      setMeetingData(prev => ({
        ...prev,
        attendees: [...prev.attendees, newAttendee.trim()]
      }));
      setNewAttendee('');
    }
  };

  const removeAttendee = (attendee) => {
    setMeetingData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== attendee)
    }));
  };

  const addPreMeetingTask = () => {
    if (newTask.trim()) {
      const task = {
        id: Date.now(),
        text: newTask.trim(),
        completed: false
      };
      setMeetingData(prev => ({
        ...prev,
        preMeetingTasks: [...prev.preMeetingTasks, task]
      }));
      setNewTask('');
    }
  };

  const removePreMeetingTask = (id) => {
    setMeetingData(prev => ({
      ...prev,
      preMeetingTasks: prev.preMeetingTasks.filter(task => task.id !== id)
    }));
  };

  const togglePreMeetingTask = (id) => {
    setMeetingData(prev => ({
      ...prev,
      preMeetingTasks: prev.preMeetingTasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    }));
  };

  const performTechCheck = () => {
    // Mock tech check
    setMeetingData(prev => ({
      ...prev,
      techCheckDone: true
    }));
    
    alert('Tech check completed! ✓ Camera, Microphone, and Internet connection verified.');
    
    // Reset for demo purposes
    setTimeout(() => {
      setMeetingData(prev => ({
        ...prev,
        techCheckDone: false
      }));
    }, 10000);
  };

  const openMeetingLink = () => {
    if (meetingData.meetingLink) {
      window.open(meetingData.meetingLink, '_blank');
    }
  };

  const openLocation = () => {
    if (meetingData.location) {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(meetingData.location)}`;
      window.open(url, '_blank');
    }
  };

  const completedAgenda = meetingData.agendaItems.filter(item => item.completed).length;
  const reviewedDocs = meetingData.documents.filter(doc => doc.reviewed).length;
  const completedTasks = meetingData.preMeetingTasks.filter(task => task.completed).length;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-xl">
          {meetingData.type === 'video' ? (
            <Video className="h-5 w-5 text-purple-600" />
          ) : (
            <MapPin className="h-5 w-5 text-purple-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Meeting Preparation</h3>
          <p className="text-sm text-gray-500">
            {meetingData.type === 'video' ? 'Video meeting' : 'In-person meeting'} preparation
          </p>
        </div>
        {meetingData.techCheckDone && meetingData.type === 'video' && (
          <div className="flex items-center space-x-1 text-sm text-green-600 bg-green-100 rounded-lg px-3 py-1">
            <CheckCircle className="h-4 w-4" />
            <span>Tech Ready</span>
          </div>
        )}
      </div>

      {/* Meeting Title & Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Title *
          </label>
          <input
            type="text"
            value={meetingData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter meeting title..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Type
          </label>
          <select
            value={meetingData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          >
            <option value="video">Video Meeting</option>
            <option value="in-person">In-Person</option>
          </select>
        </div>
      </div>

      {/* Meeting Link/Location */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {meetingData.type === 'video' ? (
            <>
              <Link className="h-4 w-4 inline mr-1" />
              Meeting Link
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 inline mr-1" />
              Location
            </>
          )}
        </label>
        <div className="flex space-x-2">
          <input
            type={meetingData.type === 'video' ? 'url' : 'text'}
            value={meetingData.type === 'video' ? meetingData.meetingLink : meetingData.location}
            onChange={(e) => handleInputChange(
              meetingData.type === 'video' ? 'meetingLink' : 'location', 
              e.target.value
            )}
            placeholder={meetingData.type === 'video' ? 'Enter Zoom/Teams/Meet link...' : 'Enter meeting location...'}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
          {((meetingData.type === 'video' && meetingData.meetingLink) || 
            (meetingData.type === 'in-person' && meetingData.location)) && (
            <button
              onClick={meetingData.type === 'video' ? openMeetingLink : openLocation}
              className="px-3 py-3 text-purple-600 border border-purple-300 rounded-xl hover:bg-purple-50 transition-colors"
              title={meetingData.type === 'video' ? 'Open meeting link' : 'Open in maps'}
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tech Check for Video Meetings */}
      {meetingData.type === 'video' && (
        <div className="mb-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <Monitor className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">Technology Check</div>
                <div className="text-xs text-gray-500">Verify camera, microphone, and connection</div>
              </div>
            </div>
            <button
              onClick={performTechCheck}
              disabled={meetingData.techCheckDone}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                meetingData.techCheckDone
                  ? 'text-green-700 bg-green-100 cursor-not-allowed'
                  : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
              }`}
            >
              {meetingData.techCheckDone ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Check Complete</span>
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  <span>Run Check</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Attendees */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="h-4 w-4 inline mr-1" />
          Attendees
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newAttendee}
            onChange={(e) => setNewAttendee(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
            placeholder="Add attendee name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
          <button
            onClick={addAttendee}
            disabled={!newAttendee.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {meetingData.attendees.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {meetingData.attendees.map((attendee, index) => (
              <div key={index} className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                <span>{attendee}</span>
                <button
                  onClick={() => removeAttendee(attendee)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agenda Items */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="h-4 w-4 inline mr-1" />
          Agenda Items ({completedAgenda}/{meetingData.agendaItems.length})
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newAgendaItem}
            onChange={(e) => setNewAgendaItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addAgendaItem()}
            placeholder="Add agenda item..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
          <button
            onClick={addAgendaItem}
            disabled={!newAgendaItem.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {meetingData.agendaItems.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {meetingData.agendaItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <button
                  onClick={() => toggleAgendaItem(item.id)}
                  className={`p-1 rounded-full transition-colors ${
                    item.completed 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {item.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-current rounded-full"></div>
                  )}
                </button>
                <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {item.text}
                </span>
                <button
                  onClick={() => removeAgendaItem(item.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            <FileText className="h-4 w-4 inline mr-1" />
            Documents to Review ({reviewedDocs}/{meetingData.documents.length})
          </label>
          <button
            onClick={() => setShowDocumentForm(!showDocumentForm)}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            {showDocumentForm ? 'Cancel' : 'Add Document'}
          </button>
        </div>
        
        {showDocumentForm && (
          <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="text"
              value={newDocument.title}
              onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Document title..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <input
              type="url"
              value={newDocument.url}
              onChange={(e) => setNewDocument(prev => ({ ...prev, url: e.target.value }))}
              placeholder="Document URL (optional)..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              onClick={addDocument}
              disabled={!newDocument.title.trim()}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Add Document
            </button>
          </div>
        )}
        
        {meetingData.documents.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {meetingData.documents.map((doc) => (
              <div key={doc.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <button
                  onClick={() => toggleDocumentReviewed(doc.id)}
                  className={`p-1 rounded-full transition-colors ${
                    doc.reviewed 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {doc.reviewed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-current rounded-full"></div>
                  )}
                </button>
                <div className="flex-1">
                  <span className={`text-sm ${doc.reviewed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {doc.title}
                  </span>
                  {doc.url && (
                    <button
                      onClick={() => window.open(doc.url, '_blank')}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-3 w-3 inline" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pre-Meeting Tasks */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CheckCircle className="h-4 w-4 inline mr-1" />
          Pre-Meeting Tasks ({completedTasks}/{meetingData.preMeetingTasks.length})
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addPreMeetingTask()}
            placeholder="Add task..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          />
          <button
            onClick={addPreMeetingTask}
            disabled={!newTask.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {meetingData.preMeetingTasks.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {meetingData.preMeetingTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <button
                  onClick={() => togglePreMeetingTask(task.id)}
                  className={`p-1 rounded-full transition-colors ${
                    task.completed 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {task.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-current rounded-full"></div>
                  )}
                </button>
                <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {task.text}
                </span>
                <button
                  onClick={() => removePreMeetingTask(task.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <StickyNote className="h-4 w-4 inline mr-1" />
          Notes
        </label>
        <textarea
          value={meetingData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Meeting notes, questions, or reminders..."
          rows="3"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Preparation Summary */}
      {meetingData.title && (
        <div className="mt-4 p-3 bg-purple-50 rounded-xl">
          <div className="text-sm font-medium text-purple-900 mb-1">Meeting Preparation Summary</div>
          <div className="text-sm text-purple-700 mb-2">
            <div><strong>{meetingData.title}</strong></div>
            <div className="text-xs text-purple-600 mt-1">
              {meetingData.type === 'video' ? 'Video meeting' : 'In-person'} • {meetingData.attendees.length} attendee{meetingData.attendees.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{completedAgenda}/{meetingData.agendaItems.length} agenda</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{reviewedDocs}/{meetingData.documents.length} docs</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>{completedTasks}/{meetingData.preMeetingTasks.length} tasks</span>
            </div>
            {meetingData.type === 'video' && (
              <div className={`flex items-center space-x-1 ${
                meetingData.techCheckDone ? 'text-green-600' : 'text-orange-600'
              }`}>
                <Monitor className="h-3 w-3" />
                <span>{meetingData.techCheckDone ? 'Tech ready' : 'Tech check needed'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingPrepTemplate;