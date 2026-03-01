import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import catalogApi from '../services/catalogApi';

const ALLOWED_TYPES = ['.pdf', '.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function CatalogUpload({ onUploadComplete, onError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState({
    status: 'idle', // idle, uploading, extracting, completed, error
    progress: 0,
    message: '',
    uploadId: null,
  });

  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      return `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: 50MB`;
    }
    return null;
  };

  const handleFile = async (file) => {
    const error = validateFile(file);
    if (error) {
      onError?.(error);
      return;
    }

    setUploadState({
      status: 'uploading',
      progress: 10,
      message: 'Uploading file...',
      uploadId: null,
    });

    try {
      // Step 1: Upload file
      const uploadResponse = await catalogApi.uploadCatalog(file);
      
      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message || 'Upload failed');
      }

      const uploadId = uploadResponse.upload_id;
      
      setUploadState({
        status: 'extracting',
        progress: 30,
        message: 'AI extracting products... This may take a moment.',
        uploadId,
      });

      // Step 2: Start extraction
      const extractResponse = await catalogApi.extractProducts(uploadId);
      
      if (!extractResponse.success) {
        throw new Error(extractResponse.message || 'Extraction failed');
      }

      setUploadState({
        status: 'completed',
        progress: 100,
        message: `Extraction complete! Found ${extractResponse.products_extracted} products.`,
        uploadId,
      });

      onUploadComplete?.(uploadId, extractResponse.products_extracted);

    } catch (error) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: error.message || 'An error occurred',
        uploadId: null,
      });
      onError?.(error.message);
    }
  };

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const onFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const reset = () => {
    setUploadState({
      status: 'idle',
      progress: 0,
      message: '',
      uploadId: null,
    });
  };

  // Progress bar component
  const ProgressBar = ({ progress, status }) => {
    const getColor = () => {
      switch (status) {
        case 'error':
          return 'bg-red-500';
        case 'completed':
          return 'bg-green-500';
        default:
          return 'bg-blue-500';
      }
    };

    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };

  // Status icon
  const StatusIcon = () => {
    switch (uploadState.status) {
      case 'uploading':
      case 'extracting':
        return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Upload className="w-8 h-8 text-gray-400" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {uploadState.status === 'idle' ? (
        // Drop zone
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <input
            type="file"
            accept=".pdf,.csv,.xlsx,.xls"
            onChange={onFileSelect}
            className="hidden"
            id="catalog-file-input"
          />
          <label htmlFor="catalog-file-input" className="cursor-pointer block">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop your catalog here, or click to browse
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Support PDF, CSV, Excel files up to 50MB
            </p>
            <div className="flex justify-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> PDF
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> CSV
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> Excel
              </span>
            </div>
          </label>
        </div>
      ) : (
        // Progress display
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <StatusIcon />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">
                {uploadState.status === 'uploading' && 'Uploading...'}
                {uploadState.status === 'extracting' && 'AI Processing...'}
                {uploadState.status === 'completed' && 'Extraction Complete!'}
                {uploadState.status === 'error' && 'Error'}
              </h4>
              <p className="text-sm text-gray-500">{uploadState.message}</p>
            </div>
          </div>

          <ProgressBar 
            progress={uploadState.progress} 
            status={uploadState.status} 
          />

          {uploadState.status === 'error' && (
            <button
              onClick={reset}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Try Again
            </button>
          )}

          {uploadState.status === 'completed' && (
            <button
              onClick={reset}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Upload Another Catalog
            </button>
          )}
        </div>
      )}
    </div>
  );
}
