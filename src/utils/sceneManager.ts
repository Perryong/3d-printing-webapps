import * as THREE from 'three';

export interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  mesh?: THREE.Mesh;
  grid?: THREE.Group;
  showGrid: () => void;
  hideGrid: () => void;
}

export interface OrbitControls {
  dispose: () => void;
  enabled: boolean;
}

// Create build platform grid based on Bambu Lab A1 specs (256x256x256mm)
const createBuildGrid = (): THREE.Group => {
  const gridGroup = new THREE.Group();
  
  // Build platform size in mm
  const buildSize = 256;
  const divisions = 32; // 8mm grid spacing
  
  // Main grid lines at the bottom (build platform level)
  const gridHelper = new THREE.GridHelper(buildSize, divisions, 0x888888, 0xcccccc);
  gridHelper.position.y = 0; // Position at build platform level
  gridGroup.add(gridHelper);
  
  // Build volume outline
  const outlineGeometry = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(buildSize, buildSize, buildSize)
  );
  const outlineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x4a90e2, 
    transparent: true, 
    opacity: 0.3 
  });
  const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
  outline.position.z = buildSize / 2; // Center the outline vertically
  gridGroup.add(outline);
  
  // Build platform (bottom face) at y=0
  const platformGeometry = new THREE.PlaneGeometry(buildSize, buildSize);
  const platformMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xf0f0f0, 
    transparent: true, 
    opacity: 0.1,
    side: THREE.DoubleSide
  });
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  platform.position.y = 0; // At build platform level
  gridGroup.add(platform);
  
  // Add axis indicators
  const axisLength = buildSize / 2;
  
  // X-axis (Red)
  const xGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(axisLength, 0, 0)
  ]);
  const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const xAxis = new THREE.Line(xGeometry, xMaterial);
  gridGroup.add(xAxis);
  
  // Y-axis (Green) - pointing up
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, axisLength)
  ]);
  const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const yAxis = new THREE.Line(yGeometry, yMaterial);
  gridGroup.add(yAxis);
  
  // Z-axis (Blue) - pointing forward
  const zGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, axisLength, 0)
  ]);
  const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
  const zAxis = new THREE.Line(zGeometry, zMaterial);
  gridGroup.add(zAxis);
  
  // Create axis labels
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
  const yLabel = createAxisLabel('Y', new THREE.Vector3(0, 0, axisLength + 20), '#00ff00');
  const zLabel = createAxisLabel('Z', new THREE.Vector3(0, axisLength + 20, 0), '#0000ff');
  
  gridGroup.add(xLabel);
  gridGroup.add(yLabel);
  gridGroup.add(zLabel);
  
  return gridGroup;
};

export const createScene = (container: HTMLElement): { refs: SceneRefs; controls: OrbitControls; animate: () => void } => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene with white background
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Camera with proper initial positioning
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
  camera.position.set(300, 300, 200); // Better initial position
  camera.lookAt(0, 0, 50); // Look at center of build volume

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Improved lighting setup
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(200, 200, 200);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 1000;
  directionalLight.shadow.camera.left = -300;
  directionalLight.shadow.camera.right = 300;
  directionalLight.shadow.camera.top = 300;
  directionalLight.shadow.camera.bottom = -300;
  scene.add(directionalLight);

  // Additional fill light
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-200, -200, 100);
  scene.add(fillLight);

  // Create build grid
  const grid = createBuildGrid();
  grid.visible = false;

  // Camera controls
  let isRotating = false;
  let mouseX = 0;
  let mouseY = 0;
  let targetRotationX = 0;
  let targetRotationY = 0;
  let currentRotationX = 0;
  let currentRotationY = 0;
  let meshRef: THREE.Mesh | null = null;

  const handleMouseDown = (event: MouseEvent) => {
    if (event.button === 2 || event.ctrlKey) {
      isRotating = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isRotating) return;
    
    const deltaX = event.clientX - mouseX;
    const deltaY = event.clientY - mouseY;
    
    targetRotationY += deltaX * 0.01;
    targetRotationX += deltaY * 0.01;
    
    // Clamp vertical rotation
    targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationX));
    
    mouseX = event.clientX;
    mouseY = event.clientY;
  };

  const handleMouseUp = () => {
    isRotating = false;
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY * 0.001;
    const distance = camera.position.length();
    const newDistance = Math.max(50, Math.min(1000, distance * (1 + delta)));
    
    // Maintain camera direction while changing distance
    const direction = camera.position.clone().normalize();
    camera.position.copy(direction.multiplyScalar(newDistance));
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  renderer.domElement.addEventListener('mousedown', handleMouseDown);
  renderer.domElement.addEventListener('mousemove', handleMouseMove);
  renderer.domElement.addEventListener('mouseup', handleMouseUp);
  renderer.domElement.addEventListener('wheel', handleWheel);
  renderer.domElement.addEventListener('contextmenu', handleContextMenu);

  const controls: OrbitControls = {
    enabled: true,
    dispose: () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
    }
  };

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    
    // Smooth camera rotation around the center point
    currentRotationX += (targetRotationX - currentRotationX) * 0.1;
    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
    
    const distance = camera.position.length();
    camera.position.x = distance * Math.sin(currentRotationY) * Math.cos(currentRotationX);
    camera.position.z = distance * Math.sin(currentRotationX);
    camera.position.y = distance * Math.cos(currentRotationY) * Math.cos(currentRotationX);
    camera.lookAt(0, 0, 50); // Look at center of build volume
    
    renderer.render(scene, camera);
  };

  // Handle resize
  const handleResize = () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  };

  window.addEventListener('resize', handleResize);

  const refs: SceneRefs = {
    scene,
    camera,
    renderer,
    grid,
    get mesh() { return meshRef || undefined; },
    set mesh(mesh: THREE.Mesh | undefined) { meshRef = mesh || null; },
    showGrid: () => {
      if (!scene.children.includes(grid)) {
        scene.add(grid);
      }
      grid.visible = true;
    },
    hideGrid: () => {
      grid.visible = false;
    }
  };

  return { refs, controls, animate };
};