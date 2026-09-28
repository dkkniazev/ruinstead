import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`
export * as T from 'three';
export * from './src/game/render3d/HeroModel.ts';
export * from './src/game/render3d/HeroSkinStyles.ts';
export {SKIN_DEFINITIONS} from './src/game/cosmetics/SkinEconomy.ts';
export * from './src/game/render3d/MeshBatching.ts';
export * from './src/game/render3d/Trees.ts';
export * from './src/game/render3d/OrbitingWeapons3D.ts';
export * from './src/game/combat/CombatVisualState.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {T,createHero,HERO_SKIN_STYLES,SKIN_DEFINITIONS,OrbitingWeapons3D,batchStaticMeshes,disposeBatchedGeometry,createLivingTree,recordVisualHit}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const hero=createHero(),other=createHero();
for(const weapon of ['axe','sword','hammer','spear','daggers']){
  hero.setWeapon(weapon);
  for(let n=0;n<180;n++)hero.step(1/60,n<90?225:0,n<20,n%40<10,n<90?3.75:0,Math.sin(n)*.2);
  const bounds=new T.Box3().setFromObject(hero.root);assert(bounds.min.y>-25&&bounds.max.y<230,weapon+' animation bounds');
  hero.root.traverse(o=>{for(const v of [...o.position,...o.scale])assert(Number.isFinite(v));if(o instanceof T.Mesh)for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));});
}
hero.setTint(0xff3311);
let unaffected=false;other.root.traverse(o=>{if(o instanceof T.Mesh&&o.material.color.getHex()===0x355f78)unaffected=true;});
assert(unaffected,'Tint must not mutate another hero or a cached portrait');
hero.dispose();other.dispose();

assert.deepEqual(Object.keys(HERO_SKIN_STYLES).sort(),Object.keys(SKIN_DEFINITIONS).sort(),'Every obtainable skin needs an authored outfit');
const dressed=createHero(),neutral=createHero();dressed.step(.016,0);neutral.step(.016,0);
const neutralBounds=new T.Box3().setFromObject(neutral.root),skinBounds=new Set();
let liveGeometries=0;
for(const id of Object.keys(SKIN_DEFINITIONS)){
  dressed.setSkin(id);dressed.setWeapon('axe');
  dressed.root.traverse(o=>{if(o.userData.batchedGeometry){liveGeometries++;o.geometry.addEventListener('dispose',()=>liveGeometries--);}});
  for(const weapon of ['axe','sword','hammer','spear','daggers']){
    dressed.setWeapon(weapon);
    for(let i=0;i<30;i++)dressed.step(1/30,225,i<10,i>15,7.5,.2);
    dressed.root.updateMatrixWorld(true);
    dressed.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),id+' finite animated transforms'));
    const bounds=new T.Box3().setFromObject(dressed.root);
    assert(bounds.min.y>-30&&bounds.max.y<230,id+' safe outfit bounds');
  }
  dressed.step(.016,0);skinBounds.add(JSON.stringify(new T.Box3().setFromObject(dressed.root).getSize(new T.Vector3()).toArray()));
}
assert(skinBounds.size>20,'Outfits must change silhouettes, not only colours');
dressed.setSkin(null);dressed.setWeapon('axe');
assert.equal(liveGeometries,0,'Repeated skin changes release the previous outfit geometries');
assert(!dressed.root.children.some(o=>o.name.startsWith('outfit-')));
assert.deepEqual(new T.Box3().setFromObject(neutral.root),neutralBounds,'Changing a skin must not mutate another hero');
dressed.dispose();neutral.dispose();

// A raised elbow must not turn the blade back into the cape, at any gait phase.
for(const weapon of ['axe','sword','hammer','spear','daggers']){
  const model=createHero();model.setWeapon(weapon);
  for(let frame=0;frame<180;frame++){
    const attack=frame>=90&&frame%30<15;
    model.step(1/60,frame<30?0:225,frame>=60&&frame<90,attack,frame<30?0:3.75,Math.sin(frame)*.2);
    model.root.updateMatrixWorld(true);
    for(const gripName of weapon==='daggers'?['primary-grip','secondary-grip']:['primary-grip']){
      const grip=model.root.getObjectByName(gripName),blade=grip.getObjectByName(`weapon-${weapon}`);
      const base=grip.getWorldPosition(new T.Vector3()),tip=blade.localToWorld(new T.Vector3(...blade.userData.weaponTip));
      assert(tip.z-base.z>8,`${weapon} must point forward: frame ${frame}, ${gripName}`);
    }
  }
  model.dispose();
}
// At low frame rates, two dagger attacks can share one continuous attack=true window.
const rapid=createHero();rapid.setWeapon('daggers');
rapid.step(.016,0,false,true,0,0,1000);
for(let i=0;i<4;i++)rapid.step(.05,0,false,true,0,0,1000);
const latePitch=rapid.root.getObjectByName('primary-grip').rotation.x;
rapid.step(.024,0,false,true,0,0,1240);
assert(Math.abs(rapid.root.getObjectByName('primary-grip').rotation.x-latePitch)>.4,'A new hit timestamp restarts a rapid swing');
rapid.dispose();

const satellites=new OrbitingWeapons3D();
const states=['sword','hammer','spear','daggers'].map((weaponId,i)=>({slot:i+1,weaponId,color:0x73b9ff,x:100+i*40,y:200-i*40,facing:.4,visible:true,attackAt:-Infinity,attackDirection:{x:1,y:0},phase:'orbit',progress:0}));
const assertFiniteTransforms=()=>{
  satellites.root.updateMatrixWorld(true);
  satellites.root.traverse(object=>assert(object.matrixWorld.elements.every(Number.isFinite),'All orbital transforms must be finite, even before the first hit'));
};
satellites.update(states,1000,75);assertFiniteTransforms();
assert.equal(satellites.root.children.length,4,'Four secondary slots must have visible 3D models');
for(const state of states){const object=satellites.root.getObjectByName(`orbital-slot-${state.slot}`);assert(object.getObjectByName(`weapon-${state.weaponId}`));assert.equal(object.position.x,state.x);assert.equal(object.position.z,state.y);assert(object.position.y>115,'Weapons hover at hero terrain height');}
states[1].attackAt=1000;states[1].phase='impact';states[1].x+=22;satellites.update(states,1140,75);
const hammer=satellites.root.getObjectByName('orbital-slot-2');
assert.equal(hammer.position.x,states[1].x,'The model must match the authoritative flight position at impact');
assert.equal(hammer.rotation.y,Math.PI/2,'Strike faces its target');
assert.equal(satellites.root.getObjectByName('orbital-slot-1').position.x,states[0].x,'Another slot does not share this cooldown event');
states[1].phase='orbit';states[1].x-=22;satellites.update(states,1400,75);assert.equal(hammer.position.x,states[1].x,'Weapon follows its current orbit after return');
let disposed=0;hammer.getObjectByName('weapon-hammer').addEventListener('removed',()=>disposed++);
states[1]={...states[1],weaponId:'axe'};satellites.update(states,1500,75);
assert.equal(disposed,1,'Changing equipment removes the old model');
assert(satellites.root.getObjectByName('orbital-slot-2').getObjectByName('weapon-axe'));
satellites.update(states.slice(1).map(state=>({...state,visible:false})),1600,75);
assert.equal(satellites.root.children.length,3,'Unequipping removes the old orbital');
assert(satellites.root.children.every(object=>!object.visible),'Dead player hides all orbitals');assertFiniteTransforms();
satellites.dispose();assert.equal(satellites.root.children.length,0);
const group=new T.Group();
for(let i=0;i<3;i++){
  const m=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:i===0?0xff0000:0x00ff00}));
  m.position.set(i*10,i*4,-i*7);m.rotation.set(.3*i,.2,.1);m.scale.set(3,8,2);group.add(m);
}
const before=new T.Box3().setFromObject(group);batchStaticMeshes(group);const after=new T.Box3().setFromObject(group);
assert.equal(group.children.length,1,'Different colours of rigid siblings should share one draw');
assert(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5,'Batching must preserve world bounds');
const colors=group.children[0].geometry.attributes.color.array;assert(colors.some((v,i)=>i%3===0&&v===1)&&colors.some((v,i)=>i%3===1&&v===1),'Both source colours survive batching');
const originalColors=Array.from(colors),batch=group.children[0];
group.add(new T.Mesh(batch.geometry.clone(),batch.material));batchStaticMeshes(group);
assert.deepEqual(Array.from(group.children[0].geometry.attributes.color.array),[...originalColors,...originalColors],'Rebatching must preserve painted vertex colours');
const textured=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({map:new T.Texture()}));
group.add(textured,textured.clone());batchStaticMeshes(group);
assert(group.children.includes(textured)&&textured.geometry.hasAttribute('uv'),'Textured meshes retain UVs and stay outside colour batching');
disposeBatchedGeometry(group);
for(const region of [1,3,5,6])for(const seed of [0,1,11,101]){
  const tree=createLivingTree(seed,region),box=new T.Box3().setFromObject(tree);
  assert(box.min.y>-6&&box.max.y>180&&box.max.y<260);assert(tree.children.length<=2,'Rigid canopy must be batched');disposeBatchedGeometry(tree);
}
const hit=recordVisualHit(recordVisualHit(undefined,10,42,'neutral'),10,19,'neutral');assert.equal(hit.amount,61);
assert.equal(recordVisualHit(hit,11,7,'neutral').amount,7);
console.log('Art sanity: PASS — five forward weapon grips, rapid swings, four independent 3D orbitals, equipment cleanup, finite transforms, cloth/limb bounds, independent skin tint, batch bounds/colours, 16 tree silhouettes, aggregated hit numbers.');
