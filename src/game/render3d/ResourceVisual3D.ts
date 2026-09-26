import * as THREE from 'three';
import type { ResourceVisualState } from '../gathering/ResourceSystem';
import { createResource } from './Models';
import { terrainHeight } from '../world/WorldTerrain';
import { getLanguage } from '../../i18n/I18n';

const chipGeometry = new THREE.BoxGeometry(5, 5, 5);
const chipMaterials = new Map<string, THREE.MeshStandardMaterial>();
const names: Record<string, [string, string]> = {
  wood: ['ДЕРЕВО','TREE'], stone: ['КАМЕНЬ','STONE'], metal: ['РУДА','ORE'],
  crystal: ['КРИСТАЛЛ','CRYSTAL'], fiber: ['ВОЛОКНО','FIBER'],
};

export class ResourceVisual3D {
  readonly root = new THREE.Group();
  private readonly model: THREE.Group;
  private readonly health: THREE.Mesh;
  private readonly healthTexture: THREE.CanvasTexture;
  private readonly canvas = document.createElement('canvas');
  private readonly chips = new THREE.Group();
  private lastHealth = -1;
  private readonly height: number;

  constructor(node: ResourceVisualState, region: number) {
    this.model = createResource(node.type, region, Math.abs(Math.round(node.x * 7 + node.y * 13)));
    this.root.add(this.model, this.chips);
    this.height = node.type === 'wood' ? 194 : node.type === 'crystal' ? 91 : 72;
    this.canvas.width = 256; this.canvas.height = 76;
    this.healthTexture = new THREE.CanvasTexture(this.canvas);
    this.healthTexture.colorSpace = THREE.SRGBColorSpace;
    this.health = new THREE.Mesh(new THREE.PlaneGeometry(148, 44),
      new THREE.MeshBasicMaterial({ map: this.healthTexture, transparent: true, depthTest: false, depthWrite: false }));
    this.health.renderOrder = 110;
    this.health.position.y = this.height;
    this.root.add(this.health);
    let material = chipMaterials.get(node.type);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color: node.type === 'wood' ? 0xc19259 : node.type === 'crystal' ? 0x7ee7ed : 0xd1c3a0, roughness: 0.9 });
      chipMaterials.set(node.type, material);
    }
    for (let i = 0; i < 8; i++) this.chips.add(new THREE.Mesh(chipGeometry, material));
  }

  update(node: ResourceVisualState, time: number, distance: number, camera: THREE.Camera): void {
    this.root.position.set(node.x, terrainHeight(node.x, node.y), node.y);
    const age = time - node.hitAt;
    const impact = Math.max(0, 1 - age / 300);
    const collapse = node.available ? 1 : Math.max(0.01, 1 - age / 280);
    this.model.visible = node.available || age < 280;
    this.model.rotation.z = Math.sin(age * 0.045) * impact * (node.type === 'wood' ? 0.075 : 0.035);
    this.model.scale.set((1 + impact * 0.06) * collapse, (1 - impact * 0.04) * collapse, collapse);
    this.health.visible = node.available ? distance < 260 || age < 3500 : age < 400;
    this.health.quaternion.copy(camera.quaternion);
    this.health.position.y = this.height + impact * 4;
    if (node.health !== this.lastHealth) {
      this.lastHealth = node.health;
      const context = this.canvas.getContext('2d')!;
      context.clearRect(0, 0, 256, 76);
      context.fillStyle = '#172521ee';
      context.beginPath(); context.roundRect(0, 0, 256, 76, 12); context.fill();
      context.font = 'bold 22px system-ui'; context.textAlign = 'center'; context.fillStyle = '#fff2d1';
      const name = names[node.type][getLanguage() === 'en' ? 1 : 0];
      context.fillText(`${name}  ${node.health} / ${node.maxHealth}`, 128, 28);
      context.fillStyle = '#48554b'; context.fillRect(12, 43, 232, 20);
      context.fillStyle = node.health / node.maxHealth > 0.34 ? '#dcb664' : '#ef8754';
      context.fillRect(12, 43, 232 * node.health / node.maxHealth, 20);
      context.strokeStyle = '#f4d598'; context.lineWidth = 2; context.strokeRect(12, 43, 232, 20);
      this.healthTexture.needsUpdate = true;
    }
    this.chips.visible = age >= 0 && age < 480 && node.hitCount > 0;
    if (this.chips.visible) {
      const seconds = age / 1000;
      this.chips.children.forEach((chip, index) => {
        const angle = index * Math.PI / 4 + node.hitCount * 0.51;
        const radius = seconds * (node.available ? 100 : 165);
        chip.position.set(Math.cos(angle) * radius, 27 + (125 + index * 8) * seconds - 340 * seconds * seconds, Math.sin(angle) * radius);
        chip.rotation.set(seconds * (index + 5), angle + seconds * 9, seconds * 7);
        chip.scale.setScalar(Math.max(0.1, 1 - seconds * 1.8));
      });
    }
  }

  destroy(): void {
    this.healthTexture.dispose(); this.health.geometry.dispose();
    (this.health.material as THREE.Material).dispose();
    // The marker belongs to this resource; all model primitive geometry is shared.
    const marker = this.model.children[0] as THREE.Mesh;
    marker.geometry.dispose(); (marker.material as THREE.Material).dispose();
    this.root.removeFromParent();
  }
}
