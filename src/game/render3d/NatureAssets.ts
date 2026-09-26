import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const models = new Map<string, Promise<THREE.Group | null>>();

/** CC0 meshes are shared by clones; each GLB is downloaded only once. */
export function withNatureAsset(name: string, height: number, fallback: THREE.Group): THREE.Group {
  const root = new THREE.Group(); root.add(fallback);
  let promise = models.get(name);
  if (!promise) {
    promise = loader.loadAsync(`${import.meta.env.BASE_URL}assets/models/kenney-nature/${name}.glb`).then(gltf => {
      gltf.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = object.receiveShadow = true;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) if (material instanceof THREE.MeshStandardMaterial) {
          material.metalness = 0; material.roughness = 0.94; material.flatShading = true;
          // Harmonise the pack's bright palette with the game's terrain.
          if (/leaf|green/i.test(material.name)) material.color.setHex(name.includes('fall') ? 0xab8a48 : name.includes('dark') ? 0x3e6660 : 0x649955);
          if (/bark/i.test(material.name)) material.color.setHex(0x775538);
          if (name.startsWith('rock_')) material.color.setHex(material.name === 'grass' ? 0xa4a491 : 0x7f8276);
          if (name.startsWith('plant_')) material.color.setHex(0x96ac59);
        }
      });
      return gltf.scene;
    }).catch(error => { console.warn(`Nature asset unavailable: ${name}`, error); return null; });
    models.set(name, promise);
  }
  void promise.then(source => {
    if (!source) return;
    const model = source.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = height / Math.max(0.001, size.y);
    model.scale.multiplyScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    root.remove(fallback); root.add(model);
  });
  return root;
}
