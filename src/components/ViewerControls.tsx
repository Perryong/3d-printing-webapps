
import React from 'react';
import { CameraView } from '../utils/sceneManager';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface ViewerControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  onViewChange: (view: CameraView) => void;
}

const ViewerControls: React.FC<ViewerControlsProps> = ({ onZoomIn, onZoomOut, onResetCamera, onViewChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(['front', 'top', 'right'] as CameraView[]).map(view => (
        <button key={view} onClick={() => onViewChange(view)} className="rounded bg-gray-700 px-2 py-2 text-xs capitalize text-white hover:bg-gray-600" title={`${view} view`}>{view}</button>
      ))}
      <button
        onClick={onZoomIn}
        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
        title="Zoom In" aria-label="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={onZoomOut}
        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
        title="Zoom Out" aria-label="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={onResetCamera}
        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
        title="Fit isometric view" aria-label="Fit isometric view"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ViewerControls;
