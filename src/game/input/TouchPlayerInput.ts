import type Phaser from 'phaser';
import type { MovementIntent, PlayerInputSource } from './PlayerInput';
import { icon } from '../ui/GameIcons';

/** Screen-space controls stay visible while the Phaser world camera is hidden by Three.js. */
export class TouchPlayerInput implements PlayerInputSource {
  readonly mode='touch' as const;
  private readonly root=document.createElement('div');
  private readonly stick=document.createElement('div');
  private readonly knob=document.createElement('div');
  private readonly dash=document.createElement('button');
  private movement:MovementIntent={x:0,y:0};
  private pointer:number|undefined;
  private visible=false;
  private dashQueued=false;
  constructor(_scene:Phaser.Scene){
    this.root.className='r-touch-controls';this.stick.className='r-stick';this.knob.className='r-knob';this.dash.className='r-dash';this.dash.type='button';this.dash.setAttribute('aria-label','Рывок');this.dash.innerHTML=icon('speed');
    this.stick.setAttribute('aria-label','Джойстик движения');this.stick.append(this.knob);this.root.append(this.stick,this.dash);document.querySelector('#app')!.append(this.root);
    this.stick.addEventListener('pointerdown',this.down);this.stick.addEventListener('pointermove',this.move);this.stick.addEventListener('pointerup',this.up);this.stick.addEventListener('pointercancel',this.up);this.stick.addEventListener('lostpointercapture',this.up);
    this.dash.addEventListener('pointerdown',this.pressDash);window.addEventListener('blur',this.reset);this.setVisible(false);
  }
  getMovement():MovementIntent{return this.visible?this.movement:{x:0,y:0};}
  consumeDash():boolean{const queued=this.visible&&this.dashQueued;this.dashQueued=false;return queued;}
  setVisible(value:boolean):void{this.visible=value;this.root.hidden=!value;if(!value)this.reset();}
  private down=(e:PointerEvent):void=>{if(!this.visible||this.pointer!==undefined)return;e.preventDefault();this.pointer=e.pointerId;this.stick.setPointerCapture(e.pointerId);this.move(e);};
  private move=(e:PointerEvent):void=>{if(e.pointerId!==this.pointer)return;const r=this.stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),strength=Math.min(1,d/58);this.movement=d>1?{x:dx/d*strength,y:dy/d*strength}:{x:0,y:0};this.knob.style.transform='translate('+this.movement.x*44+'px,'+this.movement.y*44+'px)';};
  private up=(e:PointerEvent):void=>{if(e.pointerId===this.pointer)this.reset();};
  private pressDash=(e:PointerEvent):void=>{e.preventDefault();if(this.visible)this.dashQueued=true;};
  private reset=():void=>{this.pointer=undefined;this.movement={x:0,y:0};this.dashQueued=false;this.knob.style.transform='';};
  destroy():void{window.removeEventListener('blur',this.reset);this.root.remove();}
}
