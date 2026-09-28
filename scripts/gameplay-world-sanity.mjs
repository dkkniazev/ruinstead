import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({stdin:{contents:`
export * from './src/game/combat/OrbitalAttack.ts';
export * from './src/game/combat/WeaponDefinitions.ts';
export * from './src/game/progression/WeaponInventory.ts';
export * from './src/game/world/WorldInteractions.ts';
export * from './src/game/cosmetics/SkinEconomy.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const api=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const {OrbitalAttack,WEAPON_DEFINITIONS,resolveWorldInteraction,createDefaultWeaponInventory,normalizeWeaponLoadoutForPlayerLevel,equipWeaponInSlot,getSkinEffects}=api;
const inventory=createDefaultWeaponInventory();
inventory.variants.push({weaponId:'daggers',rarity:'rare',level:1,starCounts:[1,0,0,0,0,0]});
inventory.loadout[4]={weaponId:'daggers',rarity:'rare',stars:0};inventory.primarySlot=4;
normalizeWeaponLoadoutForPlayerLevel(inventory,16);
assert.equal(inventory.loadout[4],null,'Locked slot is removed from active loadout');
assert(inventory.primarySlot<4,'Primary must be in an unlocked slot');
assert(equipWeaponInSlot(inventory,3,{weaponId:'daggers',rarity:'rare',stars:0},16).success,'A cleaned locked slot must not block equipping');
assert(!equipWeaponInSlot(inventory,2,{weaponId:'daggers',rarity:'rare',stars:0},16).success,'Same family + rarity stays forbidden');

const player={x:0,y:0},home={x:-95,y:0},target={alive:true,combatPosition:{x:92,y:0},combatRadius:25};
const flight=new OrbitalAttack();let hits=0;
const update=(time)=>flight.update(time,home,player,18,70,240,()=>target,()=>hits++);
update(0);assert.equal(flight.phase,'attack','Target acquisition is relative to the hero, even when the weapon is behind');assert.equal(hits,0);
update(60);assert.equal(hits,0,'No damage during outbound travel');assert(flight.x>home.x&&flight.x<target.combatPosition.x);
update(80);assert.equal(hits,1);assert.equal(flight.x,target.combatPosition.x,'Damage lands at visible impact');
update(100);assert.equal(hits,1,'Impact cannot deal repeated damage');
update(115);home.y=40;update(210);assert.equal(flight.phase,'orbit');assert.equal(flight.y,40,'Return follows moving orbital home');
update(230);assert.equal(flight.phase,'orbit');update(240);assert.equal(flight.phase,'attack');
target.alive=false;update(250);assert.equal(flight.phase,'return');assert.equal(hits,1,'A dead in-flight target cancels damage');
target.alive=true;target.combatPosition.x=400;update(500);assert.equal(hits,1,'Far targets are not acquired');
target.combatPosition.x=92;
const counts={};
for(const id of ['daggers','hammer']){
  const weapon=new OrbitalAttack();let count=0;
  for(let t=0;t<5000;t+=10)weapon.update(t,home,player,18,WEAPON_DEFINITIONS[id].range,WEAPON_DEFINITIONS[id].cooldownMs,()=>target,()=>count++);
  counts[id]=count;
}
assert(counts.daggers>=counts.hammer*3,'Each orbital uses its weapon cooldown, independent of revolution speed');

const candidates=[{id:'forge',kind:'forge',label:'forge',x:100,y:0,range:145,available:true},{id:'chest',kind:'chest',label:'chest',x:25,y:0,range:82,available:true}];
assert.equal(resolveWorldInteraction(player,candidates).id,'chest','Only the closest available E interaction wins');
candidates[1].available=false;assert.equal(resolveWorldInteraction(player,candidates).id,'forge');
assert.equal(resolveWorldInteraction({x:600,y:600},candidates),undefined,'A remote forge cannot intercept E');
for(const id of ['starter-warden','pass-champion','ashborn','founder-keeper'])assert.equal(Object.keys(getSkinEffects(id)).length,2,'Special skins have two focused effects');
assert.equal(getSkinEffects('sun-warden')['max-health'],.2,'Normal epic bonus remains unchanged');
console.log('Gameplay/world regression: PASS — locked slots, duplicate equipment, target acquire, flight/impact/return, cooldowns, interaction priority/range, special skin effects.');
