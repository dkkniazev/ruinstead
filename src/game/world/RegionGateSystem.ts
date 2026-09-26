import Phaser from 'phaser';
import {
  RELEASE_PASSAGES,
  RELEASE_REGIONS,
  getRegionDefinition,
  getPassageGeometry,

  regionIsUnlocked,
  type RegionId,
  type RegionPassage,
} from './ReleaseRegionMap';

type GateVisual = {
  blockers:
    Phaser.GameObjects.Rectangle[];
  label:
    Phaser.GameObjects.Text;
};

const BOUNDARY_BLOCK = 84;
const BOUNDARY_TARGET_SPACING = 68;


export class RegionGateSystem {
  readonly barriers:
    Phaser.Physics.Arcade.StaticGroup;

  private readonly gateVisuals =
    new Map<
      string,
      GateVisual
    >();

  constructor(
    private readonly scene:
      Phaser.Scene,
    unlockedZones:
      readonly string[],
  ) {
    this.barriers =
      scene.physics.add.staticGroup();

    this.createRegionBoundaries();
    this.createCorridorWalls();
    this.sync(unlockedZones);
  }

  sync(
    unlockedZones:
      readonly string[],
  ): void {
    for (
      const visual of
      this.gateVisuals.values()
    ) {
      for (
        const blocker of
        visual.blockers
      ) {
        blocker.destroy();
      }
      visual.label.destroy();
    }
    this.gateVisuals.clear();

    for (
      const passage of
      RELEASE_PASSAGES
    ) {
      if (
        passage.id === '1-2' ||
        passage.id === '2-3'
      ) {
        continue;
      }

      const open =
        regionIsUnlocked(
          unlockedZones,
          passage.a,
        ) &&
        regionIsUnlocked(
          unlockedZones,
          passage.b,
        );

      if (!open) {
        this.createGate(
          passage,
          unlockedZones,
        );
      }
    }
  }

  destroy(): void {
    for (
      const visual of
      this.gateVisuals.values()
    ) {
      visual.label.destroy();
    }
    this.gateVisuals.clear();
    this.barriers.destroy(true);
  }

  private createRegionBoundaries(): void {
    for (const region of RELEASE_REGIONS) {
      const approaches = RELEASE_PASSAGES.filter(p => p.a === region.id || p.b === region.id)
        .map(passage => ({ ...getPassageGeometry(passage), width: passage.width }));
      for (let edge = 0; edge < region.outline.length; edge++) {
        const a = region.outline[edge], b = region.outline[(edge + 1) % region.outline.length];
        const segments = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / BOUNDARY_TARGET_SPACING);
        for (let step = 0; step < segments; step++) {
          const t = step / segments;
          const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
          const opening = approaches.some(p => {
            const forward = (x - p.a.x) * p.ux + (y - p.a.y) * p.uy;
            const lateral = Math.abs((x - p.a.x) * -p.uy + (y - p.a.y) * p.ux);
            return forward > -80 && forward < p.length + 80 && lateral < p.width / 2 + 55;
          });
          if (!opening) this.barriers.add(this.scene.add.rectangle(x, y, BOUNDARY_BLOCK, BOUNDARY_BLOCK, 0, 0));
        }
      }
    }
  }

  private createCorridorWalls():
    void {
    for (
      const passage of
      RELEASE_PASSAGES
    ) {
      const endpoints =
        getPassageGeometry(
          passage,
        );
      const dx =
        endpoints.b.x -
        endpoints.a.x;
      const dy =
        endpoints.b.y -
        endpoints.a.y;
      const length =
        Math.max(
          1,
          Math.hypot(dx, dy),
        );
      const nx =
        -dy / length;
      const ny =
        dx / length;
      const wallOffset =
        passage.width / 2 +
        58;
      const steps =
        Math.max(
          2,
          Math.ceil(
            length / 100,
          ),
        );

      for (
        let index = 0;
        index <= steps;
        index += 1
      ) {
        const t =
          index / steps;
        const baseX =
          Phaser.Math.Linear(
            endpoints.a.x,
            endpoints.b.x,
            t,
          );
        const baseY =
          Phaser.Math.Linear(
            endpoints.a.y,
            endpoints.b.y,
            t,
          );

        for (
          const side of
          [-1, 1] as const
        ) {
          const wall =
            this.scene.add
              .rectangle(
                baseX +
                  nx *
                    wallOffset *
                    side,
                baseY +
                  ny *
                    wallOffset *
                    side,
                96,
                96,
                0x18201f,
                0,
              );

          this.barriers.add(
            wall,
          );
        }
      }
    }
  }

  private createGate(
    passage:
      RegionPassage,
    unlockedZones:
      readonly string[],
  ): void {
    const endpoints =
      getPassageGeometry(
        passage,
      );
    const midX =
      (
        endpoints.a.x +
        endpoints.b.x
      ) / 2;
    const midY =
      (
        endpoints.a.y +
        endpoints.b.y
      ) / 2;
    const dx =
      endpoints.b.x -
      endpoints.a.x;
    const dy =
      endpoints.b.y -
      endpoints.a.y;
    const length =
      Math.max(
        1,
        Math.hypot(dx, dy),
      );
    const nx =
      -dy / length;
    const ny =
      dx / length;
    const count =
      Math.max(
        3,
        Math.ceil(
          passage.width / 72,
        ),
      );
    const blockers:
      Phaser.GameObjects.Rectangle[] =
      [];

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const offset =
        (
          index -
          (count - 1) / 2
        ) *
        72;
      const blocker =
        this.scene.add
          .rectangle(
            midX +
              nx * offset,
            midY +
              ny * offset,
            82,
            82,
            0x382f2b,
            0.76,
          )
          .setStrokeStyle(
            3,
            0xcaa35d,
            0.8,
          )
          .setDepth(
            midY + 30,
          );

      this.barriers.add(
        blocker,
      );
      blockers.push(
        blocker,
      );
    }

    const aUnlocked =
      regionIsUnlocked(
        unlockedZones,
        passage.a,
      );
    const bUnlocked =
      regionIsUnlocked(
        unlockedZones,
        passage.b,
      );
    const lockedRegion =
      aUnlocked &&
      !bUnlocked
        ? passage.b
        : bUnlocked &&
            !aUnlocked
          ? passage.a
          : Math.max(
              passage.a,
              passage.b,
            ) as RegionId;
    const target =
      getRegionDefinition(
        lockedRegion,
      );
    const label =
      this.scene.add
        .text(
          midX,
          midY - 86,
          `Проход закрыт · регион ${target.id}`,
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#fff0bd',
            backgroundColor:
              '#302c29dd',
            padding: {
              x: 7,
              y: 4,
            },
          },
        )
        .setOrigin(0.5)
        .setDepth(
          midY + 120,
        );

    this.gateVisuals.set(
      passage.id,
      {
        blockers,
        label,
      },
    );
  }
}

