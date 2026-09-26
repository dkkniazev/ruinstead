import * as THREE from 'three';
import { RELEASE_PASSAGES, getPassageGeometry, pointInRegion, type RegionDefinition } from '../world/ReleaseRegionMap';
import { plateauHeight, sampleBoundaryTerrain } from '../world/WorldTerrain';

export const REGION_PALETTES: Record<number, [number, number, number]> = {
  1: [0x69904e, 0x81a961, 0x4e7546], 2: [0xb69c6b, 0xc6ad7d, 0x887753],
  3: [0x727384, 0x878796, 0x505363], 4: [0x704d3d, 0x9c6244, 0x4e3d3b],
  5: [0x9ba989, 0xb7bb96, 0x79846d], 6: [0x8d7968, 0xa28f78, 0x667d7d],
  7: [0xa87954, 0xc59a68, 0x7b5946], 8: [0x66413e, 0x884c3f, 0x45383a],
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
  const paths = RELEASE_PASSAGES.filter(p => p.a === region.id || p.b === region.id).map(p => {
    const geometry = getPassageGeometry(p);
    const end = p.a === region.id ? geometry.a : geometry.b;
    return { dx: end.x - region.center[0], dy: end.y - region.center[1] };
  });
  const palette = REGION_PALETTES[region.id].map(color => new THREE.Color(color));
  const landColor = (x: number, y: number) => {
    const patch = (Math.sin(x * 0.005) + Math.cos(y * 0.006) + 2) / 4;
    const color = palette[0].clone().lerp(patch > 0.5 ? palette[1] : palette[2], Math.abs(patch - 0.5) * 1.3);
    const px = x - region.center[0], py = y - region.center[1];
    if (paths.some(({dx,dy}) => {
      const t = (px * dx + py * dy) / (dx * dx + dy * dy);
      return t >= 0 && t <= 1.05 && Math.hypot(px - dx * t, py - dy * t) < 42;
    })) color.lerp(new THREE.Color(region.id === 4 || region.id === 8 ? 0x9b7861 : 0xc4ad80), 0.75);
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
  group.add(mesh(positions, colors));

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
  const group=new THREE.Group();
  const geometry=new THREE.PlaneGeometry(size,size,segments,segments);
  geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position, colors:number[]=[];
  for(let i=0;i<positions.count;i++) {
    const x=cx+positions.getX(i), y=cz+positions.getZ(i);
    const sample=sampleBoundaryTerrain(x,y);
    positions.setY(i,sample.height);
    const hex=sample.kind==='river'?0x2f8c9e:sample.kind==='lava'?0xde572b:sample.kind==='cliff'?0x9a8769
      :sample.kind==='cut'?0x8e7b61:sample.height>780?0xaeb3b2:sample.region.id===7?0x95684e:0x62656a;
    const color=new THREE.Color(hex).multiplyScalar(0.86+hash(Math.floor(x/90),Math.floor(y/90))*0.21);
    colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  const ground=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.93,flatShading:true}));
  ground.position.set(cx,0,cz);ground.receiveShadow=true;ground.userData.uniqueGeometry=true;group.add(ground);
  return group;
}
