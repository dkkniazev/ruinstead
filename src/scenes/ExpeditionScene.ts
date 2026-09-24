import Phaser from 'phaser';
import {
  LOGICAL_WIDTH,
  configureLogicalCamera,
} from '../game/layout/Viewport';
import { PlayerController } from '../game/player/PlayerController';
import { DebugOverlay } from '../game/qa/DebugOverlay';
import {
  TEST_WORLD_HEIGHT,
  TEST_WORLD_WIDTH,
  createTestWorld,
} from '../game/world/TestWorld';

export class ExpeditionScene
  extends Phaser.Scene {
  private player?:
    PlayerController;
  private debugOverlay?:
    DebugOverlay;
  private escapeKey?:
    Phaser.Input.Keyboard.Key;

  constructor() {
    super('ExpeditionScene');
  }

  create(): void {
    configureLogicalCamera(this);

    const world =
      createTestWorld(this);

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
      TEST_WORLD_WIDTH,
      TEST_WORLD_HEIGHT,
    );
    camera.startFollow(
      this.player.sprite,
      true,
      0.12,
      0.12,
    );
    camera.setDeadzone(
      150,
      100,
    );

    this.createHud();

    this.debugOverlay =
      new DebugOverlay(this);
    this.debugOverlay.create();

    this.escapeKey =
      this.input.keyboard?.addKey(
        Phaser.Input.Keyboard.KeyCodes.ESC,
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
  }

  update(time: number): void {
    this.player?.update(time);
    this.debugOverlay?.update();

    if (
      this.escapeKey &&
      Phaser.Input.Keyboard.JustDown(
        this.escapeKey,
      )
    ) {
      this.returnToSettlement();
    }
  }

  private createHud(): void {
    this.add
      .text(
        24,
        32,
        'Тестовая вылазка',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#f0ead8',
        },
      )
      .setScrollFactor(0)
      .setDepth(8500);

    this.add
      .text(
        24,
        67,
        'WASD/стрелки · Space/Shift — рывок',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '15px',
          color: '#c3d0ba',
        },
      )
      .setScrollFactor(0)
      .setDepth(8500);

    const back =
      this.add
        .rectangle(
          LOGICAL_WIDTH - 108,
          48,
          176,
          46,
          0x111b15,
          0.82,
        )
        .setStrokeStyle(
          2,
          0x9fb79b,
          0.6,
        )
        .setScrollFactor(0)
        .setDepth(8500)
        .setInteractive({
          useHandCursor: true,
        });

    this.add
      .text(
        LOGICAL_WIDTH - 108,
        48,
        'В поселение',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#e8efdf',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(8501);

    back.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        this.returnToSettlement();
      },
    );
  }

  private returnToSettlement(): void {
    this.scene.start(
      'SettlementScene',
    );
  }

  private handleResize(): void {
    configureLogicalCamera(this);

    if (this.player) {
      this.cameras.main
        .setBounds(
          0,
          0,
          TEST_WORLD_WIDTH,
          TEST_WORLD_HEIGHT,
        )
        .startFollow(
          this.player.sprite,
          true,
          0.12,
          0.12,
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
