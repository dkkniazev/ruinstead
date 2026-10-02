import * as T from 'three';
import type { CreatureShape } from './CreatureCatalog';

const iris = new T.SphereGeometry(1, 8, 6);
const outline = new T.Shape();
outline.moveTo(-1, 0);
for (const [x,y] of [[-.65,.52],[0,.7],[.65,.48],[1,0],[.62,-.43],[0,-.58],[-.65,-.4]]) outline.lineTo(x,y);
outline.closePath();
const almond = new T.ExtrudeGeometry(outline, {depth:.2,bevelEnabled:false});
almond.translate(0,0,-.1);
const geometries = new Set<T.BufferGeometry>([iris,almond]);
const materials = new Map<string,T.MeshStandardMaterial>();

function pigment(color:number,glow=false,gloss=false):T.MeshStandardMaterial {
  const key=[color,glow,gloss].join(':');let material=materials.get(key);
  if(!material){material=new T.MeshStandardMaterial({color,roughness:gloss?.28:.78,emissive:glow?color:0,emissiveIntensity:glow?.55:0});materials.set(key,material);}
  return material;
}
function add(parent:T.Object3D,geometry:T.BufferGeometry,color:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,glow=false,gloss=false):T.Mesh {
  const mesh=new T.Mesh(geometry,pigment(color,glow,gloss));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
}

/** Flat fitted eyelids, species-specific pupils and a small readable catchlight. */
export function createCreatureEyes(parent:T.Object3D,shape:CreatureShape,primary:number,accent:number,y:number,z:number,spread:number):void {
  const bug=['beetle','spider','scorpion'].includes(shape);
  const stone=['golem','sand','scrap','treant','gargoyle'].includes(shape);
  const magic=['wisp','flame'].includes(shape),soft=['slime','mushroom'].includes(shape);
  const reptile=['salamander','drake','wyvern','dragon','serpent'].includes(shape);
  const masked=['rogue','cultist','knight'].includes(shape);
  const lid=new T.Color(primary).multiplyScalar(stone?.38:.58).getHex();
  for(const side of [-1,1]){
    const eye=new T.Group();eye.name='creature-eye';eye.position.set(side*spread,y,z);
    eye.userData.creatureHead=true;eye.userData.faceEye=side;parent.add(eye);
    if(stone||magic){
      const socket=add(eye,almond,lid,0,0,0,5.2,3.7,2);socket.rotation.z=side*.18;
      const light=add(eye,almond,shape==='treant'?0xd8bc73:magic?0xffe0a3:accent,0,0,.45,3.6,2.1,1,true);light.rotation.z=side*.18;
      continue;
    }
    if(bug){
      add(eye,iris,lid,0,0,0,4.7,4.3,1);
      add(eye,iris,0x17252b,0,0,.6,3.5,3.4,.8,false,true);
      add(eye,iris,0xf8e6b2,-.9,1.2,1.35,.75,.9,.12);
      continue;
    }
    if(soft){
      add(eye,iris,0x233c3c,0,0,0,2.8,3.9,.65,false,true);
      add(eye,iris,0xfff3d4,-.8,1.4,.64,.85,1.05,.12);
      add(eye,iris,0xe4e9c6,.8,-.9,.65,.4,.4,.1);
      continue;
    }
    if(shape==='owl'){
      add(eye,iris,0x6a553b,0,0,0,5.7,6.1,.55);
      add(eye,iris,0x233034,0,0,.45,4.7,5.1,.6,false,true);
      add(eye,iris,0xfff3d5,-1.3,1.6,1,1.1,1.4,.13);
      continue;
    }
    const lidMesh=add(eye,almond,lid,0,0,0,masked?5.4:reptile?5.8:5.1,masked?3.2:4,3);lidMesh.rotation.z=side*.13;
    const white=add(eye,almond,reptile?0xe6b961:0xf1dfb0,0,0,.32,masked?4.1:reptile?4.5:3.8,masked?2.6:3.05,1.8);white.rotation.z=side*.13;
    add(eye,iris,0x203239,-side*.35,-.1,.66,reptile?.7:1.5,masked?1.5:2,.2);
    add(eye,iris,0xfff7df,-side*.35-.45,.75,.86,.42,.55,.09);
  }
}

export function sharedCreatureFaceGeometry(geometry:T.BufferGeometry):boolean{return geometries.has(geometry);}
