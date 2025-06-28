
import React, { useState } from 'react';
import { Settings, Printer, Bell, Monitor, Layers, Wrench } from 'lucide-react';
import { PrintSettings } from '../utils/printEstimator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import new components
import { ProfileSelector } from './settings/ProfileSelector';
import { PrintSettings as PrintSettingsComponent } from './settings/PrintSettings';
import { AdvancedSettings } from './settings/AdvancedSettings';
import { DisplaySettings } from './settings/DisplaySettings';
import { NotificationSettings } from './settings/NotificationSettings';
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
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      {/* Fixed Header with Title and Action Buttons */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Slicer Settings
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
        <div className="p-4">
          <Tabs defaultValue="profiles" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4 bg-gray-700 text-xs">
              <TabsTrigger value="profiles" className="text-xs p-1">
                <Layers className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="print" className="text-xs p-1">
                <Printer className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs p-1">
                <Wrench className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="display" className="text-xs p-1">
                <Monitor className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs p-1">
                <Bell className="w-3 h-3" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="print" className="space-y-4">
              <PrintSettingsComponent
                settings={settings}
                onSettingsChange={onSettingsChange}
              />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <AdvancedSettings
                advancedSettings={advancedSettings}
                onAdvancedChange={setAdvancedSettings}
              />
            </TabsContent>

            <TabsContent value="display" className="space-y-4">
              <DisplaySettings
                display={display}
                onDisplayChange={setDisplay}
              />
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <NotificationSettings
                notifications={notifications}
                onNotificationsChange={setNotifications}
              />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SettingsPanel;
