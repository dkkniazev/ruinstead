import * as T from 'three';
import { softOrb } from './ArtMaterials';
import { batchStaticMeshes } from './MeshBatching';

const trunkGeometry=new T.CylinderGeometry(.7,1,1,7);
const pineGeometry=new T.ConeGeometry(1,1,8);
const materials=new Map<number,T.MeshStandardMaterial>();
function material(color:number):T.MeshStandardMaterial {
  let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.94});materials.set(color,m);}return m;
}

/** Broad canopies and branching trunks; the harvest node owns the solid footprint. */
export function createLivingTree(seed:number,region:number):T.Group {
  const root=new T.Group(),height=186+seed%35;
  const bark=region===3?0x645567:0x785338;
  const leaves=region===3?[0x30596a,0x447586,0x709787]:region===5?[0x548e6e,0x75ad77,0x9cc589]:[0x327c58,0x4a9860,0x79b96b];
  const part=(geo:T.BufferGeometry,color:number,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;root.add(m);return m;
  };
  const branch=(ax:number,ay:number,az:number,bx:number,by:number,bz:number,r:number)=>{
    const a=new T.Vector3(ax,ay,az),b=new T.Vector3(bx,by,bz),delta=b.clone().sub(a);
    const m=part(trunkGeometry,bark,(ax+bx)/2,(ay+by)/2,(az+bz)/2,r,delta.length(),r);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  };
  branch(0,0,0,4,height*.72,-3,12);
  for(let i=0;i<5;i++){
    const a=i*2.4+seed*.03;
    branch(0,13,0,Math.cos(a)*28,2,Math.sin(a)*27,5);
  }
  if(seed%3===0||region===3){
    for(let tier=0;tier<4;tier++){
      const y=height*(.46+tier*.14),radius=64-tier*12;
      const crown=part(pineGeometry,leaves[tier%3],0,y,0,radius,height*.42,radius);
      crown.rotation.y=tier*.65;
    }
  }else{
    for(let i=0;i<5;i++){
      const angle=i*2.4+seed*.11,x=Math.cos(angle)*37,z=Math.sin(angle)*32;
      branch(1,height*.43,0,x,height*.65,z,5);
      part(softOrb,leaves[i%2],x,height*(.65+(i%2)*.08),z,46,37,43);
    }
    part(softOrb,leaves[1],0,height*.88,0,52,41,47);
    part(softOrb,leaves[2],-17,height*.94,9,29,19,28);
  }
  batchStaticMeshes(root);return root;
}
