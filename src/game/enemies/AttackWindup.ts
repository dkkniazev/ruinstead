/** An attack commits to a point. Leaving its reach during preparation dodges it. */
export class AttackWindup {
  startedAt=-Infinity;
  impactAt=Infinity;
  readyAt=0;
  x=0;y=0;
  get active():boolean{return this.impactAt!==Infinity;}
  cancel():void{this.impactAt=Infinity;this.startedAt=-Infinity;}
  update(time:number,inRange:boolean,x:number,y:number,duration:number,cooldown:number):boolean {
    if(this.active){
      if(time<this.impactAt)return false;
      this.cancel();this.readyAt=time+cooldown;return true;
    }
    if(inRange&&time>=this.readyAt){this.startedAt=time;this.impactAt=time+duration;this.x=x;this.y=y;}
    return false;
  }
}
