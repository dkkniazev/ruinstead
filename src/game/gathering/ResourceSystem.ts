import Phaser from 'phaser';
import type {
  BackpackSystem,
} from './BackpackSystem';
import {
  RESOURCE_TYPES,
  type ResourceCounts,
  type ResourceType,
} from './ResourceTypes';

type HarvestResourceType =
  Exclude<ResourceType, 'coins'>;

const HARVEST_RANGE = 88;
const HARVEST_COOLDOWN_MS = 620;
const PICKUP_MAGNET_RANGE = 170;
const PICKUP_COLLECT_RANGE = 24;
const PICKUP_SPEED = 390;
const PICKUP_LIFETIME_MS = 90_000;

type ResourceNodeDefinition = {
  id: string;
  type: HarvestResourceType;
  x: number;
  y: number;
  durability: number;
  dropCount: number;
  respawnMs: number;
};

type ResourcePickup = {
  type: ResourceType;
  amount: number;
  sprite: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  expiresAt: number;
  deathDrop: boolean;
  pickupEnabled: boolean;
  requiresExitAfterRespawn: boolean;
};

const NODE_DEFINITIONS:
  readonly ResourceNodeDefinition[] = [
  // Opushka / goblin territory: abundant wood.
  { id: 'wood-1', type: 'wood', x: 1030, y: 1080, durability: 3, dropCount: 4, respawnMs: 45_000 },
  { id: 'wood-2', type: 'wood', x: 1160, y: 1240, durability: 3, dropCount: 4, respawnMs: 45_000 },
  { id: 'wood-3', type: 'wood', x: 1320, y: 690, durability: 3, dropCount: 4, respawnMs: 45_000 },
  { id: 'wood-4', type: 'wood', x: 1480, y: 930, durability: 3, dropCount: 4, respawnMs: 45_000 },
  { id: 'wood-5', type: 'wood', x: 1740, y: 890, durability: 3, dropCount: 4, respawnMs: 45_000 },
  { id: 'wood-6', type: 'wood', x: 2020, y: 920, durability: 3, dropCount: 4, respawnMs: 45_000 },

  // Mid-zone stone pockets.
  { id: 'stone-1', type: 'stone', x: 1440, y: 520, durability: 4, dropCount: 3, respawnMs: 60_000 },
  { id: 'stone-2', type: 'stone', x: 1640, y: 1110, durability: 4, dropCount: 3, respawnMs: 60_000 },
  { id: 'stone-3', type: 'stone', x: 1900, y: 820, durability: 4, dropCount: 3, respawnMs: 60_000 },
  { id: 'stone-4', type: 'stone', x: 2080, y: 1280, durability: 4, dropCount: 3, respawnMs: 60_000 },
  { id: 'stone-5', type: 'stone', x: 2280, y: 930, durability: 4, dropCount: 3, respawnMs: 60_000 },

  // Metal is biased toward the dangerous inner forest, away from boss spawn circles.
  { id: 'metal-1', type: 'metal', x: 1880, y: 610, durability: 5, dropCount: 2, respawnMs: 90_000 },
  { id: 'metal-2', type: 'metal', x: 2110, y: 880, durability: 5, dropCount: 2, respawnMs: 90_000 },
  { id: 'metal-3', type: 'metal', x: 2260, y: 1180, durability: 5, dropCount: 2, respawnMs: 90_000 },
  { id: 'metal-4', type: 'metal', x: 2050, y: 1490, durability: 5, dropCount: 2, respawnMs: 90_000 },
];

const NODE_TEXTURES:
  Record<HarvestResourceType, string> = {
  wood: 'ruinstead-resource-node-wood-pile',
  stone: 'ruinstead-resource-node-stone-pile',
  metal: 'ruinstead-resource-node-metal-pile',
};

const PICKUP_TEXTURES:
  Record<ResourceType, string> = {
  wood: 'ruinstead-resource-pickup-wood',
  stone: 'ruinstead-resource-pickup-stone',
  metal: 'ruinstead-resource-pickup-metal',
  coins: 'ruinstead-resource-pickup-coins',
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
    readonly definition: ResourceNodeDefinition,
  ) {
    this.health = definition.durability;

    this.sprite = scene.add
      .image(
        definition.x,
        definition.y,
        NODE_TEXTURES[definition.type],
      )
      .setDepth(definition.y + 45);

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
      .setDepth(definition.y + 130)
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
      .setDepth(definition.y + 131)
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
      Math.max(0, this.health - 1);

    this.back.setVisible(true);
    this.fill.setVisible(true);
    this.fill.setDisplaySize(
      46 *
        (
          this.health /
          this.definition.durability
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
      this.definition.respawnMs;

    this.back.setVisible(false);
    this.fill.setVisible(false);

    this.scene.tweens.add({
      targets: this.sprite,
      scale: 0.2,
      alpha: 0,
      duration: 180,
      ease: 'Back.In',
      onComplete: () => {
        this.sprite.setVisible(false);
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
      time < this.nextHarvestAt
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
      time + HARVEST_COOLDOWN_MS;

    if (node.hit()) {
      this.spawnNodeDrops(
        node.definition,
      );
    }
  }

  spawnDeathDrop(
    position: Phaser.Math.Vector2,
    contents: ResourceCounts,
  ): void {
    let slot = 0;

    for (
      const type of
      RESOURCE_TYPES
    ) {
      const amount =
        contents[type];

      if (amount <= 0) {
        continue;
      }

      const angle =
        (slot / 4) *
        Math.PI *
        2;

      this.spawnPickupStack(
        type,
        position.x +
          Math.cos(angle) * 38,
        position.y +
          Math.sin(angle) * 28,
        amount,
        Number.POSITIVE_INFINITY,
        true,
      );

      slot += 1;
    }
  }

  handlePlayerRespawned(
    playerPosition:
      Phaser.Math.Vector2,
  ): void {
    for (
      const pickup of
      this.pickups
    ) {
      if (
        !pickup.deathDrop ||
        pickup.pickupEnabled
      ) {
        continue;
      }

      const distance =
        Phaser.Math.Distance.Between(
          playerPosition.x,
          playerPosition.y,
          pickup.sprite.x,
          pickup.sprite.y,
        );

      if (
        distance >
        PICKUP_MAGNET_RANGE + 24
      ) {
        pickup.pickupEnabled =
          true;
        pickup.requiresExitAfterRespawn =
          false;
      } else {
        pickup.requiresExitAfterRespawn =
          true;
      }
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
      pickup.label?.destroy();
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
        distance <= bestDistance
      ) {
        best = node;
        bestDistance = distance;
      }
    }

    return best;
  }

  private spawnNodeDrops(
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

      this.spawnPickupStack(
        definition.type,
        definition.x +
          Math.cos(angle) * radius,
        definition.y +
          Math.sin(angle) * radius,
        1,
        this.scene.time.now +
          PICKUP_LIFETIME_MS,
        false,
      );
    }
  }

  private spawnPickupStack(
    type: ResourceType,
    x: number,
    y: number,
    amount: number,
    expiresAt: number,
    persistent: boolean,
  ): void {
    const sprite =
      this.scene.add
        .image(
          x,
          y,
          PICKUP_TEXTURES[type],
        )
        .setDepth(y + 120)
        .setScale(
          persistent ? 1.15 : 0.35,
        );

    let label:
      Phaser.GameObjects.Text | undefined;

    if (amount > 1) {
      label =
        this.scene.add
          .text(
            x + 13,
            y - 14,
            `×${amount}`,
            {
              fontFamily:
                'system-ui, sans-serif',
              fontSize: '13px',
              fontStyle: 'bold',
              color: '#ffffff',
              stroke: '#3c3b2c',
              strokeThickness: 3,
            },
          )
          .setDepth(y + 121);
    }

    if (!persistent) {
      this.scene.tweens.add({
        targets: sprite,
        scale: 1,
        y: sprite.y - 10,
        duration: 160,
        yoyo: true,
        ease: 'Back.Out',
      });
    } else {
      this.scene.tweens.add({
        targets: sprite,
        scale: 1.3,
        duration: 260,
        yoyo: true,
        ease: 'Sine.InOut',
      });
    }

    this.pickups.push({
      type,
      amount,
      sprite,
      label,
      expiresAt,
      deathDrop:
        persistent,
      pickupEnabled:
        !persistent,
      requiresExitAfterRespawn:
        false,
    });
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
        Number.isFinite(
          pickup.expiresAt,
        ) &&
        time >= pickup.expiresAt
      ) {
        this.removePickup(
          index,
          true,
        );
        continue;
      }

      if (
        pickup.deathDrop &&
        !pickup.pickupEnabled
      ) {
        if (
          pickup.requiresExitAfterRespawn &&
          Phaser.Math.Distance.Between(
            playerPosition.x,
            playerPosition.y,
            pickup.sprite.x,
            pickup.sprite.y,
          ) >
            PICKUP_MAGNET_RANGE + 24
        ) {
          pickup.pickupEnabled =
            true;
          pickup.requiresExitAfterRespawn =
            false;
        } else {
          continue;
        }
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
            pickup.amount,
          );

        if (accepted > 0) {
          pickup.amount -= accepted;
          this.onBackpackChanged();

          if (
            pickup.amount <= 0
          ) {
            this.removePickup(
              index,
              false,
            );
          } else {
            this.updatePickupLabel(
              pickup,
            );
          }
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

        pickup.label
          ?.setPosition(
            pickup.sprite.x + 13,
            pickup.sprite.y - 14,
          )
          .setDepth(
            pickup.sprite.y + 121,
          );
      }
    }
  }

  private updatePickupLabel(
    pickup: ResourcePickup,
  ): void {
    if (pickup.amount <= 1) {
      pickup.label?.destroy();
      pickup.label = undefined;
      return;
    }

    if (!pickup.label) {
      pickup.label =
        this.scene.add
          .text(
            pickup.sprite.x + 13,
            pickup.sprite.y - 14,
            '',
            {
              fontFamily:
                'system-ui, sans-serif',
              fontSize: '13px',
              fontStyle: 'bold',
              color: '#ffffff',
              stroke: '#3c3b2c',
              strokeThickness: 3,
            },
          );
    }

    pickup.label
      .setText(
        `×${pickup.amount}`,
      )
      .setDepth(
        pickup.sprite.y + 121,
      );
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

    pickup.label?.destroy();

    this.scene.tweens.add({
      targets: pickup.sprite,
      scale:
        fade
          ? pickup.sprite.scale
          : 1.45,
      alpha: 0,
      duration:
        fade ? 220 : 100,
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
  ensurePickupTexture(
    scene,
    'coins',
    0xe3a724,
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
    0x315f35,
    0.16,
  );
  g.fillEllipse(
    52,
    65,
    88,
    20,
  );

  const logs = [
    [13, 39, 62, 15],
    [24, 25, 62, 15],
    [10, 52, 69, 15],
  ] as const;

  for (
    const [x, y, w, h]
    of logs
  ) {
    g.fillStyle(
      0x9b6337,
      1,
    );
    g.fillRoundedRect(
      x,
      y,
      w,
      h,
      7,
    );

    g.fillStyle(
      0xc98b50,
      1,
    );
    g.fillCircle(
      x + w - 4,
      y + h / 2,
      h / 2 - 1,
    );

    g.fillStyle(
      0x6f4326,
      0.8,
    );
    g.fillCircle(
      x + w - 4,
      y + h / 2,
      3,
    );
  }

  g.generateTexture(
    key,
    104,
    78,
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
    0x315f35,
    0.14,
  );
  g.fillEllipse(
    52,
    65,
    88,
    20,
  );

  const stones = [
    [25, 49, 20],
    [46, 43, 24],
    [69, 50, 19],
    [35, 29, 18],
    [60, 25, 21],
  ] as const;

  for (
    const [x, y, r]
    of stones
  ) {
    g.fillStyle(
      0x909b98,
      1,
    );
    g.fillCircle(
      x,
      y,
      r,
    );

    g.fillStyle(
      0xc6d0cb,
      0.72,
    );
    g.fillEllipse(
      x - 5,
      y - 6,
      r,
      r * 0.6,
    );
  }

  g.generateTexture(
    key,
    104,
    78,
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
    0x315f35,
    0.14,
  );
  g.fillEllipse(
    52,
    67,
    88,
    20,
  );

  g.fillStyle(
    0x667982,
    1,
  );
  g.fillRoundedRect(
    19,
    39,
    70,
    16,
    4,
  );
  g.fillRoundedRect(
    34,
    22,
    18,
    49,
    4,
  );

  g.fillStyle(
    0x8fa6ad,
    1,
  );
  g.fillTriangle(
    16,
    58,
    38,
    29,
    50,
    61,
  );
  g.fillTriangle(
    55,
    57,
    76,
    25,
    90,
    60,
  );

  g.fillStyle(
    0xb7e2ea,
    0.8,
  );
  g.fillCircle(
    52,
    47,
    8,
  );

  g.generateTexture(
    key,
    104,
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
    g.fillCircle(
      10,
      14,
      7,
    );
    g.fillCircle(
      18,
      12,
      8,
    );
  } else if (
    type === 'metal'
  ) {
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
  } else {
    g.fillCircle(
      14,
      12,
      10,
    );
    g.fillStyle(
      0xffdf55,
      1,
    );
    g.fillCircle(
      12,
      10,
      6,
    );
  }

  g.generateTexture(
    key,
    28,
    24,
  );
  g.destroy();
}
