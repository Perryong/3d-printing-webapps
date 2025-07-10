
import React from 'react';
import { DollarSign } from 'lucide-react';

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
  const MARKUP_PERCENTAGE = 0.40; // 40% markup

  // Calculate costs
  const printHours = printTime / 3600;
  const electricityCost = printHours * PRINTER_POWER_KW * ELECTRICITY_RATE;
  const materialCost = modelWeight * MATERIAL_RATE;
  const baseCost = electricityCost + materialCost;
  const totalCost = baseCost * (1 + MARKUP_PERCENTAGE);

  return (
    <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">Print Cost Estimate</span>
          <span className="text-green-400 font-bold text-lg ml-2">${totalCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default PricingDisplay;
