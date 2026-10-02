import { GEOGRAPHY_LANDMARKS } from '../world/RegionGeography';
import { createDefaultGameState, type GameState } from '../state/GameState';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { PlayerController } from '../player/PlayerController';
import { getPassageMidpoint, pointInRegion, RELEASE_PASSAGES, RELEASE_REGIONS } from '../world/ReleaseRegionMap';
import { RETURN_POINT } from '../world/WorldPrototype';
import { BOSS_ARENAS } from '../bosses/BossArenas';
import { FORGE_POSITION } from '../settlement/SettlementSystem';
import type { CombatSystem } from '../combat/CombatSystem';
import type { BossSystem } from '../bosses/BossSystem';
import type { WorldPresentation3D } from '../render3d/WorldPresentation3D';
import { WEAPON_DEFINITIONS, WEAPON_ORDER } from '../combat/WeaponDefinitions';
import { SKIN_DEFINITIONS } from '../cosmetics/SkinEconomy';
import { resourceFootprintRadius, type ResourceSystem } from '../gathering/ResourceSystem';
import type { ChestSystem } from '../world/ChestSystem';

export const isPolishPlaytest = (): boolean => import.meta.env.DEV && new URLSearchParams(location.search).get('playtest') === 'polish';
/** This fixture never touches local storage or cloud saves. */
export function polishStateStore() {
  const state = createDefaultGameState();
  if(new URLSearchParams(location.search).get('scenario')==='new')return {load:()=>state,save:(value:GameState)=>value};
  state.world.unlockedZones.push(...RELEASE_REGIONS.map(r=>r.stageId));
  for(const id of ['storage','sawmill','house','workshop','forge'] as const)state.settlement.buildings[id]=3;
  state.settlement.repairStages.forge=3;state.settlement.level=3;
  state.onboarding={
    ...state.onboarding,
    moved:true,
    dashed:true,
    firstKill:true,
    hudSeen:true,
    backpackSeen:true,
    forgeSeen:true,
    bestiarySeen:true,
    skipped:true,
  };
  state.consumables.returnTickets=3;
  state.resources={wood:1000,stone:1000,metal:1000,crystal:100,fiber:100,coins:10000};
  const economy=new URLSearchParams(location.search).get('scenario')==='economy';
  if(economy)state.backpack.coins=777;
  state.premium.unlockedSkinIds=['moss-guard'];
  if(new URLSearchParams(location.search).get('skins')==='all')state.premium.unlockedSkinIds=Object.keys(SKIN_DEFINITIONS);
  state.player.maxHealthLevel=10;state.player.backpackLevel=10;
  state.world.bossRespawnAt['root-colossus']=Date.now()+3600000;
  if(new URLSearchParams(location.search).get('weapons')==='all'){
    state.progression.playerLevel=20;
    state.player.unlockedWeaponIds=[...WEAPON_ORDER];
    state.player.weaponInventory={
      variants:WEAPON_ORDER.map(weaponId=>({weaponId,rarity:'common',level:1,starCounts:[economy?4:1,0,0,0,0,0]})),
      equipped:Object.fromEntries(WEAPON_ORDER.map(id=>[id,{rarity:'common',stars:0}])),
      loadout:WEAPON_ORDER.map(weaponId=>({weaponId,rarity:'common',stars:0})),
      primarySlot:0,
    };
  }
  if(new URLSearchParams(location.search).get('scenario')==='media'){
    // Achievable mid-game equipment. Normal enemies, damage, cooldowns and death.
    state.progression.playerLevel=20;
    state.player.maxHealthLevel=8;state.player.backpackLevel=8;
    state.player.unlockedWeaponIds=[...WEAPON_ORDER];
    state.player.weaponInventory={
      variants:WEAPON_ORDER.map(weaponId=>({weaponId,rarity:'common',level:4,starCounts:[0,1,0,0,0,0]})),
      equipped:Object.fromEntries(WEAPON_ORDER.map(id=>[id,{rarity:'common',stars:1}])),
      loadout:WEAPON_ORDER.map(weaponId=>({weaponId,rarity:'common',stars:1})),primarySlot:0,
    };
    state.world.bossRespawnAt={};
  }
  return {load:()=>state,save:(value:GameState)=>value};
}
export function installPolishPlaytest(player: PlayerController, enemies: EnemySystem,combat:CombatSystem,bosses:BossSystem,presentation?:WorldPresentation3D,resources?:ResourceSystem,chests?:ChestSystem): ()=>void {
  // Media capture uses the ordinary new-game fixture without the QA overlay.
  const captureParams = new URLSearchParams(location.search);
  if (import.meta.env.DEV && captureParams.get('scenario') === 'new' && captureParams.get('media') === '1') return () => {};
  const panel=document.createElement('details');
  panel.style.cssText='position:fixed;right:8px;bottom:8px;z-index:100;background:#152c30ef;color:#eed9aa;border:1px solid #b99b60;border-radius:7px;padding:6px 10px;font:12px system-ui;max-width:min(640px,90vw);max-height:42vh;overflow:auto';
  const summary=document.createElement('summary');summary.textContent='Проверка · без сохранения';panel.append(summary);
  panel.dataset.qaPanel='true';
  const controls=document.createElement('div');
  panel.append(controls);
  const select=document.createElement('select');select.setAttribute('aria-label','Регион проверки');
  for(const region of RELEASE_REGIONS)select.add(new Option(region.id+'. '+region.name,String(region.id)));
  const output=document.createElement('div');output.setAttribute('role','status');
  const initial=enemies.visualUnits.find(e=>e.definition.region===1&&e.rank==='normal')!;
  let pack=enemies.visualUnits.filter(e=>e.groupId===initial.groupId);
  const choose=()=>{const first=enemies.visualUnits.find(e=>e.definition.region===Number(select.value)&&e.rank==='normal');if(!first)return;pack=enemies.visualUnits.filter(e=>e.groupId===first.groupId);player.teleport(first.spawn.x,first.spawn.y+480);};
  const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.onclick=action;controls.append(b);};
  controls.append(select);button('К пачке',choose);button('В бой',()=>{player.teleport(pack[0].spawn.x,pack[0].spawn.y+90);});button('Домой',()=>player.teleport(RETURN_POINT.x,RETURN_POINT.y));controls.append(output);document.body.append(panel);
  button('К ориентиру',()=>{
    const region=RELEASE_REGIONS[Number(select.value)-1],site=GEOGRAPHY_LANDMARKS.find(p=>p.region===region.id);
    if(!site)return;
    const angle=Math.atan2(region.center[1]-site.y,region.center[0]-site.x),distance=site.radius+170;
    for(const turn of [0,.4,-.4,.8,-.8,1.5,-1.5,Math.PI]){
      const x=site.x+Math.cos(angle+turn)*distance,y=site.y+Math.sin(angle+turn)*distance;
      if(pointInRegion(region,x,y)){player.teleport(x,y);return;}
    }
  });
  button('Босс региона',()=>{
    const region=RELEASE_REGIONS[Number(select.value)-1],boss=bosses.visualUnits.find(b=>b.definition.region===region.id&&b.definition.isMain);
    if(boss){const dx=region.center[0]-boss.spawn.x,dy=region.center[1]-boss.spawn.y,d=Math.max(1,Math.hypot(dx,dy));player.teleport(boss.spawn.x+dx/d*270,boss.spawn.y+dy/d*270);}
  });
  button('К переходу',()=>{const region=Number(select.value),passage=RELEASE_PASSAGES.find(p=>p.a===region||p.b===region)!;const point=getPassageMidpoint(passage);player.teleport(point.x,point.y);});
  button('Спящий босс',()=>{const p=BOSS_ARENAS['root-colossus'];player.teleport(p.x,p.y+90);});
  button('Громила',()=>{const p=BOSS_ARENAS['moss-ogre'];player.teleport(p.x,p.y+260);});
  button('Босс 4',()=>{const p=BOSS_ARENAS['lava-golem'];player.teleport(p.x,p.y+110);});
  button('Кузница',()=>player.teleport(FORGE_POSITION.x,FORGE_POSITION.y+90));
  button('Ранить',()=>combat.damagePlayer(100));
  button('Смертельный урон',()=>combat.damagePlayer(combat.state.maxHealth*2));
  const nodeType=document.createElement('select');nodeType.setAttribute('aria-label','Ресурс проверки');
  for(const [id,name]of [['wood','Дерево'],['stone','Камень'],['metal','Металл'],['crystal','Кристалл'],['fiber','Волокно']])nodeType.add(new Option(name,id));
  controls.append(nodeType);
  let trackedNode:string|undefined;
  button('К ресурсу',()=>{
    const node=resources?.visualNodes.find(n=>n.type===nodeType.value&&n.available&&(n.id.startsWith(`region-${select.value}-`)||select.value==='1'&&n.id.startsWith('starter-')));
    if(node){trackedNode=node.id;player.teleport(node.x,node.y+resourceFootprintRadius(node.type)+36);}
  });
  button('Ресурс у мобов',()=>{
    const candidates=(resources?.visualNodes??[]).filter(n=>n.type===nodeType.value&&n.available&&n.id.startsWith(`region-${select.value}-`));
    const nearby=enemies.visualUnits.filter(e=>e.alive&&e.rank==='normal'&&e.definition.region===Number(select.value));
    const distance=(node:{x:number;y:number})=>Math.min(...nearby.map(e=>Math.hypot(node.x-e.combatPosition.x,node.y-e.combatPosition.y)));
    const node=candidates.sort((a,b)=>distance(a)-distance(b))[0];
    if(node){trackedNode=node.id;const enemy=nearby.sort((a,b)=>Math.hypot(node.x-a.combatPosition.x,node.y-a.combatPosition.y)-Math.hypot(node.x-b.combatPosition.x,node.y-b.combatPosition.y))[0];
      const dx=enemy.combatPosition.x-node.x,dy=enemy.combatPosition.y-node.y,d=Math.max(1,Math.hypot(dx,dy)),radius=resourceFootprintRadius(node.type)+36;
      player.teleport(node.x+dx/d*radius,node.y+dy/d*radius);
    }
  });
  button('К сундуку',()=>{const chest=chests?.visualChests.find(c=>c.id.startsWith(`region-${select.value}-`)&&!c.opened);if(chest)player.teleport(chest.x,chest.y+60);});
  // Real keyboard events held across frames exercise the normal input/physics path.
  const releaseTimers=new Map<number,ReturnType<typeof setTimeout>>();
  const release=(keyCode:number)=>{window.dispatchEvent(new KeyboardEvent('keyup',{keyCode,which:keyCode,bubbles:true}));releaseTimers.delete(keyCode);};
  for(const [label,keyCode]of [['Шаг ↑',38],['Шаг ↓',40],['Шаг ←',37],['Шаг →',39],['Рывок',32]] as const)button(label,()=>{
    clearTimeout(releaseTimers.get(keyCode));window.dispatchEvent(new KeyboardEvent('keydown',{keyCode,which:keyCode,bubbles:true}));
    releaseTimers.set(keyCode,setTimeout(()=>release(keyCode),keyCode===32?100:600));
  });
  let protectedView=false;
  const protection=document.createElement('button');protection.textContent='Защита: выкл';protection.onclick=()=>{protectedView=!protectedView;protection.textContent=protectedView?'Защита: вкл':'Защита: выкл';};controls.append(protection);
  const capture=document.createElement('button');capture.textContent='Чистый кадр · 4 с';capture.dataset.qaCapture='true';
  capture.onclick=()=>{panel.hidden=true;setTimeout(()=>{panel.hidden=false;},4000);};controls.append(capture);
  let lastFrames=presentation?.renderStats.frames??0,lastFrameTime=performance.now();
  const timer=setInterval(()=>{
    if(protectedView&&combat.state.health>0)combat.restoreForLevelUp();
    const groups=new Map<string,number>();let min=Infinity,overlaps=0;
    const units=enemies.visualUnits.filter(e=>e.alive).map(e=>({position:e.combatPosition,radius:e.combatRadius}));
    for(const e of enemies.visualUnits)if(e.rank==='normal')groups.set(e.groupId,(groups.get(e.groupId)??0)+1);
    for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
      const a=units[i],b=units[j],gap=Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y)-a.radius-b.radius;
      min=Math.min(min,gap);if(gap < -1)overlaps++;
    }
    const boss=bosses.visualUnits.find(b=>b.definition.id==='lava-golem');
    const counts=[...groups.values()];output.textContent=`Проверка без сохранения · ${groups.size} пачек · ${Math.min(...counts)}–${Math.max(...counts)} мобов · элит: ${enemies.visualUnits.filter(e=>e.rank==='elite').length} · пересечений: ${overlaps} · зазор: ${min.toFixed(1)} · выбранная пачка: ${pack.filter(e=>e.alive).length}/${pack.length} · ${enemies.isPlayerThreatened()?'бой':'покой'} · Босс 4 HP: ${((boss?.visualHealthRatio??1)*100).toFixed(1)}%`;
    const node=resources?.visualNodes.find(n=>n.id===trackedNode);
    output.textContent+=` · Позиция: ${player.position.x.toFixed(0)},${player.position.y.toFixed(0)} · HP: ${combat.state.health}/${combat.state.maxHealth}`;
    if(node)output.textContent+=` · ${node.type}: ${node.health}/${node.maxHealth} · ударов: ${node.hitCount}`;
    if(presentation){
      const stats=presentation.renderStats,now=performance.now(),fps=(stats.frames-lastFrames)*1000/Math.max(1,now-lastFrameTime);
      lastFrames=stats.frames;lastFrameTime=now;
      output.textContent+=` · FPS: ${fps.toFixed(0)} · draw: ${stats.calls} · треуг.: ${Math.round(stats.triangles/1000)}k`;
    }
    const orbitals=combat.visualOrbitals;
    if(orbitals.length)output.textContent+=` · Орбиты: ${orbitals.map(o=>`${WEAPON_DEFINITIONS[o.weaponId].name} ${Number.isFinite(o.attackAt)?(o.attackAt/1000).toFixed(1)+'с':'ожидает'}`).join(', ')}`;
  },500);
  return ()=>{clearInterval(timer);for(const [code,timer]of releaseTimers){clearTimeout(timer);release(code);}panel.remove();};
}
