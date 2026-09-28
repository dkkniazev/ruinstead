import { GameUI, type GameUIState } from '../ui/GameUI';
import { createDefaultGameState } from '../state/GameState';
import { BestiarySystem } from '../bestiary/BestiarySystem';
import { RELEASE_SPECIES, RELEASE_BOSSES } from '../world/ReleaseWorldContent';
import { WEAPON_ORDER } from '../combat/WeaponDefinitions';
import { WEAPON_RARITIES, getWeaponDamageMultiplier, type OwnedWeaponOption } from '../progression/WeaponInventory';
import * as E from '../ui/HudEvents';
if(!import.meta.env.DEV)throw Error('Development preview only');
// No persistence, SDK, purchases or game mutations: deterministic UI inspection only.
const game=createDefaultGameState(),bestiary=new BestiarySystem(game);
for(const s of RELEASE_SPECIES){bestiary.recordEncounter('species',s.id,true);game.bestiary.speciesKills[s.id]=27;game.bestiary.eliteKills[s.id]=4;}
for(const b of RELEASE_BOSSES){bestiary.recordEncounter('boss',b.id);game.bestiary.bossKills[b.id]=3;}
const resources={wood:3240,stone:2870,metal:1900,crystal:24,fiber:36,coins:5200};
const inventory:OwnedWeaponOption[]=WEAPON_ORDER.map((weaponId,i)=>{const rarity=(['common','uncommon','rare','epic','legendary'] as const)[i];return {weaponId,rarity,level:7,stars:i,count:3,rarityName:WEAPON_RARITIES[rarity].name,rarityColor:WEAPON_RARITIES[rarity].color,damageMultiplier:getWeaponDamageMultiplier(7,rarity,i)};});
const equipped=inventory.slice();
for(const weaponId of WEAPON_ORDER)for(const rarity of ['common','uncommon','rare','epic','legendary'] as const)for(let stars=0;stars<=5;stars++){if(inventory.some(w=>w.weaponId===weaponId&&w.rarity===rarity&&w.stars===stars))continue;inventory.push({weaponId,rarity,stars,level:7,count:3,rarityName:WEAPON_RARITIES[rarity].name,rarityColor:WEAPON_RARITIES[rarity].color,damageMultiplier:getWeaponDamageMultiplier(7,rarity,stars)});}
const state:GameUIState={
  combat:{health:175,maxHealth:240,healthPotions:3,healthPotionCooldownMs:8000,healthPotionCooldownRemainingMs:0,weaponId:'axe',unlockedWeaponIds:[...WEAPON_ORDER],weaponSlots:equipped,primarySlot:0},
  gathering:{backpack:{carried:{wood:14,stone:7,metal:9,crystal:5,fiber:8,coins:120},usedCapacity:43,capacity:275},storage:resources},
  settlement:{nearForge:true,forge:{repairStage:3,maxRepairStage:3,restored:true,stageName:'Кузница восстановлена',nextCost:null,canAfford:false,storage:resources,npcPresent:true}},
  upgrade:{forgeRestored:true,selectedWeaponId:'axe',unlockedWeaponIds:[...WEAPON_ORDER],equippedWeapon:inventory[0],weaponOptions:inventory,player:{maxHealthLevel:6,moveSpeedLevel:7,backpackLevel:8,dashLevel:9},storage:resources,damageBonus:1.1},
  character:{level:22,unlockedSlots:5,primarySlot:0,slots:equipped,inventory,storage:resources,damageBonus:1.1},
  progress:{level:22,xp:870,xpToNext:1800,gems:1200,masteryAvailable:3,masteryRanks:{combat:2,vitality:1,mobility:0,gathering:1,settlement:0}},
  quest:{activeId:'preview',title:'Следы древнего хранителя перевала',objective:'Исследуйте Теневой перевал и победите его главного хранителя.',progress:'2 / 3 хранителей',hint:'Пройдите через северный мост и найдите каменные врата.',sequenceProgress:'17 / 32',rewardText:'120 монет · 50 опыта',optional:{id:'optional',title:'Кристаллы для восстановления древней кузницы',progress:'24 / 30 кристаллов',rewardText:'50 монет'}},
  bestiary:bestiary.getHudState(),city:{insideSettlement:true,settlementLevel:5,npcCount:12,production:{pending:{wood:65,stone:43,metal:21,crystal:0,fiber:0,coins:0},capacity:180,used:129,canCollect:true,cycleSeconds:30},buildings:[['storage','Склад'],['sawmill','Лесопилка'],['workshop','Мастерская'],['house','Дом']].map(([id,name])=>({id:id as 'storage',name,level:4,maxLevel:8,locked:false,lockReason:'',nextCost:{wood:105,stone:65,metal:14,crystal:2,fiber:3,coins:120},canAfford:true,effectText:'Увеличивает производство и вместимость поселения.'}))},
  monetization:{enabled:true,busy:false,returnTickets:5,canFastReturn:true,purchaseAvailable:false,activeBlessing:null,bossRespawnResetCooldownRemainingMs:0,supplyCooldownRemainingMs:0,adFreeUntil:0,offer:null},
  premium:{gems:1200,purchaseAvailable:false,rewardedCommonChestRemaining:3,freeSkinChests:{common:2,rare:1,epic:0},epicChestPity:3,skinFragments:{'ember-initiate':20},unlockedSkinIds:['moss-guard'],equippedSkinId:'moss-guard',starterPackOwned:false,founderPackOwned:false,levelPassOwned:false,regionPackStage2Owned:false,regionPackStage2Available:true,ownedSettlementThemes:['default'],equippedSettlementTheme:'default',ownedPets:[],equippedPet:null,shardShopOffers:[{slot:0,skinId:'ember-initiate',rarity:'common',fragments:10,gemCost:60,purchased:false,unlocked:false}],purchaseCatalog:{}},area:'Теневой перевал',
};
const log=document.createElement('output');log.style.cssText='position:fixed;bottom:2px;left:50%;z-index:100;color:white;background:#142b2d;font:11px system-ui;pointer-events:none';document.body.append(log);
const ui=new GameUI(state,(event,...args)=>{log.textContent=event+' '+JSON.stringify(args);if(event===E.HUD_MONETIZATION_ACTION_EVENT)ui.update('monetization',{...state.monetization,offer:null});},()=>{});
const fixtures=document.createElement('nav');fixtures.style.cssText='position:fixed;top:2px;left:45%;z-index:100;display:flex;gap:4px';
for(const [label,placement]of [['Смерть','death_revive'],['Награда босса','boss_reward'],['Сундук','chest_reward']] as const){const btn=document.createElement('button');btn.textContent=label;btn.onclick=()=>ui.update('monetization',{...state.monetization,offer:{placement,title:placement==='death_revive'?'Путешествие прервано':'Награда за победу',description:'Ваши усилия заслуживают дополнительной награды.',rewardText:placement==='death_revive'?'Вернитесь в бой с 70% здоровья':'Удвойте добычу за просмотр рекламы'}});fixtures.append(btn);}document.body.append(fixtures);
const stress=document.createElement('button');stress.textContent='Поток HUD';let stressTimer:ReturnType<typeof setInterval>|undefined;stress.onclick=()=>{if(stressTimer){clearInterval(stressTimer);stressTimer=undefined;}else stressTimer=setInterval(()=>ui.update('combat',{...state.combat,health:Math.max(15,(state.combat.health-1)%240)}),80);};fixtures.append(stress);
ui.open('character');
