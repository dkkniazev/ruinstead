export type SkinRarityId =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type SkinBonusStat =
  | 'damage'
  | 'max-health'
  | 'move-speed'
  | 'gathering'
  | 'production';

export type SkinChestTier =
  | 'common'
  | 'rare'
  | 'epic';

export const SKIN_RARITIES:
  Record<
    SkinRarityId,
    {
      statBonus: number;
      fragmentsToUnlock:
        number | null;
      directPurchaseOnly: boolean;
    }
  > = {
  common: {
    statBonus: 0.05,
    fragmentsToUnlock: 30,
    directPurchaseOnly: false,
  },
  uncommon: {
    statBonus: 0.10,
    fragmentsToUnlock: 50,
    directPurchaseOnly: false,
  },
  rare: {
    statBonus: 0.15,
    fragmentsToUnlock: 80,
    directPurchaseOnly: false,
  },
  epic: {
    statBonus: 0.20,
    fragmentsToUnlock: 120,
    directPurchaseOnly: false,
  },
  legendary: {
    statBonus: 0.25,
    fragmentsToUnlock: null,
    directPurchaseOnly: true,
  },
};

export const SKIN_CHESTS = {
  common: {
    gemCost: 40,
    rewardedDailyLimit: 3,
    rarityWeights: {
      common: 75,
      uncommon: 25,
      rare: 0,
      epic: 0,
    },
  },
  rare: {
    gemCost: 160,
    rewardedDailyLimit: 0,
    rarityWeights: {
      common: 45,
      uncommon: 40,
      rare: 15,
      epic: 0,
    },
  },
  epic: {
    gemCost: 480,
    rewardedDailyLimit: 0,
    rarityWeights: {
      common: 30,
      uncommon: 35,
      rare: 25,
      epic: 10,
    },
  },
} as const satisfies
  Record<
    SkinChestTier,
    {
      gemCost: number;
      rewardedDailyLimit: number;
      rarityWeights: Record<
        Exclude<
          SkinRarityId,
          'legendary'
        >,
        number
      >;
    }
  >;

export const PREMIUM_ECONOMY_CONFIG = {
  currencyId: 'gems',
  levelReward: 5,
  sideBossFirstClearReward: 10,
  mainBossFirstClearReward: 20,
  regionUnlockReward: 25,
  achievementRewardRange: {
    min: 5,
    max: 25,
  },
  epicChestPity: 5,
  equippedSkinOnly:
    true,
} as const;
