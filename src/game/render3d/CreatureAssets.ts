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

type CreatureAsset = {
  key: string;
  file: string;
  hasWalk: boolean;
  scale: number;
};

const loader = new GLTFLoader();
const models = new Map<string, Promise<LoadedCreature | null>>();
const ASSET_ROOT = `${import.meta.env.BASE_URL}assets/models/gobkit-enemies/`;

function asset(
  file: string,
  key: string,
  hasWalk: boolean,
  scale = 1,
): CreatureAsset {
  return { file, key, hasWalk, scale };
}

function stableIndex(value: string, length: number): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % Math.max(1, length);
}

/**
 * Deliberately conservative mapping: use an authored model only when the
 * silhouette matches. Everything else keeps Ruinstead's species-specific
 * procedural mesh instead of becoming a random animal.
 */
function creatureAssetFor(id: string): CreatureAsset | null {
  if (id.includes('ram')) {
    return asset('Goat.glb', 'goat', true, 1.04);
  }

  if (id.includes('bat')) {
    return asset('Bat.glb', 'bat', true, 0.95);
  }

  if (id.includes('harpy') || id.includes('vulture')) {
    return asset('Owl.glb', 'owl', true, 1.04);
  }

  if (
    id.includes('goblin') ||
    id.includes('bandit') ||
    id.includes('cultist') ||
    id.includes('raider') ||
    id.includes('warden') ||
    id.includes('tyrant') ||
    id.includes('priest') ||
    id.includes('smith')
  ) {
    const minions = [
      asset('minion-a01.glb', 'minion-a01', false, 1),
      asset('minion-b01.glb', 'minion-b01', false, 1),
      asset('minion-c01.glb', 'minion-c01', false, 1.02),
      asset('minion-d01.glb', 'minion-d01', false, 1.03),
    ] as const;
    return minions[stableIndex(id, minions.length)];
  }

  return null;
}

function loadCreature(spec: CreatureAsset): Promise<LoadedCreature | null> {
  let promise = models.get(spec.key);
  if (!promise) {
    promise = loader
      .loadAsync(`${ASSET_ROOT}${spec.file}`)
      .then((gltf) => ({
        scene: gltf.scene,
        animations: gltf.animations,
      }))
      .catch((error) => {
        console.warn(`Creature asset unavailable: ${spec.key}`, error);
        return null;
      });
    models.set(spec.key, promise);
  }
  return promise;
}

type ClipSet = {
  idle?: THREE.AnimationClip;
  move?: THREE.AnimationClip;
  attack?: THREE.AnimationClip;
};

function clipByName(
  animations: readonly THREE.AnimationClip[],
  name: string,
): THREE.AnimationClip | undefined {
  const target = name.toLowerCase();
  return animations.find((clip) => {
    const actual = clip.name.toLowerCase();
    return actual === target || actual.endsWith(`|${target}`) || actual.endsWith(`_${target}`);
  });
}

function animationSet(
  animations: readonly THREE.AnimationClip[],
  hasWalk: boolean,
): ClipSet {
  const idle = clipByName(animations, 'idle');
  const attack = clipByName(animations, 'attack');
  const walk = clipByName(animations, 'walk') ?? clipByName(animations, 'run');

  if (idle || attack || walk) {
    return {
      idle: idle ?? walk,
      move: hasWalk ? walk ?? idle : idle,
      attack: attack ?? idle ?? walk,
    };
  }

  // Gobkit documents older single-timeline exports as 24 fps:
  // idle 0-29, attack 30-59, dead 60-89, optional walk 90-119.
  const master = animations[0];
  if (!master) return {};

  return {
    idle: THREE.AnimationUtils.subclip(master, 'idle', 0, 30, 24),
    attack: THREE.AnimationUtils.subclip(master, 'attack', 30, 60, 24),
    move: hasWalk
      ? THREE.AnimationUtils.subclip(master, 'walk', 90, 120, 24)
      : THREE.AnimationUtils.subclip(master, 'idle-move', 0, 30, 24),
  };
}

export function withCreatureAsset(
  id: string,
  primary: number,
  accent: number,
  large: boolean,
  fallback: CreatureAnimation,
): CreatureAnimation {
  const spec = creatureAssetFor(id);
  if (!spec) return fallback;

  const root = new THREE.Group();
  root.add(fallback.root);

  let mixer: THREE.AnimationMixer | null = null;
  let model: THREE.Group | null = null;
  let modelBaseY = 0;
  let motionPhase = 0;
  let clips: ClipSet = {};
  let currentAction: THREE.AnimationAction | null = null;
  let currentClip: THREE.AnimationClip | undefined;
  let disposed = false;
  const ownedMaterials = new Set<THREE.Material>();

  const play = (state: 'idle' | 'move' | 'attack'): void => {
    if (!mixer) return;
    const clip =
      state === 'attack' ? clips.attack :
      state === 'move' ? clips.move :
      clips.idle;

    if (!clip || clip === currentClip) return;

    const next = mixer.clipAction(clip);
    currentAction?.fadeOut(0.1);
    next.reset().fadeIn(0.1);

    if (state === 'attack') {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.clampWhenFinished = false;
    }

    next.play();
    currentAction = next;
    currentClip = clip;
  };

  void loadCreature(spec).then((loaded) => {
    if (!loaded || disposed) return;

    model = cloneSkeleton(loaded.scene) as THREE.Group;
    const primaryTint = new THREE.Color(primary);
    const accentTint = new THREE.Color(accent);
    let materialIndex = 0;

    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = true;

      const recolor = (material: THREE.Material): THREE.Material => {
        const copy = material.clone();
        ownedMaterials.add(copy);

        const withColor = copy as THREE.Material & { color?: THREE.Color };
        if (withColor.color) {
          const tint = materialIndex++ % 3 === 1 ? accentTint : primaryTint;
          // Keep authored palette intact; this is only enough to distinguish
          // elites/regions that reuse the same source mesh.
          withColor.color.lerp(tint, 0.08);
        }
        return copy;
      };

      object.material = Array.isArray(object.material)
        ? object.material.map(recolor)
        : recolor(object.material);
    });

    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const targetHeight = (large ? 124 : 92) * spec.scale;
    model.scale.multiplyScalar(targetHeight / Math.max(0.001, size.y));
    model.updateMatrixWorld(true);

    const scaled = new THREE.Box3().setFromObject(model);
    const center = scaled.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -scaled.min.y, -center.z);
    modelBaseY = model.position.y;

    root.remove(fallback.root);
    root.add(model);

    clips = animationSet(loaded.animations, spec.hasWalk);
    mixer = new THREE.AnimationMixer(model);
    play('idle');
  });

  return {
    root,
    step(seconds, speed, dash, attack, travel, turning) {
      if (!mixer || !model) {
        fallback.step(seconds, speed, dash, attack, travel, turning);
        return;
      }

      const dt = Math.min(0.05, Math.max(0, seconds));
      const moving = speed > 18;
      play(attack ? 'attack' : moving ? 'move' : 'idle');
      mixer.update(dt);

      // Minion pack has idle/attack/dead but no walk clip. Add restrained
      // locomotion instead of letting a perfectly static rig slide over terrain.
      if (!spec.hasWalk && moving && !attack) {
        motionPhase += dt * (6 + Math.min(4, speed / 70));
        model.position.y = modelBaseY + Math.abs(Math.sin(motionPhase)) * 2.8;
        model.rotation.z = Math.sin(motionPhase * 0.5) * 0.035;
      } else {
        model.position.y += (modelBaseY - model.position.y) * Math.min(1, dt * 10);
        model.rotation.z *= Math.max(0, 1 - dt * 10);
      }
    },
    dispose() {
      disposed = true;
      mixer?.stopAllAction();
      mixer = null;
      for (const material of ownedMaterials) material.dispose();
      ownedMaterials.clear();
    },
  };
}
