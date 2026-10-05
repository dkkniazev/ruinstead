import * as T from 'three';

/** Draw only the hidden pixels of the animated hero, without tinting visible armour. */
export class HeroOcclusion3D {
  readonly root=new T.Group();
  private readonly mask=new T.MeshBasicMaterial({
    colorWrite:false,depthWrite:false,depthTest:true,depthFunc:T.LessEqualDepth,
    transparent:true,stencilWrite:true,stencilRef:1,stencilFunc:T.AlwaysStencilFunc,
    stencilZPass:T.ReplaceStencilOp,side:T.DoubleSide,forceSinglePass:true,
    // A few depth-buffer units cover float-rounding differences introduced by
    // instancing, so visible armour is still marked before the hidden fill.
    polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-4,
  });
  private readonly fill=new T.MeshBasicMaterial({
    color:0x9ce5cb,opacity:.5,transparent:true,depthWrite:false,depthTest:true,
    depthFunc:T.GreaterDepth,stencilWrite:true,stencilRef:1,stencilFunc:T.NotEqualStencilFunc,
    // Mark each filled pixel so overlapping armour never accumulates opacity.
    stencilZPass:T.ReplaceStencilOp,toneMapped:false,fog:false,side:T.FrontSide,
  });
  private readonly batches=new Map<T.BufferGeometry,{
    mask:T.InstancedMesh;fill:T.InstancedMesh;capacity:number;sources:T.Mesh[];
  }>();
  private readonly mirrored=new Map<T.Mesh,{mask:T.Mesh;fill:T.Mesh}>();
  private readonly inverseRoot=new T.Matrix4();
  private readonly transform=new T.Matrix4();
  private disposed=false;

  constructor(){this.root.matrixAutoUpdate=false;}

  private createBatch(geometry:T.BufferGeometry,capacity:number){
    const mask=new T.InstancedMesh(geometry,this.mask,capacity);
    const fill=new T.InstancedMesh(geometry,this.fill,capacity);
    mask.renderOrder=90;fill.renderOrder=91;
    for(const mesh of [mask,fill]){
      mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.root.add(mesh);
    }
    return {mask,fill,capacity,sources:[] as T.Mesh[]};
  }

  private releaseBatch(batch:{mask:T.InstancedMesh;fill:T.InstancedMesh}):void {
    this.root.remove(batch.mask,batch.fill);
    // InstancedMesh.dispose releases only its instance resources, not borrowed geometry.
    batch.mask.dispose();batch.fill.dispose();
  }

  update(hero:T.Group):void {
    if(this.disposed)return;
    hero.updateWorldMatrix(true,true);
    // Keep instance translations near zero. Uploading large absolute world
    // coordinates loses depth precision relative to the ordinary hero draws.
    this.root.parent?.updateWorldMatrix(true,false);
    if(this.root.parent)this.inverseRoot.copy(this.root.parent.matrixWorld).invert();
    else this.inverseRoot.identity();
    this.root.matrix.multiplyMatrices(this.inverseRoot,hero.matrixWorld);
    this.root.updateWorldMatrix(false,false,true);
    this.inverseRoot.copy(this.root.matrixWorld).invert();
    for(const batch of this.batches.values())batch.sources.length=0;
    const aliveMirrored=new Set<T.Mesh>();
    hero.traverseVisible(object=>{
      if(!(object instanceof T.Mesh)||object instanceof T.InstancedMesh||object instanceof T.SkinnedMesh)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      if(materials.some(m=>m.transparent||!(m instanceof T.MeshStandardMaterial||m instanceof T.MeshBasicMaterial)))return;
      this.transform.multiplyMatrices(this.inverseRoot,object.matrixWorld);
      // Three's instancing does not support reflected instance transforms.
      if(this.transform.determinant()<0){
        aliveMirrored.add(object);
        let pair=this.mirrored.get(object);
        if(!pair){
          pair={mask:new T.Mesh(object.geometry,this.mask),fill:new T.Mesh(object.geometry,this.fill)};
          pair.mask.renderOrder=90;pair.fill.renderOrder=91;
          for(const mesh of [pair.mask,pair.fill]){mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;this.root.add(mesh);}
          this.mirrored.set(object,pair);
        }
        for(const mesh of [pair.mask,pair.fill]){mesh.geometry=object.geometry;mesh.matrix.copy(this.transform);mesh.matrixWorldNeedsUpdate=true;}
        return;
      }
      let batch=this.batches.get(object.geometry);
      if(!batch){batch=this.createBatch(object.geometry,1);this.batches.set(object.geometry,batch);}
      batch.sources.push(object);
    });
    for(const [geometry,existing]of this.batches){
      if(!existing.sources.length){this.releaseBatch(existing);this.batches.delete(geometry);continue;}
      let batch=existing;
      if(existing.sources.length>existing.capacity){
        this.releaseBatch(existing);
        batch=this.createBatch(geometry,2**Math.ceil(Math.log2(existing.sources.length)));
        batch.sources=existing.sources;this.batches.set(geometry,batch);
      }
      batch.mask.count=batch.fill.count=batch.sources.length;
      batch.sources.forEach((source,index)=>{
        this.transform.multiplyMatrices(this.inverseRoot,source.matrixWorld);
        batch.mask.setMatrixAt(index,this.transform);batch.fill.setMatrixAt(index,this.transform);
      });
      batch.mask.instanceMatrix.needsUpdate=batch.fill.instanceMatrix.needsUpdate=true;
    }
    for(const [source,pair]of this.mirrored)if(!aliveMirrored.has(source)){
      this.root.remove(pair.mask,pair.fill);this.mirrored.delete(source);
    }
    this.root.matrixWorldNeedsUpdate=true;
  }

  dispose():void {
    if(this.disposed)return;this.disposed=true;
    // Geometry is borrowed from the live hero; it is never owned by this overlay.
    for(const batch of this.batches.values())this.releaseBatch(batch);
    this.root.clear();this.root.removeFromParent();this.batches.clear();this.mirrored.clear();
    this.mask.dispose();this.fill.dispose();
  }
}
