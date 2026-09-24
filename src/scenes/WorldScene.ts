import Phaser from 'phaser';
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
import { GameStateStore } from '../game/state/GameStateStore';
import {
  HUD_AREA_EVENT,
  HUD_COMBAT_STATE_EVENT,
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

  private player?:
    PlayerController;
  private enemies?:
    EnemySystem;
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

    const state =
      this.stateStore.load();
    this.stateStore.save(state);

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

    this.physics.add.collider(
      this.player.sprite,
      world.obstacles,
    );
    this.physics.add.collider(
      this.enemies.group,
      world.obstacles,
    );
    this.physics.add.collider(
      this.player.sprite,
      this.enemies.group,
    );

    this.combat =
      new CombatSystem(
        this,
        this.player,
        this.enemies,
        world.spawn,
        (combatState) => {
          this.handleCombatState(
            combatState,
          );
        },
        state.player.weaponId,
        state.player
          .unlockedWeaponIds,
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
      this.combat
    ) {
      this.enemies.update(
        time,
        this.player.position,
        (damage) => {
          this.combat?.damagePlayer(
            damage,
          );
        },
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

    this.game.events.emit(
      HUD_COMBAT_STATE_EVENT,
      state,
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

    this.enemies?.destroy();
    this.enemies = undefined;

    this.player?.destroy();
    this.player = undefined;

    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;
  }
}
