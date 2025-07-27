import * as THREE from 'three';
import { ModelAxisHelper } from './modelAxisHelper';
import { positionModelInBuildVolume, constrainToBuiltVolume, isModelWithinBuildVolume } from './modelPositioning';
import type { SceneRefs } from './sceneManager';

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
  axisHelper: ModelAxisHelper;
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
  private onModelPositionedCallback?: (wasScaled: boolean) => void;
  private sceneRefs?: SceneRefs;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private renderer: THREE.WebGLRenderer,
    sceneRefs?: SceneRefs
  ) {
    this.sceneRefs = sceneRefs;
    this.setupEventListeners();
    this.setupCursorStyles();
  }

  private setupEventListeners() {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
  }

  private setupCursorStyles() {
    // Add CSS for cursor styles
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

    // Set default rotation with X at -90 degrees BEFORE positioning
    mesh.rotation.set(-Math.PI / 2, 0, 0); // -90 degrees in radians for X axis
    
    // Auto-position the model inside build volume
    const positioning = positionModelInBuildVolume(geometry);
    mesh.position.copy(positioning.position);
    mesh.scale.copy(positioning.scale);

    // Create axis helper for this model
    const axisHelper = new ModelAxisHelper();
    this.scene.add(axisHelper.getGroup());
    axisHelper.updateForModel(mesh);

    this.scene.add(mesh);

    const modelData: ModelData = {
      id,
      name,
      mesh,
      visible: true,
      locked: false,
      originalGeometry: geometry.clone(),
      transform: this.meshToTransform(mesh),
      axisHelper
    };

    this.models.set(id, modelData);
    
    // Update dynamic platform for all models
    this.updateDynamicPlatform();
    
    // Notify if model was scaled to fit
    if (positioning.wasScaled && this.onModelPositionedCallback) {
      this.onModelPositionedCallback(true);
    }
    
    return modelData;
  }

  removeModel(id: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;

    this.scene.remove(model.mesh);
    this.scene.remove(model.axisHelper.getGroup());
    model.axisHelper.dispose();
    
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
    
    // Update dynamic platform after model removal
    this.updateDynamicPlatform();

    return true;
  }

  selectModel(id: string | null): void {
    // Hide axis helper for previously selected model
    if (this.selectedModelId) {
      const prevModel = this.models.get(this.selectedModelId);
      if (prevModel) {
        (prevModel.mesh.material as THREE.MeshPhongMaterial).color.setHex(0x2196f3);
        prevModel.axisHelper.hide();
      }
    }

    this.selectedModelId = id;

    // Highlight selected model and show its axis helper
    if (id) {
      const model = this.models.get(id);
      if (model) {
        (model.mesh.material as THREE.MeshPhongMaterial).color.setHex(0xffa500);
        model.axisHelper.updateForModel(model.mesh);
        model.axisHelper.show();
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
    
    // Position the copy slightly offset from the original (20mm to the right)
    const newTransform = {
      position: { x: original.transform.position.x + 20, y: original.transform.position.y, z: original.transform.position.z },
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
      // Constrain position to build volume
      const constrainedPosition = constrainToBuiltVolume(
        new THREE.Vector3(transform.position.x, transform.position.y, transform.position.z),
        model.mesh
      );
      model.transform.position = { 
        x: constrainedPosition.x, 
        y: constrainedPosition.y, 
        z: constrainedPosition.z 
      };
    }
    if (transform.rotation) {
      model.transform.rotation = { ...transform.rotation };
    }
    if (transform.scale) {
      model.transform.scale = { ...transform.scale };
    }

    // Update the actual mesh
    this.updateMeshFromTransform(model.mesh, model.transform);
    
    // Update axis helper if this model is selected
    if (this.selectedModelId === id) {
      model.axisHelper.updateForModel(model.mesh);
    }
  }

  updateModelProperty(id: string, property: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: number): void {
    const model = this.models.get(id);
    if (!model || model.locked) return;

    // Update the transform state
    model.transform[property][axis] = value;

    // For position updates, apply build volume constraints
    if (property === 'position') {
      const constrainedPosition = constrainToBuiltVolume(
        new THREE.Vector3(
          model.transform.position.x,
          model.transform.position.y,
          model.transform.position.z
        ),
        model.mesh
      );
      model.transform.position = {
        x: constrainedPosition.x,
        y: constrainedPosition.y,
        z: constrainedPosition.z
      };
    }

    // Update the actual mesh
    this.updateMeshFromTransform(model.mesh, model.transform);
    
    // Update axis helper if this model is selected
    if (this.selectedModelId === id) {
      model.axisHelper.updateForModel(model.mesh);
    }
  }

  resetModelTransform(id: string): void {
    const model = this.models.get(id);
    if (!model || model.locked) return;

    // Reset to auto-positioned values
    const positioning = positionModelInBuildVolume(model.originalGeometry);
    
    const defaultTransform: ModelTransform = {
      position: { x: positioning.position.x, y: positioning.position.y, z: positioning.position.z },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      scale: { x: positioning.scale.x, y: positioning.scale.y, z: positioning.scale.z }
    };

    model.transform = defaultTransform;
    this.updateMeshFromTransform(model.mesh, model.transform);
    
    // Update axis helper if this model is selected
    if (this.selectedModelId === id) {
      model.axisHelper.updateForModel(model.mesh);
    }
  }

  getAllModels(): ModelData[] {
    return Array.from(this.models.values());
  }

  setOnModelPositionedCallback(callback: (wasScaled: boolean) => void): void {
    this.onModelPositionedCallback = callback;
  }

  /**
   * Update the dynamic platform based on all loaded models
   */
  private updateDynamicPlatform(): void {
    if (!this.sceneRefs) return;
    
    const allModels = Array.from(this.models.values());
    if (allModels.length === 0) {
      // Hide platform when no models
      this.sceneRefs.hidePlatform();
      return;
    }
    
    // Calculate combined bounding box for all models
    const combinedBox = new THREE.Box3();
    allModels.forEach(model => {
      const modelBox = new THREE.Box3().setFromObject(model.mesh);
      combinedBox.union(modelBox);
    });
    
    // Update platform to encompass all models
    this.sceneRefs.updatePlatform(combinedBox);
    this.sceneRefs.showPlatform();
  }

  /**
   * Check if any models are outside the build volume
   */
  getModelsOutsideBuildVolume(): ModelData[] {
    return Array.from(this.models.values()).filter(model => 
      !isModelWithinBuildVolume(model.mesh)
    );
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
        // Auto-switch to move mode when starting to drag
        this.originalTransformMode = this.transformMode;
        this.transformMode = 'move';
        
        this.selectModel(modelId);
        this.isDragging = true;
        
        // Calculate intersection with build platform
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
      const proposedPosition = this.modelStartPosition.clone().add(delta);
      
      // Constrain to build volume
      const constrainedPosition = constrainToBuiltVolume(proposedPosition, selectedModel.mesh);
      
      // Update both mesh and transform state
      selectedModel.mesh.position.copy(constrainedPosition);
      selectedModel.transform.position = { 
        x: constrainedPosition.x, 
        y: constrainedPosition.y, 
        z: constrainedPosition.z 
      };
      
      // Update axis helper
      selectedModel.axisHelper.updateForModel(selectedModel.mesh);
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
      
      // Update cursor if hover state changed
      if (previousHoveredId !== this.hoveredModelId) {
        this.updateCursor();
      }
    }
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      // Restore original transform mode after dragging
      this.transformMode = this.originalTransformMode;
      this.isDragging = false;
      this.updateCursor();
    }
  }

  private onMouseClick(event: MouseEvent): void {
    // Only handle selection if we're not dragging and in select mode
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
      this.scene.remove(model.axisHelper.getGroup());
      model.axisHelper.dispose();
      
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