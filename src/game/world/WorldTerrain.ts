import { RELEASE_REGIONS, RELEASE_PASSAGES, distanceToRegionBoundary, getRegionAt,
  getRegionDefinition, getPassageGeometry, type RegionDefinition, type RegionId } from './ReleaseRegionMap';

export type BorderKind = 'river' | 'mountains' | 'cliff' | 'lava';
export type TerrainSample = { region: RegionDefinition; height: number; kind: BorderKind | 'land' | 'cut'; distance: number };
const borders: Record<string, BorderKind> = {
  '1-2': 'river', '2-3': 'mountains', '2-4': 'mountains', '3-4': 'mountains',
  '3-5': 'cliff', '4-5': 'cliff', '4-6': 'lava', '4-7': 'mountains',
  '1-4': 'lava', '5-6': 'cliff', '6-7': 'river', '1-7': 'cliff', '1-8': 'lava',
};

export const TERRAIN_PASSAGES = RELEASE_PASSAGES.map(passage => ({ passage, ...getPassageGeometry(passage) }));

function terrainNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const smooth = (n: number) => n * n * (3 - 2 * n);
  const hash = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const tx = smooth(fx), ty = smooth(fy);
  const a = hash(ix, iy) * (1-tx) + hash(ix+1, iy) * tx;
  const b = hash(ix, iy+1) * (1-tx) + hash(ix+1, iy+1) * tx;
  return a * (1-ty) + b * ty;
}
export function borderKind(a: RegionId, b: RegionId): BorderKind {
  return borders[`${Math.min(a, b)}-${Math.max(a, b)}`] ?? 'mountains';
}

export function plateauHeight(region: RegionDefinition, x: number, y: number): number {
  const relief = Math.sin(x * 0.004) * 9 + Math.cos(y * 0.0047) * 7 + Math.sin((x + y) * 0.008) * 3;
  const townDistance = Math.hypot(x - RELEASE_REGIONS[0].center[0], y - RELEASE_REGIONS[0].center[1] - 380);
  const flatten = region.id === 1 ? Math.max(0, Math.min(1, (townDistance - 510) / 360)) : 1;
  return region.elevation + relief * flatten;
}

export function passageAt(x: number, y: number, margin = 0) {
  for (const entry of TERRAIN_PASSAGES) {
    const forward = (x - entry.a.x) * entry.ux + (y - entry.a.y) * entry.uy;
    if (forward < 0 || forward > entry.length) continue;
    const lateral = Math.abs((x - entry.a.x) * -entry.uy + (y - entry.a.y) * entry.ux);
    if (lateral <= entry.passage.width / 2 + margin) return { ...entry, t: forward / entry.length, lateral };
  }
  return undefined;
}

export function passageHeight(entry: typeof TERRAIN_PASSAGES[number], t: number): number {
  const a = plateauHeight(getRegionDefinition(entry.passage.a), entry.a.x, entry.a.y);
  const b = plateauHeight(getRegionDefinition(entry.passage.b), entry.b.x, entry.b.y);
  return a + (b - a) * t + 10;
}

export function terrainHeight(x: number, y: number): number {
  const crossing = passageAt(x, y);
  if (crossing) return passageHeight(crossing, crossing.t);
  const region = getRegionAt({ x, y });
  return region ? plateauHeight(region, x, y) : sampleBoundaryTerrain(x, y).height;
}

// A continuous mountain/valley floor supports the region plateaus. Only two
// authored borders are rivers; no global water plane or empty island void.
export function sampleBoundaryTerrain(x: number, y: number): TerrainSample {
  const inside = getRegionAt({ x, y });
  if (inside) return { region: inside, height: inside.elevation - 140, kind: 'land', distance: 0 };
  const closest = RELEASE_REGIONS.map(region => ({ region, distance: distanceToRegionBoundary(region, x, y) }))
    .sort((a, b) => a.distance - b.distance);
  const [first, second] = closest;
  const ridge = terrainNoise(x / 680, y / 680) * 350
    + terrainNoise(x / 260 + 31, y / 260 + 47) * 110;
  const nearbyPair = second.distance < Math.max(1050, first.distance * 1.8 + 300);
  const kind = nearbyPair ? borderKind(first.region.id, second.region.id) : 'mountains';
  const lower = Math.min(first.region.elevation, second.region.elevation);
  const crossing = passageAt(x, y, 50);
  if (crossing && kind !== 'river' && kind !== 'lava') return { region: first.region, height: passageHeight(crossing, crossing.t) - 28, kind: 'cut', distance: first.distance };
  let height: number;
  if (kind === 'river' || kind === 'lava') height = lower - 115;
  else if (kind === 'cliff') height = lower - 25 + Math.sin(x * 0.009) * 6;
  else height = first.region.elevation - 65 + Math.min(1, first.distance / 260) * (170 + ridge);
  return { region: first.region, height, kind, distance: first.distance };
}
