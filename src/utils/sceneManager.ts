import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
export { OrbitControls };
export type CameraView = 'iso' | 'front' | 'top' | 'right';

export interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  mesh?: THREE.Mesh;
  grid?: THREE.Group;
  showGrid: () => void;
  hideGrid: () => void;
  repositionGrid: (x: number, y: number, z: number) => void;
  fit: (object?: THREE.Object3D, view?: CameraView) => void;
  zoom: (factor: number) => void;
  dispose: () => void;
  onCameraChange?: (azimuth: number, elevation: number, isRotating: boolean) => void;
}

// Create build platform grid based on Bambu Lab A1 specs (256x256x256mm)
const createBuildGrid = (): THREE.Group => {
  const gridGroup = new THREE.Group();
  
  // Build platform size in mm (converted to units)
  const buildSize = 256;
  const gridSize = buildSize;
  const divisions = 32; // 8mm grid spacing
  
  // Main grid lines at the bottom (build platform level)
  const gridHelper = new THREE.GridHelper(gridSize, divisions, 0xcbd2da, 0xe0e5eb);
  gridHelper.rotateX(Math.PI / 2); // Rotate to XY plane
  gridHelper.position.z = 0; // Position at the bottom of build volume
  gridGroup.add(gridHelper);
  
  // Build volume outline - positioned so bottom is at z=0
  const outlineGeometry = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(buildSize, buildSize, buildSize)
  );
  const outlineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x4a90e2, 
    transparent: true, 
    opacity: 0.12
  });
  const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
  outline.position.z = buildSize / 2; // Move up so bottom edge is at z=0
  gridGroup.add(outline);
  
  // Build platform (bottom face) at z=0
  const platformGeometry = new THREE.PlaneGeometry(buildSize, buildSize);
  const platformMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xf0f0f0, 
    transparent: true, 
    opacity: 0.1,
    side: THREE.DoubleSide
  });
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.z = 0; // Build platform at bottom
  gridGroup.add(platform);
  
  // Add axis indicators with labels
  const axisLength = buildSize / 2;
  
  // X-axis (Red)
  const xGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(axisLength, 0, 0)
  ]);
  const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const xAxis = new THREE.Line(xGeometry, xMaterial);
  gridGroup.add(xAxis);
  
  // Y-axis (Green)
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, axisLength, 0)
  ]);
  const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const yAxis = new THREE.Line(yGeometry, yMaterial);
  gridGroup.add(yAxis);
  
  // Z-axis (Blue)
  const zGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, axisLength)
  ]);
  const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
  const zAxis = new THREE.Line(zGeometry, zMaterial);
  gridGroup.add(zAxis);
  
  // Create axis labels using CSS2DRenderer-style labels
  const createAxisLabel = (text: string, position: THREE.Vector3, color: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 64;
    canvas.height = 32;
    
    context.fillStyle = color;
    context.font = 'Bold 20px Arial';
    context.textAlign = 'center';
    context.fillText(text, 32, 20);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(20, 10, 1);
    
    return sprite;
  };
  
  // Add axis labels
  const xLabel = createAxisLabel('X', new THREE.Vector3(axisLength + 20, 0, 0), '#ff0000');
  const yLabel = createAxisLabel('Y', new THREE.Vector3(0, axisLength + 20, 0), '#00ff00');
  const zLabel = createAxisLabel('Z', new THREE.Vector3(0, 0, axisLength + 20), '#0000ff');
  
  gridGroup.add(xLabel);
  gridGroup.add(yLabel);
  gridGroup.add(zLabel);
  
  // Rotate the entire grid group clockwise by 90 degrees around X-axis
  gridGroup.rotation.x = -Math.PI / 2; // -90 degrees for clockwise rotation around X-axis
  
  return gridGroup;
};

export const createScene = (container: HTMLElement, onCameraChange?: (azimuth: number, elevation: number, isRotating: boolean) => void): { refs: SceneRefs; controls: OrbitControls; animate: () => void } => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f6f8);
  const camera = new THREE.OrthographicCamera(-200, 200, 150, -150, 0.1, 10000);
  let aspect = 1;
  let halfHeight = 150;
  camera.position.set(300, 240, 300);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  container.appendChild(labels.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8c96a5, 2));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(150, 300, 200);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-200, 100, -100);
  scene.add(fill);
  const grid = createBuildGrid();
  grid.visible = false;
  scene.add(grid);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 30, 0);
  controls.minZoom = 0.05;
  controls.maxZoom = 100;
  controls.minDistance = 0.1;
  controls.maxDistance = 100000;
  controls.update();
  let rotating = false;
  const notify = () => onCameraChange?.(controls.getAzimuthalAngle(), Math.PI / 2 - controls.getPolarAngle(), rotating);
  controls.addEventListener('start', () => { rotating = true; notify(); });
  controls.addEventListener('end', () => { rotating = false; notify(); });
  controls.addEventListener('change', notify);

  const dimensions = new THREE.Group();
  scene.add(dimensions);
  const dimensionMaterial = new THREE.LineBasicMaterial({ color: 0x5777a1, depthTest: false, transparent: true, opacity: 0.8 });
  const dimensionLines = new THREE.LineSegments(new THREE.BufferGeometry(), dimensionMaterial);
  dimensionLines.renderOrder = 2;
  dimensions.add(dimensionLines);
  const dimensionLabels = ['Width', 'Depth', 'Height'].map(name => {
    const element = document.createElement('div');
    element.className = 'viewer-dimension';
    element.setAttribute('aria-label', name);
    const label = new CSS2DObject(element);
    dimensions.add(label);
    return label;
  });
  let mesh: THREE.Mesh | undefined;
  const previousMatrix = new THREE.Matrix4();
  let previousMesh: THREE.Mesh | undefined;
  const updateDimensions = () => {
    dimensions.visible = !!mesh?.visible && !!mesh.parent;
    if (!dimensions.visible) return;
    mesh!.updateWorldMatrix(true, false);
    if (previousMesh === mesh && previousMatrix.equals(mesh!.matrixWorld)) return;
    previousMesh = mesh;
    previousMatrix.copy(mesh!.matrixWorld);
    // Measure vertices, not a rotated local bounding box; cache until the part moves.
    const box = new THREE.Box3().setFromObject(mesh!, true);
    const { min, max } = box;
    const size = box.getSize(new THREE.Vector3());
    const gap = Math.max(size.x, size.y, size.z) * 0.12;
    const pairs = [
      [new THREE.Vector3(min.x, min.y, max.z + gap), new THREE.Vector3(max.x, min.y, max.z + gap)],
      [new THREE.Vector3(max.x + gap, min.y, min.z), new THREE.Vector3(max.x + gap, min.y, max.z)],
      [new THREE.Vector3(min.x - gap, min.y, min.z), new THREE.Vector3(min.x - gap, max.y, min.z)]
    ];
    const anchors = [
      [new THREE.Vector3(min.x, min.y, max.z), new THREE.Vector3(max.x, min.y, max.z)],
      [new THREE.Vector3(max.x, min.y, min.z), new THREE.Vector3(max.x, min.y, max.z)],
      [new THREE.Vector3(min.x, min.y, min.z), new THREE.Vector3(min.x, max.y, min.z)]
    ];
    const points: THREE.Vector3[] = [];
    pairs.forEach(([a, b], index) => {
      points.push(a, b, anchors[index][0], a, anchors[index][1], b);
      dimensionLabels[index].position.copy(a).lerp(b, 0.5);
      dimensionLabels[index].element.textContent = `${['W', 'D', 'H'][index]} ${[size.x, size.z, size.y][index].toFixed(2)} mm`;
    });
    dimensionLines.geometry.dispose();
    dimensionLines.geometry = new THREE.BufferGeometry().setFromPoints(points);
  };
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    aspect = width / height;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labels.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  let frame = 0;
  let disposed = false;
  const animate = () => {
    if (disposed) return;
    controls.update();
    updateDimensions();
    renderer.render(scene, camera);
    labels.render(scene, camera);
    frame = requestAnimationFrame(animate);
  };
  const refs: SceneRefs = {
    scene, camera, renderer, grid,
    get mesh() { return mesh; },
    set mesh(value) { mesh = value; previousMesh = undefined; },
    showGrid: () => { grid.visible = true; },
    hideGrid: () => { grid.visible = false; },
    repositionGrid: (x, y, z) => grid.position.set(x, y, z),
    fit: (object, view = 'iso') => {
      const box = object ? new THREE.Box3().setFromObject(object) : new THREE.Box3(new THREE.Vector3(-128, 0, -128), new THREE.Vector3(128, 80, 128));
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      // Keep engineering views free of perspective distortion, with room for dimensions.
      halfHeight = Math.max(sphere.radius, 1) * 1.4 / Math.min(aspect, 1);
      const distance = Math.max(sphere.radius, 1) * 4;
      camera.zoom = 1;
      resize();
      const directions = { iso: new THREE.Vector3(1, 0.8, 1), front: new THREE.Vector3(0, 0, 1), top: new THREE.Vector3(0, 1, 0.00001), right: new THREE.Vector3(1, 0, 0) };
      controls.target.copy(sphere.center);
      camera.position.copy(sphere.center).addScaledVector(directions[view].normalize(), distance);
      camera.near = Math.max(distance / 10000, 0.001);
      camera.far = distance * 100;
      controls.maxDistance = distance * 20;
      camera.updateProjectionMatrix();
      controls.update();
    },
    zoom: factor => {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom / factor, controls.minZoom, controls.maxZoom);
      camera.updateProjectionMatrix();
      controls.update();
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse(object => {
        const drawable = object as THREE.Mesh;
        drawable.geometry?.dispose();
        const materials = Array.isArray(drawable.material) ? drawable.material : [drawable.material];
        materials.filter(Boolean).forEach(material => {
          (material as THREE.MeshBasicMaterial).map?.dispose();
          material.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
      labels.domElement.remove();
    }
  };
  return { refs, controls, animate };
};
