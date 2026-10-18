
import type { JobTotals } from '../../shared/pricing';
import * as THREE from 'three';

export interface PrintSettings {
  layerHeight: number;
  infillDensity: number;
  printSpeed: number;
  outerWallSpeed: number;
  infillSpeed: number;
  travelSpeed: number;
  printTemperature: number;
  bedTemperature: number;
  supportMaterial: boolean;
  raftEnabled: boolean;
  nozzleDiameter: number;
}

export interface PrintEstimate {
  source: 'preliminary';
  requiresConfirmation: true;
  warnings: string[];
  totalTime: number;
  layers: number;
  materialUsed: {
    length: number;
    weight: number;
    volume: number;
  };
  breakdown: {
    outerWalls: number;
    infill: number;
    travel: number;
    overhead: number;
  };
}

export const estimatePrintTime = (geometry: THREE.BufferGeometry, settings: PrintSettings): PrintEstimate | null => {
  if (!geometry?.getAttribute('position')?.count) return null;
  if (![settings.layerHeight, settings.nozzleDiameter, settings.printSpeed, settings.outerWallSpeed, settings.infillSpeed, settings.travelSpeed].every(n => Number.isFinite(n) && n > 0) || !Number.isFinite(settings.infillDensity) || settings.infillDensity < 0 || settings.infillDensity > 100) return null;
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every(n => Number.isFinite(n) && n > 0)) return null;

  // Calculate layers
  const layers = Math.ceil(size.z / settings.layerHeight);
  
  // Estimate layer area (simplified as top-down projection)
  const layerArea = size.x * size.y;
  
  // Calculate perimeter (simplified estimation)
  const perimeter = 2 * (size.x + size.y);
  
  // Calculate infill area
  const infillArea = layerArea * (settings.infillDensity / 100);
  
  // Time calculations per layer
  const outerWallTime = perimeter / settings.outerWallSpeed;
  const infillTime = infillArea / (settings.nozzleDiameter * 1.2) / settings.infillSpeed;
  const travelTime = (perimeter * 0.3) / settings.travelSpeed;
  
  const timePerLayer = outerWallTime + infillTime + travelTime;
  const totalPrintTime = timePerLayer * layers;
  
  // Add overhead for heating, homing, etc.
  const overhead = 300; // 5 minutes
  const finalTime = totalPrintTime + overhead;
  
  // Material estimation
  const extrusionWidth = settings.nozzleDiameter * 1.2;
  const wallVolume = perimeter * settings.layerHeight * extrusionWidth * layers;
  const infillVolume = infillArea * settings.layerHeight * layers;
  const totalExtrusionVolume = wallVolume + infillVolume;
  
  // Filament calculations (1.75mm standard filament)
  const filamentDiameter = 1.75;
  const filamentCrossSectionArea = Math.PI * Math.pow(filamentDiameter / 2, 2);
  const filamentLength = totalExtrusionVolume / filamentCrossSectionArea;
  const filamentWeight = totalExtrusionVolume * 0.00124; // PLA density
  
  return {
    source: 'preliminary', requiresConfirmation: true,
    warnings: ['Bounding-box approximation; supports and purge require confirmation in Bambu Studio.'],
    totalTime: finalTime,
    layers,
    materialUsed: {
      length: filamentLength / 1000, // Convert to meters
      weight: filamentWeight, // Already in grams
      volume: totalExtrusionVolume / 1000 // Convert to cm³
    },
    breakdown: {
      outerWalls: outerWallTime * layers,
      infill: infillTime * layers,
      travel: travelTime * layers,
      overhead
    }
  };
};

export function toPreliminaryJob(estimate: Pick<PrintEstimate, 'totalTime' | 'materialUsed'>, quantity: number): JobTotals {
  return { source:'preliminary', hours:estimate.totalTime/3600, grams:estimate.materialUsed.weight, quantity, scope:'per-item' };
}
