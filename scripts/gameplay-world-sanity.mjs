import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const output=await build({stdin:{contents:`
export * from './src/game/combat/OrbitalAttack.ts';
export * from './src/game/combat/WeaponDefinitions.ts';
export * from './src/game/progression/WeaponInventory.ts';
export * from './src/game/world/WorldInteractions.ts';
export * from './src/game/cosmetics/SkinEconomy.ts';
export * from './src/game/world/WalkableWorld.ts';
export * from './src/game/world/ReleaseRegionMap.ts';
export * from './src/game/enemies/AttackWindup.ts';
export * from './src/game/world/ObstacleNavigation.ts';
export * from './src/game/world/SettlementLayout.ts';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const api=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const {OrbitalAttack,WEAPON_DEFINITIONS,resolveWorldInteraction,createDefaultWeaponInventory,normalizeWeaponLoadoutForPlayerLevel,equipWeaponInSlot,getSkinEffects,WalkableWorld,RELEASE_REGIONS,RELEASE_PASSAGES,getPassageMidpoint,AttackWindup,ObstacleNavigation}=api;
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

const candidates=[{id:'forge',kind:'forge',label:'forge',x:100,y:0,range:145,available:true,priority:10},{id:'chest',kind:'chest',label:'chest',x:25,y:0,range:82,available:true,priority:30}];
assert.equal(resolveWorldInteraction(player,candidates).id,'chest','Only the closest available E interaction wins');
candidates[1].available=false;assert.equal(resolveWorldInteraction(player,candidates).id,'forge');
assert.equal(resolveWorldInteraction({x:600,y:600},candidates),undefined,'A remote forge cannot intercept E');
const nearTie=[{id:'forge',kind:'forge',label:'forge',x:20,y:0,range:145,available:true,priority:10},{id:'chest',kind:'chest',label:'chest',x:28,y:0,range:82,available:true,priority:30}];
assert.equal(resolveWorldInteraction(player,nearTie).id,'chest','Context priority breaks near-distance ties in favour of the explicit world interaction');
const openWorld=new WalkableWorld(['stage-2','stage-3','stage-4','stage-5','stage-6','stage-7','stage-8']);
let slid=false;
for(const region of RELEASE_REGIONS){
  for(let i=0;i<region.outline.length&&!slid;i++){
    const a=region.outline[i],b=region.outline[(i+1)%region.outline.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
    const ix=region.center[0]-mx,iy=region.center[1]-my,il=Math.hypot(ix,iy);if(il<1)continue;
    const nx=ix/il,ny=iy/il,tx=(b[0]-a[0])/Math.max(1,Math.hypot(b[0]-a[0],b[1]-a[1])),ty=(b[1]-a[1])/Math.max(1,Math.hypot(b[0]-a[0],b[1]-a[1]));
    const from={x:mx+nx*70,y:my+ny*70};if(!openWorld.contains(from,18))continue;
    const next=openWorld.slide(from,{x:mx-nx*70+tx*90,y:my-ny*70+ty*90},18,{x:-nx*140+tx*90,y:-ny*140+ty*90});
    assert(openWorld.contains({x:next.x,y:next.y},17.9),'Boundary projection keeps the body inside walkable world');
    assert(Math.hypot(next.x-from.x,next.y-from.y)>20,'Boundary collision preserves tangential motion instead of sticking');
    slid=true;
  }
}
assert(slid,'Found a polygon edge suitable for boundary sliding regression');

const bridgePassage=RELEASE_PASSAGES.find(p=>p.id==='1-2');
const bridgeMid=getPassageMidpoint(bridgePassage);
const lockedBridge=new WalkableWorld([]);
assert.equal(lockedBridge.contains(bridgeMid,18),false,'Locked bridge collision is centred on the authored passage midpoint');
lockedBridge.sync(['stage-2']);
assert.equal(lockedBridge.contains(bridgeMid,18),true,'Unlocking region 2 removes the authoritative bridge gate');

const routeWorld=new WalkableWorld(['stage-2','stage-3','stage-4','stage-5','stage-6','stage-7','stage-8']);
const navigation=new ObstacleNavigation(routeWorld);
const routeCenter={x:RELEASE_REGIONS[0].center[0],y:RELEASE_REGIONS[0].center[1]};
navigation.setObstacles([{x:routeCenter.x,y:routeCenter.y,halfWidth:70,halfHeight:70,circle:true}]);
const from={x:routeCenter.x-150,y:routeCenter.y},homePoint={x:routeCenter.x+150,y:routeCenter.y};
assert.equal(navigation.lineClear(from,homePoint,18),false,'Direct return path detects a blocking world object');
const route=navigation.route(from,homePoint,18);
assert(route.length>1,'Return-to-home navigation finds an alternate route around a blocking object');
let cursor=from;
for(const point of route){assert(navigation.lineClear(cursor,point,18),'Every return-to-home route segment is obstacle-clear');cursor=point;}
assert(Math.hypot(cursor.x-homePoint.x,cursor.y-homePoint.y)<1,'Return route terminates at the requested home point');
const windup=new AttackWindup();
const {settlementSolidFootprints,clearSettlementPosition,settlementAreaIsClear}=api;
const settlement={x:routeCenter.x,y:routeCenter.y+380},solids=settlementSolidFootprints(settlement);
navigation.setObstacles(solids);
assert.equal(solids.length,6,'Four buildings, forge and well have shared ground footprints');
const spawn={x:settlement.x,y:settlement.y+190},deposit={x:settlement.x-150,y:settlement.y+90},forgeFront={x:settlement.x+240,y:settlement.y+90};
for(const p of [spawn,deposit,forgeFront])assert(settlementAreaIsClear(settlement,p,24),'Spawn, banking and forge approach remain clear');
for(const solid of solids){
  const rescued=clearSettlementPosition(settlement,solid,24);
  assert(settlementAreaIsClear(settlement,rescued,24),'A legacy position inside any solid moves to clear ground');
  assert(Math.hypot(rescued.x-solid.x,rescued.y-solid.y)<180,'Legacy correction is local, not a reset to spawn');
  assert.equal(navigation.lineClear({x:solid.x,y:solid.y-solid.halfHeight-50},{x:solid.x,y:solid.y+solid.halfHeight+50},18),false,'Navigation recognises every settlement collider');
}
assert.deepEqual(clearSettlementPosition(settlement,spawn,24),spawn,'A valid saved position is preserved');
// Phaser does not synchronize a new setOffset until updateFromGameObject.
// Exercise its real Body so a legacy rescue cannot use a stale sprite centre.
const Body=createRequire(import.meta.url)('../node_modules/phaser/src/physics/arcade/Body.js');
for(const [width,height]of [[82,110],[80,112]]){
  const site=solids[2],sprite={x:site.x,y:site.y,angle:0,scaleX:1,scaleY:1,
    displayWidth:width,displayHeight:height,displayOriginX:width/2,displayOriginY:height/2,
    setPosition(x,y){this.x=x;this.y=y;},getTopLeft(out){return out.set(this.x-width/2,this.y-height/2);}};
  const body=new Body({defaults:{},bounds:{x:0,y:0,width:16000,height:18000}},sprite);
  body.setSize(32,33).setOffset(24,70);body.updateFromGameObject();
  const before={x:body.center.x,y:body.center.y},safe=clearSettlementPosition(settlement,before,24);
  body.reset(sprite.x+safe.x-before.x,sprite.y+safe.y-before.y);body.updateFromGameObject();
  assert(settlementAreaIsClear(settlement,body.center,24),'Legacy rescue uses the current texture offset before the first physics step');
  assert(Math.hypot(body.center.x-before.x,body.center.y-before.y)<180,'Body correction remains local');
}
for(const target of [deposit,forgeFront]){
  const path=navigation.route(spawn,target,18);assert(path.length>0,'Base services are reachable around the solid buildings');
  let cursor=spawn;for(const p of path){assert(navigation.lineClear(cursor,p,18),'Service route never crosses a building or well');cursor=p;}
  assert(Math.hypot(cursor.x-target.x,cursor.y-target.y)<1,'Service route reaches its target');
}
assert.equal(windup.update(0,true,10,0,300,800),false,'Entering attack range starts wind-up without damage');
assert(windup.active&&windup.impactAt===300);
assert.equal(windup.update(150,false,20,0,300,800),false,'Leaving reach during wind-up dodges the hit');
assert(!windup.active);
windup.readyAt=200;windup.update(200,true,10,0,300,800);
assert.equal(windup.update(499,true,10,0,300,800),false);
assert.equal(windup.update(500,true,10,0,300,800),true,'Damage lands only after the readable wind-up');
for(const id of ['starter-warden','pass-champion','ashborn','founder-keeper'])assert.equal(Object.keys(getSkinEffects(id)).length,2,'Special skins have two focused effects');
assert.equal(getSkinEffects('sun-warden')['max-health'],.2,'Normal epic bonus remains unchanged');
console.log('Gameplay/world regression: PASS — locked slots, duplicate equipment, target acquire, flight/impact/return, cooldowns, interaction priority/range, special skin effects.');
