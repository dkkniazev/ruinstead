import Phaser from 'phaser';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import {
  SETTLEMENT_CENTER,
} from '../world/WorldPrototype';

export const FORGE_POSITION =
  new Phaser.Math.Vector2(
    SETTLEMENT_CENTER.x + 240,
    SETTLEMENT_CENTER.y - 80,
  );
export const FORGE_INTERACTION_RADIUS = 145;
export const FORGE_MAX_REPAIR_STAGE = 3;

export type ForgeRepairResult = {
  success: boolean;
  completed: boolean;
  newStage: number;
  reason?:
    | 'already-restored'
    | 'insufficient-resources';
};

export type SettlementHudState = {
  nearForge: boolean;
  forge: {
    repairStage: number;
    maxRepairStage: number;
    restored: boolean;
    stageName: string;
    nextCost: ResourceCounts | null;
    canAfford: boolean;
    storage: ResourceCounts;
    npcPresent: boolean;
  };
};

const FORGE_STAGE_TEXTURES = [
  'ruinstead-forge-stage-0-overlay',
  'ruinstead-forge-stage-1',
  'ruinstead-forge-stage-2',
  'ruinstead-forge-stage-3',
] as const;

const BLACKSMITH_TEXTURE =
  'ruinstead-blacksmith-stage4';

const FORGE_STAGE_COSTS:
  Record<number, ResourceCounts> = {
  0: {
    wood: 10,
    stone: 0,
    metal: 0,
    coins: 0,
  },
  1: {
    wood: 20,
    stone: 10,
    metal: 0,
    coins: 0,
  },
  2: {
    wood: 0,
    stone: 10,
    metal: 5,
    coins: 0,
  },
};

const STAGE_NAMES = [
  'Развалины',
  'Площадка расчищена',
  'Каркас кузницы',
  'Кузница восстановлена',
] as const;

export class SettlementSystem {
  private repairStage: number;
  private forgeLevel: number;
  private nearForge = false;

  private readonly forgeOverlay:
    Phaser.GameObjects.Image;
  private readonly interactionMarker:
    Phaser.GameObjects.Text;
  private readonly blacksmith:
    Phaser.GameObjects.Image;
  private readonly blacksmithLabel:
    Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    repairStage: number,
    forgeLevel: number,
  ) {
    ensureSettlementTextures(scene);

    this.repairStage =
      Phaser.Math.Clamp(
        Math.floor(repairStage),
        0,
        FORGE_MAX_REPAIR_STAGE,
      );
    this.forgeLevel =
      Math.max(
        0,
        Math.floor(forgeLevel),
      );

    if (
      this.forgeLevel > 0
    ) {
      this.repairStage =
        FORGE_MAX_REPAIR_STAGE;
    }

    this.forgeOverlay = scene.add
      .image(
        FORGE_POSITION.x,
        FORGE_POSITION.y,
        FORGE_STAGE_TEXTURES[
          this.repairStage
        ],
      )
      .setDepth(
        FORGE_POSITION.y + 86,
      );

    this.interactionMarker = scene.add
      .text(
        FORGE_POSITION.x,
        FORGE_POSITION.y + 92,
        '',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#fff7d6',
          backgroundColor:
            '#29432ddd',
          padding: {
            x: 9,
            y: 5,
          },
        },
      )
      .setOrigin(0.5)
      .setDepth(
        FORGE_POSITION.y + 180,
      )
      .setVisible(false);

    this.blacksmith = scene.add
      .image(
        FORGE_POSITION.x + 126,
        FORGE_POSITION.y + 42,
        BLACKSMITH_TEXTURE,
      )
      .setDepth(
        FORGE_POSITION.y + 130,
      );

    this.blacksmithLabel = scene.add
      .text(
        FORGE_POSITION.x + 126,
        FORGE_POSITION.y + 96,
        'Кузнец',
        {
          fontFamily:
            'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#4b3a2a',
          backgroundColor:
            '#fff0b8cc',
          padding: {
            x: 7,
            y: 3,
          },
        },
      )
      .setOrigin(0.5)
      .setDepth(
        FORGE_POSITION.y + 181,
      );

    this.syncVisualState();
  }

  get currentRepairStage(): number {
    return this.repairStage;
  }

  get restored(): boolean {
    return (
      this.repairStage >=
        FORGE_MAX_REPAIR_STAGE ||
      this.forgeLevel > 0
    );
  }

  update(
    playerPosition:
      Phaser.Math.Vector2,
  ): boolean {
    const nextNear =
      Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        FORGE_POSITION.x,
        FORGE_POSITION.y,
      ) <=
      FORGE_INTERACTION_RADIUS;

    const changed =
      nextNear !==
      this.nearForge;

    this.nearForge =
      nextNear;

    this.interactionMarker
      .setVisible(nextNear)
      .setText(
        this.restored
          ? 'E · Кузница'
          : 'E · Восстановить кузницу',
      );

    return changed;
  }

  getHudState(
    storage: ResourceCounts,
  ): SettlementHudState {
    const nextCost =
      this.restored
        ? null
        : {
            ...FORGE_STAGE_COSTS[
              this.repairStage
            ],
          };

    return {
      nearForge:
        this.nearForge,
      forge: {
        repairStage:
          this.repairStage,
        maxRepairStage:
          FORGE_MAX_REPAIR_STAGE,
        restored:
          this.restored,
        stageName:
          STAGE_NAMES[
            this.repairStage
          ],
        nextCost,
        canAfford:
          nextCost
            ? canAfford(
                storage,
                nextCost,
              )
            : false,
        storage: {
          ...storage,
        },
        npcPresent:
          this.restored,
      },
    };
  }

  attemptForgeRepair(
    storage: ResourceCounts,
  ): ForgeRepairResult {
    if (this.restored) {
      return {
        success: false,
        completed: true,
        newStage:
          this.repairStage,
        reason:
          'already-restored',
      };
    }

    const cost =
      FORGE_STAGE_COSTS[
        this.repairStage
      ];

    if (
      !canAfford(
        storage,
        cost,
      )
    ) {
      return {
        success: false,
        completed: false,
        newStage:
          this.repairStage,
        reason:
          'insufficient-resources',
      };
    }

    storage.wood -=
      cost.wood;
    storage.stone -=
      cost.stone;
    storage.metal -=
      cost.metal;
    storage.coins -=
      cost.coins;

    this.repairStage =
      Math.min(
        FORGE_MAX_REPAIR_STAGE,
        this.repairStage + 1,
      );

    const completed =
      this.repairStage >=
      FORGE_MAX_REPAIR_STAGE;

    if (completed) {
      this.forgeLevel =
        Math.max(
          1,
          this.forgeLevel,
        );
    }

    this.syncVisualState();

    return {
      success: true,
      completed,
      newStage:
        this.repairStage,
    };
  }

  destroy(): void {
    this.forgeOverlay.destroy();
    this.interactionMarker.destroy();
    this.blacksmith.destroy();
    this.blacksmithLabel.destroy();
  }

  private syncVisualState(): void {
    this.forgeOverlay
      .setTexture(
        FORGE_STAGE_TEXTURES[
          this.repairStage
        ],
      )
      .setVisible(
        this.repairStage > 0,
      );

    const npcVisible =
      this.restored;

    this.blacksmith.setVisible(
      npcVisible,
    );
    this.blacksmithLabel.setVisible(
      npcVisible,
    );
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

function ensureSettlementTextures(
  scene: Phaser.Scene,
): void {
  ensureStageOneTexture(scene);
  ensureStageTwoTexture(scene);
  ensureStageThreeTexture(scene);
  ensureBlankTexture(scene);
  ensureBlacksmithTexture(scene);
}

function ensureBlankTexture(
  scene: Phaser.Scene,
): void {
  const key =
    FORGE_STAGE_TEXTURES[0];

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0xffffff,
    0,
  );
  g.fillRect(
    0,
    0,
    2,
    2,
  );

  g.generateTexture(
    key,
    2,
    2,
  );
  g.destroy();
}

function ensureStageOneTexture(
  scene: Phaser.Scene,
): void {
  const key =
    FORGE_STAGE_TEXTURES[1];

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x4a6c3e,
    0.16,
  );
  g.fillEllipse(
    105,
    128,
    190,
    34,
  );

  g.fillStyle(
    0xbc9d72,
    1,
  );
  g.fillRoundedRect(
    28,
    94,
    154,
    35,
    9,
  );

  g.fillStyle(
    0xe0c397,
    1,
  );
  g.fillRoundedRect(
    39,
    84,
    132,
    18,
    7,
  );

  g.lineStyle(
    7,
    0x79522f,
    1,
  );
  g.lineBetween(
    50,
    91,
    50,
    50,
  );
  g.lineBetween(
    159,
    91,
    159,
    50,
  );

  g.generateTexture(
    key,
    210,
    145,
  );
  g.destroy();
}

function ensureStageTwoTexture(
  scene: Phaser.Scene,
): void {
  const key =
    FORGE_STAGE_TEXTURES[2];

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0xa98458,
    1,
  );
  g.fillRoundedRect(
    28,
    59,
    154,
    70,
    10,
  );

  g.fillStyle(
    0xd0b27d,
    1,
  );
  g.fillRoundedRect(
    37,
    52,
    136,
    20,
    7,
  );

  g.lineStyle(
    8,
    0x6d4a2e,
    1,
  );
  g.lineBetween(
    35,
    47,
    35,
    130,
  );
  g.lineBetween(
    176,
    47,
    176,
    130,
  );
  g.lineBetween(
    35,
    48,
    176,
    48,
  );
  g.lineBetween(
    35,
    48,
    176,
    128,
  );
  g.lineBetween(
    176,
    48,
    35,
    128,
  );

  g.fillStyle(
    0x4c4337,
    1,
  );
  g.fillRect(
    122,
    82,
    35,
    47,
  );

  g.generateTexture(
    key,
    210,
    145,
  );
  g.destroy();
}

function ensureStageThreeTexture(
  scene: Phaser.Scene,
): void {
  const key =
    FORGE_STAGE_TEXTURES[3];

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x4a6c3e,
    0.16,
  );
  g.fillEllipse(
    105,
    132,
    196,
    32,
  );

  g.fillStyle(
    0xb78655,
    1,
  );
  g.fillRoundedRect(
    24,
    59,
    162,
    74,
    12,
  );

  g.fillStyle(
    0xe4c17d,
    1,
  );
  g.beginPath();
  g.moveTo(
    18,
    66,
  );
  g.lineTo(
    103,
    17,
  );
  g.lineTo(
    192,
    66,
  );
  g.lineTo(
    174,
    79,
  );
  g.lineTo(
    104,
    48,
  );
  g.lineTo(
    36,
    79,
  );
  g.closePath();
  g.fillPath();

  g.fillStyle(
    0x5b4633,
    1,
  );
  g.fillRoundedRect(
    119,
    82,
    37,
    51,
    5,
  );

  g.fillStyle(
    0x513e31,
    1,
  );
  g.fillRoundedRect(
    43,
    86,
    48,
    35,
    5,
  );

  g.fillStyle(
    0xff7538,
    1,
  );
  g.fillCircle(
    67,
    103,
    13,
  );

  g.fillStyle(
    0xffd45c,
    1,
  );
  g.fillCircle(
    67,
    101,
    7,
  );

  g.fillStyle(
    0x6d6f70,
    1,
  );
  g.fillRoundedRect(
    147,
    18,
    20,
    54,
    5,
  );

  g.generateTexture(
    key,
    210,
    150,
  );
  g.destroy();
}

function ensureBlacksmithTexture(
  scene: Phaser.Scene,
): void {
  if (
    scene.textures.exists(
      BLACKSMITH_TEXTURE,
    )
  ) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x463629,
    0.18,
  );
  g.fillEllipse(
    38,
    92,
    58,
    16,
  );

  g.fillStyle(
    0x6e4430,
    1,
  );
  g.fillRoundedRect(
    21,
    49,
    34,
    39,
    10,
  );

  g.fillStyle(
    0xd9a66f,
    1,
  );
  g.fillCircle(
    38,
    34,
    18,
  );

  g.fillStyle(
    0x4a3229,
    1,
  );
  g.fillEllipse(
    38,
    27,
    35,
    17,
  );

  g.fillStyle(
    0x3e3f43,
    1,
  );
  g.fillRoundedRect(
    24,
    64,
    28,
    25,
    7,
  );

  g.fillStyle(
    0xe8d9c2,
    1,
  );
  g.fillEllipse(
    38,
    46,
    25,
    14,
  );

  g.generateTexture(
    BLACKSMITH_TEXTURE,
    76,
    104,
  );
  g.destroy();
}
