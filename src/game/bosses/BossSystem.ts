import Phaser from 'phaser';
import type {
  DamageEffectiveness,
  DamageProfile,
} from '../combat/StageCombatProfile';
import type {
  WeaponId,
} from '../combat/WeaponDefinitions';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import {
  SETTLEMENT_CENTER,
  SETTLEMENT_SAFE_RADIUS,
} from '../world/WorldPrototype';
import {
  ROOT_COLOSSUS_ARENA_CENTER,
} from '../world/StageOneProgression';

export type BossId =
  | 'moss-ogre'
  | 'crystal-boar'
  | 'root-colossus'
  | 'ash-matriarch'
  | 'prism-golem'
  | 'sun-tyrant';

export type BossDefeatEvent = {
  id: BossId;
  name: string;
  isMain: boolean;
  stageId:
    | 'stage-1'
    | 'stage-2';
  respawnAt: number;
  x: number;
  y: number;
  dropResources:
    ResourceCounts;
};

type BossDefinition = {
  id: BossId;
  name: string;
  stageId:
    | 'stage-1'
    | 'stage-2';
  x: number;
  y: number;
  maxHealth: number;
  moveSpeed: number;
  damage: number;
  attackRange: number;
  attackCooldownMs: number;
  aggroRange: number;
  leashRange: number;
  dropCoins: number;
  dropResources:
    ResourceCounts;
  respawnCooldownMs: number;
  weaknessWeaponId: WeaponId;
  resistanceWeaponId: WeaponId;
  specialRadius: number;
  specialDamage: number;
  specialCooldownMs: number;
  specialWindupMs: number;
  lineSpecialDamage?: number;
  lineSpecialLength?: number;
  lineSpecialWidth?: number;
  lineSpecialCooldownMs?: number;
  lineSpecialWindupMs?: number;
  bodyRadius: number;
  texture: string;
  primaryColor: number;
  accentColor: number;
  isMain: boolean;
};

const RESET_REGEN_MS = 5_000;

function bossRespawnCooldownMs(
  globalBossIndex: number,
): number {
  return (
    15 +
    globalBossIndex * 5
  ) * 60 * 1000;
}

const BOSS_DEFINITIONS:
  readonly BossDefinition[] = [
  {
    id: 'moss-ogre',
    name: 'Мшистый громила',
    stageId: 'stage-1',
    x: 890,
    y: 315,
    maxHealth: 620,
    moveSpeed: 82,
    damage: 22,
    attackRange: 78,
    attackCooldownMs: 1150,
    aggroRange: 190,
    leashRange: 300,
    dropCoins: 24,
    dropResources: { wood: 0, stone: 0, metal: 0, coins: 0 },
    respawnCooldownMs: bossRespawnCooldownMs(0),
    weaknessWeaponId: 'sword',
    resistanceWeaponId: 'spear',
    specialRadius: 112,
    specialDamage: 30,
    specialCooldownMs: 4300,
    specialWindupMs: 720,
    bodyRadius: 37,
    texture: 'ruinstead-boss-moss-ogre',
    primaryColor: 0x506e3c,
    accentColor: 0xb8d36f,
    isMain: false,
  },
  {
    id: 'crystal-boar',
    name: 'Кристальный вепрь',
    stageId: 'stage-1',
    x: 2510,
    y: 630,
    maxHealth: 790,
    moveSpeed: 108,
    damage: 20,
    attackRange: 76,
    attackCooldownMs: 960,
    aggroRange: 205,
    leashRange: 320,
    dropCoins: 32,
    dropResources: { wood: 0, stone: 0, metal: 0, coins: 0 },
    respawnCooldownMs: bossRespawnCooldownMs(1),
    weaknessWeaponId: 'hammer',
    resistanceWeaponId: 'sword',
    specialRadius: 96,
    specialDamage: 34,
    specialCooldownMs: 3900,
    specialWindupMs: 560,
    bodyRadius: 38,
    texture: 'ruinstead-boss-crystal-boar',
    primaryColor: 0x5d647d,
    accentColor: 0x8fe5ef,
    isMain: false,
  },
  {
    id: 'root-colossus',
    name: 'Корневой колосс',
    stageId: 'stage-1',
    x:
      ROOT_COLOSSUS_ARENA_CENTER.x,
    y:
      ROOT_COLOSSUS_ARENA_CENTER.y,
    maxHealth: 1000,
    moveSpeed: 66,
    damage: 24,
    attackRange: 84,
    attackCooldownMs: 1280,
    aggroRange: 220,
    leashRange: 360,
    dropCoins: 55,
    dropResources: { wood: 0, stone: 0, metal: 0, coins: 0 },
    respawnCooldownMs: bossRespawnCooldownMs(2),
    weaknessWeaponId: 'spear',
    resistanceWeaponId: 'hammer',
    specialRadius: 145,
    specialDamage: 36,
    specialCooldownMs: 4700,
    specialWindupMs: 880,
    lineSpecialDamage: 32,
    lineSpecialLength: 245,
    lineSpecialWidth: 74,
    lineSpecialCooldownMs: 6100,
    lineSpecialWindupMs: 760,
    bodyRadius: 44,
    texture: 'ruinstead-boss-root-colossus',
    primaryColor: 0x61462f,
    accentColor: 0xe7b85e,
    isMain: true,
  },,
  {
    id: 'ash-matriarch',
    name: 'Пепельная матриархиня',
    stageId: 'stage-2',
    x: 3540,
    y: 300,
    maxHealth: 1240,
    moveSpeed: 94,
    damage: 29,
    attackRange: 82,
    attackCooldownMs: 1080,
    aggroRange: 205,
    leashRange: 320,
    dropCoins: 45,
    dropResources: {
      wood: 0,
      stone: 0,
      metal: 0,
      coins: 0,
      crystal: 1,
      fiber: 4,
    },
    respawnCooldownMs:
      bossRespawnCooldownMs(3),
    weaknessWeaponId: 'daggers',
    resistanceWeaponId: 'hammer',
    specialRadius: 118,
    specialDamage: 39,
    specialCooldownMs: 4200,
    specialWindupMs: 650,
    bodyRadius: 39,
    texture:
      'ruinstead-boss-ash-matriarch',
    primaryColor: 0x8b5639,
    accentColor: 0xe9b65f,
    isMain: false,
  },
  {
    id: 'prism-golem',
    name: 'Призменный голем',
    stageId: 'stage-2',
    x: 4860,
    y: 340,
    maxHealth: 1540,
    moveSpeed: 70,
    damage: 34,
    attackRange: 88,
    attackCooldownMs: 1250,
    aggroRange: 210,
    leashRange: 335,
    dropCoins: 58,
    dropResources: {
      wood: 0,
      stone: 0,
      metal: 1,
      coins: 0,
      crystal: 4,
      fiber: 0,
    },
    respawnCooldownMs:
      bossRespawnCooldownMs(4),
    weaknessWeaponId: 'hammer',
    resistanceWeaponId: 'axe',
    specialRadius: 138,
    specialDamage: 45,
    specialCooldownMs: 4650,
    specialWindupMs: 820,
    bodyRadius: 43,
    texture:
      'ruinstead-boss-prism-golem',
    primaryColor: 0x6d6b74,
    accentColor: 0xf0c95e,
    isMain: false,
  },
  {
    id: 'sun-tyrant',
    name: 'Солнечный тиран',
    stageId: 'stage-2',
    x: 5250,
    y: 1450,
    maxHealth: 1880,
    moveSpeed: 76,
    damage: 36,
    attackRange: 90,
    attackCooldownMs: 1180,
    aggroRange: 225,
    leashRange: 370,
    dropCoins: 82,
    dropResources: {
      wood: 0,
      stone: 0,
      metal: 2,
      coins: 0,
      crystal: 6,
      fiber: 6,
    },
    respawnCooldownMs:
      bossRespawnCooldownMs(5),
    weaknessWeaponId: 'daggers',
    resistanceWeaponId: 'spear',
    specialRadius: 155,
    specialDamage: 48,
    specialCooldownMs: 4800,
    specialWindupMs: 900,
    lineSpecialDamage: 42,
    lineSpecialLength: 270,
    lineSpecialWidth: 82,
    lineSpecialCooldownMs: 6200,
    lineSpecialWindupMs: 780,
    bodyRadius: 46,
    texture:
      'ruinstead-boss-sun-tyrant',
    primaryColor: 0x9c4e2f,
    accentColor: 0xffcf50,
    isMain: true,
  }
];

export class BossUnit {
  readonly sprite:
    Phaser.Physics.Arcade.Sprite;
  readonly spawn:
    Phaser.Math.Vector2;
  readonly definition:
    BossDefinition;

  private readonly shadow:
    Phaser.GameObjects.Ellipse;
  private readonly healthBack:
    Phaser.GameObjects.Rectangle;
  private readonly healthFill:
    Phaser.GameObjects.Rectangle;
  private readonly nameLabel:
    Phaser.GameObjects.Text;
  private readonly respawnLabel:
    Phaser.GameObjects.Text;
  private lastRespawnSecond = -1;

  private health: number;
  private nextAttackAt = 0;
  private nextSpecialAt = 1800;
  private nextLineSpecialAt = 3900;
  private specialPending = false;
  private lineSpecialPending = false;
  private specialTelegraph?:
    Phaser.GameObjects.Arc;
  private lineSpecialTelegraph?:
    Phaser.GameObjects.Rectangle;
  private lastPlayerRadius = 0;
  private lastPlayerPosition =
    new Phaser.Math.Vector2();
  private respawnAtEpochMs = 0;
  private regenStartedAt = 0;
  private regenStartHealth = 0;
  private returning = false;
  private _engaged = false;
  private _alive = true;

  constructor(
    private readonly scene: Phaser.Scene,
    group:
      Phaser.Physics.Arcade.Group,
    definition: BossDefinition,
    initialRespawnAt: number,
    private readonly onDefeated:
      (event: BossDefeatEvent) => void,
  ) {
    this.definition =
      definition;
    this.health =
      definition.maxHealth;
    this.spawn =
      new Phaser.Math.Vector2(
        definition.x,
        definition.y,
      );

    this.shadow = scene.add
      .ellipse(
        definition.x,
        definition.y + 36,
        definition.bodyRadius * 2.45,
        definition.bodyRadius * 0.78,
        0x274d27,
        0.28,
      );

    this.sprite =
      group.create(
        definition.x,
        definition.y,
        definition.texture,
      ) as Phaser.Physics.Arcade.Sprite;

    this.sprite
      .setScale(
        definition.isMain
          ? 1.2
          : 1.05,
      )
      .setCollideWorldBounds(true);

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.setCircle(
      definition.bodyRadius,
      this.sprite.width / 2 -
        definition.bodyRadius,
      this.sprite.height -
        definition.bodyRadius * 2 -
        10,
    );

    this.healthBack = scene.add
      .rectangle(
        definition.x - 72,
        definition.y - 78,
        144,
        12,
        0x3a2728,
        0.9,
      )
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.healthFill = scene.add
      .rectangle(
        definition.x - 69,
        definition.y - 78,
        138,
        8,
        definition.isMain
          ? 0xe29d38
          : 0xd85b62,
        1,
      )
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.nameLabel = scene.add
      .text(
        definition.x,
        definition.y - 97,
        definition.name,
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize:
            definition.isMain
              ? '17px'
              : '15px',
          fontStyle: 'bold',
          color:
            definition.isMain
              ? '#ffe6a0'
              : '#fff2e8',
          stroke: '#4b2c2b',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setVisible(false);

    this.respawnLabel =
      scene.add
        .text(
          definition.x,
          definition.y + 10,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#fff0b3',
            backgroundColor:
              '#2f3530dd',
            padding: {
              x: 10,
              y: 6,
            },
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setDepth(
          definition.y + 180,
        )
        .setVisible(false);

    this.syncVisuals(false);

    if (
      initialRespawnAt >
      Date.now()
    ) {
      this.setDormantUntil(
        initialRespawnAt,
      );
    }
  }

  get alive(): boolean {
    return this._alive;
  }

  get engaged(): boolean {
    return this._engaged;
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

  combatDistanceTo(
    origin:
      Phaser.Math.Vector2,
    originRadius = 0,
  ): number {
    const center =
      this.combatPosition;

    return Math.max(
      0,
      Phaser.Math.Distance.Between(
        center.x,
        center.y,
        origin.x,
        origin.y,
      ) -
        this.combatRadius -
        originRadius,
    );
  }

  get bestiaryKind():
    'boss' {
    return 'boss';
  }

  get bestiaryId(): string {
    return this.definition.id;
  }

  get bestiaryElite():
    boolean {
    return false;
  }

  get dropCoins(): number {
    return this.definition.dropCoins;
  }

  forceReset(
    time: number,
  ): void {
    if (!this._alive) {
      return;
    }

    this.beginReturn(time);
  }

  getDamageProfile(
    weaponId: WeaponId,
  ): DamageProfile {
    if (
      weaponId ===
      this.definition.weaknessWeaponId
    ) {
      return {
        multiplier: 2,
        effectiveness: 'weakness',
      };
    }

    if (
      weaponId ===
      this.definition.resistanceWeaponId
    ) {
      return {
        multiplier: 0.5,
        effectiveness: 'resistance',
      };
    }

    return {
      multiplier: 1,
      effectiveness: 'neutral',
    };
  }

  update(
    time: number,
    playerPosition:
      Phaser.Math.Vector2,
    playerRadius: number,
    onPlayerHit:
      (damage: number) => void,
  ): void {
    if (!this._alive) {
      this.updateRespawnLabel();

      if (
        this.respawnAtEpochMs > 0 &&
        Date.now() >=
          this.respawnAtEpochMs
      ) {
        this.respawn();
      }

      return;
    }

    this.lastPlayerPosition.copy(
      playerPosition,
    );
    this.lastPlayerRadius =
      playerRadius;

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    const playerSafe =
      Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        SETTLEMENT_CENTER.x,
        SETTLEMENT_CENTER.y,
      ) <=
      SETTLEMENT_SAFE_RADIUS;

    const distanceToPlayer =
      this.combatDistanceTo(
        playerPosition,
        playerRadius,
      );

    const distanceToSpawn =
      Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        this.spawn.x,
        this.spawn.y,
      );

    const playerDistanceToSpawn =
      Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        this.spawn.x,
        this.spawn.y,
      );

    if (
      playerSafe ||
      distanceToSpawn >
        this.definition.leashRange ||
      (
        this._engaged &&
        playerDistanceToSpawn >
          this.definition.leashRange
      )
    ) {
      this.beginReturn(time);
    }

    if (this.returning) {
      this.regenerateAfterReset(
        time,
      );

      if (distanceToSpawn > 10) {
        this.moveTowards(
          this.spawn,
          this.definition.moveSpeed *
            0.9,
        );
      } else {
        body.setVelocity(0, 0);
        this.returning = false;
      }

      this.syncVisuals(false);
      return;
    }

    const engaged =
      distanceToPlayer <=
        this.definition.aggroRange ||
      (
        distanceToSpawn > 28 &&
        distanceToSpawn <=
          this.definition.leashRange
      );

    if (!engaged) {
      if (this._engaged) {
        this.startResetRegen(
          time,
        );
      }

      this._engaged = false;
      this.regenerateAfterReset(
        time,
      );

      if (distanceToSpawn > 10) {
        this.moveTowards(
          this.spawn,
          this.definition.moveSpeed *
            0.82,
        );
      } else {
        body.setVelocity(0, 0);
      }

      this.syncVisuals(false);
      return;
    }

    this._engaged = true;
    this.regenStartedAt = 0;

    if (
      this.specialPending ||
      this.lineSpecialPending
    ) {
      body.setVelocity(0, 0);
      this.syncVisuals(true);
      return;
    }

    if (
      this.definition.isMain &&
      this.definition
        .lineSpecialLength &&
      this.definition
        .lineSpecialCooldownMs &&
      this.definition
        .lineSpecialWindupMs &&
      this.definition
        .lineSpecialDamage &&
      this.definition
        .lineSpecialWidth &&
      time >=
        this.nextLineSpecialAt &&
      distanceToPlayer <=
        this.definition
          .lineSpecialLength *
          1.1
    ) {
      this.startLineSpecialAttack(
        onPlayerHit,
      );
      this.syncVisuals(true);
      return;
    }

    if (
      time >= this.nextSpecialAt &&
      distanceToPlayer <=
        this.definition
          .specialRadius * 1.55
    ) {
      this.startSpecialAttack(
        onPlayerHit,
      );
      this.syncVisuals(true);
      return;
    }

    if (
      distanceToPlayer >
      this.definition.attackRange
    ) {
      this.moveTowards(
        playerPosition,
        this.definition.moveSpeed,
      );
    } else {
      body.setVelocity(0, 0);

      if (
        time >= this.nextAttackAt
      ) {
        this.nextAttackAt =
          time +
          this.definition
            .attackCooldownMs;

        onPlayerHit(
          this.definition.damage,
        );

        this.scene.tweens.add({
          targets: this.sprite,
          scaleX:
            (this.definition.isMain
              ? 1.2
              : 1.05) * 1.08,
          scaleY:
            (this.definition.isMain
              ? 1.2
              : 1.05) * 0.92,
          duration: 100,
          yoyo: true,
          ease: 'Quad.Out',
        });
      }
    }

    this.syncVisuals(true);
  }

  takeDamage(
    amount: number,
    effectiveness:
      DamageEffectiveness,
  ): boolean {
    if (!this._alive) {
      return false;
    }

    this.health =
      Math.max(
        0,
        this.health - amount,
      );

    this.healthBack.setVisible(
      true,
    );
    this.healthFill.setVisible(
      true,
    );
    this.nameLabel.setVisible(
      true,
    );

    this.updateHealthBar();

    this.showDamageNumber(
      amount,
      effectiveness,
    );

    this.sprite.setTintFill(
      0xffffff,
    );
    this.scene.time.delayedCall(
      75,
      () => {
        if (this._alive) {
          this.sprite.clearTint();
        }
      },
    );

    if (this.health > 0) {
      return false;
    }

    this.kill();
    return true;
  }

  destroy(): void {
    this.specialTelegraph
      ?.destroy();
    this.lineSpecialTelegraph
      ?.destroy();
    this.shadow.destroy();
    this.healthBack.destroy();
    this.healthFill.destroy();
    this.nameLabel.destroy();
    this.respawnLabel.destroy();
    this.sprite.destroy();
  }

  private startSpecialAttack(
    onPlayerHit:
      (damage: number) => void,
  ): void {
    this.specialPending = true;

    const radius =
      this.definition
        .specialRadius;

    const telegraph =
      this.scene.add
        .circle(
          this.sprite.x,
          this.sprite.y + 10,
          radius,
          0xff5b46,
          0.12,
        )
        .setStrokeStyle(
          5,
          0xff835c,
          0.72,
        )
        .setDepth(
          this.sprite.y - 5,
        );

    this.specialTelegraph =
      telegraph;

    this.scene.tweens.add({
      targets: telegraph,
      alpha: 0.3,
      scale: 1.08,
      duration:
        this.definition
          .specialWindupMs,
      ease: 'Sine.In',
    });

    this.scene.time.delayedCall(
      this.definition
        .specialWindupMs,
      () => {
        if (
          !this._alive ||
          !this.specialPending
        ) {
          telegraph.destroy();
          return;
        }

        const distance =
          Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            this.lastPlayerPosition.x,
            this.lastPlayerPosition.y,
          );

        if (distance <= radius) {
          onPlayerHit(
            this.definition
              .specialDamage,
          );
        }

        this.scene.cameras.main.shake(
          90,
          this.definition.isMain
            ? 0.004
            : 0.0025,
        );

        this.scene.tweens.add({
          targets: telegraph,
          scale: 1.22,
          alpha: 0,
          duration: 130,
          onComplete: () => {
            telegraph.destroy();
          },
        });

        this.specialTelegraph =
          undefined;
        this.specialPending =
          false;
        this.nextSpecialAt =
          this.scene.time.now +
          this.definition
            .specialCooldownMs;
      },
    );
  }

  private startLineSpecialAttack(
    onPlayerHit:
      (damage: number) => void,
  ): void {
    const length =
      this.definition
        .lineSpecialLength;
    const width =
      this.definition
        .lineSpecialWidth;
    const damage =
      this.definition
        .lineSpecialDamage;
    const windup =
      this.definition
        .lineSpecialWindupMs;
    const cooldown =
      this.definition
        .lineSpecialCooldownMs;

    if (
      !length ||
      !width ||
      !damage ||
      !windup ||
      !cooldown
    ) {
      return;
    }

    const direction =
      new Phaser.Math.Vector2(
        this.lastPlayerPosition.x -
          this.sprite.x,
        this.lastPlayerPosition.y -
          this.sprite.y,
      );

    if (
      direction.lengthSq() <
      0.001
    ) {
      direction.set(1, 0);
    }

    direction.normalize();

    const angle =
      Math.atan2(
        direction.y,
        direction.x,
      );

    const telegraph =
      this.scene.add
        .rectangle(
          this.sprite.x +
            direction.x *
              length /
              2,
          this.sprite.y +
            direction.y *
              length /
              2,
          length,
          width,
          0xff6f3f,
          0.16,
        )
        .setStrokeStyle(
          5,
          0xffb06a,
          0.78,
        )
        .setRotation(
          angle,
        )
        .setDepth(
          this.sprite.y - 4,
        );

    this.lineSpecialPending =
      true;
    this.lineSpecialTelegraph =
      telegraph;

    this.scene.tweens.add({
      targets: telegraph,
      alpha: 0.36,
      scaleY: 1.12,
      duration: windup,
      ease: 'Sine.In',
    });

    this.scene.time.delayedCall(
      windup,
      () => {
        if (
          !this._alive ||
          !this.lineSpecialPending
        ) {
          telegraph.destroy();
          return;
        }

        const relative =
          new Phaser.Math.Vector2(
            this.lastPlayerPosition.x -
              this.sprite.x,
            this.lastPlayerPosition.y -
              this.sprite.y,
          );

        const projection =
          relative.dot(
            direction,
          );
        const perpendicular =
          Math.abs(
            relative.x *
              direction.y -
            relative.y *
              direction.x,
          );

        if (
          projection >=
            -this.lastPlayerRadius &&
          projection <=
            length +
              this.lastPlayerRadius &&
          perpendicular <=
            width / 2 +
              this.lastPlayerRadius
        ) {
          onPlayerHit(
            damage,
          );
        }

        this.scene.cameras.main.shake(
          110,
          0.0045,
        );

        this.scene.tweens.add({
          targets: telegraph,
          scaleY: 1.45,
          alpha: 0,
          duration: 145,
          onComplete: () => {
            telegraph.destroy();
          },
        });

        this.lineSpecialTelegraph =
          undefined;
        this.lineSpecialPending =
          false;
        this.nextLineSpecialAt =
          this.scene.time.now +
          cooldown;
      },
    );
  }

  private moveTowards(
    target:
      Phaser.Math.Vector2,
    speed: number,
  ): void {
    const direction =
      new Phaser.Math.Vector2(
        target.x - this.sprite.x,
        target.y - this.sprite.y,
      );

    if (
      direction.lengthSq() <=
      0.001
    ) {
      return;
    }

    direction.normalize();

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.setVelocity(
      direction.x * speed,
      direction.y * speed,
    );

    if (
      Math.abs(direction.x) >
      0.08
    ) {
      this.sprite.setFlipX(
        direction.x < 0,
      );
    }
  }

  private beginReturn(
    time: number,
  ): void {
    if (!this.returning) {
      this.startResetRegen(
        time,
      );
    }

    this.returning = true;
    this._engaged = false;
    this.specialPending = false;
    this.lineSpecialPending =
      false;
    this.specialTelegraph
      ?.destroy();
    this.lineSpecialTelegraph
      ?.destroy();
    this.specialTelegraph =
      undefined;
    this.lineSpecialTelegraph =
      undefined;
  }

  private startResetRegen(
    time: number,
  ): void {
    if (
      this.health >=
      this.definition.maxHealth
    ) {
      this.regenStartedAt = 0;
      return;
    }

    if (
      this.regenStartedAt > 0
    ) {
      return;
    }

    this.regenStartedAt =
      time;
    this.regenStartHealth =
      this.health;
  }

  private regenerateAfterReset(
    time: number,
  ): void {
    if (
      this.health >=
      this.definition.maxHealth
    ) {
      this.health =
        this.definition.maxHealth;
      this.regenStartedAt = 0;
      return;
    }

    if (
      this.regenStartedAt <= 0
    ) {
      this.startResetRegen(
        time,
      );
    }

    const progress =
      Phaser.Math.Clamp(
        (
          time -
          this.regenStartedAt
        ) /
          RESET_REGEN_MS,
        0,
        1,
      );

    this.health =
      this.regenStartHealth +
      (
        this.definition.maxHealth -
        this.regenStartHealth
      ) *
        progress;

    this.updateHealthBar();

    if (progress >= 1) {
      this.health =
        this.definition.maxHealth;
      this.regenStartedAt = 0;
      this.healthBack.setVisible(
        false,
      );
      this.healthFill.setVisible(
        false,
      );
      this.nameLabel.setVisible(
        false,
      );
    }
  }

  private updateHealthBar(): void {
    const ratio =
      Phaser.Math.Clamp(
        this.health /
          this.definition.maxHealth,
        0,
        1,
      );

    this.healthFill.setDisplaySize(
      138 * ratio,
      8,
    );
  }

  private kill(): void {
    this._alive = false;
    this._engaged = false;
    this.returning = false;
    this.regenStartedAt = 0;
    this.respawnAtEpochMs =
      Date.now() +
      this.definition
        .respawnCooldownMs;

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.setVelocity(0, 0);
    body.enable = false;

    this.specialTelegraph
      ?.destroy();
    this.lineSpecialTelegraph
      ?.destroy();
    this.specialTelegraph =
      undefined;
    this.lineSpecialTelegraph =
      undefined;
    this.lineSpecialPending =
      false;

    this.healthBack.setVisible(
      false,
    );
    this.healthFill.setVisible(
      false,
    );
    this.nameLabel.setVisible(
      false,
    );
    this.lastRespawnSecond = -1;
    this.updateRespawnLabel();

    this.onDefeated({
      id: this.definition.id,
      name: this.definition.name,
      isMain:
        this.definition.isMain,
      stageId:
        this.definition.stageId,
      respawnAt:
        this.respawnAtEpochMs,
      x: this.sprite.x,
      y: this.sprite.y,
      dropResources: {
        ...this.definition
          .dropResources,
      },
    });

    this.scene.tweens.add({
      targets: [
        this.sprite,
        this.shadow,
      ],
      alpha: 0,
      scaleX: 0.55,
      scaleY: 0.55,
      duration: 380,
      ease: 'Back.In',
    });
  }

  private setDormantUntil(
    respawnAt: number,
  ): void {
    this._alive = false;
    this._engaged = false;
    this.respawnAtEpochMs =
      respawnAt;

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.setVelocity(0, 0);
    body.enable = false;

    this.sprite
      .setVisible(false)
      .setAlpha(0);
    this.shadow
      .setVisible(false)
      .setAlpha(0);
    this.healthBack.setVisible(
      false,
    );
    this.healthFill.setVisible(
      false,
    );
    this.nameLabel.setVisible(
      false,
    );
    this.lastRespawnSecond = -1;
    this.updateRespawnLabel();
  }

  private respawn(): void {
    this._alive = true;
    this._engaged = false;
    this.returning = false;
    this.regenStartedAt = 0;
    this.respawnAtEpochMs = 0;
    this.health =
      this.definition.maxHealth;
    this.nextAttackAt =
      this.scene.time.now + 700;
    this.nextSpecialAt =
      this.scene.time.now + 2200;
    this.nextLineSpecialAt =
      this.scene.time.now + 3900;
    this.specialPending = false;
    this.lineSpecialPending =
      false;
    this.specialTelegraph
      ?.destroy();
    this.lineSpecialTelegraph
      ?.destroy();
    this.specialTelegraph =
      undefined;
    this.lineSpecialTelegraph =
      undefined;

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.enable = true;
    body.reset(
      this.spawn.x,
      this.spawn.y,
    );

    const baseScale =
      this.definition.isMain
        ? 1.2
        : 1.05;

    this.sprite
      .setVisible(true)
      .setAlpha(1)
      .setScale(baseScale)
      .clearTint();

    this.shadow
      .setVisible(true)
      .setAlpha(1)
      .setScale(1);

    this.healthFill
      .setDisplaySize(
        138,
        8,
      )
      .setAlpha(1)
      .setVisible(false);

    this.healthBack
      .setAlpha(1)
      .setVisible(false);

    this.nameLabel
      .setAlpha(1)
      .setVisible(false);
    this.respawnLabel
      .setVisible(false);
    this.lastRespawnSecond = -1;

    this.syncVisuals(false);
  }

  private updateRespawnLabel(): void {
    if (
      this._alive ||
      this.respawnAtEpochMs <= 0
    ) {
      this.respawnLabel.setVisible(
        false,
      );
      return;
    }

    const remainingSeconds =
      Math.max(
        0,
        Math.ceil(
          (
            this.respawnAtEpochMs -
            Date.now()
          ) / 1000,
        ),
      );

    if (
      remainingSeconds ===
      this.lastRespawnSecond
    ) {
      return;
    }

    this.lastRespawnSecond =
      remainingSeconds;

    const minutes =
      Math.floor(
        remainingSeconds / 60,
      );
    const seconds =
      remainingSeconds % 60;

    this.respawnLabel
      .setText(
        `${this.definition.name}\nВозрождение ${minutes}:${seconds
          .toString()
          .padStart(2, '0')}`,
      )
      .setVisible(true);
  }

  private showDamageNumber(
    amount: number,
    effectiveness:
      DamageEffectiveness,
  ): void {
    const color =
      effectiveness ===
      'weakness'
        ? '#ffd45c'
        : effectiveness ===
            'resistance'
          ? '#adb6c4'
          : '#fff5e5';

    const suffix =
      effectiveness ===
      'weakness'
        ? ' ×2'
        : effectiveness ===
            'resistance'
          ? ' ×0.5'
          : '';

    const label =
      this.scene.add
        .text(
          this.sprite.x,
          this.sprite.y - 100,
          `-${amount}${suffix}`,
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize:
              effectiveness ===
              'weakness'
                ? '21px'
                : '18px',
            fontStyle: 'bold',
            color,
            stroke: '#4d2c2d',
            strokeThickness: 4,
          },
        )
        .setOrigin(0.5)
        .setDepth(
          this.sprite.y + 250,
        );

    this.scene.tweens.add({
      targets: label,
      y: label.y - 34,
      alpha: 0,
      duration: 520,
      ease: 'Quad.Out',
      onComplete: () => {
        label.destroy();
      },
    });
  }

  private syncVisuals(
    engaged: boolean,
  ): void {
    const baseline =
      this.sprite.y + 56;

    this.sprite.setDepth(
      baseline,
    );
    this.shadow
      .setPosition(
        this.sprite.x,
        this.sprite.y + 36,
      )
      .setDepth(
        baseline - 3,
      );

    this.healthBack
      .setPosition(
        this.sprite.x - 72,
        this.sprite.y - 78,
      )
      .setDepth(
        baseline + 90,
      );

    this.healthFill
      .setPosition(
        this.sprite.x - 69,
        this.sprite.y - 78,
      )
      .setDepth(
        baseline + 91,
      );

    this.nameLabel
      .setPosition(
        this.sprite.x,
        this.sprite.y - 97,
      )
      .setDepth(
        baseline + 92,
      );

    const visible =
      engaged ||
      this.health <
        this.definition.maxHealth;

    this.healthBack.setVisible(
      visible,
    );
    this.healthFill.setVisible(
      visible,
    );
    this.nameLabel.setVisible(
      visible,
    );
  }
}

export class BossSystem {
  readonly group:
    Phaser.Physics.Arcade.Group;

  private readonly bosses:
    BossUnit[] = [];
  private playerThreatened = false;

  constructor(
    scene: Phaser.Scene,
    bossRespawnAt:
      Record<string, number>,
    onDefeated:
      (event: BossDefeatEvent) => void,
    private readonly onEncounter?:
      (bossId: string) => void,
  ) {
    ensureBossTextures(scene);

    this.group =
      scene.physics.add.group();

    for (
      const definition of
      BOSS_DEFINITIONS
    ) {
      this.bosses.push(
        new BossUnit(
          scene,
          this.group,
          definition,
          bossRespawnAt[
            definition.id
          ] ?? 0,
          onDefeated,
        ),
      );
    }
  }

  isPlayerThreatened(): boolean {
    return this.playerThreatened;
  }

  resetCombat(
    time: number,
  ): void {
    this.playerThreatened = false;

    for (
      const boss of
      this.bosses
    ) {
      boss.forceReset(
        time,
      );
    }
  }

  update(
    time: number,
    playerPosition:
      Phaser.Math.Vector2,
    playerRadius: number,
    onPlayerHit:
      (damage: number) => void,
  ): void {
    for (
      const boss of
      this.bosses
    ) {
      const wasEngaged =
        boss.engaged;

      boss.update(
        time,
        playerPosition,
        playerRadius,
        onPlayerHit,
      );

      if (
        !wasEngaged &&
        boss.engaged
      ) {
        this.onEncounter?.(
          boss.definition.id,
        );
      }
    }

    this.playerThreatened =
      this.bosses.some(
        (boss) =>
          boss.alive &&
          boss.engaged,
      );
  }

  findNearest(
    origin: Phaser.Math.Vector2,
    range: number,
    originRadius = 0,
  ): BossUnit | undefined {
    let best:
      BossUnit | undefined;
    let bestDistance =
      range;

    for (
      const boss of
      this.bosses
    ) {
      if (!boss.alive) {
        continue;
      }

      const distance =
        boss.combatDistanceTo(
          origin,
          originRadius,
        );

      if (
        distance <=
        bestDistance
      ) {
        best =
          boss;
        bestDistance =
          distance;
      }
    }

    return best;
  }

  destroy(): void {
    for (
      const boss of
      this.bosses
    ) {
      boss.destroy();
    }

    this.bosses.length = 0;
    this.group.destroy(true);
  }
}

function ensureBossTextures(
  scene: Phaser.Scene,
): void {
  for (
    const definition of
    BOSS_DEFINITIONS
  ) {
    if (
      scene.textures.exists(
        definition.texture,
      )
    ) {
      continue;
    }

    const g =
      scene.make.graphics({
        x: 0,
        y: 0,
      });

    g.fillStyle(
      definition.primaryColor,
      1,
    );
    g.fillEllipse(
      70,
      77,
      definition.isMain
        ? 105
        : 94,
      definition.isMain
        ? 96
        : 84,
    );

    g.fillStyle(
      definition.accentColor,
      0.92,
    );
    g.fillEllipse(
      60,
      55,
      60,
      38,
    );

    g.fillStyle(
      0xffffff,
      1,
    );
    g.fillCircle(
      55,
      70,
      8,
    );
    g.fillCircle(
      83,
      70,
      8,
    );

    g.fillStyle(
      0x2b2630,
      1,
    );
    g.fillCircle(
      57,
      71,
      4,
    );
    g.fillCircle(
      81,
      71,
      4,
    );

    g.fillStyle(
      definition.accentColor,
      1,
    );
    g.fillTriangle(
      35,
      38,
      50,
      57,
      24,
      60,
    );
    g.fillTriangle(
      103,
      38,
      90,
      57,
      116,
      60,
    );

    if (
      definition.isMain
    ) {
      g.lineStyle(
        8,
        0x79562f,
        1,
      );
      g.lineBetween(
        45,
        20,
        54,
        48,
      );
      g.lineBetween(
        95,
        20,
        86,
        48,
      );
    }

    g.generateTexture(
      definition.texture,
      140,
      145,
    );
    g.destroy();
  }
}
