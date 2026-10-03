import type { NavigationObstacle } from './ObstacleNavigation';

/** Ground dimensions and locations shared by buildings, physics and placement.
 * Roof overhangs/empty awnings are not solid footprints. Coordinates are local
 * to SETTLEMENT_CENTER; Y is the world's ground axis, not rendered altitude. */
export const SETTLEMENT_BUILDINGS = {
  storage: { x: -210, y: 210, width: 142, depth: 140, rotation: 0 },
  sawmill: { x: -430, y: -40, width: 142, depth: 115, rotation: 0 },
  workshop: { x: 430, y: 170, width: 160, depth: 140, rotation: -.24 },
  house: { x: -190, y: -360, width: 142, depth: 140, rotation: .2 },
} as const;
export const SETTLEMENT_FORGE = { x: 240, y: -80, width: 110, depth: 75 };
export const SETTLEMENT_WELL = { x: 105, y: 42, radius: 54 };

type Point = { x: number; y: number };
export function settlementSolidFootprints(center: Point): NavigationObstacle[] {
  const shapes: NavigationObstacle[] = Object.values(SETTLEMENT_BUILDINGS).map(site => {
    const c = Math.abs(Math.cos(site.rotation)), s = Math.abs(Math.sin(site.rotation));
    return { x: center.x + site.x, y: center.y + site.y,
      halfWidth: (site.width + 10) * c / 2 + (site.depth + 10) * s / 2,
      halfHeight: (site.depth + 10) * c / 2 + (site.width + 10) * s / 2, circle: false };
  });
  shapes.push(
    { x: center.x + SETTLEMENT_FORGE.x, y: center.y + SETTLEMENT_FORGE.y,
      halfWidth: 55, halfHeight: 43, circle: false },
    { x: center.x + SETTLEMENT_WELL.x, y: center.y + SETTLEMENT_WELL.y,
      halfWidth: SETTLEMENT_WELL.radius, halfHeight: SETTLEMENT_WELL.radius, circle: true },
  );
  return shapes;
}

export function settlementAreaIsClear(center: Point, point: Point, radius = 0): boolean {
  return settlementSolidFootprints(center).every(o => {
    if (o.circle) return Math.hypot(point.x - o.x, point.y - o.y) >= o.halfWidth + radius;
    const dx = Math.max(0, Math.abs(point.x - o.x) - o.halfWidth);
    const dy = Math.max(0, Math.abs(point.y - o.y) - o.halfHeight);
    return dx * dx + dy * dy >= radius * radius && (dx > 0 || dy > 0);
  });
}

/** Old saves may predate solid buildings. Keep their nearest clear location,
 * rather than trap the player inside masonry or discard their exploration. */
export function clearSettlementPosition(center: Point, point: Point, radius = 18): Point {
  if (settlementAreaIsClear(center, point, radius)) return point;
  for (let distance = 24; distance <= 360; distance += 12) {
    for (let step = 0; step < 32; step++) {
      const angle = step / 32 * Math.PI * 2;
      const candidate = { x: point.x + Math.sin(angle) * distance, y: point.y + Math.cos(angle) * distance };
      if (settlementAreaIsClear(center, candidate, radius + 2)) return candidate;
    }
  }
  return { x: center.x, y: center.y + 190 };
}
