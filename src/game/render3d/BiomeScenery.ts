import * as T from 'three';
import { getPassageGeometry, RELEASE_PASSAGES, pointInRegion, type RegionDefinition } from '../world/ReleaseRegionMap';
import { passageAt, plateauHeight, terrainHeight } from '../world/WorldTerrain';
import { SETTLEMENT_CENTER } from '../world/WorldPrototype';
import { geographyAreaIsClear } from '../world/RegionGeography';
import { fernGeometry, fracturedRock, naturalSurfaceMaterial } from './NatureForms';

export function artRandom(x:number,y:number,seed=0):number {
  const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);
}

const roadCache=new Map<number,T.Vector2[][]>();
function roadLines(region:RegionDefinition):T.Vector2[][] {
  let cached=roadCache.get(region.id);if(cached)return cached;
  const start=new T.Vector2(...region.center);
  if(region.id===1)start.set(SETTLEMENT_CENTER.x,SETTLEMENT_CENTER.y);
  cached=RELEASE_PASSAGES.filter(p=>p.a===region.id||p.b===region.id).map((p,index)=>{
    const ends=getPassageGeometry(p),end=p.a===region.id?ends.a:ends.b;
    const last=new T.Vector2(end.x,end.y),delta=last.clone().sub(start);
    const normal=new T.Vector2(-delta.y,delta.x).normalize();
    const bend=(index%2?1:-1)*Math.min(190,delta.length()*.13);
    const curve=new T.CubicBezierCurve(start,
      start.clone().addScaledVector(delta,.32).addScaledVector(normal,bend),
      start.clone().addScaledVector(delta,.7).addScaledVector(normal,-bend*.5),last);
    return curve.getPoints(Math.max(8,Math.ceil(delta.length()/35)));
  });
  roadCache.set(region.id,cached);return cached;
}

export function distanceToRoad(region:RegionDefinition,x:number,z:number):number {
  let distance=Infinity;
  for(const points of roadLines(region))for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.y-a.y;
    const t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz),0,1);
    distance=Math.min(distance,Math.hypot(x-a.x-dx*t,z-a.y-dz*t));
  }
  return distance;
}

/** Feathered dirt routes connect the actual region crossings. */
export function createRegionRoads(region:RegionDefinition):T.Group {
  const group=new T.Group(),positions:number[]=[],colors:number[]=[],alphas:number[]=[];
  const shade=new T.Color(region.id===3?0x8b8594:region.id===4||region.id===8?0x78645d:region.id===5?0xc9ba86:region.id===7?0xd3ab76:0xd4bb82);
  for(const points of roadLines(region))for(let i=1;i<points.length;i++){
    const edge=(index:number,offset:number)=>{
      const p=points[index],before=points[Math.max(0,index-1)],after=points[Math.min(points.length-1,index+1)];
      const normal=new T.Vector2(-(after.y-before.y),after.x-before.x).normalize();
      // Adjacent strips use the same join, so bends have no cracks or doubled edges.
      const width=1+Math.sin(p.x*.011+p.y*.007)*.06+Math.sin(p.y*.025-p.x*.009)*.025;
      return p.clone().addScaledVector(normal,offset*width);
    };
    for(const [lo,hi,alphaLo,alphaHi] of [[-60,-48,0,.96],[-48,0,.96,.96],[0,48,.96,.96],[48,60,.96,0]]){
      const vertices=[edge(i-1,lo),edge(i-1,hi),edge(i,hi),edge(i,lo)];
      if(vertices.some(v=>!pointInRegion(region,v.x,v.y)))continue;
      for(const n of [0,1,2,0,2,3]){
        const p=vertices[n],town=Math.hypot(p.x-SETTLEMENT_CENTER.x,p.y-SETTLEMENT_CENTER.y);
        positions.push(p.x,plateauHeight(region,p.x,p.y)+9,p.y);
        const tint=shade.clone().multiplyScalar(.93+artRandom(Math.floor(p.x/75),Math.floor(p.y/75))*.09);
        colors.push(tint.r,tint.g,tint.b);
        alphas.push((n===0||n===3?alphaLo:alphaHi)*(region.id===1?T.MathUtils.clamp((town-190)/120,0,1):1));
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setAttribute('roadAlpha',new T.Float32BufferAttribute(alphas,1));geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float roadAlpha;varying float vRoadAlpha;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoadAlpha=roadAlpha;');
    shader.fragmentShader='varying float vRoadAlpha;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vRoadAlpha;');
  };
  const path=new T.Mesh(geometry,material);path.receiveShadow=true;path.renderOrder=1;path.userData.uniqueGeometry=true;group.add(path);
  return group;
}

/** Low, walk-through clumps; no decorative tree disguises an absent collider. */
export function createGroundCover(cx:number,cz:number,size:number,region:RegionDefinition):T.Group {
  const group=new T.Group(),dry=[2,7].includes(region.id),volcanic=[4,8].includes(region.id);
  const positions:number[]=[],colors:number[]=[];
  if(volcanic){
    const geo=fracturedRock(region.id,region.id===4?0x6d5960:0x554557).clone();geo.scale(1,.55,1);
    const stones=new T.InstancedMesh(geo,naturalSurfaceMaterial,45),dummy=new T.Object3D();let count=0;
    for(let i=0;i<45;i++){
      const x=cx+artRandom(cx,cz,i+9)*size,z=cz+artRandom(cx,cz,i+90)*size;
      if(!pointInRegion(region,x,z)||!geographyAreaIsClear(x,z)||passageAt(x,z,18)||distanceToRoad(region,x,z)<60)continue;
      dummy.position.set(x,terrainHeight(x,z)+.3,z);dummy.rotation.set(0,i*.6,0);dummy.scale.setScalar(3+artRandom(x,z)*7);dummy.updateMatrix();stones.setMatrixAt(count++,dummy.matrix);
    }
    stones.count=count;stones.receiveShadow=true;stones.userData.uniqueGeometry=true;group.add(stones);return group;
  }
  // Each tuft has three curved blades, coloured from root to tip.
  const lower=new T.Color(dry?0x8b864b:region.id===3?0x436c77:0x418359);
  const upper=new T.Color(dry?0xc9b979:region.id===3?0x87a3a0:region.id===5?0xbbd28b:0xa0c96c);
  for(let leaf=0;leaf<3;leaf++){
    const angle=leaf*2.399,dx=Math.cos(angle),dz=Math.sin(angle),h=(leaf===1?24:18)*(dry?.65:1);
    const vertices=[[-dz*3,0,dx*3],[dz*3,0,-dx*3],[dx*5,h*.64,dz*5],[dx*9,h,dz*9]];
    for(const n of [0,1,2,0,2,3]){positions.push(...vertices[n]);const color=n>1?upper:lower;colors.push(color.r,color.g,color.b);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const clusterCount=dry?8:10,tuftsPerCluster=dry?9:12;
  const foliage=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}),clusterCount*tuftsPerCluster);
  const transform=new T.Object3D();let count=0;
  for(let cluster=0;cluster<clusterCount;cluster++){
    const anchorX=cx+artRandom(cx,cz,cluster*7)*size,anchorZ=cz+artRandom(cx,cz,cluster*7+1)*size;
    for(let n=0;n<tuftsPerCluster;n++){
      const angle=artRandom(cx+cluster,cz,n+70)*Math.PI*2,radius=Math.sqrt(artRandom(cx+n,cz,cluster+8))*88;
      const x=anchorX+Math.cos(angle)*radius,z=anchorZ+Math.sin(angle)*radius;
      if(x<cx||z<cz||x>cx+size||z>cz+size||!pointInRegion(region,x,z)||!geographyAreaIsClear(x,z)||passageAt(x,z,18)||distanceToRoad(region,x,z)<75
        ||Math.hypot(x-SETTLEMENT_CENTER.x,z-SETTLEMENT_CENTER.y)<505)continue;
      transform.position.set(x,terrainHeight(x,z)+.3,z);transform.rotation.set(0,angle,0);
      const scale=.6+artRandom(x,z)*.7;transform.scale.setScalar(scale);transform.updateMatrix();foliage.setMatrixAt(count++,transform.matrix);
    }
  }
  foliage.count=count;foliage.receiveShadow=true;foliage.userData.uniqueGeometry=true;group.add(foliage);
  const fernColor=dry?0x99905b:region.id===3?0x588b8c:region.id===5?0x8eac67:region.id===6?0x699789:0x65925d;
  const fernLimit=dry?6:12;
  const ferns=new T.InstancedMesh(fernGeometry(fernColor,dry),new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}),fernLimit);
  let fernCount=0;
  for(let i=0;i<fernLimit;i++){
    const x=cx+artRandom(cx,cz,i+801)*size,z=cz+artRandom(cx,cz,i+901)*size;
    if(!pointInRegion(region,x,z)||!geographyAreaIsClear(x,z)||passageAt(x,z,24)||distanceToRoad(region,x,z)<85
      ||Math.hypot(x-SETTLEMENT_CENTER.x,z-SETTLEMENT_CENTER.y)<560)continue;
    transform.position.set(x,terrainHeight(x,z)+.6,z);transform.rotation.set(0,i*2.399,0);
    transform.scale.setScalar(.65+artRandom(x,z)*.55);transform.updateMatrix();ferns.setMatrixAt(fernCount++,transform.matrix);
  }
  ferns.count=fernCount;ferns.receiveShadow=true;ferns.userData.uniqueGeometry=true;group.add(ferns);
  return group;
}
