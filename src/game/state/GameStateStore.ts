import { queueYandexCloudSave } from '../../platform/yandex/YandexCloudSave';
import {
  SAVE_SCHEMA_VERSION,
  createDefaultGameState,
  type BuildingId,
  type GameState,
} from './GameState';
import {
  MAX_PLAYER_UPGRADE_LEVEL,
} from '../progression/UpgradeBalance';
import type {
  WeaponId,
} from '../combat/WeaponDefinitions';
import {
  MAX_WEAPON_LEVEL,
  normalizeWeaponInventoryForCurrentProgression,
  sanitizeWeaponInventory,
} from '../progression/WeaponInventory';
import {
  LOCAL_SAVE_KEY,
  LOCAL_SAVE_META_KEY,
} from './SaveKeys';

const BUILDING_IDS: BuildingId[] = [
  'forge',
  'storage',
  'sawmill',
  'workshop',
  'house',
  'infirmary',
  'gate',
  'bridge',
];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonNegativeInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function upgradeLevel(
  value: unknown,
  fallback: number,
  maxLevel: number,
): number {
  return Math.min(
    maxLevel,
    nonNegativeInt(
      value,
      fallback,
    ),
  );
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0
    ? value
    : fallback;
}

function nullableString(
  value: unknown,
  fallback: string | null,
): string | null {
  return value === null || typeof value === 'string'
    ? value
    : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];

  return value.filter(
    (entry): entry is string => typeof entry === 'string',
  );
}

function numberArrayRecord(
  value: unknown,
): Record<string, number[]> {
  const record =
    asRecord(value);

  if (!record) {
    return {};
  }

  const result:
    Record<string, number[]> = {};

  for (
    const [key, entry]
    of Object.entries(record)
  ) {
    if (!Array.isArray(entry)) {
      continue;
    }

    result[key] =
      [
        ...new Set(
          entry
            .filter(
              (
                level,
              ): level is number =>
                typeof level ===
                  'number' &&
                Number.isFinite(
                  level,
                ) &&
                level >= 1 &&
                level <= 5,
            )
            .map(
              (level) =>
                Math.floor(
                  level,
                ),
            ),
        ),
      ].sort(
        (a, b) => a - b,
      );
  }

  return result;
}

function nonNegativeNumberRecord(
  value: unknown,
): Record<string, number> {
  const record =
    asRecord(value);

  if (!record) {
    return {};
  }

  const result:
    Record<string, number> = {};

  for (
    const [key, entry]
    of Object.entries(record)
  ) {
    if (
      typeof entry === 'number' &&
      Number.isFinite(entry) &&
      entry >= 0
    ) {
      result[key] =
        Math.floor(entry);
    }
  }

  return result;
}

function numberRecord(
  value: unknown,
): Record<string, number> {
  const record =
    asRecord(value);

  if (!record) {
    return {};
  }

  const result:
    Record<string, number> = {};

  for (
    const [key, entry]
    of Object.entries(record)
  ) {
    if (
      typeof entry === 'number' &&
      Number.isFinite(entry) &&
      entry > 0
    ) {
      result[key] =
        Math.floor(entry);
    }
  }

  return result;
}

export function sanitizeGameState(value: unknown): GameState {
  const defaults = createDefaultGameState();
  const root = asRecord(value);
  const player = asRecord(root?.player);
  const backpack = asRecord(root?.backpack);
  const consumables =
    asRecord(root?.consumables);
  const weaponLevels =
    asRecord(
      player?.weaponLevels,
    );
  let weaponInventory =
    sanitizeWeaponInventory(
      player?.weaponInventory,
      {
        axe:
          nonNegativeInt(
            weaponLevels?.axe,
            1,
          ),
        sword:
          nonNegativeInt(
            weaponLevels?.sword,
            1,
          ),
        hammer:
          nonNegativeInt(
            weaponLevels?.hammer,
            1,
          ),
        spear:
          nonNegativeInt(
            weaponLevels?.spear,
            1,
          ),
        daggers:
          nonNegativeInt(
            weaponLevels?.daggers,
            1,
          ),
      },
      stringArray(
        player?.unlockedWeaponIds,
        defaults.player
          .unlockedWeaponIds,
      ),
    );
  const settlement = asRecord(root?.settlement);
  const savedBuildings = asRecord(settlement?.buildings);
  const savedRepairStages =
    asRecord(
      settlement?.repairStages,
    );
  const settlementProduction =
    asRecord(
      settlement?.production,
    );
  const pendingProduction =
    asRecord(
      settlementProduction
        ?.pending,
    );
  const world = asRecord(root?.world);
  const defeatedBosses =
    stringArray(
      world?.defeatedBosses,
      defaults.world
        .defeatedBosses,
    );
  const unlockedZones =
    stringArray(
      world?.unlockedZones,
      defaults.world
        .unlockedZones,
    );
  const sourceSchemaVersion =
    nonNegativeInt(
      root?.schemaVersion,
      0,
    );

  const progressionWeaponIds:
    WeaponId[] = ['axe'];

  if (
    defeatedBosses.includes(
      'root-colossus',
    ) ||
    defeatedBosses.includes(
      'sun-tyrant',
    )
  ) {
    progressionWeaponIds.push(
      'daggers',
    );
  }

  if (
    defeatedBosses.includes(
      'sun-tyrant',
    )
  ) {
    progressionWeaponIds.push(
      'hammer',
    );
  }

  if (
    sourceSchemaVersion < 15
  ) {
    weaponInventory =
      normalizeWeaponInventoryForCurrentProgression(
        weaponInventory,
        progressionWeaponIds,
      );
  }

  const normalizedUnlockedWeaponIds =
    sourceSchemaVersion < 15
      ? progressionWeaponIds
      : stringArray(
          player
            ?.unlockedWeaponIds,
          defaults.player
            .unlockedWeaponIds,
        );

  const requestedWeaponId =
    player?.weaponId ===
      'starter-blade'
      ? 'axe'
      : stringValue(
          player?.weaponId,
          defaults.player
            .weaponId,
        );

  const normalizedWeaponId =
    normalizedUnlockedWeaponIds
      .includes(
        requestedWeaponId,
      )
      ? requestedWeaponId
      : normalizedUnlockedWeaponIds[
          normalizedUnlockedWeaponIds
            .length - 1
        ] ?? 'axe';

  const resources = asRecord(root?.resources);
  const progression = asRecord(root?.progression);
  const masteryRanks =
    asRecord(
      progression?.masteryRanks,
    );
  const premium =
    asRecord(root?.premium);
  const skinFragments =
    asRecord(
      premium?.skinFragments,
    );
  const freeSkinChests =
    asRecord(
      premium?.freeSkinChests,
    );
  const monetization =
    asRecord(root?.monetization);
  const activeBlessing =
    asRecord(
      monetization
        ?.activeBlessing,
    );
  const quests = asRecord(root?.quests);
  const bestiary =
    asRecord(root?.bestiary);
  const settings = asRecord(root?.settings);

  const playerPosition =
    asRecord(
      world?.playerPosition,
    );

  const positionX =
    typeof playerPosition?.x ===
        'number' &&
      Number.isFinite(
        playerPosition.x,
      )
      ? playerPosition.x
      : undefined;
  const positionY =
    typeof playerPosition?.y ===
        'number' &&
      Number.isFinite(
        playerPosition.y,
      )
      ? playerPosition.y
      : undefined;

  const normalizedPlayerPosition =
    positionX !== undefined &&
    positionY !== undefined
      ? sourceSchemaVersion < 22
        ? positionX >= 5600 &&
          unlockedZones.includes(
            'stage-3',
          )
          ? {
              x: 1900,
              y: 2350,
            }
          : positionX >= 2980 &&
              unlockedZones.includes(
                'stage-2',
              )
            ? {
                x: 2170,
                y: 3930,
              }
            : {
                x: 3650,
                y: 4560,
              }
        : {
            x: positionX,
            y: positionY,
          }
      : null;

  const buildings = {
    ...defaults.settlement.buildings,
  };
  const repairStages = {
    ...defaults.settlement
      .repairStages,
  };

  for (const id of BUILDING_IDS) {
    buildings[id] = nonNegativeInt(
      savedBuildings?.[id],
      defaults.settlement.buildings[id],
    );

    repairStages[id] =
      Math.min(
        3,
        nonNegativeInt(
          savedRepairStages?.[id],
          buildings[id] > 0
            ? 3
            : defaults.settlement
                .repairStages[id],
        ),
      );
  }

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: nonNegativeInt(root?.savedAt, defaults.savedAt),
    player: {
      weaponId:
        normalizedWeaponId,
      unlockedWeaponIds:
        normalizedUnlockedWeaponIds,
      maxHealthLevel: upgradeLevel(
        player?.maxHealthLevel,
        defaults.player.maxHealthLevel,
        MAX_PLAYER_UPGRADE_LEVEL,
      ),
      damageLevel: upgradeLevel(
        player?.damageLevel,
        defaults.player.damageLevel,
        MAX_PLAYER_UPGRADE_LEVEL,
      ),
      moveSpeedLevel: upgradeLevel(
        player?.moveSpeedLevel,
        defaults.player.moveSpeedLevel,
        MAX_PLAYER_UPGRADE_LEVEL,
      ),
      backpackLevel: upgradeLevel(
        player?.backpackLevel,
        defaults.player.backpackLevel,
        MAX_PLAYER_UPGRADE_LEVEL,
      ),
      dashLevel: upgradeLevel(
        player?.dashLevel,
        defaults.player.dashLevel,
        MAX_PLAYER_UPGRADE_LEVEL,
      ),
      weaponLevels: {
        axe: upgradeLevel(
          weaponLevels?.axe,
          defaults.player.weaponLevels.axe,
          MAX_WEAPON_LEVEL,
        ),
        sword: upgradeLevel(
          weaponLevels?.sword,
          defaults.player.weaponLevels.sword,
          MAX_WEAPON_LEVEL,
        ),
        hammer: upgradeLevel(
          weaponLevels?.hammer,
          defaults.player.weaponLevels.hammer,
          MAX_WEAPON_LEVEL,
        ),
        spear: upgradeLevel(
          weaponLevels?.spear,
          defaults.player.weaponLevels.spear,
          MAX_WEAPON_LEVEL,
        ),
        daggers: upgradeLevel(
          weaponLevels?.daggers,
          defaults.player.weaponLevels.daggers,
          MAX_WEAPON_LEVEL,
        ),
      },
      weaponInventory,
    },
    backpack: {
      wood: nonNegativeInt(
        backpack?.wood,
        defaults.backpack.wood,
      ),
      stone: nonNegativeInt(
        backpack?.stone,
        defaults.backpack.stone,
      ),
      metal: nonNegativeInt(
        backpack?.metal,
        defaults.backpack.metal,
      ),
      crystal:
        nonNegativeInt(
          backpack?.crystal,
          defaults.backpack.crystal,
        ),
      fiber:
        nonNegativeInt(
          backpack?.fiber,
          defaults.backpack.fiber,
        ),
      coins: nonNegativeInt(
        backpack?.coins,
        defaults.backpack.coins,
      ),
    },
    consumables: {
      healthPotions:
        Math.min(
          3,
          nonNegativeInt(
            consumables
              ?.healthPotions,
            defaults.consumables
              .healthPotions,
          ),
        ),
      returnTickets:
        nonNegativeInt(
          consumables
            ?.returnTickets,
          defaults.consumables
            .returnTickets,
        ),
    },
    settlement: {
      level: nonNegativeInt(
        settlement?.level,
        defaults.settlement.level,
      ),
      buildings,
      repairStages,
      production: {
        lastTickAt:
          nonNegativeInt(
            settlementProduction
              ?.lastTickAt,
            defaults.settlement
              .production
              .lastTickAt,
          ),
        pending: {
          wood:
            nonNegativeInt(
              pendingProduction
                ?.wood,
              defaults.settlement
                .production
                .pending.wood,
            ),
          stone:
            nonNegativeInt(
              pendingProduction
                ?.stone,
              defaults.settlement
                .production
                .pending.stone,
            ),
          metal:
            nonNegativeInt(
              pendingProduction
                ?.metal,
              defaults.settlement
                .production
                .pending.metal,
            ),
          coins:
            nonNegativeInt(
              pendingProduction
                ?.coins,
              defaults.settlement
                .production
                .pending.coins,
            ),
        },
      },
    },
    world: {
      unlockedZones,
      defeatedBosses,
      bossRespawnAt: numberRecord(
        world?.bossRespawnAt,
      ),
      discoveredLandmarks:
        stringArray(
          world?.discoveredLandmarks,
          defaults.world
            .discoveredLandmarks,
        ),
      uniqueRewards:
        stringArray(
          world?.uniqueRewards,
          defaults.world
            .uniqueRewards,
        ),
      openedChests:
        stringArray(
          world?.openedChests,
          defaults.world
            .openedChests,
        ),
      playerPosition:
        normalizedPlayerPosition,
    },
    resources: {
      wood: nonNegativeInt(
        resources?.wood,
        defaults.resources.wood,
      ),
      stone: nonNegativeInt(
        resources?.stone,
        defaults.resources.stone,
      ),
      metal: nonNegativeInt(
        resources?.metal,
        defaults.resources.metal,
      ),
      crystal:
        nonNegativeInt(
          resources?.crystal,
          defaults.resources.crystal,
        ),
      fiber:
        nonNegativeInt(
          resources?.fiber,
          defaults.resources.fiber,
        ),
      coins: nonNegativeInt(
        resources?.coins,
        defaults.resources.coins,
      ),
    },
    progression: {
      settlementXp: nonNegativeInt(
        progression?.settlementXp,
        defaults.progression.settlementXp,
      ),
      settlementReturnCount:
        nonNegativeInt(
          progression
            ?.settlementReturnCount ??
            progression
              ?.expeditionCount,
          defaults.progression
            .settlementReturnCount,
        ),
      playerLevel:
        Math.max(
          1,
          Math.min(
            50,
            nonNegativeInt(
              progression
                ?.playerLevel,
              defaults.progression
                .playerLevel,
            ),
          ),
        ),
      playerXp:
        nonNegativeInt(
          progression?.playerXp,
          defaults.progression
            .playerXp,
        ),
      masteryRanks: {
        combat:
          Math.min(
            5,
            nonNegativeInt(
              masteryRanks?.combat,
              0,
            ),
          ),
        vitality:
          Math.min(
            5,
            nonNegativeInt(
              masteryRanks?.vitality,
              0,
            ),
          ),
        mobility:
          Math.min(
            5,
            nonNegativeInt(
              masteryRanks?.mobility,
              0,
            ),
          ),
        gathering:
          Math.min(
            5,
            nonNegativeInt(
              masteryRanks?.gathering,
              0,
            ),
          ),
        settlement:
          Math.min(
            5,
            nonNegativeInt(
              masteryRanks
                ?.settlement,
              0,
            ),
          ),
      },
      claimedLevelMilestones:
        Array.isArray(
          progression
            ?.claimedLevelMilestones,
        )
          ? progression
              .claimedLevelMilestones
              .filter(
                (
                  value,
                ): value is number =>
                  typeof value ===
                    'number' &&
                  Number.isFinite(
                    value,
                  ),
              )
              .map((value) =>
                Math.floor(value),
              )
          : [],
    },
    premium: {
      gems:
        nonNegativeInt(
          premium?.gems,
          defaults.premium.gems,
        ),
      skinFragments:
        nonNegativeNumberRecord(
          skinFragments,
        ),
      unlockedSkinIds:
        stringArray(
          premium
            ?.unlockedSkinIds,
          defaults.premium
            .unlockedSkinIds,
        ),
      equippedSkinId:
        nullableString(
          premium
            ?.equippedSkinId,
          defaults.premium
            .equippedSkinId,
        ),
      freeSkinChests: {
        common:
          nonNegativeInt(
            freeSkinChests
              ?.common,
            0,
          ),
        rare:
          nonNegativeInt(
            freeSkinChests
              ?.rare,
            0,
          ),
        epic:
          nonNegativeInt(
            freeSkinChests
              ?.epic,
            0,
          ),
      },
      epicChestPity:
        nonNegativeInt(
          premium
            ?.epicChestPity,
          0,
        ),
      rewardedCommonChestDay:
        typeof premium
          ?.rewardedCommonChestDay ===
          'string'
          ? premium
              .rewardedCommonChestDay
          : '',
      rewardedCommonChestCount:
        nonNegativeInt(
          premium
            ?.rewardedCommonChestCount,
          0,
        ),
      achievements:
        stringArray(
          premium?.achievements,
          [],
        ),
      levelPassOwned:
        booleanValue(
          premium
            ?.levelPassOwned,
          false,
        ),
      levelPassClaimedLevels:
        Array.isArray(
          premium
            ?.levelPassClaimedLevels,
        )
          ? premium
              .levelPassClaimedLevels
              .filter(
                (
                  value,
                ): value is number =>
                  typeof value ===
                    'number' &&
                  Number.isFinite(
                    value,
                  ),
              )
              .map((value) =>
                Math.floor(value),
              )
          : [],
      starterPackOwned:
        booleanValue(
          premium
            ?.starterPackOwned,
          false,
        ),
      founderPackOwned:
        booleanValue(
          premium
            ?.founderPackOwned,
          false,
        ),
      shardShopDay:
        typeof premium
          ?.shardShopDay ===
          'string'
          ? premium.shardShopDay
          : '',
      shardShopPurchasedSlots:
        Array.isArray(
          premium
            ?.shardShopPurchasedSlots,
        )
          ? Array.from(
              new Set(
                premium
                  .shardShopPurchasedSlots
                  .filter(
                    (
                      value,
                    ): value is number =>
                      typeof value ===
                        'number' &&
                      Number.isFinite(
                        value,
                      ) &&
                      value >= 0 &&
                      value < 3,
                  )
                  .map((value) =>
                    Math.floor(value),
                  ),
              ),
            )
          : [],
      regionPacksOwned:
        stringArray(
          premium
            ?.regionPacksOwned,
          [],
        ),
      ownedSettlementThemes:
        Array.from(
          new Set([
            'default',
            ...stringArray(
              premium
                ?.ownedSettlementThemes,
              [],
            ),
          ]),
        ),
      equippedSettlementTheme:
        typeof premium
          ?.equippedSettlementTheme ===
          'string'
          ? premium
              .equippedSettlementTheme
          : 'default',
      ownedPets:
        stringArray(
          premium?.ownedPets,
          [],
        ),
      equippedPet:
        nullableString(
          premium
            ?.equippedPet,
          null,
        ),
    },
    monetization: {
      activeBlessing:
        activeBlessing &&
        (
          activeBlessing.kind ===
            'damage' ||
          activeBlessing.kind ===
            'health' ||
          activeBlessing.kind ===
            'speed' ||
          activeBlessing.kind ===
            'gathering'
        ) &&
        nonNegativeInt(
          activeBlessing.expiresAt,
          0,
        ) > Date.now()
          ? {
              kind:
                activeBlessing.kind,
              expiresAt:
                nonNegativeInt(
                  activeBlessing
                    .expiresAt,
                  0,
                ),
            }
          : null,
      lastBossRespawnAdAt:
        nonNegativeInt(
          monetization
            ?.lastBossRespawnAdAt,
          defaults.monetization
            .lastBossRespawnAdAt,
        ),
      lastSupplyAdAt:
        nonNegativeInt(
          monetization
            ?.lastSupplyAdAt,
          defaults.monetization
            .lastSupplyAdAt,
        ),
      adFreeUntil:
        nonNegativeInt(
          monetization
            ?.adFreeUntil,
          defaults.monetization
            .adFreeUntil,
        ),
      grantedPurchaseTokens:
        stringArray(
          monetization
            ?.grantedPurchaseTokens,
          defaults.monetization
            .grantedPurchaseTokens,
        ),
    },
    quests: {
      activeId: nullableString(
        quests?.activeId,
        defaults.quests.activeId,
      ),
      completedIds: stringArray(
        quests?.completedIds,
        defaults.quests.completedIds,
      ),
    },
    bestiary: {
      discoveredSpecies:
        stringArray(
          bestiary
            ?.discoveredSpecies,
          defaults.bestiary
            .discoveredSpecies,
        ),
      discoveredElites:
        stringArray(
          bestiary
            ?.discoveredElites,
          defaults.bestiary
            .discoveredElites,
        ),
      discoveredBosses:
        stringArray(
          bestiary
            ?.discoveredBosses,
          defaults.bestiary
            .discoveredBosses,
        ),
      speciesKills:
        numberRecord(
          bestiary
            ?.speciesKills,
        ),
      eliteKills:
        numberRecord(
          bestiary
            ?.eliteKills,
        ),
      bossKills:
        numberRecord(
          bestiary
            ?.bossKills,
        ),
      claimedLevels:
        numberArrayRecord(
          bestiary
            ?.claimedLevels,
        ),
    },
    settings: {
      soundEnabled: booleanValue(
        settings?.soundEnabled,
        defaults.settings.soundEnabled,
      ),
      musicEnabled: booleanValue(
        settings?.musicEnabled,
        defaults.settings.musicEnabled,
      ),
    },
  };
}

export class GameStateStore {
  load(): GameState {
    try {
      const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);

      if (!raw) {
        return createDefaultGameState();
      }

      return sanitizeGameState(JSON.parse(raw));
    } catch (error) {
      console.warn(
        'Ruinstead local save could not be loaded.',
        error,
      );
      return createDefaultGameState();
    }
  }

  save(state: GameState): GameState {
    const next: GameState = {
      ...state,
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
    };

    try {
      window.localStorage.setItem(
        LOCAL_SAVE_KEY,
        JSON.stringify(next),
      );
      window.localStorage.setItem(
        LOCAL_SAVE_META_KEY,
        JSON.stringify({
          savedAt: next.savedAt,
          version: next.schemaVersion,
        }),
      );
    } catch (error) {
      console.warn(
        'Ruinstead local save could not be written.',
        error,
      );
    }

    queueYandexCloudSave(next);
    return next;
  }
}
