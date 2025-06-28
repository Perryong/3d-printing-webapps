
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface AdvancedSettingsType {
  retraction: number;
  retractionSpeed: number;
  zhop: number;
  combing: boolean;
  ironing: boolean;
  adaptiveLayers: boolean;
  fuzzyWalls: boolean;
  outerWallCount: number;
  topBottomLayers: number;
}

interface AdvancedSettingsProps {
  advancedSettings: AdvancedSettingsType;
  onAdvancedChange: (settings: AdvancedSettingsType) => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  advancedSettings,
  onAdvancedChange
}) => {
  const updateAdvancedSetting = (key: keyof AdvancedSettingsType, value: any) => {
    onAdvancedChange({ ...advancedSettings, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-gray-300">Retraction</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={advancedSettings.retraction}
            onChange={(e) => updateAdvancedSetting('retraction', parseFloat(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
        <div>
          <Label className="text-gray-300">Retract Speed</Label>
          <Input
            type="number"
            min="10"
            max="100"
            value={advancedSettings.retractionSpeed}
            onChange={(e) => updateAdvancedSetting('retractionSpeed', parseInt(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-gray-300">Wall Count</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={advancedSettings.outerWallCount}
            onChange={(e) => updateAdvancedSetting('outerWallCount', parseInt(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
        <div>
          <Label className="text-gray-300">Top/Bottom</Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={advancedSettings.topBottomLayers}
            onChange={(e) => updateAdvancedSetting('topBottomLayers', parseInt(e.target.value))}
            className="bg-gray-700 text-white border-gray-600"
          />
        </div>
      </div>

      <div>
        <Label className="text-gray-300">Z-Hop Height</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          max="2"
          value={advancedSettings.zhop}
          onChange={(e) => updateAdvancedSetting('zhop', parseFloat(e.target.value))}
          className="bg-gray-700 text-white border-gray-600"
        />
      </div>

      <Separator className="bg-gray-600" />

      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Combing</Label>
        <Switch
          checked={advancedSettings.combing}
          onCheckedChange={(checked) => updateAdvancedSetting('combing', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Ironing</Label>
        <Switch
          checked={advancedSettings.ironing}
          onCheckedChange={(checked) => updateAdvancedSetting('ironing', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Adaptive Layers</Label>
        <Switch
          checked={advancedSettings.adaptiveLayers}
          onCheckedChange={(checked) => updateAdvancedSetting('adaptiveLayers', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Fuzzy Walls</Label>
        <Switch
          checked={advancedSettings.fuzzyWalls}
          onCheckedChange={(checked) => updateAdvancedSetting('fuzzyWalls', checked)}
        />
      </div>
    </div>
  );
};
