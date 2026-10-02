import * as T from 'three';
import { softOrb, softBox } from './ArtMaterials';
import type { CreatureShape } from './CreatureCatalog';
import { headParts } from './CreatureMotion';

const shared=new Set<T.BufferGeometry>([softOrb,softBox]);
const materials=new Map<number,T.MeshStandardMaterial>();
const facet=new T.IcosahedronGeometry(1,0);shared.add(facet);
function pigment(color:number):T.MeshStandardMaterial {
  let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.78});materials.set(color,m);}return m;
}
function add(g:T.Object3D,geo:T.BufferGeometry,c:number,x:number,y:number,z:number,sx:number,sy=sx,sz=sx):T.Mesh {
  const m=new T.Mesh(geo,pigment(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;
  m.userData.artOwnedGeometry=!shared.has(geo);g.add(m);return m;
}
/** Closed twelve-sided cross sections, along a creature's forward axis. */
function profile(rows:number[][],vertical=false):T.BufferGeometry {
  const positions:number[]=[],indices:number[]=[],sides=12;
  for(let j=0;j<rows.length;j++)for(let n=0;n<sides;n++){
    const [z,rx,ry,cy]=rows[j],a=n/sides*Math.PI*2;
    const p=[Math.cos(a)*rx,Math.sin(a)*ry+cy,z];positions.push(...(vertical?[p[0],p[2],-p[1]]:p));
    if(j<rows.length-1){const i=j*sides+n,k=j*sides+(n+1)%sides;indices.push(i,k,k+sides,i,k+sides,i+sides);}
  }
  for(const j of [0,rows.length-1]){
    const i=positions.length/3,[z,,,cy]=rows[j];positions.push(...(vertical?[0,z,-cy]:[0,cy,z]));
    for(let n=0;n<sides;n++){const a=j*sides+n,b=j*sides+(n+1)%sides;indices.push(...(j===0?[i,b,a]:[i,a,b]));}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();shared.add(geo);return geo;
}
const bodies:Partial<Record<CreatureShape,T.BufferGeometry>>={
  boar:profile([[-1,.55,.63,0],[-.7,.9,.86,.05],[-.2,1,1,.1],[.4,1.04,.94,.15],[.8,.72,.7,.1],[1,.4,.48,0]]),
  ram:profile([[-1,.5,.64,0],[-.65,.9,1,.08],[0,1,1.05,.1],[.6,.9,.92,.15],[1,.42,.6,.1]]),
  jackal:profile([[-1,.35,.6,.05],[-.7,.68,.82,.02],[-.2,.54,.63,.05],[.35,.78,1,.13],[.75,.7,.85,.15],[1,.3,.5,.1]]),
  cat:profile([[-1,.35,.65,0],[-.65,.87,.82,0],[0,.7,.7,0],[.5,.86,.91,.1],[1,.38,.5,.08]]),
  hound:profile([[-1,.44,.59,0],[-.65,.75,.8,0],[-.15,.68,.69,.05],[.4,1.04,1.06,.1],[.8,.86,.9,.12],[1,.38,.58,.08]]),
  salamander:profile([[-1,.4,.6,0],[-.65,.92,.9,0],[0,1,1,0],[.65,.83,.82,.04],[1,.46,.55,0]]),
  drake:profile([[-1,.42,.62,0],[-.6,.82,.85,.06],[0,1,1,.05],[.6,.9,.88,.1],[1,.42,.55,0]]),
  wyvern:profile([[-1,.35,.5,0],[-.55,.67,.86,.05],[0,.76,1.04,.15],[.6,.64,.9,.17],[1,.3,.6,.06]]),
  dragon:profile([[-1,.46,.62,0],[-.65,.92,.9,.05],[0,1.05,1.1,.1],[.65,.95,1.06,.14],[1,.46,.62,.08]]),
  beetle:profile([[-1,.4,.45,0],[-.75,.85,.8,0],[-.1,1,1,.08],[.6,.82,.86,.12],[1,.4,.5,.06]]),
  spider:profile([[-1,.38,.45,0],[-.65,.93,.85,.06],[-.1,1,1,.08],[.55,.74,.78,.02],[1,.35,.46,0]]),
  scorpion:profile([[-1,.48,.45,0],[-.6,.75,.75,0],[0,1,.88,.04],[.7,.9,.77,0],[1,.55,.4,0]]),
};
const mammalSkull=profile([[-1,.48,.6,.05],[-.65,.86,.95,.06],[0,1,1,.02],[.55,.88,.7,-.08],[1,.61,.45,-.25]]);
const catSkull=profile([[-1,.42,.55,0],[-.6,.82,.9,.08],[0,1,1,.05],[.5,.85,.7,-.13],[1,.49,.43,-.22]]);
const reptileSkull=profile([[-1,.43,.5,0],[-.65,.78,.83,.1],[-.1,1,.85,.03],[.5,.94,.62,-.17],[1,.73,.35,-.25]]);
const broadMuzzle=profile([[-1,.6,.63,.05],[-.35,.9,.84,0],[.45,1,.7,-.04],[1,.93,.56,-.1]]);
const narrowMuzzle=profile([[-1,.84,.8,0],[-.35,.76,.76,-.05],[.5,.54,.53,-.1],[1,.44,.45,-.17]]);
const reptileMuzzle=profile([[-1,.79,.65,0],[-.45,1,.7,0],[.4,.94,.53,-.05],[1,.8,.38,-.12]]);
const hood=profile([[-1,.48,.5,0],[-.65,.87,.7,-.06],[0,1,.94,-.06],[.7,.83,.76,-.07],[1,.31,.38,-.08]],true);
const giantTorso=profile([[-1,.5,.7,0],[-.65,.77,.9,0],[0,1,1,0],[.65,.96,.8,0],[1,.55,.6,0]],true);
const trunk=profile([[-1,.83,.82,0],[-.7,1,1,0],[-.2,.7,.8,0],[.5,.76,.84,0],[1,.58,.62,0]],true);
const cap=profile([[-1,.61,.63,0],[-.83,.93,.88,0],[-.48,1,1,0],[.02,.96,.92,0],[.53,.73,.69,0],[.87,.38,.36,0],[1,.03,.03,0]],true);
const slime=profile([[-1,.75,.76,0],[-.87,1.08,1,0],[-.48,1.02,.98,0],[.02,.94,.96,0],[.58,.72,.73,0],[.91,.3,.31,0],[1,.03,.03,0]],true);
const stem=profile([[-1,.83,.82,0],[-.7,1,1,0],[.05,.83,.83,0],[.7,.62,.67,0],[1,.57,.61,0]],true);
const segment=profile([[-1,.63,.64,0],[-.55,.99,.96,0],[.25,1,1,0],[.75,.83,.8,0],[1,.65,.66,0]]);
const flameTongue=profile([[-1,.58,.6,0],[-.45,.93,.87,0],[0,.8,.7,.08],[.5,.43,.41,.2],[1,.02,.03,.38]],true);
const helmet=profile([[-1,.58,.65,0],[-.7,.83,.87,0],[.15,1,1,0],[.7,.79,.79,0],[1,.25,.35,0]],true);
const heater=(()=>{
  const shape=new T.Shape();shape.moveTo(-.5,.5);shape.lineTo(.5,.5);shape.lineTo(.45,-.15);shape.lineTo(0,-.62);shape.lineTo(-.45,-.15);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:true,bevelSize:.045,bevelThickness:.05,bevelSegments:1});geometry.translate(0,0,-.5);shared.add(geometry);return geometry;
})();
const crystal=new T.OctahedronGeometry(1,0);shared.add(crystal);

/** A closed leaf, with inset ear cartilage; no detached cone or floating tip. */
export function creatureEar(g:T.Object3D,c:number,inset:number,x:number,y:number,z:number,width:number,height:number,side:number,lean=0):void {
  const shape=new T.Shape();shape.moveTo(-.65,-.45);shape.lineTo(-.7,.1);shape.lineTo(0,1);shape.lineTo(.58,.22);shape.lineTo(.64,-.45);shape.lineTo(0,-.62);shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.13,bevelThickness:.12});
  geo.translate(0,0,-.1);const ear=add(g,geo,c,x,y,z,width,height,width*.7);ear.name='creature-ear';ear.rotation.z=side*lean;ear.userData.creatureHead=true;
  const inner=add(ear,facet,inset,0,.1,.27,.36,.62,.035);inner.castShadow=false;
}

/** Authored silhouettes and species anatomy, using the existing combat joints. */
export function refineCreatureAnatomy(body:T.Group,shape:CreatureShape,arms:T.Group[],legs:T.Group[],wings:T.Group[],primary:number,accent:number):void {
  const beast=!!bodies[shape]&&!['beetle','spider','scorpion'].includes(shape),y=shape==='salamander'?20:35;
  for(const child of body.children)if(child instanceof T.Mesh){
    if(bodies[shape]&&child.position.x===0&&child.position.z===(beast?0:-14)&&child.position.y===(beast?y:26))child.geometry=bodies[shape]!;
    if(beast&&child.position.x===0&&child.position.y===y+9&&child.position.z===30)child.geometry=['salamander','drake','wyvern','dragon'].includes(shape)?reptileSkull:shape==='cat'?catSkull:mammalSkull;
    if(beast&&child.position.x===0&&child.position.y===y+1&&[42,47].includes(child.position.z)){
      child.geometry=['salamander','drake','wyvern','dragon'].includes(shape)?reptileMuzzle:shape==='jackal'?narrowMuzzle:broadMuzzle;
      if(shape==='boar')child.scale.set(17,10,18);if(shape==='ram')child.scale.set(11,10,18);
    }
    if(['rogue','cultist'].includes(shape)&&child.position.y===94&&child.position.z===-3)child.geometry=hood;
    if(shape==='knight'&&child.position.y===93&&child.position.z===0)child.geometry=helmet;
    if(shape==='knight'&&child.userData.creatureShield)child.geometry=heater;
    if(shape==='scrap'&&child.position.y===107&&child.position.z===0)child.geometry=helmet;
    if(shape==='serpent'&&child.position.y===45&&child.position.z===42)child.geometry=reptileSkull;
    if(['golem','sand'].includes(shape)&&child.position.y===60&&child.position.z===0)child.geometry=giantTorso;
    if(shape==='treant'&&child.position.y===60&&child.position.z===0)child.geometry=trunk;
    if(shape==='mushroom'&&child.position.y===63){child.geometry=cap;child.position.y=70;child.scale.y=19;}
    if(shape==='mushroom'&&child.position.y===30&&child.position.z===0){child.geometry=stem;child.scale.set(18,24,18);}
    if(shape==='slime'&&child.position.y===22){child.geometry=slime;child.scale.y=26;}
    if(shape==='slime'&&child.position.y===8)body.remove(child);
    if(shape==='wisp'&&child.position.y===45){child.geometry=crystal;child.scale.set(17,30,16);}
  }
  if(shape==='serpent'||shape==='worm')for(const group of body.children)if(group instanceof T.Group&&!group.userData.creatureHead)for(const child of group.children)if(child instanceof T.Mesh&&child.position.length()===0)child.geometry=segment;
  if(beast){
    headParts(body,()=>{
      if(['boar','ram','jackal','cat','hound'].includes(shape))for(const s of [-1,1]){
        const pointy=shape==='jackal'||shape==='cat';creatureEar(body,primary,shape==='cat'?0xc9a398:0xb08c78,s*(shape==='ram'?21:15),y+(pointy?25:22),24,pointy?8:10,pointy?13:8,s,pointy?-.12:-.65);
      }
      if(shape==='boar'){
        const nose=add(body,softOrb,0x9d7162,0,y+1,64,13,7,3);nose.userData.creatureHead=true;
        for(const s of [-1,1])add(body,softOrb,0x342e31,s*5,y+2,66,2.3,2,.8);
      }
      if(shape==='ram'){
        for(const s of [-1,1])add(body,facet,accent,s*15,y+8,38,7,12,9);
        add(body,facet,0xd9cfad,0,y-9,47,7,11,5);add(body,softOrb,0x484c43,0,y+1,64,7,3.5,2);
      }
      if(shape==='cat')for(const s of [-1,1])add(body,softOrb,0xd2c5a6,s*6,y,48,6,4,4);
      if(['salamander','drake','wyvern','dragon'].includes(shape))for(const s of [-1,1]){
        add(body,facet,primary,s*20,y+4,32,7,9,14);add(body,softOrb,accent,s*9,y+5,59,2.6,1.7,1.2);
      }
    });
    if(shape==='ram')for(let n=0;n<7;n++){const a=n*2.4;add(body,facet,n%2?primary:0xc4bca0,Math.cos(a)*22,y+10+Math.sin(a)*8,-16+n%3*12,10,9,13);}
    if(['drake','wyvern','dragon','salamander'].includes(shape))for(let n=0;n<4;n++)add(body,facet,accent,0,y-10,-15+n*12,13,3,8);
    legs.forEach(leg=>{
      if(shape==='boar'||shape==='ram'){
        for(const mesh of leg.children)if(mesh instanceof T.Mesh&&mesh.position.y===-24){mesh.geometry=softBox;mesh.scale.set(11,10,17);mesh.position.y=-23;}
        add(leg,softBox,0x252d30,0,-21,18,1,6,1);
      }else if(['cat','jackal','hound'].includes(shape))for(const s of [-1,0,1])add(leg,softOrb,primary,s*4,-25,17,3.3,3,4);
    });
  }
  if(['goblin','rogue','cultist','knight','ogre','smith','imp','gargoyle'].includes(shape)){
    if(shape==='rogue'||shape==='cultist'){
      for(const s of [-1,1]){const collar=add(body,facet,accent,s*10,73,9,9,4,8);collar.rotation.z=s*.35;}
      add(body,softBox,accent,0,45,17,5,31,2);
      for(let n=0;n<3;n++)add(body,facet,accent,0,58-n*6,19,2,2,.7);
    }
    if(shape==='smith')headParts(body,()=>{
      add(body,facet,0x62574a,0,77,19,14,10,6);
      for(const s of [-1,1])add(body,softOrb,0x9e7959,s*11,85,15,6,4,3);
    });
    if(shape==='ogre')headParts(body,()=>{
      for(const s of [-1,1]){creatureEar(body,primary,accent,s*22,91,0,11,10,s,-.8);add(body,facet,primary,s*13,85,15,8,6,5);}
    });
    if(shape==='knight'){
      add(body,facet,accent,0,65,23,5,7,2);
      for(const s of [-1,1]){add(body,facet,primary,s*13,73,9,12,5,9);add(body,softBox,accent,s*12,47,18,4,11,3);}
      arms.forEach(arm=>add(arm,facet,accent,0,-7,5,8,4,7));
    }
    if(shape==='imp'||shape==='gargoyle'){
      headParts(body,()=>{add(body,facet,accent,0,82,16,9,7,5);for(const s of [-1,1])creatureEar(body,primary,accent,s*16,91,0,7,8,s,-.5);});
      arms.forEach(arm=>{add(arm,facet,primary,0,-2,0,10,7,11);for(let n=0;n<3;n++)add(arm,facet,0xd7c6a4,(n-1)*3,-35,7,1.4,4,2);});
    }
  }
  if(shape==='treant')headParts(body,()=>{
    add(body,facet,primary,0,102,18,5,10,5);
    for(const s of [-1,1]){const brow=add(body,softBox,0x493e30,s*10,115,18,13,4,4);brow.rotation.z=s*.18;}
    for(let n=0;n<5;n++)add(body,facet,n%2?primary:0x897050,(n-2)*5,91-Math.abs(n-2)*2,17,4,13,5);
  });
  if(shape==='golem'||shape==='sand')headParts(body,()=>{
    add(body,facet,primary,0,101,18,6,9,5);add(body,softBox,0x393c38,0,95,18,13,2,2);
    for(const s of [-1,1]){const brow=add(body,facet,primary,s*10,116,17,12,5,6);brow.rotation.z=s*.15;}
  });
  if(shape==='scrap'){
    for(const s of [-1,1]){
      add(body,softBox,accent,s*20,79,16,12,9,5);
      for(let n=0;n<3;n++)add(body,softBox,0x353f40,s*14,53+n*8,20,10,3,2);
    }
    headParts(body,()=>{for(const s of [-1,1])add(body,softBox,accent,s*20,106,0,5,11,11);add(body,softBox,0x344344,0,99,19,15,3,2);});
  }
  if(shape==='sand')body.traverse(part=>{if(part instanceof T.Mesh&&part.geometry===softOrb&&Math.max(part.scale.x,part.scale.y)>6)part.geometry=facet;});
  if(['spider','beetle','scorpion'].includes(shape)){
    if(shape==='beetle')for(const s of [-1,1]){
      for(let n=0;n<3;n++)add(body,facet,accent,s*(8+n*3),47-n*2,-31+n*12,3,1.3,4);
    }
    if(shape==='scorpion')for(let n=0;n<4;n++)add(body,softBox,primary,0,42-n*.8,-31+n*13,36-n*2,4,10);
    if(shape==='spider')for(const s of [-1,1])for(let n=0;n<3;n++)add(body,facet,accent,s*(9+n*3),43-n*2,-31+n*8,5,1.2,7);
    legs.forEach(leg=>{const s=Math.sign(leg.position.x);add(leg,facet,primary,s*13,2,-2,15,4,4);add(leg,facet,accent,s*29,-6,-2,4,10,4).rotation.z=s*.34;});
  }
  if(shape==='mushroom'){
    add(body,softOrb,0xbd896e,0,27,18,2.3,2.4,1.1);
    for(const s of [-1,1])add(body,softOrb,0xd9a587,s*11,29,14,3,1.5,1);
  }
  if(shape==='slime')for(const s of [-1,1])add(body,softOrb,0x8cb6a9,s*13,23,24,3.3,1.8,.7);
  if(shape==='bat'||shape==='owl'){
    headParts(body,()=>{
      if(shape==='bat')for(const s of [-1,1]){creatureEar(body,primary,0xa98690,s*14,82,7,9,20,s,-.14);add(body,facet,0xa8979a,s*8,56,23,6,5,3);}
      if(shape==='owl')for(const s of [-1,1]){add(body,softOrb,0xd2c4a4,s*10,65,20,10,13,3);}
    });
    for(let n=0;n<4;n++)add(body,facet,n%2?accent:primary,(n-1.5)*6,22,-15,4,13,5);
    if(shape==='owl')wings.forEach(wing=>{for(let n=0;n<4;n++)add(wing,facet,primary,12+n*10,8,-7-n*4,8,8,3);});
  }
  if(shape==='harpy')headParts(body,()=>{
    for(const s of [-1,1])add(body,facet,accent,s*16,91,-2,7,14,7);
    add(body,facet,0xd5b473,0,84,17,3,5,5);
  });
  if(shape==='flame'){
    // Broad curled flame tongues grow out of the ember instead of straight cones.
    for(const part of body.children){
      if(part instanceof T.Mesh&&part.position.y===45){part.geometry=flameTongue;part.scale.set(15,31,14);part.position.y=45;}
      if(part instanceof T.Group&&!part.userData.faceEye)for(const child of part.children)if(child instanceof T.Mesh&&child.geometry.type==='ConeGeometry'){child.geometry=flameTongue;child.scale.set(5,12,5);}
    }
  }
}

export function sharedCreatureAnatomyGeometry(geometry:T.BufferGeometry):boolean{return shared.has(geometry);}
