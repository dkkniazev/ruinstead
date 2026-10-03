import type { CreatureShape } from './CreatureCatalog';

/** Presentation units per 25px normal combat body. A short humanoid and a
 * heavy low beast must not be fitted to the same height or inferred from an
 * arbitrary torso width. Combat radii/ranges remain owned by gameplay. */
export const CREATURE_PRESENTATION: Record<CreatureShape, { scale: number; bossCore: number }> = {
  goblin: { scale: .84, bossCore: 18 },
  rogue: { scale: 1, bossCore: 18 }, cultist: { scale: 1, bossCore: 18 },
  knight: { scale: 1.07, bossCore: 18 }, smith: { scale: 1.22, bossCore: 29 },
  ogre: { scale: 1.35, bossCore: 29 }, imp: { scale: .76, bossCore: 18 },
  gargoyle: { scale: 1.02, bossCore: 18 }, harpy: { scale: 1.05, bossCore: 18 },
  boar: { scale: 1.1, bossCore: 29 }, ram: { scale: 1.08, bossCore: 29 },
  jackal: { scale: 1.05, bossCore: 22 }, cat: { scale: 1.07, bossCore: 22 },
  hound: { scale: 1.15, bossCore: 29 }, salamander: { scale: 1.1, bossCore: 29 },
  drake: { scale: 1.13, bossCore: 29 }, wyvern: { scale: 1.2, bossCore: 29 },
  dragon: { scale: 1.6, bossCore: 29 },
  beetle: { scale: .95, bossCore: 28 }, spider: { scale: .84, bossCore: 28 },
  scorpion: { scale: 1, bossCore: 28 },
  slime: { scale: .8, bossCore: 25 }, mushroom: { scale: .94, bossCore: 25 },
  flame: { scale: .76, bossCore: 25 }, wisp: { scale: .84, bossCore: 25 },
  bat: { scale: .86, bossCore: 25 }, owl: { scale: .97, bossCore: 25 },
  sand: { scale: 1.16, bossCore: 32 }, golem: { scale: 1.2, bossCore: 32 },
  scrap: { scale: 1.15, bossCore: 32 }, treant: { scale: 1.28, bossCore: 32 },
  worm: { scale: .94, bossCore: 23 }, serpent: { scale: 1.05, bossCore: 23 },
};

export function creaturePresentationScale(shape: CreatureShape, combatRadius: number, boss: boolean): number {
  const profile=CREATURE_PRESENTATION[shape];
  // Existing boss scale is preserved; their authored bodies already have distinct mass.
  return boss ? combatRadius/profile.bossCore : combatRadius/25*profile.scale;
}
