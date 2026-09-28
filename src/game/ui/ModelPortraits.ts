import * as THREE from 'three';
import { createCreature, createHero, type AnimatedModel } from '../render3d/Models';
import type { SkinId } from '../cosmetics/SkinEconomy';

/** One renderer, one model at a time; portraits are cached snapshots of world models. */
const cache = new Map<string, Promise<string>>();
let queue = Promise.resolve();
let renderer: THREE.WebGLRenderer | undefined;
export function modelPortrait(id: string, primary: number, accent: number, elite = false, radius?: number, skinId?:SkinId): Promise<string> {
  const key = `${id}:${primary}:${accent}:${elite}:${radius}:${skinId}`;
  let pending = cache.get(key);
  if (pending) return pending;
  pending = new Promise<string>((resolve, reject) => {
    queue = queue.then(async () => {
      let model: AnimatedModel | undefined;
      try {
        renderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(320, 320);renderer.setPixelRatio(1);renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;renderer.toneMappingExposure = 1.2;
        const scene = new THREE.Scene();scene.add(new THREE.HemisphereLight(0xe4f4ff,0x706044,2));
        const sun = new THREE.DirectionalLight(0xffdfaf,3);sun.position.set(-150,220,200);scene.add(sun);
        model = id === 'hero' ? createHero() : createCreature(id,primary,accent,elite,radius);
        if(id==='hero'){if(skinId)model.setSkin?.(skinId);else model.setTint?.(primary);}
        await model.ready;model.step(.016,0);scene.add(model.root);
        model.root.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(model.root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
        model.root.position.sub(center);
        const distance=Math.max(size.x,size.y,size.z)*3;
        const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,10000);
        camera.position.set(distance*.65,distance*.4,distance);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
        const centered=new THREE.Box3().setFromObject(model.root);let span=1;
        for(const x of [centered.min.x,centered.max.x])for(const y of [centered.min.y,centered.max.y])for(const z of [centered.min.z,centered.max.z]){
          const projected=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);span=Math.max(span,Math.abs(projected.x)*2,Math.abs(projected.y)*2);
        }
        span*=1.1;camera.left=-span/2;camera.right=span/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
        renderer.render(scene,camera);resolve(renderer.domElement.toDataURL('image/webp'));
      } catch(error) { cache.delete(key);reject(error); }
      finally { model?.dispose?.(); }
    });
  });
  cache.set(key,pending);return pending;
}
export function fillPortrait(image: HTMLImageElement, id: string, primary: number, accent: number, elite = false, radius?: number, skinId?:SkinId): void {
  const isCurrent=()=>image.isConnected&&image.dataset.model===id&&Number(image.dataset.primary)===primary&&Number(image.dataset.accent)===accent&&(image.dataset.elite==='true')===elite&&(Number(image.dataset.radius)||undefined)===radius&&image.dataset.skin===skinId;
  void modelPortrait(id, primary, accent, elite, radius, skinId).then(src=>{if(isCurrent())image.src=src;}).catch(()=>{if(isCurrent())image.alt='Модель временно недоступна';});
}
