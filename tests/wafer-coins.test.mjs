import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } from 'three';

test('all four denomination-specific wafer wells have a clear coin path, solid floor and thumb access', () => {
  const raw = readFileSync('public/singapore-products/wafer-coin-collector/wafer-coin-collector.stl');
  const positions = [];
  for (let i = 0; i < raw.readUInt32LE(80); i++) {
    for (let k = 0; k < 9; k++) positions.push(raw.readFloatLE(96 + i * 50 + k * 4));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const model = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
  function first(origin, direction) {
    const hit = new Raycaster(new Vector3(...origin), new Vector3(...direction)).intersectObject(model)[0];
    assert.ok(hit, 'Expected to hit the exported part');
    return hit.point;
  }
  for (const [x, coinDiameter] of [[-40, 24.65], [-11, 23], [16, 21], [40, 18.5]]) {
    // Allow 0.39 mm per side on the faceted STL for the entire insertion path.
    for (const radius of [0, coinDiameter / 4, coinDiameter / 2 + 0.39]) {
      for (let i = 0; i < 32; i++) {
        const angle = i * Math.PI / 16;
        const floor = first([x + radius * Math.cos(angle), -2 + radius * Math.sin(angle), 32], [0,0,-1]);
        assert.ok(Math.abs(floor.z - 3.2) < .01, 'Insertion path must reach the floor');
      }
    }
    const width = first([x,-2,15], [1,0,0]).x - first([x,-2,15], [-1,0,0]).x;
    assert.ok(Math.abs(width - (coinDiameter + 0.8)) < .02);
    for (const sign of [-1,1]) {
      assert.ok(first([x + sign * 5.9,-25,15], [0,1,0]).y > 0, 'Thumb cutout must be open');
      assert.ok(first([x + sign * 6.1,-25,15], [0,1,0]).y < -17, 'Material must retain the stack');
    }
  }
});
