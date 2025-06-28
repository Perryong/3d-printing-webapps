
import React from 'react';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
}

interface ModelListProps {
  models: Model[];
  onModelSelect: (modelId: string) => void;
  onModelToggleVisibility: (modelId: string) => void;
  onModelToggleLock: (modelId: string) => void;
}

const ModelList: React.FC<ModelListProps> = ({
  models,
  onModelSelect,
  onModelToggleVisibility,
  onModelToggleLock
}) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 className="text-white font-semibold text-lg mb-3">Models</h3>
      
      {models.length === 0 ? (
        <div className="text-gray-400 text-center py-4">
          No models loaded
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                model.selected 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              onClick={() => onModelSelect(model.id)}
            >
              <span className="flex-1 truncate">{model.name}</span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onModelToggleVisibility(model.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                  title={model.visible ? 'Hide model' : 'Show model'}
                >
                  {model.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onModelToggleLock(model.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                  title={model.locked ? 'Unlock model' : 'Lock model'}
                >
                  {model.locked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelList;
