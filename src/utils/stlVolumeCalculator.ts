import * as THREE from 'three';

/**
 * Calculate the actual volume of a mesh using the divergence theorem
 * This method calculates volume from the triangular faces of the geometry
 * @param geometry - Three.js BufferGeometry
 * @returns volume in mm³
 */
export const calculateMeshVolume = (geometry: THREE.BufferGeometry): number => {
  if (!geometry.attributes.position) {
    return 0;
  }

  const positions = geometry.attributes.position.array as Float32Array;
  const hasIndex = geometry.index !== null;
  let volume = 0;

  if (hasIndex) {
    // Indexed geometry
    const indices = geometry.index!.array;
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const v1 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      const v2 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
      const v3 = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

      volume += calculateTetrahedronVolume(v1, v2, v3);
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < positions.length; i += 9) {
      const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
      const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

      volume += calculateTetrahedronVolume(v1, v2, v3);
    }
  }

  return Math.abs(volume);
};

/**
 * Calculate the signed volume of a tetrahedron formed by three vertices and the origin
 * Uses the formula: V = (1/6) * dot(v1, cross(v2, v3))
 */
const calculateTetrahedronVolume = (v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3): number => {
  const cross = new THREE.Vector3().crossVectors(v2, v3);
  return (1 / 6) * v1.dot(cross);
};

/**
 * Convert volume from mm³ to cm³
 */
export const convertMmToCm = (volumeMm3: number): number => {
  return volumeMm3 / 1000;
};