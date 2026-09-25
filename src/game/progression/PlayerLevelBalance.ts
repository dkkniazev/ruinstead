export const MAX_PLAYER_LEVEL = 50;

export type PlayerMasteryId =
  | 'combat'
  | 'vitality'
  | 'mobility'
  | 'gathering'
  | 'settlement';

export const PLAYER_LEVEL_CONFIG = {
  maxLevel: MAX_PLAYER_LEVEL,
  gemsPerLevel: 5,
  healToFullOnLevelUp: true,
  refillHealthPotionsOnLevelUp: true,
  masteryPointEveryLevels: 5,
  maxMasteryRank: 5,
  xpCurve: {
    base: 100,
    linear: 30,
    quadratic: 3,
  },
  xpRewards: {
    normalEnemy: 3,
    eliteEnemy: 10,
    resourceNode: 1,
    chest: 10,
    sideBossRepeat: 25,
    sideBossFirstClearBonus: 50,
    mainBossRepeat: 40,
    mainBossFirstClearBonus: 100,
    landmarkFirstDiscovery: 20,
    questStep: 50,
    majorQuest: 100,
    buildingUpgrade: 40,
    bestiaryLevelClaim: 25,
  },
} as const;

export const PLAYER_MASTERY = {
  combat: {
    name: 'Боевая подготовка',
    effectPerRank: {
      damageMultiplier: 0.03,
    },
    maxRank: 5,
  },
  vitality: {
    name: 'Живучесть',
    effectPerRank: {
      maxHealthMultiplier: 0.04,
    },
    maxRank: 5,
  },
  mobility: {
    name: 'Подвижность',
    effectPerRank: {
      moveSpeedMultiplier: 0.02,
      dashCooldownMultiplier: -0.04,
    },
    maxRank: 5,
  },
  gathering: {
    name: 'Добытчик',
    effectPerRank: {
      gatheringYieldMultiplier: 0.05,
    },
    maxRank: 5,
  },
  settlement: {
    name: 'Управляющий',
    effectPerRank: {
      productionMultiplier: 0.05,
      productionCapacityMultiplier: 0.05,
    },
    maxRank: 5,
  },
} as const satisfies
  Record<
    PlayerMasteryId,
    {
      name: string;
      effectPerRank:
        Record<string, number>;
      maxRank: number;
    }
  >;

export type PlayerLevelMilestoneReward =
  | {
      level: number;
      chest: 'common' | 'rare' | 'epic';
    }
  | {
      level: number;
      returnTickets: number;
    }
  | {
      level: number;
      gems: number;
    };

export const PLAYER_LEVEL_MILESTONES:
  readonly PlayerLevelMilestoneReward[] = [
  {
    level: 5,
    returnTickets: 2,
  },
  {
    level: 10,
    chest: 'common',
  },
  {
    level: 15,
    gems: 25,
  },
  {
    level: 20,
    chest: 'rare',
  },
  {
    level: 25,
    returnTickets: 3,
  },
  {
    level: 30,
    chest: 'rare',
  },
  {
    level: 35,
    gems: 50,
  },
  {
    level: 40,
    chest: 'rare',
  },
  {
    level: 45,
    returnTickets: 5,
  },
  {
    level: 50,
    chest: 'epic',
  },
];

export function getXpToNextPlayerLevel(
  level: number,
): number {
  const safeLevel =
    Math.max(
      1,
      Math.min(
        MAX_PLAYER_LEVEL - 1,
        Math.floor(level),
      ),
    );
  const offset =
    safeLevel - 1;
  const curve =
    PLAYER_LEVEL_CONFIG.xpCurve;

  return Math.round(
    curve.base +
      curve.linear * offset +
      curve.quadratic *
        offset *
        offset,
  );
}

export function getMasteryPointsEarned(
  level: number,
): number {
  const safeLevel =
    Math.max(
      1,
      Math.min(
        MAX_PLAYER_LEVEL,
        Math.floor(level),
      ),
    );

  return Math.floor(
    safeLevel /
      PLAYER_LEVEL_CONFIG
        .masteryPointEveryLevels,
  );
}
