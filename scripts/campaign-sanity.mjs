import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercises the real quest gates and economy definitions. This is a state-flow
// audit, not a simulation of player skill, combat movement or an SDK session.
const bundle = await build({
  stdin: { contents: `
    export * from './src/game/state/GameState.ts';
    export * from './src/game/quests/QuestDirector.ts';
    export * from './src/game/progression/UpgradeBalance.ts';
    export * from './src/game/progression/WeaponInventory.ts';
    export * from './src/game/combat/CombatMath.ts';
    export * from './src/game/combat/WeaponDefinitions.ts';
    export * from './src/game/bosses/BossSystem.ts';
    export * from './src/game/gathering/ResourceSystem.ts';
    export * from './src/game/settlement/SettlementSystem.ts';
    export * from './src/game/world/BridgeSystem.ts';
    export * from './src/game/world/ReleaseWorldContent.ts';
  `, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'phaser-math', setup(b) {
    b.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `export default {Math:{
      Vector2:class {constructor(x=0,y=0){this.x=x;this.y=y;}},
      Distance:{Between:(a,b,c,d)=>Math.hypot(c-a,d-b)}
    }};` }));
  } }],
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + '\n//# sourceURL=campaign-fixture.mjs').toString('base64')}`);
const zero = () => ({ wood: 0, stone: 0, metal: 0, crystal: 0, fiber: 0, coins: 0 });
const state = api.createDefaultGameState();
const director = new api.QuestDirector();
const context = { outsideSettlement: false, carried: zero() };
const nodes = api.buildResourceNodeDefinitions();
const bosses = api.buildBossDefinitions();
const completed = [];
const update = expected => {
  const result = director.update(state, context);
  completed.push(...result.completed.filter(q => !q.optional).map(q => q.id));
  assert.equal(result.hud.activeId, expected);
  return result.hud;
};
const gatherFor = (cost, region, target) => {
  for (const [type, amount] of Object.entries(cost)) {
    if (!amount || type === 'coins') continue;
    const node = nodes.find(n => n.type === type && (n.id.startsWith(`region-${region}-`) || region === 1 && n.id.startsWith('starter-')));
    assert(node && node.dropCount > 0 && node.respawnMs > 0, `R${region}: ${type} is inaccessible`);
    // Repeated actual node yields, including respawn, with no ad dependency.
    if (target[type] < amount) target[type] += Math.ceil((amount - target[type]) / node.dropCount) * node.dropCount;
  }
};
const spend = (cost, storage) => {
  assert(api.canAffordUpgrade(storage, cost), 'Mandatory cost cannot be funded');
  api.spendUpgradeCost(storage, cost);
  assert(Object.values(storage).every(n => n >= 0), 'Negative inventory');
};

update('first-departure');
context.outsideSettlement = true;
update('gather-first-wood');
context.carried.wood = 9;
update('gather-first-wood');
gatherFor({ wood: 10 }, 1, context.carried);
update('bank-first-haul');
context.outsideSettlement = false;
state.resources.wood = context.carried.wood;
context.carried = zero();
update('repair-forge-first-stage');
for (let stage = 0; stage < api.FORGE_MAX_REPAIR_STAGE; stage++) {
  const cost = api.FORGE_STAGE_COSTS[stage];
  gatherFor(cost, 1, state.resources);
  spend(cost, state.resources);
  state.settlement.repairStages.forge = stage + 1;
  if (stage === 2) state.settlement.buildings.forge = 1;
  update(stage === 2 ? 'buy-first-upgrade' : 'restore-forge');
}
assert.equal(director.getHudState(state, context).progress, '0 / 1', 'Default level-one weapons must not show a purchased upgrade');
const healthCost = api.getPlayerUpgradeCost('max-health', 0);
gatherFor(healthCost, 1, state.resources);
spend(healthCost, state.resources); // Forge quest rewards fund the first hero upgrade.
state.player.maxHealthLevel = 1;
update('reach-forest-heart');
state.world.discoveredLandmarks.push('forest-heart');
update('defeat-root-colossus');
state.world.defeatedBosses.push('root-colossus');
update('repair-region-two-bridge');
state.settlement.buildings.bridge = 1;
update('repair-region-two-bridge'); // A repaired bridge without zone access is insufficient.
gatherFor(api.BRIDGE_REPAIR_COST, 1, context.carried);
assert(Object.entries(context.carried).filter(([k]) => k !== 'coins').reduce((n, [, v]) => n + v, 0) <= api.getBackpackCapacity(0));
spend(api.BRIDGE_REPAIR_COST, context.carried);
state.world.unlockedZones.push('stage-2');
update('enter-region-2');
for (let region = 2; region <= 8; region++) {
  const boss = bosses.find(b => b.region === region && b.isMain);
  assert(boss, `R${region}: no main boss`);
  state.world.discoveredLandmarks.push(`stage-${region}-entry`);
  update(`defeat-${boss.id}`);
  // Killing a side boss must not replace the main boss gate.
  state.world.defeatedBosses.push(bosses.find(b => b.region === region && !b.isMain).id);
  update(`defeat-${boss.id}`);
  state.world.defeatedBosses.push(boss.id);
  update(region === 8 ? null : `enter-region-${region + 1}`);
  if (region < 8) state.world.unlockedZones.push(`stage-${region + 1}`);
}
assert.equal(completed.length, 23);
assert.equal(new Set(completed).size, completed.length);
assert.equal(director.getHudState(state, context).sequenceProgress, '23 / 23');
assert(api.getStoryBeatForQuestCompletion('defeat-fire-dragon'), 'Finale story is missing');
const beforeReload = structuredClone(state);
new api.QuestDirector().update(state, context);
assert.deepEqual(state, beforeReload, 'Reload regrants completed quest rewards');

// Upgrade paths before the bridge cannot consume rare materials from region 2.
for (const id of api.PLAYER_UPGRADE_IDS) for (let level = 0; level < 5; level++) {
  const cost = api.getPlayerUpgradeCost(id, level);
  assert.equal((cost.crystal ?? 0) + (cost.fiber ?? 0), 0);
  gatherFor(cost, 1, zero());
}
for (const id of api.WEAPON_ORDER) for (let level = 1; level < api.MAX_WEAPON_LEVEL; level++) {
  const cost = api.getWeaponUpgradeCost(id, level);
  if (level < 5) assert.equal((cost.crystal ?? 0) + (cost.fiber ?? 0), 0);
  gatherFor(cost, level < 5 ? 1 : 2, zero());
}
for (const id of api.PLAYER_UPGRADE_IDS) for (let level = 5; level < api.MAX_PLAYER_UPGRADE_LEVEL; level++) gatherFor(api.getPlayerUpgradeCost(id, level), 2, zero());
for (const id of api.PLAYER_UPGRADE_IDS) assert.equal(api.getPlayerUpgradeCost(id, api.MAX_PLAYER_UPGRADE_LEVEL), null);
for (const id of api.WEAPON_ORDER) assert.equal(api.getWeaponUpgradeCost(id, api.MAX_WEAPON_LEVEL), null);
assert.equal(api.getBackpackCapacity(20), 1000);

// Diagnostic only: one always-available common axe, no stars or paid bonuses.
// Real fights take longer due to movement, windups and dodge windows.
console.table(bosses.filter(b => b.isMain).map(b => {
  const level = Math.min(10, b.region + 2);
  const effectiveness = b.weaknessWeaponId === 'axe' ? 2 : b.resistanceWeaponId === 'axe' ? .5 : 1;
  const damage = api.weaponHitDamage({ weaponId: 'axe', rarity: 'common', level, stars: 0 }, 1, 1, effectiveness);
  return { region: b.region, boss: b.id, hp: b.maxHealth, commonAxeLevel: level, continuousAttackSeconds: +(b.maxHealth / (damage * 1000 / api.WEAPON_DEFINITIONS.axe.cooldownMs)).toFixed(1) };
}));
console.log('Campaign audit: PASS — 23 ordered gates, side-boss rejection, finale, reload idempotence, accessible mandatory costs and capped upgrades. Combat and travel remain manual checks.');
