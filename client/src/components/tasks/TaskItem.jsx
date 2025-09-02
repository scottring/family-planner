import { useState } from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  User, 
  Edit3, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';

const TaskItem = ({ task, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toggleTaskComplete, deleteTask } = useTaskStore();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'high') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return null;
  };

  const handleToggleComplete = () => {
    toggleTaskComplete(task.id);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <div
      className={`border rounded-lg p-4 transition-all duration-200 ${
        task.completed 
          ? 'bg-gray-50 border-gray-200' 
          : 'bg-white border-gray-300 hover:shadow-md'
      } ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start space-x-3">
        <button
          onClick={handleToggleComplete}
          className={`mt-1 transition-colors ${
            task.completed 
              ? 'text-green-600 hover:text-green-700' 
              : 'text-gray-400 hover:text-green-600'
          }`}
        >
          {task.completed ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`font-medium ${
                task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}>
                {task.title}
              </h3>
              
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
                  <div className={`flex items-center space-x-1 text-xs ${
                    task.completed ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <User className="h-3 w-3" />
                    <span>{task.assignedTo}</span>
                  </div>
                )}
              </div>
            </div>

            {isHovered && !task.completed && (
              <div className="flex items-center space-x-1 ml-2">
                <button
                  onClick={() => onEdit(task)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit task"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;