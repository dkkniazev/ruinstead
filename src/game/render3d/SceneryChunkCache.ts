import * as THREE from 'three';
import type { RenderVisibility } from './RenderVisibility';

type Chunk={root:THREE.Group;bounds:THREE.Sphere;used:number};

/** A bounded recent-area cache. Only the current neighborhood may render or
 * cast shadows; leaving it does not immediately discard expensive geometry. */
export class SceneryChunkCache {
  private readonly chunks=new Map<string,Chunk>();
  private active=new Set<string>();
  private cell='';
  private epoch=0;
  private built=0;
  constructor(
    private readonly create:(x:number,z:number)=>THREE.Group,
    private readonly dispose:(root:THREE.Group)=>void,
    private readonly capacity=121,
    private readonly radius=3,
  ) {
    if(capacity<(radius*2+1)**2)throw new Error('Chunk capacity must hold the active neighborhood');
  }
  get size():number{return this.chunks.size;}
  get activeCount():number{return this.active.size;}
  get builtCount():number{return this.built;}
  update(x:number,z:number,view:RenderVisibility):void {
    const cell=`${x}:${z}`;
    if(cell!==this.cell){
      this.epoch++;const active=new Set<string>();
      for(let dz=-this.radius;dz<=this.radius;dz++)for(let dx=-this.radius;dx<=this.radius;dx++){
        const cx=x+dx,cz=z+dz,key=`${cx}:${cz}`;active.add(key);
        let chunk=this.chunks.get(key);
        if(!chunk){
          const root=this.create(cx,cz);
          chunk={root,bounds:new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere()),used:0};
          this.chunks.set(key,chunk);this.built++;
        }
        chunk.used=this.epoch;
      }
      this.active=active;this.cell=cell;
      const old=[...this.chunks].filter(([key])=>!active.has(key)).sort((a,b)=>a[1].used-b[1].used);
      for(const [key,chunk]of old){
        if(this.chunks.size<=this.capacity)break;
        chunk.root.removeFromParent();this.dispose(chunk.root);this.chunks.delete(key);
      }
    }
    for(const [key,chunk]of this.chunks)chunk.root.visible=this.active.has(key)&&view.includesSphere(chunk.bounds);
  }
  clear():void {
    for(const chunk of this.chunks.values()){chunk.root.removeFromParent();this.dispose(chunk.root);}
    this.chunks.clear();this.active.clear();this.cell='';
  }
}
