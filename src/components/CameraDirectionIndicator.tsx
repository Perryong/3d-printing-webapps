import React from 'react';
import { Compass } from 'lucide-react';

interface CameraDirectionIndicatorProps {
  azimuth: number; // Camera rotation around Y axis in radians
  elevation: number; // Camera elevation angle in radians
  isRotating: boolean;
}

const CameraDirectionIndicator: React.FC<CameraDirectionIndicatorProps> = ({
  azimuth,
  elevation,
  isRotating
}) => {
  // Convert radians to degrees for display
  const azimuthDegrees = ((azimuth * 180) / Math.PI) % 360;
  const elevationDegrees = (elevation * 180) / Math.PI;

  // Calculate cardinal direction from azimuth
  const getCardinalDirection = (degrees: number): string => {
    // Normalize to 0-360 range
    const normalizedDegrees = ((degrees % 360) + 360) % 360;
    
    if (normalizedDegrees >= 337.5 || normalizedDegrees < 22.5) return 'N';
    if (normalizedDegrees >= 22.5 && normalizedDegrees < 67.5) return 'NE';
    if (normalizedDegrees >= 67.5 && normalizedDegrees < 112.5) return 'E';
    if (normalizedDegrees >= 112.5 && normalizedDegrees < 157.5) return 'SE';
    if (normalizedDegrees >= 157.5 && normalizedDegrees < 202.5) return 'S';
    if (normalizedDegrees >= 202.5 && normalizedDegrees < 247.5) return 'SW';
    if (normalizedDegrees >= 247.5 && normalizedDegrees < 292.5) return 'W';
    if (normalizedDegrees >= 292.5 && normalizedDegrees < 337.5) return 'NW';
    return 'N';
  };

  // Calculate elevation description
  const getElevationDescription = (degrees: number): string => {
    if (degrees > 45) return 'Looking Up';
    if (degrees > 15) return 'High View';
    if (degrees > -15) return 'Level View';
    if (degrees > -45) return 'Low View';
    return 'Looking Down';
  };

  const cardinalDirection = getCardinalDirection(azimuthDegrees);
  const elevationDescription = getElevationDescription(elevationDegrees);

  return (
    <div 
      className={`bg-background/90 backdrop-blur-sm border rounded-lg p-2 transition-all duration-300 ${
        isRotating ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Compass icon that rotates with camera */}
        <div className="relative">
          <Compass 
            size={24} 
            className="text-primary"
            style={{ 
              transform: `rotate(${-azimuthDegrees}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
          {/* North indicator */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-xs font-bold text-red-500">
            N
          </div>
        </div>
        
        {/* Direction info */}
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold text-foreground">
            {cardinalDirection}
          </div>
          <div className="text-xs text-muted-foreground">
            {elevationDescription}
          </div>
        </div>
        
        {/* Angle display when actively rotating */}
        {isRotating && (
          <div className="text-xs text-muted-foreground">
            <div>Az: {Math.round(azimuthDegrees)}°</div>
            <div>El: {Math.round(elevationDegrees)}°</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraDirectionIndicator;