import { GEOGRAPHY_LANDMARKS, REGION_GEOGRAPHY } from '../world/RegionGeography';
import { createGroundCover } from '../render3d/BiomeScenery';
import { updateArtMaterials } from '../render3d/ArtMaterials';
import * as THREE from 'three';
import { createBoundaryGround, createRegionLand } from '../render3d/TerrainMeshes';
import { ResourceVisual3D } from '../render3d/ResourceVisual3D';
import { RELEASE_REGIONS, getRegionDefinition, getPassageGeometry, RELEASE_PASSAGES } from '../world/ReleaseRegionMap';
import { terrainHeight, TERRAIN_PASSAGES, passageHeight } from '../world/WorldTerrain';
import type { ResourceVisualState } from '../gathering/ResourceSystem';
import { WORLD_WATERCOURSES } from '../world/WorldWatercourses';

// Separate Vite-only page: visual QA never reads or writes a player's save.
if (!import.meta.env.DEV) throw new Error('World preview is available only in development');
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x8aa4b4);
scene.add(new THREE.HemisphereLight(0xdcecff,0x716049,1.5));
const sun=new THREE.DirectionalLight(0xffe6be,2.2);sun.position.set(-4000,9000,4000);scene.add(sun);
const camera=new THREE.OrthographicCamera(-8000,8000,8000,-8000,1,40000);
for(const region of RELEASE_REGIONS) scene.add(createRegionLand(region));
const base=createBoundaryGround(7200,8300,18000,110);scene.add(base);
const closeGround=new THREE.Group();scene.add(closeGround);
for(const entry of TERRAIN_PASSAGES) {
  const n=Math.ceil(entry.length/60);
  for(let i=0;i<n;i++) {
    const t=(i+0.5)/n;
    const slab=new THREE.Mesh(new THREE.BoxGeometry(entry.passage.width,18,entry.length/n+2),new THREE.MeshStandardMaterial({color:entry.passage.kind==='bridge'?0x99734e:0xb3a48c}));
    slab.position.set(entry.a.x+(entry.b.x-entry.a.x)*t,passageHeight(entry,t)-9,entry.a.y+(entry.b.y-entry.a.y)*t);
    slab.rotation.y=Math.atan2(entry.ux,entry.uy);scene.add(slab);
  }
}
const labels=new THREE.Group();scene.add(labels);
for(const region of RELEASE_REGIONS) {
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=100;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#152325db';ctx.fillRect(0,0,160,100);
  ctx.fillStyle='#ffe1a0';ctx.textAlign='center';ctx.font='bold 60px system-ui';ctx.fillText(String(region.id),80,63);
  ctx.font='19px system-ui';ctx.fillText(`Высота ${region.elevation}`,80,88);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));
  sprite.scale.set(800,500,1);sprite.position.set(region.center[0],region.elevation+200,region.center[1]);labels.add(sprite);
}
const home=getRegionDefinition(1);
const node:ResourceVisualState={id:'preview-wood',type:'wood',x:home.center[0]+540,y:home.center[1]+610,
  durability:3,dropCount:5,respawnMs:45000,available:true,health:3,maxHealth:3,hitAt:-10000,hitCount:0};
const resourceLabels=document.createElement('div');
resourceLabels.style.cssText='position:fixed;inset:0;pointer-events:none;overflow:hidden';document.body.appendChild(resourceLabels);
const resource=new ResourceVisual3D(node,1,resourceLabels);scene.add(resource.root);
const controls=document.createElement('div');
controls.style.cssText='position:fixed;top:16px;left:16px;display:flex;gap:8px;flex-wrap:wrap;z-index:5;font:14px system-ui';
document.body.appendChild(controls);
const caption=document.createElement('div');caption.style.cssText='position:fixed;bottom:18px;left:18px;padding:12px 16px;background:#14242be8;color:#fff2cf;font:16px system-ui;max-width:620px';document.body.appendChild(caption);
let viewHeight=17000;let target=new THREE.Vector3(7200,0,8300);let overview=true;
function resize(){renderer.setSize(innerWidth,innerHeight);const aspect=innerWidth/innerHeight;camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();}
function select(mode:string){
  overview=mode==='overview';labels.visible=overview;
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  closeGround.traverse(o=>{if(o instanceof THREE.Mesh){
    if(o.userData.uniqueGeometry||o.userData.batchedGeometry)geometries.add(o.geometry);
    for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.userData.sharedArtMaterial)materials.add(m);
  }});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());closeGround.clear();base.visible=overview;
  resource.root.visible=mode==='harvest';
  resource.hideLabel();
  if(overview){viewHeight=15600;target.set(7200,100,8350);camera.position.copy(target).add(new THREE.Vector3(0,19000,10000));caption.textContent='Контуры по рисунку • крупные регионы: 21–27 секунд бега • плато, горы, реки и лавовые разломы';}
  else {
    let x:number,y:number;
    if(mode==='harvest'){x=node.x;y=node.y;}
    else if(mode.startsWith('brook-')){const course=WORLD_WATERCOURSES.find(p=>p.region===Number(mode.slice(6)))!;const p=course.points[Math.floor(course.points.length*.54)];x=p.x;y=p.y;}
    else if(mode.startsWith('region-')){const id=Number(mode.slice(7)),site=GEOGRAPHY_LANDMARKS.find(p=>p.region===id),r=RELEASE_REGIONS[id-1];x=site?.x??r.center[0];y=site?.y??r.center[1];}
    else {const passage=RELEASE_PASSAGES.find(p=>p.id===mode)!;const g=getPassageGeometry(passage);x=(g.a.x+g.b.x)/2;y=(g.a.y+g.b.y)/2;}
    viewHeight=mode==='harvest'?460:mode.startsWith('region-')?1600:mode.startsWith('brook-')?1250:1150;target.set(x,terrainHeight(x,y)+30,y);
    camera.position.copy(target).add(new THREE.Vector3(0,950,850));
    const tx=Math.floor(x/640),ty=Math.floor(y/640);
    for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)closeGround.add(createBoundaryGround((tx+i+0.5)*640,(ty+j+0.5)*640,640));
    caption.textContent=mode==='harvest'?'Добыча: прочность, удар и разлёт щепок. Кнопка «Удар» проверяет каждый этап.':mode==='4-5'?'Ветреные высоты: плато на 450 единиц выше Магмового сердца.':mode==='2-3'?'Теневой перевал: каменный подъём через горный гребень.':'Мост над рекой между первым и вторым регионами.';
  }
  if(mode.startsWith('region-')){const region=RELEASE_REGIONS[Number(mode.slice(7))-1];caption.textContent=region.name+' · '+REGION_GEOGRAPHY[region.id-1].name;for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)closeGround.add(createGroundCover(target.x+x*640,target.z+z*640,640,region));}
  if(mode.startsWith('brook-')){const region=getRegionDefinition(Number(mode.slice(6)) as 1|6);caption.textContent=region.name+' · ручей, мелкий брод и береговые растения';for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)closeGround.add(createGroundCover(target.x+x*640,target.z+z*640,640,region));}
  camera.lookAt(target);resize();
}
for(const [name,mode]of [['Карта целиком','overview'],['Река 1–2','1-2'],['Горы 2–3','2-3'],['Обрыв 4–5','4-5'],['Добыча','harvest'],['Лесной ручей','brook-1'],['Минеральный ручей','brook-6']]){
  const button=document.createElement('button');button.textContent=name;button.onclick=()=>select(mode);button.style.cssText='padding:10px 14px;background:#233f46;color:#fff0cf;border:1px solid #c2a77d;border-radius:5px;cursor:pointer';controls.appendChild(button);
}
const hit=document.createElement('button');hit.textContent='Удар';hit.style.cssText='padding:10px 18px;background:#b27d39;color:white;border:0;border-radius:5px';hit.onclick=()=>{
  if(!node.available){node.health=3;node.available=true;node.hitAt=-10000;}
  else {node.health=Math.max(0,node.health-1);node.available=node.health>0;node.hitAt=performance.now();node.hitCount++;}
};controls.appendChild(hit);
for(const region of RELEASE_REGIONS){const b=document.createElement('button');b.textContent=region.id+'. '+region.name;b.onclick=()=>select('region-'+region.id);b.style.cssText='padding:8px;color:#f1e8ce;background:#334f4a;border:1px solid #8d9a7e;border-radius:4px';controls.append(b);}
select('overview');window.addEventListener('resize',resize);
function frame(time:number){requestAnimationFrame(frame);updateArtMaterials(time);camera.updateMatrixWorld();if(resource.root.visible)resource.update(node,time,100,camera);renderer.render(scene,camera);}
requestAnimationFrame(frame);
