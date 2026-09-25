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

export type SkinSource =
  | 'chest'
  | 'legendary-direct'
  | 'starter-pack'
  | 'level-pass'
  | 'region-pack'
  | 'founder-pack';

export type SkinDefinition = {
  name: string;
  rarity: SkinRarityId;
  bonusStat: SkinBonusStat;
  tint: number;
  source: SkinSource;
  productId?: string;
};

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
    fragmentsToUnlock: 30,
    directPurchaseOnly: false,
  },
  rare: {
    statBonus: 0.15,
    fragmentsToUnlock: 30,
    directPurchaseOnly: false,
  },
  epic: {
    statBonus: 0.20,
    fragmentsToUnlock: 30,
    directPurchaseOnly: false,
  },
  legendary: {
    statBonus: 0.25,
    fragmentsToUnlock: null,
    directPurchaseOnly: true,
  },
};

export const SKIN_DEFINITIONS = {
  'ember-initiate': {
    name: 'Ученик углей',
    rarity: 'common',
    bonusStat: 'damage',
    tint: 0xc98c62,
    source: 'chest',
  },
  'moss-guard': {
    name: 'Моховой страж',
    rarity: 'common',
    bonusStat: 'max-health',
    tint: 0x82a76a,
    source: 'chest',
  },
  'trail-scout': {
    name: 'Следопыт',
    rarity: 'common',
    bonusStat: 'move-speed',
    tint: 0x89a7b8,
    source: 'chest',
  },
  'wood-runner': {
    name: 'Лесной сборщик',
    rarity: 'common',
    bonusStat: 'gathering',
    tint: 0xa78b63,
    source: 'chest',
  },
  'village-hand': {
    name: 'Мастер поселения',
    rarity: 'common',
    bonusStat: 'production',
    tint: 0xb59a73,
    source: 'chest',
  },

  'bronze-raider': {
    name: 'Бронзовый налётчик',
    rarity: 'uncommon',
    bonusStat: 'damage',
    tint: 0xd27e4f,
    source: 'chest',
  },
  'iron-heart': {
    name: 'Железное сердце',
    rarity: 'uncommon',
    bonusStat: 'max-health',
    tint: 0x798897,
    source: 'chest',
  },
  'wind-stalker': {
    name: 'Идущий с ветром',
    rarity: 'uncommon',
    bonusStat: 'move-speed',
    tint: 0x75adc4,
    source: 'chest',
  },
  'deep-forager': {
    name: 'Глубинный добытчик',
    rarity: 'uncommon',
    bonusStat: 'gathering',
    tint: 0x8fab68,
    source: 'chest',
  },
  'craftsman': {
    name: 'Ремесленник',
    rarity: 'uncommon',
    bonusStat: 'production',
    tint: 0xc09c63,
    source: 'chest',
  },

  'crimson-duelist': {
    name: 'Багровый дуэлянт',
    rarity: 'rare',
    bonusStat: 'damage',
    tint: 0xc95561,
    source: 'chest',
  },
  'stone-bastion': {
    name: 'Каменный бастион',
    rarity: 'rare',
    bonusStat: 'max-health',
    tint: 0x6f7d85,
    source: 'chest',
  },
  'gale-runner': {
    name: 'Бегущий в буре',
    rarity: 'rare',
    bonusStat: 'move-speed',
    tint: 0x54a8c7,
    source: 'chest',
  },
  'golden-harvester': {
    name: 'Золотой добытчик',
    rarity: 'rare',
    bonusStat: 'gathering',
    tint: 0xc5a747,
    source: 'chest',
  },
  'guild-master': {
    name: 'Гильдейский мастер',
    rarity: 'rare',
    bonusStat: 'production',
    tint: 0x9f72b5,
    source: 'chest',
  },

  'void-blade': {
    name: 'Клинок пустоты',
    rarity: 'epic',
    bonusStat: 'damage',
    tint: 0x8256b8,
    source: 'chest',
  },
  'sun-warden': {
    name: 'Солнечный хранитель',
    rarity: 'epic',
    bonusStat: 'max-health',
    tint: 0xe0a84c,
    source: 'chest',
  },
  'storm-runner': {
    name: 'Штормовой бегун',
    rarity: 'epic',
    bonusStat: 'move-speed',
    tint: 0x5d73d4,
    source: 'chest',
  },
  'ancient-forager': {
    name: 'Древний собиратель',
    rarity: 'epic',
    bonusStat: 'gathering',
    tint: 0x558a65,
    source: 'chest',
  },
  'architect': {
    name: 'Архитектор руин',
    rarity: 'epic',
    bonusStat: 'production',
    tint: 0xb167a4,
    source: 'chest',
  },

  'phoenix-sovereign': {
    name: 'Владыка феникса',
    rarity: 'legendary',
    bonusStat: 'damage',
    tint: 0xff7551,
    source: 'legendary-direct',
    productId:
      'legendary_skin_phoenix',
  },
  'titan-warden': {
    name: 'Страж титанов',
    rarity: 'legendary',
    bonusStat: 'max-health',
    tint: 0x5d8ea6,
    source: 'legendary-direct',
    productId:
      'legendary_skin_titan',
  },
  'astral-runner': {
    name: 'Астральный бегун',
    rarity: 'legendary',
    bonusStat: 'move-speed',
    tint: 0x8d72e5,
    source: 'legendary-direct',
    productId:
      'legendary_skin_astral',
  },
  'worldroot-sage': {
    name: 'Мудрец мирового корня',
    rarity: 'legendary',
    bonusStat: 'gathering',
    tint: 0x54a96d,
    source: 'legendary-direct',
    productId:
      'legendary_skin_worldroot',
  },
  'ruin-king': {
    name: 'Король руин',
    rarity: 'legendary',
    bonusStat: 'production',
    tint: 0xd0a948,
    source: 'legendary-direct',
    productId:
      'legendary_skin_ruin_king',
  },

  'starter-warden': {
    name: 'Хранитель руин',
    rarity: 'rare',
    bonusStat: 'max-health',
    tint: 0x6fa28a,
    source: 'starter-pack',
  },
  'pass-champion': {
    name: 'Чемпион пути',
    rarity: 'epic',
    bonusStat: 'damage',
    tint: 0xb060d1,
    source: 'level-pass',
  },
  'ashborn': {
    name: 'Рождённый в пепле',
    rarity: 'epic',
    bonusStat: 'gathering',
    tint: 0xc8754d,
    source: 'region-pack',
  },
  'founder-keeper': {
    name: 'Хранитель основания',
    rarity: 'epic',
    bonusStat: 'production',
    tint: 0xd6b65f,
    source: 'founder-pack',
  },
} as const satisfies
  Record<string, SkinDefinition>;

export type SkinId =
  keyof typeof SKIN_DEFINITIONS;

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
  skinFragmentsPerDrop: 10,
  duplicateSkinGemCompensation: 5,
  levelReward: 5,
  sideBossFirstClearReward: 10,
  mainBossFirstClearReward: 20,
  regionUnlockReward: 25,
  achievementRewardRange: {
    min: 5,
    max: 25,
  },
  epicChestPity: 5,
  equippedSkinOnly: true,
} as const;

export function isSkinId(
  value: unknown,
): value is SkinId {
  return (
    typeof value === 'string' &&
    value in SKIN_DEFINITIONS
  );
}

export function getChestSkinIds(
  rarity:
    Exclude<
      SkinRarityId,
      'legendary'
    >,
): SkinId[] {
  return (
    Object.entries(
      SKIN_DEFINITIONS,
    ) as Array<
      [
        SkinId,
        (typeof SKIN_DEFINITIONS)[SkinId],
      ]
    >
  )
    .filter(
      ([, definition]) =>
        definition.source ===
          'chest' &&
        definition.rarity ===
          rarity,
    )
    .map(([id]) => id);
}
