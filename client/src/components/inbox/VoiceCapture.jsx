import { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { useInboxStore } from '../../stores/inboxStore';

const VoiceCapture = ({ onCapture, className = '' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const { addInboxItem } = useInboxStore();

  useEffect(() => {
    // Check for Web Speech API support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setError('');
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Build the complete transcript from all results
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else if (i === event.results.length - 1) {
            interimTranscript = transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
        clearInterval(timerRef.current);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        clearInterval(timerRef.current);
      };
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setTranscript('');
      setError('');
      try {
        recognitionRef.current.start();
      } catch (error) {
        setError('Could not start recording. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) {
      setError('No speech detected. Please try again.');
      return;
    }

    try {
      const inboxItem = await addInboxItem({
        raw_content: transcript,
        transcription: transcript,
        input_type: 'voice'
      });

      if (onCapture) {
        onCapture(inboxItem);
      }

      // Reset
      setTranscript('');
      setRecordingTime(0);
    } catch (error) {
      setError('Failed to save voice note. Please try again.');
      console.error('Error saving voice note:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-700 text-sm">
          Voice input is not supported in your browser. Please use Chrome or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      <div className="p-4 sm:p-6">
        {/* Recording Button */}
        <div className="flex flex-col items-center space-y-4">
          {/* Large touch-friendly recording button */}
          <div className="relative">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`
                w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-200
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600 shadow-2xl scale-110 animate-pulse' 
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:scale-105 active:scale-95'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-4 focus:ring-blue-300
              `}
              disabled={!isSupported}
              style={{
                minWidth: '96px',
                minHeight: '96px'
              }}
            >
              {isRecording ? (
                <Square className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              ) : (
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              )}
            </button>

            {/* Recording indicator pulse animation */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping"></div>
            )}
          </div>

          <div className="text-center">
            <p className="text-base sm:text-lg font-medium text-gray-700">
              {isRecording ? 'Recording...' : 'Tap & Hold to Record'}
            </p>
            {isRecording && (
              <p className="text-sm sm:text-base text-red-600 font-semibold mt-2 bg-red-50 px-3 py-1 rounded-full">
                {formatTime(recordingTime)}
              </p>
            )}
          </div>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="mt-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
              <h4 className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                Transcript:
              </h4>
              <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap leading-relaxed">
                {transcript}
              </p>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:space-x-3 mt-4">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-green-500 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors text-sm sm:text-base font-medium min-h-[48px] sm:min-h-[44px] focus:outline-none focus:ring-3 focus:ring-green-300"
              >
                Save to Inbox
              </button>
              <button
                onClick={() => {
                  setTranscript('');
                  setRecordingTime(0);
                  setError('');
                }}
                className="px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm sm:text-base font-medium min-h-[48px] sm:min-h-[44px] focus:outline-none focus:ring-3 focus:ring-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            Tap and hold the microphone to record your voice note.
            Release to stop recording.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceCapture;