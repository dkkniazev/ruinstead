import { WEAPON_DEFINITIONS } from './WeaponDefinitions';
import { getWeaponDamageMultiplier, type EquippedWeaponProfile } from '../progression/WeaponInventory';

/** Neutral-target damage. Combat and the inventory use the same rounding. */
export function weaponHitDamage(profile: EquippedWeaponProfile, bonus = 1, scale = 1, effectiveness = 1, base = WEAPON_DEFINITIONS[profile.weaponId].damage): number {
  return Math.max(1, Math.round(base * scale * bonus * getWeaponDamageMultiplier(profile.level, profile.rarity, profile.stars) * effectiveness));
}

export function safeZoneHealth(health: number, maxHealth: number, deltaMs: number): number {
  return Math.min(maxHealth, health + maxHealth * Math.max(0, deltaMs) / 5000);
}

export type BossDangerZone =
  | { shape: 'circle'; x: number; y: number; radius: number }
  | { shape: 'line'; x: number; y: number; dx: number; dy: number; length: number; width: number };

/** The visible danger zone includes the player's collision margin. */
export function insideBossDanger(zone: BossDangerZone, x: number, y: number): boolean {
  const rx = x - zone.x, ry = y - zone.y;
  if (zone.shape === 'circle') return Math.hypot(rx, ry) <= zone.radius;
  const along = rx * zone.dx + ry * zone.dy;
  return along >= 0 && along <= zone.length && Math.abs(rx * zone.dy - ry * zone.dx) <= zone.width / 2;
}
