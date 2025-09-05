import { useState, useEffect, useRef } from 'react';
import { Settings, Accessibility } from 'lucide-react';
import PreparationTimeline from './PreparationTimeline';
import MobileTimeline from './MobileTimeline';
import TabletDashboard from './TabletDashboard';
import SmartWatchView from './SmartWatchView';
import AccessibilityProvider, { useAccessibility, AccessibilitySettings } from './AccessibilityProvider';
import voiceService from '../../services/voiceService';

// Device detection hook
const useDeviceDetection = () => {
  const [device, setDevice] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;
      
      setViewportSize({ width, height });
      setOrientation(width > height ? 'landscape' : 'portrait');

      // Enhanced device detection
      if (width <= 280) {
        setDevice('watch'); // Smart watch
      } else if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        if (width <= 768) {
          setDevice('mobile');
        } else {
          setDevice('tablet');
        }
      } else if (width <= 768) {
        setDevice('mobile');
      } else if (width <= 1024) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return { device, orientation, viewportSize };
};

// URL parameter detection for forced modes
const useViewMode = () => {
  const [forcedMode, setForcedMode] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (['mobile', 'tablet', 'watch', 'desktop'].includes(mode)) {
      setForcedMode(mode);
    }
  }, []);

  return forcedMode;
};

// Voice integration hook
const useVoiceIntegration = (event, socket) => {
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState(null);

  useEffect(() => {
    setVoiceSupported(voiceService.isVoiceSupported());
  }, []);

  const handleVoiceCommand = async (command) => {
    if (!event?.id) return;

    try {
      setLastVoiceCommand(command);
      
      // Send to voice timeline API
      const response = await fetch(`/api/voice-timeline/query/${event.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: command, voice: true })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Announce response
        if (result.response?.text) {
          await voiceService.speak(result.response.text, {
            rate: 0.9,
            pitch: 1.0
          });
        }

        // Execute action if provided
        if (result.response?.action && result.response?.data) {
          await executeVoiceAction(result.response.action, result.response.data);
        }
      }
    } catch (error) {
      console.error('Voice command error:', error);
      await voiceService.speak('Sorry, I couldn\'t process that command.');
    }
  };

  const executeVoiceAction = async (action, data) => {
    if (!event?.id) return;

    try {
      const response = await fetch(`/api/voice-timeline/action/${event.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, data })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.message) {
          await voiceService.speak(result.message);
        }
      }
    } catch (error) {
      console.error('Voice action error:', error);
    }
  };

  const startVoiceListening = async () => {
    if (!voiceSupported || isListening) return;

    try {
      setIsListening(true);
      
      const command = await voiceService.startVoiceRecognition({
        onResult: (result) => {
          console.log('Voice input:', result);
        },
        onError: (error) => {
          console.error('Voice recognition error:', error);
          setIsListening(false);
        }
      });

      if (command && command.trim()) {
        await handleVoiceCommand(command.trim());
      }
    } catch (error) {
      console.error('Voice listening error:', error);
      await voiceService.speak('Voice input failed. Please try again.');
    } finally {
      setIsListening(false);
    }
  };

  const stopVoiceListening = () => {
    voiceService.stopListening();
    setIsListening(false);
  };

  return {
    isListening,
    voiceSupported,
    lastVoiceCommand,
    startVoiceListening,
    stopVoiceListening
  };
};

// Main multi-modal timeline component (wrapped)
const MultiModalTimelineInner = ({ event, socket, className = '' }) => {
  const { device, orientation, viewportSize } = useDeviceDetection();
  const forcedMode = useViewMode();
  const { settings, announce, getAccessibleButtonProps } = useAccessibility();
  const [showSettings, setShowSettings] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const voiceIntegration = useVoiceIntegration(event, socket);
  
  // Determine which view to show
  const activeDevice = forcedMode || device;
  
  // Device-specific props
  const getDeviceProps = () => {
    const baseProps = { event, socket, className };
    
    switch (activeDevice) {
      case 'watch':
        return {
          ...baseProps,
          className: `${className} w-48 h-48 mx-auto`
        };
      case 'mobile':
        return {
          ...baseProps,
          className: `${className} max-w-sm mx-auto`
        };
      case 'tablet':
        return {
          ...baseProps,
          className: `${className} min-h-screen`
        };
      default:
        return baseProps;
    }
  };

  // Voice command button
  const VoiceButton = () => {
    if (!voiceIntegration.voiceSupported) return null;

    return (
      <button
        {...getAccessibleButtonProps(
          voiceIntegration.isListening ? 'Stop voice input' : 'Start voice input',
          voiceIntegration.isListening ? voiceIntegration.stopVoiceListening : voiceIntegration.startVoiceListening,
          {
            className: `p-3 rounded-full transition-colors ${
              voiceIntegration.isListening 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white shadow-lg`
          }
        )}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            voiceIntegration.isListening ? 'bg-white animate-pulse' : 'bg-white'
          }`} />
          {activeDevice !== 'watch' && (
            <span className="text-sm font-medium">
              {voiceIntegration.isListening ? 'Listening...' : 'Voice'}
            </span>
          )}
        </div>
      </button>
    );
  };

  // Settings panel
  const SettingsPanel = () => {
    if (activeDevice === 'watch') return null;

    return (
      <div className="fixed top-4 right-4 z-40 flex flex-col space-y-2">
        <button
          {...getAccessibleButtonProps(
            'Open settings',
            () => setShowSettings(!showSettings),
            {
              className: 'p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg'
            }
          )}
        >
          <Settings className="h-5 w-5" />
        </button>
        
        <button
          {...getAccessibleButtonProps(
            'Open accessibility settings',
            () => {
              setShowAccessibilitySettings(true);
              announce('Accessibility settings opened');
            },
            {
              className: 'p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg'
            }
          )}
        >
          <Accessibility className="h-5 w-5" />
        </button>
        
        <VoiceButton />
      </div>
    );
  };

  // Device info overlay (for development)
  const DeviceInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
      <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
        <div>Device: {activeDevice} {forcedMode && '(forced)'}</div>
        <div>Size: {viewportSize.width}x{viewportSize.height}</div>
        <div>Orientation: {orientation}</div>
      </div>
    );
  };

  // Render appropriate timeline component
  const renderTimeline = () => {
    const deviceProps = getDeviceProps();

    switch (activeDevice) {
      case 'watch':
        return <SmartWatchView {...deviceProps} />;
      case 'mobile':
        return <MobileTimeline {...deviceProps} />;
      case 'tablet':
        return <TabletDashboard {...deviceProps} />;
      default:
        return <PreparationTimeline {...deviceProps} />;
    }
  };

  // Listen for service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'SYNC_TIMELINE_DATA') {
        announce('Timeline data synced');
      } else if (event.data?.type === 'REFRESH_TIMELINE_DATA') {
        announce('Timeline data refreshed');
      }
    };

    window.addEventListener('timeline-sync-requested', handleServiceWorkerMessage);
    window.addEventListener('timeline-refresh-requested', handleServiceWorkerMessage);

    return () => {
      window.removeEventListener('timeline-sync-requested', handleServiceWorkerMessage);
      window.removeEventListener('timeline-refresh-requested', handleServiceWorkerMessage);
    };
  }, [announce]);

  return (
    <>
      {/* Skip link for accessibility */}
      <a 
        href="#main-timeline" 
        className="skip-link"
        onClick={() => announce('Skipped to main timeline')}
      >
        Skip to main timeline
      </a>

      {/* Main timeline content */}
      <main id="main-timeline" className="relative">
        {renderTimeline()}
      </main>

      {/* Settings and controls */}
      <SettingsPanel />

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">View Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Current View:</label>
                <p className="text-sm text-gray-600 capitalize">
                  {activeDevice} {forcedMode && '(forced)'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Force View Mode:</label>
                <div className="space-y-2">
                  {['auto', 'desktop', 'tablet', 'mobile', 'watch'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        if (mode === 'auto') {
                          window.history.pushState({}, '', window.location.pathname);
                        } else {
                          window.history.pushState({}, '', `?mode=${mode}`);
                        }
                        window.location.reload();
                      }}
                      className={`block w-full text-left px-3 py-2 rounded ${
                        (mode === 'auto' && !forcedMode) || mode === forcedMode
                          ? 'bg-blue-100 text-blue-800'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {mode === 'auto' ? 'Auto-detect' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Accessibility settings */}
      {showAccessibilitySettings && (
        <AccessibilitySettings onClose={() => setShowAccessibilitySettings(false)} />
      )}

      {/* Development info */}
      <DeviceInfo />

      {/* Voice command feedback */}
      {voiceIntegration.lastVoiceCommand && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg max-w-xs">
          <div className="text-sm font-medium">Last Voice Command:</div>
          <div className="text-xs opacity-90">{voiceIntegration.lastVoiceCommand}</div>
        </div>
      )}
    </>
  );
};

// Wrapped component with accessibility provider
const MultiModalTimeline = (props) => {
  return (
    <AccessibilityProvider>
      <MultiModalTimelineInner {...props} />
    </AccessibilityProvider>
  );
};

export default MultiModalTimeline;