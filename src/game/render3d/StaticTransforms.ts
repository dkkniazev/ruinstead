import * as THREE from 'three';

/** Rigid scenery already has its final world transform. Visibility/material
 * changes remain live; moving actors, labels and lights must not use this cache. */
export function freezeStaticTransforms(root:THREE.Object3D):void {
  root.updateWorldMatrix(true,true);
  root.traverse(object=>{
    if(object instanceof THREE.Sprite||object instanceof THREE.Light)return;
    object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false;
  });
}
