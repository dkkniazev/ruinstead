import Phaser from 'phaser';
import { DesktopPlayerInput } from '../input/DesktopPlayerInput';
import {
  InputModeTracker,
  type MovementIntent,
} from '../input/PlayerInput';
import { TouchPlayerInput } from '../input/TouchPlayerInput';
import type {
  WeaponId,
} from '../combat/WeaponDefinitions';

const PLAYER_TEXTURE =
  'ruinstead-player-base-v2';
const PLAYER_BLADE_TEXTURE =
  'ruinstead-player-blade-v2';
const PLAYER_BOW_TEXTURE =
  'ruinstead-player-bow-v2';

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
  private readonly weaponSprite:
    Phaser.GameObjects.Image;
  private readonly healthBack:
    Phaser.GameObjects.Rectangle;
  private readonly healthFill:
    Phaser.GameObjects.Rectangle;

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
  private damageTintUntil = 0;
  private enabled = true;
  private weaponId:
    WeaponId = 'blade';

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.ensureTextures();

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

    this.weaponSprite = scene.add
      .image(
        x + 26,
        y + 1,
        PLAYER_BLADE_TEXTURE,
      )
      .setDepth(
        y + PLAYER_BASELINE_OFFSET - 1,
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

    this.healthBack = scene.add
      .rectangle(
        x - 34,
        y - 69,
        68,
        10,
        0x29312a,
        0.9,
      )
      .setOrigin(0, 0.5)
      .setDepth(
        y +
          PLAYER_BASELINE_OFFSET +
          100,
      );

    this.healthFill = scene.add
      .rectangle(
        x - 32,
        y - 69,
        64,
        6,
        0x59d96a,
        1,
      )
      .setOrigin(0, 0.5)
      .setDepth(
        y +
          PLAYER_BASELINE_OFFSET +
          101,
      );

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

    this.setWeapon(
      this.weaponId,
    );
    this.syncVisualDepth();
  }

  update(time: number): void {
    if (!this.enabled) {
      this.applyVelocity(
        new Phaser.Math.Vector2(
          0,
          0,
        ),
        0,
      );
      this.syncVisualDepth();
      return;
    }

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
      this.applyTint(time);
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

    this.applyTint(time);
    this.syncVisualDepth();
  }

  get position():
    Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.sprite.x,
      this.sprite.y,
    );
  }

  setEnabled(
    enabled: boolean,
  ): void {
    this.enabled =
      enabled;

    if (!enabled) {
      const body =
        this.sprite.body as
          Phaser.Physics.Arcade.Body;

      body.setVelocity(
        0,
        0,
      );
    }
  }

  setWeapon(
    weaponId: WeaponId,
  ): void {
    this.weaponId =
      weaponId;

    this.weaponSprite.setTexture(
      weaponId === 'blade'
        ? PLAYER_BLADE_TEXTURE
        : PLAYER_BOW_TEXTURE,
    );

    this.syncWeaponTransform();
  }

  setHealth(
    health: number,
    maxHealth: number,
  ): void {
    const ratio =
      maxHealth > 0
        ? Phaser.Math.Clamp(
            health / maxHealth,
            0,
            1,
          )
        : 0;

    this.healthFill.setDisplaySize(
      64 * ratio,
      6,
    );

    this.healthFill.setFillStyle(
      ratio > 0.5
        ? 0x59d96a
        : ratio > 0.25
          ? 0xf2bd4f
          : 0xf05f62,
      1,
    );
  }

  setAliveVisualsVisible(
    visible: boolean,
  ): void {
    this.shadow.setVisible(
      visible,
    );
    this.weaponSprite.setVisible(
      visible,
    );
    this.healthBack.setVisible(
      visible,
    );
    this.healthFill.setVisible(
      visible,
    );
  }

  teleport(
    x: number,
    y: number,
  ): void {
    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.reset(
      x,
      y,
    );

    this.syncVisualDepth();
  }

  faceTowards(
    worldX: number,
  ): void {
    if (
      Math.abs(
        worldX -
          this.sprite.x,
      ) > 3
    ) {
      this.sprite.setFlipX(
        worldX <
          this.sprite.x,
      );
      this.syncWeaponTransform();
    }
  }

  flashDamage(): void {
    this.damageTintUntil =
      this.scene.time.now +
      120;
  }

  destroy(): void {
    this.unsubscribeInputMode?.();
    this.unsubscribeInputMode =
      undefined;

    this.desktopInput.destroy();
    this.touchInput.destroy();
    this.inputMode.destroy();

    this.healthFill.destroy();
    this.healthBack.destroy();
    this.weaponSprite.destroy();
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
    direction:
      Phaser.Math.Vector2,
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

  private applyTint(
    time: number,
  ): void {
    if (
      time <
      this.damageTintUntil
    ) {
      this.sprite.setTintFill(
        0xff7070,
      );
      return;
    }

    if (
      time <
      this.dashUntil
    ) {
      this.sprite.setTint(
        0xfff0a8,
      );
      return;
    }

    this.sprite.clearTint();
  }

  private syncVisualDepth(): void {
    const baseline =
      this.sprite.y +
      PLAYER_BASELINE_OFFSET;

    this.sprite.setDepth(
      baseline,
    );

    this.shadow
      .setPosition(
        this.sprite.x,
        this.sprite.y + 41,
      )
      .setDepth(
        baseline - 2,
      );

    this.healthBack
      .setPosition(
        this.sprite.x - 34,
        this.sprite.y - 69,
      )
      .setDepth(
        baseline + 100,
      );

    this.healthFill
      .setPosition(
        this.sprite.x - 32,
        this.sprite.y - 69,
      )
      .setDepth(
        baseline + 101,
      );

    this.syncWeaponTransform(
      baseline,
    );
  }

  private syncWeaponTransform(
    baseline =
      this.sprite.y +
      PLAYER_BASELINE_OFFSET,
  ): void {
    const facingLeft =
      this.sprite.flipX;

    const xOffset =
      this.weaponId === 'blade'
        ? 27
        : 29;

    const yOffset =
      this.weaponId === 'blade'
        ? 1
        : 4;

    this.weaponSprite
      .setPosition(
        this.sprite.x +
          (facingLeft
            ? -xOffset
            : xOffset),
        this.sprite.y +
          yOffset,
      )
      .setFlipX(facingLeft)
      .setDepth(
        baseline - 1,
      );
  }

  private syncInputMode(
    mode: 'desktop' | 'touch',
  ): void {
    this.touchInput.setVisible(
      mode === 'touch',
    );
  }

  private ensureTextures(): void {
    this.ensurePlayerTexture();
    this.ensureBladeTexture();
    this.ensureBowTexture();
  }

  private ensurePlayerTexture(): void {
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

    graphics.generateTexture(
      PLAYER_TEXTURE,
      82,
      110,
    );
    graphics.destroy();
  }

  private ensureBladeTexture(): void {
    if (
      this.scene.textures.exists(
        PLAYER_BLADE_TEXTURE,
      )
    ) {
      return;
    }

    const graphics =
      this.scene.make.graphics({
        x: 0,
        y: 0,
      });

    graphics.lineStyle(
      7,
      0xe7eef0,
      1,
    );
    graphics.lineBetween(
      13,
      52,
      31,
      8,
    );

    graphics.lineStyle(
      4,
      0x6b4a2b,
      1,
    );
    graphics.lineBetween(
      10,
      61,
      18,
      40,
    );

    graphics.lineStyle(
      4,
      0xd9b35c,
      1,
    );
    graphics.lineBetween(
      8,
      42,
      23,
      48,
    );

    graphics.generateTexture(
      PLAYER_BLADE_TEXTURE,
      42,
      70,
    );
    graphics.destroy();
  }

  private ensureBowTexture(): void {
    if (
      this.scene.textures.exists(
        PLAYER_BOW_TEXTURE,
      )
    ) {
      return;
    }

    const graphics =
      this.scene.make.graphics({
        x: 0,
        y: 0,
      });

    graphics.lineStyle(
      5,
      0x87522d,
      1,
    );
    graphics.beginPath();
    graphics.moveTo(12, 5);
    graphics.lineTo(28, 18);
    graphics.lineTo(32, 35);
    graphics.lineTo(27, 52);
    graphics.lineTo(12, 65);
    graphics.strokePath();

    graphics.lineStyle(
      2,
      0xf4e4c5,
      0.95,
    );
    graphics.lineBetween(
      12,
      5,
      12,
      65,
    );

    graphics.lineStyle(
      3,
      0x6b472a,
      1,
    );
    graphics.lineBetween(
      5,
      35,
      36,
      35,
    );

    graphics.fillStyle(
      0xe8eef0,
      1,
    );
    graphics.fillTriangle(
      36,
      30,
      42,
      35,
      36,
      40,
    );

    graphics.generateTexture(
      PLAYER_BOW_TEXTURE,
      46,
      70,
    );
    graphics.destroy();
  }
}
