
import * as THREE from 'three';

export const loadSTL = (arrayBuffer: ArrayBuffer): THREE.BufferGeometry => {
  try {
    const view = new DataView(arrayBuffer);
    let offset = 80; // Skip header
    const triangleCount = view.getUint32(offset, true);
    offset += 4;

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];

    for (let i = 0; i < triangleCount; i++) {
      // Normal vector
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);
      offset += 12;

      // Vertices
      for (let j = 0; j < 3; j++) {
        const x = view.getFloat32(offset, true);
        const y = view.getFloat32(offset + 4, true);
        const z = view.getFloat32(offset + 8, true);
        
        vertices.push(x, y, z);
        normals.push(nx, ny, nz);
        offset += 12;
      }
      
      offset += 2; // Skip attribute byte count
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    
    return geometry;
  } catch (err) {
    throw new Error('Failed to parse STL file');
  }
};
