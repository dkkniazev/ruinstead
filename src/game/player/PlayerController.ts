import Phaser from 'phaser';
import { DesktopPlayerInput } from '../input/DesktopPlayerInput';
import {
  InputModeTracker,
  type MovementIntent,
} from '../input/PlayerInput';
import { TouchPlayerInput } from '../input/TouchPlayerInput';

const PLAYER_TEXTURE =
  'ruinstead-player-placeholder';

const MOVE_SPEED = 225;
const DASH_SPEED = 570;
const DASH_DURATION_MS = 135;
const DASH_COOLDOWN_MS = 850;

export class PlayerController {
  readonly sprite:
    Phaser.Physics.Arcade.Sprite;

  private readonly desktopInput:
    DesktopPlayerInput;
  private readonly touchInput:
    TouchPlayerInput;
  private readonly inputMode:
    InputModeTracker;

  private unsubscribeInputMode?: () => void;
  private lastDirection =
    new Phaser.Math.Vector2(0, 1);
  private dashDirection =
    new Phaser.Math.Vector2(0, 1);
  private dashUntil = 0;
  private dashCooldownUntil = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.ensureTexture();

    this.sprite =
      scene.physics.add.sprite(
        x,
        y,
        PLAYER_TEXTURE,
      );

    this.sprite
      .setDepth(100)
      .setCollideWorldBounds(true);

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body
      .setSize(30, 34)
      .setOffset(17, 22);

    this.desktopInput =
      new DesktopPlayerInput(scene);
    this.touchInput =
      new TouchPlayerInput(scene);
    this.inputMode =
      new InputModeTracker();

    this.syncInputMode(
      this.inputMode.current,
    );
    this.unsubscribeInputMode =
      this.inputMode.subscribe(
        (mode) => {
          this.syncInputMode(mode);
        },
      );
  }

  update(time: number): void {
    const input =
      this.inputMode.current === 'touch'
        ? this.touchInput
        : this.desktopInput;

    const movement =
      this.normalizeMovement(
        input.getMovement(),
      );

    if (
      input.consumeDash() &&
      time >= this.dashCooldownUntil
    ) {
      this.startDash(
        time,
        movement,
      );
    }

    if (time < this.dashUntil) {
      this.applyVelocity(
        this.dashDirection,
        DASH_SPEED,
      );
      return;
    }

    if (movement.lengthSq() > 0) {
      this.lastDirection.copy(
        movement,
      );
    }

    this.applyVelocity(
      movement,
      MOVE_SPEED,
    );

    this.sprite.setTint(
      0xffffff,
    );
  }

  destroy(): void {
    this.unsubscribeInputMode?.();
    this.unsubscribeInputMode =
      undefined;

    this.desktopInput.destroy();
    this.touchInput.destroy();
    this.inputMode.destroy();
    this.sprite.destroy();
  }

  private startDash(
    time: number,
    movement: Phaser.Math.Vector2,
  ): void {
    const direction =
      movement.lengthSq() > 0
        ? movement
        : this.lastDirection;

    this.dashDirection
      .copy(direction)
      .normalize();

    this.dashUntil =
      time + DASH_DURATION_MS;
    this.dashCooldownUntil =
      time + DASH_COOLDOWN_MS;

    this.sprite.setTint(
      0xffd684,
    );

    this.scene.cameras.main.shake(
      60,
      0.0013,
    );
  }

  private normalizeMovement(
    intent: MovementIntent,
  ): Phaser.Math.Vector2 {
    const movement =
      new Phaser.Math.Vector2(
        intent.x,
        intent.y,
      );

    if (movement.lengthSq() > 1) {
      movement.normalize();
    }

    return movement;
  }

  private applyVelocity(
    direction: Phaser.Math.Vector2,
    speed: number,
  ): void {
    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.setVelocity(
      direction.x * speed,
      direction.y * speed,
    );
  }

  private syncInputMode(
    mode: 'desktop' | 'touch',
  ): void {
    this.touchInput.setVisible(
      mode === 'touch',
    );
  }

  private ensureTexture(): void {
    if (
      this.scene.textures.exists(
        PLAYER_TEXTURE,
      )
    ) {
      return;
    }

    const graphics =
      this.scene.make.graphics({
        x: 0,
        y: 0,
        add: false,
      });

    graphics.fillStyle(
      0x3f6f58,
      1,
    );
    graphics.fillCircle(
      32,
      31,
      22,
    );

    graphics.fillStyle(
      0xd5b88d,
      1,
    );
    graphics.fillCircle(
      32,
      22,
      12,
    );

    graphics.fillStyle(
      0x273930,
      1,
    );
    graphics.fillRoundedRect(
      17,
      33,
      30,
      24,
      8,
    );

    graphics.lineStyle(
      4,
      0xc8d9c2,
      1,
    );
    graphics.lineBetween(
      46,
      36,
      58,
      20,
    );

    graphics.generateTexture(
      PLAYER_TEXTURE,
      64,
      64,
    );
    graphics.destroy();
  }
}
