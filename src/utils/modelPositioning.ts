import * as THREE from 'three';

export interface PositioningResult {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  wasScaled: boolean;
}

/**
 * Auto-position a model for dynamic platform (no fixed build volume constraints)
 * Places the model flush to the bottom with its minimum corner at origin
 */
export const positionModelInBuildVolume = (geometry: THREE.BufferGeometry): PositioningResult => {
  // Compute bounding box if not already computed
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  
  const boundingBox = geometry.boundingBox!;
  
  // For dynamic platform, we don't scale down models - we adapt the platform to fit
  const scaleFactor = 1;
  const wasScaled = false;
  
  // Position the model so its bottom-back-left corner is at the origin (0, 0, 0)
  // Account for the model's local bounding box offset
  const localMinX = boundingBox.min.x;
  const localMinY = boundingBox.min.y;
  const localMinZ = boundingBox.min.z;
  
  // Position to place the model's minimum corner at the origin
  const position = new THREE.Vector3(
    -localMinX,
    -localMinY,
    -localMinZ
  );
  
  const scale = new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor);
  
  return {
    position,
    scale,
    wasScaled
  };
};

/**
 * Check if a model is within reasonable platform boundaries (for dynamic platform)
 * Since we have dynamic platform, we're more permissive
 */
export const isModelWithinBuildVolume = (mesh: THREE.Mesh): boolean => {
  const boundingBox = new THREE.Box3().setFromObject(mesh);
  
  // For dynamic platform, we mainly check that the model is above the platform (z >= 0)
  return boundingBox.min.z >= -1; // Allow small tolerance below platform
};

/**
 * Constrain model position for dynamic platform (minimal constraints)
 */
export const constrainToBuiltVolume = (position: THREE.Vector3, mesh: THREE.Mesh): THREE.Vector3 => {
  const boundingBox = new THREE.Box3().setFromObject(mesh);
  const constrainedPosition = position.clone();
  
  // Main constraint: keep model bottom at or above platform level (z >= 0)
  const modelMinZ = position.z + boundingBox.min.z - mesh.position.z;
  
  if (modelMinZ < 0) {
    constrainedPosition.z = position.z + (0 - modelMinZ);
  }
  
  return constrainedPosition;
};