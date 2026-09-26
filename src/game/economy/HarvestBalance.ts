import type { HarvestResourceType } from './RegionEconomy';

/** Rare materials come from expeditions; common materials also have village production. */
export function harvestYield(type: HarvestResourceType, region: number, abundance: number): number {
  if (type === 'crystal') return 8 + region * 2 + (abundance >= 5 ? 4 : 0);
  if (type === 'fiber') return 12 + region * 3 + (abundance >= 5 ? 6 : 0);
  return (type === 'wood' ? 4 : type === 'stone' ? 3 : 2) + (abundance >= 5 ? 1 : 0);
}

export function harvestRespawnMs(type: HarvestResourceType): number {
  return { wood: 45_000, stone: 60_000, metal: 90_000, crystal: 60_000, fiber: 40_000 }[type];
}
