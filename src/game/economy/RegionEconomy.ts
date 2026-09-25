import type {
  ResourceType,
} from '../gathering/ResourceTypes';

export type RegionNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8;

export type HarvestResourceType =
  Exclude<
    ResourceType,
    'coins'
  >;

export type ResourceAbundance =
  0 | 1 | 2 | 3 | 4 | 5;

/**
 * Economy invariant:
 * a resource must exist in the world no later than
 * the first mandatory progression cost that needs it.
 *
 * Region 1 therefore always contains wood, stone and metal.
 * Crystal and fiber are introduced at the entrance to region 2,
 * before any mandatory fight there.
 */
export const RESOURCE_FIRST_AVAILABLE_REGION:
  Record<
    HarvestResourceType,
    RegionNumber
  > = {
  wood: 1,
  stone: 1,
  metal: 1,
  crystal: 2,
  fiber: 2,
};

export type RegionResourceProfile = {
  region: RegionNumber;
  abundance:
    Record<
      HarvestResourceType,
      ResourceAbundance
    >;
};

/**
 * 0 = absent, 1 = very scarce, 5 = dominant.
 * These values are placement weights for the prototype map,
 * not direct drop multipliers.
 *
 * No later region introduces a new mandatory crafting currency.
 * Instead, regions change which existing materials are efficient
 * to farm.
 */
export const REGION_RESOURCE_PROFILES:
  readonly RegionResourceProfile[] = [
  {
    region: 1,
    abundance: {
      wood: 5,
      stone: 4,
      metal: 2,
      crystal: 0,
      fiber: 0,
    },
  },
  {
    region: 2,
    abundance: {
      wood: 5,
      stone: 3,
      metal: 2,
      crystal: 2,
      fiber: 5,
    },
  },
  {
    region: 3,
    abundance: {
      wood: 2,
      stone: 4,
      metal: 5,
      crystal: 2,
      fiber: 3,
    },
  },
  {
    region: 4,
    abundance: {
      wood: 1,
      stone: 3,
      metal: 4,
      crystal: 5,
      fiber: 2,
    },
  },
  {
    region: 5,
    abundance: {
      wood: 3,
      stone: 5,
      metal: 4,
      crystal: 2,
      fiber: 3,
    },
  },
  {
    region: 6,
    abundance: {
      wood: 2,
      stone: 3,
      metal: 4,
      crystal: 5,
      fiber: 4,
    },
  },
  {
    region: 7,
    abundance: {
      wood: 2,
      stone: 5,
      metal: 5,
      crystal: 2,
      fiber: 4,
    },
  },
  {
    region: 8,
    abundance: {
      wood: 1,
      stone: 3,
      metal: 5,
      crystal: 5,
      fiber: 3,
    },
  },
] as const;

export function getRegionResourceProfile(
  region: RegionNumber,
): RegionResourceProfile {
  return (
    REGION_RESOURCE_PROFILES.find(
      (entry) =>
        entry.region === region,
    ) ??
    REGION_RESOURCE_PROFILES[0]
  );
}
