import * as T from 'three';
import { pointInRegion, type RegionDefinition } from '../world/ReleaseRegionMap';
import { geographyAreaIsClear } from '../world/RegionGeography';
import { passageAt, terrainHeight } from '../world/WorldTerrain';
import { SETTLEMENT_CENTER } from '../world/WorldPrototype';
import { naturalSurfaceMaterial } from './NatureForms';
import { treeCanopy } from './TreeForms';

const bedMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,
  transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
bedMaterial.userData.sharedArtMaterial=true;
bedMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float bedAlpha;varying float vBedAlpha;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBedAlpha=bedAlpha;');
  shader.fragmentShader='varying float vBedAlpha;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vBedAlpha;');
};
bedMaterial.customProgramCacheKey=()=> 'forest-understory-bed';

const leafGeometry=new T.BufferGeometry();
leafGeometry.setAttribute('position',new T.Float32BufferAttribute([
  0,0,-1,-.46,.08,-.2,0,.2,.7, 0,0,-1,0,.2,.7,.46,.08,-.2,
],3));
leafGeometry.setAttribute('color',new T.Float32BufferAttribute([
  .34,.28,.08,.4,.32,.1,.5,.41,.14, .34,.28,.08,.5,.41,.14,.44,.35,.1,
],3));
leafGeometry.computeVertexNormals();
const leafMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
leafMaterial.userData.sharedArtMaterial=true;

/** Low connected plant beds frame clearings; all heights remain walk-through.
 * Sampling and road clearance are supplied by the same chunk's foliage anchors. */
export function createForestUnderstory(anchors:readonly T.Vector2[],region:RegionDefinition,
  bounds:{x:number;z:number;size:number},roadDistance:(x:number,z:number)=>number):T.Group {
  const root=new T.Group();root.name='forest-understory';
  if(![1,3,5,6].includes(region.id))return root;
  const positions:number[]=[],colors:number[]=[],alphas:number[]=[],normals:number[]=[];
  const base=new T.Color(region.id===3?0x425b61:region.id===6?0x4e735f:0x597344);
  const moss=new T.Color(region.id===5?0x9cab62:0x82945b);
  const shrubs=new T.InstancedMesh(treeCanopy(region.id,region.id===3?0x5c817b:region.id===6?0x6a9981:0x6d9758),naturalSurfaceMaterial,4);
  const leaves=new T.InstancedMesh(leafGeometry,leafMaterial,64),dummy=new T.Object3D();
  let shrubCount=0,leafCount=0;
  const inside=(x:number,z:number)=>x>=bounds.x&&z>=bounds.z&&x<=bounds.x+bounds.size&&z<=bounds.z+bounds.size;
  for(let i=0;i<Math.min(anchors.length,4);i++){
    const anchor=anchors[i],radius=82+(i%3)*11;
    const footprint=radius*1.45;
    if(!inside(anchor.x,anchor.y)||!pointInRegion(region,anchor.x,anchor.y)
      ||Array.from({length:8},(_,n)=>n*Math.PI/4).some(a=>!pointInRegion(region,
        anchor.x+Math.cos(a)*footprint,anchor.y+Math.sin(a)*footprint))
      ||!geographyAreaIsClear(anchor.x,anchor.y,footprint)||passageAt(anchor.x,anchor.y,footprint)
      ||roadDistance(anchor.x,anchor.y)<footprint+70
      ||Math.hypot(anchor.x-SETTLEMENT_CENTER.x,anchor.y-SETTLEMENT_CENTER.y)<650)continue;
    const rings=[0,.36,.72,1],sides=20,points=rings.map((r,band)=>Array.from({length:sides},(_,n)=>{
      const angle=n/sides*Math.PI*2,irregular=1+.1*Math.sin(angle*3+i)+.06*Math.cos(angle*5);
      const x=Math.fround(anchor.x+Math.cos(angle)*radius*r*irregular*1.23);
      const z=Math.fround(anchor.y+Math.sin(angle)*radius*r*irregular*.83);
      return {x,z,band};
    }));
    const emit=(p:{x:number;z:number;band:number})=>{
      positions.push(p.x,terrainHeight(p.x,p.z)+1.7,p.z);
      const n=new T.Vector3(terrainHeight(p.x-4,p.z)-terrainHeight(p.x+4,p.z),8,
        terrainHeight(p.x,p.z-4)-terrainHeight(p.x,p.z+4)).normalize();normals.push(n.x,n.y,n.z);
      const tint=base.clone().lerp(moss,p.band*.1+.05*Math.sin(p.x*.025));colors.push(tint.r,tint.g,tint.b);
      alphas.push([.32,.28,.18,0][p.band]);
    };
    for(let band=1;band<rings.length;band++)for(let n=0;n<sides;n++){
      const next=(n+1)%sides;
      for(const p of [points[band-1][n],points[band][next],points[band][n]])emit(p);
      if(band>1)for(const p of [points[band-1][n],points[band-1][next],points[band][next]])emit(p);
    }
    // A low mound of leaves occupies one side of the bed, with fern/grass room.
    const sx=anchor.x+Math.cos(i*2.4)*22,sz=anchor.y+Math.sin(i*2.4)*18;
    dummy.position.set(sx,terrainHeight(sx,sz)+12,sz);dummy.rotation.set(0,i*2.399,0);
    dummy.scale.set(27+i%2*6,13,23);dummy.updateMatrix();shrubs.setMatrixAt(shrubCount++,dummy.matrix);
    for(let n=0;n<16;n++){
      const angle=n*2.399+i*.9,r=Math.sqrt((n+.5)/16)*radius*.72;
      const x=anchor.x+Math.cos(angle)*r*1.1,z=anchor.y+Math.sin(angle)*r*.8;
      if(!inside(x,z)||!pointInRegion(region,x,z)||roadDistance(x,z)<78)continue;
      dummy.position.set(x,terrainHeight(x,z)+2.4,z);dummy.rotation.set(0,angle,0);
      dummy.scale.set(3+n%3,1.5,6+n%4);dummy.updateMatrix();leaves.setMatrixAt(leafCount++,dummy.matrix);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('bedAlpha',new T.Float32BufferAttribute(alphas,1));
  const beds=new T.Mesh(geometry,bedMaterial);beds.name='understory-ground';
  beds.receiveShadow=true;beds.renderOrder=1;beds.userData.uniqueGeometry=true;root.add(beds);
  shrubs.count=shrubCount;shrubs.receiveShadow=true;shrubs.name='understory-shrubs';root.add(shrubs);
  leaves.count=leafCount;leaves.receiveShadow=true;leaves.name='understory-leaves';root.add(leaves);
  return root;
}
