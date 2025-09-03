import { useState } from 'react';
import ChecklistTemplates from '../components/checklists/ChecklistTemplates';

const ChecklistsPage = () => {
  const [activeView, setActiveView] = useState('templates');

  const handleApplyTemplate = (instance) => {
    console.log('Applied template:', instance);
    // Handle template application
  };

  const handleCreateNew = () => {
    console.log('Create new template');
    // Handle creating new template
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checklists</h1>
        <p className="text-gray-600">Manage your checklist templates and active checklists</p>
      </div>
      
      <ChecklistTemplates 
        onApplyTemplate={handleApplyTemplate}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
};

export default ChecklistsPage;