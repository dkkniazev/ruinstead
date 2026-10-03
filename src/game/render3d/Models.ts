import { withNatureAsset } from './NatureAssets';
import { softBox, softOrb, contactShadow } from './ArtMaterials';
import { batchStaticMeshes } from './MeshBatching';
import { createLivingTree, createSparseTree } from './Trees';
import { fracturedRock, naturalSurfaceMaterial } from './NatureForms';
import { SETTLEMENT_BUILDINGS, SETTLEMENT_FORGE } from '../world/SettlementLayout';
export { createHero } from './HeroModel';
export { createCreature } from './CreatureModels';
import * as THREE from 'three';
import type { WeaponId } from '../combat/WeaponDefinitions';
import type { SkinId } from '../cosmetics/SkinEconomy';
import type { CreatureCombatPose } from './CreatureMotion';

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
    value.userData.sharedArtMaterial = true;
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
  step: (seconds: number, speed: number, dash?: boolean, attack?: boolean, travel?: number, turning?: number, attackAt?: number, combatPose?: CreatureCombatPose) => void;
  setWeapon?: (weapon: WeaponId) => void;
  setSkin?: (skin: SkinId | null) => void;
  setTint?: (tint: number | null) => void;
  dispose?: () => void;
  ready?: Promise<void>;
};

export function createTree(seed: number, region: number): THREE.Group {
  if([1,3,5,6].includes(region))return createLivingTree(Math.abs(seed),region);
  return createSparseTree(Math.abs(seed),region);
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

  const count=variant===2?4:3;
  for(let index=0;index<count;index++){
    const angle=index*2.399+safeSeed*.11,main=index===0;
    const rock=part(group,fracturedRock(safeSeed+index,stone),naturalSurfaceMaterial,
      main?0:Math.cos(angle)*18,0,main?0:Math.sin(angle)*15,
      main?22:8+index*2,main?37+safeSeed%11:10+index*5,main?19:7+index*2);
    rock.rotation.y=angle;
  }
  batchStaticMeshes(group);
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

function createRuinedBuilding(id: string): THREE.Group {
  const g=new THREE.Group(),forge=id==='forge';
  const site=forge?SETTLEMENT_FORGE:SETTLEMENT_BUILDINGS[id as keyof typeof SETTLEMENT_BUILDINGS];
  const {width,depth}=site;
  const masonry=0x898373,timber=0x65513c,roof=id==='house'?0x9b6250:id==='workshop'?0x667779:0x778171;
  // Broken courses outline the original footprint; filled rubble makes its
  // existing collision boundary readable without a solid placeholder slab.
  for(let row=0;row<3;row++)for(let col=0;col<6;col++){
    const x=(col-2.5)*width/6,height=row*14+8;
    if(row<2||col===0||col===4||col===5)box(g,masonry,x,height,-depth/2,width/6-2,13,17);
    if(col<3&&(row<2||col===0))box(g,masonry,-width/2,height,(col-1)*depth/3,17,13,depth/3-2);
  }
  for(let col=0;col<5;col++){
    if(col===2)continue;
    const stone=box(g,0x98907d,(col-2)*width/5,9,depth/2,width/5-3,16,18);
    stone.rotation.y=(col-2)*.035;
  }
  for(let n=0;n<18;n++){
    const angle=n*2.4,radius=13+(n%5)*9;
    const stone=part(g,fracturedRock(n,masonry),naturalSurfaceMaterial,
      Math.cos(angle)*radius,0,Math.sin(angle)*radius,11+n%4*3,8+n%3*5,9+n%5);
    stone.rotation.y=angle;
  }
  rod(g,timber,new THREE.Vector3(-width*.34,3,-depth*.3),new THREE.Vector3(width*.3,15,depth*.34),6);
  rod(g,timber,new THREE.Vector3(width*.28,2,-depth*.35),new THREE.Vector3(-width*.26,10,depth*.2),5);
  const post=box(g,timber,-width/2+8,38,depth/2-8,10,73,10);post.rotation.z=.13;
  for(let n=0;n<9;n++){
    const tile=box(g,roof,-width*.25+(n%3)*16,5+Math.floor(n/3)*3,12+Math.floor(n/3)*13,19,4,17);
    tile.rotation.set(.09,n*.38,(n%2?1:-1)*.13);
  }
  if(id==='sawmill'){
    for(let n=0;n<3;n++){const log=part(g,cylinder,mat(timber),width*.28+n*13,11,0,8,70,8);log.rotation.x=Math.PI/2;}
  }else if(id==='storage'){
    const crate=box(g,0x806044,23,17,depth*.18,31,28,27);crate.rotation.z=.26;
    box(g,timber,27,7,depth*.37,35,4,27).rotation.y=.4;
  }else if(id==='workshop'||forge){
    for(let row=0;row<3;row++)box(g,row%2?0x6b6860:0x858071,width*.22,8+row*14,-depth*.27,25,13,25);
    box(g,0x545d60,width*.19,20,depth*.1,38,8,24).rotation.z=-.18;
  }else{
    const door=box(g,timber,0,7,depth*.25,29,6,49);door.rotation.y=.17;
  }
  batchStaticMeshes(g);
  g.userData.buildingStage='ruined';
  return g;
}

export function createForge(repairStage: number): THREE.Group {
  const stage=Math.max(0,Math.min(3,Math.floor(repairStage)));
  if(stage===0)return createRuinedBuilding('forge');
  const g=new THREE.Group();
  box(g,0x77716c,0,21,0,110,42,75);
  for(let row=0;row<3;row++)for(let col=0;col<4;col++)box(g,row%2?0x8d8173:0xa39480,-42+col*26+(row%2)*5,8+row*13,42,24,12,14);
  box(g,0x414647,55,31,0,24,27,22);box(g,0x667273,55,48,0,52,11,35);
  const nose=part(g,cone,mat(0x667273),91,48,0,15,28,15);nose.rotation.z=-Math.PI/2;
  box(g,0x8b5334,-65,29,36,38,13,34);box(g,0x4b3428,-65,38,36,45,6,39);
  for(const x of [-79,30])box(g,0x5e4430,x,73,-40,10,145,10);
  box(g,0x785635,-24,144,-40,144,12,12);
  if(stage>=2){
    part(g,cylinder,mat(0x595655),-35,88,-20,18,100,18);
    const roof=box(g,0x485f68,-24,155,-32,153,10,110);roof.rotation.z=-.045;
    for(let n=0;n<7;n++)box(g,0x6b7e80,-95+n*23,162,-32,5,5,114);
  }else{
    rod(g,0x987751,new THREE.Vector3(-84,10,-35),new THREE.Vector3(-55,118,-35),3);
    rod(g,0x987751,new THREE.Vector3(32,10,-35),new THREE.Vector3(10,119,-35),3);
  }
  if(stage===3){
    part(g,orb,mat(0xee903d,0,0xe86519),0,49,14,22,.5*17,17);
    const light=new THREE.PointLight(0xff9c4a,2800,160,2);light.position.set(0,68,14);g.add(light);
  }
  batchStaticMeshes(g);
  g.userData.buildingStage=stage===3?'restored':'repairing';
  return g;
}

export function createBuilding(id: string, level: number): THREE.Group {
  if(level<=0)return createRuinedBuilding(id);
  const g = new THREE.Group();
  const wall = id === 'workshop' ? 0xaaa092 : id === 'house' ? 0xc6a37c : 0xb1936a;
  const roof = id === 'workshop' ? 0x526771 : id === 'house' ? 0x9e5c45 : id==='storage'?0x53786b:0x9b7a50;
  const {width,depth}=SETTLEMENT_BUILDINGS[id as keyof typeof SETTLEMENT_BUILDINGS];
  const h = 78 + Math.min(level, 8) * 6;
  // Raised stone foundation, solid walls, pitched roof, doors and windows are all world geometry.
  box(g,0x888779,0,7,0,width+5,14,depth+5);
  for(const side of [-1,1])for(let n=0;n<5;n++){
    box(g,n%2?0x9c9987:0x8c8b7c,(n-2)*(width+4)/5,7,side*(depth/2+3),
      (width+4)/5-2,11,4);
    box(g,n%2?0x949384:0xa39e8c,side*(width/2+3),7,(n-2)*(depth+4)/5,
      4,11,(depth+4)/5-2);
  }
  for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
    ball(g, 0x8a8575, sideX * (width / 2 - 12), 8, sideZ * (depth / 2 - 12), 15, 9, 15);
  }
  box(g, 0x989082, 0, 4, depth / 2 + 17, 49, 8, 35);
  box(g, wall, 0, h * 0.5 + 14, 0, width, h, depth);
  // Timber courses connect the front to the side walls and ground foundation.
  for(const side of [-1,1]){
    box(g,0x71513c,side*(width/2+1),h*.5+14,0,5,h+3,depth+4);
    box(g,wall,side*(width/2+4),h*.5+14,0,2,h-9,depth-22);
    box(g,0x674a36,side*(width/2+5),17,0,5,6,depth+5);
  }
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

/** Closed masonry annulus, with an opaque interior from every game camera. */
export function createSettlementWell(): THREE.Group {
  const root=new THREE.Group(),stone=mat(0x898373),inner=mat(0x645f54).clone();
  inner.userData.sharedArtMaterial=false;
  const outline=new THREE.Shape();outline.absarc(0,0,49,0,Math.PI*2,false);
  const hole=new THREE.Path();hole.absarc(0,0,35,0,Math.PI*2,true);outline.holes.push(hole);
  const shell=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:42,steps:1,curveSegments:6,bevelEnabled:false}),stone);
  shell.rotation.x=-Math.PI/2;shell.position.y=2;shell.castShadow=shell.receiveShadow=true;root.add(shell);
  inner.side=THREE.BackSide;
  const lining=new THREE.Mesh(new THREE.CylinderGeometry(35,33,38,24,1,true),inner);
  lining.position.y=21;root.add(lining);
  const water=new THREE.Mesh(new THREE.CircleGeometry(33,24),mat(0x397a86,.22));
  water.rotation.x=-Math.PI/2;water.position.y=12;water.receiveShadow=true;root.add(water);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(43,7,6,24),mat(0xa9a18a));
  rim.rotation.x=Math.PI/2;rim.position.y=44;rim.castShadow=rim.receiveShadow=true;root.add(rim);
  for(const side of [-1,1])box(root,0x6f5942,side*51,58,0,9,116,9);
  box(root,0x6f5942,0,116,0,119,10,12);
  rod(root,0x8d7655,new THREE.Vector3(-48,99,0),new THREE.Vector3(48,99,0),4);
  rod(root,0xb09a73,new THREE.Vector3(0,99,0),new THREE.Vector3(0,20,0),1.1);
  const owned=new Set([shell.geometry,lining.geometry,water.geometry,rim.geometry]);
  root.traverse(o=>{if(o instanceof THREE.Mesh){
    // Settlement batching disposes its input geometries. Helpers use shared
    // unit shapes, so copy them before handing ownership to the settlement.
    if(!owned.has(o.geometry))o.geometry=o.geometry.clone();
    o.userData.settlementOwned=true;
  }});
  return root;
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
