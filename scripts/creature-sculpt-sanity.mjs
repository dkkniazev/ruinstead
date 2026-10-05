import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const bundle=await build({stdin:{contents:`export * as T from 'three';export * from './src/game/render3d/CreatureModels.ts';export * from './src/game/render3d/CreatureCatalog.ts';export * from './src/game/render3d/CreatureSculpt.ts';export * from './src/game/render3d/CreatureAura.ts';export * from './src/game/render3d/MammalForms.ts';export * from './src/game/render3d/HumanoidForms.ts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/"'}});
const {T,createCreature,CREATURE_CATALOG,CREATURE_SCULPT_REVISION,GOBLIN_FACE,MAMMAL_FORMS,HUMANOID_FORMS,preloadCreatureSurfaces,installCreatureSurfaces,authoredCreatureSurfaces,creatureBodyBounds}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const manifest=JSON.parse(fs.readFileSync('public/assets/models/creature-sculpt/manifest.json','utf8')),bytes=fs.readFileSync('public/assets/models/creature-sculpt/surfaces.bin');
const hash=createHash('sha256');for(const file of ['CreatureSculpt.ts','CreatureCatalog.ts','CreatureArt.ts','CreatureAnatomy.ts','CreatureModels.ts','MammalForms.ts','HumanoidForms.ts','ReptileForms.ts'])hash.update(fs.readFileSync('src/game/render3d/'+file));
assert.equal(manifest.authoringHash,hash.digest('hex'),'Authored geometry changed; run npm run art:bake-creatures');
installCreatureSurfaces(manifest,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
// Pack clones must share heavy geometry, but never share an animated skeleton,
// mutable face/aura material, or release geometry still used by another unit.
for(const id of ['goblin','boar','cave-bat','sun-scorpion','magma-hound','lava-elemental']){
  const a=createCreature(id,0x728065,0xbca97c,true,25),b=createCreature(id,0x728065,0xbca97c,true,25);
  const am=[],bm=[];a.root.traverse(o=>{if(o instanceof T.Mesh)am.push(o);});b.root.traverse(o=>{if(o instanceof T.Mesh)bm.push(o);});
  assert.equal(am.length,bm.length,id+' cloned topology');
  am.forEach((mesh,i)=>{
    assert.equal(mesh.geometry,bm[i].geometry,id+' immutable geometry is reused');
    if(mesh.userData.ownedMaterial||mesh.userData.visualEffect)assert.notEqual(mesh.material,bm[i].material,id+' mutable instance material');
    if(mesh instanceof T.SkinnedMesh){
      assert.notEqual(mesh.skeleton,bm[i].skeleton,id+' independent skeleton');
      mesh.skeleton.bones.forEach((bone,n)=>assert.notEqual(bone,bm[i].skeleton.bones[n],id+' independent bones'));
    }
  });
  b.root.updateMatrixWorld(true);const rest=[];b.root.traverse(o=>rest.push(o.matrixWorld.toArray()));
  a.step(.03,150,false,true,undefined,undefined,undefined,{phase:'strike',progress:.4,hit:0});a.root.updateMatrixWorld(true);
  b.root.updateMatrixWorld(true);let at=0;b.root.traverse(o=>assert.deepEqual(o.matrixWorld.toArray(),rest[at++],id+' another actor cannot change this pose'));
  const ownedIndex=am.findIndex(m=>m.userData.ownedMaterial),batch=am.find(m=>m.userData.batchedGeometry);
  let otherDisposed=false,geometryDisposed=false;
  if(ownedIndex>=0)bm[ownedIndex].material.addEventListener('dispose',()=>{otherDisposed=true;});
  batch?.geometry.addEventListener('dispose',()=>{geometryDisposed=true;});
  a.dispose();a.dispose();assert(!otherDisposed&&!geometryDisposed,id+' one actor cannot dispose another actor/template');
  b.step(.016,100,false,true);b.root.updateMatrixWorld(true);
  b.dispose();assert(ownedIndex<0||otherDisposed,id+' releases instance material');
  assert(!batch||geometryDisposed,id+' releases owned template batch after final instance');
}
// Long surfaces once reached MarchingCubes' omitted boundary samples and lost
// the front of their muzzle/shell. Check the actual baked triangle boundary.
for(const [key,geometry]of authoredCreatureSurfaces()){
  const p=geometry.attributes.position,ix=geometry.index,edges=new Map();
  const pointKey=n=>[p.getX(n),p.getY(n),p.getZ(n)].map(v=>v.toFixed(3)).join(',');
  for(let n=0;n<ix.count;n+=3)for(let i=0;i<3;i++){
    const a=pointKey(ix.getX(n+i)),b=pointKey(ix.getX(n+(i+1)%3));if(a===b)continue;
    const edge=[a,b].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);
  }
  for(const count of edges.values())assert(count%2===0,key+' has no open triangle boundary after baking');
}
for(const [key,geometry]of authoredCreatureSurfaces())if(key.startsWith('profile-feather-fan-')||key.startsWith('profile-reptile-wing-')&&key!=='profile-reptile-wing-arm'&&!key.startsWith('profile-reptile-wing-finger-')){
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
// A single connected skin must deform across joints, rather than hide disconnected
// rigid volumes behind a common group name. Exercise the actual baked topology.
for(const elite of [false,true]){
  const creature=createCreature('goblin',0x728065,0xbca97c,elite,25);
  const skin=creature.root.getObjectByName('goblin-continuous-surface');
  assert(skin instanceof T.SkinnedMesh,'Goblin body is a deformable skin');
  const initialBounds=creatureBodyBounds(creature.root);
  const shift=new T.Vector3(123,20,-49);
  creature.root.position.copy(shift);creature.root.scale.multiplyScalar(1.7);
  const placedBounds=creatureBodyBounds(creature.root);
  assert(placedBounds.min.distanceTo(initialBounds.min.clone().multiplyScalar(1.7).add(shift))<1e-4,'Skin bounds follow translation/scale before a renderer frame');
  assert(placedBounds.max.distanceTo(initialBounds.max.clone().multiplyScalar(1.7).add(shift))<1e-4,'Skin bounds never apply the actor transform twice');
  creature.root.position.set(0,0,0);creature.root.scale.divideScalar(1.7);
  const geometry=skin.geometry,p=geometry.attributes.position,index=geometry.index;
  const parent=Array.from({length:p.count},(_,i)=>i),weld=new Map();
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const join=(a,b)=>{parent[find(a)]=find(b);};
  for(let i=0;i<p.count;i++){
    const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(3)).join(',');
    if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);
    const w=geometry.attributes.skinWeight;
    assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5,'Normalized skin weights');
  }
  for(let n=0;n<index.count;n+=3){join(index.getX(n),index.getX(n+1));join(index.getX(n),index.getX(n+2));}
  assert.equal(new Set(parent.map((_,i)=>find(i))).size,1,'Head, ears, torso, arms and legs form one connected mesh');
  // Low fists overlap the pelvis in Y. Height-only weighting previously pulled
  // the palm down with a thigh while the weapon socket followed the shoulder.
  let palmVertices=0;
  for(let i=0;i<p.count;i++){
    if(p.getY(i)>33&&p.getY(i)<46&&Math.abs(p.getX(i))>21&&Math.abs(p.getX(i))<32&&p.getZ(i)<11){
      const arm=p.getX(i)>0?3:2,w=geometry.attributes.skinWeight,j=geometry.attributes.skinIndex;
      let attached=0;for(let n=0;n<4;n++)if(j.getComponent(i,n)===arm)attached+=w.getComponent(i,n);
      assert(attached>.999,'Every palm surface follows its weapon arm, not a leg');palmVertices++;
    }
  }
  assert(palmVertices>20,'Baked skin preserves enough palm vertices for attachment review');
  let outerBootVertices=0;
  for(let i=0;i<p.count;i++){
    if(p.getY(i)>=18)continue;
    const knee=p.getX(i)>0?7:6,w=geometry.attributes.skinWeight,j=geometry.attributes.skinIndex;
    let attached=0;for(let n=0;n<4;n++)if(j.getComponent(i,n)===knee)attached+=w.getComponent(i,n);
    assert(attached>.999,'The entire boot follows its leg, including the wider elite toe');
    if(Math.abs(p.getX(i))>19)outerBootVertices++;
  }
  if(elite)assert(outerBootVertices>0,'Regression exercises elite boots wider than the old hand/leg cutoff');
  // Eyes now live on the face skin. Checking only a rigid eye's neck parent
  // missed whites/pupils floating ahead of the actual skull surface.
  assert(!creature.root.getObjectByName('creature-eye'),'Goblin has no separate eye layers ahead of its skin');
  // Attachment alone missed eye paint spilling over the protruding nasal tip.
  // The complete slanted aperture, including its lower inner corner, stays above
  // that volume and leaves an unpainted bridge between the two eye whites.
  const f=GOBLIN_FACE;
  const eyeBottom=f.eyeY-Math.hypot(f.eyeHeight,f.eyeWidth*f.eyeSlope);
  assert(eyeBottom>f.nose[1]+f.nose[4]+1,'The entire eye aperture sits above the nose tip');
  assert(f.eyeX-f.eyeWidth>5,'The white leaves a clear central nasal bridge');
  const eyeSamples=[];
  for(let i=0;i<p.count;i++){
    const ax=Math.abs(p.getX(i));
    const orbital=Math.hypot((ax-f.eyeX)/f.eyeWidth,(p.getY(i)-f.eyeY+(ax-f.eyeX)*f.eyeSlope)/f.eyeHeight);
    if(orbital>1.05||p.getZ(i)<12)continue;
    eyeSamples.push(i);
    const w=geometry.attributes.skinWeight,j=geometry.attributes.skinIndex;
    let headWeight=0;for(let n=0;n<4;n++)if(j.getComponent(i,n)===1)headWeight+=w.getComponent(i,n);
    assert(headWeight>.999,'Every visible eye region deforms with the actual head');
  }
  for(const side of [-1,1])assert(eyeSamples.filter(i=>Math.sign(p.getX(i))===side).length>=4,'Both baked eye regions contain head-skin vertices');
  const samples=Array.from({length:80},(_,i)=>Math.floor(i*(p.count-1)/79));
  const frame=(phase,progress,speed=0)=>{
    creature.step(.016,speed,false,phase!=='idle',undefined,undefined,undefined,{phase,progress,hit:0});
    creature.root.updateMatrixWorld(true);skin.skeleton.update();
    return samples.map(i=>skin.getVertexPosition(i,new T.Vector3()));
  };
  const rest=frame('idle',0);
  const head=creature.root.getObjectByName('creature-neck');
  const restHeadInverse=head.matrixWorld.clone().invert();
  const eyeRest=eyeSamples.map(i=>skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld));
  const assertEyeSurface=()=>{
    const delta=new T.Matrix4().multiplyMatrices(head.matrixWorld,restHeadInverse);
    eyeSamples.forEach((i,n)=>{
      const actual=skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld);
      assert(actual.distanceTo(eyeRest[n].clone().applyMatrix4(delta))<1e-4,'Eye-bearing skin stays on the skull across the animated pose');
    });
  };
  let deformation=0;
  for(let i=0;i<25;i++){
    const pose=frame(i<16?'windup':'strike',i<16?i/15:(i-16)/8);
    pose.forEach((v,j)=>{assert(v.toArray().every(Number.isFinite),'Finite skinned attack vertices');deformation=Math.max(deformation,v.distanceTo(rest[j]));});
    assertEyeSurface();
  }
  assert(deformation>10,'The body actually deforms with its attack joints');
  for(const v of frame('idle',0,140))assert(v.toArray().every(Number.isFinite),'Finite skinned gait vertices');
  assertEyeSurface();
  let geometryDisposed=false,materialDisposed=false;
  geometry.addEventListener('dispose',()=>{geometryDisposed=true;});
  skin.material.addEventListener('dispose',()=>{materialDisposed=true;});
  creature.dispose();assert(!geometryDisposed,'Disposing a goblin keeps its shared skin geometry reusable');
  assert(materialDisposed,'Each goblin releases its owned costume material');
}
// Compare actual world-space silhouettes, not individually fitted portraits.
for(const [id,identity] of Object.entries(CREATURE_CATALOG)){
  const form=MAMMAL_FORMS[identity.shape];if(!form)continue;
  for(const elite of identity.boss?[true]:[false,true]){
    const model=createCreature(id,0x728065,0xbca97c,elite,25),skin=model.root.getObjectByName('mammal-continuous-surface');
    assert(skin instanceof T.SkinnedMesh,id+' uses actual deformable mammal anatomy');
    if(identity.boss){let ornaments=0;model.root.traverse(o=>{if(o instanceof T.Mesh)ornaments+=o.userData.bossOrnamentCount??(o.userData.bossOrnament?1:0);});assert(ornaments>=6,id+' keeps its unique crystal/obsidian/predator boss design');}
    assert(!model.root.getObjectByName('creature-eye'),id+' eyes belong to the skin');
    const geometry=skin.geometry,p=geometry.attributes.position,ix=geometry.index,j=geometry.attributes.skinIndex,w=geometry.attributes.skinWeight;
    const parent=Array.from({length:p.count},(_,i)=>i),weld=new Map();
    const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
    const join=(a,b)=>{parent[find(a)]=find(b);};
    const attached=(i,bone)=>{let value=0;for(let n=0;n<4;n++)if(j.getComponent(i,n)===bone)value+=w.getComponent(i,n);return value;};
    const eyes=[],feet=[];
    for(let i=0;i<p.count;i++){
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(3)).join(',');
      if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);
      assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5,id+' normalized skin weights');
      const eye=Math.hypot((Math.abs(p.getX(i))-form.eyeX)/(identity.shape==='boar'?4:3.8),(p.getY(i)-form.eyeY+(Math.abs(p.getX(i))-form.eyeX)*.12)/3.1);
      if(eye<1.1&&p.getZ(i)>form.eyeZ&&p.getZ(i)<57){assert(attached(i,1)>.999,id+' painted eye follows head');eyes.push(i);}
      if(p.getY(i)<8){const bone=3+(p.getX(i)>0?2:0)+(p.getZ(i)>1?1:0);assert(attached(i,bone)>.999,id+' whole paw follows its own leg');feet.push([i,bone]);}
    }
    for(let n=0;n<ix.count;n+=3){join(ix.getX(n),ix.getX(n+1));join(ix.getX(n),ix.getX(n+2));}
    assert.equal(new Set(parent.map((_,i)=>find(i))).size,1,id+' head/ears/body/legs/tail are connected');
    for(const side of [-1,1])assert(eyes.filter(i=>Math.sign(p.getX(i))===side).length>=4,id+' both skin eyes are exercised');
    for(const bone of [3,4,5,6])assert(feet.filter(([,b])=>b===bone).length>6,id+' exercises all four paws');
    const jaw=model.root.getObjectByName('creature-jaw');assert(jaw&&!jaw.children.some(o=>o instanceof T.Mesh),id+' has no old rigid jaw overlay');
    const frame=(phase,progress,speed=0)=>{model.step(.016,speed,false,phase!=='idle',undefined,undefined,undefined,{phase,progress,hit:0});model.root.updateMatrixWorld(true);skin.skeleton.update();};
    frame('idle',0);const head=skin.skeleton.bones[1],inverse=head.matrixWorld.clone().invert();
    const eyeRest=eyes.map(i=>skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld));
    const restFrame=skin.matrixWorld.clone(),faceRay=new T.Raycaster(),eyePoints=[];
    if(identity.boss){
      const restSurface=new T.Mesh(skin.geometry);restSurface.updateMatrixWorld(true);
      for(const side of [-1,1])for(const [dx,dy]of [[0,0],[-2.6,0],[2.6,0],[0,-1.4],[0,1.4]]){
        faceRay.set(new T.Vector3(side*form.eyeX+dx,form.eyeY+dy,150),new T.Vector3(0,0,-1));
        const hit=faceRay.intersectObject(restSurface,false)[0];assert(hit,id+' eye visibility probe lies on the skull');
        eyePoints.push(hit.point.clone().applyMatrix4(restFrame));
      }
      restSurface.material.dispose();
    }
    for(let n=0;n<45;n++){
      frame(n<30?'windup':'strike',n<30?n/29:(n-30)/14,n<15?140:0);
      const delta=new T.Matrix4().multiplyMatrices(head.matrixWorld,inverse);
      eyes.forEach((i,k)=>assert(skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld).distanceTo(eyeRest[k].clone().applyMatrix4(delta))<1e-4,id+' eyes remain seated during gait/attack'));
      // Body-fixed boss ornaments can cover the animated face. Head attachment
      // alone cannot detect that obstruction; inspect the complete model.
      for(const [k,point]of eyePoints.entries())for(const view of [[0,0,1],[0,.85,1],[-.55,.85,1],[.55,.85,1]]){
        const outward=new T.Vector3(...view).transformDirection(model.root.matrixWorld);
        faceRay.set(point.clone().applyMatrix4(delta).addScaledVector(outward,200),outward.clone().negate());
        const first=faceRay.intersectObject(model.root,true).find(hit=>{
          for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;
          return !(Array.isArray(hit.object.material)?hit.object.material:[hit.object.material]).every(m=>m.transparent);
        });
        assert(first?.object===skin,`${id} eye remains visible past boss ornaments at attack sample ${n}, aperture probe ${k}, view ${view}`);
      }
      for(let i=0;i<p.count;i+=9)assert(skin.getVertexPosition(i,new T.Vector3()).toArray().every(Number.isFinite),id+' finite deformed skin');
      const size=creatureBodyBounds(model.root).getSize(new T.Vector3());assert(size.length()<600,id+' no long stretched jaw/paw skin triangles');
    }
    let geometryDisposed=false,materialDisposed=false;
    geometry.addEventListener('dispose',()=>{geometryDisposed=true;});skin.material.addEventListener('dispose',()=>{materialDisposed=true;});
    const bones=[...skin.skeleton.bones];model.dispose();
    assert(!geometryDisposed&&materialDisposed,id+' reuses geometry and releases instance material');
    assert(bones.every(b=>b.parent===null),id+' releases instance bone anchors');
  }
}
// Exercise the new humanoid skin itself, not merely the old empty joint groups.
for(const [id,identity] of Object.entries(CREATURE_CATALOG)){
  const form=HUMANOID_FORMS[identity.shape];if(!form)continue;
  for(const elite of identity.boss?[true]:[false,true]){
    const model=createCreature(id,0x728065,0xbca97c,elite,25),skin=model.root.getObjectByName('humanoid-continuous-surface');
    assert(skin instanceof T.SkinnedMesh,id+' has connected deformable humanoid anatomy');
    assert(!model.root.getObjectByName('creature-eye'),id+' eyes are painted on the head skin');
    const p=skin.geometry.attributes.position,ix=skin.geometry.index,j=skin.geometry.attributes.skinIndex,w=skin.geometry.attributes.skinWeight;
    const parent=Array.from({length:p.count},(_,i)=>i),weld=new Map(),eyes=[],palms=[[],[]];
    const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
    const join=(a,b)=>{parent[find(a)]=find(b);};
    const weight=(i,b)=>{let v=0;for(let n=0;n<4;n++)if(j.getComponent(i,n)===b)v+=w.getComponent(i,n);return v;};
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x),side=x>0?1:0;
      const key=[x,y,z].map(v=>v.toFixed(3)).join(',');if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);
      assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5,id+' normalized joint weights');
      const eye=Math.hypot((ax-form.eyeX)/form.eyeWidth,(y-form.eyeY+(ax-form.eyeX)*GOBLIN_FACE.eyeSlope)/form.eyeHeight);
      if(eye<1.1&&z>12){assert(weight(i,1)>.999,id+' eyes follow the head');eyes.push(i);}
      if(y>35&&y<44&&ax>(form.width>20?31:24)&&z<11){assert(weight(i,2+side)>.999,id+' fist follows its weapon arm');palms[side].push(i);}
      if(y<18)assert(weight(i,6+side)>.999,id+' entire boot follows its knee');
    }
    for(let n=0;n<ix.count;n+=3){join(ix.getX(n),ix.getX(n+1));join(ix.getX(n),ix.getX(n+2));}
    assert.equal(new Set(parent.map((_,i)=>find(i))).size,1,id+' skull, torso, palms and feet form one connected surface');
    // Eye colour is evaluated per fragment: a low density mesh need not have a
    // vertex inside each tiny aperture. Probe its actual containing triangles.
    const restSurface=new T.Mesh(skin.geometry),ray=new T.Raycaster();restSurface.updateMatrixWorld(true);
    for(const s of [-1,1])for(const offset of [-.5,0,.5]){
      ray.set(new T.Vector3(s*form.eyeX,form.eyeY+offset*form.eyeHeight,150),new T.Vector3(0,0,-1));
      const hit=ray.intersectObject(restSurface,false)[0];assert(hit?.face,id+' eye has an actual face surface underneath');
      for(const i of [hit.face.a,hit.face.b,hit.face.c]){assert(weight(i,1)>.999,id+' complete painted-eye triangle follows the head');if(!eyes.includes(i))eyes.push(i);}
    }
    restSurface.material.dispose();
    if(identity.shape!=='harpy')palms.forEach(a=>assert(a.length>8,id+' both fist regions are exercised'));
    const frame=(phase,progress,speed=0)=>{model.step(.016,speed,false,phase!=='idle',undefined,undefined,undefined,{phase,progress,hit:0});model.root.updateMatrixWorld(true);skin.skeleton.update();};
    frame('idle',0);const anchors=[skin.skeleton.bones[1],skin.skeleton.bones[2],skin.skeleton.bones[3]],samples=[eyes,...palms];
    const inverse=anchors.map(a=>a.matrixWorld.clone().invert());
    const rest=samples.map(a=>a.map(i=>skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld)));
    for(let n=0;n<36;n++){
      frame(n<24?'windup':'strike',n<24?n/23:(n-24)/11,n<12?140:0);
      samples.forEach((a,b)=>{const delta=new T.Matrix4().multiplyMatrices(anchors[b].matrixWorld,inverse[b]);
        a.forEach((i,k)=>assert(skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld).distanceTo(rest[b][k].clone().applyMatrix4(delta))<1e-4,id+' skin stays attached to head/weapon sockets across motion'));});
      assert(creatureBodyBounds(model.root).getSize(new T.Vector3()).length()<650,id+' no stretched skin spikes');
    }
    const bones=[...skin.skeleton.bones];let disposed=false;skin.material.addEventListener('dispose',()=>{disposed=true;});model.dispose();
    assert(disposed&&bones.every(b=>b.parent===null),id+' releases owned costume/skeleton');
  }
}
for(const [id,identity]of Object.entries(CREATURE_CATALOG)){
  if(!['salamander','drake','wyvern','dragon'].includes(identity.shape))continue;
  for(const elite of identity.boss?[true]:[false,true]){
    const model=createCreature(id,0x728065,0xbca97c,elite,25),skin=model.root.getObjectByName('reptile-continuous-surface');
    assert(skin instanceof T.SkinnedMesh,id+' is a connected reptile skin');
    assert(!model.root.getObjectByName('creature-eye'),id+' face paint has no floating eye layer');
    const p=skin.geometry.attributes.position,ix=skin.geometry.index,w=skin.geometry.attributes.skinWeight,j=skin.geometry.attributes.skinIndex;
    const parent=Array.from({length:p.count},(_,i)=>i),weld=new Map(),eyes=[];
    const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
    const join=(a,b)=>{parent[find(a)]=find(b);};
    const weight=(i,b)=>{let v=0;for(let n=0;n<4;n++)if(j.getComponent(i,n)===b)v+=w.getComponent(i,n);return v;};
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),key=[x,y,z].map(v=>v.toFixed(3)).join(',');
      if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);
      assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5,id+' normalized reptile weights');
      if(z>50&&y<(identity.shape==='salamander'?17:32))assert(weight(i,1)+weight(i,2)>.999,id+' lower mouth cannot follow a foot');
    }
    for(let n=0;n<ix.count;n+=3){join(ix.getX(n),ix.getX(n+1));join(ix.getX(n),ix.getX(n+2));}
    assert.equal(new Set(parent.map((_,i)=>find(i))).size,1,id+' head, cheek walls, jaw, torso, feet and tail are connected');
    const forms={salamander:[14,37],drake:[14,53],wyvern:[13,53],dragon:[17,55]},[ex,ey]=forms[identity.shape];
    const surface=new T.Mesh(skin.geometry),ray=new T.Raycaster();surface.updateMatrixWorld(true);
    for(const s of [-1,1])for(const offset of [-1,0,1]){
      ray.set(new T.Vector3(s*ex,ey+offset,150),new T.Vector3(0,0,-1));
      const hit=ray.intersectObject(surface,false)[0];assert(hit?.face,id+' eye lies on the skull');
      for(const i of [hit.face.a,hit.face.b,hit.face.c]){assert(weight(i,1)>.999,id+' whole eye-bearing triangle follows head');if(!eyes.includes(i))eyes.push(i);}
    }
    surface.material.dispose();
    const frame=(phase,progress,speed=0)=>{model.step(.016,speed,false,phase!=='idle',undefined,undefined,undefined,{phase,progress,hit:0});model.root.updateMatrixWorld(true);skin.skeleton.update();};
    frame('idle',0);const head=skin.skeleton.bones[1],inverse=head.matrixWorld.clone().invert(),rest=eyes.map(i=>skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld));
    for(let n=0;n<42;n++){
      frame(n<28?'windup':'strike',n<28?n/27:(n-28)/13,n<14?140:0);
      const delta=new T.Matrix4().multiplyMatrices(head.matrixWorld,inverse);
      eyes.forEach((i,k)=>assert(skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld).distanceTo(rest[k].clone().applyMatrix4(delta))<1e-4,id+' eye skin stays seated through attack/gait'));
      for(let i=0;i<p.count;i+=11)assert(skin.getVertexPosition(i,new T.Vector3()).toArray().every(Number.isFinite),id+' finite reptile deformation');
      assert(creatureBodyBounds(model.root).getSize(new T.Vector3()).length()<700,id+' no stretched jaw/tail spikes');
    }
    let disposed=false;skin.material.addEventListener('dispose',()=>{disposed=true;});const bones=[...skin.skeleton.bones];model.dispose();
    assert(disposed&&bones.every(b=>!b.parent),id+' releases owned material and skeleton');
  }
}
let paintedFaces=0,otherSkins=0;
for(const [id,identity]of Object.entries(CREATURE_CATALOG))for(const elite of identity.boss?[true]:[false,true]){
  const model=createCreature(id,0x728065,0xbca97c,elite,25),meshes=[];model.root.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});
  const fittedFamilies=['beetle','spider','scorpion','slime','mushroom','serpent','bat','owl','treant','golem','sand','scrap','wisp','flame'];
  if(fittedFamilies.includes(identity.shape)&&id!=='lava-golem'){
    assert.equal(meshes.filter(o=>o.userData.surfaceFace).length,1,id+' has one fitted face on its actual surface');
    assert(!model.root.getObjectByName('creature-eye'),id+' cannot silently keep the old floating eye layer');
  }
  for(const skin of meshes.filter(o=>['bird-continuous-surface','small-creature-continuous-surface'].includes(o.name))){
    otherSkins++;const p=skin.geometry.attributes.position,ix=skin.geometry.index,parent=Array.from({length:p.count},(_,i)=>i),weld=new Map();
    const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},join=(a,b)=>{parent[find(a)]=find(b);};
    for(let i=0;i<p.count;i++){
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(3)).join(',');if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);
      if(skin instanceof T.SkinnedMesh){const w=skin.geometry.attributes.skinWeight;assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5,id+' normalized small/bird weights');}
    }
    for(let n=0;n<ix.count;n+=3){join(ix.getX(n),ix.getX(n+1));join(ix.getX(n),ix.getX(n+2));}
    assert.equal(new Set(parent.map((_,i)=>find(i))).size,1,id+' small/bird skin forms one connected surface');
  }
  for(const mesh of meshes.filter(o=>o.userData.surfaceFace)){
    paintedFaces++;const f=mesh.userData.surfaceFace,shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
    mesh.material.onBeforeCompile(shader);const frame=shader.uniforms.faceRestFrame.value;
    assert(shader.fragmentShader.includes('surfaceFaceRest')&&shader.vertexShader.includes('faceRestFrame'),'Actual face material retains its authored shader through rigging/batching');
    assert(shader.fragmentShader.includes('step(4.5,faceKind)'),id+' shares a shader without borrowing another species eye glow');
    if(['spider','beetle'].includes(identity.shape))assert.equal(shader.uniforms.faceLightEyes.value,1,id+' dark shell keeps a contrasting painted iris instead of black-on-black eyes');
    if(['spider','beetle','scorpion'].includes(identity.shape))assert(f.z>30,id+' full eye aperture belongs to the front head, not a second projection on the rear abdomen');
    const geometry=mesh.geometry.clone();geometry.applyMatrix4(frame);const surface=new T.Mesh(geometry),ray=new T.Raycaster(),samples=[];surface.updateMatrixWorld(true);
    model.root.updateMatrixWorld(true);
    const faceToWorld=mesh.matrixWorld.clone().multiply(frame.clone().invert());
    const assertVisibleEye=(x,y)=>{
      if(!['spider','beetle','scorpion','wisp','flame'].includes(identity.shape))return;
      // Head-only fitting passed while a second boss carapace hid both eyes.
      // Resolve the visible opaque surface through the entire constructed rig.
      ray.set(new T.Vector3(x,y,150),new T.Vector3(0,0,-1));
      const eyeSurface=ray.intersectObject(surface,false)[0];assert(eyeSurface,id+' eye probe reaches its surface');
      const target=eyeSurface.point.clone().applyMatrix4(faceToWorld);
      const views=['wisp','flame'].includes(identity.shape)?[[0,0,1],[0,.85,1],[-.55,.85,1],[.55,.85,1]]:[[0,0,1]];
      for(const view of views){
        const towardsCamera=new T.Vector3(...view).transformDirection(faceToWorld);
        ray.set(target.clone().addScaledVector(towardsCamera,150),towardsCamera.clone().negate());
        const first=ray.intersectObject(model.root,true).find(hit=>{
          if(!(hit.object instanceof T.Mesh))return false;
          for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;
          return !(Array.isArray(hit.object.material)?hit.object.material: [hit.object.material]).every(m=>m.transparent);
        });
        assert(first?.object===mesh,`${id} fitted eye at ${x.toFixed(2)},${y.toFixed(2)}, view ${view} is hidden by ${first?.object.name||first?.object.geometry?.type} (${JSON.stringify(first?.object.userData)})`);
      }
    };
    for(const side of [-1,1]){
      assertVisibleEye(side*f.x,f.y);
      ray.set(new T.Vector3(side*f.x,f.y,150),new T.Vector3(0,0,-1));const hit=ray.intersectObject(surface,false)[0];
      assert(hit?.face&&hit.point.z>f.z,id+' each painted eye sits on an exposed actual surface');samples.push(hit.face.a,hit.face.b,hit.face.c);
      for(let n=0;n<8;n++){
        const dx=Math.cos(n*Math.PI/4)*f.width*.9,dy=Math.sin(n*Math.PI/4)*f.height*.9;
        assertVisibleEye(side*(f.x+dx),f.y+dy-dx*.1);
        ray.set(new T.Vector3(side*(f.x+dx),f.y+dy-dx*.1,150),new T.Vector3(0,0,-1));
        const edge=ray.intersectObject(surface,false)[0];
        assert(edge?.face&&edge.point.z>f.z,id+' the complete aperture is painted, not clipped by centre-only depth');
      }
    }
    geometry.dispose();surface.material.dispose();
    if(mesh instanceof T.SkinnedMesh){
      const expected=identity.shape==='mushroom'?0:1,j=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;
      for(const i of samples){let value=0;for(let n=0;n<4;n++)if(j.getComponent(i,n)===expected)value+=w.getComponent(i,n);assert(value>.999,id+' entire eye-bearing triangle follows its face joint');}
      model.step(.016,0,false,false,undefined,undefined,undefined,{phase:'idle',progress:0,hit:0});model.root.updateMatrixWorld(true);mesh.skeleton.update();
      const anchor=mesh.skeleton.bones[expected],inverse=anchor.matrixWorld.clone().invert(),rest=samples.map(i=>mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld));
      for(let n=0;n<30;n++){
        model.step(.016,n<10?140:0,false,true,undefined,undefined,undefined,{phase:n<20?'windup':'strike',progress:n<20?n/19:(n-20)/9,hit:0});model.root.updateMatrixWorld(true);mesh.skeleton.update();
        const delta=new T.Matrix4().multiplyMatrices(anchor.matrixWorld,inverse);
        samples.forEach((i,k)=>assert(mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld).distanceTo(rest[k].clone().applyMatrix4(delta))<1e-4,id+' face skin stays attached in actual gait/attack'));
        for(let i=0;i<mesh.geometry.attributes.position.count;i+=9)assert(mesh.getVertexPosition(i,new T.Vector3()).toArray().every(Number.isFinite),id+' finite small/bird skin');
      }
    }
    let disposed=false;mesh.material.addEventListener('dispose',()=>{disposed=true;});mesh.userData.faceMaterialReleaseChecked=()=>disposed;
  }
  model.dispose();for(const mesh of meshes.filter(o=>o.userData.faceMaterialReleaseChecked))assert(mesh.userData.faceMaterialReleaseChecked(),id+' releases owned face shader material');
}
assert(paintedFaces>=44&&otherSkins>=15,`New face and small/bird paths have substantive catalog coverage (${paintedFaces} faces / ${otherSkins} skins)`);
console.log(`Connected face/skin coverage: ${paintedFaces} fitted painted faces, ${otherSkins} small/bird skins, plus explicit mammal/humanoid/reptile motion gates.`);
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
// An updated constructor must not reuse a previous revision's cached manifest /
// binary. Exercise the real loader using this baked pair, without network I/O.
const originalFetch=globalThis.fetch,requests=[];
globalThis.fetch=async url=>{
  requests.push(String(url));
  return {ok:true,json:async()=>manifest,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
};
try{
  await preloadCreatureSurfaces();
  assert.equal(requests.length,2,'Both baked files are requested');
  for(const url of requests)assert.equal(new URL(url,'https://local.invalid').searchParams.get('v'),CREATURE_SCULPT_REVISION,'Manifest and binary use the current revision cache key');
}finally{globalThis.fetch=originalFetch;}
console.log(`Creature sculpt: PASS — current baked geometry, 64 identities, 40 animated/released elite auras, mature anatomy, unchanged collision size, HP bars exclude glow, ${(bytes.length/1024).toFixed(0)} KiB of shared meshes.`);
