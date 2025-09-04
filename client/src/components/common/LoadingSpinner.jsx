import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'md', className = '', text = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-primary-600 animate-spin`} />
      {text && (
        <p className="text-sm sm:text-base text-gray-500 animate-pulse mobile-contrast">{text}</p>
      )}
    </div>
  );
};

// Skeleton loader components for better mobile performance
export const SkeletonEventCard = ({ className = '' }) => (
  <div className={`skeleton-card space-y-3 ${className}`}>
    <div className="flex justify-between items-start">
      <div className="flex-1 space-y-2">
        <div className="skeleton-text-lg w-3/4"></div>
        <div className="skeleton-text-sm w-1/2"></div>
      </div>
      <div className="skeleton w-12 h-6"></div>
    </div>
    <div className="flex justify-between">
      <div className="skeleton-text-sm w-1/4"></div>
      <div className="flex space-x-2">
        <div className="skeleton-circle w-6 h-6"></div>
        <div className="skeleton-circle w-6 h-6"></div>
      </div>
    </div>
  </div>
);

export const SkeletonDashboardCard = ({ className = '' }) => (
  <div className={`skeleton-card space-y-4 ${className}`}>
    <div className="flex items-center space-x-3">
      <div className="skeleton-circle w-10 h-10"></div>
      <div className="flex-1 space-y-2">
        <div className="skeleton-text w-1/2"></div>
        <div className="skeleton-text-sm w-3/4"></div>
      </div>
    </div>
  </div>
);

export const SkeletonButton = ({ className = '' }) => (
  <div className={`skeleton-button ${className}`}></div>
);

export const SkeletonText = ({ className = '', lines = 3 }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <div 
        key={index}
        className={`skeleton-text ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
      ></div>
    ))}
  </div>
);

export default LoadingSpinner;