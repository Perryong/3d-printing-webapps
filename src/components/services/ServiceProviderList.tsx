
import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import ServiceProviderCard from './ServiceProviderCard';
import { mockProviders } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

const ServiceProviderList: React.FC = () => {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCapability, setSelectedCapability] = useState('');

  const filteredProviders = mockProviders.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCapability = !selectedCapability || provider.capabilities.includes(selectedCapability);
    return matchesSearch && matchesCapability;
  });

  const allCapabilities = Array.from(new Set(mockProviders.flatMap(p => p.capabilities)));

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Find Print Services</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedCapability}
              onChange={(e) => setSelectedCapability(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="">All Capabilities</option>
              {allCapabilities.map(capability => (
                <option key={capability} value={capability}>{capability}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProviders.map(provider => (
          <ServiceProviderCard
            key={provider.id}
            provider={provider}
            onSelect={(providerId) => dispatch({ type: 'SELECT_PROVIDER', payload: providerId })}
            isSelected={state.selectedProvider === provider.id}
          />
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No service providers found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ServiceProviderList;
