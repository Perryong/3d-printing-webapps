
import React from 'react';
import { Move, RotateCw, Scale, Copy, Trash2, RotateCcw } from 'lucide-react';

interface ModelTransformControlsProps {
  selectedModel: string | null;
  onMove: () => void;
  onRotate: () => void;
  onScale: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReset: () => void;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  onPositionChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onScaleChange: (axis: 'x' | 'y' | 'z', value: number) => void;
}

const ModelTransformControls: React.FC<ModelTransformControlsProps> = ({
  selectedModel,
  onMove,
  onRotate,
  onScale,
  onDuplicate,
  onDelete,
  onReset,
  position,
  rotation,
  scale,
  onPositionChange,
  onRotationChange,
  onScaleChange
}) => {
  if (!selectedModel) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-400 text-center">
        Select a model to see transform controls
      </div>
    );
  }

  // Safe conversion from radians to degrees with fallback values
  const safeRotationToDegrees = (radians: number): number => {
    if (typeof radians !== 'number' || isNaN(radians)) {
      return 0;
    }
    return radians * 180 / Math.PI;
  };

  // Safe conversion from degrees to radians
  const safeDegreesToRadians = (degrees: number): number => {
    if (typeof degrees !== 'number' || isNaN(degrees)) {
      return 0;
    }
    return degrees * Math.PI / 180;
  };

  // Safe number formatting with fallback
  const safeToFixed = (value: number, decimals: number): string => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0.0';
    }
    return value.toFixed(decimals);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Transform Controls</h3>
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
          title="Reset Transform"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onMove}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          title="Move Mode"
        >
          <Move className="w-4 h-4" />
          Move
        </button>
        <button
          onClick={onRotate}
          className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          title="Rotate Mode"
        >
          <RotateCw className="w-4 h-4" />
          Rotate
        </button>
        <button
          onClick={onScale}
          className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
          title="Scale Mode"
        >
          <Scale className="w-4 h-4" />
          Scale
        </button>
      </div>

      {/* Position Controls - Swapping Y and Z display/handling */}
      <div className="space-y-2">
        <h4 className="text-gray-300 font-medium">Position (mm)</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">X</label>
            <input
              type="number"
              value={safeToFixed(position.x, 1)}
              onChange={(e) => onPositionChange('x', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Y</label>
            <input
              type="number"
              value={safeToFixed(position.z, 1)}
              onChange={(e) => onPositionChange('z', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Z</label>
            <input
              type="number"
              value={safeToFixed(position.y, 1)}
              onChange={(e) => onPositionChange('y', parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="0.1"
              placeholder="0.0"
            />
          </div>
        </div>
      </div>

      {/* Rotation Controls */}
      <div className="space-y-2">
        <h4 className="text-gray-300 font-medium">Rotation (degrees)</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">X</label>
            <input
              type="number"
              value={safeToFixed(safeRotationToDegrees(rotation.x), 1)}
              onChange={(e) => onRotationChange('x', safeDegreesToRadians(parseFloat(e.target.value) || 0))}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="1"
              placeholder="-90.0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Y</label>
            <input
              type="number"
              value={safeToFixed(safeRotationToDegrees(rotation.y), 1)}
              onChange={(e) => onRotationChange('y', safeDegreesToRadians(parseFloat(e.target.value) || 0))}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Z</label>
            <input
              type="number"
              value={safeToFixed(safeRotationToDegrees(rotation.z), 1)}
              onChange={(e) => onRotationChange('z', safeDegreesToRadians(parseFloat(e.target.value) || 0))}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="1"
            />
          </div>
        </div>
      </div>

      {/* Scale Controls */}
      <div className="space-y-2">
        <h4 className="text-gray-300 font-medium">Scale</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">X</label>
            <input
              type="number"
              value={safeToFixed(scale.x, 2)}
              onChange={(e) => onScaleChange('x', parseFloat(e.target.value) || 1)}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="0.1"
              min="0.1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Y</label>
            <input
              type="number"
              value={safeToFixed(scale.y, 2)}
              onChange={(e) => onScaleChange('y', parseFloat(e.target.value) || 1)}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="0.1"
              min="0.1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Z</label>
            <input
              type="number"
              value={safeToFixed(scale.z, 2)}
              onChange={(e) => onScaleChange('z', parseFloat(e.target.value) || 1)}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm"
              step="0.1"
              min="0.1"
            />
          </div>
        </div>
      </div>

      {/* Model Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={onDuplicate}
          className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
          title="Duplicate Model"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          title="Delete Model"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
};

export default ModelTransformControls;
