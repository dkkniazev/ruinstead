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

export type StoryBeat = {
  id: string;
  chapter: string;
  title: string;
  text: string;
};


export type QuestHudState = {
  activeId: string | null;
  title: string;
  chapter: string;
  story: string;
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

const STORY_CHAPTERS: Record<string, {chapter:string; story:string}> = {
  'first-departure': {
    chapter: 'Глава I · После Раскола',
    story: 'Вы очнулись среди руин старого опорного пункта. На уцелевшей каменной плите вырезан знак восьми дорог — когда-то отсюда Хранители поддерживали связь между землями. Теперь дороги мертвы, а за стенами поселения бродят искажённые существа.',
  },
  'gather-first-wood': {
    chapter: 'Глава I · После Раскола',
    story: 'В мастерских почти ничего не осталось. Если поселение должно снова стать убежищем, придётся начать с самого простого: собрать материалы и вернуть ему способность снабжать экспедиции.',
  },
  'bank-first-haul': {
    chapter: 'Глава I · После Раскола',
    story: 'Старые записи Хранителей предупреждают: всё, что вынесено из искажённых земель, легко потерять в пути. Тайник у костра был частью их экспедиционной системы и до сих пор пригоден для хранения добычи.',
  },
  'repair-forge-first-stage': {
    chapter: 'Глава I · После Раскола',
    story: 'На развалинах кузницы повторяется тот же знак восьми дорог. Под слоем копоти сохранилась надпись: «Сталь хранит память пути». Похоже, эта кузница была не просто ремесленной мастерской.',
  },
  'restore-forge': {
    chapter: 'Глава I · После Раскола',
    story: 'Чем больше восстанавливается кузница, тем отчётливее становятся старые метки на наковальне. Хранители усиливали здесь оружие перед переходами между регионами — значит, дороги можно вернуть.',
  },
  'buy-first-upgrade': {
    chapter: 'Глава I · После Раскола',
    story: 'Восстановленная кузница реагирует на материалы из внешних земель. Старые механизмы будто узнают оружие Хранителя. Прежде чем идти глубже, стоит проверить, что эта технология ещё работает.',
  },
  'reach-forest-heart': {
    chapter: 'Глава II · Голос алтаря',
    story: 'После запуска кузницы на её плите проступил фрагмент старой карты. В лесу отмечен один уцелевший узел сети — Лесной алтарь. Если он ещё действует, он может объяснить, что произошло с дорогами.',
  },
  'defeat-root-colossus': {
    chapter: 'Глава II · Голос алтаря',
    story: 'Алтарь отвечает не словами, а памятью: огромный древесный страж когда-то охранял первую печать пути. После Раскола печать проросла скверной и исказила своего хранителя. Чтобы освободить дорогу, придётся оборвать эту связь силой.',
  },
  'repair-region-two-bridge': {
    chapter: 'Глава II · Голос алтаря',
    story: 'С гибелью Корневого колосса первая печать стихла. Алтарь показывает следующий узел за разрушенным мостом. Сам путь не восстановился — древняя сеть открывает двери, но пройти к ним всё ещё должен человек.',
  },
  'enter-region-2': {
    chapter: 'Глава III · Пепельный след',
    story: 'За мостом лес сменяется сухими нагорьями. Пепел здесь лежит слоями старше самого Раскола, но в нём чувствуется та же чужая сила. След ведёт дальше по цепи печатей.',
  },
  'defeat-sun-tyrant': {
    chapter: 'Глава III · Пепельный след',
    story: 'Солнечный тиран удерживает вторую печать и питается её жаром. Это уже не случайное искажение: кто-то или что-то направляет энергию сети к центру материка.',
  },
  'enter-region-3': {
    chapter: 'Глава III · Пепельный след',
    story: 'Открытая печать ведёт в Теневой перевал. На камнях всё чаще встречается символ разломанного круга — знак, которого нет ни в одной старой записи поселения.',
  },
  'defeat-pass-warden': {
    chapter: 'Глава III · Пепельный след',
    story: 'Страж перевала всё ещё выполняет древний приказ: никого не пропускать к центральному узлу. Только сам приказ давно искажён. За ним находится путь к Магмовому сердцу — месту, где сходятся несколько старых дорог.',
  },
  'enter-region-4': {
    chapter: 'Глава IV · Сердце дорог',
    story: 'Магмовое сердце — не просто очередной регион. Здесь линии старой сети пересекаются, а камень под ногами вибрирует в такт алтарям. Именно отсюда Раскол распространился по нескольким направлениям.',
  },
  'defeat-lava-golem': {
    chapter: 'Глава IV · Сердце дорог',
    story: 'Лавовый голем создан как аварийный страж центрального узла. Теперь он запечатал повреждение вместе с собой. Победа над ним рискованна, но без неё невозможно проследить источник искажения дальше.',
  },
  'enter-region-5': {
    chapter: 'Глава IV · Сердце дорог',
    story: 'После падения голема сеть оживает рывками. Ветреные высоты отвечают первыми: на старых башнях вновь вспыхивают знаки Хранителей, но один из них горит чужим светом.',
  },
  'defeat-sky-lord': {
    chapter: 'Глава IV · Сердце дорог',
    story: 'Повелитель ветров собрал вокруг себя силу очередной печати. Освободив её, вы подтверждаете догадку: искажение движется по сети в обратную сторону — к далёкой кальдере.',
  },
  'enter-region-6': {
    chapter: 'Глава V · След Разлома',
    story: 'Пепельные русла несут след той же энергии, что вы видели в Магмовом сердце. Здесь она уже не похожа на аварию древних механизмов — кто-то удерживал поток открытым после катастрофы.',
  },
  'defeat-ash-serpent': {
    chapter: 'Глава V · След Разлома',
    story: 'Пепельный змей обвил собой узел сети и не даёт ему погаснуть. После его гибели поток резко слабеет, а на карте алтаря появляется путь через Сухой каньон.',
  },
  'enter-region-7': {
    chapter: 'Глава V · След Разлома',
    story: 'В каньоне сохранились обломки караванных дорог Хранителей. Все они когда-то сходились к одному последнему маршруту — назад через стартовые земли и дальше, к закрытой Драконьей кальдере.',
  },
  'defeat-canyon-lord': {
    chapter: 'Глава V · След Разлома',
    story: 'Хозяин каньона носит предпоследнюю печать. Когда она гаснет, Лесной алтарь впервые показывает целую схему: источник Раскола находится в кальдере, а её хранитель всё ещё жив.',
  },
  'enter-region-8': {
    chapter: 'Глава VI · Последняя печать',
    story: 'Драконья кальдера была закрыта ещё до падения поселения. Старые записи называют её «нулевым узлом» — местом, откуда сеть получала силу. Теперь именно оттуда идёт искажение.',
  },
  'defeat-fire-dragon': {
    chapter: 'Глава VI · Последняя печать',
    story: 'Огненный дракон не создал Раскол — он стал его сосудом. Древняя печать вросла в него и не позволяет нулевому узлу погаснуть. Победа может остановить распространение скверны, но вместе с ней откроет вопрос: кто запустил сеть в таком режиме и зачем.',
  },
};

const STORY_BEATS: Record<string, StoryBeat> = {
  'restore-forge': {
    id: 'forge-awakens',
    chapter: 'Глава I · После Раскола',
    title: 'Память металла',
    text: 'Когда горн разгорается впервые за долгие годы, на наковальне проступают восемь тонких линий. Семь из них обрываются во тьме. Одна уходит в лес. На её конце мерцает знак старого алтаря.',
  },
  'reach-forest-heart': {
    id: 'altar-memory',
    chapter: 'Глава II · Голос алтаря',
    title: 'Память Лесного алтаря',
    text: 'Камень отвечает прикосновению вспышкой чужой памяти. Вы видите восемь хранителей, стоящих у печатей пути. Затем — трещину света, проходящую через всю сеть. Первый хранитель падает на колени, а корни леса обвивают его тело.',
  },
  'defeat-root-colossus': {
    id: 'first-seal',
    chapter: 'Глава II · Голос алтаря',
    title: 'Первая печать освобождена',
    text: 'С гибелью Корневого колосса лес на мгновение стихает. В алтаре гаснет багровая жила, а одна из восьми линий снова загорается золотом. Путь за мостом существует — осталось вернуть к нему дорогу.',
  },
  'enter-region-2': {
    id: 'ashlands-entry',
    chapter: 'Глава III · Пепельный след',
    title: 'За лесом',
    text: 'Пепел лежит здесь слоями, будто огонь приходил в нагорья задолго до Раскола. На разбитых камнях повторяется знак печати, но поверх него вырезан другой символ — разломанный круг.',
  },
  'defeat-sun-tyrant': {
    id: 'second-seal',
    chapter: 'Глава III · Пепельный след',
    title: 'Жар второй печати',
    text: 'Сила покидает Солнечного тирана не наружу, а уходит глубже в землю — по старым линиям сети. Это не похоже на естественное разрушение. Кто-то направил поток к центру материка.',
  },
  'enter-region-3': {
    id: 'shadow-pass-entry',
    chapter: 'Глава III · Пепельный след',
    title: 'Знак разломанного круга',
    text: 'В Теневом перевале чужой знак встречается всё чаще. Он нанесён поверх старых символов Хранителей, будто кто-то переписал их приказы после катастрофы.',
  },
  'defeat-pass-warden': {
    id: 'warden-falls',
    chapter: 'Глава III · Пепельный след',
    title: 'Приказ, который пережил хозяев',
    text: 'Страж перевала падает, но до последнего пытается закрыть проход к центральному узлу. Его печать указывает в Магмовое сердце — место, где когда-то сходились несколько дорог одновременно.',
  },
  'enter-region-4': {
    id: 'magma-heart-entry',
    chapter: 'Глава IV · Сердце дорог',
    title: 'Центральный узел',
    text: 'Под раскалённой породой ощущается пульс. Линии печатей здесь не расходятся — они сходятся. Раскол не просто прошёл через Магмовое сердце. Отсюда он был разослан дальше.',
  },
  'defeat-lava-golem': {
    id: 'magma-core-open',
    chapter: 'Глава IV · Сердце дорог',
    title: 'Нулевой маршрут',
    text: 'После падения голема центральный узел раскрывает старую схему. Среди восьми дорог есть девятая, не отмеченная на обычных картах. Она ведёт к узлу без номера — в Драконью кальдеру.',
  },
  'enter-region-5': {
    id: 'wind-heights-entry',
    chapter: 'Глава IV · Сердце дорог',
    title: 'Сигнал в высотах',
    text: 'На ветреных башнях вновь загораются знаки Хранителей. Большинство светится ровно, но один отвечает багровым импульсом — тем же, что вы видели в памяти Лесного алтаря.',
  },
  'defeat-sky-lord': {
    id: 'sky-seal',
    chapter: 'Глава IV · Сердце дорог',
    title: 'След поворачивает назад',
    text: 'Освобождённая печать показывает направление потока. Искажение не распространяется от центра наружу — оно тянется обратно, к далёкой кальдере, словно сеть что-то питает.',
  },
  'enter-region-6': {
    id: 'ash-rivers-entry',
    chapter: 'Глава V · След Разлома',
    title: 'Поток, который не должен был жить',
    text: 'Пепельные русла совпадают с линиями старой сети. Кто-то удерживал их открытыми уже после катастрофы. Раскол был событием, но его последствия поддерживали намеренно.',
  },
  'defeat-ash-serpent': {
    id: 'serpent-seal',
    chapter: 'Глава V · След Разлома',
    title: 'Перекрытый поток',
    text: 'Когда Пепельный змей отпускает узел, багровый поток впервые заметно слабеет. На алтарной карте появляется путь через каньон — к предпоследней печати.',
  },
  'enter-region-7': {
    id: 'canyon-entry',
    chapter: 'Глава V · След Разлома',
    title: 'Дороги Хранителей',
    text: 'В каньоне сохранились остатки караванных путей. Все они сходились к маршруту, которого нет на новых картах. Хранители знали о кальдере и пытались что-то оттуда вывезти перед Расколом.',
  },
  'defeat-canyon-lord': {
    id: 'penultimate-seal',
    chapter: 'Глава V · След Разлома',
    title: 'Семь линий из восьми',
    text: 'Предпоследняя печать гаснет. Схема становится почти полной: все освобождённые линии указывают в Драконью кальдеру. Там находится источник питания сети — Нулевой узел.',
  },
  'enter-region-8': {
    id: 'caldera-entry',
    chapter: 'Глава VI · Последняя печать',
    title: 'Нулевой узел',
    text: 'Кальдера встречает вас тишиной и жаром. Здесь нет следов обычной жизни Хранителей — только огромные каналы, уходящие к центру. Это место строили не для людей. Оно питало всю сеть.',
  },
  'defeat-fire-dragon': {
    id: 'dragon-falls',
    chapter: 'Глава VI · Последняя печать',
    title: 'Сосуд, а не источник',
    text: 'Дракон падает, и багровый свет в каналах меркнет. Последняя печать освобождена. Но в памяти Нулевого узла остаётся один образ: человеческая фигура у панели управления незадолго до Раскола. Кто-то запустил сеть намеренно. Дракон лишь пережил последствия.',
  },
};

export function getStoryBeatForQuestCompletion(
  questId: string,
): StoryBeat | undefined {
  return STORY_BEATS[questId];
}

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
      'Деревья с зелёным кольцом за поселением дают древесину при подходе.',
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
      'Лесной алтарь отмечен золотым знаком ! на миникарте и карте мира (Tab). Идите к нему в восточной части региона 1.',
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

    const story =
      active
        ? STORY_CHAPTERS[
            active.id
          ]
        : undefined;

    return {
      activeId:
        active?.id ?? null,
      title:
        active?.title ??
        'История пройдена',
      chapter:
        story?.chapter ??
        'Эпилог · Открытые дороги',
      story:
        story?.story ??
        'Основная цепь печатей восстановлена. Поселение снова связано с регионами, но происхождение Раскола остаётся неизвестным — это задел для следующей сюжетной главы.',
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
