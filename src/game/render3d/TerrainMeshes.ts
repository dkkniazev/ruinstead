import { createRegionLandmarks } from './GeographyModels';
import * as THREE from 'three';
import { groundMaterial, boundarySurfaceMaterial, rockFaceMaterial } from './ArtMaterials';
import { REGION_GEOGRAPHY } from '../world/RegionGeography';
import { createRegionRoads } from './BiomeScenery';
import { pointInRegion, type RegionDefinition } from '../world/ReleaseRegionMap';
import { plateauHeight, sampleBoundaryTerrain } from '../world/WorldTerrain';

export const REGION_PALETTES: Record<number, [number, number, number]> = {
  1: [0x76a75d, 0x96bb6c, 0x588557], 2: [0xbca16d, 0xd8bc86, 0x96805c],
  3: [0x686f8c, 0x858ca4, 0x50586f], 4: [0x50424b, 0x77605b, 0x3e3945],
  5: [0x8bab79, 0xb8c68d, 0x688b70], 6: [0x847e79, 0xa89e87, 0x617b7e],
  7: [0xbd905f, 0xdfb680, 0xa47b58], 8: [0x4f3a48, 0x735159, 0x363343],
};

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function mesh(positions: number[], colors: number[], shadows = false): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const result = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, flatShading: true, side: THREE.DoubleSide }));
  result.castShadow = shadows;
  result.receiveShadow = true;
  result.userData.uniqueGeometry = true;
  return result;
}

export function createRegionLand(region: RegionDefinition): THREE.Group {
  const group = new THREE.Group();
  const shape = region.outline.map(([x, y]) => new THREE.Vector2(x, y));
  const triangles = THREE.ShapeUtils.triangulateShape(shape, []);
  const positions: number[] = [], colors: number[] = [];
  const palette = REGION_PALETTES[region.id].map(color => new THREE.Color(color));
  const landColor = (x: number, y: number) => {
    const patch = (Math.sin(x * 0.005) + Math.cos(y * 0.006) + 2) / 4;
    const color = palette[0].clone().lerp(patch > 0.5 ? palette[1] : palette[2], Math.abs(patch - 0.5) * 1.3);
    return color;
  };
  const emit = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2): void => {
    // Clockwise in X/Z gives upward facing terrain normals.
    const vertices = (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x) > 0 ? [a,c,b] : [a,b,c];
    for (const v of vertices) {
      positions.push(v.x, plateauHeight(region,v.x,v.y), v.y);
      const color=landColor(v.x,v.y); colors.push(color.r,color.g,color.b);
    }
  };
  // Clip every authored triangle to the same grid. Independent recursive
  // subdivisions produced T-junctions: different heights along a shared edge.
  const grid=80;
  const clip=(polygon:THREE.Vector2[],axis:'x'|'y',edge:number,sign:number):THREE.Vector2[]=>{
    const result:THREE.Vector2[]=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],da=(a[axis]-edge)*sign,db=(b[axis]-edge)*sign;
      if(da>=0)result.push(a);
      if((da<0)!==(db<0)){const p=a.clone().lerp(b,da/(da-db));p[axis]=edge;result.push(p);}
    }
    return result;
  };
  for(const indices of triangles){
    const source=indices.map(i=>shape[i]);
    const x0=Math.floor(Math.min(...source.map(p=>p.x))/grid),x1=Math.floor(Math.max(...source.map(p=>p.x))/grid);
    const y0=Math.floor(Math.min(...source.map(p=>p.y))/grid),y1=Math.floor(Math.max(...source.map(p=>p.y))/grid);
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
      let polygon=clip(source,'x',x*grid,1);polygon=clip(polygon,'x',(x+1)*grid,-1);
      polygon=clip(polygon,'y',y*grid,1);polygon=clip(polygon,'y',(y+1)*grid,-1);
      for(let i=1;i<polygon.length-1;i++){
        const a=polygon[0],b=polygon[i],c=polygon[i+1];
        if(Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))>1e-5)emit(a,b,c);
      }
    }
  }
  // Partition the high-resolution surface so the camera does not submit an
  // entire region's triangles when only a small corner is visible.
  const tiles=new Map<string,{positions:number[];colors:number[]}>();
  for(let i=0;i<positions.length;i+=9){
    const cx=(positions[i]+positions[i+3]+positions[i+6])/3,cz=(positions[i+2]+positions[i+5]+positions[i+8])/3;
    const key=Math.floor(cx/640)+':'+Math.floor(cz/640),tile=tiles.get(key)??{positions:[],colors:[]};
    tile.positions.push(...positions.slice(i,i+9));tile.colors.push(...colors.slice(i,i+9));tiles.set(key,tile);
  }
  const surfaceMaterial=groundMaterial(region.id);
  const normalCache=new Map<string,THREE.Vector3>();
  for(const tile of tiles.values()){
    const normals:number[]=[];
    for(let i=0;i<tile.positions.length;i+=3){
      const x=tile.positions[i],z=tile.positions[i+2],key=x.toFixed(3)+':'+z.toFixed(3);
      let normal=normalCache.get(key);
      if(!normal){normal=new THREE.Vector3(plateauHeight(region,x-5,z)-plateauHeight(region,x+5,z),10,plateauHeight(region,x,z-5)-plateauHeight(region,x,z+5)).normalize();normalCache.set(key,normal);}
      normals.push(normal.x,normal.y,normal.z);
    }
    const land=mesh(tile.positions,tile.colors);(land.material as THREE.Material).dispose();land.material=surfaceMaterial;
    land.geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));land.userData.regionSurface=true;group.add(land);
  }
  group.add(createRegionRoads(region),createRegionLandmarks(region.id));

  const cliffPositions: number[] = [], cliffColors: number[] = [];
  const stone = new THREE.Color(region.id === 7 ? 0x9b6949 : region.id === 4 || region.id === 8 ? 0x51443e : region.id === 3 ? 0x686776 : 0x817c6d);
  const rim:THREE.Vector2[]=[];
  for (let edge=0;edge<shape.length;edge++) {
    const a=shape[edge], b=shape[(edge+1)%shape.length];
    const breaks=[0];
    for(const axis of ['x','y'] as const){
      const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-6)continue;
      const lo=Math.min(a[axis],b[axis]),hi=Math.max(a[axis],b[axis]);
      for(let n=Math.ceil(lo/grid);n*grid<hi;n++){const t=(n*grid-a[axis])/delta;if(t>1e-6&&t<1-1e-6)breaks.push(t);}
    }
    breaks.sort((x,y)=>x-y);
    for(let i=0;i<breaks.length;i++)if(i===0||breaks[i]-breaks[i-1]>1e-6)rim.push(a.clone().lerp(b,breaks[i]));
  }
  // Every panel shares both its side vertices and its stratum edges. Independent
  // bevels previously left open seams through which the river was visible.
  const levels=[0,.22,.56,.82,1];
  const rings=rim.map((p,index)=>{
    const previous=rim[(index+rim.length-1)%rim.length],next=rim[(index+1)%rim.length];
    const normal=new THREE.Vector2(-(next.y-previous.y),next.x-previous.x).normalize();
    if(pointInRegion(region,p.x+normal.x*10,p.y+normal.y*10))normal.negate();
    const top=plateauHeight(region,p.x,p.y);
    const bottom=Math.min(region.elevation-115,sampleBoundaryTerrain(p.x+normal.x*140,p.y+normal.y*140).height-12);
    return levels.map((t,band)=>{
      const bevel=band===0?0:band===4?12:7+hash(p.x+band*41,p.y)*16;
      return [p.x+normal.x*bevel,top+(bottom-top)*t,p.y+normal.y*bevel];
    });
  });
  for(let index=0;index<rings.length;index++) {
    const a=rings[index],b=rings[(index+1)%rings.length];
    for(let band=0;band<levels.length-1;band++) {
      const vertices=[a[band],b[band],b[band+1],a[band+1]];
      const shade=stone.clone().multiplyScalar(.87+hash(index,0)*.15-band*.045+(band===0?.12:0));
      for(const j of [0,2,1,0,3,2]) {cliffPositions.push(...vertices[j]);cliffColors.push(shade.r,shade.g,shade.b);}
    }
  }
  const cliff=mesh(cliffPositions,cliffColors,true);(cliff.material as THREE.Material).dispose();cliff.material=rockFaceMaterial();group.add(cliff);
  return group;
}

export function createBoundaryGround(cx: number, cz: number, size: number, segments = 20): THREE.Group {
  const group=new THREE.Group(),source=new THREE.PlaneGeometry(size,size,segments,segments);
  source.rotateX(-Math.PI/2);
  const vertices=source.attributes.position;
  const samples=Array.from({length:vertices.count},(_,i)=>sampleBoundaryTerrain(cx+vertices.getX(i),cz+vertices.getZ(i)));
  const positions:number[][]=[[],[],[]],colors:number[][]=[[],[],[]];
  for(let triangle=0;triangle<source.index!.count;triangle+=3){
    const indices=[0,1,2].map(n=>source.index!.getX(triangle+n));
    const kind=indices.every(i=>samples[i].kind==='river')?1:indices.every(i=>samples[i].kind==='lava')?2:0;
    for(const i of indices){
      const x=cx+vertices.getX(i),z=cz+vertices.getZ(i),sample=samples[i];
      positions[kind].push(x,sample.height,z);
      const palette=REGION_GEOGRAPHY[sample.region.id-1];
      const color=kind>0?new THREE.Color(0xffffff):new THREE.Color(sample.kind==='river'?0x30969f:sample.kind==='lava'?0xc65333
        :sample.kind==='cut'?palette.soil:palette.rock);
      if(kind===0&&sample.kind!=='cut')color.lerp(new THREE.Color(palette.light),THREE.MathUtils.clamp((sample.height-sample.region.elevation-130)/450,0,.36));
      if(kind===0)color.multiplyScalar(.9+hash(Math.floor(x/90),Math.floor(z/90))*.16);
      else color.multiplyScalar(.76+Math.max(0,1-sample.distance/120)*.24);
      colors[kind].push(color.r,color.g,color.b);
    }
  }
  source.dispose();
  for(let kind=0;kind<3;kind++){
    if(!positions[kind].length)continue;
    const surface=mesh(positions[kind],colors[kind],kind===0);
    (surface.material as THREE.Material).dispose();surface.material=kind>0?boundarySurfaceMaterial(kind===2):rockFaceMaterial();
    group.add(surface);
  }
  return group;
}
