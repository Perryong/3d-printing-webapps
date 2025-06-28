
import React, { useRef, useEffect } from 'react';
import { Move3D, FileCode } from 'lucide-react';

interface ViewerDisplayProps {
  slicingMethod: 'simplified' | 'gcode';
  fileName: string;
  isLoading: boolean;
  error: string;
  onMountReady: (element: HTMLDivElement) => void;
}

const ViewerDisplay: React.FC<ViewerDisplayProps> = ({
  slicingMethod,
  fileName,
  isLoading,
  error,
  onMountReady
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mountRef.current && slicingMethod !== 'gcode') {
      onMountReady(mountRef.current);
    }
  }, [onMountReady, slicingMethod]);

  return (
    <div className="flex-1 relative">
      {slicingMethod !== 'gcode' && <div ref={mountRef} className="w-full h-full" />}
      
      {/* G-code Display */}
      {slicingMethod === 'gcode' && (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <div className="text-center text-gray-400 max-w-md">
            <FileCode className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-semibold mb-2">G-code Analysis Complete</h2>
            <p className="mb-4">Print time estimated from G-code commands</p>
            <p className="text-sm">Upload an STL file to view the 3D model</p>
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            <span className="text-white">
              {slicingMethod === 'gcode' ? 'Analyzing G-code...' : 'Loading STL file...'}
            </span>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-3 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Instructions */}
      {!fileName && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400 max-w-md">
            <Move3D className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-semibold mb-2">Upload STL or G-code File</h2>
            <p className="mb-4">Load a 3D model file for viewing and print time estimation</p>
            <div className="text-sm space-y-2">
              <p><strong>STL Files:</strong> 3D model visualization + estimated print time</p>
              <p><strong>G-code Files:</strong> Accurate print time from sliced file</p>
              <p className="mt-4"><strong>Controls:</strong></p>
              <p>• Mouse drag to rotate • Mouse wheel to zoom</p>
              <p>• Optimized for Bambu Lab A1 printer specs</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewerDisplay;
