import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  User, 
  Calendar,
  Edit3,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  List,
  Check
} from 'lucide-react';
import calendarAccountsService from '../../services/calendarAccounts';

const CalendarAccountManager = () => {
  const [accounts, setAccounts] = useState([]);
  const [contexts, setContexts] = useState({});
  const [availableContexts, setAvailableContexts] = useState(['work', 'personal', 'family']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [calendarData, setCalendarData] = useState({});
  const [loadingCalendars, setLoadingCalendars] = useState({});
  const [calendarSelections, setCalendarSelections] = useState({});
  const [savingSelections, setSavingSelections] = useState({});

  useEffect(() => {
    loadAccounts();
    loadContexts();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const loadAccounts = async () => {
    try {
      const accountData = await calendarAccountsService.getAccounts();
      setAccounts(accountData);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      // Don't show error for initial load
    }
  };

  const loadContexts = async () => {
    try {
      const contextData = await calendarAccountsService.getContexts();
      setContexts(contextData.contexts);
      setAvailableContexts(contextData.availableContexts);
    } catch (err) {
      console.error('Failed to load contexts:', err);
      // Don't show error for initial load
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    setAddingAccount(true);
    clearMessages();
    
    try {
      const result = await calendarAccountsService.addAccount(
        `Account ${accounts.length + 1}`,
        false
      );

      if (result.success && !result.mockMode) {
        // Real OAuth flow initiated
        setSuccess(result.message || 'Redirecting to Google...');
        // The redirect will happen from the service
      } else if (result.mockMode) {
        // Edge Functions not available
        setError(result.message || 'Google Calendar integration not available');
      } else if (!result.success) {
        setError(result.message || 'Failed to connect Google Calendar');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingAccount(false);
    }
  };

  const handleRemoveAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to remove this calendar account?')) {
      return;
    }

    clearMessages();
    
    try {
      await calendarAccountsService.removeAccount(accountId);
      setSuccess('Calendar account removed successfully');
      await loadAccounts();
      await loadContexts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetContext = async (accountId, context) => {
    clearMessages();
    
    try {
      await calendarAccountsService.setContext(accountId, context);
      setSuccess(`Account set as default for ${context} context`);
      await loadContexts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveContext = async (accountId, context) => {
    clearMessages();
    
    try {
      await calendarAccountsService.removeContext(accountId, context);
      setSuccess(`Removed ${context} context assignment`);
      await loadContexts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditDisplayName = async (accountId) => {
    clearMessages();
    
    try {
      await calendarAccountsService.updateDisplayName(accountId, newDisplayName);
      setSuccess('Account display name updated successfully');
      setEditingAccount(null);
      setNewDisplayName('');
      await loadAccounts();
    } catch (err) {
      setError(err.message);
    }
  };

  const getContextsForAccount = (accountId) => {
    return Object.entries(contexts)
      .filter(([, contextData]) => contextData?.accountId === accountId)
      .map(([contextName]) => contextName);
  };

  const getAvailableContextsForAccount = (accountId) => {
    const usedContexts = getContextsForAccount(accountId);
    return availableContexts.filter(context => !contexts[context] || contexts[context]?.accountId === accountId);
  };

  const toggleAccountExpansion = (accountId) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
      // Load calendars when expanding for the first time
      if (!calendarData[accountId]) {
        loadCalendarsForAccount(accountId);
      }
    }
    setExpandedAccounts(newExpanded);
  };

  const loadCalendarsForAccount = async (accountId) => {
    setLoadingCalendars(prev => ({ ...prev, [accountId]: true }));
    clearMessages();
    
    try {
      const result = await calendarAccountsService.getCalendars(accountId);
      
      setCalendarData(prev => ({
        ...prev,
        [accountId]: result.calendars
      }));

      // Initialize selections state
      const selections = {};
      result.calendars.forEach(calendar => {
        selections[calendar.id] = {
          selected: calendar.selected,
          contexts: calendar.contexts || []
        };
      });
      
      setCalendarSelections(prev => ({
        ...prev,
        [accountId]: selections
      }));

    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCalendars(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const updateCalendarSelection = (accountId, calendarId, context, isSelected) => {
    setCalendarSelections(prev => {
      const accountSelections = { ...prev[accountId] };
      const calendarSelection = { ...accountSelections[calendarId] };
      
      if (isSelected) {
        // Add context if not already present
        if (!calendarSelection.contexts.includes(context)) {
          calendarSelection.contexts = [...calendarSelection.contexts, context];
        }
      } else {
        // Remove context
        calendarSelection.contexts = calendarSelection.contexts.filter(c => c !== context);
      }
      
      calendarSelection.selected = calendarSelection.contexts.length > 0;
      accountSelections[calendarId] = calendarSelection;
      
      return {
        ...prev,
        [accountId]: accountSelections
      };
    });
  };

  const saveCalendarSelections = async (accountId) => {
    setSavingSelections(prev => ({ ...prev, [accountId]: true }));
    clearMessages();
    
    try {
      const accountSelections = calendarSelections[accountId];
      const selections = Object.entries(accountSelections)
        .filter(([calendarId, selection]) => selection.contexts.length > 0)
        .map(([calendarId, selection]) => {
          const calendar = calendarData[accountId]?.find(c => c.id === calendarId);
          return {
            calendarId,
            calendarName: calendar?.summary || 'Unknown Calendar',
            contexts: selection.contexts
          };
        });
      
      await calendarAccountsService.saveCalendarSelections(accountId, selections);
      setSuccess('Calendar selections saved successfully');
      await loadContexts(); // Reload contexts to reflect changes
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSelections(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const hasUnsavedChanges = (accountId) => {
    const accountSelections = calendarSelections[accountId];
    const calendars = calendarData[accountId];
    
    if (!accountSelections || !calendars) return false;
    
    return calendars.some(calendar => {
      const currentSelection = accountSelections[calendar.id];
      const originalContexts = calendar.contexts || [];
      const currentContexts = currentSelection?.contexts || [];
      
      // Check if contexts have changed
      if (originalContexts.length !== currentContexts.length) return true;
      return originalContexts.some(context => !currentContexts.includes(context)) ||
             currentContexts.some(context => !originalContexts.includes(context));
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading calendar accounts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Calendar Accounts</h3>
            <p className="text-sm text-gray-600">
              Manage multiple Google Calendar accounts and assign them to different contexts
            </p>
          </div>
          <button
            onClick={handleAddAccount}
            disabled={addingAccount}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {addingAccount ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Calendar Accounts</h4>
            <p className="text-gray-600 mb-4">
              Add a Google Calendar account to get started with calendar sync.
            </p>
            <button
              onClick={handleAddAccount}
              disabled={addingAccount}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {addingAccount ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Adding Account...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Account
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => {
              const accountContexts = getContextsForAccount(account.id);
              const availableContextsForThisAccount = getAvailableContextsForAccount(account.id);
              
              return (
                <div
                  key={account.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {editingAccount === account.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Display name"
                              />
                              <button
                                onClick={() => handleEditDisplayName(account.id)}
                                className="p-1 text-green-600 hover:text-green-700"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingAccount(null);
                                  setNewDisplayName('');
                                }}
                                className="p-1 text-gray-600 hover:text-gray-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {account.display_name || account.google_account_email}
                              </h4>
                              <button
                                onClick={() => {
                                  setEditingAccount(account.id);
                                  setNewDisplayName(account.display_name || '');
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 truncate">
                          {account.google_account_email}
                        </p>
                        
                        {/* Context assignments */}
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {accountContexts.map((context) => (
                              <span
                                key={context}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {context}
                                <button
                                  onClick={() => handleRemoveContext(account.id, context)}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Context assignment dropdown */}
                        {availableContextsForThisAccount.length > accountContexts.length && (
                          <div className="mt-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleSetContext(account.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                              defaultValue=""
                            >
                              <option value="">Assign to context...</option>
                              {availableContextsForThisAccount
                                .filter(context => !accountContexts.includes(context))
                                .map((context) => (
                                <option key={context} value={context}>
                                  {context.charAt(0).toUpperCase() + context.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center text-xs text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Connected
                      </div>
                      
                      <button
                        onClick={() => toggleAccountExpansion(account.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Select calendars"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleRemoveAccount(account.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Calendar Selection Interface */}
                  {expandedAccounts.has(account.id) && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-900 flex items-center">
                          {expandedAccounts.has(account.id) ? (
                            <ChevronDown className="w-4 h-4 mr-1" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mr-1" />
                          )}
                          Select Calendars
                        </h5>
                        {hasUnsavedChanges(account.id) && (
                          <button
                            onClick={() => saveCalendarSelections(account.id)}
                            disabled={savingSelections[account.id]}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                          >
                            {savingSelections[account.id] ? (
                              <>
                                <Loader className="w-3 h-3 animate-spin mr-1" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-3 h-3 mr-1" />
                                Save Changes
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {loadingCalendars[account.id] ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                          <span className="text-sm text-gray-600">Loading calendars...</span>
                        </div>
                      ) : calendarData[account.id] && calendarData[account.id].length > 0 ? (
                        <div className="space-y-3">
                          {calendarData[account.id].map((calendar) => (
                            <div
                              key={calendar.id}
                              className="border border-gray-200 rounded-md p-3 hover:border-gray-300 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <h6 className="text-sm font-medium text-gray-900 truncate">
                                        {calendar.summary}
                                        {calendar.primary && (
                                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                            Primary
                                          </span>
                                        )}
                                      </h6>
                                      {calendar.description && (
                                        <p className="text-xs text-gray-500 truncate mt-1">
                                          {calendar.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="pl-6">
                                    <p className="text-xs text-gray-600 mb-2">Assign to contexts:</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {availableContexts.map((context) => {
                                        const isSelected = calendarSelections[account.id]?.[calendar.id]?.contexts?.includes(context) || false;
                                        return (
                                          <label
                                            key={context}
                                            className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={(e) => updateCalendarSelection(
                                                account.id,
                                                calendar.id,
                                                context,
                                                e.target.checked
                                              )}
                                              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="capitalize text-gray-700">
                                              {context}
                                            </span>
                                            {isSelected && (
                                              <Check className="w-3 h-3 text-green-500" />
                                            )}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No calendars found</p>
                          <p className="text-xs text-gray-500">
                            Make sure your Google account has accessible calendars
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Context overview */}
        {Object.keys(contexts).length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Context Assignments</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableContexts.map((context) => {
                const contextData = contexts[context];
                return (
                  <div
                    key={context}
                    className="p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {context}
                      </span>
                      {contextData && (
                        <span className="text-xs text-green-600 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Assigned
                        </span>
                      )}
                    </div>
                    
                    {contextData ? (
                      <div className="text-xs text-gray-600">
                        <div className="font-medium">{contextData.displayName}</div>
                        <div className="text-gray-500 truncate">{contextData.email}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        No account assigned
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarAccountManager;