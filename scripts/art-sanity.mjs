import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`
export * as T from 'three';
export * from './src/game/render3d/HeroModel.ts';
export * from './src/game/render3d/MeshBatching.ts';
export * from './src/game/render3d/Trees.ts';
export * from './src/game/combat/CombatVisualState.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {T,createHero,batchStaticMeshes,disposeBatchedGeometry,createLivingTree,recordVisualHit}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
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
console.log('Art sanity: PASS — five animated weapons, cloth/limb bounds, independent skin tint, batch bounds/colours, 16 tree silhouettes, aggregated hit numbers.');
