import type {
  GameState,
} from '../state/GameState';
import {
  PLAYER_LEVEL_CONFIG,
  PLAYER_LEVEL_MILESTONES,
  PLAYER_MASTERY,
  getMasteryPointsEarned,
  getXpToNextPlayerLevel,
  type PlayerMasteryId,
} from './PlayerLevelBalance';

export type PlayerXpResult = {
  xpAdded: number;
  levelsGained: number;
  gemsGained: number;
  milestoneMessages: string[];
};

export type MasterySpendResult = {
  success: boolean;
  notice: string;
};

export function getSpentMasteryPoints(
  state: GameState,
): number {
  return Object.values(
    state.progression
      .masteryRanks,
  ).reduce(
    (sum, rank) =>
      sum + rank,
    0,
  );
}

export function getAvailableMasteryPoints(
  state: GameState,
): number {
  return Math.max(
    0,
    getMasteryPointsEarned(
      state.progression
        .playerLevel,
    ) -
      getSpentMasteryPoints(
        state,
      ),
  );
}

export function addPlayerXp(
  state: GameState,
  amount: number,
): PlayerXpResult {
  const xpAdded =
    Math.max(
      0,
      Math.floor(amount),
    );
  const result:
    PlayerXpResult = {
      xpAdded,
      levelsGained: 0,
      gemsGained: 0,
      milestoneMessages: [],
    };

  if (
    xpAdded <= 0 ||
    state.progression
      .playerLevel >=
      PLAYER_LEVEL_CONFIG
        .maxLevel
  ) {
    return result;
  }

  state.progression.playerXp +=
    xpAdded;

  while (
    state.progression
      .playerLevel <
      PLAYER_LEVEL_CONFIG
        .maxLevel
  ) {
    const needed =
      getXpToNextPlayerLevel(
        state.progression
          .playerLevel,
      );

    if (
      state.progression
        .playerXp < needed
    ) {
      break;
    }

    state.progression.playerXp -=
      needed;
    state.progression
      .playerLevel += 1;
    result.levelsGained += 1;

    state.premium.gems +=
      PLAYER_LEVEL_CONFIG
        .gemsPerLevel;
    result.gemsGained +=
      PLAYER_LEVEL_CONFIG
        .gemsPerLevel;

    applyMilestone(
      state,
      state.progression
        .playerLevel,
      result,
    );
  }

  if (
    state.progression
      .playerLevel >=
      PLAYER_LEVEL_CONFIG
        .maxLevel
  ) {
    state.progression.playerXp = 0;
  }

  return result;
}

function applyMilestone(
  state: GameState,
  level: number,
  result: PlayerXpResult,
): void {
  if (
    state.progression
      .claimedLevelMilestones
      .includes(level)
  ) {
    return;
  }

  const milestone =
    PLAYER_LEVEL_MILESTONES
      .find(
        (entry) =>
          entry.level === level,
      );

  if (!milestone) {
    return;
  }

  state.progression
    .claimedLevelMilestones
    .push(level);

  if ('returnTickets' in milestone) {
    state.consumables
      .returnTickets +=
        milestone.returnTickets;
    result.milestoneMessages.push(
      `Lv.${level}: билеты домой ×${milestone.returnTickets}`,
    );
  } else if ('gems' in milestone) {
    state.premium.gems +=
      milestone.gems;
    result.gemsGained +=
      milestone.gems;
    result.milestoneMessages.push(
      `Lv.${level}: самоцветы +${milestone.gems}`,
    );
  } else {
    state.premium
      .freeSkinChests[
        milestone.chest
      ] += 1;
    result.milestoneMessages.push(
      `Lv.${level}: ${milestone.chest} сундук скинов ×1`,
    );
  }
}

export function spendMasteryPoint(
  state: GameState,
  id: PlayerMasteryId,
): MasterySpendResult {
  const available =
    getAvailableMasteryPoints(
      state,
    );
  const current =
    state.progression
      .masteryRanks[id];
  const max =
    PLAYER_MASTERY[id]
      .maxRank;

  if (available <= 0) {
    return {
      success: false,
      notice:
        'Нет свободных очков мастерства',
    };
  }

  if (current >= max) {
    return {
      success: false,
      notice:
        'Эта ветка мастерства уже максимального ранга',
    };
  }

  state.progression
    .masteryRanks[id] =
      current + 1;

  return {
    success: true,
    notice:
      `${PLAYER_MASTERY[id].name}: ранг ${current + 1} / ${max}`,
  };
}
