import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import type {
  WeaponId,
} from '../combat/WeaponDefinitions';

export const MAX_UPGRADE_LEVEL = 5;

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

export function getMaxHealth(
  level: number,
): number {
  return (
    100 +
    Math.max(0, level) * 20
  );
}

export function getMoveSpeed(
  level: number,
): number {
  return Math.round(
    225 *
      (
        1 +
        Math.max(0, level) *
          0.05
      ),
  );
}

export function getDashCooldownMs(
  level: number,
): number {
  return Math.max(
    500,
    850 -
      Math.max(0, level) * 70,
  );
}

export function getBackpackCapacity(
  level: number,
): number {
  return (
    100 +
    Math.max(0, level) * 25
  );
}

export function getWeaponDamageMultiplier(
  level: number,
): number {
  return (
    1 +
    Math.max(0, level) * 0.15
  );
}

export function getPlayerUpgradeCost(
  id: PlayerUpgradeId,
  currentLevel: number,
): ResourceCounts | null {
  if (
    currentLevel >=
    MAX_UPGRADE_LEVEL
  ) {
    return null;
  }

  const next =
    currentLevel + 1;
  const cost =
    EMPTY_COST();

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

export function getWeaponUpgradeCost(
  _weaponId: WeaponId,
  currentLevel: number,
): ResourceCounts | null {
  if (
    currentLevel >=
    MAX_UPGRADE_LEVEL
  ) {
    return null;
  }

  const next =
    currentLevel + 1;

  return {
    wood: 0,
    stone:
      Math.max(
        1,
        Math.floor(next / 2),
      ),
    metal:
      1 + next,
    crystal:
      next >= 4
        ? next === 4
          ? 2
          : 4
        : 0,
    fiber:
      next >= 4
        ? next === 4
          ? 3
          : 6
        : 0,
    coins:
      25 + next * 18,
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
