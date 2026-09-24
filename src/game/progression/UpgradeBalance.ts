import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import type {
  WeaponId,
} from '../combat/WeaponDefinitions';
import {
  MAX_WEAPON_LEVEL,
} from './WeaponInventory';

export const MAX_PLAYER_UPGRADE_LEVEL = 10;

// Compatibility alias for older UI imports.
export const MAX_UPGRADE_LEVEL =
  MAX_PLAYER_UPGRADE_LEVEL;

export const PLAYER_UPGRADE_IDS = [
  'max-health',
  'move-speed',
  'backpack',
  'dash',
] as const;

export type PlayerUpgradeId =
  (typeof PLAYER_UPGRADE_IDS)[number];

const EMPTY_COST =
  (): ResourceCounts => ({
    wood: 0,
    stone: 0,
    metal: 0,
    crystal: 0,
    fiber: 0,
    coins: 0,
  });

function clampedLevel(
  level: number,
  maxLevel: number,
): number {
  return Math.min(
    maxLevel,
    Math.max(
      0,
      Math.floor(level),
    ),
  );
}

export function getMaxHealth(
  level: number,
): number {
  const safeLevel =
    clampedLevel(
      level,
      MAX_PLAYER_UPGRADE_LEVEL,
    );
  const early =
    Math.min(
      safeLevel,
      5,
    );
  const late =
    Math.max(
      0,
      safeLevel - 5,
    );

  return (
    100 +
    early * 20 +
    late * 30
  );
}

export function getMoveSpeed(
  level: number,
): number {
  const safeLevel =
    clampedLevel(
      level,
      MAX_PLAYER_UPGRADE_LEVEL,
    );
  const early =
    Math.min(
      safeLevel,
      5,
    );
  const late =
    Math.max(
      0,
      safeLevel - 5,
    );

  return Math.round(
    225 *
      (
        1 +
        early * 0.05 +
        late * 0.03
      ),
  );
}

export function getDashCooldownMs(
  level: number,
): number {
  const safeLevel =
    clampedLevel(
      level,
      MAX_PLAYER_UPGRADE_LEVEL,
    );
  const early =
    Math.min(
      safeLevel,
      5,
    );
  const late =
    Math.max(
      0,
      safeLevel - 5,
    );

  return Math.max(
    360,
    850 -
      early * 70 -
      late * 28,
  );
}

export function getBackpackCapacity(
  level: number,
): number {
  const safeLevel =
    clampedLevel(
      level,
      MAX_PLAYER_UPGRADE_LEVEL,
    );
  const early =
    Math.min(
      safeLevel,
      5,
    );
  const late =
    Math.max(
      0,
      safeLevel - 5,
    );

  return (
    100 +
    early * 25 +
    late * 35
  );
}

export function getPlayerUpgradeCost(
  id: PlayerUpgradeId,
  currentLevel: number,
): ResourceCounts | null {
  if (
    currentLevel >=
    MAX_PLAYER_UPGRADE_LEVEL
  ) {
    return null;
  }

  const next =
    currentLevel + 1;
  const cost =
    EMPTY_COST();

  if (next <= 5) {
    switch (id) {
      case 'max-health':
        cost.coins =
          20 + next * 12;
        cost.stone =
          next * 2;
        break;
      case 'move-speed':
        cost.coins =
          24 + next * 14;
        cost.wood =
          next * 3;
        break;
      case 'backpack':
        cost.coins =
          18 + next * 10;
        cost.wood =
          next * 4;
        break;
      case 'dash':
        cost.coins =
          28 + next * 16;
        cost.metal =
          Math.max(
            1,
            Math.ceil(next / 2),
          );
        break;
    }

    return cost;
  }

  const late =
    next - 6;

  switch (id) {
    case 'max-health':
      cost.coins =
        150 + late * 45;
      cost.stone =
        18 + late * 4;
      cost.crystal =
        6 + late * 3;
      cost.fiber =
        4 + late * 2;
      break;
    case 'move-speed':
      cost.coins =
        170 + late * 50;
      cost.wood =
        30 + late * 6;
      cost.crystal =
        8 + late * 3;
      cost.fiber =
        6 + late * 3;
      break;
    case 'backpack':
      cost.coins =
        140 + late * 40;
      cost.wood =
        36 + late * 8;
      cost.crystal =
        4 + late * 2;
      cost.fiber =
        12 + late * 4;
      break;
    case 'dash':
      cost.coins =
        190 + late * 55;
      cost.metal =
        10 + late * 3;
      cost.crystal =
        8 + late * 3;
      cost.fiber =
        8 + late * 3;
      break;
  }

  return cost;
}

export function getWeaponUpgradeCost(
  _weaponId: WeaponId,
  currentLevel: number,
): ResourceCounts | null {
  if (
    currentLevel >=
    MAX_WEAPON_LEVEL
  ) {
    return null;
  }

  const next =
    currentLevel + 1;

  if (next <= 5) {
    return {
      wood: 0,
      stone:
        Math.max(
          1,
          Math.floor(next / 2),
        ),
      metal:
        1 + next,
      crystal: 0,
      fiber: 0,
      coins:
        25 + next * 18,
    };
  }

  const late =
    next - 6;

  return {
    wood: 0,
    stone:
      12 +
      late * 2 +
      Math.floor(
        late / 2,
      ),
    metal:
      18 +
      late * 3 +
      Math.floor(
        late / 2,
      ),
    crystal:
      12 +
      late * 5 +
      Math.max(
        0,
        late - 2,
      ) * 2,
    fiber:
      18 +
      late * 6 +
      Math.max(
        0,
        late - 2,
      ),
    coins:
      300 +
      late * 65 +
      late * late * 10,
  };
}

export function canAffordUpgrade(
  storage: ResourceCounts,
  cost: ResourceCounts | null,
): boolean {
  return Boolean(
    cost &&
      storage.wood >= cost.wood &&
      storage.stone >= cost.stone &&
      storage.metal >= cost.metal &&
      (storage.crystal ?? 0) >=
        (cost.crystal ?? 0) &&
      (storage.fiber ?? 0) >=
        (cost.fiber ?? 0) &&
      storage.coins >= cost.coins,
  );
}

export function spendUpgradeCost(
  storage: ResourceCounts,
  cost: ResourceCounts,
): void {
  storage.wood -= cost.wood;
  storage.stone -= cost.stone;
  storage.metal -= cost.metal;
  storage.crystal =
    (storage.crystal ?? 0) -
    (cost.crystal ?? 0);
  storage.fiber =
    (storage.fiber ?? 0) -
    (cost.fiber ?? 0);
  storage.coins -= cost.coins;
}
