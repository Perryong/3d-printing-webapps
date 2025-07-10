
import React from 'react';
import { X, Paperclip, FileText, Upload } from 'lucide-react';
import { formatFileSize } from '../../utils/fileUtils';

interface FileAttachmentManagerProps {
  files: File[];
  onRemoveFile: (fileName: string) => void;
  onAddFile?: (file: File) => void;
  maxFiles?: number;
}

const FileAttachmentManager: React.FC<FileAttachmentManagerProps> = ({
  files,
  onRemoveFile,
  onAddFile,
  maxFiles = 5
}) => {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    selectedFiles.forEach(file => {
      if (onAddFile && files.length < maxFiles) {
        onAddFile(file);
      }
    });
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          File Attachments
        </label>
        {onAddFile && files.length < maxFiles && (
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.stl,.gcode,.g"
            />
            <div className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors">
              <Upload className="w-4 h-4" />
              Add File
            </div>
          </label>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemoveFile(file.name)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          No files selected. Files uploaded to the 3D viewer will automatically appear here.
        </p>
      )}

      {files.length >= maxFiles && (
        <p className="text-sm text-amber-600">
          Maximum of {maxFiles} files allowed.
        </p>
      )}
    </div>
  );
};

export default FileAttachmentManager;
