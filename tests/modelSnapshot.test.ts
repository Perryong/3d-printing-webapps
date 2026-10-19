import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createModelSnapshot } from "../src/utils/modelSnapshot";
import { loadSTL } from "../src/utils/stlLoader";
test("snapshot isolates selected geometry, preserves source and exports printer dimensions", async () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 5));
  const before = Array.from(mesh.geometry.attributes.position.array);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(2, 3, 4);
  mesh.position.set(70, 20, 90);
  mesh.add(new THREE.Mesh(new THREE.BoxGeometry(500, 500, 500)));
  const a = await createModelSnapshot(mesh, "cube.stl");
  assert.deepEqual(a.boundsMm, { x: 40, y: 30, z: 20 });
  assert.deepEqual(Array.from(mesh.geometry.attributes.position.array), before);
  const loaded = loadSTL(await a.file.arrayBuffer());
  const b = loaded.boundingBox!.getSize(new THREE.Vector3());
  assert.ok(b.distanceTo(new THREE.Vector3(40, 30, 20)) < 0.001);
  (mesh.material as THREE.MeshBasicMaterial).wireframe = true;
  const same = await createModelSnapshot(mesh, "cube.stl");
  assert.equal(a.revision, same.revision);
  mesh.scale.x = 3;
  const changed = await createModelSnapshot(mesh, "cube.stl");
  assert.notEqual(a.revision, changed.revision);
  for (const g of [
    a.geometry,
    same.geometry,
    changed.geometry,
    loaded,
    mesh.geometry,
  ])
    g.dispose();
});
