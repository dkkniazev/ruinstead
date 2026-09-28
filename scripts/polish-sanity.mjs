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
export * from './src/game/layout/Viewport.ts';
`,loader:'ts',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,
plugins:[{name:'math-only-phaser',setup(b){b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`export default {Math:{Vector2:class {constructor(x=0,y=0){this.x=x;this.y=y;}},Distance:{Between:(a,b,c,d)=>Math.hypot(c-a,d-b)}}};`}));}}]});
const api=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text+'\n//# sourceURL=polish-fixture.mjs').toString('base64')}`);
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const resourceA=api.buildResourceNodeDefinitions(123456),resourceB=api.buildResourceNodeDefinitions(123456),resourceC=api.buildResourceNodeDefinitions(654321);
assert.deepEqual(resourceA,resourceB,'Same resource seed must reproduce the exact layout');
assert.notDeepEqual(resourceA.map(n=>[n.x,n.y]),resourceC.map(n=>[n.x,n.y]),'Different seeds must change the procedural layout');
for(let i=0;i<resourceA.length;i++)for(let j=i+1;j<resourceA.length;j++){
  const a=resourceA[i],b=resourceA[j];
  assert(Math.hypot(a.x-b.x,a.y-b.y)>45,'Procedural resource nodes must not stack');
}
const sizes=new Set();let eliteBaseline,minGap=Infinity,total=0;
const layouts=Number(process.argv[2])||24;
for(let seed=1;seed<=layouts;seed++){
  const spawns=api.buildEnemySpawns(seeded(seed));
  const bosses=api.buildBossDefinitions();
  assert.equal(bosses.length,24);
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
