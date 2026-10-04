import * as T from 'three';
import { softBox, softOrb } from './ArtMaterials';
import type { CreatureShape } from './CreatureCatalog';
import { headParts } from './CreatureMotion';
import { refineCreatureAnatomy } from './CreatureAnatomy';

const steel=0x798c99,ivory=0xe2d1a1,leather=0x675044,dark=0x293039,gold=0xcaa35e;
const materials=new Map<string,T.MeshStandardMaterial>();
function material(color:number,glow=false):T.MeshStandardMaterial {
  const key=color+':'+glow;let m=materials.get(key);
  if(!m){m=new T.MeshStandardMaterial({color,roughness:glow?.4:.78,metalness:color===steel||color===gold?.22:0,emissive:glow?color:0,emissiveIntensity:glow?.65:0});materials.set(key,m);}return m;
}
const crystal=new T.OctahedronGeometry(1,0),plate=new T.IcosahedronGeometry(1,0),cone=new T.ConeGeometry(1,1,6);
const shared=new Set<T.BufferGeometry>([softBox,softOrb,crystal,plate,cone]);
function add(g:T.Object3D,geo:T.BufferGeometry,c:number,x:number,y:number,z:number,sx:number,sy=sx,sz=sx,glow=false):T.Mesh {
  const m=new T.Mesh(geo,material(c,glow));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;m.userData.artOwnedGeometry=!shared.has(geo);g.add(m);return m;
}
const box=(g:T.Object3D,c:number,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>add(g,softBox,c,x,y,z,sx,sy,sz);
const gem=(g:T.Object3D,c:number,x:number,y:number,z:number,sx:number,sy=sx,sz=sx)=>add(g,crystal,c,x,y,z,sx,sy,sz,true);
/** Tapered curved horns, claws and roots, with a smooth centreline and six-sided cross section. */
export function horn(g:T.Object3D,c:number,points:number[][],radius:number):T.Mesh {
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(9,false),pos:number[]=[],indices:number[]=[];
  for(let i=0;i<=9;i++){
    const p=curve.getPointAt(i/9),r=radius*Math.pow(1-i/9,.8)+.12;
    for(let n=0;n<6;n++){const a=n/6*Math.PI*2,v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);pos.push(...v.toArray());
      if(i<9){const a=i*6+n,b=i*6+(n+1)%6;indices.push(a,b,b+6,a,b+6,a+6);}}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();return add(g,geo,c,0,0,0,1);
}
function ring(g:T.Object3D,c:number,r:number,tube:number,x:number,y:number,z:number,rx=0,ry=0):T.Mesh {
  const m=add(g,new T.TorusGeometry(r,tube,5,16),c,x,y,z,1);m.rotation.set(rx,ry,0);return m;
}
function feather(g:T.Object3D,c:number,x:number,y:number,z:number,length:number,lean:number):void {
  const m=add(g,crystal,c,x,y,z,4,length,2.3);m.rotation.z=lean;
}

const torso=(()=>{
  const pos:number[]=[],indices:number[]=[],rings=[[-1,.55,.65],[-.6,.67,.72],[-.05,1,.97],[.48,1.08,1],[.83,.84,.8],[1,.47,.58]];
  for(let j=0;j<rings.length;j++)for(let i=0;i<12;i++){
    const [y,rx,rz]=rings[j],a=i/12*Math.PI*2;pos.push(Math.cos(a)*rx,y,Math.sin(a)*rz);
    if(j<rings.length-1){const n=j*12+i,k=j*12+(i+1)%12;indices.push(n,k,k+12,n,k+12,n+12);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();shared.add(g);return g;
})();
// Authored cross-sections give animals a shoulder, tucked flank and tapered skull.
// Closed surfaces keep the silhouette solid under the high isometric key light.
function loft(rings:number[][]):T.BufferGeometry {
  const positions:number[]=[],indices:number[]=[],sides=12;
  for(let j=0;j<rings.length;j++)for(let i=0;i<sides;i++){
    const [z,rx,ry,cy]=rings[j],angle=i/sides*Math.PI*2;
    positions.push(Math.cos(angle)*rx,Math.sin(angle)*ry+cy,z);
    if(j<rings.length-1){const a=j*sides+i,b=j*sides+(i+1)%sides;indices.push(a,b,b+sides,a,b+sides,a+sides);}
  }
  for(const end of [0,rings.length-1]){
    const center=positions.length/3;positions.push(0,rings[end][3],rings[end][0]);
    for(let i=0;i<sides;i++){const a=end*sides+i,b=end*sides+(i+1)%sides;indices.push(...(end===0?[center,b,a]:[center,a,b]));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();shared.add(geometry);return geometry;
}
const haunch=loft([[-1,.45,.55,0],[-.7,.87,.94,0],[-.23,.83,.83,.1],[.3,1,1,.12],[.67,.92,.88,.17],[1,.4,.5,.12]]);
const skull=loft([[-1,.5,.55,.02],[-.6,.85,.83,.1],[-.1,1,.96,.08],[.4,.8,.68,-.13],[1,.45,.42,-.27]]);
const reptileSnout=loft([[-1,.85,.7,0],[-.45,1,.85,0],[.4,.86,.65,-.08],[1,.64,.45,-.15]]);
const boot=loft([[-1,.56,.75,0],[-.65,.89,1,0],[.12,1,.95,-.06],[.73,.85,.72,-.15],[1,.52,.46,-.2]]);
const humanoidHead=(()=>{
  const positions:number[]=[],indices:number[]=[],sides=12;
  const rows=[[-1,.42,.52],[-.75,.77,.72],[-.27,1,.94],[.34,1,1],[.78,.86,.86],[1,.38,.43]];
  for(let j=0;j<rows.length;j++)for(let i=0;i<sides;i++){
    const angle=i/sides*Math.PI*2,[y,rx,rz]=rows[j];
    positions.push(Math.cos(angle)*rx,y,Math.min(.94,Math.sin(angle)*rz));
    if(j<rows.length-1){const a=j*sides+i,b=j*sides+(i+1)%sides;indices.push(a,a+sides,b+sides,a,b+sides,b);}
  }
  for(const end of [0,rows.length-1]){
    const center=positions.length/3;positions.push(0,rows[end][0],0);
    for(let i=0;i<sides;i++){const a=end*sides+i,b=end*sides+(i+1)%sides;indices.push(...(end===0?[center,a,b]:[center,b,a]));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();shared.add(geometry);return geometry;
})();
/** A closed cloth/leather panel follows the chest in depth as well as width. */
function fittedPanel(rows:number[][]):T.BufferGeometry {
  const pos:number[]=[],indices:number[]=[];
  for(const [y,left,right,zLeft,zRight]of rows)pos.push(left,y,zLeft,right,y,zRight,left,y,zLeft-2,right,y,zRight-2);
  const quad=(a:number,b:number,c:number,d:number)=>indices.push(a,b,c,a,c,d);
  for(let i=0;i<rows.length-1;i++){
    const a=i*4,b=a+4;quad(a,a+1,b+1,b);quad(a+3,a+2,b+2,b+3);quad(a+2,a,b,b+2);quad(a+1,a+3,b+3,b+1);
  }
  quad(2,3,1,0);const t=(rows.length-1)*4;quad(t,t+1,t+3,t+2);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setIndex(indices);geometry.computeVertexNormals();shared.add(geometry);return geometry;
}
const jerkin=fittedPanel([[43,2,14,17,11],[54,2,18,19.5,12],[65,4,19,18.5,10],[74,9,15,13,8]]);
const apron=fittedPanel([[18,-17,17,21,21],[30,-20,20,22,22],[52,-18,18,22,22],[69,-10,10,18,18]]);
function skirt(short:boolean):T.BufferGeometry {
  const rows=[[short?21:7,25,21],[short?28:18,23,19],[39,19,16],[50,17,14]],pos:number[]=[],indices:number[]=[],sides=16;
  for(let j=0;j<rows.length;j++)for(let i=0;i<sides;i++){
    const angle=i/sides*Math.PI*2,[y,rx,rz]=rows[j],fold=i%2?.95:1;
    pos.push(Math.sin(angle)*rx*fold,y+(j===0?Math.max(0,Math.cos(angle))**6*8:0),Math.cos(angle)*rz*fold);
    if(j<rows.length-1){const a=j*sides+i,b=j*sides+(i+1)%sides;indices.push(a,b,b+sides,a,b+sides,a+sides);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setIndex(indices);geometry.computeVertexNormals();shared.add(geometry);return geometry;
}
const shortCoat=skirt(true),longRobe=skirt(false);
/** Replace bead-like torsos with broad shoulders / tapered waist, preserving joints. */
export function sculptCreature(body:T.Group,shape:CreatureShape):void {
  const humanoid=['goblin','rogue','cultist','knight','smith','ogre','imp','gargoyle','harpy'].includes(shape);
  if(humanoid)for(const child of body.children)if(child instanceof T.Mesh&&child.position.x===0&&child.position.y===53){child.geometry=torso;child.userData.sharedCreatureArt=true;}
  if(humanoid)body.traverse(child=>{
    if(!(child instanceof T.Mesh))return;
    // Hood/helmet silhouettes are fitted to the original inner skull. Enlarging
    // that hidden mesh pokes small skin triangles through the forehead cloth.
    if(!['rogue','cultist','knight'].includes(shape)&&child.position.x===0&&child.position.y===89&&child.position.z===1)child.geometry=humanoidHead;
    if(child.parent?.name==='creature-knee'&&child.position.y===-16&&child.position.z===4&&shape!=='harpy')child.geometry=boot;
  });
  if(['boar','jackal','cat','hound','salamander','drake','wyvern','dragon','ram'].includes(shape)){
    const y=shape==='salamander'?20:35;
    for(const child of body.children)if(child instanceof T.Mesh&&child.position.x===0){
      if(child.position.y===y&&child.position.z===0)child.geometry=haunch;
      if(child.position.y===y+9&&child.position.z===30)child.geometry=skull;
      if(['salamander','drake','wyvern','dragon'].includes(shape)&&child.position.y===y+1&&child.position.z===47)child.geometry=reptileSnout;
    }
  }
}

export const CREATURE_PALETTES:Record<string,[number,number]>={
  goblin:[0x789e4e,0x887253],slime:[0x75a7a4,0xb4d9b6],boar:[0x7e5a46,0x4e4340],mushroom:[0x796549,0xb95d4f],beetle:[0x536c64,0x899d6a],
  'dust-jackal':[0xb3916a,0x6b5645],sandling:[0xa58d6a,0xe0c798],'sun-scorpion':[0x785843,0xb29864],'ruin-gargoyle':[0x858279,0xb4ac93],emberling:[0x473a3b,0xffa653],
  'shadow-bandit':[0x414755,0x8b7881],'venom-spider':[0x41434b,0x848d63],'cliff-stalker':[0x4e4b5b,0x8890a4],'dusk-wisp':[0x666183,0xba9be0],
  'cave-bat':[0x68657b,0x95747d],'cliff-ram':[0xa7a58b,0x777c73],'dust-vulture':[0x8a6e55,0xb6a483],
  'fire-imp':[0xa06049,0xd4ad75],'magma-hound':[0x514346,0xdc8858],'obsidian-beetle':[0x383f4c,0x797082],'cinder-cultist':[0x51454f,0xbd8b5f],
  harpy:[0x617677,0xcbc5a1],'stone-elemental':[0x858a78,0xc9c9a3],'mountain-cat':[0xa0a894,0x53615c],'gale-spirit':[0x91aeac,0xd3e2c5],
  salamander:[0x615759,0xdb9671],'ash-cultist':[0x66767a,0xc5bba4],'ravine-scorpion':[0x755b60,0xb9a28a],'crystal-wisp':[0x699398,0xbce4cd],'ember-drake':[0x866854,0xddb887],
  'canyon-raider':[0x87684e,0xc9b289],'badland-jackal':[0x9b795e,0x55473d],'sand-worm':[0xab8b64,0xd5bd90],'scrap-golem':[0x6e6962,0xba8860],
  'fire-cultist':[0x6e4246,0xd4a666],drake:[0x854e43,0xd3a874],wyvern:[0x695664,0xb69484],'magma-serpent':[0x594b50,0xe4a268],'dragon-guard':[0x505464,0xc8a56e],
  'moss-ogre':[0x777658,0x818c66],'crystal-boar':[0x756675,0x94c4c6],'root-colossus':[0x6b5139,0x799e55],
  'ash-matriarch':[0x736052,0xb19667],'prism-golem':[0x628a9e,0x8edce8],'sun-tyrant':[0x8d7856,0xc8a766],
  'night-stalker':[0x484655,0x797789],'venom-matriarch':[0x414449,0x899165],'pass-warden':[0x515d6a,0x9b9c98],
  'cinder-smith':[0x655149,0x93724e],'obsidian-beast':[0x4b414a,0xae7658],'lava-golem':[0x3a3033,0xff893b],
  'storm-harpy':[0x657a8b,0xb7c9cc],'stone-giant':[0x727a6d,0xb4b79a],'sky-lord':[0xa7bbb0,0xe6d6aa],
  'elder-salamander':[0x6d5a54,0xcf9871],'crystal-priest':[0x596d73,0xb3c6bb],'ash-serpent':[0x777572,0xb1a48a],
  'raider-king':[0x74634f,0xb79d70],'great-sand-worm':[0x9b7852,0xd0b080],'canyon-lord':[0x937757,0xc9af83],
  'ancient-wyvern':[0x6c5969,0xbba185],'magma-serpent-lord':[0x57464a,0xcb9468],'fire-dragon':[0x783331,0xe26c3c],
};

/** Large forms and layered surfaces are attached to the existing animated joints. */
export function finishCreature(id:string,shape:CreatureShape,body:T.Group,arms:T.Group[],legs:T.Group[],wings:T.Group[],primary:number,accent:number,boss:boolean,elite:boolean):void {
  sculptCreature(body,shape);
  refineCreatureAnatomy(body,shape,arms,legs,wings,primary,accent);
  const beast=['boar','jackal','cat','hound','salamander','drake','wyvern','dragon','ram'].includes(shape);
  if(['goblin','rogue','knight','smith','ogre','cultist'].includes(shape)){
    // Straps, overlapping torso plates, cuffs and a readable silhouette at game scale.
    const chest=shape==='knight'?steel:shape==='rogue'?new T.Color(primary).multiplyScalar(.72).getHex():shape==='cultist'?primary:leather;
    for(const s of [-1,1]){
      const a=arms[s===-1?0:1];if(a){
        add(a,plate,shape==='ogre'?0x788a61:chest,0,0,0,shape==='ogre'?16:shape==='goblin'?9:11,shape==='goblin'?6.5:9,shape==='goblin'?9:12);
        const cuff=box(a,chest,s*3,-23,3,shape==='ogre'?23:15,10,15);
        cuff.geometry.computeBoundingBox();cuff.updateMatrix();
        const cuffBounds=cuff.geometry.boundingBox!.clone().applyMatrix4(cuff.matrix);
        a.userData.forearmCuffBounds=[cuffBounds.min.toArray(),cuffBounds.max.toArray()];
        for(let n=0;n<2;n++)add(a,softOrb,gold,s*3+(n-.5)*7,-23,11,1.8);
      }
      const l=legs[s===-1?0:1];if(l)box(l,chest,0,-14,7,12,12,6);
      if(shape!=='knight'&&shape!=='smith'){
        add(body,jerkin,shape==='cultist'?primary:chest,0,0,0,s,1,1);
        // Narrow seams and small rivets keep clothing fitted to the torso.
        horn(body,shape==='cultist'?accent:0xa38259,[[s*3,44,18],[s*3,55,20],[s*5,65,19],[s*9,73,14]],.65);
        if(shape!=='cultist')for(let n=0;n<3;n++)add(body,softOrb,gold,s*5,48+n*8,20,1.1,1.1,.6);
      }
    }
    box(body,gold,0,37,16,11,9,4);box(body,dark,0,37,19,5,4,1);
    if(shape==='goblin'){
      box(body,leather,0,75,-14,28,18,7);
      for(let n=0;n<3;n++)feather(body,0x8c9c75,-10+n*7,80,-19,8,-.5);
      box(body,ivory,0,58,19,7,9,2);
    }
    if(shape==='cultist'||shape==='rogue'){
      add(body,shape==='rogue'?shortCoat:longRobe,primary,0,0,0,1);
      gem(body,accent,0,68,19,3,5,2);add(body,softOrb,dark,0,84,18,13,6,5);
      for(let n=0;n<3;n++)box(body,ivory,-11+n*11,39,16,3,6,3);
    }
    if(shape==='knight'){
      for(let n=0;n<3;n++)box(body,n%2?steel:accent,0,61-n*9,18,31-n*3,8,7);
      const visor=box(body,steel,0,85,20,27,10,5);for(let n=0;n<4;n++)box(body,dark,-9+n*6,85,23,2,7,1);
      visor.rotation.x=.1;ring(body,gold,10,1.5,-31,45,14).userData.creatureShield=true;
    }
  }
  if(beast){
    const reptile=['salamander','drake','wyvern','dragon'].includes(shape),low=shape==='salamander',y=low?20:35;
    // Defined nose, cheek planes, lower jaw, eyebrow ridge, and curved tusks.
    headParts(body,()=>{
    if(reptile){for(const s of [-1,1])box(body,dark,s*6,y+3,64,3,2,2);}
    else if(shape!=='boar'&&shape!=='ram')add(body,plate,dark,0,y+4,shape==='cat'?49:64,shape==='cat'?5:8,shape==='cat'?2.5:3.5,2);
    add(body,plate,ivory,0,y-4,46,12,5,15);
    for(const s of [-1,1]){
      const eye=body.children.find(o=>o.userData.faceEye===s);
      if(eye){const brow=box(eye,primary,0,4,0,10,3,5);brow.rotation.z=s*.22;}
      if(shape==='boar'&&id!=='crystal-boar')horn(body,ivory,[[s*16,y-2,51],[s*28,y+7,62],[s*24,y+26,57]],5);
      else if(reptile&&id!=='fire-dragon'&&id!=='ancient-wyvern')horn(body,ivory,[[s*13,y+23,24],[s*22,y+38,10],[s*19,y+43,-5]],5);
    }
    });
    if(!reptile&&shape!=='boar')for(const s of [-1,1])for(let n=0;n<3;n++)add(body,plate,accent,s*(20+n),y+8-n*5,23-n*7,6,9,8).rotation.z=s*.5;
    if(reptile)for(let row=0;row<4;row++)for(const s of [-1,0,1]){
      const tile=add(body,plate,row%2?accent:primary,s*16,y+18-Math.abs(s)*5,-23+row*14,12,5,11);tile.rotation.z=s*.28;
    }
    else if(shape==='boar'||shape==='hound')for(let n=0;n<4;n++)add(body,plate,primary,0,y+21,-25+n*12,6,5,8).rotation.x=-.3;
    if(shape!=='boar'&&shape!=='ram')legs.forEach(l=>{for(let n=0;n<3;n++)add(l,cone,ivory,(n-1)*4,-25,18,1.5,5,2).rotation.x=Math.PI*.5;});
  }
  if(['scorpion','spider','beetle'].includes(shape)){
    for(let n=0;n<(shape==='scorpion'?4:0);n++){
      const shell=add(body,plate,n%2?primary:accent,0,39,-32+n*13,25-n,7,12);shell.rotation.x=.09;
      for(const s of [-1,1])add(body,cone,accent,s*(24-n),32,-30+n*13,3,10,4).rotation.z=-s*.8;
    }
    if(shape==='spider'){
      gem(body,accent,0,46,-15,9,2,12);
      // The fitted skin owns the eyes; old front gems overlapped the new iris
      // and read as extra, detached white eyes during the wind-up.
      for(const s of [-1,1])if(id!=='venom-matriarch')horn(body,ivory,[[s*14,19,40],[s*18,12,50],[s*9,10,56]],3.5);
    }
  }
  if(shape==='mushroom'){
    ring(body,ivory,29,2,0,56,0,Math.PI/2);
    for(let n=0;n<12;n++){const a=n/12*Math.PI*2;horn(body,0xb8a780,[[Math.cos(a)*12,46,Math.sin(a)*12],[Math.cos(a)*29,55,Math.sin(a)*29],[Math.cos(a)*37,58,Math.sin(a)*37]],1);}
    for(let n=0;n<8;n++){const a=n*2.4,r=14+n%3*7;add(body,softOrb,ivory,Math.cos(a)*r,63+21*Math.sqrt(1-(r/39)**2)+1,Math.sin(a)*r,5+n%2*2,2,4);}
    for(const s of [-1,1])horn(body,0x927a58,[[s*13,26,0],[s*26,19,10],[s*25,12,14]],4);
  }
  if(shape==='slime'){
    const glaze=add(body,softOrb,0xd0ebcc,-10,35,15,6,2,3);glaze.rotation.z=-.45;
    for(const s of [-1,1])add(body,softOrb,primary,s*22,4.5,11,12,3.5,12);
    box(body,0x355854,0,20,27,9,2,1);gem(body,0xe4d6a3,3,11,20,3,4,3);
  }
  if(['golem','sand','scrap','treant'].includes(shape)){
    for(const s of [-1,1]){
      for(let n=0;n<3;n++)add(body,plate,id==='lava-golem'?(n%2?0x433840:0x55434b):n%2?primary:accent,s*(17+n*6),93-n*14,15,14,8,11).rotation.z=s*.3;
      const a=arms[s===-1?0:1];if(a)for(let n=0;n<3;n++)box(a,primary,s*(2+n*7),-51,13,7,13,9);
    }
    if(shape==='scrap'){
      ring(body,gold,12,3,0,64,26);box(body,dark,0,106,19,26,10,4);
      for(let n=0;n<4;n++)box(body,steel,-15+n*10,46,20,6,15,5);
    }
  }
  if(shape==='harpy'||shape==='owl'){
    headParts(body,()=>{for(let n=0;n<7;n++)feather(body,n%2?primary:accent,(n-3)*5,(shape==='owl'?79:102)+Math.abs(n-3)*2,-6,shape==='owl'?9:16,(n-3)*-.16);});
    for(let n=0;n<5;n++)feather(body,ivory,(n-2)*6,shape==='owl'?39:54,17,shape==='owl'?9:13,(n-2)*.1);
    wings.forEach(w=>{for(let n=0;n<6;n++)feather(w,n%2?ivory:accent,18+n*7,-4+n*1.1,-12-n*2.6,18-n*.7,-.65);});
  }
  if(shape==='serpent'||shape==='worm'){
    for(let n=0;n<8;n++)for(const s of [-1,1])add(body,plate,n%2?primary:accent,Math.sin(n*.62)*19+s*15,25,32-n*14,7,5,10).userData.creatureSegment=n;
    if(shape==='serpent')headParts(body,()=>{for(const s of [-1,1])horn(body,ivory,[[s*16,49,50],[s*20,39,67],[s*12,37,70]],4);});
  }
  if(shape==='imp'||shape==='gargoyle')for(const s of [-1,1]){
    horn(body,shape==='imp'?ivory:accent,[[s*13,99,0],[s*25,118,-4],[s*20,131,-8]],5);
    add(body,plate,accent,s*17,61,9,12,13,8);
  }
  if(shape==='wisp'||shape==='flame'){
    const c=id==='gale-spirit'?ivory:id==='crystal-wisp'?0xadded1:id==='dusk-wisp'?0xb1a0d2:0xeab57b;
    if(shape==='wisp'){
      ring(body,c,25,1.4,0,34,0,Math.PI/2);
      for(let n=0;n<3;n++){const a=-n*Math.PI/2;gem(body,c,Math.cos(a)*24,44+n*4,Math.sin(a)*24,4,9,4);}
    }
    else for(let n=0;n<5;n++){const a=n/5*Math.PI*2;add(body,plate,0x52484a,Math.cos(a)*20,18,Math.sin(a)*20,9,9,9);}
  }
  // Veteran anatomy and equipment are authored per family in CreatureSculpt.
  void elite;
  if(boss)finishBoss(id,body,arms,wings);
}

/** Every boss has an explicit design rather than a scaled ordinary creature. */
function finishBoss(id:string,b:T.Group,arms:T.Group[],wings:T.Group[]):void {
  const before=new Set(b.children);
  const crest=(c:number,y:number,spread:number,count:number,h:number)=>{for(let n=0;n<count;n++)feather(b,c,(n-(count-1)/2)*spread,y+Math.abs(n-(count-1)/2)*2,-5,h,(n-(count-1)/2)*-.16);};
  switch(id){
    case 'moss-ogre':
      b.scale.set(1.15,1,1.1);
      for(let n=0;n<5;n++){
        const moss=add(b,plate,0x6c885c,-36+n%2*4,76+n%3*2,-6+n*3,9,6,8);
        moss.userData.creatureShoulder=0;
      }
      headParts(b,()=>{for(const s of [-1,1])horn(b,ivory,[[s*12,81,22],[s*17,89,25],[s*15,96,23]],3);});break;
    case 'crystal-boar':
      for(let n=0;n<5;n++)for(const s of [-1,1]){const g=gem(b,0x91cbd0,s*(9+n%2*6),58,-28+n*13,8,18+n%3*5,8);g.rotation.z=s*.3;}
      headParts(b,()=>{for(const s of [-1,1])horn(b,ivory,[[s*18,30,55],[s*34,40,65],[s*28,65,58]],6);});break;
    case 'root-colossus':
      b.scale.set(1.1,1.15,1);for(const s of [-1,1]){
        horn(b,0x66523d,[[s*12,85,-10],[s*32,145,-20],[s*57,173,-3],[s*70,181,10]],9);
        for(let n=0;n<4;n++)add(b,plate,0x6b8859,s*(23+n*11),155+n%2*13,-15+n*7,24,13,24);
        horn(b,0x4f422f,[[s*19,35,12],[s*33,8,30],[s*53,0,42]],7);
      }ring(b,0xa0c98a,12,3,0,65,28);gem(b,0xc9e4a6,0,65,30,7,11,4);break;
    case 'ash-matriarch':
      b.scale.set(1.22,1,1.12);
      crest(0xba865a,53,9,5,17);break;
    case 'prism-golem':
      b.scale.set(.92,1.1,.9);for(const s of [-1,1])for(let n=0;n<3;n++)gem(b,0x91c7d5,s*(25+n*12),94+n*11,-4,10,24-n*3,12);
      ring(b,gold,19,2,0,67,29);gem(b,0xdaeff0,0,67,31,11,19,9);break;
    case 'sun-tyrant':
      ring(b,gold,32,3,0,107,-14);for(let n=0;n<12;n++){const ang=n/12*Math.PI*2;const m=add(b,cone,gold,Math.cos(ang)*36,107+Math.sin(ang)*36,-14,4,16,3);m.rotation.z=ang-Math.PI/2;}
      box(b,gold,-31,44,15,26,35,3).userData.creatureShield=true;gem(b,0xf4d498,-31,47,19,8,11,3).userData.creatureShield=true;break;
    case 'night-stalker':
      b.scale.set(.88,1.04,1.22);for(let n=0;n<9;n++){const ang=n/9*Math.PI*2;add(b,crystal,0x595675,Math.cos(ang)*27,48+Math.sin(ang)*20,22,7,18,8).rotation.z=ang;}
      headParts(b,()=>{for(const s of [-1,1])horn(b,ivory,[[s*8,34,47],[s*12,24,55],[s*9,18,54]],3);});break;
    case 'venom-matriarch':
      b.scale.set(1.06,1.14,1.25);for(const s of [-1,1])for(let n=0;n<3;n++)gem(b,0xb3c47a,s*(7+n*6),45,-17-n*9,5,5,7);
      for(const s of [-1,1])horn(b,ivory,[[s*16,17,40],[s*23,7,54],[s*12,6,63]],5);break;
    case 'pass-warden':
      b.scale.set(1.18,1.05,1.1);for(const s of [-1,1]){add(b,plate,0x77838f,s*29,77,1,22,15,19);horn(b,ivory,[[s*15,109,0],[s*30,120,-4],[s*39,112,-5]],5);}
      box(b,0x536272,-31,41,17,34,53,8).userData.creatureShield=true;box(b,ivory,-31,41,22,4,40,2).userData.creatureShield=true;break;
    case 'cinder-smith':
      // The connected face paints fitted goggles in its head's bind frame.
      b.scale.set(1.18,1.08,1.1);
      add(b,apron,0x8b6047,0,0,0,1);
      for(const s of [-1,1])horn(b,leather,[[s*9,68,16],[s*14,75,6],[s*13,71,-10]],2.5);
      for(let n=0;n<3;n++){box(b,dark,-10+n*10,28,23,6,12,2);box(b,steel,-10+n*10,31,25,3,10,2);}
      {const hammer=arms[1]?.getObjectByName('weapon-hammer') as T.Group|undefined;if(hammer)gem(hammer,0xfca04d,0,53,14,7,6,2);}break;
    case 'obsidian-beast':
      b.scale.set(1.16,1.12,1.1);for(let n=0;n<5;n++)for(const s of [-1,1])add(b,crystal,0x4c475d,s*18,59,-25+n*15,11,21-n%2*5,11).rotation.z=s*.4;
      headParts(b,()=>{gem(b,0xf5984e,0,46,40,8,6,3);});break;
    case 'lava-golem':
      b.scale.set(1.26,.94,1.14);for(const s of [-1,1]){const a=arms[s===-1?0:1];if(a)add(a,plate,0x352f38,0,-5,0,26,23,24);}
      // Angular split furnace plates read as broken basalt, instead of a round medallion.
      gem(b,0xffb85a,0,67,32,13,18,6);
      for(const s of [-1,1]){
        const rim=add(b,plate,0x433943,s*14,70,33,8,24,8);rim.rotation.z=-s*.24;
        gem(b,0xf58b43,s*25,79,17,4,17,3);
        const brow=box(b,0x332e38,s*9,117,17,17,7,8);brow.rotation.z=s*.17;
        gem(b,0xffc36a,s*9,111,20,5,2,2);
        horn(b,0x51424a,[[s*15,121,-1],[s*23,137,-8],[s*20,143,-15]],6);
      }
      add(b,plate,0x40343e,0,48,30,17,7,9);break;
    case 'storm-harpy':
      b.scale.set(.94,1.03,1);crest(0x6b879a,120,7,7,22);wings.forEach(w=>w.scale.multiplyScalar(1.18));
      for(const s of [-1,1])horn(b,0xc9d8d0,[[s*13,87,4],[s*24,114,-10],[s*36,130,-20]],4);break;
    case 'stone-giant':
      b.scale.set(1.22,1.12,.94);for(const s of [-1,1]){box(b,0x8b9381,s*34,94,-2,30,47,34);box(b,0xc3c6a4,s*34,111,4,30,8,29);}
      for(let n=0;n<4;n++)box(b,0xaeb798,-21+n*14,63,27,5,25,3);break;
    case 'sky-lord':
      b.scale.set(.92,1.2,1);crest(ivory,129,7,9,25);ring(b,gold,29,2,0,117,-16);wings.forEach(w=>w.scale.multiplyScalar(1.36));
      for(let n=0;n<7;n++)feather(b,n%2?ivory:gold,(n-3)*7,20,-19,30,(n-3)*.09);break;
    case 'elder-salamander':
      b.scale.set(1.18,.94,1.24);for(let n=0;n<5;n++)for(const s of [-1,1])horn(b,0xd99969,[[s*14,31,-21+n*13],[s*27,51,-25+n*13],[s*30,58,-29+n*13]],4);
      crest(0xf4bb74,55,8,5,15);break;
    case 'crystal-priest':
      b.scale.set(.87,1.2,.94);for(const s of [-1,1])for(let n=0;n<3;n++)gem(b,0x98cfd0,s*(18+n*10),81+n*12,-4,6,19,8);
      ring(b,gold,25,2,0,116,-12);gem(b,0xcbe4d3,0,118,2,9,22,8);break;
    case 'ash-serpent':
      b.scale.set(1.14,1.05,1.25);for(const s of [-1,1])for(let n=0;n<4;n++)feather(b,0x969282,s*(21+n*5),49,30-n*7,21-n*2,s*.5);
      headParts(b,()=>{gem(b,0xe2bd84,0,63,41,7,3,8);});break;
    case 'raider-king':
      b.scale.set(1.12,1.1,1);box(b,0x50453c,0,100,-14,41,24,15);crest(0xcbb88b,114,5,5,12);
      for(const s of [-1,1])add(b,plate,0xb7a27c,s*24,74,1,17,12,16);gem(b,0xca9876,0,70,21,5,8,3);break;
    case 'great-sand-worm':
      b.scale.set(1.2,1.14,1.3);headParts(b,()=>{ring(b,dark,25,7,0,37,48);for(let n=0;n<12;n++){const angle=n/12*Math.PI*2;horn(b,ivory,[[Math.cos(angle)*24,37+Math.sin(angle)*24,54],[Math.cos(angle)*15,37+Math.sin(angle)*15,63],[Math.cos(angle)*9,37+Math.sin(angle)*9,63]],3);}});
      for(let n=0;n<6;n++)add(b,plate,0xcbb18a,Math.sin(n*.62)*19,37,25-n*14,26-n,8,14).userData.creatureSegment=n;break;
    case 'canyon-lord':
      b.scale.set(1.3,.88,1.1);for(const s of [-1,1])for(let n=0;n<3;n++)box(b,n%2?0xb68a5b:0x927451,s*(31+n*6),91+n*17,-5,29,15,29);
      box(b,0x6d5745,0,105,19,31,15,8);gem(b,0xe9c991,0,108,25,10,3,2);break;
    case 'ancient-wyvern':
      b.scale.set(.87,1.16,1.25);wings.forEach(w=>w.scale.multiplyScalar(1.26));headParts(b,()=>{for(const s of [-1,1])horn(b,ivory,[[s*13,57,27],[s*24,85,7],[s*20,91,-23]],6);});
      for(let n=0;n<4;n++)gem(b,0xd6ad85,0,59,-29+n*15,5,15,7);break;
    case 'magma-serpent-lord':
      b.scale.set(1.35,1.16,1.18);for(const s of [-1,1])for(let n=0;n<5;n++)horn(b,ivory,[[s*15,45,30-n*5],[s*(35+n*3),67-n*3,18-n*8],[s*(38+n*3),73-n*3,8-n*10]],4);
      headParts(b,()=>{gem(b,0xffb975,0,61,41,9,6,10);});break;
    case 'fire-dragon':
      b.scale.set(1.18,1.2,1.28);wings.forEach(w=>w.scale.multiplyScalar(1.3));for(const s of [-1,1]){
        headParts(b,()=>{horn(b,ivory,[[s*13,63,28],[s*24,93,10],[s*19,100,-16]],7);});
        for(let n=0;n<4;n++)add(b,plate,n%2?0x473139:0x342c32,s*17,55,-21+n*14,13,6,12);
      }
      // Ember ridges stay attached to the torso; the head remains a separate rig.
      for(let n=0;n<5;n++)gem(b,n%2?0xffa34b:0xee6328,0,59,-28+n*12,3.3,10,5);
      headParts(b,()=>{for(const s of [-1,1])add(b,plate,0x473139,s*20,38,35,6,7,10);});
      break;
    default:throw new Error('Unspecified boss art: '+id);
  }
  b.userData.bossDesign=id;
  for(const part of b.children)if(!before.has(part))part.userData.bossOrnament=true;
}

export function sharedCreatureGeometry(geometry:T.BufferGeometry):boolean{return shared.has(geometry);}
