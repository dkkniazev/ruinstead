import type {
  GameState,
} from '../state/GameState';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';

export type QuestContext = {
  outsideSettlement: boolean;
  carried: ResourceCounts;
};

export type QuestReward = {
  coins: number;
  settlementXp: number;
};

export type QuestCompletion = {
  id: string;
  title: string;
  optional: boolean;
  reward: QuestReward;
};

export type QuestHudState = {
  activeId: string | null;
  title: string;
  objective: string;
  progress: string;
  hint: string;
  sequenceProgress: string;
  rewardText: string;
  optional: {
    id: string;
    title: string;
    progress: string;
    rewardText: string;
  } | null;
};

export type QuestDirectorUpdate = {
  changed: boolean;
  completed: QuestCompletion[];
  hud: QuestHudState;
};

type QuestDefinition = {
  id: string;
  title: string;
  objective: string;
  hint: string;
  reward: QuestReward;
  complete:
    (
      state: GameState,
      context: QuestContext,
    ) => boolean;
  progress:
    (
      state: GameState,
      context: QuestContext,
    ) => string;
};

const MAIN_QUESTS:
  readonly QuestDefinition[] = [
  {
    id: 'first-departure',
    title: 'Первый выход',
    objective:
      'Выйдите за пределы безопасной зоны поселения.',
    hint:
      'Идите по дороге на восток, к Опушке.',
    reward: {
      coins: 4,
      settlementXp: 5,
    },
    complete:
      (state, context) =>
        context.outsideSettlement ||
        state.progression
          .expeditionCount > 0 ||
        state.settlement
          .repairStages.forge > 0 ||
        state.world
          .discoveredLandmarks
          .length > 0 ||
        state.world
          .defeatedBosses
          .length > 0,
    progress:
      (_state, context) =>
        context.outsideSettlement
          ? '1 / 1'
          : '0 / 1',
  },
  {
    id: 'gather-first-wood',
    title: 'Материалы для ремонта',
    objective:
      'Соберите 10 единиц дерева.',
    hint:
      'Кучки брёвен стоят на Опушке и у Гоблиньей поляны.',
    reward: {
      coins: 5,
      settlementXp: 5,
    },
    complete:
      (state, context) =>
        context.carried.wood >=
          10 ||
        state.resources.wood >=
          10 ||
        state.settlement
          .repairStages.forge > 0 ||
        state.settlement
          .buildings.forge > 0,
    progress:
      (state, context) =>
        `${Math.min(
          10,
          Math.max(
            context.carried.wood,
            state.resources.wood,
          ),
        )} / 10 дерева`,
  },
  {
    id: 'bank-first-haul',
    title: 'Вернуться с добычей',
    objective:
      'Сдайте 10 дерева в походный тайник.',
    hint:
      'Вернитесь в поселение и подойдите к тайнику рядом с костром.',
    reward: {
      coins: 7,
      settlementXp: 6,
    },
    complete:
      (state) =>
        state.resources.wood >=
          10 ||
        state.settlement
          .repairStages.forge > 0 ||
        state.settlement
          .buildings.forge > 0,
    progress:
      (state) =>
        `${Math.min(
          10,
          state.resources.wood,
        )} / 10 на складе`,
  },
  {
    id: 'repair-forge-first-stage',
    title: 'Начать восстановление',
    objective:
      'Выполните первый этап ремонта кузницы.',
    hint:
      'Подойдите к развалинам кузницы и используйте действие E.',
    reward: {
      coins: 8,
      settlementXp: 8,
    },
    complete:
      (state) =>
        state.settlement
          .repairStages.forge >=
          1 ||
        state.settlement
          .buildings.forge > 0,
    progress:
      (state) =>
        `${Math.min(
          1,
          state.settlement
            .repairStages.forge,
        )} / 1 этап`,
  },
  {
    id: 'restore-forge',
    title: 'Вернуть кузницу',
    objective:
      'Восстановите кузницу полностью.',
    hint:
      'Собирайте дерево, камень и металл и завершите все три стадии.',
    reward: {
      coins: 18,
      settlementXp: 20,
    },
    complete:
      (state) =>
        state.settlement
          .buildings.forge > 0,
    progress:
      (state) =>
        `${Math.min(
          3,
          state.settlement
            .repairStages.forge,
        )} / 3 этапа`,
  },
  {
    id: 'buy-first-upgrade',
    title: 'Стать сильнее',
    objective:
      'Купите любое постоянное улучшение.',
    hint:
      'Откройте восстановленную кузницу и выберите улучшение героя или оружия.',
    reward: {
      coins: 12,
      settlementXp: 15,
    },
    complete:
      (state) =>
        state.player
          .maxHealthLevel > 0 ||
        state.player
          .moveSpeedLevel > 0 ||
        state.player
          .backpackLevel > 0 ||
        state.player
          .dashLevel > 0 ||
        Object.values(
          state.player.weaponLevels,
        ).some(
          (level) => level > 0,
        ),
    progress:
      (state) =>
        (
          state.player
            .maxHealthLevel > 0 ||
          state.player
            .moveSpeedLevel > 0 ||
          state.player
            .backpackLevel > 0 ||
          state.player
            .dashLevel > 0 ||
          Object.values(
            state.player.weaponLevels,
          ).some(
            (level) => level > 0,
          )
        )
          ? '1 / 1'
          : '0 / 1',
  },
  {
    id: 'reach-forest-heart',
    title: 'В глубину леса',
    objective:
      'Найдите Лесной алтарь в Сердце леса.',
    hint:
      'Продвигайтесь по центральной дороге всё глубже на восток.',
    reward: {
      coins: 20,
      settlementXp: 25,
    },
    complete:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'forest-heart',
          ),
    progress:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'forest-heart',
          )
          ? 'Найден'
          : 'Не найден',
  },
  {
    id: 'defeat-root-colossus',
    title: 'Хозяин первой зоны',
    objective:
      'Победите Корневого колосса.',
    hint:
      'Подготовьтесь в кузнице и найдите главного босса в глубине этапа.',
    reward: {
      coins: 45,
      settlementXp: 50,
    },
    complete:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'root-colossus',
          ),
    progress:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'root-colossus',
          )
          ? 'Побеждён'
          : 'Жив',
  },
];

const OPTIONAL_QUESTS:
  readonly QuestDefinition[] = [
  {
    id: 'optional-three-returns',
    title: 'Надёжный добытчик',
    objective:
      'Трижды вернитесь в поселение с добычей.',
    hint:
      'Не обязательно заполнять рюкзак полностью — важны успешные возвращения.',
    reward: {
      coins: 18,
      settlementXp: 10,
    },
    complete:
      (state) =>
        state.progression
          .expeditionCount >= 3,
    progress:
      (state) =>
        `${Math.min(
          3,
          state.progression
            .expeditionCount,
        )} / 3 возвращения`,
  },
  {
    id: 'optional-weapon-three',
    title: 'Любимое оружие',
    objective:
      'Прокачайте любое оружие до 3 уровня.',
    hint:
      'Улучшайте выбранное оружие в восстановленной кузнице.',
    reward: {
      coins: 25,
      settlementXp: 15,
    },
    complete:
      (state) =>
        Math.max(
          ...Object.values(
            state.player.weaponLevels,
          ),
        ) >= 3,
    progress:
      (state) =>
        `${Math.min(
          3,
          Math.max(
            ...Object.values(
              state.player
                .weaponLevels,
            ),
          ),
        )} / 3 уровень`,
  },
];

export class QuestDirector {
  private initialized = false;

  update(
    state: GameState,
    context: QuestContext,
  ): QuestDirectorUpdate {
    let changed = false;
    const completed:
      QuestCompletion[] = [];

    for (
      const quest of
      MAIN_QUESTS
    ) {
      if (
        state.quests.completedIds
          .includes(quest.id)
      ) {
        continue;
      }

      if (
        !quest.complete(
          state,
          context,
        )
      ) {
        break;
      }

      this.completeQuest(
        state,
        quest,
        false,
      );

      changed = true;
      completed.push({
        id: quest.id,
        title: quest.title,
        optional: false,
        reward: quest.reward,
      });
    }

    const active =
      MAIN_QUESTS.find(
        (quest) =>
          !state.quests
            .completedIds
            .includes(quest.id),
      ) ?? null;

    if (
      state.quests.activeId !==
      active?.id
    ) {
      state.quests.activeId =
        active?.id ?? null;
      changed = true;
    }

    for (
      const quest of
      OPTIONAL_QUESTS
    ) {
      if (
        state.quests.completedIds
          .includes(quest.id) ||
        !quest.complete(
          state,
          context,
        )
      ) {
        continue;
      }

      this.completeQuest(
        state,
        quest,
        true,
      );

      changed = true;
      completed.push({
        id: quest.id,
        title: quest.title,
        optional: true,
        reward: quest.reward,
      });
    }

    const hud =
      this.getHudState(
        state,
        context,
      );

    const notify =
      this.initialized
        ? completed
        : [];

    this.initialized = true;

    return {
      changed,
      completed: notify,
      hud,
    };
  }

  getHudState(
    state: GameState,
    context: QuestContext,
  ): QuestHudState {
    const active =
      MAIN_QUESTS.find(
        (quest) =>
          !state.quests
            .completedIds
            .includes(quest.id),
      ) ?? null;

    const optional =
      OPTIONAL_QUESTS.find(
        (quest) =>
          !state.quests
            .completedIds
            .includes(quest.id),
      ) ?? null;

    const completedMain =
      MAIN_QUESTS.filter(
        (quest) =>
          state.quests.completedIds
            .includes(quest.id),
      ).length;

    return {
      activeId:
        active?.id ?? null,
      title:
        active?.title ??
        'Первый этап завершён',
      objective:
        active?.objective ??
        'Главная цепочка текущего этапа выполнена.',
      progress:
        active
          ? active.progress(
              state,
              context,
            )
          : 'Готово',
      hint:
        active?.hint ??
        'Можно заниматься улучшениями, фармом и исследованием.',
      sequenceProgress:
        `${completedMain} / ${MAIN_QUESTS.length}`,
      rewardText:
        active
          ? formatReward(
              active.reward,
            )
          : '',
      optional:
        optional
          ? {
              id: optional.id,
              title:
                optional.title,
              progress:
                optional.progress(
                  state,
                  context,
                ),
              rewardText:
                formatReward(
                  optional.reward,
                ),
            }
          : null,
    };
  }

  private completeQuest(
    state: GameState,
    quest: QuestDefinition,
    _optional: boolean,
  ): void {
    state.quests.completedIds
      .push(quest.id);

    state.resources.coins +=
      quest.reward.coins;
    state.progression
      .settlementXp +=
        quest.reward
          .settlementXp;
  }
}

function formatReward(
  reward: QuestReward,
): string {
  const parts: string[] = [];

  if (reward.coins > 0) {
    parts.push(
      `●${reward.coins}`,
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
