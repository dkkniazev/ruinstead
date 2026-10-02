import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createHash} from 'node:crypto';
// External Three keeps the authoring tool and the modifier on one class identity.
const file=path.resolve('node_modules/.cache/ruinstead-creature-sculpt-authoring.mjs');
await fs.mkdir(path.dirname(file),{recursive:true});
await build({stdin:{contents:`export * from './src/game/render3d/CreatureModels.ts';export * from './src/game/render3d/CreatureCatalog.ts';export * from './src/game/render3d/CreatureSculpt.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:file,packages:'external',define:{'import.meta.env.BASE_URL':'"/"'}});
const {createCreature,CREATURE_CATALOG,authoredCreatureSurfaces,CREATURE_SCULPT_REVISION}=await import('file:///'+file.replaceAll('\\','/'));
for(const [id,identity]of Object.entries(CREATURE_CATALOG))for(const elite of identity.boss?[true]:[false,true]){
  const model=createCreature(id,0x728065,0xbca97c,elite,25);model.dispose();
}
const modifier=new SimplifyModifier(),entries=[],chunks=[];let offset=0,before=0,after=0;
function append(array){const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}const start=offset,bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);chunks.push(bytes);offset+=bytes.length;return start;}
for(const [key,source]of authoredCreatureSurfaces()){
  const welded=mergeVertices(source,1e-4),count=welded.getAttribute('position').count;
  // Keep facial cavities / ear rims denser. Normals guide edge collapses, so the
  // continuous outline survives instead of becoming a coarse marching grid.
  const ratio=key.startsWith('goblin-head')?.34:key==='goblin-ear'?.7:key.startsWith('profile-')||key.startsWith('goblin-vest-')?.82:.28;
  const geometry=count>150?await modifier.modify(welded,Math.floor(count*(1-ratio))):welded;
  const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),c=geometry.getAttribute('color'),ix=geometry.getIndex();
  if(p.count>65535)throw Error('Sculpt surface exceeds 16-bit vertex budget: '+key);
  const positions=new Float32Array(p.count*3),normals=new Int16Array(p.count*3),colors=c?new Uint8Array(p.count*3):undefined;
  for(let i=0;i<p.count;i++)for(let j=0;j<3;j++){
    positions[i*3+j]=p.getComponent(i,j);normals[i*3+j]=Math.round(Math.max(-1,Math.min(1,n.getComponent(i,j)))*32767);
    if(colors)colors[i*3+j]=Math.round(Math.max(0,Math.min(1,c.getComponent(i,j)))*255);
  }
  const indices=new Uint16Array(ix.array),entry={key,vertices:p.count,triangles:indices.length/3,position:append(positions),normal:append(normals),...(colors?{color:append(colors)}:{}),index:append(indices)};
  entries.push(entry);before+=(source.index?.count??source.getAttribute('position').count)/3;after+=entry.triangles;
  if(geometry!==welded)geometry.dispose();welded.dispose();
}
const directory=path.resolve('public/assets/models/creature-sculpt');await fs.mkdir(directory,{recursive:true});
await fs.writeFile(path.join(directory,'surfaces.bin'),Buffer.concat(chunks));
const authoringFiles=['CreatureSculpt.ts','CreatureCatalog.ts','CreatureArt.ts','CreatureAnatomy.ts','CreatureModels.ts'];
const hash=createHash('sha256');for(const source of authoringFiles)hash.update(await fs.readFile(path.join('src/game/render3d',source)));
await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({revision:CREATURE_SCULPT_REVISION,authoringHash:hash.digest('hex'),entries}));
console.log(`Creature sculpt bake: ${entries.length} shared surfaces, ${before} → ${after} triangles, ${(offset/1024).toFixed(0)} KiB. No gameplay data changed.`);
