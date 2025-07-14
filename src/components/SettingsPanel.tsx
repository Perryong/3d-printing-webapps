
import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { PrintSettings } from '../utils/printEstimator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import ProfileSelector component
import { ProfileSelector } from './settings/ProfileSelector';
import { SettingsActions } from './settings/SettingsActions';

interface SettingsPanelProps {
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
}

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

interface NotificationSettingsType {
  printCompleted: boolean;
  priceAlerts: boolean;
  newProviders: boolean;
  promotions: boolean;
}

interface DisplaySettingsType {
  theme: 'dark' | 'light' | 'auto';
  showPrintTime: boolean;
  showMaterialUsage: boolean;
  autoRotateModel: boolean;
  gridEnabled: boolean;
  showSupports: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange }) => {
  const [selectedQuality, setSelectedQuality] = useState('Standard');
  const [selectedMaterial, setSelectedMaterial] = useState('PLA');
  
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettingsType>({
    retraction: 0.8,
    retractionSpeed: 25,
    zhop: 0.2,
    combing: true,
    ironing: false,
    adaptiveLayers: false,
    fuzzyWalls: false,
    outerWallCount: 2,
    topBottomLayers: 4,
  });

  const [notifications, setNotifications] = useState<NotificationSettingsType>({
    printCompleted: true,
    priceAlerts: false,
    newProviders: false,
    promotions: false,
  });

  const [display, setDisplay] = useState<DisplaySettingsType>({
    theme: 'dark',
    showPrintTime: true,
    showMaterialUsage: true,
    autoRotateModel: false,
    gridEnabled: true,
    showSupports: true,
  });

  return (
    <div className="w-full sm:w-72 md:w-80 lg:w-80 xl:w-96 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      {/* Fixed Header with Title and Action Buttons */}
      <div className="p-2 lg:p-4 border-b border-gray-700">
        <h3 className="text-base lg:text-lg font-semibold text-white mb-2 lg:mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="hidden sm:inline">Slicer Settings</span>
          <span className="sm:hidden">Settings</span>
        </h3>
        
        {/* Action Buttons at Top */}
        <SettingsActions
          settings={settings}
          onSettingsChange={onSettingsChange}
          onQualityChange={setSelectedQuality}
          onMaterialChange={setSelectedMaterial}
          selectedQuality={selectedQuality}
          selectedMaterial={selectedMaterial}
          advancedSettings={advancedSettings}
          notifications={notifications}
          display={display}
        />
      </div>

      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-2 lg:p-4">
          <ProfileSelector
            settings={settings}
            onSettingsChange={onSettingsChange}
            selectedQuality={selectedQuality}
            selectedMaterial={selectedMaterial}
            onQualityChange={setSelectedQuality}
            onMaterialChange={setSelectedMaterial}
            onAdvancedChange={setAdvancedSettings}
            advancedSettings={advancedSettings}
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default SettingsPanel;