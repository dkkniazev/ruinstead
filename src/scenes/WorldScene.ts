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

export class WorldScene
  extends Phaser.Scene {
  private readonly stateStore =
    new GameStateStore();

  private player?:
    PlayerController;
  private debugOverlay?:
    DebugOverlay;
  private areaLabel?:
    Phaser.GameObjects.Text;
  private lastAreaName = '';

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

    this.physics.add.collider(
      this.player.sprite,
      world.obstacles,
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

  update(time: number): void {
    this.player?.update(time);
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
        30,
        'WASD / стрелки   ·   Space / Shift — рывок',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '14px',
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
    this.player?.destroy();
    this.player = undefined;
    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;
  }
}
