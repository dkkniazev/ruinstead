import type { DamageEffectiveness } from './StageCombatProfile';

export type VisualHit = { at:number; amount:number; effectiveness:DamageEffectiveness };

export function recordVisualHit(previous:VisualHit|undefined,at:number,amount:number,effectiveness:DamageEffectiveness):VisualHit {
  return {at,amount:amount+(previous?.at===at?previous.amount:0),effectiveness};
}
