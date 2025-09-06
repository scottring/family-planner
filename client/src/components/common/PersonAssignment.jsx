import { useState, useEffect, useRef } from 'react';
import { 
  User, 
  UserPlus, 
  UserCheck, 
  ChevronDown,
  X,
  Users,
  Check
} from 'lucide-react';
import { useFamilyStore } from '../../stores/familyStore';
import { useAuthStore } from '../../stores/authStore';

const PersonAssignment = ({ 
  value, // Current assignee ID or name
  onChange, // Callback when assignment changes
  placeholder = "Assign to...",
  showLabel = false,
  label = "Assigned to",
  compact = false,
  allowClear = true,
  allowMultiple = false,
  limitToIds = null, // Array of IDs to limit selection to
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  
  const { familyMembers, fetchFamilyMembers } = useFamilyStore();
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => {
    if (familyMembers.length === 0) {
      fetchFamilyMembers();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current assignee(s)
  const getAssignees = () => {
    if (!value) return [];
    
    if (allowMultiple && Array.isArray(value)) {
      return value.map(id => familyMembers.find(m => m.id === id)).filter(Boolean);
    }
    
    const assignee = familyMembers.find(m => m.id === value || m.name === value);
    return assignee ? [assignee] : [];
  };

  const assignees = getAssignees();

  // Filter members based on search and limitToIds
  const filteredMembers = familyMembers.filter(member => {
    // First check if we're limiting to specific IDs
    if (limitToIds && limitToIds.length > 0) {
      // Convert member ID to match the format used in limitToIds
      const memberId = `fm_${member.id}`;
      const userIdFormat = member.id;
      
      // Check if this member is in the allowed list (either as fm_ or plain ID)
      if (!limitToIds.includes(memberId) && !limitToIds.includes(userIdFormat) && !limitToIds.includes(member.id.toString())) {
        return false;
      }
    }
    
    // Then apply search filter
    if (!searchTerm) return true;
    return member.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelect = (member) => {
    if (allowMultiple) {
      const currentIds = Array.isArray(value) ? value : [];
      if (currentIds.includes(member.id)) {
        // Remove if already selected
        onChange(currentIds.filter(id => id !== member.id));
      } else {
        // Add to selection
        onChange([...currentIds, member.id]);
      }
    } else {
      onChange(member.id);
      setIsOpen(false);
    }
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange(allowMultiple ? [] : null);
    setIsOpen(false);
  };

  const getAvatarColor = (member) => {
    const colors = {
      'bg-blue-500': 'bg-blue-500',
      'bg-green-500': 'bg-green-500',
      'bg-purple-500': 'bg-purple-500',
      'bg-orange-500': 'bg-orange-500',
      'bg-pink-500': 'bg-pink-500',
      'bg-yellow-500': 'bg-yellow-500',
      'bg-indigo-500': 'bg-indigo-500',
      'bg-red-500': 'bg-red-500'
    };
    return colors[member.color] || 'bg-gray-500';
  };

  const renderAvatar = (member, size = 'sm') => {
    const sizeClasses = {
      xs: 'w-5 h-5 text-xs',
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base'
    };
    
    return (
      <div
        className={`${sizeClasses[size]} rounded-full ${getAvatarColor(member)} text-white flex items-center justify-center font-medium`}
        title={member.name}
      >
        {member.avatar || member.name[0].toUpperCase()}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          title={assignees.length > 0 ? `Assigned to ${assignees.map(a => a.name).join(', ')}` : 'Click to assign'}
        >
          {assignees.length > 0 ? (
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map(member => (
                <div key={member.id} className="relative">
                  {renderAvatar(member, 'xs')}
                </div>
              ))}
              {assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-gray-300 text-xs flex items-center justify-center text-gray-700">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          ) : (
            <UserPlus className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
          >
            {limitToIds && limitToIds.length > 0 && (
              <div className="px-3 py-1 text-xs text-blue-600 bg-blue-50 border-b border-blue-100">
                Limited to attendees only
              </div>
            )}
            {filteredMembers.map(member => (
              <button
                key={member.id}
                onClick={() => handleSelect(member)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
              >
                {renderAvatar(member, 'xs')}
                <span className="text-sm">{member.name}</span>
                {assignees.some(a => a.id === member.id) && (
                  <Check className="h-3 w-3 text-green-600 ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {assignees.length > 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {assignees.slice(0, allowMultiple ? 3 : 1).map(member => (
                      <div key={member.id}>
                        {renderAvatar(member)}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-gray-900">
                    {allowMultiple && assignees.length > 1
                      ? `${assignees[0].name} +${assignees.length - 1} more`
                      : assignees[0].name}
                  </span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{placeholder}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {allowClear && assignees.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Search input */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search family members..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Quick actions */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => handleSelect({ 
                  id: currentUser?.id, 
                  name: 'Me',
                  avatar: currentUser?.username?.[0]?.toUpperCase() || 'M',
                  color: 'bg-blue-500'
                })}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center space-x-2 text-sm"
              >
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span>Assign to me</span>
              </button>
              
              {allowMultiple && (
                <button
                  onClick={() => {
                    const allIds = filteredMembers.map(m => m.id);
                    onChange(allIds);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center space-x-2 text-sm"
                >
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Assign to everyone{limitToIds ? ' available' : ''}</span>
                </button>
              )}
              
              {assignees.length > 0 && (
                <button
                  onClick={handleClear}
                  className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center space-x-2 text-sm"
                >
                  <X className="h-4 w-4 text-red-600" />
                  <span>Clear assignment</span>
                </button>
              )}
            </div>

            {/* Family members list */}
            <div className="max-h-48 overflow-y-auto">
              {filteredMembers.length > 0 ? (
                filteredMembers.map(member => {
                  const isSelected = assignees.some(a => a.id === member.id);
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleSelect(member)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      {renderAvatar(member)}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {member.name}
                          {member.id === currentUser?.id && (
                            <span className="ml-1 text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        {member.type && (
                          <div className="text-xs text-gray-500 capitalize">
                            {member.type}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No family members found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonAssignment;