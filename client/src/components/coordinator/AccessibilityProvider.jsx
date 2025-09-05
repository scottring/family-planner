import { createContext, useContext, useState, useEffect } from 'react';

// Accessibility context
const AccessibilityContext = createContext();

// Accessibility settings
const DEFAULT_SETTINGS = {
  highContrast: false,
  textSize: 'medium', // 'small', 'medium', 'large', 'extra-large'
  reducedMotion: false,
  screenReaderMode: false,
  keyboardNavigation: true,
  voiceAnnouncements: false,
  colorBlindSupport: false,
  focusIndicators: true,
  buttonSize: 'medium', // 'small', 'medium', 'large'
  touchTargetSize: 44, // minimum 44px for accessibility
};

// Text size mappings
const TEXT_SIZE_CLASSES = {
  small: {
    base: 'text-sm',
    heading: 'text-base',
    title: 'text-lg',
    large: 'text-xl'
  },
  medium: {
    base: 'text-base',
    heading: 'text-lg',
    title: 'text-xl',
    large: 'text-2xl'
  },
  large: {
    base: 'text-lg',
    heading: 'text-xl',
    title: 'text-2xl',
    large: 'text-3xl'
  },
  'extra-large': {
    base: 'text-xl',
    heading: 'text-2xl',
    title: 'text-3xl',
    large: 'text-4xl'
  }
};

// High contrast color schemes
const HIGH_CONTRAST_CLASSES = {
  background: 'bg-black text-white',
  surface: 'bg-gray-900 text-white border-white',
  primary: 'bg-yellow-400 text-black',
  secondary: 'bg-white text-black',
  success: 'bg-green-400 text-black',
  warning: 'bg-yellow-300 text-black',
  error: 'bg-red-400 text-black',
  muted: 'text-gray-300'
};

// Button size mappings
const BUTTON_SIZE_CLASSES = {
  small: 'px-2 py-1 text-sm',
  medium: 'px-3 py-2 text-base',
  large: 'px-4 py-3 text-lg min-h-[44px] min-w-[44px]'
};

export const AccessibilityProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState([]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }

    // Check for OS-level preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    if (prefersReducedMotion || prefersHighContrast) {
      setSettings(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion,
        highContrast: prefersHighContrast
      }));
    }
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    
    // Apply global CSS classes
    const html = document.documentElement;
    
    // High contrast mode
    if (settings.highContrast) {
      html.classList.add('high-contrast-mode');
    } else {
      html.classList.remove('high-contrast-mode');
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      html.classList.add('reduced-motion');
    } else {
      html.classList.remove('reduced-motion');
    }
    
    // Text size
    html.setAttribute('data-text-size', settings.textSize);
    
    // Focus indicators
    if (settings.focusIndicators) {
      html.classList.add('focus-indicators');
    } else {
      html.classList.remove('focus-indicators');
    }
    
  }, [settings]);

  // Screen reader announcements
  const announce = (message, priority = 'polite') => {
    if (!settings.voiceAnnouncements && !settings.screenReaderMode) return;
    
    const announcement = {
      id: Date.now(),
      message,
      priority,
      timestamp: new Date()
    };
    
    setAnnouncements(prev => [...prev, announcement]);
    
    // Remove announcement after it's been announced
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);
    
    // Also log to console for debugging
    console.log(`[A11Y Announcement]: ${message}`);
  };

  // Update individual setting
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    announce(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`);
  };

  // Get text size classes for current setting
  const getTextSizeClass = (variant = 'base') => {
    return TEXT_SIZE_CLASSES[settings.textSize]?.[variant] || TEXT_SIZE_CLASSES.medium[variant];
  };

  // Get high contrast classes
  const getContrastClass = (variant = 'background') => {
    if (!settings.highContrast) return '';
    return HIGH_CONTRAST_CLASSES[variant] || '';
  };

  // Get button size classes
  const getButtonSizeClass = () => {
    return BUTTON_SIZE_CLASSES[settings.buttonSize] || BUTTON_SIZE_CLASSES.medium;
  };

  // Get accessible button props
  const getAccessibleButtonProps = (label, onClick, options = {}) => {
    const minSize = Math.max(settings.touchTargetSize, 44);
    
    return {
      'aria-label': label,
      onClick: (e) => {
        if (settings.voiceAnnouncements) {
          announce(`${label} activated`);
        }
        onClick?.(e);
      },
      className: `
        ${getButtonSizeClass()}
        ${getContrastClass('primary')}
        ${settings.focusIndicators ? 'focus:ring-2 focus:ring-offset-2' : ''}
        ${options.className || ''}
      `.trim(),
      style: {
        minHeight: `${minSize}px`,
        minWidth: `${minSize}px`,
        ...options.style
      },
      tabIndex: settings.keyboardNavigation ? 0 : -1
    };
  };

  // Get accessible input props
  const getAccessibleInputProps = (label, options = {}) => {
    return {
      'aria-label': label,
      className: `
        ${getTextSizeClass()}
        ${getContrastClass('surface')}
        ${settings.focusIndicators ? 'focus:ring-2 focus:ring-offset-2' : ''}
        ${options.className || ''}
      `.trim(),
      style: {
        fontSize: settings.textSize === 'extra-large' ? '18px' : '16px', // Prevent zoom on mobile
        ...options.style
      }
    };
  };

  // Keyboard navigation handler
  const handleKeyboardNavigation = (event, onActivate) => {
    if (!settings.keyboardNavigation) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate?.(event);
      
      if (settings.voiceAnnouncements) {
        const label = event.target.getAttribute('aria-label') || 'Item';
        announce(`${label} activated`);
      }
    }
  };

  // Color blind support - convert colors to accessible alternatives
  const getColorBlindFriendlyColor = (color) => {
    if (!settings.colorBlindSupport) return color;
    
    const colorMap = {
      red: '#d73027',    // More distinguishable red
      green: '#1a9641',  // More distinguishable green
      blue: '#2166ac',   // More distinguishable blue
      yellow: '#fee08b', // More distinguishable yellow
      orange: '#fd8d3c', // More distinguishable orange
    };
    
    return colorMap[color] || color;
  };

  // Context value
  const value = {
    settings,
    updateSetting,
    announce,
    getTextSizeClass,
    getContrastClass,
    getButtonSizeClass,
    getAccessibleButtonProps,
    getAccessibleInputProps,
    handleKeyboardNavigation,
    getColorBlindFriendlyColor,
    TEXT_SIZE_CLASSES,
    HIGH_CONTRAST_CLASSES,
    BUTTON_SIZE_CLASSES
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      
      {/* Screen reader live region for announcements */}
      <div
        aria-live={settings.screenReaderMode ? 'assertive' : 'polite'}
        aria-atomic="true"
        className="sr-only"
      >
        {announcements.map(announcement => (
          <div key={announcement.id} role="status">
            {announcement.message}
          </div>
        ))}
      </div>
      
      {/* CSS for accessibility features */}
      <style jsx global>{`
        .high-contrast-mode {
          filter: contrast(150%) brightness(150%);
        }
        
        .reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        
        .focus-indicators *:focus {
          outline: 3px solid #4A90E2 !important;
          outline-offset: 2px !important;
        }
        
        .focus-indicators *:focus-visible {
          outline: 3px solid #4A90E2 !important;
          outline-offset: 2px !important;
        }
        
        /* Screen reader only class */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        /* Skip link for keyboard navigation */
        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: #fff;
          padding: 8px;
          text-decoration: none;
          border-radius: 4px;
          z-index: 9999;
        }
        
        .skip-link:focus {
          top: 6px;
        }
        
        /* High contrast mode overrides */
        .high-contrast-mode .bg-white {
          background-color: #000 !important;
          color: #fff !important;
        }
        
        .high-contrast-mode .bg-gray-50,
        .high-contrast-mode .bg-gray-100,
        .high-contrast-mode .bg-gray-200 {
          background-color: #333 !important;
          color: #fff !important;
        }
        
        .high-contrast-mode .text-gray-500,
        .high-contrast-mode .text-gray-600,
        .high-contrast-mode .text-gray-700 {
          color: #fff !important;
        }
        
        .high-contrast-mode button {
          border: 2px solid #fff !important;
        }
        
        /* Large text mode */
        [data-text-size="large"] {
          font-size: 120%;
        }
        
        [data-text-size="extra-large"] {
          font-size: 140%;
        }
        
        /* Ensure minimum touch target size */
        button, [role="button"], input, select, textarea, a {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Color blind friendly colors */
        .colorblind-red { color: #d73027 !important; }
        .colorblind-green { color: #1a9641 !important; }
        .colorblind-blue { color: #2166ac !important; }
        .colorblind-yellow { color: #fee08b !important; }
        .colorblind-orange { color: #fd8d3c !important; }
      `}</style>
    </AccessibilityContext.Provider>
  );
};

// Hook to use accessibility context
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Accessibility settings component
export const AccessibilitySettings = ({ onClose }) => {
  const { settings, updateSetting, getTextSizeClass, getContrastClass, getAccessibleButtonProps } = useAccessibility();

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
      <div className={`
        bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto
        ${getContrastClass('surface')}
      `}>
        <h2 className={`font-bold mb-4 ${getTextSizeClass('title')}`}>
          Accessibility Settings
        </h2>
        
        <div className="space-y-4">
          {/* High Contrast */}
          <label className="flex items-center justify-between">
            <span className={getTextSizeClass()}>High Contrast Mode</span>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => updateSetting('highContrast', e.target.checked)}
              className="w-5 h-5"
              aria-label="Enable high contrast mode"
            />
          </label>
          
          {/* Text Size */}
          <div>
            <label className={`block mb-2 ${getTextSizeClass()}`}>
              Text Size
            </label>
            <select
              value={settings.textSize}
              onChange={(e) => updateSetting('textSize', e.target.value)}
              className={`w-full p-2 border rounded ${getTextSizeClass()} ${getContrastClass('surface')}`}
              aria-label="Select text size"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
          
          {/* Reduced Motion */}
          <label className="flex items-center justify-between">
            <span className={getTextSizeClass()}>Reduce Motion</span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
              className="w-5 h-5"
              aria-label="Reduce motion and animations"
            />
          </label>
          
          {/* Screen Reader Mode */}
          <label className="flex items-center justify-between">
            <span className={getTextSizeClass()}>Screen Reader Mode</span>
            <input
              type="checkbox"
              checked={settings.screenReaderMode}
              onChange={(e) => updateSetting('screenReaderMode', e.target.checked)}
              className="w-5 h-5"
              aria-label="Enable screen reader optimizations"
            />
          </label>
          
          {/* Voice Announcements */}
          <label className="flex items-center justify-between">
            <span className={getTextSizeClass()}>Voice Announcements</span>
            <input
              type="checkbox"
              checked={settings.voiceAnnouncements}
              onChange={(e) => updateSetting('voiceAnnouncements', e.target.checked)}
              className="w-5 h-5"
              aria-label="Enable voice announcements for actions"
            />
          </label>
          
          {/* Color Blind Support */}
          <label className="flex items-center justify-between">
            <span className={getTextSizeClass()}>Color Blind Support</span>
            <input
              type="checkbox"
              checked={settings.colorBlindSupport}
              onChange={(e) => updateSetting('colorBlindSupport', e.target.checked)}
              className="w-5 h-5"
              aria-label="Enable color blind friendly colors"
            />
          </label>
          
          {/* Button Size */}
          <div>
            <label className={`block mb-2 ${getTextSizeClass()}`}>
              Button Size
            </label>
            <select
              value={settings.buttonSize}
              onChange={(e) => updateSetting('buttonSize', e.target.value)}
              className={`w-full p-2 border rounded ${getTextSizeClass()} ${getContrastClass('surface')}`}
              aria-label="Select button size"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large (Recommended)</option>
            </select>
          </div>
        </div>
        
        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            {...getAccessibleButtonProps('Close accessibility settings', onClose, {
              className: 'bg-blue-600 text-white rounded hover:bg-blue-700'
            })}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityProvider;