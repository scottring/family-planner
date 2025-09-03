const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionButton,
  className = '' 
}) => {
  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      {Icon && (
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      
      {actionButton && (
        <div className="animate-fade-in delay-300">
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default EmptyState;