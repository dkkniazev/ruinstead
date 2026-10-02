import { RELEASE_REGIONS, RELEASE_PASSAGES, getPassageGeometry, regionPointAt, distanceToRegionBoundary, type RegionDefinition } from './ReleaseRegionMap';
import { watercourseAreaIsClear } from './WorldWatercourses';

export const REGION_GEOGRAPHY = [
  {name:'Мшистые террасы',soil:0x725a3d,rock:0x888d80,light:0xc0c2ad,detail:0x486c48},
  {name:'Выветренные нагорья',soil:0x826b53,rock:0xa28b72,light:0xd3bd95,detail:0x66645c},
  {name:'Сланцевый разлом',soil:0x4b505f,rock:0x505b74,light:0x91a0b1,detail:0x6e7895},
  {name:'Базальтовые ступени',soil:0x352d37,rock:0x3c3842,light:0x766878,detail:0xed7937},
  {name:'Известняковые седловины',soil:0xa39b73,rock:0xaaa88e,light:0xd9d5ba,detail:0x667f67},
  {name:'Минеральные русла',soil:0x666160,rock:0x697374,light:0xa6b5ab,detail:0x609b99},
  {name:'Красный песчаник',soil:0xa47a50,rock:0xb17b56,light:0xe1b585,detail:0x82573f},
  {name:'Обсидиановая кальдера',soil:0x352830,rock:0x302d3c,light:0x665775,detail:0xff863b},
] as const;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
const gauss=(n:number,width:number)=>Math.exp(-((n/width)**2));
const approaches=RELEASE_PASSAGES.map(p=>({...getPassageGeometry(p),passage:p}));

/** Authored directional landforms, measured in world units, not per-frame noise. */
export function regionalRelief(region:RegionDefinition,x:number,y:number):number {
  const u=x-region.center[0],v=y-region.center[1];
  const broad=Math.sin(u*.0021+region.id)*Math.cos(v*.0017-.7);
  const detail=Math.sin((u+v)*.006)*4+Math.cos((u-v)*.007)*3;
  let height=0;
  switch(region.id){
    case 1: height=52*broad+46*gauss(v+.38*u-530,340)-30*gauss(v-.55*u+280,190);break;
    case 2: height=95*gauss(u+.25*v+260,480)*( .72+.28*Math.cos(v*.003))+27*broad-48*gauss(u+.22*v-360,150);break;
    case 3: height=87*gauss(u-.15*v+420,220)+56*gauss(u-.12*v-390,210)-38*gauss(u-.12*v,180)+18*broad;break;
    case 4: height=40*Math.sin(u*.0035)*Math.cos(v*.0025)+58*gauss(v+.25*u+360,210)-26*gauss(v-.3*u-120,135);break;
    case 5: height=105*gauss(v+.42*u+200,470)+50*broad-34*gauss(v-.35*u-450,210);break;
    case 6: height=38*broad-62*gauss(v-.3*u-150-Math.sin(u*.0017)*140,220)+48*gauss(v-.3*u+590,380);break;
    case 7: height=78*gauss(v+.26*u+450,390)+65*gauss(v+.2*u-760,330)-46*gauss(v+.2*u-120,190)+15*broad;break;
    case 8: {const r=Math.hypot(u,v*.85);height=100*gauss(r-1050,320)-27*gauss(r,600)+18*broad;break;}
  }
  let mask=1;
  if(region.id===1)mask=smooth(530,850,Math.hypot(u,v-380));
  // Flatten actual bridge landings, including the width of the deck. Keeping
  // the same sampler for terrain, props and actors avoids floating feet.
  for(const p of approaches){
    if(p.passage.a!==region.id&&p.passage.b!==region.id)continue;
    const t=clamp(((x-p.a.x)*p.ux+(y-p.a.y)*p.uy)/p.length);
    const distance=Math.hypot(x-p.a.x-p.ux*p.length*t,y-p.a.y-p.uy*p.length*t);
    mask*=smooth(p.passage.width*.65,p.passage.width*.65+300,distance);
  }
  return (height*1.7+detail)*mask;
}

export type GeographyLandmark={id:string;region:number;x:number;y:number;radius:number;kind:'moss'|'strata'|'slate'|'basalt'|'chalk'|'pool'|'mesa'|'obsidian';seed:number};
/** Sparse authored landmarks, reserved before resource/enemy placement. */
export const GEOGRAPHY_LANDMARKS:readonly GeographyLandmark[]=RELEASE_REGIONS.flatMap(region=>{
  const kinds:GeographyLandmark['kind'][]=['moss','strata','slate','basalt','chalk','pool','mesa','obsidian'];
  const result:GeographyLandmark[]=[];
  for(const [i,offset] of [[-.58,-.57],[.58,.54],[-.56,.57]].entries()){
    const p=regionPointAt(region,offset[0],offset[1]);
    const radius=i===2?100:128;
    if(distanceToRegionBoundary(region,p.x,p.y)<radius+80)continue;
    if(approaches.some(g=>Math.hypot(p.x-g.a.x,p.y-g.a.y)<420||Math.hypot(p.x-g.b.x,p.y-g.b.y)<420))continue;
    if(approaches.some(g=>{
      if(g.passage.a!==region.id&&g.passage.b!==region.id)return false;
      const end=g.passage.a===region.id?g.a:g.b,sx=region.center[0],sy=region.center[1]+(region.id===1?380:0);
      const dx=end.x-sx,dy=end.y-sy,t=Math.max(0,Math.min(1,((p.x-sx)*dx+(p.y-sy)*dy)/(dx*dx+dy*dy)));
      return Math.hypot(p.x-sx-dx*t,p.y-sy-dy*t)<radius+210;
    }))continue;
    // Chest sites and town/quest landmarks retain generous approach space.
    if([[-.46,-.12],[.5,.25]].some(o=>{const q=regionPointAt(region,o[0],o[1]);return Math.hypot(q.x-p.x,q.y-p.y)<radius+210;}))continue;
    if(region.id===1&& (Math.hypot(p.x-region.center[0],p.y-region.center[1]-380)<900
      ||Math.hypot(p.x-region.center[0]-region.radiusX*.48,p.y-region.center[1]+region.radiusY*.12)<500))continue;
    result.push({id:`geography-${region.id}-${i}`,region:region.id,...p,radius,kind:region.id===1&&i===2?'pool':kinds[region.id-1],seed:region.id*17+i*23});
  }
  return result;
});
export function geographyAreaIsClear(x:number,y:number,clearance=0):boolean {
  return watercourseAreaIsClear(x,y,clearance)
    && GEOGRAPHY_LANDMARKS.every(p=>Math.hypot(x-p.x,y-p.y)>p.radius+clearance+22);
}
