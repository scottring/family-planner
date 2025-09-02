import { Users, UserPlus, Mail, Phone } from 'lucide-react';

const FamilyPage = () => {
  // This would be replaced with actual family member data from the API
  const familyMembers = [
    {
      id: 1,
      name: 'John Doe',
      role: 'Parent',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      avatar: null,
    },
    {
      id: 2,
      name: 'Jane Doe',
      role: 'Parent',
      email: 'jane@example.com',
      phone: '(555) 123-4568',
      avatar: null,
    },
    {
      id: 3,
      name: 'Tommy Doe',
      role: 'Child',
      email: null,
      phone: null,
      avatar: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Family Members</h1>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlus className="h-4 w-4" />
          <span>Add Member</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {familyMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {member.avatar ? (
                  <img 
                    src={member.avatar} 
                    alt={member.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                    <Users className="h-8 w-8 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {member.email && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium">
                Edit Member
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Family Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{familyMembers.length}</div>
            <div className="text-sm text-blue-700">Total Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {familyMembers.filter(m => m.role === 'Parent').length}
            </div>
            <div className="text-sm text-blue-700">Parents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {familyMembers.filter(m => m.role === 'Child').length}
            </div>
            <div className="text-sm text-blue-700">Children</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyPage;