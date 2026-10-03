import * as T from 'three';
import { naturalSurfaceMaterial } from './NatureForms';
import { batchStaticMeshes } from './MeshBatching';
import { treeBark, treeCanopy } from './TreeForms';

const leafMaterial=naturalSurfaceMaterial;

/** Forked trunks and asymmetric crowns, inside the existing harvest-node silhouette. */
export function createLivingTree(seed:number,region:number):T.Group {
  const root=new T.Group(),height=184+seed%30;
  const bark=region===3?0x665968:region===6?0x766b51:0x795638;
  const leaves=region===3?0x456e79:region===5?0x77a678:region===6?0x73997d:0x579452;
  const leanX=Math.sin(seed*.7)*10,leanZ=Math.cos(seed*1.7)*8;
  const branch=(ax:number,ay:number,az:number,bx:number,by:number,bz:number,r:number)=>{
    const a=new T.Vector3(ax,ay,az),b=new T.Vector3(bx,by,bz),delta=b.clone().sub(a);
    const m=new T.Mesh(treeBark(seed,bark),naturalSurfaceMaterial);
    m.position.copy(a);m.scale.set(r,delta.length(),r);
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    m.castShadow=m.receiveShadow=true;root.add(m);
  };
  const crown=(x:number,y:number,z:number,rx:number,ry:number,rz:number,pine=false)=>{
    const m=new T.Mesh(treeCanopy(seed,leaves,pine),leafMaterial);
    m.position.set(x+leanX,y,z+leanZ);m.scale.set(rx,ry,rz);m.rotation.y=seed*.17;
    m.castShadow=m.receiveShadow=true;root.add(m);
  };
  const trunk=new T.Mesh(treeBark(seed,bark,true),naturalSurfaceMaterial);
  trunk.scale.set(12,height*.82,12);trunk.castShadow=trunk.receiveShadow=true;root.add(trunk);
  if(seed%4===0||region===3){
    crown(0,height*.65,0,60,height*.4,53,true);
  }else{
    const spread=region===6?40:34;
    for(let i=0;i<4;i++){
      const angle=i*2.4+seed*.11,x=Math.cos(angle)*spread,z=Math.sin(angle)*spread*.8;
      const y=height*(.62+(i%3)*.065);
      branch(leanX*.4,height*.44,leanZ*.4,x+leanX,y,z+leanZ,4.5);
    }
    const broad=seed%3===1;
    crown(-4,height*.75,0,broad?73:63,broad?48:59,broad?61:54);
  }
  batchStaticMeshes(root);return root;
}

/** Arid acacias and burnt snags have branching silhouettes, rather than stacked asset blocks. */
export function createSparseTree(seed:number,region:number):T.Group {
  const root=new T.Group(),burnt=region===4||region===8,height=166+seed%25;
  const bark=burnt?0x494047:region===7?0x87613f:0x796142;
  const point=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
  const branch=(a:T.Vector3,b:T.Vector3,r:number)=>{
    const delta=b.clone().sub(a),m=new T.Mesh(treeBark(seed,bark),naturalSurfaceMaterial);
    m.position.copy(a);m.scale.set(r,delta.length(),r);
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
  }
  if(!burnt){
    // One broad umbrella joins the branch fans instead of five detached caps.
    const crown=new T.Mesh(treeCanopy(seed,region===7?0x909b60:0x7c945d),leafMaterial);
    crown.position.set(lean+1,height*.87,-2);crown.scale.set(68,31,57);
    crown.rotation.y=seed*.23;crown.castShadow=crown.receiveShadow=true;root.add(crown);
  }
  root.rotation.y=seed*.11;
  batchStaticMeshes(root);return root;
}
