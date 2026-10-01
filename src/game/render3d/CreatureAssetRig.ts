import * as T from 'three';

/** Goat's round body/head is weighted to Hips, while its face follows Spine's
 * independent tracks. Preserve the bind pose and anchor the face to that body. */
export function repairCreatureAssetRig(model:T.Group,key:string,clips:readonly T.AnimationClip[]):T.AnimationClip[] {
  if(key!=='Goat')return [...clips];
  const head=model.getObjectByName('Hips');
  if(!(head instanceof T.Bone))return [...clips];
  const attached=new Set<string>();
  model.updateMatrixWorld(true);
  for(const name of ['Mouth','LeftEye','RightEye','LeftEar','RightEar']){
    const bone=model.getObjectByName(name);
    if(!(bone instanceof T.Bone))continue;
    head.attach(bone);attached.add(name);
  }
  return clips.map(clip=>new T.AnimationClip(clip.name,clip.duration,
    clip.tracks.filter(track=>!attached.has(T.PropertyBinding.parseTrackName(track.name).nodeName)).map(track=>{
      // Gameplay owns planar travel. Keep the authored jump height, but prevent
      // a native lunge from leaving its collision body behind.
      if(track.name!=='Hips.position')return track;
      const local=track.clone();for(let i=0;i<local.values.length;i+=3){local.values[i]=head.position.x;local.values[i+2]=head.position.z;}return local;
    }),clip.blendMode));
}
