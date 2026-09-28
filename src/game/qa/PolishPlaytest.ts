import { createDefaultGameState, type GameState } from '../state/GameState';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { PlayerController } from '../player/PlayerController';
import { getPassageMidpoint, RELEASE_PASSAGES, RELEASE_REGIONS } from '../world/ReleaseRegionMap';
import { SETTLEMENT_CENTER } from '../world/WorldPrototype';
import { BOSS_ARENAS } from '../bosses/BossArenas';
import { FORGE_POSITION } from '../settlement/SettlementSystem';
import type { CombatSystem } from '../combat/CombatSystem';
import type { BossSystem } from '../bosses/BossSystem';
import type { WorldPresentation3D } from '../render3d/WorldPresentation3D';
import { WEAPON_DEFINITIONS, WEAPON_ORDER } from '../combat/WeaponDefinitions';

export const isPolishPlaytest = (): boolean => import.meta.env.DEV && new URLSearchParams(location.search).get('playtest') === 'polish';
/** This fixture never touches local storage or cloud saves. */
export function polishStateStore() {
  const state = createDefaultGameState();
  state.world.unlockedZones.push(...RELEASE_REGIONS.map(r=>r.stageId));
  for(const id of ['storage','sawmill','house','workshop','forge'] as const)state.settlement.buildings[id]=3;
  state.settlement.repairStages.forge=3;state.settlement.level=3;
  state.onboarding.moved=true;
  state.consumables.returnTickets=3;
  state.resources={wood:1000,stone:1000,metal:1000,crystal:100,fiber:100,coins:10000};
  state.premium.unlockedSkinIds=['moss-guard'];
  state.player.maxHealthLevel=10;state.player.backpackLevel=10;
  state.world.bossRespawnAt['root-colossus']=Date.now()+3600000;
  if(new URLSearchParams(location.search).get('weapons')==='all'){
    state.progression.playerLevel=20;
    state.player.unlockedWeaponIds=[...WEAPON_ORDER];
    state.player.weaponInventory={
      variants:WEAPON_ORDER.map(weaponId=>({weaponId,rarity:'common',level:1,starCounts:[1,0,0,0,0,0]})),
      equipped:Object.fromEntries(WEAPON_ORDER.map(id=>[id,{rarity:'common',stars:0}])),
      loadout:WEAPON_ORDER.map(weaponId=>({weaponId,rarity:'common',stars:0})),
      primarySlot:0,
    };
  }
  return {load:()=>state,save:(value:GameState)=>value};
}
export function installPolishPlaytest(player: PlayerController, enemies: EnemySystem,combat:CombatSystem,bosses:BossSystem,presentation?:WorldPresentation3D): ()=>void {
  const controls=document.createElement('div');
  controls.style.cssText='position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:100;background:#152c30ef;color:#eed9aa;border:1px solid #b99b60;border-radius:7px;padding:6px 10px;font:12px system-ui;max-width:55vw';
  const select=document.createElement('select');select.setAttribute('aria-label','Регион проверки');
  for(const region of RELEASE_REGIONS)select.add(new Option(region.id+'. '+region.name,String(region.id)));
  const output=document.createElement('div');output.setAttribute('role','status');
  const initial=enemies.visualUnits.find(e=>e.definition.region===1&&e.rank==='normal')!;
  let pack=enemies.visualUnits.filter(e=>e.groupId===initial.groupId);
  const choose=()=>{const first=enemies.visualUnits.find(e=>e.definition.region===Number(select.value)&&e.rank==='normal')!;pack=enemies.visualUnits.filter(e=>e.groupId===first.groupId);player.teleport(first.spawn.x,first.spawn.y+480);};
  const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.onclick=action;controls.append(b);};
  controls.append(select);button('К пачке',choose);button('В бой',()=>{player.teleport(pack[0].spawn.x,pack[0].spawn.y+90);});button('Домой',()=>player.teleport(SETTLEMENT_CENTER.x,SETTLEMENT_CENTER.y+260));controls.append(output);document.body.append(controls);
  button('К переходу',()=>{const region=Number(select.value),passage=RELEASE_PASSAGES.find(p=>p.a===region||p.b===region)!;const point=getPassageMidpoint(passage);player.teleport(point.x,point.y);});
  button('Спящий босс',()=>{const p=BOSS_ARENAS['root-colossus'];player.teleport(p.x,p.y+90);});
  button('Громила',()=>{const p=BOSS_ARENAS['moss-ogre'];player.teleport(p.x,p.y+260);});
  button('Босс 4',()=>{const p=BOSS_ARENAS['lava-golem'];player.teleport(p.x,p.y+110);});
  button('Кузница',()=>player.teleport(FORGE_POSITION.x,FORGE_POSITION.y+90));
  button('Ранить',()=>combat.damagePlayer(100));
  let protectedView=false;
  const protection=document.createElement('button');protection.textContent='Защита: выкл';protection.onclick=()=>{protectedView=!protectedView;protection.textContent=protectedView?'Защита: вкл':'Защита: выкл';};controls.append(protection);
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
    if(presentation){const stats=presentation.renderStats;output.textContent+=` · draw: ${stats.calls} · треуг.: ${Math.round(stats.triangles/1000)}k`;}
    const orbitals=combat.visualOrbitals;
    if(orbitals.length)output.textContent+=` · Орбиты: ${orbitals.map(o=>`${WEAPON_DEFINITIONS[o.weaponId].name} ${Number.isFinite(o.attackAt)?(o.attackAt/1000).toFixed(1)+'с':'ожидает'}`).join(', ')}`;
  },500);
  return ()=>{clearInterval(timer);controls.remove();};
}
