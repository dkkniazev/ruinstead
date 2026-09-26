export type RegionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type WorldPoint = { x: number; y: number };
export type RegionDefinition = {
  id: RegionId;
  stageId: string;
  name: string;
  center: readonly [number, number];
  radiusX: number;
  radiusY: number;
  outline: ReadonlyArray<readonly [number, number]>;
  elevation: number;
  groundColor: number;
  accentColor: number;
  danger: number;
};
export type RegionPassage = {
  id: string;
  a: RegionId;
  b: RegionId;
  width: number;
  kind: 'road' | 'bridge' | 'mountain-pass' | 'ravine' | 'lava-gate';
};

const MAP_SCALE = 20;
export const RELEASE_WORLD_WIDTH = 14500;
export const RELEASE_WORLD_HEIGHT = 16600;

// These are authored silhouettes traced from the supplied map, not radial noise.
function region(id: RegionId, name: string, center: readonly [number, number], elevation: number,
  groundColor: number, accentColor: number, danger: number,
  points: ReadonlyArray<readonly [number, number]>): RegionDefinition {
  const outline = points.map(([x, y]) => [x * MAP_SCALE, y * MAP_SCALE] as const);
  const origin = [center[0] * MAP_SCALE, center[1] * MAP_SCALE] as const;
  return { id, stageId: `stage-${id}`, name, center: origin, outline, elevation,
    radiusX: Math.max(...outline.map(([x]) => Math.abs(x - origin[0]))),
    radiusY: Math.max(...outline.map(([, y]) => Math.abs(y - origin[1]))),
    groundColor, accentColor, danger };
}

export const RELEASE_REGIONS: readonly RegionDefinition[] = [
  region(1, 'Заросший лес', [314, 503], 40, 0x69bd52, 0x3f8f43, 1, [
    [245,407],[292,403],[337,405],[367,407],[396,428],[413,460],[430,497],[444,537],
    [445,565],[430,589],[411,596],[221,598],[191,586],[183,570],[184,551],[193,534],
    [219,515],[225,485],[235,448],
  ]),
  region(2, 'Пепельные нагорья', [151,414], 130, 0xc8a86a, 0x9c7549, 2, [
    [120,559],[89,545],[52,521],[50,493],[64,466],[83,432],[86,392],[83,362],
    [96,330],[124,291],[145,255],[163,255],[177,264],[185,298],[191,329],[207,350],
    [235,373],[242,387],[229,413],[220,451],[211,486],[193,516],[165,526],[143,547],[131,562],
  ]),
  region(3, 'Теневой перевал', [232,202], 360, 0x68726c, 0x3f4d4b, 3, [
    [248,336],[232,326],[221,306],[216,275],[198,251],[177,228],[165,208],[162,186],
    [170,159],[185,132],[198,105],[204,93],[222,89],[247,90],[276,101],[288,119],
    [294,153],[292,177],[275,209],[268,236],[274,267],[278,296],[271,319],[260,333],
  ]),
  region(4, 'Магмовое сердце', [340,348], 210, 0x87513c, 0xe06b35, 5, [
    [275,348],[283,325],[299,309],[299,295],[329,297],[365,305],[390,306],[408,324],
    [415,342],[412,365],[399,380],[371,389],[338,394],[306,392],[285,389],[273,378],[270,364],
  ]),
  region(5, 'Ветреные высоты', [405,199], 660, 0x9faf85, 0xd5d0a4, 4, [
    [296,263],[300,223],[311,190],[329,164],[352,155],[369,132],[383,109],[387,92],
    [410,72],[429,77],[447,81],[465,94],[478,119],[485,146],[495,174],[494,213],
    [489,256],[473,272],[450,280],[417,281],[379,280],[346,278],[318,272],
  ]),
  region(6, 'Пепельные русла', [583,275], 350, 0x8e715b, 0x5f7c84, 5, [
    [454,353],[451,335],[438,307],[467,307],[489,294],[506,278],[532,258],[552,235],
    [574,206],[585,177],[591,150],[607,135],[636,135],[649,143],[653,159],[653,227],
    [662,257],[673,281],[671,318],[659,345],[642,367],[604,371],[559,369],[520,373],[490,363],
  ]),
  region(7, 'Сухой каньон', [550,492], 90, 0xb77b4e, 0x7c4d35, 6, [
    [483,589],[475,558],[463,528],[446,491],[431,463],[417,434],[408,415],[412,393],
    [435,386],[478,380],[518,385],[554,398],[603,402],[638,410],[667,420],[678,446],
    [683,482],[675,508],[660,526],[634,541],[612,553],[594,578],[580,599],[552,607],
    [520,604],[491,595],
  ]),
  region(8, 'Драконья кальдера', [314,705], 250, 0x6d3b37, 0xff6c32, 8, [
    [310,614],[332,622],[353,629],[378,643],[400,659],[414,684],[419,704],[413,731],
    [399,754],[380,773],[352,790],[322,791],[291,783],[263,774],[241,766],[226,750],
    [215,735],[213,709],[221,681],[233,653],[254,633],[281,619],
  ]),
];

export const RELEASE_PASSAGES: readonly RegionPassage[] = [
  { id: '1-2', a: 1, b: 2, width: 230, kind: 'bridge' },
  { id: '2-3', a: 2, b: 3, width: 230, kind: 'mountain-pass' },
  { id: '3-4', a: 3, b: 4, width: 220, kind: 'ravine' },
  { id: '3-5', a: 3, b: 5, width: 220, kind: 'mountain-pass' },
  { id: '4-5', a: 4, b: 5, width: 230, kind: 'mountain-pass' },
  { id: '4-6', a: 4, b: 6, width: 220, kind: 'road' },
  { id: '4-7', a: 4, b: 7, width: 230, kind: 'ravine' },
  { id: '1-4', a: 1, b: 4, width: 240, kind: 'lava-gate' },
  { id: '5-6', a: 5, b: 6, width: 220, kind: 'mountain-pass' },
  { id: '6-7', a: 6, b: 7, width: 220, kind: 'bridge' },
  { id: '1-7', a: 1, b: 7, width: 235, kind: 'road' },
  { id: '1-8', a: 1, b: 8, width: 250, kind: 'lava-gate' },
];

export function getRegionDefinition(id: RegionId): RegionDefinition {
  return RELEASE_REGIONS[id - 1] ?? RELEASE_REGIONS[0];
}

export function pointInRegion(region: RegionDefinition, x: number, y: number): boolean {
  let inside = false;
  const points = region.outline;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i]; const [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

export function distanceToRegionBoundary(region: RegionDefinition, x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < region.outline.length; i++) {
    const a = region.outline[i], b = region.outline[(i + 1) % region.outline.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, (x - a[0] - dx * t) ** 2 + (y - a[1] - dy * t) ** 2);
  }
  return Math.sqrt(best);
}

export function regionRadiusAlong(region: RegionDefinition, ux: number, uy: number): number {
  let distance = Infinity;
  for (let i = 0; i < region.outline.length; i++) {
    const a = region.outline[i], b = region.outline[(i + 1) % region.outline.length];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const px = a[0] - region.center[0], py = a[1] - region.center[1];
    const cross = ux * ey - uy * ex;
    if (Math.abs(cross) < 0.00001) continue;
    const t = (px * ey - py * ex) / cross;
    const s = (px * uy - py * ux) / cross;
    if (t > 0 && s >= 0 && s <= 1) distance = Math.min(distance, t);
  }
  return Number.isFinite(distance) ? distance : Math.min(region.radiusX, region.radiusY);
}

export function regionNormalizedDistance(region: RegionDefinition, x: number, y: number): number {
  const dx = x - region.center[0], dy = y - region.center[1];
  const length = Math.hypot(dx, dy);
  return length < 0.001 ? 0 : length / regionRadiusAlong(region, dx / length, dy / length);
}

export function regionPointAt(region: RegionDefinition, nx: number, ny: number): WorldPoint {
  const dx = nx * region.radiusX, dy = ny * region.radiusY;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return { x: region.center[0], y: region.center[1] };
  const radius = regionRadiusAlong(region, dx / length, dy / length) * Math.min(0.92, Math.hypot(nx, ny));
  return { x: region.center[0] + dx / length * radius, y: region.center[1] + dy / length * radius };
}

export function getRegionAt(position: WorldPoint): RegionDefinition | undefined {
  return RELEASE_REGIONS.find((region) => pointInRegion(region, position.x, position.y));
}

export function getPassageGeometry(passage: RegionPassage, inset = 160): { a: WorldPoint; b: WorldPoint; length: number; ux: number; uy: number } {
  const a = getRegionDefinition(passage.a), b = getRegionDefinition(passage.b);
  const dx = b.center[0] - a.center[0], dy = b.center[1] - a.center[1];
  const length = Math.hypot(dx, dy), ux = dx / length, uy = dy / length;
  const ar = regionRadiusAlong(a, ux, uy) - inset;
  const br = regionRadiusAlong(b, -ux, -uy) - inset;
  const start = { x: a.center[0] + ux * ar, y: a.center[1] + uy * ar };
  const end = { x: b.center[0] - ux * br, y: b.center[1] - uy * br };
  return { a: start, b: end, length: Math.hypot(end.x - start.x, end.y - start.y), ux, uy };
}

export function getPassageMidpoint(passage: RegionPassage): WorldPoint {
  const { a, b } = getPassageGeometry(passage);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function stageIdForRegion(region: RegionId): string { return `stage-${region}`; }
export function regionIsUnlocked(unlockedZones: readonly string[], region: RegionId): boolean {
  return region === 1 || unlockedZones.includes(stageIdForRegion(region));
}

export function migrateLegacyWorldPosition(x: number, y: number, compactMap = false): WorldPoint {
  const old: ReadonlyArray<readonly [number, number, number, number]> = compactMap ? [
    [4000,5700,1250,1050],[1700,4400,1050,950],[1700,2200,1000,900],[4000,3500,1050,900],
    [4100,1300,1050,900],[6650,2350,1000,900],[6650,4600,1050,950],[4000,8050,1000,900],
  ] : [
    [15500,21500,3800,3400],[5000,13000,3500,3400],[7000,5000,3200,3300],[16000,12000,3500,3200],
    [16000,4500,3700,3200],[26000,7000,3400,3500],[26000,16000,3700,3300],[15500,29000,3500,3200],
  ];
  let nearest = 0, best = Infinity;
  old.forEach(([cx, cy, rx, ry], index) => {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d < best) { best = d; nearest = index; }
  });
  const [cx, cy, rx, ry] = old[nearest];
  if (best > 1.8) return { x: RELEASE_REGIONS[0].center[0], y: RELEASE_REGIONS[0].center[1] + 950 };
  return regionPointAt(RELEASE_REGIONS[nearest], (x - cx) / rx * 0.9, (y - cy) / ry * 0.9);
}
