import './GameUI.css';
import { MAX_PLAYER_UPGRADE_LEVEL } from '../progression/UpgradeBalance';
import { RESOURCE_SALE_PRICES, type SellableResource } from '../economy/ResourceTrading';
import { reconcileDOM } from './ReconcileDOM';
import * as E from './HudEvents';
import type { CombatState } from '../combat/CombatSystem';
import type { SettlementHudState } from '../settlement/SettlementSystem';
import type { QuestHudState } from '../quests/QuestDirector';
import type { BestiaryHudState, BestiaryHudEntry } from '../bestiary/BestiarySystem';
import type { CityBuilderHudState } from '../settlement/CityBuilderSystem';
import type { ResourceCounts } from '../gathering/ResourceTypes';
import { WEAPON_DEFINITIONS } from '../combat/WeaponDefinitions';
import { weaponHitDamage } from '../combat/CombatMath';
import { WEAPON_RARITIES, WEAPON_SLOT_UNLOCK_LEVELS, type OwnedWeaponOption } from '../progression/WeaponInventory';
import { canAffordUpgrade, getWeaponUpgradeCost, getWeaponFusionCost, getPlayerUpgradeCost, getMaxHealth, getMoveSpeed, getBackpackCapacity, getDashCooldownMs, type PlayerUpgradeId } from '../progression/UpgradeBalance';
import { PLAYER_MASTERY } from '../progression/PlayerLevelBalance';
import { SKIN_DEFINITIONS, describeSkinBonus, SKIN_CHESTS, SKIN_RARITIES, type SkinId } from '../cosmetics/SkinEconomy';
import { SETTLEMENT_THEMES, PETS, GEM_PACKS, STARTER_PACK, FOUNDER_PACK, LEVEL_PASS, REGION_PACKS } from '../cosmetics/PremiumStoreConfig';
import { MONETIZATION_CONFIG } from '../monetization/MonetizationConfig';
import { RELEASE_REGIONS } from '../world/ReleaseRegionMap';
import { gameAudio } from '../audio/GameAudio';
import { requestYandexAuthorization, getYandexPlatformState, YANDEX_PLATFORM_STATE_EVENT } from '../../platform/yandex/YandexPlatform';
import { fillPortrait } from './ModelPortraits';
import { HERO_SKIN_STYLES } from '../render3d/HeroSkinStyles';
import type { InteractionPrompt } from '../world/WorldInteractions';
import { icon } from './GameIcons';

export type GameUIState = {
  combat: CombatState; gathering: E.GatheringHudState; settlement: SettlementHudState;
  upgrade: E.UpgradeHudState; quest: QuestHudState; bestiary: BestiaryHudState; city: CityBuilderHudState;
  monetization: E.MonetizationHudState; progress: E.PlayerProgressHudState; premium: E.PremiumHudState;
  character: E.CharacterHudState; area: string;
  interaction?: InteractionPrompt | null;
};
type Screen = 'character'|'bestiary'|'city'|'forge'|'shop'|'cosmetics'|'quests'|'settings'|'home'|'inventory';
type Emit = (event: string, ...args: unknown[])=>void;
const escape = (v: unknown): string => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const number = (v: number): string => Math.round(v).toLocaleString('ru-RU');
const regionEntriesCount=(entries:BestiaryHudEntry[],region:number):number=>entries.filter(entry=>entry.region===region).length;
const resourceNames:Record<string,string>={wood:'Дерево',stone:'Камень',metal:'Металл',crystal:'Кристаллы',fiber:'Волокно',coins:'Монеты',gems:'Самоцветы'};
const screenNames:Record<Screen,string>={character:'Персонаж',bestiary:'Бестиарий',city:'Поселение',forge:'Кузница',shop:'Лавка странника',cosmetics:'Облики и спутники',quests:'Дневник путешествия',settings:'Настройки',home:'Возвращение домой',inventory:'Рюкзак и склад'};
const stars=(value:number)=>`<span class="r-stars" aria-label="${value} из 5 звёзд">${Array.from({length:5},(_,i)=>icon('star',i<value?'':'off')).join('')}</span>`;
const bar=(value:number,max:number,extra='')=>`<div class="r-meter ${extra}"><i style="width:${Math.max(0,Math.min(100,100*value/Math.max(1,max)))}%"></i></div>`;
const stat=(glyph:string,value:string,label:string)=>`<div class="r-stat">${icon(glyph)}<div><strong>${value}</strong><small>${label}</small></div></div>`;
const button=(label:string,action:string,glyph='',disabled=false,style='')=>`<button class="r-btn ${style}" data-action="${action}" ${disabled?'disabled':''}>${glyph?icon(glyph):''}${label}</button>`;
const tag=(label:string,glyph='')=>`<span class="r-tag">${glyph?icon(glyph):''}${label}</span>`;

export class GameUI {
  readonly root=document.createElement('div');
  private readonly hud=document.createElement('div');
  private readonly overlay=document.createElement('div');
  private readonly toasts=document.createElement('div');
  private readonly confirmation=document.createElement('div');
  private readonly tooltip=document.createElement('div');
  private readonly tutorialSpotlight=document.createElement('div');
  private readonly tutorialFocus=document.createElement('div');
  private readonly tutorialPanel=document.createElement('section');
  private readonly storyOverlay=document.createElement('div');
  private readonly storyPanel=document.createElement('section');
  private readonly storyQueue:E.StoryHudBeat[]=[];
  private activeStory?:E.StoryHudBeat;
  private activeTutorial?:E.TutorialHudStep;
  private screen:Screen|null=null;
  private tab='equipment';
  private selectedSlot=0;
  private selectedWeapon='';
  private weaponFilter='all';
  private weaponSort='damage';
  private selectedEntry='';
  private saleAmounts:Partial<Record<SellableResource,number>>={};
  private regionFilter='all';
  private rankFilter='all';
  private eliteView=false;
  private search='';
  private confirmAction:(()=>void)|null=null;
  private lastOffer='';
  private renderQueued=false;
  private stateKeys=new Map<string,string>();
  private timerIds=new Set<ReturnType<typeof setTimeout>>();
  private disposed=false;
  private readonly chestReward=document.createElement('div');
  private lastFocused:HTMLElement|null=null;
  constructor(public state:GameUIState,private readonly emit:Emit,private readonly onModal:(open:boolean)=>void){
    this.root.className='ruin-ui';this.root.setAttribute('aria-label','Интерфейс Ruinstead');
    this.overlay.className='r-backdrop';this.overlay.hidden=true;
    this.toasts.className='r-toast-stack';this.toasts.setAttribute('aria-live','polite');
    this.confirmation.className='r-confirm';this.confirmation.hidden=true;
    this.tooltip.className='r-tooltip';this.tooltip.id='ruin-tooltip';this.tooltip.hidden=true;this.tooltip.setAttribute('role','tooltip');
    this.chestReward.className='r-chest-reward';this.chestReward.hidden=true;
    this.tutorialSpotlight.className='r-tutorial-spotlight';this.tutorialSpotlight.hidden=true;this.tutorialSpotlight.setAttribute('role','dialog');this.tutorialSpotlight.setAttribute('aria-modal','true');
    this.tutorialFocus.className='r-tutorial-focus';this.tutorialPanel.className='r-tutorial-panel';
    this.tutorialSpotlight.append(this.tutorialFocus,this.tutorialPanel);
    this.storyOverlay.className='r-story-overlay';this.storyOverlay.hidden=true;this.storyOverlay.setAttribute('role','dialog');this.storyOverlay.setAttribute('aria-modal','true');
    this.storyPanel.className='r-story-beat';this.storyOverlay.append(this.storyPanel);
    this.root.append(this.hud,this.overlay,this.toasts,this.confirmation,this.tooltip,this.chestReward);document.querySelector('#app')!.append(this.root,this.tutorialSpotlight,this.storyOverlay);
    this.root.addEventListener('click',this.click);this.tutorialSpotlight.addEventListener('click',this.click);this.storyOverlay.addEventListener('click',this.click);this.root.addEventListener('change',this.change);this.root.addEventListener('input',this.input);
    this.root.addEventListener('pointerover',this.showTooltip);this.root.addEventListener('focusin',this.showTooltip);
    this.root.addEventListener('pointerout',this.hideTooltip);this.root.addEventListener('focusout',this.hideTooltip);this.root.addEventListener('pointerdown',this.hideTooltip);
    window.addEventListener('keydown',this.keydown,true);window.addEventListener('resize',this.positionTutorial);window.addEventListener(YANDEX_PLATFORM_STATE_EVENT,this.platform);
    this.renderHud();this.offer();
  }
  private modalChange(open:boolean):void{this.root.dataset.modal=String(open);this.hud.inert=open;this.overlay.inert=!this.confirmation.hidden;this.tooltip.hidden=true;this.onModal(open);}
  get hasOpenPanel():boolean{return !!this.activeStory||!!this.activeTutorial||!!this.screen||!this.confirmation.hidden;}
  update<K extends keyof GameUIState>(key:K,value:GameUIState[K]):void{
    const stamp=JSON.stringify(value);if(this.stateKeys.get(key)===stamp)return;
    this.stateKeys.set(key,stamp);this.state[key]=value;this.renderHud();
    if(key==='monetization')this.offer();
    const relevant:Partial<Record<Screen,(keyof GameUIState)[]>>={character:['character','upgrade','progress'],forge:['upgrade','settlement','character'],bestiary:['bestiary'],city:['city','gathering'],shop:['premium','monetization'],cosmetics:['premium'],quests:['quest'],home:['monetization'],inventory:['gathering','city']};
    if(this.screen&&relevant[this.screen]?.includes(key))this.queueRender();
  }
  private queueRender():void{if(this.renderQueued)return;this.renderQueued=true;queueMicrotask(()=>{this.renderQueued=false;if(!this.disposed)this.renderPanel();});}
  open(screen:Screen):void{
    if(screen==='forge'&&!this.state.settlement.nearForge){this.notice('Для работы с оружием подойдите к кузнице.');return;}
    this.lastFocused=document.activeElement as HTMLElement;this.screen=screen;this.selectedEntry='';this.tab=screen==='shop'?'chests':screen==='cosmetics'?'skins':'equipment';
    this.overlay.hidden=false;this.modalChange(true);this.renderPanel();this.overlay.querySelector<HTMLElement>('[data-action="close"]')?.focus();
  }
  close():void{this.screen=null;this.overlay.hidden=true;this.modalChange(!this.confirmation.hidden);this.lastFocused?.focus();}
  notice(message:string):void{const toast=document.createElement('div');toast.className='r-toast';toast.textContent=message;this.addToast(toast,4300);}
  tutorial(step:E.TutorialHudStep):void{
    this.activeTutorial=step;this.tutorialSpotlight.hidden=false;this.onModal(true);
    this.tutorialPanel.innerHTML=`<div class="r-eyebrow">${step.step&&step.total?`Обучение · ${step.step} / ${step.total}`:'Подсказка'}</div><h2>${escape(step.title)}</h2><p>${escape(step.message)}</p><div class="r-actions">${button(step.sequence?'Далее':'Понятно','tutorial-next','arrow',false,'primary')}${button('Пропустить обучение','tutorial-skip','close',false,'quiet')}</div>`;
    requestAnimationFrame(this.positionTutorial);
    this.tutorialPanel.querySelector<HTMLElement>('[data-action="tutorial-next"]')?.focus();
  }
  story(beat:E.StoryHudBeat):void{
    this.storyQueue.push(beat);
    this.showNextStory();
  }
  private showNextStory():void{
    if(this.activeStory||this.activeTutorial||!this.storyQueue.length)return;
    this.activeStory=this.storyQueue.shift();
    const beat=this.activeStory;
    if(!beat)return;
    this.storyOverlay.hidden=false;this.onModal(true);
    this.storyPanel.innerHTML=`${tag(beat.chapter,'quest')}<h1>${escape(beat.title)}</h1><p>${escape(beat.text)}</p><div class="r-story-rule"></div><div class="r-actions">${button('Продолжить','story-continue','arrow',false,'primary')}</div>`;
    this.storyPanel.querySelector<HTMLElement>('[data-action="story-continue"]')?.focus();
  }
  private hideStory():void{
    this.activeStory=undefined;this.storyOverlay.hidden=true;
    this.onModal(!!this.activeTutorial||!!this.screen||!this.confirmation.hidden);
    this.showNextStory();
  }
  private tutorialTarget():HTMLElement|undefined{
    const selector=this.activeTutorial?.target;if(!selector)return undefined;
    return [...document.querySelectorAll<HTMLElement>(selector)].find(element=>{const rect=element.getBoundingClientRect();const style=getComputedStyle(element);return rect.width>2&&rect.height>2&&style.display!=='none'&&style.visibility!=='hidden';});
  }
  private positionTutorial=():void=>{
    if(!this.activeTutorial||this.tutorialSpotlight.hidden)return;
    const target=this.tutorialTarget(),pad=10;
    if(!target){this.tutorialFocus.hidden=true;this.tutorialPanel.style.left='50%';this.tutorialPanel.style.top='50%';this.tutorialPanel.style.transform='translate(-50%,-50%)';return;}
    const rect=target.getBoundingClientRect();
    this.tutorialFocus.hidden=false;this.tutorialFocus.style.left=Math.max(4,rect.left-pad)+'px';this.tutorialFocus.style.top=Math.max(4,rect.top-pad)+'px';
    this.tutorialFocus.style.width=Math.min(innerWidth-8,rect.width+pad*2)+'px';this.tutorialFocus.style.height=Math.min(innerHeight-8,rect.height+pad*2)+'px';
    this.tutorialPanel.style.transform='none';
    const panelRect=this.tutorialPanel.getBoundingClientRect();
    const below=rect.bottom+18+panelRect.height<innerHeight-12;
    const top=below?rect.bottom+18:Math.max(12,rect.top-panelRect.height-18);
    const left=Math.max(12,Math.min(innerWidth-panelRect.width-12,rect.left+rect.width/2-panelRect.width/2));
    this.tutorialPanel.style.left=left+'px';this.tutorialPanel.style.top=top+'px';
  };
  private hideTutorial():void{
    this.activeTutorial=undefined;this.tutorialSpotlight.hidden=true;this.tutorialFocus.hidden=true;this.onModal(!!this.screen||!this.confirmation.hidden);
  }
  levelUp(event:E.LevelUpHudEvent):void{const toast=document.createElement('div');toast.className='r-toast';toast.innerHTML=`${tag('Новый уровень','upgrade')}<h3>Уровень ${event.level}</h3><p>${escape(event.rewards.join(' · '))}</p>`;this.addToast(toast,7000);}
  private addToast(toast:HTMLElement,ms:number):void{this.toasts.append(toast);while(this.toasts.children.length>3)this.toasts.firstElementChild?.remove();const timer=setTimeout(()=>{toast.remove();this.timerIds.delete(timer);},ms);this.timerIds.add(timer);}
  private renderHud():void{
    const s=this.state,c=s.combat,p=s.progress,b=s.gathering.backpack;
    const rewards=s.bestiary.entries.reduce((total,e)=>total+(e.discovered?Array.from({length:e.level},(_,i)=>i+1).filter(level=>!e.claimedLevels.includes(level)).length:0),0);
    const danger=c.health/c.maxHealth<=.4;
    reconcileDOM(this.hud,`<div class="r-top"><button class="r-vitals r-frame" data-action="open:character" title="Персонаж · P"><div class="r-level">${p.level}</div><div><small><b>Здоровье</b><span>${number(c.health)} / ${number(c.maxHealth)}</span></small>${bar(c.health,c.maxHealth)}${bar(p.xp,p.xpToNext,'xp')}</div></button><div class="r-wallet r-frame"><span title="Монеты">${icon('coins')}${number(s.gathering.storage.coins)}</span><span title="Самоцветы">${icon('gems')}${number(p.gems)}</span></div></div>
      <div class="r-hero-health ${danger?'danger':''}" ${c.health/c.maxHealth>=.8?'hidden':''}>${bar(c.health,c.maxHealth)}<small ${danger?'':'hidden'}>${number(c.health)} HP</small></div><div class="r-region"><small>RUINSTEAD</small><b>${escape(s.area)}</b></div>
      <button class="r-quest" data-action="open:quests">${tag('Текущая цель','quest')}<strong>${escape(s.quest.title)}</strong><p>${escape(s.quest.objective)}</p><small>${escape(s.quest.progress)}</small></button>
      <nav class="r-nav" aria-label="Меню игры">${([['character','hero','Герой','P'],['bestiary','book','Бестиарий','B'],['city','home','Деревня','C'],['forge','forge','Кузница',''],['shop','shop','Магазин','M'],['cosmetics','skin','Облики',''],['settings','settings','Настройки','']] as const).map(([id,glyph,label,key])=>`<button data-action="open:${id}" title="${label}${key?' · '+key:''}" aria-label="${label}">${icon(glyph)}<span>${label}</span>${id==='bestiary'&&rewards>0?`<b class="r-badge" aria-label="${rewards} наград">${rewards}</b>`:''}</button>`).join('')}</nav>
      <div class="r-bottom ${danger?'r-low-health':''}"><span class="r-potion-health">${icon('health')}${number(c.health)} / ${number(c.maxHealth)}</span>${button(`${c.healthPotions}`, 'potion','potion',c.healthPotions<=0||c.healthPotionCooldownRemainingMs>0)}${button('Домой','open:home','home')}${button(`${b.usedCapacity} / ${b.capacity}`,'open:inventory','bag')}<span class="r-bag-count">Рюкзак</span></div>
      <div class="r-context">${s.interaction?button(s.interaction.label,'interact',s.interaction.kind==='chest'?'chest':'forge',false,'primary'):s.city.insideSettlement?`<span class="r-tag r-frame" style="padding:8px">${icon('health')}Безопасная зона</span>`:''}</div>`);
  }
  private tabs(items:[string,string][]):string{return `<div class="r-tabs" role="tablist">${items.map(([id,label])=>`<button class="r-tab ${this.tab===id?'active':''}" role="tab" aria-selected="${this.tab===id}" data-action="tab:${id}">${label}</button>`).join('')}</div>`;}
  private renderPanel():void{
    if(!this.screen)return;const scroll=this.overlay.querySelector('.r-content')?.scrollTop??0;
    const focus=(document.activeElement as HTMLElement)?.dataset.focus;
    const tabs=this.screen==='character'?this.tabs([['equipment','Снаряжение'],['training','Характеристики'],['mastery','Мастерство']]):this.screen==='shop'?this.tabs([['chests','Сундуки'],['supplies','Припасы и усиления'],['purchases','Наборы']]):this.screen==='cosmetics'?this.tabs([['skins','Облики'],['shards','Фрагменты'],['pets','Спутники'],['themes','Поселение']]):'';
    const content=this.screen==='character'?this.character():this.screen==='bestiary'?this.bestiary():this.screen==='forge'?this.forge():this.screen==='city'?this.city():this.screen==='shop'?this.shop():this.screen==='cosmetics'?this.cosmetics():this.screen==='quests'?this.quests():this.screen==='settings'?this.settings():this.screen==='inventory'?this.inventory():this.home();
    reconcileDOM(this.overlay,`<section class="r-dialog" role="dialog" aria-modal="true" aria-labelledby="ruin-dialog-title"><header class="r-dialog-header"><div><div class="r-eyebrow">Ruinstead · ${this.screen==='bestiary'?'Атлас живого мира':'Путь хранителя'}</div><h1 id="ruin-dialog-title">${screenNames[this.screen]}</h1></div><div class="r-actions" style="margin:0;align-items:center"><small>Esc · вернуться в мир</small><button class="r-btn quiet" aria-label="Закрыть" data-action="close">${icon('close')}</button></div></header>${tabs}<div class="r-content">${content}</div></section>`);
    this.overlay.querySelector('.r-content')!.scrollTop=scroll;
    if(focus)this.overlay.querySelector<HTMLElement>(`[data-focus="${focus}"]`)?.focus();
    this.portraits();
  }
  private cost(cost:ResourceCounts|null,owned=this.state.gathering.storage):string{
    if(!cost)return '<p class="r-muted">Максимальный уровень</p>';
    return `<div class="r-cost">${Object.entries(cost).filter(([,v])=>v>0).map(([k,v])=>`<span class="${(owned[k as keyof ResourceCounts]??0)<v?'missing':''}" title="${resourceNames[k]}: доступно ${number(owned[k as keyof ResourceCounts]??0)}">${icon(k)}${number(v)}</span>`).join('')}</div>`;
  }
  private image(id:string,primary:number,accent:number,elite=false,radius?:number,skinId?:SkinId):string{return `<img class="r-portrait" alt="${skinId?SKIN_DEFINITIONS[skinId].name:id==='hero'?'Модель героя':'Модель существа'}" data-model="${id}" data-primary="${primary}" data-accent="${accent}" data-elite="${elite}" ${skinId?`data-skin="${skinId}"`:''} ${radius?`data-radius="${radius}"`:''}>`;}
  private heroImage(skinId:SkinId|null):string{return this.image('hero',skinId?SKIN_DEFINITIONS[skinId].tint:0x355f78,0xd0a451,false,undefined,skinId??undefined);}
  private portraits():void{this.overlay.querySelectorAll<HTMLImageElement>('img[data-model]').forEach(img=>fillPortrait(img,img.dataset.model!,Number(img.dataset.primary),Number(img.dataset.accent),img.dataset.elite==='true',Number(img.dataset.radius)||undefined,img.dataset.skin as SkinId|undefined));}
  private weaponKey(w:OwnedWeaponOption):string{return `${w.weaponId},${w.rarity},${w.stars}`;}
  private selected():OwnedWeaponOption|undefined {return this.state.character.inventory.find(w=>this.weaponKey(w)===this.selectedWeapon)??this.state.character.inventory[0];}
  private weaponList():string{
    const inventory=this.state.character.inventory.filter(w=>this.weaponFilter==='all'||w.weaponId===this.weaponFilter).slice().sort((a,b)=>this.weaponSort==='damage'?weaponHitDamage(b,this.state.character.damageBonus)-weaponHitDamage(a,this.state.character.damageBonus):this.weaponSort==='rarity'?WEAPON_RARITIES[b.rarity].multiplier-WEAPON_RARITIES[a.rarity].multiplier:b.stars-a.stars);
    return `<div class="r-weapon-controls"><div class="r-weapon-types">${[['all','Все'],...Object.entries(WEAPON_DEFINITIONS).map(([id,d])=>[id,d.name])].map(([id,name])=>`<button class="${this.weaponFilter===id?'active':''}" data-action="weapon-type:${id}" title="${name}" aria-label="${name}">${id==='all'?name:icon(id)}</button>`).join('')}</div><label class="r-weapon-sort">Порядок <select data-filter="weapon-sort" aria-label="Сортировка оружия"><option value="damage" ${this.weaponSort==='damage'?'selected':''}>Сначала сильное</option><option value="rarity" ${this.weaponSort==='rarity'?'selected':''}>По редкости</option><option value="stars" ${this.weaponSort==='stars'?'selected':''}>По звёздам</option></select></label></div><div class="r-weapon-scroll"><div class="r-weapon-list">${inventory.map(w=>`<button class="r-weapon ${this.selected()===w?'selected':''}" style="--rarity:${w.rarityColor}" data-action="weapon:${this.weaponKey(w)}">${icon(w.weaponId)}<strong>${WEAPON_DEFINITIONS[w.weaponId].name}</strong>${stars(w.stars)}<small>${w.rarityName} · ур. ${w.level} · ${w.count} шт.</small><b class="damage">${weaponHitDamage(w,this.state.character.damageBonus)} урона</b></button>`).join('')}</div>${inventory.length?'':'<p class="r-muted">Оружия этого типа пока нет.</p>'}</div>`;
  }
  private character():string{
    const s=this.state,c=s.character,p=s.progress;
    if(this.tab==='training')return this.training();
    if(this.tab==='mastery')return `<h2>Очки мастерства: ${p.masteryAvailable}</h2><p class="r-muted">Новые очки открываются каждые пять уровней.</p><div class="r-grid" style="margin-top:20px">${Object.entries(PLAYER_MASTERY).map(([id,m],index)=>`<article class="r-card">${icon(['damage','health','speed','fiber','home'][index],'r-hero-icon')}<h3>${m.name}</h3><p>${['Урон +3% за ранг','Максимальное здоровье +4%','Скорость +2%, перезарядка рывка −4%','Выход ресурсов +5%','Производство и вместимость +5%'][index]}</p><div class="r-statline">${stars(p.masteryRanks[id as keyof typeof p.masteryRanks])}</div>${button('Изучить за 1 очко',`mastery:${id}`,'upgrade',p.masteryAvailable<1||p.masteryRanks[id as keyof typeof p.masteryRanks]>=m.maxRank)}</article>`).join('')}</div>`;
    const selected=this.selected(),equipped=c.slots[this.selectedSlot];
    const delta=selected?weaponHitDamage(selected,c.damageBonus)-(equipped?weaponHitDamage(equipped,c.damageBonus):0):0;
    return `<div class="r-split"><aside class="r-character">${tag('Хранитель руин','hero')}${this.heroImage(s.premium.equippedSkinId)}<h2>Уровень ${p.level}</h2><p>${icon('xp')}${number(p.xp)} / ${number(p.xpToNext)} опыта</p><div style="margin:14px">${bar(p.xp,p.xpToNext,'xp')}</div><div class="r-statline">${stat('health',number(s.combat.maxHealth),'Макс. здоровье')}${stat('bag',number(s.gathering.backpack.capacity),'Вместимость')}</div></aside><section><div class="r-detail-head"><h2>Снаряжение</h2>${tag(`${c.unlockedSlots} / 5 слотов`)}</div><div class="r-slots">${WEAPON_SLOT_UNLOCK_LEVELS.map((level,i)=>{const w=c.slots[i],locked=i>=c.unlockedSlots;return `<button style="${w?'border-top:3px solid '+WEAPON_RARITIES[w.rarity].color:''}" class="r-slot ${locked?'locked':''} ${i===this.selectedSlot?'selected':''}" data-action="slot:${i}" ${locked?'disabled':''}>${icon(locked?'lock':w?.weaponId??'bag')}<b>${locked?`Уровень ${level}`:w?WEAPON_DEFINITIONS[w.weaponId].name:'Пустой слот'}</b><small>${locked?'Закрыто':i===c.primarySlot?'Основное':`Орбита ${i+1}`}</small>${w?stars(w.stars)+`<small>${weaponHitDamage(w,c.damageBonus,i===c.primarySlot?1:.65)} урона</small>`:''}</button>`;}).join('')}</div><p class="r-muted">Выберите слот, затем оружие из коллекции.</p><div class="r-loadout-browser"><div>${this.weaponList()}</div>${selected?this.weaponDetail(selected,delta):''}</div></section></div>`;
  }
  private weaponDetail(w:OwnedWeaponOption,delta:number):string{
    const c=this.state.character;
    return `<div class="r-detail"><div class="r-detail-head"><h3>${WEAPON_DEFINITIONS[w.weaponId].name}</h3><small style="color:${w.rarityColor}">${w.rarityName} · ур. ${w.level}</small>${stars(w.stars)}</div><div class="r-actions">${button('В слот','equip','check',false,'primary')}${button('Основное','primary','star',!c.slots[this.selectedSlot]||this.selectedSlot===c.primarySlot)}${button('Снять','unequip','close',!c.slots[this.selectedSlot])}${button('Кузница','open:forge','forge')}</div><div class="r-statline">${stat('damage',String(weaponHitDamage(w,c.damageBonus)),'Урон за удар')}${stat('timer',String(WEAPON_DEFINITIONS[w.weaponId].cooldownMs/1000)+' с','Интервал атаки')}${stat('damage',String(weaponHitDamage(w,c.damageBonus,.65)),'Урон на орбите')}</div><p class="${delta>=0?'r-good':'r-bad'}">${delta>0?'+':''}${delta} урона к слоту ${this.selectedSlot+1}</p></div>`;
  }
  private training():string{
    const u=this.state.upgrade;
    const items:[PlayerUpgradeId,string,number,string,(n:number)=>number,string][]=[['max-health','Здоровье',u.player.maxHealthLevel,'health',getMaxHealth,'HP'],['move-speed','Скорость',u.player.moveSpeedLevel,'speed',getMoveSpeed,'ед./с'],['backpack','Рюкзак',u.player.backpackLevel,'bag',getBackpackCapacity,'мест'],['dash','Рывок',u.player.dashLevel,'dash',getDashCooldownMs,'мс перезарядки']];
    return `<p class="r-muted">Характеристики можно улучшать в любом месте за ресурсы со склада. Значения показаны без временных усилений.</p><div class="r-grid" style="margin-top:18px">${items.map(([id,name,level,glyph,value,unit])=>{const cost=getPlayerUpgradeCost(id,level);return `<article class="r-card">${icon(glyph,'r-hero-icon')}<h3>${name}</h3><p>Уровень ${level} / ${MAX_PLAYER_UPGRADE_LEVEL}</p><div class="r-statline">${stat(glyph,`${value(level)}${cost?' → '+value(level+1):''}`,unit)}</div>${this.cost(cost,u.storage)}${button(cost?'Улучшить':'Максимум',`train:${id}`,'upgrade',!canAffordUpgrade(u.storage,cost),'primary')}</article>`;}).join('')}</div>`;
  }
  private forge():string{
    const f=this.state.settlement.forge,u=this.state.upgrade,w=this.selected();
    if(!f.restored)return `<div class="r-split"><div class="r-character">${icon('forge','r-hero-icon')}<h2>Возродите кузницу</h2><p>Этап ${f.repairStage} / ${f.maxRepairStage}</p></div><article class="r-card"><h2>${f.stageName}</h2><p>Восстановление откроет улучшение и слияние оружия.</p>${this.cost(f.nextCost,f.storage)}${button('Восстановить','repair','forge',!f.canAfford||!this.state.settlement.nearForge,'primary')}<p class="r-muted">Для ремонта подойдите к кузнице.</p></article></div>`;
    if(!w)return '<p>Сначала получите оружие.</p>';
    const cost=getWeaponUpgradeCost(w.weaponId,w.level),fusion=getWeaponFusionCost(w.stars),inside=this.state.settlement.nearForge;
    return `<div class="r-split r-forge-layout"><section><h2>Коллекция оружия</h2>${this.weaponList()}</section><section><div class="r-card">${tag(w.rarityName,w.weaponId)}<h2>${WEAPON_DEFINITIONS[w.weaponId].name}</h2>${stars(w.stars)}<div class="r-statline">${stat('damage',String(weaponHitDamage(w,u.damageBonus)),'Текущий урон')}${cost?stat('upgrade',String(weaponHitDamage({...w,level:w.level+1},u.damageBonus)),'После улучшения'):''}</div><p>Уровень ${w.level} / 10</p>${this.cost(cost,u.storage)}${button('Повысить уровень','upgrade','upgrade',!inside||!canAffordUpgrade(u.storage,cost),'primary')}</div><div class="r-card" style="margin-top:15px">${tag('Слияние','fusion')}<h3>${w.stars<5?`${w.stars} → ${w.stars+1} звёзд`:'Пять звёзд достигнуты'}</h3><p>${w.stars<5?`Нужно 2 одинаковых экземпляра. В коллекции: ${w.count}.`:'После 32 базовых копий выпадает другое оружие той же редкости. Если собрано всё — материалы.'}</p>${this.cost(fusion,u.storage)}${button('Объединить два экземпляра','fuse','fusion',w.count<2||!canAffordUpgrade(u.storage,fusion))}</div>${!inside?'<p style="margin-top:12px">Для повышения уровня подойдите к кузнице. Слияние доступно из любой точки мира.</p>':''}</section></div>`;
  }
  private bestiary():string{
    const b=this.state.bestiary,e=b.entries.find(e=>e.entryId===this.selectedEntry);
    if(e)return this.bestiaryDetail(e);
    const regionStatus=RELEASE_REGIONS.map(region=>{
      const regionEntries=b.entries.filter(entry=>entry.region===region.id);
      const rewards=regionEntries.filter(entry=>entry.claimableLevel!==null).length;
      const complete=regionEntries.length>0&&regionEntries.every(entry=>entry.mastery&&entry.claimedLevels.length>=5);
      return {region,rewards,complete};
    });
    const totalRewards=regionStatus.reduce((sum,item)=>sum+item.rewards,0);
    const completeRegions=regionStatus.filter(item=>item.complete).length;
    const entries=b.entries.filter(e=>(this.regionFilter==='all'||e.region===Number(this.regionFilter))&&(this.rankFilter==='all'||this.rankFilter===e.kind||this.rankFilter==='elite'&&e.kind==='species')&&e.name.toLowerCase().includes(this.search.toLowerCase()));
    const regionFilters=`<div class="r-bestiary-regions" aria-label="Фильтр по регионам"><button class="r-region-chip ${this.regionFilter==='all'?'active':''} ${totalRewards?'reward':''}" data-action="region-filter:all">${icon('map')}<span><b>Все регионы</b><small>${completeRegions} / 8 закрыто</small></span>${totalRewards?`<em>${icon('reward')}${totalRewards}</em>`:''}</button>${regionStatus.map(({region,rewards,complete})=>`<button class="r-region-chip ${this.regionFilter===String(region.id)?'active':''} ${rewards?'reward':''} ${complete?'complete':''}" data-action="region-filter:${region.id}" title="${complete?'Регион полностью изучен':rewards?`Доступно наград: ${rewards}`:'Фильтр по региону'}">${complete?icon('check'):rewards?icon('reward'):icon('map')}<span><b>${region.id}. ${escape(region.name)}</b><small>${complete?'Полностью изучен':rewards?`Наград: ${rewards}`:`${regionEntriesCount(b.entries,region.id)} записей`}</small></span>${rewards?`<em>${rewards}</em>`:complete?'<em class="done">100%</em>':''}</button>`).join('')}</div>`;
    return `<div class="r-detail-head"><p>${b.discoveredCount} / ${b.totalCount} открыто · ${b.masteryCount} изучено полностью</p>${tag(completeRegions?completeRegions+' / 8 регионов закрыто':'8 регионов','map')}</div>${regionFilters}<div class="r-bestiary-status-key"><span class="reward">${icon('reward')} Есть награды</span><span class="complete">${icon('check')} Регион закрыт полностью</span></div><div class="r-filters"><input aria-label="Поиск существа" data-focus="search" data-filter="search" placeholder="Название существа" value="${escape(this.search)}"><select aria-label="Ранг" data-filter="rank">${[['all','Все ранги'],['species','Обычные'],['elite','Элита'],['boss','Боссы']].map(([id,label])=>`<option value="${id}" ${this.rankFilter===id?'selected':''}>${label}</option>`).join('')}</select></div><div class="r-index">${entries.map(e=>{const elite=this.rankFilter==='elite',known=elite?e.eliteDiscovered:e.discovered,complete=e.mastery&&e.claimedLevels.length>=5;return `<button class="r-card r-entry ${e.claimableLevel?'r-reward-ready':''} ${complete?'r-entry-complete':''}" data-action="entry:${e.entryId}"><div class="r-display ${known?'':'locked'}">${known?this.image(e.entityId,e.primaryColor,e.accentColor,elite||e.kind==='boss',elite?e.eliteRadius:e.radius):''}</div><div class="r-entry-text">${e.claimableLevel?'<span class="r-reward-flag">'+icon('reward')+'Награда</span>':complete?'<span class="r-complete-flag">'+icon('check')+'MASTER</span>':''}${tag(e.kind==='boss'?'Босс':elite?'Элита':`Регион ${e.region}`,e.kind==='boss'?'boss':elite?'elite':'map')}<h3>${escape(elite?e.eliteName:e.name)}</h3><p>${known?escape(e.area):'Ещё не обнаружен'}</p>${bar(elite?e.eliteKills:e.kills,e.nextThreshold??Math.max(1,e.kills))}<p>${e.progressText}</p></div></button>`;}).join('')}</div>${entries.length?'':'<p>Существа с такими условиями не найдены.</p>'}`;
  }
  private bestiaryDetail(e:BestiaryHudEntry):string{
    const elite=this.eliteView&&e.kind==='species',known=elite?e.eliteDiscovered:e.discovered;
    return `<div class="r-actions" style="margin:0 0 15px">${button('К списку','entry-back','book')}${e.kind==='species'?button(elite?'Обычный вид':'Элитный вид','elite-view',elite?'hero':'elite'):''}</div><div class="r-bestiary-detail"><div class="r-display ${known?'':'locked'}">${known?this.image(e.entityId,e.primaryColor,e.accentColor,elite||e.kind==='boss',elite?e.eliteRadius:e.radius):''}</div><section>${tag(e.kind==='boss'?'Босс':elite?'Элита':'Обычный вид',e.kind==='boss'?'boss':elite?'elite':'book')}<h2>${escape(elite?e.eliteName:e.name)}</h2><p>${known?escape(e.description):'Встретьте это существо, чтобы открыть его описание.'}</p><div class="r-statline">${stat('health',known?number(elite?e.eliteHealth:e.health):'?', 'Здоровье')}${stat('damage',known?number(elite?e.eliteDamage:e.damage):'?','Урон')}</div><div class="r-data"><div><small>Обитает</small><b>${escape(e.area)}</b></div><div><small>Ранг</small><b>${e.kind==='boss'?'Босс':elite?'Элитный':'Обычный'}</b></div><div><small>${icon('damage')} Слабость</small><b>${escape(e.weakness)}</b></div><div><small>${icon('shield')} Сопротивление</small><b>${escape(e.resistance)}</b></div></div><p>${icon('reward')} ${escape(e.dropText)}</p></section></div><div class="r-card" style="margin-top:20px"><div class="r-detail-head"><h3>Изучение вида · уровень ${e.level} / 5</h3>${tag(`${e.kills} побед`, 'book')}</div><p>${e.progressText}${e.kind==='species'?` · Элитных побеждено: ${e.eliteKills}`:''}</p><div style="margin:12px 0">${bar(e.kills,e.nextThreshold??Math.max(1,e.kills))}</div><p>Награда: ${escape(e.rewardPreview)}</p><div class="r-actions">${button(e.claimableLevel?'Забрать награду':'Продолжайте исследование',`claim:${e.entryId}`,'reward',!e.claimableLevel,'primary')}</div></div>`;
  }
  private city():string{
    const c=this.state.city,p=c.production;
    return `<div class="r-detail-head"><h2>Поселение · уровень ${c.settlementLevel}</h2>${tag(`${c.npcCount} жителей`,'home')}</div><article class="r-card"><div class="r-detail-head"><h3>Производство</h3><small>${p.used} / ${p.capacity}</small></div><p>Цикл производства: ${p.cycleSeconds} с</p>${this.cost(p.pending)}${bar(p.used,p.capacity)}<div class="r-actions">${button('Забрать','collect','bag',!p.canCollect,'primary')}${button('Забрать ×2','double','ad',!p.canCollect||this.state.monetization.busy||!this.state.monetization.enabled)}</div></article><div class="r-grid" style="margin-top:18px">${c.buildings.map(b=>`<article class="r-card">${icon(b.id==='workshop'?'forge':b.id==='storage'?'bag':b.id==='sawmill'?'wood':'home','r-hero-icon')}<h3>${b.name}</h3><p>Уровень ${b.level} / ${b.maxLevel}</p><p>${b.effectText}</p>${this.cost(b.nextCost)}${b.locked?`<p>${icon('lock')}${b.lockReason}</p>`:''}<div class="r-actions">${button('Улучшить',`building:${b.id}`,'upgrade',b.locked||!b.canAfford||!c.insideSettlement,'primary')}</div></article>`).join('')}</div>${!c.insideSettlement?'<p style="margin-top:15px">Для строительства вернитесь в поселение.</p>':''}`;
  }
  private shop():string{
    const p=this.state.premium,m=this.state.monetization;
    if(this.tab==='chests')return `<div class="r-detail-head"><p>Сундуки содержат фрагменты обликов.</p>${tag(`${p.gems} самоцветов`,'gems')}</div><div class="r-grid" style="margin-top:18px">${(['common','rare','epic'] as const).map((tier,i)=>{const chest=SKIN_CHESTS[tier];return `<article class="r-card" style="--rarity:${WEAPON_RARITIES[tier].color}"><div class="r-chest-art">${icon('chest')}</div><h2>${['Дорожный сундук','Редкий сундук','Эпический сундук'][i]}</h2><p>${chest.gemCost} самоцветов · 10 фрагментов</p><p class="r-muted">${Object.entries(chest.rarityWeights).filter(([,v])=>v>0).map(([r,v])=>`${WEAPON_RARITIES[r as keyof typeof WEAPON_RARITIES].name}: ${v}%`).join(' · ')}</p><div class="r-actions">${button('Открыть',`chest:${tier},gems`,'gems',p.gems<chest.gemCost||m.busy,'primary')}${p.freeSkinChests[tier]>0?button(`Бесплатно (${p.freeSkinChests[tier]})`,`chest:${tier},free`,'reward',m.busy):''}${tier==='common'?button(`Реклама (${p.rewardedCommonChestRemaining})`,`chest:${tier},rewarded`,'ad',p.rewardedCommonChestRemaining<1||m.busy||!m.enabled):''}</div></article>`;}).join('')}</div><p style="margin-top:16px" class="r-muted">Гарантия эпического сундука: ${p.epicChestPity} / 5. Облики и фрагменты находятся в разделе «Облики».</p>`;
    if(this.tab==='supplies')return `<h2>Благословения на 3 минуты</h2><div class="r-grid">${(['damage','health','speed','gathering'] as const).map((id,i)=>`<article class="r-card">${icon(['damage','health','speed','fiber'][i],'r-hero-icon')}<h3>${['Сила +20%','Здоровье +25%','Скорость +15%','Добыча +50%'][i]}</h3><div class="r-actions">${button('Получить',`blessing:${id}`,'ad',m.busy||!m.enabled)}</div></article>`).join('')}</div><h2 style="margin-top:25px">Припасы</h2><p class="r-muted">${m.supplyCooldownRemainingMs>0?`Следующая поставка через ${Math.ceil(m.supplyCooldownRemainingMs/60000)} мин.`:'Одна поставка раз в 15 минут.'}</p><div class="r-grid" style="margin-top:13px">${Object.entries(MONETIZATION_CONFIG.supplyRewards).map(([id,count])=>`<article class="r-card"><h3>${icon(id)} ${resourceNames[id]} ×${count}</h3><div class="r-actions">${button('Получить',`supply:${id}`,'ad',m.busy||!m.enabled||m.supplyCooldownRemainingMs>0)}</div></article>`).join('')}</div><div class="r-actions">${button('Обновить боссов','boss-respawn','boss',m.busy||!m.enabled||m.bossRespawnResetCooldownRemainingMs>0)}${button('Билеты домой','open:home','ticket')}</div>`;
    const products:[string,string,string,boolean][]=[...Object.entries(GEM_PACKS).map(([id,n])=>[id,`${n} самоцветов`,'Валюта для сундуков, обликов и спутников.',false] as [string,string,string,boolean]),[STARTER_PACK.productId,'Набор новичка',`${STARTER_PACK.gems} самоцветов, ${STARTER_PACK.returnTickets} билетов и облик «${SKIN_DEFINITIONS[STARTER_PACK.skinId].name}».`,p.starterPackOwned],[FOUNDER_PACK.productId,'Набор основателя',`${FOUNDER_PACK.gems} самоцветов, ${FOUNDER_PACK.returnTickets} билетов и облик «${SKIN_DEFINITIONS[FOUNDER_PACK.skinId].name}».`,p.founderPackOwned],[LEVEL_PASS.productId,'Путь хранителя','Дополнительные награды на уровнях 5–50.',p.levelPassOwned],...(p.regionPackStage2Available?[['region_pack_stage_2','Набор Пепельных руин',`${REGION_PACKS.region_pack_stage_2.gems} самоцветов, 3 билета, 10 кристаллов, 20 волокна и облик.`,p.regionPackStage2Owned] as [string,string,string,boolean]]:[]),[MONETIZATION_CONFIG.adFreeWeekProductId,'Неделя без рекламы','Награды без просмотра рекламы в течение 7 дней.',m.adFreeUntil>Date.now()]];
    return `<div class="r-grid">${products.map(([id,title,desc,owned])=>this.product(id,title,desc,owned)).join('')}</div>`;
  }
  private product(id:string,title:string,description:string,owned=false):string{const p=this.state.premium,c=p.purchaseCatalog[id];return `<article class="r-card">${icon(id.startsWith('gems')?'gems':'reward','r-hero-icon')}<h3>${escape(c?.title??title)}</h3><p>${escape(c?.description??description)}</p><div class="r-actions">${button(owned?'Получено':c?.price??'Недоступно',`purchase:${id}`,owned?'check':'shop',owned||!p.purchaseAvailable||!c||this.state.monetization.busy,'primary')}</div></article>`;}
  private cosmetics():string{
    const p=this.state.premium;
    if(this.tab==='skins')return `<div class="r-actions" style="margin:0 0 18px">${button('Базовый облик','skin:','hero',!p.equippedSkinId)}</div><div class="r-cosmetic-grid">${(Object.entries(SKIN_DEFINITIONS) as [SkinId,(typeof SKIN_DEFINITIONS)[SkinId]][]).map(([id,skin])=>{const owned=p.unlockedSkinIds.includes(id),selected=p.equippedSkinId===id,rarity=SKIN_RARITIES[skin.rarity],product='productId' in skin?String(skin.productId):'';return `<article class="r-card r-skin-card ${selected?'selected':''}" style="--skin-accent:${WEAPON_RARITIES[skin.rarity].color};border-top:3px solid ${WEAPON_RARITIES[skin.rarity].color}"><div class="r-skin-stage">${this.heroImage(id)}</div>${tag(WEAPON_RARITIES[skin.rarity].name)}<h3>${skin.name}</h3><p class="r-skin-description">${HERO_SKIN_STYLES[id].description}</p><p>${describeSkinBonus(id)}</p><p class="r-muted">${owned?'Облик открыт':rarity.fragmentsToUnlock?`${p.skinFragments[id]??0} / ${rarity.fragmentsToUnlock} фрагментов`:'Особый облик'}</p><div class="r-actions">${owned?button(selected?'Надет':'Надеть',`skin:${id}`,'skin',selected):product?button(p.purchaseCatalog[product]?.price??'В наборе',`purchase:${product}`,'shop',!p.purchaseAvailable||!p.purchaseCatalog[product]):button(skin.source==='chest'?'В сундуках':'Награда набора','open:shop','chest')}</div></article>`;}).join('')}</div>`;
    if(this.tab==='shards')return `<p style="margin-bottom:20px">Ежедневные предложения фрагментов.</p><div class="r-grid">${p.shardShopOffers.map(o=>`<article class="r-card">${this.heroImage(o.skinId)}<h3>${SKIN_DEFINITIONS[o.skinId].name}</h3><p>${o.fragments} фрагментов · ${o.gemCost} самоцветов</p><div class="r-actions">${button(o.purchased?'Получено':'Купить',`shard:${o.slot}`,'gems',o.purchased||o.unlocked||p.gems<o.gemCost,'primary')}</div></article>`).join('')}</div>`;
    if(this.tab==='pets')return `<div class="r-grid">${Object.entries(PETS).map(([id,pet])=>`<article class="r-card">${icon('elite','r-hero-icon')}<h3>${pet.name}</h3><p>Радиус подбора +${Math.round((pet.pickupRangeMultiplier-1)*100)}%</p><p>${p.ownedPets.includes(id)?'Спутник открыт':`${pet.gemCost} самоцветов`}</p><div class="r-actions">${button(p.equippedPet===id?'С вами':p.ownedPets.includes(id)?'Выбрать':'Открыть',`pet:${id}`,'check',p.equippedPet===id||!p.ownedPets.includes(id)&&p.gems<pet.gemCost)}</div></article>`).join('')}</div>`;
    return `<div class="r-grid">${Object.entries(SETTLEMENT_THEMES).map(([id,t])=>`<article class="r-card">${icon('home','r-hero-icon')}<h3>${t.name}</h3><p>${p.ownedSettlementThemes.includes(id)?'Тема открыта':`${t.gemCost} самоцветов`}</p><div class="r-actions">${button(p.equippedSettlementTheme===id?'Применено':p.ownedSettlementThemes.includes(id)?'Применить':'Открыть',`theme:${id}`,'home',p.equippedSettlementTheme===id||!p.ownedSettlementThemes.includes(id)&&p.gems<t.gemCost)}</div></article>`).join('')}</div>`;
  }
  private quests():string{const q=this.state.quest;return `<div class="r-quest-journal"><article class="r-card r-story-card">${tag(q.chapter,'quest')}<div class="r-detail-head"><h2>${escape(q.title)}</h2><small>${escape(q.sequenceProgress)}</small></div><p class="r-story-text">${escape(q.story)}</p><div class="r-objective-box"><small>Текущая задача</small><strong>${escape(q.objective)}</strong><div class="r-statline">${stat('check',escape(q.progress),'Прогресс')}</div><p>${escape(q.hint)}</p></div><hr class="r-divider"><p>${icon('reward')} ${escape(q.rewardText)}</p></article>${q.optional?`<article class="r-card r-side-quest">${tag('Побочное задание','quest')}<h2>${escape(q.optional.title)}</h2><p>${escape(q.optional.progress)}</p><hr class="r-divider"><p>${icon('reward')} ${escape(q.optional.rewardText)}</p></article>`:''}</div>`;}
  private inventory():string{
    const g=this.state.gathering,inside=this.state.city.insideSettlement;
    return `<h2>Рюкзак · ${g.backpack.usedCapacity} / ${g.backpack.capacity}</h2>${bar(g.backpack.usedCapacity,g.backpack.capacity)}<p style="margin:15px 0 24px">Ресурсы переносятся на склад при возвращении в поселение. Монеты не занимают места, но добытые в походе выпадают при смерти.</p><h3>Продажа со склада</h3><p class="r-muted">${inside?'Выберите ресурс и количество. Выручка останется в поселении.':'Продажа доступна в безопасной зоне поселения.'}</p><div class="r-grid r-resource-grid">${Object.keys(resourceNames).filter(k=>k!=='gems').map(id=>{
      const type=id as SellableResource,owned=g.storage[id as keyof ResourceCounts]??0,amount=Math.max(1,Math.min(owned,this.saleAmounts[type]??10));
      return `<article class="r-card"><h3>${icon(id)} ${resourceNames[id]}</h3><div class="r-statline">${stat('bag',number(g.backpack.carried[id as keyof ResourceCounts]??0),'С собой')}${stat('home',number(owned),'На складе')}</div>${id==='coins'?'<p class="r-muted">Вес: 0</p>':`<p class="r-muted">За 1 шт.: ${icon('coins')} ${RESOURCE_SALE_PRICES[type]}</p><label class="r-sale-quantity">Количество <input type="number" min="1" max="${Math.max(1,owned)}" step="1" value="${amount}" aria-label="Количество: ${resourceNames[id]}" data-sale-quantity="${id}" ${!inside||owned<1?'disabled':''}></label><div class="r-actions">${button('Продать · '+number(amount*RESOURCE_SALE_PRICES[type]),'sell:'+id,'coins',!inside||owned<1)}</div>`}</article>`;
    }).join('')}</div>`;
  }

  private settings():string{const a=gameAudio.settings,y=getYandexPlatformState();return `<div class="r-split"><section><h2>Звук</h2><label class="r-setting">Без звука<input aria-label="Без звука" type="checkbox" data-audio="muted" ${a.muted?'checked':''}></label><label class="r-setting">Музыка<input aria-label="Громкость музыки" type="range" min="0" max="1" step=".05" value="${a.musicVolume}" data-audio="musicVolume"></label><label class="r-setting">Эффекты<input aria-label="Громкость эффектов" type="range" min="0" max="1" step=".05" value="${a.sfxVolume}" data-audio="sfxVolume"></label></section><article class="r-card">${icon('cloud','r-hero-icon')}<h2>Сохранение</h2><p>${y.authorized?'Yandex ID подключён. Облачное сохранение доступно.':y.available?'Подключите Yandex ID для облачного сохранения.':'Локальное сохранение в этом браузере.'}</p><div class="r-actions">${button(y.authorized?'Подключено':'Войти в Yandex ID','auth','cloud',!y.available||y.authorized)}</div></article></div>`;}
  private home():string{const m=this.state.monetization,p=this.state.premium,c=p.purchaseCatalog[MONETIZATION_CONFIG.returnTicketProductId];return `<div class="r-grid"><article class="r-card">${icon('ticket','r-hero-icon')}<h2>Билет домой</h2><p>Мгновенное возвращение с ресурсами. Билетов: ${m.returnTickets}.</p><div class="r-actions">${button('Использовать билет','return:ticket','home',!m.canFastReturn||m.returnTickets<1||m.busy,'primary')}${button('За рекламу','return:rewarded','ad',!m.canFastReturn||m.busy||!m.enabled)}</div></article><article class="r-card">${icon('shop','r-hero-icon')}<h2>5 билетов</h2><p>Запас для следующих походов.</p><div class="r-actions">${button(c?.price??'Покупка недоступна','return:buy','ticket',!m.purchaseAvailable||!c||m.busy)}</div></article></div>`;}
  private ask(title:string,body:string,action:()=>void,glyph='upgrade'):void{
    this.confirmAction=action;this.confirmation.hidden=false;this.modalChange(true);this.confirmation.innerHTML=`<section role="alertdialog" aria-modal="true" aria-label="${escape(title)}">${icon(glyph,'r-hero-icon')}<h2>${escape(title)}</h2><p>${escape(body)}</p><div class="r-actions">${button('Подтвердить','confirm','check',false,'primary')}${button('Отмена','cancel')}</div></section>`;this.confirmation.querySelector<HTMLElement>('button')?.focus();
  }
  private cancel():void{this.confirmation.hidden=true;this.confirmation.innerHTML='';this.confirmAction=null;this.modalChange(!!this.screen);}
  private offer():void{
    const m=this.state.monetization,o=m.offer,key=JSON.stringify([o,m.busy,m.enabled]);
    if(key===this.lastOffer)return;this.lastOffer=key;
    this.chestReward.hidden=o?.placement!=='chest_reward';
    if(o?.placement==='chest_reward'){
      this.chestReward.innerHTML=`<section aria-label="Бонус открытого сундука"><strong>Базовая награда получена</strong><p>${escape(o.rewardText)}</p><div class="r-actions">${button('Ещё награда за рекламу','offer:watch','ad',m.busy||!m.enabled)}${button('Пропустить','offer:dismiss','close',m.busy)}</div></section>`;
      return;
    }
    this.chestReward.innerHTML='';
    if(!o){if(this.confirmation.dataset.offer){delete this.confirmation.dataset.offer;this.cancel();}return;}
    this.confirmation.dataset.offer='true';this.confirmation.hidden=false;this.modalChange(true);
    this.confirmation.innerHTML=`<section role="alertdialog" aria-modal="true" aria-label="${escape(o.title)}">${icon(o.placement==='death_revive'?'revive':o.placement==='boss_reward'?'boss':'chest','r-hero-icon')}<h2>${escape(o.title)}</h2><p>${escape(o.description)}</p><p style="color:#ecd28f">${escape(o.rewardText)}</p><div class="r-actions">${button(o.placement==='death_revive'?'Возродиться':o.placement==='boss_respawn'?'Возродить босса':'Получить награду','offer:watch','ad',m.busy||!m.enabled,'primary')}${button(o.placement==='death_revive'?'В поселение':o.placement==='boss_respawn'?'Пропустить':'Продолжить','offer:dismiss','arrow',m.busy)}</div><small>Дополнительная награда за просмотр рекламы</small></section>`;this.confirmation.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
  }
  private click=(event:MouseEvent):void=>{
    const target=(event.target as Element).closest<HTMLButtonElement>('[data-action]');if(!target||target.disabled)return;
    gameAudio.unlock();gameAudio.play('ui');const [action,...rest]=target.dataset.action!.split(':'),arg=rest.join(':');const w=this.selected();
    if(action==='story-continue'){this.hideStory();return;}
    if(action==='tutorial-next'){const step=this.activeTutorial;if(!step)return;this.hideTutorial();if(step.sequence)this.emit(E.HUD_TUTORIAL_ADVANCE_EVENT,step.id);return;}
    if(action==='tutorial-skip'){this.hideTutorial();this.emit(E.HUD_TUTORIAL_SKIP_EVENT);return;}
    if(action==='interact'){this.emit(E.HUD_WORLD_INTERACT_EVENT);return;}
    if(action==='open'){this.open(arg as Screen);return;}if(action==='close'){this.close();return;}
    if(action==='tab'){this.tab=arg;this.renderPanel();return;}if(action==='slot'){this.selectedSlot=Number(arg);this.renderPanel();return;}
    if(action==='weapon-type'){this.weaponFilter=arg;const first=this.state.character.inventory.filter(w=>arg==='all'||w.weaponId===arg).sort((a,b)=>weaponHitDamage(b)-weaponHitDamage(a))[0];if(first)this.selectedWeapon=this.weaponKey(first);this.renderPanel();return;}if(action==='weapon'){this.selectedWeapon=arg;this.renderPanel();return;}if(action==='entry'){this.selectedEntry=arg;this.eliteView=this.rankFilter==='elite';this.renderPanel();return;}
    if(action==='region-filter'){this.regionFilter=arg;this.selectedEntry='';this.renderPanel();return;}
    if(action==='entry-back'){this.selectedEntry='';this.renderPanel();return;}if(action==='elite-view'){this.eliteView=!this.eliteView;this.renderPanel();return;}
    if(action==='confirm'){const fn=this.confirmAction;this.cancel();fn?.();return;}if(action==='cancel'){this.cancel();return;}
    if(action==='sell'){const id=arg as SellableResource,amount=Math.max(1,Math.min(this.state.gathering.storage[id]??0,this.saleAmounts[id]??10));this.ask('Продать ресурс',`${resourceNames[id]} ×${amount} → ${amount*RESOURCE_SALE_PRICES[id]} монет. Ресурс будет списан со склада.`,()=>this.emit(E.HUD_RESOURCE_SELL_EVENT,id,amount),'coins');return;}
    if(action==='offer'){this.emit(E.HUD_MONETIZATION_ACTION_EVENT,arg,this.state.monetization.offer?.placement);return;}
    if(action==='auth'){void requestYandexAuthorization().then(()=>this.renderPanel());return;}
    if(action==='equip'&&w){this.emit(E.HUD_WEAPON_SLOT_EQUIP_EVENT,this.selectedSlot,w.weaponId,w.rarity,w.stars);return;}
    if(action==='primary'){this.emit(E.HUD_WEAPON_SLOT_PRIMARY_EVENT,this.selectedSlot);return;}if(action==='unequip'){this.emit(E.HUD_WEAPON_SLOT_CLEAR_EVENT,this.selectedSlot);return;}
    if(action==='upgrade'&&w){this.emit(E.HUD_WEAPON_VARIANT_SELECT_EVENT,w.weaponId,w.rarity,w.stars);this.emit(E.HUD_WEAPON_UPGRADE_EVENT,w.weaponId);return;}
    if(action==='fuse'&&w){this.ask('Слияние оружия',`Два экземпляра «${WEAPON_DEFINITIONS[w.weaponId].name}» (${w.stars} звёзд) станут одним с ${w.stars+1} звёздами. Материалы будут списаны со склада.`,()=>this.emit(E.HUD_WEAPON_FUSE_EVENT,w.weaponId,w.rarity,w.stars),'fusion');return;}
    if(action==='purchase'){const product=this.state.premium.purchaseCatalog[arg];this.ask('Открыть покупку',`${product?.title??arg} · ${product?.price??''}. Окончательное подтверждение — в окне Яндекса.`,()=>this.emit(E.HUD_PREMIUM_PURCHASE_EVENT,arg),'shop');return;}
    if(action==='chest'){const [tier,mode]=arg.split(',');if(mode==='gems')this.ask('Открыть сундук',`Стоимость: ${SKIN_CHESTS[tier as keyof typeof SKIN_CHESTS].gemCost} самоцветов.`,()=>this.emit(E.HUD_SKIN_CHEST_OPEN_EVENT,tier,mode),'chest');else this.emit(E.HUD_SKIN_CHEST_OPEN_EVENT,tier,mode);return;}
    if(action==='shard'){const offer=this.state.premium.shardShopOffers.find(o=>o.slot===Number(arg))!;this.ask('Купить фрагменты',`${offer.fragments} фрагментов за ${offer.gemCost} самоцветов.`,()=>this.emit(E.HUD_SHARD_SHOP_BUY_EVENT,Number(arg)),'gems');return;}
    if(action==='pet'||action==='theme'){const owned=action==='pet'?this.state.premium.ownedPets:this.state.premium.ownedSettlementThemes;const ev=action==='pet'?E.HUD_PET_EVENT:E.HUD_SETTLEMENT_THEME_EVENT;const def=action==='pet'?PETS[arg as keyof typeof PETS]:SETTLEMENT_THEMES[arg as keyof typeof SETTLEMENT_THEMES];if(owned.includes(arg))this.emit(ev,arg);else this.ask('Открыть навсегда',`${def.name} · ${def.gemCost} самоцветов.`,()=>this.emit(ev,arg),'gems');return;}
    const actions:Record<string,[string,...unknown[]]>={potion:[E.HUD_HEALTH_POTION_EVENT],repair:[E.HUD_FORGE_REPAIR_EVENT],train:[E.HUD_PLAYER_UPGRADE_EVENT,arg],mastery:[E.HUD_MASTERY_SPEND_EVENT,arg],claim:[E.HUD_BESTIARY_CLAIM_EVENT,arg],collect:[E.HUD_CITY_COLLECT_EVENT],double:[E.HUD_CITY_PRODUCTION_DOUBLE_EVENT],building:[E.HUD_CITY_UPGRADE_EVENT,arg],blessing:[E.HUD_BLESSING_EVENT,arg],supply:[E.HUD_SUPPLY_EVENT,arg],'boss-respawn':[E.HUD_BOSS_RESPAWN_EVENT],skin:[E.HUD_SKIN_EQUIP_EVENT,arg||null],return:[E.HUD_RETURN_HOME_EVENT,arg]};
    const call=actions[action];if(call)this.emit(...call);
  };
  private showTooltip=(event:Event):void=>{
    const target=(event.target as Element).closest<HTMLElement>('[title],[data-tip]');if(!target)return;
    const text=target.title||target.dataset.tip;if(!text)return;target.dataset.tip=text;target.removeAttribute('title');target.setAttribute('aria-describedby',this.tooltip.id);
    this.tooltip.textContent=text;this.tooltip.hidden=false;const rect=target.getBoundingClientRect();
    this.tooltip.style.left=Math.max(8,Math.min(innerWidth-this.tooltip.offsetWidth-8,rect.left+rect.width/2-this.tooltip.offsetWidth/2))+'px';
    this.tooltip.style.top=(rect.bottom+this.tooltip.offsetHeight+12<innerHeight?rect.bottom+8:Math.max(8,rect.top-this.tooltip.offsetHeight-8))+'px';
  };
  private hideTooltip=():void=>{this.tooltip.hidden=true;};
  private input=(event:Event):void=>{const el=event.target as HTMLInputElement;if(el.dataset.saleQuantity){this.change(event);return;}if(el.dataset.filter==='search'){this.search=el.value;const cursor=el.selectionStart;this.renderPanel();const next=this.overlay.querySelector<HTMLInputElement>('[data-filter="search"]');next?.focus();if(cursor!==null)next?.setSelectionRange(cursor,cursor);} };
  private change=(event:Event):void=>{const el=event.target as HTMLInputElement;
    if(el.dataset.saleQuantity){const id=el.dataset.saleQuantity as SellableResource;this.saleAmounts[id]=Math.max(1,Math.min(this.state.gathering.storage[id]??0,Math.floor(Number(el.value)||1)));this.renderPanel();}
    if(el.dataset.filter){if(el.dataset.filter==='region')this.regionFilter=el.value;if(el.dataset.filter==='rank')this.rankFilter=el.value;if(el.dataset.filter==='weapon-sort')this.weaponSort=el.value;this.renderPanel();}
    if(el.dataset.audio){gameAudio.configure({...gameAudio.settings,[el.dataset.audio]:el.type==='checkbox'?el.checked:Number(el.value)});this.emit(E.HUD_AUDIO_SETTINGS_CHANGE_EVENT,gameAudio.settings);}
  };
  private platform=():void=>{if(this.screen==='settings')this.renderPanel();};
  private keydown=(event:KeyboardEvent):void=>{
    if(this.activeStory){
      if((event.code==='Enter'||event.code==='Space'||event.code==='Escape')&&!event.repeat){event.preventDefault();this.storyPanel.querySelector<HTMLButtonElement>('[data-action="story-continue"]')?.click();}
      event.stopImmediatePropagation();return;
    }
    if(this.activeTutorial){
      if(event.code==='Tab'){const focusables=[...this.tutorialPanel.querySelectorAll<HTMLElement>('button:not(:disabled)')];const index=focusables.indexOf(document.activeElement as HTMLElement);if(focusables.length){event.preventDefault();focusables[(index+(event.shiftKey?-1:1)+focusables.length)%focusables.length].focus();}}
      else if((event.code==='Enter'||event.code==='Space')&&!event.repeat){event.preventDefault();this.tutorialPanel.querySelector<HTMLButtonElement>('[data-action="tutorial-next"]')?.click();}
      event.stopImmediatePropagation();return;
    }
    if(document.querySelector('.world-map-modal:not([hidden])'))return;
    if(event.code==='Escape'&&this.hasOpenPanel){event.preventDefault();event.stopImmediatePropagation();if(!this.confirmation.hidden){if(this.confirmation.dataset.offer)return;this.cancel();}else this.close();return;}
    if(this.hasOpenPanel){
      if(event.code==='Tab'){const host=this.confirmation.hidden?this.overlay:this.confirmation;const focusables=[...host.querySelectorAll<HTMLElement>('button:not(:disabled),input,select')].filter(e=>e.offsetParent!==null);const index=focusables.indexOf(document.activeElement as HTMLElement);if(focusables.length){event.preventDefault();focusables[(index+(event.shiftKey?-1:1)+focusables.length)%focusables.length].focus();}}
      event.stopPropagation();return;
    }
    if(event.repeat)return;
    if(event.code==='KeyE'){event.preventDefault();event.stopImmediatePropagation();this.emit(E.HUD_WORLD_INTERACT_EVENT);return;}
    const keys:Record<string,Screen>={KeyP:'character',KeyB:'bestiary',KeyC:'city',KeyM:'shop',KeyI:'inventory',KeyJ:'quests'};
    if(keys[event.code]){event.preventDefault();event.stopImmediatePropagation();this.open(keys[event.code]);}
    else if(event.code==='KeyQ')this.emit(E.HUD_HEALTH_POTION_EVENT);
  };
  destroy():void{this.disposed=true;for(const timer of this.timerIds)clearTimeout(timer);window.removeEventListener('keydown',this.keydown,true);window.removeEventListener('resize',this.positionTutorial);window.removeEventListener(YANDEX_PLATFORM_STATE_EVENT,this.platform);this.tutorialSpotlight.remove();this.storyOverlay.remove();this.root.remove();this.onModal(false);}
}
