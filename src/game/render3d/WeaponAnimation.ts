import {
  WEAPON_DEFINITIONS,
  type WeaponAttackStyle,
  type WeaponId,
} from '../combat/WeaponDefinitions';

export const WEAPON_ATTACK_ANIMATION_MS:
  Record<WeaponAttackStyle, number> = {
  'smash': 780,
  'wide-slash': 650,
  'slash': 500,
  'dual-slash': 380,
  'thrust': 520,
};

export function weaponAttackAnimationMs(
  weaponId: WeaponId,
): number {
  return WEAPON_ATTACK_ANIMATION_MS[
    WEAPON_DEFINITIONS[weaponId]
      .attackStyle
  ];
}

export function weaponAttackAnimationSeconds(
  weaponId: WeaponId,
): number {
  return (
    weaponAttackAnimationMs(
      weaponId,
    ) / 1000
  );
}
