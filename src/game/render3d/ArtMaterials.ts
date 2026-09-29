import { REGION_GEOGRAPHY } from '../world/RegionGeography';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Shared bevels catch the key light without adding a separate outline pass. */
export const softBox = new RoundedBoxGeometry(1, 1, 1, 1, .1);
export const softOrb = new T.IcosahedronGeometry(1, 2);
const surfaceTime={value:0};
export function updateArtMaterials(timeMs:number):void {surfaceTime.value=timeMs*.001;}

const shadowGeometry = new T.PlaneGeometry(2, 2);
const shadowMaterial = new T.ShaderMaterial({
  transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec2 vUv; void main(){float r=length((vUv-.5)*2.);float a=(1.-smoothstep(.05,1.,r))*.24;gl_FragColor=vec4(.055,.095,.11,a);}`,
});

/** Soft contact occlusion, independent of the resolution of the moving sun map. */
export function contactShadow(width: number, depth = width): T.Mesh {
  const mesh = new T.Mesh(shadowGeometry, shadowMaterial);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(width, depth, 1);
  mesh.position.y = 1.2;
  mesh.renderOrder = 1;
  return mesh;
}

const noiseGLSL = `
float artHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float artNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(artHash(i),artHash(i+vec2(1.,0.)),f.x),mix(artHash(i+vec2(0.,1.)),artHash(i+1.),f.x),f.y);}
`;

/** World-space colour layers stay continuous between terrain triangles. */
export function groundMaterial(region: number): T.MeshStandardMaterial {
  const palette=REGION_GEOGRAPHY[region-1];
  const color=(hex:number)=>{const c=new T.Color(hex);return 'vec3('+[c.r,c.g,c.b].map(v=>v.toFixed(4)).join(',')+')';};
  const volcanic=region===4||region===8,dry=region===2||region===7;
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vArtPosition;varying vec3 vArtNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvArtPosition=(modelMatrix*vec4(transformed,1.)).xyz;vArtNormal=normalize((modelMatrix*vec4(normal,0.)).xyz);');
    shader.fragmentShader='varying vec3 vArtPosition;varying vec3 vArtNormal;\n'+noiseGLSL+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=vArtPosition.xz;
      float broad=artNoise(p*.0028),terrainPatch=artNoise(p*.0065+vec2(broad*.7)),grain=artNoise(p*.095);
      float exposed=smoothstep(.035,.19,1.-vArtNormal.y);
      float soil=smoothstep(.53,.81,terrainPatch+exposed*.45);
      float gravel=smoothstep(.64,.83,artNoise(p*.032)+exposed*.35);
      diffuseColor.rgb=mix(diffuseColor.rgb,${color(palette.soil)},soil*.28);
      diffuseColor.rgb=mix(diffuseColor.rgb,${color(palette.rock)},gravel*.22+exposed*.28);
      diffuseColor.rgb*=.93+broad*.11+grain*.055;
      float flakes=smoothstep(.72,.84,artNoise(p*.13))*smoothstep(.54,.72,terrainPatch);
      diffuseColor.rgb=mix(diffuseColor.rgb,${color(palette.light)},flakes*.10);
      ${volcanic||dry?`
        vec2 cell=p/${volcanic?'120.':'110.'}+vec2(artNoise(p*.018),artNoise(p*.021+23.))*.35,tile=floor(cell),f=fract(cell);float first=9.,second=9.;
        for(int iy=-1;iy<=1;iy++)for(int ix=-1;ix<=1;ix++){
          vec2 offset=vec2(float(ix),float(iy)),seed=tile+offset;
          float d=length(offset+.18+.64*vec2(artHash(seed),artHash(seed+41.7))-f);
          if(d<first){second=first;first=d;}else second=min(second,d);
        }
        float fissureMask=smoothstep(.34,.6,terrainPatch);
        float seam=(1.-smoothstep(.006,.030,second-first))*fissureMask;
        float rim=(1.-smoothstep(.018,.065,second-first))*(1.-seam)*fissureMask;
        diffuseColor.rgb*=1.-seam*.24;
        diffuseColor.rgb+=${color(palette.light)}*rim*.10;
        ${volcanic?`float hot=seam*smoothstep(.63,.79,broad)*.75;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.95,.25,.025),hot);`:''}
      `:region===3?`float strata=smoothstep(.72,.88,artNoise(vec2(p.x*.016+p.y*.012,p.y*.058)));diffuseColor.rgb=mix(diffuseColor.rgb,${color(palette.detail)},strata*.25);`:region===6?`float mineral=smoothstep(.64,.82,artNoise(p*.005))*smoothstep(.4,.7,terrainPatch);diffuseColor.rgb=mix(diffuseColor.rgb,${color(palette.detail)},mineral*.5);`:`float moss=smoothstep(.56,.8,artNoise(p*.008))* (1.-soil);diffuseColor.rgb=mix(diffuseColor.rgb,${color(palette.detail)},moss*.16);`}
    `);
  };
  material.customProgramCacheKey=()=> 'ruin-geography-ground-'+region;
  return material;
}

/** Water and lava have their own surface response instead of painted terrain. */
export function boundarySurfaceMaterial(lava: boolean): T.MeshStandardMaterial {
  const material = new T.MeshStandardMaterial({
    color: lava ? 0xf16c27 : 0x338f9b,
    emissive: lava ? 0xf04b12 : 0x164853, emissiveIntensity: lava ? .65 : .13,
    roughness: lava ? .68 : .3, metalness: lava ? 0 : .08, vertexColors: true,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.artTime=surfaceTime;
    shader.vertexShader = `varying vec3 vArtPosition;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvArtPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader = `uniform float artTime;\nvarying vec3 vArtPosition;\n${noiseGLSL}\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 flowPosition=vArtPosition.xz+vec2(artTime*2.7,-artTime*5.);
      float ripples=pow(.5+.5*sin(flowPosition.y*.068+artNoise(flowPosition*.007)*9.),14.);
      diffuseColor.rgb+=vec3(${lava ? '.19,.08,.006' : '.035,.065,.060'})*ripples;
      ${lava ? `float crust=smoothstep(.57,.61,artNoise(flowPosition*.012))*smoothstep(.43,.47,artNoise(flowPosition*.026));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.12,.075,.09),crust*.88);` : ''}
    `);
    if(lava)shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=1.-crust*.94;');
  };
  material.customProgramCacheKey = () => lava ? 'ruin-lava' : 'ruin-river';
  return material;
}
