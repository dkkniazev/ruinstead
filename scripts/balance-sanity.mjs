import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Bundle the production TypeScript formulas so this check cannot drift into a
// second copy of the balance constants.
const source = `
  export { ENCOUNTER_BASE, REGION_COMBAT_BALANCE } from './src/game/combat/RegionBalance.ts';
  export { DAMAGE_EFFECTIVENESS } from './src/game/combat/StageCombatProfile.ts';
  export { getWeaponDamageMultiplier } from './src/game/progression/WeaponInventory.ts';
  export { WEAPON_DEFINITIONS } from './src/game/combat/WeaponDefinitions.ts';
`;
const result = await build({
  stdin: { contents: source, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const balance = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const { ENCOUNTER_BASE, REGION_COMBAT_BALANCE, DAMAGE_EFFECTIVENESS,
  getWeaponDamageMultiplier, WEAPON_DEFINITIONS } = balance;

function dps(level, rarity, stars, effectiveness) {
  const weapon = WEAPON_DEFINITIONS.daggers;
  return weapon.damage * getWeaponDamageMultiplier(level, rarity, stars)
    * DAMAGE_EFFECTIVENESS[effectiveness] * 1000 / weapon.cooldownMs;
}

const early = dps(3, 'uncommon', 0, 'neutral');
const current = dps(7, 'rare', 2, 'weakness');
const strong = dps(9, 'epic', 3, 'weakness');
const rows = [5, 6].map((region) => {
  const normalHealth = ENCOUNTER_BASE.enemyHealth * REGION_COMBAT_BALANCE[region].enemyHealth;
  const bossHealth = ENCOUNTER_BASE.bossHealth * REGION_COMBAT_BALANCE[region].bossHealth;
  return {
    region,
    undergearedSeconds: +(normalHealth / early).toFixed(1),
    currentSeconds: +(normalHealth / current).toFixed(1),
    strongSeconds: +(normalHealth / strong).toFixed(1),
    undergearedBossSeconds: +(bossHealth / early).toFixed(1),
    currentBossSeconds: +(bossHealth / current).toFixed(1),
  };
});

for (const row of rows) {
  assert(row.undergearedSeconds >= row.currentSeconds * 3, `R${row.region}: early weapon too efficient`);
  assert(row.undergearedBossSeconds >= 20, `R${row.region}: early boss kill too quick`);
  assert(row.currentSeconds <= 4, `R${row.region}: current weapon too slow`);
  assert(row.currentBossSeconds <= 25, `R${row.region}: current boss too slow`);
  assert(row.strongSeconds < row.currentSeconds, `R${row.region}: upgraded build has no advantage`);
}

console.table(rows);
console.log('Balance sanity: PASS');
