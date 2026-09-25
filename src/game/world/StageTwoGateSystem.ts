import Phaser from 'phaser';
import {
  STAGE_THREE_ENTRY,
  STAGE_THREE_ENTRY_RADIUS,
  STAGE_TWO_GATE_CENTER,
} from './StageTwoProgression';

export class StageTwoGateSystem {
  readonly barriers:
    Phaser.Physics.Arcade.StaticGroup;

  private unlocked: boolean;
  private blocker?:
    Phaser.GameObjects.Rectangle;
  private readonly leftPillar:
    Phaser.GameObjects.Rectangle;
  private readonly rightPillar:
    Phaser.GameObjects.Rectangle;
  private readonly label:
    Phaser.GameObjects.Text;

  constructor(
    private readonly scene:
      Phaser.Scene,
    initiallyUnlocked: boolean,
  ) {
    this.unlocked =
      initiallyUnlocked;
    this.barriers =
      scene.physics.add.staticGroup();

    this.leftPillar =
      scene.add
        .rectangle(
          STAGE_TWO_GATE_CENTER.x -
            170,
          STAGE_TWO_GATE_CENTER.y,
          70,
          110,
          0x75644f,
          1,
        )
        .setDepth(
          STAGE_TWO_GATE_CENTER.y +
            80,
        );
    this.rightPillar =
      scene.add
        .rectangle(
          STAGE_TWO_GATE_CENTER.x +
            170,
          STAGE_TWO_GATE_CENTER.y,
          70,
          110,
          0x75644f,
          1,
        )
        .setDepth(
          STAGE_TWO_GATE_CENTER.y +
            80,
        );

    this.label =
      scene.add
        .text(
          STAGE_TWO_GATE_CENTER.x,
          STAGE_TWO_GATE_CENTER.y -
            95,
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
            120,
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
    this.blocker?.destroy();
    this.blocker = undefined;
    this.label.setText(
      'Врата открыты',
    );

    this.scene.cameras.main.flash(
      260,
      244,
      194,
      104,
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
    this.blocker?.destroy();
    this.leftPillar.destroy();
    this.rightPillar.destroy();
    this.label.destroy();
  }

  private createBlocker(): void {
    this.blocker =
      this.scene.add
        .rectangle(
          STAGE_TWO_GATE_CENTER.x,
          STAGE_TWO_GATE_CENTER.y,
          330,
          90,
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
            110,
        );

    this.barriers.add(
      this.blocker,
    );
  }
}
