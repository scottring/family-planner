import { useState } from 'react';
import { Plus, X, Calendar, CheckSquare, Square } from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';

const ConditionalChecklist = ({ event, onUpdate, isEditing = false }) => {
  const [newItem, setNewItem] = useState({ text: '', conditions: [] });
  const [showAddForm, setShowAddForm] = useState(false);
  const { updateChecklistCompletion, updateEvent } = useEventStore();

  const structuredChecklist = event.structured_checklist || [];
  const completedItems = event.checklist_completed_items || [];

  const handleToggleComplete = async (itemId) => {
    try {
      const updatedEvent = await updateChecklistCompletion(
        event.id, 
        itemId, 
        !completedItems.includes(itemId)
      );
      onUpdate(updatedEvent);
    } catch (error) {
      console.error('Error updating checklist completion:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.text.trim()) return;

    const item = {
      id: Date.now().toString(), // Simple ID generation
      text: newItem.text,
      conditions: newItem.conditions
    };

    const updatedChecklist = [...structuredChecklist, item];
    
    try {
      const updatedEvent = await updateEvent(event.id, {
        structured_checklist: updatedChecklist
      });
      onUpdate(updatedEvent);
      
      setNewItem({ text: '', conditions: [] });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding checklist item:', error);
    }
  };

  const handleRemoveItem = async (itemId) => {
    const updatedChecklist = structuredChecklist.filter(item => item.id !== itemId);
    
    try {
      const updatedEvent = await updateEvent(event.id, {
        structured_checklist: updatedChecklist
      });
      onUpdate(updatedEvent);
    } catch (error) {
      console.error('Error removing checklist item:', error);
    }
  };

  const getConditionText = (conditions) => {
    if (!conditions || conditions.length === 0) return '';
    return conditions.map(condition => {
      if (condition.type === 'day') {
        return `${condition.days.join(', ')} only`;
      }
      if (condition.type === 'weather') {
        return `if ${condition.weather}`;
      }
      return condition.text || '';
    }).join(', ');
  };

  const shouldShowItem = (item, currentDay = null) => {
    if (!item.conditions || item.conditions.length === 0) return true;
    
    // For now, show all items. In a full implementation, we'd check:
    // - Current day of week
    // - Weather conditions
    // - Other conditional logic
    return true;
  };

  return (
    <div className="space-y-3">
      {/* Existing checklist items */}
      {structuredChecklist.length > 0 ? (
        structuredChecklist
          .filter(item => shouldShowItem(item))
          .map((item) => {
            const isCompleted = completedItems.includes(item.id);
            const conditionText = getConditionText(item.conditions);
            
            return (
              <div
                key={item.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${
                  isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => handleToggleComplete(item.id)}
                  className={`mt-0.5 p-1 rounded ${
                    isCompleted 
                      ? 'text-green-600 hover:text-green-800' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                
                <div className="flex-1">
                  <span
                    className={`${
                      isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}
                  >
                    {item.text}
                  </span>
                  
                  {conditionText && (
                    <div className="flex items-center mt-1 space-x-1">
                      <Calendar className="h-3 w-3 text-blue-500" />
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        {conditionText}
                      </span>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })
      ) : (
        <p className="text-gray-500 italic">No checklist items</p>
      )}

      {/* Add new item form */}
      {isEditing && (
        <div className="border-t pt-4">
          {showAddForm ? (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={newItem.text}
                onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
                placeholder="Add new checklist item..."
                className="w-full px-3 py-2 border rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              />
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Conditions (optional)</label>
                <div className="flex space-x-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const condition = { type: 'day', days: [e.target.value] };
                        setNewItem({ 
                          ...newItem, 
                          conditions: [...newItem.conditions, condition] 
                        });
                      }
                    }}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="">Add day condition...</option>
                    <option value="Monday">Monday only</option>
                    <option value="Tuesday">Tuesday only</option>
                    <option value="Wednesday">Wednesday only</option>
                    <option value="Thursday">Thursday only</option>
                    <option value="Friday">Friday only</option>
                    <option value="Saturday">Saturday only</option>
                    <option value="Sunday">Sunday only</option>
                    <option value="Weekdays">Weekdays only</option>
                    <option value="Weekends">Weekends only</option>
                  </select>
                </div>
                
                {newItem.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newItem.conditions.map((condition, index) => (
                      <span
                        key={index}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center space-x-1"
                      >
                        <span>{getConditionText([condition])}</span>
                        <button
                          onClick={() => {
                            const updated = newItem.conditions.filter((_, i) => i !== index);
                            setNewItem({ ...newItem, conditions: updated });
                          }}
                          className="hover:text-blue-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleAddItem}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Add Item
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItem({ text: '', conditions: [] });
                  }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4" />
              <span>Add checklist item</span>
            </button>
          )}
        </div>
      )}

      {/* Legacy checklist fallback */}
      {event.checklist && typeof event.checklist === 'string' && event.checklist.trim() && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Legacy Checklist</h4>
          <div className="space-y-2">
            {event.checklist.split('\n').map((item, index) => (
              <div key={index} className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionalChecklist;