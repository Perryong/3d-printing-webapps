
import React from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
      <Upload className="w-4 h-4" />
      {isLoading ? 'Loading...' : 'Upload File'}
      <input
        type="file"
        accept=".stl,.gcode,.g"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />
    </label>
  );
};

export default FileUpload;
