import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ModelManager } from '../src/utils/modelManager';

// Only the DOM boundary is substituted; geometry, transforms and selection are real.
const canvas = new EventTarget();
Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true });

const manager = () => new ModelManager(new THREE.Scene(), new THREE.PerspectiveCamera(), { domElement: canvas } as unknown as THREE.WebGLRenderer);

test('offset STL is centred and rests on the Y-up build plane after import', () => {
  const m = manager();
  const part = m.addModel('a', 'offset.stl', new THREE.BoxGeometry(20, 40, 60).translate(100, 200, 300));
  const box = new THREE.Box3().setFromObject(part.mesh);
  assert.ok(Math.abs(box.min.y) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new THREE.Vector3()).x) < 1e-6);
  assert.ok(Math.abs(box.getCenter(new THREE.Vector3()).z) < 1e-6);
  m.dispose();
});

test('reset restores placement and duplicate preserves the current placement plus offset', () => {
  const m = manager();
  const part = m.addModel('a', 'part.stl', new THREE.BoxGeometry(20, 40, 60).translate(100, 200, 300));
  m.updateModelProperty('a', 'position', 'x', 75);
  const copy = m.duplicateModel('a')!;
  assert.equal(copy.mesh.position.x, 95);
  assert.equal(copy.mesh.position.y, part.mesh.position.y);
  m.resetModelTransform('a');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(part.mesh).min.y) < 1e-6);
  m.dispose();
});

test('selected part keeps neutral shading and has sharp edge geometry', () => {
  const m = manager();
  const part = m.addModel('a', 'part.stl', new THREE.BoxGeometry(20, 40, 60));
  const colour = (part.mesh.material as THREE.MeshPhongMaterial).color.getHex();
  m.selectModel('a');
  assert.equal((part.mesh.material as THREE.MeshPhongMaterial).color.getHex(), colour);
  assert.ok(part.mesh.children.some(child => child instanceof THREE.LineSegments));
  m.dispose();
});

test('invalid scales cannot collapse or corrupt a part', () => {
  const m = manager();
  const part = m.addModel('a', 'part.stl', new THREE.BoxGeometry(20, 40, 60));
  for (const value of [0, -1, NaN, Infinity]) m.updateModelProperty('a', 'scale', 'x', value);
  assert.equal(part.mesh.scale.x, 1);
  m.dispose();
});

test('display modes preserve geometry, bounds, transforms and do not report model changes', () => {
  let changes = 0;
  const m = new ModelManager(new THREE.Scene(), new THREE.PerspectiveCamera(), {domElement:canvas} as unknown as THREE.WebGLRenderer, () => changes++);
  const part = m.addModel('a', 'a.stl', new THREE.BoxGeometry(20,30,40));
  const positions = Array.from(part.mesh.geometry.attributes.position.array);
  const bounds = new THREE.Box3().setFromObject(part.mesh).clone();
  const transform = JSON.stringify(part.transform);
  for (const mode of ['solid', 'edges', 'wireframe', 'xray'] as const) {
    m.setDisplayMode(mode);
    const material = part.mesh.material as THREE.MeshPhongMaterial;
    assert.equal(material.wireframe, mode === 'wireframe');
    assert.equal(material.transparent, mode === 'xray');
    assert.equal(part.mesh.children[0].visible, mode === 'edges');
    assert.deepEqual(Array.from(part.mesh.geometry.attributes.position.array), positions);
    assert.ok(new THREE.Box3().setFromObject(part.mesh).equals(bounds));
    assert.equal(JSON.stringify(part.transform), transform);
  }
  assert.equal(changes, 0);
  const next = m.addModel('b', 'b.stl', new THREE.BoxGeometry());
  assert.equal((next.mesh.material as THREE.MeshPhongMaterial).opacity, 0.3);
  m.dispose();
});
