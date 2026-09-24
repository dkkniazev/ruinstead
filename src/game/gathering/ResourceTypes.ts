export const RESOURCE_TYPES = [
  'wood',
  'stone',
  'metal',
  'crystal',
  'fiber',
  'coins',
] as const;

export type ResourceType =
  (typeof RESOURCE_TYPES)[number];

export type ResourceCounts = {
  wood: number;
  stone: number;
  metal: number;
  coins: number;
  crystal?: number;
  fiber?: number;
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
  crystal: {
    id: 'crystal',
    name: 'Солнечный кристалл',
    shortName: 'Кр',
    weight: 1.5,
  },
  fiber: {
    id: 'fiber',
    name: 'Сухое волокно',
    shortName: 'В',
    weight: 0.5,
  },
  coins: {
    id: 'coins',
    name: 'Монеты',
    shortName: '₽',
    weight: 0.25,
  },
};

export function emptyResourceCounts():
  ResourceCounts {
  return {
    wood: 0,
    stone: 0,
    metal: 0,
    crystal: 0,
    fiber: 0,
    coins: 0,
  };
}

export function cloneResourceCounts(
  counts: ResourceCounts,
): ResourceCounts {
  return {
    wood: counts.wood,
    stone: counts.stone,
    metal: counts.metal,
    crystal:
      counts.crystal ?? 0,
    fiber:
      counts.fiber ?? 0,
    coins: counts.coins,
  };
}

export function totalResourceUnits(
  counts: ResourceCounts,
): number {
  return (
    counts.wood +
    counts.stone +
    counts.metal +
    (counts.crystal ?? 0) +
    (counts.fiber ?? 0) +
    counts.coins
  );
}
