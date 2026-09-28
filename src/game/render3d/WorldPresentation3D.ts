import { contactShadow, updateArtMaterials } from './ArtMaterials';
import { batchStaticMeshes, disposeBatchedGeometry } from './MeshBatching';
import { CombatEffects3D } from './CombatEffects3D';
import { OrbitingWeapons3D } from './OrbitingWeapons3D';
import type { OrbitalWeaponState } from '../combat/CombatVisualState';
import { createGroundCover } from './BiomeScenery';
import { settlementScenery, disposeSettlementScenery } from './SettlementScenery';
import { buildingLabel, disposeBuildingLabels } from './BuildingLabels';
import * as THREE from 'three';
import Phaser from 'phaser';
import type { PlayerController } from '../player/PlayerController';
import { enemySpawnAreaIsClear, type EnemySystem, type EnemyUnit } from '../enemies/EnemySystem';
import type { BossSystem, BossUnit } from '../bosses/BossSystem';
import { resourceNodeAreaIsClear, type ResourceSystem } from '../gathering/ResourceSystem';
import type { ChestSystem } from '../world/ChestSystem';
import type { CityBuilderSystem } from '../settlement/CityBuilderSystem';
import { FORGE_POSITION } from '../settlement/SettlementSystem';
import { FOREST_HEART } from '../world/ForestZone';
import { regionNormalizedDistance, RELEASE_PASSAGES, RELEASE_REGIONS, type RegionPassage } from '../world/ReleaseRegionMap';
import { SETTLEMENT_CENTER } from '../world/WorldPrototype';
import { createBuilding, createChest, createCreature, createHero, createSceneryProp, type AnimatedModel } from './Models';

import { terrainHeight, passageHeight, TERRAIN_PASSAGES } from '../world/WorldTerrain';
import { createBoundaryGround, createRegionLand, REGION_PALETTES } from './TerrainMeshes';

import { createBossTelegraph, disposeBossTelegraph } from './BossTelegraph3D';
import { ResourceVisual3D } from './ResourceVisual3D';
import {
  weaponAttackAnimationMs,
} from './WeaponAnimation';

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

function createForestAltar(): {root:THREE.Group; beacon:THREE.Mesh; rune:THREE.Mesh} {
  const root=new THREE.Group();
  const stone=new THREE.MeshStandardMaterial({color:0x7d8274,roughness:.93,flatShading:true});
  const dark=new THREE.MeshStandardMaterial({color:0x4d5b51,roughness:1,flatShading:true});
  const moss=new THREE.MeshStandardMaterial({color:0x527a49,roughness:1,flatShading:true});
  const glow=new THREE.MeshStandardMaterial({color:0xbde7b2,emissive:0x4eb47d,emissiveIntensity:1.8,roughness:.35,metalness:.08});

  const add=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number):THREE.Mesh=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  add(new THREE.CylinderGeometry(105,118,22,12),dark,0,11,0);
  add(new THREE.CylinderGeometry(82,96,18,12),stone,0,30,0);
  add(new THREE.BoxGeometry(112,22,74),stone,0,51,0);
  add(new THREE.BoxGeometry(118,8,80),moss,0,65,0);
  for(const side of [-1,1]){
    add(new THREE.BoxGeometry(23,96,23),dark,side*78,60,-14);
    const cap=add(new THREE.ConeGeometry(22,34,5),stone,side*78,123,-14);cap.rotation.y=Math.PI/5;
  }
  const arch=add(new THREE.BoxGeometry(176,22,24),stone,0,118,-14);
  arch.rotation.z=-.02;
  const rune=add(new THREE.TorusGeometry(39,5,8,28),glow,0,76,2);
  rune.rotation.x=Math.PI/2;
  const crystal=add(new THREE.OctahedronGeometry(18,0),glow,0,98,0);
  crystal.rotation.y=.5;
  for(let i=0;i<6;i++){
    const angle=i/6*Math.PI*2;
    const pebble=add(new THREE.DodecahedronGeometry(10+(i%2)*4,0),i%2?moss:stone,Math.cos(angle)*126,12,Math.sin(angle)*94);
    pebble.rotation.set(.2*i,.5*i,.1*i);
  }
  const light=new THREE.PointLight(0x8fe3ac,900,420,2);
  light.position.set(0,112,10);root.add(light);
  const beacon=new THREE.Mesh(
    new THREE.CylinderGeometry(25,58,320,18,1,true),
    new THREE.MeshBasicMaterial({color:0xffdc6e,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),
  );
  beacon.position.y=220;beacon.visible=false;root.add(beacon);
  root.add(buildingLabel('Лесной алтарь',190,'quest'));
  return {root,beacon,rune};
}


export class WorldPresentation3D {
  get renderStats(): {calls:number;triangles:number} {
    return {calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};
  }
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-640, 640, 360, -360, 1, 5000);
  private readonly hero = createHero();
  private readonly sun = new THREE.DirectionalLight(0xffe6bd, 2.4);
  private readonly sunTarget = new THREE.Object3D();
  private readonly landRegions = new Map<number, THREE.Group>();
  private readonly chunks = new Map<string, THREE.Group>();
  private readonly actors = new Map<EnemyUnit | BossUnit, Actor>();
  private readonly effects = new CombatEffects3D();
  private readonly orbitingWeapons = new OrbitingWeapons3D();
  private readonly shownHits = new WeakMap<EnemyUnit | BossUnit,number>();
  private readonly resources = new Map<string, ResourceVisual3D>();
  private readonly chests = new Map<string, THREE.Group>();
  private readonly pickups: THREE.Group[] = [];
  private readonly coinPickups = new THREE.InstancedMesh(new THREE.CylinderGeometry(12,12,4,12).rotateX(Math.PI/2),
    new THREE.MeshStandardMaterial({color:0xffcf5a,metalness:.38,roughness:.3,emissive:0xa96914,emissiveIntensity:.2}),128);
  private readonly coinTransform=new THREE.Object3D();
  private readonly settlement = new THREE.Group();
  private readonly bridges = new Map<string, { group: THREE.Group; centerX: number; centerZ: number; gate: THREE.Group; gap: THREE.Group }>();
  private readonly buildingGroups = new Map<string, { level: number; model: THREE.Group }>();
  private readonly forestAltar = createForestAltar();
  private frame = 0;
  private lastFacing = 0;
  private lastHeroX = 0;
  private lastHeroY = 0;

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
    private readonly getCoinDrops:()=>Array<{x:number;y:number;scale:number}> = ()=>[],
    private readonly getOrbitals:()=>OrbitalWeaponState[] = ()=>[],
    private readonly getActiveQuestId:()=>string|null = ()=>null,
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
    this.scene.fog = new THREE.Fog(0xa4b7a0, 2300, 4300);
    this.scene.add(new THREE.HemisphereLight(0xc6e2ff, 0x81705b, 1.65));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    this.sun.intensity = 2.8;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -1300;
    this.sun.shadow.camera.right = 1300;
    this.sun.shadow.camera.top = 1300;
    this.sun.shadow.camera.bottom = -1300;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 2500;
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.normalBias = 1;
    this.sun.shadow.radius = 2;
    this.scene.add(this.sun, this.sunTarget);
    this.sun.target = this.sunTarget;

    this.hero.root.add(contactShadow(40,29));
    this.coinPickups.count=0;this.coinPickups.frustumCulled=false;
    this.scene.add(this.hero.root,this.effects.root,this.coinPickups,this.orbitingWeapons.root);
    for (const region of RELEASE_REGIONS) {
      const land = createRegionLand(region);
      this.landRegions.set(region.id, land);
      this.scene.add(land);
    }
    this.lastHeroX = player.sprite.x;
    this.lastHeroY = player.sprite.y;
    this.createSettlement();
    this.scene.add(this.settlement);
    this.forestAltar.root.position.set(
      FOREST_HEART.x,
      terrainHeight(FOREST_HEART.x,FOREST_HEART.y),
      FOREST_HEART.y,
    );
    this.scene.add(this.forestAltar.root);
    this.createBridges();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(phaser.game.canvas);
    window.addEventListener('resize', this.resize);
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
    // A canvas resize clears its buffer even while a menu pauses the scene.
    this.renderer.render(this.scene, this.camera);
  };

  update(time: number, delta: number): void {
    updateArtMaterials(time);
    const dt = Math.min(0.05, Math.max(0, delta / 1000));
    const x = this.player.sprite.x;
    const z = this.player.sprite.y;
    const velocity = (this.player.sprite.body as Phaser.Physics.Arcade.Body).velocity;
    const speed = Math.hypot(velocity.x, velocity.y);
    const harvest = this.resourceSystem.visualHarvestAction;
    const harvesting = !!harvest && time - harvest.hitAt < 580;
    const attackWindowMs =
      weaponAttackAnimationMs(
        this.player.visualWeaponId,
      );
    const inWeaponAttack =
      time -
        this.player.visualAttackAt <
      attackWindowMs;
    const facing = inWeaponAttack
      ? Math.atan2(this.player.visualAttackDirection.x,this.player.visualAttackDirection.y)
      : harvesting && speed < 20
      ? Math.atan2(harvest.x - x, harvest.y - z)
      : speed > 20 ? Math.atan2(velocity.x, velocity.y) : Math.atan2(this.player.visualFacing.x, this.player.visualFacing.y);
    const difference = Math.atan2(Math.sin(facing - this.lastFacing), Math.cos(facing - this.lastFacing));
    this.lastFacing += difference * Math.min(1, dt * 13);
    this.hero.root.rotation.y = this.lastFacing;
    this.hero.root.position.set(x, terrainHeight(x, z) + 5, z);
    this.hero.setWeapon?.(this.player.visualWeaponId);
    this.hero.setSkin?.(this.player.visualSkinId);
    const harvestingAttack =
      harvesting &&
      time - harvest.hitAt < 260;
    const attacking =
      harvestingAttack ||
      inWeaponAttack;
    const travel = Math.hypot(x - this.lastHeroX, z - this.lastHeroY);
    this.hero.step(
      dt,
      speed,
      this.player.isDashing(time),
      attacking,
      travel,
      difference,
      inWeaponAttack
        ? this.player.visualAttackAt
        : harvest?.hitAt,
    );
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
    (this.scene.fog as THREE.Fog).color.copy(this.scene.background as THREE.Color);
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
    const labelScale=(this.camera.top-this.camera.bottom)/Math.max(1,this.lastRectHeight);
    const labelWidth=this.lastRectHeight<600?128:164;
    this.settlement.traverse(o=>{if(o instanceof THREE.Sprite&&o.userData.buildingLabel){o.scale.set(labelWidth*labelScale,labelWidth/5.125*labelScale,1);}});
    this.updateTerrain(x, z);
    this.updateActors(dt, x, z,time);
    this.effects.update(time,x,groundHeight,z,this.lastFacing,this.player.visualAttackAt);
    this.orbitingWeapons.update(this.getOrbitals(),time,groundHeight);
    this.updateResources(x, z, time);
    if (this.frame++ % 4 === 0) {
      this.updateChests(x, z);
      this.updateBuildings();
    }
    this.updatePickups(x, z, time);
    if (this.frame % 10 === 0) this.resize();
    const altarDistance=Math.hypot(x-FOREST_HEART.x,z-FOREST_HEART.y);
    this.forestAltar.root.visible=altarDistance<2800;
    const altarQuest=this.getActiveQuestId()==='reach-forest-heart';
    this.forestAltar.beacon.visible=altarQuest&&altarDistance<3400;
    this.forestAltar.rune.rotation.z=time*.0014;
    if(this.forestAltar.beacon.visible){
      this.forestAltar.beacon.scale.x=this.forestAltar.beacon.scale.z=1+Math.sin(time*.004)*.12;
      (this.forestAltar.beacon.material as THREE.MeshBasicMaterial).opacity=.1+(.5+.5*Math.sin(time*.003))*0.09;
    }
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
    group.add(createGroundCover(cx*TILE,cz*TILE,TILE,RELEASE_REGIONS[region-1]));

    // Small region-specific props are deliberately non-blocking. Keep them
    // away from combat/resource anchors so they never imply fake collision.
    for (let index = 0; index < 4; index += 1) {
      const px = cx * TILE + random(cx, cz, 201 + index * 11) * TILE;
      const pz = cz * TILE + random(cx, cz, 202 + index * 11) * TILE;
      const island = islandAt(px, pz);
      if (
        island.distance >= 0.9 ||
        Math.hypot(px - SETTLEMENT_CENTER.x, pz - SETTLEMENT_CENTER.y) < 620 ||
        !enemySpawnAreaIsClear(px, pz, 150) ||
        !resourceNodeAreaIsClear(px, pz, 112)
      ) continue;
      const prop = createSceneryProp(
        Math.round(px * 0.7 + pz * 1.3 + index * 97),
        island.region,
      );
      prop.position.set(px, terrainHeight(px, pz), pz);
      prop.rotation.y = random(px, pz, index + 300) * Math.PI * 2;
      const scale = 0.76 + random(pz, px, index + 400) * 0.42;
      prop.scale.setScalar(scale);
      group.add(prop);
    }

    // Decorative rubble is intentionally knee-high and non-blocking. Large
    // silhouettes belong to gameplay objects with real Arcade collision.
    if (
      islandAt(wx, wz).distance < 0.86 &&
      random(cx, cz, 77) > 0.78 &&
      Math.hypot(wx - SETTLEMENT_CENTER.x, wz - SETTLEMENT_CENTER.y) > 700 &&
      enemySpawnAreaIsClear(wx, wz, 180) &&
      resourceNodeAreaIsClear(wx, wz, 150)
    ) {
      const ruin = new THREE.Group();
      const stone = new THREE.MeshStandardMaterial({
        color: region === 4 || region === 8 ? 0x56504c : 0xaaa392,
        roughness: 1,
        flatShading: true,
      });
      for (let index = 0; index < 5; index += 1) {
        const width = 24 + random(cx, cz, index + 10) * 34;
        const height = 10 + random(cx, cz, index + 20) * 18;
        const depth = 20 + random(cx, cz, index + 30) * 30;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), stone);
        const angle = index / 5 * Math.PI * 2 + random(cx, cz, index + 40);
        slab.position.set(Math.cos(angle) * (24 + index * 7), height / 2, Math.sin(angle) * (22 + index * 6));
        slab.rotation.set(0, angle * 0.7, (random(cx, cz, index + 50) - 0.5) * 0.18);
        slab.receiveShadow = true;
        slab.userData.uniqueGeometry = true;
        ruin.add(slab);
      }
      ruin.position.set(wx, terrainHeight(wx, wz), wz);
      group.add(ruin);
    }
    return group;
  }

  private updateActors(dt: number, x: number, z: number,time:number): void {
    const visible = new Set<EnemyUnit | BossUnit>();
    const units: Array<EnemyUnit | BossUnit> = [...this.enemies.visualUnits, ...this.bosses.visualUnits];
    for (const unit of units) {
      const hit=unit.visualHit;
      if(hit&&time-hit.at<500&&(this.shownHits.get(unit)??-Infinity)<hit.at&&Math.hypot(unit.sprite.x-x,unit.sprite.y-z)<1600){
        const height=Number(this.actors.get(unit)?.model.root.userData.visualHeight??unit.combatRadius*3);
        this.effects.hit(unit.sprite.x,terrainHeight(unit.sprite.x,unit.sprite.y)+height+30,unit.sprite.y,hit);
        this.shownHits.set(unit,hit.at);
      }
      if (!unit.alive || Math.abs(unit.sprite.x - x) > 1750 || Math.abs(unit.sprite.y - z) > 1750) continue;
      visible.add(unit);
      let actor = this.actors.get(unit);
      if (!actor) {
        const model = createCreature(unit.definition.id, unit.definition.primaryColor, unit.definition.accentColor, 'rank' in unit ? unit.rank === 'elite' : true, unit.combatRadius);
        // Grounded shadows remain readable on dark terrain and under foliage.
        const shadow=contactShadow(unit.combatRadius*1.38,unit.combatRadius*1.05);
        shadow.scale.x/=model.root.scale.x;shadow.scale.y/=model.root.scale.x;
        model.root.add(shadow);
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
      else if ('rank' in unit) actor.model.root.rotation.y = Math.atan2(unit.visualFacing.x, unit.visualFacing.y);
      else actor.model.root.rotation.y = Math.atan2(x - px, z - pz);
      actor.model.root.rotation.x=-Math.max(0,1-(time-(unit.visualHit?.at??-Infinity))/170)*.1;
      const winding='rank' in unit&&time-unit.visualWindupAt>=0&&time-unit.visualWindupAt<unit.definition.attackWindupMs;
      actor.model.step(dt, speed,false,winding||time-unit.visualAttackAt<230);
      const boss = !('rank' in unit);
      const ratio = Math.max(0, Math.min(1, unit.visualHealthRatio));
      actor.health.visible = boss || ratio < 0.999 || ('rank' in unit && unit.rank === 'elite');
      actor.health.position.set(px, terrainHeight(px, pz) + Number(actor.model.root.userData.visualHeight ?? (boss ? 180 : 96)) + 18, pz);
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
      actor.model.dispose?.();
      this.scene.remove(actor.health);
      actor.health.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});
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
    const coins=this.getCoinDrops().filter(drop=>Math.hypot(drop.x-x,drop.y-z)<1400).slice(0,128);
    this.coinPickups.count=coins.length;
    coins.forEach((drop,index)=>{
      this.coinTransform.position.set(drop.x,terrainHeight(drop.x,drop.y)+22+Math.sin(time*.006+index)*4,drop.y);
      this.coinTransform.rotation.set(0,time*.005+index,0);this.coinTransform.scale.setScalar(Math.max(.75,drop.scale));
      this.coinTransform.updateMatrix();this.coinPickups.setMatrixAt(index,this.coinTransform.matrix);
    });
    this.coinPickups.instanceMatrix.needsUpdate=true;
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
      const slabs = Math.max(3,Math.ceil(length/54));
      const breaks=(count:number)=>[...new Set([...Array.from({length:count+1},(_,i)=>i/count),entry.landingA/length,1-entry.landingB/length])].sort((a,b)=>a-b);
      const deck=breaks(slabs);
      for (let i=1;i<deck.length;i++) {
        const t=(deck[i-1]+deck[i])/2, z=(t-0.5)*length,span=(deck[i]-deck[i-1])*length;
        const slope=Math.atan2(passageHeight(entry,deck[i])-passageHeight(entry,deck[i-1]),span);
        const slab=new THREE.Mesh(new THREE.BoxGeometry(passage.width,18,span/Math.cos(slope)+2),passage.kind==='bridge'?timber:stone);
        slab.position.set(0,passageHeight(entry,t)-9,z); slab.rotation.x=-slope;
        slab.castShadow=slab.receiveShadow=true;
        (Math.abs(z)<65 ? gap : group).add(slab);
      }
      const posts=breaks(Math.ceil(length/100));
      for(const t of posts) {
        const z=(t-0.5)*length, height=passageHeight(entry,t);
        for(const side of [-1,1]) {
          const post=new THREE.Mesh(new THREE.BoxGeometry(12,46,12),stone);
          post.position.set(side*(passage.width/2-6),height+23,z);post.castShadow=true;group.add(post);
        }
      }
      for(const side of [-1,1])for(let i=1;i<posts.length;i++) {
        const low=passageHeight(entry,posts[i-1]),high=passageHeight(entry,posts[i]),span=(posts[i]-posts[i-1])*length;
        const slope=Math.atan2(high-low,span);
        const rail=new THREE.Mesh(new THREE.BoxGeometry(9,10,span/Math.cos(slope)+3),timber);
        rail.position.set(side*(passage.width/2-6),(low+high)/2+43,((posts[i-1]+posts[i])/2-.5)*length);
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
    this.settlement.add(settlementScenery(baseX,baseZ,[...this.city.visualBuildings,{id:'forge',x:FORGE_POSITION.x,y:FORGE_POSITION.y}]));
    // Central well, stone arch, brazier and banners replace the previous flat settlement pads.
    const well = new THREE.Mesh(new THREE.CylinderGeometry(43, 49, 42, 12, 1, true), darkStone);
    well.position.set(baseX + 105, terrainHeight(baseX + 105, baseZ + 42) + 24, baseZ + 42);
    well.castShadow = well.receiveShadow = true;
    this.settlement.add(well);
    const water = new THREE.Mesh(new THREE.CircleGeometry(40, 16), new THREE.MeshStandardMaterial({ color: 0x468e9a, metalness: 0.3, roughness: 0.28 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(baseX + 105, terrainHeight(baseX + 105, baseZ + 42) + 12, baseZ + 42);
    this.settlement.add(water);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(44,8,4,12),stone);rim.rotation.x=Math.PI/2;rim.position.set(baseX+105,terrainHeight(baseX+105,baseZ+42)+45,baseZ+42);rim.castShadow=true;this.settlement.add(rim);
    for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(9,115,9),darkStone);post.position.set(baseX+105+side*48,terrainHeight(baseX+105,baseZ+42)+58,baseZ+42);post.castShadow=true;this.settlement.add(post);}
    const beam=new THREE.Mesh(new THREE.BoxGeometry(115,10,12),darkStone);beam.position.set(baseX+105,terrainHeight(baseX+105,baseZ+42)+116,baseZ+42);beam.castShadow=true;this.settlement.add(beam);
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(13, 17, 63, 6), stone);
      pillar.position.set(baseX + side * 64, terrainHeight(baseX, baseZ - 138) + 33, baseZ - 138);
      pillar.castShadow = true;
      this.settlement.add(pillar);
    }
    for(let i=0;i<9;i++){
      const angle=(i+.5)/9*Math.PI;
      const block=new THREE.Mesh(new THREE.BoxGeometry(24,23,33),i===4?darkStone:stone);
      block.position.set(baseX+Math.cos(angle)*64,terrainHeight(baseX,baseZ-138)+64+Math.sin(angle)*64,baseZ-138);
      block.rotation.z=angle-Math.PI/2;block.castShadow=block.receiveShadow=true;this.settlement.add(block);
    }
    const forge = new THREE.Group();
    const f = (geo: THREE.BufferGeometry, color: number, xx: number, yy: number, zz: number): void => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }));
      mesh.position.set(xx, yy, zz); mesh.castShadow = mesh.receiveShadow = true; forge.add(mesh);
    };
    f(new THREE.BoxGeometry(110, 42, 75), 0x77716c, 0, 21, 0);
    f(new THREE.CylinderGeometry(18, 24, 100, 8), 0x595655, -35, 88, -20);
    f(new THREE.BoxGeometry(52, 11, 35), 0x484e50, 55, 48, 0);
    f(new THREE.BoxGeometry(24,27,22),0x414647,55,31,0);
    f(new THREE.ConeGeometry(15,28,4),0x667273,91,48,0);
    for(let row=0;row<3;row++)for(let col=0;col<4;col++)f(new THREE.BoxGeometry(24,12,14),row%2?0x8d8173:0xa39480,-42+col*26+(row%2)*5,8+row*13,42);
    for(const x of [-79,30])f(new THREE.BoxGeometry(10,145,10),0x5e4430,x,73,-40);
    f(new THREE.BoxGeometry(144,12,12),0x785635,-24,144,-40);
    f(new THREE.BoxGeometry(153,10,110),0x485f68,-24,155,-32);
    for(let i=0;i<7;i++)f(new THREE.BoxGeometry(5,5,114),0x6b7e80,-95+i*23,162,-32);
    f(new THREE.BoxGeometry(38,13,34),0x8b5334,-65,29,36);
    f(new THREE.BoxGeometry(45,6,39),0x4b3428,-65,38,36);
    const coals=new THREE.Mesh(new THREE.IcosahedronGeometry(17,0),new THREE.MeshStandardMaterial({color:0xee903d,emissive:0xe86519,emissiveIntensity:1.3,roughness:1}));coals.position.set(0,49,14);coals.scale.set(1.3,.5,1);forge.add(coals);
    const light = new THREE.PointLight(0xff9c4a, 2800, 160, 2);
    light.position.set(0, 68, 14); forge.add(light);
    forge.position.set(FORGE_POSITION.x, terrainHeight(FORGE_POSITION.x, FORGE_POSITION.y), FORGE_POSITION.y);
    forge.add(buildingLabel('Кузница',185,'forge'));
    this.settlement.add(forge);
    this.settlement.traverse(o=>{if(o instanceof THREE.Mesh)o.userData.settlementOwned=true;});
    batchStaticMeshes(this.settlement);
    this.settlement.traverse(o=>{if(o instanceof THREE.Mesh&&!o.userData.settlementOwned)o.userData.settlementOwned=true;});
    this.updateBuildings();
  }

  private updateBuildings(): void {
    for (const building of this.city.visualBuildings) {
      const old = this.buildingGroups.get(building.id);
      if (old?.level === building.level) continue;
      if (old) { disposeBuildingLabels(old.model);disposeBatchedGeometry(old.model);old.model.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.buildingOwned)o.geometry.dispose();}); this.settlement.remove(old.model); }
      const model = createBuilding(building.id, building.level);
      const names:Record<string,string>={storage:'Склад',sawmill:'Лесопилка',workshop:'Мастерская',house:'Дом'};
      model.add(buildingLabel(names[building.id],190+building.level*6,building.id,building.level));
      model.position.set(building.x, terrainHeight(building.x, building.y), building.y);
      model.rotation.y = building.id === 'house' ? 0.2 : building.id === 'workshop' ? -0.24 : 0;
      this.settlement.add(model);
      this.buildingGroups.set(building.id, { level: building.level, model });
    }
  }

  destroy(): void {
    disposeBuildingLabels(this.settlement);
    disposeBuildingLabels(this.forestAltar.root);
    disposeSettlementScenery(this.settlement);
    const altarMaterials=new Set<THREE.Material>();
    this.forestAltar.root.traverse(object=>{
      if(object instanceof THREE.Mesh){
        object.geometry.dispose();
        for(const material of Array.isArray(object.material)?object.material:[object.material])altarMaterials.add(material);
      }
    });
    for(const material of altarMaterials)material.dispose();
    this.scene.remove(this.forestAltar.root);
    for(const building of this.buildingGroups.values())disposeBatchedGeometry(building.model);
    this.settlement.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.buildingOwned)o.geometry.dispose();});
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.resize);
    this.phaser.cameras.main.setVisible(true);
    for (const visual of this.resources.values()) visual.destroy();
    this.resources.clear();
    for (const actor of this.actors.values()) {
      actor.model.dispose?.();
      if (actor.telegraph) disposeBossTelegraph(actor.telegraph);
      this.scene.remove(actor.model.root);
      this.scene.remove(actor.health);
      actor.health.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});
    }
    this.actors.clear();
    for(const root of [...this.landRegions.values(),...this.chunks.values()])root.traverse(o=>{
      if(o instanceof THREE.Mesh&&o.userData.uniqueGeometry){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material.dispose();}
    });
    this.landRegions.clear();this.chunks.clear();
    this.hero.dispose?.();
    this.effects.dispose();
    this.orbitingWeapons.dispose();
    this.coinPickups.geometry.dispose();(this.coinPickups.material as THREE.Material).dispose();
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}
