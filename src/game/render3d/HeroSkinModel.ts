import * as T from 'three';
import type { SkinId } from '../cosmetics/SkinEconomy';
import { softBox, softOrb } from './ArtMaterials';
import { batchStaticMeshes, disposeBatchedGeometry } from './MeshBatching';
import { HERO_SKIN_STYLES } from './HeroSkinStyles';
import { armorPlate, heroHelmet, heroShoulder } from './HeroArmorForms';

type Materials=Record<'blue'|'cloth'|'steel'|'edge'|'gold'|'leather'|'dark'|'skin',T.MeshStandardMaterial>;
type Rig={body:T.Group;arms:T.Group[];elbows:T.Group[];knees:T.Group[]};
const cylinder=new T.CylinderGeometry(1,1,1,10);
const crystal=new T.OctahedronGeometry(1);
const ring=new T.TorusGeometry(1,.065,5,32);
const wedge=new T.ConeGeometry(1,1,5);
function silhouette(points:number[][]):T.ExtrudeGeometry {
  const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:1,steps:1});
  geometry.translate(0,0,-.08);return geometry;
}
const shapes={
  leaf:silhouette([[0,-1],[-.65,-.2],[-.55,.5],[0,1],[.55,.5],[.65,-.2]]),
  flame:silhouette([[0,-1],[-.65,-.6],[-.7,.1],[-.3,-.1],[-.25,.8],[.15,1.25],[.25,.2],[.65,.55],[.7,-.45]]),
  wing:silhouette([[-.8,-.8],[-.7,.6],[-.2,1],[.9,1.2],[.3,.2],[.7,.4],[.2,-.3],[.3,-.1],[-.2,-.65]]),
  crown:silhouette([[-.8,-.5],[-1,.65],[-.35,.2],[0,1],[.35,.2],[1,.65],[.8,-.5]]),
};

export function createSkinOutfit(id:SkinId,rig:Rig,materials:Materials):{step:(time:number)=>void;dispose:()=>void} {
  const style=HERO_SKIN_STYLES[id],groups:T.Group[]=[],floating:{group:T.Group;y:number;phase:number}[]=[];
  const glow=new T.MeshStandardMaterial({color:style.glow||style.colors.gold,emissive:style.glow,emissiveIntensity:.5,roughness:.35,metalness:.15});
  const attach=(parent:T.Object3D,name:string)=>{const group=new T.Group();group.name=name;parent.add(group);groups.push(group);return group;};
  const body=attach(rig.body,`outfit-${id}`);
  const part=(parent:T.Object3D,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const box=(p:T.Object3D,c:keyof Materials,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>part(p,softBox,materials[c],x,y,z,sx,sy,sz);
  const orb=(p:T.Object3D,c:keyof Materials,x:number,y:number,z:number,sx:number,sy=sx,sz=sx)=>part(p,softOrb,materials[c],x,y,z,sx,sy,sz);
  const rod=(p:T.Object3D,c:keyof Materials,a:number[],b:number[],radius:number)=>{
    const start=new T.Vector3(...a),end=new T.Vector3(...b),mid=start.clone().add(end).multiplyScalar(.5);
    const mesh=part(p,cylinder,materials[c],mid.x,mid.y,mid.z,radius,start.distanceTo(end),radius);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());return mesh;
  };
  const jewel=(p:T.Object3D,x:number,y:number,z:number,size:number,stretch=1.4)=>part(p,crystal,glow,x,y,z,size,size*stretch,size*.65);
  const leaf=(p:T.Object3D,c:keyof Materials,x:number,y:number,z:number,size:number,angle:number)=>{
    const mesh=part(p,shapes.leaf,materials[c],x,y,z,size*.65,size,size*.8);mesh.rotation.z=angle;return mesh;
  };

  // Head shapes leave the face readable and replace the starter helmet completely.
  if(style.head==='hood'){
    orb(body,'cloth',0,113,-5,20,15,16);
    for(const side of [-1,1]){orb(body,'blue',side*15,103,1,7,18,13);box(body,'gold',side*15,105,12,3,22,3).rotation.z=-side*.14;}
    box(body,'blue',0,116,11,28,7,8);
    part(body,wedge,materials.blue,0,129,-7,10,18,10).rotation.x=-.3;
  }else if(style.head==='hat'){
    part(body,cylinder,materials.leather,0,114,0,26,4,24);
    orb(body,'blue',0,120,-2,17,10,17);box(body,'gold',0,116,17,12,5,3);
  }else if(style.head==='goggles'){
    orb(body,'leather',0,115,-3,18,12,16);
    box(body,'edge',0,112,15,33,7,5);
    for(const side of [-1,1]){
      orb(body,'gold',side*8,112,19,7,6,3);
      part(body,softOrb,glow,side*8,112,21,4.5,4,2);
    }
  }else if(style.head==='crown'){
    orb(body,'cloth',0,116,-3,17,9,15);
    part(body,cylinder,materials.gold,0,120,0,19,5,17);
    for(let i=0;i<5;i++){
      const angle=(i/4-.5)*Math.PI;
      part(body,wedge,materials.gold,Math.sin(angle)*17,128,Math.cos(angle)*15,4,i===2?18:12,4);
    }
    jewel(body,0,122,18,4);
  }else{
    armorPlate(body,heroHelmet,materials.edge,materials.steel,0,109,-3,19,18,17);
    for(const side of [-1,1])box(body,'steel',side*14,100,7,7,22,14).rotation.z=-side*.12;
    box(body,'gold',0,115,14,31,4,5);
    if(style.head==='visor'||style.head==='mask'){
      orb(body,'edge',0,101,15,14,12,6);
      box(body,'steel',0,99,19,25,11,4);
      box(body,'dark',0,108,20,25,4,3);
      for(const side of [-1,1])part(body,softBox,style.glow?glow:materials.gold,side*7,108,22,7,2,2);
      if(style.head==='visor')for(const x of [-7,0,7])box(body,'dark',x,98,22,2,8,2);
    }
  }

  if(style.crest==='antlers')for(const side of [-1,1]){
    rod(body,'leather',[side*13,118,-2],[side*26,139,-5],3.5);
    rod(body,'gold',[side*26,139,-5],[side*23,153,-2],2);
    rod(body,'leather',[side*22,132,-4],[side*36,141,-3],2.5);
    leaf(body,'blue',side*28,137,0,9,-side*.6);
  }
  if(style.crest==='horns')for(const side of [-1,1]){
    rod(body,'gold',[side*15,120,-1],[side*29,128,-4],5);
    const horn=part(body,wedge,materials.steel,side*30,136,-4,5,22,5);horn.rotation.z=-side*.35;
  }
  if(style.crest==='plume'){
    for(let i=0;i<5;i++)orb(body,'blue',0,129+i*2,-10+i*5,6,9,7);
    rod(body,'gold',[0,121,-9],[0,131,10],2);
  }
  if(style.crest==='feather'){
    const feather=part(body,shapes.wing,materials.steel,-15,131,-1,7,17,6);feather.rotation.z=.4;
    rod(body,'gold',[-15,116,-1],[-12,143,-1],1.4);
  }
  if(style.crest==='flame'){
    for(const side of [-1,0,1]){
      const flame=part(body,shapes.flame,side===0?glow:materials.gold,side*10,128,-1,6,side===0?14:10,6);flame.rotation.z=-side*.18;
    }
  }
  if(style.crest==='crystal')for(const side of [-1,0,1]){
    const gem=jewel(body,side*12,128,-2,side===0?5.5:3.5,2.2);gem.rotation.z=-side*.4;
  }
  if(style.crest==='sun')for(let i=0;i<7;i++){
    const angle=(i/6-.5)*Math.PI;
    const ray=part(body,wedge,materials.gold,Math.sin(angle)*23,118+Math.cos(angle)*22,-5,3,13,3);ray.rotation.z=-angle;
  }

  // Costumes follow the existing joints, including the wrist-mounted weapons.
  for(let i=0;i<2;i++){
    const side=i===0?-1:1,shoulder=attach(rig.arms[i],`skin-shoulder-${i}`);
    if(style.shoulders==='leaves'){
      orb(shoulder,'leather',side*3,1,0,13,8,13);
      for(let n=0;n<3;n++)leaf(shoulder,n===1?'gold':'blue',side*(3+n*5),3-n*4,8,10,-side*(.6+n*.3));
    }else if(style.shoulders==='feathers'){
      orb(shoulder,'edge',side*2,1,0,12,8,12);
      for(let n=0;n<3;n++){
        const feather=part(shoulder,shapes.wing,materials[n===0?'gold':'steel'],side*(4+n*5),4-n*3,5,7,12,9);feather.rotation.set(0,side<0?Math.PI:0,-side*.65);
      }
    }else if(style.shoulders==='fur'){
      for(let n=0;n<5;n++)orb(shoulder,'steel',side*(n*3-2),1+Math.sin(n)*3,n%2?7:-5,7,8,8);
    }else if(style.shoulders==='stone'){
      for(let n=0;n<2;n++)box(shoulder,n?'steel':'edge',side*(n*5),2+n*5,0,27-n*4,13,28-n*3).rotation.z=-side*.2;
      jewel(shoulder,side*5,5,16,3);
    }else{
      armorPlate(shoulder,heroShoulder,materials.edge,materials.steel,side*3,0,0,15,13,15);
      box(shoulder,'gold',side*4,4,11,18,4,5).rotation.z=-side*.18;
      if(style.shoulders==='spikes')for(let n=0;n<3;n++){
        const spike=part(shoulder,wedge,materials.gold,side*(n*5-1),13,n===1?-6:3,3.5,14,3.5);spike.rotation.z=-side*.4;
      }
      if(style.shoulders==='gears'){
        part(shoulder,ring,materials.gold,side*4,3,14,10,10,10);
        for(let n=0;n<6;n++){const a=n*Math.PI/3;box(shoulder,'gold',side*4+Math.sin(a)*10,3+Math.cos(a)*10,14,4,4,4).rotation.z=-a;}
      }
    }
    const cuff=attach(rig.elbows[i],`skin-cuff-${i}`);
    box(cuff,'gold',0,-12,6,13,4,3);jewel(cuff,0,-6,9,2.8);
    const knee=attach(rig.knees[i],`skin-greave-${i}`);
    box(knee,'steel',0,-5,8,11,13,4);box(knee,'gold',0,-11,11,12,3,2);
  }

  if(style.apron){
    box(body,'leather',0,59,19,29,34,4);box(body,'blue',0,34,15,29,24,5);
    for(const side of [-1,1])box(body,'gold',side*11,74,18,3,13,3).rotation.z=side*.18;
    for(const side of [-1,1]){box(body,'leather',side*20,43,9,10,14,10);rod(body,'gold',[side*22,43,17],[side*22,59,17],2);box(body,'steel',side*22,58,17,10,5,4);}
  }else{
    box(body,'cloth',0,36,17,20,24,4);box(body,'gold',0,24,20,20,3,2);
  }
  // Large, simple chest insignia remain legible at the normal world camera distance.
  if(style.emblem==='gem')jewel(body,0,71,22,6);
  else if(style.emblem==='gear'||style.emblem==='sun'){
    part(body,ring,materials.gold,0,70,23,8,8,8);jewel(body,0,70,24,3);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;box(body,'gold',Math.sin(a)*10,70+Math.cos(a)*10,22,3,5,3).rotation.z=-a;}
  }else part(body,shapes[style.emblem],style.glow?glow:materials.gold,0,70,23,8,9,7);

  if(style.back==='pack'||style.back==='logs'||style.back==='scrolls'){
    box(body,'leather',0,67,-25,29,31,16);box(body,'blue',0,81,-28,30,7,16);
    for(const side of [-1,1])box(body,'gold',side*9,68,-35,3,29,2);
    if(style.back==='logs')for(let n=0;n<3;n++)rod(body,'leather',[-18,53+n*9,-37],[18,53+n*9,-37],4);
    if(style.back==='scrolls')for(const side of [-1,1]){
      rod(body,'steel',[side*19,55,-23],[side*19,84,-23],5);
      for(const y of [55,84])orb(body,'gold',side*19,y,-23,6,3,6);
    }
    if(style.back==='pack'&&style.crest==='crystal')for(const side of [-1,1])jewel(body,side*8,87,-26,5,2);
  }
  if(style.back==='wings')for(const side of [-1,1]){
    rod(body,'gold',[side*8,82,-20],[side*32,103,-27],3);
    for(let n=0;n<5;n++){
      const feather=part(body,shapes.wing,materials[n%2?'steel':'gold'],side*(21+n*5),89-n*5,-26,11,22-n,9);feather.rotation.set(0,side<0?Math.PI:0,-side*(.6+n*.12));
    }
  }
  if(style.back==='roots')for(const side of [-1,1]){
    rod(body,'leather',[side*5,54,-24],[side*27,100,-25],4);
    rod(body,'leather',[side*27,100,-25],[side*43,115,-21],2.8);
    rod(body,'gold',[side*25,96,-25],[side*18,117,-25],2);
    for(let n=0;n<3;n++)leaf(body,n===1?'gold':'blue',side*(30+n*5),96+n*6,-21,10,-side*.8);
  }
  if(style.back==='halo'){
    const halo=new T.Group();halo.position.set(0,99,-28);body.add(halo);floating.push({group:halo,y:99,phase:0});
    part(halo,ring,materials.gold,0,0,0,34,34,34);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;jewel(halo,Math.sin(a)*34,Math.cos(a)*34,0,3.5);}
    if(id==='astral-runner')part(halo,ring,glow,0,0,0,27,27,27).rotation.y=.55;
  }
  for(const group of groups)batchStaticMeshes(group);
  return {
    step(time){glow.emissiveIntensity=.42+Math.sin(time*2.3)*.12;for(const item of floating){item.group.position.y=item.y+Math.sin(time*1.8+item.phase)*1.8;item.group.rotation.z=Math.sin(time*.6)*.045;}},
    dispose(){for(const group of groups){disposeBatchedGeometry(group);group.removeFromParent();}glow.dispose();},
  };
}
