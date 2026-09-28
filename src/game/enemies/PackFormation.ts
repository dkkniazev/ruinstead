export type PackPoint = { x: number; y: number };
export const MIN_PACK_SIZE = 3;
export const MAX_PACK_SIZE = 8;
export const packSize = (random = Math.random): number => MIN_PACK_SIZE + Math.min(5, Math.floor(random() * 6));
export const packFormationRadius = (count:number,spacing:number):number => spacing*Math.sqrt(count)*.58;

/** Compact, irregular dart sampling. A failed location returns no partial pack. */
export function formPack(center: PackPoint, count: number, spacing: number,
  isClear: (point: PackPoint) => boolean, random = Math.random): PackPoint[] | undefined {
  const points: PackPoint[] = [];
  const radius = packFormationRadius(count,spacing);
  for (let attempt = 0; attempt < 600 && points.length < count; attempt++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius;
    const point = { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance };
    if (isClear(point) && points.every(p => Math.hypot(p.x - point.x, p.y - point.y) >= spacing)) points.push(point);
  }
  return points.length === count ? points : undefined;
}
