import * as THREE from 'three';

export interface DynamicPlatformConfig {
  modelBounds: THREE.Box3;
  padding?: number;
  gridSpacing?: number;
}

/**
 * Creates a large grid covering the entire viewable area
 */
export const createDynamicBuildPlatform = (config: DynamicPlatformConfig): THREE.Group => {
  const platformGroup = new THREE.Group();
  
  // Large grid size to cover entire viewable area
  const gridSize = 1500;
  const gridDivisions = 75;
  
  // Create large XY plane grid (horizontal, at origin)
  const xyGridHelper = new THREE.GridHelper(
    gridSize,
    gridDivisions,
    0x888888, // Light gray for grid lines
    0x666666  // Slightly darker gray for center lines
  );
  xyGridHelper.position.set(0, 0, 0); // Position at origin
  xyGridHelper.material.transparent = true;
  xyGridHelper.material.opacity = 0.15;
  platformGroup.add(xyGridHelper);
  
  return platformGroup;
};

/**
 * Updates an existing dynamic platform based on new model bounds
 */
export const updateDynamicBuildPlatform = (
  platformGroup: THREE.Group,
  config: DynamicPlatformConfig
): void => {
  // Clear existing children
  while (platformGroup.children.length > 0) {
    const child = platformGroup.children[0];
    platformGroup.remove(child);
    
    // Dispose of geometries and materials
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }
  
  // Create new platform with updated configuration
  const newPlatform = createDynamicBuildPlatform(config);
  
  // Copy all children from new platform to existing group
  while (newPlatform.children.length > 0) {
    const child = newPlatform.children[0];
    newPlatform.remove(child);
    platformGroup.add(child);
  }
  
  // Update position
  platformGroup.position.copy(newPlatform.position);
};

/**
 * Calculates optimal camera position for viewing the dynamic platform
 */
export const getOptimalCameraPosition = (modelBounds: THREE.Box3, padding: number = 50): THREE.Vector3 => {
  const modelSize = new THREE.Vector3();
  modelBounds.getSize(modelSize);
  
  const modelCenter = new THREE.Vector3();
  modelBounds.getCenter(modelCenter);
  
  // Calculate distance needed to view the entire model + platform
  const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
  const distance = Math.max(maxDimension * 2, 200);
  
  // Position camera at an angle to view the model well
  return new THREE.Vector3(
    modelCenter.x + distance * 0.8,
    modelCenter.y + distance * 0.8,
    modelCenter.z + distance * 0.6
  );
};