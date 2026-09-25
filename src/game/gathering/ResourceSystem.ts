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
  deathDropBatchId?: number;
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

  // Stage 2: rare materials define the new region economy.
  // The entry pair lets a Lv.5 player begin the Lv.6 ascension without first winning a Stage 2 fight.
  { id: 'crystal-entry', type: 'crystal', x: 3160, y: 1320, durability: 4, dropCount: 4, respawnMs: 75_000 },
  { id: 'fiber-entry', type: 'fiber', x: 3090, y: 1210, durability: 3, dropCount: 6, respawnMs: 60_000 },
  { id: 'crystal-1', type: 'crystal', x: 3460, y: 650, durability: 5, dropCount: 3, respawnMs: 110_000 },
  { id: 'crystal-2', type: 'crystal', x: 3920, y: 940, durability: 5, dropCount: 3, respawnMs: 110_000 },
  { id: 'crystal-3', type: 'crystal', x: 4470, y: 580, durability: 6, dropCount: 4, respawnMs: 120_000 },
  { id: 'crystal-4', type: 'crystal', x: 5120, y: 1040, durability: 6, dropCount: 4, respawnMs: 120_000 },

  { id: 'fiber-1', type: 'fiber', x: 3290, y: 1160, durability: 3, dropCount: 5, respawnMs: 70_000 },
  { id: 'fiber-2', type: 'fiber', x: 3760, y: 480, durability: 3, dropCount: 5, respawnMs: 70_000 },
  { id: 'fiber-3', type: 'fiber', x: 4310, y: 1260, durability: 4, dropCount: 6, respawnMs: 80_000 },
  { id: 'fiber-4', type: 'fiber', x: 4970, y: 1450, durability: 4, dropCount: 6, respawnMs: 80_000 },
];

const NODE_TEXTURES:
  Record<HarvestResourceType, string> = {
  wood: 'ruinstead-resource-node-wood-pile',
  stone: 'ruinstead-resource-node-stone-pile',
  metal: 'ruinstead-resource-node-metal-pile',
  crystal:
    'ruinstead-resource-node-sun-crystal',
  fiber:
    'ruinstead-resource-node-dry-fiber',
};

const PICKUP_TEXTURES:
  Record<ResourceType, string> = {
  wood: 'ruinstead-resource-pickup-wood',
  stone: 'ruinstead-resource-pickup-stone',
  metal: 'ruinstead-resource-pickup-metal',
  crystal:
    'ruinstead-resource-pickup-crystal',
  fiber:
    'ruinstead-resource-pickup-fiber',
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
  private nextDeathDropBatchId = 1;
  private gatheringMultiplier = 1;
  private pickupRangeMultiplier = 1;
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
    private readonly onNodeDepleted?:
      (
        type: HarvestResourceType,
      ) => void,
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
      this.onNodeDepleted?.(
        node.definition.type,
      );
    }
  }

  setGatheringMultiplier(
    multiplier: number,
  ): void {
    this.gatheringMultiplier =
      Math.max(
        1,
        multiplier,
      );
  }

  setPickupRangeMultiplier(
    multiplier: number,
  ): void {
    this.pickupRangeMultiplier =
      Math.max(
        1,
        multiplier,
      );
  }

  spawnResourceDrop(
    position: Phaser.Math.Vector2,
    contents: ResourceCounts,
  ): void {
    let slot = 0;

    for (
      const type of
      RESOURCE_TYPES
    ) {
      const amount =
        contents[type] ?? 0;

      if (amount <= 0) {
        continue;
      }

      const angle =
        (slot / 6) *
        Math.PI *
        2;

      this.spawnPickupStack(
        type,
        position.x +
          Math.cos(angle) * 42,
        position.y +
          Math.sin(angle) * 30,
        amount,
        this.scene.time.now +
          PICKUP_LIFETIME_MS,
        false,
      );

      slot += 1;
    }
  }

  spawnDeathDrop(
    position: Phaser.Math.Vector2,
    contents: ResourceCounts,
  ): number {
    const batchId =
      this.nextDeathDropBatchId++;
    let slot = 0;

    for (
      const type of
      RESOURCE_TYPES
    ) {
      const amount =
        contents[type] ?? 0;

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
        batchId,
      );

      slot += 1;
    }

    return batchId;
  }

  hasDeathDrop(
    batchId: number,
  ): boolean {
    return this.pickups.some(
      (pickup) =>
        pickup.deathDropBatchId ===
        batchId,
    );
  }

  recoverDeathDrop(
    batchId: number,
  ): ResourceCounts {
    const recovered:
      ResourceCounts = {
      wood: 0,
      stone: 0,
      metal: 0,
      crystal: 0,
      fiber: 0,
      coins: 0,
    };

    for (
      let index =
        this.pickups.length - 1;
      index >= 0;
      index -= 1
    ) {
      const pickup =
        this.pickups[index];

      if (
        pickup.deathDropBatchId !==
        batchId
      ) {
        continue;
      }

      recovered[pickup.type] =
        (recovered[pickup.type] ?? 0) +
        pickup.amount;

      this.removePickup(
        index,
        false,
      );
    }

    return recovered;
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
        PICKUP_MAGNET_RANGE * this.pickupRangeMultiplier + 24
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
    const dropCount =
      Math.max(
        definition.dropCount,
        Math.round(
          definition.dropCount *
            this.gatheringMultiplier,
        ),
      );

    for (
      let index = 0;
      index < dropCount;
      index += 1
    ) {
      const angle =
        (Math.PI * 2 * index) /
          dropCount +
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
    deathDropBatchId?: number,
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
      deathDropBatchId,
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
            PICKUP_MAGNET_RANGE * this.pickupRangeMultiplier + 24
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
          PICKUP_MAGNET_RANGE *
            this.pickupRangeMultiplier &&
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
  ensureCrystalNode(scene);
  ensureFiberNode(scene);

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
    'crystal',
    0xf2c85d,
  );
  ensurePickupTexture(
    scene,
    'fiber',
    0xd7b77a,
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

function ensureCrystalNode(
  scene: Phaser.Scene,
): void {
  const key =
    NODE_TEXTURES.crystal;

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x7b6643,
    0.24,
  );
  g.fillEllipse(
    52,
    68,
    86,
    18,
  );

  for (
    const [x, y, h] of
    [
      [28, 56, 42],
      [48, 48, 58],
      [69, 57, 39],
    ] as const
  ) {
    g.fillStyle(
      0xe1ad42,
      1,
    );
    g.fillTriangle(
      x - 11,
      y + 12,
      x,
      y - h / 2,
      x + 11,
      y + 12,
    );
    g.fillStyle(
      0xffe58a,
      0.75,
    );
    g.fillTriangle(
      x - 3,
      y + 7,
      x,
      y - h / 2 + 8,
      x + 5,
      y + 8,
    );
  }

  g.generateTexture(
    key,
    104,
    82,
  );
  g.destroy();
}

function ensureFiberNode(
  scene: Phaser.Scene,
): void {
  const key =
    NODE_TEXTURES.fiber;

  if (scene.textures.exists(key)) {
    return;
  }

  const g =
    scene.make.graphics({
      x: 0,
      y: 0,
    });

  g.fillStyle(
    0x6e603d,
    0.18,
  );
  g.fillEllipse(
    52,
    68,
    86,
    18,
  );

  for (
    const x of
    [26, 40, 54, 68, 80]
  ) {
    g.lineStyle(
      7,
      0xc59c5b,
      1,
    );
    g.lineBetween(
      x,
      68,
      x - 7,
      30 +
        (x % 3) * 5,
    );
    g.fillStyle(
      0xe2c880,
      1,
    );
    g.fillEllipse(
      x - 7,
      29 +
        (x % 3) * 5,
      16,
      11,
    );
  }

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
  } else if (
    type === 'crystal'
  ) {
    g.fillTriangle(
      4,
      18,
      14,
      3,
      25,
      18,
    );
    g.fillStyle(
      0xffed9b,
      0.85,
    );
    g.fillTriangle(
      11,
      14,
      14,
      6,
      17,
      15,
    );
  } else if (
    type === 'fiber'
  ) {
    g.lineStyle(
      5,
      0xb48d50,
      1,
    );
    g.lineBetween(
      7,
      18,
      13,
      5,
    );
    g.lineBetween(
      14,
      19,
      19,
      5,
    );
    g.lineBetween(
      20,
      18,
      23,
      7,
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
