import type { DamageEffectiveness } from './StageCombatProfile';
import type { WeaponId } from './WeaponDefinitions';

export type OrbitalWeaponState = {
  slot:number;weaponId:WeaponId;color:number;x:number;y:number;facing:number;visible:boolean;
  attackAt:number;attackDirection:{x:number;y:number};
};

export type VisualHit = { at:number; amount:number; effectiveness:DamageEffectiveness };

export function recordVisualHit(previous:VisualHit|undefined,at:number,amount:number,effectiveness:DamageEffectiveness):VisualHit {
  return {at,amount:amount+(previous?.at===at?previous.amount:0),effectiveness};
}
