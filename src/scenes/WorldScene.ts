import Phaser from 'phaser';
import {
  BestiarySystem,
  type BestiaryEntryKind,
  type BestiaryHudState,
} from '../game/bestiary/BestiarySystem';
import {
  BossSystem,
  type BossDefeatEvent,
  type BossId,
} from '../game/bosses/BossSystem';
import {
  CombatSystem,
  type CombatState,
} from '../game/combat/CombatSystem';
import {
  WEAPON_DEFINITIONS,
  WEAPON_ORDER,
  type WeaponId,
} from '../game/combat/WeaponDefinitions';
import { EnemySystem } from '../game/enemies/EnemySystem';
import {
  BackpackSystem,
} from '../game/gathering/BackpackSystem';
import {
  ResourceSystem,
} from '../game/gathering/ResourceSystem';
import {
  ChestSystem,
} from '../game/world/ChestSystem';
import {
  RESOURCE_TYPES,
  totalResourceUnits,
  type ResourceCounts,
} from '../game/gathering/ResourceTypes';
import {
  configureLogicalCamera,
} from '../game/layout/Viewport';
import {
  QuestDirector,
  type QuestContext,
  type QuestHudState,
} from '../game/quests/QuestDirector';
import {
  canAffordUpgrade,
  getPlayerUpgradeCost,
  getWeaponUpgradeCost,
  spendUpgradeCost,
  type PlayerUpgradeId,
} from '../game/progression/UpgradeBalance';
import {
  PLAYER_LEVEL_CONFIG,
  PLAYER_MASTERY,
  getXpToNextPlayerLevel,
  type PlayerMasteryId,
} from '../game/progression/PlayerLevelBalance';
import {
  addPlayerXp,
  getAvailableMasteryPoints,
  spendMasteryPoint,
} from '../game/progression/PlayerProgressionSystem';
import {
  SKIN_DEFINITIONS,
  type SkinChestTier,
  type SkinId,
} from '../game/cosmetics/SkinEconomy';
import {
  applyPremiumPurchase,
  buyPet,
  buySettlementTheme,
  claimLevelPassRewards,
  equipSkin,
  evaluateAchievements,
  getEquippedSkinBonus,
  getRewardedCommonChestRemaining,
  openSkinChest,
} from '../game/cosmetics/PremiumSystem';
import {
  PETS,
  REGION_PACKS,
  SETTLEMENT_THEMES,
  type PetId,
  type SettlementThemeId,
} from '../game/cosmetics/PremiumStoreConfig';
import {
  WEAPON_RARITIES,
  addWeaponDrop,
  canFuseWeapon,
  equipWeaponVariant,
  fuseWeapon,
  getEquippedWeaponProfile,
  getWeaponDamageMultiplier,
  listOwnedWeaponOptions,
  upgradeEquippedWeaponLevel,
  type EquippedWeaponProfile,
  type WeaponRarityId,
} from '../game/progression/WeaponInventory';
import { PlayerController } from '../game/player/PlayerController';
import { DebugOverlay } from '../game/qa/DebugOverlay';
import {
  trackAnalyticsEvent,
} from '../game/analytics/Analytics';
import {
  MONETIZATION_CONFIG,
} from '../game/monetization/MonetizationConfig';
import {
  type GameState,
} from '../game/state/GameState';
import {
  SettlementSystem,
  type SettlementHudState,
} from '../game/settlement/SettlementSystem';
import {
  CityBuilderSystem,
  type CityBuilderHudState,
  type CityBuildingId,
} from '../game/settlement/CityBuilderSystem';
import { GameStateStore } from '../game/state/GameStateStore';
import {
  HUD_AREA_EVENT,
  HUD_BESTIARY_CLAIM_EVENT,
  HUD_BESTIARY_STATE_EVENT,
  HUD_COMBAT_STATE_EVENT,
  HUD_CITY_COLLECT_EVENT,
  HUD_CITY_PRODUCTION_DOUBLE_EVENT,
  HUD_CITY_STATE_EVENT,
  HUD_CITY_UPGRADE_EVENT,
  HUD_GATHERING_STATE_EVENT,
  HUD_HEALTH_POTION_EVENT,
  HUD_BLESSING_EVENT,
  HUD_RETURN_HOME_EVENT,
  HUD_SUPPLY_EVENT,
  HUD_BUY_AD_FREE_WEEK_EVENT,
  HUD_MONETIZATION_ACTION_EVENT,
  HUD_MONETIZATION_STATE_EVENT,
  HUD_PLAYER_PROGRESS_STATE_EVENT,
  HUD_MASTERY_SPEND_EVENT,
  HUD_PREMIUM_STATE_EVENT,
  HUD_SKIN_CHEST_OPEN_EVENT,
  HUD_SKIN_EQUIP_EVENT,
  HUD_PREMIUM_PURCHASE_EVENT,
  HUD_SETTLEMENT_THEME_EVENT,
  HUD_PET_EVENT,
  HUD_NOTICE_EVENT,
  HUD_SETTLEMENT_STATE_EVENT,
  HUD_FORGE_REPAIR_EVENT,
  HUD_PLAYER_UPGRADE_EVENT,
  HUD_QUEST_STATE_EVENT,
  HUD_UPGRADE_STATE_EVENT,
  HUD_WEAPON_UPGRADE_EVENT,
  HUD_WEAPON_VARIANT_SELECT_EVENT,
  HUD_WEAPON_FUSE_EVENT,
  HUD_WEAPON_SELECT_EVENT,
  type BlessingKind,
  type GatheringHudState,
  type MonetizationHudState,
  type MonetizationOfferPlacement,
  type PlayerProgressHudState,
  type PremiumHudState,
  type SupplyResourceType,
  type UpgradeHudState,
} from '../game/ui/HudEvents';
import {
  FOREST_HEART,
  FOREST_HEART_DISCOVERY_RADIUS,
} from '../game/world/ForestZone';
import {
  BRIDGE_REPAIR_COST,
  BridgeSystem,
} from '../game/world/BridgeSystem';
import {
  StageTwoGateSystem,
} from '../game/world/StageTwoGateSystem';
import {
  RETURN_POINT,
  RETURN_RADIUS,
  SETTLEMENT_CENTER,
  SETTLEMENT_SAFE_RADIUS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createPrototypeWorld,
  getAreaName,
} from '../game/world/WorldPrototype';
import {
  markYandexGameReady,
  startYandexGameplay,
} from '../platform/yandex/YandexPlatform';
import {
  createAdsProvider,
} from '../platform/ads/createAdsProvider';
import type {
  RewardedAdPlacement,
} from '../platform/ads/AdsProvider';
import {
  createPurchaseProvider,
} from '../platform/purchases/createPurchaseProvider';
import type {
  PurchaseReceipt,
} from '../platform/purchases/PurchaseProvider';
import {
  flushYandexCloudSave,
} from '../platform/yandex/YandexCloudSave';

export class WorldScene
  extends Phaser.Scene {
  private readonly stateStore =
    new GameStateStore();
  private readonly adsProvider =
    createAdsProvider();
  private readonly purchaseProvider =
    createPurchaseProvider();

  private monetizationOffer:
    MonetizationHudState['offer'] =
      null;
  private monetizationBusy = false;
  private pendingBossReward?: {
    event: BossDefeatEvent;
    ticketDropped: boolean;
  };
  private pendingChestReward?:
    ResourceCounts;
  private pendingBossRespawnId?:
    BossId;
  private bossRespawnOfferBlockedUntil = 0;
  private lastMonetizationTickAt = 0;

  private gameState?:
    GameState;
  private player?:
    PlayerController;
  private enemies?:
    EnemySystem;
  private bosses?:
    BossSystem;
  private combat?:
    CombatSystem;
  private backpack?:
    BackpackSystem;
  private resourceSystem?:
    ResourceSystem;
  private bridgeSystem?:
    BridgeSystem;
  private stageTwoGateSystem?:
    StageTwoGateSystem;
  private chestSystem?:
    ChestSystem;
  private readonly questDirector =
    new QuestDirector();
  private bestiarySystem?:
    BestiarySystem;
  private bestiaryHudState?:
    BestiaryHudState;
  private questHudState?:
    QuestHudState;
  private questHudSignature = '';
  private settlementSystem?:
    SettlementSystem;
  private cityBuilderSystem?:
    CityBuilderSystem;
  private cityHudSignature = '';

  private debugOverlay?:
    DebugOverlay;
  private lastAreaName = '';
  private wasAtReturnPoint = false;
  private bridgeRepairKey?:
    Phaser.Input.Keyboard.Key;

  private weaponKeys:
    Partial<
      Record<
        WeaponId,
        Phaser.Input.Keyboard.Key
      >
    > = {};

  constructor() {
    super('WorldScene');
  }

  create(): void {
    configureLogicalCamera(this);

    this.gameState =
      this.stateStore.load();
    this.gameState =
      this.stateStore.save(
        this.gameState,
      );

    this.bestiarySystem =
      new BestiarySystem(
        this.gameState,
      );

    if (
      this.bestiarySystem
        .reconcileLegacyBosses()
    ) {
      this.gameState =
        this.stateStore.save(
          this.gameState,
        );
    }

    this.bestiaryHudState =
      this.bestiarySystem
        .getHudState();

    if (
      this.gameState.world
        .defeatedBosses
        .includes(
          'root-colossus',
        )
    ) {
      let migrated = false;

      if (
        !this.gameState.world
          .uniqueRewards
          .includes(
            'root-heart',
          )
      ) {
        this.gameState.world
          .uniqueRewards
          .push(
            'root-heart',
          );
        migrated = true;
      }

      const crossedBridge =
        this.gameState.world
          .discoveredLandmarks
          .includes(
            'stage-2-entry',
          );

      if (
        !crossedBridge &&
        this.gameState.settlement
          .buildings.bridge > 0
      ) {
        this.gameState.settlement
          .buildings.bridge = 0;
        this.gameState.settlement
          .repairStages.bridge = 0;
        this.gameState.world
          .unlockedZones =
            this.gameState.world
              .unlockedZones
              .filter(
                (zone) =>
                  zone !==
                  'stage-2',
              );
        migrated = true;
      }

      if (migrated) {
        this.gameState =
          this.stateStore.save(
            this.gameState,
          );
      }
    }

    const world =
      createPrototypeWorld(this);

    const savedPosition =
      this.gameState.world
        .playerPosition;
    const startX =
      savedPosition
        ? Phaser.Math.Clamp(
            savedPosition.x,
            40,
            WORLD_WIDTH - 40,
          )
        : world.spawn.x;
    const startY =
      savedPosition
        ? Phaser.Math.Clamp(
            savedPosition.y,
            40,
            WORLD_HEIGHT - 40,
          )
        : world.spawn.y;

    this.bridgeSystem =
      new BridgeSystem(
        this,
        this.gameState.settlement
          .buildings.bridge > 0,
        () => {
          this.handleBridgeRepair();
        },
      );

    this.stageTwoGateSystem =
      new StageTwoGateSystem(
        this,
        this.gameState.world
          .unlockedZones
          .includes(
            'stage-3',
          ),
      );

    this.player =
      new PlayerController(
        this,
        startX,
        startY,
        this.gameState.player
          .moveSpeedLevel,
        this.gameState.player
          .dashLevel,
      );

    this.backpack =
      new BackpackSystem(
        this.gameState.player
          .backpackLevel,
        this.gameState.backpack,
      );

    this.resourceSystem =
      new ResourceSystem(
        this,
        this.backpack,
        () => {
          this.handleBackpackChanged();
        },
        () => {
          this.grantPlayerXp(
            PLAYER_LEVEL_CONFIG
              .xpRewards.resourceNode,
          );
        },
      );

    this.chestSystem =
      new ChestSystem(
        this,
        this.backpack,
        this.gameState.world
          .openedChests,
        () => {
          this.handleBackpackChanged();
        },
        (message) => {
          this.game.events.emit(
            HUD_NOTICE_EVENT,
            message,
          );
        },
        (
          _chestId,
          rewards,
        ) => {
          this.handleChestOpened(
            rewards,
          );
        },
      );

    this.settlementSystem =
      new SettlementSystem(
        this,
        this.gameState.settlement
          .repairStages.forge,
        this.gameState.settlement
          .buildings.forge,
      );

    this.cityBuilderSystem =
      new CityBuilderSystem(
        this,
        this.gameState.settlement
          .buildings,
        this.gameState.settlement
          .production,
      );

    this.applyMetaProgression();

    if (
      this.cityBuilderSystem
        .updateProduction(
          Date.now(),
        )
    ) {
      this.gameState.settlement
        .level =
          this.cityBuilderSystem
            .computeSettlementLevel();
      this.saveState();
    }

    this.enemies =
      new EnemySystem(
        this,
        (
          speciesId,
          rank,
        ) => {
          this.handleBestiaryEncounter(
            'species',
            speciesId,
            rank === 'elite',
          );
        },
      );

    this.bosses =
      new BossSystem(
        this,
        this.gameState.world
          .bossRespawnAt,
        (event) => {
          this.handleBossDefeated(
            event,
          );
        },
        (bossId) => {
          this.handleBestiaryEncounter(
            'boss',
            bossId,
            false,
          );
        },
      );

    this.physics.add.collider(
      this.player.sprite,
      world.obstacles,
    );
    this.physics.add.collider(
      this.player.sprite,
      this.bridgeSystem
        .barriers,
    );
    this.physics.add.collider(
      this.player.sprite,
      this.stageTwoGateSystem
        .barriers,
    );
    this.physics.add.collider(
      this.enemies.group,
      world.obstacles,
    );
    this.physics.add.collider(
      this.enemies.group,
      this.bridgeSystem
        .barriers,
    );
    this.physics.add.collider(
      this.enemies.group,
      this.stageTwoGateSystem
        .barriers,
    );
    this.physics.add.collider(
      this.bosses.group,
      world.obstacles,
    );
    this.physics.add.collider(
      this.bosses.group,
      this.bridgeSystem
        .barriers,
    );
    this.physics.add.collider(
      this.bosses.group,
      this.stageTwoGateSystem
        .barriers,
    );
    this.physics.add.collider(
      this.player.sprite,
      this.enemies.group,
    );
    this.physics.add.collider(
      this.player.sprite,
      this.bosses.group,
    );

    this.combat =
      new CombatSystem(
        this,
        this.player,
        this.enemies,
        this.bosses,
        world.spawn,
        (combatState) => {
          this.handleCombatState(
            combatState,
          );
        },
        this.gameState.player
          .weaponId,
        this.gameState.player
          .unlockedWeaponIds,
        {
          maxHealthLevel:
            this.gameState.player
              .maxHealthLevel,
          weaponProfiles:
            this.weaponCombatProfiles,
        },
        this.gameState
          .consumables
          .healthPotions,
        (value) =>
          this.handleCoinCollected(
            value,
          ),
        (
          kind,
          entityId,
          elite,
        ) => {
          this.handleBestiaryKill(
            kind,
            entityId,
            elite,
          );
        },
        () => {
          this.handlePlayerDefeated();
        },
        () => {
          this.handlePlayerRespawned();
        },
      );

    this.applyMetaProgression();

    this.createWeaponKeys();
    this.bridgeRepairKey =
      this.input.keyboard?.addKey(
        Phaser.Input.Keyboard.KeyCodes.E,
      );

    const camera =
      this.cameras.main;

    camera.setBounds(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    );
    camera.startFollow(
      this.player.sprite,
      true,
      0.1,
      0.1,
    );
    camera.setDeadzone(
      170,
      105,
    );

    this.game.events.on(
      HUD_WEAPON_SELECT_EVENT,
      this.handleHudWeaponSelect,
      this,
    );
    this.game.events.on(
      HUD_FORGE_REPAIR_EVENT,
      this.handleForgeRepair,
      this,
    );
    this.game.events.on(
      HUD_PLAYER_UPGRADE_EVENT,
      this.handlePlayerUpgrade,
      this,
    );
    this.game.events.on(
      HUD_WEAPON_UPGRADE_EVENT,
      this.handleWeaponUpgrade,
      this,
    );
    this.game.events.on(
      HUD_WEAPON_VARIANT_SELECT_EVENT,
      this.handleWeaponVariantSelect,
      this,
    );
    this.game.events.on(
      HUD_WEAPON_FUSE_EVENT,
      this.handleWeaponFuse,
      this,
    );
    this.game.events.on(
      HUD_BESTIARY_CLAIM_EVENT,
      this.handleBestiaryClaim,
      this,
    );
    this.game.events.on(
      HUD_HEALTH_POTION_EVENT,
      this.handleHealthPotionUse,
      this,
    );
    this.game.events.on(
      HUD_CITY_UPGRADE_EVENT,
      this.handleCityUpgrade,
      this,
    );
    this.game.events.on(
      HUD_CITY_COLLECT_EVENT,
      this.handleCityCollect,
      this,
    );
    this.game.events.on(
      HUD_CITY_PRODUCTION_DOUBLE_EVENT,
      this.handleProductionDouble,
      this,
    );
    this.game.events.on(
      HUD_RETURN_HOME_EVENT,
      this.handleReturnHomeAction,
      this,
    );
    this.game.events.on(
      HUD_BLESSING_EVENT,
      this.handleBlessingRequest,
      this,
    );
    this.game.events.on(
      HUD_SUPPLY_EVENT,
      this.handleSupplyRequest,
      this,
    );
    this.game.events.on(
      HUD_BUY_AD_FREE_WEEK_EVENT,
      this.handleBuyAdFreeWeek,
      this,
    );
    this.game.events.on(
      HUD_MONETIZATION_ACTION_EVENT,
      this.handleMonetizationAction,
      this,
    );
    this.game.events.on(
      HUD_MASTERY_SPEND_EVENT,
      this.handleMasterySpend,
      this,
    );
    this.game.events.on(
      HUD_SKIN_CHEST_OPEN_EVENT,
      this.handleSkinChestOpen,
      this,
    );
    this.game.events.on(
      HUD_SKIN_EQUIP_EVENT,
      this.handleSkinEquip,
      this,
    );
    this.game.events.on(
      HUD_PREMIUM_PURCHASE_EVENT,
      this.handlePremiumPurchase,
      this,
    );
    this.game.events.on(
      HUD_SETTLEMENT_THEME_EVENT,
      this.handleSettlementTheme,
      this,
    );
    this.game.events.on(
      HUD_PET_EVENT,
      this.handlePet,
      this,
    );

    this.lastAreaName =
      getAreaName(
        this.player.position,
      );

    this.wasAtReturnPoint =
      this.isAtReturnPoint();

    const initialQuest =
      this.questDirector.update(
        this.gameState,
        this.questContext,
      );
    this.questHudState =
      initialQuest.hud;
    this.questHudSignature =
      JSON.stringify(
        initialQuest.hud,
      );

    if (initialQuest.changed) {
      this.saveState();
    }

    this.scene.launch(
      'HudScene',
      {
        initialCombatState:
          this.combat.state,
        initialGatheringState:
          this.gatheringHudState,
        initialSettlementState:
          this.settlementHudState,
        initialUpgradeState:
          this.upgradeHudState,
        initialQuestState:
          this.questHudState,
        initialBestiaryState:
          this.bestiaryHudState,
        initialCityState:
          this.cityHudState,
        initialMonetizationState:
          this.monetizationHudState,
        initialPlayerProgressState:
          this.playerProgressHudState,
        initialPremiumState:
          this.premiumHudState,
        initialAreaName:
          this.lastAreaName,
      },
    );

    this.debugOverlay =
      new DebugOverlay(this);
    this.debugOverlay.create();

    this.scale.on(
      Phaser.Scale.Events.RESIZE,
      this.handleResize,
      this,
    );
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this,
    );

    void this.reconcilePendingPurchases();

    markYandexGameReady();
    startYandexGameplay();
  }

  update(
    time: number,
    delta: number,
  ): void {
    this.player?.update(time);

    if (
      this.player &&
      this.enemies &&
      this.bosses &&
      this.combat &&
      this.resourceSystem
    ) {
      const onPlayerHit =
        (damage: number) => {
          this.combat?.damagePlayer(
            damage,
          );
        };

      const combatPosition =
        this.player
          .combatPosition;
      const combatRadius =
        this.player
          .combatRadius;

      this.enemies.update(
        time,
        combatPosition,
        combatRadius,
        onPlayerHit,
      );

      this.bosses.update(
        time,
        combatPosition,
        combatRadius,
        onPlayerHit,
      );

      const threatened =
        this.enemies
          .isPlayerThreatened() ||
        this.bosses
          .isPlayerThreatened();

      this.combat.update(
        time,
        delta,
        threatened,
      );

      this.resourceSystem.update(
        time,
        delta,
        this.player.position,
        threatened,
      );

      this.chestSystem?.update(
        this.player.position,
        threatened,
      );
    }

    this.handleReturnPoint();
    this.updateSettlement();
    this.updateCityBuilder();
    this.updateForestObjective();
    this.updateBridgeRepair();
    this.updateStageTwoTransition();
    this.updateStageThreeTransition();
    this.updateQuestDirector();
    this.handleWeaponKeys();
    this.updateAreaName();
    this.updateMonetizationTimers();
    this.debugOverlay?.update();
  }

  private get gatheringHudState():
    GatheringHudState {
    const backpack =
      this.backpack?.state ?? {
        carried: {
          wood: 0,
          stone: 0,
          metal: 0,
          crystal: 0,
          fiber: 0,
          coins: 0,
        },
        usedCapacity: 0,
        capacity: 100,
      };

    const storage =
      this.gameState
        ? {
            wood:
              this.gameState
                .resources.wood,
            stone:
              this.gameState
                .resources.stone,
            metal:
              this.gameState
                .resources.metal,
            crystal:
              this.gameState
                .resources.crystal,
            fiber:
              this.gameState
                .resources.fiber,
            coins:
              this.gameState
                .resources.coins,
          }
        : {
            wood: 0,
            stone: 0,
            metal: 0,
            crystal: 0,
            fiber: 0,
            coins: 0,
          };

    return {
      backpack,
      storage,
    };
  }

  private get settlementHudState():
    SettlementHudState {
    const storage =
      this.gameState
        ? {
            wood:
              this.gameState
                .resources.wood,
            stone:
              this.gameState
                .resources.stone,
            metal:
              this.gameState
                .resources.metal,
            crystal:
              this.gameState
                .resources.crystal,
            fiber:
              this.gameState
                .resources.fiber,
            coins:
              this.gameState
                .resources.coins,
          }
        : {
            wood: 0,
            stone: 0,
            metal: 0,
            crystal: 0,
            fiber: 0,
            coins: 0,
          };

    return (
      this.settlementSystem
        ?.getHudState(storage) ?? {
        nearForge: false,
        forge: {
          repairStage: 0,
          maxRepairStage: 3,
          restored: false,
          stageName: 'Развалины',
          nextCost: null,
          canAfford: false,
          storage,
          npcPresent: false,
        },
      }
    );
  }

  private get cityHudState():
    CityBuilderHudState {
    const storage =
      this.gatheringHudState
        .storage;
    const insideSettlement =
      this.player
        ? Phaser.Math.Distance.Between(
            this.player.position.x,
            this.player.position.y,
            SETTLEMENT_CENTER.x,
            SETTLEMENT_CENTER.y,
          ) <=
          SETTLEMENT_SAFE_RADIUS
        : false;

    return (
      this.cityBuilderSystem
        ?.getHudState(
          storage,
          insideSettlement,
        ) ?? {
        insideSettlement,
        settlementLevel:
          this.gameState
            ?.settlement.level ??
          0,
        npcCount: 0,
        production: {
          pending: {
            wood: 0,
            stone: 0,
            metal: 0,
            crystal: 0,
            fiber: 0,
            coins: 0,
          },
          capacity: 20,
          used: 0,
          canCollect: false,
          cycleSeconds: 30,
        },
        buildings: [],
      }
    );
  }

  private get monetizationHudState():
    MonetizationHudState {
    const state =
      this.gameState;
    const now =
      Date.now();
    const activeBlessing =
      state?.monetization
        .activeBlessing;
    const playerPosition =
      this.player?.position;
    const outsideSettlement =
      playerPosition
        ? Phaser.Math.Distance.Between(
            playerPosition.x,
            playerPosition.y,
            SETTLEMENT_CENTER.x,
            SETTLEMENT_CENTER.y,
          ) >
          SETTLEMENT_SAFE_RADIUS
        : false;

    return {
      enabled:
        MONETIZATION_CONFIG.enabled,
      busy:
        this.monetizationBusy,
      returnTickets:
        state?.consumables
          .returnTickets ?? 0,
      canFastReturn:
        outsideSettlement &&
        (this.combat?.state.health ?? 0) >
          0,
      purchaseAvailable:
        this.purchaseProvider
          .isAvailable(),
      activeBlessing:
        activeBlessing &&
        activeBlessing.expiresAt >
          now
          ? {
              ...activeBlessing,
            }
          : null,
      bossRespawnResetCooldownRemainingMs:
        Math.max(
          0,
          (
            state?.monetization
              .lastBossRespawnAdAt ??
            0
          ) +
            MONETIZATION_CONFIG
              .bossRespawnResetAdCooldownMs -
            now,
        ),
      supplyCooldownRemainingMs:
        Math.max(
          0,
          (
            state?.monetization
              .lastSupplyAdAt ??
            0
          ) +
            MONETIZATION_CONFIG
              .supplyAdCooldownMs -
            now,
        ),
      adFreeUntil:
        state?.monetization
          .adFreeUntil ?? 0,
      offer:
        this.monetizationOffer,
    };
  }

  private get playerProgressHudState():
    PlayerProgressHudState {
    const state =
      this.gameState;

    if (!state) {
      return {
        level: 1,
        xp: 0,
        xpToNext:
          getXpToNextPlayerLevel(
            1,
          ),
        gems: 0,
        masteryAvailable: 0,
        masteryRanks: {
          combat: 0,
          vitality: 0,
          mobility: 0,
          gathering: 0,
          settlement: 0,
        },
      };
    }

    return {
      level:
        state.progression
          .playerLevel,
      xp:
        state.progression
          .playerXp,
      xpToNext:
        state.progression
          .playerLevel >=
          PLAYER_LEVEL_CONFIG
            .maxLevel
          ? 0
          : getXpToNextPlayerLevel(
              state.progression
                .playerLevel,
            ),
      gems:
        state.premium.gems,
      masteryAvailable:
        getAvailableMasteryPoints(
          state,
        ),
      masteryRanks: {
        ...state.progression
          .masteryRanks,
      },
    };
  }

  private get premiumHudState():
    PremiumHudState {
    const state =
      this.gameState;

    if (!state) {
      return {
        gems: 0,
        purchaseAvailable: false,
        rewardedCommonChestRemaining:
          0,
        freeSkinChests: {
          common: 0,
          rare: 0,
          epic: 0,
        },
        epicChestPity: 0,
        skinFragments: {},
        unlockedSkinIds: [],
        equippedSkinId: null,
        starterPackOwned: false,
        levelPassOwned: false,
        regionPackStage2Owned: false,
        regionPackStage2Available: false,
        ownedSettlementThemes: [
          'default',
        ],
        equippedSettlementTheme:
          'default',
        ownedPets: [],
        equippedPet: null,
      };
    }

    const skinBonus =
      getEquippedSkinBonus(
        state,
      );
    const theme =
      state.premium
        .equippedSettlementTheme in
          SETTLEMENT_THEMES
        ? state.premium
            .equippedSettlementTheme as
              SettlementThemeId
        : 'default';
    const pet =
      state.premium.equippedPet &&
      state.premium
        .equippedPet in PETS
        ? state.premium
            .equippedPet as PetId
        : null;

    return {
      gems:
        state.premium.gems,
      purchaseAvailable:
        this.purchaseProvider
          .isAvailable(),
      rewardedCommonChestRemaining:
        getRewardedCommonChestRemaining(
          state,
        ),
      freeSkinChests: {
        ...state.premium
          .freeSkinChests,
      },
      epicChestPity:
        state.premium
          .epicChestPity,
      skinFragments: {
        ...state.premium
          .skinFragments,
      },
      unlockedSkinIds: [
        ...state.premium
          .unlockedSkinIds,
      ],
      equippedSkinId:
        skinBonus.skinId,
      starterPackOwned:
        state.premium
          .starterPackOwned,
      levelPassOwned:
        state.premium
          .levelPassOwned,
      regionPackStage2Owned:
        state.premium
          .regionPacksOwned
          .includes(
            'region_pack_stage_2',
          ),
      regionPackStage2Available:
        state.world
          .unlockedZones
          .includes(
            REGION_PACKS
              .region_pack_stage_2
              .zoneId,
          ),
      ownedSettlementThemes: [
        ...state.premium
          .ownedSettlementThemes,
      ],
      equippedSettlementTheme:
        theme,
      ownedPets: [
        ...state.premium
          .ownedPets,
      ],
      equippedPet:
        pet,
    };
  }

  private get weaponCombatProfiles():
    Record<
      WeaponId,
      EquippedWeaponProfile
    > {
    const inventory =
      this.gameState
        ?.player
        .weaponInventory;

    const fallback = (
      weaponId: WeaponId,
    ): EquippedWeaponProfile => ({
      weaponId,
      rarity: 'common',
      level: 1,
      stars: 0,
    });

    return {
      axe: inventory
        ? getEquippedWeaponProfile(
            inventory,
            'axe',
          )
        : fallback('axe'),
      sword: inventory
        ? getEquippedWeaponProfile(
            inventory,
            'sword',
          )
        : fallback('sword'),
      hammer: inventory
        ? getEquippedWeaponProfile(
            inventory,
            'hammer',
          )
        : fallback('hammer'),
      spear: inventory
        ? getEquippedWeaponProfile(
            inventory,
            'spear',
          )
        : fallback('spear'),
      daggers: inventory
        ? getEquippedWeaponProfile(
            inventory,
            'daggers',
          )
        : fallback('daggers'),
    };
  }

  private get upgradeHudState():
    UpgradeHudState {
    const state =
      this.gameState;
    const weaponId =
      this.combat?.state
        .weaponId ?? 'axe';
    const unlocked =
      this.combat?.state
        .unlockedWeaponIds ??
      ['axe'];

    return {
      forgeRestored:
        this.settlementSystem
          ?.restored ?? false,
      selectedWeaponId:
        weaponId,
      unlockedWeaponIds:
        [...unlocked],
      equippedWeapon:
        (() => {
          const inventory =
            state?.player
              .weaponInventory;
          const profile =
            inventory
              ? getEquippedWeaponProfile(
                  inventory,
                  weaponId,
                )
              : {
                  weaponId,
                  rarity:
                    'common' as const,
                  level: 1,
                  stars: 0,
                };
          const options =
            inventory
              ? listOwnedWeaponOptions(
                  inventory,
                  weaponId,
                )
              : [];
          const owned =
            options.find(
              (option) =>
                option.rarity ===
                  profile.rarity &&
                option.stars ===
                  profile.stars,
            );

          return (
            owned ?? {
              ...profile,
              count: 0,
              rarityName:
                WEAPON_RARITIES[
                  profile.rarity
                ].name,
              rarityColor:
                WEAPON_RARITIES[
                  profile.rarity
                ].color,
              damageMultiplier:
                getWeaponDamageMultiplier(
                  profile.level,
                  profile.rarity,
                  profile.stars,
                ),
            }
          );
        })(),
      weaponOptions:
        state
          ? listOwnedWeaponOptions(
              state.player
                .weaponInventory,
              weaponId,
            )
          : [],
      player: {
        maxHealthLevel:
          state?.player
            .maxHealthLevel ?? 0,
        moveSpeedLevel:
          state?.player
            .moveSpeedLevel ?? 0,
        backpackLevel:
          state?.player
            .backpackLevel ?? 0,
        dashLevel:
          state?.player
            .dashLevel ?? 0,
      },
      storage:
        this.gatheringHudState
          .storage,
    };
  }

  private get questContext():
    QuestContext {
    const position =
      this.player?.position;
    const outsideSettlement =
      position
        ? Phaser.Math.Distance.Between(
            position.x,
            position.y,
            SETTLEMENT_CENTER.x,
            SETTLEMENT_CENTER.y,
          ) >
          SETTLEMENT_SAFE_RADIUS
        : false;

    return {
      outsideSettlement,
      carried:
        this.backpack?.state
          .carried ?? {
          wood: 0,
          stone: 0,
          metal: 0,
          coins: 0,
        },
    };
  }

  private updateQuestDirector(): void {
    if (!this.gameState) {
      return;
    }

    const result =
      this.questDirector.update(
        this.gameState,
        this.questContext,
      );

    this.questHudState =
      result.hud;

    const signature =
      JSON.stringify(
        result.hud,
      );

    if (
      signature !==
      this.questHudSignature
    ) {
      this.questHudSignature =
        signature;

      this.game.events.emit(
        HUD_QUEST_STATE_EVENT,
        result.hud,
      );
    }

    if (!result.changed) {
      return;
    }

    if (
      result.completed.length > 0
    ) {
      const completion =
        result.completed[
          result.completed.length -
            1
        ];

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `${completion.optional ? 'Доп. цель' : 'Цель'} выполнена: ${completion.title} · +●${completion.reward.coins} · +XP поселения ${completion.reward.settlementXp}`,
      );

      const xp =
        result.completed.reduce(
          (sum, item) =>
            sum +
            (
              item.id ===
                'defeat-root-colossus'
                ? PLAYER_LEVEL_CONFIG
                    .xpRewards
                    .majorQuest
                : PLAYER_LEVEL_CONFIG
                    .xpRewards
                    .questStep
            ),
          0,
        );

      this.grantPlayerXp(
        xp,
      );
    }

    this.emitProgressionState();
    this.saveState();
  }

  private handleBestiaryEncounter(
    kind: BestiaryEntryKind,
    entityId: string,
    elite: boolean,
  ): void {
    if (!this.bestiarySystem) {
      return;
    }

    const result =
      this.bestiarySystem
        .recordEncounter(
          kind,
          entityId,
          elite,
        );

    if (!result.changed) {
      return;
    }

    if (result.notice) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        result.notice,
      );
    }

    this.emitBestiaryState();
    this.saveState();
  }

  private handleBestiaryKill(
    kind: BestiaryEntryKind,
    entityId: string,
    elite: boolean,
  ): void {
    if (!this.bestiarySystem) {
      return;
    }

    const result =
      this.bestiarySystem
        .recordKill(
          kind,
          entityId,
          elite,
        );

    if (result.notice) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        result.notice,
      );
    }

    if (kind === 'species') {
      this.grantPlayerXp(
        elite
          ? PLAYER_LEVEL_CONFIG
              .xpRewards
              .eliteEnemy
          : PLAYER_LEVEL_CONFIG
              .xpRewards
              .normalEnemy,
      );
    }

    this.emitBestiaryState();
    this.evaluatePremiumAchievements();
    this.saveState();
  }

  private handleBestiaryClaim(
    entryId: string,
  ): void {
    if (!this.bestiarySystem) {
      return;
    }

    const result =
      this.bestiarySystem
        .claimNextReward(
          entryId,
        );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      result.notice,
    );

    if (!result.success) {
      return;
    }

    this.grantPlayerXp(
      PLAYER_LEVEL_CONFIG
        .xpRewards
        .bestiaryLevelClaim,
    );
    this.emitBestiaryState();
    this.emitProgressionState();
    this.evaluatePremiumAchievements();
    this.saveState();
  }

  private emitBestiaryState(): void {
    if (!this.bestiarySystem) {
      return;
    }

    this.bestiaryHudState =
      this.bestiarySystem
        .getHudState();

    this.game.events.emit(
      HUD_BESTIARY_STATE_EVENT,
      this.bestiaryHudState,
    );
  }

  private createWeaponKeys(): void {
    const keyboard =
      this.input.keyboard;

    if (!keyboard) {
      return;
    }

    const keyCodes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
    ];

    WEAPON_ORDER.forEach(
      (weaponId, index) => {
        this.weaponKeys[
          weaponId
        ] =
          keyboard.addKey(
            keyCodes[index],
          );
      },
    );
  }

  private handleCombatState(
    state: CombatState,
  ): void {
    this.player?.setHealth(
      state.health,
      state.maxHealth,
    );

    if (this.gameState) {
      this.gameState.player.weaponId =
        state.weaponId;
      this.gameState.player
        .unlockedWeaponIds =
          [...state.unlockedWeaponIds];
      this.gameState.consumables
        .healthPotions =
          state.healthPotions;
      this.saveState();
    }

    this.game.events.emit(
      HUD_COMBAT_STATE_EVENT,
      state,
    );
    this.game.events.emit(
      HUD_UPGRADE_STATE_EVENT,
      this.upgradeHudState,
    );
  }

  private handleCoinCollected(
    value: number,
  ): number {
    if (!this.backpack) {
      return 0;
    }

    const accepted =
      this.backpack.add(
        'coins',
        value,
      );

    if (accepted > 0) {
      this.handleBackpackChanged();
    }

    return accepted;
  }

  private handleBackpackChanged(): void {
    if (
      !this.gameState ||
      !this.backpack
    ) {
      return;
    }

    const carried =
      this.backpack.state
        .carried;

    this.gameState.backpack = {
      wood: carried.wood,
      stone: carried.stone,
      metal: carried.metal,
      crystal:
        carried.crystal ?? 0,
      fiber:
        carried.fiber ?? 0,
      coins: carried.coins,
    };

    this.game.events.emit(
      HUD_GATHERING_STATE_EVENT,
      this.gatheringHudState,
    );
    this.game.events.emit(
      HUD_UPGRADE_STATE_EVENT,
      this.upgradeHudState,
    );
    this.emitCityState();

    this.saveState();
  }

  private handleHealthPotionUse(): void {
    const result =
      this.combat
        ?.useHealthPotion();

    if (
      !result ||
      result === 'used'
    ) {
      return;
    }

    const message =
      result === 'empty'
        ? 'Зелья здоровья закончились'
        : result === 'full-health'
          ? 'Здоровье уже полное'
          : result === 'cooldown'
            ? 'Зелье ещё перезаряжается'
            : 'Сейчас нельзя использовать зелье';

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      message,
    );
  }

  private handlePlayerRespawned(): void {
    if (
      !this.player ||
      !this.resourceSystem
    ) {
      return;
    }

    this.resourceSystem
      .handlePlayerRespawned(
        this.player.position,
      );

    this.combat
      ?.refillHealthPotions();
  }

  private get adFreeActive():
    boolean {
    return (
      (
        this.gameState
          ?.monetization
          .adFreeUntil ??
        0
      ) > Date.now()
    );
  }

  private get rewardedAccessAvailable():
    boolean {
    return (
      MONETIZATION_CONFIG.enabled &&
      (
        this.adFreeActive ||
        this.adsProvider
          .isRewardedAvailable()
      )
    );
  }

  private handlePlayerDefeated(): void {
    if (
      !this.combat ||
      !this.gameState
    ) {
      return;
    }

    if (
      this.combat
        .canRewardedRevive &&
      this.rewardedAccessAvailable
    ) {
      this.pendingBossReward =
        undefined;
      this.pendingChestReward =
        undefined;
      this.pendingBossRespawnId =
        undefined;

      this.setMonetizationOffer({
        placement:
          'death_revive',
        title:
          'Последний шанс',
        description:
          'Один раз можно воскреснуть прямо здесь и продолжить этот бой. Если погибнете ещё раз — вернётесь домой.',
        rewardText:
          `${Math.round(
            MONETIZATION_CONFIG
              .rewardedReviveHealthRatio *
              100,
          )}% HP · рюкзак сохранён`,
      });
      return;
    }

    this.resolveHardDeath();
  }

  private resolveHardDeath():
    void {
    if (
      !this.backpack ||
      !this.player ||
      !this.resourceSystem ||
      !this.combat
    ) {
      return;
    }

    const deathPosition =
      this.player.position;
    const dropped =
      this.backpack.takeAll();

    if (
      totalResourceUnits(
        dropped,
      ) > 0
    ) {
      this.resourceSystem
        .spawnDeathDrop(
          deathPosition,
          dropped,
        );
    }

    this.enemies?.resetCombat(
      this.time.now,
    );
    this.bosses?.resetCombat(
      this.time.now,
    );

    this.handleBackpackChanged();
    this.clearMonetizationOffer();

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      totalResourceUnits(
        dropped,
      ) > 0
        ? `Поражение: рюкзак выпал на месте смерти — ${this.formatResources(dropped)}`
        : 'Поражение: рюкзак был пуст',
    );

    this.combat.respawnAtHome();
    this.emitMonetizationState();
  }

  private handleReturnPoint(): void {
    if (
      !this.player ||
      !this.backpack ||
      !this.gameState
    ) {
      return;
    }

    const inside =
      this.isAtReturnPoint();

    if (
      inside &&
      !this.wasAtReturnPoint
    ) {
      const potionsRefilled =
        this.combat
          ?.refillHealthPotions() ??
        false;

      if (
        this.backpack
          .state.usedCapacity <= 0
      ) {
        if (potionsRefilled) {
          this.game.events.emit(
            HUD_NOTICE_EVENT,
            'Зелья здоровья пополнены',
          );
        }

        this.wasAtReturnPoint =
          inside;
        this.emitMonetizationState();
        return;
      }

      const deposited =
        this.backpack.deposit();

      for (
        const type of
        RESOURCE_TYPES
      ) {
        this.gameState.resources[
          type
        ] +=
          deposited[type] ?? 0;
      }

      this.gameState.progression
        .settlementReturnCount += 1;

      this.handleBackpackChanged();

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `Добыча сохранена: ${this.formatResources(deposited)}`,
      );

      this.game.events.emit(
        HUD_SETTLEMENT_STATE_EVENT,
        this.settlementHudState,
      );

      this.saveState();
      this.emitMonetizationState();
    }

    this.wasAtReturnPoint =
      inside;
  }

  private isAtReturnPoint():
    boolean {
    if (!this.player) {
      return false;
    }

    return (
      Phaser.Math.Distance.Between(
        this.player.position.x,
        this.player.position.y,
        RETURN_POINT.x,
        RETURN_POINT.y,
      ) <=
      RETURN_RADIUS
    );
  }

  private formatResources(
    resources:
      ResourceCounts,
  ): string {
    const parts:
      string[] = [];

    if (resources.wood > 0) {
      parts.push(
        `дерево +${resources.wood}`,
      );
    }
    if (resources.stone > 0) {
      parts.push(
        `камень +${resources.stone}`,
      );
    }
    if (resources.metal > 0) {
      parts.push(
        `металл +${resources.metal}`,
      );
    }
    if (
      (resources.crystal ?? 0) >
      0
    ) {
      parts.push(
        `кристалл +${resources.crystal ?? 0}`,
      );
    }
    if (
      (resources.fiber ?? 0) >
      0
    ) {
      parts.push(
        `волокно +${resources.fiber ?? 0}`,
      );
    }
    if (resources.coins > 0) {
      parts.push(
        `монеты +${resources.coins}`,
      );
    }

    return (
      parts.join(' · ') ||
      'ничего'
    );
  }

  private multiplyResources(
    resources:
      ResourceCounts,
    multiplier: number,
  ): ResourceCounts {
    return {
      wood:
        resources.wood *
        multiplier,
      stone:
        resources.stone *
        multiplier,
      metal:
        resources.metal *
        multiplier,
      crystal:
        (resources.crystal ?? 0) *
        multiplier,
      fiber:
        (resources.fiber ?? 0) *
        multiplier,
      coins:
        resources.coins *
        multiplier,
    };
  }

  private handleBossDefeated(
    event: BossDefeatEvent,
  ): void {
    if (!this.gameState) {
      return;
    }

    const firstClear =
      !this.gameState.world
        .defeatedBosses
        .includes(event.id);

    if (firstClear) {
      this.gameState.world
        .defeatedBosses
        .push(event.id);
    }

    this.gameState.world
      .bossRespawnAt[
        event.id
      ] =
        event.respawnAt;

    if (
      totalResourceUnits(
        event.dropResources,
      ) > 0
    ) {
      this.resourceSystem
        ?.spawnResourceDrop(
          new Phaser.Math.Vector2(
            event.x,
            event.y,
          ),
          event.dropResources,
        );
    }

    let weaponDropText:
      string | undefined;

    if (event.weaponDrop) {
      const weaponDrop =
        addWeaponDrop(
          this.gameState.player
            .weaponInventory,
          event.weaponDrop
            .weaponId,
          event.weaponDrop
            .rarity,
        );

      this.combat?.unlockWeapon(
        event.weaponDrop
          .weaponId,
      );

      weaponDropText =
        `${weaponDrop.rarityName} · ${WEAPON_DEFINITIONS[event.weaponDrop.weaponId].name} Lv.1`;
    }

    const ticketDropped =
      Math.random() <
      MONETIZATION_CONFIG
        .bossTicketDropChance;

    if (ticketDropped) {
      this.gameState.consumables
        .returnTickets += 1;
    }

    const bossXp =
      (
        event.isMain
          ? PLAYER_LEVEL_CONFIG
              .xpRewards
              .mainBossRepeat
          : PLAYER_LEVEL_CONFIG
              .xpRewards
              .sideBossRepeat
      ) +
      (
        firstClear
          ? event.isMain
            ? PLAYER_LEVEL_CONFIG
                .xpRewards
                .mainBossFirstClearBonus
            : PLAYER_LEVEL_CONFIG
                .xpRewards
                .sideBossFirstClearBonus
          : 0
      );

    this.grantPlayerXp(
      bossXp,
    );

    if (firstClear) {
      const gems =
        event.isMain
          ? 20
          : 10;
      this.gameState.premium
        .gems += gems;
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `Первая победа: +${gems} самоцветов`,
      );
    }

    if (
      event.id ===
        'root-colossus' &&
      firstClear
    ) {
      if (
        !this.gameState.world
          .uniqueRewards
          .includes(
            'root-heart',
          )
      ) {
        this.gameState.world
          .uniqueRewards
          .push(
            'root-heart',
          );
      }

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `${event.name} повержен! Кинжалы открыты · Сердце корней получено · теперь можно восстановить мост${ticketDropped ? ' · выпал билет домой' : ''}`,
      );
    } else if (
      event.id ===
        'sun-tyrant' &&
      firstClear
    ) {
      if (
        !this.gameState.world
          .uniqueRewards
          .includes(
            'sun-core',
          )
      ) {
        this.gameState.world
          .uniqueRewards
          .push(
            'sun-core',
          );
      }

      if (
        !this.gameState.world
          .unlockedZones
          .includes(
            'stage-3',
          )
      ) {
        this.gameState.world
          .unlockedZones
          .push(
            'stage-3',
          );
      }

      this.stageTwoGateSystem
        ?.unlock();

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `${event.name} повержен! Молот открыт · Ядро солнца получено · врата в следующую часть мира открыты${ticketDropped ? ' · выпал билет домой' : ''}`,
      );
    } else {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `${event.name} повержен${weaponDropText ? ` · выпало: ${weaponDropText}` : ''}${ticketDropped ? ' · билет домой ×1' : ''} · босс возродится позже`,
      );
    }

    this.pendingBossReward = {
      event,
      ticketDropped,
    };
    this.bossRespawnOfferBlockedUntil =
      Date.now() + 5000;

    if (
      this.rewardedAccessAvailable
    ) {
      const rewardResources =
        {
          ...event.dropResources,
          coins:
            event.dropCoins,
        };
      const pieces = [
        this.formatResources(
          rewardResources,
        ),
        ticketDropped
          ? 'билет домой ×1'
          : '',
      ].filter(Boolean);

      this.setMonetizationOffer({
        placement:
          'boss_reward',
        title:
          'Удвоить обычную награду босса?',
        description:
          'Повторяются ресурсы, монеты и выпавший билет. Оружие, уникальные предметы и прогресс региона не дублируются.',
        rewardText:
          pieces.join(' · '),
      });
    }

    this.applyProgression();
    this.emitProgressionState();
    this.emitPremiumState();
    this.evaluatePremiumAchievements();
    this.emitMonetizationState();
    this.saveState();
  }

  private handleChestOpened(
    rewards: ResourceCounts,
  ): void {
    this.grantPlayerXp(
      PLAYER_LEVEL_CONFIG
        .xpRewards.chest,
    );

    if (
      !this.rewardedAccessAvailable
    ) {
      return;
    }

    this.pendingChestReward = {
      ...rewards,
    };

    this.setMonetizationOffer({
      placement:
        'chest_reward',
      title:
        'Забрать содержимое сундука ещё раз?',
      description:
        'Обычная награда уже ваша. Активируйте бонус, чтобы получить ещё одну такую же.',
      rewardText:
        this.formatResources(
          rewards,
        ),
    });
  }

  private setMonetizationOffer(
    offer:
      NonNullable<
        MonetizationHudState['offer']
      >,
  ): void {
    this.monetizationOffer =
      offer;

    trackAnalyticsEvent(
      'ad_offer_shown',
      {
        placement:
          offer.placement,
        reward:
          offer.rewardText,
      },
    );

    this.emitMonetizationState();
  }

  private clearMonetizationOffer():
    void {
    this.monetizationOffer =
      null;
    this.emitMonetizationState();
  }

  private emitMonetizationState():
    void {
    this.game.events.emit(
      HUD_MONETIZATION_STATE_EVENT,
      this.monetizationHudState,
    );
  }

  private async requestRewarded(
    placement:
      RewardedAdPlacement,
  ): Promise<boolean> {
    if (
      !MONETIZATION_CONFIG.enabled ||
      this.monetizationBusy
    ) {
      return false;
    }

    if (this.adFreeActive) {
      trackAnalyticsEvent(
        'ad_result',
        {
          placement,
          rewarded: true,
          reason:
            'ad-free-entitlement',
        },
      );
      return true;
    }

    if (
      !this.adsProvider
        .isRewardedAvailable()
    ) {
      return false;
    }

    this.monetizationBusy = true;
    this.emitMonetizationState();

    trackAnalyticsEvent(
      'ad_started',
      {
        placement,
        provider:
          this.adsProvider.name,
      },
    );

    const result =
      await this.adsProvider
        .showRewarded(
          placement,
        );

    trackAnalyticsEvent(
      'ad_result',
      {
        placement,
        rewarded:
          result.rewarded,
        reason:
          result.reason,
      },
    );

    this.monetizationBusy = false;
    this.emitMonetizationState();

    return result.rewarded;
  }

  private async handleMonetizationAction(
    action:
      'watch' | 'dismiss',
    placement:
      MonetizationOfferPlacement,
  ): Promise<void> {
    const offer =
      this.monetizationOffer;

    if (
      !offer ||
      offer.placement !==
        placement ||
      this.monetizationBusy
    ) {
      return;
    }

    if (action === 'dismiss') {
      if (
        placement ===
          'death_revive'
      ) {
        this.resolveHardDeath();
        return;
      }

      if (
        placement ===
          'boss_reward'
      ) {
        this.pendingBossReward =
          undefined;
      } else if (
        placement ===
          'chest_reward'
      ) {
        this.pendingChestReward =
          undefined;
      } else if (
        placement ===
          'boss_respawn'
      ) {
        this.pendingBossRespawnId =
          undefined;
      }

      this.clearMonetizationOffer();
      return;
    }

    const rewarded =
      await this.requestRewarded(
        placement,
      );

    if (!rewarded) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        placement ===
          'death_revive'
          ? 'Воскрешение не получено · можно повторить просмотр или выбрать смерть'
          : 'Награда не получена',
      );

      if (
        placement !==
          'death_revive'
      ) {
        this.clearMonetizationOffer();
      }
      return;
    }

    if (
      placement ===
        'death_revive'
    ) {
      const revived =
        this.combat?.reviveHere(
          MONETIZATION_CONFIG
            .rewardedReviveHealthRatio,
          MONETIZATION_CONFIG
            .rewardedReviveInvulnerabilityMs,
        ) ?? false;

      if (revived) {
        trackAnalyticsEvent(
          'ad_reward_granted',
          {
            placement,
            reward:
              'revive_here',
          },
        );
        this.game.events.emit(
          HUD_NOTICE_EVENT,
          'Воскрешение использовано · следующая смерть окончательная',
        );
      }

      this.clearMonetizationOffer();
      return;
    }

    if (
      placement ===
        'boss_reward'
    ) {
      this.grantBossRewardDuplicate();
    } else if (
      placement ===
        'chest_reward'
    ) {
      this.grantChestRewardDuplicate();
    } else if (
      placement ===
        'boss_respawn'
    ) {
      this.grantBossRespawnReset();
    }

    this.clearMonetizationOffer();
    this.emitProgressionState();
    this.emitCityState();
    this.saveState();
  }

  private grantBossRewardDuplicate():
    void {
    const pending =
      this.pendingBossReward;

    if (
      !pending ||
      !this.gameState
    ) {
      return;
    }

    const { event } =
      pending;
    const repeatedResources:
      ResourceCounts = {
      ...event.dropResources,
      coins:
        event.dropCoins,
    };

    if (
      totalResourceUnits(
        repeatedResources,
      ) > 0
    ) {
      this.resourceSystem
        ?.spawnResourceDrop(
          new Phaser.Math.Vector2(
            event.x,
            event.y,
          ),
          repeatedResources,
        );
    }

    if (pending.ticketDropped) {
      this.gameState.consumables
        .returnTickets += 1;
    }

    trackAnalyticsEvent(
      'ad_reward_granted',
      {
        placement:
          'boss_reward',
        boss:
          event.id,
      },
    );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Награда босса получена повторно',
    );

    this.pendingBossReward =
      undefined;
  }

  private grantChestRewardDuplicate():
    void {
    const reward =
      this.pendingChestReward;

    if (
      !reward ||
      !this.gameState
    ) {
      return;
    }

    if (
      this.backpack
        ?.canAcceptBundle(
          reward,
        )
    ) {
      this.backpack.addBundle(
        reward,
      );
      this.handleBackpackChanged();
    } else {
      for (
        const type of
        RESOURCE_TYPES
      ) {
        this.gameState.resources[
          type
        ] +=
          reward[type] ?? 0;
      }
    }

    trackAnalyticsEvent(
      'ad_reward_granted',
      {
        placement:
          'chest_reward',
        reward:
          this.formatResources(
            reward,
          ),
      },
    );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `Дополнительная награда сундука: ${this.formatResources(reward)}`,
    );

    this.pendingChestReward =
      undefined;
  }

  private grantBossRespawnReset():
    void {
    const bossId =
      this.pendingBossRespawnId;

    if (
      !bossId ||
      !this.gameState ||
      !this.bosses
    ) {
      return;
    }

    if (
      this.bosses.resetRespawn(
        bossId,
      )
    ) {
      this.gameState.world
        .bossRespawnAt[
          bossId
        ] = 0;
      this.gameState.monetization
        .lastBossRespawnAdAt =
          Date.now();

      trackAnalyticsEvent(
        'ad_reward_granted',
        {
          placement:
            'boss_respawn',
          boss:
            bossId,
        },
      );

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Босс возродился · следующий рекламный сброс доступен через час',
      );
    }

    this.pendingBossRespawnId =
      undefined;
  }

  private async handleProductionDouble():
    Promise<void> {
    if (
      !this.gameState ||
      !this.cityBuilderSystem ||
      !this.cityHudState
        .production.canCollect
    ) {
      return;
    }

    const rewarded =
      await this.requestRewarded(
        'production_double',
      );

    if (!rewarded) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Удвоение производства не получено',
      );
      return;
    }

    const collected =
      this.cityBuilderSystem
        .collectProduction(
          this.gameState.resources,
          MONETIZATION_CONFIG
            .productionRewardMultiplier,
        );
    const total =
      this.multiplyResources(
        collected,
        MONETIZATION_CONFIG
          .productionRewardMultiplier,
      );

    trackAnalyticsEvent(
      'ad_reward_granted',
      {
        placement:
          'production_double',
        reward:
          this.formatResources(
            total,
          ),
      },
    );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `Производство ×2: ${this.formatResources(total)}`,
    );

    this.emitCityState();
    this.emitProgressionState();
    this.saveState();
  }

  private async handleBlessingRequest(
    kind: BlessingKind,
  ): Promise<void> {
    if (!this.gameState) {
      return;
    }

    const rewarded =
      await this.requestRewarded(
        'blessing',
      );

    if (!rewarded) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Благословение не получено',
      );
      return;
    }

    this.gameState.monetization
      .activeBlessing = {
        kind,
        expiresAt:
          Date.now() +
          MONETIZATION_CONFIG
            .blessingDurationMs,
      };

    this.applyMetaProgression();

    trackAnalyticsEvent(
      'ad_reward_granted',
      {
        placement:
          'blessing',
        kind,
      },
    );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Благословение активно 3 минуты',
    );

    this.saveState();
    this.emitMonetizationState();
  }

  private applyMetaProgression():
    void {
    if (!this.gameState) {
      return;
    }

    const state =
      this.gameState;
    const blessing =
      state.monetization
        .activeBlessing;
    const activeBlessing =
      blessing &&
      blessing.expiresAt >
        Date.now()
        ? blessing
        : null;

    if (
      blessing &&
      !activeBlessing
    ) {
      state.monetization
        .activeBlessing = null;
    }

    const mastery =
      state.progression
        .masteryRanks;
    const skin =
      getEquippedSkinBonus(
        state,
      );

    const skinBonus =
      skin.multiplier - 1;

    const damageMultiplier =
      1 +
      mastery.combat *
        PLAYER_MASTERY
          .combat
          .effectPerRank
          .damageMultiplier +
      (
        skin.stat === 'damage'
          ? skinBonus
          : 0
      ) +
      (
        activeBlessing?.kind ===
          'damage'
          ? MONETIZATION_CONFIG
              .blessingDamageMultiplier -
            1
          : 0
      );

    const healthMultiplier =
      1 +
      mastery.vitality *
        PLAYER_MASTERY
          .vitality
          .effectPerRank
          .maxHealthMultiplier +
      (
        skin.stat ===
          'max-health'
          ? skinBonus
          : 0
      ) +
      (
        activeBlessing?.kind ===
          'health'
          ? MONETIZATION_CONFIG
              .blessingHealthMultiplier -
            1
          : 0
      );

    const speedMultiplier =
      1 +
      mastery.mobility *
        PLAYER_MASTERY
          .mobility
          .effectPerRank
          .moveSpeedMultiplier +
      (
        skin.stat ===
          'move-speed'
          ? skinBonus
          : 0
      ) +
      (
        activeBlessing?.kind ===
          'speed'
          ? MONETIZATION_CONFIG
              .blessingSpeedMultiplier -
            1
          : 0
      );

    const dashCooldownMultiplier =
      Math.max(
        0.5,
        1 +
          mastery.mobility *
            PLAYER_MASTERY
              .mobility
              .effectPerRank
              .dashCooldownMultiplier,
      );

    const gatheringMultiplier =
      1 +
      mastery.gathering *
        PLAYER_MASTERY
          .gathering
          .effectPerRank
          .gatheringYieldMultiplier +
      (
        skin.stat ===
          'gathering'
          ? skinBonus
          : 0
      ) +
      (
        activeBlessing?.kind ===
          'gathering'
          ? MONETIZATION_CONFIG
              .blessingGatheringMultiplier -
            1
          : 0
      );

    const settlementBonus =
      mastery.settlement *
        PLAYER_MASTERY
          .settlement
          .effectPerRank
          .productionMultiplier;
    const skinProductionBonus =
      skin.stat ===
        'production'
        ? skinBonus
        : 0;

    const productionMultiplier =
      1 +
      settlementBonus +
      skinProductionBonus;
    const capacityMultiplier =
      1 +
      mastery.settlement *
        PLAYER_MASTERY
          .settlement
          .effectPerRank
          .productionCapacityMultiplier;

    this.player
      ?.setMetaModifiers(
        speedMultiplier,
        dashCooldownMultiplier,
      );
    this.player
      ?.setCosmeticTint(
        skin.tint,
      );
    this.resourceSystem
      ?.setGatheringMultiplier(
        gatheringMultiplier,
      );

    const petId =
      state.premium
        .equippedPet;
    const pet =
      petId &&
      petId in PETS
        ? PETS[
            petId as
              PetId
          ]
        : null;

    this.resourceSystem
      ?.setPickupRangeMultiplier(
        pet?.pickupRangeMultiplier ??
          1,
      );

    this.combat
      ?.setTemporaryModifiers(
        damageMultiplier,
        healthMultiplier,
        state.player
          .maxHealthLevel,
      );

    this.cityBuilderSystem
      ?.setMetaMultipliers(
        productionMultiplier,
        capacityMultiplier,
      );

    const themeId =
      state.premium
        .equippedSettlementTheme;
    const theme =
      themeId in
        SETTLEMENT_THEMES
        ? SETTLEMENT_THEMES[
            themeId as
              SettlementThemeId
          ]
        : SETTLEMENT_THEMES
            .default;

    this.cityBuilderSystem
      ?.setThemeTint(
        theme.tint,
      );
  }

  private updateMonetizationTimers():
    void {
    const now =
      Date.now();

    if (
      now -
        this.lastMonetizationTickAt <
      500
    ) {
      return;
    }

    this.lastMonetizationTickAt =
      now;

    const blessing =
      this.gameState
        ?.monetization
        .activeBlessing;

    if (
      blessing &&
      blessing.expiresAt <=
        now
    ) {
      if (this.gameState) {
        this.gameState.monetization
          .activeBlessing = null;
      }
      this.applyMetaProgression();
      this.saveState();
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Благословение закончилось',
      );
    }

    this.updateBossRespawnOffer();
    this.emitMonetizationState();
  }

  private updateBossRespawnOffer():
    void {
    if (
      !MONETIZATION_CONFIG.enabled ||
      !this.player ||
      !this.bosses ||
      !this.gameState ||
      !this.rewardedAccessAvailable
    ) {
      return;
    }

    if (
      this.monetizationOffer &&
      this.monetizationOffer
        .placement !==
        'boss_respawn'
    ) {
      return;
    }

    const cooldownRemaining =
      this.monetizationHudState
        .bossRespawnResetCooldownRemainingMs;

    if (
      cooldownRemaining > 0 ||
      Date.now() <
        this.bossRespawnOfferBlockedUntil
    ) {
      if (
        this.monetizationOffer
          ?.placement ===
          'boss_respawn'
      ) {
        this.pendingBossRespawnId =
          undefined;
        this.clearMonetizationOffer();
      }
      return;
    }

    const dormant =
      this.bosses
        .getNearestDormant(
          this.player.position,
          190,
        );

    if (!dormant) {
      if (
        this.monetizationOffer
          ?.placement ===
          'boss_respawn'
      ) {
        this.pendingBossRespawnId =
          undefined;
        this.clearMonetizationOffer();
      }
      return;
    }

    if (
      this.pendingBossRespawnId ===
        dormant.id &&
      this.monetizationOffer
        ?.placement ===
        'boss_respawn'
    ) {
      return;
    }

    this.pendingBossRespawnId =
      dormant.id;

    this.setMonetizationOffer({
      placement:
        'boss_respawn',
      title:
        `Возродить: ${dormant.name}`,
      description:
        'Бонус полностью сбросит текущий таймер этого босса. Следующий такой сброс будет доступен через час.',
      rewardText:
        '100% сброс таймера',
    });
  }

  private async handleReturnHomeAction(
    action:
      | 'ticket'
      | 'rewarded'
      | 'buy',
  ): Promise<void> {
    if (
      !this.gameState ||
      !this.player ||
      !this.monetizationHudState
        .canFastReturn
    ) {
      return;
    }

    if (action === 'buy') {
      await this
        .handleBuyReturnTickets();
      return;
    }

    if (
      action === 'ticket' &&
      this.gameState.consumables
        .returnTickets > 0
    ) {
      this.gameState.consumables
        .returnTickets -= 1;
      this.teleportHome();
      return;
    }

    if (
      action === 'rewarded'
    ) {
      const rewarded =
        await this.requestRewarded(
          'return_home',
        );

      if (rewarded) {
        trackAnalyticsEvent(
          'ad_reward_granted',
          {
            placement:
              'return_home',
            reward:
              'teleport_home',
          },
        );
        this.teleportHome();
      }
    }
  }

  private teleportHome(): void {
    if (
      !this.player ||
      !this.gameState
    ) {
      return;
    }

    this.enemies?.resetCombat(
      this.time.now,
    );
    this.bosses?.resetCombat(
      this.time.now,
    );
    this.player.teleport(
      RETURN_POINT.x,
      RETURN_POINT.y,
    );
    this.wasAtReturnPoint =
      false;

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Быстрый возврат в поселение',
    );

    this.saveState();
    this.emitMonetizationState();
  }

  private async handleBuyReturnTickets():
    Promise<void> {
    await this.purchaseProduct(
      MONETIZATION_CONFIG
        .returnTicketProductId,
    );
  }

  private async handleBuyAdFreeWeek():
    Promise<void> {
    await this.purchaseProduct(
      MONETIZATION_CONFIG
        .adFreeWeekProductId,
    );
  }

  private async purchaseProduct(
    productId: string,
  ): Promise<void> {
    if (
      !this.gameState ||
      this.monetizationBusy ||
      !this.purchaseProvider
        .isAvailable()
    ) {
      return;
    }

    this.monetizationBusy = true;
    this.emitMonetizationState();

    const result =
      await this.purchaseProvider
        .purchase(
          productId,
        );

    this.monetizationBusy = false;

    if (!result.success) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Покупка не завершена',
      );
      this.emitMonetizationState();
      return;
    }

    await this.grantPurchase(
      result.receipt,
    );
  }

  private async grantPurchase(
    receipt: PurchaseReceipt,
  ): Promise<void> {
    if (!this.gameState) {
      return;
    }

    const alreadyGranted =
      this.gameState.monetization
        .grantedPurchaseTokens
        .includes(
          receipt.purchaseToken,
        );

    if (!alreadyGranted) {
      if (
        receipt.productId ===
          MONETIZATION_CONFIG
            .returnTicketProductId
      ) {
        this.gameState.consumables
          .returnTickets +=
            MONETIZATION_CONFIG
              .returnTicketPackSize;

        this.game.events.emit(
          HUD_NOTICE_EVENT,
          `Получено билетов домой: ×${MONETIZATION_CONFIG.returnTicketPackSize}`,
        );
      } else if (
        receipt.productId ===
          MONETIZATION_CONFIG
            .adFreeWeekProductId
      ) {
        const base =
          Math.max(
            Date.now(),
            this.gameState
              .monetization
              .adFreeUntil,
          );

        this.gameState.monetization
          .adFreeUntil =
            base +
            MONETIZATION_CONFIG
              .adFreeWeekDurationMs;

        this.game.events.emit(
          HUD_NOTICE_EVENT,
          'Без рекламы активировано на 7 дней · rewarded-награды доступны без просмотра',
        );
      } else {
        const premiumResult =
          applyPremiumPurchase(
            this.gameState,
            receipt.productId,
          );

        if (
          !premiumResult.success
        ) {
          this.game.events.emit(
            HUD_NOTICE_EVENT,
            premiumResult.notice,
          );
          return;
        }

        this.game.events.emit(
          HUD_NOTICE_EVENT,
          premiumResult.notice,
        );
        this.applyMetaProgression();
        this.evaluatePremiumAchievements();
      }

      this.gameState.monetization
        .grantedPurchaseTokens
        .push(
          receipt.purchaseToken,
        );

      this.saveState();
      await flushYandexCloudSave();
    }

    try {
      await this.purchaseProvider
        .consume(
          receipt.purchaseToken,
        );
    } catch {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Покупка начислена · подтверждение будет повторено при следующем запуске',
      );
    }

    this.emitMonetizationState();
    this.emitPremiumState();
    this.emitPlayerProgressState();
  }

  private async reconcilePendingPurchases():
    Promise<void> {
    if (
      !this.gameState ||
      !this.purchaseProvider
        .isAvailable()
    ) {
      return;
    }

    const pending =
      await this.purchaseProvider
        .getPendingPurchases();

    for (
      const receipt of
      pending
    ) {
      await this.grantPurchase(
        receipt,
      );
    }
  }

  private async handleSupplyRequest(
    resource:
      SupplyResourceType,
  ): Promise<void> {
    if (
      !this.gameState ||
      this.monetizationHudState
        .supplyCooldownRemainingMs >
        0
    ) {
      return;
    }

    const rare =
      resource === 'crystal' ||
      resource === 'fiber';

    if (
      rare &&
      !this.gameState.world
        .unlockedZones
        .includes(
          'stage-2',
        )
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Редкое снабжение откроется вместе со вторым регионом',
      );
      return;
    }

    const rewarded =
      await this.requestRewarded(
        'supply',
      );

    if (!rewarded) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Поставка не получена',
      );
      return;
    }

    const amount =
      MONETIZATION_CONFIG
        .supplyRewards[
          resource
        ];

    this.gameState.resources[
      resource
    ] += amount;
    this.gameState.monetization
      .lastSupplyAdAt =
        Date.now();

    trackAnalyticsEvent(
      'ad_reward_granted',
      {
        placement:
          'supply',
        resource,
        amount,
      },
    );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `Снабжение доставлено: ${resource} +${amount}`,
    );

    this.emitProgressionState();
    this.emitCityState();
    this.saveState();
    this.emitMonetizationState();
  }

  private grantPlayerXp(
    amount: number,
  ): void {
    if (!this.gameState) {
      return;
    }

    const result =
      addPlayerXp(
        this.gameState,
        amount,
      );

    if (result.levelsGained > 0) {
      const passNotices =
        claimLevelPassRewards(
          this.gameState,
        );

      this.combat
        ?.restoreForLevelUp();
      this.applyMetaProgression();

      const notices = [
        `Уровень героя: Lv.${this.gameState.progression.playerLevel} · +${result.gemsGained} самоцветов`,
        ...result
          .milestoneMessages,
        ...passNotices,
      ];

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        notices.join(' · '),
      );

      trackAnalyticsEvent(
        'player_level_up',
        {
          level:
            this.gameState
              .progression
              .playerLevel,
          levelsGained:
            result.levelsGained,
        },
      );
    }

    this.emitPlayerProgressState();
    this.emitPremiumState();
    this.saveState();
  }

  private emitPlayerProgressState():
    void {
    this.game.events.emit(
      HUD_PLAYER_PROGRESS_STATE_EVENT,
      this.playerProgressHudState,
    );
  }

  private emitPremiumState(): void {
    this.game.events.emit(
      HUD_PREMIUM_STATE_EVENT,
      this.premiumHudState,
    );
  }

  private evaluatePremiumAchievements():
    void {
    if (!this.gameState) {
      return;
    }

    const notices =
      evaluateAchievements(
        this.gameState,
      );

    if (notices.length > 0) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        notices.join(' · '),
      );
      this.emitPremiumState();
      this.emitPlayerProgressState();
    }
  }

  private handleMasterySpend(
    id: PlayerMasteryId,
  ): void {
    if (!this.gameState) {
      return;
    }

    const result =
      spendMasteryPoint(
        this.gameState,
        id,
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      result.notice,
    );

    if (!result.success) {
      return;
    }

    this.applyMetaProgression();
    this.emitPlayerProgressState();
    this.emitCityState();
    this.saveState();
  }

  private async handleSkinChestOpen(
    tier: SkinChestTier,
    mode:
      | 'gems'
      | 'rewarded'
      | 'free',
  ): Promise<void> {
    if (!this.gameState) {
      return;
    }

    if (mode === 'rewarded') {
      if (
        tier !== 'common' ||
        getRewardedCommonChestRemaining(
          this.gameState,
        ) <= 0
      ) {
        this.game.events.emit(
          HUD_NOTICE_EVENT,
          'Лимит рекламных Common-сундуков на сегодня исчерпан',
        );
        this.emitPremiumState();
        return;
      }

      const rewarded =
        await this.requestRewarded(
          'skin_chest',
        );

      if (!rewarded) {
        this.game.events.emit(
          HUD_NOTICE_EVENT,
          'Сундук не открыт',
        );
        return;
      }
    }

    const result =
      openSkinChest(
        this.gameState,
        tier,
        mode,
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      result.notice,
    );

    if (!result.success) {
      this.emitPremiumState();
      return;
    }

    if (result.unlocked) {
      this.applyMetaProgression();
    }

    this.evaluatePremiumAchievements();
    this.emitPremiumState();
    this.emitPlayerProgressState();
    this.saveState();

    trackAnalyticsEvent(
      'skin_chest_opened',
      {
        tier,
        mode,
        rarity:
          result.rarity ??
          'none',
        skinId:
          result.skinId ??
          'none',
      },
    );
  }

  private handleSkinEquip(
    skinId: SkinId | null,
  ): void {
    if (!this.gameState) {
      return;
    }

    const result =
      equipSkin(
        this.gameState,
        skinId,
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      result.notice,
    );

    if (!result.success) {
      return;
    }

    this.applyMetaProgression();
    this.emitPremiumState();
    this.saveState();
  }

  private async handlePremiumPurchase(
    productId: string,
  ): Promise<void> {
    if (!this.gameState) {
      return;
    }

    if (
      productId ===
        'starter_pack' &&
      this.gameState.premium
        .starterPackOwned
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Стартовый набор уже получен',
      );
      return;
    }

    if (
      productId ===
        'level_pass' &&
      this.gameState.premium
        .levelPassOwned
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Level Pass уже активен',
      );
      return;
    }

    if (
      productId ===
        'region_pack_stage_2'
    ) {
      if (
        this.gameState.premium
          .regionPacksOwned
          .includes(
            productId,
          )
      ) {
        this.game.events.emit(
          HUD_NOTICE_EVENT,
          'Набор региона уже получен',
        );
        return;
      }

      if (
        !this.gameState.world
          .unlockedZones
          .includes(
            'stage-2',
          )
      ) {
        this.game.events.emit(
          HUD_NOTICE_EVENT,
          'Сначала откройте второй регион',
        );
        return;
      }
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
          definition.productId ===
            productId,
      );

    if (
      legendary &&
      this.gameState.premium
        .unlockedSkinIds
        .includes(
          legendary[0],
        )
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Этот Legendary скин уже открыт',
      );
      return;
    }

    await this.purchaseProduct(
      productId,
    );
  }

  private handleSettlementTheme(
    id: SettlementThemeId,
  ): void {
    if (!this.gameState) {
      return;
    }

    const result =
      buySettlementTheme(
        this.gameState,
        id,
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      result.notice,
    );

    if (!result.success) {
      return;
    }

    this.applyMetaProgression();
    this.emitPremiumState();
    this.saveState();
  }

  private handlePet(
    id: PetId,
  ): void {
    if (!this.gameState) {
      return;
    }

    const result =
      buyPet(
        this.gameState,
        id,
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      result.notice,
    );

    if (!result.success) {
      return;
    }

    this.applyMetaProgression();
    this.emitPremiumState();
    this.saveState();
  }

  private updateSettlement(): void {
    if (
      !this.player ||
      !this.settlementSystem
    ) {
      return;
    }

    if (
      this.settlementSystem.update(
        this.player.position,
      )
    ) {
      this.game.events.emit(
        HUD_SETTLEMENT_STATE_EVENT,
        this.settlementHudState,
      );
    }
  }

  private handleForgeRepair(): void {
    if (
      !this.gameState ||
      !this.settlementSystem
    ) {
      return;
    }

    const result =
      this.settlementSystem
        .attemptForgeRepair(
          this.gameState.resources,
        );

    if (!result.success) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        result.reason ===
          'already-restored'
          ? 'Кузница уже восстановлена'
          : 'Не хватает ресурсов на следующий этап ремонта',
      );
      return;
    }

    this.gameState.settlement
      .repairStages.forge =
        result.newStage;

    if (result.completed) {
      this.gameState.settlement
        .buildings.forge =
          Math.max(
            1,
            this.gameState
              .settlement
              .buildings.forge,
          );
      this.gameState.settlement
        .level =
          Math.max(
            1,
            this.gameState
              .settlement.level,
          );
      this.gameState.progression
        .settlementXp += 100;

      if (
        !this.gameState.quests
          .completedIds
          .includes(
            'restore-forge',
          )
      ) {
        this.gameState.quests
          .completedIds
          .push(
            'restore-forge',
          );
      }

      if (
        this.gameState.quests
          .activeId ===
        'restore-forge'
      ) {
        this.gameState.quests
          .activeId = null;
      }

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Кузница восстановлена! В поселении появился кузнец',
      );
    } else {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `Ремонт кузницы: этап ${result.newStage} / 3`,
      );
    }

    this.game.events.emit(
      HUD_GATHERING_STATE_EVENT,
      this.gatheringHudState,
    );
    this.game.events.emit(
      HUD_SETTLEMENT_STATE_EVENT,
      this.settlementHudState,
    );
    this.game.events.emit(
      HUD_UPGRADE_STATE_EVENT,
      this.upgradeHudState,
    );

    this.saveState();
  }

  private handlePlayerUpgrade(
    id: PlayerUpgradeId,
  ): void {
    if (
      !this.gameState ||
      !this.settlementSystem
        ?.restored
    ) {
      return;
    }

    const levelKey:
      keyof Pick<
        GameState['player'],
        | 'maxHealthLevel'
        | 'moveSpeedLevel'
        | 'backpackLevel'
        | 'dashLevel'
      > =
        id === 'max-health'
          ? 'maxHealthLevel'
          : id === 'move-speed'
            ? 'moveSpeedLevel'
            : id === 'backpack'
              ? 'backpackLevel'
              : 'dashLevel';

    const currentLevel =
      this.gameState.player[
        levelKey
      ];
    const cost =
      getPlayerUpgradeCost(
        id,
        currentLevel,
      );

    if (
      !canAffordUpgrade(
        this.gameState.resources,
        cost,
      ) ||
      !cost
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        cost
          ? 'Не хватает ресурсов для улучшения'
          : 'Достигнут максимальный уровень',
      );
      return;
    }

    spendUpgradeCost(
      this.gameState.resources,
      cost,
    );
    this.gameState.player[
      levelKey
    ] =
      currentLevel + 1;

    this.applyProgression();

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Улучшение героя выполнено',
    );
    this.emitProgressionState();
    this.saveState();
  }

  private handleWeaponUpgrade(
    weaponId: WeaponId,
  ): void {
    if (
      !this.gameState ||
      !this.settlementSystem
        ?.restored ||
      !this.combat?.state
        .unlockedWeaponIds
        .includes(weaponId)
    ) {
      return;
    }

    const profile =
      getEquippedWeaponProfile(
        this.gameState.player
          .weaponInventory,
        weaponId,
      );
    const cost =
      getWeaponUpgradeCost(
        weaponId,
        profile.level,
      );

    if (
      !canAffordUpgrade(
        this.gameState.resources,
        cost,
      ) ||
      !cost
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        cost
          ? 'Не хватает ресурсов для улучшения этого экземпляра оружия'
          : 'Этот экземпляр оружия уже максимального уровня',
      );
      return;
    }

    spendUpgradeCost(
      this.gameState.resources,
      cost,
    );

    const newLevel =
      upgradeEquippedWeaponLevel(
        this.gameState.player
          .weaponInventory,
        weaponId,
      );

    if (!newLevel) {
      return;
    }

    // Keep the old family level only as a migration/cache field.
    this.gameState.player
      .weaponLevels[
        weaponId
      ] =
        newLevel;

    this.applyProgression();

    const updated =
      getEquippedWeaponProfile(
        this.gameState.player
          .weaponInventory,
        weaponId,
      );
    const multiplier =
      getWeaponDamageMultiplier(
        updated.level,
        updated.rarity,
        updated.stars,
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `${WEAPON_DEFINITIONS[weaponId].name} улучшен до Lv.${newLevel} · ${WEAPON_RARITIES[updated.rarity].name} ${'★'.repeat(updated.stars)} · сила ×${multiplier.toFixed(2)}`,
    );
    this.emitProgressionState();
    this.saveState();
  }

  private handleWeaponVariantSelect(
    weaponId: WeaponId,
    rarity: WeaponRarityId,
    stars: number,
  ): void {
    if (
      !this.gameState ||
      !equipWeaponVariant(
        this.gameState.player
          .weaponInventory,
        weaponId,
        rarity,
        stars,
      )
    ) {
      return;
    }

    this.combat?.unlockWeapon(
      weaponId,
    );
    this.applyProgression();

    const profile =
      getEquippedWeaponProfile(
        this.gameState.player
          .weaponInventory,
        weaponId,
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `Выбрано: ${WEAPON_RARITIES[profile.rarity].name} · ${WEAPON_DEFINITIONS[weaponId].name} Lv.${profile.level} ${'★'.repeat(profile.stars)}`,
    );

    this.emitProgressionState();
    this.saveState();
  }

  private handleWeaponFuse(
    weaponId: WeaponId,
    rarity: WeaponRarityId,
    stars: number,
  ): void {
    if (
      !this.gameState ||
      !this.settlementSystem
        ?.restored
    ) {
      return;
    }

    const options =
      listOwnedWeaponOptions(
        this.gameState.player
          .weaponInventory,
        weaponId,
      );
    const option =
      options.find(
        (candidate) =>
          candidate.rarity ===
            rarity &&
          candidate.stars ===
            stars,
      );

    if (!option) {
      return;
    }

    const profile:
      EquippedWeaponProfile = {
      weaponId,
      rarity,
      level: option.level,
      stars,
    };

    if (
      !canFuseWeapon(
        this.gameState.player
          .weaponInventory,
        profile,
      )
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Для слияния нужны два одинаковых оружия той же редкости и той же звёздности',
      );
      return;
    }

    const fused =
      fuseWeapon(
        this.gameState.player
          .weaponInventory,
        profile,
      );

    if (!fused) {
      return;
    }

    this.applyProgression();

    const multiplier =
      getWeaponDamageMultiplier(
        fused.level,
        fused.rarity,
        fused.stars,
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `${WEAPON_DEFINITIONS[weaponId].name}: ${WEAPON_RARITIES[fused.rarity].name} теперь ${'★'.repeat(fused.stars)} · сила ×${multiplier.toFixed(2)}`,
    );

    this.emitProgressionState();
    this.saveState();
  }

  private applyProgression(): void {
    if (!this.gameState) {
      return;
    }

    this.player?.setProgression(
      this.gameState.player
        .moveSpeedLevel,
      this.gameState.player
        .dashLevel,
    );

    this.backpack?.setLevel(
      this.gameState.player
        .backpackLevel,
    );

    this.combat?.setProgression(
      this.gameState.player
        .maxHealthLevel,
      this.weaponCombatProfiles,
    );

    this.applyMetaProgression();
  }

  private emitProgressionState(): void {
    this.game.events.emit(
      HUD_GATHERING_STATE_EVENT,
      this.gatheringHudState,
    );
    this.game.events.emit(
      HUD_SETTLEMENT_STATE_EVENT,
      this.settlementHudState,
    );
    this.game.events.emit(
      HUD_UPGRADE_STATE_EVENT,
      this.upgradeHudState,
    );
  }

  private updateCityBuilder(): void {
    if (
      !this.cityBuilderSystem ||
      !this.gameState
    ) {
      return;
    }

    const produced =
      this.cityBuilderSystem
        .updateProduction(
          Date.now(),
        );

    if (produced) {
      this.gameState.settlement
        .level =
          this.cityBuilderSystem
            .computeSettlementLevel();
      this.saveState();
    }

    const state =
      this.cityHudState;
    const signature =
      JSON.stringify(state);

    if (
      signature ===
      this.cityHudSignature
    ) {
      return;
    }

    this.cityHudSignature =
      signature;
    this.game.events.emit(
      HUD_CITY_STATE_EVENT,
      state,
    );
  }

  private handleCityUpgrade(
    id: CityBuildingId,
  ): void {
    if (
      !this.gameState ||
      !this.cityBuilderSystem
    ) {
      return;
    }

    const result =
      this.cityBuilderSystem
        .attemptUpgrade(
          id,
          this.gameState.resources,
          Date.now(),
        );

    if (!result.success) {
      const message =
        result.reason ===
          'max-level'
          ? 'Здание уже максимального уровня'
          : result.reason ===
              'locked'
            ? 'Сначала выполните требование предыдущего здания'
            : 'Не хватает ресурсов на улучшение здания';

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        message,
      );
      return;
    }

    this.gameState.settlement
      .repairStages[id] = 3;
    this.gameState.settlement
      .level =
        this.cityBuilderSystem
          .computeSettlementLevel();
    this.gameState.progression
      .settlementXp +=
        15 *
        result.newLevel;

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `Поселение: ${id} улучшено до Lv.${result.newLevel}`,
    );

    this.grantPlayerXp(
      PLAYER_LEVEL_CONFIG
        .xpRewards
        .buildingUpgrade,
    );
    this.evaluatePremiumAchievements();

    this.emitCityState();
    this.emitProgressionState();
    this.saveState();
  }

  private handleCityCollect(): void {
    if (
      !this.gameState ||
      !this.cityBuilderSystem
    ) {
      return;
    }

    const collected =
      this.cityBuilderSystem
        .collectProduction(
          this.gameState.resources,
        );

    if (
      totalResourceUnits(
        collected,
      ) <= 0
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Производство пока пусто',
      );
      return;
    }

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `Производство получено: ${this.formatResources(collected)}`,
    );

    this.emitCityState();
    this.emitProgressionState();
    this.saveState();
  }

  private emitCityState(): void {
    const state =
      this.cityHudState;

    this.cityHudSignature =
      JSON.stringify(state);

    this.game.events.emit(
      HUD_CITY_STATE_EVENT,
      state,
    );
  }

  private updateForestObjective(): void {
    if (
      !this.player ||
      !this.gameState ||
      this.gameState.world
        .discoveredLandmarks
        .includes(
          'forest-heart',
        )
    ) {
      return;
    }

    const distance =
      Phaser.Math.Distance.Between(
        this.player.position.x,
        this.player.position.y,
        FOREST_HEART.x,
        FOREST_HEART.y,
      );

    if (
      distance >
      FOREST_HEART_DISCOVERY_RADIUS
    ) {
      return;
    }

    this.gameState.world
      .discoveredLandmarks
      .push(
        'forest-heart',
      );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Открыто: Лесной алтарь · цель первой зоны достигнута',
    );

    this.grantPlayerXp(
      PLAYER_LEVEL_CONFIG
        .xpRewards
        .landmarkFirstDiscovery,
    );
    this.evaluatePremiumAchievements();
    this.saveState();
  }

  private updateBridgeRepair(): void {
    if (
      !this.player ||
      !this.gameState ||
      !this.bridgeSystem
    ) {
      return;
    }

    const repairAccess =
      this.gameState.world
        .uniqueRewards
        .includes(
          'root-heart',
        );

    this.bridgeSystem.update(
      this.player.position,
      repairAccess,
    );

    if (
      this.bridgeRepairKey &&
      Phaser.Input.Keyboard.JustDown(
        this.bridgeRepairKey,
      ) &&
      this.bridgeSystem
        .canRepairHere
    ) {
      this.handleBridgeRepair();
    }
  }

  private handleBridgeRepair(): void {
    if (
      !this.gameState ||
      !this.backpack ||
      !this.bridgeSystem ||
      this.bridgeSystem.isUnlocked ||
      !this.gameState.world
        .uniqueRewards
        .includes(
          'root-heart',
        ) ||
      !this.bridgeSystem
        .canRepairHere
    ) {
      return;
    }

    if (
      !this.backpack.spend(
        BRIDGE_REPAIR_COST,
      )
    ) {
      const carried =
        this.backpack.state
          .carried;

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `Для моста нужно: 20 дерева · 10 камня · 4 металла. В рюкзаке: ${carried.wood} / ${carried.stone} / ${carried.metal}`,
      );
      return;
    }

    this.gameState.settlement
      .buildings.bridge = 1;
    this.gameState.settlement
      .repairStages.bridge = 3;

    if (
      !this.gameState.world
        .unlockedZones
        .includes(
          'stage-2',
        )
    ) {
      this.gameState.world
        .unlockedZones
        .push(
          'stage-2',
        );
    }

    this.bridgeSystem.unlock(
      true,
    );

    this.handleBackpackChanged();

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Мост восстановлен из ресурсов рюкзака · проход во вторую зону открыт',
    );
  }

  private updateStageTwoTransition(): void {
    if (
      !this.player ||
      !this.gameState ||
      !this.bridgeSystem
        ?.isUnlocked ||
      !this.bridgeSystem
        .isStageTwoEntryReached(
          this.player.position,
        ) ||
      this.gameState.world
        .discoveredLandmarks
        .includes(
          'stage-2-entry',
        )
    ) {
      return;
    }

    this.gameState.world
      .discoveredLandmarks
      .push(
        'stage-2-entry',
      );

    this.gameState.premium
      .gems += 25;
    this.grantPlayerXp(
      PLAYER_LEVEL_CONFIG
        .xpRewards
        .landmarkFirstDiscovery,
    );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Открыт новый регион · +25 самоцветов',
    );

    this.emitPremiumState();
    this.evaluatePremiumAchievements();
    this.saveState();
  }

  private updateStageThreeTransition(): void {
    if (
      !this.player ||
      !this.gameState ||
      !this.stageTwoGateSystem
        ?.isUnlocked ||
      !this.stageTwoGateSystem
        .isStageThreeEntryReached(
          this.player.position,
        ) ||
      this.gameState.world
        .discoveredLandmarks
        .includes(
          'stage-3-entry',
        )
    ) {
      return;
    }

    this.gameState.world
      .discoveredLandmarks
      .push(
        'stage-3-entry',
      );

    this.gameState.premium
      .gems += 25;
    this.grantPlayerXp(
      PLAYER_LEVEL_CONFIG
        .xpRewards
        .landmarkFirstDiscovery,
    );

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Открыт следующий регион · +25 самоцветов',
    );

    this.emitPremiumState();
    this.evaluatePremiumAchievements();
    this.saveState();
  }

  private handleWeaponKeys(): void {
    for (
      const weaponId of
      WEAPON_ORDER
    ) {
      const key =
        this.weaponKeys[
          weaponId
        ];

      if (
        key &&
        Phaser.Input.Keyboard.JustDown(
          key,
        )
      ) {
        this.combat?.setWeapon(
          weaponId,
        );
      }
    }
  }

  private handleHudWeaponSelect(
    weaponId: WeaponId,
  ): void {
    this.combat?.setWeapon(
      weaponId,
    );
  }

  private updateAreaName(): void {
    if (!this.player) {
      return;
    }

    const areaName =
      getAreaName(
        this.player.position,
      );

    if (
      areaName ===
      this.lastAreaName
    ) {
      return;
    }

    this.lastAreaName =
      areaName;

    this.game.events.emit(
      HUD_AREA_EVENT,
      areaName,
    );
  }

  private saveState(): void {
    if (!this.gameState) {
      return;
    }

    if (this.player) {
      this.gameState.world
        .playerPosition = {
          x: this.player.position.x,
          y: this.player.position.y,
        };
    }

    if (this.backpack) {
      const carried =
        this.backpack.state
          .carried;

      this.gameState.backpack = {
        wood: carried.wood,
        stone: carried.stone,
        metal: carried.metal,
        crystal:
          carried.crystal ?? 0,
        fiber:
          carried.fiber ?? 0,
        coins: carried.coins,
      };
    }

    this.gameState =
      this.stateStore.save(
        this.gameState,
      );
  }

  private handleResize(): void {
    configureLogicalCamera(this);

    if (this.player) {
      this.cameras.main
        .setBounds(
          0,
          0,
          WORLD_WIDTH,
          WORLD_HEIGHT,
        )
        .startFollow(
          this.player.sprite,
          true,
          0.1,
          0.1,
        );
    }
  }

  private cleanup(): void {
    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResize,
      this,
    );

    this.game.events.off(
      HUD_WEAPON_SELECT_EVENT,
      this.handleHudWeaponSelect,
      this,
    );
    this.game.events.off(
      HUD_FORGE_REPAIR_EVENT,
      this.handleForgeRepair,
      this,
    );
    this.game.events.off(
      HUD_PLAYER_UPGRADE_EVENT,
      this.handlePlayerUpgrade,
      this,
    );
    this.game.events.off(
      HUD_WEAPON_UPGRADE_EVENT,
      this.handleWeaponUpgrade,
      this,
    );
    this.game.events.off(
      HUD_WEAPON_VARIANT_SELECT_EVENT,
      this.handleWeaponVariantSelect,
      this,
    );
    this.game.events.off(
      HUD_WEAPON_FUSE_EVENT,
      this.handleWeaponFuse,
      this,
    );
    this.game.events.off(
      HUD_BESTIARY_CLAIM_EVENT,
      this.handleBestiaryClaim,
      this,
    );
    this.game.events.off(
      HUD_HEALTH_POTION_EVENT,
      this.handleHealthPotionUse,
      this,
    );
    this.game.events.off(
      HUD_CITY_UPGRADE_EVENT,
      this.handleCityUpgrade,
      this,
    );
    this.game.events.off(
      HUD_CITY_COLLECT_EVENT,
      this.handleCityCollect,
      this,
    );
    this.game.events.off(
      HUD_CITY_PRODUCTION_DOUBLE_EVENT,
      this.handleProductionDouble,
      this,
    );
    this.game.events.off(
      HUD_RETURN_HOME_EVENT,
      this.handleReturnHomeAction,
      this,
    );
    this.game.events.off(
      HUD_BLESSING_EVENT,
      this.handleBlessingRequest,
      this,
    );
    this.game.events.off(
      HUD_SUPPLY_EVENT,
      this.handleSupplyRequest,
      this,
    );
    this.game.events.off(
      HUD_BUY_AD_FREE_WEEK_EVENT,
      this.handleBuyAdFreeWeek,
      this,
    );
    this.game.events.off(
      HUD_MONETIZATION_ACTION_EVENT,
      this.handleMonetizationAction,
      this,
    );
    this.game.events.off(
      HUD_MASTERY_SPEND_EVENT,
      this.handleMasterySpend,
      this,
    );
    this.game.events.off(
      HUD_SKIN_CHEST_OPEN_EVENT,
      this.handleSkinChestOpen,
      this,
    );
    this.game.events.off(
      HUD_SKIN_EQUIP_EVENT,
      this.handleSkinEquip,
      this,
    );
    this.game.events.off(
      HUD_PREMIUM_PURCHASE_EVENT,
      this.handlePremiumPurchase,
      this,
    );
    this.game.events.off(
      HUD_SETTLEMENT_THEME_EVENT,
      this.handleSettlementTheme,
      this,
    );
    this.game.events.off(
      HUD_PET_EVENT,
      this.handlePet,
      this,
    );

    this.scene.stop(
      'HudScene',
    );

    this.resourceSystem?.destroy();
    this.resourceSystem =
      undefined;

    this.bridgeSystem?.destroy();
    this.bridgeSystem =
      undefined;

    this.stageTwoGateSystem?.destroy();
    this.stageTwoGateSystem =
      undefined;

    this.chestSystem?.destroy();
    this.chestSystem =
      undefined;

    this.bestiarySystem =
      undefined;
    this.bestiaryHudState =
      undefined;

    this.settlementSystem?.destroy();
    this.settlementSystem =
      undefined;

    this.cityBuilderSystem?.destroy();
    this.cityBuilderSystem =
      undefined;

    this.combat?.destroy();
    this.combat = undefined;

    this.bosses?.destroy();
    this.bosses = undefined;

    this.enemies?.destroy();
    this.enemies = undefined;

    this.player?.destroy();
    this.player = undefined;

    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;
  }
}
