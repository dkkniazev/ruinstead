import Phaser from 'phaser';
import type {
  BackpackSystem,
} from '../gathering/BackpackSystem';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import {
  getRegionResourceProfile,
} from '../economy/RegionEconomy';
import {
  getRegionDefinition,
  type RegionId,
} from './ReleaseRegionMap';

type ChestDefinition = {
  id: string;
  x: number;
  y: number;
  rewards: ResourceCounts;
};

function buildChests():
  ChestDefinition[] {
  const result:
    ChestDefinition[] = [];

  for (
    let regionId = 1;
    regionId <= 8;
    regionId += 1
  ) {
    const id =
      regionId as RegionId;
    const region =
      getRegionDefinition(id);
    const profile =
      getRegionResourceProfile(id);

    const positions:
      ReadonlyArray<
        readonly [number, number]
      > = [
      [-0.18, 0.1],
      [0.48, 0.2],
    ];

    positions.forEach(
      (
        [ox, oy],
        index,
      ) => {
        const scale =
          regionId +
          index +
          1;
        const rewards:
          ResourceCounts = {
          wood:
            profile.abundance
              .wood > 0
              ? Math.max(
                  0,
                  profile.abundance
                    .wood *
                    2 +
                  index,
                )
              : 0,
          stone:
            profile.abundance
              .stone > 0
              ? Math.max(
                  0,
                  profile.abundance
                    .stone +
                  index,
                )
              : 0,
          metal:
            profile.abundance
              .metal > 0
              ? Math.max(
                  1,
                  Math.ceil(
                    profile.abundance
                      .metal /
                      2,
                  ),
                )
              : 0,
          crystal:
            profile.abundance
              .crystal > 0
              ? Math.max(
                  1,
                  Math.ceil(
                    profile.abundance
                      .crystal /
                      2,
                  ),
                )
              : 0,
          fiber:
            profile.abundance
              .fiber > 0
              ? Math.max(
                  1,
                  profile.abundance
                    .fiber +
                  index,
                )
              : 0,
          coins:
            12 *
            scale,
        };

        result.push({
          id:
            `region-${regionId}-cache-${index + 1}`,
          x:
            Math.round(
              region.center[0] +
              region.radiusX *
                ox,
            ),
          y:
            Math.round(
              region.center[1] +
              region.radiusY *
                oy,
            ),
          rewards,
        });
      },
    );
  }

  return result;
}

const CHESTS:
  readonly ChestDefinition[] =
  buildChests();

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
    scene: Phaser.Scene,
    private readonly backpack:
      BackpackSystem,
    private readonly openedIds:
      string[],
    private readonly onChanged:
      () => void,
    private readonly onNotice:
      (message: string) => void,
    private readonly onOpened?:
      (
        chestId: string,
        rewards: ResourceCounts,
      ) => void,
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
      this.onOpened?.(
        chest.definition.id,
        {
          ...chest.definition
            .rewards,
        },
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
