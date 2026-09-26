import type { HarvestResourceType } from './RegionEconomy';

/**
 * Rare materials stay rare by design. Abundance improves a node from 2 to 4
 * items; progression is balanced through costs rather than inflated drops.
 */
export function rareHarvestYield(abundance: number): number {
  const safe = Math.max(1, Math.min(5, Math.floor(abundance)));
  if (safe >= 5) return 4;
  if (safe >= 3) return 3;
  return 2;
}

/**
 * Abundance controls how many gathering points a region gets.
 * Keep this compact so richer zones create useful routes instead of carpets.
 */
const NODE_COUNT_BY_ABUNDANCE = [0, 2, 4, 5, 7, 9] as const;

export function harvestNodeCount(abundance: number): number {
  const safe = Math.max(0, Math.min(5, Math.floor(abundance)));
  return NODE_COUNT_BY_ABUNDANCE[safe];
}

export function harvestYield(type: HarvestResourceType, _region: number, abundance: number): number {
  if (type === 'crystal' || type === 'fiber') return rareHarvestYield(abundance);
  return (type === 'wood' ? 4 : type === 'stone' ? 3 : 2) + (abundance >= 5 ? 1 : 0);
}

export function harvestRespawnMs(type: HarvestResourceType): number {
  return { wood: 45_000, stone: 60_000, metal: 90_000, crystal: 60_000, fiber: 40_000 }[type];
}
