import * as T from 'three';
import type { CreatureShape } from './CreatureCatalog';

const floor=new T.PlaneGeometry(1,1);
/** Presentation bounds exclude particles/glow, so elite HP bars and portraits
 * follow the actual model instead of a large invisible effects envelope. */
export function creatureBodyBounds(root:T.Object3D):T.Box3 {
  // SkinnedMesh updates its attached bind inverse in updateMatrixWorld, not
  // updateWorldMatrix. Synchronize ancestors, then invoke that override before
  // measuring; otherwise a newly translated/scaled skin is transformed twice.
  root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);const bounds=new T.Box3();
  root.traverse(part=>{
    if(!(part instanceof T.Mesh)||part.userData.visualEffect)return;
    if(part instanceof T.SkinnedMesh){part.computeBoundingBox();bounds.union(part.boundingBox!.clone().applyMatrix4(part.matrixWorld));}
    else {part.geometry.computeBoundingBox();bounds.union(part.geometry.boundingBox!.clone().applyMatrix4(part.matrixWorld));}
  });return bounds;
}
/** Sparse, feathered wisps stay close to the shoulders/chitin. A closed sphere
 * looked like a force field and hid the elite's outline at the gameplay camera. */
export function createEliteAura(body:T.Group,shape:CreatureShape,accent:number):{step:(dt:number)=>void;dispose:()=>void} {
  const bounds=creatureBodyBounds(body),size=bounds.getSize(new T.Vector3());
  const height=Math.min(165,Math.max(45,bounds.max.y));
  const baseRadius=['spider','beetle','scorpion'].includes(shape)?49:['dragon','wyvern'].includes(shape)?48:shape==='goblin'?37:38;
  const radius=Math.max(baseRadius,Math.min(85,size.x*.5));
  const color=new T.Color(accent).lerp(new T.Color(0xebc778),.65);
  const positions:number[]=[],uvs:number[]=[],centers:number[]=[],phases:number[]=[],indices:number[]=[];
  const low=['spider','beetle','scorpion','slime'].includes(shape);
  for(let i=0;i<8;i++){
    const angle=i*Math.PI*2/8+.23,base=positions.length/3,phase=i*.618%1;
    const y=height*(low?.28:.2),r=radius*(.78+(i%3)*.05);
    for(const [x,z] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      positions.push(x*(low?4:3.3),z*(low?8:12),0);uvs.push((x+1)*.5,(z+1)*.5);
      centers.push(Math.cos(angle)*r,y,Math.sin(angle)*r*.8);phases.push(phase);
    }
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('center',new T.Float32BufferAttribute(centers,3));geometry.setAttribute('phase',new T.Float32BufferAttribute(phases,1));geometry.setIndex(indices);
  const material=new T.ShaderMaterial({uniforms:{color:{value:color},time:{value:0},rise:{value:height*(low?.24:.52)}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform float time;uniform float rise;attribute vec3 center;attribute float phase;varying vec2 uvLocal;varying float life;void main(){uvLocal=uv;float t=fract(phase+time*.13);life=sin(t*3.14159);vec3 c=center;c.y+=t*rise;c.x+=sin(time*1.4+phase*6.28)*1.5;vec4 p=modelViewMatrix*vec4(c,1.);float scale=length(modelMatrix[0].xyz);p.xy+=position.xy*scale;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform vec3 color;varying vec2 uvLocal;varying float life;void main(){vec2 p=(uvLocal-.5)*2.;float feather=exp(-dot(p,p)*3.5)*(1.-smoothstep(.55,1.,length(p)));gl_FragColor=vec4(color,feather*life*.19);}`});
  const glow=new T.Mesh(geometry,material);glow.name='elite-aura';glow.userData.visualEffect=true;glow.frustumCulled=false;body.add(glow);
  const groundMaterial=new T.ShaderMaterial({uniforms:{color:{value:color},time:material.uniforms.time},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`varying vec2 uvLocal;void main(){uvLocal=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 color;uniform float time;varying vec2 uvLocal;void main(){float r=length(uvLocal-.5)*2.;float glow=exp(-pow((r-.58)*5.,2.))*(1.-smoothstep(.7,1.,r));gl_FragColor=vec4(color,glow*(.1+.012*sin(time*2.)));}`});
  const ground=new T.Mesh(floor,groundMaterial);ground.name='elite-ground-glow';ground.userData.visualEffect=true;ground.rotation.x=-Math.PI/2;ground.position.y=1;ground.scale.setScalar(radius*2.3);body.add(ground);
  return {step(dt){material.uniforms.time.value+=Math.min(dt,.05);},dispose(){body.remove(glow,ground);geometry.dispose();material.dispose();groundMaterial.dispose();}};
}
