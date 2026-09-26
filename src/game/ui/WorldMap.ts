import { RELEASE_REGIONS, RELEASE_PASSAGES, RELEASE_WORLD_WIDTH, RELEASE_WORLD_HEIGHT, getRegionAt, getPassageGeometry, type RegionPassage } from '../world/ReleaseRegionMap';
import { REGION_RESOURCE_PROFILES } from '../economy/RegionEconomy';

type MapMarker = { x: number; y: number; kind: 'enemy' | 'boss' | 'wood' | 'stone' | 'metal' | 'crystal' | 'fiber' };
type MapSnapshot = { x: number; y: number; facing: number; home: {x: number; y: number}; markers: MapMarker[] };
const COLORS: Record<string, string> = { enemy: '#eb8761', boss: '#ff554c', wood: '#a7d37b', stone: '#e6d8b8', metal: '#c2ccd5', crystal: '#72eeff', fiber: '#d6ed63' };
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

  constructor(private readonly isOpen: (passage: RegionPassage) => boolean, private readonly onToggle: (open: boolean) => void) {
    this.mini.className = 'world-minimap'; this.mini.type = 'button';
    this.mini.setAttribute('aria-label', 'Открыть карту мира');
    this.mini.title = 'Карта мира · Tab';
    this.miniCanvas.width = 360; this.miniCanvas.height = 280;
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
    const legend = document.createElement('p');
    legend.textContent = '➤ Вы здесь   ⌂ Поселение\n◆ Босс   • Мобы\nГолубой — кристаллы\nЛаймовый — волокно\nЗелёный — дерево\nБежевый — камень\nСеребристый — металл\n\nЖёлтый переход — открыт\nКрасный замок — закрыт';
    info.append(legend);
    const regions = document.createElement('p');
    regions.textContent = RELEASE_REGIONS.map(r => `${r.id}. ${r.name}`).join('\n'); info.append(regions);
    const hint = document.createElement('small'); hint.textContent = 'Игра приостановлена. Ресурсы отмечены только там, где ещё доступны для добычи.'; info.append(hint);
    body.append(this.fullCanvas, info); panel.append(header, body); this.modal.append(panel);
    document.querySelector('#app')!.append(this.mini, this.modal);
    window.addEventListener('keydown', this.keydown, true);
  }

  private keydown = (event: KeyboardEvent): void => {
    if (this.obscured && !this.expanded) return;
    if (event.code === 'Tab' && !event.repeat) {
      event.preventDefault(); event.stopImmediatePropagation(); this.toggle(!this.expanded);
    } else if (this.expanded && event.code === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); this.toggle(false);
    } else if (this.expanded) event.stopPropagation();
  };

  setObscured(obscured: boolean): void { this.obscured = obscured; this.mini.hidden = obscured; }

  private toggle(open: boolean): void {
    if (this.expanded === open) return;
    this.expanded = open; this.modal.hidden = !open; this.onToggle(open);
    if (open && this.snapshot) { this.draw(this.fullCanvas, this.snapshot, true); this.closeButton.focus(); }
    else this.mini.focus();
  }

  update(time: number, getSnapshot: () => MapSnapshot): void {
    if (time - this.lastUpdate < 200) return;
    this.lastUpdate = time; this.snapshot = getSnapshot();
    const region = getRegionAt(this.snapshot);
    this.caption.textContent = `${region ? `${region.id} · ${region.name}` : 'Переход'} · Tab`;
    const profile = REGION_RESOURCE_PROFILES.find(p => p.region === region?.id);
    const rare = profile ? `\nКристаллы: ${profile.abundance.crystal}/5\nВолокно: ${profile.abundance.fiber}/5` : '';
    this.location.textContent = `Вы здесь: ${region ? `${region.id}. ${region.name}` : 'между регионами'}${rare}`;
    this.draw(this.miniCanvas, this.snapshot, false);
  }

  private draw(canvas: HTMLCanvasElement, state: MapSnapshot, full: boolean): void {
    const ctx = canvas.getContext('2d')!; const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#182827'; ctx.fillRect(0, 0, w, h);
    const spanX = full ? RELEASE_WORLD_WIDTH : 5300, spanY = full ? RELEASE_WORLD_HEIGHT : 4200;
    const scale = Math.min((w - 26) / spanX, (h - 26) / spanY);
    const cx = full ? RELEASE_WORLD_WIDTH / 2 : state.x, cy = full ? RELEASE_WORLD_HEIGHT / 2 : state.y;
    const px = (x: number) => w / 2 + (x - cx) * scale, py = (y: number) => h / 2 + (y - cy) * scale;
    for (const region of RELEASE_REGIONS) {
      ctx.beginPath(); region.outline.forEach(([x, y], i) => i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))); ctx.closePath();
      ctx.fillStyle = REGION_COLORS[region.id - 1]; ctx.fill();
      ctx.strokeStyle = getRegionAt(state)?.id === region.id ? '#f7df92' : '#b3ac84'; ctx.lineWidth = full ? 2 : 1.5; ctx.stroke();
    }
    for (const passage of RELEASE_PASSAGES) {
      const {a, b} = getPassageGeometry(passage); const open = this.isOpen(passage);
      ctx.beginPath(); ctx.moveTo(px(a.x), py(a.y)); ctx.lineTo(px(b.x), py(b.y));
      ctx.strokeStyle = open ? '#ffe0a0' : '#eb7463'; ctx.lineWidth = full ? 4 : 3; ctx.stroke();
      if (!open) { const x = px((a.x+b.x)/2), y = py((a.y+b.y)/2); ctx.fillStyle='#442822';ctx.fillRect(x-5,y-5,10,10); ctx.strokeStyle='#ff8c76';ctx.strokeRect(x-5,y-5,10,10); }
    }
    for (const marker of state.markers) {
      const x = px(marker.x), y = py(marker.y); if (x < 0 || x > w || y < 0 || y > h) continue;
      if (full && marker.kind === 'enemy') continue;
      ctx.fillStyle = COLORS[marker.kind];
      if (marker.kind === 'boss') { ctx.beginPath(); ctx.moveTo(x,y-5);ctx.lineTo(x+5,y);ctx.lineTo(x,y+5);ctx.lineTo(x-5,y);ctx.closePath();ctx.fill(); }
      else { ctx.beginPath();ctx.arc(x,y,full ? 1.8 : 2.6,0,Math.PI*2);ctx.fill(); }
    }
    ctx.textAlign='center';ctx.textBaseline='middle';
    for (const region of RELEASE_REGIONS) {
      const x=px(region.center[0]),y=py(region.center[1]);
      ctx.fillStyle='#22332edb'; ctx.beginPath();ctx.arc(x,y,full?13:11,0,Math.PI*2);ctx.fill();
      ctx.font=`bold ${full?18:15}px system-ui`;ctx.fillStyle='#fff1c1';ctx.fillText(String(region.id),x,y);
    }
    ctx.font='bold 24px system-ui';ctx.fillStyle='#fff5d2';ctx.fillText('⌂',px(state.home.x),py(state.home.y));
    const x=px(state.x), y=py(state.y);
    ctx.beginPath();ctx.arc(x,y,full?12:11,0,Math.PI*2);ctx.fillStyle='#10232a';ctx.fill();
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI-state.facing);ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,7);ctx.lineTo(0,3);ctx.lineTo(-7,7);ctx.closePath();ctx.fillStyle='#fff6a8';ctx.fill();ctx.restore();
    ctx.font='bold 14px system-ui';ctx.textAlign='left';ctx.fillStyle='#ddd5b9';ctx.fillText('С ↑',10,16);
    if (!full) { ctx.strokeStyle='#fff1c1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(14,h-16);ctx.lineTo(14+225*5*scale,h-16);ctx.stroke();ctx.font='12px system-ui';ctx.fillText('5 с бега',14,h-29); }
  }

  destroy(): void { window.removeEventListener('keydown', this.keydown, true); this.mini.remove(); this.modal.remove(); }
}
