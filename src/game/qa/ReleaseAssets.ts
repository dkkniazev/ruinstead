import * as T from 'three';
import { createHero, createCreature, type AnimatedModel } from '../render3d/Models';
import { createLivingTree } from '../render3d/Trees';
import { fracturedRock, naturalSurfaceMaterial } from '../render3d/NatureForms';
import { batchStaticMeshes } from '../render3d/MeshBatching';

if (!import.meta.env.DEV) throw new Error('Development preview only');
const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;renderer.shadowMap.type = T.PCFShadowMap;

function placeModel(model: AnimatedModel, height: number, x: number, z: number, attacking=false): T.Object3D {
  for(let i=0;i<(attacking?7:1);i++)model.step(.016,0,false,attacking,0,0,1);
  model.root.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model.root), size = bounds.getSize(new T.Vector3());
  model.root.scale.multiplyScalar(height / size.y);
  model.root.position.set(x,-bounds.min.y * height / size.y,z);
  return model.root;
}

function renderAsset(cover: boolean): HTMLCanvasElement {
  const width=cover?800:512,height=cover?470:512,scene=new T.Scene();
  scene.background=new T.Color(0x376357);
  scene.fog=new T.Fog(0x376357,560,1050);
  scene.add(new T.HemisphereLight(0xc5e7f0,0x6b583d,2));
  const sun=new T.DirectionalLight(0xffe0ac,3.2);sun.position.set(-170,310,230);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-360,right:360,top:360,bottom:-360,near:1,far:900});sun.shadow.normalBias=.6;
  scene.add(sun,sun.target);
  const floor=new T.Mesh(new T.CylinderGeometry(340,350,20,32),new T.MeshStandardMaterial({color:0x92ad5a,roughness:1}));
  floor.position.y=-12;floor.receiveShadow=true;scene.add(floor);
  const hero=createHero();hero.setWeapon?.('axe');
  scene.add(placeModel(hero,cover?166:152,cover?-53:0,cover?64:35,true));
  hero.root.rotation.y=cover?.24:-.06;
  for(const [seed,x,z,scale] of [[45,-125,-100,.62],[82,cover?185:104,-155,.76],[33,-175,15,.5]]){
    const tree=createLivingTree(seed,1);tree.scale.setScalar(scale);tree.position.set(x,0,z);batchStaticMeshes(tree);scene.add(tree);
  }
  for(let i=0;i<7;i++){
    const geometry=fracturedRock(10+i, i%2?0x879477:0x778575);
    const rock=new T.Mesh(geometry,naturalSurfaceMaterial);rock.position.set(-120+i*40,2,cover?120:94);rock.scale.set(14,9+i%3*3,12);rock.castShadow=rock.receiveShadow=true;scene.add(rock);
  }
  const actors=[hero];
  if(cover){
    const volcanic=new T.Shape();volcanic.moveTo(35,-180);volcanic.lineTo(230,-180);volcanic.lineTo(270,-60);volcanic.lineTo(200,68);volcanic.lineTo(64,56);volcanic.lineTo(25,-10);volcanic.closePath();
    const scorched=new T.Mesh(new T.ShapeGeometry(volcanic),new T.MeshStandardMaterial({color:0x51483d,roughness:1}));scorched.rotation.x=-Math.PI/2;scorched.position.y=0;scorched.receiveShadow=true;scene.add(scorched);
    const seam=new T.CatmullRomCurve3([new T.Vector3(65,1,136),new T.Vector3(82,1,91),new T.Vector3(78,1,48),new T.Vector3(109,1,14),new T.Vector3(143,1,-14)]);
    scene.add(new T.Mesh(new T.TubeGeometry(seam,24,2.8,6,false),new T.MeshBasicMaterial({color:0xffa23d})));
    const golem=createCreature('lava-golem',0x693329,0xff7338,true,82);actors.push(golem);
    golem.step(.016,0,false,false,0,0,1,{phase:'windup',progress:.45,hit:0});
    scene.add(placeModel(golem,203,117,-47));golem.root.rotation.y=-.32;
    const goblin=createCreature('goblin',0x6c853e,0xe2b164,false,34);actors.push(goblin);
    scene.add(placeModel(goblin,87,-172,50));goblin.root.rotation.y=.28;
    const fireLight=new T.PointLight(0xff8a2d,5000,280,2);fireLight.position.set(90,95,-10);scene.add(fireLight);
  }
  const halfHeight=cover?158:109,ratio=width/height;
  const camera=new T.OrthographicCamera(-halfHeight*ratio,halfHeight*ratio,halfHeight,-halfHeight,1,1500);
  camera.position.set(cover?180:140,cover?230:210,420);camera.lookAt(0,cover?87:70,0);
  renderer.setSize(width,height,false);renderer.render(scene,camera);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(renderer.domElement,0,0);
  const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'#08262788');shade.addColorStop(.36,'#08262700');shade.addColorStop(.72,'#08262700');shade.addColorStop(1,'#071c2699');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
  if(cover){
    ctx.textAlign='center';ctx.font='bold 46px Georgia, serif';ctx.shadowColor='#122729';ctx.shadowBlur=8;ctx.shadowOffsetY=3;ctx.fillStyle='#f5df9f';ctx.fillText('RUINSTEAD',width/2,66);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.fillStyle='#e2d8b9';ctx.font='600 16px "Segoe UI",sans-serif';ctx.fillText('Восстанови поселение. Открой восемь земель.',width/2,height-22);
  }else{
    ctx.strokeStyle='#dcc080';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(14,14,width-28,height-28,30);ctx.stroke();
    ctx.strokeStyle='#233f3d';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(23,23,width-46,height-46,24);ctx.stroke();
  }
  actors.forEach(actor=>actor.dispose?.());
  // This small DEV renderer lives only for the two exports; shared game art
  // materials/geometries are left intact until the page unloads.
  return canvas;
}

for(const cover of [false,true]){
  const card=document.createElement('article'),canvas=renderAsset(cover);
  const name=cover?'ruinstead-cover.png':'ruinstead-icon.png';
  const preview=document.createElement('img');preview.src=canvas.toDataURL('image/png');preview.alt=cover?'Обложка Ruinstead':'Иконка Ruinstead';
  preview.width=canvas.width;preview.height=canvas.height;
  preview.style.cssText='max-width:100%;width:'+String(cover?640:320)+'px;height:auto;display:block;border-radius:10px';
  const button=document.createElement('button');button.textContent=cover?'Скачать обложку':'Скачать иконку';
  button.style.cssText='margin-top:12px;padding:12px 18px;background:#d5b574;color:#163637;border:0;border-radius:6px;font:700 15px system-ui;cursor:pointer';
  button.onclick=()=>{const link=document.createElement('a');link.download=name;link.href=canvas.toDataURL('image/png');link.click();};
  card.append(preview,button);document.querySelector('#assets')!.append(card);
}
renderer.dispose();
