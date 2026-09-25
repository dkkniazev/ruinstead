import {
  trackAnalyticsEvent,
} from '../analytics/Analytics';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import type {
  GameState,
} from '../state/GameState';
import {
  WEAPON_DEFINITIONS,
} from '../combat/WeaponDefinitions';
import {
  REGION_WEAPON_PROFILES,
  RELEASE_BOSSES,
  RELEASE_SPECIES,
} from '../world/ReleaseWorldContent';
import {
  getRegionDefinition,
} from '../world/ReleaseRegionMap';

export type BestiaryEntryKind =
  | 'species'
  | 'boss';

export type BestiaryReward = {
  coins: number;
  wood: number;
  stone: number;
  metal: number;
  settlementXp: number;
};

export type BestiaryHudEntry = {
  entryId: string;
  kind: BestiaryEntryKind;
  entityId: string;
  discovered: boolean;
  name: string;
  eliteName: string | null;
  eliteDiscovered: boolean;
  area: string;
  weakness: string;
  resistance: string;
  dropText: string;
  texture: string;
  eliteTexture: string | null;
  kills: number;
  eliteKills: number;
  level: number;
  nextThreshold: number | null;
  progressText: string;
  claimableLevel: number | null;
  claimedLevels: number[];
  mastery: boolean;
  rewardPreview: string;
};

export type BestiaryHudState = {
  entries: BestiaryHudEntry[];
  discoveredCount: number;
  totalCount: number;
  masteryCount: number;
};

export type BestiaryMutation = {
  changed: boolean;
  notice?: string;
};

export type BestiaryClaimResult = {
  success: boolean;
  notice: string;
};

type BestiaryDefinition = {
  entryId: string;
  kind: BestiaryEntryKind;
  entityId: string;
  name: string;
  eliteName?: string;
  area: string;
  weakness: string;
  resistance: string;
  dropText: string;
  texture: string;
  eliteTexture?: string;
  thresholds:
    readonly [
      number,
      number,
      number,
      number,
      number,
    ];
};

const SPECIES_THRESHOLDS =
  [0, 10, 25, 50, 100] as const;
const BOSS_THRESHOLDS =
  [0, 1, 3, 5, 10] as const;

const LEGACY_SPECIES_TEXTURES:
  Record<
    string,
    readonly [string, string]
  > = {
  goblin: [
    'ruinstead-enemy-goblin',
    'ruinstead-enemy-hobgoblin',
  ],
  slime: [
    'ruinstead-enemy-slime',
    'ruinstead-enemy-elder-slime',
  ],
  boar: [
    'ruinstead-enemy-boar',
    'ruinstead-enemy-boar-alpha',
  ],
  mushroom: [
    'ruinstead-enemy-mushroom',
    'ruinstead-enemy-elder-mushroom',
  ],
  beetle: [
    'ruinstead-enemy-beetle',
    'ruinstead-enemy-beetle-elite',
  ],
  'dust-jackal': [
    'ruinstead-enemy-dust-jackal',
    'ruinstead-enemy-dust-jackal-elite',
  ],
  sandling: [
    'ruinstead-enemy-sandling',
    'ruinstead-enemy-sandling-elite',
  ],
  'sun-scorpion': [
    'ruinstead-enemy-sun-scorpion',
    'ruinstead-enemy-sun-scorpion-elite',
  ],
  'ruin-gargoyle': [
    'ruinstead-enemy-ruin-gargoyle',
    'ruinstead-enemy-ruin-gargoyle-elite',
  ],
  emberling: [
    'ruinstead-enemy-emberling',
    'ruinstead-enemy-emberling-elite',
  ],
};

function buildBestiaryDefinitions():
  BestiaryDefinition[] {
  const speciesEntries =
    RELEASE_SPECIES.map(
      (species) => {
        const region =
          getRegionDefinition(
            species.region,
          );
        const profile =
          REGION_WEAPON_PROFILES[
            species.region
          ];
        const textures =
          LEGACY_SPECIES_TEXTURES[
            species.id
          ] ?? [
            `ruinstead-enemy-${species.id}`,
            `ruinstead-enemy-${species.id}-elite`,
          ];

        return {
          entryId:
            `species:${species.id}`,
          kind:
            'species' as const,
          entityId:
            species.id,
          name:
            species.name,
          eliteName:
            species.eliteName,
          area:
            region.name,
          weakness:
            `${WEAPON_DEFINITIONS[profile.weakness].name} ×2`,
          resistance:
            `${WEAPON_DEFINITIONS[profile.resistance].name} ×0.5`,
          dropText:
            'Монеты · элита даёт ×4',
          texture:
            textures[0],
          eliteTexture:
            textures[1],
          thresholds:
            SPECIES_THRESHOLDS,
        };
      },
    );

  const bossEntries =
    RELEASE_BOSSES.map(
      (boss) => {
        const region =
          getRegionDefinition(
            boss.region,
          );

        return {
          entryId:
            `boss:${boss.id}`,
          kind:
            'boss' as const,
          entityId:
            boss.id,
          name:
            boss.name,
          area:
            region.name,
          weakness:
            `${WEAPON_DEFINITIONS[boss.weaknessWeaponId].name} ×2`,
          resistance:
            `${WEAPON_DEFINITIONS[boss.resistanceWeaponId].name} ×0.5`,
          dropText:
            boss.weaponDrop
              ? `Ресурсы · монеты · ${WEAPON_DEFINITIONS[boss.weaponDrop].name} Common ☆`
              : 'Ресурсы · монеты',
          texture:
            `ruinstead-boss-${boss.id}`,
          thresholds:
            BOSS_THRESHOLDS,
        };
      },
    );

  return [
    ...speciesEntries,
    ...bossEntries,
  ];
}

const DEFINITIONS:
  readonly BestiaryDefinition[] =
  buildBestiaryDefinitions();

export class BestiarySystem {
  constructor(
    private readonly state:
      GameState,
  ) {}

  reconcileLegacyBosses():
    boolean {
    let changed = false;

    for (
      const bossId of
      this.state.world
        .defeatedBosses
    ) {
      const definition =
        findDefinition(
          'boss',
          bossId,
        );

      if (!definition) {
        continue;
      }

      if (
        !this.state.bestiary
          .discoveredBosses
          .includes(bossId)
      ) {
        this.state.bestiary
          .discoveredBosses
          .push(bossId);
        changed = true;
      }

      if (
        (
          this.state.bestiary
            .bossKills[bossId] ??
          0
        ) < 1
      ) {
        this.state.bestiary
          .bossKills[bossId] = 1;
        changed = true;
      }
    }

    return changed;
  }

  recordEncounter(
    kind: BestiaryEntryKind,
    entityId: string,
    elite = false,
  ): BestiaryMutation {
    const definition =
      findDefinition(
        kind,
        entityId,
      );

    if (!definition) {
      return {
        changed: false,
      };
    }

    const beforeLevel =
      this.getLevel(
        definition,
      );
    let changed = false;
    let newlyDiscovered =
      false;

    if (
      kind === 'species'
    ) {
      if (
        !this.state.bestiary
          .discoveredSpecies
          .includes(entityId)
      ) {
        this.state.bestiary
          .discoveredSpecies
          .push(entityId);
        changed = true;
        newlyDiscovered = true;
      }

      if (
        elite &&
        !this.state.bestiary
          .discoveredElites
          .includes(entityId)
      ) {
        this.state.bestiary
          .discoveredElites
          .push(entityId);
        changed = true;
      }
    } else if (
      !this.state.bestiary
        .discoveredBosses
        .includes(entityId)
    ) {
      this.state.bestiary
        .discoveredBosses
        .push(entityId);
      changed = true;
      newlyDiscovered = true;
    }

    if (!changed) {
      return {
        changed: false,
      };
    }

    if (newlyDiscovered) {
      trackAnalyticsEvent(
        'bestiary_discovered',
        {
          entryId:
            definition.entryId,
          kind,
        },
      );
    }

    const afterLevel =
      this.getLevel(
        definition,
      );

    this.trackLevelUps(
      definition,
      beforeLevel,
      afterLevel,
    );

    return {
      changed: true,
      notice:
        newlyDiscovered
          ? `Бестиарий: открыто — ${definition.name}`
          : elite
            ? `Бестиарий: открыта элитная форма — ${definition.eliteName ?? definition.name}`
            : undefined,
    };
  }

  recordKill(
    kind: BestiaryEntryKind,
    entityId: string,
    elite = false,
  ): BestiaryMutation {
    const definition =
      findDefinition(
        kind,
        entityId,
      );

    if (!definition) {
      return {
        changed: false,
      };
    }

    const beforeLevel =
      this.getLevel(
        definition,
      );

    this.recordEncounter(
      kind,
      entityId,
      elite,
    );

    if (
      kind === 'species'
    ) {
      this.state.bestiary
        .speciesKills[
          entityId
        ] =
        (
          this.state.bestiary
            .speciesKills[
              entityId
            ] ?? 0
        ) + 1;

      if (elite) {
        this.state.bestiary
          .eliteKills[
            entityId
          ] =
          (
            this.state.bestiary
              .eliteKills[
                entityId
              ] ?? 0
          ) + 1;
      }
    } else {
      this.state.bestiary
        .bossKills[
          entityId
        ] =
        (
          this.state.bestiary
            .bossKills[
              entityId
            ] ?? 0
        ) + 1;
    }

    const afterLevel =
      this.getLevel(
        definition,
      );

    this.trackLevelUps(
      definition,
      beforeLevel,
      afterLevel,
    );

    return {
      changed: true,
      notice:
        afterLevel >
        beforeLevel
          ? `Бестиарий: ${definition.name} — уровень изучения ${afterLevel}`
          : undefined,
    };
  }

  claimNextReward(
    entryId: string,
  ): BestiaryClaimResult {
    const definition =
      DEFINITIONS.find(
        (entry) =>
          entry.entryId ===
          entryId,
      );

    if (!definition) {
      return {
        success: false,
        notice:
          'Запись бестиария не найдена',
      };
    }

    const level =
      this.getLevel(
        definition,
      );
    const claimed =
      this.getClaimedLevels(
        entryId,
      );
    const claimable =
      firstUnclaimedLevel(
        level,
        claimed,
      );

    if (!claimable) {
      return {
        success: false,
        notice:
          'Нет доступной награды',
      };
    }

    const reward =
      getReward(
        definition.kind,
        claimable,
      );

    this.state.resources.coins +=
      reward.coins;
    this.state.resources.wood +=
      reward.wood;
    this.state.resources.stone +=
      reward.stone;
    this.state.resources.metal +=
      reward.metal;
    this.state.progression
      .settlementXp +=
        reward.settlementXp;

    const nextClaimed =
      [...claimed, claimable]
        .sort(
          (a, b) => a - b,
        );

    this.state.bestiary
      .claimedLevels[
        entryId
      ] =
        nextClaimed;

    trackAnalyticsEvent(
      'bestiary_reward_claimed',
      {
        entryId,
        kind:
          definition.kind,
        level:
          claimable,
      },
    );

    return {
      success: true,
      notice:
        `Бестиарий: награда ${definition.name} Lv.${claimable} получена — ${formatReward(reward)}`,
    };
  }

  getHudState():
    BestiaryHudState {
    const entries =
      DEFINITIONS.map(
        (definition) =>
          this.toHudEntry(
            definition,
          ),
      );

    return {
      entries,
      discoveredCount:
        entries.filter(
          (entry) =>
            entry.discovered,
        ).length,
      totalCount:
        entries.length,
      masteryCount:
        entries.filter(
          (entry) =>
            entry.mastery,
        ).length,
    };
  }

  private toHudEntry(
    definition:
      BestiaryDefinition,
  ): BestiaryHudEntry {
    const discovered =
      this.isDiscovered(
        definition,
      );
    const kills =
      this.getKills(
        definition,
      );
    const eliteKills =
      definition.kind ===
        'species'
        ? this.state.bestiary
            .eliteKills[
              definition.entityId
            ] ?? 0
        : 0;
    const level =
      this.getLevel(
        definition,
      );
    const claimed =
      this.getClaimedLevels(
        definition.entryId,
      );
    const claimableLevel =
      firstUnclaimedLevel(
        level,
        claimed,
      );
    const nextThreshold =
      level >= 5
        ? null
        : definition
            .thresholds[level];

    const rewardLevel =
      claimableLevel ??
      (
        level < 5
          ? level + 1
          : 5
      );

    return {
      entryId:
        definition.entryId,
      kind:
        definition.kind,
      entityId:
        definition.entityId,
      discovered,
      name:
        discovered
          ? definition.name
          : '???',
      eliteName:
        definition.kind ===
        'species'
          ? this.state.bestiary
              .discoveredElites
              .includes(
                definition.entityId,
              )
            ? definition.eliteName ??
              null
            : '???'
          : null,
      eliteDiscovered:
        definition.kind ===
          'species' &&
        this.state.bestiary
          .discoveredElites
          .includes(
            definition.entityId,
          ),
      area:
        discovered
          ? definition.area
          : 'Неизвестно',
      weakness:
        discovered
          ? definition.weakness
          : 'Неизвестно',
      resistance:
        discovered
          ? definition.resistance
          : 'Неизвестно',
      dropText:
        discovered
          ? definition.dropText
          : 'Неизвестно',
      texture:
        definition.texture,
      eliteTexture:
        definition.eliteTexture ??
        null,
      kills,
      eliteKills,
      level,
      nextThreshold,
      progressText:
        !discovered
          ? 'Не обнаружен'
          : level >= 5
            ? `${kills} убийств · MASTER`
            : `${kills} / ${nextThreshold} убийств`,
      claimableLevel,
      claimedLevels:
        claimed,
      mastery:
        level >= 5,
      rewardPreview:
        formatReward(
          getReward(
            definition.kind,
            rewardLevel,
          ),
        ),
    };
  }

  private getLevel(
    definition:
      BestiaryDefinition,
  ): number {
    if (
      !this.isDiscovered(
        definition,
      )
    ) {
      return 0;
    }

    const kills =
      this.getKills(
        definition,
      );

    let level = 1;

    for (
      let index = 1;
      index <
        definition.thresholds
          .length;
      index += 1
    ) {
      if (
        kills >=
        definition
          .thresholds[index]
      ) {
        level =
          index + 1;
      }
    }

    return level;
  }

  private getKills(
    definition:
      BestiaryDefinition,
  ): number {
    return definition.kind ===
      'species'
      ? this.state.bestiary
          .speciesKills[
            definition.entityId
          ] ?? 0
      : this.state.bestiary
          .bossKills[
            definition.entityId
          ] ?? 0;
  }

  private isDiscovered(
    definition:
      BestiaryDefinition,
  ): boolean {
    return definition.kind ===
      'species'
      ? this.state.bestiary
          .discoveredSpecies
          .includes(
            definition.entityId,
          )
      : this.state.bestiary
          .discoveredBosses
          .includes(
            definition.entityId,
          );
  }

  private getClaimedLevels(
    entryId: string,
  ): number[] {
    return [
      ...(
        this.state.bestiary
          .claimedLevels[
            entryId
          ] ?? []
      ),
    ];
  }

  private trackLevelUps(
    definition:
      BestiaryDefinition,
    beforeLevel: number,
    afterLevel: number,
  ): void {
    for (
      let level =
        beforeLevel + 1;
      level <= afterLevel;
      level += 1
    ) {
      trackAnalyticsEvent(
        'bestiary_level_up',
        {
          entryId:
            definition.entryId,
          kind:
            definition.kind,
          level,
        },
      );
    }
  }
}

function findDefinition(
  kind: BestiaryEntryKind,
  entityId: string,
):
  BestiaryDefinition | undefined {
  return DEFINITIONS.find(
    (entry) =>
      entry.kind === kind &&
      entry.entityId ===
        entityId,
  );
}

function firstUnclaimedLevel(
  level: number,
  claimed: readonly number[],
): number | null {
  for (
    let candidate = 1;
    candidate <= level;
    candidate += 1
  ) {
    if (
      !claimed.includes(
        candidate,
      )
    ) {
      return candidate;
    }
  }

  return null;
}

function getReward(
  kind: BestiaryEntryKind,
  level: number,
): BestiaryReward {
  const rewards:
    Record<
      BestiaryEntryKind,
      readonly BestiaryReward[]
    > = {
    species: [
      {
        coins: 3,
        wood: 0,
        stone: 0,
        metal: 0,
        settlementXp: 2,
      },
      {
        coins: 8,
        wood: 4,
        stone: 0,
        metal: 0,
        settlementXp: 4,
      },
      {
        coins: 15,
        wood: 0,
        stone: 4,
        metal: 0,
        settlementXp: 6,
      },
      {
        coins: 25,
        wood: 0,
        stone: 0,
        metal: 1,
        settlementXp: 10,
      },
      {
        coins: 45,
        wood: 0,
        stone: 0,
        metal: 2,
        settlementXp: 18,
      },
    ],
    boss: [
      {
        coins: 5,
        wood: 0,
        stone: 0,
        metal: 0,
        settlementXp: 3,
      },
      {
        coins: 20,
        wood: 0,
        stone: 0,
        metal: 1,
        settlementXp: 8,
      },
      {
        coins: 35,
        wood: 0,
        stone: 5,
        metal: 1,
        settlementXp: 12,
      },
      {
        coins: 55,
        wood: 0,
        stone: 0,
        metal: 2,
        settlementXp: 18,
      },
      {
        coins: 90,
        wood: 0,
        stone: 0,
        metal: 3,
        settlementXp: 30,
      },
    ],
  };

  return (
    rewards[kind][
      Math.max(
        0,
        Math.min(
          4,
          level - 1,
        ),
      )
    ] ?? rewards[kind][0]
  );
}

export function formatReward(
  reward: BestiaryReward,
): string {
  const parts: string[] = [];

  if (reward.coins > 0) {
    parts.push(
      `●${reward.coins}`,
    );
  }

  if (reward.wood > 0) {
    parts.push(
      `Д${reward.wood}`,
    );
  }

  if (reward.stone > 0) {
    parts.push(
      `К${reward.stone}`,
    );
  }

  if (reward.metal > 0) {
    parts.push(
      `М${reward.metal}`,
    );
  }

  if (
    reward.settlementXp > 0
  ) {
    parts.push(
      `XP ${reward.settlementXp}`,
    );
  }

  return parts.join(' · ');
}

export function emptyBestiaryResourceReward():
  ResourceCounts {
  return {
    wood: 0,
    stone: 0,
    metal: 0,
    coins: 0,
  };
}
