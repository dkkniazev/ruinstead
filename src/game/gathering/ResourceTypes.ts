export const RESOURCE_TYPES = [
  'wood',
  'stone',
  'metal',
] as const;

export type ResourceType =
  (typeof RESOURCE_TYPES)[number];

export type ResourceCounts = {
  wood: number;
  stone: number;
  metal: number;
};

export type ResourceDefinition = {
  id: ResourceType;
  name: string;
  shortName: string;
  weight: number;
};

export const RESOURCE_DEFINITIONS:
  Record<
    ResourceType,
    ResourceDefinition
  > = {
  wood: {
    id: 'wood',
    name: 'Дерево',
    shortName: 'Д',
    weight: 1,
  },
  stone: {
    id: 'stone',
    name: 'Камень',
    shortName: 'К',
    weight: 1,
  },
  metal: {
    id: 'metal',
    name: 'Металл',
    shortName: 'М',
    weight: 2,
  },
};

export function emptyResourceCounts():
  ResourceCounts {
  return {
    wood: 0,
    stone: 0,
    metal: 0,
  };
}

export function cloneResourceCounts(
  counts: ResourceCounts,
): ResourceCounts {
  return {
    wood: counts.wood,
    stone: counts.stone,
    metal: counts.metal,
  };
}

export function totalResourceUnits(
  counts: ResourceCounts,
): number {
  return (
    counts.wood +
    counts.stone +
    counts.metal
  );
}
