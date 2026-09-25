import type { RegionId } from '../world/ReleaseRegionMap';

export const ENCOUNTER_BASE = {
  enemyHealth: 92,
  enemyHealthPerSpecies: 14,
  enemyDamage: 9,
  enemyDamagePerSpecies: 1.5,
  bossHealth: 900,
  bossHealthPerIndex: 240,
  bossDamage: 18,
  bossDamagePerIndex: 3,
  eliteHealth: 2.4,
  eliteDamage: 1.45,
} as const;

/** Playtest knobs shared by ordinary encounters and bosses. */
export const REGION_COMBAT_BALANCE: Record<RegionId, {
  enemyHealth: number;
  bossHealth: number;
  damage: number;
}> = {
  1: { enemyHealth: 1, bossHealth: 1, damage: 1 },
  2: { enemyHealth: 1.45, bossHealth: 1.5, damage: 1.2 },
  3: { enemyHealth: 2.3, bossHealth: 2.35, damage: 1.42 },
  4: { enemyHealth: 3.5, bossHealth: 3.6, damage: 1.68 },
  5: { enemyHealth: 5.2, bossHealth: 5.4, damage: 1.95 },
  6: { enemyHealth: 7.4, bossHealth: 7.8, damage: 2.25 },
  7: { enemyHealth: 9.8, bossHealth: 10.4, damage: 2.55 },
  8: { enemyHealth: 12.5, bossHealth: 13.5, damage: 2.9 },
};
