import * as T from 'three';
import { MAMMAL_FORMS, type MammalShape } from './MammalForms';

/** Existing chase/attack anchors drive the shared skin; no gameplay simulation. */
export function bindMammalSkin(body:T.Group,head:T.Group|undefined,jaw:T.Group|undefined,legs:T.Group[],segments:T.Group[]):(()=>void)|undefined {
  const source=body.getObjectByName('mammal-continuous-surface');
  if(!(source instanceof T.Mesh)||!head||!jaw||legs.length!==4)return;
  const {shape,primary,accent,veteran,boss}=source.userData.mammal as {shape:MammalShape;primary:number;accent:number;veteran:boolean;boss:boolean};
  const f=MAMMAL_FORMS[shape],anchors=[body,head,jaw,...legs,...segments];
  const bones=anchors.map((anchor,i)=>{const bone=new T.Bone();bone.name='mammal-skin-joint-'+i;anchor.add(bone);return bone;});
  const geometry=source.geometry;
  if(!geometry.getAttribute('skinWeight')){
    const p=geometry.getAttribute('position'),indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x);
      let a=0,b=1,t=T.MathUtils.smoothstep(z,17,37)*T.MathUtils.smoothstep(y,22,35);
      if(z>44&&y>24)t=1;
      if(y<16||(y<35&&ax>12&&z<37)){
        a=0;b=3+(x>0?2:0)+(z>1?1:0);
        t=y<16?1:T.MathUtils.smoothstep(ax,12,20)*(1-T.MathUtils.smoothstep(y,23,35));
      }else if(z>39&&y<36){
        a=1;b=2;t=(1-T.MathUtils.smoothstep(y,30,36))*T.MathUtils.smoothstep(z,39,50);
      }else if(segments.length&&z<-47){
        const at=T.MathUtils.clamp((-z-20)/((shape==='ram'?18:shape==='hound'?66:58)/6),0,segments.length-1);
        a=7+Math.floor(at);b=Math.min(anchors.length-1,a+1);t=at-Math.floor(at);
        const tailBlend=T.MathUtils.smoothstep(-z,47,56);
        indices.set([a,b,0,0],i*4);weights.set([(1-t)*tailBlend,t*tailBlend,1-tailBlend,0],i*4);continue;
      }
      indices.set([a,b,0,0],i*4);weights.set([1-t,t,0,0],i*4);
    }
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  }
  const material=new T.MeshStandardMaterial({color:primary,roughness:.83});
  const mass=boss?1.22:veteran?1.17:1;
  material.onBeforeCompile=shader=>{
    shader.uniforms.mammalCoat={value:new T.Color(primary)};
    shader.uniforms.mammalTrim={value:new T.Color(accent)};
    shader.uniforms.mammalEye={value:new T.Vector4(f.eyeX,f.eyeY,f.eyeZ,shape==='boar'?4:3.8)};
    shader.uniforms.mammalForm={value:new T.Vector4(f.snout,f.muzzle,f.back,mass)};
    shader.uniforms.mammalKind={value:shape==='boar'?0:shape==='jackal'?1:shape==='cat'?2:shape==='hound'?3:4};
    shader.uniforms.mammalVeteran={value:veteran||boss?1:0};
    shader.vertexShader='varying vec3 mammalRest;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n mammalRest=position;');
    shader.fragmentShader='varying vec3 mammalRest;uniform vec3 mammalCoat;uniform vec3 mammalTrim;uniform vec4 mammalEye;uniform vec4 mammalForm;uniform float mammalKind;uniform float mammalVeteran;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float ax=abs(mammalRest.x), y=mammalRest.y,z=mammalRest.z;
      vec3 pigment=mammalCoat;float heat=0.;
      float belly=(1.-smoothstep(26.,37.,y))*(1.-smoothstep(11.,22.,ax));
      pigment=mix(pigment,mix(mammalCoat,vec3(.42,.33,.20),.45),belly*.65);
      float mane=smoothstep(mammalForm.z-13.,mammalForm.z+2.,y)*(1.-smoothstep(7.,13.,ax));
      pigment=mix(pigment,mammalCoat*.56,mane);
      if(mammalVeteran>.5) {
        float mantle=smoothstep(42.,54.,y)*(1.-smoothstep(18.,32.,z));
        mantle=max(mantle,smoothstep(mammalEye.x+2.,mammalEye.x+6.,ax)*smoothstep(31.,38.,y)*(1.-smoothstep(48.,57.,y))*(1.-smoothstep(34.,44.,z)));
        pigment=mix(pigment,mix(mammalCoat*.55,mammalTrim,.28),mantle*.85);
      }
      if(mammalKind==4.)pigment=mix(pigment,mix(mammalCoat,vec3(.62,.56,.42),.5),smoothstep(30.,50.,y)*(1.-smoothstep(20.,39.,z))*.55);
      if(mammalKind==3.){
        float ridge=ax-(5.+sin(z*.17)*1.8);
        heat=(1.-smoothstep(.35,1.1,abs(ridge)))*smoothstep(43.,55.,y)*(1.-smoothstep(14.,28.,z));
        pigment=mix(pigment,mammalTrim,heat*.92);
      }
      if(y<8.)pigment=mammalKind==0.||mammalKind==4.?vec3(.045,.032,.018):mammalCoat*.55;
      if(mammalKind==2.&&z>43.&&y<41.&&y>30.){
        float muzzle=1.-smoothstep(.78,1.,length(vec2((ax-5.)/7.,(y-35.)/5.)));
        pigment=mix(pigment,mix(mammalCoat,vec3(.61,.55,.40),.6),muzzle*.72);
      }
      if(z>mammalForm.x-5.&&z<mammalForm.x+7.&&y<36.){
        float lip=1.-smoothstep(.35,.75,abs(y-31.5+ax*ax*.015));
        pigment=mix(pigment,mammalCoat*.22,lip*.82);
      }
      vec2 eye=vec2((ax-mammalEye.x)/mammalEye.w,(y-mammalEye.y+(ax-mammalEye.x)*.12)/3.1);
      float r=length(eye),aa=clamp(fwidth(r),.014,.18);
      if(y>46.&&y<60.&&z>mammalEye.z&&z<57.){
        float opening=(1.-smoothstep(1.-aa,1.+aa,r))*(1.-smoothstep(.75,.9,eye.y+mammalVeteran*.18));
        float lid=(1.-smoothstep(1.,1.13,r))*(1.-opening);
        pigment=mix(pigment,mammalCoat*.4,lid);
        float pupil=length((eye-vec2(-.08,.03))/vec2(mammalKind==2.?.22:.43,.68));
        vec3 white=mammalKind==3.?mix(vec3(.8,.33,.04),vec3(.03,.015,.009),1.-smoothstep(.8,1.,pupil)):mix(vec3(.87,.78,.56),vec3(.018,.025,.012),1.-smoothstep(.82,1.,pupil));
        float glint=1.-smoothstep(.06,.15,length(eye-vec2(-.23,.27)));
        white=mix(white,vec3(.97,.93,.75),glint);pigment=mix(pigment,white,opening);
        float brow=(1.-smoothstep(.08,.22,abs(eye.y-1.22-eye.x*.12)))*(1.-smoothstep(.8,1.12,abs(eye.x)));
        pigment=mix(pigment,mammalCoat*.28,brow);
      }
      if(z>mammalForm.x+5.&&abs(y-36.)<8.&&ax<mammalForm.y*mammalForm.w){
        float noseWidth=mammalKind==2.?.42:mammalKind==4.?.55:mammalKind==0.?.88:.72;
        vec2 pad=vec2(ax/(mammalForm.y*noseWidth*mammalForm.w),(y-36.)/(mammalKind==2.?3.8:6.));
        float rim=mammalKind==0.?1.-smoothstep(.85,1.,length(pad)):smoothstep(mammalForm.x+7.,mammalForm.x+10.,z);
        vec3 nose=mammalKind==0.?vec3(.36,.19,.12):vec3(.035,.029,.023);
        if(mammalKind==0.)nose=mix(nose,vec3(.027,.017,.014),1.-smoothstep(.8,1.,length(vec2((ax-4.8)/1.9,(y-37.)/1.5))));
        pigment=mix(pigment,nose,rim);
      }
      diffuseColor.rgb=pigment*(.94+.06*smoothstep(8.,65.,y));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance+=mammalTrim*heat*.3;');
  };
  material.customProgramCacheKey=()=> 'continuous-mammal-face-v1';
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name=source.name;mesh.userData={...source.userData,ownedMaterial:true};mesh.castShadow=mesh.receiveShadow=true;
  body.remove(source);body.add(mesh);body.updateWorldMatrix(true,true);const skeleton=new T.Skeleton(bones);mesh.bind(skeleton);
  mesh.boundingSphere=new T.Sphere(new T.Vector3(0,35,-10),145);mesh.normalizeSkinWeights();
  return ()=>{skeleton.dispose();bones.forEach(bone=>bone.removeFromParent());};
}
