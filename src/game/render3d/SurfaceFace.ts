import * as T from 'three';
export type SurfaceFaceFrame={x:number;y:number;z:number;width:number;height:number;kind:'bug'|'soft'|'owl'|'flesh'|'reptile'|'stone';accent:number;veteran?:boolean;lightEyes?:boolean};
/** Pigment in the authored frame; no white/pupil meshes ahead of the face. */
export function paintSurfaceFace(mesh:T.Mesh,face:SurfaceFaceFrame):void{
  const old=mesh.material as T.MeshStandardMaterial,material=old.clone();
  if(mesh.userData.ownedMaterial)old.dispose();
  mesh.updateMatrix();const frame=mesh.matrix.clone();
  material.onBeforeCompile=shader=>{
    shader.uniforms.faceRestFrame={value:frame};shader.uniforms.faceFrame={value:new T.Vector4(face.x,face.y,face.width,face.height)};
    shader.uniforms.faceDepth={value:face.z};shader.uniforms.faceAccent={value:new T.Color(face.accent)};
    shader.uniforms.faceKind={value:['bug','soft','owl','flesh','reptile','stone'].indexOf(face.kind)};
    shader.uniforms.faceVeteran={value:face.veteran?1:0};
    shader.uniforms.faceLightEyes={value:face.lightEyes?1:0};
    shader.vertexShader='varying vec3 surfaceFaceRest;uniform mat4 faceRestFrame;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n surfaceFaceRest=(faceRestFrame*vec4(position,1.)).xyz;');
    shader.fragmentShader='varying vec3 surfaceFaceRest;uniform vec4 faceFrame;uniform float faceDepth;uniform vec3 faceAccent;uniform float faceKind;uniform float faceVeteran;uniform float faceLightEyes;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float ax=abs(surfaceFaceRest.x),fy=surfaceFaceRest.y,fz=surfaceFaceRest.z;
      vec2 eye=vec2((ax-faceFrame.x)/faceFrame.z,(fy-faceFrame.y+(ax-faceFrame.x)*.1)/faceFrame.w);
      float er=length(eye),ea=clamp(fwidth(er),.013,.18);
      float pupil=length((eye-vec2(-.1,.01))/vec2(faceKind==4.?.23:.43,.72)),pa=clamp(fwidth(pupil),.02,.22);
      float eyePaint=0.;
      if(fz>faceDepth&&abs(fy-faceFrame.y)<faceFrame.w*1.3){
        if(faceKind==2.)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.65,.53,.33),(1.-smoothstep(1.25,1.5,er))*.7);
        eyePaint=1.-smoothstep(1.-ea,1.+ea,er);
        if(faceKind==0.||faceKind==3.||faceKind==4.)eyePaint*=1.-smoothstep(.6,.8,eye.y+eye.x*.12);
        if(faceVeteran>.5)eyePaint*=1.-smoothstep(.42,.65,eye.y+eye.x*.22);
        vec3 white=faceKind==4.?vec3(.89,.53,.09):vec3(.86,.77,.54);
        vec3 iris=mix(white,vec3(.014,.022,.017),1.-smoothstep(1.-pa,1.+pa,pupil));
        if(faceKind==0.&&faceLightEyes<.5||faceKind==1.||faceKind==2.)iris=vec3(.018,.028,.022);
        if(faceKind==5.)iris=mix(faceAccent,vec3(.018,.026,.024),1.-smoothstep(1.-pa,1.+pa,pupil));
        float glint=1.-smoothstep(.06,.16,length(eye-vec2(-.23,.27)));
        iris=mix(iris,vec3(.99,.94,.74),glint);
        float rim=(1.-smoothstep(1.05,1.2,er))*(1.-eyePaint);
        diffuseColor.rgb*=1.-rim*.4;
        diffuseColor.rgb=mix(diffuseColor.rgb,iris,eyePaint);
      }
    `);
    // One shader program for all fitted faces. A JS-only stone branch under a
    // shared cache key let whichever species compiled first set others' glow.
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=faceAccent*eyePaint*.22*step(4.5,faceKind)*smoothstep(.75,1.,pupil);');
  };
  material.customProgramCacheKey=()=> 'fitted-surface-face-v5';mesh.material=material;mesh.userData.ownedMaterial=true;mesh.userData.surfaceFace={...face};
}
