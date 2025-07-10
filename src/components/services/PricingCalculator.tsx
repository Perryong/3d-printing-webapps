import React, { useState, useEffect } from 'react';
import { Calculator, Package, Clock, Zap, Weight } from 'lucide-react';
import { mockMaterials } from '../../data/mockData';
import { formatTime } from '../../utils/formatTime';

interface PricingCalculatorProps {
  modelVolume?: number;
  modelWeight?: number;
  printTime?: number;
}

const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  modelVolume = 10, // cm³
  modelWeight = 12, // grams
  printTime = 7200 // seconds
}) => {
  const [selectedMaterial, setSelectedMaterial] = useState('pla');
  const [quality, setQuality] = useState('standard');
  const [quantity, setQuantity] = useState(1);

  const [electricityCost, setElectricityCost] = useState(0);
  const [materialCost, setMaterialCost] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);

  // Pricing constants
  const PRINTER_POWER_KW = 1.3; // 1300W converted to kW
  const ELECTRICITY_RATE = 0.2994; // $0.2994 per kWh
  const MATERIAL_RATE = 0.0255; // $0.0255 per gram

  const qualityMultipliers = {
    draft: { price: 0.8, time: 0.7 },
    standard: { price: 1.0, time: 1.0 },
    fine: { price: 1.4, time: 1.6 },
    'ultra-fine': { price: 2.0, time: 2.4 }
  };

  useEffect(() => {
    const material = mockMaterials.find(m => m.id === selectedMaterial);
    const qualityMultiplier = qualityMultipliers[quality as keyof typeof qualityMultipliers];

    if (material && qualityMultiplier) {
      // Calculate adjusted weight and time based on material and quality
      const adjustedWeight = modelWeight * material.priceMultiplier * qualityMultiplier.price;
      const adjustedTime = printTime * qualityMultiplier.time;
      
      // Calculate total values for the quantity
      const finalWeight = adjustedWeight * quantity;
      const finalTime = adjustedTime * quantity;
      
      // Calculate electricity cost: Print Hours × 1300W × $0.2994/kWh
      const printHours = finalTime / 3600; // Convert seconds to hours
      const calculatedElectricityCost = printHours * PRINTER_POWER_KW * ELECTRICITY_RATE;
      
      // Calculate material cost: Material Weight (grams) × $0.0255/gram
      const calculatedMaterialCost = finalWeight * MATERIAL_RATE;
      
      // Total cost
      const calculatedTotalCost = calculatedElectricityCost + calculatedMaterialCost;
      
      setElectricityCost(calculatedElectricityCost);
      setMaterialCost(calculatedMaterialCost);
      setTotalCost(calculatedTotalCost);
      setTotalTime(finalTime);
      setTotalWeight(finalWeight);
    }
  }, [selectedMaterial, quality, quantity, modelWeight, printTime]);

  const selectedMaterialData = mockMaterials.find(m => m.id === selectedMaterial);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">Pricing Calculator</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material
            </label>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {mockMaterials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.name} (+{Math.round((material.priceMultiplier - 1) * 100)}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Print Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft (Fast & Economical)</option>
              <option value="standard">Standard (Balanced)</option>
              <option value="fine">Fine (High Detail)</option>
              <option value="ultra-fine">Ultra Fine (Maximum Detail)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Model Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Volume:</span>
                <span>{modelVolume.toFixed(1)} cm³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Base Weight:</span>
                <span>{modelWeight.toFixed(1)} g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Base Print Time:</span>
                <span>{formatTime(printTime)}</span>
              </div>
            </div>
          </div>

          {selectedMaterialData && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{selectedMaterialData.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{selectedMaterialData.description}</p>
              <div className="flex flex-wrap gap-1">
                {selectedMaterialData.properties.map(property => (
                  <span 
                    key={property}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {property}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-gray-900">Cost Breakdown</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-white p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-gray-700">Electricity Cost</span>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {(totalTime / 3600).toFixed(2)} hrs × 1300W × $0.2994/kWh
                </div>
                <div className="text-right font-semibold text-yellow-700">
                  ${electricityCost.toFixed(3)}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Weight className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-700">Material Cost</span>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {totalWeight.toFixed(1)} g × $0.0255/g
                </div>
                <div className="text-right font-semibold text-purple-700">
                  ${materialCost.toFixed(2)}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">Total Time:</span>
                </div>
                <span>{formatTime(totalTime)}</span>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total Cost:</span>
                  <span className="text-xl font-bold text-green-600">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCalculator;
