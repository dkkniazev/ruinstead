import { RELEASE_REGIONS, RELEASE_PASSAGES, getPassageGeometry, regionIsUnlocked } from './ReleaseRegionMap';

export type Point = { x: number; y: number };
type Polygon = Point[];
type Edge = { a: Point; b: Point; nx: number; ny: number; gate?: boolean };
type EdgeIndex = Map<string, Edge[]>;

const CELL_SIZE = 256;
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const cellKey = (x: number, y: number): string => `${x},${y}`;

export function insidePolygon(p: Point, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside = !inside;
  }
  return inside;
}

function nearest(p: Point, a: Point, b: Point): Point {
  const dx=b.x-a.x,dy=b.y-a.y;
  const lengthSq=dx*dx+dy*dy;
  if(lengthSq<.000001)return {x:a.x,y:a.y};
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/lengthSq));
  return {x:a.x+dx*t,y:a.y+dy*t};
}

function indexEdges(list: readonly Edge[]): EdgeIndex {
  const index:EdgeIndex=new Map();
  for(const edge of list){
    const minX=Math.floor(Math.min(edge.a.x,edge.b.x)/CELL_SIZE);
    const maxX=Math.floor(Math.max(edge.a.x,edge.b.x)/CELL_SIZE);
    const minY=Math.floor(Math.min(edge.a.y,edge.b.y)/CELL_SIZE);
    const maxY=Math.floor(Math.max(edge.a.y,edge.b.y)/CELL_SIZE);
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
      const key=cellKey(x,y),bucket=index.get(key)??[];
      bucket.push(edge);index.set(key,bucket);
    }
  }
  return index;
}

const corridors = RELEASE_PASSAGES.map(passage => ({ passage, ...getPassageGeometry(passage) }));
const polygons: Polygon[] = [
  ...RELEASE_REGIONS.map(r => r.outline.map(([x,y])=>({x,y}))),
  ...corridors.map(p => {
    const nx=-p.uy*p.passage.width/2,ny=p.ux*p.passage.width/2;
    return [{x:p.a.x+nx,y:p.a.y+ny},{x:p.b.x+nx,y:p.b.y+ny},{x:p.b.x-nx,y:p.b.y-ny},{x:p.a.x-nx,y:p.a.y-ny}];
  }),
];
const rawEdges=polygons.flatMap(poly=>poly.map((a,i)=>({a,b:poly[(i+1)%poly.length]})));
const inUnion=(p:Point)=>polygons.some(poly=>insidePolygon(p,poly));

// Split at all intersections before retaining the exterior of the union. The
// shore under a landing and the sides of a corridor on land are NOT walls.
const edges: Edge[]=[];
for(const edge of rawEdges){
  const d=sub(edge.b,edge.a),length=Math.hypot(d.x,d.y),cuts=[0,1];
  if(length<.0001)continue;
  for(const other of rawEdges){
    const e=sub(other.b,other.a),den=cross(d,e);if(Math.abs(den)<.0001)continue;
    const q=sub(other.a,edge.a),t=cross(q,e)/den,u=cross(q,d)/den;
    if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
  }
  cuts.sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
    if(cuts[i]-cuts[i-1]<.00001)continue;
    const a={x:edge.a.x+d.x*cuts[i-1],y:edge.a.y+d.y*cuts[i-1]},b={x:edge.a.x+d.x*cuts[i],y:edge.a.y+d.y*cuts[i]};
    let nx=-d.y/length,ny=d.x/length;
    const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const left=inUnion({x:mid.x+nx*.2,y:mid.y+ny*.2}),right=inUnion({x:mid.x-nx*.2,y:mid.y-ny*.2});
    if(left===right)continue;
    if(right){nx=-nx;ny=-ny;} // inward normal
    edges.push({a,b,nx,ny});
  }
}
const edgeIndex=indexEdges(edges);

export class WalkableWorld {
  private gates: Edge[]=[];
  private gateIndex:EdgeIndex=new Map();

  constructor(zones:readonly string[]){this.sync(zones);}

  sync(zones:readonly string[]):void {
    this.gates=corridors.filter(p=>!regionIsUnlocked(zones,p.passage.a)||!regionIsUnlocked(zones,p.passage.b)).map(p=>{
      const x=(p.a.x+p.b.x)/2,y=(p.a.y+p.b.y)/2,w=p.passage.width/2;
      return {a:{x:x-p.uy*w,y:y+p.ux*w},b:{x:x+p.uy*w,y:y-p.ux*w},nx:p.ux,ny:p.uy,gate:true};
    });
    this.gateIndex=indexEdges(this.gates);
  }

  contains(p:Point,radius=0):boolean {
    if(!inUnion(p))return false;
    for(const e of this.nearbyEdges(p.x,p.y,radius)){
      const q=nearest(p,e.a,e.b);
      if(Math.hypot(p.x-q.x,p.y-q.y)<radius-.05)return false;
    }
    return true;
  }

  /** Continuous circle projection, preserving tangent velocity in both directions. */
  slide(from:Point,to:Point,radius:number,velocity:Point={x:to.x-from.x,y:to.y-from.y}):Point & {vx:number;vy:number} {
    const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/Math.max(8,radius*.5)));
    let x=from.x,y=from.y,vx=velocity.x,vy=velocity.y;
    const dx=(to.x-from.x)/steps,dy=(to.y-from.y)/steps;
    for(let step=0;step<steps;step++){
      const old={x,y};x+=dx;y+=dy;
      for(let iteration=0;iteration<3;iteration++){
        let adjusted=false;
        for(const e of this.nearbyEdges(x,y,radius)){
          if(x<Math.min(e.a.x,e.b.x)-radius||x>Math.max(e.a.x,e.b.x)+radius||y<Math.min(e.a.y,e.b.y)-radius||y>Math.max(e.a.y,e.b.y)+radius)continue;
          const q=nearest({x,y},e.a,e.b),distance=Math.hypot(x-q.x,y-q.y);
          if(distance>=radius)continue;
          let nx=e.nx,ny=e.ny;
          if(e.gate&&((old.x-e.a.x)*nx+(old.y-e.a.y)*ny)<0){nx=-nx;ny=-ny;}
          // At vertices retain a radial normal on the interior side.
          if(distance>.001&&(x-q.x)*nx+(y-q.y)*ny>0){nx=(x-q.x)/distance;ny=(y-q.y)/distance;}
          const signed=(x-q.x)*nx+(y-q.y)*ny;
          x+=nx*(radius-signed+.02);y+=ny*(radius-signed+.02);
          const outward=vx*nx+vy*ny;
          if(outward<0){vx-=nx*outward;vy-=ny*outward;}
          adjusted=true;
        }
        if(!adjusted)break;
      }
    }
    return {x,y,vx,vy};
  }

  private nearbyEdges(x:number,y:number,radius:number):Edge[] {
    const minX=Math.floor((x-radius)/CELL_SIZE),maxX=Math.floor((x+radius)/CELL_SIZE);
    const minY=Math.floor((y-radius)/CELL_SIZE),maxY=Math.floor((y+radius)/CELL_SIZE);
    const found=new Set<Edge>();
    for(let cx=minX;cx<=maxX;cx++)for(let cy=minY;cy<=maxY;cy++){
      const key=cellKey(cx,cy);
      for(const edge of edgeIndex.get(key)??[])found.add(edge);
      for(const edge of this.gateIndex.get(key)??[])found.add(edge);
    }
    return [...found];
  }
}
