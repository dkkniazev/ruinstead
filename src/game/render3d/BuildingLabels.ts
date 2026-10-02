import { localizeText } from '../../i18n/Localize';
import * as THREE from 'three';
import { iconPath } from '../ui/GameIcons';
export function buildingLabel(text: string, height: number, kind='home', level?:number): THREE.Sprite {
  const canvas=document.createElement('canvas');canvas.width=656;canvas.height=128;
  const ctx=canvas.getContext('2d')!;
  const background=ctx.createLinearGradient(0,0,0,116);background.addColorStop(0,'#304b4a');background.addColorStop(1,'#152e31');
  ctx.fillStyle=background;ctx.beginPath();ctx.roundRect(3,3,650,111,20);ctx.fill();
  ctx.strokeStyle='#bda575';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#bda575';ctx.beginPath();ctx.moveTo(316,115);ctx.lineTo(328,127);ctx.lineTo(340,115);ctx.fill();
  ctx.save();ctx.translate(24,25);ctx.scale(2.7,2.7);ctx.strokeStyle='#dec28b';ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.stroke(new Path2D(iconPath(({storage:'bag',sawmill:'wood',workshop:'forge',house:'home'} as Record<string,string>)[kind]??kind)));ctx.restore();
  ctx.fillStyle='#f3e7cd';ctx.font='700 48px "Segoe UI", sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(localizeText(text),111,57,level===undefined?510:423);
  if(level!==undefined){ctx.fillStyle='#bba372';ctx.beginPath();ctx.roundRect(559,23,69,69,14);ctx.fill();ctx.fillStyle='#183334';ctx.font='700 41px "Segoe UI", sans-serif';ctx.textAlign='center';ctx.fillText(localizeText(String(level)),594,58);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  // Fixed-size billboard text does not need mipmaps that soften small lettering.
  texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));
  label.scale.set(246,48,1);label.position.y=height;label.renderOrder=105;label.userData.buildingLabel=true;return label;
}
export function disposeBuildingLabels(root: THREE.Object3D):void{
  root.traverse(object=>{if(object instanceof THREE.Sprite&&object.userData.buildingLabel){object.material.map?.dispose();object.material.dispose();}});
}
