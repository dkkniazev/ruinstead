import * as T from 'three';
/** Existing fungal feet / serpent segments deform a connected authored surface. */
export function bindSmallCreatureSkin(body:T.Group,legs:T.Group[],segments:T.Group[]):(()=>void)|undefined{
  const source=body.getObjectByName('small-creature-continuous-surface');if(!(source instanceof T.Mesh))return;
  const snake=!!source.userData.segmentSkin,anchors=[body,...(snake?segments:legs)];
  if(anchors.length<2)return;
  const bones=anchors.map((a,i)=>{const b=new T.Bone();b.name='small-creature-skin-joint-'+i;a.add(b);return b;}),geometry=source.geometry;
  if(!geometry.getAttribute('skinWeight')){
    const p=geometry.attributes.position,indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let a=0,b=1,t=0;
      if(snake){
        const at=T.MathUtils.clamp((32-z)/14,0,segments.length-1);a=1+Math.floor(at);b=Math.min(anchors.length-1,a+1);t=at-Math.floor(at);
        if(z>26){a=b=1;t=0;}
      }else{b=1+(x>0?1:0);t=1-T.MathUtils.smoothstep(y,16,24);}
      indices.set([a,b,0,0],i*4);weights.set([1-t,t,0,0],i*4);
    }
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  }
  const skin=new T.SkinnedMesh(geometry,source.material);skin.name=source.name;skin.userData={...source.userData};skin.castShadow=skin.receiveShadow=true;
  body.remove(source);body.add(skin);body.updateWorldMatrix(true,true);const skeleton=new T.Skeleton(bones);skin.bind(skeleton);skin.normalizeSkinWeights();skin.boundingSphere=new T.Sphere(new T.Vector3(0,35,-10),165);
  return()=>{skeleton.dispose();bones.forEach(b=>b.removeFromParent());};
}
