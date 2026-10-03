import * as T from 'three';
import { WORLD_WATERCOURSES, BROOK_BRIDGES, brookBridgeAt, type Watercourse, type BrookBridge } from '../world/WorldWatercourses';
import { getRegionDefinition } from '../world/ReleaseRegionMap';
import { plateauHeight, brookBridgeHeight } from '../world/WorldTerrain';
import { boundarySurfaceMaterial } from './ArtMaterials';
import { fracturedRock, naturalSurfaceMaterial } from './NatureForms';
import { batchStaticMeshes } from './MeshBatching';

function createBrookBridge(bridge: BrookBridge): T.Group {
  const group=new T.Group(),geometry=new T.BoxGeometry(1,1,1);
  group.name=bridge.id;group.position.set(bridge.x,0,bridge.y);group.rotation.y=Math.atan2(bridge.ux,bridge.uy);
  const woods=[0xb89057,0xad7e49,0xc19962].map(color=>new T.MeshStandardMaterial({color,roughness:.91}));
  const dark=new T.MeshStandardMaterial({color:0x735134,roughness:1});
  const add=(x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material)=>{
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
    mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
  };
  const count=Math.ceil(bridge.length/22),span=bridge.length/count;
  const up=new T.Vector3(0,1,0),normal=new T.Vector3();
  for(let i=0;i<count;i++){
    const t=(i+.5)/count,y=brookBridgeHeight(bridge,t),z=(t-.5)*bridge.length;
    const plank=add(0,y-3,z,bridge.width,6,span-.8,woods[i%3]);
    const slope=(brookBridgeHeight(bridge,Math.min(1,t+1/count))-brookBridgeHeight(bridge,Math.max(0,t-1/count)))/(span*2);
    const crossSlope=(brookBridgeHeight(bridge,t,-bridge.width*.5)-brookBridgeHeight(bridge,t,bridge.width*.5))/bridge.width;
    normal.set(-crossSlope,1,-slope).normalize();plank.quaternion.setFromUnitVectors(up,normal);
    plank.position.y=y-3/normal.y;
    for(const side of [-1,1]){
      const x=side*(bridge.width*.5-9),beam=add(x,y+crossSlope*x-11,z,9,12,span+.5,dark);beam.quaternion.copy(plank.quaternion);
    }
  }
  for(const side of [-1,1])for(const t of [.22,.5,.78]){
    const x=side*(bridge.width*.5+2),y=brookBridgeHeight(bridge,t,-x),z=(t-.5)*bridge.length;
    add(x,y+17,z,9,42,9,dark);
    add(x,y+39,z,13,4,13,woods[0]);
  }
  for(const side of [-1,1]){
    const y=brookBridgeHeight(bridge,.5)+30;
    add(side*(bridge.width*.5+2),y,0,5,7,bridge.length*.58,dark);
  }
  const source=new Set<T.Material>([...woods,dark]);
  batchStaticMeshes(group);geometry.dispose();
  group.traverse(o=>{if(o instanceof T.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])source.delete(material);});
  source.forEach(material=>material.dispose());return group;
}

function frame(points: Watercourse['points'], index: number) {
  const point = points[index], a = points[Math.max(0, index - 1)];
  const b = points[Math.min(points.length - 1, index + 1)];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  return { point, nx: -(b.y - a.y) / length, nz: (b.x - a.x) / length };
}

/** Flowing water, sculpted wet banks and low walk-through shore plants. */
export function createWatercourse(course: Watercourse): T.Group {
  const group = new T.Group(), region = getRegionDefinition(course.region);
  group.name = course.id;
  // Subdivide the existing polyline, without changing its bed or water extent.
  // Short cross-sections make the banks read as curves at the gameplay camera.
  const points: Watercourse['points'][number][] = [], distances: number[] = [];
  let along = 0;
  for (let i = 1; i < course.points.length; i++) {
    const a=course.points[i-1],b=course.points[i],length=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.ceil(length/18);
    for(let j=0;j<steps;j++){
      const t=j/steps;
      points.push({x:T.MathUtils.lerp(a.x,b.x,t),y:T.MathUtils.lerp(a.y,b.y,t),
        width:T.MathUtils.lerp(a.width,b.width,t),level:T.MathUtils.lerp(a.level,b.level,t)});
      distances.push(along+length*t);
    }
    along+=length;
  }
  points.push(course.points[course.points.length-1]);distances.push(along);
  const positions: number[] = [], colors: number[] = [], sides: number[] = [], flows: number[] = [];
  const bankPositions: number[] = [], bankColors: number[] = [], bankNormals: number[] = [], bankAlphas: number[] = [];
  const soil = new T.Color(course.region === 1 ? 0xa6a578 : 0xa4aaa2);
  const wet = new T.Color(course.region === 1 ? 0x657b64 : 0x637e80);
  const moss = new T.Color(course.region === 1 ? 0x769451 : 0x738781);
  const emit = (index: number, offset: number, water: boolean) => {
    const { point, nx, nz } = frame(points, index);
    // Sample the coordinates that the GPU actually receives. Near a polyline
    // join, rounding after height sampling can select a different nearest span.
    const x = Math.fround(point.x + nx * point.width * offset), z = Math.fround(point.y + nz * point.width * offset);
    if (water) {
      positions.push(x, point.level + .8, z);
      const edge = Math.abs(offset);
      colors.push(.72 + edge * .38, .86 + edge * .35, .98 + edge * .22);
      sides.push(offset);flows.push(distances[index]);
    } else {
      bankPositions.push(x, plateauHeight(region, x, z) + 2.2, z);
      const edge=Math.abs(offset),variation=Math.sin(x*.021+Math.sin(z*.014))*Math.cos(z*.018)*.12;
      const color = wet.clone().lerp(soil,T.MathUtils.smoothstep(edge+variation,.97,1.35))
        .lerp(moss,T.MathUtils.smoothstep(edge+variation,1.35,1.85));
      bankColors.push(color.r, color.g, color.b);
      bankAlphas.push((1-T.MathUtils.smoothstep(edge+variation,1.4,2.2))*.92);
      const normal=new T.Vector3(plateauHeight(region,x-3,z)-plateauHeight(region,x+3,z),6,
        plateauHeight(region,x,z-3)-plateauHeight(region,x,z+3)).normalize();bankNormals.push(normal.x,normal.y,normal.z);
    }
  };
  for (let i = 1; i < points.length; i++) {
    for (const [lo, hi] of [[-1,-.7],[-.7,0],[0,.7],[.7,1]]) {
      for (const [index, offset] of [[i-1,lo],[i-1,hi],[i,hi],[i-1,lo],[i,hi],[i,lo]]) emit(index, offset, true);
    }
    for(const side of [-1,1]){
      const edges=[.9,1.02,1.17,1.4,1.75,2.3];
      for(let band=1;band<edges.length;band++){
        const [lo,hi]=side<0?[-edges[band],-edges[band-1]]:[edges[band-1],edges[band]];
        for (const [index, offset] of [[i-1,lo],[i-1,hi],[i,hi],[i-1,lo],[i,hi],[i,lo]]) emit(index, offset, false);
      }
    }
  }
  // Round ends are part of the same shallow basin, rather than squared ribbons.
  for (const index of [0, points.length - 1]) {
    const { point, nx, nz } = frame(points, index), direction = index === 0 ? -1 : 1;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI, b = (i + 1) / 16 * Math.PI;
      for (const angle of direction < 0 ? [null,b,a] : [null,a,b]) {
        const side = angle === null ? 0 : Math.cos(angle), forward = angle === null ? 0 : Math.sin(angle) * direction;
        positions.push(point.x + (nx * side + nz * forward) * point.width, point.level + .8,
          point.y + (nz * side - nx * forward) * point.width);
        const edge = angle === null ? 0 : 1;
        colors.push(.72 + edge * .38, .86 + edge * .35, .98 + edge * .22); sides.push(side);
        flows.push(distances[index]+forward*point.width);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('streamSide', new T.Float32BufferAttribute(sides, 1)); geometry.computeVertexNormals();
  geometry.setAttribute('streamAlong', new T.Float32BufferAttribute(flows, 1));
  const material = boundarySurfaceMaterial(false), compile = material.onBeforeCompile;
  material.color.setHex(course.region===1?0x438f98:0x4a929d);
  material.roughness=.5;
  material.side = T.DoubleSide;
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = 'attribute float streamSide;attribute float streamAlong;varying float vStreamSide;varying float vStreamAlong;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvStreamSide=streamSide;vStreamAlong=streamAlong;');
    shader.fragmentShader = 'varying float vStreamSide;varying float vStreamAlong;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(/float ripples=pow\([\s\S]*?\*smoothstep\([^;]+;/,
      `float ripples=pow(.5+.5*sin(vStreamSide*18.+artNoise(vArtPosition.xz*.018)*1.7
        +sin(vStreamAlong*.006-artTime*.3)*1.2),12.)
        *smoothstep(.56,.77,artNoise(vec2(vStreamSide*3.,(vStreamAlong-artTime*16.)*.007)));`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float bankFoam=smoothstep(.74,.97,abs(vStreamSide))*smoothstep(.48,.72,artNoise(vArtPosition.xz*.027));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.57,.8,.72),bankFoam*.5);
    `);
  };
  material.customProgramCacheKey = () => 'ruin-shallow-brook-2';
  const water = new T.Mesh(geometry, material); water.name = 'flowing-water'; water.userData.uniqueGeometry = true;
  water.receiveShadow = true; group.add(water);
  const bankGeometry = new T.BufferGeometry();
  bankGeometry.setAttribute('position', new T.Float32BufferAttribute(bankPositions, 3));
  bankGeometry.setAttribute('color', new T.Float32BufferAttribute(bankColors, 3));
  bankGeometry.setAttribute('normal', new T.Float32BufferAttribute(bankNormals, 3));
  bankGeometry.setAttribute('bankAlpha', new T.Float32BufferAttribute(bankAlphas, 1));
  const bankMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide,
    transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  bankMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float bankAlpha;varying float vBankAlpha;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBankAlpha=bankAlpha;');
    shader.fragmentShader='varying float vBankAlpha;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vBankAlpha;');
  };
  bankMaterial.customProgramCacheKey=()=> 'ruin-soft-brook-bank';
  const banks = new T.Mesh(bankGeometry,bankMaterial);banks.renderOrder=2;
  banks.name = 'wet-banks'; banks.receiveShadow = true; banks.userData.uniqueGeometry = true; group.add(banks);

  const rockGeometry = fracturedRock(course.region + 201, course.region === 1 ? 0x9faaa1 : 0xa9b2ad).clone();
  const stones = new T.InstancedMesh(rockGeometry, naturalSurfaceMaterial, course.points.length * 6);
  const reedPositions: number[] = [], reedColors: number[] = [];
  const root = new T.Color(0x58705c), tip = new T.Color(course.region === 1 ? 0x9eb67b : 0xa9b8a0);
  for (let blade = 0; blade < 4; blade++) {
    const angle = blade * 2.399, dx = Math.cos(angle), dz = Math.sin(angle), height = 25 + blade * 5;
    const points = [[-dz*1.5,0,dx*1.5],[dz*1.5,0,-dx*1.5],[dx*4,height*.7,dz*4],[dx*8,height,dz*8]];
    for (const i of [0,1,2,0,2,3]) { reedPositions.push(...points[i]); const color = i < 2 ? root : tip; reedColors.push(color.r,color.g,color.b); }
  }
  const reedGeometry = new T.BufferGeometry();
  reedGeometry.setAttribute('position',new T.Float32BufferAttribute(reedPositions,3));
  reedGeometry.setAttribute('color',new T.Float32BufferAttribute(reedColors,3)); reedGeometry.computeVertexNormals();
  const reeds = new T.InstancedMesh(reedGeometry, new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}), course.points.length*4);
  const transform = new T.Object3D(); let stoneCount = 0, reedCount = 0;
  for (let i = 2; i < course.points.length - 2; i += 3) {
    const { point, nx, nz } = frame(course.points, i);
    for (const side of i%2===0?[-1,1]:[i%4===1?-1:1]) {
      const spread=1.17+.27*(.5+.5*Math.sin(i*7.1));
      const x = point.x + nx * point.width * spread * side, z = point.y + nz * point.width * spread * side;
      if(brookBridgeAt(x,z))continue;
      // Small grouped stones frame the bend without inventing collidable boulders.
      for(let pebble=0;pebble<3;pebble++){
        const angle=i*2.399+pebble*2.1,px=x+Math.cos(angle)*pebble*11,pz=z+Math.sin(angle)*pebble*11;
        if(brookBridgeAt(px,pz))continue;
        transform.position.set(px,plateauHeight(region,px,pz)-1,pz);transform.rotation.set(0,angle,0);
        const scale=pebble===0?1:.6;transform.scale.set((9+i%5)*scale,(4+i%3)*scale,(8+i%4)*scale);
        transform.updateMatrix();stones.setMatrixAt(stoneCount++,transform.matrix);
      }
      if ((i + 1) % 6 === 0) for(let tuft=0;tuft<4;tuft++){
        const angle=i*1.3+tuft*2.399,rx=x+nx*16*side+Math.cos(angle)*tuft*10,rz=z+nz*16*side+Math.sin(angle)*tuft*10;
        if(brookBridgeAt(rx,rz))continue;
        transform.position.set(rx, plateauHeight(region,rx,rz), rz);
        transform.rotation.set(0,angle,0); transform.scale.setScalar(.68+tuft*.08); transform.updateMatrix(); reeds.setMatrixAt(reedCount++,transform.matrix);
      }
    }
  }
  stones.count = stoneCount; reeds.count = reedCount;
  for (const mesh of [stones,reeds]) { mesh.receiveShadow = true; mesh.userData.uniqueGeometry = true; group.add(mesh); }
  return group;
}

export function createRegionWatercourses(region: number): T.Group {
  const group = new T.Group();
  for (const course of WORLD_WATERCOURSES) if (course.region === region) group.add(createWatercourse(course));
  for (const bridge of BROOK_BRIDGES) if (bridge.region === region) group.add(createBrookBridge(bridge));
  return group;
}
