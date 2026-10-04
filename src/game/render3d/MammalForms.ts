/** Authored presentation only. Combat radii, speed and rewards live elsewhere. */
export type MammalShape='boar'|'jackal'|'cat'|'hound'|'ram';
export type MammalForm={width:number;back:number;depth:number;chest:number;skull:number;
  snout:number;muzzle:number;eyeX:number;eyeY:number;eyeZ:number;ear:number;hoof:boolean};
export const MAMMAL_FORMS:Record<MammalShape,MammalForm>={
  boar:{width:29,back:58,depth:31,chest:30,skull:22,snout:59,muzzle:14,eyeX:15,eyeY:53,eyeZ:41,ear:10,hoof:true},
  jackal:{width:17,back:53,depth:29,chest:21,skull:16,snout:60,muzzle:8,eyeX:11,eyeY:51,eyeZ:40,ear:17,hoof:false},
  cat:{width:22,back:53,depth:30,chest:23,skull:19,snout:44,muzzle:9.5,eyeX:12,eyeY:51,eyeZ:40,ear:9,hoof:false},
  hound:{width:26,back:60,depth:32,chest:29,skull:22,snout:59,muzzle:11,eyeX:14,eyeY:54,eyeZ:41,ear:14,hoof:false},
  ram:{width:26,back:58,depth:28,chest:25,skull:18,snout:57,muzzle:10,eyeX:12,eyeY:53,eyeZ:40,ear:8,hoof:true},
};
export function isMammalShape(shape:string):shape is MammalShape{return Object.hasOwn(MAMMAL_FORMS,shape);}
