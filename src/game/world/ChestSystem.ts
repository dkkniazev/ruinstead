import Phaser from 'phaser';
import type {
  BackpackSystem,
} from '../gathering/BackpackSystem';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';

type ChestDefinition = {
  id: string;
  x: number;
  y: number;
  rewards: ResourceCounts;
};

const CHESTS:
  readonly ChestDefinition[] = [
  {
    id: 'stage-2-crystal-cache',
    x: 3700,
    y: 870,
    rewards: {
      wood: 0,
      stone: 0,
      metal: 1,
      coins: 12,
      crystal: 5,
      fiber: 3,
    },
  },
  {
    id: 'stage-2-caravan-cache',
    x: 4860,
    y: 1110,
    rewards: {
      wood: 0,
      stone: 2,
      metal: 1,
      coins: 18,
      crystal: 3,
      fiber: 7,
    },
  },
];

const OPEN_RANGE = 82;

type ChestVisual = {
  definition: ChestDefinition;
  body: Phaser.GameObjects.Rectangle;
  lid: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

export class ChestSystem {
  private readonly chests:
    ChestVisual[] = [];

  constructor(
    private readonly scene:
      Phaser.Scene,
    private readonly backpack:
      BackpackSystem,
    private readonly openedIds:
      string[],
    private readonly onChanged:
      () => void,
    private readonly onNotice:
      (message: string) => void,
  ) {
    for (
      const definition of
      CHESTS
    ) {
      const opened =
        openedIds.includes(
          definition.id,
        );

      const body =
        scene.add
          .rectangle(
            definition.x,
            definition.y,
            58,
            38,
            opened
              ? 0x6c6250
              : 0x8a5b2f,
            1,
          )
          .setStrokeStyle(
            3,
            opened
              ? 0x8c8372
              : 0xe1b84f,
            0.95,
          )
          .setDepth(
            definition.y + 70,
          );

      const lid =
        scene.add
          .rectangle(
            definition.x,
            definition.y - 20,
            62,
            18,
            opened
              ? 0x777166
              : 0xb67835,
            1,
          )
          .setDepth(
            definition.y + 71,
          );

      const label =
        scene.add
          .text(
            definition.x,
            definition.y + 42,
            opened
              ? 'Сундук пуст'
              : 'Сундук ресурсов',
            {
              fontFamily:
                'system-ui, sans-serif',
              fontSize: '11px',
              fontStyle: 'bold',
              color: opened
                ? '#b8b3a9'
                : '#fff0b3',
              backgroundColor:
                '#413d34cc',
              padding: {
                x: 5,
                y: 2,
              },
            },
          )
          .setOrigin(0.5)
          .setDepth(
            definition.y + 100,
          );

      if (opened) {
        lid.setY(
          definition.y - 34,
        );
      }

      this.chests.push({
        definition,
        body,
        lid,
        label,
      });
    }
  }

  update(
    playerPosition:
      Phaser.Math.Vector2,
    threatened: boolean,
  ): void {
    if (threatened) {
      return;
    }

    for (
      const chest of
      this.chests
    ) {
      if (
        this.openedIds.includes(
          chest.definition.id,
        )
      ) {
        continue;
      }

      const distance =
        Phaser.Math.Distance.Between(
          playerPosition.x,
          playerPosition.y,
          chest.definition.x,
          chest.definition.y,
        );

      if (distance > OPEN_RANGE) {
        continue;
      }

      if (
        !this.backpack
          .canAcceptBundle(
            chest.definition
              .rewards,
          )
      ) {
        this.onNotice(
          'В рюкзаке недостаточно места для содержимого сундука',
        );
        return;
      }

      this.backpack.addBundle(
        chest.definition.rewards,
      );
      this.openedIds.push(
        chest.definition.id,
      );

      chest.lid.setY(
        chest.definition.y -
          34,
      );
      chest.body.setFillStyle(
        0x6c6250,
        1,
      );
      chest.label
        .setText('Сундук пуст')
        .setColor(
          '#b8b3a9',
        );

      this.onChanged();
      this.onNotice(
        `Сундук открыт: ${formatReward(
          chest.definition
            .rewards,
        )}`,
      );
    }
  }

  destroy(): void {
    for (
      const chest of
      this.chests
    ) {
      chest.body.destroy();
      chest.lid.destroy();
      chest.label.destroy();
    }

    this.chests.length = 0;
  }
}

function formatReward(
  rewards: ResourceCounts,
): string {
  return [
    rewards.crystal
      ? `кристалл ×${rewards.crystal}`
      : '',
    rewards.fiber
      ? `волокно ×${rewards.fiber}`
      : '',
    rewards.metal
      ? `металл ×${rewards.metal}`
      : '',
    rewards.stone
      ? `камень ×${rewards.stone}`
      : '',
    rewards.coins
      ? `монеты ×${rewards.coins}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
