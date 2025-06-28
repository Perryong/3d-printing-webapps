
import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Printer } from 'lucide-react';
import { PrintSettings } from '../../utils/printEstimator';
import { useToast } from '@/hooks/use-toast';

interface SettingsActionsProps {
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
  onQualityChange: (quality: string) => void;
  onMaterialChange: (material: string) => void;
  selectedQuality: string;
  selectedMaterial: string;
  advancedSettings: any;
  notifications: any;
  display: any;
}

export const SettingsActions: React.FC<SettingsActionsProps> = ({
  settings,
  onSettingsChange,
  onQualityChange,
  onMaterialChange,
  selectedQuality,
  selectedMaterial,
  advancedSettings,
  notifications,
  display
}) => {
  const { toast } = useToast();

  const resetPrintSettings = () => {
    const defaultSettings: PrintSettings = {
      layerHeight: 0.2,
      infillDensity: 20,
      printSpeed: 150,
      outerWallSpeed: 25,
      infillSpeed: 200,
      travelSpeed: 300,
      printTemperature: 210,
      bedTemperature: 60,
      supportMaterial: false,
      raftEnabled: false,
      nozzleDiameter: 0.4
    };
    onSettingsChange(defaultSettings);
    onQualityChange('Standard');
    onMaterialChange('PLA');
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
    });
  };

  const saveAllSettings = () => {
    localStorage.setItem('advancedSettings', JSON.stringify(advancedSettings));
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    localStorage.setItem('displaySettings', JSON.stringify(display));
    localStorage.setItem('printSettings', JSON.stringify(settings));
    localStorage.setItem('selectedProfiles', JSON.stringify({ quality: selectedQuality, material: selectedMaterial }));
    
    toast({
      title: "Settings Saved",
      description: "All settings have been saved successfully.",
    });
  };

  return (
    <div className="space-y-2 mb-4">
      <Button onClick={saveAllSettings} className="w-full">
        <Settings className="w-4 h-4 mr-2" />
        Save All Settings
      </Button>
      
      <Button onClick={resetPrintSettings} variant="outline" className="w-full">
        <Printer className="w-4 h-4 mr-2" />
        Reset to Defaults
      </Button>
    </div>
  );
};
