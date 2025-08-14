import * as THREE from 'three';

export interface ModelTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface ModelData {
  id: string;
  name: string;
  mesh: THREE.Mesh;
  visible: boolean;
  locked: boolean;
  originalGeometry: THREE.BufferGeometry;
  transform: ModelTransform;
  boundingBox: THREE.Box3;
}

export class ModelManager {
  private models: Map<string, ModelData> = new Map();
  private selectedModelId: string | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private transformMode: 'select' | 'move' | 'rotate' | 'scale' = 'select';
  private isDragging = false;
  private dragStart = new THREE.Vector3();
  private modelStartPosition = new THREE.Vector3();
  private isHovering = false;
  private hoveredModelId: string | null = null;
  private originalTransformMode: 'select' | 'move' | 'rotate' | 'scale' = 'select';
  private repositionGridCallback?: (x: number, y: number, z: number) => void;
  private buildPlatformSize = 256; // Bambu Lab A1 build volume

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer
  ) {
    this.setupEventListeners();
    this.setupCursorStyles();
  }

  setGridRepositionCallback(callback: (x: number, y: number, z: number) => void): void {
    this.repositionGridCallback = callback;
  }

  private setupEventListeners() {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
  }

  private setupCursorStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .model-hover { cursor: grab !important; }
      .model-dragging { cursor: grabbing !important; }
      .model-locked { cursor: not-allowed !important; }
    `;
    document.head.appendChild(style);
  }

  private updateCursor() {
    const canvas = this.renderer.domElement;
    
    if (this.isDragging) {
      canvas.className = 'model-dragging';
    } else if (this.hoveredModelId) {
      const model = this.models.get(this.hoveredModelId);
      if (model?.locked) {
        canvas.className = 'model-locked';
      } else {
        canvas.className = 'model-hover';
      }
    } else {
      canvas.className = '';
    }
  }

  private meshToTransform(mesh: THREE.Mesh): ModelTransform {
    return {
      position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
      scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z }
    };
  }

  private updateMeshFromTransform(mesh: THREE.Mesh, transform: ModelTransform): void {
    mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
    mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
    mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  }

  /**
   * Calculate optimal positioning for a model on the build platform
   * Based on grid-apps positioning algorithms
   */
  private calculateOptimalPosition(geometry: THREE.BufferGeometry): { position: THREE.Vector3; rotation: THREE.Euler } {
    // Compute bounding box
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox!;
    const size = boundingBox.getSize(new THREE.Vector3());
    const center = boundingBox.getCenter(new THREE.Vector3());

    // Position model at center of build platform
    const position = new THREE.Vector3(0, 0, 0);
    
    // Adjust Z position so model sits on build platform
    // Move model up by half its height minus the bottom offset
    position.z = size.z / 2 - boundingBox.min.z;

    // Default rotation - models typically need to be rotated for proper orientation
    const rotation = new THREE.Euler(-Math.PI / 2, 0, 0); // -90 degrees around X-axis

    return { position, rotation };
  }

  /**
   * Auto-scale model to fit within build volume if too large
   */
  private calculateOptimalScale(geometry: THREE.BufferGeometry): number {
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox!;
    const size = boundingBox.getSize(new THREE.Vector3());
    
    // Calculate maximum dimension
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    // If model is larger than 80% of build platform, scale it down
    const maxAllowedSize = this.buildPlatformSize * 0.8;
    
    if (maxDimension > maxAllowedSize) {
      return maxAllowedSize / maxDimension;
    }
    
    return 1.0; // No scaling needed
  }

  /**
   * Position camera to optimally view the model
   */
  private positionCameraForModel(boundingBox: THREE.Box3): void {
    const size = boundingBox.getSize(new THREE.Vector3());
    const center = boundingBox.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Calculate camera distance based on model size
    const distance = maxDim * 2.5; // Adjust multiplier as needed
    
    // Position camera at an angle that shows the model well
    const cameraPosition = new THREE.Vector3(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance * 0.7
    );
    
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.position.copy(cameraPosition);
      this.camera.lookAt(center);
      this.camera.updateProjectionMatrix();
    }
  }

  addModel(id: string, name: string, geometry: THREE.BufferGeometry): ModelData {
    const material = new THREE.MeshPhongMaterial({
      color: 0x2196f3,
      shininess: 100,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry.clone(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.modelId = id;

    // Calculate optimal positioning and scaling
    const { position, rotation } = this.calculateOptimalPosition(geometry);
    const optimalScale = this.calculateOptimalScale(geometry);

    // Apply positioning
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    mesh.scale.setScalar(optimalScale);

    // Compute final bounding box after transformations
    const boundingBox = new THREE.Box3().setFromObject(mesh);

    this.scene.add(mesh);

    // Position camera for optimal viewing
    this.positionCameraForModel(boundingBox);

    // If this is the first model, show the grid
    if (this.models.size === 0 && this.repositionGridCallback) {
      this.repositionGridCallback(0, 0, 0); // Grid centered at origin
    }

    const modelData: ModelData = {
      id,
      name,
      mesh,
      visible: true,
      locked: false,
      originalGeometry: geometry.clone(),
      transform: this.meshToTransform(mesh),
      boundingBox
    };

    this.models.set(id, modelData);
    return modelData;
  }

  removeModel(id: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;

    this.scene.remove(model.mesh);
    model.mesh.geometry.dispose();
    if (Array.isArray(model.mesh.material)) {
      model.mesh.material.forEach(mat => mat.dispose());
    } else {
      model.mesh.material.dispose();
    }

    this.models.delete(id);

    if (this.selectedModelId === id) {
      this.selectedModelId = null;
    }

    return true;
  }

  selectModel(id: string | null): void {
    // Deselect previous model
    if (this.selectedModelId) {
      const prevModel = this.models.get(this.selectedModelId);
      if (prevModel) {
        (prevModel.mesh.material as THREE.MeshPhongMaterial).color.setHex(0x2196f3);
      }
    }

    this.selectedModelId = id;

    // Highlight selected model
    if (id) {
      const model = this.models.get(id);
      if (model) {
        (model.mesh.material as THREE.MeshPhongMaterial).color.setHex(0xffa500);
      }
    }
  }

  getSelectedModel(): ModelData | null {
    return this.selectedModelId ? this.models.get(this.selectedModelId) || null : null;
  }

  duplicateModel(id: string): ModelData | null {
    const original = this.models.get(id);
    if (!original) return null;

    const newId = `${id}_copy_${Date.now()}`;
    const newModel = this.addModel(newId, `${original.name} (Copy)`, original.originalGeometry);
    
    // Position the copy with offset
    const offset = 30; // 30mm offset
    const newTransform = {
      position: { 
        x: original.transform.position.x + offset, 
        y: original.transform.position.y, 
        z: original.transform.position.z 
      },
      rotation: { ...original.transform.rotation },
      scale: { ...original.transform.scale }
    };
    
    this.updateModelTransform(newId, newTransform);

    return newModel;
  }

  setModelVisibility(id: string, visible: boolean): void {
    const model = this.models.get(id);
    if (model) {
      model.visible = visible;
      model.mesh.visible = visible;
    }
  }

  setModelLocked(id: string, locked: boolean): void {
    const model = this.models.get(id);
    if (model) {
      model.locked = locked;
    }
  }

  setTransformMode(mode: 'select' | 'move' | 'rotate' | 'scale'): void {
    this.transformMode = mode;
    this.originalTransformMode = mode;
  }

  updateModelTransform(id: string, transform: Partial<ModelTransform>): void {
    const model = this.models.get(id);
    if (!model || model.locked) return;

    // Update the transform state
    if (transform.position) {
      model.transform.position = { ...transform.position };
    }
    if (transform.rotation) {
      model.transform.rotation = { ...transform.rotation };
    }
    if (transform.scale) {
      model.transform.scale = { ...transform.scale };
    }

    // Update the actual mesh
    this.updateMeshFromTransform(model.mesh, model.transform);
    
    // Update bounding box
    model.boundingBox.setFromObject(model.mesh);
  }

  updateModelProperty(id: string, property: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: number): void {
    const model = this.models.get(id);
    if (!model || model.locked) return;

    // Update the transform state
    model.transform[property][axis] = value;

    // Update the actual mesh
    this.updateMeshFromTransform(model.mesh, model.transform);
    
    // Update bounding box
    model.boundingBox.setFromObject(model.mesh);
  }

  resetModelTransform(id: string): void {
    const model = this.models.get(id);
    if (!model || model.locked) return;

    // Recalculate optimal positioning
    const { position, rotation } = this.calculateOptimalPosition(model.originalGeometry);
    const optimalScale = this.calculateOptimalScale(model.originalGeometry);

    const defaultTransform: ModelTransform = {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
      scale: { x: optimalScale, y: optimalScale, z: optimalScale }
    };

    model.transform = defaultTransform;
    this.updateMeshFromTransform(model.mesh, model.transform);
    
    // Update bounding box
    model.boundingBox.setFromObject(model.mesh);
  }

  /**
   * Center all models on the build platform
   */
  centerAllModels(): void {
    if (this.models.size === 0) return;

    // Calculate combined bounding box of all visible models
    const combinedBox = new THREE.Box3();
    let hasVisibleModels = false;

    this.models.forEach(model => {
      if (model.visible) {
        combinedBox.expandByObject(model.mesh);
        hasVisibleModels = true;
      }
    });

    if (!hasVisibleModels) return;

    const center = combinedBox.getCenter(new THREE.Vector3());
    const offset = new THREE.Vector3(-center.x, -center.y, 0); // Keep Z as is

    // Move all models by the offset
    this.models.forEach(model => {
      if (model.visible && !model.locked) {
        model.mesh.position.add(offset);
        model.transform.position.x = model.mesh.position.x;
        model.transform.position.y = model.mesh.position.y;
        model.transform.position.z = model.mesh.position.z;
        model.boundingBox.setFromObject(model.mesh);
      }
    });
  }

  /**
   * Fit camera to show all models
   */
  fitCameraToModels(): void {
    if (this.models.size === 0) return;

    const combinedBox = new THREE.Box3();
    let hasVisibleModels = false;

    this.models.forEach(model => {
      if (model.visible) {
        combinedBox.expandByObject(model.mesh);
        hasVisibleModels = true;
      }
    });

    if (hasVisibleModels) {
      this.positionCameraForModel(combinedBox);
    }
  }

  getAllModels(): ModelData[] {
    return Array.from(this.models.values());
  }

  private onMouseDown(event: MouseEvent): void {
    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = Array.from(this.models.values()).map(model => model.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const modelId = clickedMesh.userData.modelId;
      const model = this.models.get(modelId);
      
      if (model && !model.locked) {
        this.originalTransformMode = this.transformMode;
        this.transformMode = 'move';
        
        this.selectModel(modelId);
        this.isDragging = true;
        
        // Calculate intersection with build platform (Z=0 plane)
        const buildPlatform = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(buildPlatform, intersection);
        
        this.dragStart.copy(intersection);
        this.modelStartPosition.copy(model.mesh.position);
        
        this.updateCursor();
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
    
    if (this.isDragging && this.selectedModelId) {
      const selectedModel = this.models.get(this.selectedModelId);
      if (!selectedModel || selectedModel.locked) return;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const buildPlatform = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(buildPlatform, intersection);
      
      const delta = intersection.clone().sub(this.dragStart);
      const newPosition = this.modelStartPosition.clone().add(delta);
      
      // Keep model within build platform bounds
      const halfPlatform = this.buildPlatformSize / 2;
      newPosition.x = Math.max(-halfPlatform, Math.min(halfPlatform, newPosition.x));
      newPosition.y = Math.max(-halfPlatform, Math.min(halfPlatform, newPosition.y));
      
      // Update both mesh and transform state
      selectedModel.mesh.position.copy(newPosition);
      selectedModel.transform.position = { x: newPosition.x, y: newPosition.y, z: newPosition.z };
      selectedModel.boundingBox.setFromObject(selectedModel.mesh);
    } else {
      // Handle hover effects
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = Array.from(this.models.values()).map(model => model.mesh);
      const intersects = this.raycaster.intersectObjects(meshes);
      
      const previousHoveredId = this.hoveredModelId;
      
      if (intersects.length > 0) {
        const hoveredMesh = intersects[0].object as THREE.Mesh;
        this.hoveredModelId = hoveredMesh.userData.modelId;
      } else {
        this.hoveredModelId = null;
      }
      
      if (previousHoveredId !== this.hoveredModelId) {
        this.updateCursor();
      }
    }
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      this.transformMode = this.originalTransformMode;
      this.isDragging = false;
      this.updateCursor();
    }
  }

  private onMouseClick(event: MouseEvent): void {
    if (this.transformMode !== 'select' && !this.isDragging) return;

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = Array.from(this.models.values()).map(model => model.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const modelId = clickedMesh.userData.modelId;
      this.selectModel(modelId);
    } else {
      this.selectModel(null);
    }
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  dispose(): void {
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onMouseClick.bind(this));
    
    // Clean up all models
    this.models.forEach(model => {
      this.scene.remove(model.mesh);
      model.mesh.geometry.dispose();
      if (Array.isArray(model.mesh.material)) {
        model.mesh.material.forEach(mat => mat.dispose());
      } else {
        model.mesh.material.dispose();
      }
    });
    this.models.clear();
  }
}