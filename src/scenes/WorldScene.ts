import Phaser from 'phaser';
import {
  configureLogicalCamera,
} from '../game/layout/Viewport';
import { PlayerController } from '../game/player/PlayerController';
import { DebugOverlay } from '../game/qa/DebugOverlay';
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createPrototypeWorld,
  getAreaName,
} from '../game/world/WorldPrototype';
import { GameStateStore } from '../game/state/GameStateStore';
import {
  markYandexGameReady,
  startYandexGameplay,
} from '../platform/yandex/YandexPlatform';
import { EnemySystem } from '../game/enemies/EnemySystem';
import {
  CombatSystem,
  type CombatState,
} from '../game/combat/CombatSystem';
import type {
  WeaponId,
} from '../game/combat/WeaponDefinitions';
import {
  HUD_AREA_EVENT,
  HUD_COMBAT_STATE_EVENT,
  HUD_WEAPON_SELECT_EVENT,
} from '../game/ui/HudEvents';

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

  private weaponOneKey?:
    Phaser.Input.Keyboard.Key;
  private weaponTwoKey?:
    Phaser.Input.Keyboard.Key;

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
      );

    this.weaponOneKey =
      this.input.keyboard?.addKey(
        Phaser.Input.Keyboard.KeyCodes.ONE,
      );
    this.weaponTwoKey =
      this.input.keyboard?.addKey(
        Phaser.Input.Keyboard.KeyCodes.TWO,
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
    if (
      this.weaponOneKey &&
      Phaser.Input.Keyboard.JustDown(
        this.weaponOneKey,
      )
    ) {
      this.combat?.setWeapon(
        'blade',
      );
    }

    if (
      this.weaponTwoKey &&
      Phaser.Input.Keyboard.JustDown(
        this.weaponTwoKey,
      )
    ) {
      this.combat?.setWeapon(
        'bow',
      );
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
