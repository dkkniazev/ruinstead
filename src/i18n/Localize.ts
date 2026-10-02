import { getLanguage } from './I18n';
import { ENGLISH_CATALOG } from './EnglishCatalog';

const normalize = (text: string): string => text.trim().replace(/\s+/g, ' ');
const exact = new Map(Object.entries(ENGLISH_CATALOG));
// Icons are separate DOM nodes, so an optional icon placeholder can disappear.
for (const [ru,en] of Object.entries(ENGLISH_CATALOG)) {
  const prefix=/^(?:\{\d+\}\s*)+/;
  if (prefix.test(ru) && prefix.test(en)) {
    const fragment=ru.replace(prefix,'');
    if (!/\{\d+\}/.test(fragment)) exact.set(fragment,en.replace(prefix,''));
  }
}
const quote = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries(ENGLISH_CATALOG).filter(([ru]) => /\{\d+\}/.test(ru)).map(([ru,en]) => {
  const slots: number[] = [];
  const pattern = ru.split(/(\{\d+\})/).map(part => {
    const slot = /^\{(\d+)\}$/.exec(part);
    if (!slot) return quote(part);
    slots.push(Number(slot[1])); return /^[ДКМ]\{0\}$/.test(ru) ? '(\\d+)' : '(.*?)';
  }).join('');
  return { pattern: new RegExp('^'+pattern+'$'), en, slots, weight: ru.replace(/\{\d+\}/g,'').length };
}).sort((a,b)=>b.weight-a.weight);
// Names and short phrases compose tooltips, lists, numerical counters and rewards.
const phrases = Object.entries(ENGLISH_CATALOG).filter(([ru])=>!/[{}]/.test(ru)).sort((a,b)=>b[0].length-a[0].length);
const cache = new Map<string,string>();

export function translateText(text: string): string {
  if (getLanguage() !== 'en' || !/[А-Яа-яЁё]/u.test(text)) return text;
  if (text.includes('\n')) return text.split('\n').map(translateText).join('\n');
  const cached = cache.get(text); if (cached !== undefined) return cached;
  const source = normalize(text);
  let translated = exact.get(source);
  if (translated === undefined) {
    for (const template of templates) {
      const match = template.pattern.exec(source); if (!match) continue;
      const values = new Map(template.slots.map((slot,i)=>[slot, translateText(match[i+1])]));
      translated = template.en.replace(/\{(\d+)\}/g,(_,slot)=>values.get(Number(slot))??'');
      break;
    }
  }
  if (translated === undefined) {
    translated = source.includes(' · ') ? source.split(' · ').map(translateText).join(' · ') : source;
    for (const [ru,en] of phrases) {
      if (!/[А-Яа-яЁё]/u.test(translated)) break;
      // Avoid replacing a short word inside another word or a user-entered value.
      const pattern = new RegExp('(?<![А-Яа-яЁё])'+quote(ru)+'(?![А-Яа-яЁё])','gu');
      translated = translated.replace(pattern, en);
    }
  }
  const result=text.slice(0,text.indexOf(text.trimStart()))+translated+text.slice(text.trimEnd().length);
  if(cache.size>4000)cache.clear();cache.set(text,result);
  return result;
}

/** Display boundary only: this never changes stored IDs, item definitions or inputs. */
export function localizeText<T extends string | string[] | number | null>(value: T): T {
  return (Array.isArray(value) ? value.map(translateText) : typeof value === 'string' ? translateText(value) : value) as T;
}

export function localizeDOM(root: Node): void {
  if (getLanguage() !== 'en') return;
  if (root.nodeType === Node.TEXT_NODE && root.nodeValue) root.nodeValue=translateText(root.nodeValue);
  if (root instanceof Element) {
    for (const name of ['aria-label','title','placeholder','alt']) {
      const value=root.getAttribute(name);if(value)root.setAttribute(name,translateText(value));
    }
  }
  for(const child of root.childNodes)localizeDOM(child);
}

export function localizeHTML(html: string): string {
  if (getLanguage() !== 'en' || !/[А-Яа-яЁё]/u.test(html)) return html;
  const template=document.createElement('template');template.innerHTML=html;
  localizeDOM(template.content);return template.innerHTML;
}
