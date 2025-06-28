
import React, { useState, useEffect } from 'react';
import { Calculator, Package, Clock } from 'lucide-react';
import { mockMaterials, mockProviders } from '../../data/mockData';
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
  const [selectedProvider, setSelectedProvider] = useState('1');

  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const qualityMultipliers = {
    draft: { price: 0.8, time: 0.7 },
    standard: { price: 1.0, time: 1.0 },
    fine: { price: 1.4, time: 1.6 },
    'ultra-fine': { price: 2.0, time: 2.4 }
  };

  useEffect(() => {
    const material = mockMaterials.find(m => m.id === selectedMaterial);
    const provider = mockProviders.find(p => p.id === selectedProvider);
    const qualityMultiplier = qualityMultipliers[quality as keyof typeof qualityMultipliers];

    if (material && provider && qualityMultiplier) {
      const materialCost = modelWeight * provider.pricePerGram * material.priceMultiplier;
      const qualityAdjustedCost = materialCost * qualityMultiplier.price;
      const totalCost = qualityAdjustedCost * quantity;
      
      setCalculatedPrice(totalCost);
      setTotalTime(printTime * qualityMultiplier.time * quantity);
    }
  }, [selectedMaterial, quality, quantity, selectedProvider, modelWeight, printTime]);

  const selectedMaterialData = mockMaterials.find(m => m.id === selectedMaterial);
  const selectedProviderData = mockProviders.find(p => p.id === selectedProvider);

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
              Service Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {mockProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} - ${provider.pricePerGram}/g
                </option>
              ))}
            </select>
          </div>

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
                <span className="text-gray-600">Weight:</span>
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
              <h4 className="font-medium text-gray-900">Pricing Summary</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Unit Price:</span>
                <span>${(calculatedPrice / quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span>{quantity}</span>
              </div>
              <div className="flex justify-between items-center">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">Total Time:</span>
                <span>{formatTime(totalTime)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    ${calculatedPrice.toFixed(2)}
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
