
export const BAMBU_A1_SPECS = {
  buildVolume: { x: 256, y: 256, z: 256 },
  maxSpeed: 500,
  maxAcceleration: 10000,
  nozzleDiameter: 0.4,
  filamentDiameter: 1.75,
  speedProfiles: {
    silent: { outer: 30, inner: 60, infill: 80, travel: 150 },
    standard: { outer: 50, inner: 100, infill: 150, travel: 250 },
    sport: { outer: 80, inner: 150, infill: 200, travel: 300 },
    turbo: { outer: 100, inner: 200, infill: 250, travel: 350 }
  }
};

export const DEFAULT_PRINT_SETTINGS = {
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
