export type HumanoidShape='rogue'|'cultist'|'knight'|'ogre'|'smith'|'imp'|'gargoyle'|'harpy';
/** Skeleton anchors match the established humanoid rig; only art mass differs. */
export type HumanoidForm={width:number;headX:number;headY:number;headHeight:number;faceZ:number;
  eyeX:number;eyeY:number;eyeWidth:number;eyeHeight:number;kind:number};
export const HUMANOID_FORMS:Record<HumanoidShape,HumanoidForm>={
  rogue:{width:18,headX:20,headY:94,headHeight:21,faceZ:16,eyeX:6.8,eyeY:93,eyeWidth:3.4,eyeHeight:2.3,kind:1},
  cultist:{width:18,headX:19,headY:96,headHeight:23,faceZ:16,eyeX:6.8,eyeY:94,eyeWidth:3.4,eyeHeight:2.3,kind:2},
  knight:{width:18,headX:20,headY:94,headHeight:22,faceZ:18,eyeX:7,eyeY:94,eyeWidth:3.7,eyeHeight:1.8,kind:3},
  ogre:{width:29,headX:25,headY:96,headHeight:21,faceZ:19,eyeX:11,eyeY:96,eyeWidth:5,eyeHeight:3.1,kind:4},
  smith:{width:29,headX:23,headY:96,headHeight:22,faceZ:18,eyeX:10,eyeY:96,eyeWidth:4.3,eyeHeight:3.1,kind:5},
  imp:{width:18,headX:18,headY:94,headHeight:18,faceZ:16,eyeX:7.6,eyeY:94,eyeWidth:3.8,eyeHeight:2.8,kind:6},
  gargoyle:{width:18,headX:19,headY:96,headHeight:20,faceZ:16,eyeX:8,eyeY:96,eyeWidth:4,eyeHeight:2.4,kind:7},
  harpy:{width:18,headX:19,headY:96,headHeight:21,faceZ:16,eyeX:7.6,eyeY:95,eyeWidth:3.9,eyeHeight:2.8,kind:8},
};
export function isHumanoidShape(shape:string):shape is HumanoidShape{return Object.hasOwn(HUMANOID_FORMS,shape);}
