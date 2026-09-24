import Phaser from 'phaser';
import type {
  DamageEffectiveness,
  DamageProfile,
} from '../combat/StageCombatProfile';
import {
  STAGE_ONE_COMBAT_PROFILE,
  getStageDamageProfile,
} from '../combat/StageCombatProfile';
import type {
  WeaponId,
} from '../combat/WeaponDefinitions';
import {
  SETTLEMENT_CENTER,
  SETTLEMENT_SAFE_RADIUS,
} from '../world/WorldPrototype';

export type EnemySpeciesId =
  | 'goblin'
  | 'slime'
  | 'boar'
  | 'mushroom'
  | 'beetle';

export type EnemyRank =
  | 'normal'
  | 'elite';

export type EnemyDefinition = {
  id: EnemySpeciesId;
  name: string;
  eliteName: string;
  maxHealth: number;
  moveSpeed: number;
  damage: number;
  attackRange: number;
  attackCooldownMs: number;
  aggroRange: number;
  leashRange: number;
  dropCoins: number;
  texture: string;
  eliteTexture: string;
  bodyRadius: number;
  baselineOffset: number;
};

type GroupSpawn = {
  groupId: string;
  species: EnemySpeciesId;
  x: number;
  y: number;
  rank: EnemyRank;
};

type HabitatDefinition = {
  species: EnemySpeciesId;
  groups: ReadonlyArray<
    readonly [number, number]
  >;
  elites: ReadonlyArray<
    readonly [number, number]
  >;
};

const ELITE_HEALTH_MULTIPLIER = 2.8;
const ELITE_DAMAGE_MULTIPLIER = 1.55;
const ELITE_DROP_MULTIPLIER = 4;

const DEFINITIONS:
  Record<
    EnemySpeciesId,
    EnemyDefinition
  > = {
  goblin: {
    id: 'goblin',
    name: 'Гоблин',
    eliteName: 'Хобгоблин',
    maxHealth: 72,
    moveSpeed: 112,
    damage: 11,
    attackRange: 60,
    attackCooldownMs: 880,
    aggroRange: 145,
    leashRange: 255,
    dropCoins: 2,
    texture:
      'ruinstead-enemy-goblin',
    eliteTexture:
      'ruinstead-enemy-hobgoblin',
    bodyRadius: 22,
    baselineOffset: 31,
  },
  slime: {
    id: 'slime',
    name: 'Слизень',
    eliteName: 'Старший слизень',
    maxHealth: 58,
    moveSpeed: 92,
    damage: 9,
    attackRange: 54,
    attackCooldownMs: 760,
    aggroRange: 140,
    leashRange: 245,
    dropCoins: 2,
    texture:
      'ruinstead-enemy-slime',
    eliteTexture:
      'ruinstead-enemy-elder-slime',
    bodyRadius: 20,
    baselineOffset: 25,
  },
  boar: {
    id: 'boar',
    name: 'Кабан',
    eliteName: 'Вожак кабанов',
    maxHealth: 92,
    moveSpeed: 142,
    damage: 14,
    attackRange: 62,
    attackCooldownMs: 960,
    aggroRange: 155,
    leashRange: 285,
    dropCoins: 3,
    texture:
      'ruinstead-enemy-boar',
    eliteTexture:
      'ruinstead-enemy-boar-alpha',
    bodyRadius: 25,
    baselineOffset: 30,
  },
  mushroom: {
    id: 'mushroom',
    name: 'Грибник',
    eliteName: 'Старший грибник',
    maxHealth: 76,
    moveSpeed: 82,
    damage: 13,
    attackRange: 62,
    attackCooldownMs: 1040,
    aggroRange: 138,
    leashRange: 240,
    dropCoins: 3,
    texture:
      'ruinstead-enemy-mushroom',
    eliteTexture:
      'ruinstead-enemy-elder-mushroom',
    bodyRadius: 22,
    baselineOffset: 31,
  },
  beetle: {
    id: 'beetle',
    name: 'Панцирник',
    eliteName: 'Матёрый панцирник',
    maxHealth: 125,
    moveSpeed: 74,
    damage: 18,
    attackRange: 68,
    attackCooldownMs: 1180,
    aggroRange: 135,
    leashRange: 230,
    dropCoins: 4,
    texture:
      'ruinstead-enemy-beetle',
    eliteTexture:
      'ruinstead-enemy-beetle-elite',
    bodyRadius: 28,
    baselineOffset: 34,
  },
};

const HABITATS:
  readonly HabitatDefinition[] = [
  {
    species: 'goblin',
    groups: [
      [1120, 760],
      [1320, 840],
      [1160, 1040],
    ],
    elites: [
      [1290, 680],
      [1410, 980],
      [1040, 1120],
    ],
  },
  {
    species: 'slime',
    groups: [
      [1450, 390],
      [1640, 470],
      [1490, 590],
    ],
    elites: [
      [1350, 500],
      [1730, 380],
      [1680, 640],
    ],
  },
  {
    species: 'boar',
    groups: [
      [1540, 1220],
      [1760, 1320],
      [1850, 1120],
    ],
    elites: [
      [1450, 1370],
      [1940, 1280],
      [1730, 1050],
    ],
  },
  {
    species: 'mushroom',
    groups: [
      [1980, 420],
      [2200, 500],
      [2070, 700],
    ],
    elites: [
      [1880, 560],
      [2320, 390],
      [2250, 760],
    ],
  },
  {
    species: 'beetle',
    groups: [
      [2160, 1080],
      [2390, 1180],
      [2250, 1390],
    ],
    elites: [
      [2070, 1260],
      [2520, 1090],
      [2450, 1450],
    ],
  },
];

const GROUP_MEMBER_OFFSETS:
  ReadonlyArray<
    readonly [number, number]
  > = [
  [-42, -24],
  [38, -18],
  [0, 38],
];

function buildSpawns():
  GroupSpawn[] {
  const spawns:
    GroupSpawn[] = [];

  for (
    const habitat of HABITATS
  ) {
    habitat.groups.forEach(
      ([x, y], groupIndex) => {
        for (
          const [offsetX, offsetY]
          of GROUP_MEMBER_OFFSETS
        ) {
          spawns.push({
            groupId:
              `${habitat.species}-group-${groupIndex + 1}`,
            species:
              habitat.species,
            x: x + offsetX,
            y: y + offsetY,
            rank: 'normal',
          });
        }
      },
    );

    habitat.elites.forEach(
      ([x, y], eliteIndex) => {
        spawns.push({
          groupId:
            `${habitat.species}-elite-${eliteIndex + 1}`,
          species:
            habitat.species,
          x,
          y,
          rank: 'elite',
        });
      },
    );
  }

  return spawns;
}

export class EnemyUnit {
  readonly sprite:
    Phaser.Physics.Arcade.Sprite;
  readonly definition:
    EnemyDefinition;
  readonly spawn:
    Phaser.Math.Vector2;
  readonly groupId: string;
  readonly rank: EnemyRank;

  private readonly shadow:
    Phaser.GameObjects.Ellipse;
  private readonly aura?:
    Phaser.GameObjects.Arc;
  private readonly healthBack:
    Phaser.GameObjects.Rectangle;
  private readonly healthFill:
    Phaser.GameObjects.Rectangle;

  private readonly maxHealth:
    number;
  private health:
    number;
  private nextAttackAt = 0;
  private _alive = true;

  constructor(
    private readonly scene:
      Phaser.Scene,
    group:
      Phaser.Physics.Arcade.Group,
    spawn: GroupSpawn,
  ) {
    this.definition =
      DEFINITIONS[spawn.species];
    this.groupId =
      spawn.groupId;
    this.rank =
      spawn.rank;
    this.spawn =
      new Phaser.Math.Vector2(
        spawn.x,
        spawn.y,
      );

    const elite =
      this.rank === 'elite';
    this.maxHealth =
      Math.round(
        this.definition.maxHealth *
          (elite
            ? ELITE_HEALTH_MULTIPLIER
            : 1),
      );
    this.health =
      this.maxHealth;

    const radius =
      this.definition.bodyRadius *
      (elite ? 1.2 : 1);

    this.shadow = scene.add
      .ellipse(
        spawn.x,
        spawn.y + 24,
        radius * 2.25,
        radius * 0.82,
        0x2f662b,
        0.2,
      );

    if (elite) {
      this.aura = scene.add
        .circle(
          spawn.x,
          spawn.y + 8,
          radius * 1.35,
          0xffcf57,
          0.08,
        )
        .setStrokeStyle(
          3,
          0xffd86b,
          0.58,
        );
    }

    this.sprite =
      group.create(
        spawn.x,
        spawn.y,
        elite
          ? this.definition
              .eliteTexture
          : this.definition.texture,
      ) as Phaser.Physics.Arcade.Sprite;

    if (elite) {
      this.sprite.setScale(1.22);
    }

    this.sprite.setCollideWorldBounds(
      true,
    );

    const body =
      this.sprite.body as
        Phaser.Physics.Arcade.Body;

    body.setCircle(
      radius,
      this.sprite.width / 2 -
        radius,
      this.sprite.height -
        radius * 2 -
        8,
    );

    const barWidth =
      elite ? 64 : 50;

    this.healthBack = scene.add
      .rectangle(
        spawn.x -
          barWidth / 2,
        spawn.y - 49,
        barWidth,
        elite ? 9 : 7,
        elite
          ? 0x5d4319
          : 0x2d3027,
        0.86,
      )
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.healthFill = scene.add
      .rectangle(
        spawn.x -
          (barWidth - 4) / 2,
        spawn.y - 49,
        barWidth - 4,
        elite ? 6 : 5,
        elite
          ? 0xffc94b
          : 0xf05c63,
        0.96,
      )
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.syncVisuals(
      false,
    );
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

  get damage():
    number {
    return Math.round(
      this.definition.damage *
        (this.rank === 'elite'
          ? ELITE_DAMAGE_MULTIPLIER
          : 1),
    );
  }

  get dropCoins():
    number {
    return Math.round(
      this.definition.dropCoins *
        (this.rank === 'elite'
          ? ELITE_DROP_MULTIPLIER
          : 1),
    );
  }

  getDamageProfile(
    weaponId: WeaponId,
  ): DamageProfile {
    return getStageDamageProfile(
      STAGE_ONE_COMBAT_PROFILE,
      weaponId,
    );
  }

  canTriggerAggro(
    playerPosition:
      Phaser.Math.Vector2,
  ): boolean {
    if (!this._alive) {
      return false;
    }

    return (
      Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        playerPosition.x,
        playerPosition.y,
      ) <=
      this.definition.aggroRange
    );
  }

  update(
    time: number,
    playerPosition:
      Phaser.Math.Vector2,
    groupEngaged: boolean,
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
      !groupEngaged ||
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

      this.syncVisuals(
        false,
      );
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
          this.damage,
        );

        this.scene.tweens.add({
          targets: this.sprite,
          scaleX:
            this.rank === 'elite'
              ? 1.34
              : 1.12,
          scaleY:
            this.rank === 'elite'
              ? 1.08
              : 0.9,
          duration: 85,
          yoyo: true,
          ease: 'Quad.Out',
        });
      }
    }

    this.syncVisuals(
      true,
    );
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

    this.updateHealthBar();
    this.showDamageNumber(
      amount,
      effectiveness,
    );

    this.healthBack.setVisible(
      true,
    );
    this.healthFill.setVisible(
      true,
    );

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
      const baseScale =
        this.rank === 'elite'
          ? 1.22
          : 1;

      this.scene.tweens.add({
        targets: this.sprite,
        scaleX:
          baseScale * 1.09,
        scaleY:
          baseScale * 0.93,
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
    this.aura?.destroy();
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

    const targets:
      Phaser.GameObjects.GameObject[] = [
      this.sprite,
      this.shadow,
    ];

    if (this.aura) {
      targets.push(this.aura);
    }

    this.scene.tweens.add({
      targets,
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
          this.maxHealth,
        0,
        1,
      );

    const width =
      this.rank === 'elite'
        ? 60
        : 46;

    this.healthFill.setDisplaySize(
      width * ratio,
      this.rank === 'elite'
        ? 6
        : 5,
    );
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
          ? '#aeb8bf'
          : '#fff3dd';

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
          this.sprite.y - 56,
          `-${amount}${suffix}`,
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize:
              effectiveness ===
              'weakness'
                ? '18px'
                : '15px',
            fontStyle: 'bold',
            color,
            stroke: '#56323a',
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

  private syncVisuals(
    engaged: boolean,
  ): void {
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
      .setDepth(
        baseline - 3,
      );

    this.aura
      ?.setPosition(
        this.sprite.x,
        this.sprite.y + 8,
      )
      .setDepth(
        baseline - 2,
      );

    const barWidth =
      this.rank === 'elite'
        ? 64
        : 50;

    this.healthBack
      .setPosition(
        this.sprite.x -
          barWidth / 2,
        this.sprite.y - 49,
      )
      .setDepth(
        baseline + 80,
      );

    this.healthFill
      .setPosition(
        this.sprite.x -
          (barWidth - 4) / 2,
        this.sprite.y - 49,
      )
      .setDepth(
        baseline + 81,
      );

    const showHealth =
      engaged ||
      this.health <
        this.maxHealth;

    this.healthBack.setVisible(
      showHealth,
    );
    this.healthFill.setVisible(
      showHealth,
    );
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
      const spawn of
      buildSpawns()
    ) {
      this.enemies.push(
        new EnemyUnit(
          scene,
          this.group,
          spawn,
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
    const engagedGroups =
      new Set<string>();

    for (
      const enemy of
      this.enemies
    ) {
      if (
        enemy.canTriggerAggro(
          playerPosition,
        )
      ) {
        engagedGroups.add(
          enemy.groupId,
        );
      }
    }

    for (
      const enemy of
      this.enemies
    ) {
      enemy.update(
        time,
        playerPosition,
        engagedGroups.has(
          enemy.groupId,
        ),
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
  ensureGoblinTexture(
    scene,
    DEFINITIONS.goblin.texture,
    false,
  );
  ensureGoblinTexture(
    scene,
    DEFINITIONS.goblin.eliteTexture,
    true,
  );

  ensureSlimeTexture(
    scene,
    DEFINITIONS.slime.texture,
    false,
  );
  ensureSlimeTexture(
    scene,
    DEFINITIONS.slime.eliteTexture,
    true,
  );

  ensureBoarTexture(
    scene,
    DEFINITIONS.boar.texture,
    false,
  );
  ensureBoarTexture(
    scene,
    DEFINITIONS.boar.eliteTexture,
    true,
  );

  ensureMushroomTexture(
    scene,
    DEFINITIONS.mushroom.texture,
    false,
  );
  ensureMushroomTexture(
    scene,
    DEFINITIONS.mushroom.eliteTexture,
    true,
  );

  ensureBeetleTexture(
    scene,
    DEFINITIONS.beetle.texture,
    false,
  );
  ensureBeetleTexture(
    scene,
    DEFINITIONS.beetle.eliteTexture,
    true,
  );
}

function createGraphics(
  scene: Phaser.Scene,
):
  Phaser.GameObjects.Graphics {
  return scene.make.graphics({
    x: 0,
    y: 0,
  });
}

function addEyes(
  graphics:
    Phaser.GameObjects.Graphics,
  y: number,
): void {
  graphics.fillStyle(
    0xffffff,
    1,
  );
  graphics.fillCircle(
    42,
    y,
    7,
  );
  graphics.fillCircle(
    61,
    y,
    7,
  );

  graphics.fillStyle(
    0x24222d,
    1,
  );
  graphics.fillCircle(
    43,
    y + 1,
    3,
  );
  graphics.fillCircle(
    60,
    y + 1,
    3,
  );
}

function ensureGoblinTexture(
  scene: Phaser.Scene,
  key: string,
  elite: boolean,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    createGraphics(scene);
  const skin =
    elite
      ? 0x426f35
      : 0x6cab4a;
  const cloth =
    elite
      ? 0x6d3340
      : 0x7a4b8c;

  g.fillStyle(
    skin,
    1,
  );
  g.fillTriangle(
    20,
    38,
    37,
    47,
    28,
    58,
  );
  g.fillTriangle(
    83,
    38,
    66,
    47,
    75,
    58,
  );
  g.fillCircle(
    52,
    48,
    elite ? 30 : 26,
  );

  g.fillStyle(
    cloth,
    1,
  );
  g.fillRoundedRect(
    31,
    67,
    42,
    elite ? 28 : 24,
    10,
  );

  addEyes(
    g,
    47,
  );

  if (elite) {
    g.fillStyle(
      0xead76b,
      1,
    );
    g.fillTriangle(
      38,
      20,
      47,
      36,
      32,
      34,
    );
    g.fillTriangle(
      66,
      20,
      72,
      35,
      57,
      36,
    );
  }

  g.generateTexture(
    key,
    104,
    112,
  );
  g.destroy();
}

function ensureSlimeTexture(
  scene: Phaser.Scene,
  key: string,
  elite: boolean,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    createGraphics(scene);

  g.fillStyle(
    elite
      ? 0x3967b8
      : 0x59a7ef,
    1,
  );
  g.fillEllipse(
    52,
    65,
    elite ? 76 : 66,
    elite ? 62 : 54,
  );

  g.fillStyle(
    elite
      ? 0x6f92df
      : 0x86c7ff,
    0.9,
  );
  g.fillEllipse(
    42,
    50,
    32,
    20,
  );

  addEyes(
    g,
    62,
  );

  g.generateTexture(
    key,
    104,
    112,
  );
  g.destroy();
}

function ensureBoarTexture(
  scene: Phaser.Scene,
  key: string,
  elite: boolean,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    createGraphics(scene);

  g.fillStyle(
    elite
      ? 0x6d3b2b
      : 0x965c3f,
    1,
  );
  g.fillEllipse(
    50,
    64,
    elite ? 82 : 70,
    elite ? 58 : 50,
  );

  g.fillStyle(
    elite
      ? 0x945340
      : 0xc17b55,
    1,
  );
  g.fillEllipse(
    72,
    66,
    34,
    25,
  );

  g.fillStyle(
    0xf1e1b8,
    1,
  );
  g.fillTriangle(
    76,
    67,
    91,
    59,
    86,
    73,
  );

  addEyes(
    g,
    54,
  );

  g.generateTexture(
    key,
    104,
    112,
  );
  g.destroy();
}

function ensureMushroomTexture(
  scene: Phaser.Scene,
  key: string,
  elite: boolean,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    createGraphics(scene);

  g.fillStyle(
    elite
      ? 0x7040a0
      : 0x9f62c2,
    1,
  );
  g.fillRoundedRect(
    41,
    52,
    23,
    43,
    10,
  );

  g.fillStyle(
    elite
      ? 0xd13e69
      : 0xee6e7a,
    1,
  );
  g.fillEllipse(
    52,
    43,
    elite ? 82 : 70,
    elite ? 46 : 40,
  );

  g.fillStyle(
    0xffe9ce,
    0.92,
  );
  g.fillCircle(
    37,
    37,
    6,
  );
  g.fillCircle(
    60,
    31,
    5,
  );
  g.fillCircle(
    70,
    45,
    4,
  );

  addEyes(
    g,
    70,
  );

  g.generateTexture(
    key,
    104,
    112,
  );
  g.destroy();
}

function ensureBeetleTexture(
  scene: Phaser.Scene,
  key: string,
  elite: boolean,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    createGraphics(scene);

  g.lineStyle(
    5,
    elite
      ? 0x263e62
      : 0x385c77,
    1,
  );

  for (
    const y of
    [48, 62, 76]
  ) {
    g.lineBetween(
      28,
      y,
      12,
      y - 10,
    );
    g.lineBetween(
      76,
      y,
      92,
      y - 10,
    );
  }

  g.fillStyle(
    elite
      ? 0x244d72
      : 0x3a7e9e,
    1,
  );
  g.fillEllipse(
    52,
    60,
    elite ? 72 : 62,
    elite ? 72 : 62,
  );

  g.fillStyle(
    elite
      ? 0x5b84b0
      : 0x68abc6,
    0.92,
  );
  g.fillEllipse(
    42,
    48,
    28,
    38,
  );

  g.lineStyle(
    3,
    0x183049,
    0.9,
  );
  g.lineBetween(
    52,
    28,
    52,
    91,
  );

  addEyes(
    g,
    42,
  );

  g.generateTexture(
    key,
    104,
    112,
  );
  g.destroy();
}
