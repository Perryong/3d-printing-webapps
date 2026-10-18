import * as THREE from 'three';
import { createScene } from '../src/utils/sceneManager';

const results = document.querySelector('#results')!;
const mount = document.querySelector<HTMLElement>('#viewer')!;
const { refs, controls, animate } = createScene(mount);
const checks: string[] = [];
const check = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
  checks.push(`PASS ${message}`);
};
const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
try {
  const part = new THREE.Mesh(new THREE.BoxGeometry(100, 20, 60));
  part.position.set(400, 10, 200);
  refs.scene.add(part);
  refs.mesh = part;
  refs.fit(part, 'top');
  animate();
  const position = refs.camera.position.clone();
  await tick();
  check(refs.camera.isOrthographicCamera, 'CAD views use orthographic projection');
  check(position.distanceTo(refs.camera.position) < 0.001, 'animation preserves the chosen view');
  check(controls.target.distanceTo(part.position) < 0.001, 'fit targets an offset part');
  const zoom = refs.camera.zoom;
  refs.zoom(0.8);
  check(refs.camera.zoom > zoom, 'zoom controls increase magnification');
  check(mount.querySelector('.viewer-dimension')?.textContent === 'W 100.00 mm', 'dimensions match known geometry');
  part.scale.x = 2;
  await tick();
  check(mount.querySelector('.viewer-dimension')?.textContent === 'W 200.00 mm', 'dimensions follow scaling');
  part.visible = false;
  await tick();
  check([...mount.querySelectorAll<HTMLElement>('.viewer-dimension')].every(label => label.style.display === 'none'), 'hidden parts have no dimension labels');
  part.visible = true;
  mount.style.width = '300px';
  await new Promise(resolve => setTimeout(resolve, 100));
  refs.fit(part, 'front');
  refs.camera.updateMatrixWorld();
  const box = new THREE.Box3().setFromObject(part);
  check([box.min, box.max].every(point => {
    const projected = point.clone().project(refs.camera);
    return Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;
  }), 'fit keeps geometry visible in a narrow viewport');
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 20, 64));
  cylinder.rotation.y = Math.PI / 4;
  refs.scene.add(cylinder);
  refs.mesh = cylinder;
  await tick();
  check(mount.querySelector('.viewer-dimension')?.textContent === 'W 20.00 mm', 'rotated curved parts use actual vertices for bounds');
  refs.dispose();
  check(mount.childElementCount === 0, 'disposal removes canvas and annotation renderer');
  await tick();
  check(mount.childElementCount === 0, 'animation remains stopped after disposal');
  results.textContent = checks.join('\n');
  document.title = 'PASS — STL viewer browser tests';
} catch (error) {
  refs.dispose();
  results.textContent = `${checks.join('\n')}\nFAIL ${error}`;
  document.title = 'FAIL — STL viewer browser tests';
  throw error;
}
