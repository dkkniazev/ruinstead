export type ResourceLabelCandidate={id:string;left:number;top:number;width:number;height:number;priority:number};
export type ResourceLabelPlacement={left:number;top:number};

/** Keep the current harvest/nearest node first; nearby labels use short vertical
 * callouts. Dense groups never expand icons or place text over other labels. */
export function layoutResourceLabels(labels:readonly ResourceLabelCandidate[],width:number,height:number):Map<string,ResourceLabelPlacement>{
  const result=new Map<string,ResourceLabelPlacement>(),occupied:ResourceLabelCandidate[]=[];
  const gap=3,margin=4;
  for(const label of [...labels].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id))){
    if(label.width>width-margin*2||label.height>height-margin*2)continue;
    const left=Math.max(margin,Math.min(width-margin-label.width,label.left));
    for(const row of [0,-1,-2,1,2]){
      const top=label.top+row*(label.height+gap);
      if(top<margin||top+label.height>height-margin)continue;
      if(occupied.some(other=>left<other.left+other.width+gap&&left+label.width+gap>other.left
        &&top<other.top+other.height+gap&&top+label.height+gap>other.top))continue;
      result.set(label.id,{left,top});occupied.push({...label,left,top});break;
    }
  }
  return result;
}
