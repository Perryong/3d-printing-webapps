
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Printer } from 'lucide-react';
import { BAMBU_A1_SPECS } from '../../constants/printerSpecs';
import { PrintSettings } from '../../utils/printEstimator';
import { useToast } from '@/hooks/use-toast';

interface QualityProfile {
  name: string;
  layerHeight: number;
  infillDensity: number;
  printSpeed: number;
  outerWallSpeed: number;
}

interface MaterialProfile {
  name: string;
  printTemp: number;
  bedTemp: number;
  fanSpeed: number;
  retraction: number;
}

interface ProfileSelectorProps {
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
  selectedQuality: string;
  selectedMaterial: string;
  onQualityChange: (quality: string) => void;
  onMaterialChange: (material: string) => void;
  onAdvancedChange: (settings: any) => void;
  advancedSettings: any;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  settings,
  onSettingsChange,
  selectedQuality,
  selectedMaterial,
  onQualityChange,
  onMaterialChange,
  onAdvancedChange,
  advancedSettings
}) => {
  const { toast } = useToast();

  const qualityProfiles: QualityProfile[] = [
    { name: 'Draft', layerHeight: 0.3, infillDensity: 10, printSpeed: 200, outerWallSpeed: 30 },
    { name: 'Standard', layerHeight: 0.2, infillDensity: 20, printSpeed: 150, outerWallSpeed: 25 },
    { name: 'Fine', layerHeight: 0.15, infillDensity: 25, printSpeed: 100, outerWallSpeed: 20 },
    { name: 'Ultra Fine', layerHeight: 0.1, infillDensity: 30, printSpeed: 80, outerWallSpeed: 15 },
  ];

  const materialProfiles: MaterialProfile[] = [
    { name: 'PLA', printTemp: 210, bedTemp: 60, fanSpeed: 100, retraction: 0.8 },
    { name: 'ABS', printTemp: 250, bedTemp: 80, fanSpeed: 30, retraction: 1.0 },
    { name: 'PETG', printTemp: 230, bedTemp: 70, fanSpeed: 50, retraction: 1.2 },
    { name: 'TPU', printTemp: 220, bedTemp: 50, fanSpeed: 80, retraction: 0.5 },
  ];

  const applyQualityProfile = (profileName: string) => {
    const profile = qualityProfiles.find(p => p.name === profileName);
    if (profile) {
      onSettingsChange({
        ...settings,
        layerHeight: profile.layerHeight,
        infillDensity: profile.infillDensity,
        printSpeed: profile.printSpeed,
        outerWallSpeed: profile.outerWallSpeed,
      });
      onQualityChange(profileName);
      toast({
        title: "Quality Profile Applied",
        description: `${profileName} settings have been applied.`,
      });
    }
  };

  const applyMaterialProfile = (materialName: string) => {
    const material = materialProfiles.find(m => m.name === materialName);
    if (material) {
      onSettingsChange({
        ...settings,
        printTemperature: material.printTemp,
        bedTemperature: material.bedTemp,
      });
      onAdvancedChange({
        ...advancedSettings,
        retraction: material.retraction,
      });
      onMaterialChange(materialName);
      toast({
        title: "Material Profile Applied",
        description: `${materialName} settings have been applied.`,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Printer Profile */}
      <div className="p-3 bg-blue-900 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Bambu Lab A1
        </h4>
        <div className="text-xs text-blue-200">
          <p>Build: {BAMBU_A1_SPECS.buildVolume.x}×{BAMBU_A1_SPECS.buildVolume.y}×{BAMBU_A1_SPECS.buildVolume.z}mm</p>
          <p>Nozzle: 0.4mm | Max Speed: {BAMBU_A1_SPECS.maxSpeed}mm/s</p>
        </div>
      </div>

      {/* Quality Profiles */}
      <div>
        <Label className="text-gray-300 mb-2 block">Quality Profiles</Label>
        <div className="grid grid-cols-2 gap-2">
          {qualityProfiles.map((profile) => (
            <Button
              key={profile.name}
              variant={selectedQuality === profile.name ? "default" : "outline"}
              size="sm"
              onClick={() => applyQualityProfile(profile.name)}
              className="text-xs"
            >
              {profile.name}
              <br />
              <span className="text-xs opacity-70">{profile.layerHeight}mm</span>
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-gray-600" />

      {/* Material Profiles */}
      <div>
        <Label className="text-gray-300 mb-2 block">Material Profiles</Label>
        <div className="grid grid-cols-2 gap-2">
          {materialProfiles.map((material) => (
            <Button
              key={material.name}
              variant={selectedMaterial === material.name ? "default" : "outline"}
              size="sm"
              onClick={() => applyMaterialProfile(material.name)}
              className="text-xs"
            >
              {material.name}
              <br />
              <span className="text-xs opacity-70">{material.printTemp}°C</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
