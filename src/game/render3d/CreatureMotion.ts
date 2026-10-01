import * as T from 'three';
import type { CreatureShape } from './CreatureCatalog';

/** The damage system owns these phases. Animation never moves a collision body. */
export type CreatureCombatPose = {
  phase: 'idle' | 'windup' | 'strike';
  progress: number;
  hit: number;
};

export type CreatureRig = {
  body: T.Group;
  head?: T.Group;
  jaw?: T.Group;
  legs: T.Group[];
  knees: T.Group[];
  arms: T.Group[];
  grips: T.Group[];
  wings: T.Group[];
  segments: T.Group[];
  tail?: T.Group;
};

/** Explicit attachment tags survive authoring; no inference from a tooth's centre. */
export function headParts(body:T.Group,build:()=>void):void {
  const before=new Set(body.children);build();
  for(const part of body.children)if(!before.has(part))part.userData.creatureHead=true;
}

const beasts = new Set<CreatureShape>(['boar','jackal','cat','hound','salamander','drake','wyvern','dragon','ram']);
const bugs = new Set<CreatureShape>(['spider','scorpion','beetle']);
const giants = new Set<CreatureShape>(['golem','treant','scrap','sand','ogre','smith']);

/** Move authored rigid parts under a neck pivot before material batching. */
export function articulateHead(body:T.Group,shape:CreatureShape,segments:T.Group[]=[]):T.Group|undefined {
  const beast=beasts.has(shape),giant=['golem','treant','scrap','sand'].includes(shape);
  const biped=['goblin','rogue','cultist','knight','smith','ogre','imp','gargoyle','harpy'].includes(shape);
  const serpent=shape==='serpent'||shape==='worm';
  if(!beast&&!giant&&!biped&&!serpent)return;
  const low=shape==='salamander';
  const head=serpent?segments[0]:new T.Group();head.name='creature-neck';
  if(!serpent)head.position.set(0,beast?(low?25:40):giant?94:77,beast?22:0);
  const bounds=new T.Box3(),center=new T.Vector3();
  for(const child of [...body.children]){
    if(child.userData.creatureHead&&!(child instanceof T.Mesh)){child.position.sub(head.position);head.add(child);continue;}
    if(!(child instanceof T.Mesh))continue;
    child.geometry.computeBoundingBox();child.updateMatrix();
    bounds.copy(child.geometry.boundingBox!).applyMatrix4(child.matrix);bounds.getCenter(center);
    const belongs=child.userData.creatureHead|| (beast?false
      :serpent?false
      :giant?center.y>98&&Math.abs(center.x)<25&&bounds.max.y<135
      :center.y>80&&Math.abs(center.x)<36);
    if(belongs){child.position.sub(head.position);head.add(child);}
  }
  if(!head.children.length)return;
  body.add(head);return head;
}

/** Motion families share timing, but have distinct poses, gait and weight. */
export function createCreatureMotion(shape:CreatureShape,boss:boolean,floating:boolean,rig:CreatureRig,worldScale:number){
  const {body,head,jaw,legs,knees,arms,grips,wings,segments,tail}=rig;
  const beast=beasts.has(shape),bug=bugs.has(shape),heavy=giants.has(shape);
  const serpent=shape==='serpent'||shape==='worm',flier=shape==='harpy'||shape==='bat'||shape==='owl';
  const caster=shape==='cultist'||shape==='wisp'||shape==='flame'||shape==='sand';
  const restScale=body.scale.clone();
  const restLegs=legs.map(l=>l.position.clone()),restSegments=segments.map(s=>s.position.clone());
  const gripPose=new T.Quaternion(),gripEuler=new T.Euler();
  const daggerGrips=shape==='rogue'?grips.map(grip=>{
    const forearm=grip.position.clone().sub(new T.Vector3(...grip.userData.forearmStart)).normalize();
    // Fixed hand-space frame: the blade projects out of the fist, perpendicular
    // to the forearm. Arm motion carries this frame instead of cancelling it.
    const blade=new T.Vector3(0,0,1);blade.addScaledVector(forearm,-blade.dot(forearm)).normalize();
    const across=blade.clone().cross(forearm).normalize();
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,blade,forearm));
  }):[];
  let clock=0,stride=0,motion=0,fallbackAge=2,wasAttacking=false;
  return (seconds:number,speed:number,attack=false,combat?:CreatureCombatPose):void=>{
    const dt=T.MathUtils.clamp(seconds,0,.05);clock+=dt;
    motion+=(Math.min(1,speed/(heavy?95:145))-motion)*(1-Math.exp(-dt*12));
    // Distance drives feet. A stationary creature breathes instead of marching.
    stride+=Math.max(0,speed)*dt/Math.max(.5,worldScale)*(heavy?.045:.063);
    if(attack&&!wasAttacking)fallbackAge=0;wasAttacking=attack;fallbackAge+=dt;
    const pose=combat??(fallbackAge<.32?{phase:'windup',progress:fallbackAge/.32,hit:0}
      :fallbackAge<.8?{phase:'strike',progress:(fallbackAge-.32)/.48,hit:0}
      :{phase:'idle',progress:0,hit:0});
    const p=T.MathUtils.clamp(pose.progress,0,1);
    // Load the pose, hold it, then accelerate into contact at the damage frame.
    // The end of windup and start of strike have the same pose, with no frame snap.
    const contact=pose.phase==='windup'?T.MathUtils.smoothstep(p,.82,1):0;
    const wind=pose.phase==='windup'?T.MathUtils.smoothstep(p,0,.72)*(1-contact):0;
    const strike=pose.phase==='strike'?1-T.MathUtils.smoothstep(p,.08,1):contact;
    const hit=T.MathUtils.clamp(pose.hit,0,1),breath=Math.sin(clock*(heavy?1.8:2.6));
    if(tail){tail.rotation.x=wind*.18-strike*.38;tail.rotation.y=Math.sin(clock*1.6)*.035;}
    body.position.set(0,0,0);body.rotation.set(0,0,0);body.scale.copy(restScale);
    if(head)head.rotation.set(breath*.014,Math.sin(clock*.7)*.025,0);
    if(jaw)jaw.rotation.x=0;
    knees.forEach(k=>k.rotation.set(0,0,0));
    legs.forEach((leg,i)=>{
      leg.position.copy(restLegs[i]);leg.rotation.set(0,0,0);
      const offset=beast?(i===0||i===3?0:Math.PI):bug?(i%2)*Math.PI:i*Math.PI;
      const gait=Math.sin(stride+offset),lift=Math.max(0,gait);
      leg.rotation.x=gait*motion*(beast?.48:bug?.16:heavy?.24:.52);
      leg.position.y+=lift*motion*(bug?4:heavy?2.5:3.5);
      if(bug){leg.rotation.y=Math.cos(stride+offset)*motion*.2;leg.rotation.z=(i<legs.length/2?-1:1)*lift*motion*.08;}
      if(knees[i])knees[i].rotation.x=lift*motion*.58;
    });
    arms.forEach((arm,i)=>{
      arm.rotation.set(Math.sin(stride+i*Math.PI+.5)*motion*(heavy?.17:.32),0,(i?1:-1)*.06);
    });
    wings.forEach((wing,i)=>{
      const spread=flier?Math.sin(clock*7)*.38+wind*.5-strike*.25:.16+Math.sin(clock*3.4)*.05+wind*.2+strike*.04;
      wing.rotation.z=(i%2?1:-1)*spread;
      wing.rotation.x=-wind*.15+strike*.12;
    });
    segments.forEach((segment,i)=>{
      segment.position.copy(restSegments[i]);
      segment.rotation.y=Math.sin(clock*(serpent?3.5:2.4)-i*.65)*(.07+motion*.18);
      segment.rotation.x=0;
      if(serpent)segment.position.x+=Math.sin(stride*.4-i*.58)*motion*4;
    });
    body.position.y=floating?9+Math.sin(clock*2.4)*3.5:Math.abs(Math.sin(stride))*motion*(heavy?1.2:2.1);
    body.rotation.z=Math.sin(stride)*motion*(heavy?.045:bug?.012:.025);

    if(beast){
      body.rotation.x=-wind*.1+strike*.15+Math.sin(stride*2)*motion*.025;
      body.position.y-=wind*3;body.position.z=-wind*4+strike*8;
      if(head){head.rotation.x+=wind*.23-strike*.19;head.rotation.y+=Math.sin(stride)*motion*.025;}
      if(jaw)jaw.rotation.x=wind*.5+strike*.16;
      legs.forEach((leg,i)=>leg.rotation.x+=(i%2?-.14:.18)*wind-strike*.1);
    }else if(bug){
      body.position.y-=wind*3;body.position.z=-wind*3+strike*6;
      body.rotation.x=-wind*.11+strike*.17;
      legs.forEach((leg,i)=>leg.rotation.y+=(i<legs.length/2?-1:1)*(wind*.14-strike*.1));
    }else if(serpent){
      body.position.y+=wind*5;body.position.z=-wind*4+strike*8;
      if(head)head.rotation.x=-wind*.2+strike*.2;
      segments.forEach((s,i)=>{s.position.y+=wind*Math.max(0,4-i)*2;s.rotation.y+=Math.sin(i*.6)*wind*.12;});
    }else if(shape==='slime'){
      const squash=wind*.2-strike*.13;
      body.scale.set(restScale.x*(1+squash+breath*.025),restScale.y*(1-squash*1.4-breath*.04),restScale.z*(1+squash));
      body.position.z=strike*7;body.position.y+=Math.max(0,Math.sin(stride))*motion*4;
    }else if(flier){
      body.rotation.x=-wind*.14+strike*.27;body.position.z=-wind*4+strike*8;
      legs.forEach(leg=>leg.rotation.x+=wind*.2-strike*.6);
      if(head)head.rotation.x=wind*.13-strike*.1;
    }else if(caster){
      body.rotation.x=-wind*.055+strike*.06;body.position.y+=wind*3;
      arms.forEach((arm,i)=>{
        // Carry the staff a little ahead of the shoulder, also while walking.
        if(shape==='cultist'&&i===1)arm.rotation.x=arm.rotation.x*.35-.18;
        arm.rotation.x-=wind*(i?1.8:.6)+strike*(i?.9:.25);arm.rotation.z+=(i?1:-1)*wind*.15;
      });
      if(head)head.rotation.x=-wind*.1+strike*.08;
    }else if(heavy){
      // Shoulders lift, the heavy body loads onto the rear foot, then drives down.
      body.rotation.x=-wind*.1+strike*.15;body.position.y-=wind*2+strike*3;
      body.rotation.y=-wind*.08+strike*.09;
      arms.forEach((arm,i)=>{const both=shape==='golem'||shape==='treant'||shape==='scrap';arm.rotation.x-=wind*(both||i?2.25:.55)+strike*(both||i?.78:.22);arm.rotation.z+=(i?1:-1)*wind*.16;});
      if(head)head.rotation.x=wind*.13-strike*.1;
    }else{
      const dual=shape==='rogue';
      body.rotation.y=dual?0:-wind*.28+strike*.32;body.rotation.x=-wind*.04+strike*.07;
      arms.forEach((arm,i)=>{
        const active=i===1||dual;
        // Lift the hands for a cut; the knives follow their fixed wrist frames.
        if(active){arm.rotation.x-=wind*1.95+strike*.88;arm.rotation.y=dual?0:(i?1:-1)*(wind*.2-strike*.45);}
        else arm.rotation.x-=wind*.3+strike*.2;
      });
      if(head)head.rotation.y=-body.rotation.y*.55;
    }
    body.rotation.x-=hit*(boss?.035:.1);
    if(head)head.rotation.x-=hit*.08;
    grips.forEach((grip,i)=>{
      if(shape==='rogue'){
        grip.quaternion.copy(daggerGrips[i]);
        return;
      }
      if(shape==='cultist'){
        // Author the shaft direction in the torso frame, then solve the wrist.
        // Subtracting Euler angles does not cancel combined shoulder rotations:
        // it left the staff leaning sideways.
        const pitch=.4-.15*wind+.55*strike;
        gripPose.setFromEuler(gripEuler.set(pitch,0,0));
        grip.quaternion.copy(arms[i].quaternion).invert().multiply(gripPose);
        return;
      }
      // The hand carries the handle; the blade/club presents toward its target.
      const pitch=2.55-3.15*wind-.65*strike;
      grip.rotation.set(pitch-arms[i].rotation.x,0,0);
    });
  };
}
