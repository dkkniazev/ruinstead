import { RELEASE_PASSAGES, getPassageGeometry, type RegionDefinition, type WorldPoint } from './ReleaseRegionMap';

const cache = new Map<number, WorldPoint[][]>();

/** The same authored curves are used by dirt paths and brook crossings. */
export function regionRoadLines(region: RegionDefinition): WorldPoint[][] {
  let paths = cache.get(region.id);
  if (paths) return paths;
  const start = { x: region.center[0], y: region.center[1] + (region.id === 1 ? 380 : 0) };
  paths = RELEASE_PASSAGES.filter(p => p.a === region.id || p.b === region.id).map((passage, index) => {
    const ends = getPassageGeometry(passage), end = passage.a === region.id ? ends.a : ends.b;
    const dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx,dy);
    const nx = -dy / length, ny = dx / length, bend = (index % 2 ? 1 : -1) * Math.min(190,length*.13);
    const a = { x: start.x + dx*.32 + nx*bend, y: start.y + dy*.32 + ny*bend };
    const b = { x: start.x + dx*.7 - nx*bend*.5, y: start.y + dy*.7 - ny*bend*.5 };
    const steps = Math.max(8, Math.ceil(length / 35));
    return Array.from({length:steps+1},(_,i) => {
      const t = i/steps, u = 1-t;
      return { x: u*u*u*start.x+3*u*u*t*a.x+3*u*t*t*b.x+t*t*t*end.x,
        y: u*u*u*start.y+3*u*u*t*a.y+3*u*t*t*b.y+t*t*t*end.y };
    });
  });
  cache.set(region.id,paths); return paths;
}
