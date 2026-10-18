import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { loadSTL } from '../src/utils/stlLoader';

test('loads binary and ASCII STL with identical bounds', () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 30, 40));
  const exporter = new STLExporter();
  for (const data of [exporter.parse(mesh, { binary: true }).buffer, new TextEncoder().encode(exporter.parse(mesh)).buffer]) {
    const geometry = loadSTL(data as ArrayBuffer);
    geometry.computeBoundingBox();
    assert.deepEqual(geometry.boundingBox!.getSize(new THREE.Vector3()).toArray(), [20,30,40]);
    assert.equal(geometry.attributes.position.count,36);
  }
});

test('rejects empty, malformed, truncated and nonfinite STL', () => {
  const binary = new STLExporter().parse(new THREE.Mesh(new THREE.BoxGeometry()), {binary:true}).buffer as ArrayBuffer;
  const invalid = binary.slice(0); new DataView(invalid).setFloat32(96, NaN, true);
  for (const data of [new ArrayBuffer(0), new TextEncoder().encode('solid empty\nendsolid empty').buffer, binary.slice(0,100), invalid]) {
    assert.throws(() => loadSTL(data as ArrayBuffer), /STL/);
  }
});

test('rejects malformed ASCII facets even when total vertices are divisible by three', () => {
  const data = `solid invalid
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 1 0 0
endloop
endfacet
facet normal 0 0 1
outer loop
vertex 0 1 0
vertex 0 0 1
vertex 1 0 1
vertex 0 1 1
endloop
endfacet
endsolid invalid`;
  assert.throws(() => loadSTL(new TextEncoder().encode(data).buffer), /Invalid STL/);
});
