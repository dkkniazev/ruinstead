import Phaser from 'phaser';
import {
  STAGE_THREE_ENTRY,
  STAGE_THREE_ENTRY_RADIUS,
  STAGE_TWO_GATE_CENTER,
  STAGE_TWO_GATE_OPENING_HEIGHT,
} from './StageTwoProgression';

export class StageTwoGateSystem {
  readonly barriers:
    Phaser.Physics.Arcade.StaticGroup;

  private unlocked: boolean;
  private gateBlocker?:
    Phaser.GameObjects.Rectangle;
  private readonly leftPillar:
    Phaser.GameObjects.Rectangle;
  private readonly rightPillar:
    Phaser.GameObjects.Rectangle;
  private readonly label:
    Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    initiallyUnlocked: boolean,
  ) {
    this.unlocked =
      initiallyUnlocked;

    this.barriers =
      scene.physics.add.staticGroup();

    const openingHalf =
      STAGE_TWO_GATE_OPENING_HEIGHT /
      2;
    const topHeight =
      STAGE_TWO_GATE_CENTER.y -
      openingHalf;
    const bottomStart =
      STAGE_TWO_GATE_CENTER.y +
      openingHalf;
    const bottomHeight =
      1800 - bottomStart;

    this.barriers.add(
      scene.add.rectangle(
        STAGE_TWO_GATE_CENTER.x,
        topHeight / 2,
        54,
        topHeight,
        0x000000,
        0,
      ),
    );
    this.barriers.add(
      scene.add.rectangle(
        STAGE_TWO_GATE_CENTER.x,
        bottomStart +
          bottomHeight / 2,
        54,
        bottomHeight,
        0x000000,
        0,
      ),
    );

    this.leftPillar =
      scene.add
        .rectangle(
          STAGE_TWO_GATE_CENTER.x,
          STAGE_TWO_GATE_CENTER.y -
            openingHalf -
            32,
          70,
          120,
          0x75644f,
          1,
        )
        .setDepth(
          STAGE_TWO_GATE_CENTER.y +
            90,
        );

    this.rightPillar =
      scene.add
        .rectangle(
          STAGE_TWO_GATE_CENTER.x,
          STAGE_TWO_GATE_CENTER.y +
            openingHalf +
            32,
          70,
          120,
          0x75644f,
          1,
        )
        .setDepth(
          STAGE_TWO_GATE_CENTER.y +
            330,
        );

    this.label =
      scene.add
        .text(
          STAGE_TWO_GATE_CENTER.x -
            15,
          STAGE_TWO_GATE_CENTER.y -
            170,
          initiallyUnlocked
            ? 'Врата открыты'
            : 'Солнечные врата',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#fff0b0',
            backgroundColor:
              '#4d4438dd',
            padding: {
              x: 8,
              y: 4,
            },
          },
        )
        .setOrigin(0.5)
        .setDepth(
          STAGE_TWO_GATE_CENTER.y +
            250,
        );

    if (!initiallyUnlocked) {
      this.createBlocker();
    }
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  unlock(): boolean {
    if (this.unlocked) {
      return false;
    }

    this.unlocked = true;

    this.gateBlocker?.destroy();
    this.gateBlocker =
      undefined;

    this.label.setText(
      'Врата открыты',
    );

    this.scene.cameras.main.flash(
      260,
      244,
      194,
      104,
    );
    this.scene.cameras.main.shake(
      160,
      0.003,
    );

    return true;
  }

  isStageThreeEntryReached(
    position:
      Phaser.Math.Vector2,
  ): boolean {
    return (
      Phaser.Math.Distance.Between(
        position.x,
        position.y,
        STAGE_THREE_ENTRY.x,
        STAGE_THREE_ENTRY.y,
      ) <=
      STAGE_THREE_ENTRY_RADIUS
    );
  }

  destroy(): void {
    this.barriers.destroy(true);
    this.gateBlocker?.destroy();
    this.leftPillar.destroy();
    this.rightPillar.destroy();
    this.label.destroy();
  }

  private createBlocker(): void {
    const blocker =
      this.scene.add
        .rectangle(
          STAGE_TWO_GATE_CENTER.x,
          STAGE_TWO_GATE_CENTER.y,
          54,
          STAGE_TWO_GATE_OPENING_HEIGHT,
          0x9a753a,
          0.82,
        )
        .setStrokeStyle(
          4,
          0xe0bd62,
          0.9,
        )
        .setDepth(
          STAGE_TWO_GATE_CENTER.y +
            220,
        );

    this.barriers.add(
      blocker,
    );
    this.gateBlocker =
      blocker;
  }
}
