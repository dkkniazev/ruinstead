import { RELEASE_BOSSES } from '../world/ReleaseWorldContent';
import { getRegionDefinition,regionPointAt,pointInRegion,distanceToRegionBoundary,type RegionId,type WorldPoint } from '../world/ReleaseRegionMap';
import { passageAt } from '../world/WorldTerrain';
import { resourceNodeAreaIsClear } from '../gathering/ResourceSystem';

export function bossGroundIsClear(regionId:RegionId,p:WorldPoint,radius:number):boolean {
  const region=getRegionDefinition(regionId);
  return pointInRegion(region,p.x,p.y)&&distanceToRegionBoundary(region,p.x,p.y)>radius+45
    &&!passageAt(p.x,p.y,radius+70);
}

/** Reserve safe boss arenas before placing ordinary packs or elites. */
export const BOSS_ARENAS:Record<string,WorldPoint>=(()=>{
  const result:Record<string,WorldPoint>={};const perRegion=new Map<RegionId,number>();
  for(const source of RELEASE_BOSSES){
    const index=perRegion.get(source.region)??0;perRegion.set(source.region,index+1);
    const offset=source.region===1&&index===2?[.55,.5]:[[-.52,-.48],[.52,-.38],[.18,.68]][index];
    const start=regionPointAt(getRegionDefinition(source.region),offset[0],offset[1]);
    let chosen:WorldPoint|undefined;
    for(let step=0;step<600&&!chosen;step++){
      const r=step===0?0:65+Math.sqrt(step)*60,a=(source.region*10+index+step)*2.399963;
      const p={x:Math.round(start.x+Math.cos(a)*r),y:Math.round(start.y+Math.sin(a)*r)};
      if(bossGroundIsClear(source.region,p,225)&&resourceNodeAreaIsClear(p.x,p.y,195)
        &&Object.values(result).every(other=>Math.hypot(other.x-p.x,other.y-p.y)>500))chosen=p;
    }
    if(!chosen)throw new Error('No safe boss arena: '+source.id);
    result[source.id]=chosen;
  }
  return result;
})();

export function bossArenaAreaIsClear(x:number,y:number,radius:number):boolean {
  return Object.values(BOSS_ARENAS).every(p=>Math.hypot(p.x-x,p.y-y)>190+radius);
}
