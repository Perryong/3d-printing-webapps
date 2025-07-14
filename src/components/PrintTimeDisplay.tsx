
import React from 'react';
import { Clock, Calculator } from 'lucide-react';
import { formatTime } from '../utils/formatTime';
import { PrintEstimate } from '../utils/printEstimator';
import { GCodeAnalysis } from '../utils/gcodeAnalyzer';
import PricingDisplay from './PricingDisplay';

interface PrintTimeDisplayProps {
  estimate: PrintEstimate | GCodeAnalysis | null;
  slicingMethod: 'simplified' | 'gcode';
  modelVolume?: number;
}

const PrintTimeDisplay: React.FC<PrintTimeDisplayProps> = ({ 
  estimate, 
  slicingMethod,
  modelVolume = 0
}) => {
  if (!estimate) return null;

  // Calculate model weight from volume (using PLA density: 1.24 g/cm³)
  const modelWeight = modelVolume * 1.24;

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
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-300">
                <span className="font-semibold">Material:</span> {estimate.materialUsed.weight.toFixed(1)}g
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calculator className="w-4 h-4" />
                {slicingMethod === 'simplified' ? 'Estimated' : 'G-code Analysis'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add pricing display for simplified slicing method */}
      {slicingMethod === 'simplified' && modelVolume > 0 && (
        <PricingDisplay
          printTime={estimate.totalTime}
          modelWeight={modelWeight}
          modelVolume={modelVolume}
        />
      )}
    </div>
  );
};

export default PrintTimeDisplay;