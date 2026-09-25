import Phaser from 'phaser';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  configureLogicalCamera,
} from '../game/layout/Viewport';
import type {
  CombatState,
} from '../game/combat/CombatSystem';
import {
  type WeaponId,
} from '../game/combat/WeaponDefinitions';
import {
  HUD_AREA_EVENT,
  HUD_BESTIARY_CLAIM_EVENT,
  HUD_BESTIARY_STATE_EVENT,
  HUD_CITY_COLLECT_EVENT,
  HUD_CITY_PRODUCTION_DOUBLE_EVENT,
  HUD_CITY_STATE_EVENT,
  HUD_CITY_UPGRADE_EVENT,
  HUD_COMBAT_STATE_EVENT,
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
  HUD_SHARD_SHOP_BUY_EVENT,
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
  HUD_CHARACTER_STATE_EVENT,
  HUD_WEAPON_SLOT_EQUIP_EVENT,
  HUD_WEAPON_SLOT_CLEAR_EVENT,
  HUD_WEAPON_SLOT_PRIMARY_EVENT,
  type BlessingKind,
  type CharacterHudState,
  type GatheringHudState,
  type MonetizationHudState,
  type PlayerProgressHudState,
  type PremiumHudState,
  type SupplyResourceType,
  type UpgradeHudState,
} from '../game/ui/HudEvents';
import type {
  SettlementHudState,
} from '../game/settlement/SettlementSystem';
import type {
  QuestHudState,
} from '../game/quests/QuestDirector';
import type {
  BestiaryHudEntry,
  BestiaryHudState,
} from '../game/bestiary/BestiarySystem';
import type {
  CityBuilderHudState,
  CityBuildingId,
} from '../game/settlement/CityBuilderSystem';
import {
  YANDEX_PLATFORM_STATE_EVENT,
  getYandexPlatformState,
  requestYandexAuthorization,
  type YandexPlatformState,
} from '../platform/yandex/YandexPlatform';
import {
  MAX_PLAYER_UPGRADE_LEVEL,
  getPlayerUpgradeCost,
  getWeaponFusionCost,
  getWeaponUpgradeCost,
  canAffordUpgrade,
  type PlayerUpgradeId,
} from '../game/progression/UpgradeBalance';
import {
  MAX_WEAPON_LEVEL,
  MAX_WEAPON_STARS,
  WEAPON_RARITIES,
  getWeaponSlotUnlockLevel,
} from '../game/progression/WeaponInventory';
import {
  WEAPON_DEFINITIONS,
} from '../game/combat/WeaponDefinitions';
import {
  MONETIZATION_CONFIG,
} from '../game/monetization/MonetizationConfig';
import {
  PLAYER_MASTERY,
  type PlayerMasteryId,
} from '../game/progression/PlayerLevelBalance';
import {
  SKIN_CHESTS,
  SKIN_DEFINITIONS,
  SKIN_RARITIES,
  type SkinId,
} from '../game/cosmetics/SkinEconomy';
import {
  FOUNDER_PACK,
  LEVEL_PASS,
  STARTER_PACK,
} from '../game/cosmetics/PremiumStoreConfig';

const WEAPON_ICON_TEXTURES:
  Record<WeaponId, string> = {
  axe: 'ruinstead-player-axe-v3',
  sword: 'ruinstead-player-sword-v3',
  hammer: 'ruinstead-player-hammer-v3',
  spear: 'ruinstead-player-spear-v3',
  daggers: 'ruinstead-player-daggers-v3',
};

type HudSceneData = {
  initialCombatState:
    CombatState;
  initialGatheringState:
    GatheringHudState;
  initialSettlementState:
    SettlementHudState;
  initialUpgradeState:
    UpgradeHudState;
  initialQuestState:
    QuestHudState;
  initialBestiaryState:
    BestiaryHudState;
  initialCityState:
    CityBuilderHudState;
  initialMonetizationState:
    MonetizationHudState;
  initialPlayerProgressState:
    PlayerProgressHudState;
  initialPremiumState:
    PremiumHudState;
  initialCharacterState:
    CharacterHudState;
  initialAreaName: string;
};

export class HudScene
  extends Phaser.Scene {
  private initialCombatState?:
    CombatState;
  private initialGatheringState?:
    GatheringHudState;
  private initialSettlementState?:
    SettlementHudState;
  private settlementState?:
    SettlementHudState;
  private upgradeState?:
    UpgradeHudState;
  private questState?:
    QuestHudState;
  private bestiaryState?:
    BestiaryHudState;
  private cityState?:
    CityBuilderHudState;
  private monetizationState:
    MonetizationHudState = {
      enabled:
        MONETIZATION_CONFIG.enabled,
      busy: false,
      returnTickets: 0,
      canFastReturn: false,
      purchaseAvailable: false,
      activeBlessing: null,
      bossRespawnResetCooldownRemainingMs:
        0,
      supplyCooldownRemainingMs:
        0,
      adFreeUntil: 0,
      offer: null,
    };
  private playerProgressState:
    PlayerProgressHudState = {
      level: 1,
      xp: 0,
      xpToNext: 100,
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
  private characterState:
    CharacterHudState = {
      level: 1,
      unlockedSlots: 1,
      primarySlot: 0,
      slots: [
        null,
        null,
        null,
        null,
        null,
      ],
      inventory: [],
      storage: {
        wood: 0,
        stone: 0,
        metal: 0,
        crystal: 0,
        fiber: 0,
        coins: 0,
      },
    };

  private premiumState:
    PremiumHudState = {
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
      founderPackOwned: false,
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
      shardShopOffers: [],
      purchaseCatalog: {},
    };
  private monetizationPanel?:
    Phaser.GameObjects.Container;
  private monetizationText?:
    Phaser.GameObjects.Text;
  private monetizationWatchButton?:
    Phaser.GameObjects.Text;
  private monetizationDismissButton?:
    Phaser.GameObjects.Text;
  private returnHomeButton?:
    Phaser.GameObjects.Text;
  private buyTicketsButton?:
    Phaser.GameObjects.Text;
  private buyAdFreeButton?:
    Phaser.GameObjects.Text;
  private blessingStatusText?:
    Phaser.GameObjects.Text;
  private blessingButtons:
    Partial<
      Record<
        BlessingKind,
        Phaser.GameObjects.Text
      >
    > = {};
  private supplyButtons:
    Partial<
      Record<
        SupplyResourceType,
        Phaser.GameObjects.Text
      >
    > = {};

  private profilePanelOpen = false;
  private profileTab:
    'equipment' | 'mastery' =
      'equipment';
  private profileEquipmentTab?:
    Phaser.GameObjects.Container;
  private profileMasteryTab?:
    Phaser.GameObjects.Container;
  private profileTabButtons:
    Partial<
      Record<
        'equipment' | 'mastery',
        Phaser.GameObjects.Text
      >
    > = {};
  private selectedCharacterSlot = 0;
  private selectedCharacterInventoryIndex = 0;
  private characterInventoryScroll = 0;
  private characterSlotButtons:
    Phaser.GameObjects.Text[] = [];
  private characterInventoryButtons:
    Phaser.GameObjects.Text[] = [];
  private characterWeaponInfoText?:
    Phaser.GameObjects.Text;
  private characterEquipButton?:
    Phaser.GameObjects.Text;
  private characterPrimaryButton?:
    Phaser.GameObjects.Text;
  private characterClearButton?:
    Phaser.GameObjects.Text;
  private characterFuseButton?:
    Phaser.GameObjects.Text;
  private characterInventoryPageText?:
    Phaser.GameObjects.Text;
  private profilePanel?:
    Phaser.GameObjects.Container;
  private profileOpenButton?:
    Phaser.GameObjects.Text;
  private profileProgressText?:
    Phaser.GameObjects.Text;
  private masteryButtons:
    Partial<
      Record<
        PlayerMasteryId,
        Phaser.GameObjects.Text
      >
    > = {};

  private premiumPanelOpen = false;
  private premiumTab:
    'chests' |
    'purchases' |
    'cosmetics' =
      'chests';
  private premiumTabContainers:
    Partial<
      Record<
        'chests' |
        'purchases' |
        'cosmetics',
        Phaser.GameObjects.Container
      >
    > = {};
  private premiumTabButtons:
    Partial<
      Record<
        'chests' |
        'purchases' |
        'cosmetics',
        Phaser.GameObjects.Text
      >
    > = {};
  private premiumPanel?:
    Phaser.GameObjects.Container;
  private premiumOpenButton?:
    Phaser.GameObjects.Text;
  private premiumHeaderText?:
    Phaser.GameObjects.Text;
  private portalCurrencyIcon?:
    Phaser.GameObjects.Image;
  private portalCurrencyLoading =
    false;
  private chestButtons:
    Partial<
      Record<
        string,
        Phaser.GameObjects.Text
      >
    > = {};
  private skinInfoText?:
    Phaser.GameObjects.Text;
  private skinActionButton?:
    Phaser.GameObjects.Text;
  private skinIndex = 0;
  private storeButtons:
    Partial<
      Record<
        string,
        Phaser.GameObjects.Text
      >
    > = {};
  private shardShopButtons:
    Partial<
      Record<
        number,
        Phaser.GameObjects.Text
      >
    > = {};
  private cityPanelOpen = false;
  private cityOpenButton?:
    Phaser.GameObjects.Text;
  private yandexAuthButton?:
    Phaser.GameObjects.Text;
  private yandexPlatformState:
    YandexPlatformState =
      getYandexPlatformState();
  private yandexAuthBusy = false;
  private cityPanel?:
    Phaser.GameObjects.Container;
  private cityHeaderText?:
    Phaser.GameObjects.Text;
  private cityProductionText?:
    Phaser.GameObjects.Text;
  private cityCollectButton?:
    Phaser.GameObjects.Text;
  private cityProductionDoubleButton?:
    Phaser.GameObjects.Text;
  private cityBuildingButtons:
    Partial<
      Record<
        CityBuildingId,
        Phaser.GameObjects.Text
      >
    > = {};
  private bestiaryScrollIndex = 0;
  private bestiaryVisibleButtons:
    Phaser.GameObjects.Text[] = [];
  private bestiaryPageText?:
    Phaser.GameObjects.Text;
  private selectedBestiaryId:
    string | null = null;
  private bestiaryPanelOpen =
    false;
  private forgePanelOpen = false;
  private initialAreaName =
    'Руины поселения';

  private healthFill?:
    Phaser.GameObjects.Rectangle;
  private healthText?:
    Phaser.GameObjects.Text;
  private potionButton?:
    Phaser.GameObjects.Rectangle;
  private potionIcon?:
    Phaser.GameObjects.Image;
  private potionReadyIcon?:
    Phaser.GameObjects.Image;
  private potionCountText?:
    Phaser.GameObjects.Text;
  private potionCooldownUntil = 0;
  private potionCooldownMs = 8000;
  private potionLastKnownCount = 0;
  private areaText?:
    Phaser.GameObjects.Text;
  private noticeText?:
    Phaser.GameObjects.Text;
  private backpackFill?:
    Phaser.GameObjects.Rectangle;
  private backpackText?:
    Phaser.GameObjects.Text;
  private carriedText?:
    Phaser.GameObjects.Text;
  private storageText?:
    Phaser.GameObjects.Text;
  private forgePrompt?:
    Phaser.GameObjects.Rectangle;
  private forgePromptText?:
    Phaser.GameObjects.Text;
  private forgePanel?:
    Phaser.GameObjects.Container;
  private forgeStageText?:
    Phaser.GameObjects.Text;
  private forgeCostText?:
    Phaser.GameObjects.Text;
  private forgeStorageText?:
    Phaser.GameObjects.Text;
  private forgeNpcText?:
    Phaser.GameObjects.Text;
  private forgeRepairButton?:
    Phaser.GameObjects.Rectangle;
  private forgeRepairButtonText?:
    Phaser.GameObjects.Text;
  private upgradeTitle?:
    Phaser.GameObjects.Text;
  private playerUpgradeButtons:
    Partial<
      Record<
        PlayerUpgradeId,
        Phaser.GameObjects.Text
      >
    > = {};
  private weaponUpgradeButton?:
    Phaser.GameObjects.Text;
  private weaponVariantButton?:
    Phaser.GameObjects.Text;
  private weaponFuseButton?:
    Phaser.GameObjects.Text;
  private questTitleText?:
    Phaser.GameObjects.Text;
  private questObjectiveText?:
    Phaser.GameObjects.Text;
  private questProgressText?:
    Phaser.GameObjects.Text;
  private questHintText?:
    Phaser.GameObjects.Text;
  private questOptionalText?:
    Phaser.GameObjects.Text;
  private bestiaryOpenButton?:
    Phaser.GameObjects.Text;
  private bestiaryPanel?:
    Phaser.GameObjects.Container;
  private bestiaryHeaderText?:
    Phaser.GameObjects.Text;
  private bestiaryEntryButtons:
    Record<
      string,
      Phaser.GameObjects.Text
    > = {};
  private bestiaryImage?:
    Phaser.GameObjects.Image;
  private bestiaryEliteImage?:
    Phaser.GameObjects.Image;
  private bestiaryNameText?:
    Phaser.GameObjects.Text;
  private bestiaryLevelText?:
    Phaser.GameObjects.Text;
  private bestiaryDetailsText?:
    Phaser.GameObjects.Text;
  private bestiaryProgressText?:
    Phaser.GameObjects.Text;
  private bestiaryRewardText?:
    Phaser.GameObjects.Text;
  private bestiaryClaimButton?:
    Phaser.GameObjects.Text;

  private weaponSlotButtons:
    Phaser.GameObjects.Rectangle[] = [];
  private weaponSlotIcons:
    Phaser.GameObjects.Image[] = [];
  private weaponSlotLabels:
    Phaser.GameObjects.Text[] = [];

  constructor() {
    super('HudScene');
  }

  init(data: HudSceneData): void {
    this.initialCombatState =
      data.initialCombatState;
    this.initialGatheringState =
      data.initialGatheringState;
    this.initialSettlementState =
      data.initialSettlementState;
    this.upgradeState =
      data.initialUpgradeState;
    this.questState =
      data.initialQuestState;
    this.bestiaryState =
      data.initialBestiaryState;
    this.cityState =
      data.initialCityState;
    this.monetizationState =
      data.initialMonetizationState;
    this.playerProgressState =
      data.initialPlayerProgressState;
    this.premiumState =
      data.initialPremiumState;
    this.characterState =
      data.initialCharacterState;
    this.selectedBestiaryId =
      data.initialBestiaryState
        .entries.find(
          (entry) =>
            entry.discovered,
        )?.entryId ??
      data.initialBestiaryState
        .entries[0]?.entryId ??
      null;
    this.initialAreaName =
      data.initialAreaName;
  }

  create(): void {
    configureLogicalCamera(this);

    this.createTopLeftStatus();
    this.createGatheringPanel();
    this.createWeaponSelector();
    this.createPotionButton();
    this.createSettlementUi();
    this.createQuestPanel();
    this.createBestiaryUi();
    this.createCityBuilderUi();
    this.createYandexPlatformUi();
    this.createProgressionUi();
    this.createPremiumUi();
    this.createNoticeLayer();
    this.createMonetizationUi();

    this.game.events.on(
      HUD_COMBAT_STATE_EVENT,
      this.handleCombatState,
      this,
    );
    this.game.events.on(
      HUD_GATHERING_STATE_EVENT,
      this.handleGatheringState,
      this,
    );
    this.game.events.on(
      HUD_SETTLEMENT_STATE_EVENT,
      this.handleSettlementState,
      this,
    );
    this.game.events.on(
      HUD_UPGRADE_STATE_EVENT,
      this.handleUpgradeState,
      this,
    );
    this.game.events.on(
      HUD_QUEST_STATE_EVENT,
      this.handleQuestState,
      this,
    );
    this.game.events.on(
      HUD_BESTIARY_STATE_EVENT,
      this.handleBestiaryState,
      this,
    );
    this.game.events.on(
      HUD_CITY_STATE_EVENT,
      this.handleCityState,
      this,
    );
    this.game.events.on(
      HUD_MONETIZATION_STATE_EVENT,
      this.handleMonetizationState,
      this,
    );
    this.game.events.on(
      HUD_PLAYER_PROGRESS_STATE_EVENT,
      this.handlePlayerProgressState,
      this,
    );
    this.game.events.on(
      HUD_PREMIUM_STATE_EVENT,
      this.handlePremiumState,
      this,
    );
    this.game.events.on(
      HUD_CHARACTER_STATE_EVENT,
      this.handleCharacterState,
      this,
    );

    window.addEventListener(
      YANDEX_PLATFORM_STATE_EVENT,
      this.handleYandexPlatformState,
    );
    this.game.events.on(
      HUD_AREA_EVENT,
      this.handleAreaName,
      this,
    );
    this.game.events.on(
      HUD_NOTICE_EVENT,
      this.handleNotice,
      this,
    );

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

    this.handleAreaName(
      this.initialAreaName,
    );

    if (
      this.initialCombatState
    ) {
      this.handleCombatState(
        this.initialCombatState,
      );
    }

    if (
      this.initialGatheringState
    ) {
      this.handleGatheringState(
        this.initialGatheringState,
      );
    }

    if (
      this.initialSettlementState
    ) {
      this.handleSettlementState(
        this.initialSettlementState,
      );
    }

    if (this.upgradeState) {
      this.handleUpgradeState(
        this.upgradeState,
      );
    }

    if (this.questState) {
      this.handleQuestState(
        this.questState,
      );
    }

    if (this.bestiaryState) {
      this.handleBestiaryState(
        this.bestiaryState,
      );
    }

    if (this.cityState) {
      this.handleCityState(
        this.cityState,
      );
    }

    this.handleMonetizationState(
      this.monetizationState,
    );
    this.handlePlayerProgressState(
      this.playerProgressState,
    );
    this.handlePremiumState(
      this.premiumState,
    );
    this.handleCharacterState(
      this.characterState,
    );

    this.input.keyboard?.on(
      'keydown-C',
      this.handleCityToggle,
      this,
    );

    this.input.keyboard?.on(
      'keydown-Q',
      this.handleHealthPotionKey,
      this,
    );

    this.input.keyboard?.on(
      'keydown-B',
      this.handleBestiaryToggle,
      this,
    );

    this.input.keyboard?.on(
      'keydown-E',
      this.handleForgeToggle,
      this,
    );
    this.input.keyboard?.on(
      'keydown-P',
      this.handleProfileToggle,
      this,
    );
    this.input.keyboard?.on(
      'keydown-M',
      this.handlePremiumToggle,
      this,
    );
  }

  private createTopLeftStatus(): void {
    this.add
      .rectangle(
        26,
        24,
        276,
        102,
        0x234b2b,
        0.88,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.58,
      )
      .setDepth(100);

    this.areaText = this.add
      .text(
        42,
        38,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#fff7d6',
        },
      )
      .setDepth(101);

    this.add
      .rectangle(
        42,
        76,
        244,
        30,
        0x2b3129,
        0.94,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xffffff,
        0.24,
      )
      .setDepth(101);

    this.healthFill = this.add
      .rectangle(
        47,
        81,
        234,
        20,
        0xf05f62,
        1,
      )
      .setOrigin(0, 0)
      .setDepth(102);

    this.healthText = this.add
      .text(
        164,
        91,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#7a3034',
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(103);
  }

  private createGatheringPanel(): void {
    this.add
      .rectangle(
        26,
        140,
        306,
        118,
        0x234b2b,
        0.88,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.58,
      )
      .setDepth(100);

    this.add
      .text(
        42,
        152,
        'Рюкзак',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#fff7d6',
        },
      )
      .setDepth(101);

    this.add
      .rectangle(
        42,
        179,
        274,
        20,
        0x283128,
        0.92,
      )
      .setOrigin(0, 0)
      .setDepth(101);

    this.backpackFill = this.add
      .rectangle(
        45,
        182,
        268,
        14,
        0x67c96a,
        1,
      )
      .setOrigin(0, 0)
      .setDepth(102);

    this.backpackText = this.add
      .text(
        179,
        189,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
        },
      )
      .setOrigin(0.5)
      .setDepth(103);

    this.carriedText = this.add
      .text(
        42,
        207,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          color: '#fff3cf',
        },
      )
      .setDepth(103);

    this.storageText = this.add
      .text(
        42,
        229,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '12px',
          color: '#cde7c3',
        },
      )
      .setDepth(103);
  }

  private createWeaponSelector(): void {
    const spacing = 76;
    const y =
      LOGICAL_HEIGHT - 50;
    const centerX =
      LOGICAL_WIDTH / 2;
    const panelWidth =
      spacing * 5 + 30;

    this.add
      .rectangle(
        centerX,
        y,
        panelWidth,
        76,
        0x203e27,
        0.92,
      )
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.58,
      )
      .setDepth(100);

    for (
      let slot = 0;
      slot < 5;
      slot += 1
    ) {
      const x =
        centerX +
        (slot - 2) *
          spacing;

      const button =
        this.add
          .rectangle(
            x,
            y,
            62,
            62,
            0x353a37,
            0.9,
          )
          .setStrokeStyle(
            2,
            0x777d78,
            0.6,
          )
          .setDepth(102)
          .setInteractive({
            useHandCursor: true,
          });

      const icon =
        this.add
          .image(
            x,
            y - 4,
            WEAPON_ICON_TEXTURES.axe,
          )
          .setScale(0.56)
          .setDepth(103)
          .setVisible(false);

      const label =
        this.add
          .text(
            x,
            y + 21,
            '',
            {
              fontFamily:
                'system-ui, sans-serif',
              fontSize: '9px',
              fontStyle: 'bold',
              color: '#ffffff',
              backgroundColor:
                '#202924cc',
              padding: {
                x: 4,
                y: 2,
              },
              align: 'center',
            },
          )
          .setOrigin(0.5)
          .setDepth(104);

      this.add
        .text(
          x - 25,
          y - 28,
          String(
            slot + 1,
          ),
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#dce7d7',
          },
        )
        .setOrigin(0.5)
        .setDepth(104);

      button.on(
        Phaser.Input.Events.POINTER_DOWN,
        () => {
          this.game.events.emit(
            HUD_WEAPON_SLOT_PRIMARY_EVENT,
            slot,
          );
        },
      );

      this.weaponSlotButtons.push(
        button,
      );
      this.weaponSlotIcons.push(
        icon,
      );
      this.weaponSlotLabels.push(
        label,
      );
    }

    this.renderWeaponSlotHud();
  }

  private renderWeaponSlotHud():
    void {
    const state =
      this.characterState;

    for (
      let slot = 0;
      slot < 5;
      slot += 1
    ) {
      const button =
        this.weaponSlotButtons[
          slot
        ];
      const icon =
        this.weaponSlotIcons[
          slot
        ];
      const label =
        this.weaponSlotLabels[
          slot
        ];

      if (
        !button ||
        !icon ||
        !label
      ) {
        continue;
      }

      const unlocked =
        slot <
        state.unlockedSlots;
      const profile =
        unlocked
          ? state.slots[
              slot
            ] ?? null
          : null;
      const primary =
        unlocked &&
        slot ===
          state.primarySlot &&
        Boolean(profile);

      button
        .setFillStyle(
          primary
            ? 0x7751a1
            : profile
              ? 0x315f35
              : unlocked
                ? 0x3d4940
                : 0x2d312f,
          unlocked
            ? 1
            : 0.72,
        )
        .setStrokeStyle(
          primary ? 4 : 2,
          primary
            ? 0xffe590
            : profile
              ? 0xf3f5dd
              : 0x777d78,
          primary ? 1 : 0.58,
        );

      if (!unlocked) {
        icon.setVisible(false);
        label.setText(
          `Lv.${getWeaponSlotUnlockLevel(
            slot,
          )}`,
        );
        continue;
      }

      if (!profile) {
        icon.setVisible(false);
        label.setText(
          'Пусто',
        );
        continue;
      }

      const rarity =
        WEAPON_RARITIES[
          profile.rarity
        ];

      icon
        .setTexture(
          WEAPON_ICON_TEXTURES[
            profile.weaponId
          ],
        )
        .setVisible(true)
        .setAlpha(
          primary
            ? 1
            : 0.85,
        );

      label
        .setColor(
          rarity.color,
        )
        .setText(
          `${rarity.name.slice(
            0,
            3,
          )}. ${profile.stars > 0 ? '★'.repeat(profile.stars) : '☆'}`,
        );
    }
  }

  update(): void {
    this.updatePotionCooldownVisual();

    if (
      this.monetizationState
        .activeBlessing
    ) {
      this.renderBlessingState();
    }

    this.renderRewardedExtras();
  }

  private updatePotionCooldownVisual(): void {
    if (
      !this.potionIcon ||
      !this.potionReadyIcon
    ) {
      return;
    }

    if (
      this.potionLastKnownCount <= 0
    ) {
      this.potionIcon
        .setTint(
          0x444846,
        )
        .setAlpha(0.48);
      this.potionReadyIcon
        .setVisible(false);
      return;
    }

    const remaining =
      Math.max(
        0,
        this.potionCooldownUntil -
          this.time.now,
      );

    if (remaining <= 0) {
      this.potionIcon
        .setTint(
          0x555b58,
        )
        .setAlpha(0.42);
      this.potionReadyIcon
        .setVisible(true)
        .setCrop();
      return;
    }

    const readyRatio =
      Phaser.Math.Clamp(
        1 -
          remaining /
            this.potionCooldownMs,
        0,
        1,
      );

    const textureHeight = 52;
    const visibleHeight =
      Math.max(
        1,
        Math.round(
          textureHeight *
            readyRatio,
        ),
      );
    const cropY =
      textureHeight -
      visibleHeight;

    this.potionIcon
      .setTint(
        0x454948,
      )
      .setAlpha(0.82);

    this.potionReadyIcon
      .setVisible(
        readyRatio > 0,
      )
      .setCrop(
        0,
        cropY,
        48,
        visibleHeight,
      );
  }

  private createPotionButton(): void {
    ensureHealthPotionTexture(
      this,
    );

    const x =
      LOGICAL_WIDTH / 2 + 246;
    const y =
      LOGICAL_HEIGHT - 50;

    this.potionButton =
      this.add
        .rectangle(
          x,
          y,
          58,
          58,
          0x6b3f48,
          0.96,
        )
        .setStrokeStyle(
          2,
          0xf3f5dd,
          0.68,
        )
        .setDepth(102)
        .setInteractive({
          useHandCursor: true,
        });

    this.potionIcon =
      this.add
        .image(
          x,
          y - 4,
          'ruinstead-health-potion-hud',
        )
        .setTint(
          0x555b58,
        )
        .setAlpha(0.78)
        .setDepth(103);

    this.potionReadyIcon =
      this.add
        .image(
          x,
          y - 4,
          'ruinstead-health-potion-hud',
        )
        .setDepth(103);

    this.potionCountText =
      this.add
        .text(
          x + 21,
          y + 19,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#4a232c',
            strokeThickness: 3,
          },
        )
        .setOrigin(1, 1)
        .setDepth(104);

    this.add
      .text(
        x - 22,
        y - 23,
        'Q',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fff5d8',
          backgroundColor:
            '#3b473bcc',
          padding: {
            x: 3,
            y: 1,
          },
        },
      )
      .setDepth(104);

    this.potionButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.game.events.emit(
          HUD_HEALTH_POTION_EVENT,
        );
      },
    );
  }

  private createSettlementUi(): void {
    const promptY =
      LOGICAL_HEIGHT - 118;

    this.forgePrompt = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        promptY,
        238,
        42,
        0x304f35,
        0.94,
      )
      .setStrokeStyle(
        2,
        0xffe39a,
        0.82,
      )
      .setDepth(130)
      .setVisible(false)
      .setInteractive({
        useHandCursor: true,
      });

    this.forgePromptText =
      this.add
        .text(
          LOGICAL_WIDTH / 2,
          promptY,
          'E · Кузница',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#fff6d5',
          },
        )
        .setOrigin(0.5)
        .setDepth(131)
        .setVisible(false);

    this.forgePrompt.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.toggleForgePanel();
      },
    );

    const panel =
      this.add.container(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
      );

    const bg =
      this.add
        .rectangle(
          0,
          0,
          620,
          680,
          0x233b2a,
          0.97,
        )
        .setStrokeStyle(
          3,
          0xf0d58b,
          0.92,
        );

    const title =
      this.add
        .text(
          0,
          -245,
          'Кузница',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#fff0b3',
          },
        )
        .setOrigin(0.5);

    this.forgeStageText =
      this.add
        .text(
          0,
          -198,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '19px',
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
          },
        )
        .setOrigin(0.5);

    this.forgeCostText =
      this.add
        .text(
          0,
          -145,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            color: '#ffe7ac',
            align: 'center',
          },
        )
        .setOrigin(0.5);

    this.forgeStorageText =
      this.add
        .text(
          0,
          -102,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#cfe7c5',
            align: 'center',
          },
        )
        .setOrigin(0.5);

    this.forgeNpcText =
      this.add
        .text(
          0,
          -60,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            color: '#ffffff',
            align: 'center',
          },
        )
        .setOrigin(0.5);

    this.forgeRepairButton =
      this.add
        .rectangle(
          0,
          -2,
          300,
          52,
          0x6f9250,
          1,
        )
        .setStrokeStyle(
          2,
          0xffe7a0,
          0.9,
        )
        .setInteractive({
          useHandCursor: true,
        });

    this.forgeRepairButtonText =
      this.add
        .text(
          0,
          -2,
          'Вложить ресурсы',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffffff',
          },
        )
        .setOrigin(0.5);

    const close =
      this.add
        .text(
          276,
          -254,
          '×',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#fff4d7',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    close.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.setForgePanelOpen(
          false,
        );
      },
    );

    this.forgeRepairButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        if (
          !this.settlementState
            ?.forge.restored &&
          this.settlementState
            ?.forge.canAfford
        ) {
          this.game.events.emit(
            HUD_FORGE_REPAIR_EVENT,
          );
        }
      },
    );

    this.upgradeTitle =
      this.add
        .text(
          0,
          50,
          'Улучшения',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffe7a0',
          },
        )
        .setOrigin(0.5);

    const playerUpgrades:
      Array<{
        id: PlayerUpgradeId;
        y: number;
      }> = [
      {
        id: 'max-health',
        y: 90,
      },
      {
        id: 'move-speed',
        y: 126,
      },
      {
        id: 'backpack',
        y: 162,
      },
      {
        id: 'dash',
        y: 198,
      },
    ];

    for (
      const item of
      playerUpgrades
    ) {
      const button =
        this.add
          .text(
            0,
            item.y,
            '',
            {
              fontFamily:
                'system-ui, sans-serif',
              fontSize: '14px',
              fontStyle: 'bold',
              color: '#ffffff',
              backgroundColor:
                '#486b43',
              padding: {
                x: 12,
                y: 7,
              },
              fixedWidth: 500,
              align: 'center',
            },
          )
          .setOrigin(0.5)
          .setInteractive({
            useHandCursor: true,
          });

      button.on(
        Phaser.Input.Events.POINTER_DOWN,
        () => {
          this.game.events.emit(
            HUD_PLAYER_UPGRADE_EVENT,
            item.id,
          );
        },
      );

      this.playerUpgradeButtons[
        item.id
      ] = button;
    }

    this.weaponUpgradeButton =
      this.add
        .text(
          0,
          238,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#76538d',
            padding: {
              x: 12,
              y: 8,
            },
            fixedWidth: 500,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.weaponUpgradeButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        const weaponId =
          this.upgradeState
            ?.selectedWeaponId;

        if (weaponId) {
          this.game.events.emit(
            HUD_WEAPON_UPGRADE_EVENT,
            weaponId,
          );
        }
      },
    );

    this.weaponVariantButton =
      this.add
        .text(
          0,
          278,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#405968',
            padding: {
              x: 12,
              y: 7,
            },
            fixedWidth: 500,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.weaponVariantButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        const state =
          this.upgradeState;

        if (
          !state ||
          state.weaponOptions
            .length <= 1
        ) {
          return;
        }

        const current =
          state.equippedWeapon;
        const index =
          state.weaponOptions
            .findIndex(
              (option) =>
                option.rarity ===
                  current.rarity &&
                option.stars ===
                  current.stars,
            );
        const next =
          state.weaponOptions[
            (
              index + 1 +
              state.weaponOptions
                .length
            ) %
            state.weaponOptions
              .length
          ];

        this.game.events.emit(
          HUD_WEAPON_VARIANT_SELECT_EVENT,
          state.selectedWeaponId,
          next.rarity,
          next.stars,
        );
      },
    );

    this.weaponFuseButton =
      this.add
        .text(
          0,
          318,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#67523e',
            padding: {
              x: 12,
              y: 7,
            },
            fixedWidth: 500,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.weaponFuseButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        const state =
          this.upgradeState;

        if (!state) {
          return;
        }

        const current =
          state.equippedWeapon;

        this.game.events.emit(
          HUD_WEAPON_FUSE_EVENT,
          state.selectedWeaponId,
          current.rarity,
          current.stars,
        );
      },
    );

    panel.add([
      bg,
      title,
      this.forgeStageText,
      this.forgeCostText,
      this.forgeStorageText,
      this.forgeNpcText,
      this.forgeRepairButton,
      this.forgeRepairButtonText,
      this.upgradeTitle,
      ...Object.values(
        this.playerUpgradeButtons,
      ),
      this.weaponUpgradeButton,
      this.weaponVariantButton,
      this.weaponFuseButton,
      close,
    ]);

    panel
      .setDepth(170)
      .setVisible(false);

    this.forgePanel =
      panel;
  }

  private createQuestPanel(): void {
    const left = 26;
    const top = 270;

    this.add
      .rectangle(
        left,
        top,
        350,
        174,
        0x203e27,
        0.9,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(
        2,
        0xf4f0cf,
        0.5,
      )
      .setDepth(100);

    this.questTitleText =
      this.add
        .text(
          left + 16,
          top + 14,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#fff2b5',
            align: 'left',
          },
        )
        .setOrigin(0, 0)
        .setDepth(101);

    this.questObjectiveText =
      this.add
        .text(
          left + 16,
          top + 42,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#ffffff',
            align: 'left',
            wordWrap: {
              width: 316,
            },
          },
        )
        .setOrigin(0, 0)
        .setDepth(101);

    this.questProgressText =
      this.add
        .text(
          left + 16,
          top + 88,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#bde4a9',
            align: 'left',
          },
        )
        .setOrigin(0, 0)
        .setDepth(101);

    this.questHintText =
      this.add
        .text(
          left + 16,
          top + 111,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#cad7c6',
            align: 'left',
            wordWrap: {
              width: 316,
            },
          },
        )
        .setOrigin(0, 0)
        .setDepth(101);

    this.questOptionalText =
      this.add
        .text(
          left + 16,
          top + 148,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#d9c9f0',
            align: 'left',
          },
        )
        .setOrigin(0, 0)
        .setDepth(101);
  }

  private createBestiaryUi(): void {
    this.bestiaryOpenButton =
      this.add
        .text(
          LOGICAL_WIDTH - 26,
          262,
          'B · Бестиарий',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#fff2c0',
            backgroundColor:
              '#304c35ee',
            padding: {
              x: 12,
              y: 8,
            },
          },
        )
        .setOrigin(1, 0)
        .setDepth(110)
        .setInteractive({
          useHandCursor: true,
        });

    this.bestiaryOpenButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.toggleBestiaryPanel();
      },
    );

    const panel =
      this.add.container(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
      );

    const bg =
      this.add
        .rectangle(
          0,
          0,
          860,
          570,
          0x1e3526,
          0.985,
        )
        .setStrokeStyle(
          3,
          0xd9c47f,
          0.92,
        );

    const title =
      this.add
        .text(
          -390,
          -255,
          'Бестиарий',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '27px',
            fontStyle: 'bold',
            color: '#fff0b3',
          },
        );

    this.bestiaryHeaderText =
      this.add
        .text(
          390,
          -252,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            color: '#d4e7ca',
          },
        )
        .setOrigin(1, 0);

    const close =
      this.add
        .text(
          407,
          -278,
          '×',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#fff4d7',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    close.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.setBestiaryPanelOpen(
          false,
        );
      },
    );

    const entryObjects:
      Phaser.GameObjects.Text[] = [];

    const entries =
      this.bestiaryState
        ?.entries ?? [];

    entries.forEach(
      (entry, index) => {
        const button =
          this.add
            .text(
              -390,
              -205 +
                index * 28,
              '',
              {
                fontFamily:
                  'system-ui, sans-serif',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor:
                  '#34553c',
                padding: {
                  x: 8,
                  y: 4,
                },
                fixedWidth: 270,
                fixedHeight: 24,
              },
            )
            .setInteractive({
              useHandCursor: true,
            });

        button.on(
          Phaser.Input.Events.POINTER_DOWN,
          () => {
            this.selectedBestiaryId =
              entry.entryId;
            this.renderBestiary();
          },
        );

        this.bestiaryEntryButtons[
          entry.entryId
        ] = button;
        entryObjects.push(
          button,
        );
      },
    );

    this.bestiaryImage =
      this.add
        .image(
          60,
          -142,
          'ruinstead-enemy-goblin',
        )
        .setScale(1.15);

    this.bestiaryEliteImage =
      this.add
        .image(
          185,
          -137,
          'ruinstead-enemy-hobgoblin',
        )
        .setScale(1.05);

    this.bestiaryNameText =
      this.add
        .text(
          -70,
          -215,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#fff2b5',
          },
        );

    this.bestiaryLevelText =
      this.add
        .text(
          365,
          -215,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#f4d77c',
          },
        )
        .setOrigin(1, 0);

    this.bestiaryDetailsText =
      this.add
        .text(
          -70,
          -55,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#e7eee2',
            lineSpacing: 6,
            wordWrap: {
              width: 430,
            },
          },
        );

    this.bestiaryProgressText =
      this.add
        .text(
          -70,
          105,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#b9e1a9',
          },
        );

    this.bestiaryRewardText =
      this.add
        .text(
          -70,
          145,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            color: '#f0dba1',
          },
        );

    this.bestiaryClaimButton =
      this.add
        .text(
          145,
          205,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#6b8e4c',
            padding: {
              x: 18,
              y: 10,
            },
            fixedWidth: 300,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.bestiaryClaimButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        const entry =
          this.getSelectedBestiaryEntry();

        if (
          entry?.claimableLevel
        ) {
          this.game.events.emit(
            HUD_BESTIARY_CLAIM_EVENT,
            entry.entryId,
          );
        }
      },
    );

    panel.add([
      bg,
      title,
      this.bestiaryHeaderText,
      close,
      ...entryObjects,
      this.bestiaryImage,
      this.bestiaryEliteImage,
      this.bestiaryNameText,
      this.bestiaryLevelText,
      this.bestiaryDetailsText,
      this.bestiaryProgressText,
      this.bestiaryRewardText,
      this.bestiaryClaimButton,
    ]);

    panel
      .setDepth(210)
      .setVisible(false);

    this.bestiaryPanel =
      panel;
  }

  private createCityBuilderUi(): void {
    this.cityOpenButton =
      this.add
        .text(
          LOGICAL_WIDTH - 26,
          304,
          'C · Поселение',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#fff2c0',
            backgroundColor:
              '#5a4930ee',
            padding: {
              x: 12,
              y: 8,
            },
          },
        )
        .setOrigin(1, 0)
        .setDepth(110)
        .setVisible(false)
        .setInteractive({
          useHandCursor: true,
        });

    this.cityOpenButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.toggleCityPanel();
      },
    );

    const panel =
      this.add.container(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
      );

    const bg =
      this.add
        .rectangle(
          0,
          0,
          820,
          720,
          0x263728,
          0.985,
        )
        .setStrokeStyle(
          3,
          0xddc783,
          0.9,
        );

    const title =
      this.add
        .text(
          -365,
          -270,
          'Поселение',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '27px',
            fontStyle: 'bold',
            color: '#fff0b3',
          },
        );

    this.cityHeaderText =
      this.add
        .text(
          365,
          -264,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#d7e6ce',
          },
        )
        .setOrigin(1, 0);

    const close =
      this.add
        .text(
          386,
          -287,
          '×',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#fff4d7',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    close.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.setCityPanelOpen(
          false,
        );
      },
    );

    this.cityProductionText =
      this.add
        .text(
          -365,
          -215,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#e6efdf',
            lineSpacing: 4,
          },
        );

    this.cityCollectButton =
      this.add
        .text(
          245,
          -195,
          'Забрать производство',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#5d7e48',
            padding: {
              x: 14,
              y: 9,
            },
            fixedWidth: 250,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.cityCollectButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.game.events.emit(
          HUD_CITY_COLLECT_EVENT,
        );
      },
    );

    this.cityProductionDoubleButton =
      this.add
        .text(
          245,
          -150,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#76538d',
            padding: {
              x: 12,
              y: 8,
            },
            fixedWidth: 250,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.cityProductionDoubleButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        if (
          this.cityState
            ?.production.canCollect &&
          !this.monetizationState
            .busy
        ) {
          this.game.events.emit(
            HUD_CITY_PRODUCTION_DOUBLE_EVENT,
          );
        }
      },
    );

    const supplyObjects:
      Phaser.GameObjects.Text[] = [];
    const supplyOptions:
      Array<{
        resource:
          SupplyResourceType;
        label: string;
      }> = [
      {
        resource: 'wood',
        label: 'Дерево',
      },
      {
        resource: 'stone',
        label: 'Камень',
      },
      {
        resource: 'metal',
        label: 'Металл',
      },
      {
        resource: 'crystal',
        label: 'Кристалл',
      },
      {
        resource: 'fiber',
        label: 'Волокно',
      },
    ];

    supplyOptions.forEach(
      (option, index) => {
        const button =
          this.add
            .text(
              -270 +
                index * 135,
              244,
              '',
              {
                fontFamily:
                  'system-ui, sans-serif',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor:
                  '#47606b',
                padding: {
                  x: 6,
                  y: 6,
                },
                fixedWidth: 125,
                fixedHeight: 38,
                align: 'center',
              },
            )
            .setOrigin(0.5, 0)
            .setInteractive({
              useHandCursor: true,
            });

        button.on(
          Phaser.Input.Events.POINTER_DOWN,
          () => {
            if (
              !this.monetizationState
                .busy &&
              this.monetizationState
                .supplyCooldownRemainingMs <=
                0
            ) {
              this.game.events.emit(
                HUD_SUPPLY_EVENT,
                option.resource,
              );
            }
          },
        );

        this.supplyButtons[
          option.resource
        ] = button;
        supplyObjects.push(
          button,
        );
      },
    );

    const blessingObjects:
      Phaser.GameObjects.Text[] = [];
    const blessingOptions:
      Array<{
        kind: BlessingKind;
        label: string;
      }> = [
      {
        kind: 'damage',
        label: '⚔ Урон +20%\n3 мин',
      },
      {
        kind: 'health',
        label: '❤ HP +25%\n3 мин',
      },
      {
        kind: 'speed',
        label: '➤ Скорость +15%\n3 мин',
      },
      {
        kind: 'gathering',
        label: '⛏ Добыча +50%\n3 мин',
      },
    ];

    blessingOptions.forEach(
      (option, index) => {
        const button =
          this.add
            .text(
              -270 +
                index * 180,
              298,
              option.label,
              {
                fontFamily:
                  'system-ui, sans-serif',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor:
                  '#5b496c',
                padding: {
                  x: 8,
                  y: 6,
                },
                fixedWidth: 165,
                fixedHeight: 42,
                align: 'center',
              },
            )
            .setOrigin(0.5, 0)
            .setInteractive({
              useHandCursor: true,
            });

        button.on(
          Phaser.Input.Events.POINTER_DOWN,
          () => {
            if (
              !this.monetizationState
                .busy
            ) {
              this.game.events.emit(
                HUD_BLESSING_EVENT,
                option.kind,
              );
            }
          },
        );

        this.blessingButtons[
          option.kind
        ] = button;
        blessingObjects.push(
          button,
        );
      },
    );

    const buildingObjects:
      Phaser.GameObjects.Text[] = [];
    const ids: CityBuildingId[] = [
      'storage',
      'sawmill',
      'workshop',
      'house',
    ];

    ids.forEach(
      (id, index) => {
        const button =
          this.add
            .text(
              0,
              -105 +
                index * 88,
              '',
              {
                fontFamily:
                  'system-ui, sans-serif',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor:
                  '#496343',
                padding: {
                  x: 14,
                  y: 10,
                },
                fixedWidth: 700,
                fixedHeight: 72,
                align: 'left',
                wordWrap: {
                  width: 670,
                },
              },
            )
            .setOrigin(0.5, 0)
            .setInteractive({
              useHandCursor: true,
            });

        button.on(
          Phaser.Input.Events.POINTER_DOWN,
          () => {
            this.game.events.emit(
              HUD_CITY_UPGRADE_EVENT,
              id,
            );
          },
        );

        this.cityBuildingButtons[
          id
        ] = button;
        buildingObjects.push(
          button,
        );
      },
    );

    panel.add([
      bg,
      title,
      this.cityHeaderText,
      close,
      this.cityProductionText,
      this.cityCollectButton,
      this.cityProductionDoubleButton,
      ...buildingObjects,
      ...supplyObjects,
      ...blessingObjects,
    ]);

    panel
      .setDepth(220)
      .setVisible(false);

    this.cityPanel =
      panel;
  }

  private createYandexPlatformUi(): void {
    this.yandexAuthButton =
      this.add
        .text(
          LOGICAL_WIDTH - 26,
          346,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#4b465fee',
            padding: {
              x: 10,
              y: 7,
            },
          },
        )
        .setOrigin(1, 0)
        .setDepth(110)
        .setInteractive({
          useHandCursor: true,
        });

    this.yandexAuthButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        void this.handleYandexAuthClick();
      },
    );

    this.renderYandexPlatformState();
  }

  private createControlsHint(): void {
    this.add
      .text(
        LOGICAL_WIDTH - 24,
        26,
        '1–5 оружие · Space/Shift — рывок',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          color: '#31502f',
          backgroundColor:
            '#efffd0dd',
          padding: {
            x: 10,
            y: 6,
          },
        },
      )
      .setOrigin(1, 0)
      .setDepth(100);
  }

  private createNoticeLayer(): void {
    this.noticeText =
      this.add
        .text(
          LOGICAL_WIDTH / 2,
          110,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#fff7d6',
            backgroundColor:
              '#2a402ddd',
            padding: {
              x: 16,
              y: 10,
            },
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setDepth(180)
        .setAlpha(0);
  }

  private handleHealthPotionKey(): void {
    this.game.events.emit(
      HUD_HEALTH_POTION_EVENT,
    );
  }

  private handleYandexPlatformState =
    (
      event: Event,
    ): void => {
      const custom =
        event as
          CustomEvent<
            YandexPlatformState
          >;

      this.yandexPlatformState = {
        ...custom.detail,
      };
      this.renderYandexPlatformState();
    };

  private renderYandexPlatformState(): void {
    const button =
      this.yandexAuthButton;

    if (!button) {
      return;
    }

    const state =
      this.yandexPlatformState;

    button.setVisible(
      state.available,
    );

    if (!state.available) {
      return;
    }

    if (this.yandexAuthBusy) {
      button
        .setText(
          'Yandex ID · вход…',
        )
        .setStyle({
          backgroundColor:
            '#4b465fee',
          color: '#d7d5dd',
        });
      return;
    }

    if (state.authorized) {
      button
        .setText(
          'Yandex ID · облако ✓',
        )
        .setStyle({
          backgroundColor:
            '#315b43ee',
          color: '#d9ffdf',
        });
      return;
    }

    button
      .setText(
        'Войти · облачное сохранение',
      )
      .setStyle({
        backgroundColor:
          '#5d4f78ee',
        color: '#fff4ce',
      });
  }

  private async handleYandexAuthClick():
    Promise<void> {
    if (
      this.yandexAuthBusy ||
      !this.yandexPlatformState
        .available ||
      this.yandexPlatformState
        .authorized
    ) {
      return;
    }

    this.yandexAuthBusy = true;
    this.renderYandexPlatformState();

    const result =
      await requestYandexAuthorization();

    this.yandexAuthBusy = false;
    this.yandexPlatformState =
      getYandexPlatformState();
    this.renderYandexPlatformState();

    if (
      result === 'authorized' ||
      result ===
        'already-authorized'
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Yandex ID подключён · облачное сохранение синхронизировано',
      );

      window.setTimeout(
        () => {
          window.location.reload();
        },
        350,
      );
      return;
    }

    if (result === 'declined') {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Вход отменён · локальное сохранение продолжает работать',
      );
      return;
    }

    if (
      result === 'error'
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Не удалось выполнить вход в Yandex ID',
      );
    }
  }

  private createProgressionUi():
    void {
    this.profileOpenButton =
      this.add
        .text(
          26,
          270,
          'P · Герой',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#fff5d5',
            backgroundColor:
              '#3d536bee',
            padding: {
              x: 12,
              y: 8,
            },
            fixedWidth: 146,
            align: 'center',
          },
        )
        .setOrigin(0, 0)
        .setDepth(110)
        .setInteractive({
          useHandCursor: true,
        });

    this.profileOpenButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.handleProfileToggle();
      },
    );

    const panel =
      this.add.container(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
      );

    const bg =
      this.add
        .rectangle(
          0,
          0,
          820,
          560,
          0x223341,
          0.99,
        )
        .setStrokeStyle(
          3,
          0xe1c77c,
          0.92,
        );

    const title =
      this.add
        .text(
          -365,
          -245,
          'Уровень героя',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '27px',
            fontStyle: 'bold',
            color: '#fff0b3',
          },
        );

    const close =
      this.add
        .text(
          378,
          -260,
          '×',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '27px',
            color: '#ffffff',
            backgroundColor:
              '#5c3c3ccc',
            padding: {
              x: 9,
              y: 2,
            },
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    close.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.setProfilePanelOpen(
          false,
        );
      },
    );

    this.profileProgressText =
      this.add
        .text(
          -365,
          -190,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '16px',
            color: '#e8f4e0',
            lineSpacing: 6,
            fixedWidth: 730,
          },
        );

    const masteryTitle =
      this.add
        .text(
          -365,
          -88,
          'Мастерство · 1 очко каждые 5 уровней',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffe29a',
          },
        );

    const masteryDefs:
      Array<{
        id: PlayerMasteryId;
        title: string;
        effect: string;
      }> = [
      {
        id: 'combat',
        title: 'Бой',
        effect: '+3% урона',
      },
      {
        id: 'vitality',
        title: 'Живучесть',
        effect: '+4% HP',
      },
      {
        id: 'mobility',
        title: 'Мобильность',
        effect:
          '+2% скорость · −4% dash CD',
      },
      {
        id: 'gathering',
        title: 'Добыча',
        effect: '+5% ресурсов',
      },
      {
        id: 'settlement',
        title: 'Поселение',
        effect:
          '+5% производство/буфер',
      },
    ];

    masteryDefs.forEach(
      (definition, index) => {
        const col =
          index % 2;
        const row =
          Math.floor(index / 2);
        const button =
          this.add
            .text(
              -360 +
                col * 375,
              -45 +
                row * 76,
              '',
              {
                fontFamily:
                  'system-ui, sans-serif',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor:
                  '#415d70',
                padding: {
                  x: 10,
                  y: 8,
                },
                fixedWidth: 350,
                fixedHeight: 60,
                wordWrap: {
                  width: 330,
                },
              },
            )
            .setInteractive({
              useHandCursor: true,
            });

        button.setData(
          'baseLabel',
          `${definition.title} · ${definition.effect}`,
        );

        button.on(
          Phaser.Input.Events.POINTER_DOWN,
          () => {
            this.game.events.emit(
              HUD_MASTERY_SPEND_EVENT,
              definition.id,
            );
          },
        );

        this.masteryButtons[
          definition.id
        ] = button;
      },
    );

    const hint =
      this.add
        .text(
          -365,
          208,
          'Постоянные бонусы мастерства складываются с экипированным скином. Оружейные звёзды за уровень не выдаются.',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '12px',
            color: '#b9c9cf',
            fixedWidth: 730,
            wordWrap: {
              width: 730,
            },
          },
        );

    panel.add([
      bg,
      title,
      close,
      this.profileProgressText,
      masteryTitle,
      ...Object.values(
        this.masteryButtons,
      ),
      hint,
    ]);

    panel
      .setDepth(410)
      .setVisible(false);

    this.profilePanel =
      panel;
  }

  private createPremiumUi():
    void {
    this.premiumOpenButton =
      this.add
        .text(
          26,
          312,
          'M · Магазин',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#fff4c2',
            backgroundColor:
              '#684f36ee',
            padding: {
              x: 12,
              y: 8,
            },
            fixedWidth: 146,
            align: 'center',
          },
        )
        .setOrigin(0, 0)
        .setDepth(110)
        .setInteractive({
          useHandCursor: true,
        });

    this.premiumOpenButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.handlePremiumToggle();
      },
    );

    const panel =
      this.add.container(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
      );

    const bg =
      this.add
        .rectangle(
          0,
          0,
          940,
          720,
          0x302d2a,
          0.995,
        )
        .setStrokeStyle(
          3,
          0xe7c875,
          0.95,
        );

    const title =
      this.add
        .text(
          -430,
          -325,
          'Магазин и коллекция',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '26px',
            fontStyle: 'bold',
            color: '#fff0b3',
          },
        );

    const close =
      this.add
        .text(
          440,
          -338,
          '×',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '27px',
            color: '#ffffff',
            backgroundColor:
              '#5c3c3ccc',
            padding: {
              x: 9,
              y: 2,
            },
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    close.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.setPremiumPanelOpen(
          false,
        );
      },
    );

    this.premiumHeaderText =
      this.add
        .text(
          -430,
          -278,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#f5e6b8',
            fixedWidth: 860,
          },
        );

    const chestTitle =
      this.add
        .text(
          -430,
          -235,
          'Сундуки с осколками',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffe29a',
          },
        );

    const makeButton = (
      key: string,
      x: number,
      y: number,
      width: number,
      callback: () => void,
    ) => {
      const button =
        this.add
          .text(
            x,
            y,
            '',
            {
              fontFamily:
                'system-ui, sans-serif',
              fontSize: '12px',
              fontStyle: 'bold',
              color: '#ffffff',
              backgroundColor:
                '#5b5146',
              padding: {
                x: 8,
                y: 7,
              },
              fixedWidth: width,
              align: 'center',
            },
          )
          .setInteractive({
            useHandCursor: true,
          });

      button.on(
        Phaser.Input.Events.POINTER_DOWN,
        callback,
      );

      this.chestButtons[key] =
        button;
      return button;
    };

    const chestObjects = [
      makeButton(
        'common-gems',
        -430,
        -202,
        185,
        () =>
          this.game.events.emit(
            HUD_SKIN_CHEST_OPEN_EVENT,
            'common',
            'gems',
          ),
      ),
      makeButton(
        'common-ad',
        -235,
        -202,
        185,
        () =>
          this.game.events.emit(
            HUD_SKIN_CHEST_OPEN_EVENT,
            'common',
            'rewarded',
          ),
      ),
      makeButton(
        'common-free',
        -40,
        -202,
        185,
        () =>
          this.game.events.emit(
            HUD_SKIN_CHEST_OPEN_EVENT,
            'common',
            'free',
          ),
      ),
      makeButton(
        'rare-gems',
        155,
        -202,
        135,
        () =>
          this.game.events.emit(
            HUD_SKIN_CHEST_OPEN_EVENT,
            'rare',
            'gems',
          ),
      ),
      makeButton(
        'rare-free',
        300,
        -202,
        130,
        () =>
          this.game.events.emit(
            HUD_SKIN_CHEST_OPEN_EVENT,
            'rare',
            'free',
          ),
      ),
      makeButton(
        'epic-gems',
        155,
        -160,
        135,
        () =>
          this.game.events.emit(
            HUD_SKIN_CHEST_OPEN_EVENT,
            'epic',
            'gems',
          ),
      ),
      makeButton(
        'epic-free',
        300,
        -160,
        130,
        () =>
          this.game.events.emit(
            HUD_SKIN_CHEST_OPEN_EVENT,
            'epic',
            'free',
          ),
      ),
    ];

    const skinTitle =
      this.add
        .text(
          -430,
          -115,
          'Скины',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffe29a',
          },
        );

    const prevSkin =
      this.add
        .text(
          -430,
          -78,
          '‹',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor:
              '#50545a',
            padding: {
              x: 12,
              y: 2,
            },
          },
        )
        .setInteractive({
          useHandCursor: true,
        });
    prevSkin.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.skinIndex -= 1;
        this.renderPremiumState();
      },
    );

    const nextSkin =
      this.add
        .text(
          398,
          -78,
          '›',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor:
              '#50545a',
            padding: {
              x: 12,
              y: 2,
            },
          },
        )
        .setInteractive({
          useHandCursor: true,
        });
    nextSkin.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.skinIndex += 1;
        this.renderPremiumState();
      },
    );

    this.skinInfoText =
      this.add
        .text(
          -375,
          -75,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            color: '#edf3e8',
            fixedWidth: 620,
            wordWrap: {
              width: 620,
            },
          },
        );

    this.skinActionButton =
      this.add
        .text(
          270,
          -75,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#665080',
            padding: {
              x: 9,
              y: 7,
            },
            fixedWidth: 120,
            align: 'center',
          },
        )
        .setInteractive({
          useHandCursor: true,
        });

    this.skinActionButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.handleSkinAction();
      },
    );

    const storeTitle =
      this.add
        .text(
          -430,
          5,
          'Покупки',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffe29a',
          },
        );

    const purchaseRows:
      Array<{
        key: string;
        label: string;
        product: string;
        x: number;
        y: number;
      }> = [
      {
        key: 'gems80',
        label: '+80 самоцветов',
        product: 'gems_80',
        x: -430,
        y: 40,
      },
      {
        key: 'gems250',
        label: '+250 самоцветов',
        product: 'gems_250',
        x: -215,
        y: 40,
      },
      {
        key: 'gems650',
        label: '+650 самоцветов',
        product: 'gems_650',
        x: 0,
        y: 40,
      },
      {
        key: 'gems1400',
        label: '+1400 самоцветов',
        product: 'gems_1400',
        x: 215,
        y: 40,
      },
      {
        key: 'starter',
        label: 'Starter Pack',
        product:
          STARTER_PACK.productId,
        x: -430,
        y: 82,
      },
      {
        key: 'pass',
        label: 'Level Pass',
        product:
          LEVEL_PASS.productId,
        x: -215,
        y: 82,
      },
      {
        key: 'region2',
        label: 'Ash Region Pack',
        product:
          'region_pack_stage_2',
        x: 0,
        y: 82,
      },
      {
        key: 'founder',
        label: 'Founder Pack',
        product:
          FOUNDER_PACK.productId,
        x: 215,
        y: 82,
      },
    ];

    const storeObjects:
      Phaser.GameObjects.Text[] = [];
    purchaseRows.forEach(
      (row) => {
        const button =
          this.add
            .text(
              row.x,
              row.y,
              row.label,
              {
                fontFamily:
                  'system-ui, sans-serif',
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#ffffff',
                backgroundColor:
                  '#6b543a',
                padding: {
                  x: 8,
                  y: 7,
                },
                fixedWidth: 200,
                align: 'center',
              },
            )
            .setInteractive({
              useHandCursor: true,
            });

        button.on(
          Phaser.Input.Events.POINTER_DOWN,
          () => {
            this.game.events.emit(
              HUD_PREMIUM_PURCHASE_EVENT,
              row.product,
            );
          },
        );
        this.storeButtons[
          row.key
        ] = button;
        storeObjects.push(
          button,
        );
      },
    );

    const cosmeticTitle =
      this.add
        .text(
          -430,
          135,
          'Косметика поселения и спутники',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffe29a',
          },
        );

    const verdant =
      this.add
        .text(
          -430,
          170,
          'Тема: Зелёная · 250◆',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor:
              '#466649',
            padding: {
              x: 8,
              y: 7,
            },
            fixedWidth: 205,
            align: 'center',
          },
        )
        .setInteractive({
          useHandCursor: true,
        });
    verdant.on(
      Phaser.Input.Events.POINTER_DOWN,
      () =>
        this.game.events.emit(
          HUD_SETTLEMENT_THEME_EVENT,
          'verdant',
        ),
    );

    const ember =
      this.add
        .text(
          -215,
          170,
          'Тема: Пепел · 350◆',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor:
              '#765041',
            padding: {
              x: 8,
              y: 7,
            },
            fixedWidth: 205,
            align: 'center',
          },
        )
        .setInteractive({
          useHandCursor: true,
        });
    ember.on(
      Phaser.Input.Events.POINTER_DOWN,
      () =>
        this.game.events.emit(
          HUD_SETTLEMENT_THEME_EVENT,
          'ember',
        ),
    );

    const mossling =
      this.add
        .text(
          0,
          170,
          'Моховичок · 300◆',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor:
              '#4f6750',
            padding: {
              x: 8,
              y: 7,
            },
            fixedWidth: 200,
            align: 'center',
          },
        )
        .setInteractive({
          useHandCursor: true,
        });
    mossling.on(
      Phaser.Input.Events.POINTER_DOWN,
      () =>
        this.game.events.emit(
          HUD_PET_EVENT,
          'mossling',
        ),
    );

    const firefly =
      this.add
        .text(
          210,
          170,
          'Светляк · 450◆',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor:
              '#70643e',
            padding: {
              x: 8,
              y: 7,
            },
            fixedWidth: 200,
            align: 'center',
          },
        )
        .setInteractive({
          useHandCursor: true,
        });
    firefly.on(
      Phaser.Input.Events.POINTER_DOWN,
      () =>
        this.game.events.emit(
          HUD_PET_EVENT,
          'firefly',
        ),
    );

    const note =
      this.add
        .text(
          -430,
          225,
          'Legendary не выпадает из сундуков. Ротационный магазин ниже позволяет добирать конкретные осколки без RNG.',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            color: '#c9c1b1',
            fixedWidth: 860,
            wordWrap: {
              width: 860,
            },
          },
        );

    const shardTitle =
      this.add
        .text(
          -430,
          270,
          'Осколки дня · 1 покупка каждого слота',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#ffe29a',
          },
        );

    const shardObjects:
      Phaser.GameObjects.Text[] = [];

    for (
      let slot = 0;
      slot < 3;
      slot += 1
    ) {
      const button =
        this.add
          .text(
            -430 + slot * 290,
            302,
            '',
            {
              fontFamily:
                'system-ui, sans-serif',
              fontSize: '10px',
              fontStyle: 'bold',
              color: '#ffffff',
              backgroundColor:
                '#5b4e68',
              padding: {
                x: 8,
                y: 7,
              },
              fixedWidth: 270,
              fixedHeight: 42,
              align: 'center',
              wordWrap: {
                width: 252,
              },
            },
          )
          .setInteractive({
            useHandCursor: true,
          });

      button.on(
        Phaser.Input.Events.POINTER_DOWN,
        () => {
          this.game.events.emit(
            HUD_SHARD_SHOP_BUY_EVENT,
            slot,
          );
        },
      );

      this.shardShopButtons[
        slot
      ] = button;
      shardObjects.push(button);
    }

    panel.add([
      bg,
      title,
      close,
      this.premiumHeaderText,
      chestTitle,
      ...chestObjects,
      skinTitle,
      prevSkin,
      nextSkin,
      this.skinInfoText,
      this.skinActionButton,
      storeTitle,
      ...storeObjects,
      cosmeticTitle,
      verdant,
      ember,
      mossling,
      firefly,
      note,
      shardTitle,
      ...shardObjects,
    ]);

    panel
      .setDepth(420)
      .setVisible(false);

    this.premiumPanel =
      panel;
  }

  private handleProfileToggle():
    void {
    this.setProfilePanelOpen(
      !this.profilePanelOpen,
    );
  }

  private setProfilePanelOpen(
    open: boolean,
  ): void {
    this.profilePanelOpen =
      open;

    if (open) {
      this.setPremiumPanelOpen(
        false,
      );
    }

    this.profilePanel
      ?.setVisible(open);
  }

  private handlePremiumToggle():
    void {
    this.setPremiumPanelOpen(
      !this.premiumPanelOpen,
    );
  }

  private setPremiumPanelOpen(
    open: boolean,
  ): void {
    this.premiumPanelOpen =
      open;

    if (open) {
      this.setProfilePanelOpen(
        false,
      );
    }

    this.premiumPanel
      ?.setVisible(open);
  }

  private handlePlayerProgressState(
    state:
      PlayerProgressHudState,
  ): void {
    this.playerProgressState =
      state;

    this.profileOpenButton
      ?.setText(
        `P · Lv.${state.level} · ◆${state.gems}`,
      );

    const xpText =
      state.xpToNext > 0
        ? `${state.xp} / ${state.xpToNext} XP`
        : 'MAX';

    this.profileProgressText
      ?.setText(
        `Lv.${state.level} / 50 · ${xpText}${this.premiumState.founderPackOwned ? ' · Основатель' : ''}\nСамоцветы: ◆${state.gems} · свободно очков мастерства: ${state.masteryAvailable}`,
      );

    for (
      const id of
      Object.keys(
        state.masteryRanks,
      ) as PlayerMasteryId[]
    ) {
      const button =
        this.masteryButtons[id];
      const rank =
        state.masteryRanks[
          id
        ];
      const base =
        button?.getData(
          'baseLabel',
        ) as string | undefined;

      button
        ?.setText(
          `${base ?? id}\nРанг ${rank} / ${PLAYER_MASTERY[id].maxRank}${state.masteryAvailable > 0 && rank < PLAYER_MASTERY[id].maxRank ? ' · +1' : ''}`,
        )
        .setStyle({
          backgroundColor:
            state.masteryAvailable >
              0 &&
            rank <
              PLAYER_MASTERY[id]
                .maxRank
              ? '#4b7087'
              : '#3d4a53',
          color:
            '#ffffff',
        });
    }
  }

  private handlePremiumState(
    state: PremiumHudState,
  ): void {
    this.premiumState =
      state;
    this.renderPremiumState();
    this.ensurePortalCurrencyIcon();
    this.handlePlayerProgressState(
      this.playerProgressState,
    );
    this.handleMonetizationState(
      this.monetizationState,
    );
  }

  private renderPremiumState():
    void {
    const state =
      this.premiumState;
    const adFree =
      this.monetizationState
        .adFreeUntil >
      Date.now();
    const productPrice = (
      productId: string,
    ) =>
      state.purchaseCatalog[
        productId
      ]?.price;

    this.premiumOpenButton
      ?.setText(
        `M · Магазин · ◆${state.gems}`,
      );

    this.premiumHeaderText
      ?.setText(
        `Самоцветы ◆${state.gems} · скинов ${state.unlockedSkinIds.length} · Epic pity ${state.epicChestPity} / 5${Object.keys(state.purchaseCatalog).length > 0 ? ' · IAP цены из Yandex Games' : ''}`,
      );

    const setChest = (
      key: string,
      label: string,
      available = true,
    ) => {
      this.chestButtons[
        key
      ]
        ?.setText(label)
        .setStyle({
          backgroundColor:
            available
              ? '#5b5146'
              : '#3f3d3a',
          color:
            available
              ? '#ffffff'
              : '#8f8b84',
        });
    };

    setChest(
      'common-gems',
      `Common · ${SKIN_CHESTS.common.gemCost}◆`,
      state.gems >=
        SKIN_CHESTS.common
          .gemCost,
    );
    setChest(
      'common-ad',
      state.rewardedCommonChestRemaining >
        0
        ? adFree
          ? `Common · получить (${state.rewardedCommonChestRemaining}/3)`
          : `Common · реклама (${state.rewardedCommonChestRemaining}/3)`
        : 'Common · лимит исчерпан',
      state
        .rewardedCommonChestRemaining >
        0,
    );
    setChest(
      'common-free',
      `Free Common ×${state.freeSkinChests.common}`,
      state.freeSkinChests
        .common > 0,
    );
    setChest(
      'rare-gems',
      `Rare · ${SKIN_CHESTS.rare.gemCost}◆`,
      state.gems >=
        SKIN_CHESTS.rare.gemCost,
    );
    setChest(
      'rare-free',
      `Free ×${state.freeSkinChests.rare}`,
      state.freeSkinChests
        .rare > 0,
    );
    setChest(
      'epic-gems',
      `Epic · ${SKIN_CHESTS.epic.gemCost}◆`,
      state.gems >=
        SKIN_CHESTS.epic.gemCost,
    );
    setChest(
      'epic-free',
      `Free ×${state.freeSkinChests.epic}`,
      state.freeSkinChests
        .epic > 0,
    );

    this.storeButtons.gems80
      ?.setText(
        `+80 самоцветов${productPrice('gems_80') ? ` · ${productPrice('gems_80')}` : ''}`,
      );
    this.storeButtons.gems250
      ?.setText(
        `+250 самоцветов${productPrice('gems_250') ? ` · ${productPrice('gems_250')}` : ''}`,
      );
    this.storeButtons.gems650
      ?.setText(
        `+650 самоцветов${productPrice('gems_650') ? ` · ${productPrice('gems_650')}` : ''}`,
      );
    this.storeButtons.gems1400
      ?.setText(
        `+1400 самоцветов${productPrice('gems_1400') ? ` · ${productPrice('gems_1400')}` : ''}`,
      );

    this.storeButtons.starter
      ?.setText(
        state.starterPackOwned
          ? 'Starter Pack · получен'
          : `Starter Pack${productPrice(STARTER_PACK.productId) ? ` · ${productPrice(STARTER_PACK.productId)}` : ''}`,
      );
    this.storeButtons.pass
      ?.setText(
        state.levelPassOwned
          ? 'Level Pass · активен'
          : `Level Pass${productPrice(LEVEL_PASS.productId) ? ` · ${productPrice(LEVEL_PASS.productId)}` : ''}`,
      );
    this.storeButtons.region2
      ?.setText(
        state.regionPackStage2Owned
          ? 'Ash Pack · получен'
          : state.regionPackStage2Available
            ? `Ash Region Pack${productPrice('region_pack_stage_2') ? ` · ${productPrice('region_pack_stage_2')}` : ''}`
            : 'Ash Pack · открой регион',
      );
    this.storeButtons.founder
      ?.setText(
        state.founderPackOwned
          ? 'Founder Pack · получен'
          : `Founder Pack${productPrice(FOUNDER_PACK.productId) ? ` · ${productPrice(FOUNDER_PACK.productId)}` : ''}`,
      );

    const ids =
      Object.keys(
        SKIN_DEFINITIONS,
      ) as SkinId[];
    if (ids.length <= 0) {
      return;
    }

    this.skinIndex =
      (
        this.skinIndex %
          ids.length +
        ids.length
      ) %
      ids.length;

    const skinId =
      ids[this.skinIndex];
    const definition =
      SKIN_DEFINITIONS[
        skinId
      ];
    const rarity =
      SKIN_RARITIES[
        definition.rarity
      ];
    const unlocked =
      state.unlockedSkinIds
        .includes(skinId);
    const equipped =
      state.equippedSkinId ===
      skinId;
    const fragments =
      state.skinFragments[
        skinId
      ] ?? 0;
    const rarityNames:
      Record<
        keyof typeof SKIN_RARITIES,
        string
      > = {
      common: 'Обычный',
      uncommon: 'Необычный',
      rare: 'Редкий',
      epic: 'Эпический',
      legendary:
        'Легендарный',
    };

    for (
      let slot = 0;
      slot < 3;
      slot += 1
    ) {
      const button =
        this.shardShopButtons[
          slot
        ];
      const offer =
        state.shardShopOffers
          .find(
            (entry) =>
              entry.slot === slot,
          );

      if (!offer) {
        button
          ?.setText(
            'Нет предложения',
          )
          .setStyle({
            backgroundColor:
              '#3f3d3a',
            color:
              '#8f8b84',
          });
        continue;
      }

      const definition =
        SKIN_DEFINITIONS[
          offer.skinId
        ];
      const available =
        !offer.purchased &&
        !offer.unlocked &&
        state.gems >=
          offer.gemCost;

      button
        ?.setText(
          offer.unlocked
            ? `${definition.name} · уже открыт`
            : offer.purchased
              ? `${definition.name} · куплено`
              : `${definition.name} · +${offer.fragments} оск. · ${offer.gemCost}◆`,
        )
        .setStyle({
          backgroundColor:
            available
              ? '#5b4e68'
              : '#3f3d3a',
          color:
            available
              ? '#ffffff'
              : '#8f8b84',
        });
    }
    const statNames:
      Record<string, string> = {
      damage: 'урон',
      'max-health': 'max HP',
      'move-speed': 'скорость',
      gathering: 'добыча',
      production:
        'производство',
    };

    this.skinInfoText
      ?.setText(
        `${this.skinIndex + 1} / ${ids.length} · ${definition.name}\n${rarityNames[definition.rarity]} · +${Math.round((rarity.statBonus) * 100)}% ${statNames[definition.bonusStat]} · ${unlocked ? 'ОТКРЫТ' : definition.rarity === 'legendary' ? 'только покупка' : `${fragments} / 30 осколков`}`,
      );

    this.skinActionButton
      ?.setText(
        equipped
          ? 'Надет'
          : unlocked
            ? 'Надеть'
            : definition.rarity ===
                'legendary'
              ? `Купить${'productId' in definition && productPrice(definition.productId) ? ` · ${productPrice(definition.productId)}` : ''}`
              : 'Закрыт',
      )
      .setStyle({
        backgroundColor:
          equipped
            ? '#4c7350'
            : unlocked ||
                definition.rarity ===
                  'legendary'
              ? '#665080'
              : '#44454a',
        color:
          '#ffffff',
      });
  }

  private ensurePortalCurrencyIcon():
    void {
    const url =
      Object.values(
        this.premiumState
          .purchaseCatalog,
      ).find(
        (item) =>
          Boolean(
            item.currencyIconUrl,
          ),
      )?.currencyIconUrl;

    if (
      !url ||
      !this.premiumPanel ||
      this.portalCurrencyIcon
    ) {
      return;
    }

    const key =
      'ruinstead-yandex-currency';

    const attach = () => {
      if (
        this.portalCurrencyIcon ||
        !this.premiumPanel ||
        !this.textures.exists(
          key,
        )
      ) {
        return;
      }

      this.portalCurrencyIcon =
        this.add
          .image(
            408,
            -278,
            key,
          )
          .setDisplaySize(
            22,
            22,
          );

      this.premiumPanel.add(
        this.portalCurrencyIcon,
      );
    };

    if (
      this.textures.exists(
        key,
      )
    ) {
      attach();
      return;
    }

    if (
      this.portalCurrencyLoading
    ) {
      return;
    }

    this.portalCurrencyLoading =
      true;
    this.load.image(
      key,
      url,
    );
    this.load.once(
      Phaser.Loader.Events.COMPLETE,
      () => {
        this.portalCurrencyLoading =
          false;
        attach();
      },
    );
    this.load.once(
      'loaderror',
      () => {
        this.portalCurrencyLoading =
          false;
      },
    );
    this.load.start();
  }

  private handleSkinAction():
    void {
    const ids =
      Object.keys(
        SKIN_DEFINITIONS,
      ) as SkinId[];

    if (ids.length <= 0) {
      return;
    }

    const skinId =
      ids[
        (
          this.skinIndex %
            ids.length +
          ids.length
        ) %
          ids.length
      ];
    const definition =
      SKIN_DEFINITIONS[
        skinId
      ];

    if (
      this.premiumState
        .unlockedSkinIds
        .includes(skinId)
    ) {
      this.game.events.emit(
        HUD_SKIN_EQUIP_EVENT,
        skinId,
      );
      return;
    }

    if (
      definition.rarity ===
        'legendary' &&
      definition.productId
    ) {
      this.game.events.emit(
        HUD_PREMIUM_PURCHASE_EVENT,
        definition.productId,
      );
    }
  }

  private createMonetizationUi():
    void {
    this.returnHomeButton =
      this.add
        .text(
          LOGICAL_WIDTH - 26,
          390,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#76538dee',
            padding: {
              x: 11,
              y: 8,
            },
            fixedWidth: 235,
            align: 'center',
          },
        )
        .setOrigin(1, 0)
        .setDepth(111)
        .setVisible(false)
        .setInteractive({
          useHandCursor: true,
        });

    this.returnHomeButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        if (
          !this.monetizationState
            .canFastReturn ||
          this.monetizationState
            .busy
        ) {
          return;
        }

        this.game.events.emit(
          HUD_RETURN_HOME_EVENT,
          this.monetizationState
              .returnTickets >
            0
            ? 'ticket'
            : 'rewarded',
        );
      },
    );

    this.buyTicketsButton =
      this.add
        .text(
          LOGICAL_WIDTH - 26,
          431,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#fff1c2',
            backgroundColor:
              '#514a35ee',
            padding: {
              x: 9,
              y: 6,
            },
            fixedWidth: 235,
            align: 'center',
          },
        )
        .setOrigin(1, 0)
        .setDepth(111)
        .setVisible(false)
        .setInteractive({
          useHandCursor: true,
        });

    this.buyTicketsButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        if (
          this.monetizationState
            .canFastReturn &&
          this.monetizationState
            .purchaseAvailable &&
          !this.monetizationState
            .busy
        ) {
          this.game.events.emit(
            HUD_RETURN_HOME_EVENT,
            'buy',
          );
        }
      },
    );

    this.buyAdFreeButton =
      this.add
        .text(
          LOGICAL_WIDTH - 26,
          469,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#fff5c9',
            backgroundColor:
              '#5b4b2fee',
            padding: {
              x: 9,
              y: 6,
            },
            fixedWidth: 235,
            align: 'center',
          },
        )
        .setOrigin(1, 0)
        .setDepth(111)
        .setVisible(false)
        .setInteractive({
          useHandCursor: true,
        });

    this.buyAdFreeButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        if (
          this.monetizationState
            .purchaseAvailable &&
          !this.monetizationState
            .busy
        ) {
          this.game.events.emit(
            HUD_BUY_AD_FREE_WEEK_EVENT,
          );
        }
      },
    );

    this.blessingStatusText =
      this.add
        .text(
          LOGICAL_WIDTH - 26,
          507,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#fff1c2',
            backgroundColor:
              '#4f3f5ddd',
            padding: {
              x: 9,
              y: 6,
            },
            fixedWidth: 235,
            align: 'center',
          },
        )
        .setOrigin(1, 0)
        .setDepth(111)
        .setVisible(false);

    const panel =
      this.add.container(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 92,
      );

    const bg =
      this.add
        .rectangle(
          0,
          0,
          790,
          138,
          0x252b27,
          0.985,
        )
        .setStrokeStyle(
          3,
          0xe2c86f,
          0.92,
        );

    this.monetizationText =
      this.add
        .text(
          -360,
          -52,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            color: '#fff4d7',
            lineSpacing: 3,
            fixedWidth: 470,
            wordWrap: {
              width: 460,
            },
          },
        );

    this.monetizationWatchButton =
      this.add
        .text(
          250,
          -23,
          'Смотреть рекламу',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor:
              '#76538d',
            padding: {
              x: 12,
              y: 9,
            },
            fixedWidth: 240,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.monetizationDismissButton =
      this.add
        .text(
          250,
          30,
          'Не сейчас',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '12px',
            color: '#d7ddd8',
            backgroundColor:
              '#454c47',
            padding: {
              x: 10,
              y: 7,
            },
            fixedWidth: 240,
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setInteractive({
          useHandCursor: true,
        });

    this.monetizationWatchButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        const placement =
          this.monetizationState
            .offer?.placement;

        if (
          placement &&
          !this.monetizationState
            .busy
        ) {
          this.game.events.emit(
            HUD_MONETIZATION_ACTION_EVENT,
            'watch',
            placement,
          );
        }
      },
    );

    this.monetizationDismissButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        const placement =
          this.monetizationState
            .offer?.placement;

        if (
          placement &&
          !this.monetizationState
            .busy
        ) {
          this.game.events.emit(
            HUD_MONETIZATION_ACTION_EVENT,
            'dismiss',
            placement,
          );
        }
      },
    );

    panel.add([
      bg,
      this.monetizationText,
      this.monetizationWatchButton,
      this.monetizationDismissButton,
    ]);

    panel
      .setDepth(320)
      .setVisible(false);

    this.monetizationPanel =
      panel;
  }

  private handleMonetizationState(
    state: MonetizationHudState,
  ): void {
    this.monetizationState =
      state;

    const offer =
      state.offer;
    const visible =
      state.enabled &&
      Boolean(offer);

    this.monetizationPanel
      ?.setVisible(visible);

    const adFreeActive =
      state.adFreeUntil >
      Date.now();

    this.returnHomeButton
      ?.setVisible(
        state.enabled &&
        state.canFastReturn,
      )
      .setText(
        state.returnTickets > 0
          ? `⌂ Дом · билет ×${state.returnTickets}`
          : adFreeActive
            ? '⌂ Дом · без рекламы'
            : '▶ Дом · реклама',
      )
      .setStyle({
        backgroundColor:
          state.busy
            ? '#514a58'
            : '#76538d',
        color:
          state.busy
            ? '#aaa5ad'
            : '#ffffff',
      });

    this.buyTicketsButton
      ?.setVisible(
        state.enabled &&
        state.canFastReturn &&
        state.purchaseAvailable,
      )
      .setText(
        `Купить ×${MONETIZATION_CONFIG.returnTicketPackSize} билетов${this.premiumState.purchaseCatalog[MONETIZATION_CONFIG.returnTicketProductId]?.price ? ` · ${this.premiumState.purchaseCatalog[MONETIZATION_CONFIG.returnTicketProductId].price}` : ''}`,
      );

    this.buyAdFreeButton
      ?.setVisible(
        state.enabled &&
        state.purchaseAvailable,
      )
      .setText(
        adFreeActive
          ? `Без рекламы: ${this.formatAdFreeRemaining(
              state.adFreeUntil -
                Date.now(),
            )} · +7 дней`
          : `Купить 7 дней без рекламы${this.premiumState.purchaseCatalog[MONETIZATION_CONFIG.adFreeWeekProductId]?.price ? ` · ${this.premiumState.purchaseCatalog[MONETIZATION_CONFIG.adFreeWeekProductId].price}` : ''}`,
      )
      .setStyle({
        backgroundColor:
          adFreeActive
            ? '#715f32'
            : '#5b4b2f',
        color:
          state.busy
            ? '#b6ad93'
            : '#fff5c9',
      });

    this.renderBlessingState();
    this.renderRewardedExtras();
    this.renderPremiumState();

    if (offer) {
      this.monetizationText?.setText(
        `${offer.title}\n${offer.description}\n${adFreeActive ? 'Награда' : 'Награда за просмотр'}: ${offer.rewardText}`,
      );

      this.monetizationWatchButton
        ?.setText(
          state.busy
            ? adFreeActive
              ? 'Получение…'
              : 'Реклама открывается…'
            : adFreeActive
              ? 'Получить'
              : 'Смотреть рекламу',
        )
        .setStyle({
          backgroundColor:
            state.busy
              ? '#514a58'
              : '#76538d',
          color:
            state.busy
              ? '#b9b2bd'
              : '#ffffff',
        });

      this.monetizationDismissButton
        ?.setText(
          offer.placement ===
            'death_revive'
            ? 'Умереть'
            : 'Не сейчас',
        )
        .setStyle({
          backgroundColor:
            state.busy
              ? '#3d413f'
              : offer.placement ===
                  'death_revive'
                ? '#78464a'
                : '#454c47',
          color:
            state.busy
              ? '#858b87'
              : '#d7ddd8',
        });
    }

    if (this.cityState) {
      this.handleCityState(
        this.cityState,
      );
    }
  }

  private renderBlessingState():
    void {
    const blessing =
      this.monetizationState
        .activeBlessing;

    const labels:
      Record<BlessingKind, string> = {
      damage: '⚔ Сила',
      health: '❤ Жизнь',
      speed: '➤ Ветер',
      gathering: '⛏ Добыча',
    };

    if (!blessing) {
      this.blessingStatusText
        ?.setVisible(false);
    } else {
      const seconds =
        Math.max(
          0,
          Math.ceil(
            (
              blessing.expiresAt -
              Date.now()
            ) /
              1000,
          ),
        );

      this.blessingStatusText
        ?.setVisible(
          seconds > 0,
        )
        .setText(
          `${labels[blessing.kind]} · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
        );
    }

    for (
      const kind of
      [
        'damage',
        'health',
        'speed',
        'gathering',
      ] as const
    ) {
      this.blessingButtons[
        kind
      ]?.setStyle({
        backgroundColor:
          blessing?.kind === kind
            ? '#8b6ba0'
            : '#5b496c',
        color:
          this.monetizationState
            .busy
            ? '#b8b1bd'
            : '#ffffff',
      });
    }
  }

  private formatAdFreeRemaining(
    ms: number,
  ): string {
    const hours =
      Math.max(
        0,
        Math.ceil(
          ms /
            (60 * 60 * 1000),
        ),
      );
    const days =
      Math.floor(
        hours / 24,
      );
    const restHours =
      hours % 24;

    return days > 0
      ? `${days}д ${restHours}ч`
      : `${restHours}ч`;
  }

  private formatCooldown(
    ms: number,
  ): string {
    const seconds =
      Math.max(
        0,
        Math.ceil(ms / 1000),
      );
    const minutes =
      Math.floor(
        seconds / 60,
      );

    return `${minutes}:${String(
      seconds % 60,
    ).padStart(2, '0')}`;
  }

  private renderRewardedExtras():
    void {
    const supplyCooldown =
      this.monetizationState
        .supplyCooldownRemainingMs;

    const supplyLabels:
      Record<
        SupplyResourceType,
        string
      > = {
      wood: 'Дерево',
      stone: 'Камень',
      metal: 'Металл',
      crystal: 'Кристалл',
      fiber: 'Волокно',
    };

    for (
      const resource of
      [
        'wood',
        'stone',
        'metal',
        'crystal',
        'fiber',
      ] as const
    ) {
      const button =
        this.supplyButtons[
          resource
        ];
      const amount =
        MONETIZATION_CONFIG
          .supplyRewards[
            resource
          ];

      button
        ?.setText(
          supplyCooldown > 0
            ? `${supplyLabels[resource]}\n${this.formatCooldown(supplyCooldown)}`
            : `${supplyLabels[resource]}\n▶ +${amount}`,
        )
        .setStyle({
          backgroundColor:
            supplyCooldown <= 0 &&
            !this.monetizationState
              .busy
              ? '#47606b'
              : '#444b4e',
          color:
            supplyCooldown <= 0
              ? '#ffffff'
              : '#aeb5b7',
        });
    }

  }

  private handleCityState(
    state: CityBuilderHudState,
  ): void {
    this.cityState =
      state;

    this.cityOpenButton
      ?.setVisible(
        state.insideSettlement,
      );

    if (
      !state.insideSettlement
    ) {
      this.setCityPanelOpen(
        false,
      );
    }

    this.cityHeaderText?.setText(
      `Ур. поселения ${state.settlementLevel} · NPC ${state.npcCount}`,
    );

    const pending =
      state.production.pending;

    this.cityProductionText?.setText(
      `Производство: Д${pending.wood} · К${pending.stone} · М${pending.metal} · ●${pending.coins}\nБуфер: ${state.production.used} / ${state.production.capacity} · цикл ${state.production.cycleSeconds}с`,
    );

    this.cityCollectButton
      ?.setText(
        state.production
          .canCollect
          ? 'Забрать производство'
          : 'Производство пусто',
      )
      .setStyle({
        backgroundColor:
          state.production
            .canCollect
            ? '#5d7e48'
            : '#4a504a',
        color:
          state.production
            .canCollect
            ? '#ffffff'
            : '#a9afa9',
      });

    this.cityProductionDoubleButton
      ?.setVisible(
        MONETIZATION_CONFIG.enabled,
      )
      .setText(
        state.production.canCollect
          ? this.monetizationState
              .adFreeUntil >
              Date.now()
            ? 'Забрать производство ×2'
            : 'Реклама: забрать производство ×2'
          : '×2 недоступно · производство пусто',
      )
      .setStyle({
        backgroundColor:
          state.production.canCollect &&
          !this.monetizationState
            .busy
            ? '#76538d'
            : '#4a4650',
        color:
          state.production.canCollect
            ? '#ffffff'
            : '#aaa5ad',
      });

    this.renderBlessingState();

    for (
      const building of
      state.buildings
    ) {
      const button =
        this.cityBuildingButtons[
          building.id
        ];

      if (!button) {
        continue;
      }

      const cost =
        building.nextCost;
      const costText =
        cost
          ? `Д${cost.wood} К${cost.stone} М${cost.metal}${cost.crystal ? ` Кр${cost.crystal}` : ''}${cost.fiber ? ` В${cost.fiber}` : ''} ●${cost.coins}`
          : 'MAX';

      const status =
        building.locked
          ? `Закрыто: ${building.lockReason}`
          : building.level >=
              building.maxLevel
            ? 'Максимальный уровень'
            : `Следующий уровень: ${costText}`;

      button
        .setText(
          `${building.name}  Lv.${building.level} / ${building.maxLevel}\n${building.effectText} · ${status}`,
        )
        .setStyle({
          backgroundColor:
            building.locked
              ? '#3f4540'
              : building.canAfford
                ? '#496343'
                : '#514d42',
          color:
            building.locked
              ? '#9ba29c'
              : '#ffffff',
        });
    }
  }

  private handleCityToggle(): void {
    if (
      this.cityState
        ?.insideSettlement
    ) {
      this.toggleCityPanel();
    }
  }

  private toggleCityPanel(): void {
    this.setCityPanelOpen(
      !this.cityPanelOpen,
    );
  }

  private setCityPanelOpen(
    open: boolean,
  ): void {
    this.cityPanelOpen =
      open &&
      Boolean(
        this.cityState
          ?.insideSettlement,
      );

    this.cityPanel?.setVisible(
      this.cityPanelOpen,
    );
  }

  private handleBestiaryState(
    state: BestiaryHudState,
  ): void {
    this.bestiaryState =
      state;

    if (
      !this.selectedBestiaryId ||
      !state.entries.some(
        (entry) =>
          entry.entryId ===
          this.selectedBestiaryId,
      )
    ) {
      this.selectedBestiaryId =
        state.entries.find(
          (entry) =>
            entry.discovered,
        )?.entryId ??
        state.entries[0]
          ?.entryId ??
        null;
    }

    this.renderBestiary();
  }

  private renderBestiary(): void {
    const state =
      this.bestiaryState;

    if (!state) {
      return;
    }

    const claimableCount =
      state.entries.filter(
        (entry) =>
          entry.claimableLevel !==
          null,
      ).length;

    this.bestiaryHeaderText?.setText(
      `Открыто ${state.discoveredCount} / ${state.totalCount} · MASTER ${state.masteryCount}`,
    );

    this.bestiaryOpenButton
      ?.setText(
        claimableCount > 0
          ? `◆ B · Бестиарий (${claimableCount})`
          : 'B · Бестиарий',
      )
      .setStyle({
        backgroundColor:
          claimableCount > 0
            ? '#79651fee'
            : '#304c35ee',
        color:
          claimableCount > 0
            ? '#fff3ad'
            : '#fff2c0',
      });

    for (
      const entry of
      state.entries
    ) {
      const button =
        this.bestiaryEntryButtons[
          entry.entryId
        ];

      button
        ?.setText(
          `${entry.claimableLevel ? '◆ ' : entry.mastery ? '★ ' : ''}${entry.name}   Lv.${entry.level}`,
        )
        .setStyle({
          backgroundColor:
            entry.claimableLevel
              ? entry.entryId ===
                this.selectedBestiaryId
                ? '#a17f24'
                : '#79651f'
              : entry.entryId ===
                  this.selectedBestiaryId
                ? '#6b5a86'
                : entry.discovered
                  ? '#34553c'
                  : '#343b36',
          color:
            entry.claimableLevel
              ? '#fff3ad'
              : entry.discovered
                ? '#ffffff'
                : '#8d958e',
        });
    }

    const entry =
      this.getSelectedBestiaryEntry();

    if (!entry) {
      return;
    }

    this.bestiaryNameText?.setText(
      entry.mastery
        ? `★ ${entry.name}`
        : entry.name,
    );
    this.bestiaryLevelText?.setText(
      `Lv.${entry.level} / 5`,
    );

    this.bestiaryImage
      ?.setTexture(
        entry.texture,
      )
      .setVisible(
        entry.discovered,
      );

    const showElite =
      entry.kind === 'species' &&
      entry.eliteDiscovered &&
      Boolean(
        entry.eliteTexture,
      );

    if (
      showElite &&
      entry.eliteTexture
    ) {
      this.bestiaryEliteImage
        ?.setTexture(
          entry.eliteTexture,
        )
        .setVisible(true);
    } else {
      this.bestiaryEliteImage
        ?.setVisible(false);
    }

    if (!entry.discovered) {
      this.bestiaryDetailsText?.setText(
        'Запись ещё не открыта. Найдите этого противника в мире.',
      );
      this.bestiaryProgressText?.setText(
        'Уровень 0 / 5',
      );
      this.bestiaryRewardText?.setText(
        'Первая награда откроется после обнаружения.',
      );
      this.bestiaryClaimButton
        ?.setText(
          'Награда недоступна',
        )
        .setStyle({
          backgroundColor:
            '#494f4a',
          color:
            '#9da39e',
        });
      return;
    }

    const eliteLine =
      entry.kind ===
        'species'
        ? `\nЭлитная форма: ${entry.eliteName ?? '—'} · убийств элиты ${entry.eliteKills}`
        : '';

    this.bestiaryDetailsText?.setText(
      `Ареал: ${entry.area}\nУязвимость: ${entry.weakness}\nСопротивление: ${entry.resistance}\nДроп: ${entry.dropText}${eliteLine}`,
    );

    this.bestiaryProgressText?.setText(
      `${entry.progressText}\nВсего убийств: ${entry.kills}`,
    );

    this.bestiaryRewardText?.setText(
      entry.claimableLevel
        ? `Доступна награда Lv.${entry.claimableLevel}: ${entry.rewardPreview}`
        : entry.mastery
          ? 'Все награды получены · mastery завершён'
          : `Следующая награда: ${entry.rewardPreview}`,
    );

    this.bestiaryClaimButton
      ?.setText(
        entry.claimableLevel
          ? `Забрать награду Lv.${entry.claimableLevel}`
          : 'Награда недоступна',
      )
      .setStyle({
        backgroundColor:
          entry.claimableLevel
            ? '#6b8e4c'
            : '#494f4a',
        color:
          entry.claimableLevel
            ? '#ffffff'
            : '#9da39e',
      });
  }

  private getSelectedBestiaryEntry():
    BestiaryHudEntry | undefined {
    return this.bestiaryState
      ?.entries.find(
        (entry) =>
          entry.entryId ===
          this.selectedBestiaryId,
      );
  }

  private handleBestiaryToggle(): void {
    this.toggleBestiaryPanel();
  }

  private toggleBestiaryPanel(): void {
    this.setBestiaryPanelOpen(
      !this.bestiaryPanelOpen,
    );
  }

  private setBestiaryPanelOpen(
    open: boolean,
  ): void {
    this.bestiaryPanelOpen =
      open;
    this.bestiaryPanel?.setVisible(
      open,
    );

    if (open) {
      this.renderBestiary();
    }
  }

  private handleQuestState(
    state: QuestHudState,
  ): void {
    this.questState =
      state;

    this.questTitleText?.setText(
      `${state.title} · ${state.sequenceProgress}`,
    );
    this.questObjectiveText?.setText(
      state.objective,
    );
    this.questProgressText?.setText(
      `${state.progress}${state.rewardText ? ` · награда ${state.rewardText}` : ''}`,
    );
    this.questHintText?.setText(
      state.hint,
    );
    this.questOptionalText?.setText(
      state.optional
        ? `Доп.: ${state.optional.title} · ${state.optional.progress} · ${state.optional.rewardText}`
        : 'Дополнительные цели выполнены',
    );
  }

  private handleUpgradeState(
    state: UpgradeHudState,
  ): void {
    this.upgradeState =
      state;
    this.renderRewardedExtras();

    const labels:
      Record<
        PlayerUpgradeId,
        string
      > = {
      'max-health': 'Здоровье',
      'move-speed': 'Скорость',
      backpack: 'Рюкзак',
      dash: 'Рывок',
    };

    const levels:
      Record<
        PlayerUpgradeId,
        number
      > = {
      'max-health':
        state.player
          .maxHealthLevel,
      'move-speed':
        state.player
          .moveSpeedLevel,
      backpack:
        state.player
          .backpackLevel,
      dash:
        state.player
          .dashLevel,
    };

    for (
      const id of
      [
        'max-health',
        'move-speed',
        'backpack',
        'dash',
      ] as const
    ) {
      const level =
        levels[id];
      const cost =
        getPlayerUpgradeCost(
          id,
          level,
        );
      const affordable =
        canAffordUpgrade(
          state.storage,
          cost,
        );
      const button =
        this.playerUpgradeButtons[
          id
        ];

      const rareCost =
        cost
          ? `${cost.crystal ? ` Кр${cost.crystal}` : ''}${cost.fiber ? ` В${cost.fiber}` : ''}`
          : '';

      button?.setText(
        cost
          ? `${labels[id]} Lv.${level} → ${level + 1}   ●${cost.coins} Д${cost.wood} К${cost.stone} М${cost.metal}${rareCost}`
          : `${labels[id]} Lv.${MAX_PLAYER_UPGRADE_LEVEL} · MAX`,
      );

      button?.setStyle({
        backgroundColor:
          cost && affordable
            ? '#486b43'
            : '#444b45',
        color:
          cost
            ? '#ffffff'
            : '#bfc5bf',
      });
    }

    const weaponId =
      state.selectedWeaponId;
    const equipped =
      state.equippedWeapon;
    const weaponLevel =
      equipped.level;
    const unlocked =
      state.unlockedWeaponIds
        .includes(weaponId);
    const weaponCost =
      unlocked
        ? getWeaponUpgradeCost(
            weaponId,
            weaponLevel,
          )
        : null;
    const weaponAffordable =
      unlocked &&
      canAffordUpgrade(
        state.storage,
        weaponCost,
      );
    const weaponRareCost =
      weaponCost
        ? `${weaponCost.crystal ? ` Кр${weaponCost.crystal}` : ''}${weaponCost.fiber ? ` В${weaponCost.fiber}` : ''}`
        : '';
    const starText =
      equipped.stars > 0
        ? ` ${'★'.repeat(equipped.stars)}`
        : ' ☆';
    const rarityLabel =
      `${equipped.rarityName}${starText}`;

    this.weaponUpgradeButton
      ?.setText(
        !unlocked
          ? `${WEAPON_DEFINITIONS[weaponId].name} · закрыто`
          : weaponCost
            ? `${WEAPON_DEFINITIONS[weaponId].name} · ${rarityLabel} · Lv.${weaponLevel} → ${weaponLevel + 1}   ●${weaponCost.coins} К${weaponCost.stone} М${weaponCost.metal}${weaponRareCost}`
            : `${WEAPON_DEFINITIONS[weaponId].name} · ${rarityLabel} · Lv.${MAX_WEAPON_LEVEL} · MAX`,
      )
      .setStyle({
        backgroundColor:
          weaponAffordable
            ? '#76538d'
            : '#4a4350',
        color:
          unlocked
            ? equipped.rarityColor
            : '#9f9aa2',
      });

    this.weaponVariantButton
      ?.setText(
        state.weaponOptions.length > 1
          ? `Экземпляр: ${rarityLabel} · Lv.${weaponLevel} · копий ★${equipped.stars}: ${equipped.count} · нажать для смены`
          : `Экземпляр: ${rarityLabel} · Lv.${weaponLevel} · других вариантов пока нет`,
      )
      .setStyle({
        backgroundColor:
          state.weaponOptions.length > 1
            ? '#405968'
            : '#434a4e',
        color:
          equipped.rarityColor,
      });

    const hasFuseCopies =
      equipped.stars <
        MAX_WEAPON_STARS &&
      equipped.count >= 2;
    const fusionCost =
      equipped.stars <
        MAX_WEAPON_STARS
        ? getWeaponFusionCost(
            equipped.stars,
          )
        : null;
    const fusionAffordable =
      hasFuseCopies &&
      canAffordUpgrade(
        state.storage,
        fusionCost,
      );
    const nextStar =
      Math.min(
        MAX_WEAPON_STARS,
        equipped.stars + 1,
      );
    const fusionCostText =
      fusionCost
        ? `●${fusionCost.coins} К${fusionCost.stone} М${fusionCost.metal}${fusionCost.crystal ? ` Кр${fusionCost.crystal}` : ''}${fusionCost.fiber ? ` В${fusionCost.fiber}` : ''}`
        : '';

    this.weaponFuseButton
      ?.setText(
        equipped.stars >=
          MAX_WEAPON_STARS
          ? `Звёздность MAX · ${'★'.repeat(MAX_WEAPON_STARS)}`
          : !hasFuseCopies
            ? `Для ★${nextStar}: нужно 2 × ${equipped.rarityName} ★${equipped.stars} · есть ${equipped.count}`
            : fusionAffordable
              ? `Слить → ★${nextStar} · ${fusionCostText} · урон ×1.5`
              : `Слияние ★${equipped.stars} → ★${nextStar} · не хватает: ${fusionCostText}`,
      )
      .setStyle({
        backgroundColor:
          fusionAffordable
            ? '#7a5e35'
            : '#49473f',
        color:
          fusionAffordable
            ? '#fff0ae'
            : '#aaa79c',
      });
  }

  private handleSettlementState(
    state: SettlementHudState,
  ): void {
    this.settlementState =
      state;

    this.forgePrompt
      ?.setVisible(
        state.nearForge,
      );
    this.forgePromptText
      ?.setVisible(
        state.nearForge,
      )
      .setText(
        state.forge.restored
          ? 'E · Кузница'
          : 'E · Восстановить кузницу',
      );

    if (!state.nearForge) {
      this.setForgePanelOpen(
        false,
      );
    }

    const forge =
      state.forge;

    this.forgeStageText?.setText(
      `Этап ${forge.repairStage} / ${forge.maxRepairStage}\n${forge.stageName}`,
    );

    const cost =
      forge.nextCost;

    this.forgeCostText?.setText(
      forge.restored
        ? 'Кузница снова работает'
        : cost
          ? `Следующий ремонт: дерево ${cost.wood} · камень ${cost.stone} · металл ${cost.metal}`
          : '',
    );

    this.forgeStorageText?.setText(
      `Склад: дерево ${forge.storage.wood} · камень ${forge.storage.stone} · металл ${forge.storage.metal}`,
    );

    this.forgeNpcText?.setText(
      forge.npcPresent
        ? 'Кузнец готов улучшать снаряжение.'
        : '',
    );

    this.forgeRepairButton
      ?.setVisible(
        !forge.restored,
      );
    this.forgeRepairButtonText
      ?.setVisible(
        !forge.restored,
      );
    this.upgradeTitle?.setVisible(
      forge.restored,
    );

    for (
      const button of
      Object.values(
        this.playerUpgradeButtons,
      )
    ) {
      button.setVisible(
        forge.restored,
      );
    }

    this.weaponUpgradeButton
      ?.setVisible(
        forge.restored,
      );
    this.weaponVariantButton
      ?.setVisible(
        forge.restored,
      );
    this.weaponFuseButton
      ?.setVisible(
        forge.restored,
      );

    this.forgeRepairButton
      ?.setFillStyle(
        forge.restored
          ? 0x4b574b
          : forge.canAfford
            ? 0x6f9250
            : 0x555c51,
        1,
      );

    this.forgeRepairButtonText?.setText(
      forge.restored
        ? 'Восстановлено'
        : forge.canAfford
          ? 'Вложить ресурсы'
          : 'Не хватает ресурсов',
    );
  }

  private handleForgeToggle(): void {
    if (
      this.settlementState
        ?.nearForge
    ) {
      this.toggleForgePanel();
    }
  }

  private toggleForgePanel(): void {
    this.setForgePanelOpen(
      !this.forgePanelOpen,
    );
  }

  private setForgePanelOpen(
    open: boolean,
  ): void {
    this.forgePanelOpen =
      open &&
      Boolean(
        this.settlementState
          ?.nearForge,
      );

    this.forgePanel?.setVisible(
      this.forgePanelOpen,
    );
  }

  private handleGatheringState(
    state: GatheringHudState,
  ): void {
    const {
      carried,
      usedCapacity,
      capacity,
    } =
      state.backpack;
    const ratio =
      capacity > 0
        ? Phaser.Math.Clamp(
            usedCapacity /
              capacity,
            0,
            1,
          )
        : 0;

    this.backpackFill
      ?.setDisplaySize(
        268 * ratio,
        14,
      )
      .setFillStyle(
        ratio >= 1
          ? 0xe16b55
          : ratio >= 0.8
            ? 0xe0b64d
            : 0x67c96a,
        1,
      );

    this.backpackText?.setText(
      `${usedCapacity} / ${capacity}`,
    );

    this.carriedText?.setText(
      `С собой: Д ${carried.wood} · К ${carried.stone} · М ${carried.metal} · Кр ${carried.crystal ?? 0} · В ${carried.fiber ?? 0} · ● ${carried.coins}`,
    );

    this.storageText?.setText(
      `Склад: Д ${state.storage.wood} · К ${state.storage.stone} · М ${state.storage.metal} · Кр ${state.storage.crystal ?? 0} · В ${state.storage.fiber ?? 0} · ● ${state.storage.coins}`,
    );
  }

  private handleCombatState(
    state: CombatState,
  ): void {
    if (this.upgradeState) {
      this.handleUpgradeState({
        ...this.upgradeState,
        selectedWeaponId:
          state.weaponId,
        unlockedWeaponIds:
          [...state.unlockedWeaponIds],
      });
    }
    const ratio =
      Phaser.Math.Clamp(
        state.health /
          state.maxHealth,
        0,
        1,
      );

    this.healthFill?.setDisplaySize(
      234 * ratio,
      20,
    );

    this.healthText?.setText(
      `HP ${state.health} / ${state.maxHealth}`,
    );

    this.potionCountText?.setText(
      `×${state.healthPotions}`,
    );

    this.potionLastKnownCount =
      state.healthPotions;
    this.potionCooldownMs =
      state.healthPotionCooldownMs;

    if (
      state
        .healthPotionCooldownRemainingMs >
      0
    ) {
      this.potionCooldownUntil =
        this.time.now +
        state
          .healthPotionCooldownRemainingMs;
    } else {
      this.potionCooldownUntil = 0;
    }

    this.updatePotionCooldownVisual();

    const potionAvailable =
      state.healthPotions > 0 &&
      state.health <
        state.maxHealth;

    this.potionButton?.setFillStyle(
      potionAvailable
        ? 0x8f4556
        : 0x414944,
      potionAvailable
        ? 1
        : 0.72,
    );


    for (
      const weaponId of
      WEAPON_ORDER
    ) {
      const unlocked =
        state.unlockedWeaponIds
          .includes(weaponId);
      const selected =
        weaponId ===
        state.weaponId;

      this.weaponButtons[
        weaponId
      ]?.setFillStyle(
        selected
          ? 0x7751a1
          : unlocked
            ? 0x315f35
            : 0x353a37,
        unlocked
          ? 1
          : 0.72,
      );

      this.weaponButtons[
        weaponId
      ]?.setStrokeStyle(
        selected
          ? 4
          : 2,
        selected
          ? 0xffe590
          : unlocked
            ? 0xf3f5dd
            : 0x777d78,
        selected
          ? 1
          : 0.5,
      );

      const icon =
        this.weaponIcons[
          weaponId
        ];

      if (!icon) {
        continue;
      }

      icon
        .setAlpha(
          unlocked
            ? 1
            : 0.24,
        )
        .setScale(
          selected
            ? 0.7
            : 0.62,
        );

      if (unlocked) {
        icon.clearTint();
      } else {
        icon.setTint(
          0x777777,
        );
      }
    }
  }

  private handleAreaName(
    areaName: string,
  ): void {
    this.areaText?.setText(
      areaName,
    );
  }

  private handleNotice(
    message: string,
  ): void {
    if (!this.noticeText) {
      return;
    }

    this.tweens.killTweensOf(
      this.noticeText,
    );

    this.noticeText
      .setText(message)
      .setAlpha(1)
      .setScale(0.96);

    this.tweens.add({
      targets:
        this.noticeText,
      scale: 1,
      duration: 120,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(
          1450,
          () => {
            if (
              !this.noticeText
            ) {
              return;
            }

            this.tweens.add({
              targets:
                this.noticeText,
              alpha: 0,
              y:
                this.noticeText.y -
                10,
              duration: 260,
              onComplete: () => {
                this.noticeText?.setY(
                  110,
                );
              },
            });
          },
        );
      },
    });
  }

  private handleResize(): void {
    configureLogicalCamera(this);
  }

  private cleanup(): void {
    this.game.events.off(
      HUD_GATHERING_STATE_EVENT,
      this.handleGatheringState,
      this,
    );
    this.game.events.off(
      HUD_SETTLEMENT_STATE_EVENT,
      this.handleSettlementState,
      this,
    );
    this.game.events.off(
      HUD_UPGRADE_STATE_EVENT,
      this.handleUpgradeState,
      this,
    );
    this.game.events.off(
      HUD_QUEST_STATE_EVENT,
      this.handleQuestState,
      this,
    );
    this.game.events.off(
      HUD_BESTIARY_STATE_EVENT,
      this.handleBestiaryState,
      this,
    );
    this.game.events.off(
      HUD_CITY_STATE_EVENT,
      this.handleCityState,
      this,
    );
    this.game.events.off(
      HUD_MONETIZATION_STATE_EVENT,
      this.handleMonetizationState,
      this,
    );
    this.game.events.off(
      HUD_PLAYER_PROGRESS_STATE_EVENT,
      this.handlePlayerProgressState,
      this,
    );
    this.game.events.off(
      HUD_PREMIUM_STATE_EVENT,
      this.handlePremiumState,
      this,
    );
    this.game.events.off(
      HUD_CHARACTER_STATE_EVENT,
      this.handleCharacterState,
      this,
    );

    window.removeEventListener(
      YANDEX_PLATFORM_STATE_EVENT,
      this.handleYandexPlatformState,
    );
    this.game.events.off(
      HUD_COMBAT_STATE_EVENT,
      this.handleCombatState,
      this,
    );
    this.game.events.off(
      HUD_AREA_EVENT,
      this.handleAreaName,
      this,
    );
    this.game.events.off(
      HUD_NOTICE_EVENT,
      this.handleNotice,
      this,
    );
    this.input.keyboard?.off(
      'keydown-C',
      this.handleCityToggle,
      this,
    );
    this.input.keyboard?.off(
      'keydown-Q',
      this.handleHealthPotionKey,
      this,
    );
    this.input.keyboard?.off(
      'keydown-E',
      this.handleForgeToggle,
      this,
    );
    this.input.keyboard?.off(
      'keydown-B',
      this.handleBestiaryToggle,
      this,
    );
    this.input.keyboard?.off(
      'keydown-P',
      this.handleProfileToggle,
      this,
    );
    this.input.keyboard?.off(
      'keydown-M',
      this.handlePremiumToggle,
      this,
    );
    this.scale.off(
      Phaser.Scale.Events.RESIZE,
      this.handleResize,
      this,
    );
  }
}

function ensureHealthPotionTexture(
  scene: Phaser.Scene,
): void {
  const key =
    'ruinstead-health-potion-hud';

  if (
    scene.textures.exists(key)
  ) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0xd8e6de,
    1,
  );
  g.fillRoundedRect(
    15,
    5,
    18,
    12,
    4,
  );

  g.fillStyle(
    0x9aafaa,
    1,
  );
  g.fillRoundedRect(
    18,
    2,
    12,
    6,
    2,
  );

  g.fillStyle(
    0xf36b76,
    1,
  );
  g.fillRoundedRect(
    8,
    15,
    32,
    31,
    10,
  );

  g.fillStyle(
    0xffa0a8,
    0.9,
  );
  g.fillRoundedRect(
    13,
    19,
    12,
    21,
    6,
  );

  g.lineStyle(
    3,
    0xffe6df,
    0.9,
  );
  g.strokeRoundedRect(
    8,
    15,
    32,
    31,
    10,
  );

  g.generateTexture(
    key,
    48,
    52,
  );
  g.destroy();
}
