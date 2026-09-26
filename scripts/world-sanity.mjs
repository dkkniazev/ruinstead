import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({ stdin: { contents: `
  export * from './src/game/world/ReleaseRegionMap.ts';
  export * from './src/game/world/WorldTerrain.ts';
`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false });
const world = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const { RELEASE_REGIONS, RELEASE_PASSAGES, getPassageGeometry, getRegionDefinition,
  pointInRegion, regionPointAt, terrainHeight, sampleBoundaryTerrain } = world;
const rows = [];
for (const region of RELEASE_REGIONS) {
  assert(pointInRegion(region, ...region.center), `R${region.id}: center is outside the authored polygon`);
  let diameter = 0;
  for (const a of region.outline) for (const b of region.outline) diameter = Math.max(diameter, Math.hypot(a[0]-b[0],a[1]-b[1]));
  assert(diameter / 225 < 30, `R${region.id}: traversal exceeds 30 seconds`);
  for(let angle=0;angle<Math.PI*2;angle+=0.09) for(const ratio of [0.3,0.6,0.88]) {
    const point=regionPointAt(region,Math.cos(angle)*ratio,Math.sin(angle)*ratio);
    assert(pointInRegion(region,point.x,point.y), `R${region.id}: farming point outside polygon`);
  }
  rows.push({region:region.id,elevation:region.elevation,diameter:Math.round(diameter),runSeconds:+(diameter/225).toFixed(1)});
}
for(const passage of RELEASE_PASSAGES) {
  const geometry=getPassageGeometry(passage);
  assert(pointInRegion(getRegionDefinition(passage.a),geometry.a.x,geometry.a.y),`${passage.id}: start misses land`);
  assert(pointInRegion(getRegionDefinition(passage.b),geometry.b.x,geometry.b.y),`${passage.id}: end misses land`);
  for(let i=0;i<=20;i++) {
    const t=i/20,x=geometry.a.x+(geometry.b.x-geometry.a.x)*t,y=geometry.a.y+(geometry.b.y-geometry.a.y)*t;
    assert(Number.isFinite(terrainHeight(x,y)),`${passage.id}: invalid ramp elevation`);
    for(const region of RELEASE_REGIONS) if(region.id!==passage.a && region.id!==passage.b)
      assert(!pointInRegion(region,x,y),`${passage.id}: crosses unrelated R${region.id}`);
  }
}
for(const [x,y,compact] of [[4000,4750,true],[1700,4400,true],[15500,21500,false]]) {
  const p=world.migrateLegacyWorldPosition(x,y,compact);
  assert(world.getRegionAt(p),'migration put player outside a region');
}
const kinds=new Set();
for(let x=1000;x<14000;x+=350) for(let y=1400;y<16000;y+=350) {
  const sample=sampleBoundaryTerrain(x,y);assert(Number.isFinite(sample.height));kinds.add(sample.kind);
}
for(const kind of ['river','mountains','cliff','lava']) assert(kinds.has(kind),`Missing ${kind} border`);
console.table(rows);
console.log('World geometry: PASS (polygons, traversal, passages, terrain, save migration)');
