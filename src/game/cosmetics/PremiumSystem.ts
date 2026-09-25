import type {
  GameState,
} from '../state/GameState';
import {
  PREMIUM_ECONOMY_CONFIG,
  SKIN_CHESTS,
  SKIN_DEFINITIONS,
  SKIN_RARITIES,
  getChestSkinIds,
  isSkinId,
  type SkinBonusStat,
  type SkinChestTier,
  type SkinId,
  type SkinRarityId,
} from './SkinEconomy';
import {
  GEM_PACKS,
  LEVEL_PASS,
  PETS,
  REGION_PACKS,
  SETTLEMENT_THEMES,
  STARTER_PACK,
  type PetId,
  type SettlementThemeId,
} from './PremiumStoreConfig';

export type SkinChestOpenMode =
  | 'gems'
  | 'rewarded'
  | 'free';

export type PremiumActionResult = {
  success: boolean;
  notice: string;
};

export type SkinChestOpenResult =
  PremiumActionResult & {
    skinId?: SkinId;
    rarity?: SkinRarityId;
    fragments?: number;
    unlocked?: boolean;
    gemCompensation?: number;
  };

export type EquippedSkinBonus = {
  skinId: SkinId | null;
  stat: SkinBonusStat | null;
  multiplier: number;
  tint: number | null;
};

function localDayKey(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(
      now.getMonth() + 1,
    ).padStart(2, '0'),
    String(
      now.getDate(),
    ).padStart(2, '0'),
  ].join('-');
}

export function resetDailyPremiumCounters(
  state: GameState,
): void {
  const today =
    localDayKey();

  if (
    state.premium
      .rewardedCommonChestDay ===
      today
  ) {
    return;
  }

  state.premium
    .rewardedCommonChestDay =
      today;
  state.premium
    .rewardedCommonChestCount = 0;
}

export function getRewardedCommonChestRemaining(
  state: GameState,
): number {
  resetDailyPremiumCounters(
    state,
  );

  return Math.max(
    0,
    SKIN_CHESTS.common
      .rewardedDailyLimit -
      state.premium
        .rewardedCommonChestCount,
  );
}

export function openSkinChest(
  state: GameState,
  tier: SkinChestTier,
  mode: SkinChestOpenMode,
  random = Math.random,
): SkinChestOpenResult {
  resetDailyPremiumCounters(
    state,
  );

  const config =
    SKIN_CHESTS[tier];

  if (mode === 'rewarded') {
    if (
      tier !== 'common' ||
      getRewardedCommonChestRemaining(
        state,
      ) <= 0
    ) {
      return {
        success: false,
        notice:
          'Рекламные открытия этого сундука сегодня недоступны',
      };
    }

    state.premium
      .rewardedCommonChestCount += 1;
  } else if (mode === 'free') {
    if (
      state.premium
        .freeSkinChests[
          tier
        ] <= 0
    ) {
      return {
        success: false,
        notice:
          'Нет бесплатного сундука этого типа',
      };
    }

    state.premium
      .freeSkinChests[
        tier
      ] -= 1;
  } else {
    if (
      state.premium.gems <
      config.gemCost
    ) {
      return {
        success: false,
        notice:
          'Не хватает самоцветов',
      };
    }

    state.premium.gems -=
      config.gemCost;
  }

  const rarity =
    rollChestRarity(
      state,
      tier,
      random,
    );
  const pool =
    getChestSkinIds(
      rarity,
    );

  if (pool.length <= 0) {
    return {
      success: false,
      notice:
        'Для этой редкости пока нет скинов',
    };
  }

  const locked =
    pool.filter(
      (id) =>
        !state.premium
          .unlockedSkinIds
          .includes(id),
    );
  const candidates =
    locked.length > 0
      ? locked
      : pool;
  const skinId =
    candidates[
      Math.min(
        candidates.length - 1,
        Math.floor(
          random() *
            candidates.length,
        ),
      )
    ];
  const definition =
    SKIN_DEFINITIONS[
      skinId
    ];

  if (
    state.premium
      .unlockedSkinIds
      .includes(skinId)
  ) {
    const compensation =
      PREMIUM_ECONOMY_CONFIG
        .duplicateSkinGemCompensation;
    state.premium.gems +=
      compensation;

    return {
      success: true,
      notice:
        `Дубликат: ${definition.name} · самоцветы +${compensation}`,
      skinId,
      rarity,
      fragments: 0,
      unlocked: true,
      gemCompensation:
        compensation,
    };
  }

  const fragments =
    PREMIUM_ECONOMY_CONFIG
      .skinFragmentsPerDrop;
  const previous =
    state.premium
      .skinFragments[
        skinId
      ] ?? 0;
  const next =
    previous + fragments;
  state.premium
    .skinFragments[
      skinId
    ] = next;

  const threshold =
    SKIN_RARITIES[
      rarity
    ].fragmentsToUnlock ??
    Number.POSITIVE_INFINITY;
  const unlocked =
    next >= threshold;

  if (unlocked) {
    unlockSkin(
      state,
      skinId,
    );
  }

  return {
    success: true,
    notice:
      unlocked
        ? `Скин открыт: ${definition.name} · ${formatRarity(rarity)}`
        : `${definition.name}: осколки +${fragments} (${next} / ${threshold})`,
    skinId,
    rarity,
    fragments,
    unlocked,
  };
}

function rollChestRarity(
  state: GameState,
  tier: SkinChestTier,
  random: () => number,
):
  Exclude<
    SkinRarityId,
    'legendary'
  > {
  if (
    tier === 'epic' &&
    state.premium
      .epicChestPity >=
      PREMIUM_ECONOMY_CONFIG
        .epicChestPity - 1
  ) {
    state.premium
      .epicChestPity = 0;
    return 'epic';
  }

  const weights =
    SKIN_CHESTS[tier]
      .rarityWeights;
  const roll =
    random() * 100;
  let cursor = 0;

  for (
    const rarity of
    [
      'common',
      'uncommon',
      'rare',
      'epic',
    ] as const
  ) {
    cursor += weights[rarity];

    if (roll < cursor) {
      if (tier === 'epic') {
        state.premium
          .epicChestPity =
            rarity === 'epic'
              ? 0
              : state.premium
                  .epicChestPity +
                1;
      }
      return rarity;
    }
  }

  if (tier === 'epic') {
    state.premium
      .epicChestPity += 1;
  }

  return 'common';
}

export function unlockSkin(
  state: GameState,
  skinId: SkinId,
): void {
  if (
    !state.premium
      .unlockedSkinIds
      .includes(skinId)
  ) {
    state.premium
      .unlockedSkinIds
      .push(skinId);
  }
}

export function equipSkin(
  state: GameState,
  skinId: string | null,
): PremiumActionResult {
  if (skinId === null) {
    state.premium
      .equippedSkinId = null;
    return {
      success: true,
      notice:
        'Базовый облик экипирован',
    };
  }

  if (
    !isSkinId(skinId) ||
    !state.premium
      .unlockedSkinIds
      .includes(skinId)
  ) {
    return {
      success: false,
      notice:
        'Этот скин ещё не открыт',
    };
  }

  state.premium
    .equippedSkinId =
      skinId;

  return {
    success: true,
    notice:
      `Экипирован: ${SKIN_DEFINITIONS[skinId].name}`,
  };
}

export function getEquippedSkinBonus(
  state: GameState,
): EquippedSkinBonus {
  const id =
    state.premium
      .equippedSkinId;

  if (
    !id ||
    !isSkinId(id) ||
    !state.premium
      .unlockedSkinIds
      .includes(id)
  ) {
    return {
      skinId: null,
      stat: null,
      multiplier: 1,
      tint: null,
    };
  }

  const definition =
    SKIN_DEFINITIONS[id];
  const bonus =
    SKIN_RARITIES[
      definition.rarity
    ].statBonus;

  return {
    skinId: id,
    stat:
      definition.bonusStat,
    multiplier:
      1 + bonus,
    tint:
      definition.tint,
  };
}

export function applyPremiumPurchase(
  state: GameState,
  productId: string,
): PremiumActionResult {
  if (
    productId in
      GEM_PACKS
  ) {
    const gems =
      GEM_PACKS[
        productId as
          keyof typeof GEM_PACKS
      ];
    state.premium.gems += gems;
    return {
      success: true,
      notice:
        `Самоцветы +${gems}`,
    };
  }

  if (
    productId ===
      STARTER_PACK.productId
  ) {
    if (
      state.premium
        .starterPackOwned
    ) {
      return {
        success: false,
        notice:
          'Стартовый набор уже получен',
      };
    }

    state.premium
      .starterPackOwned = true;
    state.premium.gems +=
      STARTER_PACK.gems;
    state.consumables
      .returnTickets +=
        STARTER_PACK
          .returnTickets;
    unlockSkin(
      state,
      STARTER_PACK.skinId,
    );

    return {
      success: true,
      notice:
        'Стартовый набор получен',
    };
  }

  if (
    productId ===
      LEVEL_PASS.productId
  ) {
    state.premium
      .levelPassOwned = true;
    claimLevelPassRewards(
      state,
    );
    return {
      success: true,
      notice:
        'Level Pass активирован · доступные награды начислены',
    };
  }

  if (
    productId in
      REGION_PACKS
  ) {
    const id =
      productId as
        keyof typeof REGION_PACKS;
    const pack =
      REGION_PACKS[id];

    if (
      state.premium
        .regionPacksOwned
        .includes(id)
    ) {
      return {
        success: false,
        notice:
          'Набор региона уже получен',
      };
    }

    if (
      !state.world
        .unlockedZones
        .includes(
          pack.zoneId,
        )
    ) {
      return {
        success: false,
        notice:
          'Сначала откройте этот регион',
      };
    }

    state.premium
      .regionPacksOwned
      .push(id);
    state.premium.gems +=
      pack.gems;
    state.consumables
      .returnTickets +=
        pack.returnTickets;
    state.resources.crystal +=
      pack.crystal;
    state.resources.fiber +=
      pack.fiber;
    unlockSkin(
      state,
      pack.skinId,
    );

    return {
      success: true,
      notice:
        'Набор региона получен',
    };
  }

  const legendary =
    (
      Object.entries(
        SKIN_DEFINITIONS,
      ) as Array<
        [
          SkinId,
          (typeof SKIN_DEFINITIONS)[SkinId],
        ]
      >
    ).find(
      ([, definition]) =>
        definition.source ===
          'legendary-direct' &&
        definition.productId ===
          productId,
    );

  if (legendary) {
    unlockSkin(
      state,
      legendary[0],
    );
    return {
      success: true,
      notice:
        `Legendary скин открыт: ${legendary[1].name}`,
    };
  }

  return {
    success: false,
    notice:
      'Неизвестный товар',
  };
}

export function claimLevelPassRewards(
  state: GameState,
): string[] {
  if (
    !state.premium
      .levelPassOwned
  ) {
    return [];
  }

  const notices:
    string[] = [];

  for (
    const reward of
    LEVEL_PASS.rewards
  ) {
    if (
      reward.level >
        state.progression
          .playerLevel ||
      state.premium
        .levelPassClaimedLevels
        .includes(
          reward.level,
        )
    ) {
      continue;
    }

    state.premium
      .levelPassClaimedLevels
      .push(
        reward.level,
      );

    if ('gems' in reward) {
      state.premium.gems +=
        reward.gems;
      notices.push(
        `Pass Lv.${reward.level}: +${reward.gems} самоцветов`,
      );
    } else if (
      'returnTickets' in reward
    ) {
      state.consumables
        .returnTickets +=
          reward.returnTickets;
      notices.push(
        `Pass Lv.${reward.level}: билеты ×${reward.returnTickets}`,
      );
    } else if (
      'chest' in reward
    ) {
      state.premium
        .freeSkinChests[
          reward.chest
        ] += 1;
      notices.push(
        `Pass Lv.${reward.level}: ${reward.chest} сундук`,
      );
    } else {
      unlockSkin(
        state,
        reward.skinId,
      );
      notices.push(
        `Pass Lv.${reward.level}: ${SKIN_DEFINITIONS[reward.skinId].name}`,
      );
    }
  }

  return notices;
}

export function buySettlementTheme(
  state: GameState,
  id: SettlementThemeId,
): PremiumActionResult {
  const definition =
    SETTLEMENT_THEMES[id];

  if (
    state.premium
      .ownedSettlementThemes
      .includes(id)
  ) {
    state.premium
      .equippedSettlementTheme =
        id;
    return {
      success: true,
      notice:
        `Тема поселения экипирована: ${definition.name}`,
    };
  }

  if (
    state.premium.gems <
      definition.gemCost
  ) {
    return {
      success: false,
      notice:
        'Не хватает самоцветов',
    };
  }

  state.premium.gems -=
    definition.gemCost;
  state.premium
    .ownedSettlementThemes
    .push(id);
  state.premium
    .equippedSettlementTheme =
      id;

  return {
    success: true,
    notice:
      `Тема поселения куплена: ${definition.name}`,
  };
}

export function buyPet(
  state: GameState,
  id: PetId,
): PremiumActionResult {
  const definition =
    PETS[id];

  if (
    state.premium
      .ownedPets
      .includes(id)
  ) {
    state.premium.equippedPet =
      id;
    return {
      success: true,
      notice:
        `Спутник выбран: ${definition.name}`,
    };
  }

  if (
    state.premium.gems <
      definition.gemCost
  ) {
    return {
      success: false,
      notice:
        'Не хватает самоцветов',
    };
  }

  state.premium.gems -=
    definition.gemCost;
  state.premium
    .ownedPets.push(id);
  state.premium.equippedPet =
    id;

  return {
    success: true,
    notice:
      `Спутник получен: ${definition.name}`,
  };
}

export function evaluateAchievements(
  state: GameState,
): string[] {
  const notices:
    string[] = [];
  const totalSpeciesKills =
    Object.values(
      state.bestiary
        .speciesKills,
    ).reduce(
      (sum, value) =>
        sum + value,
      0,
    ) +
    Object.values(
      state.bestiary
        .eliteKills,
    ).reduce(
      (sum, value) =>
        sum + value,
      0,
    );
  const totalClaims =
    Object.values(
      state.bestiary
        .claimedLevels,
    ).reduce(
      (sum, levels) =>
        sum + levels.length,
      0,
    );

  const definitions = [
    {
      id: 'first-hunt',
      reward: 5,
      complete:
        totalSpeciesKills >= 10,
      name:
        'Первая охота',
    },
    {
      id: 'boss-hunter',
      reward: 10,
      complete:
        state.world
          .defeatedBosses
          .length >= 3,
      name:
        'Охотник на боссов',
    },
    {
      id: 'explorer',
      reward: 10,
      complete:
        state.world
          .discoveredLandmarks
          .length >= 2,
      name:
        'Исследователь',
    },
    {
      id: 'builder',
      reward: 15,
      complete:
        state.settlement.level >=
          3,
      name:
        'Возрождение',
    },
    {
      id: 'scholar',
      reward: 20,
      complete:
        totalClaims >= 10,
      name:
        'Знаток мира',
    },
    {
      id: 'collector',
      reward: 25,
      complete:
        state.premium
          .unlockedSkinIds
          .length >= 5,
      name:
        'Коллекционер',
    },
  ] as const;

  for (
    const achievement of
    definitions
  ) {
    if (
      !achievement.complete ||
      state.premium
        .achievements
        .includes(
          achievement.id,
        )
    ) {
      continue;
    }

    state.premium
      .achievements
      .push(
        achievement.id,
      );
    state.premium.gems +=
      achievement.reward;
    notices.push(
      `Достижение «${achievement.name}» · +${achievement.reward} самоцветов`,
    );
  }

  return notices;
}

export function formatRarity(
  rarity: SkinRarityId,
): string {
  return {
    common: 'Обычный',
    uncommon: 'Необычный',
    rare: 'Редкий',
    epic: 'Эпический',
    legendary: 'Легендарный',
  }[rarity];
}
