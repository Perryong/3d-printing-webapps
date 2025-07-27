import * as THREE from 'three';

export class ModelAxisHelper {
  private axisGroup: THREE.Group;
  private xAxis: THREE.Line;
  private yAxis: THREE.Line;
  private zAxis: THREE.Line;
  private xLabel: THREE.Sprite;
  private yLabel: THREE.Sprite;
  private zLabel: THREE.Sprite;

  constructor() {
    this.axisGroup = new THREE.Group();
    
    // Create axis lines
    this.xAxis = this.createAxisLine(0xff0000); // Red for X
    this.yAxis = this.createAxisLine(0x00ff00); // Green for Y
    this.zAxis = this.createAxisLine(0x0000ff); // Blue for Z
    
    // Create labels
    this.xLabel = this.createAxisLabel('X', '#ff0000');
    this.yLabel = this.createAxisLabel('Y', '#00ff00');
    this.zLabel = this.createAxisLabel('Z', '#0000ff');
    
    this.axisGroup.add(this.xAxis, this.yAxis, this.zAxis);
    this.axisGroup.add(this.xLabel, this.yLabel, this.zLabel);
    
    this.axisGroup.visible = false;
  }

  private createAxisLine(color: number): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(50, 0, 0) // Default length, will be updated
    ]);
    const material = new THREE.LineBasicMaterial({ 
      color,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    return new THREE.Line(geometry, material);
  }

  private createAxisLabel(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 64;
    canvas.height = 32;
    
    context.fillStyle = color;
    context.font = 'Bold 16px Arial';
    context.textAlign = 'center';
    context.fillText(text, 32, 20);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.9
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(15, 7.5, 1);
    
    return sprite;
  }

  updateForModel(model: THREE.Mesh): void {
    if (!model.geometry.boundingBox) {
      model.geometry.computeBoundingBox();
    }
    
    const boundingBox = model.geometry.boundingBox!;
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // Apply model's scale to get actual size
    size.multiply(model.scale);
    
    // Calculate axis length based on model size (use the largest dimension)
    const maxDimension = Math.max(size.x, size.y, size.z);
    const axisLength = Math.max(30, maxDimension * 0.6); // At least 30 units, or 60% of largest dimension
    
    // Update X axis (red)
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    this.xAxis.geometry.dispose();
    this.xAxis.geometry = xGeometry;
    
    // Update Y axis (green)
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    this.yAxis.geometry.dispose();
    this.yAxis.geometry = yGeometry;
    
    // Update Z axis (blue)
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    this.zAxis.geometry.dispose();
    this.zAxis.geometry = zGeometry;
    
    // Position labels at the end of axes
    this.xLabel.position.set(axisLength + 10, 0, 0);
    this.yLabel.position.set(0, axisLength + 10, 0);
    this.zLabel.position.set(0, 0, axisLength + 10);
    
    // Position axis group at model's corner (bottom-back-left)
    const modelBoundingBox = new THREE.Box3().setFromObject(model);
    const corner = new THREE.Vector3(
      modelBoundingBox.min.x,
      modelBoundingBox.min.y,
      modelBoundingBox.min.z
    );
    this.axisGroup.position.copy(corner);
    
    // Apply the same rotation as the model to keep axes aligned
    this.axisGroup.rotation.copy(model.rotation);
  }

  show(): void {
    this.axisGroup.visible = true;
  }

  hide(): void {
    this.axisGroup.visible = false;
  }

  getGroup(): THREE.Group {
    return this.axisGroup;
  }

  dispose(): void {
    this.xAxis.geometry.dispose();
    this.yAxis.geometry.dispose();
    this.zAxis.geometry.dispose();
    
    (this.xAxis.material as THREE.LineBasicMaterial).dispose();
    (this.yAxis.material as THREE.LineBasicMaterial).dispose();
    (this.zAxis.material as THREE.LineBasicMaterial).dispose();
    
    this.xLabel.material.dispose();
    this.yLabel.material.dispose();
    this.zLabel.material.dispose();
  }
}