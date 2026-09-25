import Phaser from 'phaser';

export type RegionId =
  | 1 | 2 | 3 | 4
  | 5 | 6 | 7 | 8;

export type RegionDefinition = {
  id: RegionId;
  stageId: string;
  name: string;
  center: readonly [number, number];
  radiusX: number;
  radiusY: number;
  groundColor: number;
  accentColor: number;
  danger: number;
};

export type RegionPassage = {
  id: string;
  a: RegionId;
  b: RegionId;
  width: number;
  kind:
    | 'road'
    | 'bridge'
    | 'mountain-pass'
    | 'ravine'
    | 'lava-gate';
};

export const RELEASE_WORLD_WIDTH = 32000;
export const RELEASE_WORLD_HEIGHT = 34500;

export const RELEASE_REGIONS:
  readonly RegionDefinition[] = [
  { id: 1, stageId: 'stage-1', name: 'Заросший лес', center: [15500, 21500], radiusX: 3800, radiusY: 3400, groundColor: 0x69bd52, accentColor: 0x3f8f43, danger: 1 },
  { id: 2, stageId: 'stage-2', name: 'Пепельные нагорья', center: [5000, 13000], radiusX: 3500, radiusY: 3400, groundColor: 0xc8a86a, accentColor: 0x9c7549, danger: 2 },
  { id: 3, stageId: 'stage-3', name: 'Теневой перевал', center: [7000, 5000], radiusX: 3200, radiusY: 3300, groundColor: 0x68726c, accentColor: 0x3f4d4b, danger: 3 },
  { id: 4, stageId: 'stage-4', name: 'Магмовое сердце', center: [16000, 12000], radiusX: 3500, radiusY: 3200, groundColor: 0x87513c, accentColor: 0xe06b35, danger: 5 },
  { id: 5, stageId: 'stage-5', name: 'Ветреные высоты', center: [16000, 4500], radiusX: 3700, radiusY: 3200, groundColor: 0x9faf85, accentColor: 0xd5d0a4, danger: 4 },
  { id: 6, stageId: 'stage-6', name: 'Пепельные русла', center: [26000, 7000], radiusX: 3400, radiusY: 3500, groundColor: 0x8e715b, accentColor: 0x5f7c84, danger: 5 },
  { id: 7, stageId: 'stage-7', name: 'Сухой каньон', center: [26000, 16000], radiusX: 3700, radiusY: 3300, groundColor: 0xb77b4e, accentColor: 0x7c4d35, danger: 6 },
  { id: 8, stageId: 'stage-8', name: 'Драконья кальдера', center: [15500, 29000], radiusX: 3500, radiusY: 3200, groundColor: 0x6d3b37, accentColor: 0xff6c32, danger: 8 },
] as const;

export const RELEASE_PASSAGES:
  readonly RegionPassage[] = [
  { id: '1-2', a: 1, b: 2, width: 230, kind: 'bridge' },
  { id: '2-3', a: 2, b: 3, width: 210, kind: 'mountain-pass' },
  { id: '3-4', a: 3, b: 4, width: 220, kind: 'ravine' },
  { id: '3-5', a: 3, b: 5, width: 200, kind: 'mountain-pass' },
  { id: '4-5', a: 4, b: 5, width: 210, kind: 'mountain-pass' },
  { id: '4-6', a: 4, b: 6, width: 220, kind: 'road' },
  { id: '4-7', a: 4, b: 7, width: 210, kind: 'ravine' },
  { id: '1-4', a: 1, b: 4, width: 240, kind: 'lava-gate' },
  { id: '5-6', a: 5, b: 6, width: 220, kind: 'mountain-pass' },
  { id: '6-7', a: 6, b: 7, width: 220, kind: 'ravine' },
  { id: '1-7', a: 1, b: 7, width: 235, kind: 'road' },
  { id: '1-8', a: 1, b: 8, width: 250, kind: 'lava-gate' },
] as const;

export function getRegionDefinition(
  id: RegionId,
): RegionDefinition {
  return RELEASE_REGIONS.find(
    (region) => region.id === id,
  ) ?? RELEASE_REGIONS[0];
}

export function getRegionAt(
  position: Phaser.Math.Vector2,
): RegionDefinition | undefined {
  return RELEASE_REGIONS
    .map((region) => {
      const dx =
        (position.x - region.center[0]) /
        region.radiusX;
      const dy =
        (position.y - region.center[1]) /
        region.radiusY;
      return {
        region,
        distance: dx * dx + dy * dy,
      };
    })
    .filter(
      (entry) =>
        entry.distance <= 1.16,
    )
    .sort(
      (a, b) =>
        a.distance - b.distance,
    )[0]?.region;
}

export function stageIdForRegion(
  region: RegionId,
): string {
  return `stage-${region}`;
}

export function regionIsUnlocked(
  unlockedZones: readonly string[],
  region: RegionId,
): boolean {
  return (
    region === 1 ||
    unlockedZones.includes(
      stageIdForRegion(region),
    )
  );
}

export function getPassageMidpoint(
  passage: RegionPassage,
): Phaser.Math.Vector2 {
  const a =
    getRegionDefinition(
      passage.a,
    );
  const b =
    getRegionDefinition(
      passage.b,
    );

  const dx =
    b.center[0] - a.center[0];
  const dy =
    b.center[1] - a.center[1];
  const distance =
    Math.max(
      1,
      Math.hypot(dx, dy),
    );

  const ax =
    a.center[0] +
    dx / distance *
      Math.min(
        a.radiusX * 0.86,
        a.radiusY * 0.9,
      );
  const ay =
    a.center[1] +
    dy / distance *
      Math.min(
        a.radiusX * 0.86,
        a.radiusY * 0.9,
      );
  const bx =
    b.center[0] -
    dx / distance *
      Math.min(
        b.radiusX * 0.86,
        b.radiusY * 0.9,
      );
  const by =
    b.center[1] -
    dy / distance *
      Math.min(
        b.radiusX * 0.86,
        b.radiusY * 0.9,
      );

  return new Phaser.Math.Vector2(
    (ax + bx) / 2,
    (ay + by) / 2,
  );
}
