import * as T from 'three';

type Contact={at:number;x:number;y:number;z:number;size:number;color:T.Color;foot?:boolean};
const LIMIT=32;
const FOOT_LIMIT=16;

function burstMesh(count:number,dust:boolean):T.InstancedMesh {
  const geometry=new T.PlaneGeometry(2,2);
  geometry.setAttribute('burstAlpha',new T.InstancedBufferAttribute(new Float32Array(count),1));
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
    uniforms:{dust:{value:dust?1:0}},
    vertexShader:`attribute float burstAlpha;
      varying vec2 vUv;varying float vAlpha;varying vec3 vColor;
      void main(){vUv=uv;vAlpha=burstAlpha;vColor=instanceColor;
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float dust;varying vec2 vUv;varying float vAlpha;varying vec3 vColor;
      void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
        float puff=(1.-smoothstep(.12,1.,r))*.26;
        float core=1.-smoothstep(.05,.32,r);
        float rays=pow(abs(cos(atan(p.y,p.x)*3.)),12.)*(1.-smoothstep(.1,1.,r));
        float mask=mix(max(core,rays*.7),puff,dust);
        float alpha=mask*vAlpha;if(alpha<.015)discard;
        gl_FragColor=vec4(mix(vColor,vec3(1.,.98,.89),core*(1.-dust)),alpha);}`,
  });
  const mesh=new T.InstancedMesh(geometry,material,count);
  mesh.setColorAt(0,new T.Color(0xffffff));
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.instanceColor!.setUsage(T.DynamicDrawUsage);
  mesh.frustumCulled=false;mesh.count=0;
  return mesh;
}

/** Body-sized contact accents; two draws and a fixed pool, with no lights/textures. */
export class ContactBursts3D {
  readonly root=new T.Group();
  private readonly flashes=burstMesh(LIMIT,false);
  private readonly dust=burstMesh(LIMIT*3+FOOT_LIMIT,true);
  private readonly contacts:Contact[]=[];
  private readonly transform=new T.Object3D();
  private next=0;
  private nextFoot=0;

  constructor(){this.root.add(this.flashes,this.dust);}

  hit(at:number,x:number,y:number,z:number,size:number,color:T.Color):void {
    this.contacts[this.next]={at,x,y,z,size:T.MathUtils.clamp(size,.7,1.65),color:color.clone()};
    this.next=(this.next+1)%LIMIT;
  }

  footfall(at:number,x:number,y:number,z:number,color:T.Color):void {
    this.contacts[LIMIT+this.nextFoot]={at,x,y,z,size:.65,color:color.clone(),foot:true};
    this.nextFoot=(this.nextFoot+1)%FOOT_LIMIT;
  }

  update(now:number,camera:T.Camera):void {
    let flashCount=0,dustCount=0;
    const flashAlpha=this.flashes.geometry.getAttribute('burstAlpha') as T.InstancedBufferAttribute;
    const dustAlpha=this.dust.geometry.getAttribute('burstAlpha') as T.InstancedBufferAttribute;
    this.transform.quaternion.copy(camera.quaternion);
    for(const contact of this.contacts){
      if(!contact)continue;
      const age=(now-contact.at)/1000;if(age<0||age>=.38)continue;
      if(!contact.foot&&age<.14){
        const scale=(17+age*80)*contact.size;
        this.transform.position.set(contact.x,contact.y,contact.z);
        this.transform.scale.set(scale,scale,1);this.transform.updateMatrix();
        this.flashes.setMatrixAt(flashCount,this.transform.matrix);
        this.flashes.setColorAt(flashCount,contact.color);
        flashAlpha.setX(flashCount,Math.pow(1-age/.14,1.5));flashCount++;
      }
      for(let i=0;i<(contact.foot?1:3);i++){
        const angle=i*2.399+contact.at*.001,travel=(7+age*47)*contact.size;
        this.transform.position.set(contact.x+(contact.foot?0:Math.cos(angle)*travel),contact.y+age*(contact.foot?19:35),contact.z+(contact.foot?0:Math.sin(angle)*travel));
        const scale=(7+age*31)*contact.size;this.transform.scale.set(scale,scale,1);this.transform.updateMatrix();
        this.dust.setMatrixAt(dustCount,this.transform.matrix);
        this.dust.setColorAt(dustCount,contact.color);
        dustAlpha.setX(dustCount,(contact.foot?.58:1)*Math.sin(Math.min(1,age/.045)*Math.PI/2)*Math.pow(1-age/.38,1.3));dustCount++;
      }
    }
    for(const [mesh,count]of [[this.flashes,flashCount],[this.dust,dustCount]] as const){
      mesh.count=count;mesh.visible=count>0;
      if(count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor!.needsUpdate=true;
        (mesh.geometry.getAttribute('burstAlpha') as T.InstancedBufferAttribute).needsUpdate=true;}
    }
  }

  dispose():void {
    for(const mesh of [this.flashes,this.dust]){mesh.dispose();mesh.geometry.dispose();(mesh.material as T.Material).dispose();}
    this.root.removeFromParent();
  }
}
