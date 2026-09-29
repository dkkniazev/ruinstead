import * as THREE from 'three';
import type { BossDangerZone } from '../combat/CombatMath';
import { terrainHeight } from '../world/WorldTerrain';

export function createBossTelegraph(zone: BossDangerZone): THREE.Mesh {
  const geometry = zone.shape === 'circle'
    // Interior rings follow hills too; a single centre fan cuts through raised ground.
    ? new THREE.RingGeometry(0, zone.radius, 64, Math.max(1, Math.ceil(zone.radius / 30)))
    : new THREE.PlaneGeometry(zone.length, zone.width, Math.ceil(zone.length / 25), 6);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i), v = positions.getY(i);
    const x = zone.shape === 'circle' ? zone.x + u : zone.x + (u + zone.length / 2) * zone.dx - v * zone.dy;
    const y = zone.shape === 'circle' ? zone.y + v : zone.y + (u + zone.length / 2) * zone.dy + v * zone.dx;
    positions.setXYZ(i, x, terrainHeight(x, y) + 10, y);
  }
  geometry.computeVertexNormals();
  const material=new THREE.MeshBasicMaterial({
    color: 0xff5148, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false,toneMapped:false,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vDangerUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDangerUv=uv;');
    shader.fragmentShader='varying vec2 vDangerUv;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float edge=${zone.shape==='circle'?'1.-length(vDangerUv*2.-1.)':'min(min(vDangerUv.x,1.-vDangerUv.x),min(vDangerUv.y,1.-vDangerUv.y))'};
      float rim=1.-smoothstep(.014,.035,edge);
      diffuseColor.a*=.32+rim*.68;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.52,.35),rim*.3);
    `);
  };
  material.customProgramCacheKey=()=>`danger-${zone.shape}`;
  const mesh = new THREE.Mesh(geometry,material);
  mesh.userData.zone = zone;
  return mesh;
}

export function disposeBossTelegraph(mesh: THREE.Mesh): void {
  mesh.removeFromParent(); mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}
