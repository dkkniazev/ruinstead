import Phaser from 'phaser';
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
  RESOURCE_TYPES,
  totalResourceUnits,
  type ResourceCounts,
} from '../game/gathering/ResourceTypes';
import {
  configureLogicalCamera,
} from '../game/layout/Viewport';
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
import { GameStateStore } from '../game/state/GameStateStore';
import {
  HUD_AREA_EVENT,
  HUD_COMBAT_STATE_EVENT,
  HUD_GATHERING_STATE_EVENT,
  HUD_NOTICE_EVENT,
  HUD_SETTLEMENT_STATE_EVENT,
  HUD_FORGE_REPAIR_EVENT,
  HUD_PLAYER_UPGRADE_EVENT,
  HUD_UPGRADE_STATE_EVENT,
  HUD_WEAPON_UPGRADE_EVENT,
  HUD_WEAPON_SELECT_EVENT,
  type GatheringHudState,
  type UpgradeHudState,
} from '../game/ui/HudEvents';
import {
  RETURN_POINT,
  RETURN_RADIUS,
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
  private settlementSystem?:
    SettlementSystem;

  private debugOverlay?:
    DebugOverlay;
  private lastAreaName = '';
  private wasAtReturnPoint = false;

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

    this.settlementSystem =
      new SettlementSystem(
        this,
        this.gameState.settlement
          .repairStages.forge,
        this.gameState.settlement
          .buildings.forge,
      );

    this.enemies =
      new EnemySystem(this);

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
      );

    this.physics.add.collider(
      this.player.sprite,
      world.obstacles,
    );
    this.physics.add.collider(
      this.enemies.group,
      world.obstacles,
    );
    this.physics.add.collider(
      this.bosses.group,
      world.obstacles,
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
        (value) =>
          this.handleCoinCollected(
            value,
          ),
        () => {
          this.handlePlayerDefeated();
        },
        () => {
          this.handlePlayerRespawned();
        },
      );

    this.createWeaponKeys();

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

    this.lastAreaName =
      getAreaName(
        this.player.position,
      );

    this.wasAtReturnPoint =
      this.isAtReturnPoint();

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

      this.enemies.update(
        time,
        this.player.position,
        onPlayerHit,
      );

      this.bosses.update(
        time,
        this.player.position,
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
    }

    this.handleReturnPoint();
    this.updateSettlement();
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
            coins:
              this.gameState
                .resources.coins,
          }
        : {
            wood: 0,
            stone: 0,
            metal: 0,
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
            coins:
              this.gameState
                .resources.coins,
          }
        : {
            wood: 0,
            stone: 0,
            metal: 0,
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

    this.saveState();
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
      !this.wasAtReturnPoint &&
      this.backpack
        .state.usedCapacity > 0
    ) {
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
      event.isMain &&
      firstClear
    ) {
      if (
        !this.gameState.world
          .unlockedZones
          .includes('stage-2')
      ) {
        this.gameState.world
          .unlockedZones
          .push('stage-2');
      }

      this.combat?.unlockWeapon(
        'daggers',
      );

      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `${event.name} повержен! Кинжалы открыты · проход дальше разблокирован`,
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

    this.scene.stop(
      'HudScene',
    );

    this.resourceSystem?.destroy();
    this.resourceSystem =
      undefined;

    this.settlementSystem?.destroy();
    this.settlementSystem =
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
