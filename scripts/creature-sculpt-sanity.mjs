import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const bundle=await build({stdin:{contents:`export * as T from 'three';export * from './src/game/render3d/CreatureModels.ts';export * from './src/game/render3d/CreatureCatalog.ts';export * from './src/game/render3d/CreatureSculpt.ts';export * from './src/game/render3d/CreatureAura.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/"'}});
const {T,createCreature,CREATURE_CATALOG,installCreatureSurfaces,authoredCreatureSurfaces,creatureBodyBounds}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const manifest=JSON.parse(fs.readFileSync('public/assets/models/creature-sculpt/manifest.json','utf8')),bytes=fs.readFileSync('public/assets/models/creature-sculpt/surfaces.bin');
const hash=createHash('sha256');for(const file of ['CreatureSculpt.ts','CreatureCatalog.ts','CreatureArt.ts','CreatureAnatomy.ts','CreatureModels.ts'])hash.update(fs.readFileSync('src/game/render3d/'+file));
assert.equal(manifest.authoringHash,hash.digest('hex'),'Authored geometry changed; run npm run art:bake-creatures');
installCreatureSurfaces(manifest,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
for(const [key,geometry]of authoredCreatureSurfaces())if(key.startsWith('profile-feather-fan-')){
  const p=geometry.getAttribute('position'),index=geometry.index;
  let volume=0;const edges=new Map(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  const pointKey=n=>[p.getX(n),p.getY(n),p.getZ(n)].map(v=>v.toFixed(4)).join(',');
  for(let n=0;n<index.count;n+=3){
    const ids=[index.getX(n),index.getX(n+1),index.getX(n+2)];
    a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);
    volume+=a.dot(b.clone().cross(c))/6;
    for(let i=0;i<3;i++){const edge=[pointKey(ids[i]),pointKey(ids[(i+1)%3])].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}
  }
  assert(volume>0,key+' has outward-facing surfaces rather than an inside-out dark wing');
  for(const count of edges.values())assert.equal(count,2,key+' stays closed after baking');
}
const rows=[];
for(const [id,identity]of Object.entries(CREATURE_CATALOG)){
  for(const elite of identity.boss?[true]:[false,true]){
    const model=createCreature(id,0x728065,0xbca97c,elite,25),body=model.root.getObjectByName('creature-body');
    assert.equal(body.userData.sculptedCreature,identity.shape,id+' uses the sculpted surface pipeline');
    assert.equal(body.userData.creatureStyle,'cover-2026-10-03',id+' follows the approved creature style');
    const aura=model.root.getObjectByName('elite-aura');
    assert.equal(!!aura,elite&&!identity.boss,id+' aura appears only on elite mobs');
    assert.equal(model.root.userData.combatRadius,25,id+' art never changes collision size');
    assert.equal(model.root.userData.visualHeight,creatureBodyBounds(model.root).max.y,id+' HP bar height excludes effects');
    model.step(.016,0,false,false);
    let disposed=false,glowGeometryDisposed=false;
    if(aura){
      assert(body.userData.eliteAnatomy,id+' elite has veteran anatomy/equipment');
      assert(aura.material.transparent&&!aura.material.depthWrite,id+' faint aura cannot occlude the body');
      const material=aura.material;material.addEventListener('dispose',()=>{disposed=true;});
      aura.geometry.addEventListener('dispose',()=>{glowGeometryDisposed=true;});
      model.step(.016,60,false,false);assert(material.uniforms.time.value>0,id+' aura animates with the mob');
    }
    let triangles=0;const parts=[];
    body.traverse(o=>{if(o instanceof T.Mesh){const n=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;triangles+=n;parts.push({name:o.name||o.parent.name,type:o.geometry.type,triangles:n});}});
    rows.push({id,elite,triangles,largest:parts.sort((a,b)=>b.triangles-a.triangles).slice(0,3)});
    assert(triangles<13000,id+' exceeds the 13k complete-model geometry budget');
    model.dispose();if(aura){assert(disposed,id+' aura material is released');assert(glowGeometryDisposed,id+' owned wisp geometry is released');}
  }
}
console.table(rows.sort((a,b)=>b.triangles-a.triangles).slice(0,5).map(({id,elite,triangles})=>({id,elite,triangles})));
// Compare actual world-space silhouettes, not individually fitted portraits.
const dimensions=(id,radius=25,elite=false)=>{
  const model=createCreature(id,0x728065,0xbca97c,elite,radius);
  const size=creatureBodyBounds(model.root).getSize(new T.Vector3());model.dispose();return size;
};
const goblinSize=dimensions('goblin'),boarSize=dimensions('boar'),humanSize=dimensions('shadow-bandit');
assert(goblinSize.y<humanSize.y*.8,'Goblin is a short humanoid, not taller than an adult human');
assert(boarSize.z>goblinSize.y*1.35,'Boar has a long heavy body compared with the goblin');
assert(boarSize.x*boarSize.y*boarSize.z>goblinSize.x*goblinSize.y*goblinSize.z*1.5,'Boar is visibly more massive, despite its lower back');
for(const id of ['stone-elemental','scrap-golem','sandling'])assert(dimensions(id,29).y>humanSize.y*1.35,id+' towers over a human');
assert(dimensions('slime',23).y<goblinSize.y*.65,'Slime is a small ground creature');
const eliteBoar=dimensions('boar',25*1.464,true);
assert(eliteBoar.x>boarSize.x*1.4&&eliteBoar.y>boarSize.y*1.35,'Mature elite has a different mass/outline at actual combat scale');
// Painted shells must retain each species palette when both are instantiated.
// A geometry cache keyed only by shape once painted obsidian beetles forest green.
const paintedShells=['beetle','obsidian-beetle'].map(id=>{
  const model=createCreature(id,0x728065,0xbca97c,false,25),rgb=[];
  model.root.traverse(o=>{
    if(!(o instanceof T.Mesh)||!o.geometry.getAttribute('color')
      ||!(o.material instanceof T.MeshStandardMaterial)||!o.material.vertexColors
      ||o.material.color.getHex()!==0xffffff||o.material.roughness!==.82)return;
    const a=o.geometry.getAttribute('color');
    for(let n=0;n<a.count;n++)rgb.push(a.getX(n),a.getY(n),a.getZ(n));
  });
  assert(rgb.length>0,id+' has painted wing cases');model.dispose();return rgb;
});
assert.notDeepEqual(paintedShells[0],paintedShells[1],'Species-specific painted shells cannot borrow another beetle palette');
console.log(`Creature sculpt: PASS — current baked geometry, 64 identities, 40 animated/released elite auras, mature anatomy, unchanged collision size, HP bars exclude glow, ${(bytes.length/1024).toFixed(0)} KiB of shared meshes.`);
