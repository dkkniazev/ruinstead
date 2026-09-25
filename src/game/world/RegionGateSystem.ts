import Phaser from 'phaser';
import {
  RELEASE_PASSAGES,
  RELEASE_REGIONS,
  getRegionDefinition,
  regionIsUnlocked,
  type RegionPassage,
} from './ReleaseRegionMap';

type GateVisual = {
  blockers:
    Phaser.GameObjects.Rectangle[];
  label:
    Phaser.GameObjects.Text;
};

const BOUNDARY_SEGMENTS = 42;
const BOUNDARY_BLOCK = 105;
const PASSAGE_APERTURE_RAD = 0.22;

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

  private createRegionBoundaries():
    void {
    for (
      const region of
      RELEASE_REGIONS
    ) {
      const connected =
        RELEASE_PASSAGES.filter(
          (passage) =>
            passage.a ===
              region.id ||
            passage.b ===
              region.id,
        );

      const openingAngles =
        connected.map(
          (passage) => {
            const other =
              getRegionDefinition(
                passage.a ===
                  region.id
                  ? passage.b
                  : passage.a,
              );

            return Math.atan2(
              other.center[1] -
                region.center[1],
              other.center[0] -
                region.center[0],
            );
          },
        );

      for (
        let index = 0;
        index <
          BOUNDARY_SEGMENTS;
        index += 1
      ) {
        const angle =
          index /
            BOUNDARY_SEGMENTS *
          Math.PI *
          2;

        const opening =
          openingAngles.some(
            (target) =>
              angleDistance(
                angle,
                target,
              ) <
              PASSAGE_APERTURE_RAD,
          );

        if (opening) {
          continue;
        }

        const x =
          region.center[0] +
          Math.cos(angle) *
            region.radiusX *
            1.01;
        const y =
          region.center[1] +
          Math.sin(angle) *
            region.radiusY *
            1.01;

        const wall =
          this.scene.add.rectangle(
            x,
            y,
            BOUNDARY_BLOCK,
            BOUNDARY_BLOCK,
            0x18201f,
            0,
          );

        this.barriers.add(
          wall,
        );
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
        passageEndpoints(
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
  ): void {
    const endpoints =
      passageEndpoints(
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

    const lockedRegion =
      regionIsUnlocked(
        [],
        passage.a,
      )
        ? passage.b
        : passage.a;
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

function passageEndpoints(
  passage:
    RegionPassage,
): {
  a: Phaser.Math.Vector2;
  b: Phaser.Math.Vector2;
} {
  const a =
    getRegionDefinition(
      passage.a,
    );
  const b =
    getRegionDefinition(
      passage.b,
    );
  const dx =
    b.center[0] -
    a.center[0];
  const dy =
    b.center[1] -
    a.center[1];
  const length =
    Math.max(
      1,
      Math.hypot(dx, dy),
    );
  const ux =
    dx / length;
  const uy =
    dy / length;

  const aRadius =
    ellipseRadiusAlong(
      a.radiusX,
      a.radiusY,
      ux,
      uy,
    );
  const bRadius =
    ellipseRadiusAlong(
      b.radiusX,
      b.radiusY,
      -ux,
      -uy,
    );

  return {
    a:
      new Phaser.Math.Vector2(
        a.center[0] +
          ux *
            (
              aRadius -
              52
            ),
        a.center[1] +
          uy *
            (
              aRadius -
              52
            ),
      ),
    b:
      new Phaser.Math.Vector2(
        b.center[0] -
          ux *
            (
              bRadius -
              52
            ),
        b.center[1] -
          uy *
            (
              bRadius -
              52
            ),
      ),
  };
}

function ellipseRadiusAlong(
  rx: number,
  ry: number,
  ux: number,
  uy: number,
): number {
  return (
    1 /
    Math.sqrt(
      ux * ux /
        (rx * rx) +
      uy * uy /
        (ry * ry),
    )
  );
}

function angleDistance(
  a: number,
  b: number,
): number {
  const raw =
    Math.abs(a - b) %
    (Math.PI * 2);

  return Math.min(
    raw,
    Math.PI * 2 - raw,
  );
}
