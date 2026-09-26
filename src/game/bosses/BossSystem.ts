import Phaser from 'phaser';
import { insideBossDanger, type BossDangerZone } from '../combat/CombatMath';
import { ENCOUNTER_BASE, REGION_COMBAT_BALANCE } from '../combat/RegionBalance';
import { enemySpawnAreaIsClear } from '../enemies/EnemySystem';
import { resourceNodeAreaIsClear } from '../gathering/ResourceSystem';
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
import type {
  WeaponRarityId,
} from '../progression/WeaponInventory';
import {
  SETTLEMENT_CENTER,
  SETTLEMENT_SAFE_RADIUS,
} from '../world/WorldPrototype';
import {
  RELEASE_BOSSES,
} from '../world/ReleaseWorldContent';
import {
  getRegionDefinition,
  pointInRegion,
  regionPointAt,
  regionIsUnlocked,
  type RegionId,
  type WorldPoint,
} from '../world/ReleaseRegionMap';

export type BossId =
  (typeof RELEASE_BOSSES)[number]['id'];

export type BossDefeatEvent = {
  id: BossId;
  name: string;
  isMain: boolean;
  region: RegionId;
  stageId: string;
  respawnAt: number;
  x: number;
  y: number;
  dropResources:
    ResourceCounts;
  dropCoins: number;
  weaponDrop?: {
    weaponId: WeaponId;
    rarity: WeaponRarityId;
  };
};

type BossDefinition = {
  id: BossId;
  name: string;
  region: RegionId;
  stageId: string;
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
  weaponDrop?: {
    weaponId: WeaponId;
    rarity: WeaponRarityId;
  };
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
  specialBoss: boolean;
};

const RESET_REGEN_MS = 5_000;


const REGION_WEAPON_RARITY_WEIGHTS:
  Record<
    RegionId,
    ReadonlyArray<
      readonly [
        WeaponRarityId,
        number,
      ]
    >
  > = {
  1: [['common', 90], ['uncommon', 10]],
  2: [['common', 75], ['uncommon', 23], ['rare', 2]],
  3: [['common', 55], ['uncommon', 35], ['rare', 10]],
  4: [['common', 35], ['uncommon', 40], ['rare', 22], ['epic', 3]],
  5: [['common', 20], ['uncommon', 35], ['rare', 35], ['epic', 10]],
  6: [['common', 10], ['uncommon', 25], ['rare', 45], ['epic', 18], ['legendary', 2]],
  7: [['common', 5], ['uncommon', 15], ['rare', 45], ['epic', 30], ['legendary', 5]],
  8: [['uncommon', 10], ['rare', 35], ['epic', 45], ['legendary', 10]],
};

function rollWeaponRarity(
  region: RegionId,
): WeaponRarityId {
  const weights =
    REGION_WEAPON_RARITY_WEIGHTS[
      region
    ];
  const roll =
    Math.random() *
    weights.reduce(
      (sum, [, weight]) =>
        sum + weight,
      0,
    );
  let cursor = 0;

  for (
    const [rarity, weight]
    of weights
  ) {
    cursor += weight;

    if (roll <= cursor) {
      return rarity;
    }
  }

  return (
    weights[
      weights.length - 1
    ]?.[0] ?? 'common'
  );
}

const REGION_BOSS_COLORS:
  Record<
    RegionId,
    readonly [number, number]
  > = {
  1: [0x506e3c, 0xb8d36f],
  2: [0x8b5639, 0xe9b65f],
  3: [0x454957, 0x9d7aac],
  4: [0x693329, 0xff7338],
  5: [0x737767, 0xd6d2a8],
  6: [0x67473e, 0xd77a52],
  7: [0x765039, 0xd3a069],
  8: [0x4d2c30, 0xff643b],
};

function clearBossSpawn(
  regionId: RegionId,
  start: WorldPoint,
  seed: number,
): WorldPoint {
  const region = getRegionDefinition(regionId);
  const isClear = (point: WorldPoint): boolean =>
    pointInRegion(region, point.x, point.y) &&
    resourceNodeAreaIsClear(point.x, point.y, 190) &&
    enemySpawnAreaIsClear(point.x, point.y, 230);

  if (isClear(start)) return start;

  for (let step = 0; step < 24; step += 1) {
    const ring = 110 + Math.floor(step / 8) * 95;
    const angle = seed * 2.399963 + step * Math.PI / 4;
    const candidate: WorldPoint = {
      x: start.x + Math.cos(angle) * ring,
      y: start.y + Math.sin(angle) * ring,
    };
    if (isClear(candidate)) return candidate;
  }

  return start;
}

function buildBossDefinitions():
  BossDefinition[] {
  const perRegionIndex =
    new Map<number, number>();

  return RELEASE_BOSSES.map(
    (source) => {
      const index =
        perRegionIndex.get(
          source.region,
        ) ?? 0;
      perRegionIndex.set(
        source.region,
        index + 1,
      );

      const region =
        getRegionDefinition(
          source.region,
        );
      const offsets:
        ReadonlyArray<
          readonly [number, number]
        > = [
        [-0.52, -0.48],
        [0.52, -0.38],
        [0.18, 0.68],
      ];
      const offset = source.region === 1 && index === 2
        ? [0.55, 0.5] as const
        : offsets[index];
      const authoredSpawn = regionPointAt(region, offset[0], offset[1]);
      const spawnPoint = clearBossSpawn(
        source.region,
        authoredSpawn,
        source.region * 10 + index,
      );
      const special =
        Boolean(
          source.specialBoss,
        );
      const regionBaseMinutes:
        Record<RegionId, number> = {
        1: 15,
        2: 30,
        3: 35,
        4: 40,
        5: 45,
        6: 50,
        7: 55,
        8: 60,
      };
      const normalMinutes =
        regionBaseMinutes[
          source.region
        ] +
        index * 5;
      const cooldownMinutes =
        special
          ? normalMinutes * 2
          : normalMinutes;
      const [primary, accent] =
        REGION_BOSS_COLORS[
          source.region
        ];
      const regionScaling =
        REGION_COMBAT_BALANCE[
          source.region
        ];
      const baseHealth =
        ENCOUNTER_BASE.bossHealth +
        index * ENCOUNTER_BASE.bossHealthPerIndex;
      const baseDamage =
        ENCOUNTER_BASE.bossDamage +
        index * ENCOUNTER_BASE.bossDamagePerIndex;
      const resourceScale =
        source.region;

      return {
        id: source.id,
        name: source.name,
        region: source.region,
        stageId:
          `stage-${source.region}`,
        x: Math.round(spawnPoint.x),
        y: Math.round(spawnPoint.y),
        maxHealth:
          Math.round(
            baseHealth *
            regionScaling.bossHealth *
            (
              special
                ? 1.65
                : source.isMain
                  ? 1.2
                  : 1
            ),
          ),
        moveSpeed:
          Math.max(
            62,
            92 -
            source.region * 2 -
            index * 5,
          ),
        damage:
          Math.round(
            baseDamage *
            regionScaling.damage *
            (
              special
                ? 1.35
                : 1
            ),
          ),
        attackRange:
          82 +
          index * 4,
        attackCooldownMs:
          1080 +
          index * 90,
        aggroRange:
          198 +
          source.region * 4 +
          index * 6,
        leashRange:
          315 +
          source.region * 8 +
          index * 15,
        dropCoins:
          18 +
          source.region *
            16 +
          index * 12,
        dropResources: {
          wood:
            source.region <= 2
              ? Math.max(
                  0,
                  4 - source.region,
                )
              : 0,
          stone:
            Math.max(
              0,
              Math.floor(
                resourceScale / 2,
              ),
            ),
          metal:
            Math.max(
              0,
              resourceScale - 1,
            ),
          crystal:
            source.region >= 2
              ? Math.max(
                  1,
                  Math.floor(
                    resourceScale / 2,
                  ),
                )
              : 0,
          fiber:
            source.region >= 2
              ? Math.max(
                  1,
                  Math.floor(
                    (
                      resourceScale +
                      index
                    ) / 2,
                  ),
                )
              : 0,
          coins: 0,
        },
        weaponDrop:
          source.weaponDrop
            ? {
                weaponId:
                  source.weaponDrop,
                rarity: 'common',
              }
            : undefined,
        respawnCooldownMs:
          cooldownMinutes *
          60 *
          1000,
        weaknessWeaponId:
          source.weaknessWeaponId,
        resistanceWeaponId:
          source.resistanceWeaponId,
        specialRadius:
          108 +
          source.region * 6 +
          index * 12,
        specialDamage:
          Math.round(
            (
              24 +
              index * 4
            ) *
            regionScaling.damage *
            (
              special
                ? 1.35
                : 1
            ),
          ),
        specialCooldownMs:
          special
            ? 3900
            : 4300 +
              index * 250,
        specialWindupMs:
          special
            ? 720
            : 650 +
              index * 80,
        lineSpecialDamage:
          source.isMain
            ? Math.round(
                (
                  26 +
                  index * 3
                ) *
                regionScaling.damage *
                (
                  special
                    ? 1.4
                    : 1
                ),
              )
            : undefined,
        lineSpecialLength:
          source.isMain
            ? special
              ? 330
              : 275
            : undefined,
        lineSpecialWidth:
          source.isMain
            ? special
              ? 100
              : 82
            : undefined,
        lineSpecialCooldownMs:
          source.isMain
            ? special
              ? 5100
              : 6200
            : undefined,
        lineSpecialWindupMs:
          source.isMain
            ? 780
            : undefined,
        bodyRadius:
          special
            ? 52
            : source.isMain
              ? 46
              : 40,
        texture:
          `ruinstead-boss-${source.id}`,
        primaryColor:
          special
            ? darkenColor(
                primary,
                0.82,
              )
            : primary,
        accentColor:
          special
            ? 0xff7a35
            : accent,
        isMain:
          source.isMain,
        specialBoss:
          special,
      };
    },
  );
}

const BOSS_DEFINITIONS:
  readonly BossDefinition[] =
  buildBossDefinitions();

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
  private dangerZone: BossDangerZone | null = null;
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
        definition.specialBoss
          ? 1.38
          : definition.isMain
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

  get visualHealthRatio(): number {
    return this.health / this.definition.maxHealth;
  }

  get visualTelegraph(): BossDangerZone | null {
    return this.specialPending || this.lineSpecialPending ? this.dangerZone : null;
  }

  get respawnAt(): number {
    return this.respawnAtEpochMs;
  }

  resetRespawn(): boolean {
    if (
      this._alive ||
      this.respawnAtEpochMs <= 0
    ) {
      return false;
    }

    this.respawn();
    return true;
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
    const danger: BossDangerZone = { shape: 'circle', x: this.sprite.x, y: this.sprite.y, radius };
    this.dangerZone = danger;

    const telegraph =
      this.scene.add
        .circle(
          this.sprite.x,
          this.sprite.y,
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

        if (insideBossDanger(danger, this.lastPlayerPosition.x, this.lastPlayerPosition.y)) {
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

    // Lock both the origin and direction during windup. The red rectangle
    // contains the full collision margin, so a hero centre outside it is safe.
    const margin = this.lastPlayerRadius;
    const danger: BossDangerZone = {
      shape: 'line', x: this.sprite.x - direction.x * margin,
      y: this.sprite.y - direction.y * margin, dx: direction.x, dy: direction.y,
      length: length + margin * 2, width: width + margin * 2,
    };
    this.dangerZone = danger;

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
          danger.length,
          danger.width,
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

        if (insideBossDanger(danger, this.lastPlayerPosition.x, this.lastPlayerPosition.y)) {
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
      region:
        this.definition.region,
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
      dropCoins:
        this.definition.dropCoins,
      weaponDrop:
        this.definition
          .weaponDrop
          ? {
              weaponId:
                this.definition
                  .weaponDrop
                  .weaponId,
              rarity:
                rollWeaponRarity(
                  this.definition
                    .region,
                ),
            }
          : undefined,
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
      this.definition.specialBoss
        ? 1.38
        : this.definition.isMain
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

  get visualUnits(): readonly BossUnit[] {
    return this.bosses;
  }
  private readonly activeRegions =
    new Set<RegionId>();
  private playerThreatened = false;

  constructor(
    private readonly scene:
      Phaser.Scene,
    private readonly bossRespawnAt:
      Record<string, number>,
    unlockedZones:
      readonly string[],
    private readonly onDefeated:
      (event: BossDefeatEvent) => void,
    private readonly onEncounter?:
      (bossId: string) => void,
  ) {
    ensureBossTextures(scene);

    this.group =
      scene.physics.add.group();

    for (
      let region = 1;
      region <= 8;
      region += 1
    ) {
      const id =
        region as RegionId;

      if (
        regionIsUnlocked(
          unlockedZones,
          id,
        )
      ) {
        this.unlockRegion(id);
      }
    }
  }

  unlockRegion(
    regionId: RegionId,
  ): boolean {
    if (
      this.activeRegions.has(
        regionId,
      )
    ) {
      return false;
    }

    this.activeRegions.add(
      regionId,
    );

    for (
      const definition of
      BOSS_DEFINITIONS
    ) {
      if (
        definition.region !==
          regionId
      ) {
        continue;
      }

      this.bosses.push(
        new BossUnit(
          this.scene,
          this.group,
          definition,
          this.bossRespawnAt[
            definition.id
          ] ?? 0,
          this.onDefeated,
        ),
      );
    }

    return true;
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

  getNearestDormant(
    origin: Phaser.Math.Vector2,
    range: number,
  ): {
    id: BossId;
    name: string;
    respawnAt: number;
    distance: number;
  } | undefined {
    let best:
      BossUnit | undefined;
    let bestDistance =
      range;

    for (
      const boss of
      this.bosses
    ) {
      if (
        boss.alive ||
        boss.respawnAt <=
          Date.now()
      ) {
        continue;
      }

      const distance =
        Phaser.Math.Distance.Between(
          origin.x,
          origin.y,
          boss.spawn.x,
          boss.spawn.y,
        );

      if (
        distance <=
        bestDistance
      ) {
        best = boss;
        bestDistance =
          distance;
      }
    }

    return best
      ? {
          id:
            best.definition.id,
          name:
            best.definition.name,
          respawnAt:
            best.respawnAt,
          distance:
            bestDistance,
        }
      : undefined;
  }

  resetRespawn(
    bossId: BossId,
  ): boolean {
    const boss =
      this.bosses.find(
        (candidate) =>
          candidate.definition.id ===
          bossId,
      );

    return (
      boss?.resetRespawn() ??
      false
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
      definition.specialBoss
    ) {
      g.lineStyle(
        8,
        0xffa44f,
        1,
      );
      g.strokeCircle(
        70,
        77,
        58,
      );
    }

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


function darkenColor(
  color: number,
  factor: number,
): number {
  const r =
    Math.round(
      ((color >> 16) & 0xff) *
      factor,
    );
  const g =
    Math.round(
      ((color >> 8) & 0xff) *
      factor,
    );
  const b =
    Math.round(
      (color & 0xff) *
      factor,
    );

  return (
    (r << 16) |
    (g << 8) |
    b
  );
}
