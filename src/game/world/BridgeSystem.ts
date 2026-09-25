import Phaser from 'phaser';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import {
  STAGE_ONE_BRIDGE_CENTER,
  STAGE_TWO_ENTRY,
  STAGE_TWO_ENTRY_RADIUS,
} from './StageOneProgression';

export const BRIDGE_REPAIR_COST:
  ResourceCounts = {
  wood: 20,
  stone: 10,
  metal: 4,
  crystal: 0,
  fiber: 0,
  coins: 0,
};

const BRIDGE_REPAIR_RADIUS = 170;

export class BridgeSystem {
  readonly barriers:
    Phaser.Physics.Arcade.StaticGroup;

  private unlocked: boolean;
  private blocker?:
    Phaser.GameObjects.Rectangle;
  private readonly bridgeDeck:
    Phaser.GameObjects.Rectangle;
  private readonly brokenMark:
    Phaser.GameObjects.Text;
  private readonly bridgeLabel:
    Phaser.GameObjects.Text;
  private readonly repairPrompt:
    Phaser.GameObjects.Text;
  private repairAccess = false;
  private nearBridge = false;

  constructor(
    private readonly scene:
      Phaser.Scene,
    initiallyUnlocked: boolean,
    private readonly onRepairRequested?:
      () => void,
  ) {
    this.unlocked =
      initiallyUnlocked;

    this.barriers =
      scene.physics.add.staticGroup();

    const g =
      scene.add.graphics();
    g.setDepth(-430);
    g.lineStyle(
      300,
      0x4d6570,
      0.82,
    );
    g.lineBetween(
      STAGE_ONE_BRIDGE_CENTER.x,
      STAGE_ONE_BRIDGE_CENTER.y -
        360,
      STAGE_ONE_BRIDGE_CENTER.x,
      STAGE_ONE_BRIDGE_CENTER.y +
        360,
    );
    g.lineStyle(
      250,
      0x31515f,
      0.6,
    );
    g.lineBetween(
      STAGE_ONE_BRIDGE_CENTER.x,
      STAGE_ONE_BRIDGE_CENTER.y -
        360,
      STAGE_ONE_BRIDGE_CENTER.x,
      STAGE_ONE_BRIDGE_CENTER.y +
        360,
    );

    this.bridgeDeck =
      scene.add
        .rectangle(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y,
          260,
          165,
          0xa97b43,
          1,
        )
        .setStrokeStyle(
          5,
          0x674726,
          0.95,
        )
        .setDepth(-12)
        .setVisible(
          initiallyUnlocked,
        );

    this.brokenMark =
      scene.add
        .text(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y,
          '╳',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '72px',
            fontStyle: 'bold',
            color: '#9d6b45',
          },
        )
        .setOrigin(0.5)
        .setDepth(-10)
        .setVisible(
          !initiallyUnlocked,
        );

    this.bridgeLabel =
      scene.add
        .text(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y +
            118,
          initiallyUnlocked
            ? 'Восстановленный мост'
            : 'Разрушенный мост',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#f8e4a9',
            backgroundColor:
              '#2f4234cc',
            padding: {
              x: 8,
              y: 4,
            },
          },
        )
        .setOrigin(0.5)
        .setDepth(
          STAGE_ONE_BRIDGE_CENTER.y +
            130,
        );

    this.repairPrompt =
      scene.add
        .text(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y -
            120,
          'E · Восстановить мост\n20 дерева · 10 камня · 4 металла',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#fff4c7',
            backgroundColor:
              '#3f4b35ee',
            padding: {
              x: 10,
              y: 7,
            },
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setDepth(
          STAGE_ONE_BRIDGE_CENTER.y +
            140,
        )
        .setVisible(false)
        .setInteractive({
          useHandCursor: true,
        });

    this.repairPrompt.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        if (
          this.canRepairHere
        ) {
          this.onRepairRequested?.();
        }
      },
    );

    if (!initiallyUnlocked) {
      this.createBlocker();
    }
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  get canRepairHere(): boolean {
    return (
      this.repairAccess &&
      this.nearBridge &&
      !this.unlocked
    );
  }

  update(
    playerPosition:
      Phaser.Math.Vector2,
    repairAccess: boolean,
  ): void {
    this.repairAccess =
      repairAccess;
    this.nearBridge =
      Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        STAGE_ONE_BRIDGE_CENTER.x,
        STAGE_ONE_BRIDGE_CENTER.y,
      ) <=
      BRIDGE_REPAIR_RADIUS;

    this.repairPrompt.setVisible(
      this.canRepairHere,
    );
  }

  unlock(
    animated = true,
  ): boolean {
    if (this.unlocked) {
      return false;
    }

    this.unlocked = true;
    this.blocker?.destroy();
    this.blocker = undefined;
    this.brokenMark.setVisible(false);
    this.bridgeDeck
      .setVisible(true)
      .setAlpha(
        animated ? 0 : 1,
      );

    this.bridgeLabel.setText(
      'Восстановленный мост',
    );
    this.repairPrompt.setVisible(
      false,
    );

    if (animated) {
      this.scene.tweens.add({
        targets: this.bridgeDeck,
        alpha: 1,
        duration: 500,
        ease: 'Quad.Out',
      });
      this.scene.cameras.main.flash(
        260,
        245,
        220,
        145,
      );
    }

    return true;
  }

  isStageTwoEntryReached(
    position:
      Phaser.Math.Vector2,
  ): boolean {
    return (
      Phaser.Math.Distance.Between(
        position.x,
        position.y,
        STAGE_TWO_ENTRY.x,
        STAGE_TWO_ENTRY.y,
      ) <=
      STAGE_TWO_ENTRY_RADIUS
    );
  }

  destroy(): void {
    this.barriers.destroy(true);
    this.blocker?.destroy();
    this.bridgeDeck.destroy();
    this.brokenMark.destroy();
    this.bridgeLabel.destroy();
    this.repairPrompt.destroy();
  }

  private createBlocker(): void {
    this.blocker =
      this.scene.add
        .rectangle(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y,
          95,
          330,
          0x000000,
          0,
        );

    this.barriers.add(
      this.blocker,
    );
  }
}
