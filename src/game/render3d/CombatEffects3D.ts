import * as T from 'three';
import type { VisualHit } from '../combat/CombatVisualState';

type HitLabel={sprite:T.Sprite;texture:T.CanvasTexture;canvas:HTMLCanvasElement;born:number;x:number;y:number;z:number};
type Impact={born:number;x:number;y:number;z:number;color:T.Color;size:number};

/** Bounded reusable effects. Geometry and canvas textures do not grow with kills. */
export class CombatEffects3D {
  readonly root=new T.Group();
  private readonly labels:HitLabel[]=[];
  private readonly slashMaterial=new T.MeshBasicMaterial({color:0xffe6a2,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,toneMapped:false});
  private readonly slash=new T.Mesh(new T.RingGeometry(57,73,26,1,.15,Math.PI*1.25),this.slashMaterial);
  private lastSwing=-Infinity;
  private nextLabel=0;
  private readonly impacts:Impact[]=[];
  private readonly sparkGeometry=new T.OctahedronGeometry(1,0);
  private readonly sparkMaterial=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  private readonly sparks=new T.InstancedMesh(this.sparkGeometry,this.sparkMaterial,32*7);
  private readonly transform=new T.Object3D();

  constructor(){
    this.slash.rotation.x=-Math.PI/2;this.root.add(this.slash,this.sparks);
    this.sparks.instanceMatrix.setUsage(T.DynamicDrawUsage);this.sparks.frustumCulled=false;this.sparks.count=0;
  }

  hit(x:number,y:number,z:number,hit:VisualHit,height=90):void {
    let label=this.labels[this.nextLabel];
    if(!label){
      const canvas=document.createElement('canvas');canvas.width=192;canvas.height=80;
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
      sprite.renderOrder=115;this.root.add(sprite);
      label={sprite,texture,canvas,born:0,x:0,y:0,z:0};this.labels.push(label);
    }
    const ctx=label.canvas.getContext('2d')!;ctx.clearRect(0,0,192,80);
    ctx.font='900 50px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    const text=Math.round(hit.amount).toLocaleString('ru-RU');
    if(ctx.measureText(text).width>174)ctx.font=`900 ${Math.floor(50*174/ctx.measureText(text).width)}px "Segoe UI",sans-serif`;
    ctx.strokeStyle='#26343e';ctx.lineWidth=8;ctx.strokeText(text,96,39);
    ctx.fillStyle=hit.effectiveness==='weakness'?'#ffdf75':hit.effectiveness==='resistance'?'#b7ccd2':'#fff5d3';ctx.fillText(text,96,39);label.texture.needsUpdate=true;
    Object.assign(label,{born:hit.at,x,y,z});label.sprite.visible=true;
    this.impacts[this.nextLabel]={born:hit.at,x,y:y-30-height*.45,z,
      color:new T.Color(hit.effectiveness==='weakness'?0xffcd62:hit.effectiveness==='resistance'?0x90bbcb:0xffe6b0),size:Math.min(1.65,Math.max(.7,height/105))};
    this.nextLabel=(this.nextLabel+1)%32;
  }

  update(now:number,x:number,y:number,z:number,facing:number,attackAt:number):void {
    if(attackAt>this.lastSwing){
      this.lastSwing=attackAt;
      this.slash.position.set(x,y+44,z);this.slash.rotation.set(-Math.PI/2,0,-facing-Math.PI*.9);
    }
    const t=(now-this.lastSwing)/230;
    this.slash.visible=t>=0&&t<1;this.slashMaterial.opacity=Math.max(0,.48*(1-t));
    this.slash.scale.setScalar(.75+T.MathUtils.clamp(t,0,1)*.4);
    for(const label of this.labels){
      const age=(now-label.born)/800;if(age<0||age>=1){label.sprite.visible=false;continue;}
      const scale=1+Math.sin(Math.min(1,age*4)*Math.PI)*.22;
      label.sprite.scale.set(96*scale,40*scale,1);
      label.sprite.position.set(label.x+Math.sin(label.born)*age*18,label.y+age*60,label.z);
      (label.sprite.material as T.SpriteMaterial).opacity=Math.min(1,(1-age)*3);
    }
    // A brief physical contact burst sits on the struck body, below the damage number.
    // Every impact shares a single draw call and a fixed pool of 224 sparks.
    let count=0;
    for(const impact of this.impacts){
      if(!impact)continue;
      const age=(now-impact.born)/1000;if(age<0||age>.32)continue;
      for(let i=0;i<7;i++){
        const angle=i*Math.PI*2/7+impact.born*.001;
        const travel=age*(80+i*12)*impact.size;
        this.transform.position.set(impact.x+Math.cos(angle)*travel,impact.y+Math.sin(i*2.4)*travel*.6+age*35,impact.z+Math.sin(angle)*travel);
        this.transform.rotation.set(angle,angle*.6,age*12);
        const scale=(1-age/.32)*impact.size;
        this.transform.scale.set(3*scale,(i===0?15:7)*scale,3*scale);this.transform.updateMatrix();
        this.sparks.setMatrixAt(count,this.transform.matrix);this.sparks.setColorAt(count,impact.color);count++;
      }
    }
    this.sparks.count=count;this.sparks.visible=count>0;
    if(count){this.sparks.instanceMatrix.needsUpdate=true;if(this.sparks.instanceColor)this.sparks.instanceColor.needsUpdate=true;}
  }

  dispose():void {
    this.labels.forEach(label=>{label.texture.dispose();label.sprite.material.dispose();});
    this.slash.geometry.dispose();this.slashMaterial.dispose();this.root.removeFromParent();
    this.sparks.dispose();this.sparkGeometry.dispose();this.sparkMaterial.dispose();
  }
}
