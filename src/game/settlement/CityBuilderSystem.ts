import Phaser from 'phaser';
import type {
  BuildingId,
} from '../state/GameState';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import {
  SETTLEMENT_CENTER,
} from '../world/WorldPrototype';

export const CITY_BUILDING_IDS = [
  'storage',
  'sawmill',
  'workshop',
  'house',
] as const;

export type CityBuildingId =
  (typeof CITY_BUILDING_IDS)[number];

export const MAX_CITY_BUILDING_LEVEL = 8;
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
  storage: [SETTLEMENT_CENTER.x - 210, SETTLEMENT_CENTER.y + 210],
  sawmill: [SETTLEMENT_CENTER.x - 430, SETTLEMENT_CENTER.y - 40],
  workshop: [SETTLEMENT_CENTER.x + 430, SETTLEMENT_CENTER.y + 170],
  house: [SETTLEMENT_CENTER.x - 190, SETTLEMENT_CENTER.y - 360],
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
    { wood: 25, stone: 10, metal: 0, crystal: 0, fiber: 0, coins: 0 },
    { wood: 40, stone: 20, metal: 2, crystal: 0, fiber: 0, coins: 20 },
    { wood: 60, stone: 35, metal: 6, crystal: 0, fiber: 0, coins: 40 },
    { wood: 80, stone: 50, metal: 10, crystal: 4, fiber: 6, coins: 80 },
    { wood: 105, stone: 65, metal: 14, crystal: 8, fiber: 10, coins: 120 },
    { wood: 135, stone: 85, metal: 20, crystal: 14, fiber: 14, coins: 180 },
    { wood: 170, stone: 110, metal: 28, crystal: 22, fiber: 20, coins: 260 },
    { wood: 210, stone: 140, metal: 38, crystal: 32, fiber: 28, coins: 360 },
  ],
  sawmill: [
    { wood: 30, stone: 8, metal: 0, crystal: 0, fiber: 0, coins: 0 },
    { wood: 45, stone: 15, metal: 2, crystal: 0, fiber: 0, coins: 25 },
    { wood: 65, stone: 25, metal: 5, crystal: 0, fiber: 0, coins: 50 },
    { wood: 90, stone: 35, metal: 8, crystal: 3, fiber: 10, coins: 80 },
    { wood: 120, stone: 50, metal: 12, crystal: 6, fiber: 16, coins: 125 },
    { wood: 155, stone: 65, metal: 18, crystal: 10, fiber: 24, coins: 185 },
    { wood: 195, stone: 85, metal: 24, crystal: 16, fiber: 34, coins: 260 },
    { wood: 240, stone: 110, metal: 32, crystal: 24, fiber: 46, coins: 350 },
  ],
  workshop: [
    { wood: 20, stone: 25, metal: 4, crystal: 0, fiber: 0, coins: 0 },
    { wood: 30, stone: 40, metal: 8, crystal: 0, fiber: 0, coins: 30 },
    { wood: 45, stone: 60, metal: 14, crystal: 0, fiber: 0, coins: 60 },
    { wood: 60, stone: 80, metal: 22, crystal: 8, fiber: 5, coins: 100 },
    { wood: 80, stone: 105, metal: 32, crystal: 14, fiber: 8, coins: 155 },
    { wood: 105, stone: 135, metal: 44, crystal: 22, fiber: 12, coins: 225 },
    { wood: 135, stone: 170, metal: 58, crystal: 32, fiber: 18, coins: 310 },
    { wood: 170, stone: 210, metal: 74, crystal: 45, fiber: 24, coins: 420 },
  ],
  house: [
    { wood: 25, stone: 12, metal: 0, crystal: 0, fiber: 0, coins: 0 },
    { wood: 40, stone: 20, metal: 2, crystal: 0, fiber: 0, coins: 30 },
    { wood: 60, stone: 30, metal: 5, crystal: 0, fiber: 0, coins: 55 },
    { wood: 85, stone: 40, metal: 8, crystal: 3, fiber: 12, coins: 95 },
    { wood: 115, stone: 55, metal: 12, crystal: 6, fiber: 20, coins: 145 },
    { wood: 150, stone: 75, metal: 18, crystal: 10, fiber: 30, coins: 210 },
    { wood: 190, stone: 100, metal: 24, crystal: 16, fiber: 42, coins: 290 },
    { wood: 235, stone: 130, metal: 32, crystal: 24, fiber: 56, coins: 390 },
  ],
};

type VisualBundle = {
  pad: Phaser.GameObjects.Rectangle;
  art?: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  npc: Phaser.GameObjects.Arc;
  npcLabel: Phaser.GameObjects.Text;
};

export class CityBuilderSystem {
  get visualBuildings(): ReadonlyArray<{ id: CityBuildingId; x: number; y: number; level: number }> {
    return CITY_BUILDING_IDS.map((id) => ({ id, x: BUILDING_POSITIONS[id][0], y: BUILDING_POSITIONS[id][1], level: this.level(id) }));
  }
  private productionMultiplier = 1;
  private capacityMultiplier = 1;
  private themeTint = 0xffffff;
  private readonly productionCarry = {
    wood: 0,
    stone: 0,
    metal: 0,
    coins: 0,
  };
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

  setMetaMultipliers(
    productionMultiplier: number,
    capacityMultiplier: number,
  ): void {
    this.productionMultiplier =
      Math.max(
        1,
        productionMultiplier,
      );
    this.capacityMultiplier =
      Math.max(
        1,
        capacityMultiplier,
      );
  }

  setThemeTint(
    tint: number,
  ): void {
    this.themeTint =
      tint;
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
    storage.crystal =
      (storage.crystal ?? 0) -
      (cost.crystal ?? 0);
    storage.fiber =
      (storage.fiber ?? 0) -
      (cost.fiber ?? 0);
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
    multiplier = 1,
  ): ResourceCounts {
    const collected = {
      ...this.production.pending,
    };
    const safeMultiplier =
      Math.max(
        1,
        Math.floor(multiplier),
      );

    storage.wood +=
      collected.wood *
      safeMultiplier;
    storage.stone +=
      collected.stone *
      safeMultiplier;
    storage.metal +=
      collected.metal *
      safeMultiplier;
    storage.coins +=
      collected.coins *
      safeMultiplier;

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
      visual.art?.destroy();
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

    const base =
      [
        20,
        80,
        160,
        300,
        500,
        750,
        1050,
        1400,
        1800,
      ][storageLevel] ?? 20;

    return Math.round(
      base *
        this.capacityMultiplier,
    );
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

    this.addScaledPending(
      'wood',
      sawmill * 2,
    );
    this.addScaledPending(
      'stone',
      workshop,
    );
    this.addScaledPending(
      'metal',
      Math.ceil(
        workshop / 2,
      ),
    );
    this.addScaledPending(
      'coins',
      house * 2,
    );
  }

  private addScaledPending(
    type:
      keyof typeof this.productionCarry,
    baseAmount: number,
  ): void {
    const raw =
      Math.max(
        0,
        baseAmount,
      ) *
        this.productionMultiplier +
      this.productionCarry[type];
    const amount =
      Math.floor(raw);

    this.productionCarry[type] =
      Math.max(
        0,
        raw - amount,
      );

    this.addPending(
      type,
      amount,
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
        .setDepth(y - 5);

    const artTexture = id === 'storage' || id === 'house'
      ? 'ruinstead-forest-hut'
      : id === 'workshop'
        ? 'ruinstead-forge-workshop'
        : null;
    const art = artTexture
      ? this.scene.add.image(x, y - 42, artTexture)
        .setDisplaySize(id === 'workshop' ? 170 : 145, id === 'workshop' ? 145 : 135)
        .setDepth(y + 25)
      : undefined;

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
        art,
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
          multiplyColor(
            active
              ? BUILDING_COLORS[id]
              : 0x6e6e64,
            this.themeTint,
          ),
          active ? 1 : 0.52,
        )
        .setStrokeStyle(
          active ? 4 : 3,
          active
            ? 0xf0d18a
            : 0xb8ad8b,
          active ? 0.82 : 0.45,
        );

      visual.art
        ?.setAlpha(active ? 1 : 0.88)
        .setTint(active ? this.themeTint : 0x79877f);

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
    (storage.crystal ?? 0) >=
      (cost.crystal ?? 0) &&
    (storage.fiber ?? 0) >=
      (cost.fiber ?? 0) &&
    storage.coins >= cost.coins
  );
}

function multiplyColor(
  base: number,
  tint: number,
): number {
  const r =
    Math.round(
      ((base >> 16) & 0xff) *
        ((tint >> 16) & 0xff) /
        255,
    );
  const g =
    Math.round(
      ((base >> 8) & 0xff) *
        ((tint >> 8) & 0xff) /
        255,
    );
  const b =
    Math.round(
      (base & 0xff) *
        (tint & 0xff) /
        255,
    );

  return (
    (r << 16) |
    (g << 8) |
    b
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
