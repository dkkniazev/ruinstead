import * as T from 'three';
import { RETURN_POINT, RETURN_RADIUS } from '../world/WorldPrototype';
import { terrainHeight } from '../world/WorldTerrain';
import { batchStaticMeshes, disposeBatchedGeometry } from './MeshBatching';
import { buildingLabel, disposeBuildingLabels } from './BuildingLabels';
import { softBox } from './ArtMaterials';

/** Visual anchor for the existing automatic deposit; it is not an E chest. */
export class ReturnCamp3D {
  readonly root = new T.Group();
  private readonly materials = new Set<T.Material>();
  private readonly ring: T.Mesh;
  private readonly flame: T.Mesh;
  private readonly glow = new T.PointLight(0xffb85b, 750, 200, 2);
  private readonly label = buildingLabel('Походный тайник', 145, 'bag');
  private readonly depositLabel = buildingLabel('Сдать добычу', 145, 'bag');

  constructor() {
    const rigid = new T.Group();this.root.add(rigid);
    const material=(color:number,metalness=0)=>{
      const m=new T.MeshStandardMaterial({color,roughness:metalness?.55:.92,metalness});
      this.materials.add(m);return m;
    };
    const wood=material(0x855831),dark=material(0x4a362a),steel=material(0x566773,.22),brass=material(0xe6b65c,.18),stone=material(0x8c8470);
    const box=(m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>{
      const mesh=new T.Mesh(softBox,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
      mesh.castShadow=mesh.receiveShadow=true;rigid.add(mesh);return mesh;
    };
    // Chest sits at the rear of the deposit circle; the approach is open.
    box(dark,-22,16,-25,68,30,39);
    for(let n=0;n<5;n++)box(wood,-49+n*13,18,-4,12,25,3);
    box(wood,-22,35,-25,71,8,43);
    for(const x of [-47,3]){
      box(steel,x,19,-4,5,31,4);box(steel,x,40,-25,5,3,45);
    }
    box(brass,-22,25,-.5,11,12,4);box(dark,-22,26,2,3,4,1);
    box(wood,-66,12,-10,20,21,24);box(steel,-66,15,3,23,4,3);
    const pole=box(dark,-64,72,-43,7,140,7);
    box(brass,pole.position.x,144,-43,13,7,13);
    box(material(0x31566a),-44,110,-43,36,39,3);
    box(brass,-44,126,-41,34,4,2);box(brass,-44,108,-41,8,22,2);
    // Small fire makes home recognisable among the green terrain and ruins.
    for(let n=0;n<9;n++){
      const a=n*Math.PI*2/9;box(stone,34+Math.cos(a)*20,5,Math.sin(a)*20,12,9,12).rotation.y=a;
    }
    box(dark,34,8,0,34,6,7).rotation.y=.4;box(wood,34,11,0,30,5,6).rotation.y=-.7;
    batchStaticMeshes(rigid);
    this.flame=new T.Mesh(new T.OctahedronGeometry(11,0),material(0xffb657));
    (this.flame.material as T.MeshStandardMaterial).emissive.setHex(0xff6a23);
    (this.flame.material as T.MeshStandardMaterial).emissiveIntensity=1.2;
    this.flame.position.set(34,24,0);this.flame.scale.set(.8,1.5,.8);this.root.add(this.flame);
    const ringMat=new T.MeshBasicMaterial({color:0xd7c184,transparent:true,opacity:.2,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    this.materials.add(ringMat);
    const groundY=terrainHeight(RETURN_POINT.x,RETURN_POINT.y);
    const ringGeometry=new T.RingGeometry(RETURN_RADIUS-3,RETURN_RADIUS,64).rotateX(-Math.PI/2);
    const vertices=ringGeometry.attributes.position;
    for(let i=0;i<vertices.count;i++)vertices.setY(i,terrainHeight(RETURN_POINT.x+vertices.getX(i),RETURN_POINT.y+vertices.getZ(i))-groundY+3.8);
    ringGeometry.computeVertexNormals();
    this.ring=new T.Mesh(ringGeometry,ringMat);this.root.add(this.ring);
    this.glow.position.set(34,46,0);this.root.add(this.glow,this.label,this.depositLabel);
    this.depositLabel.visible=false;
    this.root.position.set(RETURN_POINT.x,groundY,RETURN_POINT.y);
  }

  update(time:number,playerX:number,playerZ:number,carrying:boolean):void {
    const near=Math.hypot(playerX-RETURN_POINT.x,playerZ-RETURN_POINT.y)<700;
    this.label.visible=near&&!carrying;this.depositLabel.visible=near&&carrying;
    const pulse=.5+.5*Math.sin(time*.004);
    (this.ring.material as T.MeshBasicMaterial).opacity=carrying?.45+pulse*.2:.25;
    this.flame.scale.y=1.45+Math.sin(time*.015)*.14;this.flame.rotation.y=time*.0007;
    this.glow.intensity=700+Math.sin(time*.019)*95;
  }

  dispose():void {
    disposeBuildingLabels(this.root);disposeBatchedGeometry(this.root);
    this.ring.geometry.dispose();this.flame.geometry.dispose();this.materials.forEach(m=>m.dispose());
    this.root.removeFromParent();
  }
}
