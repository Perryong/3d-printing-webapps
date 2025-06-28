
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface DisplaySettingsType {
  theme: 'dark' | 'light' | 'auto';
  showPrintTime: boolean;
  showMaterialUsage: boolean;
  autoRotateModel: boolean;
  gridEnabled: boolean;
  showSupports: boolean;
}

interface DisplaySettingsProps {
  display: DisplaySettingsType;
  onDisplayChange: (settings: DisplaySettingsType) => void;
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({
  display,
  onDisplayChange
}) => {
  const updateDisplaySetting = (key: keyof DisplaySettingsType, value: any) => {
    onDisplayChange({ ...display, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Theme</Label>
        <select 
          value={display.theme}
          onChange={(e) => updateDisplaySetting('theme', e.target.value as 'dark' | 'light' | 'auto')}
          className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      <Separator className="bg-gray-600" />
      
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Show print time</Label>
        <Switch
          checked={display.showPrintTime}
          onCheckedChange={(checked) => updateDisplaySetting('showPrintTime', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Show material usage</Label>
        <Switch
          checked={display.showMaterialUsage}
          onCheckedChange={(checked) => updateDisplaySetting('showMaterialUsage', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Show supports</Label>
        <Switch
          checked={display.showSupports}
          onCheckedChange={(checked) => updateDisplaySetting('showSupports', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Auto-rotate model</Label>
        <Switch
          checked={display.autoRotateModel}
          onCheckedChange={(checked) => updateDisplaySetting('autoRotateModel', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Show grid</Label>
        <Switch
          checked={display.gridEnabled}
          onCheckedChange={(checked) => updateDisplaySetting('gridEnabled', checked)}
        />
      </div>
    </div>
  );
};
