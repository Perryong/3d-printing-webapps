
import React from 'react';
import { Star, MapPin, Clock, CheckCircle } from 'lucide-react';
import { ServiceProvider } from '../../types/services';

interface ServiceProviderCardProps {
  provider: ServiceProvider;
  onSelect: (providerId: string) => void;
  isSelected?: boolean;
}

const ServiceProviderCard: React.FC<ServiceProviderCardProps> = ({ 
  provider, 
  onSelect, 
  isSelected = false 
}) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent'
      }`}
      onClick={() => onSelect(provider.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={provider.image} 
            alt={provider.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
              {provider.verified && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              {provider.location}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{provider.rating}</span>
            <span className="text-xs text-gray-500">({provider.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            {provider.leadTime}
          </div>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4">{provider.description}</p>

      <div className="space-y-3">
        <div>
          <span className="text-sm font-medium text-gray-700">Capabilities:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {provider.capabilities.map(capability => (
              <span 
                key={capability} 
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-700">Materials:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {provider.materials.slice(0, 4).map(material => (
              <span 
                key={material} 
                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
              >
                {material}
              </span>
            ))}
            {provider.materials.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{provider.materials.length - 4} more
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-gray-600">Starting at</span>
          <span className="text-lg font-bold text-blue-600">
            ${provider.pricePerGram}/g
          </span>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderCard;
