import type {
  SkinId,
} from './SkinEconomy';

export const GEM_PACKS = {
  gems_80: 80,
  gems_250: 250,
  gems_650: 650,
  gems_1400: 1400,
} as const;

export type GemPackProductId =
  keyof typeof GEM_PACKS;

export const STARTER_PACK = {
  productId: 'starter_pack',
  gems: 120,
  returnTickets: 5,
  skinId:
    'starter-warden' as SkinId,
} as const;

export const LEVEL_PASS = {
  productId: 'level_pass',
  rewards: [
    { level: 5, gems: 20 },
    { level: 10, chest: 'common' },
    { level: 15, gems: 30 },
    { level: 20, chest: 'rare' },
    { level: 25, returnTickets: 2 },
    { level: 30, gems: 40 },
    { level: 35, chest: 'rare' },
    { level: 40, chest: 'epic' },
    { level: 45, gems: 60 },
    {
      level: 50,
      skinId:
        'pass-champion' as SkinId,
    },
  ],
} as const;

export const REGION_PACKS = {
  'region_pack_stage_2': {
    zoneId: 'stage-2',
    gems: 120,
    returnTickets: 3,
    crystal: 10,
    fiber: 20,
    skinId: 'ashborn' as SkinId,
  },
} as const;

export type RegionPackProductId =
  keyof typeof REGION_PACKS;

export const SETTLEMENT_THEMES = {
  default: {
    name: 'Классические руины',
    gemCost: 0,
    tint: 0xffffff,
  },
  verdant: {
    name: 'Зелёное возрождение',
    gemCost: 250,
    tint: 0x9bc47b,
  },
  ember: {
    name: 'Пепельная крепость',
    gemCost: 350,
    tint: 0xd7835f,
  },
} as const;

export type SettlementThemeId =
  keyof typeof SETTLEMENT_THEMES;

export const PETS = {
  mossling: {
    name: 'Моховичок',
    gemCost: 300,
    pickupRangeMultiplier: 1.15,
  },
  firefly: {
    name: 'Светляк',
    gemCost: 450,
    pickupRangeMultiplier: 1.25,
  },
} as const;

export type PetId =
  keyof typeof PETS;
