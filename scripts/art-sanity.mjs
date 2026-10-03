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
export * from './src/game/render3d/TreeForms.ts';
export {createGroundCover,distanceToRoad} from './src/game/render3d/BiomeScenery.ts';
export {createWatercourse} from './src/game/render3d/WatercourseMeshes.ts';
export {WORLD_WATERCOURSES,brookBridgeAt,sampleWatercourse} from './src/game/world/WorldWatercourses.ts';
export {getRegionDefinition} from './src/game/world/ReleaseRegionMap.ts';
export {plateauHeight} from './src/game/world/WorldTerrain.ts';
export {terrainHeight,passageAt} from './src/game/world/WorldTerrain.ts';
export {createBuilding,createForge,createSettlementWell,createResource} from './src/game/render3d/Models.ts';
export {disposeSettlementScenery} from './src/game/render3d/SettlementScenery.ts';
export * from './src/game/world/SettlementLayout.ts';
export {buildResourceNodeDefinitions} from './src/game/gathering/ResourceSystem.ts';
export {SETTLEMENT_CENTER} from './src/game/world/WorldPrototype.ts';
export * from './src/game/render3d/OrbitingWeapons3D.ts';
export * from './src/game/combat/CombatVisualState.ts';
export * from './src/game/render3d/HeroOcclusion3D.ts';
export * from './src/game/render3d/RenderVisibility.ts';
export * from './src/game/render3d/ResourceLabelLayout.ts';
export * from './src/game/render3d/ContactBursts3D.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/"'},
plugins:[{name:'art-math-phaser',setup(b){
  b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default {Math:{Vector2:class{constructor(x=0,y=0){this.x=x;this.y=y;}},Distance:{Between:(a,b,c,d)=>Math.hypot(c-a,d-b)}}};'}));
}}]});
const {T,ContactBursts3D,createHero,HERO_SKIN_STYLES,SKIN_DEFINITIONS,OrbitingWeapons3D,HeroOcclusion3D,RenderVisibility,layoutResourceLabels,batchStaticMeshes,disposeBatchedGeometry,createLivingTree,createSparseTree,foliageCrown,fracturedRock,naturalSurfaceMaterial,treeBark,treeCanopy,createWatercourse,WORLD_WATERCOURSES,brookBridgeAt,sampleWatercourse,getRegionDefinition,plateauHeight,terrainHeight,passageAt,createGroundCover,distanceToRoad,createBuilding,createForge,recordVisualHit,WEAPON_ATTACK_ANIMATION_MS}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const bursts=new ContactBursts3D(),burstCamera=new T.PerspectiveCamera();
const {createSettlementWell,disposeSettlementScenery,createResource,SETTLEMENT_BUILDINGS,SETTLEMENT_CENTER,buildResourceNodeDefinitions}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const well=createSettlementWell(),wellRay=new T.Raycaster();
const checkWell=()=>{
  well.updateMatrixWorld(true);
  for(let n=0;n<24;n++){
    const a=n*Math.PI/12;
    wellRay.set(new T.Vector3(0,22,0),new T.Vector3(Math.cos(a),0,Math.sin(a)));
    const hit=wellRay.intersectObject(well,true)[0];
    assert(hit&&hit.distance>=32&&hit.distance<=50,'Well has an opaque inner wall at every camera azimuth');
  }
  wellRay.set(new T.Vector3(0,70,0),new T.Vector3(0,-1,0));
  assert(wellRay.intersectObject(well,true).some(h=>Math.abs(h.point.y-12)<.01),'Water hides terrain inside the well');
};
checkWell();
const ownershipHero=createHero();let sharedShapesDisposed=0;
const sharedShapes=new Set();ownershipHero.root.traverse(o=>{if(o instanceof T.Mesh)sharedShapes.add(o.geometry);});
for(const geometry of sharedShapes)geometry.addEventListener('dispose',()=>sharedShapesDisposed++);
batchStaticMeshes(well);checkWell();disposeSettlementScenery(well);
assert.equal(sharedShapesDisposed,0,'Well batching/disposal cannot destroy shared actor unit shapes');ownershipHero.dispose?.();
const starterTree=buildResourceNodeDefinitions().find(n=>n.id==='starter-wood');
const tree=createResource('wood',1,Math.abs(Math.round(starterTree.x*7+starterTree.y*13)));
tree.position.set(starterTree.x-SETTLEMENT_CENTER.x,0,starterTree.y-SETTLEMENT_CENTER.y);
const treeBounds=new T.Box3().setFromObject(tree);
for(const level of [0,1,8]){
  const workshop=createBuilding('workshop',level),site=SETTLEMENT_BUILDINGS.workshop;
  workshop.position.set(site.x,0,site.y);workshop.rotation.y=site.rotation;
  assert(!treeBounds.intersectsBox(new T.Box3().setFromObject(workshop)),'Starter tree clears workshop, roof and bench at every building stage');
  disposeBatchedGeometry(workshop);
}
disposeBatchedGeometry(tree);
burstCamera.rotation.set(-.6,.3,0);
for(let i=0;i<200;i++)bursts.hit(1000,100+i,90,400,1,new T.Color(0xffddaa));
for(let i=0;i<100;i++)bursts.footfall(1000,100+i,90,400,new T.Color(0xd8cf9f));
bursts.update(1070,burstCamera);
assert.equal(bursts.root.children.length,2,'Contact accents remain two draw calls under dense combat');
const burstMatrix=new T.Matrix4(),burstPosition=new T.Vector3(),burstRotation=new T.Quaternion(),burstScale=new T.Vector3();
for(const mesh of bursts.root.children){
  assert(mesh.count<=112,'Contact and footfall pools stay bounded after repeated hits');
  for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,burstMatrix);burstMatrix.decompose(burstPosition,burstRotation,burstScale);
    assert(Math.abs(burstRotation.dot(burstCamera.quaternion))>.99999,'Contact accents face the current game camera');
    assert(burstPosition.y>=90,'Contact puffs stay on or above the struck body');
  }
}
assert.equal(bursts.root.children[0].count,32,'Walking does not replace real hit flashes with foot dust');
bursts.update(1390,burstCamera);
for(const mesh of bursts.root.children)assert.equal(mesh.count,0,'Contact accents expire without a lasting halo');
let releasedBursts=0;for(const mesh of bursts.root.children)mesh.geometry.addEventListener('dispose',()=>releasedBursts++);
bursts.dispose();assert.equal(releasedBursts,2,'Effect geometry is released with the world');
for(const [width,height]of [[1280,720],[844,390],[390,844]]){
  const labels=Array.from({length:8},(_,n)=>({id:'node-'+n,left:width*.5-49+(n%3)*17,
    top:height*.46+(n%2)*5,width:98,height:30,priority:n===6?10000:-n}));
  const placements=layoutResourceLabels(labels,width,height);
  assert(placements.has('node-6'),'Active harvest label remains visible in a crowded cluster');
  assert.deepEqual(placements.get('node-6'),{left:labels[6].left,top:labels[6].top},'Active label stays seated over the harvested node');
  assert.deepEqual([...layoutResourceLabels([...labels].reverse(),width,height)], [...placements],'Layout does not depend on resource iteration order');
  const placed=labels.filter(l=>placements.has(l.id)).map(l=>({...l,...placements.get(l.id)}));
  assert(placed.length>=2,'Adjacent tree and stone labels remain readable together');
  for(const a of placed){
    assert(a.left>=0&&a.top>=0&&a.left+a.width<=width&&a.top+a.height<=height,'Visible label stays inside the viewport');
    for(const b of placed)if(a.id!==b.id)assert(!(a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top),'Resource labels cannot overlap');
  }
}
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
for(let seed=0;seed<12;seed++)for(const geometry of [foliageCrown(seed,0x579452),foliageCrown(seed,0x579452,true),fracturedRock(seed,0x838b7d),treeCanopy(seed,0x579452),treeCanopy(seed,0x579452,true),treeBark(seed,0x795638),treeBark(seed,0x795638,true)]){
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  let volume=0,upperNormal=0,upperCount=0;
  const count=geometry.index?.count??p.count,index=i=>geometry.index?.getX(i)??i;
  for(let i=0;i<count;i+=3){
    const a=new T.Vector3().fromBufferAttribute(p,index(i)),b=new T.Vector3().fromBufferAttribute(p,index(i+1)),c=new T.Vector3().fromBufferAttribute(p,index(i+2));
    volume+=a.dot(b.cross(c))/6;
  }
  for(let i=0;i<p.count;i++)if(p.getY(i)>.4){upperNormal+=n.getY(i);upperCount++;}
  assert(volume>.5,'Closed nature forms must have outward winding, so front-face culling cannot hide their surface');
  assert(upperNormal/upperCount>.3,'Canopy/rock tops must receive the light from above');
  assert([...p.array,...n.array].every(Number.isFinite));
}
for(const region of [1,3,5,6])for(const seed of [0,1,2,3,4,5,6,7,8,9,10,11,101]){
  const tree=createLivingTree(seed,region),box=new T.Box3().setFromObject(tree);
  assert(box.min.y>-6&&box.max.y>180&&box.max.y<260);assert(tree.children.length<=2,'Rigid canopy must be batched');
  assert(box.max.x-box.min.x<190&&box.max.z-box.min.z<190,'Tree foliage stays inside the established harvest silhouette');
  let triangles=0;tree.traverse(o=>{if(o instanceof T.Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  assert(triangles<1500,'Authored crowns must stay cheaper than the old subdivided spheres');disposeBatchedGeometry(tree);
}
for(const course of WORLD_WATERCOURSES){
  const brook=createWatercourse(course),region=getRegionDefinition(course.region);
  const banks=brook.getObjectByName('wet-banks'),water=brook.getObjectByName('flowing-water');
  const p=banks.geometry.attributes.position,alpha=banks.geometry.attributes.bankAlpha,n=banks.geometry.attributes.normal;
  assert.equal(alpha.count,p.count);assert.equal(n.count,p.count);
  assert([...p.array,...alpha.array,...n.array].every(Number.isFinite),'Shore overlays have finite positions/normals/alpha');
  assert(Math.min(...alpha.array)===0&&Math.max(...alpha.array)>.8,'Bank must feather completely into the land');
  let maxHeightError=0;
  for(let i=0;i<p.count;i++){
    maxHeightError=Math.max(maxHeightError,Math.abs(p.getY(i)-plateauHeight(region,p.getX(i),p.getZ(i))-2.2));
    assert(n.getY(i)>0,'Banks face the sky');assert(alpha.getX(i)>=0&&alpha.getX(i)<=1);
  }
  assert(maxHeightError<.001,`Bank layers follow existing terrain within Float32 height precision: ${maxHeightError}`);
  console.log(`${course.id}: maximum bank height error ${maxHeightError.toFixed(5)} world units`);
  for(const normal of water.geometry.attributes.normal.array)assert(Number.isFinite(normal));
  const w=water.geometry.attributes.position;
  for(let i=0;i<w.count;i++){
    assert(water.geometry.attributes.normal.getY(i)>.9,'Water has upward-facing normals');
    const sample=sampleWatercourse(course.region,w.getX(i),w.getZ(i));
    assert(sample&&sample.distance<sample.width+1,'Rendered brook stays within the existing water corridor');
  }
  assert.equal(water.geometry.attributes.streamAlong.count,water.geometry.attributes.position.count);
  let triangles=0;const matrix=new T.Matrix4(),position=new T.Vector3();
  brook.traverse(mesh=>{
    if(!(mesh instanceof T.Mesh))return;
    triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh instanceof T.InstancedMesh?mesh.count:1);
    if(mesh instanceof T.InstancedMesh){
      assert(mesh.count<=mesh.instanceMatrix.count,'Shore cluster instances stay within allocation');
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
        assert(!brookBridgeAt(position.x,position.z),'Shore decoration must not occupy bridge decks');
      }
    }
    mesh.geometry.dispose();if(mesh.material!==naturalSurfaceMaterial)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>m.dispose());
  });
  assert(triangles<25000,'Each complete brook keeps a bounded instanced scenery budget');
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
let bedCount=0;
for(const id of [1,3,5,6]){
  const region=getRegionDefinition(id),tx=Math.floor(region.center[0]/640),tz=Math.floor(region.center[1]/640);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    const cover=createGroundCover((tx+dx)*640,(tz+dz)*640,640,region);
    const beds=cover.getObjectByName('understory-ground'),shrubs=cover.getObjectByName('understory-shrubs'),leaves=cover.getObjectByName('understory-leaves');
    if(!beds)continue;
    let triangles=0;const p=beds.geometry.attributes.position,alpha=beds.geometry.attributes.bedAlpha;
    bedCount+=p.count/300;
    for(let n=0;n<p.count;n++){
      const x=p.getX(n),y=p.getY(n),z=p.getZ(n);
      assert([x,y,z].every(Number.isFinite),'Understory ground vertices remain finite');
      assert(Math.abs(y-terrainHeight(x,z)-1.7)<.001,'Plant beds follow the actual sampled ground');
      assert(distanceToRoad(region,x,z)>70&&!passageAt(x,z,30),'Understory beds preserve clear roads and crossings');
      assert(alpha.getX(n)>=0&&alpha.getX(n)<=.321,'Bed pigment remains a soft overlay');
    }
    assert(p.count===0||Array.from(alpha.array).some(a=>a===0),'Understory edges fade fully into terrain');
    for(const object of [shrubs,leaves]){
      assert(object.count<=(object===shrubs?4:64),'Chunk foliage count is bounded');
      const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),q=new T.Quaternion();
      for(let n=0;n<object.count;n++){
        object.getMatrixAt(n,matrix);matrix.decompose(position,q,scale);
        object.geometry.computeBoundingBox();
        const top=object.geometry.boundingBox.max.y*scale.y+position.y-terrainHeight(position.x,position.z);
        assert(top<33,'Decorative foliage stays low enough to walk through');
        assert(distanceToRoad(region,position.x,position.z)>70,'Leaves and shrubs never fill the path');
      }
    }
    const owned=new Set();cover.traverse(o=>{if(o instanceof T.Mesh){
      triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o instanceof T.InstancedMesh?o.count:1);
      if(o instanceof T.InstancedMesh)o.dispose();
      if(o.userData.uniqueGeometry)o.geometry.dispose();
      for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.userData.sharedArtMaterial)owned.add(m);
    }});owned.forEach(m=>m.dispose());
    assert(triangles<6500,'Complete ground cover stays below 6500 triangles per 640-unit chunk');
  }
}
assert(bedCount>20,'Forest fixtures must include real planted beds, not only empty cover');
assert.equal(recordVisualHit(hit,11,7,'neutral').amount,7);
assert(WEAPON_ATTACK_ANIMATION_MS.smash>=750&&WEAPON_ATTACK_ANIMATION_MS['wide-slash']>=620&&WEAPON_ATTACK_ANIMATION_MS.thrust>=500,'Heavy and thrust animations must remain readable instead of snapping instantly');
console.log('Art sanity: PASS — weapon poses/orbits, equipment cleanup, cloth/limb bounds, skin tint, batching, closed tree surfaces/52 living + 16 sparse harvest silhouettes, feathered brook banks/bridge clearance, 100 understory chunks/budgets, resource-label overlap/active harvest priority, aggregated hit numbers.');
