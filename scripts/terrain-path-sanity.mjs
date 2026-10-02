import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle=await build({stdin:{contents:`
export * from './src/game/render3d/TerrainMeshes.ts';
export * from './src/game/world/ReleaseRegionMap.ts';
export * from './src/game/world/WorldWatercourses.ts';
export * from './src/game/world/WorldTerrain.ts';
export * from './src/game/render3d/BossTelegraph3D.ts';
export * as T from 'three';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,
plugins:[{name:'phaser-math',setup(b){b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default {Math:{Vector2:class{constructor(x=0,y=0){this.x=x;this.y=y;}}}};'}));}}]});
const api=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
function weights(x,z,[a,b,c]){
  const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
  const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d;
  return [u,v,1-u-v];
}
const rows=[],waterRows=[];
for(const region of api.RELEASE_REGIONS){
  const land=api.createRegionLand(region),cells=new Map();
  for(const mesh of land.children.filter(o=>o.userData.regionSurface)){
    const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i+=3){
      const t=[0,1,2].map(n=>({x:p.getX(i+n),y:p.getY(i+n),z:p.getZ(i+n)}));
      const key=Math.floor((t[0].x+t[1].x+t[2].x)/3/80)+':'+Math.floor((t[0].z+t[1].z+t[2].z)/3/80);
      const cell=cells.get(key)??[];cell.push(t);cells.set(key,cell);
    }
  }
  let buried=0,samples=0,worst;
  land.traverse(mesh=>{
    if(!mesh.geometry?.attributes.roadAlpha)return;
    const p=mesh.geometry.attributes.position,alpha=mesh.geometry.attributes.roadAlpha;
    for(let i=0;i<p.count;i+=3)for(const w of [[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]]){
      if(w.reduce((sum,v,n)=>sum+v*alpha.getX(i+n),0)<.4)continue;
      const x=w.reduce((sum,v,n)=>sum+v*p.getX(i+n),0),z=w.reduce((sum,v,n)=>sum+v*p.getZ(i+n),0),y=w.reduce((sum,v,n)=>sum+v*p.getY(i+n),0);
      for(const t of cells.get(Math.floor(x/80)+':'+Math.floor(z/80))??[]){
        const b=weights(x,z,t);if(b.some(n=>n<-.00001))continue;
        const ground=b.reduce((sum,v,n)=>sum+v*t[n].y,0),depth=ground-y;samples++;
        if(depth>buried){buried=depth;worst={x,z};}break;
      }
    }
  });
  assert(samples>100,'Missing road/terrain coverage for region '+region.id);
  rows.push({region:region.id,samples,buried:buried.toFixed(2),worst});
  const renderedHeight=(x,z)=>{
    for(const triangle of cells.get(Math.floor(x/80)+':'+Math.floor(z/80))??[]){
      const b=weights(x,z,triangle);if(b.some(n=>n<-.00001))continue;
      return b.reduce((sum,v,n)=>sum+v*triangle[n].y,0);
    }
    throw new Error('Missing rendered brook bed at '+x+','+z);
  };
  for(const course of api.WORLD_WATERCOURSES.filter(p=>p.region===region.id)){
    let minDepth=Infinity,maxDepth=0;
    for(let i=0;i<course.points.length;i++){
      const p=course.points[i];assert(api.pointInRegion(region,p.x,p.y),'Brook leaves its region');
      if(i)assert(p.level<=course.points[i-1].level,'Water flows uphill');
      const depth=p.level+.8-renderedHeight(p.x,p.y);minDepth=Math.min(minDepth,depth);maxDepth=Math.max(maxDepth,depth);
      assert(depth>=5&&depth<=25,'Visible water intersects or floats above its bed: '+depth);
    }
    const p=course.points[Math.floor(course.points.length*.4)];
    const warning=api.createBossTelegraph({shape:'circle',x:p.x,y:p.y,radius:100});
    const positions=warning.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i);
      assert(Math.abs(positions.getY(i)-api.terrainSurfaceHeight(x,z)-10)<.01,'Warning buried under water or bridge');
    }
    api.disposeBossTelegraph(warning);
    waterRows.push({course:course.id,samples:course.points.length,minDepth:minDepth.toFixed(1),maxDepth:maxDepth.toFixed(1)});
  }
  land.updateMatrixWorld(true);
  for(const bridge of api.BROOK_BRIDGES.filter(p=>p.region===region.id)){
    const model=land.getObjectByName(bridge.id);assert(model,'Brook crossing has no model');
    const count=Math.ceil(bridge.length/22),ray=new api.T.Raycaster();
    for(let i=0;i<count;i++){
      const t=(i+.5)/count,forward=(t-.5)*bridge.length;
      for(const side of [-.4,0,.4]){
        const lateral=side*bridge.width,x=bridge.x+bridge.ux*forward-bridge.uy*lateral,z=bridge.y+bridge.uy*forward+bridge.ux*lateral;
        ray.set(new api.T.Vector3(x,5000,z),new api.T.Vector3(0,-1,0));
        const hit=ray.intersectObject(model,true)[0];assert(hit,'Missing bridge plank');
        assert(Math.abs(hit.point.y-api.terrainHeight(x,z))<.2,`${bridge.id} plank ${i} side ${side}: feet ${api.terrainHeight(x,z)}, deck ${hit.point.y}`);
      }
    }
    for(const t of [0,1]){
      const x=bridge.x+bridge.ux*(t-.5)*bridge.length,z=bridge.y+bridge.uy*(t-.5)*bridge.length;
      assert(Math.abs(api.brookBridgeHeight(bridge,t)-api.plateauHeight(region,x,z))<=2.01,'Bridge landing floats');
    }
  }
}
console.table(rows);
console.table(waterRows);
assert(rows.every(r=>Number(r.buried)<.5),'A path sinks into the actual rendered terrain');
console.log('Terrain paths: PASS — paths stay above rendered hills; downhill brooks have visible shallow beds, warnings stay above water, and bridge feet match actual planks and landings.');
