import type {
  WeaponId,
} from './WeaponDefinitions';

export type DamageEffectiveness =
  | 'weakness'
  | 'neutral'
  | 'resistance';

export type DamageProfile = {
  multiplier: number;
  effectiveness:
    DamageEffectiveness;
};

export type StageCombatProfile = {
  id: string;
  weaknessWeaponId: WeaponId;
  resistanceWeaponId: WeaponId;
  startingWeaponId: WeaponId;
};

export const STAGE_ONE_COMBAT_PROFILE:
  StageCombatProfile = {
  id: 'stage-1',
  weaknessWeaponId: 'daggers',
  resistanceWeaponId: 'spear',
  startingWeaponId: 'axe',
};

export const STAGE_TWO_COMBAT_PROFILE:
  StageCombatProfile = {
  id: 'stage-2',
  weaknessWeaponId: 'sword',
  resistanceWeaponId: 'axe',
  startingWeaponId: 'daggers',
};

export function getStageDamageProfile(
  profile: StageCombatProfile,
  weaponId: WeaponId,
): DamageProfile {
  if (
    weaponId ===
    profile.weaknessWeaponId
  ) {
    return {
      multiplier: 2,
      effectiveness: 'weakness',
    };
  }

  if (
    weaponId ===
    profile.resistanceWeaponId
  ) {
    return {
      multiplier: 0.5,
      effectiveness: 'resistance',
    };
  }

  return {
    multiplier: 1,
    effectiveness: 'neutral',
  };
}
