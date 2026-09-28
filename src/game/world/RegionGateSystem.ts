import Phaser from 'phaser';
import { WalkableWorld } from './WalkableWorld';
import {
  RELEASE_PASSAGES,
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




export class RegionGateSystem {
  readonly navigation: WalkableWorld;

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
    this.navigation =
      new WalkableWorld(
        unlockedZones,
      );
    this.scene.physics.world.on(
      Phaser.Physics.Arcade.Events.WORLD_STEP,
      this.constrainBodies,
      this,
    );
    this.sync(unlockedZones);
  }

  sync(
    unlockedZones:
      readonly string[],
  ): void {
    this.navigation.sync(
      unlockedZones,
    );

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
    this.scene.physics.world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.constrainBodies, this);
    for (
      const visual of
      this.gateVisuals.values()
    ) {
      visual.label.destroy();
    }
    this.gateVisuals.clear();
  }

  private constrainBodies(): void {
    for (const body of this.scene.physics.world.bodies.entries) {
      if (!body.enable || !body.moves) continue;
      const previous = { x: body.prev.x + body.halfWidth, y: body.prev.y + body.halfHeight };
      const next = this.navigation.slide(previous, body.center, Math.max(body.halfWidth, body.halfHeight), body.velocity);
      body.position.x += next.x - body.center.x;
      body.position.y += next.y - body.center.y;
      body.updateCenter();
      body.velocity.set(next.vx, next.vy);
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

