
import React from 'react';
import { Check, Cloud, AlertCircle, FileText } from 'lucide-react';
import { UploadedFileWithFirebase } from '../../context/AppContext';
import { formatFileSize } from '../../utils/fileUtils';

interface FirebaseFileListProps {
  files: UploadedFileWithFirebase[];
}

const FirebaseFileList: React.FC<FirebaseFileListProps> = ({ files }) => {
  const getStatusIcon = (file: UploadedFileWithFirebase) => {
    if (file.isUploading) {
      return <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
    if (file.uploadError) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (file.firebaseMetadata) {
      return <Check className="w-4 h-4 text-green-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = (file: UploadedFileWithFirebase) => {
    if (file.isUploading) return 'Uploading to cloud...';
    if (file.uploadError) return `Upload failed: ${file.uploadError}`;
    if (file.firebaseMetadata) return 'Stored in cloud';
    return 'Local file';
  };

  if (files.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No files uploaded. Files uploaded to the 3D viewer will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">
        Files to Include in Message ({files.length})
      </h4>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getStatusIcon(file)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{getStatusText(file)}</span>
                </div>
                {file.firebaseMetadata && (
                  <p className="text-xs text-green-600 truncate">
                    Cloud path: {file.firebaseMetadata.path}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600">
        File names and cloud storage information will be included in your message.
      </p>
    </div>
  );
};

export default FirebaseFileList;
