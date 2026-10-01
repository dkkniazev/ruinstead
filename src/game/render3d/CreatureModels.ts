import { CREATURE_PALETTES, finishCreature, sharedCreatureGeometry, horn as curvedPart } from './CreatureArt';
import * as T from 'three';
import { softBox, softOrb } from './ArtMaterials';
import { batchStaticMeshes } from './MeshBatching';
import { creatureIdentity } from './CreatureCatalog';
import { withCreatureAsset } from './CreatureAssets';
import { articulateHead, createCreatureMotion, headParts } from './CreatureMotion';
import { createWeaponModel } from './WeaponModel';
import type { AnimatedModel } from './Models';

const round = softOrb;
const block = softBox;
const spike = new T.ConeGeometry(1, 1, 5);
const stick = new T.CylinderGeometry(1, 1, 1, 6);
const rock = new T.IcosahedronGeometry(1,0);
const eyeOval = new T.SphereGeometry(1,10,6);
const materials = new Map<number, T.MeshStandardMaterial>();
function material(color: number): T.MeshStandardMaterial {
  let m = materials.get(color);
  if (!m) {
    const metal=[0x8d9fa8,0xe8d6aa,0xd8b366,0xe8c477].includes(color);
    m = new T.MeshStandardMaterial({ color, roughness: metal ? .48 : .85, metalness: metal ? .16 : 0 });
    materials.set(color, m);
  }
  return m;
}
function mesh(g: T.Object3D, geo: T.BufferGeometry, c: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx): T.Mesh {
  const m = new T.Mesh(geo, material(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
const ball = (g: T.Object3D, c: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => mesh(g, round, c, x,y,z,sx,sy,sz);
const box = (g: T.Object3D, c: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => mesh(g, block, c, x,y,z,sx,sy,sz);
function bone(g: T.Object3D,c: number,a: number[],b: number[],r: number): void {
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5);
  const m=mesh(g,stick,c,mid.x,mid.y,mid.z,r,av.distanceTo(bv),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());
}
function pivot(g:T.Object3D,x:number,y:number,z:number):T.Group { const p=new T.Group();p.position.set(x,y,z);g.add(p);return p; }
function eyes(g:T.Object3D,y:number,z:number,spread=8,reptile=false):void {
  for(const s of [-1,1]) {
    const eye=pivot(g,s*spread,y,z);eye.name='creature-eye';eye.userData.creatureHead=true;eye.userData.faceEye=s;
    const socket=mesh(eye,eyeOval,0x343638,0,0,0,5.2,3.3,1.8);socket.rotation.z=s*.11;
    mesh(eye,eyeOval,reptile?0xeab56b:0xe5d69d,0,0,1.5,3,2,1.3);
    mesh(eye,eyeOval,0x253137,0,0,2.6,reptile?.65:1,1.7,.5);mesh(eye,eyeOval,0xfff1c4,-1,1,3.2,.65);
  }
}
function horn(g:T.Object3D,c:number,x:number,y:number,z:number,size:number,lean=0):void {mesh(g,spike,c,x,y,z,size*.23,size,size*.23).rotation.z=lean;}
const wingGeometry=new T.BufferGeometry();
const wingOutline=[[0,0,0],[24,24,-12],[62,4,-32],[48,-2,-27],[34,-18,-25],[24,-13,-18],[9,-27,-15],[4,-13,-7]];
const wingVertices:number[]=[];
for(let n=2;n<8;n++)for(const i of [1,n,(n+1)%8])wingVertices.push(...wingOutline[i]);
wingGeometry.setAttribute('position',new T.Float32BufferAttribute(wingVertices,3));wingGeometry.computeVertexNormals();

/** Articulated species silhouettes; the visual core uses the existing combat radius. */
export function createCreature(id:string,primary:number,accent:number,elite=false,combatRadius?:number):AnimatedModel {
  const identity=creatureIdentity(id),shape=identity.shape,boss=!!identity.boss;
  [primary,accent]=CREATURE_PALETTES[id]??[primary,accent];
  // Intrinsic materials describe the creature; regional colors remain the trim palette.
  if(shape==='treant'){primary=0x6b5139;accent=0x799e55;}
  if(id==='prism-golem'){primary=0x628a9e;accent=0x8edce8;}
  if(id==='crystal-boar'){primary=0x7c6a77;accent=0x85cdda;}
  if(id==='lava-golem'||id==='lava-elemental'){primary=0x3a3033;accent=0xff893b;}
  const root=new T.Group(),body=pivot(root,0,0,0),legs:T.Group[]=[],knees:T.Group[]=[],arms:T.Group[]=[],wings:T.Group[]=[],segments:T.Group[]=[];
  const grips:T.Group[]=[],weaponParts:T.Group[]=[];
  body.name='creature-body';
  const dark=0x27343b,ivory=0xe8d6aa,steel=0x8d9fa8,skin=shape==='goblin'?primary:0xc6a17b;
  let floating=false,core=25,scorpionTail:T.Group|undefined;
  const wing=(side:number,y:number,scale=1,feathers=false):void=>{
    const w=pivot(body,side*14,y,-4);w.scale.set(side*scale,scale,scale);wings.push(w);
    if(!feathers){const membrane=mesh(w,wingGeometry,accent,0,0,0,1);membrane.material=new T.MeshStandardMaterial({color:accent,roughness:.85,side:T.DoubleSide,flatShading:true});}
    bone(w,primary,[0,0,0],[24,24,-12],3);bone(w,primary,[24,24,-12],[62,4,-32],2);
    if(!feathers){bone(w,primary,[24,24,-12],[34,-18,-25],1.5);bone(w,primary,[24,24,-12],[9,-27,-15],1.3);}
    if(feathers) for(let n=0;n<9;n++) { const f=ball(w,n%2?accent:primary,8+n*6,3+n*1.3,-9-n*2.4,5,21-n*.6,3);f.rotation.z=-.65; }
  };
  const tail=(length:number,y:number,thick:number):void=>{for(let i=0;i<6;i++){const p=pivot(body,0,y-i*2,-20-i*length/6);ball(p,i%2?accent:primary,0,0,0,thick*(1-i*.12),thick*(1-i*.12),length/5);segments.push(p);}};
  const humanoid=['goblin','rogue','cultist','knight','smith','ogre','imp','gargoyle','harpy'].includes(shape);
  if(humanoid){
    const heavy=shape==='ogre'||shape==='smith',wide=heavy?29:18;core=wide;
    ball(body,primary,0,53,0,wide,26,17);box(body,dark,0,33,0,wide*1.8,9,27);
    // Masked creatures get their head and eyes below, inside the fitted hood.
    // A second skin-coloured skull intersects its rim and exposes jagged slivers.
    if(shape!=='rogue'&&shape!=='cultist'){
      ball(body,shape==='knight'||shape==='gargoyle'?accent:skin,0,89,1,heavy?23:16,heavy?21:18,16);
      eyes(body,91,16,heavy?11:7);
    }
    if(!['cultist','rogue','knight','harpy'].includes(shape)){
      ball(body,skin,0,88,17,heavy?8:5,5,5);
      box(body,0x473e39,0,82,17,heavy?23:14,3,3);
      for(const side of [-1,1]){
        const brow=box(body,dark,side*(heavy?11:7),97,16,heavy?14:10,3,4);brow.rotation.z=side*.16;
        if(shape==='goblin'||shape==='ogre')box(body,ivory,side*5,83,19,3,4,2);
      }
    }
    for(const s of [-1,1]){
      const l=pivot(body,s*(heavy?16:10),34,0);legs.push(l);bone(l,dark,[0,0,0],[0,-13,1],heavy?9:6);
      const knee=pivot(l,0,-13,1);knee.name='creature-knee';knees.push(knee);bone(knee,dark,[0,0,0],[0,-14,2],heavy?8:5.5);ball(knee,shape==='harpy'?ivory:accent,0,-16,4,heavy?12:8,8,13);
      if(shape!=='harpy') {const a=pivot(body,s*(wide+5),71,0);arms.push(a);ball(a,accent,0,-2,0,heavy?13:9);bone(a,primary,[0,-4,0],[s*4,-28,2],heavy?10:6);ball(a,skin,s*4,-31,3,heavy?10:6);}
      if(shape==='goblin'||shape==='imp'||shape==='gargoyle')horn(body,shape==='goblin'?primary:ivory,s*18,102,0,23,s*-.65);
    }
    if(shape==='rogue'||shape==='cultist'){
      ball(body,primary,0,94,-3,21,23,19);ball(body,dark,0,87,13,14,11,8);eyes(body,92,19,6);
    }
    if(shape==='knight'){ball(body,steel,0,93,0,20,22,19);box(body,dark,0,94,19,30,7,3);horn(body,accent,0,119,0,25);box(body,accent,-31,44,8,29,43,8).userData.creatureShield=true;}
    if(shape==='ogre'){
      ball(body,accent,0,78,12,22,12,10);
      ball(body,0x668554,-23,73,0,16,9,18);
      box(body,0x67503a,0,50,17,9,39,5).rotation.z=-.55;
      for(const side of [-1,1])box(body,0x6d563b,side*13,29,12,21,19,9).rotation.z=side*.14;
      for(let n=0;n<3;n++)ball(body,0xbca277,-8+n*7,64-n*9,21,2.5);
    }
    for(const [i,arm]of arms.entries()){
      const handX=i===0?-4:4,grip=pivot(arm,handX,-31,3);grip.name='creature-grip';
      grip.userData.handAnchor=[handX,-31,3];grips.push(grip);
      grip.userData.forearmStart=[0,-4,0];grip.userData.forearmEnd=[handX,-28,2];
      // The attachment origin is inside the actual palm, for both hands.
      const contents=pivot(grip,0,0,0);contents.name='creature-equipment';
      // Authored blades lie in XY, with the axe edge / hammer face along +X.
      // Roll around the shaft (+Y) so +X becomes the swing's forward +Z.
      // Keep this inside the animated wrist: pitching the wrist alone leaves
      // the broad face leading the attack, even when the tip points down.
      contents.rotation.y=-Math.PI/2;weaponParts.push(contents);
    }
    if(shape==='harpy'){wing(-1,69,boss?1.4:1,true);wing(1,69,boss?1.4:1,true);ball(body,accent,0,106,-2,18,11,18);ball(body,accent,0,85,-14,18,23,9);tail(40,30,9);floating=true;for(const s of [-1,1])for(let n=0;n<3;n++)bone(legs[s===-1?0:1],ivory,[s*2,-27,9],[(n-1)*7,-34,20],1.8);}
    else if(shape==='imp'||shape==='gargoyle'){wing(-1,69,.65);wing(1,69,.65);tail(45,29,6);}
    else if(shape==='cultist') {
      const staff=weaponParts[1];bone(staff,0x715139,[0,-29,0],[0,56,0],2.8);
      for(const y of [-12,10,45])mesh(staff,stick,0xcaa35e,0,y,0,3.6,3,3.6);
      const crystal=mesh(staff,new T.OctahedronGeometry(1),accent,0,62,0,7,13,7);crystal.userData.uniqueGeometry=true;
      for(const s of [-1,1])curvedPart(staff,0xcaa35e,[[s*2,47,0],[s*10,56,0],[s*8,64,0]],2);
      staff.userData.weaponTip=[0,75,0];
    }else if(shape==='ogre'){
      const club=weaponParts[1];bone(club,0x684935,[0,-9,0],[0,32,0],3.5);ball(club,0x71533c,0,28,0,11,16,10);
      for(const y of [19,34]){const band=new T.Mesh(new T.TorusGeometry(10.5,1.7,4,12),material(steel));band.rotation.x=Math.PI/2;band.position.y=y;band.userData.uniqueGeometry=true;club.add(band);}
      club.userData.weaponTip=[0,44,0];
    }else{
      const kind=shape==='rogue'?'daggers':shape==='goblin'?'axe':shape==='knight'?'sword':'hammer';
      for(const i of shape==='rogue'?[0,1]:[1]){
        const weapon=createWeaponModel(kind,false),size=kind==='hammer'?.54:kind==='sword'?.56:kind==='axe'?.68:.7;
        // Seat the guard beyond the palm; only the handle passes through it.
        const handleOffset=kind==='daggers'?5:0;
        weapon.root.position.y=handleOffset*size;
        weapon.root.scale.setScalar(size);weaponParts[i].add(weapon.root);
        weaponParts[i].userData.weaponTip=weapon.tip.add(new T.Vector3(0,handleOffset,0)).multiplyScalar(size).toArray();
        weapon.root.traverse(o=>{if(o instanceof T.Mesh){o.userData.uniqueGeometry=o.geometry.type==='ExtrudeGeometry';o.userData.sharedEquipmentGeometry=!o.userData.uniqueGeometry;}});
      }
    }
  }else if(['boar','jackal','cat','hound','salamander','drake','wyvern','dragon','ram'].includes(shape)){
    const reptile=['salamander','drake','wyvern','dragon'].includes(shape),low=shape==='salamander',thin=shape==='jackal'||shape==='cat';
    core=thin?22:29;const y=low?20:35;
    ball(body,primary,0,y,0,core,low?13:22,34);
    headParts(body,()=>{ball(body,reptile?primary:accent,0,y+9,30,thin?17:23,19,21).userData.faceSurface=true;ball(body,primary,0,y+1,shape==='cat'?42:47,thin?10:16,10,shape==='cat'?9:18);eyes(body,y+12,45,thin?8:11,reptile);});
    for(const s of [-1,1]){
      headParts(body,()=>{
      if(!reptile)horn(body,primary,s*14,y+(shape==='cat'?28:thin?32:27),27,shape==='cat'?12:thin?27:17,s*.2);
      if(shape==='cat'){ball(body,ivory,s*7,y,48,6,4,4);for(let n=0;n<2;n++)bone(body,ivory,[s*10,y+n*3,47],[s*23,y+3+n*4,46],.6);}
      if(shape==='boar')ball(body,accent,s*5,y-2,63,3);
      if(shape==='ram')horn(body,ivory,s*17,y+36,27,33,s*-.25);
      });
      for(const z of shape==='wyvern'?[-18]:[-21,23]){const l=pivot(body,s*(low?28:19),y-6,z);legs.push(l);ball(l,primary,0,-2,0,thin?7:10,11,thin?8:11);bone(l,primary,[0,0,0],[s*(low?12:0),-23,5],thin?5:8);ball(l,dark,s*(low?12:0),-24,8,thin?7:10,6,14);}
    }
    if(shape==='boar'||shape==='hound')for(let n=0;n<5;n++)horn(body,accent,0,y+22,-28+n*12,16+n*2);
    else tail(reptile?75:58,y,low?15:10);
    if(['drake','wyvern','dragon'].includes(shape)){const span=shape==='dragon'?1.65:shape==='wyvern'?1.35:.65;wing(-1,y+20,span);wing(1,y+20,span);}
    if(reptile)for(let n=0;n<5;n++)horn(body,accent,0,y+22,-28+n*12,12);
  }else if(['scorpion','spider','beetle'].includes(shape)){
    core=28;ball(body,primary,0,26,-14,28,21,32);ball(body,accent,0,24,25,19,14,20);eyes(body,30,41,8);
    const count=shape==='spider'?4:3;
    for(const s of [-1,1])for(let n=0;n<count;n++){
      const l=pivot(body,s*18,23,25-n*17);legs.push(l);
      bone(l,primary,[0,0,0],[s*26,4,-5],3.5);ball(l,accent,s*26,4,-5,4.5,4,4);
      curvedPart(l,accent,[[s*26,4,-5],[s*31,-8,-3],[s*36,-23,5]],4);
    }
    if(shape==='beetle'){for(const s of [-1,1])ball(body,accent,s*13,36,-16,14,13,30);box(body,dark,0,46,-15,3,2,53);}
    // Mandibles start inside the cheek and taper forward/down, never point into it.
    if(shape!=='spider')for(const s of [-1,1])curvedPart(body,ivory,[[s*11,24,37],[s*15,16,48],[s*7,12,54]],4.5);
    if(shape==='scorpion'){
      for(const s of [-1,1]){
        bone(body,primary,[s*17,26,28],[s*34,28,48],6);ball(body,accent,s*34,28,49,9,7,10);
        for(const finger of [-1,1])curvedPart(body,accent,[[s*34+finger*6,28,51],[s*34+finger*11,28,64],[s*34+finger*3,28,74]],5.5);
      }
      scorpionTail=pivot(body,0,28,-34);scorpionTail.name='scorpion-tail';
      const points=[[0,0,0],[0,13,-17],[0,33,-22],[0,51,-14],[0,58,0],[0,50,15]];
      for(let i=0;i<points.length-1;i++){
        bone(scorpionTail,i%2?accent:primary,points[i],points[i+1],7-i*.7);
        ball(scorpionTail,accent,...points[i+1] as [number,number,number],7-i*.7,6,6);
      }
      const stinger=pivot(scorpionTail,0,50,15);stinger.name='scorpion-stinger';
      curvedPart(stinger,dark,[[0,0,0],[0,-10,7],[0,-22,5]],5.2);
      const socket=pivot(scorpionTail,0,50,15);socket.name='stinger-socket';
    }
  }else if(shape==='serpent'||shape==='worm'){
    core=23;
    for(let n=0;n<9;n++){const p=pivot(body,Math.sin(n*.62)*19,18+(n===0?18:0),32-n*14);segments.push(p);ball(p,n%2?accent:primary,0,0,0,(shape==='worm'?25:22)*(1-n*.065),18*(1-n*.04),19);if(shape==='serpent')horn(p,accent,0,20,0,14);}
    headParts(body,()=>{
    if(shape==='serpent'){ball(body,primary,0,45,42,22,13,25);eyes(body,52,59,12);box(body,0xdd614e,0,40,73,3,2,22);for(const s of [-1,1])horn(body,ivory,s*16,64,33,24,s*.4);}
    else {ball(body,dark,0,36,49,20,20,6);for(let n=0;n<10;n++){const a=n/10*Math.PI*2;curvedPart(body,ivory,[[Math.cos(a)*17,36+Math.sin(a)*17,51],[Math.cos(a)*12,36+Math.sin(a)*12,57],[Math.cos(a)*7,36+Math.sin(a)*7,58]],3);}}
    });
  }else if(['golem','sand','scrap','treant'].includes(shape)){
    core=32;const tree=shape==='treant',metal=shape==='scrap';
    (metal?box:ball)(body,primary,0,60,0,metal?52:31,metal?51:35,metal?32:25);ball(body,accent,0,64,24,10,15,4);ball(body,primary,0,107,0,21,23,18);if(id!=='lava-golem')eyes(body,109,18,9);
    for(const s of [-1,1]){const a=pivot(body,s*39,81,0);arms.push(a);(metal?box:ball)(a,accent,0,-8,0,metal?25:17,metal?26:20,metal?29:17);bone(a,primary,[0,-15,0],[s*7,-44,3],tree?10:13);ball(a,primary,s*7,-46,3,18,17,17);
      const l=pivot(body,s*19,35,0);legs.push(l);bone(l,primary,[0,0,0],[s*4,-25,7],13);ball(l,id==='lava-golem'?primary:accent,s*5,-29,12,17,8,22);
      if(tree){bone(body,0x66503a,[s*15,100,0],[s*29,142,-5],7);bone(body,0x66503a,[s*26,132,-5],[s*49,144,0],4);ball(body,accent,s*31,144,0,28,18,23);for(let n=0;n<3;n++)bone(l,0x66503a,[0,-22,4],[s*(12+n*7),-33,15+n*8],4);for(let n=0;n<3;n++)bone(body,0x443c2d,[s*(5+n*7),37,22],[s*(7+n*6),82,23],1.5);}
      if(metal)for(const y of [55,69,82])ball(body,ivory,s*21,y,18,2.5);
    }
    if(shape==='sand'){floating=true;legs.forEach(l=>l.visible=false);for(let n=0;n<5;n++){const a=n*1.26;ball(body,accent,Math.cos(a)*43,25+n*8,Math.sin(a)*30,8,11,7);}}
    if(shape==='golem'){
      // Stone plates cover the bright joints; emissive seams read as heat or magic.
      body.traverse(o=>{if(o instanceof T.Mesh&&o.geometry===round&&Math.max(o.scale.x,o.scale.y)>12)o.geometry=rock;});
      for(const side of [-1,1]){
        mesh(body,rock,primary,side*31,81,9,20,17,19);
        mesh(arms[side===-1?0:1],rock,primary,0,-8,4,17,19,18);
      }
      const coreGlow=new T.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.65,roughness:.45});
      const coreMesh=mesh(body,rock,accent,0,67,26,8,14,6);coreMesh.material=coreGlow;coreMesh.userData.ownedMaterial=true;
      for(const side of [-1,1])bone(body,accent,[side*5,79,25],[side*18,85,20],2);
    }
  }else if(shape==='mushroom'){
    core=23;mesh(body,stick,ivory,0,30,0,17,45,17);eyes(body,35,17,7);ball(body,accent,0,63,0,43,21,39);
    for(let n=0;n<7;n++){const a=n*2.4;ball(body,ivory,Math.cos(a)*27,76-(n%2)*6,Math.sin(a)*25,5,2,5);}
    for(const s of [-1,1]){const l=pivot(body,s*12,13,0);legs.push(l);ball(l,primary,0,-6,6,9,7,13);}
  }else if(shape==='slime'){
    core=26;ball(body,primary,0,22,0,28,24,28);ball(body,accent,0,8,0,33,7,30);eyes(body,29,24,8);ball(body,accent,-10,38,9,7,3,5);
  }else if(shape==='wisp'||shape==='flame'){
    floating=true;core=20;mesh(body,spike,accent,0,45,0,16,50,16);
    if(shape==='wisp'){const crystal=mesh(body,spike,primary,0,22,0,16,27,16);crystal.rotation.z=Math.PI;const ring=new T.Mesh(new T.TorusGeometry(29,1.6,4,18),material(accent));ring.position.y=32;ring.rotation.x=1.1;body.add(ring);}else ball(body,primary,0,29,0,22,19,21);
    for(let n=0;n<5;n++){const a=n*1.26;const p=pivot(body,Math.cos(a)*29,27+n*5,Math.sin(a)*24);segments.push(p);mesh(p,spike,accent,0,0,0,5,18,5);}
    if(shape==='flame')eyes(body,37,20,7);
  }else { // Asset fallbacks are still the same species.
    core=23;floating=true;ball(body,primary,0,40,0,23,29,19);ball(body,accent,0,64,8,22,20,17);eyes(body,66,22,11);wing(-1,48,.65);wing(1,48,.65);
    if(shape==='owl')horn(body,ivory,0,53,28,13);else for(const s of [-1,1])horn(body,accent,s*13,91,8,32,s*.3);
  }
  finishCreature(id,shape,body,arms,legs,wings,primary,accent,boss,elite);
  // Seat eyes on the sculpted skull instead of the old spherical head's surface.
  const skull=body.children.find(o=>o.userData.faceSurface) as T.Mesh|undefined;
  if(skull){
    const shell=new T.Mesh(skull.geometry);shell.position.copy(skull.position);shell.scale.copy(skull.scale);shell.updateMatrixWorld(true);
    const ray=new T.Raycaster();
    for(const eye of body.children.filter(o=>o.userData.faceEye)){
      ray.set(new T.Vector3(eye.position.x,eye.position.y,110),new T.Vector3(0,0,-1));
      const hit=ray.intersectObject(shell,false)[0];if(hit)eye.position.z=hit.point.z+.6;
    }
    (shell.material as T.Material).dispose();
  }
  // Shield fittings follow the forearm along with the plate, including boss trim.
  for(const part of [...body.children])if(part.userData.creatureShield){part.position.sub(arms[0].position);arms[0].add(part);}
  // Rig all scale plates to their body segment, including the boss armour.
  for(const part of [...body.children])if(part.userData.creatureSegment!==undefined){const segment=segments[part.userData.creatureSegment];part.position.sub(segment.position);segment.add(part);}
  // Keep shin armour and claws with the knee, including details authored afterwards.
  legs.forEach((leg,i)=>{const knee=knees[i];if(knee)for(const part of [...leg.children])if(part instanceof T.Mesh&&part.position.y<-12){part.position.sub(knee.position);knee.add(part);}});
  const head=articulateHead(body,shape,segments);
  let jaw:T.Group|undefined;
  if(head&&['boar','jackal','cat','hound','salamander','drake','wyvern','dragon'].includes(shape)){
    const low=shape==='salamander',cat=shape==='cat',y=low?20:35;
    jaw=pivot(head,0,y-3-head.position.y,38-head.position.z);jaw.name='creature-jaw';
    // Remove the former single pale jaw slab; the hinged jaw has an inner mouth.
    for(const part of [...head.children])if(part instanceof T.Mesh&&Math.abs(part.position.y+head.position.y-(y-4))<.1&&Math.abs(part.position.z+head.position.z-46)<.1)head.remove(part);
    ball(jaw,primary,0,-1,cat?8:13,cat?10:13,4,cat?12:18);
    box(jaw,0x412f34,0,2,cat?10:15,cat?16:21,2,cat?18:25);
    for(const side of [-1,1])for(let n=0;n<3;n++)horn(jaw,ivory,side*(cat?7:9),4,7+n*6,n===2?6:4);
    if(['salamander','drake','wyvern','dragon'].includes(shape))for(const side of [-1,1]){
      mesh(head,spike,ivory,side*10,y-2-head.position.y,57-head.position.z,2.3,8,2.3).rotation.z=Math.PI;
    }
  }
  batchStaticMeshes(body);
  const radius=combatRadius??(boss?55:elite?36:25);
  const animate=createCreatureMotion(shape,boss,floating,{body,head,jaw,legs,knees,arms,grips,wings,segments,tail:scorpionTail},radius/core);
  const base:AnimatedModel={root,step(dt,speed,_dash,attack,_travel,_turning,_attackAt,pose){animate(dt,speed,attack,pose);},
    dispose(){body.traverse(o=>{if(o instanceof T.Mesh){if(o.geometry===wingGeometry||o.userData.ownedMaterial)(o.material as T.Material).dispose();if(![round,block,spike,stick,rock,eyeOval,wingGeometry].includes(o.geometry)&&!sharedCreatureGeometry(o.geometry)&&!o.userData.sharedEquipmentGeometry)o.geometry.dispose();}});}};
  const model=withCreatureAsset(id,primary,accent,boss,base);
  model.root.scale.setScalar(radius/core);
  if(identity.asset&&elite){const ring=new T.Mesh(new T.TorusGeometry(20,2,4,12),material(0xe8c477));ring.rotation.x=Math.PI/2;ring.position.y=82;model.root.add(ring);const dispose=model.dispose;model.dispose=()=>{ring.geometry.dispose();dispose?.();};}
  model.root.userData.visualIdentity=shape;model.root.userData.combatRadius=radius;
  const measure=():void=>{model.root.userData.visualHeight=new T.Box3().setFromObject(model.root).max.y-model.root.position.y;};measure();void model.ready?.then(measure);
  return model;
}
