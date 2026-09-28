export type InteractionKind='chest'|'forge'|'bridge';
export type InteractionCandidate={id:string;kind:InteractionKind;label:string;x:number;y:number;range:number;available:boolean;priority?:number};
export type InteractionPrompt=Pick<InteractionCandidate,'id'|'kind'|'label'>;

const NEAR_TIE_DISTANCE=14;

/** Availability and distance decide the single E action. Combat is not a lock. */
export function resolveWorldInteraction(position:{x:number;y:number},candidates:readonly InteractionCandidate[]):InteractionCandidate|undefined {
  let best:InteractionCandidate|undefined,bestDistance=Infinity,bestPriority=-Infinity;
  for(const candidate of candidates){
    if(!candidate.available)continue;
    const distance=Math.hypot(position.x-candidate.x,position.y-candidate.y);
    if(distance>candidate.range)continue;
    const priority=candidate.priority??0;
    if(
      !best ||
      distance<bestDistance-NEAR_TIE_DISTANCE ||
      (Math.abs(distance-bestDistance)<=NEAR_TIE_DISTANCE&&
        (priority>bestPriority||
          (priority===bestPriority&&(distance<bestDistance-.01||
            (Math.abs(distance-bestDistance)<=.01&&candidate.id<best.id)))))
    ){
      best=candidate;bestDistance=distance;bestPriority=priority;
    }
  }
  return best;
}

export function withinInteractionRange(position:{x:number;y:number},target:{x:number;y:number},range:number):boolean {
  return Math.hypot(position.x-target.x,position.y-target.y)<=range;
}
