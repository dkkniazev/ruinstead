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

type GobkitAsset = {
  key: string;
  url: string;
  hasWalk: boolean;
  scale: number;
};

const loader = new GLTFLoader();
const models = new Map<string, Promise<LoadedCreature | null>>();

const GOBKIT = 'https://gobkit.com/freebies';

function stableIndex(value: string, length: number): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % Math.max(1, length);
}

function asset(path: string, key: string, hasWalk: boolean, scale = 1): GobkitAsset {
  return {
    key,
    url: `${GOBKIT}/${path}`,
    hasWalk,
    scale,
  };
}

/**
 * Only use external models when their silhouette actually matches the enemy.
 * Everything else deliberately falls back to the game's bespoke procedural
 * creature so we never turn a worm, spider, golem or dragon into a random pet.
 */
function creatureAssetFor(id: string): GobkitAsset | null {
  if (id.includes('boar')) {
    return asset('animalB/Boar.glb', 'boar', true, 1.04);
  }

  if (id.includes('ram')) {
    return asset('animalB/Goat.glb', 'goat', true, 1.02);
  }

  if (id.includes('bat')) {
    return asset('animal/Bat.glb', 'bat', true, 0.94);
  }

  if (id.includes('harpy') || id.includes('vulture')) {
    return asset('animalB/Owl.glb', 'owl', true, 1.03);
  }

  if (
    id.includes('jackal') ||
    id.includes('hound') ||
    id.includes('cat') ||
    id.includes('stalker') ||
    id.includes('beast')
  ) {
    const beasts = [
      asset('animalB/Rat.glb', 'rat', true, 1.08),
      asset('animalB/Marmot.glb', 'marmot', true, 1.06),
      asset('animal/Corgi.glb', 'corgi', true, 1.06),
      asset('animal/Rhino.glb', 'rhino', true, 1.12),
    ] as const;
    return beasts[stableIndex(id, beasts.length)];
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
      asset('minion/minion-a01.glb', 'minion-a01', false, 1),
      asset('minion/minion-b01.glb', 'minion-b01', false, 1),
      asset('minion/minion-c01.glb', 'minion-c01', false, 1.02),
      asset('minion/minion-d01.glb', 'minion-d01', false, 1.03),
    ] as const;
    return minions[stableIndex(id, minions.length)];
  }

  return null;
}

function loadCreature(spec: GobkitAsset): Promise<LoadedCreature | null> {
  let promise = models.get(spec.key);
  if (!promise) {
    promise = loader
      .loadAsync(spec.url)
      .then((gltf) => ({
        scene: gltf.scene,
        animations: gltf.animations,
      }))
      .catch((error) => {
        console.warn(`Gobkit creature unavailable: ${spec.key}`, error);
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

function animationSet(
  animations: readonly THREE.AnimationClip[],
  hasWalk: boolean,
): ClipSet {
  const byName = new Map(
    animations.map((clip) => [
      clip.name.toLowerCase(),
      clip,
    ]),
  );

  const idle =
    byName.get('idle');
  const attack =
    byName.get('attack');
  const walk =
    byName.get('walk') ??
    byName.get('move');

  if (idle || attack || walk) {
    return {
      idle: idle ?? walk,
      move: hasWalk
        ? walk ?? idle
        : idle,
      attack:
        attack ?? idle ?? walk,
    };
  }

  // Older mirrors of the packs kept all actions in one 24 fps master clip.
  // Support that layout as a fallback while preferring the current named clips.
  const master =
    animations[0];

  if (!master) {
    return {};
  }

  return {
    idle:
      THREE.AnimationUtils.subclip(
        master,
        'idle',
        0,
        30,
        24,
      ),
    attack:
      THREE.AnimationUtils.subclip(
        master,
        'attack',
        30,
        60,
        24,
      ),
    move:
      hasWalk
        ? THREE.AnimationUtils.subclip(
            master,
            'walk',
            90,
            120,
            24,
          )
        : THREE.AnimationUtils.subclip(
            master,
            'idle-move',
            0,
            30,
            24,
          ),
  };
}

export function withCreatureAsset(
  id: string,
  primary: number,
  accent: number,
  large: boolean,
  fallback: CreatureAnimation,
): CreatureAnimation {
  const spec =
    creatureAssetFor(id);

  if (!spec) {
    return fallback;
  }

  const root =
    new THREE.Group();
  root.add(fallback.root);

  let mixer:
    THREE.AnimationMixer | null =
    null;
  let clips:
    ClipSet = {};
  let current:
    THREE.AnimationAction | null =
    null;
  let currentClip:
    THREE.AnimationClip | undefined;
  const ownedMaterials =
    new Set<THREE.Material>();
  let disposed = false;

  const play = (
    state:
      'idle' | 'move' | 'attack',
  ): void => {
    if (!mixer) {
      return;
    }

    const clip =
      state === 'attack'
        ? clips.attack
        : state === 'move'
          ? clips.move
          : clips.idle;

    if (
      !clip ||
      currentClip === clip
    ) {
      return;
    }

    const next =
      mixer.clipAction(clip);
    current?.fadeOut(0.1);
    next
      .reset()
      .setLoop(
        THREE.LoopRepeat,
        Infinity,
      )
      .fadeIn(0.1)
      .play();

    current = next;
    currentClip = clip;
  };

  void loadCreature(spec).then(
    (loaded) => {
      if (
        !loaded ||
        disposed
      ) {
        return;
      }

      const model =
        cloneSkeleton(
          loaded.scene,
        ) as THREE.Group;

      // Clone materials per unit so elites/bosses can receive a restrained
      // species tint without mutating the cached source or other instances.
      const primaryTint =
        new THREE.Color(primary);
      const accentTint =
        new THREE.Color(accent);
      let materialIndex = 0;

      model.traverse(
        (object) => {
          if (
            !(object instanceof THREE.Mesh)
          ) {
            return;
          }

          object.castShadow = true;
          object.receiveShadow = true;
          object.frustumCulled = true;

          const recolor = (
            material:
              THREE.Material,
          ): THREE.Material => {
            const copy =
              material.clone();
            ownedMaterials.add(copy);

            const withColor =
              copy as THREE.Material & {
                color?: THREE.Color;
              };

            if (withColor.color) {
              const tint =
                materialIndex++ % 3 === 1
                  ? accentTint
                  : primaryTint;
              withColor.color.lerp(
                tint,
                0.12,
              );
            }

            return copy;
          };

          object.material =
            Array.isArray(
              object.material,
            )
              ? object.material.map(
                  recolor,
                )
              : recolor(
                  object.material,
                );
        },
      );

      model.updateMatrixWorld(
        true,
      );

      const bounds =
        new THREE.Box3()
          .setFromObject(
            model,
          );
      const size =
        bounds.getSize(
          new THREE.Vector3(),
        );
      const targetHeight =
        (
          large
            ? 124
            : 92
        ) *
        spec.scale;

      model.scale.multiplyScalar(
        targetHeight /
          Math.max(
            0.001,
            size.y,
          ),
      );
      model.updateMatrixWorld(
        true,
      );

      const scaled =
        new THREE.Box3()
          .setFromObject(
            model,
          );
      const center =
        scaled.getCenter(
          new THREE.Vector3(),
        );

      model.position.set(
        -center.x,
        -scaled.min.y,
        -center.z,
      );

      root.remove(
        fallback.root,
      );
      root.add(model);

      clips =
        animationSet(
          loaded.animations,
          spec.hasWalk,
        );
      mixer =
        new THREE.AnimationMixer(
          model,
        );
      play('idle');
    },
  );

  return {
    root,
    step(
      seconds,
      speed,
      _dash,
      attack,
    ) {
      if (!mixer) {
        fallback.step(
          seconds,
          speed,
          false,
          attack,
        );
        return;
      }

      play(
        attack
          ? 'attack'
          : speed > 18
            ? 'move'
            : 'idle',
      );

      mixer.update(
        Math.min(
          0.05,
          Math.max(
            0,
            seconds,
          ),
        ),
      );
    },
    dispose() {
      disposed = true;
      mixer?.stopAllAction();
      mixer = null;
      for (
        const material of
        ownedMaterials
      ) {
        material.dispose();
      }
      ownedMaterials.clear();
    },
  };
}
