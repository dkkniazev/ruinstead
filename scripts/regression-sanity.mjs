import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`
export * from './src/game/combat/CombatMath.ts';
export * from './src/game/combat/WeaponDefinitions.ts';
export * from './src/game/progression/WeaponInventory.ts';
export * from './src/game/progression/UpgradeBalance.ts';
export * from './src/game/gathering/BackpackSystem.ts';
export * from './src/game/gathering/ResourceTypes.ts';
export * from './src/game/economy/ResourceTrading.ts';
export * from './src/game/state/GameState.ts';
export * from './src/game/player/DashConfig.ts';
`,loader:'ts',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const m=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text+'\n//# sourceURL=regression-fixture.mjs').toString('base64')}`);
for(const hp of [0,1,24.7,67,100]){
  let current=hp;
  for(let n=0;n<100;n++){current=m.healthAfterMaxChange(current,100,125);current=m.healthAfterMaxChange(current,125,100);}
  assert(Math.abs(current-hp)<1e-9,'Changing skins must not heal');
}
assert.equal(m.PLAYER_DASH_DISTANCE,210,'Dash distance should stay at the tuned half-length');
assert(m.PLAYER_DASH_SPEED>=1200,'Dash velocity must be substantially faster than normal movement');
assert(m.PLAYER_DASH_MAX_DURATION_MS>=m.PLAYER_DASH_DISTANCE/m.PLAYER_DASH_SPEED*1000+150,'Dash timeout is only a derived stall safety margin');
const freshState=m.createDefaultGameState();
assert.equal(freshState.schemaVersion,29);
assert.deepEqual(freshState.onboarding,{moved:false,dashed:false,firstKill:false,hudSeen:false,backpackSeen:false,forgeSeen:false,bestiarySeen:false,tutorialStep:0,tutorialCompleted:false,skipped:false});
const bag=new m.BackpackSystem(0,{...m.emptyResourceCounts(),wood:100,coins:500});
assert.equal(bag.usedCapacity,100);assert.equal(bag.add('coins',1000),1000);assert.equal(bag.add('wood',1),0);
assert.equal(bag.state.carried.coins,1500);assert.equal(bag.usedCapacity,100);
const deathDrop=bag.takeAll();assert.equal(deathDrop.coins,1500);assert.equal(deathDrop.wood,100);assert.equal(bag.state.carried.coins,0);
const oldOverweight=new m.BackpackSystem(0,{...m.emptyResourceCounts(),wood:200,coins:2000});
assert.equal(oldOverweight.state.carried.coins,2000,'Capacity trimming cannot delete weightless coins');
assert.equal(m.MAX_PLAYER_UPGRADE_LEVEL,20);assert.equal(m.getBackpackCapacity(10),400);assert.equal(m.getBackpackCapacity(20),1000);
for(const [id,value]of [['max-health',m.getMaxHealth],['move-speed',m.getMoveSpeed],['backpack',m.getBackpackCapacity],['dash',m.getDashCooldownMs]]){
  for(let level=10;level<20;level++){assert(m.getPlayerUpgradeCost(id,level));assert(id==='dash'?value(level+1)<value(level):value(level+1)>value(level));}
  assert.equal(m.getPlayerUpgradeCost(id,20),null);
}
for(const stars of [[32,0,0,0,0,0],[0,0,0,0,2,0],[0,0,1,0,0,1]]){
  const inventory=m.createDefaultWeaponInventory();inventory.variants.push({weaponId:'daggers',rarity:'rare',level:3,starCounts:stars});
  assert(m.isWeaponDropCapped(inventory,'daggers','rare'));const before=m.weaponCopyCount(inventory,'daggers','rare');
  const reward=m.grantWeaponLoot(inventory,'daggers','rare',()=>.4);
  assert(reward&&reward.weaponId!=='daggers'&&reward.rarity==='rare');assert.equal(m.weaponCopyCount(inventory,'daggers','rare'),before);
}
const fresh=m.createDefaultWeaponInventory();
for(let n=0;n<32;n++)assert(m.addWeaponDrop(fresh,'sword','epic'));
assert.equal(m.addWeaponDrop(fresh,'sword','epic'),null);
for(const id of m.WEAPON_ORDER)if(id!=='sword')fresh.variants.push({weaponId:id,rarity:'epic',level:1,starCounts:[32,0,0,0,0,0]});
assert.equal(m.grantWeaponLoot(fresh,'sword','epic'),null,'A full rarity must terminate with fallback, not recurse');
const storage={...m.emptyResourceCounts(),wood:150,coins:25};
assert.equal(m.sellStoredResource(storage,'wood',100),100);assert.equal(storage.wood,50);assert.equal(storage.coins,125);
const baseline=JSON.stringify(storage);
for(const [id,count]of [['wood',51],['wood',-1],['wood',1.5],['wood',NaN],['coins',1],['__proto__',1]])assert.equal(m.sellStoredResource(storage,id,count),0);
assert.equal(JSON.stringify(storage),baseline);
console.log('Regressions: PASS — reversible skin HP, weightless carried/death coins, 20 upgrade levels, 32-copy cap before fusion, same-rarity rerolls, atomic resource sales.');
