import Phaser from 'phaser';
import {
  RELEASE_PASSAGES,
  RELEASE_REGIONS,
  RELEASE_WORLD_HEIGHT,
  RELEASE_WORLD_WIDTH,
  getRegionAt,
  getRegionDefinition,
} from './ReleaseRegionMap';

export const WORLD_WIDTH =
  RELEASE_WORLD_WIDTH;
export const WORLD_HEIGHT =
  RELEASE_WORLD_HEIGHT;

const REGION_ONE =
  getRegionDefinition(1);

export const SETTLEMENT_CENTER =
  new Phaser.Math.Vector2(
    REGION_ONE.center[0],
    REGION_ONE.center[1] + 380,
  );
export const SETTLEMENT_SAFE_RADIUS =
  520;

export const RETURN_POINT =
  new Phaser.Math.Vector2(
    SETTLEMENT_CENTER.x - 150,
    SETTLEMENT_CENTER.y + 90,
  );
export const RETURN_RADIUS = 92;

export type PrototypeWorld = {
  obstacles:
    Phaser.Physics.Arcade.StaticGroup;
  spawn: Phaser.Math.Vector2;
};

export function createPrototypeWorld(
  scene: Phaser.Scene,
): PrototypeWorld {
  scene.physics.world.setBounds(
    0,
    0,
    WORLD_WIDTH,
    WORLD_HEIGHT,
  );

  drawWorld(scene);
  drawSettlement(scene);

  const obstacles =
    createPrototypeObstacles(
      scene,
    );

  return {
    obstacles,
    spawn:
      new Phaser.Math.Vector2(
        SETTLEMENT_CENTER.x,
        SETTLEMENT_CENTER.y + 190,
      ),
  };
}

export function getAreaName(
  position: Phaser.Math.Vector2,
): string {
  const settlementDistance =
    Phaser.Math.Distance.Between(
      position.x,
      position.y,
      SETTLEMENT_CENTER.x,
      SETTLEMENT_CENTER.y,
    );

  if (
    settlementDistance <=
    SETTLEMENT_SAFE_RADIUS
  ) {
    return 'Руины поселения';
  }

  const region =
    getRegionAt(position);

  return (
    region?.name ??
    'Межрегиональный проход'
  );
}

function drawWorld(
  scene: Phaser.Scene,
): void {
  const g =
    scene.add.graphics();
  g.setDepth(-1000);

  g.fillStyle(
    0x293332,
    1,
  );
  g.fillRect(
    0,
    0,
    WORLD_WIDTH,
    WORLD_HEIGHT,
  );

  // Corridors are drawn first so each region visually grows into them.
  for (
    const passage of
    RELEASE_PASSAGES
  ) {
    const a =
      getRegionDefinition(
        passage.a,
      );
    const b =
      getRegionDefinition(
        passage.b,
      );

    const color =
      passage.kind ===
        'bridge'
        ? 0x8b6b49
        : passage.kind ===
            'lava-gate'
          ? 0x7e4b3e
          : 0xb39262;

    g.lineStyle(
      passage.width,
      color,
      1,
    );
    g.beginPath();
    g.moveTo(
      a.center[0],
      a.center[1],
    );
    g.lineTo(
      b.center[0],
      b.center[1],
    );
    g.strokePath();

    g.lineStyle(
      Math.max(
        46,
        passage.width - 76,
      ),
      passage.kind ===
        'lava-gate'
        ? 0xa85b3f
        : 0xd4b77a,
      0.9,
    );
    g.strokePath();
  }

  for (
    const region of
    RELEASE_REGIONS
  ) {
    // Two offset ellipses avoid the old rectangular-zone look.
    g.fillStyle(
      region.groundColor,
      1,
    );
    g.fillEllipse(
      region.center[0],
      region.center[1],
      region.radiusX * 2,
      region.radiusY * 2,
    );

    g.fillStyle(
      region.accentColor,
      0.22,
    );
    g.fillEllipse(
      region.center[0] -
        region.radiusX * 0.18,
      region.center[1] -
        region.radiusY * 0.12,
      region.radiusX * 1.42,
      region.radiusY * 1.26,
    );
    g.fillEllipse(
      region.center[0] +
        region.radiusX * 0.26,
      region.center[1] +
        region.radiusY * 0.18,
      region.radiusX * 1.18,
      region.radiusY * 0.94,
    );

    drawRegionTerrain(
      g,
      region.id,
      region.center[0],
      region.center[1],
      region.radiusX,
      region.radiusY,
    );

    scene.add
      .text(
        region.center[0],
        region.center[1] -
          region.radiusY * 0.72,
        `${region.id} · ${region.name}`,
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#fff4d0',
          backgroundColor:
            '#28302ecc',
          padding: {
            x: 10,
            y: 5,
          },
        },
      )
      .setOrigin(0.5)
      .setDepth(-850);
  }

  const border =
    scene.add.graphics();
  border.setDepth(-900);
  border.lineStyle(
    18,
    0x202827,
    0.8,
  );
  border.strokeRect(
    8,
    8,
    WORLD_WIDTH - 16,
    WORLD_HEIGHT - 16,
  );
}

function drawRegionTerrain(
  g: Phaser.GameObjects.Graphics,
  regionId: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  // Prototype-only terrain language. Final assets belong to Stage 13.
  if (
    regionId === 4 ||
    regionId === 8
  ) {
    g.lineStyle(
      32,
      0xf16a2d,
      0.65,
    );
    g.beginPath();
    g.moveTo(
      x - rx * 0.65,
      y + ry * 0.1,
    );
    g.lineTo(
      x - rx * 0.1,
      y - ry * 0.25,
    );
    g.lineTo(
      x + rx * 0.45,
      y + ry * 0.18,
    );
    g.strokePath();

    g.fillStyle(
      0x4e2c2b,
      0.72,
    );
    g.fillEllipse(
      x + rx * 0.18,
      y - ry * 0.02,
      rx * 0.55,
      ry * 0.42,
    );
    return;
  }

  if (
    regionId === 3 ||
    regionId === 5
  ) {
    g.lineStyle(
      36,
      0x4f5a56,
      0.65,
    );
    for (
      let i = -2;
      i <= 2;
      i += 1
    ) {
      g.lineBetween(
        x - rx * 0.7,
        y + i * ry * 0.22,
        x + rx * 0.65,
        y + i * ry * 0.16,
      );
    }
    return;
  }

  if (
    regionId === 6
  ) {
    g.lineStyle(
      54,
      0x5d8794,
      0.5,
    );
    g.beginPath();
    g.moveTo(
      x - rx * 0.7,
      y - ry * 0.55,
    );
    g.lineTo(
      x - rx * 0.1,
      y,
    );
    g.lineTo(
      x + rx * 0.6,
      y + ry * 0.55,
    );
    g.strokePath();
    return;
  }

  if (
    regionId === 7
  ) {
    g.lineStyle(
      30,
      0x75472f,
      0.48,
    );
    g.strokeEllipse(
      x,
      y,
      rx * 1.35,
      ry * 0.95,
    );
    return;
  }

  g.fillStyle(
    0xffffff,
    0.05,
  );
  for (
    let i = 0;
    i < 9;
    i += 1
  ) {
    const angle =
      i / 9 *
      Math.PI * 2;
    g.fillEllipse(
      x +
        Math.cos(angle) *
          rx * 0.55,
      y +
        Math.sin(angle) *
          ry * 0.48,
      160,
      90,
    );
  }
}

function drawSettlement(
  scene: Phaser.Scene,
): void {
  const g =
    scene.add.graphics();
  g.setDepth(-30);

  g.fillStyle(
    0x86d66a,
    0.94,
  );
  g.fillEllipse(
    SETTLEMENT_CENTER.x,
    SETTLEMENT_CENTER.y,
    640,
    520,
  );

  g.fillStyle(
    0xd9bd78,
    0.36,
  );
  g.fillEllipse(
    SETTLEMENT_CENTER.x,
    SETTLEMENT_CENTER.y + 15,
    390,
    245,
  );

  g.fillStyle(
    0x5d3d25,
    1,
  );
  g.fillRoundedRect(
    RETURN_POINT.x - 34,
    RETURN_POINT.y - 24,
    68,
    48,
    7,
  );
  g.lineStyle(
    4,
    0xe2c264,
    0.9,
  );
  g.strokeCircle(
    RETURN_POINT.x,
    RETURN_POINT.y,
    RETURN_RADIUS,
  );

  scene.add
    .text(
      SETTLEMENT_CENTER.x,
      SETTLEMENT_CENTER.y + 240,
      'Руины поселения',
      {
        fontFamily:
          'system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#315333',
      },
    )
    .setOrigin(0.5)
    .setDepth(
      SETTLEMENT_CENTER.y +
        260,
    );
}

function createPrototypeObstacles(
  scene: Phaser.Scene,
): Phaser.Physics.Arcade.StaticGroup {
  const group =
    scene.physics.add.staticGroup();

  for (
    const region of
    RELEASE_REGIONS
  ) {
    // Interior obstacles make routes imperfect even before final art.
    for (
      let index = 0;
      index < 8;
      index += 1
    ) {
      const angle =
        (
          index * 1.73 +
          region.id * 0.61
        ) %
        (Math.PI * 2);
      const x =
        region.center[0] +
        Math.cos(angle) *
          region.radiusX *
          (
            0.42 +
            (index % 3) * 0.12
          );
      const y =
        region.center[1] +
        Math.sin(angle) *
          region.radiusY *
          (
            0.36 +
            (index % 2) * 0.18
          );

      if (
        Phaser.Math.Distance.Between(
          x,
          y,
          SETTLEMENT_CENTER.x,
          SETTLEMENT_CENTER.y,
        ) <
        SETTLEMENT_SAFE_RADIUS + 180
      ) {
        continue;
      }

      const obstacle =
        scene.add
          .rectangle(
            x,
            y,
            80 + (index % 2) * 45,
            50 + (index % 3) * 18,
            region.id === 4 ||
            region.id === 8
              ? 0x4c3431
              : 0x4c584d,
            0.82,
          )
          .setStrokeStyle(
            3,
            region.accentColor,
            0.55,
          )
          .setDepth(y + 20);

      group.add(obstacle);
    }
  }

  return group;
}
