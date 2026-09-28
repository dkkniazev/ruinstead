import { RELEASE_REGIONS, RELEASE_PASSAGES, RELEASE_WORLD_WIDTH, RELEASE_WORLD_HEIGHT, getRegionAt, getPassageGeometry, type RegionPassage } from '../world/ReleaseRegionMap';
import { icon } from './GameIcons';
import { REGION_RESOURCE_PROFILES } from '../economy/RegionEconomy';

export type MapMarker = { x: number; y: number; kind: 'enemy' | 'boss' | 'main-boss' | 'wood' | 'stone' | 'metal' | 'crystal' | 'fiber'; label?: string; region?: number };
export type MapLandmark = { x:number; y:number; name:string; kind?: 'landmark' | 'quest' };
export type MapSnapshot = { x: number; y: number; facing: number; home: {x: number; y: number}; landmarks?: MapLandmark[]; markers: MapMarker[] };
const COLORS: Record<string, string> = { enemy: '#eb8761', boss: '#ff554c', 'main-boss': '#ffd66f', wood: '#a7d37b', stone: '#e6d8b8', metal: '#c2ccd5', crystal: '#72eeff', fiber: '#d6ed63' };
const REGION_COLORS = ['#66824c', '#9b8155', '#66637e', '#85503e', '#8e9c74', '#81604e', '#b07e50', '#763d3a'];

export class WorldMap {
  private readonly mini = document.createElement('button');
  private readonly miniCanvas = document.createElement('canvas');
  private readonly caption = document.createElement('span');
  private readonly modal = document.createElement('div');
  private readonly fullCanvas = document.createElement('canvas');
  private readonly location = document.createElement('p');
  private readonly closeButton = document.createElement('button');
  private snapshot?: MapSnapshot;
  private expanded = false;
  private obscured = false;
  private lastUpdate = -Infinity;
  private filter: 'landmarks' | 'rare' | 'all' = 'rare';

  constructor(private readonly isOpen: (passage: RegionPassage) => boolean, private readonly onToggle: (open: boolean) => void) {
    this.mini.className = 'world-minimap'; this.mini.type = 'button'; this.mini.dataset.tutorial = 'map';
    this.mini.setAttribute('aria-label', 'Открыть карту мира');
    this.mini.title = 'Карта мира · Tab';
    this.miniCanvas.width = 416; this.miniCanvas.height = 304;
    const heading=document.createElement('div');heading.className='world-minimap-heading';heading.innerHTML=icon('map')+'<b>Окрестности</b><small>Tab</small>';
    this.mini.append(heading);
    this.caption.textContent = 'Карта · Tab';
    this.mini.append(this.miniCanvas, this.caption); this.mini.onclick = () => this.toggle(true);
    this.modal.className = 'world-map-modal'; this.modal.hidden = true;
    this.modal.setAttribute('role', 'dialog'); this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-label', 'Карта мира');
    const panel = document.createElement('section'); panel.className = 'world-map-panel';
    const header = document.createElement('header');
    const title = document.createElement('strong'); title.textContent = 'RUINSTEAD · КАРТА МИРА';
    this.closeButton.textContent = 'Вернуться в игру · Esc'; this.closeButton.onclick = () => this.toggle(false);
    header.append(title, this.closeButton);
    const body = document.createElement('div'); body.className = 'world-map-body';
    this.fullCanvas.width = 760; this.fullCanvas.height = 830;
    const info = document.createElement('aside'); info.append(this.location);
    const filters=document.createElement('div');filters.className='world-map-filters';
    for(const [id,label] of [['landmarks','Ориентиры'],['rare','Редкие'],['all','Все']] as const){
      const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-pressed',String(this.filter===id));
      button.onclick=()=>{this.filter=id;for(const other of filters.children)other.setAttribute('aria-pressed',String(other===button));if(this.snapshot)this.draw(this.fullCanvas,this.snapshot,true);};filters.append(button);
    }info.append(filters);
    const legend=document.createElement('div');legend.className='world-map-legend';
    legend.innerHTML=[['arrow','Вы здесь'],['quest','Цель задания'],['home','Поселение'],['elite','Главный босс региона'],['boss','Босс'],['crystal','Кристаллы'],['fiber','Волокно'],['lock','Закрытый переход']].map(([glyph,label])=>icon(glyph)+'<span>'+label+'</span>').join('');info.append(legend);
    const regions=document.createElement('ol');regions.className='world-map-regions';
    regions.innerHTML=RELEASE_REGIONS.map(r=>'<li>'+r.id+'. '+r.name+'</li>').join('');info.append(regions);
    const hint = document.createElement('small'); hint.textContent = 'Игра приостановлена. Ресурсы отмечены только там, где ещё доступны для добычи.'; info.append(hint);
    body.append(this.fullCanvas, info); panel.append(header, body); this.modal.append(panel);
    document.querySelector('#app')!.append(this.mini, this.modal);
    window.addEventListener('keydown', this.keydown, true);
  }

  private keydown = (event: KeyboardEvent): void => {
    if ((this.obscured || document.querySelector('.ruin-ui[data-modal="true"]')) && !this.expanded) return;
    if (event.code === 'Tab' && !event.repeat) {
      event.preventDefault(); event.stopImmediatePropagation(); this.toggle(!this.expanded);
    } else if (this.expanded && event.code === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); this.toggle(false);
    } else if (this.expanded) event.stopImmediatePropagation();
  };

  setObscured(obscured: boolean): void { this.obscured = obscured; this.mini.hidden = obscured; }

  private toggle(open: boolean): void {
    if (this.expanded === open) return;
    this.expanded = open; this.modal.hidden = !open; this.onToggle(open);
    const hud=document.querySelector<HTMLElement>('.ruin-ui');if(hud)hud.inert=open;
    if (open && this.snapshot) { this.draw(this.fullCanvas, this.snapshot, true); this.closeButton.focus(); }
    else this.mini.focus();
  }

  update(time: number, getSnapshot: () => MapSnapshot): void {
    if (time - this.lastUpdate < 200) return;
    this.lastUpdate = time; this.snapshot = getSnapshot();
    const region = getRegionAt(this.snapshot);
    this.caption.textContent = region ? region.id+' · '+region.name : 'Переход';
    const profile = REGION_RESOURCE_PROFILES.find(p => p.region === region?.id);
    const rare = profile ? `\nИзобилие ресурсов\nКристаллы: ${profile.abundance.crystal}/5\nВолокно: ${profile.abundance.fiber}/5` : '';
    this.location.textContent = `Вы здесь: ${region ? `${region.id}. ${region.name}` : 'между регионами'}${rare}`;
    this.draw(this.miniCanvas, this.snapshot, false);
  }

  private draw(canvas: HTMLCanvasElement, state: MapSnapshot, full: boolean): void {
    const ctx = canvas.getContext('2d')!; const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);const water=ctx.createLinearGradient(0,0,w,h);water.addColorStop(0,'#263d43');water.addColorStop(1,'#10252b');ctx.fillStyle=water;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#95b6b30c';ctx.lineWidth=1;for(let i=0;full&&i<w;i+=32){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.stroke();}for(let i=0;full&&i<h;i+=32){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(w,i);ctx.stroke();}
    const spanX = full ? RELEASE_WORLD_WIDTH : 2900, spanY = full ? RELEASE_WORLD_HEIGHT : 2100;
    const scale = Math.min((w - 26) / spanX, (h - 26) / spanY);
    const cx = full ? RELEASE_WORLD_WIDTH / 2 : state.x, cy = full ? RELEASE_WORLD_HEIGHT / 2 : state.y;
    const px = (x: number) => w / 2 + (x - cx) * scale, py = (y: number) => h / 2 + (y - cy) * scale;
    for (const region of RELEASE_REGIONS) {
      ctx.beginPath(); region.outline.forEach(([x, y], i) => i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))); ctx.closePath();
      ctx.shadowColor='#06181dd9';ctx.shadowBlur=full?9:4;ctx.shadowOffsetY=full?6:3;
      ctx.fillStyle = REGION_COLORS[region.id - 1]; ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      ctx.strokeStyle = getRegionAt(state)?.id === region.id ? '#f7df92' : '#b3ac84'; ctx.lineWidth = full ? 2 : 1.5; ctx.stroke();
    }
    // Same center-to-passage routes used by the terrain, drawn beneath markers.
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const region of RELEASE_REGIONS){
      for(const passage of RELEASE_PASSAGES.filter(p=>p.a===region.id||p.b===region.id)){
        const geometry=getPassageGeometry(passage),end=passage.a===region.id?geometry.a:geometry.b;
        ctx.beginPath();ctx.moveTo(px(region.center[0]),py(region.center[1]));ctx.lineTo(px(end.x),py(end.y));
        ctx.strokeStyle='#243b36';ctx.lineWidth=full?4:7;ctx.stroke();ctx.strokeStyle='#d1b98a99';ctx.lineWidth=full?2:3;ctx.stroke();
      }
    }
    for(const landmark of state.landmarks??[]){
      const distance=Math.hypot(landmark.x-state.x,landmark.y-state.y);
      if(!full&&landmark.kind!=='quest'&&distance>1250)continue;
      const lx=px(landmark.x),ly=py(landmark.y);
      if(lx<-30||lx>w+30||ly<-30||ly>h+30)continue;
      const quest=landmark.kind==='quest';
      if(quest){
        ctx.save();ctx.shadowColor='#ffdc6e';ctx.shadowBlur=full?18:12;
        ctx.beginPath();ctx.arc(lx,ly,full?13:11,0,Math.PI*2);ctx.fillStyle='#513711';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#ffe49b';ctx.stroke();ctx.shadowBlur=0;
        ctx.fillStyle='#ffe49b';ctx.font=`900 ${full?18:16}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',lx,ly-1);ctx.restore();
      }else{
        ctx.beginPath();ctx.arc(lx,ly,full?6:5,0,Math.PI*2);ctx.fillStyle='#f1d7a0';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#284039';ctx.stroke();
      }
      if(full||quest){
        const labelX=lx+(full?18:14),labelY=ly-(full?10:8);
        ctx.font=`700 ${full?11:10}px system-ui`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#142126';ctx.fillStyle=quest?'#ffe49b':'#f0dfb5';
        ctx.strokeText(landmark.name,labelX,labelY);ctx.fillText(landmark.name,labelX,labelY);
      }
    }
    for (const passage of RELEASE_PASSAGES) {
      const {a, b} = getPassageGeometry(passage); const open = this.isOpen(passage);
      ctx.beginPath(); ctx.moveTo(px(a.x), py(a.y)); ctx.lineTo(px(b.x), py(b.y));
      ctx.strokeStyle = open ? '#ffe0a0' : '#eb7463'; ctx.lineWidth = full ? 4 : 3; ctx.stroke();
      if (!open) { const x = px((a.x+b.x)/2), y = py((a.y+b.y)/2); ctx.fillStyle='#442822';ctx.fillRect(x-5,y-5,10,10); ctx.strokeStyle='#ff8c76';ctx.strokeRect(x-5,y-5,10,10); }
    }
    const occupied=new Set<string>();
    const priority=(kind:string)=>kind==='main-boss'?-10:kind==='boss'?-5:kind==='crystal'?-3:kind==='fiber'?-2:0;
    const markers=[...state.markers].sort((a,b)=>priority(a.kind)-priority(b.kind));
    for (const marker of markers) {
      if(full && this.filter==='landmarks' && !['boss','main-boss'].includes(marker.kind))continue;
      if((!full||this.filter==='rare')&&!['boss','main-boss','crystal','fiber','enemy'].includes(marker.kind))continue;
      if(!full && marker.kind==='enemy'&&Math.hypot(marker.x-state.x,marker.y-state.y)>950)continue;
      const x = px(marker.x), y = py(marker.y); if (x < 0 || x > w || y < 0 || y > h) continue;
      if (full && marker.kind === 'enemy') continue;
      const cell=Math.floor(x/12)+','+Math.floor(y/12);if(!['boss','main-boss'].includes(marker.kind)&&occupied.has(cell))continue;occupied.add(cell);
      ctx.fillStyle = COLORS[marker.kind];
      if (marker.kind === 'main-boss') {
        const radius=full?10:8;
        ctx.save();ctx.shadowColor='#ffd66f';ctx.shadowBlur=full?16:10;
        ctx.beginPath();ctx.arc(x,y,radius+4,0,Math.PI*2);ctx.fillStyle='#382812dd';ctx.fill();ctx.lineWidth=full?3:2;ctx.strokeStyle='#ffe49a';ctx.stroke();
        ctx.shadowBlur=0;ctx.fillStyle='#ffd66f';ctx.beginPath();ctx.moveTo(x-radius,y+radius*.55);ctx.lineTo(x-radius*.72,y-radius*.5);ctx.lineTo(x-radius*.18,y-radius*.05);ctx.lineTo(x,y-radius*.82);ctx.lineTo(x+radius*.18,y-radius*.05);ctx.lineTo(x+radius*.72,y-radius*.5);ctx.lineTo(x+radius,y+radius*.55);ctx.closePath();ctx.fill();ctx.restore();
        if(full){ctx.font='bold 11px system-ui';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#ffe8a6';ctx.strokeStyle='#142126';ctx.lineWidth=3;const label=marker.label?'Главный босс · '+marker.label:'Главный босс';ctx.strokeText(label,x+15,y-13);ctx.fillText(label,x+15,y-13);}
      }
      else if (marker.kind === 'boss') { ctx.beginPath(); ctx.moveTo(x,y-5);ctx.lineTo(x+5,y);ctx.lineTo(x,y+5);ctx.lineTo(x-5,y);ctx.closePath();ctx.fill(); }
      else {ctx.beginPath();if(marker.kind==='crystal'){ctx.moveTo(x,y-4);ctx.lineTo(x+3,y);ctx.lineTo(x,y+4);ctx.lineTo(x-3,y);ctx.closePath();}else ctx.arc(x,y,full?2:marker.kind==='enemy'?3:3.5,0,Math.PI*2);ctx.fill();}
    }
    ctx.textAlign='center';ctx.textBaseline='middle';
    for (const region of RELEASE_REGIONS) {
      const x=px(region.center[0]),y=py(region.center[1]);
      ctx.fillStyle='#22332edb'; ctx.beginPath();ctx.arc(x,y,full?13:11,0,Math.PI*2);ctx.fill();
      ctx.font=`bold ${full?18:15}px system-ui`;ctx.fillStyle='#fff1c1';ctx.fillText(String(region.id),x,y);
    }
    const hx=px(state.home.x),hy=py(state.home.y);ctx.strokeStyle='#fff5d2';ctx.fillStyle='#203634';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx-8,hy);ctx.lineTo(hx,hy-8);ctx.lineTo(hx+8,hy);ctx.lineTo(hx+6,hy);ctx.lineTo(hx+6,hy+8);ctx.lineTo(hx-6,hy+8);ctx.lineTo(hx-6,hy);ctx.closePath();ctx.fill();ctx.stroke();
    const x=px(state.x), y=py(state.y);
    ctx.beginPath();ctx.arc(x,y,full?12:11,0,Math.PI*2);ctx.fillStyle='#10232a';ctx.fill();ctx.strokeStyle='#fff1b2';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI-state.facing);ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,7);ctx.lineTo(0,3);ctx.lineTo(-7,7);ctx.closePath();ctx.fillStyle='#fff5c1';ctx.fill();ctx.restore();
    ctx.font='bold 14px system-ui';ctx.textAlign='left';ctx.fillStyle='#ddd5b9';ctx.fillText('С',10,16);
    if (!full) { ctx.strokeStyle='#fff1c1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(14,h-16);ctx.lineTo(14+225*5*scale,h-16);ctx.stroke();ctx.font='12px system-ui';ctx.fillText('5 с',14,h-29); }
  }

  destroy(): void { window.removeEventListener('keydown', this.keydown, true); this.mini.remove(); this.modal.remove(); }
}
