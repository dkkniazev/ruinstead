import * as T from 'three';
import type { WeaponId } from '../combat/WeaponDefinitions';
import type { AnimatedModel } from './Models';
import { softBox, softOrb } from './ArtMaterials';
import { createWeaponModel, type WeaponModel } from './WeaponModel';

const limb = new T.CapsuleGeometry(1, 1, 3, 8);
const torso = new T.CylinderGeometry(.82, 1, 1, 8);
const palette = {
  blue: new T.MeshStandardMaterial({color: 0x355f78, roughness: .86}),
  cloth: new T.MeshStandardMaterial({color: 0x24485b, roughness: .95}),
  steel: new T.MeshStandardMaterial({color: 0xb2cfda, metalness: .28, roughness: .38}),
  edge: new T.MeshStandardMaterial({color: 0x526e81, metalness: .2, roughness: .48}),
  gold: new T.MeshStandardMaterial({color: 0xe9b957, metalness: .22, roughness: .44}),
  leather: new T.MeshStandardMaterial({color: 0x654631, roughness: .92}),
  dark: new T.MeshStandardMaterial({color: 0x1f303e, roughness: .88}),
  skin: new T.MeshStandardMaterial({color: 0xefb482, roughness: .9}),
};
type Surface = keyof typeof palette;

export function createHero(): AnimatedModel {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const blue=palette.blue.clone();
  const make = (parent:T.Object3D, geo:T.BufferGeometry, color:Surface, x:number,y:number,z:number, sx:number,sy:number,sz:number) => {
    const mesh = new T.Mesh(geo,color==='blue'?blue:palette[color]);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz);
    mesh.castShadow=mesh.receiveShadow=true; parent.add(mesh); return mesh;
  };
  const ball = (p:T.Object3D,c:Surface,x:number,y:number,z:number,sx:number,sy=sx,sz=sx)=>make(p,softOrb,c,x,y,z,sx,sy,sz);
  const box = (p:T.Object3D,c:Surface,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>make(p,softBox,c,x,y,z,sx,sy,sz);
  const joint = (p:T.Object3D,x:number,y:number,z:number)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};

  // Tapered armour, overlapping plates and rounded seams make a single silhouette.
  make(body,torso,'blue',0,66,0,22,38,14);
  ball(body,'edge',0,71,9,19,20,9);
  ball(body,'steel',0,73,12,17,17,7);
  box(body,'gold',0,69,19,4,26,2);
  box(body,'leather',0,47,0,39,8,29);
  box(body,'gold',0,47,16,10,9,3);
  box(body,'cloth',0,36,0,33,18,25);
  for(const side of [-1,1])box(body,'blue',side*14,37,8,12,20,20).rotation.z=side*.12;
  ball(body,'skin',0,100,2,15,18,14);
  ball(body,'edge',0,110,-2,18,16,17);
  ball(body,'steel',0,113,-2,17.5,14,16.5);
  box(body,'edge',0,109,15,31,5,5);
  for(const side of [-1,1]){
    box(body,'steel',side*13,99,8,7,19,12).rotation.z=-side*.13;
    ball(body,'dark',side*5.5,102,16,1.7,2,1);
    box(body,'gold',side*11,91,11,4,5,3);
  }
  box(body,'gold',0,118,2,4,12,27);

  const legs: T.Group[] = [], knees: T.Group[] = [], arms:T.Group[] = [], elbows:T.Group[] = [];
  for(const side of [-1,1]){
    const leg=joint(body,side*10,42,0),knee=joint(leg,0,-19,0);
    legs.push(leg);knees.push(knee);
    make(leg,limb,'cloth',0,-9,0,6.5,6,7);
    ball(leg,'steel',0,-17,5,7,6,5);
    make(knee,limb,'leather',0,-8,0,6,5.5,6.5);
    box(knee,'edge',0,-6,5,10,14,5);
    box(knee,'leather',0,-17,5,14,10,23);
    box(knee,'gold',0,-12,5,14,3,19);
    const arm=joint(body,side*22,81,0),elbow=joint(arm,side*2,-21,0);
    arms.push(arm);elbows.push(elbow);
    ball(arm,'edge',side*2,-1,0,14,11,14);
    ball(arm,'steel',side*2,1,1,13,9,13);
    box(arm,'gold',side*3,5,7,14,3,13);
    make(arm,limb,'blue',0,-12,0,6,5.5,6);
    ball(elbow,'edge',0,0,0,7);
    make(elbow,limb,'leather',0,-9,0,6,5,6);
    box(elbow,'steel',0,-9,4,12,16,7);
    ball(elbow,'skin',0,-21,1,6.5,7,6);
    elbow.rotation.x=-.2;
  }

  const capeGeo=new T.PlaneGeometry(35,54,4,6);
  const capeMat=new T.MeshStandardMaterial({color:0xe8aa45,side:T.DoubleSide,roughness:.95});
  const cape=new T.Mesh(capeGeo,capeMat);cape.position.set(0,59,-17);cape.castShadow=true;body.add(cape);
  const capeRest=Float32Array.from(capeGeo.attributes.position.array);
  const capeTrim=box(body,'gold',0,85,-15,36,4,6);
  const weaponMount=joint(elbows[1],0,-21,1);
  const offHand=joint(elbows[0],0,-21,1);
  weaponMount.name='primary-grip';offHand.name='secondary-grip';
  let weaponId:WeaponId='axe',held:WeaponModel|undefined,second:WeaponModel|undefined;
  const setWeapon=(id:WeaponId):void=>{
    if(id===weaponId&&held)return;
    weaponId=id;held?.dispose();second?.dispose();second=undefined;
    held=createWeaponModel(id,false);weaponMount.add(held.root);
    if(id==='daggers'){second=createWeaponModel(id,false);offHand.add(second.root);}
  };
  setWeapon('axe');
  let phase=0,clock=0,lean=0,leanVelocity=0,turn=0,attackTime=1,wasAttacking=false,lastAttackAt=-Infinity;
  return {root,setWeapon,setTint(tint){blue.color.setHex(tint??0x355f78);},dispose(){blue.dispose();capeGeo.dispose();capeMat.dispose();held?.dispose();second?.dispose();},
    step(seconds,speed,dash=false,attack=false,travel=0,turning=0,attackAt?:number){
      const dt=Math.min(seconds,.05),motion=Math.min(1.4,speed/225);
      clock+=dt;phase+=Math.min(65,travel)*.061;
      if(attack&&(!wasAttacking||(attackAt!==undefined&&attackAt!==lastAttackAt)))attackTime=0;
      if(attackAt!==undefined)lastAttackAt=attackAt;
      wasAttacking=attack;attackTime+=dt;
      const swing=attackTime<.32?Math.sin(attackTime/.32*Math.PI):0;
      leanVelocity+=((dash?.38:motion*.1)-lean)*70*dt;leanVelocity*=Math.exp(-11*dt);lean+=leanVelocity*dt;
      turn+=(T.MathUtils.clamp(turning*.13,-.25,.25)-turn)*Math.min(1,dt*9);
      body.rotation.set(lean,-swing*.32,Math.sin(phase)*motion*.035-turn);
      body.position.y=Math.abs(Math.sin(phase))*motion*2.3+Math.sin(clock*2.6)*.4;
      for(let i=0;i<2;i++){
        const stride=Math.sin(phase+i*Math.PI);
        legs[i].rotation.x=stride*motion*.57;
        knees[i].rotation.x=Math.max(0,-stride)*motion*.65;
        arms[i].rotation.set(-stride*motion*.42-.12,(i?1:-1)*swing*.4,(i?1:-1)*.15);
        elbows[i].rotation.x=-.2-Math.max(0,stride)*motion*.22;
      }
      arms[1].rotation.x-=swing*(weaponId==='hammer'?1.8:1.3);
      arms[1].rotation.z+=swing*.58;
      if(weaponId==='daggers')arms[0].rotation.x-=swing*1.1;
      // +Z is the hero's front. Counter the shoulder/elbow angles so a raised
      // forearm never turns the blade backwards through the cape.
      const pitch=weaponId==='spear'?1.02+swing*.43:weaponId==='hammer'?.45+swing*1.65:.62+swing*1.25;
      weaponMount.rotation.x=pitch-arms[1].rotation.x-elbows[1].rotation.x;
      offHand.rotation.x=.7+swing*1.1-arms[0].rotation.x-elbows[0].rotation.x;
      const vertices=capeGeo.attributes.position;
      for(let i=0;i<vertices.count;i++){
        const x=capeRest[i*3],y=capeRest[i*3+1],t=(27-y)/54;
        vertices.setXYZ(i,x*(1+t*.2),y,Math.sin(t*3.3+clock*5+x*.04)*t*(1.3+motion*2)-t*t*(4+motion*13+lean*15));
      }
      vertices.needsUpdate=true;capeGeo.computeVertexNormals();capeTrim.rotation.z=body.rotation.z*.15;
    },
  };
}
