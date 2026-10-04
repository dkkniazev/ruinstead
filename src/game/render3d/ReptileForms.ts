export type ReptileShape='salamander'|'drake'|'wyvern'|'dragon';
/** Art proportions in the established beast rig's coordinates. */
export type ReptileForm={y:number;width:number;back:number;skull:number;snout:number;eyeX:number;eyeY:number;eyeZ:number;legWidth:number};
export const REPTILE_FORMS:Record<ReptileShape,ReptileForm>={
  salamander:{y:20,width:29,back:37,skull:22,snout:57,eyeX:14,eyeY:37,eyeZ:44,legWidth:9},
  drake:{y:35,width:27,back:60,skull:22,snout:59,eyeX:14,eyeY:53,eyeZ:44,legWidth:9},
  wyvern:{y:35,width:22,back:61,skull:21,snout:58,eyeX:13,eyeY:53,eyeZ:43,legWidth:8},
  dragon:{y:35,width:34,back:67,skull:26,snout:65,eyeX:17,eyeY:55,eyeZ:47,legWidth:11},
};
export function isReptileShape(shape:string):shape is ReptileShape{return Object.hasOwn(REPTILE_FORMS,shape);}
