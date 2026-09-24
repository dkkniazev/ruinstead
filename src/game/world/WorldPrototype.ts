import Phaser from 'phaser';

export const WORLD_WIDTH = 2800;
export const WORLD_HEIGHT = 1800;

export const SETTLEMENT_CENTER =
  new Phaser.Math.Vector2(650, 930);
export const SETTLEMENT_SAFE_RADIUS = 390;

export const RETURN_POINT =
  new Phaser.Math.Vector2(760, 1010);
export const RETURN_RADIUS = 92;

const BUSH_TEXTURE =
  'ruinstead-bush-obstacle-prototype';
const RUIN_TEXTURE =
  'ruinstead-ruin-obstacle-prototype';
const FORGE_RUIN_TEXTURE =
  'ruinstead-forge-ruin-prototype';
const TENT_TEXTURE =
  'ruinstead-tent-prototype';

const BUSH_POSITIONS: ReadonlyArray<
  readonly [number, number]
> = [
  [220, 290],
  [460, 250],
  [830, 230],
  [1130, 300],
  [1430, 220],
  [1720, 330],
  [2050, 240],
  [2410, 330],
  [2580, 590],
  [2460, 900],
  [2640, 1170],
  [2410, 1450],
  [2040, 1570],
  [1720, 1490],
  [1450, 1600],
  [1130, 1510],
  [820, 1610],
  [460, 1520],
  [220, 1370],
  [160, 1080],
  [150, 710],
  [1180, 650],
  [1420, 520],
  [1610, 780],
  [1870, 590],
  [2130, 750],
  [2290, 1080],
  [2020, 1210],
  [1780, 1090],
  [1530, 1260],
  [1310, 1010],
];

const RUIN_POSITIONS: ReadonlyArray<
  readonly [number, number]
> = [
  [1090, 410],
  [1320, 740],
  [1540, 410],
  [1850, 860],
  [2220, 510],
  [2380, 1280],
  [1960, 1450],
  [1510, 1480],
  [1160, 1320],
  [340, 1260],
  [360, 520],
];

export type PrototypeWorld = {
  obstacles:
    Phaser.Physics.Arcade.StaticGroup;
  spawn: Phaser.Math.Vector2;
};

export function createPrototypeWorld(
  scene: Phaser.Scene,
): PrototypeWorld {
  ensureWorldTextures(scene);

  scene.physics.world.setBounds(
    0,
    0,
    WORLD_WIDTH,
    WORLD_HEIGHT,
  );

  drawGround(scene);
  drawSettlement(scene);
  const obstacles =
    createObstacles(scene);

  return {
    obstacles,
    spawn:
      new Phaser.Math.Vector2(
        635,
        1015,
      ),
  };
}

export function getAreaName(
  position: Phaser.Math.Vector2,
): string {
  const distance =
    Phaser.Math.Distance.Between(
      position.x,
      position.y,
      SETTLEMENT_CENTER.x,
      SETTLEMENT_CENTER.y,
    );

  if (
    distance <=
    SETTLEMENT_SAFE_RADIUS
  ) {
    return 'Руины поселения';
  }

  if (position.x < 1450) {
    return 'Опушка';
  }

  return 'Заросший лес';
}

function drawGround(
  scene: Phaser.Scene,
): void {
  const ground =
    scene.add.graphics();

  ground.setDepth(-1000);
  ground.fillStyle(
    0x72c957,
    1,
  );
  ground.fillRect(
    0,
    0,
    WORLD_WIDTH,
    WORLD_HEIGHT,
  );

  // Broad soft patches instead of a visible tile grid.
  const patchColors = [
    0x67bd4e,
    0x7fd45f,
    0x62b94a,
  ];

  for (
    let x = 90;
    x < WORLD_WIDTH;
    x += 180
  ) {
    for (
      let y = 80;
      y < WORLD_HEIGHT;
      y += 150
    ) {
      const index =
        Math.abs(
          (x * 17 + y * 13) % 3,
        );
      const jitterX =
        ((x * 11 + y * 5) % 71) - 35;
      const jitterY =
        ((x * 7 + y * 19) % 59) - 29;

      ground.fillStyle(
        patchColors[index],
        0.26,
      );
      ground.fillEllipse(
        x + jitterX,
        y + jitterY,
        108,
        58,
      );
    }
  }

  // Main dirt road connects the settlement with the wild area.
  ground.lineStyle(
    92,
    0xe9ca7a,
    1,
  );
  ground.beginPath();
  ground.moveTo(
    560,
    1030,
  );
  ground.lineTo(
    850,
    930,
  );
  ground.lineTo(
    1120,
    890,
  );
  ground.lineTo(
    1420,
    810,
  );
  ground.lineTo(
    1720,
    770,
  );
  ground.lineTo(
    2020,
    680,
  );
  ground.strokePath();

  ground.lineStyle(
    64,
    0xf4d98f,
    0.72,
  );
  ground.strokePath();

  drawFlowers(ground);
  drawGrassTufts(ground);

  const border =
    scene.add.graphics();

  border.setDepth(-900);
  border.lineStyle(
    18,
    0x49963e,
    0.6,
  );
  border.strokeRect(
    8,
    8,
    WORLD_WIDTH - 16,
    WORLD_HEIGHT - 16,
  );
}

function drawSettlement(
  scene: Phaser.Scene,
): void {
  const decor =
    scene.add.graphics();

  decor.setDepth(-20);

  // Safe-zone clearing. It blends into the same map instead of being a scene.
  decor.fillStyle(
    0x84d768,
    0.9,
  );
  decor.fillEllipse(
    SETTLEMENT_CENTER.x,
    SETTLEMENT_CENTER.y,
    760,
    610,
  );

  // Worn ground around the central camp.
  decor.fillStyle(
    0xd9bd78,
    0.34,
  );
  decor.fillEllipse(
    650,
    955,
    440,
    260,
  );

  // Temporary field stash used to bank carried resources.
  decor.fillStyle(
    0x5d3d25,
    1,
  );
  decor.fillRoundedRect(
    RETURN_POINT.x - 34,
    RETURN_POINT.y - 24,
    68,
    48,
    7,
  );
  decor.fillStyle(
    0x9c6938,
    1,
  );
  decor.fillRoundedRect(
    RETURN_POINT.x - 31,
    RETURN_POINT.y - 20,
    62,
    19,
    6,
  );
  decor.lineStyle(
    4,
    0xe2c264,
    0.9,
  );
  decor.strokeCircle(
    RETURN_POINT.x,
    RETURN_POINT.y,
    RETURN_RADIUS,
  );

  scene.add
    .text(
      RETURN_POINT.x,
      RETURN_POINT.y + 43,
      'Походный тайник',
      {
        fontFamily:
          'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#4f5937',
        backgroundColor:
          '#f0e3a6aa',
        padding: {
          x: 7,
          y: 3,
        },
      },
    )
    .setOrigin(0.5)
    .setDepth(
      RETURN_POINT.y + 80,
    );

  // Campfire.
  decor.fillStyle(
    0x7e5432,
    1,
  );
  decor.fillRoundedRect(
    620,
    930,
    60,
    16,
    7,
  );
  decor.fillStyle(
    0xff8f2f,
    1,
  );
  decor.fillTriangle(
    637,
    939,
    653,
    898,
    670,
    939,
  );
  decor.fillStyle(
    0xffd45c,
    1,
  );
  decor.fillTriangle(
    643,
    938,
    654,
    909,
    665,
    938,
  );

  scene.add
    .image(
      475,
      830,
      TENT_TEXTURE,
    )
    .setDepth(902);

  scene.add
    .image(
      850,
      845,
      FORGE_RUIN_TEXTURE,
    )
    .setDepth(930);

  scene.add
    .text(
      650,
      1135,
      'Руины поселения',
      {
        fontFamily:
          'system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#41613a',
      },
    )
    .setOrigin(0.5)
    .setDepth(1140);
}

function createObstacles(
  scene: Phaser.Scene,
):
  Phaser.Physics.Arcade.StaticGroup {
  const obstacles =
    scene.physics.add.staticGroup();

  for (
    const [x, y]
    of BUSH_POSITIONS
  ) {
    const tree =
      obstacles.create(
        x,
        y,
        BUSH_TEXTURE,
      ) as Phaser.Physics.Arcade.Sprite;

    tree
      .setDepth(y + 48)
      .refreshBody();

    const body =
      tree.body as
        Phaser.Physics.Arcade.StaticBody;

    body
      .setSize(78, 34)
      .setOffset(33, 72);
  }

  for (
    const [x, y]
    of RUIN_POSITIONS
  ) {
    const rock =
      obstacles.create(
        x,
        y,
        RUIN_TEXTURE,
      ) as Phaser.Physics.Arcade.Sprite;

    rock
      .setDepth(y + 42)
      .refreshBody();

    const body =
      rock.body as
        Phaser.Physics.Arcade.StaticBody;

    body
      .setSize(76, 38)
      .setOffset(22, 44);
  }

  return obstacles;
}

function drawFlowers(
  graphics: Phaser.GameObjects.Graphics,
): void {
  const points: ReadonlyArray<
    readonly [number, number, number]
  > = [
    [260, 870, 0xff735f],
    [390, 1060, 0xffd65b],
    [910, 1090, 0xff775f],
    [1080, 760, 0xffffff],
    [1250, 1130, 0xffd65b],
    [1510, 690, 0xff775f],
    [1680, 920, 0xffffff],
    [1960, 540, 0xffd65b],
    [2200, 850, 0xff775f],
    [2320, 1370, 0xffffff],
    [1830, 1330, 0xffd65b],
    [1380, 1460, 0xff775f],
  ];

  for (
    const [x, y, color]
    of points
  ) {
    graphics.fillStyle(
      color,
      0.92,
    );
    graphics.fillCircle(
      x - 5,
      y,
      5,
    );
    graphics.fillCircle(
      x + 5,
      y,
      5,
    );
    graphics.fillCircle(
      x,
      y - 5,
      5,
    );
    graphics.fillStyle(
      0xffe78a,
      1,
    );
    graphics.fillCircle(
      x,
      y,
      3,
    );
  }
}

function drawGrassTufts(
  graphics: Phaser.GameObjects.Graphics,
): void {
  const points: ReadonlyArray<
    readonly [number, number]
  > = [
    [1040, 560],
    [1210, 540],
    [1450, 1040],
    [1640, 590],
    [1900, 1040],
    [2140, 1180],
    [2350, 720],
    [1770, 1410],
    [1240, 1370],
    [970, 1280],
  ];

  graphics.lineStyle(
    5,
    0x3f9d43,
    0.8,
  );

  for (
    const [x, y]
    of points
  ) {
    graphics.lineBetween(
      x,
      y + 10,
      x - 8,
      y - 9,
    );
    graphics.lineBetween(
      x,
      y + 10,
      x,
      y - 12,
    );
    graphics.lineBetween(
      x,
      y + 10,
      x + 9,
      y - 8,
    );
  }
}

function ensureWorldTextures(
  scene: Phaser.Scene,
): void {
  ensureBushTexture(scene);
  ensureRuinTexture(scene);
  ensureTentTexture(scene);
  ensureForgeRuinTexture(scene);
}

function ensureBushTexture(
  scene: Phaser.Scene,
): void {
  if (
    scene.textures.exists(
      BUSH_TEXTURE,
    )
  ) {
    return;
  }

  const bush =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  bush.fillStyle(
    0x285c32,
    0.16,
  );
  bush.fillEllipse(
    72,
    100,
    112,
    26,
  );

  bush.fillStyle(
    0x168a57,
    1,
  );
  bush.fillCircle(
    43,
    66,
    34,
  );
  bush.fillCircle(
    78,
    55,
    40,
  );
  bush.fillCircle(
    105,
    72,
    31,
  );

  bush.fillStyle(
    0x29b86b,
    1,
  );
  bush.fillCircle(
    53,
    50,
    24,
  );
  bush.fillCircle(
    88,
    43,
    26,
  );

  bush.fillStyle(
    0x62cb77,
    0.72,
  );
  bush.fillCircle(
    72,
    35,
    14,
  );

  bush.generateTexture(
    BUSH_TEXTURE,
    144,
    120,
  );
  bush.destroy();
}

function ensureRuinTexture(
  scene: Phaser.Scene,
): void {
  if (
    scene.textures.exists(
      RUIN_TEXTURE,
    )
  ) {
    return;
  }

  const ruin =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  ruin.fillStyle(
    0x2c682f,
    0.14,
  );
  ruin.fillEllipse(
    60,
    83,
    104,
    22,
  );

  ruin.fillStyle(
    0xa99574,
    1,
  );
  ruin.fillRoundedRect(
    22,
    34,
    27,
    48,
    5,
  );
  ruin.fillRoundedRect(
    66,
    18,
    30,
    64,
    5,
  );

  ruin.fillStyle(
    0xd1c09a,
    1,
  );
  ruin.fillRoundedRect(
    18,
    27,
    35,
    17,
    4,
  );
  ruin.fillRoundedRect(
    61,
    11,
    40,
    18,
    4,
  );

  ruin.lineStyle(
    5,
    0x77654f,
    0.8,
  );
  ruin.lineBetween(
    33,
    45,
    43,
    60,
  );
  ruin.lineBetween(
    78,
    31,
    89,
    48,
  );

  ruin.generateTexture(
    RUIN_TEXTURE,
    120,
    96,
  );
  ruin.destroy();
}

function ensureTentTexture(
  scene: Phaser.Scene,
): void {
  if (
    scene.textures.exists(
      TENT_TEXTURE,
    )
  ) {
    return;
  }

  const tent =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  tent.fillStyle(
    0x3f783b,
    0.16,
  );
  tent.fillEllipse(
    80,
    103,
    135,
    28,
  );

  tent.fillStyle(
    0xd99348,
    1,
  );
  tent.beginPath();
  tent.moveTo(18, 88);
  tent.lineTo(77, 26);
  tent.lineTo(143, 88);
  tent.lineTo(128, 108);
  tent.lineTo(33, 108);
  tent.closePath();
  tent.fillPath();

  tent.fillStyle(
    0xf2b45f,
    1,
  );
  tent.beginPath();
  tent.moveTo(18, 88);
  tent.lineTo(77, 26);
  tent.lineTo(83, 88);
  tent.closePath();
  tent.fillPath();

  tent.fillStyle(
    0x6f4932,
    1,
  );
  tent.fillTriangle(
    70,
    108,
    83,
    74,
    96,
    108,
  );

  tent.generateTexture(
    TENT_TEXTURE,
    160,
    122,
  );
  tent.destroy();
}

function ensureForgeRuinTexture(
  scene: Phaser.Scene,
): void {
  if (
    scene.textures.exists(
      FORGE_RUIN_TEXTURE,
    )
  ) {
    return;
  }

  const forge =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  forge.fillStyle(
    0x3f783b,
    0.16,
  );
  forge.fillEllipse(
    95,
    120,
    164,
    34,
  );

  forge.fillStyle(
    0xa49177,
    1,
  );
  forge.fillRoundedRect(
    22,
    58,
    146,
    62,
    12,
  );

  forge.fillStyle(
    0xc3b295,
    1,
  );
  forge.beginPath();
  forge.moveTo(18, 62);
  forge.lineTo(72, 24);
  forge.lineTo(171, 61);
  forge.lineTo(117, 83);
  forge.closePath();
  forge.fillPath();

  forge.fillStyle(
    0x726552,
    1,
  );
  forge.fillRect(
    104,
    73,
    38,
    47,
  );

  forge.lineStyle(
    8,
    0x715c49,
    1,
  );
  forge.lineBetween(
    34,
    52,
    73,
    86,
  );
  forge.lineBetween(
    73,
    86,
    110,
    43,
  );

  forge.generateTexture(
    FORGE_RUIN_TEXTURE,
    190,
    138,
  );
  forge.destroy();
}
