import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

export const loadSTL = (arrayBuffer: ArrayBuffer): THREE.BufferGeometry => {
  if (!arrayBuffer.byteLength || arrayBuffer.byteLength > 50 * 1024 * 1024) {
    throw new Error('STL must be nonempty and no larger than 50 MB.');
  }
  let geometry: THREE.BufferGeometry | undefined;
  try {
    const binary = arrayBuffer.byteLength >= 84 &&
      84 + new DataView(arrayBuffer).getUint32(80, true) * 50 === arrayBuffer.byteLength;
    if (!binary) {
      const text = new TextDecoder().decode(arrayBuffer);
      const facets = text.match(/\bfacet\b[\s\S]*?\bendfacet\b/g) ?? [];
      if (!facets.length || facets.length !== (text.match(/\bfacet\b/g) ?? []).length ||
          facets.some(facet => (facet.match(/\bvertex\b/g) ?? []).length !== 3)) {
        throw new Error('Incomplete ASCII facets');
      }
    }
    geometry = new STLLoader().parse(arrayBuffer);
    const positions = geometry.getAttribute('position');
    if (!positions || positions.count < 3 || positions.count % 3 !== 0 ||
        !Array.from(positions.array).every(Number.isFinite)) throw new Error('Invalid vertices');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let hasArea = false;
    for (let i = 0; i < positions.count; i += 3) {
      a.fromBufferAttribute(positions, i); b.fromBufferAttribute(positions, i + 1); c.fromBufferAttribute(positions, i + 2);
      if (b.sub(a).cross(c.sub(a)).lengthSq() > 0) { hasArea = true; break; }
    }
    if (!hasArea) throw new Error('Empty surface');
    // STL normals are often missing or unreliable; derive them from the triangles.
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  } catch {
    geometry?.dispose();
    throw new Error('Invalid STL: no usable triangles, invalid coordinates or incomplete file. Export a binary or ASCII STL and try again.');
  }
};
