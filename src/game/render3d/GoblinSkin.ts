import * as T from 'three';
import { GOBLIN_FACE } from './CreatureSculpt';
import { HUMANOID_FORMS, type HumanoidShape } from './HumanoidForms';

/** Bind one authored humanoid surface to the existing animation anchors.
 * The eye regions are part of the skin; joints carry its tusks/equipment in a
 * frame. All instances reuse baked geometry/weights; each owns its skeleton. */
export function bindGoblinSkin(body:T.Group,head:T.Group|undefined,arms:T.Group[],legs:T.Group[],knees:T.Group[]):(()=>void)|undefined {
  const source=body.getObjectByName('goblin-continuous-surface')??body.getObjectByName('humanoid-continuous-surface');
  if(!(source instanceof T.Mesh)||!head||knees.length!==2)return;
  const anchors=[body,head,arms[0]??body,arms[1]??body,legs[0],legs[1],knees[0],knees[1]];
  const bones=anchors.map((anchor,i)=>{
    const bone=new T.Bone();bone.name='goblin-skin-joint-'+i;anchor.add(bone);return bone;
  });
  const geometry=source.geometry;
  const authored=source.userData.humanoid as {shape:HumanoidShape;primary:number;accent:number;mass:number;heavy:boolean}|undefined;
  const form=authored?HUMANOID_FORMS[authored.shape]:undefined;
  const heavy=!!authored?.heavy,hipWidth=heavy?27:19,armStart=heavy?28:13,armEnd=heavy?39:24;
  if(!geometry.getAttribute('skinWeight')){
    const p=geometry.getAttribute('position'),indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),side=x>0?1:0,ax=Math.abs(x);
      let a=0,b=1,t=T.MathUtils.smoothstep(y,74,84);
      if(y<31||(y<39&&ax<hipWidth)){
        // At the crotch, blend both thighs; below it each side has its own knee.
        if(y>29&&ax<5){a=4;b=5;t=T.MathUtils.smoothstep(x,-5,5);}
        else {a=4+side;b=6+side;t=1-T.MathUtils.smoothstep(y,18,28);}
        const hip=T.MathUtils.smoothstep(y,29,39);
        indices.set([a,b,0,0],i*4);weights.set([(1-t)*(1-hip),t*(1-hip),hip,0],i*4);continue;
      }
      // Shoulder skin interpolates continuously into the torso. Exclude ears
      // and cheek corners; only the arm's anatomical envelope follows the arm.
      if(arms.length===2&&y>32&&y<77&&ax>armStart&&z<13){
        a=0;b=2+side;
        const shoulderWidth=T.MathUtils.lerp(armEnd-4,armEnd,T.MathUtils.smoothstep(y,51,61));
        t=T.MathUtils.smoothstep(ax,armStart,shoulderWidth)*(1-T.MathUtils.smoothstep(y,68,77));
        if(y<53&&ax>hipWidth)t=1;
      }
      indices.set([a,b,0,0],i*4);weights.set([1-t,t,0,0],i*4);
    }
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  }
  const elite=!!body.userData.eliteAnatomy;
  const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.84});
  material.onBeforeCompile=shader=>{
    shader.uniforms.goblinGreen={value:new T.Color(authored?(form!.kind===4||form!.kind===6||form!.kind===7?authored.primary:0xc6a17b):elite?0x668d3b:0x7eab42)};
    shader.uniforms.goblinEyeWhite={value:new T.Color(0xf0e3b1)};
    shader.uniforms.goblinEyeFrame={value:new T.Vector4(form?.eyeX??GOBLIN_FACE.eyeX,form?.eyeY??GOBLIN_FACE.eyeY,form?.eyeWidth??GOBLIN_FACE.eyeWidth,form?.eyeHeight??GOBLIN_FACE.eyeHeight)};
    shader.uniforms.goblinEyeSlope={value:GOBLIN_FACE.eyeSlope};
    shader.uniforms.goblinLeather={value:new T.Color(elite?0x503927:0x794e2d)};
    shader.uniforms.goblinMass={value:elite?1.16:1};
    shader.uniforms.goblinElite={value:elite?1:0};
    shader.uniforms.humanoidKind={value:form?.kind??0};
    shader.uniforms.humanoidCoat={value:new T.Color(authored?.primary??0x794e2d)};
    shader.uniforms.humanoidTrim={value:new T.Color(authored?.accent??0xba9653)};
    shader.vertexShader='varying vec3 goblinRest;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n goblinRest = position;');
    shader.fragmentShader='varying vec3 goblinRest; uniform vec3 goblinGreen; uniform vec3 goblinEyeWhite; uniform vec4 goblinEyeFrame; uniform float goblinEyeSlope; uniform vec3 goblinLeather; uniform float goblinMass; uniform float goblinElite;uniform float humanoidKind;uniform vec3 humanoidCoat;uniform vec3 humanoidTrim;\n'+shader.fragmentShader;
    // Evaluate fitted garment edges per fragment in the bind frame. Interpolated
    // coarse vertex colours turned the neckline/armholes into brown/green spikes.
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float ax=abs(goblinRest.x), y=goblinRest.y, z=goblinRest.z;
      vec3 pigment=goblinGreen;
      if(y<19.&&ax<20.*goblinMass) pigment=vec3(.128,.063,.026);
      else if(y<36.&&ax<20.*goblinMass) pigment=vec3(.060,.056,.025);
      float opening=4.8+max(0.,y-61.)*.52;
      bool vest=y>39.&&y<74.&&ax<18.8*goblinMass&&(z<5.||ax>opening);
      vec3 shoulderPoint=vec3(ax-18.*goblinMass,y-69.,z);
      float cap=dot(shoulderPoint/vec3(10.*goblinMass,7.,10.),shoulderPoint/vec3(10.*goblinMass,7.,10.));
      bool shoulder=ax>15.*goblinMass&&y>63.&&cap<1.;
      bool cuff=y>43.&&y<49.&&ax>22.*goblinMass;
      if(vest||shoulder||cuff) pigment=goblinLeather;
      if(vest&&z>6.) {
        float edge=ax-opening;
        float lapel=1.-smoothstep(.65,1.3,edge);
        pigment=mix(pigment,goblinLeather*1.27,lapel);
        float seam=1.-smoothstep(.18,.45,abs(edge-1.7));
        float stitch=1.-smoothstep(.25,.7,abs(mod(y+1.7,4.8)-2.4));
        pigment=mix(pigment,vec3(.43,.30,.13),seam*stitch*.7);
      }
      if(shoulder&&cap>.75) pigment*=.83;
      if(cuff) {
        float rim=1.-smoothstep(.4,.9,min(abs(y-43.6),abs(y-48.3)));
        pigment=mix(pigment,goblinLeather*1.3,rim*.7);
        if(z>6.) {
          float stud=1.-smoothstep(.6,.95,length(vec2(ax-26.5*goblinMass,y-46.)));
          pigment=mix(pigment,vec3(.47,.34,.14),stud);
        }
      }
      if(y>34.&&y<39.&&ax<19.*goblinMass) pigment=vec3(.035,.024,.013);
      if(y>17.5&&y<19.&&ax<20.*goblinMass) pigment=vec3(.22,.122,.049);
      if(humanoidKind==0.&&ax>22.&&y>95.&&z>1.) {
        float inner=1.-smoothstep(.3,1.,abs(y-(99.+(ax-25.)*.9))/4.5);
        pigment=mix(pigment,vec3(.13,.205,.037),inner*.5);
      }
      if(y<17.5&&ax<20.*goblinMass&&z>8.) {
        float toeSeam=1.-smoothstep(.25,.65,abs(z-13.));
        pigment*=1.-toeSeam*.15;
      }
      bool metal=goblinElite>.5&&((shoulder&&y>65.)||(vest&&z>8.&&y>52.));
      if(metal) pigment=vec3(.13,.185,.15);
      if(humanoidKind>0.){
        // Other silhouettes have their own material regions; the goblin's
        // shoulder/vest metal mask must not leave metallic spots on cloth.
        metal=false;
        bool sleeve=y>46.&&y<85.&&ax>(humanoidKind==4.||humanoidKind==5.?21.:12.);
        bool torso=y>37.&&y<79.&&ax<(humanoidKind==4.||humanoidKind==5.?30.:22.);
        if(torso||sleeve||humanoidKind==2.&&y>20.&&y<82.)pigment=humanoidCoat;
        if(y>=19.&&y<37.)pigment=humanoidCoat*.48;
        if(y<19.)pigment=vec3(.065,.04,.022);
        if(y>36.&&y<41.&&ax<(humanoidKind==4.||humanoidKind==5.?30.:22.)){
          pigment=vec3(.035,.022,.012);
          if(z>10.&&ax<4.)pigment=humanoidTrim;
        }
        if(sleeve&&y<51.)pigment=humanoidCoat*.53;
        if((torso||sleeve)&&z>9.){
          float stitch=1.-smoothstep(.18,.5,abs(mod(y+1.,5.)-2.5));
          float seam=1.-smoothstep(.18,.7,abs(ax-(humanoidKind==4.||humanoidKind==5.?24.:16.)));
          pigment=mix(pigment,humanoidTrim,seam*stitch*.3);
        }
        if(humanoidKind==1.||humanoidKind==2.){
          if(y>78.)pigment=humanoidCoat*.83;
          float face=length(vec2(goblinRest.x/12.,(y-91.)/11.));
          if(y>83.&&y<102.&&z>12.)pigment=mix(pigment,goblinGreen,1.-smoothstep(.78,.96,face));
          if(y<90.&&y>79.&&z>12.)pigment=humanoidCoat*.46;
          if(z>12.&&y>91.&&y<102.){
            // The brow sits inside the hood aperture, never on a separate plate.
            // Inner corners drop toward the bridge; veterans have a heavier lid.
            float browY=goblinEyeFrame.y+goblinEyeFrame.w+1.4+(ax-goblinEyeFrame.x)*.24;
            float brow=(1.-smoothstep(.55,.95+goblinElite*.2,abs(y-browY)))*(1.-smoothstep(.9,1.2,abs(ax-goblinEyeFrame.x)/(goblinEyeFrame.z+.5)));
            brow*=1.-smoothstep(.78,.91,face);
            pigment=mix(pigment,humanoidCoat*.24,brow);
          }
          if(y>102.&&z>0.){
            float hoodSeam=1.-smoothstep(.3,.75,ax);
            pigment=mix(pigment,humanoidCoat*1.18,hoodSeam*.55);
          }
          if(sleeve&&y<53.){
            float cuffEdge=1.-smoothstep(.3,.8,abs(y-50.));
            pigment=mix(pigment,humanoidTrim,cuffEdge*.55);
          }
          if(y<19.&&z>9.){
            float bootEdge=1.-smoothstep(.3,.7,abs(y-16.));
            pigment=mix(pigment,goblinLeather*.8,bootEdge*.55);
            if(y<4.)pigment*=.55;
          }
          if(torso&&z>8.){
            float trim=1.-smoothstep(.4,.85,abs(ax-(5.+(y-45.)*.15)));
            pigment=mix(pigment,humanoidTrim,trim*.6);
            float clasp=1.-smoothstep(1.2,1.8,length(vec2(goblinRest.x,y-68.)));
            pigment=mix(pigment,humanoidTrim,clasp);
            if(humanoidKind==1.&&goblinElite>.5&&y>46.&&y<75.){
              pigment=mix(pigment,vec3(.13,.18,.17),smoothstep(10.,14.,z));
              metal=z>12.;
              float plateSeam=1.-smoothstep(.35,.85,abs(y-(56.+ax*.24)));
              pigment*=1.-plateSeam*.4;
            }
          }
        }
        if(humanoidKind==3.||humanoidKind==7.){
          pigment=humanoidCoat;
          if(humanoidKind==3.&&y>90.&&y<97.&&z>14.)pigment=humanoidCoat*.16;
          metal=humanoidKind==3.;
          if(humanoidKind==3.){
            pigment*=.8+.25*smoothstep(-6.,15.,z);
            if(y>26.&&y<34.||y>52.&&y<58.&&ax>22.)pigment*=.45;
            float chestEdge=abs(y-(75.-ax*.45));
            float waistEdge=abs(y-45.), shinEdge=abs(y-27.);
            float trim=(1.-smoothstep(.5,1.25,min(chestEdge,waistEdge)))*step(10.,z)*step(ax,18.);
            trim=max(trim,(1.-smoothstep(.6,1.1,shinEdge))*step(8.,z)*step(y,33.));
            trim=max(trim,(1.-smoothstep(.55,1.2,abs(y-70.)))*step(19.,ax));
            pigment=mix(pigment,humanoidTrim,trim);
            if(y>99.&&ax<2.3) pigment=humanoidTrim*.75;
            float badge=abs(goblinRest.x)/3.3+abs(y-65.)/5.;
            if(z>16.&&badge<1.)pigment=humanoidTrim;
            float slit=1.-smoothstep(.3,.7,abs(y-84.));
            if(z>14.&&ax<10.)pigment*=1.-slit*.65;
          }
        }
        if(humanoidKind==4.){
          if(y>40.&&y<78.)pigment=goblinGreen;
          float strap=1.-smoothstep(2.,3.,abs(goblinRest.x-(y-59.)*.55));
          if(y>35.&&y<79.&&z>9.)pigment=mix(pigment,goblinLeather,strap);
          if(ax>21.&&y>60.&&y<80.)pigment=mix(pigment,vec3(.16,.24,.095),.6);
        }
        if(humanoidKind==5.){
          if(y>29.&&y<76.&&z>10.&&ax<22.)pigment=vec3(.29,.14,.055);
          if(y>70.&&y<90.&&z>9.){
            float beard=1.-smoothstep(.8,1.02,length(vec2(goblinRest.x/14.,(y-81.)/11.)));
            vec3 hair=vec3(.19,.095,.035);
            float locks=1.-smoothstep(.45,1.1,abs(mod(ax+(89.-y)*.09,4.2)-2.1));
            hair=mix(hair,vec3(.29,.16,.065),locks*.3);
            pigment=mix(pigment,hair,beard);
          }
          if(y>86.&&y<93.&&z>14.){
            float moustache=1.-smoothstep(.72,1.,length(vec2((ax-5.5)/7.,(y-(90.-ax*.15))/2.8)));
            pigment=mix(pigment,vec3(.23,.115,.045),moustache);
          }
          if(y>84.&&y<104.&&z>8.){
            float lens=length(vec2((ax-goblinEyeFrame.x)/6.,(y-goblinEyeFrame.y)/5.));
            pigment=mix(pigment,vec3(.015,.02,.018),1.-smoothstep(.78,1.,lens));
            pigment=mix(pigment,vec3(.55,.33,.09),(1.-smoothstep(1.,1.13,lens))*smoothstep(.7,.84,lens));
          }
        }
        if(humanoidKind==7.&&goblinElite>.5){
          float mantle=smoothstep(63.,72.,y)*(1.-smoothstep(80.,85.,y));
          pigment=mix(pigment,humanoidCoat*.55,mantle*.65);
          if(y>105.)pigment=mix(pigment,humanoidTrim,.6);
          if(z>12.&&y>49.&&y<74.){
            float rune=1.-smoothstep(.4,1.2,abs(ax-abs(y-61.)*.55));
            pigment=mix(pigment,humanoidTrim,rune*.55);
          }
        }
        if(humanoidKind==8.){
          if(y>77.)pigment=goblinGreen;
          if(y>104.||y>91.&&ax>13.||y>83.&&z<0.)pigment=humanoidCoat;
          if(y<35.)pigment=humanoidCoat;
          float feather=(1.-smoothstep(.3,.9,abs(mod(y+ax*.3,7.)-3.5)))*smoothstep(36.,42.,y)*(1.-smoothstep(70.,77.,y));
          pigment=mix(pigment,humanoidTrim,feather*.3);
          if(goblinElite>.5){
            if(y>113.)pigment=humanoidTrim;
            if(y>69.&&y<85.)pigment=mix(pigment,humanoidTrim,.7);
          }
        }
        if(humanoidKind==4.||humanoidKind==5.||humanoidKind==6.||humanoidKind==7.||humanoidKind==8.){
          // Fitted expression belongs to the deforming skin, like the eyes.
          // Keep the bridge, mouth and eyebrows distinct at gameplay distance.
          if(z>12.){
            float browY=goblinEyeFrame.y+goblinEyeFrame.w+1.5-(ax-goblinEyeFrame.x)*.16;
            float brow=(1.-smoothstep(.48,1.05,abs(y-browY)))*(1.-smoothstep(1.,1.4,abs(ax-goblinEyeFrame.x)/(goblinEyeFrame.z+1.)));
            pigment=mix(pigment,humanoidKind==5.?vec3(.19,.095,.035):goblinGreen*.37,brow);
            float nose=1.-smoothstep(.65,1.15,length(vec2((ax-2.3)/.9,(y-(goblinEyeFrame.y-8.5))/.6)));
            pigment=mix(pigment,goblinGreen*.3,nose*.8);
            float mouthY=goblinEyeFrame.y-14.+pow(ax/11.,2.)*1.1;
            float lip=(1.-smoothstep(.32,.7,abs(y-mouthY)))*(1.-smoothstep(8.,12.,ax));
            pigment=mix(pigment,humanoidKind==5.?vec3(.055,.025,.015):goblinGreen*.26,lip*.8);
          }
        }
      }
      // Derivatives must be evaluated before the face branch; otherwise GPUs
      // can draw dotted white seams at the branch's Y/Z limits.
      vec2 eye=vec2((ax-goblinEyeFrame.x)/goblinEyeFrame.z,
        (y-goblinEyeFrame.y+(ax-goblinEyeFrame.x)*goblinEyeSlope)/goblinEyeFrame.w);
      float r=length(eye), aa=clamp(fwidth(r),.012,.18);
      float iris=length((eye-vec2(-.13,.02))/vec2(.39,.73));
      float irisEdge=clamp(fwidth(iris),.018,.22);
      // Face colours are evaluated on the actual deformed skull. There are no
      // floating whites/pupils and no rigid eye surface ahead of the skin.
      if(y>goblinEyeFrame.y-goblinEyeFrame.w*1.25&&y<goblinEyeFrame.y+goblinEyeFrame.w*1.25&&z>12.) {
        float aperture=1.-smoothstep(1.-aa,1.+aa,r);
        if(humanoidKind>0.&&humanoidKind!=5.)aperture*=1.-smoothstep(.55,.73,eye.y+eye.x*(goblinElite>.5?.3:.14));
        float lid=(1.-smoothstep(1.,1.14,r))*(1.-aperture);
        pigment=mix(pigment,goblinGreen*.58,lid);
        vec3 eyeball=mix(goblinEyeWhite,vec3(.105,.061,.023),1.-smoothstep(1.-irisEdge,1.+irisEdge,iris));
        eyeball=mix(eyeball,vec3(.008,.012,.005),1.-smoothstep(.53-irisEdge,.53+irisEdge,iris));
        float glint=1.-smoothstep(.06,.13,length(eye-vec2(-.25,.28)));
        eyeball=mix(eyeball,vec3(.97,.94,.74),glint);
        vec3 eyePigment=humanoidKind==3.?humanoidTrim:humanoidKind==7.?mix(humanoidTrim,eyeball,.8):eyeball;
        pigment=mix(pigment,eyePigment,aperture);
      }
      diffuseColor.rgb=pigment*(.95+.05*smoothstep(30.,99.,y));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\n roughnessFactor=humanoidKind>0.?(metal?.52:(humanoidKind==1.||humanoidKind==2.? .92:humanoidKind==7.? .88:.8)):(metal?.52:(vest||shoulder||cuff||y<39.)?.9:.76);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',
      '#include <metalnessmap_fragment>\n metalnessFactor=metal?.22:0.;');
  };
  material.customProgramCacheKey=()=> 'continuous-humanoid-face-and-garment-v14';
  const mesh=new T.SkinnedMesh(geometry,material);
  mesh.name=source.name;mesh.userData={...source.userData,ownedMaterial:true};
  mesh.castShadow=mesh.receiveShadow=true;
  body.remove(source);body.add(mesh);body.updateWorldMatrix(true,true);
  const skeleton=new T.Skeleton(bones);mesh.bind(skeleton);
  // Rendering uses the skeleton; culling covers every shoulder/leg pose, rather
  // than keeping the much smaller static bind-pose sphere during an attack.
  mesh.boundingSphere=new T.Sphere(new T.Vector3(0,55,4),100);
  mesh.normalizeSkinWeights();
  return ()=>{skeleton.dispose();bones.forEach(bone=>bone.removeFromParent());};
}
