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
  HUD_NOTICE_EVENT,
  HUD_WEAPON_SELECT_EVENT,
} from '../game/ui/HudEvents';
import {
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

  private debugOverlay?:
    DebugOverlay;
  private lastAreaName = '';

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

    this.player =
      new PlayerController(
        this,
        world.spawn.x,
        world.spawn.y,
      );

    this.enemies =
      new EnemySystem(this);

    this.bosses =
      new BossSystem(
        this,
        this.gameState.world
          .defeatedBosses,
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

    this.scene.launch(
      'HudScene',
      {
        initialCombatState:
          this.combat.state,
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
      this.combat
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

      this.combat.update(
        time,
        delta,
      );
    }

    this.handleWeaponKeys();
    this.updateAreaName();
    this.debugOverlay?.update();
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

  private handleBossDefeated(
    event: BossDefeatEvent,
  ): void {
    if (!this.gameState) {
      return;
    }

    if (
      !this.gameState.world
        .defeatedBosses
        .includes(event.id)
    ) {
      this.gameState.world
        .defeatedBosses
        .push(event.id);
    }

    if (event.isMain) {
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
        `${event.name} повержен`,
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
