import { getRegionDefinition, type RegionId } from './ReleaseRegionMap';
import { regionRoadLines } from './RegionPaths';

export type WatercoursePoint = { x: number; y: number; width: number; level: number };
export type Watercourse = {
  id: string;
  region: RegionId;
  points: readonly WatercoursePoint[];
  bounds: { left: number; right: number; top: number; bottom: number };
};
export type WatercourseSample = {
  course: Watercourse;
  distance: number;
  width: number;
  level: number;
  x: number;
  y: number;
  ux: number;
  uy: number;
};
export type BrookBridge = { id: string; region: RegionId; x: number; y: number; ux: number; uy: number; length: number; width: number; level: number };

function course(id: string, region: RegionId, controls: readonly (readonly [number, number, number, number])[]): Watercourse {
  const origin = getRegionDefinition(region);
  const points: WatercoursePoint[] = [];
  const catmull = (a: number, b: number, c: number, d: number, t: number) =>
    .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  for (let segment = 0; segment < controls.length - 1; segment++) {
    const a = controls[Math.max(0, segment - 1)], b = controls[segment];
    const c = controls[segment + 1], d = controls[Math.min(controls.length - 1, segment + 2)];
    const steps = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 55);
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      points.push({ x: origin.center[0] + catmull(a[0], b[0], c[0], d[0], t),
        y: origin.center[1] + catmull(a[1], b[1], c[1], d[1], t),
        width: b[2] + (c[2] - b[2]) * t, level: origin.elevation + b[3] + (c[3] - b[3]) * t });
    }
  }
  const end = controls[controls.length - 1];
  points.push({ x: origin.center[0] + end[0], y: origin.center[1] + end[1], width: end[2], level: origin.elevation + end[3] });
  const margin = 260;
  return { id, region, points, bounds: {
    left: Math.min(...points.map(p => p.x)) - margin, right: Math.max(...points.map(p => p.x)) + margin,
    top: Math.min(...points.map(p => p.y)) - margin, bottom: Math.max(...points.map(p => p.y)) + margin,
  } };
}

/** Shallow, continuous brooks join the existing pond sites. No new region gates. */
export const WORLD_WATERCOURSES: readonly Watercourse[] = [
  course('forest-brook', 1, [
    [-1795,1395,64,69],[-1510,1400,51,66],[-1130,1370,55,58],[-760,1240,49,40],
    [-380,1080,53,26],[-50,1140,60,14],[240,1030,52,4],[520,1060,54,-6],
    [790,960,48,-14],[1100,920,55,-23],[1310,810,68,-28],
  ]),
  course('mineral-brook', 6, [
    [1213,1090,81,37],[840,880,58,34],[520,940,64,31],[170,870,56,28],
    [-80,1010,62,25],[-410,940,57,22],[-760,1090,61,19],[-1080,1300,58,15],[-1445,1420,72,12],
  ]),
];

/** Crossings come from intersections with the actual road, never guessed offsets. */
export const BROOK_BRIDGES: readonly BrookBridge[] = WORLD_WATERCOURSES.flatMap(course => {
  const result: BrookBridge[] = [];
  for (const road of regionRoadLines(getRegionDefinition(course.region))) {
    for (let i=1;i<road.length;i++) for (let j=1;j<course.points.length;j++) {
      const a=road[i-1],b=road[i],c=course.points[j-1],d=course.points[j];
      const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,denominator=rx*sy-ry*sx;
      if(Math.abs(denominator)<1e-6)continue;
      const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/denominator;
      const u=((c.x-a.x)*ry-(c.y-a.y)*rx)/denominator;
      if(t<0||t>1||u<0||u>1)continue;
      const x=a.x+rx*t,y=a.y+ry*t;
      if(result.some(p=>Math.hypot(x-p.x,y-p.y)<200))continue;
      const roadLength=Math.hypot(rx,ry),angle=Math.abs(denominator)/(roadLength*Math.hypot(sx,sy));
      if(angle<.5)continue;
      const width=c.width+(d.width-c.width)*u;
      result.push({id:course.id+'-bridge-'+result.length,region:course.region,x,y,ux:rx/roadLength,uy:ry/roadLength,
        length:(width*2+180)/angle,width:144,level:c.level+(d.level-c.level)*u});
    }
  }
  return result;
});

export function brookBridgeAt(x: number, y: number) {
  for (const bridge of BROOK_BRIDGES) {
    const forward=(x-bridge.x)*bridge.ux+(y-bridge.y)*bridge.uy;
    const lateral=(x-bridge.x)*-bridge.uy+(y-bridge.y)*bridge.ux;
    if(Math.abs(forward)<=bridge.length*.5&&Math.abs(lateral)<=bridge.width*.5)
      return {bridge,t:forward/bridge.length+.5,lateral};
  }
  return undefined;
}

export function sampleWatercourse(region: number, x: number, y: number): WatercourseSample | undefined {
  let nearest: WatercourseSample | undefined;
  for (const course of WORLD_WATERCOURSES) {
    const bounds = course.bounds;
    if (course.region !== region || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) continue;
    for (let i = 1; i < course.points.length; i++) {
      const a = course.points[i - 1], b = course.points[i];
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (length * length)));
      const px = a.x + dx * t, py = a.y + dy * t, distance = Math.hypot(x - px, y - py);
      if (nearest && distance >= nearest.distance) continue;
      nearest = { course, distance, width: a.width + (b.width - a.width) * t,
        level: a.level + (b.level - a.level) * t, x: px, y: py, ux: dx / length, uy: dy / length };
    }
  }
  return nearest;
}

export function watercourseAreaIsClear(x: number, y: number, clearance = 0): boolean {
  for (const course of WORLD_WATERCOURSES) {
    const sample = sampleWatercourse(course.region, x, y);
    if (sample && sample.distance < sample.width + clearance + 26) return false;
  }
  return true;
}
