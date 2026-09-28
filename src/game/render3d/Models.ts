import { withNatureAsset } from './NatureAssets';
import { softBox, softOrb, contactShadow } from './ArtMaterials';
import { batchStaticMeshes } from './MeshBatching';
import { createLivingTree } from './Trees';
export { createHero } from './HeroModel';
export { createCreature } from './CreatureModels';
import * as THREE from 'three';
import type { WeaponId } from '../combat/WeaponDefinitions';

const cube = softBox;
const orb = softOrb;
const cone = new THREE.ConeGeometry(1, 1, 6);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
const crystalGeometry = (()=>{
  const positions:number[]=[];
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,b=(i+1)*Math.PI/3;
    const vertices=[[Math.cos(a),0,Math.sin(a)],[Math.cos(b),0,Math.sin(b)],
      [Math.cos(b),.73,Math.sin(b)],[Math.cos(a),.73,Math.sin(a)],[0,1,0]];
    for(const n of [0,2,1,0,3,2,3,4,2])positions.push(...vertices[n]);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return geometry;
})();
const materials = new Map<string, THREE.MeshStandardMaterial>();

function mat(color: number, metalness = 0, emissive = 0): THREE.MeshStandardMaterial {
  const key = `${color}-${metalness}-${emissive}`;
  let value = materials.get(key);
  if (!value) {
    value = new THREE.MeshStandardMaterial({ color, metalness, roughness: metalness ? 0.48 : 0.88, emissive, emissiveIntensity: emissive ? 0.35 : 0, flatShading: false });
    materials.set(key, value);
  }
  return value;
}

function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function box(parent: THREE.Object3D, color: number, x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh {
  return part(parent, cube, mat(color), x, y, z, sx, sy, sz);
}

function ball(parent: THREE.Object3D, color: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx): THREE.Mesh {
  return part(parent, orb, mat(color), x, y, z, sx, sy, sz);
}

function rod(parent: THREE.Object3D, color: number, a: THREE.Vector3, b: THREE.Vector3, radius: number): THREE.Mesh {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const mesh = part(parent, cylinder, mat(color), mid.x, mid.y, mid.z, radius, a.distanceTo(b), radius);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

export type AnimatedModel = {
  root: THREE.Group;
  step: (seconds: number, speed: number, dash?: boolean, attack?: boolean, travel?: number, turning?: number, attackAt?: number) => void;
  setWeapon?: (weapon: WeaponId) => void;
  setTint?: (tint: number | null) => void;
  dispose?: () => void;
  ready?: Promise<void>;
};

export function createTree(seed: number, region: number): THREE.Group {
  if([1,3,5,6].includes(region))return createLivingTree(Math.abs(seed),region);
  const group = new THREE.Group();
  const height = 80 + (seed % 57);
  if (region === 4 || region === 8) {
    const trunk = part(group, cone, mat(0x373333), 0, height * 0.45, 0, 20, height, 18);
    trunk.rotation.z = 0.1;
    for (let n = 0; n < 4; n++) {
      const branch = rod(group, 0x463631, new THREE.Vector3(0, 35 + n * 18, 0), new THREE.Vector3((n % 2 ? -1 : 1) * 28, 50 + n * 18, 8), 3);
      branch.castShadow = true;
    }
    ball(group, 0xd0572f, 0, 7, 0, 13, 4, 13);
  } else if (region === 2 || region === 7) {
    rod(group, 0x6b5037, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, height * 0.6, 0), 7);
    for (const side of [-1, 1]) rod(group, 0x6b5037, new THREE.Vector3(0, 40, 0), new THREE.Vector3(side * 35, height * 0.8, 0), 4);
    for (const x of [-28, 0, 28]) ball(group, 0x8f9b55, x, height * 0.75, 0, 27, 17, 22);
  } else {
    rod(group, 0x654c35, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, height * 0.7, 0), 10);
    for (let n = 0; n < 3; n++) {
      const green = region === 3 ? 0x56685d : region === 5 ? 0x96ae76 : 0x4e9255;
      const leaf = part(group, cone, mat(n % 2 ? green : 0x67a45e), 0, height * (0.72 + n * 0.17), 0, 42 - n * 7, 56, 42 - n * 7);
      leaf.rotation.y = n * 0.45;
    }
  }
  const byRegion: Record<number, readonly string[]> = {
    1: ['tree_oak', 'tree_detailed', 'tree_pineRoundA'],
    2: ['tree_plateau_fall', 'tree_thin_dark'],
    3: ['tree_pineTallA_detailed', 'tree_pineRoundA', 'tree_thin_dark'],
    4: ['tree_thin_dark', 'tree_plateau_fall'],
    5: ['tree_pineRoundA', 'tree_pineTallA_detailed', 'tree_oak'],
    6: ['tree_oak', 'tree_detailed', 'tree_pineRoundA'],
    7: ['tree_plateau_fall', 'tree_thin_dark', 'tree_detailed'],
    8: ['tree_thin_dark', 'tree_plateau_fall'],
  };
  const choices = byRegion[region] ?? byRegion[1];
  const asset = choices[Math.abs(seed) % choices.length];
  const visual = withNatureAsset(asset, 162 + Math.abs(seed % 5) * 7, group);
  visual.rotation.y = (Math.abs(seed) % 12) * 0.37;
  return visual;
}

export function createRock(seed: number, region: number): THREE.Group {
  const group = new THREE.Group();
  const safeSeed = Math.abs(seed);
  const variant = safeSeed % 4;
  const stone = region === 2 || region === 7
    ? 0xb69a70
    : region === 4 || region === 8
      ? 0x514745
      : region === 3
        ? 0x727784
        : 0x838b7d;

  if (variant <= 1) {
    ball(group, stone, -5, 9, 0, 18 + safeSeed % 8, 11 + safeSeed % 6, 17 + safeSeed % 7);
    if (safeSeed % 3 !== 0) {
      ball(group, 0xa1a48f, 10, 7, -5, 6, 4, 7);
    }
    const visual = withNatureAsset(
      variant === 0 ? 'rock_largeA' : 'rock_largeC',
      39 + safeSeed % 10,
      group,
    );
    visual.rotation.y = safeSeed % 10 * 0.43;
    return visual;
  }

  if (variant === 2) {
    for (let index = 0; index < 4; index += 1) {
      const angle = index * 1.53 + safeSeed * 0.11;
      ball(
        group,
        index === 0 ? stone : 0x8f9185,
        Math.cos(angle) * (6 + index * 4),
        6 + index * 2,
        Math.sin(angle) * (5 + index * 3),
        13 - index,
        8 + index,
        11 - index * 0.5,
      );
    }
    group.rotation.y = safeSeed % 9 * 0.37;
    return group;
  }

  const slab = part(
    group,
    cube,
    mat(stone),
    0,
    14,
    0,
    25,
    28,
    18,
  );
  slab.rotation.set(0.08, safeSeed % 7 * 0.31, -0.14);
  ball(group, 0x9b9c8b, -12, 5, 8, 9, 5, 8);
  ball(group, stone, 13, 4, -7, 7, 4, 9);
  return group;
}

export function createOre(seed: number, region: number): THREE.Group {
  const group = new THREE.Group();
  const base = region === 2 || region === 7 ? 0x5e5b55 : region === 4 || region === 8 ? 0x45464a : 0x596068;
  const vein = region === 4 || region === 8 ? 0xd98245 : 0xb7c6ce;

  // Ore deliberately has a tall fractured silhouette instead of reusing the
  // round stone asset. Metallic veins remain readable even from the zoomed camera.
  for (let index = 0; index < 4; index += 1) {
    const angle = index * 1.47 + seed * 0.19;
    const height = 25 + ((seed + index * 7) % 17);
    const shard = part(
      group,
      cone,
      mat(index % 2 ? base : 0x3f454b, 0.18),
      Math.cos(angle) * (9 + index * 3),
      height / 2,
      Math.sin(angle) * (8 + index * 2),
      10 + index * 2,
      height,
      10 + index,
    );
    shard.rotation.z = Math.sin(angle) * 0.17;
    shard.rotation.y = angle;
  }
  for (let index = 0; index < 5; index += 1) {
    const angle = index * 1.23 + seed * 0.31;
    ball(
      group,
      vein,
      Math.cos(angle) * (13 + index),
      11 + (index % 3) * 7,
      Math.sin(angle) * (12 + index),
      4 + (index % 2) * 2,
      3,
      5,
    ).material = mat(vein, 0.62);
  }
  group.rotation.y = (Math.abs(seed) % 9) * 0.41;
  return group;
}

export function createSceneryProp(seed: number, region: number): THREE.Group {
  const g = new THREE.Group();
  const safeSeed = Math.abs(seed);
  const variant = safeSeed % 6;

  const flowers = (stem: number, bloomA: number, bloomB: number, count = 5): THREE.Group => {
    for (let index = 0; index < count; index += 1) {
      const angle = index * 1.37 + seed * 0.17;
      const radius = 4 + index * 2.7;
      const height = 7 + index % 3 * 3;
      rod(
        g,
        stem,
        new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius),
        new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius),
        1.15,
      );
      ball(
        g,
        index % 2 ? bloomA : bloomB,
        Math.cos(angle) * radius,
        height + 1,
        Math.sin(angle) * radius,
        3.4,
        2,
        3.4,
      );
    }
    return g;
  };

  const branch = (color: number, length = 34): THREE.Group => {
    rod(g, color, new THREE.Vector3(-length / 2, 4, -4), new THREE.Vector3(length / 2, 6, 5), 3.2);
    rod(g, color, new THREE.Vector3(-2, 5, 1), new THREE.Vector3(9, 13, -8), 1.7);
    return g;
  };

  const shards = (base: number, accent: number, ember = false): THREE.Group => {
    for (let index = 0; index < 5; index += 1) {
      const angle = index * 1.29 + seed * 0.13;
      const height = 8 + (index % 3) * 6;
      const shard = part(
        g,
        cone,
        mat(index % 2 ? base : accent, ember ? 0.1 : 0.04, ember && index === 0 ? accent : 0),
        Math.cos(angle) * (6 + index * 2),
        height / 2,
        Math.sin(angle) * (5 + index * 2),
        4 + index,
        height,
        4 + index,
      );
      shard.rotation.z = Math.sin(angle) * 0.18;
    }
    return g;
  };

  if (region === 1) {
    if (variant === 0 || variant === 4) {
      const fallback = flowers(0x64874f, 0xd07c6d, 0xe0bd68, variant === 0 ? 4 : 6);
      return withNatureAsset(
        variant === 0 ? 'plant_bushDetailed' : 'plant_flatTall',
        20 + safeSeed % 8,
        fallback,
      );
    }
    if (variant === 1) return flowers(0x6f8f55, 0xd06a75, 0xe4bc63, 6);
    if (variant === 2) return branch(0x6b4931, 38);
    if (variant === 3) {
      for (let index = 0; index < 5; index += 1) {
        const angle = index * 1.2;
        rod(g, 0xe8d6b9, new THREE.Vector3(Math.cos(angle) * 8, 0, Math.sin(angle) * 8),
          new THREE.Vector3(Math.cos(angle) * 8, 5 + index, Math.sin(angle) * 8), 1.4);
        ball(g, index % 2 ? 0xb94f46 : 0xd28e45, Math.cos(angle) * 8, 6 + index,
          Math.sin(angle) * 8, 4, 2.2, 4);
      }
      return g;
    }
    return shards(0x777b70, 0x969884);
  }

  if (region === 5) {
    if (variant <= 1) {
      const fallback = flowers(0x869567, 0xc9a8dd, 0xe8df9e, 6);
      return withNatureAsset(variant === 0 ? 'plant_flatTall' : 'plant_bushDetailed', 24 + safeSeed % 7, fallback);
    }
    if (variant === 2) return flowers(0x829763, 0xc69ad7, 0xf0d88b, 7);
    if (variant === 3) return branch(0x75624a, 30);
    if (variant === 4) {
      for (let index = 0; index < 6; index += 1) {
        const x = (index - 2.5) * 4;
        rod(g, 0xb6b98f, new THREE.Vector3(x, 0, 0), new THREE.Vector3(x + 5, 16 + index, 2), 1.1);
      }
      return g;
    }
    return shards(0x858679, 0xb1ad98);
  }

  if (region === 6) {
    if (variant <= 1) {
      for (let index = 0; index < 7; index += 1) {
        const x = (index - 3) * 4;
        const z = Math.sin(index * 1.7) * 6;
        rod(g, 0x627b59, new THREE.Vector3(x, 0, z), new THREE.Vector3(x + 2, 18 + index * 2, z), 1.2);
        if (index % 2 === 0) ball(g, 0x765739, x + 2, 18 + index * 2, z, 2.4, 5, 2.4);
      }
      return g;
    }
    if (variant === 2) return branch(0x675445, 42);
    if (variant === 3) return flowers(0x5f8064, 0x86adc1, 0xe1d68c, 5);
    if (variant === 4) {
      const fallback = flowers(0x668256, 0x89a867, 0xb0bb73, 5);
      return withNatureAsset('plant_bushDetailed', 20 + safeSeed % 7, fallback);
    }
    return shards(0x6f7775, 0x9ba19a);
  }

  if (region === 2) {
    if (variant <= 1) {
      for (let index = 0; index < 6; index += 1) {
        const angle = index * 1.07 + seed * 0.2;
        rod(
          g,
          index % 2 ? 0x806c4c : 0x9a8455,
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(Math.cos(angle) * (10 + index * 2), 8 + index, Math.sin(angle) * (10 + index * 2)),
          1.25,
        );
      }
      return g;
    }
    if (variant === 2) return branch(0x76533a, 37);
    if (variant === 3) return shards(0x9c7b52, 0xc2a16c);
    if (variant === 4) {
      for (let index = 0; index < 4; index += 1) {
        ball(g, index % 2 ? 0xa18561 : 0xc0a373, (index - 1.5) * 9, 4 + index, index % 2 * 8, 8, 5, 7);
      }
      return g;
    }
    return shards(0x7d6549, 0xa98b5d);
  }

  if (region === 7) {
    if (variant === 0) {
      rod(g, 0x788451, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 31, 0), 4);
      rod(g, 0x788451, new THREE.Vector3(0, 17, 0), new THREE.Vector3(10, 22, 0), 2.5);
      rod(g, 0x788451, new THREE.Vector3(9, 21, 0), new THREE.Vector3(9, 29, 0), 2.5);
      return g;
    }
    if (variant === 1) return branch(0x70503b, 40);
    if (variant === 2) return shards(0x8b6247, 0xb57d50);
    if (variant === 3) {
      for (let index = 0; index < 5; index += 1) {
        const angle = index * 1.24;
        rod(g, 0x8c7752, new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(Math.cos(angle) * 15, 8 + index, Math.sin(angle) * 15), 1.2);
      }
      return g;
    }
    if (variant === 4) {
      for (let index = 0; index < 4; index += 1) {
        ball(g, 0xb78b5f, (index - 1.5) * 10, 3 + index, index % 2 * 7, 8, 5, 7);
      }
      return g;
    }
    return shards(0x6f5042, 0x9f704d);
  }

  if (region === 3) {
    if (variant <= 1) return shards(0x515866, variant === 0 ? 0x7f8fa6 : 0x756884);
    if (variant === 2) return branch(0x4d4a49, 39);
    if (variant === 3) {
      for (let index = 0; index < 6; index += 1) {
        const angle = index * 1.04;
        rod(g, 0x59665d, new THREE.Vector3(Math.cos(angle) * 7, 0, Math.sin(angle) * 7),
          new THREE.Vector3(Math.cos(angle) * 12, 12 + index, Math.sin(angle) * 12), 1.1);
      }
      return g;
    }
    if (variant === 4) return flowers(0x596558, 0x8f769f, 0x7890a8, 4);
    return shards(0x3f454d, 0x69707b);
  }

  if (region === 4) {
    if (variant <= 1) return shards(0x39373b, variant === 0 ? 0x75483b : 0x56505a, true);
    if (variant === 2) return branch(0x493a34, 36);
    if (variant === 3) {
      ball(g, 0xcd542d, 0, 2.2, 0, 11, 2.2, 11).material = mat(0xcd542d, 0.05, 0x7d2419);
      for (let index = 0; index < 4; index += 1) {
        const angle = index * Math.PI / 2;
        ball(g, 0x34343a, Math.cos(angle) * 12, 5, Math.sin(angle) * 12, 7, 5, 7);
      }
      return g;
    }
    if (variant === 4) return shards(0x302f34, 0x61504c);
    return branch(0x342f2d, 28);
  }

  // Dragon caldera: sharper obsidian, hotter vents and scorched remains.
  if (variant <= 1) return shards(0x292b31, variant === 0 ? 0x71413b : 0x4e3d48, true);
  if (variant === 2) {
    for (let index = 0; index < 5; index += 1) {
      const angle = index * 1.22;
      rod(g, 0xd8c8a2, new THREE.Vector3(Math.cos(angle) * 5, 0, Math.sin(angle) * 5),
        new THREE.Vector3(Math.cos(angle) * 17, 12 + index * 2, Math.sin(angle) * 17), 1.7);
    }
    return g;
  }
  if (variant === 3) {
    ball(g, 0xee6533, 0, 2, 0, 13, 2, 13).material = mat(0xee6533, 0.08, 0x8f2a19);
    return shards(0x2d2d34, 0x553c3a, true);
  }
  if (variant === 4) return branch(0x322d2b, 43);
  return shards(0x35323a, 0x74483e, true);
}

export function createBuilding(id: string, level: number): THREE.Group {
  const g = new THREE.Group();
  const wall = id === 'workshop' ? 0xaaa092 : id === 'house' ? 0xc6a37c : 0xb1936a;
  const roof = id === 'workshop' ? 0x526771 : id === 'house' ? 0x9e5c45 : id==='storage'?0x53786b:0x9b7a50;
  const width = id === 'workshop' ? 160 : 142;
  const depth = id === 'sawmill' ? 115 : 140;
  const h = 78 + Math.min(level, 8) * 6;
  // Raised stone foundation, solid walls, pitched roof, doors and windows are all world geometry.
  for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
    ball(g, 0x8a8575, sideX * (width / 2 - 12), 8, sideZ * (depth / 2 - 12), 15, 9, 15);
  }
  box(g, 0x989082, 0, 4, depth / 2 + 17, 49, 8, 35);
  box(g, wall, 0, h * 0.5 + 14, 0, width, h, depth);
  box(g, 0x614532, 0, 39, depth / 2 + 1, 33, 51, 4);
  box(g, 0xc59a53, 12, 38, depth / 2 + 4, 3, 3, 3);
  for (const side of [-1, 1]) {
    box(g, 0x704c36, side * (width / 2 - 8), h * 0.5 + 15, depth / 2 + 3, 10, h + 4, 8);
    box(g, 0x523b30, side * 39, 72, depth / 2 + 3, 24, 28, 5);
    box(g, 0xe3bb78, side * 39, 72, depth / 2 + 6, 18, 22, 2);
    box(g, 0x6f4e37, side * 39, 72, depth / 2 + 8, 3, 26, 3);
  }
  // Close the gables and articulate the eaves: roofs sit on walls rather than floating plates.
  const gableShape=new THREE.Shape();gableShape.moveTo(-width/2,h+13);gableShape.lineTo(0,h+56);gableShape.lineTo(width/2,h+13);gableShape.closePath();
  const gable=new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape,{depth,bevelEnabled:false}),mat(wall));gable.position.z=-depth/2;gable.castShadow=gable.receiveShadow=true;gable.userData.buildingOwned=true;g.add(gable);
  box(g,0x604735,0,h+15,depth/2+3,width+8,9,8);
  box(g,0x604735,0,h+15,-depth/2-3,width+8,9,8);
  const slopeWidth = width * 0.64;
  for (const side of [-1, 1]) {
    const slope = box(g, roof, side * width * 0.25, h + 35, 0, slopeWidth, 8, depth + 26);
    slope.rotation.z = side * -0.53;
    const tiles=new THREE.InstancedMesh(cube,mat(roof),28),transform=new THREE.Object3D();
    for(let row=0;row<4;row++)for(let col=0;col<7;col++){
      transform.position.set((row-1.5)*slopeWidth/4,5,(col-3)*(depth+26)/7);
      transform.scale.set(slopeWidth/4-1,3,(depth+26)/7-1);transform.updateMatrix();
      tiles.setMatrixAt(row*7+col,transform.matrix);
      tiles.setColorAt(row*7+col,new THREE.Color().setScalar(.91+((row*3+col*5)%7)*.025));
    }
    tiles.position.copy(slope.position);tiles.rotation.copy(slope.rotation);tiles.castShadow=tiles.receiveShadow=true;g.add(tiles);
    for(const end of [-1,1]){
      const edge=box(g,0x614533,side*width*.25,h+33,end*(depth/2+15),slopeWidth+4,11,8);edge.rotation.z=-side*.53;
    }
  }
  box(g,0x674c38,0,h+58,0,13,10,depth+34);
  if (id === 'workshop' || id === 'sawmill') {
    box(g, 0x6e4e39, width / 2 + 18, 29, 0, 30, 55, 60);
    rod(g, 0x8f714d, new THREE.Vector3(width / 2 + 18, 53, 0), new THREE.Vector3(width / 2 + 18, 78, 0), 5);
    if (id === 'workshop') {
      box(g, 0x77716c, -width / 2 + 18, h + 65, -depth / 4, 22, 61, 22);
      ball(g, 0x9b9d96, -width / 2 + 18, h + 99, -depth / 4, 11, 6, 11);
    }
  }
  if (id === 'storage') for (const x of [-58, -30, 0]) {
    box(g, 0x775535, x, 20, depth / 2 + 27, 22, 33, 25);
    box(g, 0x4f3d31, x, 35, depth / 2 + 27, 24, 4, 26);
  }
  if(id==='sawmill'){
    // Open timber bay and a circular saw distinguish the lumber building.
    for(const x of [90,160])for(const z of [-32,52])box(g,0x715039,x,42,z,8,84,8);
    const awning=box(g,0x9e7950,125,89,12,92,7,110);awning.rotation.z=-.12;
    for(let i=0;i<6;i++){const log=part(g,cylinder,mat(0x705337),102+(i%3)*19,12+Math.floor(i/3)*18,25,9,80,9);log.rotation.x=Math.PI/2;const cut=part(g,cylinder,mat(0xc9a574),102+(i%3)*19,12+Math.floor(i/3)*18,66,8,2,8);cut.rotation.x=Math.PI/2;}
    const saw=part(g,cylinder,mat(0xb6c1bd,.65),145,48,75,24,3,24);saw.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){const angle=i/12*Math.PI*2;const tooth=box(g,0xc4cec5,145+Math.cos(angle)*23,48+Math.sin(angle)*23,75,8,8,4);tooth.rotation.z=angle;}
  }
  if(id==='storage'){
    const cover=box(g,0x638579,0,h-6,depth/2+33,101,6,58);cover.rotation.x=.15;
    for(const x of [-49,49])box(g,0x69503a,x,(h-9)/2,depth/2+55,5,h-9,5);
    for(const x of [50,78]){part(g,cylinder,mat(0x886343),x,22,depth/2+20,13,40,13);for(const y of [9,34])part(g,cylinder,mat(0x4e5655,.35),x,y,depth/2+20,14,4,14);}
  }
  if(id==='workshop'){
    box(g,0x473f37,0,38,depth/2+6,23,32,6);box(g,0xf3aa54,0,35,depth/2+10,17,17,3);
    box(g,0x8d7655,98,30,63,45,9,38);for(const x of [81,115])box(g,0x574c3e,x,15,65,5,30,5);
    box(g,0x586970,98,41,63,27,13,17);box(g,0x829494,102,48,63,38,5,19);
  }
  if(id==='house'){
    for(const x of [-39,39]){box(g,0x6f513b,x,55,depth/2+13,30,9,16);for(let n=0;n<3;n++){ball(g,0x4d7452,x-10+n*10,62,depth/2+15,7,6,7);ball(g,0xd9b978,x-10+n*10,67,depth/2+15,3);}}
    box(g,0x947357,0,11,depth/2+27,58,10,33);
  }
  if (level > 0) {
    rod(g, 0x594733, new THREE.Vector3(-width / 2 + 13, h + 52, -depth / 2), new THREE.Vector3(-width / 2 + 13, h + 115, -depth / 2), 3);
    const flag = box(g, 0xb46c49, -width / 2 + 28, h + 105, -depth / 2, 28, 14, 3);
    flag.rotation.z = 0.08;
  }
  batchStaticMeshes(g);
  return g;
}

export function createResource(type: string, region: number, seed = 24): THREE.Group {
  const g = new THREE.Group();
  const markerColor = type === 'wood' ? 0x84d16c : type === 'stone' ? 0xe4c17a : type === 'metal' ? 0xc2c9cd : type === 'crystal' ? 0x6de2ed : 0xa5d96f;
  const marker = new THREE.Mesh(new THREE.RingGeometry(29, 34, 24), new THREE.MeshBasicMaterial({ color: markerColor, transparent: true, opacity: 0.76, depthWrite: false, side: THREE.DoubleSide }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 5;
  g.add(marker);
  g.add(contactShadow(type==='wood'?50:type==='fiber'?27:41));
  if (type === 'wood') {
    g.add(createTree(seed, region));
  } else if (type === 'fiber') {
    for (const side of [-1, 1]) {
      rod(g, 0x6a914e, new THREE.Vector3(side * 8, 0, 0), new THREE.Vector3(side * 15, 40, 0), 3);
      ball(g, 0x9dbe68, side * 15, 42, 0, 15, 11, 13);
    }
    const shrub = new THREE.Group();
    for (const child of [...g.children].slice(2)) { g.remove(child); shrub.add(child); }
    g.add(withNatureAsset(seed % 2 ? 'plant_bushDetailed' : 'plant_flatTall', 44, shrub));
  } else if (type === 'crystal') {
    ball(g,0x526b79,0,7,0,33,11,25);
    for (const [x, size,z] of [[-16, 40,5], [3, 67,-4], [22, 32,11],[-4,24,19]]) {
      const crystal = part(g, crystalGeometry, mat(x===3?0x91e9ef:0x49b6d1,.12,0x1e687e), x, 4, z, 10, size, 10);
      crystal.rotation.set(0,x*.09,-x*.009);
    }
  } else if (type === 'metal') {
    g.add(createOre(seed, region));
  } else {
    g.add(createRock(seed, region));
  }
  return g;
}

export function createChest(opened: boolean): THREE.Group {
  const g = new THREE.Group();
  box(g, 0x714b2e, 0, 19, 0, 57, 36, 36);
  box(g, opened ? 0x685849 : 0x935d31, 0, opened ? 49 : 39, opened ? -15 : 0, 62, 17, 41);
  for (const x of [-23, 23]) {
    box(g, 0xc49a4c, x, 23, 19, 5, 34, 3);
    box(g, 0xc49a4c, x, opened ? 49 : 39, opened ? 5 : 20, 5, 18, 3);
  }
  box(g, 0xe3bf68, 0, 21, 20, 9, 12, 4);
  return g;
}
