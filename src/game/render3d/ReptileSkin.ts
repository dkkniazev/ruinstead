import * as T from 'three';
import { REPTILE_FORMS, type ReptileShape } from './ReptileForms';

/** One living surface driven by the established head, jaw, feet and tail rig. */
export function bindReptileSkin(body:T.Group,head:T.Group|undefined,jaw:T.Group|undefined,legs:T.Group[],segments:T.Group[]):(()=>void)|undefined{
  const source=body.getObjectByName('reptile-continuous-surface');
  if(!(source instanceof T.Mesh)||!head||!jaw)return;
  const {shape,primary,accent,mass}=source.userData.reptile as {shape:ReptileShape;primary:number;accent:number;mass:number};
  const f=REPTILE_FORMS[shape],low=shape==='salamander',legCount=legs.length,tailStart=3+legCount;
  const anchors=[body,head,jaw,...legs,...segments],bones=anchors.map((a,i)=>{const b=new T.Bone();b.name='reptile-skin-joint-'+i;a.add(b);return b;});
  const geometry=source.geometry;
  if(!geometry.getAttribute('skinWeight')){
    const p=geometry.attributes.position,indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x);
      let a=0,b=1,t=T.MathUtils.smoothstep(z,15,36)*T.MathUtils.smoothstep(y,f.y-13,f.y);
      if(z>43&&y>f.y-9)t=1;
      if(z<-45&&segments.length){
        const at=T.MathUtils.clamp((-z-20)/12.5,0,segments.length-1),blend=T.MathUtils.smoothstep(-z,45,54);
        a=tailStart+Math.floor(at);b=Math.min(anchors.length-1,a+1);t=at-Math.floor(at);
        indices.set([a,b,0,0],i*4);weights.set([(1-t)*blend,t*blend,1-blend,0],i*4);continue;
      }
      const nearest=legs.reduce((best,l,n)=>Math.abs(x-l.position.x)+Math.abs(z-(l.position.z+7))<best.distance?{index:n,distance:Math.abs(x-l.position.x)+Math.abs(z-(l.position.z+7))}:best,{index:0,distance:Infinity});
      if(legCount&&z<37&&(y<11||(ax>(low?26:13)&&y<f.y))){
        a=0;b=3+nearest.index;t=y<11?1:T.MathUtils.smoothstep(ax,low?25:13,low?31:22)*(1-T.MathUtils.smoothstep(y,f.y-10,f.y));
      }else if(z>40&&y<f.y+1){a=1;b=2;t=(1-T.MathUtils.smoothstep(y,f.y-7,f.y+1))*T.MathUtils.smoothstep(z,40,50);}
      indices.set([a,b,0,0],i*4);weights.set([1-t,t,0,0],i*4);
    }
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  }
  const material=new T.MeshStandardMaterial({color:primary,roughness:.78});
  material.onBeforeCompile=shader=>{
    shader.uniforms.reptileCoat={value:new T.Color(primary)};shader.uniforms.reptileTrim={value:new T.Color(accent)};
    shader.uniforms.reptileEye={value:new T.Vector4(f.eyeX,f.eyeY,f.eyeZ,shape==='dragon'?4.5:4)};
    shader.uniforms.reptileForm={value:new T.Vector4(f.y,f.back,f.snout,mass)};
    shader.vertexShader='varying vec3 reptileRest;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n reptileRest=position;');
    shader.fragmentShader='varying vec3 reptileRest;uniform vec3 reptileCoat;uniform vec3 reptileTrim;uniform vec4 reptileEye;uniform vec4 reptileForm;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float x=reptileRest.x,ax=abs(x),y=reptileRest.y,z=reptileRest.z;
      vec3 pigment=reptileCoat;
      float belly=(1.-smoothstep(reptileForm.x-3.,reptileForm.x+7.,y))*(1.-smoothstep(10.,23.*reptileForm.w,ax));
      pigment=mix(pigment,mix(reptileTrim,vec3(.48,.36,.18),.5),belly*.75);
      float band=1.-smoothstep(.4,1.,abs(mod(z+1.,7.)-3.5));pigment*=1.-band*belly*.18;
      float row=floor(z/8.);vec2 cell=vec2(mod(x+mod(row,2.)*4.,8.)-4.,mod(z,8.)-4.);
      float scale=1.-smoothstep(.3,.85,abs(cell.y+abs(cell.x)*.5-2.));
      float back=smoothstep(reptileForm.x+8.,reptileForm.y-4.,y)*(1.-smoothstep(15.,30.,z));
      pigment=mix(pigment,reptileCoat*.48,scale*back*.45);
      float crest=(1.-smoothstep(3.,7.,ax))*smoothstep(reptileForm.y-9.,reptileForm.y+3.,y);
      pigment=mix(pigment,reptileTrim,crest*.85);
      float mouth=1.-smoothstep(.4,.8,abs(y-(reptileForm.x-3.+ax*.08)));
      if(z>43.&&z<reptileForm.z+6.&&y<reptileForm.x+3.)pigment=mix(pigment,reptileCoat*.16,mouth*.8);
      if(z>45.&&ax<13.*reptileForm.w&&abs(y-reptileForm.x+1.)<3.7)pigment=vec3(.065,.022,.014);
      vec2 eye=vec2((ax-reptileEye.x)/reptileEye.w,(y-reptileEye.y+(ax-reptileEye.x)*.17)/3.);
      float r=length(eye),aa=clamp(fwidth(r),.015,.18);
      float pupil=length((eye-vec2(-.12,.02))/vec2(.2,.7)),pa=clamp(fwidth(pupil),.02,.22);
      if(z>reptileEye.z&&z<reptileForm.z&&abs(y-reptileEye.y)<4.5){
        float aperture=(1.-smoothstep(1.-aa,1.+aa,r))*(1.-smoothstep(.48,.72,eye.y+eye.x*.15));
        vec3 iris=mix(vec3(.9,.55,.10),vec3(.013,.018,.007),1.-smoothstep(1.-pa,1.+pa,pupil));
        float glint=1.-smoothstep(.05,.14,length(eye-vec2(-.25,.23)));iris=mix(iris,vec3(.99,.95,.72),glint);
        pigment=mix(pigment,iris,aperture);
        float brow=(1.-smoothstep(.09,.25,abs(eye.y-1.1-eye.x*.15)))*(1.-smoothstep(.9,1.15,abs(eye.x)));pigment=mix(pigment,reptileCoat*.35,brow);
      }
      if(z>reptileForm.z+3.&&abs(y-reptileForm.x-3.)<6.){
        float nostril=1.-smoothstep(.7,1.,length(vec2((ax-6.*reptileForm.w)/2.,(y-reptileForm.x-4.)/1.5)));
        pigment=mix(pigment,reptileCoat*.1,nostril);
      }
      diffuseColor.rgb=pigment;
    `);
  };
  material.customProgramCacheKey=()=> 'connected-reptile-scales-face-v2';
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name=source.name;mesh.userData={...source.userData,ownedMaterial:true};mesh.castShadow=mesh.receiveShadow=true;
  body.remove(source);body.add(mesh);body.updateWorldMatrix(true,true);const skeleton=new T.Skeleton(bones);mesh.bind(skeleton);mesh.normalizeSkinWeights();
  mesh.boundingSphere=new T.Sphere(new T.Vector3(0,35,-10),165);
  return()=>{skeleton.dispose();bones.forEach(b=>b.removeFromParent());};
}
