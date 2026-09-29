import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Spawn generation uses only Phaser's point/distance helpers. Actual physics
// and aggro are checked separately in the browser playtest.
const result=await build({stdin:{contents:`
export * from './src/game/enemies/EnemySystem.ts';
export * from './src/game/bosses/BossSystem.ts';
export * from './src/game/world/ReleaseWorldContent.ts';
export * from './src/game/world/ReleaseRegionMap.ts';
export * from './src/game/world/WorldPrototype.ts';
export * from './src/game/gathering/ResourceSystem.ts';
export * from './src/game/world/ForestZone.ts';
export * from './src/game/layout/Viewport.ts';
export * from './src/game/world/RegionGeography.ts';
export { distanceToRoad } from './src/game/render3d/BiomeScenery.ts';
export { createRegionLand } from './src/game/render3d/TerrainMeshes.ts';
`,loader:'ts',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,
plugins:[{name:'math-only-phaser',setup(b){b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`export default {Math:{Vector2:class {constructor(x=0,y=0){this.x=x;this.y=y;}},Distance:{Between:(a,b,c,d)=>Math.hypot(c-a,d-b)}}};`}));}}]});
const api=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text+'\n//# sourceURL=polish-fixture.mjs').toString('base64')}`);
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const resourceA=api.buildResourceNodeDefinitions(123456),resourceB=api.buildResourceNodeDefinitions(123456),resourceC=api.buildResourceNodeDefinitions(654321);
for(const site of api.GEOGRAPHY_LANDMARKS){
  const region=api.getRegionDefinition(site.region);
  assert(api.distanceToRoad(region,site.x,site.y)>site.radius+90,site.id+' blocks a curved road');
  for(const offset of [[-.46,-.12],[.5,.25]]){
    const chest=api.regionPointAt(region,...offset);
    assert(Math.hypot(chest.x-site.x,chest.y-site.y)>site.radius+150,site.id+' blocks a chest');
  }
}
assert(resourceA.every(n=>api.geographyAreaIsClear(n.x,n.y,api.resourceFootprintRadius(n.type))),'Resources overlap scenic landmarks');
let terrainTriangles=0;
for(const region of api.RELEASE_REGIONS){
  const land=api.createRegionLand(region),edges=new Map();let area=0;
  for(const mesh of land.children.filter(o=>o.userData.regionSurface)){
    const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
    for(let i=0;i<p.count;i+=3){
      const points=[0,1,2].map(j=>[p.getX(i+j),p.getZ(i+j)]);
      const [a,b,c]=points;area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;terrainTriangles++;
      for(let j=0;j<3;j++){
        assert(n.getY(i+j)>0,'Terrain normals must face up');
        const a=points[j],b=points[(j+1)%3],key=[a.map(v=>Math.round(v*100)).join(','),b.map(v=>Math.round(v*100)).join(',')].sort().join('/');
        const e=edges.get(key)??{count:0,x:(a[0]+b[0])/2,y:(a[1]+b[1])/2};e.count++;edges.set(key,e);
      }
    }
  }
  const expected=Math.abs(region.outline.reduce((sum,p,i)=>{const q=region.outline[(i+1)%region.outline.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
  assert(Math.abs(area-expected)<expected*.00001,'Region '+region.id+' terrain has missing/overlapping area');
  for(const e of edges.values())assert(e.count===2||api.distanceToRegionBoundary(region,e.x,e.y)<.1,'Region '+region.id+' has an interior terrain crack');
  const materials=new Set();land.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.userData.sharedArtMaterial)materials.add(m);});materials.forEach(m=>m.dispose());
}
console.log('Terrain: PASS — '+terrainTriangles+' triangles across 8 regions; complete polygon coverage, shared interior edges and upward normals.');
assert(api.forestLandmarkAreaIsClear(api.FOREST_HEART.x,api.FOREST_HEART.y,0)===false,'Forest heart itself is a reserved landmark');
assert(resourceA.every(node=>Math.hypot(node.x-api.FOREST_HEART.x,node.y-api.FOREST_HEART.y)>220+api.resourceFootprintRadius(node.type)),'Resources must not cover the forest altar');
assert.deepEqual(resourceA,resourceB,'Same resource seed must reproduce the exact layout');
assert.notDeepEqual(resourceA.map(n=>[n.x,n.y]),resourceC.map(n=>[n.x,n.y]),'Different seeds must change the procedural layout');
for(let i=0;i<resourceA.length;i++)for(let j=i+1;j<resourceA.length;j++){
  const a=resourceA[i],b=resourceA[j];
  const minimum=api.resourceFootprintRadius(a.type)+api.resourceFootprintRadius(b.type)+64;
  assert(Math.hypot(a.x-b.x,a.y-b.y)>=minimum,'Procedural resource nodes must preserve authored footprint clearance');
}
for(const species of api.RELEASE_SPECIES){
  const normal=api.enemyAggroDistance(species.id,false,3);
  const largePack=api.enemyAggroDistance(species.id,false,8);
  const elite=api.enemyAggroDistance(species.id,true,3);
  assert(normal>150,'Every archetype needs a meaningful aggro radius');
  assert(largePack>normal,'Larger packs gain a modest awareness radius');
  assert(elite>normal,'Elite awareness exceeds the normal variant');
  assert(api.enemyLeashDistance(species.id,false)>normal*2,'Leash must retain combat beyond initial aggro without permitting map-wide chase');
}
const sizes=new Set();let eliteBaseline,minGap=Infinity,total=0;
const layouts=Number(process.argv[2])||24;
for(let seed=1;seed<=layouts;seed++){
  const spawns=api.buildEnemySpawns(seeded(seed));
  const bosses=api.buildBossDefinitions();
  assert.equal(bosses.length,24);
  for(let region=1;region<=8;region++)assert.equal(bosses.filter(b=>b.region===region&&b.isMain).length,1,'Every region has exactly one main boss for map/progression highlighting');
  for(const boss of bosses){
    assert(api.pointInRegion(api.getRegionDefinition(boss.region),boss.x,boss.y));
    assert(api.resourceNodeAreaIsClear(boss.x,boss.y,185),`${boss.id}: resource at boss spawn`);
    assert(spawns.every(s=>Math.hypot(s.x-boss.x,s.y-boss.y)>api.enemyDisplayStats(s.species,s.rank==='elite').radius+boss.bodyRadius+20),`${boss.id}: mob at boss spawn (seed ${seed})`);
  }
  const elites=spawns.filter(s=>s.rank==='elite');assert.equal(elites.length,120);
  for(const species of api.RELEASE_SPECIES)assert.equal(elites.filter(e=>e.species===species.id).length,3);
  if(eliteBaseline)assert.deepEqual(elites,eliteBaseline);else eliteBaseline=elites;
  const groups=new Map();
  for(const spawn of spawns.filter(s=>s.rank==='normal')){
    const region=api.getRegionDefinition(api.RELEASE_SPECIES.find(s=>s.id===spawn.species).region);
    assert(api.pointInRegion(region,spawn.x,spawn.y),'Outside region');
    const radius=api.enemyDisplayStats(spawn.species).radius*1.5;
    assert(api.distanceToRegionBoundary(region,spawn.x,spawn.y)>radius+24);
    assert(api.resourceNodeAreaIsClear(spawn.x,spawn.y,radius+20),'Resource overlap');
    if(region.id===1)assert(Math.hypot(spawn.x-api.SETTLEMENT_CENTER.x,spawn.y-api.SETTLEMENT_CENTER.y)>api.SETTLEMENT_SAFE_RADIUS+radius+70);
    const group=groups.get(spawn.groupId)??[];group.push(spawn);groups.set(spawn.groupId,group);
  }
  assert.equal(groups.size,120);
  for(const group of groups.values()){
    assert(group.length>=3&&group.length<=8);sizes.add(group.length);total+=group.length;
    for(const a of group)for(const b of group)assert(Math.hypot(a.x-b.x,a.y-b.y)<440,'Pack too spread out');
  }
  for(let i=0;i<spawns.length;i++)for(let j=i+1;j<spawns.length;j++){
    const a=spawns[i],b=spawns[j];
    const gap=Math.hypot(a.x-b.x,a.y-b.y)-api.enemyDisplayStats(a.species,a.rank==='elite').radius-api.enemyDisplayStats(b.species,b.rank==='elite').radius;
    assert(gap>=38-1e-6,'Bodies overlap / insufficient gap');minGap=Math.min(minGap,gap);
  }
}
assert.deepEqual([...sizes].sort(),[3,4,5,6,7,8]);
for(const [w,h] of [[1280,720],[1024,768],[844,390],[1600,700],[390,844],[2560,1440],[3840,2160]])for(const dpr of [1,2,3]){
  const m=api.calculateViewportMetrics(w,h,dpr);
  assert.equal(m.cssWidth,w);assert.equal(m.cssHeight,h);
  assert(Math.abs(m.renderWidth*m.canvasCssZoom-w)<=1);
  assert(Math.abs(m.renderHeight*m.canvasCssZoom-h)<=1);
  assert(m.renderHeight<=2160);
}
console.log(`Polish: PASS — ${layouts} layouts, ${layouts*120} normal packs, sizes 3–8, ${total} normal mobs, 120 elites/layout, min body gap ${minGap.toFixed(1)}. Viewport: 7 aspect/size cases × 3 DPRs fill exactly.`);
