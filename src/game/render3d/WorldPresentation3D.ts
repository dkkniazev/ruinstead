import { WorldMap } from '../ui/WorldMap';
import * as THREE from 'three';
import Phaser from 'phaser';
import type { PlayerController } from '../player/PlayerController';
import type { EnemySystem, EnemyUnit } from '../enemies/EnemySystem';
import type { BossSystem, BossUnit } from '../bosses/BossSystem';
import type { ResourceSystem } from '../gathering/ResourceSystem';
import type { ChestSystem } from '../world/ChestSystem';
import type { CityBuilderSystem } from '../settlement/CityBuilderSystem';
import { FORGE_POSITION } from '../settlement/SettlementSystem';
import { regionNormalizedDistance, RELEASE_PASSAGES, RELEASE_REGIONS, type RegionPassage } from '../world/ReleaseRegionMap';
import { SETTLEMENT_CENTER } from '../world/WorldPrototype';
import { createBuilding, createChest, createCreature, createHero, type AnimatedModel } from './Models';

import { terrainHeight, passageHeight, TERRAIN_PASSAGES } from '../world/WorldTerrain';
import { createBoundaryGround, createRegionLand, REGION_PALETTES } from './TerrainMeshes';

import { createBossTelegraph, disposeBossTelegraph } from './BossTelegraph3D';
import { ResourceVisual3D } from './ResourceVisual3D';

const TILE = 640;
const palettes = REGION_PALETTES;

function random(a: number, b: number, c = 0): number {
  const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return n - Math.floor(n);
}


function islandAt(x: number, z: number): { region: number; distance: number } {
  let region = 1;
  let distance = Infinity;
  for (const item of RELEASE_REGIONS) {
    const d = regionNormalizedDistance(item, x, z);
    if (d < distance) { distance = d; region = item.id; }
  }
  return { region, distance };
}


type Actor = { model: AnimatedModel; lastX: number; lastY: number; health: THREE.Group; healthFill: THREE.Mesh; telegraph?: THREE.Mesh };

export class WorldPresentation3D {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-640, 640, 360, -360, 1, 5000);
  private readonly hero = createHero();
  private readonly sun = new THREE.DirectionalLight(0xffe6bd, 2.4);
  private readonly sunTarget = new THREE.Object3D();
  private readonly landRegions = new Map<number, THREE.Group>();
  private readonly chunks = new Map<string, THREE.Group>();
  private readonly actors = new Map<EnemyUnit | BossUnit, Actor>();
  private readonly resources = new Map<string, ResourceVisual3D>();
  private readonly chests = new Map<string, THREE.Group>();
  private readonly pickups: THREE.Group[] = [];
  private readonly settlement = new THREE.Group();
  private readonly bridges = new Map<string, { group: THREE.Group; centerX: number; centerZ: number; gate: THREE.Group; gap: THREE.Group }>();
  private readonly buildingGroups = new Map<string, { level: number; model: THREE.Group }>();
  private readonly worldMap: WorldMap;
  private frame = 0;
  private lastFacing = 0;
  private lastHeroX = 0;
  private lastHeroY = 0;
  private lastAttackAt = 0;
  private lastRectWidth = 0;
  private lastRectHeight = 0;
  private resizeObserver?: ResizeObserver;

  constructor(
    private readonly phaser: Phaser.Scene,
    private readonly player: PlayerController,
    private readonly enemies: EnemySystem,
    private readonly bosses: BossSystem,
    private readonly resourceSystem: ResourceSystem,
    private readonly chestSystem: ChestSystem,
    private readonly city: CityBuilderSystem,
    private readonly isPassageOpen: (passage: RegionPassage) => boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const parent = phaser.game.canvas.parentElement;
    if (!parent) throw new Error('Game canvas has no parent');
    parent.appendChild(this.renderer.domElement);
    const canvas = this.renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.zIndex = '1';
    canvas.style.pointerEvents = 'none';
    canvas.style.margin = '0';
    phaser.game.canvas.style.position = 'relative';
    phaser.game.canvas.style.zIndex = '2';
    phaser.game.canvas.style.background = 'transparent';

    this.scene.background = new THREE.Color(0x8fa478);
    this.scene.fog = new THREE.FogExp2(0x96a486, 0.00034);
    this.scene.add(new THREE.HemisphereLight(0xd4e5ff, 0x746345, 1.12));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    this.sun.intensity = 2.0;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -950;
    this.sun.shadow.camera.right = 950;
    this.sun.shadow.camera.top = 950;
    this.sun.shadow.camera.bottom = -950;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 2500;
    this.sun.shadow.bias = -0.00035;
    this.scene.add(this.sun, this.sunTarget);
    this.sun.target = this.sunTarget;

    this.scene.add(this.hero.root);
    for (const region of RELEASE_REGIONS) {
      const land = createRegionLand(region);
      this.landRegions.set(region.id, land);
      this.scene.add(land);
    }
    this.lastHeroX = player.sprite.x;
    this.lastHeroY = player.sprite.y;
    this.createSettlement();
    this.scene.add(this.settlement);
    this.createBridges();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(phaser.game.canvas);
    window.addEventListener('resize', this.resize);
    this.worldMap = new WorldMap(isPassageOpen, open => {
      if (open) { this.phaser.scene.pause(); this.phaser.scene.pause('HudScene'); }
      else { this.phaser.scene.resume(); this.phaser.scene.resume('HudScene'); }
    });
    this.update(0, 16);
  }

  private resize = (): void => {
    const source = this.phaser.game.canvas;
    const parent = source.parentElement;
    if (!parent) return;
    const rect = source.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const canvas = this.renderer.domElement;
    canvas.style.left = `${rect.left - parentRect.left}px`;
    canvas.style.top = `${rect.top - parentRect.top}px`;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    if (Math.abs(rect.width - this.lastRectWidth) < 1 && Math.abs(rect.height - this.lastRectHeight) < 1) return;
    this.lastRectWidth = rect.width;
    this.lastRectHeight = rect.height;
    this.renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    const aspect = Math.max(0.2, rect.width / Math.max(1, rect.height));
    const height = aspect < 0.85 ? 1200 : 1080;
    this.camera.left = -height * aspect / 2;
    this.camera.right = height * aspect / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
  };

  update(time: number, delta: number): void {
    const dt = Math.min(0.05, Math.max(0, delta / 1000));
    const x = this.player.sprite.x;
    const z = this.player.sprite.y;
    const velocity = (this.player.sprite.body as Phaser.Physics.Arcade.Body).velocity;
    const speed = Math.hypot(velocity.x, velocity.y);
    const harvest = this.resourceSystem.visualHarvestAction;
    const harvesting = !!harvest && time - harvest.hitAt < 580;
    const facing = harvesting && speed < 20
      ? Math.atan2(harvest.x - x, harvest.y - z)
      : speed > 20 ? Math.atan2(velocity.x, velocity.y) : Math.atan2(this.player.visualFacing.x, this.player.visualFacing.y);
    const difference = Math.atan2(Math.sin(facing - this.lastFacing), Math.cos(facing - this.lastFacing));
    this.lastFacing += difference * Math.min(1, dt * 13);
    this.hero.root.rotation.y = this.lastFacing;
    this.hero.root.position.set(x, terrainHeight(x, z) + 5, z);
    this.hero.setWeapon?.(this.player.visualWeaponId);
    const threatened = this.enemies.isPlayerThreatened() || this.bosses.isPlayerThreatened();
    const attacking = (harvesting && time - harvest.hitAt < 200) || (threatened && time - this.lastAttackAt < 130);
    if (threatened && time - this.lastAttackAt > 650) this.lastAttackAt = time;
    const travel = Math.hypot(x - this.lastHeroX, z - this.lastHeroY);
    this.hero.step(dt, speed, this.player.isDashing(time), attacking, travel, difference);
    this.lastHeroX = x;
    this.lastHeroY = z;

    const groundHeight = terrainHeight(x, z);
    const target = new THREE.Vector3(x, groundHeight + 36, z + 35);
    this.camera.position.copy(target).add(new THREE.Vector3(0, 1250, 1080));
    this.camera.lookAt(target);
    this.sun.position.set(x - 460, groundHeight + 950, z + 410);
    this.sunTarget.position.set(x, groundHeight, z);

    const region = islandAt(x, z).region;
    const palette = palettes[region];
    (this.scene.background as THREE.Color).setHex(palette[1]).multiplyScalar(0.86);
    (this.scene.fog as THREE.FogExp2).color.copy(this.scene.background as THREE.Color);
    this.settlement.visible = Math.hypot(x - SETTLEMENT_CENTER.x, z - SETTLEMENT_CENTER.y) < 2100;
    for (const [id, bridge] of this.bridges) {
      bridge.group.visible = Math.hypot(x - bridge.centerX, z - bridge.centerZ) < 1900;
      const passage = RELEASE_PASSAGES.find((item) => item.id === id)!;
      const open = this.isPassageOpen(passage);
      bridge.gate.visible = !open;
      bridge.gap.visible = open || id !== '1-2';
    }
    for (const region of RELEASE_REGIONS) {
      this.landRegions.get(region.id)!.visible = Math.hypot(x-region.center[0], z-region.center[1]) < Math.hypot(region.radiusX,region.radiusY)+2100;
    }
    this.updateTerrain(x, z);
    this.updateActors(dt, x, z);
    this.updateResources(x, z, time);
    if (this.frame++ % 4 === 0) {
      this.updateChests(x, z);
      this.updateBuildings();
    }
    this.updatePickups(x, z, time);
    if (this.frame % 10 === 0) this.resize();
    const hud = this.phaser.scene.get('HudScene') as Phaser.Scene & { hasOpenPanel?: boolean };
    this.worldMap.setObscured(hud?.hasOpenPanel ?? false);
    this.worldMap.update(time, () => ({
      x, y: z, facing: this.lastFacing, home: SETTLEMENT_CENTER,
      markers: [
        ...this.resourceSystem.visualNodes.filter(n => n.available).map(n => ({x:n.x,y:n.y,kind:n.type})),
        ...this.bosses.visualUnits.filter(b => b.alive).map(b => ({x:b.sprite.x,y:b.sprite.y,kind:'boss' as const})),
        ...this.enemies.visualUnits.filter(e => e.alive && Math.hypot(e.sprite.x-x,e.sprite.y-z)<2700).map(e => ({x:e.sprite.x,y:e.sprite.y,kind:'enemy' as const})),
      ],
    }));
    this.renderer.render(this.scene, this.camera);
  }

  private updateTerrain(x: number, z: number): void {
    const tx = Math.floor(x / TILE);
    const tz = Math.floor(z / TILE);
    const needed = new Set<string>();
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const cx = tx + dx;
      const cz = tz + dz;
      const key = `${cx}:${cz}`;
      needed.add(key);
      if (!this.chunks.has(key)) {
        const chunk = this.createChunk(cx, cz);
        this.chunks.set(key, chunk);
        this.scene.add(chunk);
      }
    }
    for (const [key, chunk] of this.chunks) if (!needed.has(key)) {
      this.scene.remove(chunk);
      chunk.traverse((object) => { if (object instanceof THREE.Mesh && object.geometry !== undefined) {
        // Terrain and foliage geometries are unique; model geometries are shared.
        if (object.userData.uniqueGeometry) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) object.material.dispose();
        }
      } });
      this.chunks.delete(key);
    }
  }

  private createChunk(cx: number, cz: number): THREE.Group {
    const wx = (cx + 0.5) * TILE;
    const wz = (cz + 0.5) * TILE;
    const region = islandAt(wx, wz).region;
    const group = createBoundaryGround(wx, wz, TILE);
    const grassGeometry = new THREE.ConeGeometry(3.5, 17, 3);
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 90);
    const instance = new THREE.Object3D();
    for (let i = 0; i < 90; i++) {
      const gx = cx * TILE + random(cx, cz, i * 7 + 81) * TILE;
      const gz = cz * TILE + random(cx, cz, i * 7 + 82) * TILE;
      const nearTown = Math.hypot(gx - SETTLEMENT_CENTER.x, gz - SETTLEMENT_CENTER.y) < 510;
      const onIsland = islandAt(gx, gz).distance < 0.96;
      instance.position.set(gx, terrainHeight(gx, gz) + (nearTown || !onIsland ? -100 : 7), gz);
      instance.rotation.y = random(gx, gz) * Math.PI;
      instance.scale.setScalar(0.7 + random(gz, gx) * 1.4);
      instance.updateMatrix();
      grass.setMatrixAt(i, instance.matrix);
      const green = region === 2 || region === 7 ? new THREE.Color(0x9b9867) : region === 4 || region === 8 ? new THREE.Color(0x725747) : new THREE.Color(i % 3 ? 0x598449 : 0x7c9d56);
      grass.setColorAt(i, green);
    }
    grass.instanceMatrix.needsUpdate = true;
    grass.userData.uniqueGeometry = true;
    group.add(grass);
    // Small ruined stone markers give the landscape vertical silhouettes.
    if (islandAt(wx, wz).distance < 0.86 && random(cx, cz, 77) > 0.84 && Math.hypot(wx - SETTLEMENT_CENTER.x, wz - SETTLEMENT_CENTER.y) > 700) {
      const ruin = new THREE.Group();
      const stone = new THREE.MeshStandardMaterial({ color: region === 4 || region === 8 ? 0x56504c : 0xaaa392, roughness: 1, flatShading: true });
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(24, 80 + random(cx, cz, side) * 65, 27), stone);
        pillar.position.set(side * 56, pillar.geometry.parameters.height / 2, 0);
        pillar.rotation.z = side * 0.06;
        pillar.castShadow = pillar.receiveShadow = true;
        pillar.userData.uniqueGeometry = true;
        ruin.add(pillar);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(145, 20, 33), stone);
      cap.position.y = 112;
      cap.castShadow = true;
      cap.userData.uniqueGeometry = true;
      ruin.add(cap);
      ruin.position.set(wx, terrainHeight(wx, wz), wz);
      group.add(ruin);
    }
    return group;
  }

  private updateActors(dt: number, x: number, z: number): void {
    const visible = new Set<EnemyUnit | BossUnit>();
    const units: Array<EnemyUnit | BossUnit> = [...this.enemies.visualUnits, ...this.bosses.visualUnits];
    for (const unit of units) {
      if (!unit.alive || Math.abs(unit.sprite.x - x) > 1750 || Math.abs(unit.sprite.y - z) > 1750) continue;
      visible.add(unit);
      let actor = this.actors.get(unit);
      if (!actor) {
        const model = createCreature(unit.definition.id, unit.definition.primaryColor, unit.definition.accentColor, 'rank' in unit ? unit.rank === 'elite' : true);
        if (!('rank' in unit)) model.root.scale.multiplyScalar(1.45);
        this.scene.add(model.root);
        const health = new THREE.Group();
        const boss = !('rank' in unit);
        const width = boss ? 88 : 58;
        const back = new THREE.Mesh(new THREE.PlaneGeometry(width + 5, 10), new THREE.MeshBasicMaterial({ color: 0x242920, depthTest: false }));
        const fill = new THREE.Mesh(new THREE.PlaneGeometry(width, 6), new THREE.MeshBasicMaterial({ color: boss ? 0xe2a456 : 0x8ed26b, depthTest: false }));
        back.position.z = -0.2;
        health.add(back, fill);
        health.renderOrder = 100;
        this.scene.add(health);
        actor = { model, lastX: unit.sprite.x, lastY: unit.sprite.y, health, healthFill: fill };
        this.actors.set(unit, actor);
      }
      const px = unit.sprite.x;
      const pz = unit.sprite.y;
      const velocity = unit.sprite.body as Phaser.Physics.Arcade.Body | null;
      const vx = velocity?.velocity.x ?? (px - actor.lastX) / Math.max(dt, 0.001);
      const vz = velocity?.velocity.y ?? (pz - actor.lastY) / Math.max(dt, 0.001);
      const speed = Math.hypot(vx, vz);
      actor.model.root.position.set(px, terrainHeight(px, pz) + 4, pz);
      if (speed > 5) actor.model.root.rotation.y = Math.atan2(vx, vz);
      else actor.model.root.rotation.y = Math.atan2(x - px, z - pz);
      actor.model.step(dt, speed);
      const boss = !('rank' in unit);
      const ratio = Math.max(0, Math.min(1, unit.visualHealthRatio));
      actor.health.visible = boss || ratio < 0.999 || ('rank' in unit && unit.rank === 'elite');
      actor.health.position.set(px, terrainHeight(px, pz) + (boss ? 200 : 114), pz);
      actor.health.quaternion.copy(this.camera.quaternion);
      actor.healthFill.scale.x = Math.max(0.001, ratio);
      actor.healthFill.position.x = -(boss ? 88 : 58) * (1 - ratio) / 2;
      if (boss) {
        const telegraph = unit.visualTelegraph;
        if (telegraph) {
          if (!actor.telegraph || actor.telegraph.userData.zone !== telegraph) {
            if (actor.telegraph) disposeBossTelegraph(actor.telegraph);
            actor.telegraph = createBossTelegraph(telegraph);
            this.scene.add(actor.telegraph);
          }
          actor.telegraph.visible = true;
        } else if (actor.telegraph) actor.telegraph.visible = false;
      }
      actor.lastX = px;
      actor.lastY = pz;
    }
    for (const [unit, actor] of this.actors) if (!visible.has(unit)) {
      this.scene.remove(actor.model.root);
      this.scene.remove(actor.health);
      if (actor.telegraph) disposeBossTelegraph(actor.telegraph);
      this.actors.delete(unit);
    }
  }

  private updateResources(x: number, z: number, time: number): void {
    const visible = new Set<string>();
    for (const node of this.resourceSystem.visualNodes) {
      const distance = Math.hypot(node.x - x, node.y - z);
      if ((!node.available && time - node.hitAt > 500) || distance > 1750) continue;
      visible.add(node.id);
      let visual = this.resources.get(node.id);
      if (!visual) {
        visual = new ResourceVisual3D(node, islandAt(node.x,node.y).region);
        this.resources.set(node.id,visual);this.scene.add(visual.root);
      }
      visual.update(node,time,distance,this.camera);
    }
    for(const [id,visual] of this.resources) if(!visible.has(id)) { visual.destroy();this.resources.delete(id); }
  }

  private updateChests(x: number, z: number): void {
    const visible = new Set<string>();
    for (const chest of this.chestSystem.visualChests) {
      if (Math.abs(chest.x - x) > 1600 || Math.abs(chest.y - z) > 1600) continue;
      const key = `${chest.id}:${chest.opened}`;
      visible.add(key);
      if (!this.chests.has(key)) {
        const model = createChest(chest.opened);
        model.position.set(chest.x, terrainHeight(chest.x, chest.y), chest.y);
        this.scene.add(model);
        this.chests.set(key, model);
      }
    }
    for (const [key, model] of this.chests) if (!visible.has(key)) {
      this.scene.remove(model);
      this.chests.delete(key);
    }
  }

  private updatePickups(x: number, z: number, time: number): void {
    const nodes = this.resourceSystem.visualPickups.filter((pickup) => Math.abs(pickup.x - x) < 800 && Math.abs(pickup.y - z) < 800).slice(0, 80);
    while (this.pickups.length < nodes.length) {
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(9), new THREE.MeshStandardMaterial({ color: 0xf2c55d, metalness: 0.25, roughness: 0.3, emissive: 0x5a3718, emissiveIntensity: 0.25 }));
      mesh.castShadow = true;
      g.add(mesh);
      this.pickups.push(g);
      this.scene.add(g);
    }
    this.pickups.forEach((model, index) => {
      const pickup = nodes[index];
      model.visible = !!pickup;
      if (!pickup) return;
      const color = pickup.type === 'crystal' ? 0x5fd4e0 : pickup.type === 'wood' ? 0xb08b51 : pickup.type === 'stone' ? 0xc1c3b5 : pickup.type === 'metal' ? 0xa9b6b7 : pickup.type === 'fiber' ? 0x91c775 : 0xf2c55d;
      ((model.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(color);
      model.position.set(pickup.x, terrainHeight(pickup.x, pickup.y) + 20 + Math.sin(time * 0.004 + index) * 4, pickup.y);
      model.rotation.y += 0.025;
    });
  }

  private createBridges(): void {
    for (const entry of TERRAIN_PASSAGES) {
      const passage = entry.passage;
      const length = entry.length;
      const middleX = (entry.a.x + entry.b.x) / 2, middleZ = (entry.a.y + entry.b.y) / 2;
      const group = new THREE.Group();
      group.position.set(middleX, 0, middleZ);
      group.rotation.y = Math.atan2(entry.ux, entry.uy);
      const timber = new THREE.MeshStandardMaterial({ color: 0x89674a, roughness: 0.95 });
      const stone = new THREE.MeshStandardMaterial({ color: passage.kind === 'lava-gate' ? 0x544c4a : 0x989187, roughness: 1 });
      const iron = new THREE.MeshStandardMaterial({ color: 0x353a3b, roughness: 0.55, metalness: 0.6 });
      const warning = new THREE.MeshStandardMaterial({ color: 0xbb513d, emissive: 0x842e1f, emissiveIntensity: 0.35 });
      const gap = new THREE.Group(); group.add(gap);
      const slope = Math.atan2(passageHeight(entry,1)-passageHeight(entry,0),length);
      const slabs = Math.max(3,Math.ceil(length/54));
      for (let i=0;i<slabs;i++) {
        const t=(i+0.5)/slabs, z=(t-0.5)*length;
        const slab=new THREE.Mesh(new THREE.BoxGeometry(passage.width,18,length/slabs/Math.cos(slope)+2),passage.kind==='bridge'?timber:stone);
        slab.position.set(0,passageHeight(entry,t)-9,z); slab.rotation.x=-slope;
        slab.castShadow=slab.receiveShadow=true;
        (Math.abs(z)<65 ? gap : group).add(slab);
      }
      const posts=Math.ceil(length/100);
      for(let i=0;i<=posts;i++) {
        const t=i/posts, z=(t-0.5)*length, height=passageHeight(entry,t);
        for(const side of [-1,1]) {
          const post=new THREE.Mesh(new THREE.BoxGeometry(12,46,12),stone);
          post.position.set(side*(passage.width/2-6),height+23,z);post.castShadow=true;group.add(post);
        }
      }
      for(const side of [-1,1]) {
        const rail=new THREE.Mesh(new THREE.BoxGeometry(9,10,length/Math.cos(slope)),timber);
        rail.position.set(side*(passage.width/2-6),passageHeight(entry,0.5)+43,0);
        rail.rotation.x=-slope;rail.castShadow=true;group.add(rail);
      }
      const gate=new THREE.Group();gate.position.y=passageHeight(entry,0.5);
      for(const side of [-1,1]) {
        const tower=new THREE.Mesh(new THREE.BoxGeometry(34,112,38),stone);
        tower.position.set(side*(passage.width/2-15),56,0);tower.castShadow=true;gate.add(tower);
      }
      for(const height of [16,72,105]) {
        const band=new THREE.Mesh(new THREE.BoxGeometry(passage.width-25,12,18),height===105?stone:warning);
        band.position.y=height;band.castShadow=true;gate.add(band);
      }
      const bars=Math.ceil(passage.width/27);
      for(let i=0;i<bars;i++) {
        const bar=new THREE.Mesh(new THREE.BoxGeometry(8,91,9),iron);
        bar.position.set((i-(bars-1)/2)*(passage.width-48)/(bars-1),47,0);bar.castShadow=true;gate.add(bar);
      }
      group.add(gate);this.scene.add(group);
      this.bridges.set(passage.id,{group,centerX:middleX,centerZ:middleZ,gate,gap});
    }
  }

  private createSettlement(): void {
    const baseX = SETTLEMENT_CENTER.x;
    const baseZ = SETTLEMENT_CENTER.y;
    const stone = new THREE.MeshStandardMaterial({ color: 0xa9a18a, roughness: 1, flatShading: true });
    const darkStone = new THREE.MeshStandardMaterial({ color: 0x827d71, roughness: 1, flatShading: true });
    const road = new THREE.MeshStandardMaterial({ color: 0xb1a58b, roughness: 1 });
    const roadEdge = new THREE.MeshStandardMaterial({ color: 0x827860, roughness: 1 });
    for (const building of this.city.visualBuildings) {
      const dx = building.x - baseX;
      const dz = building.y - baseZ;
      const length = Math.hypot(dx, dz);
      const segmentCount = Math.max(1, Math.ceil(length / 64));
      const direction = Math.atan2(dx, dz);
      for (let step = 0; step < segmentCount; step++) {
        const t = (step + 0.5) / segmentCount;
        const px = baseX + dx * t;
        const pz = baseZ + dz * t;
        const segment = new THREE.Group();
        const edge = new THREE.Mesh(new THREE.BoxGeometry(78, 2, length / segmentCount + 7), roadEdge);
        edge.position.y = 0;
        const surface = new THREE.Mesh(new THREE.BoxGeometry(68, 2, length / segmentCount + 5), road);
        surface.position.y = 2;
        surface.receiveShadow = true;
        segment.add(edge, surface);
        segment.position.set(px, terrainHeight(px, pz) + 5, pz);
        segment.rotation.y = direction;
        this.settlement.add(segment);
      }
    }
    // Central well, stone arch, brazier and banners replace the previous flat settlement pads.
    const well = new THREE.Mesh(new THREE.CylinderGeometry(52, 57, 42, 12, 1, true), darkStone);
    well.position.set(baseX + 105, terrainHeight(baseX + 105, baseZ + 42) + 24, baseZ + 42);
    well.castShadow = well.receiveShadow = true;
    this.settlement.add(well);
    const water = new THREE.Mesh(new THREE.CircleGeometry(49, 16), new THREE.MeshStandardMaterial({ color: 0x468e9a, metalness: 0.3, roughness: 0.28 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(baseX + 105, terrainHeight(baseX + 105, baseZ + 42) + 12, baseZ + 42);
    this.settlement.add(water);
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(12, 17, 105, 6), stone);
      pillar.position.set(baseX + side * 64, terrainHeight(baseX, baseZ - 138) + 55, baseZ - 138);
      pillar.castShadow = true;
      this.settlement.add(pillar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(155, 20, 32), stone);
    lintel.position.set(baseX, terrainHeight(baseX, baseZ - 138) + 111, baseZ - 138);
    lintel.castShadow = true;
    this.settlement.add(lintel);
    const forge = new THREE.Group();
    const f = (geo: THREE.BufferGeometry, color: number, xx: number, yy: number, zz: number): void => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }));
      mesh.position.set(xx, yy, zz); mesh.castShadow = mesh.receiveShadow = true; forge.add(mesh);
    };
    f(new THREE.BoxGeometry(110, 42, 75), 0x77716c, 0, 21, 0);
    f(new THREE.CylinderGeometry(18, 24, 100, 8), 0x595655, -35, 88, -20);
    f(new THREE.BoxGeometry(52, 11, 35), 0x484e50, 55, 48, 0);
    f(new THREE.CylinderGeometry(17, 25, 25, 8), 0xe1843e, 0, 52, 14);
    const light = new THREE.PointLight(0xff9c4a, 10000, 220, 2);
    light.position.set(0, 68, 14); forge.add(light);
    forge.position.set(FORGE_POSITION.x, terrainHeight(FORGE_POSITION.x, FORGE_POSITION.y), FORGE_POSITION.y);
    this.settlement.add(forge);
    this.updateBuildings();
  }

  private updateBuildings(): void {
    for (const building of this.city.visualBuildings) {
      const old = this.buildingGroups.get(building.id);
      if (old?.level === building.level) continue;
      if (old) this.settlement.remove(old.model);
      const model = createBuilding(building.id, building.level);
      model.position.set(building.x, terrainHeight(building.x, building.y), building.y);
      model.rotation.y = building.id === 'house' ? 0.2 : building.id === 'workshop' ? -0.24 : 0;
      this.settlement.add(model);
      this.buildingGroups.set(building.id, { level: building.level, model });
    }
  }

  destroy(): void {
    this.worldMap.destroy();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.resize);
    this.phaser.cameras.main.setVisible(true);
    for (const visual of this.resources.values()) visual.destroy();
    this.resources.clear();
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}
