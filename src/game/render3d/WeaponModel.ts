import * as T from 'three';
import type { WeaponId } from '../combat/WeaponDefinitions';
import { softBox, softOrb } from './ArtMaterials';

const cylinder=new T.CylinderGeometry(1,1,1,10);
const materials={
  steel:new T.MeshStandardMaterial({color:0xb2cfda,metalness:.28,roughness:.38}),
  edge:new T.MeshStandardMaterial({color:0x526e81,metalness:.2,roughness:.48}),
  gold:new T.MeshStandardMaterial({color:0xe9b957,metalness:.22,roughness:.44}),
  leather:new T.MeshStandardMaterial({color:0x654631,roughness:.92}),
};
export type WeaponModel={root:T.Group;tip:T.Vector3;dispose:()=>void};

/** Grip at the origin, shaft along +Y, blade in XY; axe edge / hammer faces along X.
 * The grip attachment must roll this authored frame to match its swing plane. */
export function createWeaponModel(id:WeaponId,pairedDaggers=true):WeaponModel {
  const root=new T.Group(),owned:T.BufferGeometry[]=[];
  root.name=`weapon-${id}`;
  const part=(parent:T.Object3D,geo:T.BufferGeometry,color:keyof typeof materials,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    const mesh=new T.Mesh(geo,materials[color]);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const box=(p:T.Object3D,c:keyof typeof materials,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>part(p,softBox,c,x,y,z,sx,sy,sz);
  const blade=(points:number[][],depth:number)=>{
    const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:1,bevelThickness:1,bevelSegments:1,steps:1});
    geo.translate(0,0,-depth/2);owned.push(geo);return geo;
  };
  const grip=(p:T.Object3D,bottom:number,top:number)=>{
    part(p,cylinder,'leather',0,(top+bottom)/2,0,3,top-bottom,3);
    part(p,softOrb,'gold',0,bottom,0,4.5,4.5,4.5);
  };
  let tipY=0;
  if(id==='axe'){
    grip(root,-16,38);tipY=44;
    part(root,blade([[1,31],[12,40],[28,44],[32,34],[29,19],[14,22],[2,26]],5),'steel',0,0,0,1,1,1);
    box(root,'gold',1,30,0,7,15,8);
  }else if(id==='hammer'){
    grip(root,-16,53);tipY=67;
    box(root,'edge',0,53,0,37,24,24);box(root,'gold',0,53,0,12,26,25);
    for(const side of [-1,1])box(root,'steel',side*20,53,0,8,22,22);
  }else{
    const start=id==='spear'?79:9,length=id==='spear'?29:id==='daggers'?32:53;
    tipY=start+length;
    const geo=blade([[-5,start],[-6,start+length-13],[0,start+length],[6,start+length-13],[5,start]],3);
    const addBlade=(parent:T.Object3D)=>{
      grip(parent,id==='spear'?-22:-12,start);
      part(parent,geo,'steel',0,0,0,1,1,1).name='weapon-blade';
      box(parent,'gold',0,start,0,id==='spear'?13:24,4,7);
    };
    if(id==='daggers'&&pairedDaggers){
      for(const side of [-1,1]){const dagger=new T.Group();dagger.position.x=side*10;dagger.rotation.z=-side*.18;root.add(dagger);addBlade(dagger);}
    }else addBlade(root);
  }
  root.userData.weaponTip=[0,tipY,0];
  return {root,tip:new T.Vector3(0,tipY,0),dispose(){root.removeFromParent();owned.forEach(geometry=>geometry.dispose());}};
}
