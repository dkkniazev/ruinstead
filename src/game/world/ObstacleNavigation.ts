import type { Point, WalkableWorld } from './WalkableWorld';

export type NavigationObstacle = {x:number;y:number;halfWidth:number;halfHeight:number;circle:boolean};
/** Static obstacles are indexed once; AI only requests a route when line of sight is blocked. */
export class ObstacleNavigation {
  private cells=new Map<string,NavigationObstacle[]>();
  constructor(private readonly world:WalkableWorld){}
  setObstacles(obstacles:NavigationObstacle[]):void {
    this.cells.clear();
    for(const o of obstacles)for(let x=Math.floor((o.x-o.halfWidth)/128);x<=Math.floor((o.x+o.halfWidth)/128);x++)
      for(let y=Math.floor((o.y-o.halfHeight)/128);y<=Math.floor((o.y+o.halfHeight)/128);y++){
        const key=`${x},${y}`,bucket=this.cells.get(key)??[];bucket.push(o);this.cells.set(key,bucket);
      }
  }
  clear(p:Point,radius:number):boolean {
    if(!this.world.contains(p,radius))return false;
    for(let x=Math.floor((p.x-radius)/128);x<=Math.floor((p.x+radius)/128);x++)
      for(let y=Math.floor((p.y-radius)/128);y<=Math.floor((p.y+radius)/128);y++)for(const o of this.cells.get(`${x},${y}`)??[]){
        if(o.circle){if(Math.hypot(p.x-o.x,p.y-o.y)<o.halfWidth+radius)return false;}
        else {const dx=Math.max(0,Math.abs(p.x-o.x)-o.halfWidth),dy=Math.max(0,Math.abs(p.y-o.y)-o.halfHeight);if(dx*dx+dy*dy<radius*radius)return false;}
      }
    return true;
  }
  lineClear(a:Point,b:Point,radius:number):boolean {
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/24));
    for(let i=1;i<=steps;i++)if(!this.clear({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps},radius))return false;
    return true;
  }
  route(from:Point,to:Point,radius:number):Point[] {
    if(this.lineClear(from,to,radius))return [to];
    type Node=Point&{key:string;cost:number;score:number;parent?:Node};
    const start:Node={...from,key:'0,0',cost:0,score:0},open=[start],costs=new Map<string,number>([['0,0',0]]);
    let best=start;
    for(let iterations=0;open.length&&iterations<700;iterations++){
      let index=0;for(let i=1;i<open.length;i++)if(open[i].score<open[index].score)index=i;
      const n=open.splice(index,1)[0];
      if(Math.hypot(n.x-to.x,n.y-to.y)<Math.hypot(best.x-to.x,best.y-to.y))best=n;
      if(Math.hypot(n.x-to.x,n.y-to.y)<100&&this.lineClear(n,to,radius)){
        const path:Point[]=[to];let cursor:Node|undefined=n;
        while(cursor?.parent){path.push({x:cursor.x,y:cursor.y});cursor=cursor.parent;}return path.reverse();
      }
      for(let ix=-1;ix<=1;ix++)for(let iy=-1;iy<=1;iy++){
        if(!ix&&!iy)continue;
        const x=n.x+ix*64,y=n.y+iy*64,key=`${Math.round((x-from.x)/64)},${Math.round((y-from.y)/64)}`;
        const cost=n.cost+Math.hypot(ix,iy)*64;
        if(cost>2200||cost>=(costs.get(key)??Infinity)||!this.lineClear(n,{x,y},radius))continue;
        costs.set(key,cost);open.push({x,y,key,cost,score:cost+Math.hypot(x-to.x,y-to.y),parent:n});
      }
    }
    // Partial progress is preferable to walking into the same blocked wall.
    const path:Point[]=[];let cursor:Node|undefined=best;
    while(cursor?.parent){path.push({x:cursor.x,y:cursor.y});cursor=cursor.parent;}return path.reverse();
  }
}
