import * as THREE from 'three';

/** Conservative view bounds for presentation only. Gameplay remains simulated. */
export class RenderVisibility {
  private readonly frustum = new THREE.Frustum();
  private readonly matrix = new THREE.Matrix4();
  private readonly bounds = new THREE.Sphere();

  update(camera: THREE.Camera): void {
    camera.updateMatrixWorld();
    this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.matrix);
  }

  includes(x: number, groundY: number, z: number, radius: number, height: number, margin = 220): boolean {
    // Include the entire silhouette and nearby offscreen shadow casters. The
    // extra height also protects health bars, wings and vertical attack poses.
    this.bounds.center.set(x, groundY + height / 2, z);
    this.bounds.radius = Math.hypot(radius, height / 2) + margin;
    return this.frustum.intersectsSphere(this.bounds);
  }

  includesSphere(sphere:THREE.Sphere,margin=220):boolean {
    this.bounds.copy(sphere);this.bounds.radius+=margin;
    return this.frustum.intersectsSphere(this.bounds);
  }
}
