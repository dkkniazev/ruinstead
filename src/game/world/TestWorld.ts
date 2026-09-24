import Phaser from 'phaser';

export const TEST_WORLD_WIDTH = 2400;
export const TEST_WORLD_HEIGHT = 1600;

const TREE_TEXTURE =
  'ruinstead-tree-iso-placeholder';
const ROCK_TEXTURE =
  'ruinstead-rock-iso-placeholder';

const TILE_HALF_WIDTH = 82;
const TILE_HALF_HEIGHT = 41;

const TREE_POSITIONS: ReadonlyArray<
  readonly [number, number]
> = [
  [520, 410],
  [665, 285],
  [840, 520],
  [1070, 360],
  [1280, 640],
  [1490, 430],
  [1760, 315],
  [2010, 520],
  [420, 940],
  [720, 1120],
  [1050, 1010],
  [1410, 1190],
  [1760, 980],
  [2070, 1180],
];

const ROCK_POSITIONS: ReadonlyArray<
  readonly [number, number]
> = [
  [790, 760],
  [1160, 460],
  [1550, 720],
  [1880, 780],
  [560, 1260],
  [1240, 1320],
  [1920, 1340],
];

export type TestWorld = {
  obstacles:
    Phaser.Physics.Arcade.StaticGroup;
  spawn: Phaser.Math.Vector2;
};

export function createTestWorld(
  scene: Phaser.Scene,
): TestWorld {
  ensureWorldTextures(scene);

  scene.physics.world.setBounds(
    0,
    0,
    TEST_WORLD_WIDTH,
    TEST_WORLD_HEIGHT,
  );

  drawIsometricGround(scene);

  const obstacles =
    scene.physics.add.staticGroup();

  for (
    const [x, y]
    of TREE_POSITIONS
  ) {
    const tree =
      obstacles.create(
        x,
        y,
        TREE_TEXTURE,
      ) as Phaser.Physics.Arcade.Sprite;

    tree
      .setDepth(y + 78)
      .refreshBody();

    const body =
      tree.body as
        Phaser.Physics.Arcade.StaticBody;

    body
      .setSize(42, 31)
      .setOffset(51, 143);
  }

  for (
    const [x, y]
    of ROCK_POSITIONS
  ) {
    const rock =
      obstacles.create(
        x,
        y,
        ROCK_TEXTURE,
      ) as Phaser.Physics.Arcade.Sprite;

    rock
      .setDepth(y + 38)
      .refreshBody();

    const body =
      rock.body as
        Phaser.Physics.Arcade.StaticBody;

    body
      .setSize(94, 40)
      .setOffset(13, 45);
  }

  return {
    obstacles,
    spawn:
      new Phaser.Math.Vector2(
        270,
        790,
      ),
  };
}

function drawIsometricGround(
  scene: Phaser.Scene,
): void {
  const ground =
    scene.add.graphics();

  ground.setDepth(-1000);
  ground.fillStyle(
    0x203226,
    1,
  );
  ground.fillRect(
    0,
    0,
    TEST_WORLD_WIDTH,
    TEST_WORLD_HEIGHT,
  );

  let row = 0;

  for (
    let cy = -TILE_HALF_HEIGHT;
    cy < TEST_WORLD_HEIGHT + TILE_HALF_HEIGHT;
    cy += TILE_HALF_HEIGHT * 2
  ) {
    const offset =
      row % 2 === 0
        ? 0
        : TILE_HALF_WIDTH;

    let column = 0;

    for (
      let cx = -TILE_HALF_WIDTH + offset;
      cx < TEST_WORLD_WIDTH + TILE_HALF_WIDTH;
      cx += TILE_HALF_WIDTH * 2
    ) {
      const variant =
        (row * 7 + column * 11) % 4;

      const color =
        variant === 0
          ? 0x263b2c
          : variant === 1
            ? 0x24382a
            : variant === 2
              ? 0x293e2e
              : 0x223528;

      drawDiamond(
        ground,
        cx,
        cy,
        TILE_HALF_WIDTH,
        TILE_HALF_HEIGHT,
        color,
        0.76,
      );

      column += 1;
    }

    row += 1;
  }

  // A broad diagonal track helps the eye read the ground plane as 3/4.
  const pathPoints: ReadonlyArray<
    readonly [number, number]
  > = [
    [170, 800],
    [420, 775],
    [700, 810],
    [970, 860],
    [1240, 840],
    [1510, 790],
    [1780, 760],
    [2070, 800],
    [2290, 845],
  ];

  for (
    let index = 0;
    index < pathPoints.length;
    index += 1
  ) {
    const [x, y] =
      pathPoints[index];

    drawDiamond(
      ground,
      x,
      y,
      150,
      55,
      0x675e40,
      index % 2 === 0
        ? 0.5
        : 0.42,
    );
  }

  // Sparse ground tufts: flattened ellipses reinforce the oblique view.
  ground.fillStyle(
    0x39513a,
    0.55,
  );

  for (
    let x = 130;
    x < TEST_WORLD_WIDTH;
    x += 210
  ) {
    for (
      let y = 160;
      y < TEST_WORLD_HEIGHT;
      y += 190
    ) {
      const jx =
        ((x * 13 + y * 5) % 61) - 30;
      const jy =
        ((x * 3 + y * 17) % 43) - 21;

      ground.fillEllipse(
        x + jx,
        y + jy,
        52,
        18,
      );
    }
  }

  const border =
    scene.add.graphics();

  border.setDepth(-900);
  border.lineStyle(
    12,
    0x152219,
    0.9,
  );
  border.strokeRect(
    6,
    6,
    TEST_WORLD_WIDTH - 12,
    TEST_WORLD_HEIGHT - 12,
  );
}

function drawDiamond(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  color: number,
  alpha: number,
): void {
  graphics.fillStyle(
    color,
    alpha,
  );
  graphics.beginPath();
  graphics.moveTo(
    cx,
    cy - halfHeight,
  );
  graphics.lineTo(
    cx + halfWidth,
    cy,
  );
  graphics.lineTo(
    cx,
    cy + halfHeight,
  );
  graphics.lineTo(
    cx - halfWidth,
    cy,
  );
  graphics.closePath();
  graphics.fillPath();
}

function ensureWorldTextures(
  scene: Phaser.Scene,
): void {
  if (
    !scene.textures.exists(
      TREE_TEXTURE,
    )
  ) {
    const tree =
      scene.make.graphics({
        x: 0,
        y: 0,
      });

    // Ground shadow.
    tree.fillStyle(
      0x08110b,
      0.28,
    );
    tree.fillEllipse(
      72,
      165,
      92,
      28,
    );

    // Trunk with a lit and shaded plane.
    tree.fillStyle(
      0x493421,
      1,
    );
    tree.fillRoundedRect(
      61,
      92,
      25,
      72,
      7,
    );
    tree.fillStyle(
      0x62462a,
      1,
    );
    tree.fillRoundedRect(
      61,
      92,
      11,
      68,
      5,
    );

    // Lower dark crown creates visible underside.
    tree.fillStyle(
      0x244b31,
      1,
    );
    tree.fillEllipse(
      73,
      88,
      112,
      64,
    );

    // Upper planes.
    tree.fillStyle(
      0x376e48,
      1,
    );
    tree.fillEllipse(
      48,
      66,
      74,
      68,
    );
    tree.fillEllipse(
      93,
      64,
      76,
      72,
    );

    tree.fillStyle(
      0x47845a,
      0.95,
    );
    tree.fillEllipse(
      72,
      46,
      78,
      62,
    );

    tree.generateTexture(
      TREE_TEXTURE,
      144,
      188,
    );
    tree.destroy();
  }

  if (
    !scene.textures.exists(
      ROCK_TEXTURE,
    )
  ) {
    const rock =
      scene.make.graphics({
        x: 0,
        y: 0,
      });

    rock.fillStyle(
      0x08110b,
      0.23,
    );
    rock.fillEllipse(
      61,
      77,
      102,
      25,
    );

    // Dark side plane.
    rock.fillStyle(
      0x596057,
      1,
    );
    rock.beginPath();
    rock.moveTo(
      13,
      48,
    );
    rock.lineTo(
      61,
      68,
    );
    rock.lineTo(
      108,
      47,
    );
    rock.lineTo(
      104,
      73,
    );
    rock.lineTo(
      61,
      88,
    );
    rock.lineTo(
      16,
      72,
    );
    rock.closePath();
    rock.fillPath();

    // Light top face.
    rock.fillStyle(
      0x858d80,
      1,
    );
    rock.beginPath();
    rock.moveTo(
      14,
      48,
    );
    rock.lineTo(
      52,
      17,
    );
    rock.lineTo(
      106,
      46,
    );
    rock.lineTo(
      61,
      68,
    );
    rock.closePath();
    rock.fillPath();

    rock.fillStyle(
      0xa0a798,
      0.7,
    );
    rock.beginPath();
    rock.moveTo(
      52,
      17,
    );
    rock.lineTo(
      68,
      48,
    );
    rock.lineTo(
      61,
      68,
    );
    rock.lineTo(
      14,
      48,
    );
    rock.closePath();
    rock.fillPath();

    rock.generateTexture(
      ROCK_TEXTURE,
      120,
      96,
    );
    rock.destroy();
  }
}
