import type { CombatState } from '../combat/CombatSystem';
import type { WeaponId } from '../combat/WeaponDefinitions';
import type {
  BackpackState,
} from '../gathering/BackpackSystem';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import type {
  SettlementHudState,
} from '../settlement/SettlementSystem';
import type {
  PlayerUpgradeId,
} from '../progression/UpgradeBalance';
import type {
  QuestHudState,
} from '../quests/QuestDirector';
import type {
  BestiaryHudState,
} from '../bestiary/BestiarySystem';
import type {
  CityBuilderHudState,
  CityBuildingId,
} from '../settlement/CityBuilderSystem';
import type {
  OwnedWeaponOption,
  WeaponRarityId,
} from '../progression/WeaponInventory';

export type GatheringHudState = {
  backpack: BackpackState;
  storage: ResourceCounts;
};

export type UpgradeHudState = {
  forgeRestored: boolean;
  selectedWeaponId: WeaponId;
  unlockedWeaponIds: WeaponId[];
  equippedWeapon:
    OwnedWeaponOption;
  weaponOptions:
    OwnedWeaponOption[];
  player: {
    maxHealthLevel: number;
    moveSpeedLevel: number;
    backpackLevel: number;
    dashLevel: number;
  };
  storage: ResourceCounts;
};

export const HUD_COMBAT_STATE_EVENT =
  'ruinstead:hud:combat-state';
export const HUD_AREA_EVENT =
  'ruinstead:hud:area';
export const HUD_WEAPON_SELECT_EVENT =
  'ruinstead:hud:weapon-select';
export const HUD_NOTICE_EVENT =
  'ruinstead:hud:notice';
export const HUD_GATHERING_STATE_EVENT =
  'ruinstead:hud:gathering-state';
export const HUD_SETTLEMENT_STATE_EVENT =
  'ruinstead:hud:settlement-state';
export const HUD_FORGE_REPAIR_EVENT =
  'ruinstead:hud:forge-repair';
export const HUD_UPGRADE_STATE_EVENT =
  'ruinstead:hud:upgrade-state';
export const HUD_PLAYER_UPGRADE_EVENT =
  'ruinstead:hud:player-upgrade';
export const HUD_WEAPON_UPGRADE_EVENT =
  'ruinstead:hud:weapon-upgrade';
export const HUD_WEAPON_VARIANT_SELECT_EVENT =
  'ruinstead:hud:weapon-variant-select';
export const HUD_WEAPON_FUSE_EVENT =
  'ruinstead:hud:weapon-fuse';
export const HUD_QUEST_STATE_EVENT =
  'ruinstead:hud:quest-state';
export const HUD_BESTIARY_STATE_EVENT =
  'ruinstead:hud:bestiary-state';
export const HUD_BESTIARY_CLAIM_EVENT =
  'ruinstead:hud:bestiary-claim';
export const HUD_HEALTH_POTION_EVENT =
  'ruinstead:hud:health-potion';
export const HUD_CITY_STATE_EVENT =
  'ruinstead:hud:city-state';
export const HUD_CITY_UPGRADE_EVENT =
  'ruinstead:hud:city-upgrade';
export const HUD_CITY_COLLECT_EVENT =
  'ruinstead:hud:city-collect';
export const HUD_CITY_PRODUCTION_BOOST_EVENT =
  'ruinstead:hud:city-production-boost';
export const HUD_MONETIZATION_STATE_EVENT =
  'ruinstead:hud:monetization-state';
export const HUD_MONETIZATION_ACTION_EVENT =
  'ruinstead:hud:monetization-action';

export type HudCombatStateHandler =
  (state: CombatState) => void;
export type HudAreaHandler =
  (areaName: string) => void;
export type HudWeaponSelectHandler =
  (weaponId: WeaponId) => void;
export type HudNoticeHandler =
  (message: string) => void;
export type HudGatheringStateHandler =
  (state: GatheringHudState) => void;
export type HudSettlementStateHandler =
  (state: SettlementHudState) => void;
export type HudUpgradeStateHandler =
  (state: UpgradeHudState) => void;
export type HudPlayerUpgradeHandler =
  (id: PlayerUpgradeId) => void;
export type HudWeaponUpgradeHandler =
  (weaponId: WeaponId) => void;
export type HudWeaponVariantSelectHandler =
  (
    weaponId: WeaponId,
    rarity: WeaponRarityId,
    stars: number,
  ) => void;
export type HudWeaponFuseHandler =
  (
    weaponId: WeaponId,
    rarity: WeaponRarityId,
    stars: number,
  ) => void;
export type HudQuestStateHandler =
  (state: QuestHudState) => void;
export type HudBestiaryStateHandler =
  (state: BestiaryHudState) => void;
export type HudBestiaryClaimHandler =
  (entryId: string) => void;
export type HudHealthPotionHandler =
  () => void;
export type HudCityStateHandler =
  (state: CityBuilderHudState) => void;
export type HudCityUpgradeHandler =
  (id: CityBuildingId) => void;
export type HudCityCollectHandler =
  () => void;


export type MonetizationOfferPlacement =
  | 'expedition_reward'
  | 'death_recovery';

export type MonetizationHudState = {
  enabled: boolean;
  busy: boolean;
  offer: {
    placement:
      MonetizationOfferPlacement;
    title: string;
    description: string;
    rewardText: string;
  } | null;
};

export type HudCityProductionBoostHandler =
  () => void;
export type HudMonetizationStateHandler =
  (state: MonetizationHudState) => void;
export type HudMonetizationActionHandler =
  (
    action: 'watch' | 'dismiss',
    placement:
      MonetizationOfferPlacement,
  ) => void;
