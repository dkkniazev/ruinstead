import * as T from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import type { CreatureShape } from './CreatureCatalog';
import { horn } from './CreatureArt';
import { MAMMAL_FORMS, isMammalShape, type MammalShape } from './MammalForms';
import { HUMANOID_FORMS, isHumanoidShape, type HumanoidShape } from './HumanoidForms';
import { REPTILE_FORMS, isReptileShape, type ReptileShape } from './ReptileForms';
import { paintSurfaceFace } from './SurfaceFace';

type Volume = [number,number,number,number,number,number,number?];
const cache=new Map<string,T.BufferGeometry>();
export const CREATURE_SCULPT_REVISION='2026-10-04-creature-skin-v23';
// Keep the painted aperture and its sculpted orbit in the same anatomical frame.
// The nasal tip sits below it; the narrow bridge separates the inner eye corners.
export const GOBLIN_FACE={eyeX:9.7,eyeY:95.2,eyeWidth:4.35,eyeHeight:2.85,eyeSlope:.10,
  nose:[0,85.8,20.5,6.1,5.1,6.5] as Volume};
const shared=new Set<T.BufferGeometry>();
const pigments=new Map<string,T.MeshStandardMaterial>();
// Small pupils, rivets and ear insets do not need the body surface's density.
const smoothOrb=new T.SphereGeometry(1,8,6);
const accentSurface=new T.IcosahedronGeometry(1,1);
const roundedPlate=new RoundedBoxGeometry(1,1,1,1,.16);
function carvedSlab():T.BufferGeometry {
  const key='cover-carved-slab',cached=cache.get(key);if(cached)return cached;
  const points:T.Vector3[]=[];
  for(let axis=0;axis<3;axis++)for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    const p=new T.Vector3(x*.63,y*.63,z*.63);p.setComponent(axis,[x,y,z][axis]*.94);points.push(p);
  }
  const geometry=new ConvexGeometry(points);geometry.computeVertexNormals();
  shared.add(geometry);cache.set(key,geometry);return geometry;
}
shared.add(smoothOrb);shared.add(accentSurface);shared.add(roundedPlate);
function pigment(color:number,metal=false,paint=false):T.MeshStandardMaterial {
  const key=[color,metal,paint].join(':');let material=pigments.get(key);
  if(!material){material=new T.MeshStandardMaterial({color,roughness:metal?.43:.82,metalness:metal?.28:0,vertexColors:paint});pigments.set(key,material);}return material;
}
function add(parent:T.Object3D,geometry:T.BufferGeometry,color:number,x=0,y=0,z=0,sx=1,sy=sx,sz=sx,metal=false):T.Mesh {
  const mesh=new T.Mesh(geometry,pigment(color,metal,!!geometry.getAttribute('color')));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const orb=(p:T.Object3D,c:number,x:number,y:number,z:number,sx:number,sy=sx,sz=sx)=>add(p,smoothOrb,c,x,y,z,sx,sy,sz);
const plate=(p:T.Object3D,c:number,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>add(p,roundedPlate,c,x,y,z,sx,sy,sz,true);
const smoothMin=(a:number,b:number,k:number):number=>{const h=Math.max(0,k-Math.abs(a-b))/k;return Math.min(a,b)-h*h*k*.25;};

/** A closed asymmetric cap with painted freckles, not beads pasted on a red orb. */
function fungusCap(elite:boolean,accent:number):T.BufferGeometry {
  const key='profile-fungus-cap-'+elite+'-'+accent,cached=cache.get(key);if(cached)return cached;
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],sides=32;
  const rings=[[-.37,.04],[-.36,.54],[-.28,.88],[-.10,1],[.10,.97],[.35,.86],[.62,.69],[.84,.46],[1,.03]];
  const top=new T.Color(accent),rim=new T.Color(0x98573f),cream=new T.Color(0xe4d3a2),under=new T.Color(0xb5a079);
  for(let band=0;band<rings.length;band++)for(let n=0;n<sides;n++){
    const angle=n/sides*Math.PI*2,[y,r]=rings[band],radius=r*(1+.035*Math.sin(angle*3)+.025*Math.cos(angle*5));
    const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius*.96;
    positions.push(x,y+.035*Math.sin(angle*3)*r,z);
    let color=y<-.15?under.clone().lerp(cream,(y+.37)*2):rim.clone().lerp(top,T.MathUtils.smoothstep(y,-.1,.5));
    if(y>=0){
      let spot=0;
      for(let j=0;j<9;j++){
        const a=j*2.399,rr=.29+(j%3)*.22,cx=Math.cos(a)*rr,cz=Math.sin(a)*rr;
        const distance=Math.hypot((x-cx)*1.05,z-cz),width=.10+(j%3)*.022;
        spot=Math.max(spot,1-T.MathUtils.smoothstep(distance,width*.76,width));
      }
      color.lerp(cream,spot*.9);
    }
    color.multiplyScalar(.9+y*.1);colors.push(color.r,color.g,color.b);
    if(band){const a=(band-1)*sides+n,b=(band-1)*sides+(n+1)%sides,c=band*sides+n,d=band*sides+(n+1)%sides;
      indices.push(a,c,d,a,d,b);}
  }
  for(const [band,y]of [[0,rings[0][0]],[rings.length-1,rings[rings.length-1][0]]]){
    const center=positions.length/3;positions.push(0,y,0);const c=band?top:under;colors.push(c.r,c.g,c.b);
    for(let n=0;n<sides;n++){const a=band*sides+n,b=band*sides+(n+1)%sides;indices.push(...(band?[center,b,a]:[center,a,b]));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.userData.sculptedSurface=true;shared.add(geometry);cache.set(key,geometry);return geometry;
}

/** One curved feather fan: joined coverts, scalloped primaries and a closed rim. */
function featherFan(primary:number,accent:number,elite:boolean):T.BufferGeometry {
  const key='profile-feather-fan-'+primary+'-'+accent+'-'+elite,cached=cache.get(key);if(cached)return cached;
  const outline=[[0,0],[13,18],[25,26],[45,18],[elite?69:64,5],[63,-5],
    [58,-13],[53,-8],[50,-20],[44,-14],[41,-26],[35,-20],[31,-30],
    [25,-23],[19,-31],[14,-25],[8,-30],[3,-16]];
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],count=outline.length;
  const base=new T.Color(primary),tip=new T.Color(accent),center=[24,5],layerSize=1+count*2;
  for(const side of [-1,1]){
    positions.push(center[0],center[1],-15+side*3.4);
    const c=base.clone().multiplyScalar(side>0?1:.82);colors.push(c.r,c.g,c.b);
    for(const t of [.52,1])for(let n=0;n<count;n++){
      const [ox,oy]=outline[n],x=T.MathUtils.lerp(center[0],ox,t),y=T.MathUtils.lerp(center[1],oy,t);
      const z=-x*.46+Math.max(0,y)*.08+side*(t<1?3.8:1.2);
      positions.push(x,y,z);
      const edge=n>4?(.55+(n%2)*.2)*t:t*.18;
      const color=base.clone().lerp(tip,edge).multiplyScalar(side>0?1:.82);colors.push(color.r,color.g,color.b);
    }
  }
  const triangle=(a:number,b:number,c:number,back:boolean)=>indices.push(...(back?[a,c,b]:[a,b,c]));
  for(let side=0;side<2;side++)for(let n=0;n<count;n++){
    const offset=side*layerSize,a=offset+1+n,b=offset+1+(n+1)%count,c=a+count,d=b+count;
    triangle(offset,b,a,side===0);triangle(a,b,d,side===0);triangle(a,d,c,side===0);
  }
  for(let n=0;n<count;n++){
    const a=1+count+n,b=1+count+(n+1)%count;indices.push(a,b+layerSize,b,a,a+layerSize,b+layerSize);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.userData.sculptedSurface=true;shared.add(geometry);cache.set(key,geometry);return geometry;
}

function birdPlumage(body:T.Group,wings:T.Group[],shape:CreatureShape,primary:number,accent:number,elite:boolean):void {
  if(shape!=='owl'&&shape!=='harpy')return;
  for(const wing of wings){
    clearRigid(wing);
    const plumage=add(wing,featherFan(primary,accent,elite),0xffffff);plumage.name='creature-plumage';
    horn(wing,primary,[[0,0,0],[13,17,-4],[25,24,-10],[45,17,-18],[62,4,-27]],2.3);
    for(let n=0;n<4;n++)horn(wing,new T.Color(primary).lerp(new T.Color(accent),.3).getHex(),
      [[17+n*8,9+n*1.4,-8-n*3.4],[22+n*8,-4,-8-n*3.4],[25+n*8,-12+n*1.8,-10-n*3.4]],.6);
  }
  if(body.getObjectByName('bird-continuous-surface')||body.getObjectByName('humanoid-continuous-surface'))return;
  const chestY=shape==='owl'?39:54;
  for(const part of [...body.children])if(part instanceof T.Mesh&&part.position.y===chestY&&part.position.z===17&&Math.abs(part.position.x)<=12)remove(body,part);
  add(body,sculpt('bird-breast-'+shape+'-'+primary+'-'+accent,
    [[0,chestY+5,14,shape==='owl'?18:15,14,7],[0,chestY-7,14,shape==='owl'?15:12,9,6]],2.3,24,[],{top:primary,bottom:accent}),0xffffff);
}
function distance(x:number,y:number,z:number,v:Volume):number {
  const dx=x-v[0],dy=y-v[1],angle=v[6]??0;
  const px=(angle?dx*Math.cos(angle)+dy*Math.sin(angle):dx)/v[3],py=(angle?-dx*Math.sin(angle)+dy*Math.cos(angle):dy)/v[4],pz=(z-v[2])/v[5];
  const k0=Math.hypot(px,py,pz),k1=Math.hypot(px/v[3],py/v[4],pz/v[5]);return k1<1e-8?-Math.min(v[3],v[4],v[5]):k0*(k0-1)/k1;
}

/** A single blended, closed surface. The defining volumes are never rendered.
 * Geometry is cached by anatomy, independently of mob count and palette.
 * Marching normals preserve rounded cheek/shoulder transitions under grazing light. */
function sculpt(key:string,volumes:Volume[],blend=3,resolution=32,cuts:Volume[]=[],paint?:{top:number;bottom:number},finish?:(geometry:T.BufferGeometry)=>void):T.BufferGeometry {
  const cached=cache.get(key);if(cached)return cached;
  // Facial sockets get the dense grid. Small boots/cuffs need only a smooth
  // contour; allocating the face's density to every limb is wasteful in play.
  const face=/(?:head|face|surface-(?:rogue|cultist|ogre|smith|imp|harpy|bat|owl)-(?:89|94|64))/.test(key);
  resolution=/^(goblin|mammal|humanoid)-continuous-body/.test(key)?48:key.startsWith('goblin-head')?32:face?24:Math.max(12,Math.round(resolution*.62));
  const bounds=new T.Box3();
  for(const v of volumes){bounds.expandByPoint(new T.Vector3(v[0]-v[3],v[1]-v[4],v[2]-v[5]));bounds.expandByPoint(new T.Vector3(v[0]+v[3],v[1]+v[4],v[2]+v[5]));}
  const extent=bounds.getSize(new T.Vector3());
  // MarchingCubes omits the outer two grid samples. Reserve their space on
  // every axis: a fixed margin clipped long muzzles and scorpion faces open.
  for(let axis=0;axis<3;axis++){
    const margin=Math.max(blend+3,blend+(extent.getComponent(axis)+2*blend)*2.1/(resolution-4.2));
    bounds.min.setComponent(axis,bounds.min.getComponent(axis)-margin);
    bounds.max.setComponent(axis,bounds.max.getComponent(axis)+margin);
  }
  const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const temporaryMaterial=new T.MeshBasicMaterial(),march=new MarchingCubes(resolution,temporaryMaterial,false,false,Math.max(2000,resolution*resolution*10));march.isolation=0;
  for(let iz=0;iz<resolution;iz++)for(let iy=0;iy<resolution;iy++)for(let ix=0;ix<resolution;ix++){
    const x=bounds.min.x+ix/resolution*size.x,y=bounds.min.y+iy/resolution*size.y,z=bounds.min.z+iz/resolution*size.z;
    let d=Infinity;for(const v of volumes)d=smoothMin(d,distance(x,y,z,v),blend);
    for(const cut of cuts)d=Math.max(d,-distance(x,y,z,cut));
    march.field[iz*resolution*resolution+iy*resolution+ix]=-d;
  }
  march.update();const count=march.geometry.drawRange.count,geometry=new T.BufferGeometry();
  for(const name of ['position','normal'])geometry.setAttribute(name,new T.BufferAttribute((march.geometry.getAttribute(name).array as Float32Array).slice(0,count*3),3));
  geometry.scale(size.x*.5,size.y*.5,size.z*.5);geometry.translate(center.x,center.y,center.z);
  if(paint){
    const top=new T.Color(paint.top),bottom=new T.Color(paint.bottom),position=geometry.getAttribute('position'),colors=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const t=T.MathUtils.smoothstep(position.getY(i),bounds.min.y+size.y*.28,bounds.min.y+size.y*.72),c=bottom.clone().lerp(top,t);
      colors.set([c.r,c.g,c.b],i*3);
    }
    geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  }
  finish?.(geometry);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.sculptedSurface=true;
  march.geometry.dispose();temporaryMaterial.dispose();cache.set(key,geometry);shared.add(geometry);return geometry;
}

type SweepSection=[number,number,number,number,number];
/** Closed, tapered anatomical profile. Cross sections control the joints,
 * muscle and flattened chitin; there are no rendered cylinders or joint beads. */
function sweepSurface(key:string,sections:SweepSection[],steps=18):T.BufferGeometry {
  const cached=cache.get(key);if(cached)return cached;
  const curve=new T.CatmullRomCurve3(sections.map(s=>new T.Vector3(s[0],s[1],s[2])),false,'centripetal');
  const frames=curve.computeFrenetFrames(steps,false),sides=10,positions:number[]=[],indices:number[]=[];
  for(let row=0;row<=steps;row++){
    const t=row/steps,at=t*(sections.length-1),i=Math.min(sections.length-2,Math.floor(at)),f=T.MathUtils.smoothstep(at-i,0,1);
    const rx=T.MathUtils.lerp(sections[i][3],sections[i+1][3],f),ry=T.MathUtils.lerp(sections[i][4],sections[i+1][4],f),p=curve.getPointAt(t);
    for(let side=0;side<sides;side++){
      const angle=side/sides*Math.PI*2,v=p.clone().addScaledVector(frames.normals[row],Math.cos(angle)*rx).addScaledVector(frames.binormals[row],Math.sin(angle)*ry);positions.push(...v.toArray());
      if(row<steps){const a=row*sides+side,b=row*sides+(side+1)%sides;indices.push(a,b,b+sides,a,b+sides,a+sides);}
    }
  }
  for(const row of [0,steps]){
    const center=positions.length/3;positions.push(...curve.getPointAt(row/steps).toArray());
    for(let side=0;side<sides;side++){const a=row*sides+side,b=row*sides+(side+1)%sides;indices.push(...(row?[center,a,b]:[center,b,a]));}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();shared.add(geometry);cache.set(key,geometry);return geometry;
}

function insectAppendages(body:T.Group,shape:CreatureShape,legs:T.Group[],primary:number,accent:number,elite:boolean):void {
  const mass=elite?1.2:1;
  for(const leg of legs){
    const side=Math.sign(leg.position.x);clearRigid(leg);
    const limb=add(leg,sweepSurface('profile-bug-leg-'+side+'-'+elite,[
      [0,0,0,5.5*mass,4.5*mass],[side*9,3,-1,5.1*mass,4.3*mass],
      [side*23,5,-4,4.5*mass,4],[side*29,-2,-4,3.6*mass,3.7],
      [side*33,-15,1,2.6,3.1],[side*36,-23,5,1.2,1.8]
    ]),primary);limb.userData.anatomicalLimb=true;
    // A broad dorsal plate covers the joint instead of an exposed ball bearing.
    add(leg,sweepSurface('profile-bug-knee-'+side,[[side*18,5,-4,2.8,4.2],[side*24,5,-4,3.5,5],[side*29,-1,-3,1.7,3]] ,10),accent);
  }
  if(shape!=='scorpion')return;
  for(const part of [...body.children]){
    if(!(part instanceof T.Mesh))continue;
    part.geometry.computeBoundingBox();part.updateMatrix();const b=part.geometry.boundingBox!.clone().applyMatrix4(part.matrix),c=b.getCenter(new T.Vector3());
    const arm=Math.abs(part.position.x)>24&&part.position.z>34&&part.position.y===27;
    const palm=Math.abs(part.position.x)===34&&part.position.y===28&&part.position.z===49;
    const finger=Math.abs(c.x)>25&&b.min.z>44&&b.min.y>20&&b.max.y<36;
    if(arm||palm||finger)remove(body,part);
  }
  for(const side of [-1,1]){
    add(body,sweepSurface('profile-scorpion-claw-'+side+'-'+elite,[
      [side*16,26,28,6*mass,6],[side*25,28,37,6.5*mass,6.5],
      [side*34,28,49,9*mass,7*mass],[side*35,28,56,8*mass,6*mass]
    ]),primary);
    for(const finger of [-1,1])add(body,sweepSurface('profile-scorpion-pincer-'+side+'-'+finger+'-'+elite,[
      [side*35+finger*5,28,53,6*mass,4.7*mass],
      [side*35+finger*10,28,62,5.2*mass,4.2],
      [side*35+finger*8,28,70,3.2,2.9],
      [side*35+finger*3,28,74,.5,.6]
    ],14),accent);
  }
  const tail=body.getObjectByName('scorpion-tail');
  if(tail){
    clearRigid(tail);
    const points=[[0,0,0],[0,13,-17],[0,33,-22],[0,51,-14],[0,58,0],[0,50,15]].map(p=>new T.Vector3(...p));
    const curve=new T.CatmullRomCurve3(points,false,'centripetal');let parent=tail;
    for(let i=0;i<5;i++){
      const joint=new T.Group();joint.name='scorpion-tail-joint-'+i;
      const direction=points[i+1].clone().sub(points[i]);joint.userData.restTailAngle=Math.atan2(direction.z,direction.y);
      if(i)joint.position.copy(points[i].clone().sub(points[i-1]));parent.add(joint);
      const sections:SweepSection[]=[];
      for(const t of [0,.3,.65,1]){
        const p=curve.getPoint((i+t)/5).sub(points[i]),r=(8-(i+t)*.65)*mass;
        // Rounded overlaps cover each articulation while the centres stay joined.
        if(t===0)p.addScaledVector(direction.clone().normalize(),-2);
        if(t===1)p.addScaledVector(direction.clone().normalize(),2);
        sections.push([p.x,p.y,p.z,r,r*.87]);
      }
      const chitin=i%2?new T.Color(primary).lerp(new T.Color(accent),.28).getHex():primary;
      add(joint,sweepSurface('profile-scorpion-tail-link-'+i+'-'+elite,sections,12),chitin);parent=joint;
    }
    for(const name of ['scorpion-stinger','stinger-socket']){
      const terminal=tail.getObjectByName(name);if(!terminal)continue;
      terminal.position.copy(points[5].clone().sub(points[4]));parent.add(terminal);
    }
  }
}

function beastLegs(shape:CreatureShape,legs:T.Group[],primary:number,accent:number,elite:boolean):void {
  const low=shape==='salamander',reptile=reptiles.has(shape),thin=shape==='cat'||shape==='jackal',mass=elite?1.18:1;
  for(const leg of legs){
    const side=Math.sign(leg.position.x),splay=low?side*12:0;clearRigid(leg);
    const width=(low?6:thin?6.5:9)*mass;
    const limb=add(leg,sweepSurface('profile-beast-leg-'+shape+'-'+side+'-'+elite,[
      [0,1,0,width,width*.9],[splay*.3,-6,-1,width*.92,width*.86],
      [splay*.75,-14,1,width*.67,width*.68],[splay,-22,5,width*.5,width*.56],
      [splay,-24,8,width*.5,width*.64]
    ],14),primary);limb.userData.anatomicalLimb=true;
    if(shape==='boar'||shape==='ram'){
      for(const half of [-1,1]){
        const hoof=add(leg,roundedPlate,0x3a342c,half*4.1,-24,9,7.6,8,18);hoof.userData.creatureFoot=true;
      }
    }else{
      const toe=add(leg,sculpt('beast-paw-'+shape+'-'+elite,[[splay,-24,9,low?7:thin?7.5:10,low?4:5.5,11],[splay,-24,15,low?6:thin?6.5:9,low?3.5:4.5,6]],1.5,22),reptile?accent:0x453d34);
      toe.userData.creatureFoot=true;
    }
    if(reptile)for(const n of [-1,0,1])horn(leg,0xd8ccb0,[[splay+n*4,-24,17],[splay+n*4,-24.5,22],[splay+n*4,-25,24]],1.15);
  }
}

function bipedLimbs(shape:CreatureShape,arms:T.Group[],legs:T.Group[],primary:number,accent:number):void {
  const heavy=shape==='ogre'||shape==='smith',bare=['ogre','imp','gargoyle'].includes(shape);
  const handColor=bare?primary:shape==='knight'?0x70593e:0xc6a17b;
  for(const [i,arm]of arms.entries()){
    const side=i?1:-1;
    for(const part of [...arm.children])if(part instanceof T.Mesh&&(part.geometry.type==='CylinderGeometry'||(part.position.x===side*4&&part.position.y===-31&&part.position.z===3)))remove(arm,part);
    add(arm,sculpt('biped-sleeve-'+heavy+'-'+side,[[0,-5,0,heavy?10.5:7.3,10,heavy?10:7],[side*2,-15,1,heavy?10:6.8,10,heavy?9:6.5],[side*3,-24,2,heavy?8.5:5.3,6,heavy?8:5.5]],2.7,24),primary);
    const hand=add(arm,sculpt('biped-hand-'+heavy+'-'+side,[
      [side*3.5,-27,2.5,heavy?8:4.8,5.5,heavy?7:4.8],
      [side*4,-31,3,heavy?10:6.2,heavy?9:6.2,heavy?9:6.3],
      [side*(heavy?-1:1),-29.5,heavy?9:7.2,heavy?4.6:3.2,heavy?5:3.7,heavy?4:2.8]
    ],2.2,24),handColor);hand.userData.anatomicalHand=true;
  }
  const cloth=['imp','gargoyle'].includes(shape)?primary:0x303b39,bootColor=['imp','gargoyle'].includes(shape)?primary:shape==='knight'?accent:0x5a4434;
  for(const leg of legs){
    const knee=leg.getObjectByName('creature-knee');if(!knee)continue;
    for(const part of [...leg.children])if(part instanceof T.Mesh&&part.geometry.type==='CylinderGeometry')remove(leg,part);
    for(const part of [...knee.children])if(part instanceof T.Mesh&&(part.geometry.type==='CylinderGeometry'||(part.position.x===0&&part.position.y===-16&&part.position.z===4)))remove(knee,part);
    add(leg,sculpt('biped-thigh-'+heavy,[[0,-6,0,heavy?10:7.1,10,heavy?9:6.7],[0,-12,1,heavy?8.5:6.1,5,heavy?8:6]],2,20),cloth);
    add(knee,sculpt('biped-calf-'+heavy,[[0,-5,1.5,heavy?8.5:5.6,8,heavy?8:5.3],[0,-11,2.5,heavy?7.8:5.1,5,heavy?7.3:5]],1.5,20),cloth);
    const boot=add(knee,sculpt('biped-boot-'+heavy,[[0,-14,4,heavy?11:7.6,7,heavy?12:10],[0,-17,10,heavy?11:7.8,5,heavy?11:8.5]],1.8,22),bootColor);boot.userData.creatureFoot=true;
  }
}

function remove(parent:T.Object3D,part:T.Object3D):void {
  parent.remove(part);
  if(part instanceof T.Mesh){if(part.userData.uniqueGeometry||part.userData.artOwnedGeometry)part.geometry.dispose();if(part.userData.ownedMaterial)(part.material as T.Material).dispose();}
}
function clearRigid(parent:T.Object3D):void {for(const part of [...parent.children])if(part instanceof T.Mesh||part.userData.faceEye)remove(parent,part);}

/** One watertight humanoid surface. Skin, clothing and boots share the same
 * deformation; there are no independently rotating shoulder/hip intersections. */
function continuousGoblin(body:T.Group,arms:T.Group[],legs:T.Group[],elite:boolean):void {
  clearRigid(body);
  for(const part of [...body.children])if(part.userData.creatureHead)remove(body,part);
  for(const arm of arms)clearRigid(arm);
  for(const leg of legs){clearRigid(leg);const knee=leg.getObjectByName('creature-knee');if(knee)clearRigid(knee);}
  const mass=elite?1.16:1;
  const volumes:Volume[]=[
    [0,56,0,16*mass,20,11.5],[0,39,1,14*mass,12,11],
    [0,73,0,10*mass,9,8],[0,80,0,8,9,8],
    [0,95,1,19*(elite?1.07:1),16,14],[0,84,7,14.5,9,11],
    [-11,86,11,8,6.8,8],[11,86,11,8,6.8,8],
    GOBLIN_FACE.nose,[0,92.3,14.4,3.1,5,4],[0,80.5,14,10.5,4.5,7],
    [-GOBLIN_FACE.eyeX,GOBLIN_FACE.eyeY,12.5,6.1,4.3,4.7],
    [GOBLIN_FACE.eyeX,GOBLIN_FACE.eyeY,12.5,6.1,4.3,4.7],
    [-9.7,99.2,14,6.3,2.2,3.6,-.15],[9.7,99.2,14,6.3,2.2,3.6,.15]
  ];
  for(const side of [-1,1])volumes.push(
    [side*18,66,0,9*mass,10,8.2],
    [side*24,57,1,7.6*mass,10.5,7],
    [side*26.5,46,2,6.7*mass,9,6.4],
    [side*27,39.5,3,6.5*mass,6.2,6],
    [side*23.6,39,7,3,3.8,3],
    [side*10,29,0,8.1*mass,11,7.6],
    [side*10,15,2,6.6*mass,9,6.3],
    [side*10,6,7,8.2*mass,5.5,12],
    [side*20,96,0,6.5,5,4],
    [side*25,99,0,7.1,7.2,3.2,side*.38],
    [side*30,104,0,5.1,5.2,2.8,side*.48],
    [side*34,109,0,3.3,2.8,2,side*.55]
  );
  const geometry=sculpt('goblin-continuous-body-'+elite,volumes,3.4,48,
    [],undefined,g=>{
      // Leather has thickness in the same continuous skin, not separate slabs.
      // Bake these small offsets once; runtime instances reuse the finished mesh.
      const positions=g.getAttribute('position'),normals=g.getAttribute('normal');
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),ax=Math.abs(x);
        const opening=4.8+Math.max(0,y-61)*.52;
        const vest=T.MathUtils.smoothstep(y,39,42)*(1-T.MathUtils.smoothstep(y,71,74))
          *(1-T.MathUtils.smoothstep(ax,18.1*mass,19.3*mass))
          *(z<0?1:T.MathUtils.smoothstep(ax-opening,-.6,.8));
        const lapel=vest*T.MathUtils.smoothstep(z,6,10)*Math.exp(-Math.pow((ax-opening-1)/1.1,2));
        const cuff=T.MathUtils.smoothstep(ax,21*mass,23*mass)*T.MathUtils.smoothstep(y,42.5,43.5)
          *(1-T.MathUtils.smoothstep(y,48.5,49.5));
        const bootLip=(1-T.MathUtils.smoothstep(ax,18*mass,20*mass))*Math.exp(-Math.pow((y-18)/1.2,2));
        const thickness=.42*vest+.7*lapel+.65*cuff+.45*bootLip;
        positions.setXYZ(i,x+normals.getX(i)*thickness,y+normals.getY(i)*thickness,z+normals.getZ(i)*thickness);
      }
    });
  const surface=add(body,geometry,0xffffff);surface.name='goblin-continuous-surface';
  surface.userData.faceSurface=true;surface.userData.continuousSkin=true;
  for(const side of [-1,1]){
    // Orbital volumes and eye colours belong to the skin itself. Rigid white /
    // pupil layers ahead of the old skull depth visibly floated in profile.
    horn(body,0xe7dbab,[[side*5.7,80.5,20.4],[side*6,83.2,22],[side*5.4,elite?88:85.8,21.5]],elite?1.9:1.25).userData.creatureHead=true;
    horn(body,0x30431d,[[side*14.3,100.1,15.5],[side*9.7,99,18.1],[side*5.1,98.1,17.7]],1.15).userData.creatureHead=true;
    orb(body,0x3f5229,side*2.8,84.5,26,.8,.5,.35).userData.creatureHead=true;
  }
  horn(body,0x3c5027,[[-6,82.3,21.4],[0,81.7,22],[6,82.3,21.4]],.48).userData.creatureHead=true;
  plate(body,0xba9653,0,36.5,13,7,5.5,1.6);
  plate(body,0x3b2d1d,0,36.5,14.1,3.6,2.5,.7);
  if(elite){
    // Adult outline comes from the heavier anatomy, armor and longer tusks.
    // A little crown-shaped lump weakened that silhouette instead of aging it.
    for(const [i,arm]of arms.entries()){
      const side=i?1:-1;
      add(arm,sculpt('goblin-mesh-pauldron',[[0,2,0,12,6,10],[0,-2,-3,11,6,8]],2,24),0x647870,0,0,0,1,1,1,true);
      horn(arm,0xc8b988,[[side*5,3,-3],[side*8,11,-3],[side*10,15,-4]],2.1);
    }
    horn(body,0x425c29,[[11,101,14],[9,98,18],[7,96,18.5]],.45).userData.creatureHead=true;
  }
  body.scale.set(1.04,.9,1.04);
  body.userData.sculptedCreature='goblin';body.userData.eliteAnatomy=elite;
}

const beasts=new Set<CreatureShape>(['boar','cat','jackal','hound','ram','salamander','drake','wyvern','dragon']);
const reptiles=new Set<CreatureShape>(['salamander','drake','wyvern','dragon','serpent']);
function continuousHumanoid(body:T.Group,shape:HumanoidShape,arms:T.Group[],legs:T.Group[],elite:boolean,boss:boolean,primary:number,accent:number):void {
  const f=HUMANOID_FORMS[shape],heavy=f.width>20,mass=elite&&!boss?1.14:1,hood=shape==='rogue'||shape==='cultist';
  for(const part of [...body.children])if((part instanceof T.Mesh||part.userData.faceEye)&&!part.userData.bossOrnament&&!part.userData.creatureShield)remove(body,part);
  arms.forEach(clearRigid);for(const leg of legs){clearRigid(leg);const knee=leg.getObjectByName('creature-knee');if(knee)clearRigid(knee);}
  const volumes:Volume[]=[
    [0,57,0,f.width*mass,22,heavy?19:13],[0,39,1,f.width*.87*mass,12,heavy?18:12],
    [0,73,0,(heavy?15:10)*mass,10,10],[0,81,1,heavy?12:8,9,9],
    [0,f.headY,1,f.headX*mass,f.headHeight,hood?18:16],
    [0,f.headY-10,8,f.headX*.78*mass,8,11],
  ];
  if(!hood&&shape!=='knight')volumes.push([0,f.eyeY-8,f.faceZ+3,heavy?7:4.2,3.5,4],
    [-f.eyeX,f.eyeY,f.faceZ-3,heavy?7:5,4.3,4],[f.eyeX,f.eyeY,f.faceZ-3,heavy?7:5,4.3,4]);
  if(hood){volumes.push([0,elite&&shape==='cultist'?111:105,-4,f.headX*.73,13,14],
    [0,88,12,12,10,8]);}
  // The smith's beard/chin is part of the same head skin, rather than a rigid
  // apron-shaped face piece left behind when the head turns or attacks.
  if(shape==='smith')volumes.push([0,82,10,13,10,10],[0,76,11,8,7,7]);
  if(shape==='cultist')volumes.push([0,28,-2,17*mass,15,13],[0,50,-7,19*mass,19,12]);
  if(shape==='harpy')volumes.push([0,110,-5,17,9,15],[-14,102,-5,8,16,12],[14,102,-5,8,16,12],
    [0,121,-8,6,10,7],[-10,116,-7,6,9,8],[10,116,-7,6,9,8]);
  for(const [i,arm]of arms.entries()){
    const side=i?1:-1,x=arm.position.x;
    volumes.push([x,67,0,(heavy?13:9)*mass,11,heavy?12:9],
      [x+side*2,56,1,(heavy?10:7)*mass,11,heavy?10:7],
      [x+side*3,45,2,(heavy?9:6)*mass,9,heavy?8:6],
      [x+side*4,40,3,(heavy?9:6)*mass,6,heavy?8:6],
      [x-side*1,40,8,heavy?4:2.8,4,3]);
  }
  for(const leg of legs){const x=leg.position.x;
    volumes.push([x,29,1,heavy?10:8,11,heavy?9:7],
      [x,15,2,heavy?8.5:6.5,9,heavy?8:6.5],[x,6,7,heavy?12:8,5.5,heavy?14:11]);}
  if(elite&&!boss){volumes.push([-f.width,68,-1,12,10,11],[f.width,68,-1,12,10,11]);
    if(shape==='cultist')volumes.push([0,122,-6,7,13,9]);
    if(shape==='imp'||shape==='gargoyle'){
      volumes.push([0,62,12,17,17,7],[0,78,-9,17,16,12],[0,113,-4,9,12,9],
        [-12,112,-3,7,9,7],[12,112,-3,7,9,7]);
    }
    if(shape==='harpy')volumes.push([0,128,-10,10,15,9],[-14,118,-9,8,14,8],[14,118,-9,8,14,8],
      [0,71,-10,23,15,13],[-18,80,-4,12,13,10],[18,80,-4,12,13,10]);
    if(shape==='knight')volumes.push([0,67,14,20,17,7],[0,113,-4,8,16,13]);
  }
  if(shape==='knight'){
    // Plate relief is welded into the deformable surface; flexible joints stay
    // narrower, so armour reads as fitted equipment instead of a smooth suit.
    volumes.push([0,63,12,17*mass,14,6],[0,49,11,15*mass,7,5],[0,106,-1,4,13,17]);
    for(const [i,arm]of arms.entries()){const s=i?1:-1,x=arm.position.x;
      volumes.push([x,72,0,12*mass,7,12],[x+s*3,47,3,8*mass,7,8]);}
    for(const leg of legs)volumes.push([leg.position.x,20,7,7*mass,10,5]);
  }
  if(shape==='rogue'&&elite&&!boss)volumes.push([0,61,12,19,16,5],[-18,66,-9,11,13,7],[18,66,-9,11,13,7]);
  if(shape==='ogre')for(const side of [-1,1])volumes.push([side*26,98,0,10,6,4],[side*33,103,0,5,4,3]);
  const surface=add(body,sculpt('humanoid-continuous-body-'+shape+'-'+elite+'-'+boss,volumes,3.2,48),primary);
  surface.name='humanoid-continuous-surface';surface.userData.continuousSkin=true;
  surface.userData.humanoid={shape,primary,accent,mass,heavy};
  if(shape==='ogre'&&!boss||shape==='imp')for(const s of [-1,1])horn(body,0xe1d3ae,
    [[s*(heavy?8:5),f.eyeY-13,f.faceZ+3],[s*(heavy?10:6),f.eyeY-9,f.faceZ+6],[s*(heavy?9:5),f.eyeY-5,f.faceZ+5]],heavy?2.4:1.4).userData.creatureHead=true;
  if(shape==='imp'||shape==='gargoyle'||shape==='knight')for(const s of [-1,1])horn(body,shape==='gargoyle'?primary:accent,
    [[s*13,f.headY+13,-1],[s*23,f.headY+(elite?31:26),-8],[s*18,f.headY+(elite?36:29),-14]],elite?3.8:2.8).userData.creatureHead=true;
  if(shape==='harpy')for(const leg of legs){const knee=leg.getObjectByName('creature-knee');if(knee)for(const toe of [-1,0,1])horn(knee,0xbda985,[[toe*4,-17,14],[toe*4,-19,20],[toe*4,-20,24]],1.2);}
  const frame=new T.Group();frame.name='humanoid-head-frame';frame.userData.creatureHead=true;body.add(frame);
  body.userData.sculptedCreature=shape;body.userData.creatureStyle='cover-2026-10-03';body.userData.eliteAnatomy=elite&&!boss;
}
/** Connected mammal anatomy: shoulder/neck/skull/muzzle, ears and four legs.
 * The volumes only author the shared baked surface; the runtime sees one skin. */
function continuousMammal(body:T.Group,shape:MammalShape,legs:T.Group[],elite:boolean,boss:boolean,primary:number,accent:number):void {
  const f=MAMMAL_FORMS[shape],veteran=elite&&!boss,mass=boss?1.22:veteran?1.17:1;
  for(const part of [...body.children])if((part instanceof T.Mesh||part.userData.faceEye)&&!part.userData.bossOrnament)remove(body,part);
  legs.forEach(clearRigid);
  const tail=body.children.filter((o):o is T.Group=>o instanceof T.Group&&o.position.z<-15&&o.position.x===0&&o.position.y>15);
  tail.forEach(clearRigid);
  const volumes:Volume[]=[
    [0,35,-21,f.width*.86*mass,19*mass,f.depth],
    [0,39,12,f.chest*mass,(f.back-39)*mass,29],
    [0,31,-1,f.width*.75*mass,15,f.depth],
    [0,44,28,f.skull*.9*mass,19*mass,19],
    [0,46,32,f.skull*mass,18*mass,20],
    [0,36,shape==='cat'?43:49,f.muzzle*mass,shape==='boar'?11:8,shape==='cat'?12:19],
    [0,36,f.snout,f.muzzle*.85*mass,shape==='boar'?8:6,shape==='cat'?9:11],
  ];
  if(shape!=='boar')volumes.push([0,37,f.snout+9,shape==='cat'?3.8:5.2,shape==='cat'?3:4.5,3.4]);
  for(const side of [-1,1]){
    volumes.push([side*f.eyeX, f.eyeY-1,f.eyeZ,6.2*mass,6.5,8],
      [side*(f.skull-4),59,25,6,5,5],
      [side*(f.skull-2),62+f.ear*.25,24,5.3,f.ear*.6,3.2,side*-.18],
      [side*(f.skull-2),64+f.ear*.65,23,3.3,f.ear*.45,2.5,side*-.12]);
  }
  for(const leg of legs){
    const x=leg.position.x,z=leg.position.z,fore=z>0,width=(shape==='jackal'?6:shape==='cat'?7:9)*mass;
    volumes.push([x,30,z,width*1.35,12,width*1.4],
      [x,20,z+(fore?-1:2),width*.84,12,width*.8],
      [x,9,z+4,width*.68,8,width*.68],
      [x,5,z+10,width*1.1,4.5,11.5]);
  }
  for(const group of tail){const i=tail.indexOf(group),r=(shape==='ram'?6:shape==='hound'?9:10)*(1-i*.12);
    volumes.push([0,group.position.y,group.position.z,r,r,shape==='ram'?4:12]);}
  if(shape==='boar'||shape==='hound')volumes.push([0,f.back-1,-16,7*mass,8,24],[0,f.back+3,2,6*mass,8,17]);
  if(veteran||boss)volumes.push([0,51,14,f.chest*mass,18,26],
    [-f.skull*.8,48,24,10*mass,15,17],[f.skull*.8,48,24,10*mass,15,17]);
  if((veteran||boss)&&['jackal','cat','hound'].includes(shape))for(const side of [-1,1])
    volumes.push([side*f.skull*.95,42,32,11*mass,15,13],
      [side*(f.skull+3),39,22,6,10,13]);
  if(shape==='ram')volumes.push([0,27,49,5.5,11,5]);
  // Lips are shaded on the jaw skin. A narrow Boolean crease made internal
  // islands after simplification, while a deep cut punctured the nasal pad.
  const cuts:Volume[]=[];
  if(f.hoof)cuts.push(...legs.map(leg=>[leg.position.x,3,leg.position.z+17,.8,3.5,7] as Volume));
  const surface=add(body,sculpt('mammal-continuous-body-'+shape+'-'+veteran+'-'+boss,volumes,3,48,cuts),primary);
  surface.name='mammal-continuous-surface';surface.userData.continuousSkin=true;
  surface.userData.mammal={shape,primary,accent,veteran,boss};
  // Intentional keratin belongs on the moving head. Flesh/ears stay in the skin.
  if(shape==='boar'&&!boss)for(const s of [-1,1])horn(body,0xe2d1a1,
    [[s*13*mass,32,56],[s*(veteran||boss?26:23)*mass,40,66],[s*23*mass,veteran||boss?63:53,61]],veteran||boss?4.7:3.5).userData.creatureHead=true;
  if(shape==='ram')for(const s of [-1,1])horn(body,0xd9cba6,
    [[s*15,60,25],[s*27*mass,67,15],[s*33*mass,57,10],[s*30*mass,44,20],[s*22*mass,46,31]],veteran||boss?6:4.5).userData.creatureHead=true;
  if(shape==='cat')for(const s of [-1,1])for(const row of [-1,1])horn(body,0xbdb8a4,
    [[s*8,35+row*1.5,51],[s*16,36+row*2.2,50],[s*23,37+row*3,46]],.25).userData.creatureHead=true;
  if(veteran&&['jackal','cat','hound'].includes(shape))for(const s of [-1,1])horn(body,0xded2af,
    [[s*f.muzzle*.85,34,f.snout-4],[s*f.muzzle,31,f.snout+2],[s*f.muzzle*.85,27,f.snout+1]],1.5).userData.creatureHead=true;
  // Keep a visible attachment pivot even when every fleshy head part is skinned.
  const frame=new T.Group();frame.name='mammal-head-frame';frame.userData.creatureHead=true;body.add(frame);
  body.userData.sculptedCreature=shape;body.userData.creatureStyle='cover-2026-10-03';body.userData.eliteAnatomy=veteran;
}
/** Closed curved membrane with a scalloped trailing edge and painted shading. */
function reptileMembrane(primary:number,accent:number):T.BufferGeometry{
  const key='profile-reptile-wing-'+primary+'-'+accent,cached=cache.get(key);if(cached)return cached;
  const outline=[[0,0],[24,24],[62,4],[52,-3],[43,-9],[34,-19],[27,-13],[18,-26],[10,-21],[4,-13],[0,-6]];
  const curve=new T.CatmullRomCurve3(outline.map(([x,y])=>new T.Vector3(x,y,0)),true,'centripetal');
  const edge=curve.getPoints(66).slice(0,-1),count=edge.length,layer=1+count*2,positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const rootColor=new T.Color(primary).multiplyScalar(.8),tipColor=new T.Color(accent),center=new T.Vector3(23,1,0);
  for(const side of [1,-1]){
    positions.push(23,1,-11+side*2);colors.push(rootColor.r,rootColor.g,rootColor.b);
    for(const t of [.55,1])for(const point of edge){
      const p=center.clone().lerp(point,t),z=-p.x*.47+Math.max(p.y,0)*.08+side*(t<1?2: .35);
      positions.push(p.x,p.y,z);const c=rootColor.clone().lerp(tipColor,T.MathUtils.smoothstep(p.x,10,64)*.6).multiplyScalar(side>0?1:.88);colors.push(c.r,c.g,c.b);
    }
  }
  for(let side=0;side<2;side++)for(let n=0;n<count;n++){
    const off=side*layer,a=off+1+n,b=off+1+(n+1)%count,c=a+count,d=b+count;
    indices.push(...(side?[off,a,b,a,c,d,a,d,b]:[off,b,a,a,d,c,a,b,d]));
  }
  for(let n=0;n<count;n++){const a=1+count+n,b=1+count+(n+1)%count;indices.push(a,a+layer,b+layer,a,b+layer,b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();shared.add(g);cache.set(key,g);return g;
}
function reptileWings(wings:T.Group[],primary:number,accent:number):void{
  for(const wing of wings){
    clearRigid(wing);add(wing,reptileMembrane(primary,accent),0xffffff);
    add(wing,sweepSurface('profile-reptile-wing-arm',[[0,0,0,3.4,3.4],[12,17,-6,3.3,3.3],[24,24,-10,3,3],[43,18,-20,2.2,2.2],[62,4,-29,.8,.8]],20),primary);
    for(const [n,end]of [[34,-19],[18,-26]].entries())add(wing,sweepSurface('profile-reptile-wing-finger-'+n,[[24,24,-10,2.2,2.2],[(24+end[0])*.5,5,-17,1.7,1.7],[end[0],end[1],-end[0]*.47, .65,.65]],14),primary);
  }
}
function continuousReptile(body:T.Group,shape:ReptileShape,legs:T.Group[],wings:T.Group[],elite:boolean,boss:boolean,primary:number,accent:number):void{
  const f=REPTILE_FORMS[shape],low=shape==='salamander',mass=boss?1.2:elite?1.16:1,y=f.y;
  for(const part of [...body.children])if((part instanceof T.Mesh||part.userData.faceEye)&&!part.userData.bossOrnament)remove(body,part);
  legs.forEach(clearRigid);
  const tail=body.children.filter((o):o is T.Group=>o instanceof T.Group&&o.position.x===0&&o.position.z<=-20&&o.position.y>0);
  tail.forEach(clearRigid);
  const volumes:Volume[]=[
    [0,y,-20,f.width*.83*mass,low?13:21,31],[0,y+4,9,f.width*mass,low?16:25,30],
    [0,y+7,27,f.skull*.85*mass,low?12:18,20],[0,y+10,33,f.skull*mass,low?13:18,20],
    [0,y+3,47,f.skull*.75*mass,9,22],[0,y+4,f.snout,f.skull*.62*mass,7,13],
    [0,y-5,52,f.skull*.68*mass,5,18],
  ];
  for(const s of [-1,1])volumes.push([s*f.eyeX,f.eyeY-1,f.eyeZ,7*mass,6,7],
    [s*(f.skull-3),y+16,24,6*mass,7,9]);
  for(const leg of legs){const x=leg.position.x,z=leg.position.z,s=Math.sign(x),w=f.legWidth*mass;
    volumes.push([x,y-4,z,w*1.4,low?8:14,w*1.45],
      [x+s*(low?5:0),low?12:20,z+3,w,low?7:12,w],
      [x+s*(low?11:0),5,z+8,w*1.2,4.5,12]);
    for(const toe of [-1,0,1])volumes.push([x+s*(low?11:0)+toe*4,4,z+17,3.4,3,5.5]);
  }
  for(const [i,t]of tail.entries()){const r=(low?15:10)*mass*(1-i*.12);volumes.push([0,t.position.y,t.position.z,r,r,15]);}
  for(let n=0;n<6;n++){
    const z=-27+n*11,top=f.back+(boss?5:elite?6:0);
    volumes.push([0,top-4,z,4.7*mass,elite&&!boss?12:8,7],[0,top+(elite&&!boss?6:3),z-2,2.7*mass,elite&&!boss?9:6,4]);
  }
  if(elite||boss)volumes.push([-f.skull*.85,y+10,25,10*mass,13,14],[f.skull*.85,y+10,25,10*mass,13,14]);
  // A wide open cavity leaves upper/lower lips and cheek walls connected. A
  // solid muzzle folded by a jaw bone turned its front triangles inside out.
  const mouth:Volume[]=[[0,y-1,61,f.skull*.54*mass,3.1,23]];
  const surface=add(body,sculpt('reptile-continuous-body-'+shape+'-'+elite+'-'+boss,volumes,3.5,48,mouth),primary);
  surface.name='reptile-continuous-surface';surface.userData.continuousSkin=true;surface.userData.reptile={shape,primary,accent,mass};
  // Adult winged bosses already have long authored horns on this head joint.
  // A second generic pair intersects their roots and leaves pale slivers.
  if(!(boss&&(shape==='dragon'||shape==='wyvern')))for(const s of [-1,1])horn(body,0xd7c79b,[[s*(f.skull-4),y+20,26],[s*(f.skull+5),y+(elite||boss?35:29),17],[s*(f.skull+9),y+(elite||boss?39:32),10]],elite||boss?4:2.8).userData.creatureHead=true;
  const frame=new T.Group();frame.name='reptile-head-frame';frame.userData.creatureHead=true;body.add(frame);
  body.userData.sculptedCreature=shape;body.userData.creatureStyle='cover-2026-10-03';body.userData.eliteAnatomy=elite&&!boss;
  reptileWings(wings,primary,accent);
}
function continuousBird(body:T.Group,shape:'bat'|'owl',legs:T.Group[],wings:T.Group[],elite:boolean,boss:boolean,primary:number,accent:number):void{
  const owl=shape==='owl',mass=elite&&!boss?1.16:1;
  for(const part of [...body.children])if((part instanceof T.Mesh||part.userData.faceEye)&&!part.userData.bossOrnament)remove(body,part);
  legs.forEach(clearRigid);
  const volumes:Volume[]=[[0,40,-2,(owl?23:17)*mass,25,17],[0,53,3,17*mass,16,15],
    [0,65,8,(owl?24:20)*mass,18,18],[0,56,20,12,8,10]];
  for(const side of [-1,1]){
    if(!owl)volumes.push([side*14,81,3,7,15,4],[side*17,91,2,4,10,3]);
    else volumes.push([side*20,79,1,6,10,5],[side*23,85,0,3,7,3]);
    volumes.push([side*10,19,1,5,10,5],[side*10,11,7,7,3.5,8]);
  }
  if(elite&&!boss){
    for(const side of [-1,1])volumes.push([side*21,57,-5,11,15,13],[side*18,74,-3,9,10,10]);
    volumes.push([0,83,-4,7,12,6],[-12,82,-4,5,11,5],[12,82,-4,5,11,5]);
  }
  const surface=add(body,sculpt('bird-continuous-body-'+shape+'-'+elite,volumes,3,44,[],{top:primary,bottom:accent}),0xffffff);
  surface.name='bird-continuous-surface';surface.userData.continuousSkin=true;
  paintSurfaceFace(surface,{x:owl?10:8.5,y:66,z:12,width:owl?5.7:4.2,height:owl?6.4:3.2,kind:owl?'owl':'flesh',accent,veteran:elite&&!boss});
  if(owl)horn(body,0xb59a53,[[0,60,27],[0,54,34],[0,49,31]],4).userData.creatureHead=true;
  else{
    const nose=add(body,sculpt('bat-nose-pad',[[0,59,28,4,3,3]],.8,20),accent);nose.userData.creatureHead=true;
    for(const s of [-1,1])horn(body,0xdacda3,[[s*5,55,28],[s*6,51,30],[s*5,49,29]],1.2).userData.creatureHead=true;
    reptileWings(wings,primary,accent);
  }
  for(const leg of legs)for(const toe of [-1,0,1])horn(leg,0xb9a274,[[toe*3,-10,8],[toe*3,-11,13],[toe*3,-12,15]],.9);
  const frame=new T.Group();frame.userData.creatureHead=true;body.add(frame);
  body.userData.sculptedCreature=shape;body.userData.creatureStyle='cover-2026-10-03';body.userData.eliteAnatomy=elite&&!boss;
}
function organic(body:T.Group,shape:CreatureShape,arms:T.Group[],legs:T.Group[],primary:number,accent:number,elite:boolean,boss:boolean):void {
  const wider=elite&&!boss?1.25:1;
  if(shape==='flame'){
    for(const part of [...body.children])if(part instanceof T.Mesh)remove(body,part);
    const tongue=add(body,sculpt('ember-body',[[0,26,0,21,19,19],[0,43,-2,15,18,13],[6,59,-3,8,12,8],[11,69,-4,2.5,7,3]],3,34,[],{top:accent,bottom:0x75412e}),0xffffff);
    tongue.userData.faceSurface=true;
    tongue.material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.6,emissive:accent,emissiveIntensity:.12});tongue.userData.ownedMaterial=true;
    for(const group of body.children)if(group instanceof T.Group&&!group.userData.faceEye)for(const part of group.children)if(part instanceof T.Mesh){
      part.geometry=sculpt('ember-satellite',[[0,-.3,0,.85,.6,.8],[.22,.24,0,.57,.6,.55],[.42,.78,0,.12,.35,.15]],.14,26);part.scale.set(5.5,15,5.5);
    }
  }else if(beasts.has(shape)){
    const low=shape==='salamander',thin=shape==='cat'||shape==='jackal',y=low?20:35,r=thin?22:29;
    const torso=body.children.find(o=>o instanceof T.Mesh&&o.position.x===0&&o.position.y===y&&o.position.z===0);
    if(torso)remove(body,torso);
    const belly=new T.Color(primary).lerp(new T.Color(accent),.32).getHex();
    const canine=shape==='hound'||shape==='jackal',feline=shape==='cat';
    const volumes:Volume[]=shape==='boar'?[[0,y+2,-22,27*wider,24,28],[0,y+7,7,31*wider,26,30],
      [0,y-7,-1,25*wider,16,32],[0,y+9,27,22*wider,20,20]]
      :canine?[[0,y-1,-22,r*.75*wider,17,23],[0,y+7,13,r*.9*wider,23,26],
      [0,y-4,-4,r*.62*wider,14,29],[0,y+12,29,r*.61*wider,19,18]]
      :feline?[[0,y,-20,r*.9*wider,16,24],[0,y+3,13,r*wider,20,23],[0,y-4,-2,r*.67*wider,13,30],[0,y+7,29,r*.56*wider,13,16]]
      :[[0,y,-21,r*.82*wider,low?12:20,20],[0,y+3,14,r*wider,low?14:24,27],[0,y-3,-4,r*.8*wider,low?11:17,25],[0,y+8,28,r*.62*wider,low?10:17,17]];
    add(body,sculpt('beast-body-'+shape+'-'+primary+'-'+accent+'-'+elite,volumes,4,30,[],{top:primary,bottom:belly}),0xffffff);
    if(!boss)for(const part of [...body.children]){
      if(!(part instanceof T.Mesh)||part.userData.creatureHead||part.geometry.type!=='IcosahedronGeometry')continue;
      if((part.geometry as T.IcosahedronGeometry).parameters.detail===0&&(part.material as T.MeshStandardMaterial).emissive.getHex()===0)remove(body,part);
    }
    const oldHead=body.children.find(o=>o.userData.faceSurface) as T.Mesh|undefined;
    if(oldHead){
      remove(body,oldHead);
      for(const part of [...body.children])if(part instanceof T.Mesh&&part.position.x===0&&part.position.y===y+1&&[42,47].includes(part.position.z))remove(body,part);
      const feline=shape==='cat',reptile=reptiles.has(shape),canine=shape==='hound'||shape==='jackal';
      const goat=shape==='ram',snout=feline?45:canine?57:reptile?51:goat?56:53;
      const volumes:Volume[]=shape==='boar'?[[0,y+10,29,21*wider,19,20],[0,y+1,45,17*wider,13,18],
        [0,y+1,58,13*wider,8.5,11],[-14,y+6,34,8*wider,10,12],[14,y+6,34,8*wider,10,12]]
        :[[0,y+9,29,(canine?shape==='jackal'?14:19:goat?17:thin?17:23)*wider,19,20],
        [0,y+2,snout,(canine?shape==='jackal'?8:11:goat?9:thin?10:16)*wider,reptile?8:canine?7.5:10,feline?10:canine?18:16],
        [0,y+2,37,(canine?12:15)*wider,12,17],[-(thin?10:14),y+10,37,(canine?6:8)*wider,10,10],[(thin?10:14),y+10,37,(canine?6:8)*wider,10,10]];
      const faceColor=reptile||shape==='hound'||shape==='boar'||canine?primary:accent;
      const head=add(body,sculpt('beast-face-'+shape+'-'+primary+'-'+accent+'-'+elite,volumes,4,34,[],
        {top:faceColor,bottom:new T.Color(faceColor).lerp(new T.Color(0xc3a980),.16).getHex()}),0xffffff);
      head.userData.faceSurface=true;head.userData.creatureHead=true;
      if(!reptile&&shape!=='boar'){const nose=orb(body,0x37372e,0,y+4,snout+(feline?9:14),feline?4.5:6,3,1.5);nose.userData.creatureHead=true;}
      if(goat){const beard=add(body,sculpt('goat-chin-beard',[[0,y-4,49,7,8,6],[0,y-13,50,4,8,4]],1.5,24),0xd7ceb1);beard.userData.creatureHead=true;}
    }
  }else if(['spider','scorpion','beetle'].includes(shape)){
    for(const part of [...body.children])if(part instanceof T.Mesh&&part.position.x===0&&((part.position.y===26&&part.position.z===-14)||(part.position.y===24&&part.position.z===25)))remove(body,part);
    const volumes:Volume[]=shape==='beetle'
      ?[[0,30,-22,30*wider,25,34],[0,23,15,22*wider,15,18],[0,22,33,17*wider,12,15]]
      :shape==='spider'?[[0,29,-28,28*wider,23,28],[0,22,12,20*wider,13,19],[0,22,31,17*wider,12,17]]
      :[[0,26,-22,28*wider,21,25],[0,24,8,23*wider,17,22],[0,24,29,19*wider,14,18]];
    const shell=add(body,sculpt('bug-body-'+shape+'-'+primary+'-'+accent+'-'+elite,volumes,3.5,34,[],
      {top:primary,bottom:new T.Color(primary).lerp(new T.Color(accent),.22).getHex()}),0xffffff);
    shell.userData.sculptedSurface=true;shell.userData.faceSurface=true;
    if(shape==='beetle'){
      for(const part of [...body.children])if(part instanceof T.Mesh&&(part.userData.bugMandible
        ||Math.abs(part.position.x)===13&&part.position.y===36
        ||part.position.x===0&&part.position.y===46&&part.position.z===-15))remove(body,part);
      // Two convex wing cases meet at a thin seam, distinct from a spider's abdomen.
      for(const side of [-1,1]){
        add(body,sculpt('beetle-wingcase-'+side+'-'+elite+'-'+primary+'-'+accent,[[side*13,36,-25,17*wider,21,31],[side*12,35,-8,16*wider,18,22]],2.3,30,[],
          {top:accent,bottom:primary}),0xffffff);
        horn(body,primary,[[side*14,20,40],[side*18,18,49],[side*9,18,55]],2.8);
      }
      horn(body,new T.Color(primary).multiplyScalar(.6).getHex(),[[0,51,-47],[0,56,-28],[0,49,0]],.7);
    }
    insectAppendages(body,shape,legs,primary,accent,elite&&!boss);
  }else if(shape==='wisp'){
    // Two overlapping crystal/cone bodies hid the eyes from the game camera.
    // Keep one deliberate faceted crystal; rings and satellites stay below or
    // behind the face instead of acting as a second skull in front of it.
    for(const part of [...body.children])if(part instanceof T.Mesh&&part.position.x===0&&part.position.z===0
      &&[22,45].includes(part.position.y)&&part.geometry.type!=='TorusGeometry')remove(body,part);
    let crystal=cache.get('profile-wisp-core');
    if(!crystal){crystal=new T.OctahedronGeometry(1,0);shared.add(crystal);cache.set('profile-wisp-core',crystal);}
    const surface=add(body,crystal,primary,0,40,0,20,38,18);surface.userData.faceSurface=true;
  }else{
    // Rebuild the principal soft surfaces from anatomical lobes, retaining each
    // family's authored horns, clothing, scales, wings and skeleton.
    for(const part of [...body.children]){
      if(!(part instanceof T.Mesh)||part.userData.creatureShield)continue;
      const p=part.position,s=part.scale;
      const torso=p.x===0&&[53,60,40,22,30,70].includes(p.y)&&p.z===0;
      const skull=p.x===0&&([89,93,107,64,94,45].includes(p.y))&&!['wisp','flame'].includes(shape);
      if(!torso&&!skull)continue;
      if(part.geometry===roundedPlate||part.geometry.type==='RoundedBoxGeometry')continue;
      const unit:Volume[]=skull&&shape==='serpent'?[[0,.18,-.2,.94,.82,.8],[0,-.15,.52,.79,.55,.62],[-.5,.24,.18,.32,.5,.48],[.5,.24,.18,.32,.5,.48]]
        :skull?[[0,.1,0,.93,1,.93],[0,-.48,.22,.78,.5,.77],[0,-.1,.47,.72,.65,.59]]
        :shape==='mushroom'&&p.y===70?[[0,.18,0,1,.9,1],[0,-.12,0,.9,.52,.92]]
        :shape==='slime'?[[0,-.2,0,1,.83,1],[0,.4,-.1,.63,.72,.7],[-.7,-.52,.1,.45,.28,.6],[.7,-.52,.1,.45,.28,.6]]
        :[[0,.32,0,1*wider,.69,.92],[0,-.45,.06,.78*wider,.56,.83],[0,.72,-.05,.6*wider,.37,.66]];
      const cuts:Volume[]=p.y===94&&['rogue','cultist'].includes(shape)?[[0,-.38,.9,.66,.54,.5]]:[];
      part.geometry=sculpt('surface-'+shape+'-'+p.y+'-'+elite,unit,.12,skull?30:26,cuts);part.userData.sculptedSurface=true;
      // The mature stem is wider than the old cylinder; seat its eyes on
      // this surface as well, so they remain visible instead of sinking in.
      if(shape==='mushroom'&&p.y===30)part.userData.faceSurface=true;
      part.scale.copy(s);
    }
  }
  if(shape==='mushroom'){
    const cap=body.children.find(o=>o instanceof T.Mesh&&o.position.y===70) as T.Mesh|undefined;
    if(cap){cap.geometry=fungusCap(elite,accent);cap.material=pigment(0xffffff,false,true);cap.rotation.z=elite?-.075:.055;}
    for(const part of [...body.children])if(part instanceof T.Mesh&&part!==cap&&part.position.y>60
      &&Math.abs(part.position.x)+Math.abs(part.position.z)>0&&part.scale.y<=2.1)remove(body,part);
    // Gill curves from the earlier short cap stuck out like twigs. The gills
    // now nest against a broad underside instead of floating below the hat.
    for(const part of [...body.children]){
      if(!(part instanceof T.Mesh)||part.position.length()!==0)continue;
      part.geometry.computeBoundingBox();const b=part.geometry.boundingBox!;
      if(b.min.y>43&&b.max.y<61&&b.max.x-b.min.x>15)remove(body,part);
    }
    const underside=add(body,sculpt('fungus-underside',[[0,58,0,33,5,30]],1,22),0xc7b58e);
    underside.userData.fungusGill=true;
    for(let n=0;n<12;n++){const a=n/12*Math.PI*2;horn(body,0xa89671,[[Math.cos(a)*13,55,Math.sin(a)*13],[Math.cos(a)*23,55.8,Math.sin(a)*23],[Math.cos(a)*30,58,Math.sin(a)*30]],.5);}
    for(const side of [-1,1])horn(body,0xd6c598,[[side*7,48,12],[side*14,43,14],[side*18,39,10]],2.2);
  }
  if(shape==='serpent'||shape==='worm'){
    // The old paired beads made a soft-bodied worm look like a stone necklace.
    // Pigment follows the connected body instead of alternating whole segments.
    for(const part of [...body.children])if(part.userData.creatureSegment!==undefined
      &&part instanceof T.Mesh&&Math.abs(part.position.x-Math.sin(part.userData.creatureSegment*.62)*19)>10)remove(body,part);
    for(const group of body.children)if(group instanceof T.Group&&!group.userData.faceEye)for(const part of group.children){
      if(part instanceof T.Mesh&&part.position.length()===0&&!part.userData.sculptedSurface){
        const paint=shape==='worm'?{top:accent,bottom:primary}:{top:primary,bottom:accent};
        part.geometry=sculpt('segment-surface-'+shape+'-'+primary+'-'+accent,
          [[0,0,-.24,.94,.91,.88],[0,0,.32,.94,.87,.81]],.16,30,[],paint);
        part.material=pigment(0xffffff,false,true);
        part.userData.sculptedSurface=true;
      }
    }
  }
  if(beasts.has(shape))beastLegs(shape,legs,primary,accent,elite&&!boss);
  if(['rogue','cultist','knight','smith','ogre','imp','gargoyle'].includes(shape))bipedLimbs(shape,arms,legs,primary,accent);
  // Cylindrical bones and separate fists become contiguous tapered flesh/fur.
  for(const group of [...arms,...legs]){
    const candidates=group.children.filter(o=>o instanceof T.Mesh&&['CylinderGeometry','IcosahedronGeometry','SphereGeometry'].includes(o.geometry.type)&&!o.userData.forearmArmor) as T.Mesh[];
    if(candidates.length<2)continue;
    const skinParts=candidates.filter(o=>(o.material as T.MeshStandardMaterial).color?.getHex()===primary);
    if(skinParts.length<2)continue;
    const volumes:Volume[]=skinParts.map(o=>{
      o.updateMatrix();o.geometry.computeBoundingBox();const bounds=o.geometry.boundingBox!.clone().applyMatrix4(o.matrix),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
      return [center.x,center.y,center.z,Math.max(1,size.x*.5),Math.max(1,size.y*.5),Math.max(1,size.z*.5)];
    });
    const key='limb-'+JSON.stringify(volumes);skinParts.forEach(o=>remove(group,o));add(group,sculpt(key,volumes,2.5,22),primary);
  }
  // Decorative rock triangles on organic skin were the most visible kit seams.
  // Crystals, metal, stone, teeth and actual armour retain their crisp edges.
  if(!['golem','sand','scrap','gargoyle','wisp'].includes(shape))body.traverse(o=>{
    if(!(o instanceof T.Mesh)||o.children.length||o.geometry.type!=='IcosahedronGeometry')return;
    const detail=(o.geometry as T.IcosahedronGeometry).parameters.detail;
    if(detail===0&&(o.material as T.MeshStandardMaterial).emissive?.getHex()===0)o.geometry=accentSurface;
  });
  body.userData.sculptedCreature=shape;
}

/** Cover language: fitted expressions, broad connected planes and restrained
 * small details. Mechanical/stone armour keeps deliberate facets; organic skin
 * no longer inherits cuboid brows, isolated bristle cones or duplicate noses. */
function coverStyle(body:T.Group,shape:CreatureShape,primary:number,accent:number,elite:boolean):void {
  if(['golem','sand','scrap','gargoyle','treant'].includes(shape))body.traverse(o=>{
    if(o instanceof T.Mesh&&o.geometry.type==='IcosahedronGeometry'
      &&(o.geometry as T.IcosahedronGeometry).parameters.detail===0
      &&(o.material as T.MeshStandardMaterial).emissive.getHex()===0)o.geometry=carvedSlab();
  });
  if(['ogre','smith','imp','gargoyle','harpy'].includes(shape)){
    const skin=shape==='gargoyle'?accent:shape==='ogre'||shape==='imp'?primary:0xc6a17b;
    for(const part of [...body.children])if(part instanceof T.Mesh&&Math.abs(part.position.x)>0
      &&part.position.y===97&&part.geometry.type==='RoundedBoxGeometry')remove(body,part);
    for(const eye of body.children.filter(o=>o.userData.faceEye)){
      const brow=add(eye,sculpt('cover-biped-brow',[[0,4,-.2,5.5,1.8,2.8],[2,3.8,-.6,3.7,1.8,2]],.65,18),skin);
      brow.rotation.z=Number(eye.userData.faceEye)*.13;
    }
  }
  const beast=beasts.has(shape);
  if(beast){
    for(const eye of body.children.filter(o=>o.userData.faceEye)){
      for(const part of [...eye.children])if(part instanceof T.Mesh&&part.geometry.type==='RoundedBoxGeometry')remove(eye,part);
      const brow=add(eye,sculpt('cover-beast-brow-'+shape,[[0,3.7,-.1,5.5,1.7,2.1],[2,3.8,-.8,4,2,2]],.8,20),primary);
      brow.rotation.z=Number(eye.userData.faceEye)*.17;
    }
    if(shape==='boar'){
      // Remove both old snout overlays; the nose is a broad seated pad with
      // two nostrils, not a dark dog's nose superimposed on pink beads.
      for(const part of [...body.children])if(part instanceof T.Mesh&&part.userData.creatureHead
        &&part.position.z>=63&&part.position.y>=34&&part.position.y<=41)remove(body,part);
      const nose=add(body,sculpt('cover-boar-nose',[[0,36,67,11.5,7.2,3.5],[0,33,65,10,4.5,4]],1.2,26),0xa67f66);
      nose.userData.creatureHead=true;
      for(const side of [-1,1])orb(body,0x4b352c,side*4.5,37,70.2,1.7,1.5,.38).userData.creatureHead=true;
      horn(body,0x574033,[[-8,29,60],[0,28.5,64],[8,29,60]],.45).userData.creatureHead=true;
    }
    if(shape==='boar'||shape==='hound'){
      for(const part of [...body.children])if(part instanceof T.Mesh&&!part.userData.creatureHead&&part.position.x===0
        &&part.position.y>=56&&part.position.y<=72&&part.position.z<25&&part.geometry.type==='ConeGeometry')remove(body,part);
      const y=35;
      add(body,sculpt('cover-bristle-ridge-'+shape+'-'+elite,[
        [0,y+23,-22,6.5,7,16],[0,y+28,-7,6,8,18],[0,y+26,8,5.2,7,13]
      ],2.7,24),new T.Color(primary).multiplyScalar(.73).getHex());
    }
  }
  if(shape==='rogue'||shape==='cultist'){
    for(const part of [...body.children])if(part instanceof T.Mesh&&(part.userData.faceSurface
      ||part.position.x===0&&part.position.y===84&&part.position.z===18))remove(body,part);
    const mask=add(body,sculpt('cover-cowl-mask-'+shape,[[0,87,13,14,8,7],[0,82,12,11,6,5]],2,26),0x293039);
    mask.userData.creatureHead=true;mask.userData.faceSurface=true;
    horn(body,new T.Color(primary).multiplyScalar(.67).getHex(),[[-11,87,20],[0,85.8,21],[11,87,20]],.6).userData.creatureHead=true;
  }
  if(shape==='bat'){
    for(const part of [...body.children])if(part instanceof T.Mesh&&part.userData.creatureHead&&part.position.y===56&&Math.abs(part.position.x)===8)remove(body,part);
    const muzzle=add(body,sculpt('cover-bat-muzzle',[[0,59,24,8,6,4],[-6,57,23,6,4.5,4],[6,57,23,6,4.5,4]],1.5,24),accent);
    muzzle.userData.creatureHead=true;
  }
  if(['beetle','scorpion','spider'].includes(shape)){
    for(const eye of body.children.filter(o=>o.userData.faceEye)){
      eye.scale.setScalar(1.08);
      const brow=add(eye,sculpt('cover-chitin-brow',[[0,4,-.5,5,1.5,2]],.4,18),primary);brow.rotation.z=Number(eye.userData.faceEye)*.12;
    }
    if(shape==='scorpion'){
      for(const part of [...body.children])if(part instanceof T.Mesh&&part.position.x===0&&part.position.y>=39&&part.position.y<=43
        &&part.position.z<12&&part.geometry.type==='RoundedBoxGeometry')remove(body,part);
      for(let n=0;n<4;n++)add(body,sculpt('cover-scorpion-back-'+n,
        [[0,40-n*.7,-30+n*12,25-n*1.2,5,9],[0,42-n*.7,-34+n*12,22-n,3,5]],1.3,22),n%2?primary:accent);
    }
  }
  body.userData.creatureStyle='cover-2026-10-03';
}

/** Family-specific veteran mass, equipment and mature features. No collision edits. */
function veteran(body:T.Group,shape:CreatureShape,arms:T.Group[],legs:T.Group[],primary:number,accent:number):void {
  const metal=0x82928b,bone=0xe0cda0;
  if(beasts.has(shape)){
    const y=shape==='salamander'?20:35;
    const fur=reptiles.has(shape)?accent:shape==='ram'?0xc7bea2
      :new T.Color(primary).lerp(new T.Color(shape==='cat'?0xd4cfb7:accent),.55).getHex();
    for(const s of [-1,1]){
      if(reptiles.has(shape)){
        const armour=add(body,sculpt('veteran-beast-mantle-'+shape+'-'+s,[[s*24,y+12,3,12,16,26],[s*21,y+16,20,12,15,17]],2,24),fur);
        armour.userData.veteranFeature=true;
      }
      if(reptiles.has(shape)||shape==='ram')horn(body,bone,[[s*16,y+22,25],[s*23,y+37,19],[s*25,y+44,9]],4).userData.creatureHead=true;
      else if(shape==='boar')horn(body,bone,[[s*12,y-1,57],[s*21,y+7,69],[s*19,y+22,65]],4.5).userData.creatureHead=true;
      else {
        const ruff=add(body,sculpt('veteran-fur-ruff-'+shape+'-'+s,[[s*19,y+18,13,9,16,15],[s*20,y+7,27,9,12,12]],3,24),fur);ruff.userData.veteranFeature=true;
        horn(body,0x423c32,[[s*14,y+16,45],[s*12,y+10,49],[s*10,y+5,51]],.6).userData.creatureHead=true;
      }
      const leg=legs[s<0?0:Math.min(legs.length-1,2)];
      if(leg&&reptiles.has(shape))plate(leg,accent,0,-6,6,15,12,5);
    }
    if(reptiles.has(shape)||shape==='boar')for(let n=0;n<3;n++)horn(body,accent,[[0,y+24,-20+n*12],[0,y+38,-24+n*12],[0,y+44,-29+n*12]],4);
    if(!reptiles.has(shape)){
      const mantle=add(body,sculpt('veteran-fur-mantle-'+shape,[
        [0,y+23,14,23,15,24],[0,y+20,-10,20,12,24],
        [-21,y+11,2,11,15,26],[21,y+11,2,11,15,26],
      ],5,30),fur);mantle.userData.veteranFeature=true;
    }
  }else if(['beetle','spider','scorpion'].includes(shape)){
    for(const s of [-1,1]){
      add(body,sculpt('veteran-bug-carapace-'+s,[[s*19,42,-18,16,12,29],[s*20,38,6,13,11,17]],2,26),accent);
      for(let n=0;n<3;n++)horn(body,bone,[[s*25,37,-26+n*18],[s*38,46,-29+n*18],[s*43,50,-34+n*18]],4);
      horn(body,bone,[[s*17,20,38],[s*25,14,52],[s*17,11,63]],5);
    }
  }else if(shape==='mushroom'){
    const cap=body.children.find(o=>o instanceof T.Mesh&&o.position.y===70);if(cap)cap.scale.multiply(new T.Vector3(1.12,1.3,1.12));
    for(const s of [-1,1])add(body,sculpt('veteran-fungus-'+s,[[s*25,38,-3,17,9,15],[s*29,55,-8,16,10,15]],2,24),accent);
    add(body,sculpt('veteran-fungus-beard',[[0,19,17,14,10,5],[0,10,15,9,7,5]],1.7,22),0xc8b985);
  }else if(shape==='slime'){
    for(const s of [-1,1])add(body,sculpt('veteran-slime-lobe-'+s,[[s*20,22,0,16,21,22]],2,24),primary);
    for(let n=0;n<3;n++)horn(body,accent,[[(n-1)*13,42,-3],[(n-1)*16,57,-5],[(n-1)*17,61,-9]],4);
  }else if(shape==='serpent'||shape==='worm'){
    for(const s of [-1,1])horn(body,bone,[[s*16,48,39],[s*27,64,30],[s*30,72,17]],5).userData.creatureHead=true;
    for(const part of body.children)if(part instanceof T.Group&&!part.userData.faceEye&&part.children.some(o=>o instanceof T.Mesh)&&part.position.z<25){part.scale.x*=1.2;part.scale.y*=1.2;}
  }else if(shape==='bat'||shape==='owl'||shape==='harpy'){
    for(const s of [-1,1])horn(body,accent,[[s*11,74,7],[s*21,91,-3],[s*17,106,-9]],5).userData.creatureHead=true;
    const featherColor=new T.Color(primary).lerp(new T.Color(accent),.5).getHex();
    add(body,sculpt('veteran-bird-ruff-'+shape,shape==='harpy'
      ?[[0,70,-7,23,10,15],[0,65,11,21,12,5],[-19,69,3,9,10,10],[19,69,3,9,10,10]]
      :[[0,52,8,29,14,21]],3,26),featherColor);
  }else if(shape==='wisp'||shape==='flame'){
    for(const s of [-1,1])horn(body,accent,[[s*10,29,0],[s*25,57,0],[s*19,78,-3]],6);
  }else if(shape==='rogue'||shape==='cultist'){
    const trim=shape==='cultist'?accent:0x807965,dye=new T.Color(primary).multiplyScalar(.7).getHex();
    // Dark executioner leather versus a tall ritual hood: neither is a horned knight.
    for(const [i,arm]of arms.entries()){
      add(arm,sculpt('veteran-cowl-shoulder-'+shape,[[0,0,-1,shape==='rogue'?17:14,9,15],[0,-6,-3,shape==='rogue'?15:13,7,11]],2,22),dye);
      plate(arm,trim,(i?1:-1)*3,-21,6,17,13,4);
      for(let n=0;n<3;n++)orb(arm,trim,(i?1:-1)*3+(n-1)*4,-21,8.5,1.3);
    }
    add(body,sculpt('veteran-cowl-collar-'+shape,[[0,72,3,21,7,15],[0,69,-10,20,9,8]],2,26),dye);
    if(shape==='cultist'){
      const mitre=add(body,sculpt('veteran-cultist-hood',[[0,110,-4,14,17,13],[0,125,-8,6,9,7]],2,26),primary);mitre.userData.creatureHead=true;
      horn(body,trim,[[0,131,-6],[0,118,7],[0,106,14]],1.1).userData.creatureHead=true;
      for(const s of [-1,1])horn(body,trim,[[s*15,75,12],[s*10,63,19],[s*3,58,20]],1);
      orb(body,trim,0,58,20,3.5,4,1.8);
    }else{
      // A broad, low leather cowl, armoured chest and wider stance distinguish
      // the veteran from the slender scout even without size or aura cues.
      const hood=body.children.find(o=>o instanceof T.Mesh&&o.position.y===94&&o.position.z===-3);
      if(hood)hood.scale.multiply(new T.Vector3(1.22,.85,1.1));
      for(const arm of arms)arm.position.x*=1.1;
      for(const leg of legs)leg.position.x*=1.18;
      add(body,sculpt('veteran-rogue-cuirass',[[0,62,16,19,13,5],[0,48,18,15,8,4]],2,26),0x4f5d5b);
      for(const side of [-1,1])horn(body,trim,[[side*15,69,19],[side*12,58,22],[side*7,43,21]],.8);
      const mask=add(body,sculpt('veteran-rogue-mask',[[0,85,19,13,5,3],[0,81,17,9,5,3]],1,24),dye);mask.userData.creatureHead=true;
      for(const s of [-1,1])horn(body,trim,[[s*12,90,19],[s*9,85,22],[s*7,80,20]],.55).userData.creatureHead=true;
      add(body,sculpt('veteran-rogue-cloak',[[0,59,-17,25,19,5],[0,37,-16,29,13,4]],2,26),dye);
    }
  }else if(shape==='imp'||shape==='gargoyle'){
    const c=shape==='gargoyle'?primary:accent;
    for(const [i,arm]of arms.entries()){
      add(arm,sculpt('veteran-demon-shoulder',[[0,-2,-1,13,11,11]],1.5,22),c);
      horn(arm,c,[[(i?1:-1)*5,4,-1],[(i?1:-1)*14,14,-3],[(i?1:-1)*17,17,-6]],3.5);
    }
    for(const s of [-1,1])horn(body,c,[[s*14,105,-3],[s*32,119,-10],[s*35,136,-18],[s*23,142,-21]],5).userData.creatureHead=true;
    add(body,sculpt('veteran-demon-torso',[[0,63,12,18,16,6],[0,49,14,12,10,5]],2.5,24),c);
    body.children.filter(o=>o instanceof T.Group&&Math.abs(o.position.x)===14&&o.position.y===69).forEach(o=>o.scale.multiplyScalar(1.15));
  }else if(['treant','golem','sand','scrap'].includes(shape)){
    const tree=shape==='treant';
    for(const [i,arm]of arms.entries()){
      add(arm,sculpt('veteran-giant-shoulder-'+shape,[[0,-1,-1,24,19,23],[0,-17,1,20,14,18]],2.5,24),primary);
      for(let n=0;n<3;n++)horn(arm,tree?0x604734:accent,[[(i?1:-1)*(12+n*4),10,-6+n*6],[(i?1:-1)*(23+n*3),25+n*2,-8+n*5],[(i?1:-1)*(25+n*3),33+n*3,-14+n*5]],4);
    }
    if(tree){
      for(const s of [-1,1]){
        horn(body,primary,[[s*13,114,-2],[s*28,150,-9],[s*42,172,-4]],7).userData.creatureHead=true;
        const canopy=add(body,sculpt('veteran-tree-canopy-'+s,[[s*30,151,-6,24,14,21],[s*43,164,-3,22,15,20],[s*18,160,-10,22,15,18]],3,26),accent);canopy.userData.creatureHead=true;
      }
      for(let n=0;n<7;n++)horn(body,primary,[[(n-3)*4,100,20],[(n-3)*5,80,22],[(n-3)*7,69-Math.abs(n-3)*2,19]],2.7).userData.creatureHead=true;
    }else{
      for(const s of [-1,1]){
        const crag=add(body,sculpt('veteran-stone-crest-'+s,[[s*13,124,-3,12,14,11],[s*18,136,-5,8,12,8]],1.5,22),primary);crag.userData.creatureHead=true;
      }
      add(body,sculpt('veteran-giant-core-guard',[[0,77,23,26,12,7],[0,53,24,22,9,7]],2,24),primary);
      for(const s of [-1,1])horn(body,accent,[[s*4,77,29],[s*13,85,27],[s*19,91,22]],1.7);
    }
  }else{
    const giant=['treant','golem','sand','scrap'].includes(shape);
    for(const [i,arm]of arms.entries()){
      plate(arm,metal,0,-4,2,giant?38:22,10,giant?33:20);
      plate(arm,metal,(i?1:-1)*3,-21,6,giant?27:14,18,6);
      horn(arm,bone,[[(i?1:-1)*8,2,-2],[(i?1:-1)*12,16,-2],[(i?1:-1)*14,23,-3]],3.5);
    }
    add(body,sculpt('veteran-chest-'+shape,[[0,giant?74:65,giant?23:15,giant?29:17,17,4.5],[0,giant?53:48,giant?25:17,giant?24:13,10,4]],2,24),giant?accent:metal);
    for(const s of [-1,1])horn(body,bone,[[s*12,giant?124:106,0],[s*18,giant?141:122,-4],[s*15,giant?150:130,-9]],3.5).userData.creatureHead=true;
  }
  for(const eye of body.children.filter(o=>o.userData.faceEye)){
    eye.scale.y*=.78;eye.rotation.z=Number(eye.userData.faceEye)*.10;
  }
  body.userData.eliteAnatomy=true;
}

function bossAnatomy(id:string,body:T.Group,shape:CreatureShape,arms:T.Group[],legs:T.Group[],primary:number,accent:number):void {
  const principal=(color:number)=>body.children.find(o=>o instanceof T.Mesh&&o.position.length()===0
    &&o.geometry.userData.sculptedSurface&&(o.material as T.MeshStandardMaterial).color.getHex()===color) as T.Mesh|undefined;
  if(shape==='treant'){
    for(const part of [...body.children])if(part instanceof T.Mesh&&(
      part.position.x===0&&part.position.z===0&&[60,107].includes(part.position.y)
      ||part.position.y>=130&&part.scale.x>=18&&part.scale.z>=18))remove(body,part);
    const bark=sculpt('boss-root-trunk',[[0,64,-3,29,37,23],[0,36,-1,24,22,25],[-18,49,0,13,28,20],[16,72,-2,13,30,19]],4,34,
      [[-13,61,24,2.7,26,5],[7,57,25,2.3,27,5],[20,80,18,2.2,18,5]],{top:0x7c603e,bottom:0x493b2c});
    add(body,bark,0xffffff);
    const face=add(body,sculpt('boss-root-face',[[0,107,0,23,22,18],[0,94,9,19,11,14],[-14,112,10,13,7,12],[14,112,10,13,7,12]],2.5,32,
      [[-9,108,20,5.5,3.5,4],[9,108,20,5.5,3.5,4],[0,96,22,11,2,4]]),0x745b3c);
    face.userData.creatureHead=true;face.userData.faceSurface=true;
    const canopy=add(body,sculpt('boss-root-canopy',[[0,155,-13,34,21,28],[-39,161,-8,33,20,26],[43,170,-12,32,23,27],[2,180,-18,27,18,24]],7,34,[],{top:0x86a857,bottom:0x3d643e}),0xffffff);
    canopy.userData.creatureHead=true;
    for(const [i,arm]of arms.entries()){
      const s=i?1:-1;
      for(const part of [...arm.children])if(part instanceof T.Mesh&&Math.max(part.scale.x,part.scale.y)>9
        &&['CylinderGeometry','IcosahedronGeometry'].includes(part.geometry.type))remove(arm,part);
      add(arm,sweepSurface('profile-colossus-arm-'+s,[
        [0,14,0,1.5,1.5],[0,7,0,17,16],[s*2,-8,0,16,15],
        [s*6,-28,3,12,12],[s*7,-47,4,17,16],
        [s*7,-55,5,13,13],
      ]),0x645036);
      for(let n=0;n<3;n++)horn(arm,0x51412d,[[s*(3+n*6),-49,13],[s*(5+n*6),-61,17],[s*(4+n*6),-65,22]],3.8);
    }
    for(const [i,leg]of legs.entries()){
      const s=i?1:-1;
      add(leg,sculpt('boss-root-foot-'+s,[[0,-13,4,12,20,14],[s*6,-27,12,16,7,21],[s*13,-28,21,12,5,18]],2.5,26),0x5b4731);
    }
  }else if(shape==='scorpion'||shape==='spider'){
    // The vertex-painted body is white, while its dorsal plates use primary.
    // Selecting by material colour replaced a back plate with a second entire
    // carapace, hiding the fitted eyes on the original face underneath it.
    const shell=body.children.find(o=>o instanceof T.Mesh&&o.userData.faceSurface) as T.Mesh|undefined;
    if(shell){shell.geometry=sculpt('boss-carapace-'+id,shape==='spider'
      ?[[0,30,-32,35,28,37],[0,24,1,25,18,23],[0,23,30,20,14,18]]
      :[[0,26,-27,36,22,32],[0,26,5,28,19,24],[0,25,29,21,15,19]],4,34);
      shell.material=pigment(primary);}
    // The abdomen carries one broad shield instead of a small crown being the
    // entire distinction from an ordinary insect.
    add(body,sculpt('boss-abdomen-shield-'+id,shape==='spider'
      ?[[0,48,-34,27,14,31],[0,54,-42,19,10,22]]
      :[[0,44,-24,29,9,28],[0,47,-34,24,8,20]],2.5,28),new T.Color(primary).lerp(new T.Color(accent),.25).getHex());
  }else if(['golem','sand'].includes(shape)){
    const torso=body.children.find(o=>o instanceof T.Mesh&&o.position.y===60&&o.position.z===0) as T.Mesh|undefined;
    const dimensions:Record<string,[number,number,number]>={
      'prism-golem':[27,38,23],'lava-golem':[36,29,29],'stone-giant':[36,38,23],'canyon-lord':[38,29,28],
    };
    const [w,h,d]=dimensions[id]??[30,34,25];
    if(torso){torso.geometry=sculpt('boss-core-mass-'+id,[[0,.2,0,w/31,h/35,d/25],[0,-.5,.04,w*.73/31,h*.6/35,d*.9/25]],.045,28);
      torso.userData.sculptedSurface=true;}
    // Broad shoulder/back ridges make each mass profile readable behind its
    // original armour and emissive core; the front danger marking stays clear.
    for(const s of [-1,1]){
      const mantle=add(body,sculpt('boss-crag-mantle-'+id+'-'+s,[[s*(w-6),85,-7,15,id==='stone-giant'?29:18,20],[s*(w-12),65,-10,13,17,17]],1.7,26),primary);
      mantle.userData.bossAnatomy=true;
    }
  }else if(shape==='ogre'){
    const torso=body.children.find(o=>o instanceof T.Mesh&&o.position.y===53&&o.position.z===0) as T.Mesh|undefined;
    if(torso)remove(body,torso);
    add(body,sculpt('boss-ogre-torso',[[0,58,-1,33,26,22],[0,42,6,31,18,24],[-24,68,-1,15,17,18],[24,68,-1,15,17,18]],4,32),primary);
    for(const s of [-1,1]){
      const jaw=add(body,sculpt('boss-ogre-jowl-'+s,[[s*14,79,10,12,9,13],[s*15,88,8,11,9,13]],2.5,26),primary);jaw.userData.creatureHead=true;
      add(body,sculpt('boss-ogre-moss-'+s,[[s*25,73,-4,15,9,15],[s*32,65,-8,11,12,12]],2,24),0x627a4e);
    }
  }else if(['boar','cat','hound','salamander','wyvern','dragon'].includes(shape)){
    const torso=principal(0xffffff);
    const low=shape==='salamander',y=low?20:35;
    const mass:Record<string,[number,number,number]>={
      'crystal-boar':[35,28,37],'night-stalker':[27,23,42],'obsidian-beast':[35,30,38],
      'elder-salamander':[36,19,43],'ancient-wyvern':[24,32,40],'fire-dragon':[38,32,44],
    };
    const [w,h,d]=mass[id]??[30,24,35];
    if(torso){torso.geometry=sculpt('boss-beast-body-'+id,[[0,y,-17,w*.84,h*.82,d*.72],[0,y+4,12,w,h,d*.78],[0,y-2,-2,w*.82,h*.7,d*.94]],4.5,34,[],
      {top:primary,bottom:new T.Color(primary).lerp(new T.Color(accent),.28).getHex()});}
    if(shape==='cat'||shape==='hound')for(const s of [-1,1]){
      const cheek=add(body,sculpt('boss-predator-ruff-'+id+'-'+s,[[s*20,y+12,26,13,17,18],[s*16,y+22,16,12,15,16]],2.5,28),accent);
      cheek.userData.creatureHead=true;
    }
  }
  body.userData.bossAnatomy=id;
}

/** Seat remaining face pigment on the actual existing front-facing surface. */
function fittedGiantSkull(body:T.Group,shape:CreatureShape,primary:number,id:string):void{
  if(!['golem','sand','scrap'].includes(shape)||id==='lava-golem')return;
  const skull=body.children.find(o=>o instanceof T.Mesh&&o.position.x===0&&o.position.y===107&&o.position.z===0) as T.Mesh|undefined;
  if(!skull)return;
  // Keep intentional crags / boss fittings; replace the old forehead blocks and
  // protruding nose that hid the fitted eyes under an unrelated angular mask.
  for(const part of [...body.children])if(part instanceof T.Mesh&&part!==skull&&part.userData.creatureHead&&!part.userData.bossOrnament
    &&Math.abs(part.position.x)<=16&&part.position.y>=92&&part.position.y<=124&&part.position.z>8)remove(body,part);
  skull.geometry=sculpt('fitted-giant-skull-'+shape,[[0,110,0,21,23,19],[0,97,8,18,11,14],
    [-9,114,14,8,5,7],[9,114,14,8,5,7],
    [-10,119,15,11,3,5,-.12],[10,119,15,11,3,5,.12],[0,103,21,5,5,6]],2.4,38);
  skull.position.set(0,0,0);skull.scale.set(1,1,1);skull.material=pigment(primary);skull.userData.faceSurface=true;skull.userData.creatureHead=true;
  for(const eye of body.children.filter(o=>o.userData.faceEye))eye.position.y=114;
}
const fittedFaceDepths=new WeakMap<T.BufferGeometry,Map<string,number>>();
function remainingSurfaceFace(body:T.Group,shape:CreatureShape,accent:number):void{
  const eyes=body.children.filter(o=>o.userData.faceEye);if(eyes.length!==2)return;
  const eye=eyes[0],y=shape==='spider'||shape==='beetle'?27:eye.position.y,x=Math.abs(eye.position.x);
  let surface=body.children.find(o=>o instanceof T.Mesh&&o.userData.faceSurface) as T.Mesh|undefined;
  if(!surface)surface=body.children.find(o=>o instanceof T.Mesh&&o.position.x===0&&o.position.z===0&&o.position.y===(shape==='mushroom'?30:shape==='slime'?22:shape==='wisp'?45:107)) as T.Mesh|undefined;
  if(!surface)return;
  const bug=['scorpion','beetle','spider'].includes(shape),soft=['slime','mushroom'].includes(shape),stone=['golem','sand','scrap','treant','wisp','flame'].includes(shape);
  const width=bug?4.3:soft?3.2:stone?4:4.5,height=bug?3.8:soft?4.1:stone?2.5:3;
  surface.updateMatrix();const shell=new T.Mesh(surface.geometry);shell.matrix.copy(surface.matrix);shell.matrixAutoUpdate=false;shell.updateMatrixWorld(true);
  let depths=fittedFaceDepths.get(surface.geometry);if(!depths){depths=new Map();fittedFaceDepths.set(surface.geometry,depths);}
  const key=[x,y,width,height,...surface.matrix.elements].join(','),ray=new T.Raycaster(),direction=new T.Vector3(0,0,-1);
  let depth=depths.get(key);
  if(depth===undefined){
    // Fit the entire aperture, not just its centre. A centre-only depth clipped
    // whites/pupils into jagged triangles on rounded heads. Shared geometry
    // caches these probes once, rather than raycasting for every spawned mob.
    depth=Infinity;
    for(let n=0;n<9;n++){
      const dx=n?Math.cos((n-1)*Math.PI/4)*width:0,dy=n?Math.sin((n-1)*Math.PI/4)*height:0;
      ray.set(new T.Vector3(x+dx,y+dy-dx*.1,150),direction);
      const hit=ray.intersectObject(shell,false)[0];if(hit)depth=Math.min(depth,hit.point.z-2);
    }
    depths.set(key,depth);
  }
  (shell.material as T.Material).dispose();if(!Number.isFinite(depth))return;
  paintSurfaceFace(surface,{x,y,z:depth,width,height,kind:bug?'bug':soft?'soft':stone?'stone':shape==='serpent'?'reptile':'flesh',accent,veteran:!!body.userData.eliteAnatomy,lightEyes:shape==='spider'||shape==='beetle'});
  eyes.forEach(o=>remove(body,o));
}
function smallContinuousSurface(body:T.Group,shape:CreatureShape,legs:T.Group[],primary:number,accent:number,elite:boolean,boss:boolean):void{
  const mass=elite&&!boss?1.17:1;
  if(shape==='slime'){
    for(const part of [...body.children])if(part instanceof T.Mesh&&!part.userData.bossOrnament)remove(body,part);
    const volumes:Volume[]=[[0,18,0,28*mass,18,28],[0,30,-3,20*mass,19,22],[-19*mass,7,3,15,6,21],[19*mass,7,3,14,6,21]];
    if(elite&&!boss)volumes.push([0,47,-5,10,11,10],[-19,29,-8,14,17,17],[19,29,-8,14,17,17]);
    const surface=add(body,sculpt('continuous-slime-'+elite,volumes,4,38,[],{top:primary,bottom:accent}),0xffffff);
    surface.name='small-creature-continuous-surface';surface.userData.faceSurface=true;
    // The body already squashes/breathes through its established animation.
    surface.material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.5});surface.userData.ownedMaterial=true;
  }else if(shape==='mushroom'){
    for(const part of [...body.children])if(part instanceof T.Mesh&&part.position.y===30&&part.position.z===0)remove(body,part);
    legs.forEach(clearRigid);
    const volumes:Volume[]=[[0,32,0,17*mass,22,16],[0,19,1,19*mass,12,17],[0,47,0,12*mass,12,12]];
    for(const leg of legs)volumes.push([leg.position.x,11,2,8,10,8],[leg.position.x,5,8,9,4.5,12]);
    const surface=add(body,sculpt('continuous-fungus-stem-'+elite,volumes,3,40,[],{top:0xdacda6,bottom:0xa59671}),0xffffff);
    surface.name='small-creature-continuous-surface';surface.userData.faceSurface=true;
  }else if(shape==='serpent'||shape==='worm'){
    const segments=body.children.filter((o):o is T.Group=>o instanceof T.Group&&!o.userData.faceEye&&o.position.z<=32&&o.position.x!==0);
    // The first segment has x=0; the explicit original sequence starts at z=32.
    const first=body.children.find((o):o is T.Group=>o instanceof T.Group&&o.position.z===32&&o.position.y===36);if(first)segments.unshift(first);
    if(segments.length!==9)throw Error('Missing original serpent/worm segment anchors');
    for(const group of segments)clearRigid(group);
    for(const part of [...body.children])if(part instanceof T.Mesh&&!part.userData.bossOrnament&&part.userData.creatureSegment===undefined&&!part.userData.creatureHead)remove(body,part);
    if(shape==='serpent')for(const part of [...body.children])if(part instanceof T.Mesh&&part.userData.faceSurface)remove(body,part);
    const volumes:Volume[]=segments.map((s,n)=>[s.position.x,s.position.y,s.position.z,(shape==='worm'?25:22)*mass*(1-n*.065),18*mass*(1-n*.04),20]);
    if(shape==='serpent'){
      volumes.push([0,44,42,22*mass,14,24],[0,41,60,16*mass,8,16]);
      if(elite&&!boss)volumes.push([-23,38,21,14,23,16],[23,38,21,14,23,16],
        [0,45,10,12,22,19],[0,39,-5,8,19,12]);
    }
    else volumes.push([0,36,39,25*mass,21*mass,22]);
    const cuts:Volume[]=shape==='worm'?[[0,36,59,17,17,16]]:[];
    const surface=add(body,sculpt('continuous-segment-body-'+shape+'-'+elite+'-'+boss+'-'+primary+'-'+accent,volumes,4,48,cuts,{top:primary,bottom:accent}),0xffffff);
    surface.name='small-creature-continuous-surface';surface.userData.segmentSkin=true;surface.userData.faceSurface=true;
  }
}
export function sculptCreatureSurfaces(body:T.Group,shape:CreatureShape,arms:T.Group[],legs:T.Group[],wings:T.Group[],primary:number,accent:number,elite:boolean,boss:boolean,id:string):void {
  if(shape==='goblin')continuousGoblin(body,arms,legs,elite&&!boss);
  else if(isMammalShape(shape))continuousMammal(body,shape,legs,elite,boss,primary,accent);
  else if(isHumanoidShape(shape))continuousHumanoid(body,shape,arms,legs,elite,boss,primary,accent);
  else if(isReptileShape(shape))continuousReptile(body,shape,legs,wings,elite,boss,primary,accent);
  else if(shape==='bat'||shape==='owl')continuousBird(body,shape,legs,wings,elite,boss,primary,accent);
  else {organic(body,shape,arms,legs,primary,accent,elite,boss);coverStyle(body,shape,primary,accent,elite);if(elite&&!boss)veteran(body,shape,arms,legs,primary,accent);}
  if(shape==='goblin')body.userData.creatureStyle='cover-2026-10-03';
  if(boss&&!isMammalShape(shape)&&!isHumanoidShape(shape)&&!isReptileShape(shape))bossAnatomy(id,body,shape,arms,legs,primary,accent);
  birdPlumage(body,wings,shape,primary,accent,elite);
  if(shape==='imp'||shape==='gargoyle')reptileWings(wings,primary,accent);
  smallContinuousSurface(body,shape,legs,primary,accent,elite,boss);
  fittedGiantSkull(body,shape,primary,id);
  remainingSurfaceFace(body,shape,accent);
}

export function sharedCreatureSculptGeometry(geometry:T.BufferGeometry):boolean{return shared.has(geometry);}

type SculptEntry={key:string;vertices:number;triangles:number;position:number;normal:number;color?:number;index:number};
export type SculptManifest={revision:string;entries:SculptEntry[]};
/** Offline authoring uses the same surface definitions as the game. */
export function authoredCreatureSurfaces():[string,T.BufferGeometry][]{return [...cache.entries()];}
export function installCreatureSurfaces(manifest:SculptManifest,buffer:ArrayBuffer):void {
  if(manifest.revision!==CREATURE_SCULPT_REVISION)throw Error('Creature sculpt asset revision mismatch');
  for(const entry of manifest.entries){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,entry.position,entry.vertices*3),3));
    // Decode quantized normals once so they can share a batch with authored
    // float normals (Three's merger requires identical attribute array types).
    geometry.setAttribute('normal',new T.BufferAttribute(Float32Array.from(new Int16Array(buffer,entry.normal,entry.vertices*3),v=>v/32767),3));
    if(entry.color!==undefined)geometry.setAttribute('color',new T.BufferAttribute(new Uint8Array(buffer,entry.color,entry.vertices*3),3,true));
    geometry.setIndex(new T.BufferAttribute(new Uint16Array(buffer,entry.index,entry.triangles*3),1));
    geometry.userData.sculptedSurface=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();cache.set(entry.key,geometry);shared.add(geometry);
  }
}
let loaded:Promise<void>|undefined;
/** Ship simplified authored meshes; do not tessellate dense sculpt fields on a phone. */
export function preloadCreatureSurfaces():Promise<void> {
  const revision=encodeURIComponent(CREATURE_SCULPT_REVISION);
  return loaded??=Promise.all([
    fetch(`${import.meta.env.BASE_URL}assets/models/creature-sculpt/manifest.json?v=${revision}`).then(r=>{if(!r.ok)throw Error('Creature sculpt manifest unavailable');return r.json() as Promise<SculptManifest>;}),
    fetch(`${import.meta.env.BASE_URL}assets/models/creature-sculpt/surfaces.bin?v=${revision}`).then(r=>{if(!r.ok)throw Error('Creature sculpt meshes unavailable');return r.arrayBuffer();})
  ]).then(([manifest,buffer])=>installCreatureSurfaces(manifest,buffer)).catch(error=>{
    // Authoring fallback keeps the world playable if a local asset is missing.
    console.warn('Creature sculpt asset fallback',error);
  });
}
