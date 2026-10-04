import type { AnimatedModel } from '../render3d/Models';
import type { WeaponId } from '../combat/WeaponDefinitions';
import { weaponAttackAnimationSeconds } from '../render3d/WeaponAnimation';

/** DEV preview sampling: advance the production model clock, never another rig. */
export function sampleHeroAttack(model:AnimatedModel,weapon:WeaponId,progress:number):void {
  model.step(0,0,false,false,0,0);
  model.step(0,0,false,true,0,0);
  let remaining=weaponAttackAnimationSeconds(weapon)*Math.max(0,Math.min(1,progress));
  // HeroModel caps a step at 50 ms. One large time jump cannot sample a late pose.
  while(remaining>1e-8){
    const dt=Math.min(1/60,remaining);model.step(dt,0,false,false,0,0);remaining-=dt;
  }
}
