import * as T from 'three';
import {
  WEAPON_DEFINITIONS,
  type WeaponId,
} from '../combat/WeaponDefinitions';
import {
  weaponAttackAnimationSeconds,
} from './WeaponAnimation';
import type { AnimatedModel } from './Models';
import { softBox, softOrb } from './ArtMaterials';
import { createWeaponModel, type WeaponModel } from './WeaponModel';
import type { SkinId } from '../cosmetics/SkinEconomy';
import { HERO_SKIN_STYLES } from './HeroSkinStyles';
import { createSkinOutfit } from './HeroSkinModel';

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
  const surfaces=Object.fromEntries(Object.entries(palette).map(([name,material])=>[name,material.clone()])) as typeof palette;
  const make = (parent:T.Object3D, geo:T.BufferGeometry, color:Surface, x:number,y:number,z:number, sx:number,sy:number,sz:number) => {
    const mesh = new T.Mesh(geo,surfaces[color]);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz);
    mesh.castShadow=mesh.receiveShadow=true; parent.add(mesh); return mesh;
  };
  const ball = (p:T.Object3D,c:Surface,x:number,y:number,z:number,sx:number,sy=sx,sz=sx)=>make(p,softOrb,c,x,y,z,sx,sy,sz);
  const box = (p:T.Object3D,c:Surface,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>make(p,softBox,c,x,y,z,sx,sy,sz);
  const joint = (p:T.Object3D,x:number,y:number,z:number)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};

  // Tapered armour, overlapping plates and rounded seams make a single silhouette.
  const chest=new T.Group(),helmet=new T.Group();body.add(chest,helmet);
  make(body,torso,'blue',0,66,0,22,38,14);
  ball(chest,'edge',0,71,9,19,20,9);
  ball(chest,'steel',0,73,12,17,17,7);
  box(chest,'gold',0,69,19,4,26,2);
  box(body,'leather',0,47,0,39,8,29);
  box(body,'gold',0,47,16,10,9,3);
  box(body,'cloth',0,36,0,33,18,25);
  for(const side of [-1,1])box(body,'blue',side*14,37,8,12,20,20).rotation.z=side*.12;
  ball(body,'skin',0,100,2,15,18,14);
  ball(helmet,'edge',0,110,-2,18,16,17);
  ball(helmet,'steel',0,113,-2,17.5,14,16.5);
  box(helmet,'edge',0,109,15,31,5,5);
  for(const side of [-1,1]){
    box(helmet,'steel',side*13,99,8,7,19,12).rotation.z=-side*.13;
    ball(body,'dark',side*5.5,102,16,1.7,2,1);
    box(helmet,'gold',side*11,91,11,4,5,3);
  }
  box(helmet,'gold',0,118,2,4,12,27);

  const legs: T.Group[] = [], knees: T.Group[] = [], arms:T.Group[] = [], elbows:T.Group[] = [], shoulders:T.Group[]=[];
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
    const shoulder=new T.Group();arm.add(shoulder);shoulders.push(shoulder);
    ball(shoulder,'edge',side*2,-1,0,14,11,14);
    ball(shoulder,'steel',side*2,1,1,13,9,13);
    box(shoulder,'gold',side*3,5,7,14,3,13);
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
  let skinId:SkinId|null=null,outfit:ReturnType<typeof createSkinOutfit>|undefined;
  const setSkin=(id:SkinId|null):void=>{
    if(id===skinId)return;
    outfit?.dispose();outfit=undefined;skinId=id;root.userData.skinId=id;
    const style=id?HERO_SKIN_STYLES[id]:undefined;
    for(const name of Object.keys(palette) as Surface[])surfaces[name].color.copy(palette[name].color);
    if(style)for(const [name,color] of Object.entries(style.colors))surfaces[name as Surface].color.setHex(color);
    helmet.visible=!style;shoulders.forEach(shoulder=>shoulder.visible=!style);chest.visible=!style?.apron;
    capeMat.color.setHex(style?.cape??0xe8aa45);
    const [width,length]=style?.capeSize??[1,1];cape.scale.set(width,length,1);cape.position.y=86-27*length;
    if(id)outfit=createSkinOutfit(id,{body,arms,elbows,knees},surfaces);
  };
  const weaponMount=joint(elbows[1],0,-21,1);
  const offHand=joint(elbows[0],0,-21,1);
  weaponMount.name='primary-grip';offHand.name='secondary-grip';
  let weaponId:WeaponId='axe',held:WeaponModel|undefined,second:WeaponModel|undefined;
  const setWeapon=(id:WeaponId):void=>{
    if(id===weaponId&&held)return;
    weaponId=id;held?.dispose();second?.dispose();second=undefined;
    held=createWeaponModel(id,false);
    // Weapon geometry grows along local +Y. Roll it around that longitudinal
    // axis so blades/heads present their authored broad side instead of lying
    // flat across the wrist.
    // Previous +90° roll left the authored broad side upside down.
    // -90° is exactly another 180° around the weapon's longitudinal +Y axis.
    held.root.rotation.y=-Math.PI/2;
    weaponMount.add(held.root);
    if(id==='daggers'){
      second=createWeaponModel(id,false);
      second.root.rotation.y=-Math.PI/2;
      offHand.add(second.root);
    }
  };
  setWeapon('axe');
  let phase=0,clock=0,lean=0,leanVelocity=0,turn=0,attackTime=1,attackSerial=0,wasAttacking=false,lastAttackAt=-Infinity;
  return {root,setWeapon,setSkin,setTint(tint){surfaces.blue.color.setHex(tint??0x355f78);},dispose(){outfit?.dispose();Object.values(surfaces).forEach(material=>material.dispose());capeGeo.dispose();capeMat.dispose();held?.dispose();second?.dispose();},
    step(seconds,speed,dash=false,attack=false,travel=0,turning=0,attackAt?:number){
      const dt=Math.min(seconds,.05),motion=Math.min(1.4,speed/225);
      clock+=dt;phase+=Math.min(65,travel)*.061;
      outfit?.step(clock);
      const newAttack=attack&&(!wasAttacking||(attackAt!==undefined&&attackAt!==lastAttackAt));
      if(newAttack){attackTime=0;attackSerial++;}
      if(attackAt!==undefined)lastAttackAt=attackAt;
      wasAttacking=attack;attackTime+=dt;

      const style=WEAPON_DEFINITIONS[weaponId].attackStyle;
      const duration=
        weaponAttackAnimationSeconds(
          weaponId,
        );
      const attackProgress=T.MathUtils.clamp(attackTime/duration,0,1);
      const attacking=attackTime<duration;
      const pulse=attacking?Math.sin(attackProgress*Math.PI):0;
      const sweep=attacking?T.MathUtils.smoothstep(attackProgress,.12,.86)*2-1:0;
      const side=attackSerial%2===0?1:-1;

      leanVelocity+=((dash?.38:motion*.1)-lean)*70*dt;leanVelocity*=Math.exp(-11*dt);lean+=leanVelocity*dt;
      turn+=(T.MathUtils.clamp(turning*.13,-.25,.25)-turn)*Math.min(1,dt*9);
      body.rotation.set(lean,0,Math.sin(phase)*motion*.035-turn);
      body.position.y=Math.abs(Math.sin(phase))*motion*2.3+Math.sin(clock*2.6)*.4;
      for(let i=0;i<2;i++){
        const stride=Math.sin(phase+i*Math.PI);
        legs[i].rotation.x=stride*motion*.57;
        knees[i].rotation.x=Math.max(0,-stride)*motion*.65;
        arms[i].rotation.set(-stride*motion*.42-.12,0,(i?1:-1)*.15);
        elbows[i].rotation.x=-.2-Math.max(0,stride)*motion*.22;
      }

      // Each weapon family gets its own readable silhouette and trajectory.
      // +Z is hero forward; mount pitch compensates arm/elbow rotations.
      let primaryPitch=1.18;
      let primaryYaw=0;
      let primaryRoll=0;
      let offPitch=1.05;
      let offYaw=0;
      let offRoll=0;

      if(style==='thrust'){
        // Spear: retract, then punch straight through the target line.
        const thrust=attacking?Math.sin(attackProgress*Math.PI):0;
        arms[1].rotation.x-=thrust*.82;
        elbows[1].rotation.x-=thrust*.25;
        body.rotation.x-=thrust*.06;
        primaryPitch=1.34+thrust*.16;
      }else if(style==='slash'){
        // Sword: alternating diagonal cuts, led by torso rotation.
        const cut=attacking?sweep:0;
        body.rotation.y=-side*cut*.42;
        arms[1].rotation.y=side*(.2-cut*.72);
        arms[1].rotation.z+=side*(.22+cut*.46);
        arms[1].rotation.x-=pulse*.46;
        primaryPitch=1.08+pulse*.28;
        primaryYaw=-side*cut*.72;
        primaryRoll=side*(.18-cut*.3);
      }else if(style==='wide-slash'){
        // Axe: slower two-handed-looking cleave with a broad arc and follow-through.
        const cut=attacking?sweep:0;
        body.rotation.y=-side*cut*.62;
        body.rotation.x-=pulse*.08;
        arms[1].rotation.y=side*(.35-cut*.9);
        arms[1].rotation.z+=side*(.3+cut*.58);
        arms[1].rotation.x-=pulse*.62;
        primaryPitch=.98+pulse*.36;
        primaryYaw=-side*cut*.92;
        primaryRoll=side*(.28-cut*.42);
      }else if(style==='smash'){
        const overhead=attackSerial%3!==0;
        if(overhead){
          // Hammer: lift above the shoulder, then drive the head down.
          const lift=attacking?Math.sin(Math.min(1,attackProgress/.46)*Math.PI/2):0;
          const drop=attacking?T.MathUtils.smoothstep(attackProgress,.42,.82):0;
          arms[1].rotation.x+=lift*.92-drop*1.62;
          arms[1].rotation.z+=side*(.2-lift*.18);
          body.rotation.x-=drop*.2;
          primaryPitch=.42+lift*.12+drop*1.55;
          primaryRoll=side*.08;
        }else{
          // Occasional side smash keeps repeated hammer attacks from looking identical.
          const cut=attacking?sweep:0;
          body.rotation.y=-side*cut*.52;
          arms[1].rotation.y=side*(.28-cut*.82);
          arms[1].rotation.z+=side*(.28+cut*.52);
          arms[1].rotation.x-=pulse*.55;
          primaryPitch=.92+pulse*.35;
          primaryYaw=-side*cut*.82;
          primaryRoll=side*.22;
        }
      }else{
        // Daggers: alternate hands and cross the body instead of two tiny thrusts.
        const cut=attacking?sweep:0;
        body.rotation.y=-side*cut*.22;
        arms[1].rotation.y=side*(.18-cut*.6);
        arms[0].rotation.y=-side*(.18-cut*.6);
        arms[1].rotation.x-=pulse*.58;
        arms[0].rotation.x-=Math.sin(T.MathUtils.clamp(attackProgress+.18,0,1)*Math.PI)*.5;
        arms[1].rotation.z+=side*(.18+cut*.26);
        arms[0].rotation.z-=side*(.18+cut*.26);
        primaryPitch=1.12+pulse*.22;
        offPitch=1.12+pulse*.2;
        primaryYaw=-side*cut*.58;
        offYaw=side*cut*.58;
        primaryRoll=side*.2;
        offRoll=-side*.2;
      }

      weaponMount.rotation.set(
        primaryPitch-arms[1].rotation.x-elbows[1].rotation.x,
        primaryYaw-arms[1].rotation.y,
        primaryRoll-arms[1].rotation.z,
      );
      offHand.rotation.set(
        offPitch-arms[0].rotation.x-elbows[0].rotation.x,
        offYaw-arms[0].rotation.y,
        offRoll-arms[0].rotation.z,
      );
      const vertices=capeGeo.attributes.position;
      for(let i=0;i<vertices.count;i++){
        const x=capeRest[i*3],y=capeRest[i*3+1],t=(27-y)/54;
        vertices.setXYZ(i,x*(1+t*.2),y,Math.sin(t*3.3+clock*5+x*.04)*t*(1.3+motion*2)-t*t*(4+motion*13+lean*15));
      }
      vertices.needsUpdate=true;capeGeo.computeVertexNormals();capeTrim.rotation.z=body.rotation.z*.15;
    },
  };
}
