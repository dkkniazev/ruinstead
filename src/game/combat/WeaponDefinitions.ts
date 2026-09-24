export const WEAPON_ORDER = [
  'axe',
  'sword',
  'hammer',
  'spear',
  'daggers',
] as const;

export type WeaponId =
  (typeof WEAPON_ORDER)[number];

export type WeaponAttackStyle =
  | 'wide-slash'
  | 'slash'
  | 'smash'
  | 'thrust'
  | 'dual-slash';

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  shortName: string;
  damage: number;
  range: number;
  cooldownMs: number;
  attackStyle: WeaponAttackStyle;
};

export const WEAPON_DEFINITIONS:
  Record<WeaponId, WeaponDefinition> = {
  axe: {
    id: 'axe',
    name: 'Топор',
    shortName: 'Топор',
    damage: 42,
    range: 112,
    cooldownMs: 650,
    attackStyle: 'wide-slash',
  },
  sword: {
    id: 'sword',
    name: 'Меч',
    shortName: 'Меч',
    damage: 32,
    range: 110,
    cooldownMs: 430,
    attackStyle: 'slash',
  },
  hammer: {
    id: 'hammer',
    name: 'Молот',
    shortName: 'Молот',
    damage: 58,
    range: 105,
    cooldownMs: 900,
    attackStyle: 'smash',
  },
  spear: {
    id: 'spear',
    name: 'Копьё',
    shortName: 'Копьё',
    damage: 36,
    range: 145,
    cooldownMs: 620,
    attackStyle: 'thrust',
  },
  daggers: {
    id: 'daggers',
    name: 'Кинжалы',
    shortName: 'Кинжалы',
    damage: 19,
    range: 92,
    cooldownMs: 240,
    attackStyle: 'dual-slash',
  },
};

export function isWeaponId(
  value: unknown,
): value is WeaponId {
  return (
    typeof value === 'string' &&
    (WEAPON_ORDER as readonly string[])
      .includes(value)
  );
}
