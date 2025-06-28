
import React from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface ViewerControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
}

const ViewerControls: React.FC<ViewerControlsProps> = ({ onZoomIn, onZoomOut, onResetCamera }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onZoomIn}
        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={onZoomOut}
        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={onResetCamera}
        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
        title="Reset View"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ViewerControls;
