import Phaser from 'phaser';
import {
  RELEASE_PASSAGES,
  RELEASE_REGIONS,
  RELEASE_WORLD_HEIGHT,
  RELEASE_WORLD_WIDTH,
  getRegionAt,
  getRegionDefinition,

  type RegionDefinition,
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
    // Match the walkable, irregular shoreline used by the 3D renderer.
    g.fillStyle(
      region.groundColor,
      1,
    );
    traceRegionContour(g, region);
    g.fillPath();

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
    drawRegionalDetail(g, region.id, region.center[0], region.center[1], region.radiusX, region.radiusY);

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

  const terrainTextures: Record<number, string> = {
    1: 'ruinstead-forest-ground',
    2: 'ruinstead-ash-ground',
    3: 'ruinstead-ash-ground',
    4: 'ruinstead-volcanic-ground',
    5: 'ruinstead-forest-ground',
    6: 'ruinstead-river-ground',
    7: 'ruinstead-canyon-ground',
    8: 'ruinstead-volcanic-ground',
  };

  for (const region of RELEASE_REGIONS) {
    const key = terrainTextures[region.id];
    if (!scene.textures.exists(key)) continue;
    const ground = scene.add.tileSprite(
      region.center[0], region.center[1],
      region.radiusX * 2, region.radiusY * 2, key,
    ).setDepth(-999).setAlpha(0.85);
    ground.setTileScale(0.72);
    if (region.id === 3) ground.setTint(0x9299a5);
    if (region.id === 5) ground.setTint(0xd3d0bb);
    const maskShape = scene.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    traceRegionContour(maskShape, region);
    maskShape.fillPath();
    ground.setMask(maskShape.createGeometryMask());
  }

  const roads = scene.add.graphics().setDepth(-998);
  for (const region of RELEASE_REGIONS) drawRegionRoads(roads, region.id);

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

function traceRegionContour(graphics: Phaser.GameObjects.Graphics, region: RegionDefinition): void {
  graphics.beginPath();
  region.outline.forEach(([x, y], index) => {
    if (index === 0) graphics.moveTo(x, y); else graphics.lineTo(x, y);
  });
  graphics.closePath();
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Low contrast terrain marks supply texture without obscuring combat indicators. */
function drawRegionalDetail(
  g: Phaser.GameObjects.Graphics,
  regionId: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  const random = seededRandom(regionId * 91283);
  const warm = regionId === 2 || regionId === 4 || regionId >= 7;
  const colors = warm
    ? [0xefd398, 0x513d36, 0xf6b969]
    : regionId === 6
      ? [0x9eb8ab, 0x355f69, 0xcad7c5]
      : [0xc4dda6, 0x345c49, 0xe8dfb1];

  for (let i = 0; i < 155; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 0.91;
    const px = x + Math.cos(angle) * rx * radius;
    const py = y + Math.sin(angle) * ry * radius;
    const size = 26 + random() * 94;
    const color = colors[i % colors.length];
    g.fillStyle(color, 0.09 + random() * 0.12);
    g.fillEllipse(px, py, size * 2.1, size * 0.9);

    if (i % 4 === 0) {
      g.lineStyle(3 + random() * 4, color, 0.3);
      g.lineBetween(px - size * 0.3, py + size * 0.1, px + size * 0.4, py - size * 0.08);
    }
  }

  // Regional landmarks, read at a glance even while the camera is moving.
  if (regionId === 6) {
    g.lineStyle(150, 0x334f5b, 0.75);
    g.beginPath();
    g.moveTo(x - rx * 0.78, y - ry * 0.58);
    g.lineTo(x - rx * 0.25, y - ry * 0.14);
    g.lineTo(x + rx * 0.1, y + ry * 0.1);
    g.lineTo(x + rx * 0.74, y + ry * 0.62);
    g.strokePath();
    g.lineStyle(105, 0x7199a3, 0.92);
    g.strokePath();
    g.lineStyle(18, 0xb1d7d1, 0.55);
    g.strokePath();
  } else if (regionId === 4 || regionId === 8) {
    for (let i = 0; i < 3; i += 1) {
      const ox = x + (i - 1) * rx * 0.32;
      const oy = y + ((i % 2) - 0.5) * ry * 0.4;
      g.fillStyle(0x251f28, 0.72);
      g.fillEllipse(ox, oy, 350, 180);
      g.lineStyle(12, 0xed7640, 0.77);
      g.strokeEllipse(ox, oy, 320, 160);
    }
  } else if (regionId === 7) {
    for (let i = 0; i < 4; i += 1) {
      g.lineStyle(35, 0x6e402f, 0.35);
      g.strokeEllipse(x + (i - 2) * 310, y + i * 170, 760 + i * 160, 350 + i * 80);
    }
  } else if (regionId === 3 || regionId === 5) {
    for (let i = 0; i < 10; i += 1) {
      const px = x + (random() - 0.5) * rx * 1.55;
      const py = y + (random() - 0.5) * ry * 1.48;
      g.fillStyle(regionId === 5 ? 0xebe7d0 : 0x293e48, 0.32);
      g.fillTriangle(px, py - 120, px - 170, py + 100, px + 170, py + 100);
    }
  }
}

function drawRegionRoads(g: Phaser.GameObjects.Graphics, id: number): void {
  const region = getRegionDefinition(id as typeof RELEASE_REGIONS[number]['id']);
  for (const passage of RELEASE_PASSAGES) {
    if (passage.a !== id && passage.b !== id) continue;
    const other = getRegionDefinition(passage.a === id ? passage.b : passage.a);
    const angle = Math.atan2(other.center[1] - region.center[1], other.center[0] - region.center[0]);
    const endX = region.center[0] + Math.cos(angle) * region.radiusX * 0.91;
    const endY = region.center[1] + Math.sin(angle) * region.radiusY * 0.91;
    const bendX = (region.center[0] + endX) / 2 + Math.sin(angle) * 145;
    const bendY = (region.center[1] + endY) / 2 - Math.cos(angle) * 145;
    g.lineStyle(48, 0x3d312b, 0.14);
    g.beginPath();
    g.moveTo(region.center[0], region.center[1]);
    g.lineTo(bendX, bendY);
    g.lineTo(endX, endY);
    g.strokePath();
    g.lineStyle(26, id === 4 || id === 8 ? 0x9c735b : 0xcdb489, 0.24);
    g.strokePath();
    const random = seededRandom(id * 4129 + other.id * 13);
    const segments: ReadonlyArray<readonly [number, number, number, number]> = [
      [region.center[0], region.center[1], bendX, bendY],
      [bendX, bendY, endX, endY],
    ];
    for (const [sx, sy, ex, ey] of segments) {
      for (let index = 0; index < 32; index += 1) {
        const t = (index + random() * 0.7) / 32;
        const side = (random() - 0.5) * 72;
        const px = sx + (ex - sx) * t + Math.sin(angle) * side;
        const py = sy + (ey - sy) * t - Math.cos(angle) * side;
        g.fillStyle(random() < 0.5 ? 0xdfc69a : 0x817e67, 0.14 + random() * 0.17);
        g.fillEllipse(px, py, 6 + random() * 14, 3 + random() * 6);
      }
    }
  }
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
    0.12,
  );
  g.fillEllipse(
    SETTLEMENT_CENTER.x,
    SETTLEMENT_CENTER.y,
    640,
    520,
  );

  g.fillStyle(
    0xd9bd78,
    0.16,
  );
  g.fillEllipse(
    SETTLEMENT_CENTER.x,
    SETTLEMENT_CENTER.y + 15,
    390,
    245,
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
  drawPaintedProp(scene, 'ruinstead-return-shrine', RETURN_POINT.x, RETURN_POINT.y + 14, 152, 152, false);

  // Keep only landmarks here; harvestable trees and rocks come from ResourceSystem.
  drawPaintedProp(scene, 'ruinstead-ruined-arch', SETTLEMENT_CENTER.x + 245, SETTLEMENT_CENTER.y - 42, 188, 202, false);

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

function createPrototypeObstacles(scene: Phaser.Scene): Phaser.Physics.Arcade.StaticGroup {
  // Solid terrain props are now the actual harvestable nodes in ResourceSystem.
  return scene.physics.add.staticGroup();
}

function drawPaintedProp(
  scene: Phaser.Scene,
  texture: string,
  x: number,
  y: number,
  width: number,
  height: number,
  flipX: boolean,
): void {
  scene.add.ellipse(x + 12, y + 2, width * 0.7, height * 0.19, 0x112620, 0.32)
    .setDepth(y - 2);
  scene.add.image(x, y - height * 0.37, texture)
    .setDisplaySize(width, height)
    .setFlipX(flipX)
    .setDepth(y + 1);
}
