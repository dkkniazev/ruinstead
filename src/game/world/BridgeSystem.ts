import Phaser from 'phaser';
import type {
  ResourceCounts,
} from '../gathering/ResourceTypes';
import {
  STAGE_ONE_BRIDGE_CENTER,
  STAGE_ONE_BRIDGE_HEIGHT,
  STAGE_ONE_BRIDGE_WIDTH,
  STAGE_ONE_RIVER_LEFT,
  STAGE_ONE_RIVER_RIGHT,
  STAGE_TWO_ENTRY,
  STAGE_TWO_ENTRY_RADIUS,
} from './StageOneProgression';

export const BRIDGE_REPAIR_COST:
  ResourceCounts = {
  wood: 20,
  stone: 10,
  metal: 4,
  coins: 0,
};

const BRIDGE_REPAIR_RADIUS = 155;

export class BridgeSystem {
  readonly barriers:
    Phaser.Physics.Arcade.StaticGroup;

  private unlocked: boolean;
  private bridgeBlocker?:
    Phaser.GameObjects.Rectangle;
  private readonly bridgeDeck:
    Phaser.GameObjects.Rectangle;
  private readonly brokenLeft:
    Phaser.GameObjects.Rectangle;
  private readonly brokenRight:
    Phaser.GameObjects.Rectangle;
  private readonly bridgeLabel:
    Phaser.GameObjects.Text;
  private readonly repairPrompt:
    Phaser.GameObjects.Text;
  private repairAccess = false;
  private nearBridge = false;

  constructor(
    private readonly scene: Phaser.Scene,
    initiallyUnlocked: boolean,
    private readonly onRepairRequested?:
      () => void,
  ) {
    this.unlocked =
      initiallyUnlocked;

    this.drawRiver();

    this.barriers =
      scene.physics.add.staticGroup();

    this.createRiverBarriers();

    this.brokenLeft =
      scene.add
        .rectangle(
          STAGE_ONE_RIVER_LEFT + 35,
          STAGE_ONE_BRIDGE_CENTER.y,
          70,
          STAGE_ONE_BRIDGE_HEIGHT,
          0x8f653c,
          1,
        )
        .setDepth(-15);

    this.brokenRight =
      scene.add
        .rectangle(
          STAGE_ONE_RIVER_RIGHT - 35,
          STAGE_ONE_BRIDGE_CENTER.y,
          70,
          STAGE_ONE_BRIDGE_HEIGHT,
          0x8f653c,
          1,
        )
        .setDepth(-15);

    this.bridgeDeck =
      scene.add
        .rectangle(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y,
          STAGE_ONE_BRIDGE_WIDTH,
          STAGE_ONE_BRIDGE_HEIGHT,
          0xa97b43,
          1,
        )
        .setStrokeStyle(
          5,
          0x674726,
          0.95,
        )
        .setDepth(-14)
        .setVisible(
          initiallyUnlocked,
        );

    this.bridgeLabel =
      scene.add
        .text(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y +
            98,
          initiallyUnlocked
            ? 'Восстановленный мост'
            : 'Разрушенный мост',
          {
            fontFamily:
              'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color:
              initiallyUnlocked
                ? '#f8e4a9'
                : '#ded3be',
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
            120,
        );

    this.repairPrompt =
      scene.add
        .text(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y -
            118,
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
            130,
        )
        .setVisible(false)
        .setInteractive({
          useHandCursor: true,
        });

    this.repairPrompt.on(
      Phaser.Input.Events.POINTER_DOWN,
      () => {
        if (
          this.repairAccess &&
          this.nearBridge &&
          !this.unlocked
        ) {
          this.onRepairRequested?.();
        }
      },
    );

    if (
      initiallyUnlocked
    ) {
      this.brokenLeft.setVisible(
        false,
      );
      this.brokenRight.setVisible(
        false,
      );
    } else {
      this.createBridgeBlocker();
    }

    this.drawBridgeDetails();
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

    if (
      !this.unlocked &&
      repairAccess
    ) {
      this.bridgeLabel
        .setText(
          'Мост можно восстановить',
        )
        .setColor(
          '#fff0b3',
        );
    }
  }

  unlock(
    animated = true,
  ): boolean {
    if (this.unlocked) {
      return false;
    }

    this.unlocked = true;

    this.bridgeBlocker
      ?.destroy();
    this.bridgeBlocker =
      undefined;

    this.brokenLeft.setVisible(
      false,
    );
    this.brokenRight.setVisible(
      false,
    );

    this.bridgeDeck
      .setVisible(true)
      .setAlpha(
        animated ? 0 : 1,
      )
      .setScale(
        animated ? 0.14 : 1,
        1,
      );

    this.bridgeLabel
      .setText(
        'Восстановленный мост',
      )
      .setColor(
        '#f8e4a9',
      );
    this.repairPrompt.setVisible(
      false,
    );

    if (animated) {
      this.scene.tweens.add({
        targets:
          this.bridgeDeck,
        alpha: 1,
        scaleX: 1,
        duration: 650,
        ease: 'Back.Out',
      });

      this.scene.cameras.main.flash(
        300,
        245,
        220,
        145,
      );

      this.scene.cameras.main.shake(
        180,
        0.003,
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
    this.bridgeBlocker
      ?.destroy();
    this.bridgeDeck.destroy();
    this.brokenLeft.destroy();
    this.brokenRight.destroy();
    this.bridgeLabel.destroy();
    this.repairPrompt.destroy();
  }

  private drawRiver(): void {
    const g =
      this.scene.add.graphics();

    g.setDepth(-500);

    g.fillStyle(
      0x4f9fc7,
      1,
    );
    g.fillRect(
      STAGE_ONE_RIVER_LEFT,
      0,
      STAGE_ONE_RIVER_RIGHT -
        STAGE_ONE_RIVER_LEFT,
      1800,
    );

    g.fillStyle(
      0x87c6dc,
      0.52,
    );

    for (
      let y = 60;
      y < 1800;
      y += 110
    ) {
      g.fillRoundedRect(
        STAGE_ONE_RIVER_LEFT +
          18,
        y,
        STAGE_ONE_RIVER_RIGHT -
          STAGE_ONE_RIVER_LEFT -
          36,
        12,
        6,
      );
    }
  }

  private createRiverBarriers(): void {
    const openingTop =
      STAGE_ONE_BRIDGE_CENTER.y -
      STAGE_ONE_BRIDGE_HEIGHT /
        2 -
      20;
    const openingBottom =
      STAGE_ONE_BRIDGE_CENTER.y +
      STAGE_ONE_BRIDGE_HEIGHT /
        2 +
      20;
    const riverWidth =
      STAGE_ONE_RIVER_RIGHT -
      STAGE_ONE_RIVER_LEFT;
    const centerX =
      (
        STAGE_ONE_RIVER_LEFT +
        STAGE_ONE_RIVER_RIGHT
      ) / 2;

    const topHeight =
      Math.max(
        1,
        openingTop,
      );

    this.barriers.add(
      this.scene.add
        .rectangle(
          centerX,
          topHeight / 2,
          riverWidth,
          topHeight,
          0x000000,
          0,
        ),
    );

    const bottomHeight =
      Math.max(
        1,
        1800 -
          openingBottom,
      );

    this.barriers.add(
      this.scene.add
        .rectangle(
          centerX,
          openingBottom +
            bottomHeight / 2,
          riverWidth,
          bottomHeight,
          0x000000,
          0,
        ),
    );
  }

  private createBridgeBlocker(): void {
    const blocker =
      this.scene.add
        .rectangle(
          STAGE_ONE_BRIDGE_CENTER.x,
          STAGE_ONE_BRIDGE_CENTER.y,
          STAGE_ONE_BRIDGE_WIDTH,
          STAGE_ONE_BRIDGE_HEIGHT +
            32,
          0x000000,
          0,
        );

    this.barriers.add(
      blocker,
    );

    this.bridgeBlocker =
      blocker;
  }

  private drawBridgeDetails(): void {
    const g =
      this.scene.add.graphics();

    g.setDepth(-13);

    for (
      let x =
        STAGE_ONE_RIVER_LEFT + 10;
      x <
      STAGE_ONE_RIVER_RIGHT;
      x += 22
    ) {
      g.lineStyle(
        3,
        0x73502d,
        0.92,
      );
      g.lineBetween(
        x,
        STAGE_ONE_BRIDGE_CENTER.y -
          STAGE_ONE_BRIDGE_HEIGHT /
            2,
        x,
        STAGE_ONE_BRIDGE_CENTER.y +
          STAGE_ONE_BRIDGE_HEIGHT /
            2,
      );
    }

    g.lineStyle(
      5,
      0xd2a85b,
      0.82,
    );
    g.lineBetween(
      STAGE_ONE_RIVER_LEFT,
      STAGE_ONE_BRIDGE_CENTER.y -
        STAGE_ONE_BRIDGE_HEIGHT /
          2,
      STAGE_ONE_RIVER_RIGHT,
      STAGE_ONE_BRIDGE_CENTER.y -
        STAGE_ONE_BRIDGE_HEIGHT /
          2,
    );
    g.lineBetween(
      STAGE_ONE_RIVER_LEFT,
      STAGE_ONE_BRIDGE_CENTER.y +
        STAGE_ONE_BRIDGE_HEIGHT /
          2,
      STAGE_ONE_RIVER_RIGHT,
      STAGE_ONE_BRIDGE_CENTER.y +
        STAGE_ONE_BRIDGE_HEIGHT /
          2,
    );
  }
}
