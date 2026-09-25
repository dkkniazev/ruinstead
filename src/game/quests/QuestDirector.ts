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
          .settlementReturnCount > 0 ||
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
        state.player
          .weaponInventory
          .variants
          .some(
            (variant) =>
              variant.level > 1,
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
      'Подготовьтесь в кузнице и найдите главного босса в глубине региона 1.',
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
  {
    id: 'repair-region-two-bridge',
    title: 'Дорога в Пепельные нагорья',
    objective:
      'Восстановите мост между регионами 1 и 2.',
    hint:
      'После победы над Корневым колоссом подойдите к разрушенному мосту и вложите 20 дерева, 10 камня и 4 металла.',
    reward: {
      coins: 30,
      settlementXp: 25,
    },
    complete:
      (state) =>
        state.settlement
          .buildings.bridge > 0 &&
        state.world
          .unlockedZones
          .includes(
            'stage-2',
          ),
    progress:
      (state) =>
        state.settlement
          .buildings.bridge > 0
          ? 'Мост восстановлен'
          : 'Мост разрушен',
  },
  {
    id: 'enter-region-2',
    title: 'Пепельные нагорья',
    objective:
      'Перейдите в регион 2.',
    hint:
      'Пройдите по восстановленному мосту. Кристалл и волокно доступны сразу за входом.',
    reward: {
      coins: 35,
      settlementXp: 25,
    },
    complete:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-2-entry',
          ),
    progress:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-2-entry',
          )
          ? 'Регион исследован'
          : 'Не посещён',
  },
  {
    id: 'defeat-sun-tyrant',
    title: 'Солнечный тиран',
    objective:
      'Победите главного босса региона 2.',
    hint:
      'Ищите Солнечного тирана в дальней части Пепельных нагорий.',
    reward: {
      coins: 70,
      settlementXp: 70,
    },
    complete:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'sun-tyrant',
          ),
    progress:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'sun-tyrant',
          )
          ? 'Побеждён'
          : 'Жив',
  },
  {
    id: 'enter-region-3',
    title: 'Теневой перевал',
    objective:
      'Войдите в регион 3 через открытые Солнечные врата.',
    hint:
      'Проход из региона 2 ведёт на север, в Теневой перевал.',
    reward: {
      coins: 45,
      settlementXp: 30,
    },
    complete:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-3-entry',
          ),
    progress:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-3-entry',
          )
          ? 'Регион исследован'
          : 'Не посещён',
  },
  {
    id: 'defeat-pass-warden',
    title: 'Страж перевала',
    objective:
      'Победите главного босса региона 3.',
    hint:
      'Страж перевала охраняет путь к центральному Магмовому сердцу.',
    reward: {
      coins: 90,
      settlementXp: 85,
    },
    complete:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'pass-warden',
          ),
    progress:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'pass-warden',
          )
          ? 'Побеждён'
          : 'Жив',
  },
  {
    id: 'enter-region-4',
    title: 'Магмовое сердце',
    objective:
      'Войдите в регион 4.',
    hint:
      'После открытия региона одновременно становится доступен короткий путь 4 ↔ 1.',
    reward: {
      coins: 55,
      settlementXp: 35,
    },
    complete:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-4-entry',
          ),
    progress:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-4-entry',
          )
          ? 'Регион исследован'
          : 'Не посещён',
  },
  {
    id: 'defeat-lava-golem',
    title: 'Лавовый голем',
    objective:
      'Победите усиленного босса региона 4.',
    hint:
      'Лавовый голем сильнее обычных главных боссов и возрождается вдвое дольше.',
    reward: {
      coins: 130,
      settlementXp: 110,
    },
    complete:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'lava-golem',
          ),
    progress:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'lava-golem',
          )
          ? 'Побеждён'
          : 'Жив',
  },
  {
    id: 'enter-region-5',
    title: 'Ветреные высоты',
    objective:
      'Войдите в регион 5.',
    hint:
      'После открытия региона работают оба прохода: из 4 и из уже открытого 3.',
    reward: {
      coins: 65,
      settlementXp: 40,
    },
    complete:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-5-entry',
          ),
    progress:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-5-entry',
          )
          ? 'Регион исследован'
          : 'Не посещён',
  },
  {
    id: 'defeat-sky-lord',
    title: 'Повелитель ветров',
    objective:
      'Победите главного босса региона 5.',
    hint:
      'Ищите его на дальней площадке Ветреных высот.',
    reward: {
      coins: 130,
      settlementXp: 120,
    },
    complete:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'sky-lord',
          ),
    progress:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'sky-lord',
          )
          ? 'Побеждён'
          : 'Жив',
  },
  {
    id: 'enter-region-6',
    title: 'Пепельные русла',
    objective:
      'Войдите в регион 6.',
    hint:
      'К региону ведут проходы из 5 и центрального региона 4.',
    reward: {
      coins: 75,
      settlementXp: 45,
    },
    complete:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-6-entry',
          ),
    progress:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-6-entry',
          )
          ? 'Регион исследован'
          : 'Не посещён',
  },
  {
    id: 'defeat-ash-serpent',
    title: 'Пепельный змей',
    objective:
      'Победите главного босса региона 6.',
    hint:
      'Исследуйте русла и найдите арену Пепельного змея.',
    reward: {
      coins: 160,
      settlementXp: 135,
    },
    complete:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'ash-serpent',
          ),
    progress:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'ash-serpent',
          )
          ? 'Побеждён'
          : 'Жив',
  },
  {
    id: 'enter-region-7',
    title: 'Сухой каньон',
    objective:
      'Войдите в регион 7.',
    hint:
      'После открытия становятся доступны пути 6 ↔ 7, 4 ↔ 7 и короткая дорога 7 ↔ 1.',
    reward: {
      coins: 85,
      settlementXp: 50,
    },
    complete:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-7-entry',
          ),
    progress:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-7-entry',
          )
          ? 'Регион исследован'
          : 'Не посещён',
  },
  {
    id: 'defeat-canyon-lord',
    title: 'Хозяин каньона',
    objective:
      'Победите главного босса региона 7.',
    hint:
      'Эта победа открывает путь из стартового региона к Драконьей кальдере.',
    reward: {
      coins: 190,
      settlementXp: 150,
    },
    complete:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'canyon-lord',
          ),
    progress:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'canyon-lord',
          )
          ? 'Побеждён'
          : 'Жив',
  },
  {
    id: 'enter-region-8',
    title: 'Драконья кальдера',
    objective:
      'Войдите в регион 8.',
    hint:
      'Единственный путь в кальдеру идёт из региона 1.',
    reward: {
      coins: 100,
      settlementXp: 60,
    },
    complete:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-8-entry',
          ),
    progress:
      (state) =>
        state.world
          .discoveredLandmarks
          .includes(
            'stage-8-entry',
          )
          ? 'Регион исследован'
          : 'Не посещён',
  },
  {
    id: 'defeat-fire-dragon',
    title: 'Огненный дракон',
    objective:
      'Победите финального усиленного босса.',
    hint:
      'Огненный дракон — самый опасный противник релизной карты и возрождается вдвое дольше.',
    reward: {
      coins: 300,
      settlementXp: 250,
    },
    complete:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'fire-dragon',
          ),
    progress:
      (state) =>
        state.world
          .defeatedBosses
          .includes(
            'fire-dragon',
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
          .settlementReturnCount >= 3,
    progress:
      (state) =>
        `${Math.min(
          3,
          state.progression
            .settlementReturnCount,
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
        state.player
          .weaponInventory
          .variants
          .some(
            (variant) =>
              variant.level >= 3,
          ),
    progress:
      (state) =>
        `${Math.min(
          3,
          Math.max(
            1,
            ...state.player
              .weaponInventory
              .variants
              .map(
                (variant) =>
                  variant.level,
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
        'Релизная цепочка завершена',
      objective:
        active?.objective ??
        'Все восемь регионов и Огненный дракон пройдены.',
      progress:
        active
          ? active.progress(
              state,
              context,
            )
          : 'Готово',
      hint:
        active?.hint ??
        'Можно усиливать оружие, закрывать бестиарий и повторно фармить боссов.',
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
