import * as THREE from 'three';

export interface ModelData {
  id: string;
  name: string;
  mesh: THREE.Mesh;
  visible: boolean;
  locked: boolean;
  originalGeometry: THREE.BufferGeometry;
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

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
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

    // Set default position to origin (0, 0, 0)
    mesh.position.set(0, 0, 0);
    
    // Set default rotation with X at -90 degrees
    mesh.rotation.set(-Math.PI / 2, 0, 0); // -90 degrees in radians for X axis

    this.scene.add(mesh);

    const modelData: ModelData = {
      id,
      name,
      mesh,
      visible: true,
      locked: false,
      originalGeometry: geometry.clone()
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
    
    // Position the copy slightly offset
    newModel.mesh.position.copy(original.mesh.position);
    newModel.mesh.position.x += 20;
    newModel.mesh.rotation.copy(original.mesh.rotation);
    newModel.mesh.scale.copy(original.mesh.scale);

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
  }

  updateModelTransform(id: string, transform: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  }): void {
    const model = this.models.get(id);
    if (!model || model.locked) return;

    if (transform.position) {
      model.mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
    }

    if (transform.rotation) {
      model.mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
    }

    if (transform.scale) {
      model.mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    }
  }

  resetModelTransform(id: string): void {
    const model = this.models.get(id);
    if (!model || model.locked) return;

    // Reset to default values with position at origin (0, 0, 0) and X rotation at -90 degrees
    model.mesh.position.set(0, 0, 0);
    model.mesh.rotation.set(-Math.PI / 2, 0, 0); // -90 degrees for X axis
    model.mesh.scale.set(1, 1, 1);
  }

  getAllModels(): ModelData[] {
    return Array.from(this.models.values());
  }

  private onMouseDown(event: MouseEvent): void {
    if (this.transformMode !== 'move') return;

    const selectedModel = this.getSelectedModel();
    if (!selectedModel || selectedModel.locked) return;

    this.isDragging = true;
    this.updateMousePosition(event);
    
    // Calculate intersection with build platform
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const buildPlatform = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(buildPlatform, intersection);
    
    this.dragStart.copy(intersection);
    this.modelStartPosition.copy(selectedModel.mesh.position);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.transformMode !== 'move') return;

    const selectedModel = this.getSelectedModel();
    if (!selectedModel || selectedModel.locked) return;

    this.updateMousePosition(event);
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const buildPlatform = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(buildPlatform, intersection);
    
    const delta = intersection.clone().sub(this.dragStart);
    selectedModel.mesh.position.copy(this.modelStartPosition.clone().add(delta));
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseClick(event: MouseEvent): void {
    if (this.transformMode !== 'select') return;

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
