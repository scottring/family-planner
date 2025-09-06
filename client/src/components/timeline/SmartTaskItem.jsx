import { useState } from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  User, 
  Edit3, 
  Trash2, 
  AlertCircle,
  Car,
  ShoppingCart,
  Users,
  Video,
  LayoutTemplate
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useFamilyStore } from '../../stores/familyStore';
import PersonAssignment from '../common/PersonAssignment';
import DrivingTaskTemplate from './templates/DrivingTaskTemplate';
import ShoppingTaskTemplate from './templates/ShoppingTaskTemplate';
import PickupDropoffTemplate from './templates/PickupDropoffTemplate';
import MeetingPrepTemplate from './templates/MeetingPrepTemplate';

const SmartTaskItem = ({ task, onEdit, event }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toggleTaskComplete, deleteTask, updateTask } = useTaskStore();
  const { getFamilyMemberById } = useFamilyStore();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-error-700 bg-error-100/80 border-error-200 shadow-error/10';
      case 'medium':
        return 'text-warning-700 bg-warning-100/80 border-warning-200 shadow-warm/10';
      case 'low':
        return 'text-success-700 bg-success-100/80 border-success-200 shadow-success/10';
      default:
        return 'text-primary-700 bg-primary-100/80 border-primary-200 shadow-primary/10';
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'high') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return null;
  };

  const getTemplateIcon = (templateType) => {
    switch (templateType) {
      case 'driving':
        return <Car className="h-4 w-4" />;
      case 'shopping':
        return <ShoppingCart className="h-4 w-4" />;
      case 'pickup':
        return <Users className="h-4 w-4" />;
      case 'meeting':
        return <Video className="h-4 w-4" />;
      default:
        return <LayoutTemplate className="h-4 w-4" />;
    }
  };

  const getTemplateColor = (templateType) => {
    switch (templateType) {
      case 'driving':
        return 'text-blue-700 bg-blue-100/80 border-blue-200';
      case 'shopping':
        return 'text-green-700 bg-green-100/80 border-green-200';
      case 'pickup':
        return 'text-orange-700 bg-orange-100/80 border-orange-200';
      case 'meeting':
        return 'text-purple-700 bg-purple-100/80 border-purple-200';
      default:
        return 'text-purple-700 bg-purple-100/80 border-purple-200';
    }
  };

  const handleToggleComplete = () => {
    toggleTaskComplete(task.id);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
    }
  };

  const handleTemplateUpdate = (updatedTask) => {
    // This will be called when the template component updates the task
    // The actual update is handled within the template component
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  const hasTemplate = task.templateType && task.templateType !== 'none';

  // Render template component based on type
  const renderTemplate = () => {
    if (!hasTemplate || !isExpanded) return null;

    switch (task.templateType) {
      case 'driving':
        return (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <DrivingTaskTemplate 
              task={task} 
              onUpdate={handleTemplateUpdate}
              event={event}
              className="shadow-none border-none p-0"
            />
          </div>
        );
      case 'shopping':
        return (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <ShoppingTaskTemplate 
              task={task} 
              onUpdate={handleTemplateUpdate}
              className="shadow-none border-none p-0"
            />
          </div>
        );
      case 'pickup':
        return (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <PickupDropoffTemplate 
              task={task} 
              onUpdate={handleTemplateUpdate}
              className="shadow-none border-none p-0"
            />
          </div>
        );
      case 'meeting':
        return (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <MeetingPrepTemplate 
              task={task} 
              onUpdate={handleTemplateUpdate}
              className="shadow-none border-none p-0"
            />
          </div>
        );
      default:
        return (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Template type "{task.templateType}" not yet implemented.
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className={`group border rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.01] animate-fade-in ${
        task.completed 
          ? 'bg-gradient-to-r from-gray-50 to-gray-100/50 border-gray-200 shadow-sm' 
          : 'bg-white border-gray-200 hover:shadow-lg card-hover'
      } ${isOverdue ? 'border-error-300 bg-gradient-to-r from-error-50 to-error-100/30 shadow-error/10' : 'shadow-sm'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start space-x-3">
        <button
          onClick={handleToggleComplete}
          className={`mt-1 p-2 rounded-xl transition-all duration-300 transform hover:scale-110 ${
            task.completed 
              ? 'text-success-600 bg-success-100/50 hover:bg-success-100 shadow-success/20 animate-bounce-gentle' 
              : 'text-gray-400 hover:text-success-600 hover:bg-success-50'
          }`}
        >
          {task.completed ? (
            <CheckCircle2 className="h-6 w-6 animate-checkmark" />
          ) : (
            <Circle className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className={`font-medium ${
                  task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}>
                  {task.title}
                </h3>
                {hasTemplate && (
                  <button
                    onClick={toggleExpanded}
                    className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border transition-all duration-200 ${getTemplateColor(task.templateType)} hover:scale-105`}
                    title={`${task.templateType} template - click to ${isExpanded ? 'collapse' : 'expand'}`}
                  >
                    {getTemplateIcon(task.templateType)}
                    <span className="capitalize">{task.templateType}</span>
                  </button>
                )}
              </div>
              
              {task.description && (
                <p className={`mt-1 text-sm ${
                  task.completed ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {task.description}
                </p>
              )}

              <div className="flex items-center space-x-4 mt-3">
                {task.priority && (
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                    {getPriorityIcon(task.priority)}
                    <span className="capitalize">{task.priority}</span>
                  </span>
                )}

                {task.dueDate && (
                  <div className={`flex items-center space-x-1 text-xs ${
                    isOverdue ? 'text-red-600' : task.completed ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    </span>
                    {isOverdue && (
                      <span className="text-red-600 font-medium">(Overdue)</span>
                    )}
                  </div>
                )}

                {task.assignedTo && (
                  <PersonAssignment
                    value={task.assignedTo}
                    onChange={(assigneeId) => {
                      updateTask(task.id, { ...task, assignedTo: assigneeId });
                      if (onEdit) {
                        onEdit({ ...task, assignedTo: assigneeId });
                      }
                    }}
                    compact={true}
                  />
                )}
              </div>
            </div>

            <div className={`flex items-center space-x-2 ml-2 transition-all duration-300 ${
              isHovered && !task.completed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
            }`}>
              <button
                onClick={() => onEdit(task)}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                title="Edit task"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Render template component if expanded */}
      {renderTemplate()}
    </div>
  );
};

export default SmartTaskItem;