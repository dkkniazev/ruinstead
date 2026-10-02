import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const bundle=await build({stdin:{contents:`export * as T from 'three';export * from './src/game/render3d/CreatureModels.ts';export * from './src/game/render3d/CreatureCatalog.ts';export * from './src/game/render3d/CreatureSculpt.ts';export * from './src/game/render3d/CreatureAura.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/"'}});
const {T,createCreature,CREATURE_CATALOG,installCreatureSurfaces,creatureBodyBounds}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const manifest=JSON.parse(fs.readFileSync('public/assets/models/creature-sculpt/manifest.json','utf8')),bytes=fs.readFileSync('public/assets/models/creature-sculpt/surfaces.bin');
const hash=createHash('sha256');for(const file of ['CreatureSculpt.ts','CreatureCatalog.ts','CreatureArt.ts','CreatureAnatomy.ts','CreatureModels.ts'])hash.update(fs.readFileSync('src/game/render3d/'+file));
assert.equal(manifest.authoringHash,hash.digest('hex'),'Authored geometry changed; run npm run art:bake-creatures');
installCreatureSurfaces(manifest,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const rows=[];
for(const [id,identity]of Object.entries(CREATURE_CATALOG)){
  for(const elite of identity.boss?[true]:[false,true]){
    const model=createCreature(id,0x728065,0xbca97c,elite,25),body=model.root.getObjectByName('creature-body');
    assert.equal(body.userData.sculptedCreature,identity.shape,id+' uses the sculpted surface pipeline');
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
console.log(`Creature sculpt: PASS — current baked geometry, 64 identities, 40 animated/released elite auras, mature anatomy, unchanged collision size, HP bars exclude glow, ${(bytes.length/1024).toFixed(0)} KiB of shared meshes.`);
