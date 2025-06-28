
export interface GCodeAnalysis {
  totalTime: number;
  layers: number;
  materialUsed: {
    length: number;
    weight: number;
    volume: number;
  };
}

export const analyzeGCode = (gcodeContent: string): GCodeAnalysis => {
  const lines = gcodeContent.split('\n');
  let totalTime = 0;
  let materialUsed = 0;
  let layers = 0;
  let currentX = 0, currentY = 0, currentZ = 0;
  let currentE = 0;
  
  lines.forEach(line => {
    const trimmed = line.trim().toUpperCase();
    
    // Layer counting
    if (trimmed.includes('LAYER:') || trimmed.includes('LAYER_HEIGHT')) {
      layers++;
    }
    
    // Movement commands
    if (trimmed.startsWith('G1') || trimmed.startsWith('G0')) {
      const xMatch = trimmed.match(/X([-\d.]+)/);
      const yMatch = trimmed.match(/Y([-\d.]+)/);
      const zMatch = trimmed.match(/Z([-\d.]+)/);
      const eMatch = trimmed.match(/E([-\d.]+)/);
      const fMatch = trimmed.match(/F([-\d.]+)/);
      
      const newX = xMatch ? parseFloat(xMatch[1]) : currentX;
      const newY = yMatch ? parseFloat(yMatch[1]) : currentY;
      const newZ = zMatch ? parseFloat(zMatch[1]) : currentZ;
      const newE = eMatch ? parseFloat(eMatch[1]) : currentE;
      const feedRate = fMatch ? parseFloat(fMatch[1]) : 1800;
      
      // Calculate distance and time
      const distance = Math.sqrt(
        Math.pow(newX - currentX, 2) + 
        Math.pow(newY - currentY, 2) + 
        Math.pow(newZ - currentZ, 2)
      );
      
      const time = (distance / (feedRate / 60));
      totalTime += time;
      
      // Material usage
      if (newE > currentE) {
        materialUsed += (newE - currentE);
      }
      
      currentX = newX;
      currentY = newY;
      currentZ = newZ;
      currentE = newE;
    }
    
    // Time estimates from slicer comments
    if (trimmed.includes('TIME:') || trimmed.includes('PRINT_TIME:')) {
      const timeMatch = trimmed.match(/(\d+)/);
      if (timeMatch) {
        totalTime = parseInt(timeMatch[1]);
      }
    }
  });
  
  // Calculate actual material usage from E values
  const filamentVolume = materialUsed * Math.PI * Math.pow(1.75/2, 2);
  const filamentWeight = filamentVolume * 0.00124;
  
  return {
    totalTime,
    layers,
    materialUsed: {
      length: materialUsed / 1000,
      weight: filamentWeight,
      volume: filamentVolume / 1000
    }
  };
};
