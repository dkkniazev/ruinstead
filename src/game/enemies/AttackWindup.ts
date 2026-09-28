/** An attack commits after a readable wind-up. Leaving reach before impact dodges it. */
export class AttackWindup {
  startedAt=-Infinity;
  impactAt=Infinity;
  readyAt=0;
  x=0;y=0;
  get active():boolean{return this.impactAt!==Infinity;}
  cancel():void{this.impactAt=Infinity;this.startedAt=-Infinity;}
  update(time:number,inRange:boolean,x:number,y:number,duration:number,cooldown:number):boolean {
    if(this.active){
      if(!inRange){
        this.cancel();
        this.readyAt=Math.max(this.readyAt,time+120);
        return false;
      }
      if(time<this.impactAt)return false;
      this.cancel();
      this.readyAt=time+cooldown;
      return true;
    }
    if(inRange&&time>=this.readyAt){
      this.startedAt=time;
      this.impactAt=time+duration;
      this.x=x;
      this.y=y;
    }
    return false;
  }
}
