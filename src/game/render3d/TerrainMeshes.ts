import * as THREE from 'three';
import { groundMaterial, boundarySurfaceMaterial } from './ArtMaterials';
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
  const emit = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2, depth: number): void => {
    if (depth < 6 && Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) > 190) {
      const ab = a.clone().lerp(b, 0.5), bc = b.clone().lerp(c, 0.5), ca = c.clone().lerp(a, 0.5);
      emit(a,ab,ca,depth+1); emit(ab,b,bc,depth+1); emit(ca,bc,c,depth+1); emit(ab,bc,ca,depth+1);
      return;
    }
    // Clockwise in X/Z gives upward facing terrain normals.
    const vertices = (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x) > 0 ? [a,c,b] : [a,b,c];
    for (const v of vertices) {
      positions.push(v.x, plateauHeight(region,v.x,v.y), v.y);
      const color=landColor(v.x,v.y); colors.push(color.r,color.g,color.b);
    }
  };
  for (const [a,b,c] of triangles) emit(shape[a],shape[b],shape[c],0);
  const land=mesh(positions, colors);
  (land.material as THREE.Material).dispose();land.material=groundMaterial(region.id);
  group.add(land,createRegionRoads(region));

  const cliffPositions: number[] = [], cliffColors: number[] = [];
  const stone = new THREE.Color(region.id === 7 ? 0x9b6949 : region.id === 4 || region.id === 8 ? 0x51443e : region.id === 3 ? 0x686776 : 0x817c6d);
  for (let edge=0;edge<shape.length;edge++) {
    const a=shape[edge], b=shape[(edge+1)%shape.length];
    const length=a.distanceTo(b), count=Math.ceil(length/115);
    let nx=-(b.y-a.y)/length, ny=(b.x-a.x)/length;
    if(pointInRegion(region,(a.x+b.x)/2+nx*10,(a.y+b.y)/2+ny*10)){nx=-nx;ny=-ny;}
    for(let i=0;i<count;i++) {
      const p=a.clone().lerp(b,i/count), q=a.clone().lerp(b,(i+1)/count);
      const topP=plateauHeight(region,p.x,p.y), topQ=plateauHeight(region,q.x,q.y);
      const bottom=Math.min(region.elevation-115,sampleBoundaryTerrain((p.x+q.x)/2+nx*140,(p.y+q.y)/2+ny*140).height-12);
      const levels=[0,0.22,0.56,0.82,1];
      for(let band=0;band<levels.length-1;band++) {
        const t=levels[band], u=levels[band+1];
        const bevel=band===0?0:7+hash(edge,i)*16;
        const verts=[
          [p.x+nx*bevel,topP+(bottom-topP)*t,p.y+ny*bevel],
          [q.x+nx*bevel,topQ+(bottom-topQ)*t,q.y+ny*bevel],
          [q.x+nx*12,topQ+(bottom-topQ)*u,q.y+ny*12],
          [p.x+nx*12,topP+(bottom-topP)*u,p.y+ny*12],
        ];
        const shade=stone.clone().multiplyScalar(0.72+hash(edge*20+i,band)*0.38+(band===0?0.18:0));
        for(const j of [0,2,1,0,3,2]) { cliffPositions.push(...verts[j]); cliffColors.push(shade.r,shade.g,shade.b); }
      }
    }
  }
  group.add(mesh(cliffPositions,cliffColors,true));
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
      const color=kind>0?new THREE.Color(0xffffff):new THREE.Color(sample.kind==='river'?0x30969f:sample.kind==='lava'?0xc65333:sample.kind==='cliff'?0x9b8e77
        :sample.kind==='cut'?0x96826b:sample.height>780?0xb8c6c7:sample.region.id===7?0xb58360:0x6c7b85);
      if(kind===0)color.multiplyScalar(.9+hash(Math.floor(x/90),Math.floor(z/90))*.16);
      else color.multiplyScalar(.76+Math.max(0,1-sample.distance/120)*.24);
      colors[kind].push(color.r,color.g,color.b);
    }
  }
  source.dispose();
  for(let kind=0;kind<3;kind++){
    if(!positions[kind].length)continue;
    const surface=mesh(positions[kind],colors[kind],kind===0);
    if(kind>0){(surface.material as THREE.Material).dispose();surface.material=boundarySurfaceMaterial(kind===2);}
    group.add(surface);
  }
  return group;
}
