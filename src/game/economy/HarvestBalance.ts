import type { HarvestResourceType } from './RegionEconomy';

export const RARE_HARVEST_YIELD = {
  crystal: 10,
  fiber: 12,
} as const;

/**
 * Abundance controls how many gathering points a region gets.
 * Keep this deliberately compact: resource identity should come from routes,
 * not from carpeting the whole region with nodes.
 */
const NODE_COUNT_BY_ABUNDANCE = [0, 2, 4, 5, 7, 9] as const;

export function harvestNodeCount(abundance: number): number {
  const safe = Math.max(0, Math.min(5, Math.floor(abundance)));
  return NODE_COUNT_BY_ABUNDANCE[safe];
}

/**
 * Rare-resource value is intentionally fixed per point. Region abundance
 * affects density only, so a rich region is better without creating 20-30
 * material jackpots from every single node.
 */
export function harvestYield(type: HarvestResourceType, _region: number, abundance: number): number {
  if (type === 'crystal') return RARE_HARVEST_YIELD.crystal;
  if (type === 'fiber') return RARE_HARVEST_YIELD.fiber;
  return (type === 'wood' ? 4 : type === 'stone' ? 3 : 2) + (abundance >= 5 ? 1 : 0);
}

export function harvestRespawnMs(type: HarvestResourceType): number {
  return { wood: 45_000, stone: 60_000, metal: 90_000, crystal: 60_000, fiber: 40_000 }[type];
}
