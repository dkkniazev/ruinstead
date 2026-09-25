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
  EquippedWeaponProfile,
  OwnedWeaponOption,
  WeaponRarityId,
} from '../progression/WeaponInventory';
import type {
  PlayerMasteryId,
} from '../progression/PlayerLevelBalance';
import type {
  SkinChestTier,
  SkinId,
} from '../cosmetics/SkinEconomy';
import type {
  PetId,
  SettlementThemeId,
} from '../cosmetics/PremiumStoreConfig';

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

export type CharacterHudState = {
  level: number;
  unlockedSlots: number;
  primarySlot: number;
  slots:
    Array<
      EquippedWeaponProfile |
      null
    >;
  inventory:
    OwnedWeaponOption[];
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
export const HUD_CHARACTER_STATE_EVENT =
  'ruinstead:hud:character-state';
export const HUD_WEAPON_SLOT_EQUIP_EVENT =
  'ruinstead:hud:weapon-slot-equip';
export const HUD_WEAPON_SLOT_CLEAR_EVENT =
  'ruinstead:hud:weapon-slot-clear';
export const HUD_WEAPON_SLOT_PRIMARY_EVENT =
  'ruinstead:hud:weapon-slot-primary';
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
export const HUD_CITY_PRODUCTION_DOUBLE_EVENT =
  'ruinstead:hud:city-production-double';
export const HUD_RETURN_HOME_EVENT =
  'ruinstead:hud:return-home';
export const HUD_BLESSING_EVENT =
  'ruinstead:hud:blessing';
export const HUD_BOSS_RESPAWN_EVENT =
  'ruinstead:hud:boss-respawn';
export const HUD_SUPPLY_EVENT =
  'ruinstead:hud:supply';
export const HUD_BUY_AD_FREE_WEEK_EVENT =
  'ruinstead:hud:buy-ad-free-week';
export const HUD_MONETIZATION_STATE_EVENT =
  'ruinstead:hud:monetization-state';
export const HUD_MONETIZATION_ACTION_EVENT =
  'ruinstead:hud:monetization-action';
export const HUD_PLAYER_PROGRESS_STATE_EVENT =
  'ruinstead:hud:player-progress-state';
export const HUD_MASTERY_SPEND_EVENT =
  'ruinstead:hud:mastery-spend';
export const HUD_PREMIUM_STATE_EVENT =
  'ruinstead:hud:premium-state';
export const HUD_SKIN_CHEST_OPEN_EVENT =
  'ruinstead:hud:skin-chest-open';
export const HUD_SKIN_EQUIP_EVENT =
  'ruinstead:hud:skin-equip';
export const HUD_PREMIUM_PURCHASE_EVENT =
  'ruinstead:hud:premium-purchase';
export const HUD_SHARD_SHOP_BUY_EVENT =
  'ruinstead:hud:shard-shop-buy';
export const HUD_SETTLEMENT_THEME_EVENT =
  'ruinstead:hud:settlement-theme';
export const HUD_PET_EVENT =
  'ruinstead:hud:pet';

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
export type HudCharacterStateHandler =
  (
    state:
      CharacterHudState,
  ) => void;
export type HudWeaponSlotEquipHandler =
  (
    slot: number,
    weaponId: WeaponId,
    rarity: WeaponRarityId,
    stars: number,
  ) => void;
export type HudWeaponSlotClearHandler =
  (slot: number) => void;
export type HudWeaponSlotPrimaryHandler =
  (slot: number) => void;
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


export type BlessingKind =
  | 'damage'
  | 'health'
  | 'speed'
  | 'gathering';

export type SupplyResourceType =
  | 'wood'
  | 'stone'
  | 'metal'
  | 'crystal'
  | 'fiber';

export type MonetizationOfferPlacement =
  | 'death_revive'
  | 'boss_reward'
  | 'chest_reward'
  | 'boss_respawn';

export type MonetizationHudState = {
  enabled: boolean;
  busy: boolean;
  returnTickets: number;
  canFastReturn: boolean;
  purchaseAvailable: boolean;
  activeBlessing: {
    kind: BlessingKind;
    expiresAt: number;
  } | null;
  bossRespawnResetCooldownRemainingMs:
    number;
  supplyCooldownRemainingMs:
    number;
  adFreeUntil: number;
  offer: {
    placement:
      MonetizationOfferPlacement;
    title: string;
    description: string;
    rewardText: string;
  } | null;
};

export type HudCityProductionDoubleHandler =
  () => void;
export type HudReturnHomeHandler =
  (
    action:
      | 'ticket'
      | 'rewarded'
      | 'buy',
  ) => void;
export type HudBlessingHandler =
  (kind: BlessingKind) => void;
export type HudBossRespawnHandler =
  () => void;
export type HudSupplyHandler =
  (
    resource:
      SupplyResourceType,
  ) => void;
export type HudBuyAdFreeWeekHandler =
  () => void;
export type HudMonetizationStateHandler =
  (state: MonetizationHudState) => void;
export type HudMonetizationActionHandler =
  (
    action: 'watch' | 'dismiss',
    placement:
      MonetizationOfferPlacement,
  ) => void;


export type PlayerProgressHudState = {
  level: number;
  xp: number;
  xpToNext: number;
  gems: number;
  masteryAvailable: number;
  masteryRanks:
    Record<PlayerMasteryId, number>;
};

export type PremiumHudState = {
  gems: number;
  purchaseAvailable: boolean;
  rewardedCommonChestRemaining:
    number;
  freeSkinChests: {
    common: number;
    rare: number;
    epic: number;
  };
  epicChestPity: number;
  skinFragments:
    Record<string, number>;
  unlockedSkinIds: string[];
  equippedSkinId:
    SkinId | null;
  starterPackOwned: boolean;
  founderPackOwned: boolean;
  levelPassOwned: boolean;
  regionPackStage2Owned: boolean;
  regionPackStage2Available: boolean;
  ownedSettlementThemes:
    string[];
  equippedSettlementTheme:
    SettlementThemeId;
  ownedPets: string[];
  equippedPet:
    PetId | null;
  shardShopOffers:
    Array<{
      slot: number;
      skinId: SkinId;
      rarity:
        'common' |
        'uncommon' |
        'rare' |
        'epic';
      fragments: number;
      gemCost: number;
      purchased: boolean;
      unlocked: boolean;
    }>;
  purchaseCatalog:
    Record<
      string,
      {
        title: string;
        description: string;
        price: string;
        currencyIconUrl: string;
      }
    >;
};

export type HudPlayerProgressStateHandler =
  (
    state:
      PlayerProgressHudState,
  ) => void;
export type HudMasterySpendHandler =
  (
    id:
      PlayerMasteryId,
  ) => void;
export type HudPremiumStateHandler =
  (
    state:
      PremiumHudState,
  ) => void;
export type HudSkinChestOpenHandler =
  (
    tier: SkinChestTier,
    mode:
      | 'gems'
      | 'rewarded'
      | 'free',
  ) => void;
export type HudSkinEquipHandler =
  (skinId: SkinId | null) => void;
export type HudPremiumPurchaseHandler =
  (productId: string) => void;
export type HudShardShopBuyHandler =
  (slot: number) => void;
export type HudSettlementThemeHandler =
  (
    id:
      SettlementThemeId,
  ) => void;
export type HudPetHandler =
  (id: PetId) => void;
