import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({stdin:{contents:`
export * as T from 'three';
export * from './src/game/render3d/CreatureModels.ts';
export * from './src/game/render3d/CreatureCatalog.ts';
export * from './src/game/world/RegionGeography.ts';
export * from './src/game/world/WorldTerrain.ts';
export * from './src/game/world/ReleaseRegionMap.ts';
export * from './src/game/render3d/GeographyModels.ts';
export * from './src/game/render3d/BossTelegraph3D.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/"'}});
const a=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const bossBounds=new Set();let triangles=0;
for(const [id,identity] of Object.entries(a.CREATURE_CATALOG)){
  if(identity.asset)continue; // Native GLB animations are checked in the browser.
  for(const elite of identity.boss?[true]:[false,true]){
    const model=a.createCreature(id,0x6e775f,0xc5a987,elite,identity.boss?55:25);
    const pose=(phase,progress)=>model.step(0,0,false,phase!=='idle',undefined,undefined,undefined,{phase,progress,hit:0});
    const transforms=()=>{const values=[];model.root.traverse(o=>values.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()));return values;};
    pose('windup',1);const atContact=transforms();pose('strike',0);
    assert.deepEqual(transforms(),atContact,id+' must not snap between preparation and contact');
    for(const phase of ['idle','windup','strike'])for(const progress of [0,.4,.78,1]){
      pose(phase,progress);model.root.updateMatrixWorld(true);
      const poseBounds=new a.T.Box3().setFromObject(model.root);
      assert(poseBounds.min.y>-65,`${id} ${phase}/${progress} crosses ground: ${poseBounds.min.y}`);
      model.root.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite),id+' combat pose is finite'));
    }
    model.root.position.set(1234,30,-400);
    model.step(.05,180,false,true,undefined,undefined,undefined,{phase:'windup',progress:.78,hit:1});
    assert.deepEqual(model.root.position.toArray(),[1234,30,-400],id+' visual motion must not move the gameplay root');
    model.root.position.set(0,0,0);
    for(let i=0;i<90;i++)model.step(1/30,i<60?140:0,false,i%25<8);
    model.root.updateMatrixWorld(true);
    const bounds=new a.T.Box3().setFromObject(model.root),size=bounds.getSize(new a.T.Vector3());
    assert(size.x>10&&size.y>10&&size.z>10,id+' has volume');
    assert(size.length()<1100&&bounds.min.y>-65,`${id} readable animation bounds: size ${size.toArray()}, floor ${bounds.min.y}`);
    let count=0;model.root.traverse(o=>{
      assert(o.matrixWorld.elements.every(Number.isFinite),id+' finite transform');
      if(o instanceof a.T.Mesh){const p=o.geometry.attributes.position;assert([...p.array].every(Number.isFinite),id+' finite geometry');count+=(o.geometry.index?.count??p.count)/3;}
    });
    triangles=Math.max(triangles,count);
    if(identity.boss){assert(model.root.children.some(o=>o.userData.bossDesign===id),id+' explicit boss design');bossBounds.add(size.toArray().map(n=>Math.round(n)).join(','));}
    model.dispose?.();
  }
}
assert.equal(bossBounds.size,24,'Each of 24 boss designs must have distinct proportions');
const rows=[];
for(const region of a.RELEASE_REGIONS){
  const heights=[];let slope=0;
  for(let ix=-8;ix<=8;ix++)for(let iy=-8;iy<=8;iy++){
    const p=a.regionPointAt(region,ix/10,iy/10),h=a.plateauHeight(region,p.x,p.y);heights.push(h);
    const hx=a.plateauHeight(region,p.x+5,p.y),hy=a.plateauHeight(region,p.x,p.y+5);slope=Math.max(slope,Math.hypot(hx-h,hy-h)/5);
  }
  const relief=Math.max(...heights)-Math.min(...heights);assert(relief>75,'Region '+region.id+' visible relief');assert(slope<1.6,'Region '+region.id+' no vertical wall across walkable land');
  const warning=a.createBossTelegraph({shape:'circle',x:region.center[0],y:region.center[1],radius:240});
  const vertices=warning.geometry.attributes.position;
  assert(vertices.count>400,'Circular warning needs interior terrain samples');
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),z=vertices.getZ(i);
    assert(Math.hypot(x-region.center[0],z-region.center[1])<=240.01,'Warning expands outside damage radius');
    assert(Math.abs(vertices.getY(i)-a.terrainHeight(x,z)-10)<.01,'Warning follows actual terrain');
  }
  a.disposeBossTelegraph(warning);
  const landmarks=a.GEOGRAPHY_LANDMARKS.filter(p=>p.region===region.id);assert(landmarks.length>0,'Region '+region.id+' landmark');
  rows.push({region:region.id,relief:Math.round(relief),slope:slope.toFixed(2),landmarks:landmarks.length});
  for(const site of landmarks){
    assert(a.pointInRegion(region,site.x,site.y));assert(a.distanceToRegionBoundary(region,site.x,site.y)>site.radius+70);
    assert(!a.geographyAreaIsClear(site.x,site.y,30),'Landmark footprint reserved');
    const model=a.createGeographyLandmark(site),bounds=new a.T.Box3().setFromObject(model);
    assert(bounds.max.y>bounds.min.y+20,'Landmark has actual 3D height');
    assert(Math.max(bounds.max.x-site.x,site.x-bounds.min.x,bounds.max.z-site.y,site.y-bounds.min.z)<site.radius+35,'Landmark matches collision footprint');
  }
}
console.table(rows);console.log(`Geography/art: PASS — 24 distinct bosses, all procedural species animated, continuous attack contact, combat pose floor/finite bounds, unchanged gameplay roots, max ${triangles} triangles/model, protected scenic footprints and 8 landforms.`);
