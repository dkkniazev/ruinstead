import * as T from 'three';
import { softBox, softOrb } from './ArtMaterials';
import { batchStaticMeshes } from './MeshBatching';
import { creatureIdentity } from './CreatureCatalog';
import { withCreatureAsset } from './CreatureAssets';
import type { AnimatedModel } from './Models';

const round = softOrb;
const block = softBox;
const spike = new T.ConeGeometry(1, 1, 5);
const stick = new T.CylinderGeometry(1, 1, 1, 6);
const rock = new T.IcosahedronGeometry(1,0);
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
function eyes(g:T.Object3D,y:number,z:number,spread=8):void {
  for(const s of [-1,1]) {ball(g,0xffe9b4,s*spread,y,z,3.8,3.2,2);ball(g,0x202b30,s*spread,y,z+1.8,1.6);}
}
function horn(g:T.Object3D,c:number,x:number,y:number,z:number,size:number,lean=0):void {mesh(g,spike,c,x,y,z,size*.23,size,size*.23).rotation.z=lean;}
const wingGeometry=new T.BufferGeometry();
wingGeometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0, 24,24,-12, 62,4,-32, 0,0,0, 62,4,-32, 32,-12,-20, 0,0,0, 32,-12,-20, 8,-20,-12],3));wingGeometry.computeVertexNormals();

/** Articulated species silhouettes; the visual core uses the existing combat radius. */
export function createCreature(id:string,primary:number,accent:number,elite=false,combatRadius?:number):AnimatedModel {
  const identity=creatureIdentity(id),shape=identity.shape,boss=!!identity.boss;
  // Intrinsic materials describe the creature; regional colors remain the trim palette.
  if(shape==='treant'){primary=0x6b5139;accent=0x799e55;}
  if(id==='prism-golem'){primary=0x628a9e;accent=0x8edce8;}
  if(id==='crystal-boar'){primary=0x7c6a77;accent=0x85cdda;}
  if(id==='lava-golem'||id==='lava-elemental'){primary=0x3a3033;accent=0xff893b;}
  const root=new T.Group(),body=pivot(root,0,0,0),legs:T.Group[]=[],arms:T.Group[]=[],wings:T.Group[]=[],segments:T.Group[]=[];
  const dark=0x27343b,ivory=0xe8d6aa,steel=0x8d9fa8,skin=shape==='goblin'?primary:0xc6a17b;
  let floating=false,core=25;
  const wing=(side:number,y:number,scale=1,feathers=false):void=>{
    const w=pivot(body,side*14,y,-4);w.scale.set(side*scale,scale,scale);wings.push(w);
    if(!feathers){const membrane=mesh(w,wingGeometry,accent,0,0,0,1);membrane.material=new T.MeshStandardMaterial({color:accent,roughness:.85,side:T.DoubleSide,flatShading:true});}
    bone(w,primary,[0,0,0],[24,24,-12],3);bone(w,primary,[24,24,-12],[62,4,-32],2);
    if(feathers) for(let n=0;n<9;n++) { const f=ball(w,n%2?accent:primary,8+n*6,3+n*1.3,-9-n*2.4,5,21-n*.6,3);f.rotation.z=-.65; }
  };
  const tail=(length:number,y:number,thick:number):void=>{for(let i=0;i<6;i++){const p=pivot(body,0,y-i*2,-20-i*length/6);ball(p,i%2?accent:primary,0,0,0,thick*(1-i*.12),thick*(1-i*.12),length/5);segments.push(p);}};
  const humanoid=['goblin','rogue','cultist','knight','smith','ogre','imp','gargoyle','harpy'].includes(shape);
  if(humanoid){
    const heavy=shape==='ogre'||shape==='smith',wide=heavy?29:18;core=wide;
    ball(body,primary,0,53,0,wide,26,17);box(body,dark,0,33,0,wide*1.8,9,27);
    ball(body,shape==='knight'||shape==='gargoyle'?accent:skin,0,89,1,heavy?23:16,heavy?21:18,16);
    eyes(body,91,16,heavy?11:7);
    if(!['cultist','rogue','knight','harpy'].includes(shape)){
      ball(body,skin,0,88,17,heavy?8:5,5,5);
      box(body,0x473e39,0,82,17,heavy?23:14,3,3);
      for(const side of [-1,1]){
        const brow=box(body,dark,side*(heavy?11:7),97,16,heavy?14:10,3,4);brow.rotation.z=side*.16;
        if(shape==='goblin'||shape==='ogre')box(body,ivory,side*5,83,19,3,4,2);
      }
    }
    for(const s of [-1,1]){
      const l=pivot(body,s*(heavy?16:10),34,0);legs.push(l);bone(l,dark,[0,0,0],[0,-27,3],heavy?9:6);ball(l,shape==='harpy'?ivory:accent,0,-29,5,heavy?12:8,8,13);
      if(shape!=='harpy') {const a=pivot(body,s*(wide+5),71,0);arms.push(a);ball(a,accent,0,-2,0,heavy?13:9);bone(a,primary,[0,-4,0],[s*4,-28,2],heavy?10:6);ball(a,skin,s*4,-31,3,heavy?10:6);}
      if(shape==='goblin'||shape==='imp'||shape==='gargoyle')horn(body,shape==='goblin'?primary:ivory,s*18,102,0,23,s*-.65);
    }
    if(shape==='rogue'||shape==='cultist'){
      ball(body,primary,0,94,-3,21,23,19);box(body,dark,0,88,15,25,19,5);eyes(body,92,19,6);
      mesh(body,spike,primary,0,32,-3,25,53,23);box(body,accent,0,56,17,5,30,3);
    }
    if(shape==='knight'){ball(body,steel,0,93,0,20,22,19);box(body,dark,0,94,19,30,7,3);horn(body,accent,0,119,0,25);box(body,accent,-31,44,8,29,43,8);}
    if(shape==='smith')box(body,0x67432e,0,46,18,39,43,4);
    if(shape==='ogre'){
      ball(body,accent,0,78,12,22,12,10);for(const s of [-1,1])horn(body,ivory,s*12,81,22,15);
      ball(body,0x668554,-23,73,0,16,9,18);
      box(body,0x67503a,0,50,17,9,39,5).rotation.z=-.55;
      for(const side of [-1,1])box(body,0x6d563b,side*13,29,12,21,19,9).rotation.z=side*.14;
      for(let n=0;n<3;n++)ball(body,0xbca277,-8+n*7,64-n*9,21,2.5);
    }
    if(shape==='harpy'){wing(-1,69,boss?1.4:1,true);wing(1,69,boss?1.4:1,true);ball(body,accent,0,106,-2,18,11,18);ball(body,accent,0,85,-14,18,23,9);tail(40,30,9);floating=true;for(const s of [-1,1])for(let n=0;n<3;n++)bone(legs[s===-1?0:1],ivory,[s*2,-27,9],[(n-1)*7,-34,20],1.8);}
    else if(shape==='imp'||shape==='gargoyle'){wing(-1,69,.65);wing(1,69,.65);tail(45,29,6);}
    else if(shape==='cultist') {bone(arms[1],0x715139,[5,-35,3],[5,42,3],3);ball(arms[1],accent,5,47,3,10,15,10);}
    else if(shape==='rogue') {for(const a of arms){box(a,steel,4,-43,6,6,29,3);box(a,accent,4,-30,6,14,4,5);}}
    else {const a=arms[1];bone(a,0x684935,[4,-35,3],[4,25,3],4); if(shape==='ogre')ball(a,0x71533c,4,20,3,14,29,12);else if(shape==='goblin'){
      const blade=new T.Shape();blade.moveTo(1,0);blade.lineTo(5,10);blade.lineTo(25,15);blade.lineTo(30,4);blade.lineTo(28,-10);blade.lineTo(8,-5);blade.lineTo(1,-3);blade.closePath();
      mesh(a,new T.ExtrudeGeometry(blade,{depth:6,bevelEnabled:false}),steel,4,18,0,1);
    }else box(a,steel,4,20,3,shape==='knight'?7:31,shape==='knight'?48:19,shape==='knight'?5:14);}
  }else if(['boar','jackal','cat','hound','salamander','drake','wyvern','dragon','ram'].includes(shape)){
    const reptile=['salamander','drake','wyvern','dragon'].includes(shape),low=shape==='salamander',thin=shape==='jackal'||shape==='cat';
    core=thin?22:29;const y=low?20:35;
    ball(body,primary,0,y,0,core,low?13:22,34);ball(body,accent,0,y+9,30,thin?17:23,19,21);ball(body,primary,0,y+1,shape==='cat'?42:47,thin?10:16,10,shape==='cat'?9:18);eyes(body,y+15,45,thin?10:14);
    for(const s of [-1,1]){
      if(!reptile)horn(body,primary,s*14,y+(shape==='cat'?28:thin?32:27),27,shape==='cat'?12:thin?27:17,s*.2);else horn(body,ivory,s*16,y+34,17,25,s*-.4);
      if(shape==='cat'){ball(body,ivory,s*7,y,48,6,4,4);for(let n=0;n<2;n++)bone(body,ivory,[s*10,y+n*3,47],[s*23,y+3+n*4,46],.6);}
      for(const z of shape==='wyvern'?[-18]:[-21,23]){const l=pivot(body,s*(low?28:19),y-6,z);legs.push(l);ball(l,primary,0,-2,0,thin?7:10,11,thin?8:11);bone(l,primary,[0,0,0],[s*(low?12:0),-23,5],thin?5:8);ball(l,dark,s*(low?12:0),-24,8,thin?7:10,6,14);}
      if(shape==='boar'){horn(body,ivory,s*18,y+1,54,25,s*-.4);ball(body,accent,s*5,y-2,63,3);}
      if(shape==='ram')horn(body,ivory,s*17,y+36,27,33,s*-.25);
    }
    if(shape==='boar'||shape==='hound')for(let n=0;n<5;n++)horn(body,accent,0,y+22,-28+n*12,16+n*2);
    else tail(reptile?75:58,y,low?15:10);
    if(['drake','wyvern','dragon'].includes(shape)){const span=shape==='dragon'?1.65:shape==='wyvern'?1.35:.65;wing(-1,y+20,span);wing(1,y+20,span);}
    if(reptile)for(let n=0;n<5;n++)horn(body,accent,0,y+22,-28+n*12,12);
  }else if(['scorpion','spider','beetle'].includes(shape)){
    core=28;ball(body,primary,0,26,-14,28,21,32);ball(body,accent,0,24,25,19,14,20);eyes(body,30,41,8);
    const count=shape==='spider'?4:3;
    for(const s of [-1,1])for(let n=0;n<count;n++){const l=pivot(body,s*18,23,25-n*17);legs.push(l);bone(l,primary,[0,0,0],[s*26,4,-5],3.5);bone(l,accent,[s*26,4,-5],[s*36,-21,2],3);}
    if(shape==='beetle'){for(const s of [-1,1])ball(body,accent,s*13,36,-16,14,13,30);box(body,dark,0,46,-15,3,2,53);}
    for(const s of [-1,1])horn(body,ivory,s*9,16,44,16,s*.5);
    if(shape==='scorpion'){
      for(const s of [-1,1]){bone(body,primary,[s*17,26,28],[s*34,28,48],6);ball(body,accent,s*36,27,55,12,7,15);box(body,dark,s*36,32,62,3,4,17);}
      bone(body,primary,[0,28,-34],[0,49,-57],7);bone(body,accent,[0,49,-57],[0,78,-43],6);horn(body,dark,0,70,-34,24,.2);
    }
  }else if(shape==='serpent'||shape==='worm'){
    core=23;
    for(let n=0;n<9;n++){const p=pivot(body,Math.sin(n*.62)*19,18+(n===0?18:0),32-n*14);segments.push(p);ball(p,n%2?accent:primary,0,0,0,(shape==='worm'?25:22)*(1-n*.065),18*(1-n*.04),19);if(shape==='serpent')horn(p,accent,0,20,0,14);}
    if(shape==='serpent'){ball(body,primary,0,45,42,22,13,25);eyes(body,52,59,12);box(body,0xdd614e,0,40,73,3,2,22);for(const s of [-1,1])horn(body,ivory,s*16,64,33,24,s*.4);}
    else {ball(body,dark,0,36,49,20,20,6);for(let n=0;n<10;n++){const a=n/10*Math.PI*2;const t=mesh(body,spike,ivory,Math.cos(a)*16,36+Math.sin(a)*16,55,4,12,4);t.rotation.z=a+Math.PI/2;}}
  }else if(['golem','sand','scrap','treant'].includes(shape)){
    core=32;const tree=shape==='treant',metal=shape==='scrap';
    (metal?box:ball)(body,primary,0,60,0,metal?52:31,metal?51:35,metal?32:25);ball(body,accent,0,64,24,10,15,4);ball(body,primary,0,107,0,21,23,18);eyes(body,109,18,9);
    for(const s of [-1,1]){const a=pivot(body,s*39,81,0);arms.push(a);(metal?box:ball)(a,accent,0,-8,0,metal?25:17,metal?26:20,metal?29:17);bone(a,primary,[0,-15,0],[s*7,-44,3],tree?10:13);ball(a,primary,s*7,-46,3,18,17,17);
      const l=pivot(body,s*19,35,0);legs.push(l);bone(l,primary,[0,0,0],[s*4,-25,7],13);ball(l,accent,s*5,-29,12,17,8,22);
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
  if(elite||boss){
    const height=humanoid?(['cultist','rogue','knight','harpy'].includes(shape)?120:109):['golem','sand','scrap','treant'].includes(shape)?130:shape==='mushroom'?84:shape==='slime'?47:shape==='serpent'||shape==='worm'?62:58;
    const crown=pivot(body,0,height,shape==='serpent'||shape==='worm'?35:0);
    for(let n=0;n<5;n++){const angle=n/5*Math.PI*2;horn(crown,0xd8b366,Math.cos(angle)*12,0,Math.sin(angle)*12,boss?15:10);}
    if(boss&&['boar','cat','hound'].includes(shape))for(let n=0;n<4;n++)horn(body,accent,0,58,-23+n*13,25+n*3);
  }
  batchStaticMeshes(body);
  let phase=0,actionAge=1,attackWasActive=false;
  const base:AnimatedModel={root,step(dt,speed,_dash,attack){phase+=Math.min(dt,.05)*(speed>10?8:2);const move=Math.min(1,speed/150);
    if(attack&&!attackWasActive)actionAge=0;attackWasActive=!!attack;actionAge+=dt;
    const swing=actionAge<.35?Math.sin(actionAge/.35*Math.PI):0;
    legs.forEach((l,i)=>l.rotation.x=Math.sin(phase+i*Math.PI*.85)*move*.48);
    arms.forEach((a,i)=>a.rotation.x=Math.sin(phase+i*Math.PI)*(move*.3+.025)-swing*(i===1?1.15:.38));
    wings.forEach((w,i)=>w.rotation.z=(i%2?1:-1)*Math.sin(phase)*.22);
    segments.forEach((s,i)=>{s.rotation.y=Math.sin(phase-i*.6)*.23;});
    body.position.y=floating?Math.sin(phase)*4+8:Math.abs(Math.sin(phase))*move*2;body.rotation.z=Math.sin(phase)*move*.025;
    body.rotation.x=swing*(humanoid?.12:.24);
    if(shape==='slime')body.scale.set(1+Math.sin(phase)*.05,1-Math.sin(phase)*.07,1+Math.sin(phase)*.05);
  },dispose(){body.traverse(o=>{if(o instanceof T.Mesh){if(o.geometry===wingGeometry||o.userData.ownedMaterial)(o.material as T.Material).dispose();if(![round,block,spike,stick,rock,wingGeometry].includes(o.geometry))o.geometry.dispose();}});}};
  const model=withCreatureAsset(id,primary,accent,boss,base);
  const radius=combatRadius??(boss?55:elite?36:25);
  model.root.scale.setScalar(radius/core);
  if(identity.asset&&elite){const ring=new T.Mesh(new T.TorusGeometry(20,2,4,12),material(0xe8c477));ring.rotation.x=Math.PI/2;ring.position.y=82;model.root.add(ring);const dispose=model.dispose;model.dispose=()=>{ring.geometry.dispose();dispose?.();};}
  model.root.userData.visualIdentity=shape;model.root.userData.combatRadius=radius;
  const measure=():void=>{model.root.userData.visualHeight=new T.Box3().setFromObject(model.root).max.y-model.root.position.y;};measure();void model.ready?.then(measure);
  return model;
}
