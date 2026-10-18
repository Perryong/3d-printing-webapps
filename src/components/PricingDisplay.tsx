import React from 'react';
interface PricingDisplayProps {
  printTime: number; // in seconds
  modelWeight: number; // in grams
  modelVolume: number; // in cm³
  cameraAzimuth?: number;
  cameraElevation?: number;
  isCameraRotating?: boolean;
}
const PricingDisplay: React.FC<PricingDisplayProps> = () => <p className="text-sm text-slate-300 mt-2">Use “Get print quote” for a server-calculated SGD estimate and delivery options. Owner slicing confirmation is required before payment.</p>;
export default PricingDisplay;
