export type WeaponId =
  | 'blade'
  | 'bow';

export type WeaponKind =
  | 'melee'
  | 'ranged';

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  kind: WeaponKind;
  damage: number;
  range: number;
  cooldownMs: number;
  projectileSpeed?: number;
};

export const WEAPON_DEFINITIONS:
  Record<WeaponId, WeaponDefinition> = {
  blade: {
    id: 'blade',
    name: 'Меч',
    kind: 'melee',
    damage: 34,
    range: 126,
    cooldownMs: 480,
  },
  bow: {
    id: 'bow',
    name: 'Лук',
    kind: 'ranged',
    damage: 25,
    range: 390,
    cooldownMs: 720,
    projectileSpeed: 680,
  },
};
