export type Point={x:number;y:number};
export type OrbitalPhase='orbit'|'attack'|'impact'|'return';
export type OrbitalTarget={readonly alive:boolean;readonly combatPosition:Point;readonly combatRadius:number};

/** World-space flight is authoritative for presentation and the instant damage lands. */
export class OrbitalAttack<Target extends OrbitalTarget> {
  phase:OrbitalPhase='orbit';
  x=0;y=0;progress=0;attackAt=-Infinity;
  direction:Point={x:0,y:1};
  private target?:Target;
  private beganAt=0;
  private readyAt=0;
  private from:Point={x:0,y:0};
  private duration=1;

  reset(home:Point):void {this.phase='orbit';this.target=undefined;this.x=home.x;this.y=home.y;this.progress=0;}

  update(time:number,home:Point,player:Point,playerRadius:number,range:number,cooldownMs:number,
    acquire:()=>Target|undefined,impact:(target:Target)=>void):void {
    if(this.phase==='orbit'){
      this.x=home.x;this.y=home.y;this.progress=0;
      if(time<this.readyAt)return;
      const target=acquire();if(!target||!this.valid(target,player,playerRadius,range))return;
      this.target=target;this.begin('attack',time,Math.min(125,cooldownMs*.32));
      this.readyAt=time+cooldownMs;
    }
    if(this.phase==='attack'){
      const target=this.target;
      if(!target||!this.valid(target,player,playerRadius,range+65)){
        this.target=undefined;this.begin('return',time,Math.min(150,cooldownMs*.38));
      }else{
        this.progress=Math.min(1,(time-this.beganAt)/this.duration);
        const point=target.combatPosition,dx=point.x-this.from.x,dy=point.y-this.from.y,length=Math.hypot(dx,dy)||1;
        this.direction.x=dx/length;this.direction.y=dy/length;
        const t=this.progress*this.progress*(3-2*this.progress);
        this.x=this.from.x+dx*t;this.y=this.from.y+dy*t;
        if(this.progress>=1){
          this.attackAt=time;this.begin('impact',time,32);this.target=undefined;
          impact(target);
        }
      }
    }
    if(this.phase==='impact'&&time-this.beganAt>=this.duration)this.begin('return',time,Math.min(150,cooldownMs*.38));
    if(this.phase==='return'){
      this.progress=Math.min(1,(time-this.beganAt)/this.duration);
      const t=1-(1-this.progress)**2;
      this.x=this.from.x+(home.x-this.from.x)*t;this.y=this.from.y+(home.y-this.from.y)*t;
      if(this.progress>=1)this.reset(home);
    }
  }

  private valid(target:Target,player:Point,playerRadius:number,range:number):boolean {
    if(!target.alive)return false;
    const point=target.combatPosition;
    return Math.hypot(point.x-player.x,point.y-player.y)-playerRadius-target.combatRadius<=range;
  }
  private begin(phase:OrbitalPhase,time:number,duration:number):void {
    this.phase=phase;this.beganAt=time;this.duration=duration;this.from.x=this.x;this.from.y=this.y;this.progress=0;
  }
}
