import Phaser from 'phaser';
import type {
  BackpackSystem,
} from './BackpackSystem';
import type {
  ResourceType,
} from './ResourceTypes';

const HARVEST_RANGE = 88;
const HARVEST_COOLDOWN_MS = 620;
const PICKUP_MAGNET_RANGE = 170;
const PICKUP_COLLECT_RANGE = 24;
const PICKUP_SPEED = 390;
const PICKUP_LIFETIME_MS = 90_000;

type ResourceNodeDefinition = {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
  durability: number;
  dropCount: number;
  respawnMs: number;
};

type ResourcePickup = {
  type: ResourceType;
  sprite: Phaser.GameObjects.Image;
  expiresAt: number;
};

const NODE_DEFINITIONS:
  readonly ResourceNodeDefinition[] = [
  {
    id: 'wood-1',
    type: 'wood',
    x: 1040,
    y: 560,
    durability: 3,
    dropCount: 4,
    respawnMs: 45_000,
  },
  {
    id: 'wood-2',
    type: 'wood',
    x: 1240,
    y: 620,
    durability: 3,
    dropCount: 4,
    respawnMs: 45_000,
  },
  {
    id: 'wood-3',
    type: 'wood',
    x: 1400,
    y: 1120,
    durability: 3,
    dropCount: 4,
    respawnMs: 45_000,
  },
  {
    id: 'wood-4',
    type: 'wood',
    x: 1650,
    y: 950,
    durability: 3,
    dropCount: 4,
    respawnMs: 45_000,
  },
  {
    id: 'wood-5',
    type: 'wood',
    x: 1870,
    y: 1360,
    durability: 3,
    dropCount: 4,
    respawnMs: 45_000,
  },
  {
    id: 'wood-6',
    type: 'wood',
    x: 2210,
    y: 850,
    durability: 3,
    dropCount: 4,
    respawnMs: 45_000,
  },
  {
    id: 'stone-1',
    type: 'stone',
    x: 1160,
    y: 420,
    durability: 4,
    dropCount: 3,
    respawnMs: 60_000,
  },
  {
    id: 'stone-2',
    type: 'stone',
    x: 1510,
    y: 720,
    durability: 4,
    dropCount: 3,
    respawnMs: 60_000,
  },
  {
    id: 'stone-3',
    type: 'stone',
    x: 1900,
    y: 1010,
    durability: 4,
    dropCount: 3,
    respawnMs: 60_000,
  },
  {
    id: 'stone-4',
    type: 'stone',
    x: 2310,
    y: 1300,
    durability: 4,
    dropCount: 3,
    respawnMs: 60_000,
  },
  {
    id: 'stone-5',
    type: 'stone',
    x: 1980,
    y: 1460,
    durability: 4,
    dropCount: 3,
    respawnMs: 60_000,
  },
  {
    id: 'metal-1',
    type: 'metal',
    x: 1700,
    y: 430,
    durability: 5,
    dropCount: 2,
    respawnMs: 90_000,
  },
  {
    id: 'metal-2',
    type: 'metal',
    x: 2050,
    y: 620,
    durability: 5,
    dropCount: 2,
    respawnMs: 90_000,
  },
  {
    id: 'metal-3',
    type: 'metal',
    x: 2420,
    y: 980,
    durability: 5,
    dropCount: 2,
    respawnMs: 90_000,
  },
  {
    id: 'metal-4',
    type: 'metal',
    x: 2190,
    y: 1510,
    durability: 5,
    dropCount: 2,
    respawnMs: 90_000,
  },
];

const NODE_TEXTURES:
  Record<ResourceType, string> = {
  wood:
    'ruinstead-resource-node-wood',
  stone:
    'ruinstead-resource-node-stone',
  metal:
    'ruinstead-resource-node-metal',
};

const PICKUP_TEXTURES:
  Record<ResourceType, string> = {
  wood:
    'ruinstead-resource-pickup-wood',
  stone:
    'ruinstead-resource-pickup-stone',
  metal:
    'ruinstead-resource-pickup-metal',
};

class ResourceNode {
  readonly sprite:
    Phaser.GameObjects.Image;

  private readonly back:
    Phaser.GameObjects.Rectangle;
  private readonly fill:
    Phaser.GameObjects.Rectangle;

  private health: number;
  private respawnAt = 0;
  private active = true;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly definition:
      ResourceNodeDefinition,
  ) {
    this.health =
      definition.durability;

    this.sprite =
      scene.add
        .image(
          definition.x,
          definition.y,
          NODE_TEXTURES[
            definition.type
          ],
        )
        .setDepth(
          definition.y + 45,
        );

    this.back = scene.add
      .rectangle(
        definition.x - 25,
        definition.y - 45,
        50,
        7,
        0x2d3027,
        0.75,
      )
      .setOrigin(0, 0.5)
      .setDepth(
        definition.y + 130,
      )
      .setVisible(false);

    this.fill = scene.add
      .rectangle(
        definition.x - 23,
        definition.y - 45,
        46,
        5,
        0x7dd462,
        0.96,
      )
      .setOrigin(0, 0.5)
      .setDepth(
        definition.y + 131,
      )
      .setVisible(false);
  }

  get available(): boolean {
    return this.active;
  }

  update(time: number): void {
    if (
      !this.active &&
      this.respawnAt > 0 &&
      time >= this.respawnAt
    ) {
      this.respawn();
    }
  }

  distanceTo(
    position: Phaser.Math.Vector2,
  ): number {
    return Phaser.Math.Distance.Between(
      position.x,
      position.y,
      this.definition.x,
      this.definition.y,
    );
  }

  hit(): boolean {
    if (!this.active) {
      return false;
    }

    this.health =
      Math.max(
        0,
        this.health - 1,
      );

    this.back.setVisible(true);
    this.fill.setVisible(true);

    this.fill.setDisplaySize(
      46 *
        (
          this.health /
          this.definition
            .durability
        ),
      5,
    );

    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.08,
      scaleY: 0.92,
      duration: 70,
      yoyo: true,
      ease: 'Quad.Out',
    });

    if (this.health > 0) {
      return false;
    }

    this.deplete();
    return true;
  }

  destroy(): void {
    this.sprite.destroy();
    this.back.destroy();
    this.fill.destroy();
  }

  private deplete(): void {
    this.active = false;
    this.respawnAt =
      this.scene.time.now +
      this.definition
        .respawnMs;

    this.back.setVisible(false);
    this.fill.setVisible(false);

    this.scene.tweens.add({
      targets: this.sprite,
      scale: 0.2,
      alpha: 0,
      duration: 180,
      ease: 'Back.In',
      onComplete: () => {
        this.sprite.setVisible(
          false,
        );
      },
    });
  }

  private respawn(): void {
    this.active = true;
    this.respawnAt = 0;
    this.health =
      this.definition.durability;

    this.sprite
      .setVisible(true)
      .setAlpha(0)
      .setScale(0.4);

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.Out',
    });
  }
}

export class ResourceSystem {
  private readonly nodes:
    ResourceNode[] = [];
  private readonly pickups:
    ResourcePickup[] = [];

  private nextHarvestAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly backpack:
      BackpackSystem,
    private readonly onBackpackChanged:
      () => void,
  ) {
    ensureResourceTextures(scene);

    for (
      const definition of
      NODE_DEFINITIONS
    ) {
      this.nodes.push(
        new ResourceNode(
          scene,
          definition,
        ),
      );
    }
  }

  update(
    time: number,
    delta: number,
    playerPosition:
      Phaser.Math.Vector2,
    threatened: boolean,
  ): void {
    for (
      const node of
      this.nodes
    ) {
      node.update(time);
    }

    this.updatePickups(
      time,
      delta,
      playerPosition,
    );

    if (
      threatened ||
      time <
        this.nextHarvestAt
    ) {
      return;
    }

    const node =
      this.findNearestHarvestable(
        playerPosition,
      );

    if (!node) {
      return;
    }

    this.nextHarvestAt =
      time +
      HARVEST_COOLDOWN_MS;

    const depleted =
      node.hit();

    if (depleted) {
      this.spawnDrops(
        node.definition,
      );
    }
  }

  destroy(): void {
    for (
      const node of
      this.nodes
    ) {
      node.destroy();
    }

    for (
      const pickup of
      this.pickups
    ) {
      pickup.sprite.destroy();
    }

    this.nodes.length = 0;
    this.pickups.length = 0;
  }

  private findNearestHarvestable(
    playerPosition:
      Phaser.Math.Vector2,
  ): ResourceNode | undefined {
    let best:
      ResourceNode | undefined;
    let bestDistance =
      HARVEST_RANGE;

    for (
      const node of
      this.nodes
    ) {
      if (
        !node.available ||
        !this.backpack.canAccept(
          node.definition.type,
        )
      ) {
        continue;
      }

      const distance =
        node.distanceTo(
          playerPosition,
        );

      if (
        distance <=
        bestDistance
      ) {
        best =
          node;
        bestDistance =
          distance;
      }
    }

    return best;
  }

  private spawnDrops(
    definition:
      ResourceNodeDefinition,
  ): void {
    for (
      let index = 0;
      index <
      definition.dropCount;
      index += 1
    ) {
      const angle =
        (Math.PI * 2 * index) /
          definition.dropCount +
        Phaser.Math.FloatBetween(
          -0.28,
          0.28,
        );
      const radius =
        Phaser.Math.Between(
          18,
          38,
        );

      const sprite =
        this.scene.add
          .image(
            definition.x +
              Math.cos(angle) *
                radius,
            definition.y +
              Math.sin(angle) *
                radius,
            PICKUP_TEXTURES[
              definition.type
            ],
          )
          .setDepth(
            definition.y + 120,
          )
          .setScale(0.35);

      this.scene.tweens.add({
        targets: sprite,
        scale: 1,
        y: sprite.y - 10,
        duration: 160,
        yoyo: true,
        ease: 'Back.Out',
      });

      this.pickups.push({
        type:
          definition.type,
        sprite,
        expiresAt:
          this.scene.time.now +
          PICKUP_LIFETIME_MS,
      });
    }
  }

  private updatePickups(
    time: number,
    delta: number,
    playerPosition:
      Phaser.Math.Vector2,
  ): void {
    const seconds =
      delta / 1000;

    for (
      let index =
        this.pickups.length - 1;
      index >= 0;
      index -= 1
    ) {
      const pickup =
        this.pickups[index];

      if (
        time >=
        pickup.expiresAt
      ) {
        this.removePickup(
          index,
          true,
        );
        continue;
      }

      if (
        !this.backpack.canAccept(
          pickup.type,
        )
      ) {
        continue;
      }

      const dx =
        playerPosition.x -
        pickup.sprite.x;
      const dy =
        playerPosition.y -
        pickup.sprite.y;
      const distance =
        Math.hypot(dx, dy);

      if (
        distance <=
          PICKUP_COLLECT_RANGE
      ) {
        const accepted =
          this.backpack.add(
            pickup.type,
            1,
          );

        if (accepted > 0) {
          this.removePickup(
            index,
            false,
          );
          this.onBackpackChanged();
        }

        continue;
      }

      if (
        distance <=
          PICKUP_MAGNET_RANGE &&
        distance > 0.001
      ) {
        const speed =
          distance < 70
            ? PICKUP_SPEED * 1.55
            : PICKUP_SPEED;

        pickup.sprite.x +=
          (dx / distance) *
          speed *
          seconds;
        pickup.sprite.y +=
          (dy / distance) *
          speed *
          seconds;

        pickup.sprite.setDepth(
          pickup.sprite.y + 120,
        );
      }
    }
  }

  private removePickup(
    index: number,
    fade: boolean,
  ): void {
    const [pickup] =
      this.pickups.splice(
        index,
        1,
      );

    if (!pickup) {
      return;
    }

    if (!fade) {
      this.scene.tweens.add({
        targets:
          pickup.sprite,
        scale: 1.45,
        alpha: 0,
        duration: 100,
        onComplete: () => {
          pickup.sprite.destroy();
        },
      });
      return;
    }

    this.scene.tweens.add({
      targets: pickup.sprite,
      alpha: 0,
      duration: 220,
      onComplete: () => {
        pickup.sprite.destroy();
      },
    });
  }
}

function ensureResourceTextures(
  scene: Phaser.Scene,
): void {
  ensureWoodNode(scene);
  ensureStoneNode(scene);
  ensureMetalNode(scene);

  ensurePickupTexture(
    scene,
    'wood',
    0xb77538,
  );
  ensurePickupTexture(
    scene,
    'stone',
    0xa8b1ac,
  );
  ensurePickupTexture(
    scene,
    'metal',
    0x6f8792,
  );
}

function ensureWoodNode(
  scene: Phaser.Scene,
): void {
  const key =
    NODE_TEXTURES.wood;

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x2d6936,
    0.18,
  );
  g.fillEllipse(
    48,
    73,
    80,
    20,
  );

  g.fillStyle(
    0x8f592d,
    1,
  );
  g.fillRoundedRect(
    31,
    28,
    33,
    48,
    10,
  );

  g.fillStyle(
    0x26934f,
    1,
  );
  g.fillCircle(
    48,
    25,
    31,
  );

  g.fillStyle(
    0x45ba61,
    1,
  );
  g.fillCircle(
    35,
    18,
    20,
  );
  g.fillCircle(
    61,
    17,
    21,
  );

  g.generateTexture(
    key,
    96,
    90,
  );
  g.destroy();
}

function ensureStoneNode(
  scene: Phaser.Scene,
): void {
  const key =
    NODE_TEXTURES.stone;

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x344f39,
    0.15,
  );
  g.fillEllipse(
    48,
    68,
    78,
    18,
  );

  g.fillStyle(
    0x87928e,
    1,
  );
  g.fillTriangle(
    13,
    61,
    35,
    27,
    53,
    62,
  );
  g.fillTriangle(
    37,
    62,
    61,
    20,
    85,
    62,
  );

  g.fillStyle(
    0xc8d0ca,
    0.85,
  );
  g.fillTriangle(
    35,
    27,
    45,
    48,
    53,
    62,
  );
  g.fillTriangle(
    61,
    20,
    70,
    43,
    85,
    62,
  );

  g.generateTexture(
    key,
    96,
    82,
  );
  g.destroy();
}

function ensureMetalNode(
  scene: Phaser.Scene,
): void {
  const key =
    NODE_TEXTURES.metal;

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x344f39,
    0.15,
  );
  g.fillEllipse(
    48,
    69,
    80,
    18,
  );

  g.fillStyle(
    0x667982,
    1,
  );
  g.fillTriangle(
    12,
    61,
    38,
    23,
    53,
    63,
  );
  g.fillTriangle(
    38,
    62,
    66,
    27,
    86,
    62,
  );

  g.fillStyle(
    0x9dc9d3,
    0.95,
  );
  g.fillTriangle(
    32,
    37,
    40,
    20,
    48,
    43,
  );
  g.fillTriangle(
    59,
    40,
    68,
    25,
    75,
    47,
  );

  g.generateTexture(
    key,
    96,
    82,
  );
  g.destroy();
}

function ensurePickupTexture(
  scene: Phaser.Scene,
  type: ResourceType,
  color: number,
): void {
  const key =
    PICKUP_TEXTURES[type];

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x244728,
    0.18,
  );
  g.fillEllipse(
    14,
    19,
    23,
    8,
  );

  g.fillStyle(
    color,
    1,
  );

  if (type === 'wood') {
    g.fillRoundedRect(
      5,
      7,
      19,
      10,
      4,
    );
    g.lineStyle(
      2,
      0x69401f,
      0.8,
    );
    g.lineBetween(
      9,
      12,
      21,
      12,
    );
  } else if (
    type === 'stone'
  ) {
    g.fillTriangle(
      4,
      17,
      13,
      5,
      25,
      17,
    );
  } else {
    g.fillTriangle(
      4,
      17,
      14,
      4,
      25,
      17,
    );
    g.fillStyle(
      0xb7e2ea,
      0.8,
    );
    g.fillTriangle(
      12,
      7,
      16,
      5,
      18,
      13,
    );
  }

  g.generateTexture(
    key,
    28,
    24,
  );
  g.destroy();
}
