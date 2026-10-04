import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const colouredMaterials=new Map<string,T.MeshStandardMaterial>();
function batchMaterial(material:T.Material):T.Material {
  if(!(material instanceof T.MeshStandardMaterial)||material.map||material.normalMap||material.vertexColors||material.emissive.getHex()!==0)return material;
  const key=[material.roughness,material.metalness,material.flatShading,material.side].join(':');
  let shared=colouredMaterials.get(key);
  if(!shared){shared=new T.MeshStandardMaterial({vertexColors:true,roughness:material.roughness,metalness:material.metalness,flatShading:material.flatShading,side:material.side});shared.userData.sharedArtMaterial=true;colouredMaterials.set(key,shared);}
  return shared;
}

/** Only rigid siblings are combined. Joint groups, skins and instances stay intact. */
export function batchStaticMeshes(root:T.Object3D):void {
  for(const child of [...root.children])if(!(child instanceof T.Mesh))batchStaticMeshes(child);
  const byMaterial=new Map<T.Material,T.Mesh[]>();
  for(const child of root.children){
    if(!(child instanceof T.Mesh)||child instanceof T.SkinnedMesh||child instanceof T.InstancedMesh
      ||Array.isArray(child.material)||child.children.length||child.material.transparent)continue;
    if(!(child.material instanceof T.MeshStandardMaterial)
      ||Object.values(child.material).some(value=>value instanceof T.Texture)
      ||child.material.onBeforeCompile!==T.Material.prototype.onBeforeCompile)continue;
    const material=batchMaterial(child.material),list=byMaterial.get(material)??[];list.push(child);byMaterial.set(material,list);
  }
  for(const [material,meshes]of byMaterial){
    if(meshes.length<2)continue;
    const parts=meshes.map(mesh=>{
      mesh.updateMatrix();const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrix);
      const nonIndexed=geometry.index?geometry.toNonIndexed():geometry;
      if(nonIndexed!==geometry)geometry.dispose();
      const source=mesh.material as T.MeshStandardMaterial;
      const sourceColors=source.vertexColors?nonIndexed.getAttribute('color'):undefined;
      for(const name of Object.keys(nonIndexed.attributes))if(!['position','normal'].includes(name))nonIndexed.deleteAttribute(name);
      if(material instanceof T.MeshStandardMaterial&&material.vertexColors){
        const values=new Float32Array(nonIndexed.attributes.position.count*3);
        for(let i=0;i<values.length;i+=3){
          const vertex=i/3;
          values[i]=source.color.r*(sourceColors?.getX(vertex)??1);
          values[i+1]=source.color.g*(sourceColors?.getY(vertex)??1);
          values[i+2]=source.color.b*(sourceColors?.getZ(vertex)??1);
        }
        nonIndexed.setAttribute('color',new T.BufferAttribute(values,3));
      }
      return nonIndexed;
    });
    const geometry=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());
    if(!geometry)continue;
    const merged=new T.Mesh(geometry,material);
    merged.castShadow=meshes.some(mesh=>mesh.castShadow);merged.receiveShadow=meshes.some(mesh=>mesh.receiveShadow);
    merged.userData.batchedGeometry=true;
    // Preserve inspectable provenance when boss ornaments join one rigid draw.
    merged.userData.bossOrnamentCount=meshes.reduce((n,mesh)=>n+(mesh.userData.bossOrnamentCount??(mesh.userData.bossOrnament?1:0)),0);
    merged.userData.ownedMaterial=meshes.some(mesh=>mesh.userData.ownedMaterial);
    for(const mesh of meshes){
      root.remove(mesh);
      if(mesh.userData.uniqueGeometry||mesh.userData.artOwnedGeometry||mesh.userData.buildingOwned||mesh.userData.settlementOwned||mesh.userData.batchedGeometry)mesh.geometry.dispose();
    }
    root.add(merged);
  }
}

export function disposeBatchedGeometry(root:T.Object3D):void {
  root.traverse(object=>{if(object instanceof T.Mesh&&object.userData.batchedGeometry)object.geometry.dispose();});
}
