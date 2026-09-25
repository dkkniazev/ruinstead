import type {
  WeaponId,
} from '../combat/WeaponDefinitions';
import type {
  RegionId,
} from './ReleaseRegionMap';

export type ReleaseEnemyArchetype =
  | 'fast'
  | 'melee'
  | 'tank'
  | 'ranged'
  | 'charger';

export type ReleaseSpeciesDefinition = {
  id: string;
  region: RegionId;
  name: string;
  eliteName: string;
  archetype: ReleaseEnemyArchetype;
  primaryColor: number;
  accentColor: number;
};

export type ReleaseBossDefinition = {
  id: string;
  region: RegionId;
  name: string;
  isMain: boolean;
  specialBoss?: boolean;
  weaknessWeaponId: WeaponId;
  resistanceWeaponId: WeaponId;
  weaponDrop?: WeaponId;
};

export const REGION_WEAPON_PROFILES:
  Record<
    RegionId,
    {
      weakness: WeaponId;
      resistance: WeaponId;
    }
  > = {
  1: { weakness: 'daggers', resistance: 'spear' },
  2: { weakness: 'hammer', resistance: 'axe' },
  3: { weakness: 'spear', resistance: 'daggers' },
  4: { weakness: 'sword', resistance: 'hammer' },
  5: { weakness: 'axe', resistance: 'sword' },
  6: { weakness: 'daggers', resistance: 'spear' },
  7: { weakness: 'hammer', resistance: 'axe' },
  8: { weakness: 'sword', resistance: 'hammer' },
};

export const RELEASE_SPECIES:
  readonly ReleaseSpeciesDefinition[] = [
  { id: 'goblin', region: 1, name: 'Гоблин', eliteName: 'Хобгоблин', archetype: 'melee', primaryColor: 0x6cab4a, accentColor: 0x7a4b8c },
  { id: 'slime', region: 1, name: 'Слизень', eliteName: 'Старший слизень', archetype: 'fast', primaryColor: 0x59a7ef, accentColor: 0x86c7ff },
  { id: 'boar', region: 1, name: 'Кабан', eliteName: 'Вожак кабанов', archetype: 'charger', primaryColor: 0x965c3f, accentColor: 0xc17b55 },
  { id: 'mushroom', region: 1, name: 'Грибник', eliteName: 'Старший грибник', archetype: 'ranged', primaryColor: 0x9f62c2, accentColor: 0xee6e7a },
  { id: 'beetle', region: 1, name: 'Панцирник', eliteName: 'Матёрый панцирник', archetype: 'tank', primaryColor: 0x3a7e9e, accentColor: 0x68abc6 },

  { id: 'dust-jackal', region: 2, name: 'Пыльный шакал', eliteName: 'Вожак шакалов', archetype: 'fast', primaryColor: 0xb57a43, accentColor: 0xe2b56d },
  { id: 'sandling', region: 2, name: 'Песчаник', eliteName: 'Древний песчаник', archetype: 'tank', primaryColor: 0xc6aa72, accentColor: 0xf0d49a },
  { id: 'sun-scorpion', region: 2, name: 'Солнечный скорпион', eliteName: 'Золотой скорпион', archetype: 'charger', primaryColor: 0xc47a2b, accentColor: 0xf5c74c },
  { id: 'ruin-gargoyle', region: 2, name: 'Руинный страж', eliteName: 'Крылатый страж', archetype: 'tank', primaryColor: 0x77756f, accentColor: 0xb9a879 },
  { id: 'emberling', region: 2, name: 'Искровик', eliteName: 'Пылающий искровик', archetype: 'melee', primaryColor: 0xc64c2f, accentColor: 0xffb742 },

  { id: 'shadow-bandit', region: 3, name: 'Сумрачный разбойник', eliteName: 'Ночной душегуб', archetype: 'melee', primaryColor: 0x4e5262, accentColor: 0x9b6ba7 },
  { id: 'cave-bat', region: 3, name: 'Пещерный нетопырь', eliteName: 'Кровавый нетопырь', archetype: 'fast', primaryColor: 0x4b485c, accentColor: 0x8e769f },
  { id: 'venom-spider', region: 3, name: 'Ядовитый паук', eliteName: 'Матка перевала', archetype: 'charger', primaryColor: 0x49573d, accentColor: 0x8fba5f },
  { id: 'cliff-stalker', region: 3, name: 'Скальный охотник', eliteName: 'Старший охотник', archetype: 'fast', primaryColor: 0x59605d, accentColor: 0x9ca69d },
  { id: 'dusk-wisp', region: 3, name: 'Сумеречный огонёк', eliteName: 'Безлунный огонёк', archetype: 'ranged', primaryColor: 0x596c87, accentColor: 0x9fb9e5 },

  { id: 'fire-imp', region: 4, name: 'Огненный бес', eliteName: 'Пламенный бес', archetype: 'fast', primaryColor: 0xb94a2d, accentColor: 0xffa23e },
  { id: 'magma-hound', region: 4, name: 'Магмовый пёс', eliteName: 'Адский гончий', archetype: 'charger', primaryColor: 0x713d32, accentColor: 0xff6c31 },
  { id: 'obsidian-beetle', region: 4, name: 'Обсидиановый жук', eliteName: 'Чёрный панцирник', archetype: 'tank', primaryColor: 0x322f39, accentColor: 0x9c5b56 },
  { id: 'cinder-cultist', region: 4, name: 'Культист пепла', eliteName: 'Жрец пепла', archetype: 'ranged', primaryColor: 0x62403d, accentColor: 0xd17956 },
  { id: 'lava-elemental', region: 4, name: 'Лавовый элементаль', eliteName: 'Сердце лавы', archetype: 'tank', primaryColor: 0x7a3529, accentColor: 0xff8839 },

  { id: 'harpy', region: 5, name: 'Горная гарпия', eliteName: 'Штормовая гарпия', archetype: 'fast', primaryColor: 0x8e8b76, accentColor: 0xd6d1b0 },
  { id: 'stone-elemental', region: 5, name: 'Каменный элементаль', eliteName: 'Древний монолит', archetype: 'tank', primaryColor: 0x77796c, accentColor: 0xc6c9a9 },
  { id: 'mountain-cat', region: 5, name: 'Горный хищник', eliteName: 'Белогривый хищник', archetype: 'charger', primaryColor: 0x8f7f68, accentColor: 0xd5c5a7 },
  { id: 'gale-spirit', region: 5, name: 'Дух ветра', eliteName: 'Дух бури', archetype: 'ranged', primaryColor: 0x7d9aa0, accentColor: 0xd2eef0 },
  { id: 'cliff-ram', region: 5, name: 'Скальный баран', eliteName: 'Камнерог', archetype: 'melee', primaryColor: 0x756b5c, accentColor: 0xcbb88d },

  { id: 'salamander', region: 6, name: 'Саламандра', eliteName: 'Раскалённая саламандра', archetype: 'fast', primaryColor: 0x9b4c38, accentColor: 0xf69a52 },
  { id: 'ash-cultist', region: 6, name: 'Культист русел', eliteName: 'Пепельный пророк', archetype: 'ranged', primaryColor: 0x5f4c4a, accentColor: 0xb47c62 },
  { id: 'ravine-scorpion', region: 6, name: 'Овражный скорпион', eliteName: 'Багровый скорпион', archetype: 'charger', primaryColor: 0x7d4a3d, accentColor: 0xdc7953 },
  { id: 'crystal-wisp', region: 6, name: 'Кристальный огонёк', eliteName: 'Призматический огонёк', archetype: 'ranged', primaryColor: 0x537f87, accentColor: 0x8fe5ef },
  { id: 'ember-drake', region: 6, name: 'Угольный дракончик', eliteName: 'Пепельный дракончик', archetype: 'melee', primaryColor: 0x704036, accentColor: 0xe97748 },

  { id: 'canyon-raider', region: 7, name: 'Каньонный налётчик', eliteName: 'Главарь налётчиков', archetype: 'melee', primaryColor: 0x76523d, accentColor: 0xc3945f },
  { id: 'badland-jackal', region: 7, name: 'Степной шакал', eliteName: 'Костяной шакал', archetype: 'fast', primaryColor: 0x8b684a, accentColor: 0xd4ad73 },
  { id: 'sand-worm', region: 7, name: 'Песчаный червь', eliteName: 'Старший червь', archetype: 'tank', primaryColor: 0x9b6e48, accentColor: 0xe0b06d },
  { id: 'scrap-golem', region: 7, name: 'Ломовой голем', eliteName: 'Железный голем', archetype: 'tank', primaryColor: 0x66625c, accentColor: 0xaa8d6b },
  { id: 'dust-vulture', region: 7, name: 'Пыльный стервятник', eliteName: 'Краснокрыл', archetype: 'ranged', primaryColor: 0x80664f, accentColor: 0xc6a270 },

  { id: 'fire-cultist', region: 8, name: 'Огненный культист', eliteName: 'Драконий жрец', archetype: 'ranged', primaryColor: 0x673a37, accentColor: 0xf36e3f },
  { id: 'drake', region: 8, name: 'Дрейк', eliteName: 'Багровый дрейк', archetype: 'charger', primaryColor: 0x663a32, accentColor: 0xdb623e },
  { id: 'wyvern', region: 8, name: 'Виверна', eliteName: 'Королевская виверна', archetype: 'fast', primaryColor: 0x563847, accentColor: 0xb45a72 },
  { id: 'magma-serpent', region: 8, name: 'Магмовый змей', eliteName: 'Древний магмовый змей', archetype: 'tank', primaryColor: 0x713326, accentColor: 0xff7730 },
  { id: 'dragon-guard', region: 8, name: 'Драконий страж', eliteName: 'Первый страж', archetype: 'melee', primaryColor: 0x4e3634, accentColor: 0xc75a42 },
] as const;

export const RELEASE_BOSSES:
  readonly ReleaseBossDefinition[] = [
  { id: 'moss-ogre', region: 1, name: 'Мшистый громила', isMain: false, weaknessWeaponId: 'sword', resistanceWeaponId: 'spear', weaponDrop: 'axe' },
  { id: 'crystal-boar', region: 1, name: 'Кристальный вепрь', isMain: false, weaknessWeaponId: 'hammer', resistanceWeaponId: 'sword', weaponDrop: 'axe' },
  { id: 'root-colossus', region: 1, name: 'Корневой колосс', isMain: true, weaknessWeaponId: 'spear', resistanceWeaponId: 'hammer', weaponDrop: 'daggers' },

  { id: 'ash-matriarch', region: 2, name: 'Пепельная матриархиня', isMain: false, weaknessWeaponId: 'spear', resistanceWeaponId: 'hammer', weaponDrop: 'daggers' },
  { id: 'prism-golem', region: 2, name: 'Призменный голем', isMain: false, weaknessWeaponId: 'hammer', resistanceWeaponId: 'axe', weaponDrop: 'daggers' },
  { id: 'sun-tyrant', region: 2, name: 'Солнечный тиран', isMain: true, weaknessWeaponId: 'sword', resistanceWeaponId: 'spear', weaponDrop: 'hammer' },

  { id: 'night-stalker', region: 3, name: 'Ночной преследователь', isMain: false, weaknessWeaponId: 'hammer', resistanceWeaponId: 'daggers', weaponDrop: 'hammer' },
  { id: 'venom-matriarch', region: 3, name: 'Ядовитая матка', isMain: false, weaknessWeaponId: 'spear', resistanceWeaponId: 'axe', weaponDrop: 'hammer' },
  { id: 'pass-warden', region: 3, name: 'Страж перевала', isMain: true, weaknessWeaponId: 'spear', resistanceWeaponId: 'daggers', weaponDrop: 'spear' },

  { id: 'cinder-smith', region: 4, name: 'Пепельный кузнец', isMain: false, weaknessWeaponId: 'spear', resistanceWeaponId: 'hammer', weaponDrop: 'spear' },
  { id: 'obsidian-beast', region: 4, name: 'Обсидиановый зверь', isMain: false, weaknessWeaponId: 'sword', resistanceWeaponId: 'axe', weaponDrop: 'spear' },
  { id: 'lava-golem', region: 4, name: 'Лавовый голем', isMain: true, specialBoss: true, weaknessWeaponId: 'sword', resistanceWeaponId: 'hammer', weaponDrop: 'sword' },

  { id: 'storm-harpy', region: 5, name: 'Штормовая гарпия', isMain: false, weaknessWeaponId: 'daggers', resistanceWeaponId: 'sword', weaponDrop: 'sword' },
  { id: 'stone-giant', region: 5, name: 'Каменный великан', isMain: false, weaknessWeaponId: 'hammer', resistanceWeaponId: 'axe', weaponDrop: 'sword' },
  { id: 'sky-lord', region: 5, name: 'Повелитель ветров', isMain: true, weaknessWeaponId: 'axe', resistanceWeaponId: 'sword', weaponDrop: 'sword' },

  { id: 'elder-salamander', region: 6, name: 'Древняя саламандра', isMain: false, weaknessWeaponId: 'spear', resistanceWeaponId: 'hammer', weaponDrop: 'sword' },
  { id: 'crystal-priest', region: 6, name: 'Кристальный жрец', isMain: false, weaknessWeaponId: 'daggers', resistanceWeaponId: 'spear', weaponDrop: 'sword' },
  { id: 'ash-serpent', region: 6, name: 'Пепельный змей', isMain: true, weaknessWeaponId: 'daggers', resistanceWeaponId: 'spear', weaponDrop: 'sword' },

  { id: 'raider-king', region: 7, name: 'Король налётчиков', isMain: false, weaknessWeaponId: 'sword', resistanceWeaponId: 'axe', weaponDrop: 'sword' },
  { id: 'great-sand-worm', region: 7, name: 'Великий песчаный червь', isMain: false, weaknessWeaponId: 'hammer', resistanceWeaponId: 'daggers', weaponDrop: 'sword' },
  { id: 'canyon-lord', region: 7, name: 'Хозяин каньона', isMain: true, weaknessWeaponId: 'hammer', resistanceWeaponId: 'axe', weaponDrop: 'sword' },

  { id: 'ancient-wyvern', region: 8, name: 'Древняя виверна', isMain: false, weaknessWeaponId: 'spear', resistanceWeaponId: 'hammer', weaponDrop: 'sword' },
  { id: 'magma-serpent-lord', region: 8, name: 'Владыка магмовых змеев', isMain: false, weaknessWeaponId: 'sword', resistanceWeaponId: 'axe', weaponDrop: 'sword' },
  { id: 'fire-dragon', region: 8, name: 'Огненный дракон', isMain: true, specialBoss: true, weaknessWeaponId: 'sword', resistanceWeaponId: 'hammer', weaponDrop: 'sword' },
] as const;

export const MAIN_BOSS_BY_REGION:
  Record<RegionId, string> = {
  1: 'root-colossus',
  2: 'sun-tyrant',
  3: 'pass-warden',
  4: 'lava-golem',
  5: 'sky-lord',
  6: 'ash-serpent',
  7: 'canyon-lord',
  8: 'fire-dragon',
};
