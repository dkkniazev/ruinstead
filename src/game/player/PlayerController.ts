import Phaser from 'phaser';
import type {
  WeaponId,
} from '../combat/WeaponDefinitions';
import { DesktopPlayerInput } from '../input/DesktopPlayerInput';
import {
  InputModeTracker,
  type MovementIntent,
} from '../input/PlayerInput';
import { TouchPlayerInput } from '../input/TouchPlayerInput';
import {
  getDashCooldownMs,
  getMoveSpeed,
} from '../progression/UpgradeBalance';

const PLAYER_TEXTURE =
  'ruinstead-player-base-v3';

const WEAPON_TEXTURES:
  Record<WeaponId, string> = {
  axe: 'ruinstead-player-axe-v3',
  sword: 'ruinstead-player-sword-v3',
  hammer: 'ruinstead-player-hammer-v3',
  spear: 'ruinstead-player-spear-v3',
  daggers: 'ruinstead-player-daggers-v3',
};

const DASH_SPEED = 570;
const DASH_DURATION_MS = 135;
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
  private moveSpeed = 225;
  private baseMoveSpeed = 225;
  private temporarySpeedMultiplier = 1;
  private dashCooldownMs = 850;
  private weaponId:
    WeaponId = 'axe';

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    moveSpeedLevel = 0,
    dashLevel = 0,
  ) {
    this.ensureTextures();
    this.setProgression(
      moveSpeedLevel,
      dashLevel,
    );

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
        x + 27,
        y + 2,
        WEAPON_TEXTURES.axe,
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
      this.moveSpeed,
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

  get combatPosition():
    Phaser.Math.Vector2 {
    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    return new Phaser.Math.Vector2(
      body.center.x,
      body.center.y,
    );
  }

  get combatRadius(): number {
    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    return Math.max(
      body.halfWidth,
      body.halfHeight,
    );
  }

  setProgression(
    moveSpeedLevel: number,
    dashLevel: number,
  ): void {
    this.baseMoveSpeed =
      getMoveSpeed(
        moveSpeedLevel,
      );
    this.moveSpeed =
      Math.round(
        this.baseMoveSpeed *
          this.temporarySpeedMultiplier,
      );
    this.dashCooldownMs =
      getDashCooldownMs(
        dashLevel,
      );
  }

  setTemporarySpeedMultiplier(
    multiplier: number,
  ): void {
    this.temporarySpeedMultiplier =
      Math.max(
        0.1,
        multiplier,
      );
    this.moveSpeed =
      Math.round(
        this.baseMoveSpeed *
          this.temporarySpeedMultiplier,
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
      WEAPON_TEXTURES[
        weaponId
      ],
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
      time + this.dashCooldownMs;

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

    const offsets:
      Record<
        WeaponId,
        readonly [number, number]
      > = {
      axe: [28, 2],
      sword: [27, 1],
      hammer: [30, 3],
      spear: [34, 0],
      daggers: [25, 5],
    };

    const [
      xOffset,
      yOffset,
    ] =
      offsets[this.weaponId];

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

    for (
      const weaponId of
      Object.keys(
        WEAPON_TEXTURES,
      ) as WeaponId[]
    ) {
      this.ensureWeaponTexture(
        weaponId,
        WEAPON_TEXTURES[
          weaponId
        ],
      );
    }
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

  private ensureWeaponTexture(
    weaponId: WeaponId,
    key: string,
  ): void {
    if (
      this.scene.textures.exists(
        key,
      )
    ) {
      return;
    }

    const g =
      this.scene.make.graphics({
        x: 0,
        y: 0,
      });

    switch (weaponId) {
      case 'axe':
        g.lineStyle(
          6,
          0x6b472a,
          1,
        );
        g.lineBetween(
          13,
          64,
          31,
          14,
        );
        g.fillStyle(
          0xdde5e4,
          1,
        );
        g.fillTriangle(
          28,
          10,
          48,
          14,
          31,
          32,
        );
        break;

      case 'sword':
        g.lineStyle(
          7,
          0xe7eef0,
          1,
        );
        g.lineBetween(
          13,
          57,
          32,
          9,
        );
        g.lineStyle(
          4,
          0x6b4a2b,
          1,
        );
        g.lineBetween(
          10,
          66,
          18,
          44,
        );
        g.lineStyle(
          4,
          0xd9b35c,
          1,
        );
        g.lineBetween(
          8,
          45,
          24,
          51,
        );
        break;

      case 'hammer':
        g.lineStyle(
          7,
          0x725033,
          1,
        );
        g.lineBetween(
          18,
          66,
          29,
          29,
        );
        g.fillStyle(
          0x7e8989,
          1,
        );
        g.fillRoundedRect(
          18,
          13,
          34,
          22,
          5,
        );
        g.fillStyle(
          0xaab3b1,
          1,
        );
        g.fillRoundedRect(
          18,
          13,
          34,
          8,
          4,
        );
        break;

      case 'spear':
        g.lineStyle(
          5,
          0x805a32,
          1,
        );
        g.lineBetween(
          9,
          70,
          39,
          13,
        );
        g.fillStyle(
          0xdce6e7,
          1,
        );
        g.fillTriangle(
          34,
          14,
          49,
          4,
          42,
          22,
        );
        break;

      case 'daggers':
        g.lineStyle(
          5,
          0xe5edef,
          1,
        );
        g.lineBetween(
          11,
          56,
          29,
          23,
        );
        g.lineBetween(
          29,
          57,
          12,
          25,
        );
        g.lineStyle(
          4,
          0x775031,
          1,
        );
        g.lineBetween(
          8,
          63,
          14,
          52,
        );
        g.lineBetween(
          32,
          64,
          26,
          53,
        );
        break;
    }

    g.generateTexture(
      key,
      54,
      76,
    );
    g.destroy();
  }
}
