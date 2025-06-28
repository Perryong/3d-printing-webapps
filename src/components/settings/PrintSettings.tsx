
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PrintSettings as PrintSettingsType } from '../../utils/printEstimator';

interface PrintSettingsProps {
  settings: PrintSettingsType;
  onSettingsChange: (settings: PrintSettingsType) => void;
}

export const PrintSettings: React.FC<PrintSettingsProps> = ({ settings, onSettingsChange }) => {
  const updateSetting = (key: keyof PrintSettingsType, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-gray-300">Layer Height</Label>
          <Input
            type="number"
            step="0.05"
            min="0.05"
            max="0.35"
            value={settings.layerHeight}
            onChange={(e) => updateSetting('layerHeight', parseFloat(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
        <div>
          <Label className="text-gray-300">Infill %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={settings.infillDensity}
            onChange={(e) => updateSetting('infillDensity', parseInt(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-gray-300">Print Speed</Label>
          <Input
            type="number"
            min="10"
            max="300"
            value={settings.printSpeed}
            onChange={(e) => updateSetting('printSpeed', parseInt(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
        <div>
          <Label className="text-gray-300">Wall Speed</Label>
          <Input
            type="number"
            min="10"
            max="200"
            value={settings.outerWallSpeed}
            onChange={(e) => updateSetting('outerWallSpeed', parseInt(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-gray-300">Print Temp °C</Label>
          <Input
            type="number"
            min="180"
            max="300"
            value={settings.printTemperature}
            onChange={(e) => updateSetting('printTemperature', parseInt(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
        <div>
          <Label className="text-gray-300">Bed Temp °C</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={settings.bedTemperature}
            onChange={(e) => updateSetting('bedTemperature', parseInt(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Generate Supports</Label>
        <Switch
          checked={settings.supportMaterial}
          onCheckedChange={(checked) => updateSetting('supportMaterial', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Build Plate Adhesion</Label>
        <Switch
          checked={settings.raftEnabled}
          onCheckedChange={(checked) => updateSetting('raftEnabled', checked)}
        />
      </div>
    </div>
  );
};
