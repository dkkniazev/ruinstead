import Phaser from 'phaser';
import {
  BestiarySystem,
  type BestiaryEntryKind,
  type BestiaryHudState,
} from '../game/bestiary/BestiarySystem';
import {
  BossSystem,
  type BossDefeatEvent,
} from '../game/bosses/BossSystem';
import {
  CombatSystem,
  type CombatState,
} from '../game/combat/CombatSystem';
import {
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
import { PlayerController } from '../game/player/PlayerController';
import { DebugOverlay } from '../game/qa/DebugOverlay';
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
  HUD_CITY_STATE_EVENT,
  HUD_CITY_UPGRADE_EVENT,
  HUD_GATHERING_STATE_EVENT,
  HUD_HEALTH_POTION_EVENT,
  HUD_NOTICE_EVENT,
  HUD_SETTLEMENT_STATE_EVENT,
  HUD_FORGE_REPAIR_EVENT,
  HUD_PLAYER_UPGRADE_EVENT,
  HUD_QUEST_STATE_EVENT,
  HUD_UPGRADE_STATE_EVENT,
  HUD_WEAPON_UPGRADE_EVENT,
  HUD_WEAPON_SELECT_EVENT,
  type GatheringHudState,
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

export class WorldScene
  extends Phaser.Scene {
  private readonly stateStore =
    new GameStateStore();

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
          weaponLevels:
            this.gameState.player
              .weaponLevels,
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
      weaponLevels: {
        axe:
          state?.player
            .weaponLevels.axe ?? 0,
        sword:
          state?.player
            .weaponLevels.sword ?? 0,
        hammer:
          state?.player
            .weaponLevels.hammer ?? 0,
        spear:
          state?.player
            .weaponLevels.spear ?? 0,
        daggers:
          state?.player
            .weaponLevels.daggers ?? 0,
      },
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
        `${completion.optional ? 'Доп. цель' : 'Цель'} выполнена: ${completion.title} · +●${completion.reward.coins} · +XP ${completion.reward.settlementXp}`,
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

    this.emitBestiaryState();
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

    this.emitBestiaryState();
    this.emitProgressionState();
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

    this.gameState.backpack = {
      ...this.backpack.state
        .carried,
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

  private handlePlayerDefeated(): void {
    if (
      !this.backpack ||
      !this.player ||
      !this.resourceSystem
    ) {
      return;
    }

    const deathPosition =
      this.player.position;
    const dropped =
      this.backpack.takeAll();

    this.resourceSystem.spawnDeathDrop(
      deathPosition,
      dropped,
    );

    this.enemies?.resetCombat(
      this.time.now,
    );
    this.bosses?.resetCombat(
      this.time.now,
    );

    this.handleBackpackChanged();

    if (
      totalResourceUnits(
        dropped,
      ) > 0
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `Поражение: весь рюкзак выпал на месте смерти — ${this.formatResources(dropped)}`,
      );
    } else {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Поражение: рюкзак был пуст',
      );
    }
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
        ] += deposited[type];
      }

      this.gameState.progression
        .expeditionCount += 1;

      this.gameState.backpack = {
        ...this.backpack.state
          .carried,
      };

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `Добыча сохранена: ${this.formatResources(deposited)}`,
      );

      this.game.events.emit(
        HUD_GATHERING_STATE_EVENT,
        this.gatheringHudState,
      );
      this.game.events.emit(
        HUD_SETTLEMENT_STATE_EVENT,
        this.settlementHudState,
      );

      this.saveState();
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

      this.combat?.unlockWeapon(
        'daggers',
      );

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `${event.name} повержен! Сердце корней получено · кинжалы открыты · теперь можно восстановить мост`,
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

      this.combat?.unlockWeapon(
        'sword',
      );
      this.stageTwoGateSystem
        ?.unlock();

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `${event.name} повержен! Ядро солнца получено · меч открыт · врата в следующую часть мира открыты`,
      );
    } else {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `${event.name} повержен · босс возродится позже`,
      );
    }

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

    const currentLevel =
      this.gameState.player
        .weaponLevels[
          weaponId
        ];
    const cost =
      getWeaponUpgradeCost(
        weaponId,
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
          ? 'Не хватает ресурсов для улучшения оружия'
          : 'Оружие уже максимального уровня',
      );
      return;
    }

    spendUpgradeCost(
      this.gameState.resources,
      cost,
    );

    this.gameState.player
      .weaponLevels[
        weaponId
      ] =
        currentLevel + 1;

    this.applyProgression();

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      `${WEAPON_ORDER.includes(
        weaponId,
      ) ? weaponId : 'Оружие'} улучшено до уровня ${currentLevel + 1}`,
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
      this.gameState.player
        .weaponLevels,
    );
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

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Переход открыт: вы вошли в преддверие второй зоны',
    );

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

    this.game.events.emit(
      HUD_NOTICE_EVENT,
      'Открыто преддверие следующей части мира',
    );

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
      this.gameState.backpack = {
        ...this.backpack.state
          .carried,
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
