import * as T from 'three';
import { foliageCrown, naturalSurfaceMaterial } from './NatureForms';
import { batchStaticMeshes } from './MeshBatching';

const trunkGeometry=new T.CylinderGeometry(.65,1,1,7);
const leafMaterial=naturalSurfaceMaterial;
const materials=new Map<number,T.MeshStandardMaterial>();
function material(color:number):T.MeshStandardMaterial {
  let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.94});materials.set(color,m);}return m;
}

/** Forked trunks and asymmetric crowns, inside the existing harvest-node silhouette. */
export function createLivingTree(seed:number,region:number):T.Group {
  const root=new T.Group(),height=184+seed%30;
  const bark=region===3?0x665968:region===6?0x766b51:0x795638;
  const leaves=region===3?[0x315765,0x456e79,0x73958d]:region===5?[0x508a68,0x77a678,0xa9c489]
    :region===6?[0x4e7d69,0x73997d,0x9cb697]:[0x367c4c,0x579452,0x8db566];
  const leanX=Math.sin(seed*.7)*10,leanZ=Math.cos(seed*1.7)*8;
  const branch=(ax:number,ay:number,az:number,bx:number,by:number,bz:number,r:number)=>{
    const a=new T.Vector3(ax,ay,az),b=new T.Vector3(bx,by,bz),delta=b.clone().sub(a);
    const m=new T.Mesh(trunkGeometry,material(bark));
    m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,delta.length(),r);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    m.castShadow=m.receiveShadow=true;root.add(m);
  };
  const crown=(i:number,x:number,y:number,z:number,rx:number,ry:number,rz:number,pine=false)=>{
    const color=leaves[pine?Math.min(i,2):i>=5?2:i%2];
    const m=new T.Mesh(foliageCrown(seed+i,color,pine),leafMaterial);
    m.position.set(x+leanX,y,z+leanZ);m.scale.set(rx,ry,rz);m.rotation.y=seed*.17+i*.71;
    m.castShadow=m.receiveShadow=true;root.add(m);
  };
  branch(0,0,0,leanX*.4,height*.44,leanZ*.4,11);
  branch(leanX*.4,height*.44,leanZ*.4,leanX,height*.86,leanZ,7);
  for(let i=0;i<5;i++){
    const a=i*2.4+seed*.03;
    branch(0,12,0,Math.cos(a)*28,2,Math.sin(a)*27,4.5);
  }
  if(seed%4===0||region===3){
    for(let tier=0;tier<4;tier++){
      const y=height*(.44+tier*.155),radius=62-tier*12;
      crown(tier,Math.sin(tier+seed)*5,y,0,radius,height*.245,radius*.88,true);
      for(const side of [-1,1])branch(leanX,y-14,leanZ,leanX+side*radius*.6,y-10,leanZ+5,2.5);
    }
  }else{
    const spread=region===6?43:35;
    for(let i=0;i<5;i++){
      const angle=i*2.4+seed*.11,x=Math.cos(angle)*spread,z=Math.sin(angle)*spread*.8;
      const y=height*(.62+(i%3)*.075),rx=38+(seed+i*7)%13;
      branch(leanX*.4,height*.44,leanZ*.4,x+leanX,y,z+leanZ,4.5);
      crown(i,x,y+12,z,rx,region===6?34:29,rx*.86);
    }
    crown(5,-6,height*.88,0,46,31,41);
    crown(6,-18,height*.95,8,27,17,24);
  }
  batchStaticMeshes(root);return root;
}

/** Arid acacias and burnt snags have branching silhouettes, rather than stacked asset blocks. */
export function createSparseTree(seed:number,region:number):T.Group {
  const root=new T.Group(),burnt=region===4||region===8,height=166+seed%25;
  const bark=burnt?0x494047:region===7?0x87613f:0x796142;
  const point=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
  const branch=(a:T.Vector3,b:T.Vector3,r:number)=>{
    const delta=b.clone().sub(a),m=new T.Mesh(trunkGeometry,material(bark));
    m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,delta.length(),r);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    m.castShadow=m.receiveShadow=true;root.add(m);
  };
  const lean=Math.sin(seed*.7)*9,fork=point(lean,height*.45,4);
  branch(point(0,0,0),point(lean*.4,height*.24,-3),12);
  branch(point(lean*.4,height*.24,-3),fork,9);
  branch(fork,point(lean+7,height*.8,-7),6);
  branch(point(lean+7,height*.8,-7),point(lean-1,height,-10),3.3);
  for(let i=0;i<4;i++){
    const angle=seed*.37+i*2.4;
    branch(point(0,10,0),point(Math.cos(angle)*27,1,Math.sin(angle)*25),4);
  }
  for(let i=0;i<5;i++){
    const angle=seed*.23+i*2.399,radius=burnt?32+i%2*8:39+i%2*4;
    const end=point(lean+Math.cos(angle)*radius,height*(.64+(i%3)*.095),Math.sin(angle)*radius*.8);
    const elbow=fork.clone().lerp(end,.58);elbow.y-=burnt?4:12;
    branch(fork,elbow,5.5);branch(elbow,end,3.5);
    const tip=end.clone().add(point(Math.cos(angle+.3)*12,burnt?23:8,Math.sin(angle+.3)*10));
    branch(end,tip,1.8);
    if(!burnt){
      const color=region===7?(i%2?0x9ca060:0x818b52):(i%2?0x8d9e6b:0x697f55);
      const crown=new T.Mesh(foliageCrown(seed+i,color),leafMaterial);
      crown.position.copy(tip).add(point(0,8,0));crown.scale.set(32+i%2*3,14,27);
      crown.rotation.y=angle;crown.castShadow=crown.receiveShadow=true;root.add(crown);
    }
  }
  root.rotation.y=seed*.11;
  batchStaticMeshes(root);return root;
}
