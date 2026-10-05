import * as THREE from 'three';

const released=new WeakSet<THREE.InstancedMesh>();

/** Instance buffers belong to their mesh. Geometry/materials may be borrowed. */
export function disposeInstanceBuffers(root:THREE.Object3D):void {
  root.traverse(object=>{
    if(!(object instanceof THREE.InstancedMesh)||released.has(object))return;
    released.add(object);object.dispose();
  });
}
