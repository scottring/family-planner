import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  X, 
  Clock, 
  MapPin, 
  Users, 
  Package,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckSquare
} from 'lucide-react';
import { useConflictStore } from '../../stores/conflictStore';
import { format } from 'date-fns';

const ConflictAlert = ({ 
  showAll = false, 
  maxDisplay = 3, 
  onConflictClick,
  className = ''
}) => {
  const { 
    conflicts, 
    loading, 
    error, 
    fetchActiveConflicts,
    acknowledgeConflict,
    ignoreConflict,
    resolving,
    getSeverityColor,
    formatConflictType,
    formatConflictSeverity
  } = useConflictStore();

  const [expanded, setExpanded] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  useEffect(() => {
    fetchActiveConflicts();
  }, [fetchActiveConflicts]);

  // Filter out dismissed alerts
  const activeConflicts = conflicts.filter(c => !dismissedAlerts.has(c.id));

  // Sort conflicts by severity (critical first)
  const sortedConflicts = [...activeConflicts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const displayConflicts = showAll || expanded 
    ? sortedConflicts 
    : sortedConflicts.slice(0, maxDisplay);

  const remainingCount = sortedConflicts.length - maxDisplay;

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getConflictIcon = (type) => {
    switch (type) {
      case 'time_overlap':
        return <Clock className="h-4 w-4" />;
      case 'location_travel':
        return <MapPin className="h-4 w-4" />;
      case 'resource_conflict':
        return <Package className="h-4 w-4" />;
      case 'unassigned_critical':
        return <Users className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleDismiss = (conflictId, e) => {
    e.stopPropagation();
    setDismissedAlerts(prev => new Set([...prev, conflictId]));
  };

  const handleAcknowledge = async (conflictId, e) => {
    e.stopPropagation();
    try {
      await acknowledgeConflict(conflictId);
    } catch (error) {
      console.error('Failed to acknowledge conflict:', error);
    }
  };

  const handleIgnore = async (conflictId, e) => {
    e.stopPropagation();
    try {
      await ignoreConflict(conflictId);
    } catch (error) {
      console.error('Failed to ignore conflict:', error);
    }
  };

  if (loading) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-pulse h-4 w-4 bg-blue-300 rounded"></div>
          <span className="text-blue-800">Checking for conflicts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-red-800">Failed to load conflicts: {error}</span>
        </div>
      </div>
    );
  }

  if (activeConflicts.length === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800">No conflicts detected! Schedule looks good.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Summary Header */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">
              {activeConflicts.length} Schedule Conflict{activeConflicts.length > 1 ? 's' : ''} Detected
            </span>
          </div>
          {!showAll && remainingCount > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center space-x-1 text-yellow-700 hover:text-yellow-900 transition-colors"
            >
              <span className="text-sm">
                {expanded ? 'Show Less' : `Show ${remainingCount} More`}
              </span>
              {expanded ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </button>
          )}
        </div>
      </div>

      {/* Conflict List */}
      <div className="space-y-2">
        {displayConflicts.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            onDismiss={handleDismiss}
            onAcknowledge={handleAcknowledge}
            onIgnore={handleIgnore}
            onConflictClick={onConflictClick}
            resolving={resolving[conflict.id]}
            getSeverityColor={getSeverityColor}
            getSeverityIcon={getSeverityIcon}
            getConflictIcon={getConflictIcon}
            formatConflictType={formatConflictType}
            formatConflictSeverity={formatConflictSeverity}
          />
        ))}
      </div>
    </div>
  );
};

const ConflictCard = ({ 
  conflict, 
  onDismiss, 
  onAcknowledge, 
  onIgnore, 
  onConflictClick,
  resolving,
  getSeverityColor,
  getSeverityIcon,
  getConflictIcon,
  formatConflictType,
  formatConflictSeverity
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleCardClick = () => {
    if (onConflictClick) {
      onConflictClick(conflict);
    } else {
      setShowDetails(!showDetails);
    }
  };

  return (
    <div 
      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${getSeverityColor(conflict.severity)}`}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* Severity & Type Icons */}
          <div className="flex flex-col items-center space-y-1 flex-shrink-0">
            {getSeverityIcon(conflict.severity)}
            {getConflictIcon(conflict.type)}
          </div>

          {/* Conflict Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-sm">{conflict.title}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(conflict.severity)}`}>
                {formatConflictSeverity(conflict.severity)}
              </span>
              <span className="text-xs text-gray-600">
                {formatConflictType(conflict.type)}
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-2">{conflict.description}</p>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span>
                Detected: {format(new Date(conflict.detected_at), 'MMM d, HH:mm')}
              </span>
              {conflict.affected_events.length > 0 && (
                <span>
                  {conflict.affected_events.length} event{conflict.affected_events.length > 1 ? 's' : ''}
                </span>
              )}
              {conflict.affected_users.length > 0 && (
                <span>
                  {conflict.affected_users.length} person{conflict.affected_users.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Resolution Suggestions Preview */}
            {conflict.resolution_suggestions && conflict.resolution_suggestions.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">Quick suggestions:</div>
                <div className="text-xs text-gray-800">
                  • {conflict.resolution_suggestions[0]}
                  {conflict.resolution_suggestions.length > 1 && (
                    <span className="text-gray-600">
                      {' '}+{conflict.resolution_suggestions.length - 1} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Information */}
            {showDetails && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {conflict.resolution_suggestions && conflict.resolution_suggestions.length > 1 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">All Suggestions:</div>
                    <ul className="space-y-1">
                      {conflict.resolution_suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-gray-700">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {conflict.metadata && (
                  <div className="text-xs text-gray-600">
                    <div className="font-medium mb-1">Details:</div>
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(conflict.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
          {onConflictClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConflictClick(conflict);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="View details"
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
          
          <button
            onClick={(e) => onAcknowledge(conflict.id, e)}
            disabled={resolving}
            className="p-1 text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50"
            title="Acknowledge"
          >
            <CheckCircle className="h-3 w-3" />
          </button>
          
          <button
            onClick={(e) => onIgnore(conflict.id, e)}
            disabled={resolving}
            className="p-1 text-yellow-500 hover:text-yellow-700 transition-colors disabled:opacity-50"
            title="Ignore"
          >
            <Info className="h-3 w-3" />
          </button>
          
          <button
            onClick={(e) => onDismiss(conflict.id, e)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss alert"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictAlert;