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
        y + 42,
        58,
        20,
        0x07100b,
        0.32,
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
      .setSize(32, 34)
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
      0xffd684,
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
        this.sprite.y + 42,
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

    // Rear cloak / body: deliberately taller than wide so
    // the character reads as a 3/4-view figure rather than a top-down dot.
    graphics.fillStyle(
      0x26382f,
      1,
    );
    graphics.fillTriangle(
      22,
      55,
      58,
      55,
      64,
      94,
    );
    graphics.fillTriangle(
      22,
      55,
      64,
      94,
      18,
      94,
    );

    // Shoulder mass.
    graphics.fillStyle(
      0x3f6f58,
      1,
    );
    graphics.fillRoundedRect(
      19,
      45,
      43,
      34,
      12,
    );

    // Head in 3/4 view.
    graphics.fillStyle(
      0xd6b285,
      1,
    );
    graphics.fillEllipse(
      42,
      33,
      27,
      31,
    );

    graphics.fillStyle(
      0x55402f,
      1,
    );
    graphics.fillEllipse(
      39,
      24,
      28,
      13,
    );

    // Legs / boots remain visible under the torso.
    graphics.fillStyle(
      0x1b2721,
      1,
    );
    graphics.fillRoundedRect(
      26,
      82,
      12,
      22,
      5,
    );
    graphics.fillRoundedRect(
      44,
      82,
      12,
      22,
      5,
    );

    // Sword sits diagonally behind the right shoulder.
    graphics.lineStyle(
      5,
      0xcbd5c9,
      1,
    );
    graphics.lineBetween(
      58,
      55,
      73,
      24,
    );
    graphics.lineStyle(
      3,
      0x7b5b35,
      1,
    );
    graphics.lineBetween(
      55,
      60,
      64,
      43,
    );

    graphics.generateTexture(
      PLAYER_TEXTURE,
      80,
      112,
    );
    graphics.destroy();
  }
}
