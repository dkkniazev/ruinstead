import Phaser from 'phaser';
import { DesktopPlayerInput } from '../input/DesktopPlayerInput';
import {
  InputModeTracker,
  type MovementIntent,
} from '../input/PlayerInput';
import { TouchPlayerInput } from '../input/TouchPlayerInput';

const PLAYER_TEXTURE =
  'ruinstead-player-prototype';

const MOVE_SPEED = 225;
const DASH_SPEED = 570;
const DASH_DURATION_MS = 135;
const DASH_COOLDOWN_MS = 850;
const PLAYER_BASELINE_OFFSET = 46;

export class PlayerController {
  readonly sprite:
    Phaser.Physics.Arcade.Sprite;

  private readonly shadow:
    Phaser.GameObjects.Ellipse;
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

    this.shadow = scene.add
      .ellipse(
        x,
        y + 41,
        56,
        19,
        0x21431c,
        0.24,
      )
      .setDepth(
        y + PLAYER_BASELINE_OFFSET - 2,
      );

    this.sprite =
      scene.physics.add.sprite(
        x,
        y,
        PLAYER_TEXTURE,
      );

    this.sprite
      .setDepth(
        y + PLAYER_BASELINE_OFFSET,
      )
      .setCollideWorldBounds(true);

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body
      .setSize(32, 33)
      .setOffset(24, 70);

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

    if (movement.x !== 0) {
      this.sprite.setFlipX(
        movement.x < 0,
      );
    }

    if (time < this.dashUntil) {
      this.applyVelocity(
        this.dashDirection,
        DASH_SPEED,
      );
      this.syncVisualDepth();
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

    this.sprite.clearTint();
    this.syncVisualDepth();
  }

  get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.sprite.x,
      this.sprite.y,
    );
  }

  destroy(): void {
    this.unsubscribeInputMode?.();
    this.unsubscribeInputMode =
      undefined;

    this.desktopInput.destroy();
    this.touchInput.destroy();
    this.inputMode.destroy();
    this.shadow.destroy();
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
      0xfff0a8,
    );

    this.scene.cameras.main.shake(
      55,
      0.0011,
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

  private syncVisualDepth(): void {
    const baseline =
      this.sprite.y +
      PLAYER_BASELINE_OFFSET;

    this.sprite.setDepth(baseline);
    this.shadow
      .setPosition(
        this.sprite.x,
        this.sprite.y + 41,
      )
      .setDepth(baseline - 2);
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
      });

    // Compact chibi silhouette for the casual 3/4 camera.
    graphics.fillStyle(
      0x5f3a76,
      1,
    );
    graphics.fillRoundedRect(
      20,
      48,
      42,
      37,
      13,
    );

    graphics.fillStyle(
      0xf2b63f,
      1,
    );
    graphics.fillRoundedRect(
      23,
      45,
      36,
      33,
      12,
    );

    graphics.fillStyle(
      0xe9bd8c,
      1,
    );
    graphics.fillEllipse(
      42,
      32,
      29,
      32,
    );

    graphics.fillStyle(
      0x5d3a2b,
      1,
    );
    graphics.fillEllipse(
      40,
      23,
      31,
      14,
    );

    graphics.fillStyle(
      0x4d315e,
      1,
    );
    graphics.fillRoundedRect(
      25,
      77,
      14,
      24,
      6,
    );
    graphics.fillRoundedRect(
      44,
      77,
      14,
      24,
      6,
    );

    // Sword sits behind the shoulder and reads from a distance.
    graphics.lineStyle(
      6,
      0xe7eef0,
      1,
    );
    graphics.lineBetween(
      60,
      57,
      72,
      21,
    );
    graphics.lineStyle(
      4,
      0x6b4a2b,
      1,
    );
    graphics.lineBetween(
      57,
      63,
      64,
      44,
    );

    graphics.generateTexture(
      PLAYER_TEXTURE,
      82,
      110,
    );
    graphics.destroy();
  }
}
