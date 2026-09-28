import type { SkinId } from '../cosmetics/SkinEconomy';

type Head = 'hood' | 'helm' | 'visor' | 'hat' | 'goggles' | 'mask' | 'crown';
type Shoulder = 'leaves' | 'plate' | 'fur' | 'feathers' | 'stone' | 'spikes' | 'gears';
type Crest = 'none' | 'flame' | 'feather' | 'plume' | 'horns' | 'crystal' | 'antlers' | 'sun';
type Back = 'none' | 'pack' | 'logs' | 'scrolls' | 'halo' | 'wings' | 'roots';
type Emblem = 'flame' | 'leaf' | 'gem' | 'sun' | 'gear' | 'wing' | 'crown';
export type HeroSkinStyle = {
  description: string;
  colors: { blue:number; cloth:number; steel:number; edge:number; gold:number; leather:number };
  cape: number;
  glow: number;
  head: Head;
  shoulders: Shoulder;
  crest: Crest;
  back: Back;
  emblem: Emblem;
  apron: boolean;
  capeSize: [number,number];
};

function outfit(description:string, colors:[number,number,number,number,number,number], cape:number,
  head:Head, shoulders:Shoulder, crest:Crest, back:Back, emblem:Emblem,
  options:Partial<Pick<HeroSkinStyle,'glow'|'apron'|'capeSize'>>={}):HeroSkinStyle {
  const [blue,cloth,steel,edge,gold,leather]=colors;
  return {description,colors:{blue,cloth,steel,edge,gold,leather},cape,head,shoulders,crest,back,emblem,
    glow:0,apron:false,capeSize:[1,1],...options};
}

/** Authored outfits, shared by the world rig and the collection portraits. */
export const HERO_SKIN_STYLES:Record<SkinId,HeroSkinStyle>={
  'ember-initiate':outfit('Угольный капюшон, медные застёжки и знак тлеющего пламени.',
    [0x97482e,0x453332,0x986347,0x342c2b,0xeeae62,0x553726],0xbd5b32,'hood','plate','flame','none','flame',{capeSize:[.9,.8]}),
  'moss-guard':outfit('Дубовая броня, венец из ветвей и наплечники из живых листьев.',
    [0x52794b,0x293e32,0x8ba565,0x3c503c,0xe0bb70,0x715238],0x799146,'helm','leaves','antlers','none','leaf'),
  'trail-scout':outfit('Лёгкий капюшон с пером, походный ранец и короткая синяя накидка.',
    [0x4d8095,0x294855,0x9bbcc4,0x395362,0xe1c997,0x795a3b],0x6d9cab,'hood','fur','feather','pack','wing',{capeSize:[.8,.62]}),
  'wood-runner':outfit('Широкополая шляпа, связка поленьев и кожаные наручи.',
    [0x75854d,0x464b32,0xa58a5f,0x534f35,0xe3c480,0x785237],0x8b9b57,'hat','leaves','none','logs','leaf',{capeSize:[.8,.55]}),
  'village-hand':outfit('Рабочий фартук, пояс с инструментами и защитные очки.',
    [0xb88a53,0x48494a,0x889fa6,0x414d53,0xe6c084,0x785137],0x58787a,'goggles','plate','none','none','gear',{apron:true,capeSize:[.75,.45]}),
  'bronze-raider':outfit('Чеканная бронза, рогатый шлем и алый походный плащ.',
    [0x864731,0x422e2d,0xcb8a4c,0x704634,0xffd18a,0x633b28],0xa44133,'helm','spikes','horns','none','flame'),
  'iron-heart':outfit('Закрытое забрало, широкие железные латы и сердечник на груди.',
    [0x45616f,0x2c3b44,0x9bb1bc,0x435763,0xe0b868,0x4c4140],0x416b81,'visor','plate','none','none','gem',{capeSize:[1.12,1.1]}),
  'wind-stalker':outfit('Маска странника, белые перья и тонкий бирюзовый шарф.',
    [0x4797a0,0x284e60,0xc4e5e2,0x477982,0xf0d6a5,0x62655c],0x7ccac2,'mask','feathers','feather','none','wing',{capeSize:[.68,1.1]}),
  'deep-forager':outfit('Шахтёрский фонарь, каменные накладки и рюкзак с кристаллами.',
    [0x5e7b65,0x334c46,0x9da97c,0x415752,0xf2c979,0x71593f],0x9caa6a,'goggles','stone','crystal','pack','gem',{glow:0xb8dfab,capeSize:[.75,.55]}),
  'craftsman':outfit('Медные очки, зубчатые наплечники и свитки с чертежами.',
    [0xb6753d,0x443c37,0xbfc6b9,0x5d635a,0xf0c36b,0x674630],0x72867f,'goggles','gears','none','scrolls','gear',{apron:true,capeSize:[.9,.6]}),
  'crimson-duelist':outfit('Багровая маска, высокий плюмаж и серебряные доспехи.',
    [0x96334d,0x422d42,0xd5d9e4,0x58657b,0xefc785,0x51383c],0xb72e52,'mask','plate','plume','none','gem',{capeSize:[1,1.12]}),
  'stone-bastion':outfit('Шлем-крепость, массивные каменные плечи и руна защиты.',
    [0x66776c,0x303d3c,0xa9b3a8,0x596b69,0xdcbb7a,0x59513e],0x547367,'visor','stone','horns','none','gem',{capeSize:[1.25,1.08]}),
  'gale-runner':outfit('Крылатый шлем и белые перья над морской синевой плаща.',
    [0x287f9f,0x273e62,0xd6ebed,0x4c7996,0xe8d9a7,0x53627a],0x62c0d2,'helm','feathers','feather','none','wing',{capeSize:[.85,1.16]}),
  'golden-harvester':outfit('Золотая шляпа, листовая броня и корзина трофеев.',
    [0x9b822f,0x4a5131,0xd8be6a,0x756134,0xffe6a1,0x715737],0x718842,'hat','leaves','crystal','pack','leaf',{capeSize:[.86,.68]}),
  'guild-master':outfit('Гильдейский берет, сливовый камзол и золотые знаки ремесла.',
    [0x714e8c,0x342f4c,0xc3b3ca,0x66546d,0xedc978,0x51434c],0x8964a2,'hat','gears','feather','scrolls','gear',{apron:true}),
  'void-blade':outfit('Глухая маска, обсидиановые шипы и парящий знак пустоты.',
    [0x48335e,0x23263b,0x78669a,0x343b57,0xbda8e5,0x373348],0x634185,'mask','spikes','crystal','halo','gem',{glow:0xbd83ff,capeSize:[.9,1.18]}),
  'sun-warden':outfit('Солнечный венец, кремовые латы и золотой ореол за плечами.',
    [0xd4b164,0x655144,0xffedc1,0x9b7852,0xffcc5d,0x87613c],0xe7b952,'visor','plate','sun','halo','sun',{glow:0xffcd69,capeSize:[1.18,1.12]}),
  'storm-runner':outfit('Грозовая маска, ледяной гребень и крылья из стальных перьев.',
    [0x4564a2,0x282e55,0xaccfe4,0x465980,0x97f0ee,0x424768],0x5c77c0,'mask','feathers','crystal','wings','wing',{glow:0x82e5ff,capeSize:[.64,.9]}),
  'ancient-forager':outfit('Маска лесного духа, ветвистая корона и старые корни за спиной.',
    [0x427257,0x293f39,0xa2b879,0x425b47,0xdfcc93,0x76553b],0x739954,'hood','leaves','antlers','roots','leaf',{glow:0xa8db7a,capeSize:[1,1.1]}),
  'architect':outfit('Геометрический венец, лиловая мантия и пояс древнего зодчего.',
    [0x83547b,0x3d344b,0xe0cbd9,0x745e7b,0xf4cd8a,0x635064],0xad7eab,'crown','gears','crystal','scrolls','gear',{apron:true,glow:0xedb6df,capeSize:[1.1,1.15]}),
  'phoenix-sovereign':outfit('Корона пламени и распахнутые крылья феникса в алом золоте.',
    [0xa93c2c,0x4f2833,0xe39a42,0x903f34,0xffdf87,0x69392f],0xe96530,'crown','feathers','flame','wings','flame',{glow:0xff9c40,capeSize:[1.05,1.2]}),
  'titan-warden':outfit('Рогатый шлем титана, монолитные плечи и светящийся сердечник.',
    [0x3b6a82,0x293b51,0x92b2ba,0x3f657a,0xd3c399,0x3a4a50],0x437c91,'visor','stone','horns','halo','gem',{glow:0x6fe9f2,capeSize:[1.28,1.2]}),
  'astral-runner':outfit('Звёздный капюшон, кристальная корона и двойная астральная орбита.',
    [0x645097,0x292844,0xd5c7f0,0x565b89,0xf0ddba,0x514361],0x8d6aca,'hood','feathers','crystal','halo','wing',{glow:0xbdb0ff,capeSize:[.82,1.25]}),
  'worldroot-sage':outfit('Ветви мирового древа, нефритовые листья и янтарное сердце леса.',
    [0x367351,0x283c32,0x99be79,0x395d43,0xffd28a,0x8a5b38],0x61a66d,'crown','leaves','antlers','roots','leaf',{glow:0xa6f29b,capeSize:[1.25,1.2]}),
  'ruin-king':outfit('Зубчатая корона, меховой воротник и королевский бордовый плащ.',
    [0x887143,0x412b3e,0xe5cb8a,0x806346,0xffdf8c,0x6a4942],0x873e59,'crown','fur','sun','none','crown',{glow:0xffd68a,capeSize:[1.35,1.25]}),
  'starter-warden':outfit('Нефритовый шлем хранителя, серебряные латы и длинный белый плащ.',
    [0x448778,0x2e4f54,0xc8ddd7,0x54777c,0xeccc84,0x5b6861],0xc1d6bf,'helm','plate','plume','none','sun',{capeSize:[1.1,1.1]}),
  'pass-champion':outfit('Шлем чемпиона с высоким гребнем и аметистовые боевые наплечники.',
    [0x7b3b9c,0x352a4e,0xb1a0cb,0x514776,0xe9c670,0x4e3f56],0x9754b8,'visor','spikes','plume','none','crown',{glow:0xd0a6fc,capeSize:[1.1,1.18]}),
  'ashborn':outfit('Чёрный вулканический доспех с раскалёнными разломами и угольной короной.',
    [0x634036,0x2f2d33,0x6a635e,0x373941,0xffa358,0x4d3830],0xa04f35,'mask','stone','flame','pack','flame',{glow:0xff803a,capeSize:[.9,.78]}),
  'founder-keeper':outfit('Корона основателя, синий парадный мундир и золотые печати города.',
    [0x35567b,0x29354e,0xe3c680,0x826b47,0xffe2a0,0x574943],0x344c82,'crown','gears','sun','scrolls','crown',{glow:0xffd888,apron:true,capeSize:[1.18,1.2]}),
};
