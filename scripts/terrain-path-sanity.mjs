import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle=await build({stdin:{contents:`
export * from './src/game/render3d/TerrainMeshes.ts';
export * from './src/game/world/ReleaseRegionMap.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,
plugins:[{name:'phaser-math',setup(b){b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default {Math:{Vector2:class{constructor(x=0,y=0){this.x=x;this.y=y;}}}};'}));}}]});
const api=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
function weights(x,z,[a,b,c]){
  const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
  const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d;
  return [u,v,1-u-v];
}
const rows=[];
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
}
console.table(rows);
assert(rows.every(r=>Number(r.buried)<.5),'A path sinks into the actual rendered terrain');
console.log('Terrain paths: PASS — path surfaces stay above the rendered hills.');
