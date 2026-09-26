import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({stdin: { contents: `
  export * from './src/game/combat/CombatMath.ts';
  export * from './src/game/combat/WeaponDefinitions.ts';
  export * from './src/game/progression/WeaponInventory.ts';
  export * from './src/game/progression/UpgradeBalance.ts';
  export * from './src/game/economy/HarvestBalance.ts';
  export * from './src/game/render3d/BossTelegraph3D.ts';
`, resolveDir: process.cwd(), loader: 'ts'}, bundle:true, platform:'node', format:'esm', write:false});
const m = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

for (const max of [100,350,700]) for (const delta of [10,20,50,100]) {
  let hp=1;
  for(let elapsed=0;elapsed<5000;elapsed+=delta) hp=m.safeZoneHealth(hp,max,delta);
  assert.equal(hp,max,'Safe zone must fully heal within five seconds');
  assert.equal(m.safeZoneHealth(max,max,100),max,'Safe healing may not overheal');
}
for(const id of m.WEAPON_ORDER) {
  assert.equal(m.weaponHitDamage({weaponId:id,level:1,rarity:'common',stars:0}),m.WEAPON_DEFINITIONS[id].damage);
  const profile={weaponId:id,level:10,rarity:'epic',stars:5};
  assert(m.weaponHitDamage(profile,1.3)>m.weaponHitDamage(profile));
  assert(m.weaponHitDamage(profile,1,.65)<m.weaponHitDamage(profile));
}

const inventory=m.createDefaultWeaponInventory();
inventory.variants.push({weaponId:'sword',rarity:'rare',level:8,starCounts:[0,0,0,0,0,1]});
for(const rarity of ['common','uncommon','rare']) {
  const before=JSON.stringify(inventory);
  assert.equal(m.addWeaponDrop(inventory,'sword',rarity),null,'Capped/lesser tiers should become materials');
  assert.equal(JSON.stringify(inventory),before,'A capped drop must not add a hidden copy');
}
assert(m.addWeaponDrop(inventory,'sword','epic'),'A better rarity must remain obtainable');
assert(m.addWeaponDrop(inventory,'hammer','common'),'Other weapon families must remain obtainable');
assert(m.cappedWeaponMaterials('rare').crystal>=12);

for(const angle of [0,.6,Math.PI/2,Math.PI,4.3]) {
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const zone={shape:'line',x:6280,y:10600,dx,dy,length:319,width:126};
  const point=(along,side)=>[zone.x+along*dx-side*dy,zone.y+along*dy+side*dx];
  for(const [along,side] of [[1,0],[318,0],[150,62]]) assert(m.insideBossDanger(zone,...point(along,side)));
  for(const [along,side] of [[-1,0],[320,0],[150,64],[150,-64]]) assert(!m.insideBossDanger(zone,...point(along,side)),'Outside the visible red zone must be safe');
  const mesh=m.createBossTelegraph(zone),positions=mesh.geometry.attributes.position;
  let min=Infinity,max=-Infinity,width=0;
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i)-zone.x,y=positions.getZ(i)-zone.y;
    min=Math.min(min,x*dx+y*dy);max=Math.max(max,x*dx+y*dy);width=Math.max(width,Math.abs(x*dy-y*dx));
  }
  assert(Math.abs(min)<.01 && Math.abs(max-zone.length)<.01 && Math.abs(width-zone.width/2)<.01,'Rendered rectangle must match the damage rectangle');
  m.disposeBossTelegraph(mesh);
}
assert(!m.insideBossDanger({shape:'circle',x:0,y:0,radius:120},121,0));

const cost=m.getWeaponUpgradeCost('axe',9);
assert(Math.ceil(cost.crystal/m.harvestYield('crystal',4,5))<=2,'Late weapon upgrade should require at most two R4 crystal nodes');
assert(Math.ceil(cost.fiber/m.harvestYield('fiber',4,2))<=2,'Late weapon upgrade should require at most two R4 fiber nodes');
assert(m.harvestRespawnMs('crystal')<=60000);
console.log('Gameplay sanity: PASS (5s healing, damage, capped loot, telegraph geometry, rare-material progression)');
