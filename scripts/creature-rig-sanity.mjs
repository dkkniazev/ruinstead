import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`
export * as T from 'three';
export {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export * from './src/game/render3d/CreatureAssetRig.ts';
export * from './src/game/render3d/CreatureModels.ts';
export * from './src/game/render3d/CreatureCatalog.ts';
export * from './src/game/render3d/CreatureMotion.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.BASE_URL':'"/"'}});
const {T,GLTFLoader,repairCreatureAssetRig,createCreature,CREATURE_CATALOG,createCreatureMotion}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
for(const shape of ['goblin','boar','beetle','treant']){
  const body=new T.Group(),legs=Array.from({length:shape==='beetle'?6:4},()=>new T.Group());
  legs.forEach(leg=>body.add(leg));
  const move=createCreatureMotion(shape,false,false,{body,legs,knees:[],arms:[],grips:[],wings:[],segments:[]},1);
  let strideAngle=0;
  for(let frame=0;frame<120;frame++){move(1/60,33);strideAngle=Math.max(strideAngle,Math.abs(legs[0].rotation.x));}
  assert(strideAngle>.09,`${shape}: patrol must visibly articulate legs instead of sliding`);
  for(let frame=0;frame<120;frame++)move(1/60,0);
  assert(Math.abs(legs[0].rotation.x)<.001,`${shape}: stopped creature must not march in place`);
}
// Exercise the real GLB skeleton/weights in Node; GPU textures are irrelevant here.
const bytes=fs.readFileSync('public/assets/models/gobkit-enemies/Goat.glb');
const jsonSize=bytes.readUInt32LE(12),json=JSON.parse(bytes.toString('utf8',20,20+jsonSize));
json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+jsonSize).toString('base64');
delete json.images;delete json.textures;delete json.materials;
for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
globalThis.ProgressEvent??=class{constructor(_type,values){Object.assign(this,values);}};
const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
const model=gltf.scene;let mesh;model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
const vertices=()=>{model.updateMatrixWorld(true);mesh.skeleton.update();return Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,new T.Vector3()));};
const before=vertices(),clips=repairCreatureAssetRig(model,'Goat',gltf.animations),after=vertices();
assert(before.every((p,i)=>p.distanceTo(after[i])<1e-5),'Rig repair must preserve every bind-pose vertex');
const face=['Mouth','LeftEye','RightEye','LeftEar','RightEar'].map(n=>model.getObjectByName(n));
const body=model.getObjectByName('Hips');
const relative=()=>{model.updateMatrixWorld(true);const inverse=body.matrixWorld.clone().invert();return face.map(b=>new T.Matrix4().multiplyMatrices(inverse,b.matrixWorld).elements);};
const baseline=relative(),mixer=new T.AnimationMixer(model);
for(const clip of clips){
  mixer.stopAllAction();const action=mixer.clipAction(clip);action.play();
  for(let frame=0;frame<=120;frame++){
    mixer.setTime(clip.duration*frame/120);const current=relative();
    assert(current.every((matrix,i)=>matrix.every((v,j)=>Math.abs(v-baseline[i][j])<1e-5)),`${clip.name}/${frame}: goat face must stay attached to its weighted body`);
    assert(Math.abs(body.position.z)<1e-5,`${clip.name}: clip must not move away from gameplay position`);
    assert(vertices().every(v=>v.toArray().every(Number.isFinite)),'Finite skinned vertices');
  }
}
let checkedWeaponSwings=0;
for(const [id,identity]of Object.entries(CREATURE_CATALOG)){
  if(identity.asset)continue;
  const creature=createCreature(id,0x728065,0xbca97c,!!identity.boss,identity.boss?55:25);
  const grips=[];creature.root.traverse(o=>{if(o.name==='creature-grip')grips.push(o);});
  const pose=(phase,progress,speed=0)=>{creature.step(.016,speed,false,phase!=='idle',undefined,undefined,undefined,{phase,progress,hit:0});creature.root.updateMatrixWorld(true);};
  const bladeSamples=new Map();
  if(identity.shape==='rogue')for(const grip of grips){
    const blade=grip.getObjectByName('weapon-blade');assert(blade,id+' actual blade geometry remains available');
    const positions=blade.geometry.attributes.position,index=blade.geometry.index;
    const samples=Array.from({length:positions.count},(_,i)=>new T.Vector3().fromBufferAttribute(positions,i));
    for(let i=0;i<(index?.count??positions.count);i+=3){
      const triangle=[0,1,2].map(j=>samples[index?index.getX(i+j):i+j]);
      samples.push(triangle[0].clone().add(triangle[1]).add(triangle[2]).multiplyScalar(1/3));
    }
    bladeSamples.set(grip,{blade,samples});
  }
  const assertGripDirection=()=>{
    for(const grip of grips){
      const equipment=grip.getObjectByName('creature-equipment');if(!equipment?.userData.weaponTip)continue;
      if(!['rogue','cultist'].includes(identity.shape))continue;
      const torso=grip.parent.parent;
      const tip=torso.worldToLocal(equipment.localToWorld(new T.Vector3(...equipment.userData.weaponTip)));
      const palm=torso.worldToLocal(grip.getWorldPosition(new T.Vector3()));
      const direction=tip.sub(palm).normalize();
      if(identity.shape==='rogue'){
        const arm=grip.parent,start=new T.Vector3(...grip.userData.forearmStart);
        const forearm=grip.position.clone().sub(start).normalize();
        const shaft=arm.worldToLocal(equipment.localToWorld(new T.Vector3(...equipment.userData.weaponTip))).sub(grip.position).normalize();
        assert(Math.abs(shaft.dot(forearm))<1e-5,id+' dagger remains perpendicular to forearm in every pose');
        const sleeve=new T.Line3(start,new T.Vector3(...grip.userData.forearmEnd));
        const cuffBounds=arm.userData.forearmCuffBounds;
        assert(cuffBounds,id+' authored cuff bounds must be available');
        const cuff=new T.Box3(new T.Vector3(...cuffBounds[0]),new T.Vector3(...cuffBounds[1]));
        const {blade,samples}=bladeSamples.get(grip);
        for(const local of samples){
          const point=arm.worldToLocal(blade.localToWorld(local.clone()));
          assert(point.distanceTo(grip.position)>6.05,id+' blade must stay outside palm');
          const nearest=sleeve.closestPointToPoint(point,true,new T.Vector3());
          assert(point.distanceTo(nearest)>6.05,id+' blade must stay outside forearm sleeve');
          assert(cuff.distanceToPoint(point)>.5,id+' blade must clear the actual wrist cuff');
        }
      }else{
        assert(Math.abs(direction.x)<1e-5,id+' staff stays in forward plane without sideways tilt');
        assert(direction.z>.2&&direction.y>.5,id+' staff leans forward and up at rest and throughout casting');
        const shaft=new T.Line3(palm,torso.worldToLocal(equipment.localToWorld(new T.Vector3(0,56,0))));
        const shoulder=grip.parent.position,nearest=shaft.closestPointToPoint(shoulder,true,new T.Vector3());
        assert(shoulder.distanceTo(nearest)>13,id+' forward staff must clear shoulder armour');
      }
    }
  };
  pose('idle',0);
  assertGripDirection();
  for(const grip of grips){
    const equipment=grip.getObjectByName('creature-equipment');if(!equipment?.userData.weaponTip)continue;
    const tip=equipment.localToWorld(new T.Vector3(...equipment.userData.weaponTip)),palm=grip.getWorldPosition(new T.Vector3());
    if(identity.shape!=='rogue')assert(identity.shape==='cultist'?tip.y>palm.y:tip.y<palm.y-5,id+' idle staff points up, heavy weapons down');
    if(identity.shape==='cultist'){
      const shaft=new T.Line3(palm,equipment.localToWorld(new T.Vector3(0,56,0)));
      const shoulder=grip.parent.getWorldPosition(new T.Vector3()),nearest=shaft.closestPointToPoint(shoulder,true,new T.Vector3());
      const scale=grip.parent.getWorldScale(new T.Vector3()).x;
      assert(shoulder.distanceTo(nearest)>13*scale,id+' staff clears the shoulder armour');
    }
  }
  // Sample the actual cutting edge / hammer face, not just the shaft tip.
  // A weapon can point down and stay in the palm while still hitting flat-first.
  const weapons=[];creature.root.traverse(o=>{if(/^weapon-(axe|hammer|sword|daggers)$/.test(o.name))weapons.push(o);});
  for(const weapon of weapons){
    const dagger=weapon.name==='weapon-daggers';
    const contactPoint=weapon.name==='weapon-axe'?new T.Vector3(30,30,0)
      :weapon.name==='weapon-hammer'?new T.Vector3(24,53,0):new T.Vector3(0,30,0);
    for(let frame=0;frame<=14;frame++){
      const progress=.84+frame*.01;
      pose('windup',progress-.0001);const before=weapon.localToWorld(contactPoint.clone());
      pose('windup',progress+.0001);const after=weapon.localToWorld(contactPoint.clone());
      pose('windup',progress);
      const velocity=after.sub(before).normalize();
      const shaft=new T.Vector3(0,1,0).transformDirection(weapon.matrixWorld);
      const edge=new T.Vector3(1,0,0).transformDirection(weapon.matrixWorld);
      const flat=new T.Vector3(0,0,1).transformDirection(weapon.matrixWorld);
      // Remove motion along the handle: roll controls the transverse cutting arc.
      const cuttingArc=velocity.clone().addScaledVector(shaft,-velocity.dot(shaft)).normalize();
      const label=`${id}/${weapon.name}/${frame}`;
      if(dagger){
        // The fixed wrist carries a cut along the blade plane.
        assert(edge.dot(velocity)>.2,label+' knife edge leads the draw-cut');
      }else assert(edge.dot(cuttingArc)>.9,label+' cutting edge / hammer face must lead the swing');
      assert(Math.abs(flat.dot(velocity))<(dagger?.3:.4),label+' broad side must not lead the strike');
    }
    checkedWeaponSwings++;
  }
  const neck=creature.root.getObjectByName('creature-neck');
  if(['serpent','worm'].includes(identity.shape)){
    assert(neck,'First body segment is the head attachment');
    assert(creature.root.children[0].children.every(o=>!o.userData.creatureHead&&o.userData.creatureSegment===undefined),'No loose face/scale plates remain on body root');
  }
  for(let frame=0;frame<=120;frame++){
    const t=frame/120;pose(t<.65?'windup':'strike',t<.65?t/.65:(t-.65)/.35);
    assertGripDirection();
    for(const grip of grips)assert.deepEqual(grip.position.toArray(),grip.userData.handAnchor,id+' grip stays inside palm');
    if(identity.shape==='scorpion'){
      const sting=creature.root.getObjectByName('scorpion-stinger'),socket=creature.root.getObjectByName('stinger-socket');
      assert(sting&&socket);assert(sting.getWorldPosition(new T.Vector3()).distanceTo(socket.getWorldPosition(new T.Vector3()))<1e-6,id+' stinger stays on tail');
      const bounds=new T.Box3().setFromObject(sting);assert(bounds.min.y<socket.getWorldPosition(new T.Vector3()).y-5,id+' stinger hooks down');
    }
  }
  // Walking changes shoulder rotations too: the wrist must preserve the pose.
  if(['rogue','cultist'].includes(identity.shape))for(let frame=0;frame<120;frame++){
    pose('idle',0,140);assertGripDirection();
  }
  creature.dispose?.();
}
console.log(`Creature rigs: PASS — ${checkedWeaponSwings} weapon attacks, 15 cutting-plane/hammer-face samples each; perpendicular daggers with blade/palm/sleeve clearance and forward staff over 121 attack + 120 walking frames; native Goat bind pose + 121 frames of each clip, face/body attachment, no planar clip drift; all procedural grips, connected stingers and segment armour throughout attack.`);
