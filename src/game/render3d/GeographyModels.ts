import * as T from 'three';
import { GEOGRAPHY_LANDMARKS, REGION_GEOGRAPHY, type GeographyLandmark } from '../world/RegionGeography';
import { terrainHeight } from '../world/WorldTerrain';
import { boundarySurfaceMaterial } from './ArtMaterials';
import { batchStaticMeshes } from './MeshBatching';
import { fracturedRock, naturalSurfaceMaterial } from './NatureForms';

const noise=(n:number)=>{const v=Math.sin(n*127.13)*43758.5453;return v-Math.floor(v);};

/** Layered, asymmetric rock masses. Shared contours keep strata watertight. */
function outcrop(radius:number,height:number,seed:number,colors:readonly number[],kind:string):T.Mesh {
  const sides=kind==='basalt'?6:9,positions:number[]=[],rgb:number[]=[];
  const levels=kind==='moss'?[0,.12,.19,.46,.53,.83,.95,1]:kind==='mesa'||kind==='strata'?[0,.12,.23,.51,.62,.88,1]:[0,.2,.55,.82,1];
  const rings=levels.map((h,band)=>Array.from({length:sides},(_,n)=>{
    const a=n/sides*Math.PI*2,profile=kind==='basalt'?1-.12*h:kind==='slate'?1-.73*h:kind==='obsidian'?1-.89*h:kind==='moss'?1-.15*h:1-.48*h;
    const r=radius*profile*(.82+noise(seed+n*7)*.18)*(band%2?.93:1);
    return new T.Vector3(Math.cos(a)*r+h*radius*.14,h*height+(band===0?0:(noise(seed+n*11)-.5)*height*.09),Math.sin(a)*r);
  }));
  const emit=(a:T.Vector3,b:T.Vector3,c:T.Vector3,shade:T.Color)=>{for(const v of [a,b,c]){positions.push(v.x,v.y,v.z);rgb.push(shade.r,shade.g,shade.b);}};
  for(let band=1;band<rings.length;band++)for(let n=0;n<sides;n++){
    const j=(n+1)%sides,color=new T.Color(kind==='moss'&&band===rings.length-1?0x73994c:colors[band%colors.length]).multiplyScalar(.88+noise(seed+n)*.18);
    emit(rings[band-1][n],rings[band][n],rings[band][j],color);emit(rings[band-1][n],rings[band][j],rings[band-1][j],color);
  }
  const top=rings[rings.length-1],middle=new T.Vector3().copy(top[0]);middle.set(0,height,0);
  for(let n=0;n<sides;n++)emit(middle,top[(n+1)%sides],top[n],new T.Color(kind==='moss'?0x8ab159:colors[1]).multiplyScalar(.96+noise(seed+n)*.12));
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.computeVertexNormals();
  const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:kind==='obsidian'?.48:.91,metalness:kind==='obsidian'?.16:0,flatShading:true}));
  m.castShadow=true;m.receiveShadow=true;m.userData.buildingOwned=true;return m;
}
function rootCurve(group:T.Group,points:T.Vector3[],radius:number,color:number):void {
  const geo=new T.TubeGeometry(new T.CatmullRomCurve3(points),9,radius,5,false);
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:1}));mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.buildingOwned=true;group.add(mesh);
}
export function createGeographyLandmark(site:GeographyLandmark):T.Group {
  const group=new T.Group(),palette=REGION_GEOGRAPHY[site.region-1],base=terrainHeight(site.x,site.y);
  group.name=site.id;group.position.set(site.x,base-4,site.y);
  if(site.kind==='pool'){
    // Irregular shallow basin: the bed and rim share the same shoreline.
    const outline=Array.from({length:32},(_,i)=>{const a=i/32*Math.PI*2,r=site.radius*(.78+.07*Math.sin(a*3+site.seed)+.04*Math.sin(a*5));return [Math.cos(a)*r,Math.sin(a)*r];});
    const positions:number[]=[],colors:number[]=[],bedPositions:number[]=[],bedColors:number[]=[];
    for(let n=0;n<32;n++){
      const a=outline[n],b=outline[(n+1)%32];
      for(const v of [[0,0],b,a]){positions.push(v[0],17,v[1]);const shade=v[0]===0&&v[1]===0?.72:1;colors.push(shade,shade,shade);}
      const vertices=[[a[0],15,a[1]],[b[0],15,b[1]],[b[0]*1.19,6,b[1]*1.19],[a[0]*1.19,6,a[1]*1.19]];
      for(const i of [0,1,2,0,2,3]){bedPositions.push(...vertices[i]);const c=new T.Color(site.region===1?0x8c9a73:0x9ea798);bedColors.push(c.r,c.g,c.b);}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    const water=new T.Mesh(geometry,boundarySurfaceMaterial(false));water.userData.uniqueGeometry=true;group.add(water);
    const bed=new T.BufferGeometry();bed.setAttribute('position',new T.Float32BufferAttribute(bedPositions,3));bed.setAttribute('color',new T.Float32BufferAttribute(bedColors,3));bed.computeVertexNormals();
    const rim=new T.Mesh(bed,new T.MeshStandardMaterial({vertexColors:true,roughness:.9,side:T.DoubleSide}));rim.receiveShadow=true;rim.userData.buildingOwned=true;group.add(rim);
    for(let n=0;n<9;n++){
      const a=n/9*Math.PI*2+.19*Math.sin(n*2),r=site.radius*(.83+.07*Math.sin(a*3+site.seed)+.04*Math.sin(a*5));
      const stone=new T.Mesh(fracturedRock(n+site.seed,n%3===0?palette.rock:palette.light).clone(),naturalSurfaceMaterial);
      const width=14+noise(n+site.seed)*11,height=23+noise(n+4)*17;
      stone.position.set(Math.cos(a)*r,7,Math.sin(a)*r);stone.scale.set(width,height,width*.82);stone.rotation.y=a;
      stone.castShadow=stone.receiveShadow=true;stone.userData.buildingOwned=true;group.add(stone);
      if(site.region===1&&n%2===0)for(let k=0;k<3;k++)rootCurve(group,[new T.Vector3(Math.cos(a)*r,21,Math.sin(a)*r),new T.Vector3(Math.cos(a)*r+3*k,50+k*6,Math.sin(a)*r+4)],1.3,0x72905c);
    }
  } else {
    const count=site.kind==='basalt'?9:site.kind==='slate'?5:4;
    for(let i=0;i<count;i++){
      const angle=i*2.4+site.seed,spread=i?site.radius*.56:0,r=site.radius*(site.kind==='basalt'?.27:i?.39:.62);
      const height=site.kind==='moss'?145-i*21:site.kind==='mesa'?90+i*18:site.kind==='slate'?160-i*17:site.kind==='basalt'?90+noise(i+site.seed)*100:site.kind==='obsidian'?190-i*28:site.kind==='chalk'?125-i*12:76+i*11;
      const stone=outcrop(r,height,site.seed+i,site.kind==='mesa'||site.kind==='strata'?[palette.rock,palette.light,palette.rock,palette.soil]:[palette.rock,palette.rock,palette.soil,palette.rock],site.kind);
      const sx=Math.cos(angle)*spread,sz=Math.sin(angle)*spread;
      stone.position.set(sx,terrainHeight(site.x+sx,site.y+sz)-base-3,sz);stone.rotation.y=angle;
      if(site.kind==='slate')stone.rotation.z=-.18;if(site.kind==='obsidian')stone.rotation.z=i%2?.14:-.16;
      group.add(stone);
      if(site.kind==='moss'){

        for(let root=0;root<2;root++)rootCurve(group,[new T.Vector3(stone.position.x-12+root*24,stone.position.y+height*.85,stone.position.z),new T.Vector3(stone.position.x+r*.7,stone.position.y+height*.4,stone.position.z+r*.4),new T.Vector3(stone.position.x+r,terrainHeight(site.x+stone.position.x+r,site.y+stone.position.z+r*.6)-base+3,stone.position.z+r*.6)],3.5,0x60503b);
      }
      if(site.kind==='basalt'||site.kind==='obsidian'){
        const glow=new T.Mesh(new T.CylinderGeometry(2.2,4,height*.58,4),new T.MeshStandardMaterial({color:0xf1a255,emissive:0xff601b,emissiveIntensity:.9}));
        glow.position.copy(stone.position);glow.position.y+=height*.29;glow.position.z+=r*.8;glow.rotation.z=.09;glow.userData.uniqueGeometry=true;group.add(glow);
      }
    }
  }
  const original=new Set<T.Material>();group.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])original.add(m);});
  batchStaticMeshes(group);
  group.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])original.delete(m);});
  for(const m of original)m.dispose();
  // Everything here is owned by the landmark. Materials are shared only after batching.
  group.traverse(o=>{if(o instanceof T.Mesh)o.userData.geographyOwned=true;});
  return group;
}
export function createRegionLandmarks(region:number):T.Group {
  const group=new T.Group();for(const site of GEOGRAPHY_LANDMARKS.filter(p=>p.region===region))group.add(createGeographyLandmark(site));return group;
}
