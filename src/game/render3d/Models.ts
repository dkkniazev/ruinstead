import { withNatureAsset } from './NatureAssets';
import * as THREE from 'three';
import type { WeaponId } from '../combat/WeaponDefinitions';

const cube = new THREE.BoxGeometry(1, 1, 1);
const orb = new THREE.IcosahedronGeometry(1, 1);
const cone = new THREE.ConeGeometry(1, 1, 6);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
const materials = new Map<string, THREE.MeshStandardMaterial>();

function mat(color: number, metalness = 0, emissive = 0): THREE.MeshStandardMaterial {
  const key = `${color}-${metalness}-${emissive}`;
  let value = materials.get(key);
  if (!value) {
    value = new THREE.MeshStandardMaterial({ color, metalness, roughness: metalness ? 0.48 : 0.88, emissive, emissiveIntensity: emissive ? 0.35 : 0, flatShading: true });
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
  step: (seconds: number, speed: number, dash?: boolean, attack?: boolean, travel?: number, turning?: number) => void;
  setWeapon?: (weapon: WeaponId) => void;
};

export function createHero(): AnimatedModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const leather = 0x5b4539;
  const dark = 0x2e3031;
  const steel = 0x9eabb0;
  const blue = 0x355f78;
  const skin = 0xe0aa77;
  const gold = 0xd0a451;
  // Every limb has its own pivot. The old sprite remains only as the invisible Arcade collider.
  box(body, blue, 0, 65, 0, 34, 37, 22);
  box(body, leather, 0, 44, 0, 35, 10, 24);
  box(body, gold, 0, 49, 12.4, 29, 4, 3);
  box(body, dark, 0, 36, 0, 32, 21, 24);
  ball(body, skin, 0, 98, 2, 16, 18, 15);
  ball(body, dark, 0, 111, -2, 17, 8, 16);
  box(body, dark, 0, 106, -12, 28, 10, 9);
  ball(body, 0x382a25, -6, 99, 16.5, 1.8, 2, 1);
  ball(body, 0x382a25, 6, 99, 16.5, 1.8, 2, 1);
  box(body, steel, 0, 82, 0, 5, 8, 25);
  ball(body, gold, 0, 84, 14, 5, 5, 3);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-10, 37, 0);
  rightLeg.position.set(10, 37, 0);
  body.add(leftLeg, rightLeg);
  for (const leg of [leftLeg, rightLeg]) {
    box(leg, dark, 0, -11, 0, 12, 25, 14);
    ball(leg, leather, 0, -25, 0, 7, 7, 8);
    box(leg, leather, 0, -31, 6, 14, 15, 24);
    box(leg, steel, 0, -20, 6, 13, 5, 15);
  }

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-23, 78, 0);
  rightArm.position.set(23, 78, 0);
  body.add(leftArm, rightArm);
  for (const [arm, side] of [[leftArm, -1], [rightArm, 1]] as const) {
    ball(arm, steel, side * 2, -1, 0, 13, 9, 13);
    box(arm, blue, 0, -13, 0, 11, 22, 11);
    ball(arm, steel, 0, -27, 0, 7, 7, 7);
    box(arm, leather, 0, -37, 0, 10, 19, 10);
    ball(arm, skin, 0, -48, 0, 6, 7, 6);
  }

  const cape = new THREE.Group();
  cape.position.set(0, 84, -13);
  body.add(cape);
  const capePanel = box(cape, 0x793c37, 0, -27, -4, 31, 55, 4);
  capePanel.rotation.x = -0.13;
  box(cape, gold, 0, -6, -2, 33, 5, 5);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -47, 1);
  rightArm.add(weaponMount);
  let currentWeapon: WeaponId = 'axe';
  const setWeapon = (weapon: WeaponId): void => {
    if (currentWeapon === weapon && weaponMount.children.length) return;
    weaponMount.clear();
    currentWeapon = weapon;
    const long = weapon === 'spear' ? 82 : weapon === 'hammer' ? 62 : 54;
    rod(weaponMount, leather, new THREE.Vector3(0, -10, 0), new THREE.Vector3(0, long, 0), 3.5);
    if (weapon === 'axe') {
      box(weaponMount, steel, 10, long - 7, 0, 24, 19, 5);
      box(weaponMount, gold, 0, long - 17, 0, 5, 3, 7);
    } else if (weapon === 'hammer') {
      box(weaponMount, steel, 0, long - 5, 0, 31, 16, 16);
    } else if (weapon === 'spear') {
      const tip = part(weaponMount, cone, mat(steel, 0.55), 0, long + 7, 0, 6, 23, 6);
      tip.rotation.z = Math.PI;
    } else {
      const blade = box(weaponMount, steel, 0, long - 7, 0, weapon === 'daggers' ? 5 : 7, 28, 4);
      blade.material = mat(steel, 0.55);
      box(weaponMount, gold, 0, long - 22, 0, 18, 4, 7);
    }
  };
  setWeapon('axe');

  let phase = 0;
  let spring = 0;
  let springVelocity = 0;
  let turnSpring = 0;
  let turnVelocity = 0;
  let attackPhase = 0;
  return {
    root,
    setWeapon,
    step(seconds, speed, dash = false, attack = false, travel = 0, turning = 0) {
      const dt = Math.min(seconds, 0.05);
      const motion = Math.min(speed / 225, 1.7);
      phase += Math.min(65, travel) * 0.063;
      const stride = Math.min(0.82, motion * 0.65);
      leftLeg.rotation.x = Math.sin(phase) * stride;
      rightLeg.rotation.x = -Math.sin(phase) * stride;
      leftArm.rotation.x = -Math.sin(phase) * stride * 0.8 - 0.12;
      rightArm.rotation.x = Math.sin(phase) * stride * 0.55 - 0.28;
      leftArm.rotation.z = -0.16;
      rightArm.rotation.z = 0.16;
      const targetLean = dash ? 0.4 : motion * 0.11;
      springVelocity += (targetLean - spring) * 65 * dt;
      springVelocity *= Math.exp(-10 * dt);
      spring += springVelocity * dt;
      turnVelocity += (Math.max(-0.25, Math.min(0.25, turning * 0.11)) - turnSpring) * 72 * dt;
      turnVelocity *= Math.exp(-11 * dt);
      turnSpring += turnVelocity * dt;
      body.rotation.x = spring;
      body.rotation.z = Math.sin(phase) * motion * 0.045 - turnSpring;
      body.position.y = Math.abs(Math.sin(phase)) * motion * 3;
      cape.rotation.x += ((-0.15 - motion * 0.26 - spring * 0.5) - cape.rotation.x) * Math.min(1, dt * 7);
      cape.rotation.z = Math.sin(phase * 0.6) * 0.07;
      if (attack) attackPhase = Math.min(1, attackPhase + dt * 6);
      else attackPhase = Math.max(0, attackPhase - dt * 5);
      rightArm.rotation.x -= Math.sin(attackPhase * Math.PI) * 1.3;
      rightArm.rotation.z += Math.sin(attackPhase * Math.PI) * 0.5;
    },
  };
}

function eye(parent: THREE.Object3D, x: number, y: number, z: number, scale = 3): void {
  ball(parent, 0xf6ead4, x, y, z, scale, scale * 0.8, scale * 0.55);
  ball(parent, 0x25241e, x, y, z + scale * 0.48, scale * 0.38);
}

export function createCreature(id: string, primary: number, accent: number, large = false): AnimatedModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const legs: THREE.Group[] = [];
  const arms: THREE.Group[] = [];
  let float = false;
  const is = (...terms: string[]) => terms.some((term) => id.includes(term));
  if (is('slime', 'wisp', 'spirit', 'emberling', 'gale')) {
    float = true;
    ball(body, primary, 0, 27, 0, 25, 23, 24);
    ball(body, accent, 0, 12, 0, 29, 9, 25);
    eye(body, -8, 32, 21, 4);
    eye(body, 8, 32, 21, 4);
    for (let n = 0; n < 4; n++) ball(body, accent, Math.cos(n * 2) * 25, 14 + n * 8, Math.sin(n * 2) * 18, 5);
  } else if (is('boar', 'jackal', 'hound', 'cat', 'ram', 'stalker', 'salamander', 'drake', 'wyvern')) {
    ball(body, primary, 0, 34, 0, 31, 23, 42);
    ball(body, accent, 0, 41, 31, 24, 20, 24);
    ball(body, primary, 0, 29, 51, 13, 10, 16);
    for (const side of [-1, 1]) {
      eye(body, side * 13, 46, 48, 3.5);
      const ear = part(body, cone, mat(accent), side * 17, 66, 29, 8, 25, 9);
      ear.rotation.z = side * 0.25;
      for (const z of [-25, 27]) {
        const leg = new THREE.Group(); leg.position.set(side * 22, 28, z); body.add(leg); legs.push(leg);
        box(leg, primary, 0, -12, 0, 10, 27, 11);
        box(leg, 0x3b302c, 0, -26, 5, 13, 8, 17);
      }
    }
    if (is('boar', 'ram')) {
      for (const side of [-1, 1]) {
        const horn = part(body, cone, mat(0xe8d6a5), side * 19, 61, 42, 6, 26, 7);
        horn.rotation.z = side * 0.55;
      }
    }
    if (is('wyvern', 'drake')) {
      for (const side of [-1, 1]) {
        const wing = box(body, accent, side * 42, 61, -9, 58, 5, 38);
        wing.rotation.z = side * 0.24;
      }
      const tail = part(body, cone, mat(primary), 0, 32, -67, 12, 65, 12);
      tail.rotation.x = -Math.PI / 2;
    }
  } else if (is('scorpion', 'spider', 'beetle')) {
    ball(body, primary, 0, 27, -8, 29, 20, 35);
    ball(body, accent, 0, 26, 26, 22, 16, 22);
    eye(body, -7, 34, 45, 3); eye(body, 7, 34, 45, 3);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const leg = new THREE.Group(); leg.position.set(side * 21, 22, 24 - i * 22); body.add(leg); legs.push(leg);
      rod(leg, primary, new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 32, 2, 0), 3.5);
      rod(leg, accent, new THREE.Vector3(side * 32, 2, 0), new THREE.Vector3(side * 48, -20, 4), 3);
    }
    if (id.includes('scorpion')) {
      rod(body, primary, new THREE.Vector3(0, 28, -34), new THREE.Vector3(0, 56, -62), 6);
      rod(body, accent, new THREE.Vector3(0, 56, -62), new THREE.Vector3(0, 75, -42), 5);
      part(body, cone, mat(accent), 0, 71, -39, 8, 22, 8).rotation.x = 0.5;
    }
  } else if (is('mushroom')) {
    part(body, cylinder, mat(0xdac9a7), 0, 26, 0, 15, 43, 15);
    part(body, cone, mat(accent), 0, 61, 0, 41, 35, 41);
    eye(body, -7, 33, 14, 3); eye(body, 7, 33, 14, 3);
    for (const side of [-1, 1]) ball(body, primary, side * 16, 12, 0, 9, 7, 13);
  } else if (is('bat', 'harpy', 'vulture')) {
    float = true;
    ball(body, primary, 0, 48, 0, 18, 25, 15);
    ball(body, accent, 0, 78, 5, 16, 17, 15);
    eye(body, -7, 80, 18); eye(body, 7, 80, 18);
    for (const side of [-1, 1]) {
      const wing = box(body, primary, side * 43, 60, -5, 70, 4, 42);
      wing.rotation.z = side * 0.28;
      part(body, cone, mat(accent), side * 11, 14, 0, 6, 30, 6).rotation.z = Math.PI;
    }
  } else if (is('elemental', 'golem', 'colossus', 'giant', 'guardian', 'worm', 'serpent')) {
    ball(body, primary, 0, 60, 0, 32, 37, 27);
    box(body, accent, 0, 64, 24, 28, 9, 7);
    ball(body, primary, 0, 104, 2, 19, 19, 18);
    eye(body, -8, 107, 17, 3.5); eye(body, 8, 107, 17, 3.5);
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * 39, 82, 0); body.add(arm); arms.push(arm);
      ball(arm, accent, 0, -10, 0, 16, 20, 16);
      ball(arm, primary, side * 5, -37, 4, 17, 18, 17);
      const leg = new THREE.Group(); leg.position.set(side * 17, 38, 0); body.add(leg); legs.push(leg);
      box(leg, primary, 0, -15, 0, 22, 30, 23);
      box(leg, accent, 0, -30, 7, 25, 12, 29);
    }
  } else {
    // Humanoid species have articulated hips, shoulders, faces and weapons.
    box(body, primary, 0, 54, 0, 31, 34, 23);
    box(body, accent, 0, 37, 0, 32, 10, 25);
    ball(body, primary, 0, 85, 0, 16, 18, 16);
    eye(body, -7, 87, 14, 3); eye(body, 7, 87, 14, 3);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * 10, 34, 0); body.add(leg); legs.push(leg);
      box(leg, accent, 0, -13, 0, 12, 25, 13);
      box(leg, 0x39352e, 0, -27, 5, 14, 10, 21);
      const arm = new THREE.Group(); arm.position.set(side * 22, 67, 0); body.add(arm); arms.push(arm);
      box(arm, primary, 0, -13, 0, 11, 27, 12);
      ball(arm, accent, 0, -28, 1, 7);
      const ear = part(body, cone, mat(primary), side * 18, 93, 0, 7, 18, 7);
      ear.rotation.z = side * -0.45;
    }
    rod(body, 0x684d39, new THREE.Vector3(28, 34, 6), new THREE.Vector3(36, 93, 8), 3);
    box(body, 0xc0c7bb, 37, 88, 9, 15, 17, 6);
  }
  if (large) {
    root.scale.setScalar(1.38);
    ball(body, accent, 0, 122, 0, 8, 8, 8);
  }
  let phase = 0;
  return {
    root,
    step(seconds, speed) {
      phase += Math.min(seconds, 0.05) * (3 + Math.min(speed / 50, 3) * 4);
      const amount = Math.min(speed / 150, 1);
      legs.forEach((leg, index) => { leg.rotation.x = Math.sin(phase + index * Math.PI * 0.75) * amount * 0.4; });
      arms.forEach((arm, index) => { arm.rotation.x = Math.sin(phase + index * Math.PI) * amount * 0.32; });
      body.position.y = float ? Math.sin(phase * 0.65) * 7 : Math.abs(Math.sin(phase)) * amount * 2;
      body.rotation.z = Math.sin(phase) * amount * 0.035;
    },
  };
}

export function createTree(seed: number, region: number): THREE.Group {
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
  const visual = withNatureAsset(asset, 136 + Math.abs(seed % 5) * 6, group);
  visual.rotation.y = (Math.abs(seed) % 12) * 0.37;
  return visual;
}

export function createRock(seed: number, region: number): THREE.Group {
  const group = new THREE.Group();
  const stone = region === 2 || region === 7 ? 0xb69a70 : region === 4 || region === 8 ? 0x514745 : 0x838b7d;
  ball(group, stone, -5, 11, 0, 21 + seed % 9, 13 + seed % 7, 19 + seed % 8);
  if (seed % 3 !== 0) ball(group, 0xa9aa91, 12, 9, -6, 7, 5, 8);
  const visual = withNatureAsset(seed % 2 ? 'rock_largeA' : 'rock_largeC', 31 + Math.abs(seed % 8), group);
  visual.rotation.y = (Math.abs(seed) % 10) * 0.43;
  return visual;
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

export function createBuilding(id: string, level: number): THREE.Group {
  const g = new THREE.Group();
  const wall = id === 'workshop' ? 0xaaa092 : id === 'house' ? 0xc6a37c : 0xb1936a;
  const roof = id === 'workshop' ? 0x575e63 : id === 'house' ? 0x9b4d42 : 0x6e644b;
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
  const slopeWidth = width * 0.64;
  for (const side of [-1, 1]) {
    const slope = box(g, roof, side * width * 0.25, h + 35, 0, slopeWidth, 8, depth + 26);
    slope.rotation.z = side * -0.53;
    for (let n = 0; n < 5; n++) {
      const slat = box(g, 0x60483c, side * (width * 0.25 + (n - 2) * 12), h + 36 + side * (n - 2) * 7, 0, 3, 5, depth + 28);
      slat.rotation.z = side * -0.53;
    }
  }
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
  if (level > 0) {
    rod(g, 0x594733, new THREE.Vector3(-width / 2 + 13, h + 52, -depth / 2), new THREE.Vector3(-width / 2 + 13, h + 115, -depth / 2), 3);
    const flag = box(g, 0xb46c49, -width / 2 + 28, h + 105, -depth / 2, 28, 14, 3);
    flag.rotation.z = 0.08;
  }
  return g;
}

export function createResource(type: string, region: number, seed = 24): THREE.Group {
  const g = new THREE.Group();
  const markerColor = type === 'wood' ? 0x84d16c : type === 'stone' ? 0xe4c17a : type === 'metal' ? 0xc2c9cd : type === 'crystal' ? 0x6de2ed : 0xa5d96f;
  const marker = new THREE.Mesh(new THREE.RingGeometry(29, 34, 24), new THREE.MeshBasicMaterial({ color: markerColor, transparent: true, opacity: 0.76, depthWrite: false, side: THREE.DoubleSide }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 5;
  g.add(marker);
  if (type === 'wood') {
    g.add(createTree(seed, region));
  } else if (type === 'fiber') {
    for (const side of [-1, 1]) {
      rod(g, 0x6a914e, new THREE.Vector3(side * 8, 0, 0), new THREE.Vector3(side * 15, 40, 0), 3);
      ball(g, 0x9dbe68, side * 15, 42, 0, 15, 11, 13);
    }
    const shrub = new THREE.Group();
    for (const child of [...g.children].slice(1)) { g.remove(child); shrub.add(child); }
    g.add(withNatureAsset(seed % 2 ? 'plant_bushDetailed' : 'plant_flatTall', 44, shrub));
  } else if (type === 'crystal') {
    for (const [x, size] of [[-15, 34], [6, 54], [24, 29]]) {
      const crystal = part(g, cone, mat(0x65c9d1, 0.25, 0x247580), x, size / 2, 0, 13, size, 13);
      crystal.rotation.y = x * 0.03;
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
