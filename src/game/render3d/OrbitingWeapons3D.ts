import * as T from 'three';
import type { OrbitalWeaponState } from '../combat/CombatVisualState';
import { createWeaponModel, type WeaponModel } from './WeaponModel';

type Orbital={root:T.Group;weapon:WeaponModel;weaponId:string;halo:T.Mesh;trail:T.Mesh};

/** Mirrors the combat orbit and its individual hit events; it never schedules damage. */
export class OrbitingWeapons3D {
  readonly root=new T.Group();
  private readonly models=new Map<number,Orbital>();
  private readonly haloGeometry=new T.RingGeometry(10,14,24);
  private readonly trailGeometry=new T.RingGeometry(26,31,24,1,.1,Math.PI*1.25);

  update(states:readonly OrbitalWeaponState[],time:number,heroHeight:number):void {
    const occupied=new Set(states.map(state=>state.slot));
    for(const [slot,model] of this.models)if(!occupied.has(slot)){this.remove(model);this.models.delete(slot);}
    for(const state of states){
      let model=this.models.get(state.slot);
      if(model?.weaponId!==state.weaponId){
        if(model)this.remove(model);
        const root=new T.Group(),weapon=createWeaponModel(state.weaponId);
        root.name=`orbital-slot-${state.slot}`;
        const halo=new T.Mesh(this.haloGeometry,new T.MeshBasicMaterial({color:state.color,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
        const trail=new T.Mesh(this.trailGeometry,new T.MeshBasicMaterial({color:0xffedaf,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
        halo.rotation.x=trail.rotation.x=-Math.PI/2;halo.position.y=-7;trail.position.z=20;
        weapon.root.scale.setScalar(.78);root.add(weapon.root,halo,trail);this.root.add(root);
        model={root,weapon,weaponId:state.weaponId,halo,trail};this.models.set(state.slot,model);
      }
      const age=(time-state.attackAt)/280,attacking=age>=0&&age<1;
      const strike=attacking?Math.sin(age*Math.PI):0;
      const direction=state.attackDirection;
      model.root.visible=state.visible;
      model.root.position.set(state.x+direction.x*strike*22,heroHeight+50+Math.sin(time*.003+state.slot)*5+strike*8,state.y+direction.y*strike*22);
      model.root.rotation.y=attacking?Math.atan2(direction.x,direction.y):state.facing;
      model.weapon.root.rotation.set(.76+strike*(state.weaponId==='spear'?.75:1.4),0,attacking?-.35+age*.7:Math.sin(time*.002+state.slot)*.1);
      const haloMaterial=model.halo.material as T.MeshBasicMaterial;
      haloMaterial.color.setHex(state.color);haloMaterial.opacity=.28+strike*.4;
      model.halo.scale.setScalar(1+strike*.25);
      model.trail.visible=attacking;
      (model.trail.material as T.MeshBasicMaterial).opacity=attacking?Math.sin(age*Math.PI)*.65:0;
      model.trail.rotation.z=attacking?-age*1.5:0;
    }
  }

  private remove(model:Orbital):void {
    model.weapon.dispose();(model.halo.material as T.Material).dispose();(model.trail.material as T.Material).dispose();model.root.removeFromParent();
  }
  dispose():void {
    this.models.forEach(model=>this.remove(model));this.models.clear();
    this.haloGeometry.dispose();this.trailGeometry.dispose();this.root.removeFromParent();
  }
}
