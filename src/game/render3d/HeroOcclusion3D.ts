import * as T from 'three';

/** Draw only the hidden pixels of the animated hero, without tinting visible armour. */
export class HeroOcclusion3D {
  readonly root=new T.Group();
  private readonly mask=new T.MeshBasicMaterial({
    colorWrite:false,depthWrite:false,depthTest:true,depthFunc:T.LessEqualDepth,
    transparent:true,stencilWrite:true,stencilRef:1,stencilFunc:T.AlwaysStencilFunc,
    stencilZPass:T.ReplaceStencilOp,side:T.DoubleSide,forceSinglePass:true,
  });
  private readonly fill=new T.MeshBasicMaterial({
    color:0x9ce5cb,opacity:.5,transparent:true,depthWrite:false,depthTest:true,
    depthFunc:T.GreaterDepth,stencilWrite:true,stencilRef:1,stencilFunc:T.NotEqualStencilFunc,
    // Mark each filled pixel so overlapping armour never accumulates opacity.
    stencilZPass:T.ReplaceStencilOp,toneMapped:false,fog:false,side:T.FrontSide,
  });
  private readonly meshes=new Map<T.Mesh,{mask:T.Mesh;fill:T.Mesh}>();

  update(hero:T.Group):void {
    hero.updateWorldMatrix(true,true);
    const alive=new Set<T.Mesh>();
    hero.traverseVisible(object=>{
      if(!(object instanceof T.Mesh)||object instanceof T.InstancedMesh||object instanceof T.SkinnedMesh)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      if(materials.some(m=>m.transparent||!(m instanceof T.MeshStandardMaterial||m instanceof T.MeshBasicMaterial)))return;
      alive.add(object);
      let pair=this.meshes.get(object);
      if(!pair){
        pair={mask:new T.Mesh(object.geometry,this.mask),fill:new T.Mesh(object.geometry,this.fill)};
        pair.mask.renderOrder=90;pair.fill.renderOrder=91;
        for(const mesh of [pair.mask,pair.fill]){mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;this.root.add(mesh);}
        this.meshes.set(object,pair);
      }
      for(const mesh of [pair.mask,pair.fill]){mesh.geometry=object.geometry;mesh.matrix.copy(object.matrixWorld);}
    });
    for(const [source,pair]of this.meshes)if(!alive.has(source)){
      this.root.remove(pair.mask,pair.fill);this.meshes.delete(source);
    }
  }

  dispose():void {
    // Geometry is borrowed from the live hero; it is never owned by this overlay.
    this.root.clear();this.root.removeFromParent();this.meshes.clear();this.mask.dispose();this.fill.dispose();
  }
}
