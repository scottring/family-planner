import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, FileText, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const PhotoCapture = ({ onPhotoProcessed, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('general');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const { token } = useAuth();

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'school', label: 'School' },
    { value: 'sports', label: 'Sports' },
    { value: 'medical', label: 'Medical' },
    { value: 'activities', label: 'Activities' }
  ];

  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setError(null);
    setUploadStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('caption', caption);
      formData.append('category', category);

      const response = await fetch('/api/capture/photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadStatus('processing');
      
      // Simulate processing time (in real app, you might poll for status)
      setTimeout(() => {
        setUploadStatus('completed');
        setTimeout(() => {
          onPhotoProcessed?.(result);
          clearSelection();
        }, 2000);
      }, 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload photo');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const renderUploadStatus = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <div className="flex items-center space-x-2 text-blue-600">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Uploading photo...</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center space-x-2 text-orange-600">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Processing with OCR...</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span>Photo processed successfully!</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>Upload failed</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Photo Capture</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* File Upload Area */}
          {!selectedFile && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={triggerFileInput}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drop a photo here or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports JPG, PNG, GIF up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-contain bg-gray-50 rounded-lg"
                />
                <button
                  onClick={clearSelection}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Caption Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caption (Optional)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add context about this photo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {caption.length}/500 characters
                </p>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 rounded-md">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus && (
            <div className="p-3 bg-gray-50 rounded-md">
              {renderUploadStatus()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>OCR will extract text automatically</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || uploadStatus === 'completed'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Best Results Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure good lighting and clear text</li>
              <li>• Hold camera steady and avoid blur</li>
              <li>• Capture entire document or form</li>
              <li>• Works great with: permission slips, schedules, flyers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoCapture;