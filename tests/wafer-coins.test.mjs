import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } from 'three';

test('both exported wafer wells have a clear coin path, solid floor and thumb access', () => {
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
  for (const x of [-18, 18]) {
    // Sweep down from above the rim around a disk larger than the 24.65 mm SG $1 coin.
    for (const radius of [0, 6, 13.25]) {
      for (let i = 0; i < 32; i++) {
        const angle = i * Math.PI / 16;
        const floor = first([x + radius * Math.cos(angle), radius * Math.sin(angle), 32], [0,0,-1]);
        assert.ok(Math.abs(floor.z - 3.2) < .01, 'Insertion path must reach the floor');
      }
    }
    const width = first([x,0,15], [1,0,0]).x - first([x,0,15], [-1,0,0]).x;
    assert.ok(Math.abs(width - 27.2) < .02);
    for (const sign of [-1,1]) {
      assert.ok(first([x + sign * 6.9,-25,15], [0,1,0]).y > 0, 'Thumb cutout must be open');
      assert.ok(first([x + sign * 7.1,-25,15], [0,1,0]).y < -17, 'Material must retain the stack');
    }
  }
});
