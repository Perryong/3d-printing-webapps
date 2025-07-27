import * as THREE from 'three';
import { createDynamicBuildPlatform, updateDynamicBuildPlatform, getOptimalCameraPosition, type DynamicPlatformConfig } from './dynamicPlatform';

export interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  mesh?: THREE.Mesh;
  platform?: THREE.Group;
  updatePlatform: (modelBounds: THREE.Box3) => void;
  showPlatform: () => void;
  hidePlatform: () => void;
}

export interface OrbitControls {
  dispose: () => void;
  enabled: boolean;
}

// Create initial platform for when no models are loaded
const createInitialPlatform = (): THREE.Group => {
  const platformGroup = new THREE.Group();
  
  // Small default platform
  const platformSize = 100;
  const divisions = 10;
  
  // Create grid
  const gridHelper = new THREE.GridHelper(platformSize, divisions, 0x888888, 0xcccccc);
  gridHelper.rotateX(Math.PI / 2);
  gridHelper.position.z = 0;
  platformGroup.add(gridHelper);
  
  // Create platform surface
  const platformGeometry = new THREE.PlaneGeometry(platformSize, platformSize);
  const platformMaterial = new THREE.MeshBasicMaterial({
    color: 0xf0f0f0,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide
  });
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.z = 0;
  platformGroup.add(platform);
  
  return platformGroup;
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

  // Create initial platform
  const platform = createInitialPlatform();
  platform.visible = false;

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
    platform,
    get mesh() { return meshRef || undefined; },
    set mesh(mesh: THREE.Mesh | undefined) { meshRef = mesh || null; },
    updatePlatform: (modelBounds: THREE.Box3) => {
      const config: DynamicPlatformConfig = {
        modelBounds,
        padding: 50,
        gridSpacing: 10
      };
      updateDynamicBuildPlatform(platform, config);
      
      // Update camera to optimal position
      const optimalCameraPos = getOptimalCameraPosition(modelBounds);
      camera.position.copy(optimalCameraPos);
      camera.lookAt(modelBounds.getCenter(new THREE.Vector3()));
    },
    showPlatform: () => {
      if (!scene.children.includes(platform)) {
        scene.add(platform);
      }
      platform.visible = true;
    },
    hidePlatform: () => {
      platform.visible = false;
    }
  };

  return { refs, controls, animate };
};