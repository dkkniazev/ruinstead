import Phaser from 'phaser';
import {
  SETTLEMENT_CENTER,
  SETTLEMENT_SAFE_RADIUS,
} from '../world/WorldPrototype';

export type EnemyArchetypeId =
  | 'melee'
  | 'fast'
  | 'tank';

type EnemyDefinition = {
  id: EnemyArchetypeId;
  maxHealth: number;
  moveSpeed: number;
  damage: number;
  attackRange: number;
  attackCooldownMs: number;
  aggroRange: number;
  leashRange: number;
  dropCoins: number;
  texture: string;
  bodyRadius: number;
  baselineOffset: number;
};

const DEFINITIONS:
  Record<EnemyArchetypeId, EnemyDefinition> = {
  melee: {
    id: 'melee',
    maxHealth: 70,
    moveSpeed: 105,
    damage: 12,
    attackRange: 62,
    attackCooldownMs: 900,
    aggroRange: 430,
    leashRange: 620,
    dropCoins: 2,
    texture:
      'ruinstead-enemy-melee',
    bodyRadius: 24,
    baselineOffset: 32,
  },
  fast: {
    id: 'fast',
    maxHealth: 42,
    moveSpeed: 165,
    damage: 8,
    attackRange: 55,
    attackCooldownMs: 720,
    aggroRange: 470,
    leashRange: 680,
    dropCoins: 2,
    texture:
      'ruinstead-enemy-fast',
    bodyRadius: 20,
    baselineOffset: 27,
  },
  tank: {
    id: 'tank',
    maxHealth: 150,
    moveSpeed: 68,
    damage: 20,
    attackRange: 70,
    attackCooldownMs: 1250,
    aggroRange: 390,
    leashRange: 560,
    dropCoins: 5,
    texture:
      'ruinstead-enemy-tank',
    bodyRadius: 30,
    baselineOffset: 39,
  },
};

const SPAWNS: ReadonlyArray<{
  archetype: EnemyArchetypeId;
  x: number;
  y: number;
}> = [
  {
    archetype: 'melee',
    x: 1280,
    y: 760,
  },
  {
    archetype: 'fast',
    x: 1430,
    y: 980,
  },
  {
    archetype: 'melee',
    x: 1570,
    y: 610,
  },
  {
    archetype: 'tank',
    x: 1710,
    y: 850,
  },
  {
    archetype: 'fast',
    x: 1870,
    y: 1080,
  },
  {
    archetype: 'melee',
    x: 2030,
    y: 660,
  },
  {
    archetype: 'tank',
    x: 2200,
    y: 980,
  },
  {
    archetype: 'fast',
    x: 1680,
    y: 1290,
  },
  {
    archetype: 'melee',
    x: 2150,
    y: 1350,
  },
];

export class EnemyUnit {
  readonly sprite:
    Phaser.Physics.Arcade.Sprite;
  readonly definition:
    EnemyDefinition;
  readonly spawn:
    Phaser.Math.Vector2;

  private readonly shadow:
    Phaser.GameObjects.Ellipse;
  private readonly healthBack:
    Phaser.GameObjects.Rectangle;
  private readonly healthFill:
    Phaser.GameObjects.Rectangle;

  private health: number;
  private nextAttackAt = 0;
  private _alive = true;

  constructor(
    private readonly scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.Group,
    definition: EnemyDefinition,
    x: number,
    y: number,
  ) {
    this.definition =
      definition;
    this.health =
      definition.maxHealth;
    this.spawn =
      new Phaser.Math.Vector2(
        x,
        y,
      );

    this.shadow = scene.add
      .ellipse(
        x,
        y + 24,
        definition.bodyRadius * 2.25,
        definition.bodyRadius * 0.82,
        0x2f662b,
        0.2,
      );

    this.sprite =
      group.create(
        x,
        y,
        definition.texture,
      ) as Phaser.Physics.Arcade.Sprite;

    this.sprite.setCollideWorldBounds(
      true,
    );

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body
      .setCircle(
        definition.bodyRadius,
        this.sprite.width / 2 -
          definition.bodyRadius,
        this.sprite.height -
          definition.bodyRadius * 2 -
          8,
      );

    this.healthBack = scene.add
      .rectangle(
        x - 25,
        y - 49,
        50,
        7,
        0x2d3027,
        0.72,
      )
      .setOrigin(0, 0.5);

    this.healthFill = scene.add
      .rectangle(
        x - 23,
        y - 49,
        46,
        5,
        0xf05c63,
        0.95,
      )
      .setOrigin(0, 0.5);

    this.syncVisuals();
  }

  get alive(): boolean {
    return this._alive;
  }

  get position():
    Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.sprite.x,
      this.sprite.y,
    );
  }

  update(
    time: number,
    playerPosition:
      Phaser.Math.Vector2,
    onPlayerHit:
      (damage: number) => void,
  ): void {
    if (!this._alive) return;

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
      Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        playerPosition.x,
        playerPosition.y,
      );

    const distanceToSpawn =
      Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        this.spawn.x,
        this.spawn.y,
      );

    if (
      playerSafe ||
      distanceToPlayer >
        this.definition.aggroRange ||
      distanceToSpawn >
        this.definition.leashRange
    ) {
      if (distanceToSpawn > 10) {
        this.moveTowards(
          this.spawn,
          this.definition.moveSpeed *
            0.9,
        );
      } else {
        body.setVelocity(0, 0);
      }

      this.syncVisuals();
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
        time >=
        this.nextAttackAt
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
          scaleX: 1.12,
          scaleY: 0.9,
          duration: 85,
          yoyo: true,
          ease: 'Quad.Out',
        });
      }
    }

    this.syncVisuals();
  }

  takeDamage(
    amount: number,
  ): boolean {
    if (!this._alive) {
      return false;
    }

    this.health =
      Math.max(
        0,
        this.health - amount,
      );

    this.updateHealthBar();
    this.showDamageNumber(amount);

    this.sprite.setTintFill(
      0xffffff,
    );

    this.scene.time.delayedCall(
      65,
      () => {
        if (this._alive) {
          this.sprite.clearTint();
        }
      },
    );

    if (this.health > 0) {
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.09,
        scaleY: 0.93,
        duration: 65,
        yoyo: true,
        ease: 'Quad.Out',
      });

      return false;
    }

    this.kill();
    return true;
  }

  destroy(): void {
    this.shadow.destroy();
    this.healthBack.destroy();
    this.healthFill.destroy();
    this.sprite.destroy();
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

  private kill(): void {
    this._alive = false;

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.setVelocity(0, 0);
    body.enable = false;

    this.healthBack.setVisible(
      false,
    );
    this.healthFill.setVisible(
      false,
    );

    this.scene.tweens.add({
      targets: [
        this.sprite,
        this.shadow,
      ],
      alpha: 0,
      scaleX: 0.72,
      scaleY: 0.72,
      duration: 230,
      ease: 'Back.In',
    });
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
      46 * ratio,
      5,
    );
  }

  private showDamageNumber(
    amount: number,
  ): void {
    const label =
      this.scene.add
        .text(
          this.sprite.x,
          this.sprite.y - 56,
          `-${amount}`,
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#fff3dd',
            stroke: '#78383b',
            strokeThickness: 3,
          },
        )
        .setOrigin(0.5)
        .setDepth(
          this.sprite.y + 200,
        );

    this.scene.tweens.add({
      targets: label,
      y: label.y - 26,
      alpha: 0,
      duration: 440,
      ease: 'Quad.Out',
      onComplete: () => {
        label.destroy();
      },
    });
  }

  private syncVisuals(): void {
    const baseline =
      this.sprite.y +
      this.definition
        .baselineOffset;

    this.sprite.setDepth(
      baseline,
    );

    this.shadow
      .setPosition(
        this.sprite.x,
        this.sprite.y + 25,
      )
      .setDepth(baseline - 2);

    this.healthBack
      .setPosition(
        this.sprite.x - 25,
        this.sprite.y - 49,
      )
      .setDepth(baseline + 80);

    this.healthFill
      .setPosition(
        this.sprite.x - 23,
        this.sprite.y - 49,
      )
      .setDepth(baseline + 81);
  }
}

export class EnemySystem {
  readonly group:
    Phaser.Physics.Arcade.Group;

  private readonly enemies:
    EnemyUnit[] = [];

  constructor(
    scene: Phaser.Scene,
  ) {
    ensureEnemyTextures(scene);

    this.group =
      scene.physics.add.group();

    for (
      const spawn of SPAWNS
    ) {
      this.enemies.push(
        new EnemyUnit(
          scene,
          this.group,
          DEFINITIONS[
            spawn.archetype
          ],
          spawn.x,
          spawn.y,
        ),
      );
    }
  }

  update(
    time: number,
    playerPosition:
      Phaser.Math.Vector2,
    onPlayerHit:
      (damage: number) => void,
  ): void {
    for (
      const enemy of
      this.enemies
    ) {
      enemy.update(
        time,
        playerPosition,
        onPlayerHit,
      );
    }
  }

  findNearest(
    origin: Phaser.Math.Vector2,
    range: number,
  ): EnemyUnit | undefined {
    let best:
      EnemyUnit | undefined;
    let bestDistance =
      range;

    for (
      const enemy of
      this.enemies
    ) {
      if (!enemy.alive) {
        continue;
      }

      const distance =
        Phaser.Math.Distance.Between(
          origin.x,
          origin.y,
          enemy.sprite.x,
          enemy.sprite.y,
        );

      if (
        distance <=
        bestDistance
      ) {
        best =
          enemy;
        bestDistance =
          distance;
      }
    }

    return best;
  }

  destroy(): void {
    for (
      const enemy of
      this.enemies
    ) {
      enemy.destroy();
    }

    this.enemies.length = 0;
    this.group.destroy(true);
  }
}

function ensureEnemyTextures(
  scene: Phaser.Scene,
): void {
  ensureEnemyTexture(
    scene,
    DEFINITIONS.melee.texture,
    0x7e4bd4,
    0xa56df0,
    54,
  );
  ensureEnemyTexture(
    scene,
    DEFINITIONS.fast.texture,
    0x9b4bc7,
    0xda69df,
    45,
  );
  ensureEnemyTexture(
    scene,
    DEFINITIONS.tank.texture,
    0x6e3cb0,
    0x9a62d7,
    68,
  );
}

function ensureEnemyTexture(
  scene: Phaser.Scene,
  key: string,
  baseColor: number,
  highlightColor: number,
  size: number,
): void {
  if (
    scene.textures.exists(key)
  ) {
    return;
  }

  const graphics =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  const canvasSize =
    96;
  const center =
    canvasSize / 2;

  graphics.fillStyle(
    0x4d2782,
    1,
  );
  graphics.fillEllipse(
    center,
    58,
    size + 10,
    size * 0.78,
  );

  graphics.fillStyle(
    baseColor,
    1,
  );
  graphics.fillCircle(
    center,
    45,
    size / 2,
  );

  graphics.fillStyle(
    highlightColor,
    0.92,
  );
  graphics.fillEllipse(
    center - size * 0.12,
    34,
    size * 0.5,
    size * 0.34,
  );

  graphics.fillStyle(
    0xffffff,
    1,
  );
  graphics.fillCircle(
    center - 10,
    44,
    7,
  );
  graphics.fillCircle(
    center + 10,
    44,
    7,
  );

  graphics.fillStyle(
    0x302047,
    1,
  );
  graphics.fillCircle(
    center - 9,
    45,
    3,
  );
  graphics.fillCircle(
    center + 9,
    45,
    3,
  );

  graphics.fillStyle(
    0x51306e,
    1,
  );
  graphics.fillRoundedRect(
    center - 15,
    61,
    30,
    7,
    4,
  );

  graphics.generateTexture(
    key,
    canvasSize,
    canvasSize,
  );
  graphics.destroy();
}
