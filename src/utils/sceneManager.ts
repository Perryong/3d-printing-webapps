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
  
  // Build platform size in mm (converted to units)
  const buildSize = 256;
  const gridSize = buildSize;
  const divisions = 32; // 8mm grid spacing
  
  // Main grid lines at the bottom (build platform level)
  const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x888888, 0xcccccc);
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
    opacity: 0.3 
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

export const createScene = (container: HTMLElement): { refs: SceneRefs; controls: OrbitControls; animate: () => void } => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene with white background
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Camera
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
  camera.position.set(200, 200, 200);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Lighting optimized for white background
  const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
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

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight2.position.set(-200, -200, 100);
  scene.add(directionalLight2);

  // Create build grid but don't add it to the scene initially
  const grid = createBuildGrid();
  grid.visible = false;

  // Camera rotation variables
  let isRotating = false;
  let mouseX = 0;
  let mouseY = 0;
  let targetRotationX = 0;
  let targetRotationY = 0;
  let currentRotationX = 0;
  let currentRotationY = 0;
  let meshRef: THREE.Mesh | null = null;

  const handleMouseDown = (event: MouseEvent) => {
    // Only enable camera rotation when right mouse button is pressed or when holding Ctrl
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
    
    // Rotate camera around the scene
    targetRotationY += deltaX * 0.01;
    targetRotationX += deltaY * 0.01;
    
    mouseX = event.clientX;
    mouseY = event.clientY;
  };

  const handleMouseUp = () => {
    isRotating = false;
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY * 0.01;
    camera.position.multiplyScalar(1 + delta * 0.1);
    camera.position.clampLength(50, 800);
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault(); // Prevent right-click context menu
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
    
    // Smooth camera rotation
    currentRotationX += (targetRotationX - currentRotationX) * 0.1;
    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
    
    // Apply rotation to camera position around the origin
    const radius = camera.position.length();
    camera.position.x = radius * Math.sin(currentRotationY) * Math.cos(currentRotationX);
    camera.position.y = radius * Math.sin(currentRotationX);
    camera.position.z = radius * Math.cos(currentRotationY) * Math.cos(currentRotationX);
    camera.lookAt(0, 0, 50); // Look at the center of the build platform
    
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
