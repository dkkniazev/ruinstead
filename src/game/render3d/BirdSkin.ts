import * as T from 'three';
/** The membrane/feather fans retain their joints; flesh is one connected skin. */
export function bindBirdSkin(body:T.Group,head:T.Group|undefined,legs:T.Group[]):(()=>void)|undefined{
  const source=body.getObjectByName('bird-continuous-surface');if(!(source instanceof T.Mesh)||!head||legs.length!==2)return;
  const anchors=[body,head,...legs],bones=anchors.map((a,i)=>{const b=new T.Bone();b.name='bird-skin-joint-'+i;a.add(b);return b;}),geometry=source.geometry;
  if(!geometry.getAttribute('skinWeight')){
    const p=geometry.attributes.position,indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i);let a=0,b=1,t=T.MathUtils.smoothstep(y,47,56);
      if(y<24){b=2+(x>0?1:0);t=1-T.MathUtils.smoothstep(y,17,24);}
      indices.set([a,b,0,0],i*4);weights.set([1-t,t,0,0],i*4);
    }
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  }
  const skin=new T.SkinnedMesh(geometry,source.material);skin.name=source.name;skin.userData={...source.userData};skin.castShadow=skin.receiveShadow=true;
  body.remove(source);body.add(skin);body.updateWorldMatrix(true,true);const skeleton=new T.Skeleton(bones);skin.bind(skeleton);skin.normalizeSkinWeights();skin.boundingSphere=new T.Sphere(new T.Vector3(0,47,0),105);
  return()=>{skeleton.dispose();bones.forEach(b=>b.removeFromParent());};
}
