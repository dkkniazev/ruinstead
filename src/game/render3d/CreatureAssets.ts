import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

type CreatureAnimation = {
  root: THREE.Group;
  step: (
    seconds: number,
    speed: number,
    dash?: boolean,
    attack?: boolean,
    travel?: number,
    turning?: number,
  ) => void;
  dispose?: () => void;
};

type LoadedCreature = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

const loader = new GLTFLoader();
const models = new Map<string, Promise<LoadedCreature | null>>();

function creatureAssetFor(id: string): string | null {
  // Specific silhouettes first; generic keyword families come later.
  if (id.includes('root-colossus')) return 'Tree';
  if (id.includes('sandling')) return 'Cactus';
  if (id.includes('jackal') || id.includes('hound') || id.includes('ram')) return 'Deer';
  if (id.includes('mushroom')) return 'Mushroom';
  if (id.includes('bat') || id.includes('harpy')) return 'Bat';
  if (id.includes('wisp') || id.includes('spirit') || id.includes('ghost')) return 'Ghost';
  if (id.includes('boar')) return 'Pig';
  if (
    id.includes('dragon') || id.includes('wyvern') || id.includes('drake') ||
    id.includes('salamander') || id.includes('serpent')
  ) return 'YellowDragon';
  if (id.includes('scorpion') || id.includes('spider') || id.includes('beetle')) return 'Crab';
  if (
    id.includes('giant') || id.includes('golem') || id.includes('colossus') ||
    id.includes('ogre') || id.includes('stone-elemental') || id.includes('canyon-lord')
  ) return 'Yeti';
  if (id.includes('gargoyle') || id.includes('matriarch')) return 'Cthulhu';
  if (
    id.includes('goblin') || id.includes('bandit') || id.includes('cultist') ||
    id.includes('raider') || id.includes('warden') || id.includes('tyrant')
  ) return 'GreenDemon';
  if (
    id.includes('fire-imp') || id.includes('emberling') ||
    id.includes('cinder') || id.includes('lava-elemental')
  ) return 'Demon';
  if (id.includes('stalker')) return 'Alien';
  if (id.includes('vulture') || id.includes('sky-lord')) return 'Bat';
  return null;
}

function stableFraction(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function loadCreature(name: string): Promise<LoadedCreature | null> {
  let promise = models.get(name);
  if (!promise) {
    promise = loader
      .loadAsync(`${import.meta.env.BASE_URL}assets/models/quaternius-cute-monsters/${name}.gltf`)
      .then((gltf) => ({
        scene: gltf.scene,
        animations: gltf.animations,
      }))
      .catch((error) => {
        console.warn(`Creature asset unavailable: ${name}`, error);
        return null;
      });
    models.set(name, promise);
  }
  return promise;
}

function firstClip(
  clips: Map<string, THREE.AnimationClip>,
  names: readonly string[],
): THREE.AnimationClip | undefined {
  for (const name of names) {
    const clip = clips.get(name.toLowerCase());
    if (clip) return clip;
  }
  return undefined;
}

/**
 * Replaces the procedural enemy with a CC0 Quaternius animated model when a
 * matching archetype exists. Until glTF finishes loading the procedural model
 * stays fully functional, so a slow/failed asset load never blanks a mob.
 */
export function withCreatureAsset(
  id: string,
  primary: number,
  accent: number,
  large: boolean,
  fallback: CreatureAnimation,
): CreatureAnimation {
  const assetName = creatureAssetFor(id);
  if (!assetName) return fallback;

  const root = new THREE.Group();
  root.add(fallback.root);

  let mixer: THREE.AnimationMixer | null = null;
  const ownedMaterials = new Set<THREE.Material>();
  let clips = new Map<string, THREE.AnimationClip>();
  let currentAction: THREE.AnimationAction | null = null;
  let currentClip = '';

  const play = (state: 'idle' | 'move' | 'attack'): void => {
    if (!mixer) return;
    const candidates =
      state === 'attack'
        ? ['Bite_Front', 'Bite_InPlace', 'Attack', 'Flying', 'Idle']
        : state === 'move'
          ? ['Walk', 'Flying', 'Idle']
          : ['Idle', 'Flying', 'Walk'];
    const clip = firstClip(clips, candidates);
    if (!clip || clip.name === currentClip) return;
    const next = mixer.clipAction(clip);
    currentAction?.fadeOut(0.12);
    next.reset().fadeIn(0.12).play();
    currentAction = next;
    currentClip = clip.name;
  };

  void loadCreature(assetName).then((asset) => {
    if (!asset) return;

    const model = cloneSkeleton(asset.scene) as THREE.Group;
    const primaryTint = new THREE.Color(primary);
    const accentTint = new THREE.Color(accent);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = true;

      const recolor = (material: THREE.Material, index: number): THREE.Material => {
        const copy = material.clone();
        ownedMaterials.add(copy);
        if (copy instanceof THREE.MeshStandardMaterial) {
          const tint = index % 3 === 1 ? accentTint : primaryTint;
          copy.color.lerp(tint, 0.26);
          copy.roughness = Math.max(copy.roughness, 0.72);
          copy.metalness = Math.min(copy.metalness, 0.18);
        }
        return copy;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map((material, index) => recolor(material, index))
        : recolor(object.material, 0);
    });

    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const speciesScale = 0.92 + stableFraction(id) * 0.16;
    const targetHeight = (large ? 122 : 90) * speciesScale;
    model.scale.multiplyScalar(targetHeight / Math.max(0.001, size.y));
    model.updateMatrixWorld(true);

    const scaled = new THREE.Box3().setFromObject(model);
    const center = scaled.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y -= scaled.min.y;
    model.position.z -= center.z;

    root.remove(fallback.root);
    root.add(model);
    clips = new Map(asset.animations.map((clip) => [clip.name.toLowerCase(), clip]));
    mixer = new THREE.AnimationMixer(model);
    play('idle');
  });

  return {
    root,
    step(seconds, speed, dash, attack, travel, turning) {
      if (!mixer) {
        fallback.step(seconds, speed, dash, attack, travel, turning);
        return;
      }
      play(attack ? 'attack' : speed > 18 ? 'move' : 'idle');
      mixer.update(Math.min(0.05, Math.max(0, seconds)));
    },
    dispose() {
      mixer?.stopAllAction();
      mixer = null;
      for (const material of ownedMaterials) material.dispose();
      ownedMaterials.clear();
    },
  };
}
