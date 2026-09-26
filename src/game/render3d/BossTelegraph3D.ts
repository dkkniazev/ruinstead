import * as THREE from 'three';
import type { BossDangerZone } from '../combat/CombatMath';
import { terrainHeight } from '../world/WorldTerrain';

export function createBossTelegraph(zone: BossDangerZone): THREE.Mesh {
  const geometry = zone.shape === 'circle'
    ? new THREE.CircleGeometry(zone.radius, 64)
    : new THREE.PlaneGeometry(zone.length, zone.width, Math.ceil(zone.length / 25), 6);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i), v = positions.getY(i);
    const x = zone.shape === 'circle' ? zone.x + u : zone.x + (u + zone.length / 2) * zone.dx - v * zone.dy;
    const y = zone.shape === 'circle' ? zone.y + v : zone.y + (u + zone.length / 2) * zone.dy + v * zone.dx;
    positions.setXYZ(i, x, terrainHeight(x, y) + 10, y);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: 0xff352c, transparent: true, opacity: 0.54, side: THREE.DoubleSide, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2,
  }));
  mesh.userData.zone = zone;
  return mesh;
}

export function disposeBossTelegraph(mesh: THREE.Mesh): void {
  mesh.removeFromParent(); mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}
