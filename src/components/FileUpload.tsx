
import React from 'react';
import { Upload, Cloud, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  isUploading?: boolean;
  uploadError?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  isLoading, 
  isUploading = false, 
  uploadError 
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const getButtonContent = () => {
    if (isLoading) return 'Processing...';
    if (isUploading) return 'Uploading to Cloud...';
    return 'Upload File';
  };

  const getIcon = () => {
    if (uploadError) return <AlertCircle className="w-4 h-4" />;
    if (isUploading) return <Cloud className="w-4 h-4" />;
    return <Upload className="w-4 h-4" />;
  };

  const getButtonColor = () => {
    if (uploadError) return 'bg-red-600 hover:bg-red-700';
    if (isUploading) return 'bg-green-600 hover:bg-green-700';
    return 'bg-blue-600 hover:bg-blue-700';
  };

  return (
    <div className="flex flex-col gap-1">
      <label className={`${getButtonColor()} text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors ${(isLoading || isUploading) ? 'opacity-75' : ''}`}>
        {getIcon()}
        {getButtonContent()}
        <input
          type="file"
          accept=".stl,.gcode,.g"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading || isUploading}
        />
      </label>
      {uploadError && (
        <span className="text-xs text-red-400">
          Upload failed: {uploadError}
        </span>
      )}
    </div>
  );
};

export default FileUpload;
