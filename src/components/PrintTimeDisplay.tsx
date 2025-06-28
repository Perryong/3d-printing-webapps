
import React from 'react';
import { Clock, Calculator } from 'lucide-react';
import { formatTime } from '../utils/formatTime';
import { PrintEstimate } from '../utils/printEstimator';
import { GCodeAnalysis } from '../utils/gcodeAnalyzer';

interface PrintTimeDisplayProps {
  estimate: PrintEstimate | GCodeAnalysis | null;
  slicingMethod: 'simplified' | 'gcode';
}

const PrintTimeDisplay: React.FC<PrintTimeDisplayProps> = ({ estimate, slicingMethod }) => {
  if (!estimate) return null;

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-400" />
            <div>
              <span className="text-lg font-semibold text-white">
                {formatTime(estimate.totalTime)}
              </span>
              <span className="text-sm text-gray-400 ml-2">estimated print time</span>
            </div>
          </div>
          
          {estimate.layers && (
            <div className="text-sm text-gray-300">
              <span className="font-semibold">Layers:</span> {estimate.layers}
            </div>
          )}
          
          {estimate.materialUsed && (
            <div className="text-sm text-gray-300">
              <span className="font-semibold">Material:</span> {estimate.materialUsed.length.toFixed(1)}m 
              ({estimate.materialUsed.weight.toFixed(1)}g)
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calculator className="w-4 h-4" />
          {slicingMethod === 'simplified' ? 'Estimated' : 'G-code Analysis'}
        </div>
      </div>
      
      {'breakdown' in estimate && estimate.breakdown && (
        <div className="mt-2 grid grid-cols-4 gap-4 text-xs text-gray-400">
          <div>Outer Walls: {formatTime(estimate.breakdown.outerWalls)}</div>
          <div>Infill: {formatTime(estimate.breakdown.infill)}</div>
          <div>Travel: {formatTime(estimate.breakdown.travel)}</div>
          <div>Overhead: {formatTime(estimate.breakdown.overhead)}</div>
        </div>
      )}
    </div>
  );
};

export default PrintTimeDisplay;
