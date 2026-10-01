import * as T from 'three';
import { foliageCrown, flowerGeometry, flagstoneGeometry } from './NatureForms';
import { terrainHeight } from '../world/WorldTerrain';

type Site = { id: string; x: number; y: number };
const noise=(a:number,b:number)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};

/** Ground dressing stays ankle-high; building footprints and walkways stay clear. */
export function settlementScenery(cx:number,cz:number,sites:readonly Site[]):T.Group {
  const root=new T.Group();
  const stone=new T.MeshStandardMaterial({color:0xa89d84,roughness:1,flatShading:true});
  const pavers=new T.InstancedMesh(flagstoneGeometry(),stone,340);
  const transform=new T.Object3D();let count=0;
  const pave=(x:number,z:number,w:number,d:number,angle:number)=>{
    transform.position.set(x,terrainHeight(x,z)+1,z);transform.rotation.set(0,angle,0);transform.scale.set(w,4,d);transform.updateMatrix();pavers.setMatrixAt(count,transform.matrix);
    pavers.setColorAt(count,new T.Color().setHSL(.105,.17,.57+noise(x,z)*.15));count++;
  };
  for(let row=-5;row<=5;row++)for(let col=-5;col<=5;col++){
    const x=col*24+(row%2)*12,z=row*23;if(Math.hypot(x,z)>122)continue;
    pave(cx+x+(noise(row,col)-.5)*2,cz+z,21+noise(row,col)*2,20+noise(col,row)*2,(noise(row+50,col)-.5)*.15);
  }
  for(const site of sites){
    const endX=site.x,endZ=site.y+(site.id==='forge'?70:100),dx=endX-cx,dz=endZ-cz,length=Math.hypot(dx,dz);
    const nx=-dz/length,nz=dx/length,bend=site.id==='house'?-42:site.id==='workshop'?45:-24;
    const segments=Math.ceil(length/24),positions:number[]=[],colors:number[]=[];
    const point=(t:number,side:number)=>{const wave=Math.sin(t*Math.PI)*bend;return {x:cx+dx*t+nx*(wave+side),z:cz+dz*t+nz*(wave+side)};};
    for(let i=0;i<segments;i++){
      const t=i/segments,u=(i+1)/segments;
      for(const [a,b]of [[-42,-29],[-29,29],[29,42]]){
        const vertices=[point(t,a),point(t,b),point(u,b),point(u,a)];
        for(const index of [0,1,2,0,2,3]){const v=vertices[index];positions.push(v.x,terrainHeight(v.x,v.z)+1.4,v.z);const c=new T.Color(a===-29?0xb6a181:0x8c8c64).multiplyScalar(.96+noise(i,site.x)*.06);colors.push(c.r,c.g,c.b);}
      }
      if(i%3===0&&i>2){for(const side of [-36,36]){const v=point(t,side);pave(v.x,v.z,10,18,Math.atan2(dx,dz));}}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
    const path=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));path.receiveShadow=true;root.add(path);
  }
  pavers.count=count;pavers.receiveShadow=true;root.add(pavers);

  // Low planted beds frame the paths instead of scattering decoration in them.
  const beds=[[-120,-115,75,33],[190,145,80,37],[-325,145,60,30],[335,-190,70,32]];
  const leaf=new T.MeshStandardMaterial({vertexColors:true,roughness:1}),flower=new T.MeshStandardMaterial({color:0xfff3be,roughness:1,side:T.DoubleSide});
  const foliage=new T.InstancedMesh(foliageCrown(3,0x518151).clone(),leaf,64),flowers=new T.InstancedMesh(flowerGeometry(),flower,192);
  let n=0;
  for(const [bx,bz,w,d]of beds){
    for(let i=0;i<16;i++){
      const x=cx+bx+(noise(i,bx)-.5)*w,z=cz+bz+(noise(i,bz)-.5)*d;
      const height=7+noise(bx,i)*5;
      transform.position.set(x,terrainHeight(x,z)+height,z);transform.scale.set(12+noise(i,bz)*5,height,11);transform.rotation.set(0,i,0);transform.updateMatrix();foliage.setMatrixAt(n,transform.matrix);
      foliage.setColorAt(n,new T.Color().setHSL(.27,.23,.77+noise(i,bx)*.18));
      for(let petal=0;petal<3;petal++){
        transform.position.set(x+(petal-1)*6,terrainHeight(x,z)+height*1.55,z+Math.sin(petal*3)*5);
        transform.scale.setScalar(3);transform.rotation.set(.2,petal,0);transform.updateMatrix();
        const index=n*3+petal;flowers.setMatrixAt(index,transform.matrix);flowers.setColorAt(index,new T.Color(petal===1?0xdfa3ae:0xffdda0));
      }
      n++;
    }
  }
  foliage.count=n;flowers.count=n*3;foliage.castShadow=true;root.add(foliage,flowers);
  root.traverse(o=>{if(o instanceof T.Mesh)o.userData.settlementOwned=true;});
  return root;
}

export function disposeSettlementScenery(root:T.Object3D):void{
  const materials=new Set<T.Material>();
  root.traverse(o=>{if(o instanceof T.Mesh&&o.userData.settlementOwned){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  materials.forEach(m=>{if(!m.userData.sharedArtMaterial)m.dispose();});
}
