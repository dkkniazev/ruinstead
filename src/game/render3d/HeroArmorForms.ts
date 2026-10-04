import * as T from 'three';

/** One closed surface per plate: material bands share edges, never intersect. */
function armor(points:[number,number][],steelFrom:number):T.BufferGeometry {
  const segments=20,geometry=new T.LatheGeometry(points.map(([x,y])=>new T.Vector2(x,y)),segments);
  const groups:number[][]=[[],[]],index=geometry.index!;
  for(let i=0;i<segments;i++)for(let j=0;j<points.length-1;j++){
    const offset=(i*(points.length-1)+j)*6,group=groups[j>=steelFrom?1:0];
    for(let n=0;n<6;n++)group.push(index.getX(offset+n));
  }
  geometry.setIndex([...groups[0],...groups[1]]);geometry.clearGroups();
  geometry.addGroup(0,groups[0].length,0);geometry.addGroup(groups[0].length,groups[1].length,1);
  geometry.userData.sharedHeroArmor=true;return geometry;
}

export const heroHelmet=armor([[0,-.34],[.94,-.34],[1,-.27],[1,-.12],[.97,.12],[.86,.51],[.63,.79],[.32,.97],[0,1.02]],3);
export const heroShoulder=armor([[0,-.5],[.69,-.5],[.93,-.38],[1,-.14],[.96,.18],[.81,.5],[.55,.72],[0,.83]],3);
export const heroBreastplate=armor([[0,-.38],[.75,-.38],[.96,-.19],[1,-.02],[.98,.13],[.89,.28],[.72,.53],[.42,.76],[0,.87]],4);
heroBreastplate.rotateX(Math.PI/2);

export function armorPlate(parent:T.Object3D,geometry:T.BufferGeometry,edge:T.Material,steel:T.Material,
  x:number,y:number,z:number,sx:number,sy:number,sz:number):T.Mesh {
  const mesh=new T.Mesh(geometry,[edge,steel]);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
  mesh.castShadow=mesh.receiveShadow=true;mesh.userData.heroArmor=true;parent.add(mesh);return mesh;
}
