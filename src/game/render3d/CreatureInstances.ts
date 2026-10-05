import * as T from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createCreatureMotion,type CreatureRig } from './CreatureMotion';
import type { CreatureShape } from './CreatureCatalog';
import type { AnimatedModel } from './Models';

export type CreatureInstanceRig={rig:CreatureRig;shape:CreatureShape;boss:boolean;floating:boolean;worldScale:number};

/** Borrow immutable authored geometry, but never share bones, pose or mutable
 * pigment/aura materials. Template lifetime is owned by the factory's refcount. */
export function instantiateCreature(source:AnimatedModel,profile:CreatureInstanceRig,release:()=>void):AnimatedModel {
  const root=clone(source.root) as T.Group,originals:T.Object3D[]=[],copies:T.Object3D[]=[];
  source.root.traverse(o=>originals.push(o));root.traverse(o=>copies.push(o));
  const links=new Map(originals.map((o,i)=>[o,copies[i]]));
  const joint=(o:T.Group)=>links.get(o) as T.Group;
  const optional=(o:T.Group|undefined)=>o?joint(o):undefined;
  const r=profile.rig,rig:CreatureRig={body:joint(r.body),head:optional(r.head),jaw:optional(r.jaw),
    legs:r.legs.map(joint),knees:r.knees.map(joint),arms:r.arms.map(joint),grips:r.grips.map(joint),
    wings:r.wings.map(joint),segments:r.segments.map(joint),tail:optional(r.tail)};
  const owned=new Set<T.Material>(),skeletons=new Set<T.Skeleton>(),auraTimes:Array<{value:number}>=[];
  root.traverse(o=>{
    if(o instanceof T.SkinnedMesh)skeletons.add(o.skeleton);
    if(!(o instanceof T.Mesh)||!o.userData.ownedMaterial&&!o.userData.visualEffect)return;
    const copyMaterial=(material:T.Material)=>{
      const copy=material.clone();copy.onBeforeCompile=material.onBeforeCompile;
      copy.customProgramCacheKey=material.customProgramCacheKey;owned.add(copy);
      if(copy instanceof T.ShaderMaterial&&copy.uniforms.time)auraTimes.push(copy.uniforms.time);
      return copy;
    };
    o.material=Array.isArray(o.material)?o.material.map(copyMaterial):copyMaterial(o.material);
  });
  const animate=createCreatureMotion(profile.shape,profile.boss,profile.floating,rig,profile.worldScale);
  let elapsed=0,disposed=false;
  return {root,step(dt,speed,_dash,attack,_travel,_turning,_attackAt,pose){
    animate(dt,speed,attack,pose);elapsed+=Math.min(dt,.05);for(const time of auraTimes)time.value=elapsed;
  },dispose(){
    if(disposed)return;disposed=true;
    for(const skeleton of skeletons){skeleton.dispose();for(const bone of skeleton.bones)bone.removeFromParent();}
    for(const material of owned)material.dispose();release();
  }};
}
