import { localizeDOM } from '../../i18n/Localize';
/** Preserve live button nodes while combat/production numbers update. */
export function reconcileDOM(host: HTMLElement, html: string): void {
  const template=document.createElement('template');template.innerHTML=html;
  localizeDOM(template.content);
  function sync(parent:Node, source:Node):void{
    const incoming=[...source.childNodes];
    for(let i=0;i<incoming.length;i++){
      const next=incoming[i],current=parent.childNodes[i];
      if(!current){parent.appendChild(next.cloneNode(true));continue;}
      if(current.nodeType!==next.nodeType||current.nodeName!==next.nodeName){parent.replaceChild(next.cloneNode(true),current);continue;}
      if(current.nodeType===Node.TEXT_NODE){if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;continue;}
      if(current instanceof Element&&next instanceof Element){
        const samePortrait=current instanceof HTMLImageElement&&['data-model','data-primary','data-accent','data-elite','data-radius'].every(key=>current.getAttribute(key)===next.getAttribute(key));
        for(const attr of [...current.attributes])if(!next.hasAttribute(attr.name)&&!(samePortrait&&attr.name==='src'))current.removeAttribute(attr.name);
        for(const attr of [...next.attributes])if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
        sync(current,next);
      }
    }
    while(parent.childNodes.length>incoming.length)parent.lastChild?.remove();
  }
  sync(host,template.content);
}
