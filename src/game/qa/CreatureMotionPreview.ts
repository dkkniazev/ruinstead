import * as T from 'three';
import { createCreature } from '../render3d/CreatureModels';
import { createHero } from '../render3d/HeroModel';
import type { AnimatedModel } from '../render3d/Models';
import type { CreatureCombatPose } from '../render3d/CreatureMotion';
import { RELEASE_SPECIES, RELEASE_BOSSES } from '../world/ReleaseWorldContent';
import { enemyDisplayStats } from '../enemies/EnemySystem';
import { bossDisplayStats } from '../bosses/BossSystem';
import { contactShadow } from '../render3d/ArtMaterials';
import { creatureBodyBounds } from '../render3d/CreatureAura';
import { preloadCreatureSurfaces } from '../render3d/CreatureSculpt';
import { WEAPON_ORDER, WEAPON_DEFINITIONS, type WeaponId } from '../combat/WeaponDefinitions';
import { SKIN_DEFINITIONS, type SkinId } from '../cosmetics/SkinEconomy';
import { weaponAttackAnimationSeconds } from '../render3d/WeaponAnimation';
import { sampleHeroAttack } from './HeroPreviewPose';

if(!import.meta.env.DEV)throw Error('Development preview only');
const stage=document.querySelector<HTMLElement>('#stage')!;
const select=document.querySelector<HTMLSelectElement>('select')!;
const status=document.querySelector<HTMLElement>('#status')!;
const eliteLabel=document.createElement('label');eliteLabel.textContent='Элита ';
const eliteToggle=document.createElement('input');eliteToggle.type='checkbox';eliteToggle.setAttribute('aria-label','Элитная версия');eliteLabel.append(eliteToggle);document.querySelector('nav')!.append(eliteLabel);
const compareLabel=document.createElement('label');compareLabel.textContent='Сравнить ';
const compareToggle=document.createElement('input');compareToggle.type='checkbox';compareToggle.setAttribute('aria-label','Сравнить обычного и элиту');compareLabel.append(compareToggle);document.querySelector('nav')!.append(compareLabel);
const sizeLabel=document.createElement('label');sizeLabel.textContent='Размеры видов ';
const sizeToggle=document.createElement('input');sizeToggle.type='checkbox';sizeToggle.setAttribute('aria-label','Сравнить размеры видов');sizeLabel.append(sizeToggle);document.querySelector('nav')!.append(sizeLabel);
const faceLabel=document.createElement('label');faceLabel.textContent='Лицо крупно ';
const faceToggle=document.createElement('input');faceToggle.type='checkbox';faceToggle.setAttribute('aria-label','Лицо крупно');faceLabel.append(faceToggle);document.querySelector('nav')!.append(faceLabel);
const scrub=document.createElement('input');scrub.type='range';scrub.min='0';scrub.max='100';scrub.value='0';scrub.setAttribute('aria-label','Кадр атаки');
const scrubLabel=document.createElement('label');scrubLabel.textContent='Кадр атаки ';scrubLabel.append(scrub);document.querySelector('nav')!.append(scrubLabel);
const heroOptions=document.createElement('span');heroOptions.hidden=true;
const weaponSelect=document.createElement('select');weaponSelect.setAttribute('aria-label','Оружие героя');
for(const id of WEAPON_ORDER)weaponSelect.add(new Option(WEAPON_DEFINITIONS[id].name,id));
const skinSelect=document.createElement('select');skinSelect.setAttribute('aria-label','Облик героя');skinSelect.add(new Option('Базовый герой',''));
for(const [id,skin] of Object.entries(SKIN_DEFINITIONS))skinSelect.add(new Option(skin.name,id));
heroOptions.append(weaponSelect,skinSelect);document.querySelector('nav')!.append(heroOptions);
const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio));renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;stage.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x273e40);
scene.add(new T.HemisphereLight(0xe2f1eb,0x695e47,2));
const light=new T.DirectionalLight(0xffe3b8,3);light.position.set(-250,400,200);light.castShadow=true;
light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-500,right:500,top:500,bottom:-500,near:1,far:1600});light.shadow.bias=-.00015;light.shadow.normalBias=.6;scene.add(light);
const floor=new T.Mesh(new T.CircleGeometry(1200,64),new T.MeshStandardMaterial({color:0x65776b,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-4;floor.receiveShadow=true;scene.add(floor);
const shadow=contactShadow(40);scene.add(shadow);
const camera=new T.OrthographicCamera(-150,150,150,-150,1,5000);
const sources=[...RELEASE_SPECIES,...RELEASE_BOSSES];
for(const source of sources)select.add(new Option(source.name,source.id));
select.add(new Option('Герой','hero'));
let model:AnimatedModel|undefined,companion:AnimatedModel|undefined,additional:AnimatedModel[]=[],sizeNote='',mode='cycle',clock=0,angle=.52,span=250,targetY=70,token=0;
let heroPoseKey='';
scrub.addEventListener('input',()=>{mode='scrub';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed','false'));});
const frameCamera=()=>{
  const aspect=stage.clientWidth/stage.clientHeight;
  const head=faceToggle.checked&&!faceToggle.disabled?model?.root.getObjectByName('creature-neck'):undefined;
  const focus=head?(head.updateWorldMatrix(true,false),head.localToWorld(new T.Vector3(0,18,6))):new T.Vector3(0,targetY,0);
  const viewSpan=head?76*head.getWorldScale(new T.Vector3()).y:span;
  camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;
  const viewAngle=sizeNote?0:angle;
  camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.position.copy(focus).add(new T.Vector3(Math.sin(viewAngle)*800,430,Math.cos(viewAngle)*800));camera.lookAt(focus);camera.updateProjectionMatrix();
};
faceToggle.addEventListener('change',frameCamera);
const resize=()=>{renderer.setSize(stage.clientWidth,stage.clientHeight);frameCamera();};
new ResizeObserver(resize).observe(stage);
async function show(){
  const request=++token,source=sources.find(s=>s.id===select.value)!,hero=select.value==='hero';
  await preloadCreatureSurfaces();if(request!==token)return;
  if(model){scene.remove(model.root);model.dispose?.();}
  if(companion){scene.remove(companion.root);companion.dispose?.();companion=undefined;}
  for(const entry of additional){scene.remove(entry.root);entry.dispose?.();}additional=[];sizeNote='';
  heroOptions.hidden=!hero;heroPoseKey='';
  document.querySelector<HTMLButtonElement>('[data-mode="hit"]')!.disabled=hero;
  if(hero&&mode==='hit')mode='idle';
  sizeToggle.disabled=hero||'isMain'in source;
  const sizes=sizeToggle.checked&&!sizeToggle.disabled;
  compareToggle.disabled=hero||'isMain'in source||sizes;
  const compare=compareToggle.checked&&!compareToggle.disabled;
  eliteToggle.disabled=hero||compare||sizes;
  const isElite=!sizes&&(eliteToggle.checked||compare);
  const stats=hero?{radius:22}:'isMain'in source?bossDisplayStats(source.id):enemyDisplayStats(source.id,isElite);
  const palette=hero?undefined:'primaryColor'in source?source:bossDisplayStats(source.id);
  if(hero){model=createHero();model.setWeapon?.(weaponSelect.value as WeaponId);model.setSkin?.((skinSelect.value||null) as SkinId|null);}
  else model=createCreature(source.id,palette!.primaryColor,palette!.accentColor,'isMain'in source||isElite,stats.radius);
  scene.add(model.root);
  faceToggle.disabled=hero||!model.root.getObjectByName('creature-neck')||compare||sizes;
  if(sizes){
    const hero=createHero();additional.push(hero);scene.add(hero.root);
    const lineup=[{name:'Герой',model:hero},...RELEASE_SPECIES.filter(s=>s.region===source.region).map(s=>{
      if(s.id===source.id)return {name:s.name,model:model!};
      const entry=createCreature(s.id,s.primaryColor,s.accentColor,false,enemyDisplayStats(s.id,false).radius);
      additional.push(entry);scene.add(entry.root);return {name:s.name,model:entry};
    })];
    // One camera and unmodified world scales. All feet share the same ground;
    // portrait framing may otherwise hide disproportionate species sizes.
    let x=0;
    for(const entry of lineup){const bounds=creatureBodyBounds(entry.model.root),width=bounds.getSize(new T.Vector3()).x;
      entry.model.root.position.x=x-bounds.min.x;x+=width+28;}
    for(const entry of lineup)entry.model.root.position.x-=(x-28)/2;
    sizeNote=lineup.map(e=>`${e.name} ${Math.round(creatureBodyBounds(e.model.root).getSize(new T.Vector3()).y)}`).join(' / ');
  }
  if(compare){
    const ordinary=enemyDisplayStats(source.id,false);
    companion=createCreature(source.id,palette!.primaryColor,palette!.accentColor,false,ordinary.radius);scene.add(companion.root);
    // Same world scale, same camera, same attack phase: portrait auto-framing
    // otherwise makes a much heavier elite look the same size as its young form.
    const width=Math.max(creatureBodyBounds(model.root).getSize(new T.Vector3()).x,creatureBodyBounds(companion.root).getSize(new T.Vector3()).x);
    model.root.position.x=width*.62;companion.root.position.x=-width*.62;
  }
  const displayed=[model,...additional,...(companion?[companion]:[])];
  await Promise.all(displayed.map(m=>m.ready));if(request!==token)return;
  // Frame the entire attack, including native skinned jumps, not only the bind pose.
  const bounds=new T.Box3();
  for(let frame=0;frame<=24;frame++){
    const t=frame/24,pose:CreatureCombatPose=t<.65?{phase:'windup',progress:t/.65,hit:0}:{phase:'strike',progress:(t-.65)/.35,hit:0};
    for(const entry of displayed){
      if(hero)sampleHeroAttack(entry,weaponSelect.value as WeaponId,t);
      else entry.step(1/30,0,false,true,undefined,undefined,undefined,pose);
      bounds.union(creatureBodyBounds(entry.root));
    }
  }
  for(const entry of displayed){for(let frame=0;frame<5;frame++)entry.step(.03,0,false,false,undefined,undefined,undefined,{phase:'idle',progress:0,hit:0});bounds.union(creatureBodyBounds(entry.root));}
  const size=bounds.getSize(new T.Vector3());
  targetY=(bounds.min.y+bounds.max.y)*.5;
  span=Math.max(size.y*1.5,Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*2.1,Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))*1.8,130);clock=0;
  shadow.visible=!compare&&!sizes;shadow.scale.set(stats.radius*1.4,stats.radius*1.05,1);frameCamera();
}
select.addEventListener('change',()=>void show());
eliteToggle.addEventListener('change',()=>void show());
compareToggle.addEventListener('change',()=>void show());
sizeToggle.addEventListener('change',()=>void show());
weaponSelect.addEventListener('change',()=>void show());
skinSelect.addEventListener('change',()=>void show());
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  mode=button.dataset.mode!;clock=0;
  if(mode==='windup'||mode==='strike'){
    const progress=select.value==='hero'?(mode==='windup'?.3:.55):(mode==='windup'?.78*1.2:1.2+.08*.65)/1.85;
    scrub.value=String(Math.round(progress*100));
  }
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
  if(select.value==='hero'&&model){
    const weapon=weaponSelect.value as WeaponId,duration=weaponAttackAnimationSeconds(weapon);
    if(mode==='cycle'){
      const period=duration+.8,age=clock%period;
      model.step(dt,0,false,age>.4&&age<.4+duration,0,0,Math.floor(clock/period));
    }else if(mode==='idle'||mode==='move'){
      if(heroPoseKey!==mode){sampleHeroAttack(model,weapon,1);heroPoseKey=mode;}
      model.step(dt,mode==='move'?140:0,false,false,mode==='move'?140*dt:0,0);
    }else{
      const progress=mode==='scrub'?Number(scrub.value)/100:mode==='windup'?.3:.55;
      const key=mode+':'+progress;
      if(heroPoseKey!==key){sampleHeroAttack(model,weapon,progress);heroPoseKey=key;}
      model.step(0,0,false,false,0,0);
    }
  }else model?.step(dt,mode==='move'?140:0,false,pose.phase!=='idle',undefined,undefined,undefined,pose);
  companion?.step(dt,mode==='move'?140:0,false,pose.phase!=='idle',undefined,undefined,undefined,pose);
  for(const entry of additional)entry.step(dt,mode==='move'?140:0,false,pose.phase!=='idle',mode==='move'?140*dt:0,undefined,undefined,pose);
  if(faceToggle.checked&&!faceToggle.disabled)frameCamera();
  renderer.render(scene,camera);
  const heroNote=select.value==='hero'?` · ${weaponSelect.selectedOptions[0]?.text} · ${skinSelect.selectedOptions[0]?.text} · ${mode==='scrub'?scrub.value+'%':mode==='windup'?'30%':mode==='strike'?'55%':mode==='move'?'походка':mode==='cycle'?'цикл удара':'покой'}`:'';
  status.textContent=`${select.selectedOptions[0]?.text}${heroNote||`${companion?' · слева обычный / справа элита':''} · ${mode==='move'?'походка':pose.phase==='windup'?'подготовка':pose.phase==='strike'?'удар / отдача':'покой'} · ${Math.round(pose.progress*100)}%`}${sizeNote?' · рост в мире: '+sizeNote:''}`;
});
resize();void show();
