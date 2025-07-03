
import React from 'react';
import { DollarSign, Zap, Weight } from 'lucide-react';

interface PricingDisplayProps {
  printTime: number; // in seconds
  modelWeight: number; // in grams
  modelVolume: number; // in cm³
}

const PricingDisplay: React.FC<PricingDisplayProps> = ({
  printTime,
  modelWeight,
  modelVolume
}) => {
  // Constants for pricing calculation
  const PRINTER_POWER_KW = 1.3; // 1300W converted to kW
  const ELECTRICITY_RATE = 0.2994; // $0.2994 per kWh
  const MATERIAL_RATE = 0.0255; // $0.0255 per gram

  // Calculate costs
  const printHours = printTime / 3600;
  const electricityCost = printHours * PRINTER_POWER_KW * ELECTRICITY_RATE;
  const materialCost = modelWeight * MATERIAL_RATE;
  const totalCost = electricityCost + materialCost;

  return (
    <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-green-400">Print Cost Estimate</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-yellow-400" />
          <div>
            <div className="text-gray-300">Electricity</div>
            <div className="text-yellow-400 font-semibold">${electricityCost.toFixed(3)}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Weight className="w-3 h-3 text-purple-400" />
          <div>
            <div className="text-gray-300">Material</div>
            <div className="text-purple-400 font-semibold">${materialCost.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-green-400" />
          <div>
            <div className="text-gray-300">Total</div>
            <div className="text-green-400 font-bold">${totalCost.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingDisplay;