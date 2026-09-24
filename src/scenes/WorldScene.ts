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
import { PlayerController } from '../game/player/PlayerController';
import { DebugOverlay } from '../game/qa/DebugOverlay';
import {
  type GameState,
} from '../game/state/GameState';
import { GameStateStore } from '../game/state/GameStateStore';
import {
  HUD_AREA_EVENT,
  HUD_COMBAT_STATE_EVENT,
  HUD_GATHERING_STATE_EVENT,
  HUD_NOTICE_EVENT,
  HUD_WEAPON_SELECT_EVENT,
  type GatheringHudState,
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

const DEATH_RESOURCE_LOSS_FRACTION =
  0.35;

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
        this.gameState.resources
          .coins,
        () => {
          this.handlePlayerDefeated();
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
        },
        usedCapacity: 0,
        capacity: 30,
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
          }
        : {
            wood: 0,
            stone: 0,
            metal: 0,
          };

    return {
      backpack,
      storage,
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
      this.gameState.resources.coins =
        state.coins;
      this.saveState();
    }

    this.game.events.emit(
      HUD_COMBAT_STATE_EVENT,
      state,
    );
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

    this.saveState();
  }

  private handlePlayerDefeated(): void {
    if (!this.backpack) {
      return;
    }

    const lost =
      this.backpack.loseFraction(
        DEATH_RESOURCE_LOSS_FRACTION,
      );

    this.handleBackpackChanged();

    if (
      totalResourceUnits(
        lost,
      ) > 0
    ) {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        `Поражение: потеряно ${this.formatResources(lost)}`,
      );
    } else {
      this.game.events.emit(
        HUD_NOTICE_EVENT,
        'Поражение: полевая добыча не потеряна',
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

    this.scene.stop(
      'HudScene',
    );

    this.resourceSystem?.destroy();
    this.resourceSystem =
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
