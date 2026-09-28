export type InteractionKind='chest'|'forge'|'bridge';
export type InteractionCandidate={id:string;kind:InteractionKind;label:string;x:number;y:number;range:number;available:boolean};
export type InteractionPrompt=Pick<InteractionCandidate,'id'|'kind'|'label'>;

/** Availability and distance decide the single E action. Combat is not a lock. */
export function resolveWorldInteraction(position:{x:number;y:number},candidates:readonly InteractionCandidate[]):InteractionCandidate|undefined {
  let nearest:InteractionCandidate|undefined,best=Infinity;
  for(const candidate of candidates){
    if(!candidate.available)continue;
    const distance=Math.hypot(position.x-candidate.x,position.y-candidate.y);
    if(distance>candidate.range)continue;
    if(distance<best-.01||(Math.abs(distance-best)<=.01&&candidate.id<(nearest?.id??''))){nearest=candidate;best=distance;}
  }
  return nearest;
}

export function withinInteractionRange(position:{x:number;y:number},target:{x:number;y:number},range:number):boolean {
  return Math.hypot(position.x-target.x,position.y-target.y)<=range;
}
