import Phaser from 'phaser';
import type {
  BuildingId,
} from '../state/GameState';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';

export const CITY_BUILDING_IDS = [
  'storage',
  'sawmill',
  'workshop',
  'house',
] as const;

export type CityBuildingId =
  (typeof CITY_BUILDING_IDS)[number];

export const MAX_CITY_BUILDING_LEVEL = 3;
export const PRODUCTION_CYCLE_MS = 30_000;
const MAX_OFFLINE_MS =
  2 * 60 * 60 * 1000;

export type SettlementProductionState = {
  lastTickAt: number;
  pending: ResourceCounts;
};

export type CityBuildingHudState = {
  id: CityBuildingId;
  name: string;
  level: number;
  maxLevel: number;
  locked: boolean;
  lockReason: string;
  nextCost: ResourceCounts | null;
  canAfford: boolean;
  effectText: string;
};

export type CityBuilderHudState = {
  insideSettlement: boolean;
  settlementLevel: number;
  npcCount: number;
  production: {
    pending: ResourceCounts;
    capacity: number;
    used: number;
    canCollect: boolean;
    cycleSeconds: number;
  };
  buildings: CityBuildingHudState[];
};

export type CityUpgradeResult = {
  success: boolean;
  buildingId: CityBuildingId;
  newLevel: number;
  reason?:
    | 'locked'
    | 'insufficient-resources'
    | 'max-level';
};

const BUILDING_NAMES:
  Record<CityBuildingId, string> = {
  storage: 'Склад',
  sawmill: 'Лесопилка',
  workshop: 'Мастерская',
  house: 'Дом',
};

const BUILDING_POSITIONS:
  Record<
    CityBuildingId,
    readonly [number, number]
  > = {
  storage: [520, 1080],
  sawmill: [340, 955],
  workshop: [930, 1040],
  house: [545, 735],
};

const BUILDING_COLORS:
  Record<CityBuildingId, number> = {
  storage: 0x8a6842,
  sawmill: 0xa47b45,
  workshop: 0x72777a,
  house: 0xb77754,
};

const BUILDING_COSTS:
  Record<
    CityBuildingId,
    readonly ResourceCounts[]
  > = {
  storage: [
    {
      wood: 25,
      stone: 10,
      metal: 0,
      coins: 0,
    },
    {
      wood: 40,
      stone: 20,
      metal: 2,
      coins: 20,
    },
    {
      wood: 60,
      stone: 35,
      metal: 6,
      coins: 40,
    },
  ],
  sawmill: [
    {
      wood: 30,
      stone: 8,
      metal: 0,
      coins: 0,
    },
    {
      wood: 45,
      stone: 15,
      metal: 2,
      coins: 25,
    },
    {
      wood: 65,
      stone: 25,
      metal: 5,
      coins: 50,
    },
  ],
  workshop: [
    {
      wood: 20,
      stone: 25,
      metal: 4,
      coins: 0,
    },
    {
      wood: 30,
      stone: 40,
      metal: 8,
      coins: 30,
    },
    {
      wood: 45,
      stone: 60,
      metal: 14,
      coins: 60,
    },
  ],
  house: [
    {
      wood: 25,
      stone: 12,
      metal: 0,
      coins: 0,
    },
    {
      wood: 40,
      stone: 20,
      metal: 2,
      coins: 30,
    },
    {
      wood: 60,
      stone: 30,
      metal: 5,
      coins: 55,
    },
  ],
};

type VisualBundle = {
  pad: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  npc: Phaser.GameObjects.Arc;
  npcLabel: Phaser.GameObjects.Text;
};

export class CityBuilderSystem {
  private readonly visuals =
    new Map<
      CityBuildingId,
      VisualBundle
    >();

  constructor(
    private readonly scene:
      Phaser.Scene,
    private readonly buildings:
      Record<BuildingId, number>,
    private readonly production:
      SettlementProductionState,
  ) {
    for (
      const id of
      CITY_BUILDING_IDS
    ) {
      this.createVisual(id);
    }

    this.syncVisuals();
  }

  updateProduction(
    now = Date.now(),
  ): boolean {
    if (
      this.production.lastTickAt <= 0
    ) {
      this.production.lastTickAt =
        now;
      return true;
    }

    const elapsed =
      Math.max(
        0,
        Math.min(
          MAX_OFFLINE_MS,
          now -
            this.production
              .lastTickAt,
        ),
      );
    const cycles =
      Math.floor(
        elapsed /
          PRODUCTION_CYCLE_MS,
      );

    if (cycles <= 0) {
      return false;
    }

    this.production.lastTickAt +=
      cycles *
      PRODUCTION_CYCLE_MS;

    const before =
      totalPending(
        this.production.pending,
      );

    for (
      let cycle = 0;
      cycle < cycles;
      cycle += 1
    ) {
      this.produceOneCycle();
    }

    return (
      totalPending(
        this.production.pending,
      ) !== before ||
      cycles > 0
    );
  }

  getHudState(
    storage: ResourceCounts,
    insideSettlement: boolean,
  ): CityBuilderHudState {
    const capacity =
      this.productionCapacity;
    const used =
      totalPending(
        this.production.pending,
      );

    return {
      insideSettlement,
      settlementLevel:
        this.computeSettlementLevel(),
      npcCount:
        this.computeNpcCount(),
      production: {
        pending: {
          ...this.production
            .pending,
        },
        capacity,
        used,
        canCollect:
          used > 0,
        cycleSeconds:
          PRODUCTION_CYCLE_MS /
          1000,
      },
      buildings:
        CITY_BUILDING_IDS.map(
          (id) => {
            const level =
              this.level(id);
            const nextCost =
              level >=
              MAX_CITY_BUILDING_LEVEL
                ? null
                : {
                    ...BUILDING_COSTS[
                      id
                    ][level],
                  };
            const lockReason =
              this.getLockReason(id);

            return {
              id,
              name:
                BUILDING_NAMES[id],
              level,
              maxLevel:
                MAX_CITY_BUILDING_LEVEL,
              locked:
                lockReason.length > 0,
              lockReason,
              nextCost,
              canAfford:
                !lockReason &&
                Boolean(
                  nextCost &&
                  canAfford(
                    storage,
                    nextCost,
                  ),
                ),
              effectText:
                this.getEffectText(id),
            };
          },
        ),
    };
  }

  attemptUpgrade(
    id: CityBuildingId,
    storage: ResourceCounts,
    now = Date.now(),
  ): CityUpgradeResult {
    const level =
      this.level(id);

    if (
      level >=
      MAX_CITY_BUILDING_LEVEL
    ) {
      return {
        success: false,
        buildingId: id,
        newLevel: level,
        reason: 'max-level',
      };
    }

    if (
      this.getLockReason(id)
    ) {
      return {
        success: false,
        buildingId: id,
        newLevel: level,
        reason: 'locked',
      };
    }

    const cost =
      BUILDING_COSTS[id][level];

    if (
      !canAfford(
        storage,
        cost,
      )
    ) {
      return {
        success: false,
        buildingId: id,
        newLevel: level,
        reason:
          'insufficient-resources',
      };
    }

    storage.wood -= cost.wood;
    storage.stone -= cost.stone;
    storage.metal -= cost.metal;
    storage.coins -= cost.coins;

    this.buildings[id] =
      level + 1;

    this.production.lastTickAt =
      now;

    this.syncVisuals();

    return {
      success: true,
      buildingId: id,
      newLevel: level + 1,
    };
  }

  collectProduction(
    storage: ResourceCounts,
  ): ResourceCounts {
    const collected = {
      ...this.production.pending,
    };

    storage.wood +=
      collected.wood;
    storage.stone +=
      collected.stone;
    storage.metal +=
      collected.metal;
    storage.coins +=
      collected.coins;

    this.production.pending.wood = 0;
    this.production.pending.stone = 0;
    this.production.pending.metal = 0;
    this.production.pending.coins = 0;

    return collected;
  }

  computeSettlementLevel(): number {
    if (
      this.buildings.forge <= 0
    ) {
      return 0;
    }

    const cityLevels =
      CITY_BUILDING_IDS.reduce(
        (sum, id) =>
          sum + this.level(id),
        0,
      );

    return Math.min(
      5,
      1 +
        Math.floor(
          cityLevels / 3,
        ),
    );
  }

  destroy(): void {
    for (
      const visual of
      this.visuals.values()
    ) {
      visual.pad.destroy();
      visual.label.destroy();
      visual.npc.destroy();
      visual.npcLabel.destroy();
    }

    this.visuals.clear();
  }

  private get productionCapacity():
    number {
    const storageLevel =
      this.level('storage');

    return [
      20,
      80,
      160,
      300,
    ][storageLevel] ?? 20;
  }

  private level(
    id: CityBuildingId,
  ): number {
    return Phaser.Math.Clamp(
      Math.floor(
        this.buildings[id] ?? 0,
      ),
      0,
      MAX_CITY_BUILDING_LEVEL,
    );
  }

  private getLockReason(
    id: CityBuildingId,
  ): string {
    if (
      this.buildings.forge <= 0
    ) {
      return 'Сначала восстановите кузницу';
    }

    if (
      id === 'sawmill' &&
      this.level('storage') < 1
    ) {
      return 'Нужен Склад Lv.1';
    }

    if (
      id === 'workshop' &&
      this.level('storage') < 1
    ) {
      return 'Нужен Склад Lv.1';
    }

    if (
      id === 'house' &&
      (
        this.level('sawmill') < 1 ||
        this.level('workshop') < 1
      )
    ) {
      return 'Нужны Лесопилка и Мастерская Lv.1';
    }

    return '';
  }

  private getEffectText(
    id: CityBuildingId,
  ): string {
    const level =
      this.level(id);

    if (id === 'storage') {
      return `Буфер производства: ${this.productionCapacity}`;
    }

    if (id === 'sawmill') {
      return level > 0
        ? `+${2 * level} дерева / 30с`
        : 'Производит дерево';
    }

    if (id === 'workshop') {
      return level > 0
        ? `+${level} камня +${Math.ceil(level / 2)} металла / 30с`
        : 'Производит камень и металл';
    }

    return level > 0
      ? `+${2 * level} монет / 30с · жителей +${2 * level}`
      : 'Даёт жителей и монеты';
  }

  private computeNpcCount(): number {
    let count =
      this.buildings.forge > 0
        ? 1
        : 0;

    if (
      this.level('storage') > 0
    ) {
      count += 1;
    }

    if (
      this.level('sawmill') > 0
    ) {
      count += 1;
    }

    if (
      this.level('workshop') > 0
    ) {
      count += 1;
    }

    count +=
      this.level('house') * 2;

    return count;
  }

  private produceOneCycle(): void {
    const sawmill =
      this.level('sawmill');
    const workshop =
      this.level('workshop');
    const house =
      this.level('house');

    this.addPending(
      'wood',
      sawmill * 2,
    );
    this.addPending(
      'stone',
      workshop,
    );
    this.addPending(
      'metal',
      Math.ceil(
        workshop / 2,
      ),
    );
    this.addPending(
      'coins',
      house * 2,
    );
  }

  private addPending(
    type: keyof ResourceCounts,
    amount: number,
  ): void {
    let remaining =
      Math.max(
        0,
        Math.floor(amount),
      );

    while (
      remaining > 0 &&
      totalPending(
        this.production.pending,
      ) <
        this.productionCapacity
    ) {
      this.production.pending[
        type
      ] =
        (
          this.production.pending[
            type
          ] ?? 0
        ) + 1;
      remaining -= 1;
    }
  }

  private createVisual(
    id: CityBuildingId,
  ): void {
    const [x, y] =
      BUILDING_POSITIONS[id];

    const pad =
      this.scene.add
        .rectangle(
          x,
          y,
          86,
          58,
          0x6e6e64,
          0.55,
        )
        .setStrokeStyle(
          3,
          0xe7d6a4,
          0.48,
        )
        .setDepth(y + 20);

    const label =
      this.scene.add
        .text(
          x,
          y + 46,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#4a3b2e',
            backgroundColor:
              '#f3e5b6cc',
            padding: {
              x: 6,
              y: 3,
            },
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setDepth(y + 90);

    const npc =
      this.scene.add
        .circle(
          x + 58,
          y + 13,
          13,
          0xd6a16a,
          1,
        )
        .setStrokeStyle(
          3,
          0x59412f,
          0.8,
        )
        .setDepth(y + 76)
        .setVisible(false);

    const npcLabel =
      this.scene.add
        .text(
          x + 58,
          y + 36,
          '',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor:
              '#374737cc',
            padding: {
              x: 4,
              y: 2,
            },
          },
        )
        .setOrigin(0.5)
        .setDepth(y + 90)
        .setVisible(false);

    this.visuals.set(
      id,
      {
        pad,
        label,
        npc,
        npcLabel,
      },
    );
  }

  private syncVisuals(): void {
    for (
      const id of
      CITY_BUILDING_IDS
    ) {
      const visual =
        this.visuals.get(id);

      if (!visual) {
        continue;
      }

      const level =
        this.level(id);
      const active =
        level > 0;
      const width =
        active
          ? 86 + level * 18
          : 72;
      const height =
        active
          ? 58 + level * 10
          : 42;

      visual.pad
        .setDisplaySize(
          width,
          height,
        )
        .setFillStyle(
          active
            ? BUILDING_COLORS[id]
            : 0x6e6e64,
          active ? 1 : 0.52,
        )
        .setStrokeStyle(
          active ? 4 : 3,
          active
            ? 0xf0d18a
            : 0xb8ad8b,
          active ? 0.82 : 0.45,
        );

      visual.label.setText(
        active
          ? `${BUILDING_NAMES[id]} · Lv.${level}`
          : `${BUILDING_NAMES[id]} · руины`,
      );

      visual.npc.setVisible(
        active,
      );

      const npcName =
        id === 'storage'
          ? 'Кладовщик'
          : id === 'sawmill'
            ? 'Лесоруб'
            : id === 'workshop'
              ? 'Мастер'
              : `Жители ×${level * 2}`;

      visual.npcLabel
        .setText(npcName)
        .setVisible(active);
    }
  }
}

function canAfford(
  storage: ResourceCounts,
  cost: ResourceCounts,
): boolean {
  return (
    storage.wood >= cost.wood &&
    storage.stone >= cost.stone &&
    storage.metal >= cost.metal &&
    storage.coins >= cost.coins
  );
}

function totalPending(
  value: ResourceCounts,
): number {
  return (
    value.wood +
    value.stone +
    value.metal +
    value.coins
  );
}
