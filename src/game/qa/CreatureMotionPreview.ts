import * as T from 'three';
import { createCreature } from '../render3d/CreatureModels';
import type { AnimatedModel } from '../render3d/Models';
import type { CreatureCombatPose } from '../render3d/CreatureMotion';
import { RELEASE_SPECIES, RELEASE_BOSSES } from '../world/ReleaseWorldContent';
import { enemyDisplayStats } from '../enemies/EnemySystem';
import { bossDisplayStats } from '../bosses/BossSystem';
import { contactShadow } from '../render3d/ArtMaterials';

if(!import.meta.env.DEV)throw Error('Development preview only');
const stage=document.querySelector<HTMLElement>('#stage')!;
const select=document.querySelector<HTMLSelectElement>('select')!;
const status=document.querySelector<HTMLElement>('#status')!;
const scrub=document.createElement('input');scrub.type='range';scrub.min='0';scrub.max='100';scrub.value='0';scrub.setAttribute('aria-label','Кадр атаки');
const scrubLabel=document.createElement('label');scrubLabel.textContent='Кадр атаки ';scrubLabel.append(scrub);document.querySelector('nav')!.append(scrubLabel);
const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio));renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x273e40);
scene.add(new T.HemisphereLight(0xe2f1eb,0x695e47,2));
const light=new T.DirectionalLight(0xffe3b8,3);light.position.set(-250,400,200);light.castShadow=true;
light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-500,right:500,top:500,bottom:-500,near:1,far:1600});light.shadow.bias=-.0005;scene.add(light);
const floor=new T.Mesh(new T.CircleGeometry(1200,64),new T.MeshStandardMaterial({color:0x65776b,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-4;floor.receiveShadow=true;scene.add(floor);
const shadow=contactShadow(40);scene.add(shadow);
const camera=new T.OrthographicCamera(-150,150,150,-150,1,5000);
const sources=[...RELEASE_SPECIES,...RELEASE_BOSSES];
for(const source of sources)select.add(new Option(source.name,source.id));
let model:AnimatedModel|undefined,mode='cycle',clock=0,angle=.52,span=250,targetY=70,token=0;
scrub.addEventListener('input',()=>{mode='scrub';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed','false'));});
const frameCamera=()=>{
  const aspect=stage.clientWidth/stage.clientHeight;camera.left=-span*aspect/2;camera.right=span*aspect/2;
  camera.top=span/2;camera.bottom=-span/2;camera.position.set(Math.sin(angle)*800,targetY+430,Math.cos(angle)*800);camera.lookAt(0,targetY,0);camera.updateProjectionMatrix();
};
const resize=()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);frameCamera();};
new ResizeObserver(resize).observe(stage);
async function show(){
  const request=++token,source=sources.find(s=>s.id===select.value)!;
  if(model){scene.remove(model.root);model.dispose?.();}
  const stats='isMain'in source?bossDisplayStats(source.id):enemyDisplayStats(source.id,false);
  const palette='primaryColor'in source?source:bossDisplayStats(source.id);
  model=createCreature(source.id,palette.primaryColor,palette.accentColor,'isMain'in source,stats.radius);scene.add(model.root);
  await model.ready;if(request!==token)return;
  // Frame the entire attack, including native skinned jumps, not only the bind pose.
  const bounds=new T.Box3();
  for(let frame=0;frame<=24;frame++){
    const t=frame/24,pose:CreatureCombatPose=t<.65?{phase:'windup',progress:t/.65,hit:0}:{phase:'strike',progress:(t-.65)/.35,hit:0};
    model.step(1/30,0,false,true,undefined,undefined,undefined,pose);
    bounds.union(new T.Box3().setFromObject(model.root,true));
  }
  for(let frame=0;frame<5;frame++)model.step(.03,0,false,false,undefined,undefined,undefined,{phase:'idle',progress:0,hit:0});
  bounds.union(new T.Box3().setFromObject(model.root,true));
  const size=bounds.getSize(new T.Vector3());
  targetY=(bounds.min.y+bounds.max.y)*.5;
  span=Math.max(size.y*1.5,Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*2.1,Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))*1.8,130);clock=0;
  shadow.scale.set(stats.radius*1.4,stats.radius*1.05,1);frameCamera();
}
select.addEventListener('change',()=>void show());
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  mode=button.dataset.mode!;clock=0;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));
document.querySelector('#turn')!.addEventListener('click',()=>{angle+=Math.PI/4;frameCamera();});
let last=performance.now();
renderer.setAnimationLoop(now=>{
  const dt=Math.min(.05,(now-last)/1000);last=now;clock+=dt;
  let pose:CreatureCombatPose={phase:'idle',progress:0,hit:0};
  if(mode==='cycle'){
    const t=clock%3.6;
    if(t>=.8&&t<2)pose={phase:'windup',progress:(t-.8)/1.2,hit:0};
    else if(t>=2&&t<2.65)pose={phase:'strike',progress:(t-2)/.65,hit:0};
  }else if(mode==='scrub'){
    const t=Number(scrub.value)/100*1.85;
    pose=t<1.2?{phase:'windup',progress:t/1.2,hit:0}:{phase:'strike',progress:(t-1.2)/.65,hit:0};
  }else if(mode==='windup')pose={phase:'windup',progress:.78,hit:0};
  else if(mode==='strike')pose={phase:'strike',progress:.08,hit:0};
  else if(mode==='hit')pose={phase:'idle',progress:0,hit:1};
  model?.step(dt,mode==='move'?140:0,false,pose.phase!=='idle',undefined,undefined,undefined,pose);
  renderer.render(scene,camera);
  status.textContent=`${select.selectedOptions[0]?.text} · ${mode==='move'?'походка':pose.phase==='windup'?'подготовка':pose.phase==='strike'?'удар / отдача':'покой'} · ${Math.round(pose.progress*100)}%`;
});
resize();void show();
