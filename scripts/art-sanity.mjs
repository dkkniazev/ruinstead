import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`
export * as T from 'three';
export * from './src/game/render3d/HeroModel.ts';
export * from './src/game/render3d/WeaponAnimation.ts';
export * from './src/game/render3d/HeroSkinStyles.ts';
export {SKIN_DEFINITIONS} from './src/game/cosmetics/SkinEconomy.ts';
export * from './src/game/render3d/MeshBatching.ts';
export * from './src/game/render3d/Trees.ts';
export * from './src/game/render3d/NatureForms.ts';
export {createBuilding,createForge} from './src/game/render3d/Models.ts';
export * from './src/game/render3d/OrbitingWeapons3D.ts';
export * from './src/game/combat/CombatVisualState.ts';
export * from './src/game/render3d/HeroOcclusion3D.ts';
export * from './src/game/render3d/RenderVisibility.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/"'}});
const {T,createHero,HERO_SKIN_STYLES,SKIN_DEFINITIONS,OrbitingWeapons3D,HeroOcclusion3D,RenderVisibility,batchStaticMeshes,disposeBatchedGeometry,createLivingTree,createSparseTree,foliageCrown,fracturedRock,createBuilding,createForge,recordVisualHit,WEAPON_ATTACK_ANIMATION_MS}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
for(const aspect of [1280/720,844/390,390/844]){
  const height=aspect<.85?1200:1080;
  const camera=new T.OrthographicCamera(-height*aspect/2,height*aspect/2,height/2,-height/2,1,5000);
  const target=new T.Vector3(6200,250,10400);camera.position.copy(target).add(new T.Vector3(0,1250,1080));camera.lookAt(target);
  const view=new RenderVisibility();view.update(camera);
  let previous=0,submitted=0;
  for(let dx=-1700;dx<=1700;dx+=100)for(let dz=-1700;dz<=1700;dz+=100){
    previous++;const x=target.x+dx,z=target.z+dz;
    if(view.includes(x,200,z,60,200))submitted++;
    for(const altitude of [200,300,400,700]){
      const projected=new T.Vector3(x,altitude,z).project(camera);
      if(Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1&&Math.abs(projected.z)<=1)
        assert(view.includes(x,200,z,60,altitude-200+100),'View bounds must retain visible heads, bodies and elevated health bars');
    }
  }
  assert(submitted<previous*.8,'View bounds must skip a meaningful part of the old square animation area');
  assert(view.includes(target.x,200,target.z,120,500),'A large boss beside the hero stays visible');
  assert(!view.includes(target.x+6000,200,target.z,60,200),'Distant models stay outside presentation');
}
for(const id of ['storage','sawmill','workshop','house']){
  const stages=[0,1,8].map(level=>createBuilding(id,level));
  const heights=stages.map(root=>new T.Box3().setFromObject(root,true).getSize(new T.Vector3()).y);
  assert(heights[0]<heights[1]*.65,`${id}: ruins cannot already have a restored roof silhouette`);
  assert(heights[2]>heights[1],`${id}: later upgrades must remain visibly taller`);
  for(const root of stages)disposeBatchedGeometry(root);
}
for(let stage=0;stage<=3;stage++){
  const forge=createForge(stage);let lights=0,glow=0;
  forge.traverse(o=>{if(o instanceof T.Light)lights++;if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.emissive?.getHex())glow++;});
  assert.equal(lights,stage===3?1:0,'Forge light appears only after the final repair');
  assert.equal(glow>0,stage===3,'Unrepaired forge cannot show burning coals');
  disposeBatchedGeometry(forge);
}
const occlusion=new HeroOcclusion3D(),occlusionHero=createHero();
occlusionHero.root.position.set(123,45,678);occlusionHero.step(.016,140,false,true,2);occlusion.update(occlusionHero.root);
assert(occlusion.root.children.length>0,'Occlusion overlay follows actual hero meshes');
const originalMeshes=[];occlusionHero.root.traverse(o=>{if(o instanceof T.Mesh)originalMeshes.push(o);});
for(const mesh of occlusion.root.children){
  assert(originalMeshes.some(o=>o.geometry===mesh.geometry&&o.matrixWorld.equals(mesh.matrix)),'Overlay follows animated geometry/world transform');
  assert.equal(mesh.material.depthWrite,false,'Overlay must not obstruct the world');
}
occlusionHero.setWeapon('spear');occlusionHero.setSkin('moss-guard');occlusion.update(occlusionHero.root);
const hidden=occlusion.root.children.find(o=>o.material.colorWrite);
assert.equal(hidden.material.depthFunc,T.GreaterDepth);assert.equal(hidden.material.stencilFunc,T.NotEqualStencilFunc,'Visible hero pixels are excluded');
let releasedBorrowedGeometry=0;hidden.geometry.addEventListener('dispose',()=>releasedBorrowedGeometry++);
occlusion.dispose();assert.equal(releasedBorrowedGeometry,0,'Overlay must not dispose geometry owned by the hero');
occlusionHero.dispose();
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

// Idle grips point generally forward and every held weapon is rolled -90° around
// its own length (180° from the previous upside-down +90° roll).
for(const weapon of ['axe','sword','hammer','spear','daggers']){
  const model=createHero();model.setWeapon(weapon);
  model.step(1/60,0,false,false,0,0);
  model.root.updateMatrixWorld(true);
  const grip=model.root.getObjectByName('primary-grip');
  const blade=grip.getObjectByName(`weapon-${weapon}`);
  assert(Math.abs(blade.rotation.y+Math.PI/2)<1e-5,`${weapon} corrected longitudinal roll`);
  const base=grip.getWorldPosition(new T.Vector3()),tip=blade.localToWorld(new T.Vector3(...blade.userData.weaponTip));
  assert(tip.z-base.z>5,`${weapon} idle grip faces broadly forward`);
  const before={x:grip.rotation.x,y:grip.rotation.y,z:grip.rotation.z};
  model.step(.016,0,false,true,0,0,1000);
  for(let i=0;i<8;i++)model.step(.025,0,false,true,0,0,1000);
  const delta={x:Math.abs(grip.rotation.x-before.x),y:Math.abs(grip.rotation.y-before.y),z:Math.abs(grip.rotation.z-before.z)};
  if(weapon==='spear')assert(delta.x>.15&&delta.y<.35,'Spear uses a forward thrust');
  if(weapon==='hammer')assert(delta.x>.45,'Hammer uses a vertical smash arc');
  if(weapon==='sword'||weapon==='axe')assert(delta.y>.25||delta.z>.25,`${weapon} uses a cutting sweep`);
  if(weapon==='daggers'){
    const off=model.root.getObjectByName('secondary-grip');
    assert(Math.abs(grip.rotation.y-off.rotation.y)>.25,'Daggers cross from opposite sides');
  }
  model.dispose();
}
// At low frame rates, two dagger attacks can share one continuous attack=true window.
const rapid=createHero();rapid.setWeapon('daggers');
rapid.step(.016,0,false,true,0,0,1000);
for(let i=0;i<4;i++)rapid.step(.05,0,false,true,0,0,1000);
const latePitch=rapid.root.getObjectByName('primary-grip').rotation.x;
rapid.step(.024,0,false,true,0,0,1240);
assert(Math.abs(rapid.root.getObjectByName('primary-grip').rotation.x-latePitch)>.12,'A new hit timestamp restarts a rapid swing');
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
for(const seed of [0,1,2,3,4,5,6,7])for(const geometry of [foliageCrown(seed,0x579452),foliageCrown(seed,0x579452,true),fracturedRock(seed,0x838b7d)]){
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  let volume=0,upperNormal=0,upperCount=0;
  for(let i=0;i<p.count;i+=3){
    const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
    volume+=a.dot(b.cross(c))/6;
  }
  for(let i=0;i<p.count;i++)if(p.getY(i)>.4){upperNormal+=n.getY(i);upperCount++;}
  assert(volume>.5,'Closed nature forms must have outward winding, so front-face culling cannot hide their surface');
  assert(upperNormal/upperCount>.3,'Canopy/rock tops must receive the light from above');
  assert([...p.array,...n.array].every(Number.isFinite));
}
for(const region of [1,3,5,6])for(const seed of [0,1,11,101]){
  const tree=createLivingTree(seed,region),box=new T.Box3().setFromObject(tree);
  assert(box.min.y>-6&&box.max.y>180&&box.max.y<260);assert(tree.children.length<=2,'Rigid canopy must be batched');
  let triangles=0;tree.traverse(o=>{if(o instanceof T.Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  assert(triangles<1500,'Authored crowns must stay cheaper than the old subdivided spheres');disposeBatchedGeometry(tree);
}
for(const region of [2,4,7,8])for(const seed of [0,1,11,101]){
  const tree=createSparseTree(seed,region),box=new T.Box3().setFromObject(tree,true);
  assert(box.min.y>-5&&box.max.y>=165&&box.max.y<220,'Arid/burnt harvest trees retain their established height');
  assert(tree.children.length<=2,'Sparse trees must use at most two draw meshes');
  const width=box.max.x-box.min.x,depth=box.max.z-box.min.z;
  assert(width<185&&depth<185,`Sparse tree ${region}/${seed} exceeds its canopy footprint: ${width.toFixed(1)} × ${depth.toFixed(1)}`);
  disposeBatchedGeometry(tree);
}
const hit=recordVisualHit(recordVisualHit(undefined,10,42,'neutral'),10,19,'neutral');assert.equal(hit.amount,61);
assert.equal(recordVisualHit(hit,11,7,'neutral').amount,7);
assert(WEAPON_ATTACK_ANIMATION_MS.smash>=750&&WEAPON_ATTACK_ANIMATION_MS['wide-slash']>=620&&WEAPON_ATTACK_ANIMATION_MS.thrust>=500,'Heavy and thrust animations must remain readable instead of snapping instantly');
console.log('Art sanity: PASS — corrected 180° weapon roll, slower readable thrust/slash/cleave/smash/dual-slash poses, rapid swing restarts, four independent 3D orbitals, equipment cleanup, finite transforms, cloth/limb bounds, independent skin tint, batch bounds/colours, 16 tree silhouettes, aggregated hit numbers.');
