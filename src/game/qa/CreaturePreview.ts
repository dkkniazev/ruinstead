import { RELEASE_SPECIES, RELEASE_BOSSES } from '../world/ReleaseWorldContent';
import { enemyDisplayStats } from '../enemies/EnemySystem';
import { bossDisplayStats } from '../bosses/BossSystem';
import { CREATURE_CATALOG } from '../render3d/CreatureCatalog';
import { modelPortrait } from '../ui/ModelPortraits';
if(!import.meta.env.DEV)throw Error('Development preview only');
const catalog=document.querySelector('#catalog')!;
catalog.innerHTML='<header style="position:sticky;top:0;z-index:1;background:#14292bed;padding:12px"><h1 style="font-size:22px;margin:0 0 12px">Все виды · обычные / элита / боссы</h1><nav></nav></header><section style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:12px"></section>';
const grid=catalog.querySelector('section')!,nav=catalog.querySelector('nav')!;
let generation=0;
async function show(region:number){
 const token=++generation;grid.innerHTML='';
 for(const source of [...RELEASE_SPECIES,...RELEASE_BOSSES].filter(s=>region===0?'isMain' in s:s.region===region)){
  const boss='isMain' in source;
  for(const elite of boss?[false]:[false,true]){
   const stats=boss?bossDisplayStats(source.id):enemyDisplayStats(source.id,elite);
   const primary='primaryColor' in source?source.primaryColor:bossDisplayStats(source.id).primaryColor;
   const accent='accentColor' in source?source.accentColor:bossDisplayStats(source.id).accentColor;
   const card=document.createElement('article');card.style.cssText='background:#253b3e;border:1px solid #647767;border-radius:9px;overflow:hidden';
   const img=document.createElement('img');img.style.cssText='width:100%;height:205px;object-fit:contain';img.alt=source.name;
   const text=document.createElement('div');text.style.padding='12px';text.innerHTML='<b>'+(elite&&'eliteName' in source?source.eliteName:source.name)+'</b><p style="font:12px system-ui">'+source.id+' · '+CREATURE_CATALOG[source.id].shape+'<br>HP '+stats.health+' · урон '+stats.damage+' · радиус '+stats.radius.toFixed(1)+'</p>';
   card.append(img,text);grid.append(card);
   img.src=await modelPortrait(source.id,primary,accent,elite||boss,stats.radius);
   if(generation!==token)return;
  }
 }
}
for(let n=1;n<=8;n++){const b=document.createElement('button');b.textContent='Регион '+n;b.style.cssText='padding:8px 12px;margin-right:6px;background:#35574f;color:#eee3bd;border:1px solid #c2a777;border-radius:5px';b.onclick=()=>show(n);nav.append(b);}
const allBosses=document.createElement('button');allBosses.textContent='Все боссы';allBosses.style.cssText='padding:8px 12px;background:#69593c;color:#fff2ca;border:1px solid #c2a777;border-radius:5px';allBosses.onclick=()=>show(0);nav.append(allBosses);
void show(1);
