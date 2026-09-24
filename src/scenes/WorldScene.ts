import Phaser from 'phaser';
import {
  LOGICAL_WIDTH,
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
import { CombatHud } from '../game/combat/CombatHud';

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
  private combatHud?:
    CombatHud;

  private debugOverlay?:
    DebugOverlay;
  private areaLabel?:
    Phaser.GameObjects.Text;
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

    this.combatHud =
      new CombatHud(
        this,
        (weaponId) => {
          this.combat?.setWeapon(
            weaponId,
          );
        },
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

    this.createHud();

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
    this.updateAreaLabel();
    this.debugOverlay?.update();
  }

  private createHud(): void {
    const panel =
      this.add
        .rectangle(
          139,
          50,
          240,
          58,
          0x244825,
          0.72,
        )
        .setStrokeStyle(
          2,
          0xe9f5d3,
          0.32,
        )
        .setScrollFactor(0)
        .setDepth(8400);

    panel.setOrigin(0.5);

    this.areaLabel = this.add
      .text(
        28,
        32,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#fff7d6',
        },
      )
      .setScrollFactor(0)
      .setDepth(8500);

    this.add
      .text(
        LOGICAL_WIDTH - 24,
        28,
        'Автобой · 1/2 оружие · Space/Shift рывок',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          color: '#31502f',
          backgroundColor:
            '#efffd0bb',
          padding: {
            x: 10,
            y: 6,
          },
        },
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(8500);

    this.updateAreaLabel();
  }

  private handleCombatState(
    state: CombatState,
  ): void {
    this.combatHud?.update(
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

  private updateAreaLabel(): void {
    if (
      !this.player ||
      !this.areaLabel
    ) {
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
    this.areaLabel.setText(
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
