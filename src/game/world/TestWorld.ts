import Phaser from 'phaser';

export const TEST_WORLD_WIDTH = 2400;
export const TEST_WORLD_HEIGHT = 1600;

const TREE_TEXTURE =
  'ruinstead-tree-placeholder';
const ROCK_TEXTURE =
  'ruinstead-rock-placeholder';

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

  const ground =
    scene.add.graphics();

  ground.setDepth(-20);
  ground.fillStyle(
    0x25392b,
    1,
  );
  ground.fillRect(
    0,
    0,
    TEST_WORLD_WIDTH,
    TEST_WORLD_HEIGHT,
  );

  ground.fillStyle(
    0x314a36,
    0.68,
  );

  for (
    let x = 80;
    x < TEST_WORLD_WIDTH;
    x += 180
  ) {
    for (
      let y = 80;
      y < TEST_WORLD_HEIGHT;
      y += 150
    ) {
      const jitterX =
        ((x * 17 + y * 11) % 53) - 26;
      const jitterY =
        ((x * 7 + y * 19) % 47) - 23;

      ground.fillCircle(
        x + jitterX,
        y + jitterY,
        16 + ((x + y) % 18),
      );
    }
  }

  ground.lineStyle(
    34,
    0x6e6747,
    0.55,
  );
  ground.beginPath();
  ground.moveTo(
    190,
    760,
  );
  ground.lineTo(
    780,
    730,
  );
  ground.lineTo(
    1240,
    850,
  );
  ground.lineTo(
    1740,
    710,
  );
  ground.lineTo(
    2210,
    760,
  );
  ground.strokePath();

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

    tree.setDepth(y);
    tree.refreshBody();

    const body =
      tree.body as
        Phaser.Physics.Arcade.StaticBody;

    body.setSize(
      42,
      34,
    );
    body.setOffset(
      27,
      69,
    );
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

    rock.setDepth(y);
    rock.refreshBody();

    const body =
      rock.body as
        Phaser.Physics.Arcade.StaticBody;

    body.setSize(
      80,
      48,
    );
    body.setOffset(
      8,
      30,
    );
  }

  const border =
    scene.add.graphics();

  border.setDepth(-10);
  border.lineStyle(
    16,
    0x17251c,
    1,
  );
  border.strokeRect(
    8,
    8,
    TEST_WORLD_WIDTH - 16,
    TEST_WORLD_HEIGHT - 16,
  );

  scene.add
    .text(
      1190,
      182,
      'ЗАРОСШИЙ ЛЕС · TEST AREA',
      {
        fontFamily:
          'system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#d9dfc9',
      },
    )
    .setOrigin(0.5)
    .setDepth(1);

  scene.add
    .text(
      1188,
      224,
      'Пока без врагов и ресурсов — проверяем движение, коллизии и камеру',
      {
        fontFamily:
          'system-ui, sans-serif',
        fontSize: '18px',
        color: '#aebba6',
      },
    )
    .setOrigin(0.5)
    .setDepth(1);

  return {
    obstacles,
    spawn:
      new Phaser.Math.Vector2(
        260,
        760,
      ),
  };
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

    tree.fillStyle(
      0x513b27,
      1,
    );
    tree.fillRoundedRect(
      39,
      62,
      18,
      42,
      6,
    );

    tree.fillStyle(
      0x2e5e3b,
      1,
    );
    tree.fillCircle(
      48,
      45,
      34,
    );

    tree.fillStyle(
      0x3d7650,
      1,
    );
    tree.fillCircle(
      32,
      52,
      23,
    );
    tree.fillCircle(
      65,
      55,
      25,
    );

    tree.generateTexture(
      TREE_TEXTURE,
      96,
      108,
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
      0x5f675d,
      1,
    );
    rock.fillRoundedRect(
      9,
      29,
      78,
      49,
      18,
    );

    rock.fillStyle(
      0x778075,
      1,
    );
    rock.fillTriangle(
      20,
      44,
      48,
      12,
      76,
      44,
    );

    rock.generateTexture(
      ROCK_TEXTURE,
      96,
      86,
    );
    rock.destroy();
  }
}
